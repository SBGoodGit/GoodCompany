// GoodTrade service (§2.1, §5.4): prepares escrow actions, collects signatures and submits
// fully signed actions to the Escrow Ledger. It never changes a balance itself (L1).
import { linesOrderedByPayment } from '../../shared/materials'
import type { H3Event } from 'h3'
import { SimulatedLedger } from '../ledger/simulated'
import { LedgerRejection, type Action } from '../ledger/types'
import { canonicalJson } from '../../shared/canonical'

export const USER_ACTIONS = ['fund', 'claim_advance', 'pay_supplier', 'request_completion', 'approve', 'claim_holdback_tranche',
  'change_order', 'mutual_settlement', 'replace_mediator', 'object', 'escalate', 'settle', 'activate_mediator', 'repair_agreement'] as const

export function ledgerFor(tx: Tx): SimulatedLedger {
  return new SimulatedLedger(tx as never)
}

/** Turn a ledger rejection into a 400 with its message. */
export async function ledgerCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof LedgerRejection) bad(e.message, 400)
    throw e
  }
}

export async function loadContractForParty(tx: Tx, contractId: string, userId: string) {
  const [k] = await tx`select * from contracts where id = ${contractId}`
  if (!k || (k.client_id !== userId && k.contractor_id !== userId)) bad('Contract not found', 404)
  return { contract: k, party: (k.client_id === userId ? 'client' : 'contractor') as 'client' | 'contractor' }
}

/** Prepare an action: validate it against the ledger, store it with its hash and required signers. Nothing changes in the ledger. */
export async function prepareAction(tx: Tx, userId: string, contractId: string, type: string, params: Record<string, any>) {
  if (!(USER_ACTIONS as readonly string[]).includes(type)) bad('Unknown action type')
  const action: Action = { type: type as Action['type'], params, actor: userId }
  const { summary, requiredSigners } = await ledgerCall(() => ledgerFor(tx).preview(contractId, action))
  if (!requiredSigners.includes(userId)) bad('You are not a signer of this action', 403)
  const settings = await getSettings(tx)
  const ttl = Number(settings.action_signature_ttl_hours ?? 72)
  const [row] = await tx`
    insert into escrow_actions (contract_id, action_type, params, action_hash, summary, required_signers, expires_at, created_by)
    values (${contractId}, ${type}, ${tx.json(params as never)}, 'pending', ${summary}, ${requiredSigners},
            now() + make_interval(hours => ${ttl}), ${userId})
    returning *`
  const hash = hashCanonical({ id: row.id, contract_id: contractId, type, params, created_at: row.created_at })
  await tx`update escrow_actions set action_hash = ${hash} where id = ${row.id}`
  await audit(tx, { event_type: 'escrow_action_prepared', actor_id: userId, contract_id: contractId, payload: { action_id: row.id, type } })
  const others = requiredSigners.filter((x: string) => x !== userId)
  for (const o of others) {
    await notify(tx, { user_id: o, type: 'action_to_sign', title: 'An escrow action waits for your signature', body: summary, link: `/contracts/${contractId}` })
  }
  return { ...row, action_hash: hash }
}

/**
 * Record the caller's signature (after step-up) and, once all required parties have signed,
 * submit the action to the ledger. A ledger rejection marks the action rejected and leaves
 * contract, escrow and balances unchanged.
 */
export async function signAction(event: H3Event, tx: Tx, userId: string, actionId: string) {
  const [act] = await tx`select * from escrow_actions where id = ${actionId} for update`
  if (!act) bad('Action not found', 404)
  if (!act.required_signers.includes(userId)) bad('You are not a signer of this action', 403)
  if (act.status !== 'awaiting_signatures') bad(`This action is ${act.status}`)
  if (new Date(act.expires_at) <= new Date()) {
    await tx`update escrow_actions set status = 'expired' where id = ${act.id}`
    return { status: 'expired' as const, action: { ...act, status: 'expired' } }
  }
  const grantId = await consumeStepUp(event, tx, userId)
  const inserted = await tx`
    insert into attestations (user_id, subject_type, subject_id, payload_hash, step_up_grant_id)
    values (${userId}, 'escrow_action', ${act.id}, ${act.action_hash}, ${grantId}) on conflict do nothing returning id`
  if (!inserted.length) bad('You have already signed this action')
  const sigs = await tx`select user_id from attestations where subject_type = 'escrow_action' and subject_id = ${act.id} and payload_hash = ${act.action_hash}`
  const signers = sigs.map((s: any) => s.user_id as string)
  if (!act.required_signers.every((r: string) => signers.includes(r))) {
    return { status: 'awaiting_signatures' as const, action: act }
  }
  await tx`update escrow_actions set status = 'submitted' where id = ${act.id}`
  try {
    const result = await tx.savepoint(async (sp) => {
      const r = await ledgerFor(sp).submit(act.contract_id, { type: act.action_type, params: act.params, actor: act.created_by }, signers, act.id)
      await sp`update escrow_actions set status = 'applied', applied_at = now() where id = ${act.id}`
      // D29: a supplier payment sets its linked material lines to "ordered" (never "delivered").
      if (act.action_type === 'pay_supplier' && act.params.material_line_ids?.length) {
        const lines = await sp`select id, position, description, quantity, unit, amount, status from contract_material_lines where contract_id = ${act.contract_id}`
        const ordered = linesOrderedByPayment(lines as any, act.params.material_line_ids)
        if (ordered.length) await sp`update contract_material_lines set status = 'ordered', updated_by = ${act.created_by}, updated_at = now() where id in ${sp(ordered)}`
      }
      return r
    })
    await audit(tx, { event_type: `escrow_${act.action_type}`, actor_id: userId, contract_id: act.contract_id, payload: { action_id: act.id, signers } })
    for (const n of result.notices) await notify(tx, { user_id: n.user_id, type: 'escrow', title: n.title, body: n.body, link: `/contracts/${act.contract_id}` })
    // Final approval (also through a settlement or repair agreement): evaluation, invoices, reviews (§5.6)
    if (result.state.completedAt) await onContractCompleted(tx, act.contract_id)
    return { status: 'applied' as const, action: { ...act, status: 'applied' }, summary: result.summary }
  } catch (e) {
    if (!(e instanceof LedgerRejection)) throw e
    await tx`update escrow_actions set status = 'rejected', rejection_reason = ${e.message} where id = ${act.id}`
    await audit(tx, { event_type: 'escrow_action_rejected', actor_id: userId, contract_id: act.contract_id, payload: { action_id: act.id, reason: e.message } })
    return { status: 'rejected' as const, action: { ...act, status: 'rejected', rejection_reason: e.message } }
  }
}

/** Run a system operation (triggers b/c): no signatures, no money moves (L4). */
export async function systemAction(tx: Tx, contractId: string, type: 'system_open_dispute' | 'system_activate_mediator', params: Record<string, any>) {
  return ledgerFor(tx).submit(contractId, { type, params, actor: null }, [], null)
}

export { canonicalJson }
