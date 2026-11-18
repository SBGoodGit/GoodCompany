// SimulatedLedger core: the escrow business rules of Build Spec v3 §4, §7, §8 as one pure
// function. applyAction(state, action, signers, ctx) either returns the complete new state
// plus ledger entries, or throws LedgerRejection and changes nothing (§5.4).
// No database, no clock, no randomness: those come in through ctx, so every rule is unit-testable.
import {
  LedgerRejection,
  type Account, type Action, type ApplyContext, type ApplyResult, type CompletionRequest, type Dispute,
  type LedgerEntryDraft, type LedgerState, type Milestone, type Tranche,
} from './types'
import { holdbackOf } from '../../shared/terms'

const DAY = 86_400_000

export function reject(msg: string): never {
  throw new LedgerRejection(msg)
}

export const contractValue = (a: Account) => a.principal_total - a.client_surplus
export const escrowBalance = (a: Account) =>
  a.principal_total - a.paid_to_contractor - a.paid_to_suppliers - a.refunded_to_client - a.fee_transferred
export const unspentMaterials = (a: Account) => a.materials_budget - a.paid_to_suppliers - a.materials_released
export const feeOf = (value: number, ratePct: number) => Math.round((value * ratePct) / 100)

/** Holdback tranche schedule (§7.2). Every tranche but the last is amount ÷ n rounded; the last takes the rest. */
export function holdbackSchedule(amount: number, warrantyDays: number, start: Date): Tranche[] {
  const days: Record<number, number[]> = { 0: [], 15: [15], 30: [15, 30], 90: [30, 60, 90] }
  const plan = days[warrantyDays]
  if (!plan) reject(`Unsupported warranty period ${warrantyDays}`)
  if (!plan.length || amount <= 0) return []
  const each = Math.round(amount / plan.length)
  return plan.map((d, i) => ({
    sequence: i + 1,
    claimable_from: new Date(start.getTime() + d * DAY).toISOString(),
    amount: i === plan.length - 1 ? amount - each * (plan.length - 1) : each,
    status: 'pending' as const,
  }))
}

export function requiredSigners(state: LedgerState, action: Action): string[] {
  const { client_id: client, contractor_id: contractor } = state.contract
  switch (action.type) {
    case 'fund':
    case 'approve':
      return [client]
    case 'object': // either party opens a dispute on its own (§4.3 stage 1a, D27)
      if (action.actor !== client && action.actor !== contractor) reject('Only a contract party can object')
      return [action.actor]
    case 'claim_advance':
    case 'pay_supplier':
    case 'request_completion':
    case 'claim_holdback_tranche':
      return [contractor]
    case 'change_order': {
      const co = state.changeOrders.find((c) => c.id === action.params.change_order_id)
      if (!co) reject('Change Order not found')
      return [co.requested_by, co.requested_by === client ? contractor : client]
    }
    case 'mutual_settlement':
    case 'replace_mediator':
    case 'settle':
    case 'repair_agreement':
      return [client, contractor]
    case 'escalate':
    case 'activate_mediator':
      if (action.actor !== client && action.actor !== contractor) reject('Only a contract party can do this')
      return [action.actor]
    case 'system_open_dispute':
    case 'system_activate_mediator':
      return []
    default:
      reject(`Unknown action ${(action as Action).type}`)
  }
}

export function applyAction(input: LedgerState, action: Action, signers: string[], ctx: ApplyContext): ApplyResult {
  const s: LedgerState = structuredClone(input)
  s.feeCollection = []
  const entries: LedgerEntryDraft[] = []
  const notices: ApplyResult['notices'] = []
  const nowIso = ctx.now.toISOString()
  const c = s.contract
  const p = action.params ?? {}

  // L2: signers must match the transition table exactly.
  const required = requiredSigners(s, action)
  const signed = new Set(signers)
  for (const r of required) if (!signed.has(r)) reject('Not all required parties have signed')
  for (const x of signed) if (!required.includes(x)) reject('Signature from a party that is not a required signer')

  // ---- helpers -----------------------------------------------------------------------------
  const acc = (): Account => s.account ?? reject('The escrow is not funded')
  const userAcct = (id: string) => `user:${id}`
  const escrowAcct = `escrow:${c.id}`
  const record = (action_type: string, amounts: Record<string, number>, account = escrowAcct) => entries.push({ account, action_type, amounts })
  const credit = (userId: string, amount: number) => { s.balances[userId] = (s.balances[userId] ?? 0) + amount }
  const requireActive = () => { if (c.status !== 'active') reject(`The contract is ${c.status.replace('_', ' ')}, not active`) }
  /** Every release must leave the disputed amount (and repair holds) in escrow (§4.2). */
  const assertRelease = (amount: number) => {
    const a = acc()
    if (amount < 0) reject('Amounts cannot be negative')
    if (escrowBalance(a) - amount < a.disputed_amount) reject('This release would touch the disputed amount')
  }
  const payContractor = (amount: number, type = 'payout') => {
    if (amount <= 0) return
    const a = acc()
    assertRelease(amount)
    a.paid_to_contractor += amount
    credit(c.contractor_id, amount)
    record(type, { to_contractor: amount })
  }
  const refundClient = (amount: number, type = 'refund') => {
    if (amount <= 0) return
    const a = acc()
    a.refunded_to_client += amount
    credit(c.client_id, amount)
    record(type, { to_client: amount })
  }
  const transferFee = (amount: number) => {
    if (amount <= 0) return
    const a = acc()
    a.fee_transferred += amount
    a.fee_kept += amount
    s.feeCollection.push({ contract_id: c.id, amount })
    record('fee_transfer', { to_fee_collection: amount })
  }
  const milestone = (id: string): Milestone => s.milestones.find((m) => m.id === id) ?? reject('Milestone not found')
  const finalMilestone = () => s.milestones.find((m) => m.kind === 'final') ?? reject('No final milestone')
  const dispute = (id: string): Dispute => s.disputes.find((d) => d.id === id) ?? reject('Dispute not found')
  const request = (id: string): CompletionRequest => s.requests.find((r) => r.id === id) ?? reject('Completion request not found')
  const openDisputes = () => s.disputes.filter((d) => ['between_parties', 'mediator_active', 'advice_issued'].includes(d.status))
  const syncMediatorFlag = () => { if (s.account) s.account.mediator_active = openDisputes().some((d) => d.mediator_activated_at) }
  /** Always the full 10% holdback (§3.4, D25, D27); the final phase is at least that large. */
  const holdbackWithheld = () => {
    const a = acc()
    if (c.warranty_period_days === 0) return 0 // 0-day warranty: 100% at final approval (§7.2, O26)
    if (a.holdback_amount > finalMilestone().amount + unspentMaterials(a)) reject('Internal: the final phase is smaller than the holdback')
    return a.holdback_amount
  }
  /** What approving a request would release to the contractor. */
  const requestAmount = (r: CompletionRequest) => {
    if (r.repair_agreement_id) return s.repairs.find((x) => x.id === r.repair_agreement_id)!.held_amount
    const m = milestone(r.milestone_id)
    if (m.kind === 'final') return m.amount + unspentMaterials(acc()) - holdbackWithheld()
    return m.amount
  }
  const closeIfDone = () => {
    const a = acc()
    if (c.status !== 'completed') return
    const tranchesDone = a.holdback_tranches.every((t) => t.status === 'claimed' || t.status === 'reassigned')
    if (tranchesDone && escrowBalance(a) === 0) {
      c.status = 'closed'
      s.closedAt = nowIso
      record('contract_closed', {})
    }
  }
  /**
   * Final payout (§4.2 approve): final phase + unspent materials budget as labour income (P21), minus the
   * holdback; client surplus to the client; frozen fee to the collect-wallet; warranty starts.
   * `toContractor`/`toClient` replace the normal final payout when a dispute settles it.
   */
  const finalize = (toContractor: number, toClient: number) => {
    const a = acc()
    const fm = finalMilestone()
    const held = holdbackWithheld()
    const unspent = unspentMaterials(a)
    a.materials_released += unspent
    a.holdback_amount = held
    if (unspent) record('materials_release', { unspent_materials_as_labour_income: unspent })
    payContractor(toContractor, 'payout')
    refundClient(toClient, 'refund')
    const surplus = a.client_surplus - a.client_surplus_settled
    if (surplus > 0) {
      a.client_surplus_settled += surplus
      a.refunded_to_client += surplus
      credit(c.client_id, surplus)
      record('client_surplus_settlement', { to_client: surplus })
    }
    transferFee(a.fee_reserved - a.fee_transferred)
    fm.status = 'paid'
    a.warranty_start_date = nowIso
    a.holdback_tranches = holdbackSchedule(held, c.warranty_period_days, ctx.now)
    c.status = 'completed'
    s.completedAt = nowIso
    record('final_approval', { holdback_withheld: held })
    closeIfDone()
  }
  const party = (userId: string | null) => (userId === c.client_id ? 'client' : userId === c.contractor_id ? 'contractor' : null)
  const amountParam = (name: string, min = 0) => {
    const v = p[name]
    if (!Number.isInteger(v) || v < min) reject(`${name} must be a whole amount of at least ${min}`)
    return v as number
  }

  const money = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: c.currency || 'EUR' }).format(n / 100)
  let summary = ''

  switch (action.type) {
    // ---------------------------------------------------------------- Path 1 (§4.2) --------
    case 'fund': {
      if (c.status !== 'awaiting_funding' || s.account) reject('The contract is not awaiting funding')
      if (!c.snapshot_hash) reject('The contract snapshot hash is missing')
      const deposit = c.total_amount
      if ((s.balances[c.client_id] ?? 0) < deposit) reject('Your simulated balance is too low to fund this contract')
      s.balances[c.client_id] -= deposit
      s.account = {
        contract_id: c.id, currency: c.currency, principal_total: deposit, client_surplus: 0, client_surplus_settled: 0,
        fee_rate: ctx.config.platform_fee_rate, fee_reserved: c.fee_amount, fee_final: 0, fee_transferred: 0, fee_kept: 0,
        materials_budget: c.materials_budget_amount, paid_to_suppliers: 0, materials_released: 0, paid_to_contractor: 0,
        refunded_to_client: 0, holdback_amount: holdbackOf(deposit, c.holdback_percentage), warranty_start_date: null,
        holdback_tranches: [], disputed_amount: 0, repair_held: 0, mediator_id: c.mediator_id, mediator_active: false,
        snapshot_hash: c.snapshot_hash,
      }
      record('deposit', { deposit }, escrowAcct)
      record('fee_reserve', { fee_reserved: c.fee_amount })
      c.status = 'active'
      s.activatedAt = nowIso
      summary = `Deposit ${money(deposit)} into escrow. ${money(c.fee_amount)} platform fee is frozen and ${money(c.materials_budget_amount)} is reserved for supplier payments. The contract becomes active.`
      notices.push({ user_id: c.contractor_id, title: 'The escrow is funded: work can start' })
      break
    }
    case 'claim_advance': {
      requireActive()
      const m = milestone(p.milestone_id)
      if (m.kind !== 'advance') reject('Only an advance phase can be claimed without a completion request')
      if (m.status !== 'pending') reject('This advance has already been claimed')
      payContractor(m.amount, 'payout')
      m.status = 'paid'
      summary = `Pay the advance of ${money(m.amount)} to the contractor.`
      notices.push({ user_id: c.client_id, title: 'The contractor claimed the agreed advance' })
      break
    }
    case 'pay_supplier': {
      requireActive()
      const a = acc()
      const amount = amountParam('amount', 1)
      const sup = s.users[p.supplier_id]
      if (!sup || sup.status !== 'active' || !sup.verified) reject('The supplier needs a verified GoodCompany account')
      if (sup.id === c.client_id || sup.id === c.contractor_id) reject('A supplier payment cannot go to the client or the contractor (self-supply is paid at the final payout)')
      // D29: materials from a company connected to the contractor count as own supply, paid at the final payout.
      if (p.supplier_not_connected !== true) reject('Confirm that the supplier is not a company connected to you; materials from a connected company count as own supply, paid with the final payout')
      if (amount > unspentMaterials(a)) reject('The amount exceeds what is left of the materials budget')
      assertRelease(amount)
      a.paid_to_suppliers += amount
      credit(sup.id, amount)
      s.supplierPayments.push({ id: ctx.newId(), supplier_id: sup.id, amount, signed_by: c.contractor_id, signed_at: nowIso })
      record('supplier_payment', { to_supplier: amount })
      summary = `Pay ${money(amount)} from the materials budget to the supplier, in full. No fee applies. You confirm the supplier is not a company connected to you.`
      notices.push({ user_id: c.client_id, title: 'The contractor paid a supplier from the materials budget' }) // no amount (P23)
      notices.push({ user_id: sup.id, title: 'You received a supplier payment (simulated)' })
      break
    }
    case 'request_completion': {
      const evidence = String(p.evidence_text ?? '').trim()
      if (!evidence) reject('Attach the agreed evidence: a request is formal only with it (D14)')
      let req: CompletionRequest
      if (p.repair_agreement_id) {
        const ra = s.repairs.find((r) => r.id === p.repair_agreement_id) ?? reject('Repair agreement not found')
        if (ra.status !== 'effective') reject('The repair agreement is not in effect')
        if (!['active', 'completed'].includes(c.status)) reject('The contract is not running')
        const d = dispute(ra.dispute_case_id)
        const orig = request(d.completion_request_id!)
        if (s.requests.some((r) => r.repair_agreement_id === ra.id && r.status === 'open')) reject('There is already an open request for this repair')
        req = baseRequest(orig.milestone_id, ra.id, evidence, orig.is_final)
        // A repair request starts a new response window and payment deadline for the held amount only (§4.5)
        req.response_due_at = new Date(ctx.now.getTime() + ctx.config.completion_response_days * DAY).toISOString()
        req.payment_deadline_at = new Date(ctx.now.getTime() + ctx.config.payment_deadline_days * DAY).toISOString()
      } else {
        requireActive()
        const m = milestone(p.milestone_id)
        if (m.kind === 'advance') reject('An advance is claimed, not requested')
        if (m.status !== 'pending') reject('This milestone is not open for a completion request')
        if (s.requests.some((r) => r.milestone_id === m.id && r.status === 'open')) reject('There is already an open request for this milestone')
        if (m.kind === 'final' && s.milestones.some((x) => x.id !== m.id && x.status !== 'paid')) {
          reject('Request the final delivery after all other milestones are paid')
        }
        req = baseRequest(m.id, null, evidence, m.kind === 'final')
        if (m.kind === 'final') {
          // Response window and payment deadline run for the delivery of the whole project only (O24)
          req.response_due_at = new Date(ctx.now.getTime() + ctx.config.completion_response_days * DAY).toISOString()
          req.payment_deadline_at = new Date(ctx.now.getTime() + ctx.config.payment_deadline_days * DAY).toISOString()
        }
        m.status = 'requested'
      }
      s.requests.push(req)
      req.requested_amount = requestAmount(req)
      record('completion_request', { requested: req.requested_amount })
      summary = `Request ${req.is_final ? 'approval of the final delivery' : req.repair_agreement_id ? 'approval of the repair' : 'payment of a milestone'} with evidence.`
      notices.push({ user_id: c.client_id, title: req.is_final || req.repair_agreement_id ? 'Delivery reported: you have 14 days to respond' : 'The contractor requests payment of a milestone' })
      break
    }
    case 'approve': {
      const r = request(p.completion_request_id)
      if (r.status !== 'open') reject('This request is not open')
      if (openDisputes().some((d) => d.completion_request_id === r.id)) reject('A dispute is open on this request; it is resolved through a settlement')
      const amount = requestAmount(r)
      if (r.repair_agreement_id) {
        const ra = s.repairs.find((x) => x.id === r.repair_agreement_id)!
        acc().repair_held -= ra.held_amount
        payContractor(amount)
        ra.status = 'completed'
        const m = milestone(r.milestone_id)
        if (m.kind !== 'final') m.status = 'paid'
      } else if (r.is_final) {
        requireActive()
        finalize(amount, 0)
      } else {
        requireActive()
        payContractor(amount)
        milestone(r.milestone_id).status = 'paid'
      }
      r.status = 'approved'
      summary = r.is_final && !r.repair_agreement_id
        ? `Approve the final delivery: ${money(amount)} to the contractor, the holdback stays for the warranty, the fee goes to the collect-wallet.`
        : `Approve: ${money(amount)} to the contractor.`
      notices.push({ user_id: c.contractor_id, title: 'Your completion request was approved' })
      closeIfDone()
      break
    }
    case 'claim_holdback_tranche': {
      if (c.status !== 'completed') reject('Holdback tranches can be claimed after final approval')
      const a = acc()
      const t = a.holdback_tranches.find((x) => x.sequence === p.sequence) ?? reject('Tranche not found')
      if (t.status === 'frozen') reject('This tranche is frozen by an objection')
      if (t.status !== 'pending') reject('This tranche is not claimable')
      if (new Date(t.claimable_from) > ctx.now) reject(`This tranche is claimable from ${t.claimable_from.slice(0, 10)}`)
      payContractor(t.amount, 'holdback_claim')
      t.status = 'claimed'
      summary = `Claim holdback tranche ${t.sequence}: ${money(t.amount)} to the contractor.`
      closeIfDone()
      break
    }
    case 'change_order': {
      requireActive()
      const a = acc()
      const co = s.changeOrders.find((x) => x.id === p.change_order_id)!
      if (co.status !== 'proposed') reject('This Change Order is not open')
      if (new Date(co.expires_at) <= ctx.now) reject('This Change Order has expired')
      if (s.requests.some((r) => r.is_final)) reject('Change Orders are not possible after the final completion request (§4.4)')
      const delta = co.amount_delta
      const newValue = contractValue(a) + delta
      if (newValue <= 0) reject('The contract value must stay above zero')
      for (const ch of co.milestone_changes) {
        const m = milestone(ch.milestone_id)
        if (m.status !== 'pending') reject(`Milestone ${m.sequence} is ${m.status}; only unpaid, unrequested milestones can change (P13)`)
        if (!Number.isInteger(ch.amount) || ch.amount < 0) reject('Milestone amounts must be whole, non-negative amounts')
      }
      const newMaterials = co.new_materials_budget ?? a.materials_budget
      if (newMaterials < a.paid_to_suppliers) reject('The materials budget cannot drop below what was already paid to suppliers')
      const newFee = feeOf(newValue, a.fee_rate)
      const amounts = new Map(s.milestones.map((m) => [m.id, m.amount]))
      for (const ch of co.milestone_changes) amounts.set(ch.milestone_id, ch.amount)
      const sum = [...amounts.values()].reduce((x, y) => x + y, 0)
      if (sum + newMaterials + newFee !== newValue) {
        reject(`Milestones (${sum}) + materials budget (${newMaterials}) + fee (${newFee}) must equal the new contract value (${newValue})`)
      }
      // D27: the final phase stays at least the 10% holdback, so the holdback can always be withheld in full.
      const newHoldback = holdbackOf(newValue, c.holdback_percentage)
      if (amounts.get(finalMilestone().id)! < newHoldback) {
        reject(`The final phase must stay at least ${c.holdback_percentage}% of the contract value (${money(newHoldback)}), so the holdback can be withheld in full`)
      }
      if (delta > 0) {
        if ((s.balances[c.client_id] ?? 0) < delta) reject("The client's simulated balance is too low for the extra deposit")
        s.balances[c.client_id] -= delta
        a.principal_total += delta
        record('deposit', { deposit: delta })
      } else if (delta < 0) {
        a.client_surplus += -delta
        record('client_surplus', { earmarked_for_client: -delta })
      }
      for (const ch of co.milestone_changes) {
        const m = milestone(ch.milestone_id)
        m.amount = ch.amount
        if (ch.description?.trim()) m.description = ch.description.trim()
        if (ch.evidence_required?.trim()) m.evidence_required = ch.evidence_required.trim()
      }
      a.materials_budget = newMaterials
      a.fee_reserved = newFee
      a.holdback_amount = holdbackOf(newValue, c.holdback_percentage)
      co.status = 'effective'
      record('change_order', { amount_delta: delta, contract_value: newValue, fee_reserved: newFee })
      summary = delta > 0
        ? `Change Order takes effect: ${money(delta)} extra is deposited by the client now; the contract value becomes ${money(newValue)}.`
        : delta < 0
          ? `Change Order takes effect: ${money(-delta)} is earmarked for the client (returned at final settlement); the contract value becomes ${money(newValue)}.`
          : 'Change Order takes effect without a change in contract value.'
      break
    }
    case 'mutual_settlement': {
      if (!['active', 'completed'].includes(c.status)) reject('The contract cannot be settled in its current status')
      const a = acc()
      const toContractor = amountParam('to_contractor')
      const bal = escrowBalance(a)
      let feeKept = 0
      if (c.status === 'active') {
        // P1/OD11: cancelled in full before any payout → no fee. P7: otherwise the fee only on amounts paid out.
        const paidOut = a.paid_to_contractor + a.paid_to_suppliers + toContractor
        feeKept = paidOut === 0 ? 0 : Math.min(feeOf(paidOut, a.fee_rate), a.fee_reserved - a.fee_transferred)
      }
      const toClient = bal - toContractor - feeKept
      if (toClient < 0) reject(`At most ${bal - feeKept} can go to the contractor`)
      a.disputed_amount = 0
      a.repair_held = 0
      for (const d of openDisputes()) d.status = 'settled'
      for (const r of s.requests) if (r.status === 'open') r.status = 'superseded'
      for (const ra of s.repairs) if (ra.status === 'effective') ra.status = 'completed'
      for (const t of a.holdback_tranches) if (t.status === 'pending' || t.status === 'frozen') t.status = 'reassigned'
      payContractor(toContractor, 'payout')
      transferFee(feeKept)
      const feeReturn = c.status === 'active' ? a.fee_reserved - a.fee_transferred : 0
      if (feeReturn > 0) record('fee_return', { to_client: feeReturn })
      a.fee_reserved = a.fee_transferred
      refundClient(toClient, 'refund')
      syncMediatorFlag()
      c.status = 'ended_unfinished'
      s.closedAt = nowIso
      summary = `End the contract by mutual settlement: ${money(toContractor)} to the contractor, ${money(toClient)} to the client, ${money(feeKept)} platform fee.`
      break
    }
    case 'replace_mediator': {
      const m = s.users[p.mediator_id]
      if (!m || m.role !== 'mediator' || m.status !== 'active') reject('Choose an active Mediator')
      c.mediator_id = m.id
      if (s.account) s.account.mediator_id = m.id
      record('replace_mediator', {})
      summary = 'Replace the Mediator named in the contract.'
      break
    }

    // ---------------------------------------------------------------- Path 2 (§4.3) --------
    case 'object': {
      const a = acc()
      const reason = String(p.reason ?? '').trim()
      if (!reason) reject('State the reason for the objection')
      const D = amountParam('disputed_amount', 1)
      if (escrowBalance(a) === 0) reject('The escrow is empty')
      const by = party(action.actor)!
      const id = ctx.newId()
      let scope: Dispute['scope']
      if (by === 'contractor' && !p.completion_request_id) reject('The contractor opens a dispute on one of their open completion requests')
      if (p.completion_request_id) {
        const r = request(p.completion_request_id)
        if (r.status !== 'open') reject('This request is not open')
        if (openDisputes().some((d) => d.completion_request_id === r.id)) reject('A dispute is already open on this request')
        const R = requestAmount(r)
        if (D > R) reject(`The disputed amount cannot exceed the requested ${R}`)
        // D27: the contractor disputes the client's handling of the request. Nothing of it was approved, so
        // there is no undisputed part to release: the whole requested amount is the disputed amount.
        if (by === 'contractor' && D !== R) reject(`The contractor disputes the whole requested amount (${money(R)}); other amounts continue on Path 1`)
        r.status = 'objected'
        r.last_party_action_at = nowIso
        const m = milestone(r.milestone_id)
        const isRepair = !!r.repair_agreement_id
        if (isRepair) a.repair_held -= R // the held amount is now released or disputed
        if (D === R) {
          scope = 'request'
          if (!isRepair) m.status = 'disputed'
        } else {
          // Objection in part: the undisputed part continues on Path 1 and is released now.
          scope = 'request_partial'
          if (r.is_final && !isRepair) {
            requireActive()
            finalize(R - D, 0)
          } else {
            if (!isRepair) requireActive()
            payContractor(R - D)
            if (!isRepair) m.status = 'disputed'
          }
        }
        a.disputed_amount += D
      } else {
        // Warranty objection (§4.6): freeze unclaimed tranches up to the disputed amount.
        if (c.status !== 'completed') reject('Object to a completion request; a free-standing objection is possible during the warranty')
        const unclaimed = a.holdback_tranches.filter((t) => t.status === 'pending')
        const total = unclaimed.reduce((x, t) => x + t.amount, 0)
        if (D > total) reject(`At most ${total} of unclaimed holdback can be frozen`)
        freezeTranches(a, D, id)
        a.disputed_amount += D
        scope = 'warranty'
      }
      s.disputes.push({
        id, completion_request_id: p.completion_request_id ?? null, opened_by: by, trigger: 'objection', scope,
        reason, reason_hash: ctx.hash(reason), disputed_amount: D, status: 'between_parties',
        mediator_activated_at: null, mediator_due_at: null,
      })
      record('object', { disputed_amount: D })
      summary = scope === 'request_partial'
        ? `Object in part: ${money(D)} stays frozen in escrow; the rest of the request is released now.`
        : `Object: ${money(D)} stays frozen in escrow until the parties settle. Undisputed amounts are not affected.`
      notices.push(by === 'client'
        ? { user_id: c.contractor_id, title: 'The client objected', body: 'Try to settle together first. Either of you can activate the Mediator.' }
        : { user_id: c.client_id, title: 'The contractor opened a dispute', body: `${money(D)} of the requested amount stays frozen in escrow. Try to settle together first. Either of you can activate the Mediator.` })
      break
    }
    case 'settle': {
      const d = dispute(p.dispute_id)
      if (!['between_parties', 'mediator_active', 'advice_issued'].includes(d.status)) reject('This dispute is not open')
      const a = acc()
      const D = d.disputed_amount
      const r = d.completion_request_id ? request(d.completion_request_id) : null
      const ra = r?.repair_agreement_id ? s.repairs.find((x) => x.id === r.repair_agreement_id)! : null
      const markMilestonePaid = () => { if (r && !r.is_final && !ra) milestone(r.milestone_id).status = 'paid' }
      a.disputed_amount -= D
      if (p.mode === 'withdraw') {
        // The objection is withdrawn and Path 1 reopens.
        if (d.scope === 'request' && r) {
          r.status = 'open'
          r.awaiting_party = 'client'
          r.last_party_action_at = nowIso
          if (ra) a.repair_held += D
          else milestone(r.milestone_id).status = 'requested'
        } else if (d.scope === 'request_partial') {
          payContractor(D)
          markMilestonePaid()
          if (ra) ra.status = 'completed'
        } else {
          for (const t of a.holdback_tranches) if (t.status === 'frozen' && t.dispute_id === d.id) { t.status = 'pending'; t.dispute_id = null }
        }
        d.status = 'withdrawn'
        summary = 'Withdraw the objection: the disputed amount returns to the normal path.'
      } else {
        const toContractor = amountParam('to_contractor')
        const toClient = amountParam('to_client')
        if (toContractor + toClient !== D) reject(`The split must add up to the disputed amount ${D}`)
        if (d.scope === 'warranty') {
          for (const t of a.holdback_tranches) if (t.status === 'frozen' && t.dispute_id === d.id) t.status = 'reassigned'
          payContractor(toContractor, 'holdback_release')
          refundClient(toClient, 'holdback_claim')
        } else if (d.scope === 'request' && r && r.is_final && !ra && c.status === 'active') {
          finalize(toContractor, toClient)
          r.status = 'approved'
        } else {
          payContractor(toContractor)
          refundClient(toClient)
          markMilestonePaid()
          if (ra) ra.status = 'completed'
          if (r && r.status === 'open') r.status = 'superseded'
        }
        d.status = 'settled'
        summary = `Settle the dispute: ${money(toContractor)} to the contractor, ${money(toClient)} to the client.`
      }
      syncMediatorFlag()
      record('settle', { disputed_amount: D })
      if (c.status === 'completed') closeIfDone()
      break
    }
    case 'activate_mediator': {
      const d = dispute(p.dispute_id)
      if (d.status !== 'between_parties') reject('The Mediator is already active or the dispute is closed')
      activateMediator(d)
      summary = 'Activate the Mediator. The 30-day mediator period starts now; the other party does not need to agree.'
      break
    }
    case 'escalate': {
      const d = dispute(p.dispute_id)
      if (!['silence', 'payment_deadline'].includes(d.trigger)) reject('Escalation confirms a system-detected trigger only')
      if (!d.mediator_activated_at) reject('The Mediator is not active on this case')
      record('escalate', {})
      summary = 'Confirm the escalation. The Mediator was already activated when the system detected the trigger.'
      break
    }
    case 'repair_agreement': {
      const d = dispute(p.dispute_id)
      if (!['between_parties', 'mediator_active', 'advice_issued'].includes(d.status)) reject('This dispute is not open')
      if (d.scope === 'warranty' || !d.completion_request_id) reject('A repair agreement follows an objection to a completion request')
      const r = request(d.completion_request_id)
      if (r.repair_agreement_id) reject('This is already a repair request')
      const a = acc()
      const held = amountParam('held_amount', 1)
      const description = String(p.description ?? '').trim()
      if (!description) reject('Describe the repair')
      if (held > d.disputed_amount) reject('The held amount cannot exceed the disputed amount')
      const release = d.disputed_amount - held
      a.disputed_amount -= d.disputed_amount
      if (d.scope === 'request' && r.is_final && c.status === 'active') finalize(release, 0)
      else payContractor(release)
      a.repair_held += held
      if (r.status === 'open') r.status = 'superseded'
      d.status = 'settled'
      s.repairs.push({ id: ctx.newId(), dispute_case_id: d.id, description, held_amount: held, status: 'effective', signed_by_client_at: nowIso, signed_by_contractor_at: nowIso })
      syncMediatorFlag()
      record('repair_agreement', { released: release, held_for_repair: held })
      summary = `Repair agreement: ${money(release)} is released to the contractor now; ${money(held)} stays in escrow until the repair is approved.`
      break
    }

    // --------------------------------------------------- system triggers (b), (c) (§4.3, D17) --
    case 'system_open_dispute': {
      const r = request(p.completion_request_id)
      if (r.status !== 'open') reject('The request is not open')
      if (openDisputes().some((d) => d.completion_request_id === r.id)) reject('A dispute is already open')
      const a = acc()
      const R = requestAmount(r)
      a.disputed_amount += R
      if (r.repair_agreement_id) a.repair_held -= R
      else milestone(r.milestone_id).status = 'disputed'
      const d: Dispute = {
        id: ctx.newId(), completion_request_id: r.id, opened_by: 'system', trigger: p.trigger, scope: 'request',
        reason: null, reason_hash: null, disputed_amount: R, status: 'between_parties', mediator_activated_at: null, mediator_due_at: null,
      }
      s.disputes.push(d)
      activateMediator(d)
      record('system_open_dispute', { disputed_amount: R })
      summary = `System: trigger (${p.trigger}) detected; Mediator activated.`
      break
    }
    case 'system_activate_mediator': {
      const d = dispute(p.dispute_id)
      if (d.status !== 'between_parties') reject('Nothing to activate')
      activateMediator(d)
      summary = 'System: Mediator activated.'
      break
    }
    default:
      reject(`Unknown action ${action.type}`)
  }

  // Invariant: the escrow never goes negative, and never holds less than what is disputed.
  if (s.account) {
    const bal = escrowBalance(s.account)
    if (bal < 0) reject('Internal: escrow balance would become negative')
    if (bal < s.account.disputed_amount) reject('Internal: disputed amount exceeds the escrow balance')
  }
  for (const [u, b] of Object.entries(s.balances)) if (b < 0) reject(`Internal: simulated balance of ${u} would become negative`)

  return { state: s, entries, summary, notices }

  // ---- local helpers that need ctx ------------------------------------------------------------
  function baseRequest(milestoneId: string, repairId: string | null, evidence: string, isFinal: boolean): CompletionRequest {
    return {
      id: ctx.newId(), milestone_id: milestoneId, is_final: isFinal, repair_agreement_id: repairId,
      evidence_text: evidence, evidence_hash: ctx.hash(evidence), requested_amount: 0, requested_at: nowIso,
      response_due_at: null, payment_deadline_at: null, awaiting_party: 'client', last_party_action_at: nowIso, status: 'open',
    }
  }
  function activateMediator(d: Dispute) {
    d.status = 'mediator_active'
    d.mediator_activated_at = nowIso
    d.mediator_due_at = new Date(ctx.now.getTime() + ctx.config.mediator_period_days * DAY).toISOString()
    s.account!.mediator_active = true
    record('activate_mediator', {})
  }
}

/** Freeze unclaimed tranches from the last one backwards until exactly `amount` is frozen (splitting one if needed). */
function freezeTranches(a: Account, amount: number, disputeId: string) {
  let left = amount
  const ordered = [...a.holdback_tranches].filter((t) => t.status === 'pending').sort((x, y) => y.sequence - x.sequence)
  for (const t of ordered) {
    if (left === 0) break
    if (t.amount <= left) {
      t.status = 'frozen'
      t.dispute_id = disputeId
      left -= t.amount
    } else {
      const frozenPart: Tranche = { sequence: 0, claimable_from: t.claimable_from, amount: left, status: 'frozen', dispute_id: disputeId }
      t.amount -= left
      a.holdback_tranches.push(frozenPart)
      left = 0
    }
  }
  a.holdback_tranches.sort((x, y) => x.claimable_from.localeCompare(y.claimable_from) || x.status.localeCompare(y.status))
  a.holdback_tranches.forEach((t, i) => (t.sequence = i + 1))
}
