// SimulatedLedger (MVP1): the only module that changes escrow balances, simulated user
// balances and the collect-wallet. It loads the contract's ledger state under a row lock,
// applies the pure rules in core.ts, and writes the result in the caller's transaction, so an
// action is applied completely or not at all (§5.4). The ledger stores no personal data (L5):
// party references, amounts, dates, flags and the snapshot hash.
import { randomUUID, createHash } from 'node:crypto'
import type postgres from 'postgres'
import { applyAction, escrowBalance, requiredSigners } from './core'
import { LedgerRejection, type Action, type ApplyResult, type EscrowLedger, type LedgerConfig, type LedgerState } from './types'

type Sql = postgres.TransactionSql | postgres.Sql
const iso = (d: any) => (d ? new Date(d).toISOString() : null)

export class SimulatedLedger implements EscrowLedger {
  constructor(private tx: Sql, private now: () => Date = () => new Date()) {}

  async preview(contractId: string, action: Action) {
    const state = await this.load(contractId, action, false)
    const signers = requiredSigners(state, action)
    const result = applyAction(state, action, signers, await this.ctx())
    return { summary: result.summary, requiredSigners: signers }
  }

  async submit(contractId: string, action: Action, signers: string[], actionId: string | null): Promise<ApplyResult> {
    const state = await this.load(contractId, action, true)
    const result = applyAction(state, action, signers, await this.ctx())
    await this.persist(state, result, action, signers, actionId)
    return result
  }

  /** Read the escrow as the ledger holds it (L3). */
  async read(contractId: string) {
    const state = await this.load(contractId, { type: 'fund', params: {}, actor: null }, false)
    return state
  }

  /** Admin/seed: create simulated demonstration money (§2.2). Not real money. */
  async creditSimulatedBalance(userId: string, amount: number, actorId: string | null) {
    if (!Number.isInteger(amount) || amount <= 0) throw new LedgerRejection('Amount must be a positive whole amount')
    const [row] = await this.tx`
      insert into simulated_balances (user_id, balance) values (${userId}, ${amount})
      on conflict (user_id) do update set balance = simulated_balances.balance + ${amount}
      returning balance`
    await this.tx`insert into ledger_entries (account, action_type, signers, amounts, resulting_balances)
      values (${'user:' + userId}, 'simulated_credit', ${actorId ? [actorId] : []}, ${this.tx.json({ credit: amount })}, ${this.tx.json({ balance: row.balance })})`
    return row.balance as number
  }

  /** Admin assignment of the contract's Mediator (P15), only while no Mediator is active on a case. */
  async assignMediator(contractId: string, mediatorId: string, actorId: string) {
    const [k] = await this.tx`select id from contracts where id = ${contractId} for update`
    if (!k) throw new LedgerRejection('Contract not found')
    const [active] = await this.tx`select id from dispute_cases where contract_id = ${contractId} and mediator_activated_at is not null and status in ('mediator_active','advice_issued')`
    if (active) throw new LedgerRejection('A Mediator is active on a case; the parties can replace the Mediator together')
    await this.tx`update contracts set mediator_id = ${mediatorId} where id = ${contractId}`
    await this.tx`update escrow_accounts set mediator_id = ${mediatorId} where contract_id = ${contractId}`
    await this.tx`insert into ledger_entries (account, contract_id, action_type, signers) values (${'escrow:' + contractId}, ${contractId}, 'mediator_assigned', ${[actorId]})`
  }

  private async ctx() {
    const rows = await this.tx<{ key: string; value: any }[]>`
      select key, value from app_settings where key in ('completion_response_days','payment_deadline_days','mediator_period_days','platform_fee_rate')`
    const v = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)])) as unknown as LedgerConfig
    return { now: this.now(), config: v, newId: randomUUID, hash: (x: string) => createHash('sha256').update(x).digest('hex') }
  }

  private async load(contractId: string, action: Action, lock: boolean): Promise<LedgerState> {
    const tx = this.tx
    const [k] = lock ? await tx`select * from contracts where id = ${contractId} for update` : await tx`select * from contracts where id = ${contractId}`
    if (!k) throw new LedgerRejection('Contract not found')
    const [acc] = await tx`select * from escrow_accounts where contract_id = ${contractId}`
    const milestones = await tx`select id, sequence, kind, description, amount, evidence_required, status from milestones where contract_id = ${contractId} order by sequence`
    const requests = await tx`select * from completion_requests where contract_id = ${contractId} order by requested_at`
    const disputes = await tx`select * from dispute_cases where contract_id = ${contractId} order by created_at`
    const repairs = await tx`select * from repair_agreements where contract_id = ${contractId} order by created_at`
    const changeOrders = await tx`select * from change_orders where contract_id = ${contractId} and status = 'proposed'`
    const ids = [...new Set([k.client_id, k.contractor_id, k.mediator_id, action.params?.supplier_id, action.params?.mediator_id].filter((x) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)))]
    const users = await tx`select id, role, status, public.identity_level(id) as identity_level from users where id = any(${ids})`
    const bals = await tx`select user_id, balance from simulated_balances where user_id = any(${ids})`
    const s = k.snapshot
    return {
      contract: {
        id: k.id, status: k.status, client_id: k.client_id, contractor_id: k.contractor_id, mediator_id: k.mediator_id,
        currency: k.currency, snapshot_hash: k.snapshot_hash, warranty_period_days: s.terms.warranty_period_days,
        holdback_percentage: s.terms.holdback_percentage, total_amount: s.quote.total_amount, fee_amount: s.quote.fee_amount,
        materials_budget_amount: s.quote.materials_budget_amount,
      },
      account: acc
        ? {
            ...acc,
            fee_rate: Number(acc.fee_rate),
            warranty_start_date: iso(acc.warranty_start_date),
            holdback_tranches: acc.holdback_tranches ?? [],
          }
        : null,
      milestones: milestones as any,
      requests: requests.map((r: any) => ({
        ...r, requested_at: iso(r.requested_at), response_due_at: iso(r.response_due_at), payment_deadline_at: iso(r.payment_deadline_at),
        last_party_action_at: iso(r.last_party_action_at),
      })) as any,
      disputes: disputes.map((d: any) => ({ ...d, mediator_activated_at: iso(d.mediator_activated_at), mediator_due_at: iso(d.mediator_due_at) })) as any,
      repairs: repairs as any,
      changeOrders: changeOrders.map((c: any) => ({ ...c, expires_at: iso(c.expires_at) })) as any,
      supplierPayments: [],
      users: Object.fromEntries(users.map((u: any) => [u.id, { id: u.id, role: u.role, status: u.status, verified: u.identity_level === 'email_verified' }])),
      balances: Object.fromEntries(ids.map((id) => [id, Number(bals.find((b: any) => b.user_id === id)?.balance ?? 0)])),
      feeCollection: [],
    }
  }

  private async persist(before: LedgerState, r: ApplyResult, action: Action, signers: string[], actionId: string | null) {
    const tx = this.tx
    const s = r.state
    const c = s.contract
    await tx`update contracts set status = ${c.status}, mediator_id = ${c.mediator_id},
               activated_at = coalesce(${s.activatedAt ?? null}::timestamptz, activated_at),
               completed_at = coalesce(${s.completedAt ?? null}::timestamptz, completed_at),
               closed_at = coalesce(${s.closedAt ?? null}::timestamptz, closed_at)
             where id = ${c.id}`
    if (s.account) {
      const a = s.account
      const row = {
        contract_id: a.contract_id, currency: a.currency, principal_total: a.principal_total, client_surplus: a.client_surplus,
        client_surplus_settled: a.client_surplus_settled, fee_rate: a.fee_rate, fee_reserved: a.fee_reserved, fee_final: a.fee_final,
        fee_transferred: a.fee_transferred, fee_kept: a.fee_kept, materials_budget: a.materials_budget, paid_to_suppliers: a.paid_to_suppliers,
        materials_released: a.materials_released, paid_to_contractor: a.paid_to_contractor, refunded_to_client: a.refunded_to_client,
        holdback_amount: a.holdback_amount, warranty_start_date: a.warranty_start_date ? a.warranty_start_date.slice(0, 10) : null,
        holdback_tranches: tx.json(a.holdback_tranches as never), disputed_amount: a.disputed_amount, repair_held: a.repair_held,
        mediator_id: a.mediator_id, mediator_active: a.mediator_active, snapshot_hash: a.snapshot_hash,
      }
      await tx`insert into escrow_accounts ${tx(row as never)}
               on conflict (contract_id) do update set ${tx(row as never, Object.keys(row).filter((x) => x !== 'contract_id') as never)}`
    }
    for (const m of s.milestones) {
      await tx`update milestones set amount = ${m.amount}, description = ${m.description}, evidence_required = ${m.evidence_required}, status = ${m.status} where id = ${m.id}`
    }
    for (const q of s.requests) {
      const row = {
        id: q.id, contract_id: c.id, milestone_id: q.milestone_id, evidence_text: q.evidence_text, evidence_hash: q.evidence_hash,
        is_final: q.is_final, requested_at: q.requested_at, response_due_at: q.response_due_at, payment_deadline_at: q.payment_deadline_at,
        awaiting_party: q.awaiting_party, last_party_action_at: q.last_party_action_at, repair_agreement_id: q.repair_agreement_id,
        status: q.status, requested_amount: q.requested_amount,
      }
      await tx`insert into completion_requests ${tx(row as never)}
               on conflict (id) do update set status = excluded.status, awaiting_party = excluded.awaiting_party,
                 last_party_action_at = excluded.last_party_action_at, requested_amount = excluded.requested_amount`
    }
    for (const ra of s.repairs) {
      await tx`insert into repair_agreements (id, contract_id, dispute_case_id, description, held_amount, signed_by_client_at, signed_by_contractor_at, status)
               values (${ra.id}, ${c.id}, ${ra.dispute_case_id}, ${ra.description}, ${ra.held_amount}, ${ra.signed_by_client_at}, ${ra.signed_by_contractor_at}, ${ra.status})
               on conflict (id) do update set status = excluded.status`
    }
    for (const d of s.disputes) {
      await tx`insert into dispute_cases (id, contract_id, completion_request_id, opened_by, trigger, scope, reason, reason_hash, disputed_amount,
                 status, mediator_activated_at, mediator_due_at)
               values (${d.id}, ${c.id}, ${d.completion_request_id}, ${d.opened_by}, ${d.trigger}, ${d.scope}, ${d.reason}, ${d.reason_hash},
                 ${d.disputed_amount}, ${d.status}, ${d.mediator_activated_at}, ${d.mediator_due_at})
               on conflict (id) do update set status = case when dispute_cases.status = 'advice_issued' and excluded.status = 'mediator_active'
                   then dispute_cases.status else excluded.status end,
                 mediator_activated_at = excluded.mediator_activated_at,
                 mediator_due_at = coalesce(dispute_cases.mediator_due_at, excluded.mediator_due_at)`
    }
    for (const co of s.changeOrders) await tx`update change_orders set status = ${co.status} where id = ${co.id}`
    for (const sp of s.supplierPayments) {
      await tx`insert into supplier_payments (id, contract_id, supplier_id, amount, signed_by, signed_at, escrow_action_id)
               values (${sp.id}, ${c.id}, ${sp.supplier_id}, ${sp.amount}, ${sp.signed_by}, ${sp.signed_at}, ${actionId})
               on conflict (id) do nothing`
    }
    for (const [userId, bal] of Object.entries(s.balances)) {
      if (bal !== before.balances[userId]) {
        await tx`insert into simulated_balances (user_id, balance) values (${userId}, ${bal})
                 on conflict (user_id) do update set balance = excluded.balance`
      }
    }
    for (const f of s.feeCollection) {
      await tx`insert into fee_collection_items (contract_id, amount) values (${f.contract_id}, ${f.amount})
               on conflict (contract_id) do update set amount = fee_collection_items.amount + excluded.amount`
    }
    const resulting = s.account ? { escrow_balance: escrowBalance(s.account), disputed_amount: s.account.disputed_amount } : {}
    for (const e of r.entries) {
      await tx`insert into ledger_entries (account, contract_id, action_id, action_type, signers, amounts, resulting_balances)
               values (${e.account}, ${c.id}, ${actionId}, ${e.action_type}, ${signers}, ${tx.json(e.amounts)}, ${tx.json(resulting as never)})`
    }
  }
}
