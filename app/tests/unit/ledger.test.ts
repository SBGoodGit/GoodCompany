// SimulatedLedger core: every action and its conditions (assignment §7), including the
// worked fee example of Build Spec §7.1 as an exact assertion.
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { applyAction, escrowBalance, holdbackSchedule, requiredSigners } from '../../server/ledger/core'
import type { Action, ApplyContext, LedgerState } from '../../server/ledger/types'
import { computeEstimate } from '../../shared/estimate'

const CLIENT = 'client', CONTRACTOR = 'contractor', SUPPLIER = 'supplier', MEDIATOR = 'mediator', MEDIATOR2 = 'mediator2'
const DAY = 86_400_000
const T0 = new Date('2026-12-01T10:00:00Z')

let seq = 0
const ctx = (now = T0): ApplyContext => ({
  now,
  config: { completion_response_days: 14, payment_deadline_days: 30, mediator_period_days: 30, platform_fee_rate: 2 },
  newId: () => `id-${++seq}`,
  hash: (x) => createHash('sha256').update(x).digest('hex'),
})

/** 10,000.00 contract: advance 1,000, work 2,800, final 3,000, materials budget 3,000, fee 200 (§7.1). */
function state(over: { warranty?: number; materials?: number; milestones?: [string, number][]; fee?: number; total?: number } = {}): LedgerState {
  const ms = over.milestones ?? [['advance', 100_000], ['work', 280_000], ['final', 300_000]]
  return {
    contract: {
      id: 'k1', status: 'awaiting_funding', client_id: CLIENT, contractor_id: CONTRACTOR, mediator_id: MEDIATOR, currency: 'EUR',
      snapshot_hash: 'abc', warranty_period_days: over.warranty ?? 30, holdback_percentage: 10,
      total_amount: over.total ?? 1_000_000, fee_amount: over.fee ?? 20_000, materials_budget_amount: over.materials ?? 300_000,
    },
    account: null,
    milestones: ms.map(([kind, amount], i) => ({ id: `m${i + 1}`, sequence: i + 1, kind: kind as any, description: kind, amount, evidence_required: 'photos', status: 'pending' as const })),
    requests: [], disputes: [], repairs: [], changeOrders: [], supplierPayments: [],
    users: {
      [CLIENT]: { id: CLIENT, role: 'client', status: 'active', verified: true },
      [CONTRACTOR]: { id: CONTRACTOR, role: 'contractor', status: 'active', verified: true },
      [SUPPLIER]: { id: SUPPLIER, role: 'contractor', status: 'active', verified: true },
      [MEDIATOR]: { id: MEDIATOR, role: 'mediator', status: 'active', verified: true },
      [MEDIATOR2]: { id: MEDIATOR2, role: 'mediator', status: 'active', verified: true },
    },
    balances: { [CLIENT]: 2_000_000, [CONTRACTOR]: 0, [SUPPLIER]: 0 },
    feeCollection: [],
  }
}

/** Apply with the required signers; keeps a running total of fees moved to the collect-wallet. */
function run(s: LedgerState, type: Action['type'], params: Record<string, any> = {}, opts: { actor?: string; signers?: string[]; now?: Date } = {}) {
  const action: Action = { type, params, actor: opts.actor ?? (type === 'object' ? CLIENT : null) }
  const signers = opts.signers ?? requiredSigners(s, action)
  const r = applyAction(s, action, signers, ctx(opts.now))
  ;(r.state as any).feeTotal = ((s as any).feeTotal ?? 0) + r.state.feeCollection.reduce((x, f) => x + f.amount, 0)
  return r
}
const go = (...a: Parameters<typeof run>) => run(...a).state
const openRequest = (s: LedgerState) => s.requests.find((r) => r.status === 'open')!

/** §7.1 built through an itemised estimate (round 2): the lines produce the same contract. */
function stateFromEstimate() {
  const phases = [{ sequence: 1, kind: 'advance' as const, description: 'Advance' }, { sequence: 2, kind: 'work' as const, description: 'Rough work' }, { sequence: 3, kind: 'final' as const, description: 'Delivery' }]
  const e = computeEstimate({
    sections: [{ key: 'prep', title: 'Preparation' }, { key: 'build', title: 'Build' }],
    lines: [
      { section: 'prep', description: 'Planning and mobilisation', kind: 'labour', quantity: 1, unit: 'lump sum', unit_price: 100_000, phase: 1 },
      { section: 'build', description: 'Rough work', kind: 'labour', quantity: 40, unit: 'hour', unit_price: 7_000, phase: 2 },
      { section: 'build', description: 'Finishing and delivery', kind: 'labour', quantity: 50, unit: 'hour', unit_price: 6_000, phase: 3 },
      { section: 'build', description: 'Timber and fixings', kind: 'material', quantity: 1, unit: 'lump sum', unit_price: 300_000, phase: 2 },
    ],
  }, phases, { feePercentage: 2, holdbackPercentage: 10 })
  expect(e.errors).toEqual([])
  return state({
    total: e.total_amount, fee: e.fee_amount, materials: e.materials_budget_amount,
    milestones: e.phase_amounts.map((p) => [p.kind, p.amount] as [string, number]),
  })
}

describe('§7.1 worked example', () => {
  it.each([['typed amounts', () => state()], ['an itemised estimate', stateFromEstimate]])('contract 10,000.00 from %s: contractor 7,200.00, suppliers 2,600.00, fee 200.00, escrow empty', (_label, initial) => {
    let s = go(initial(), 'fund')
    expect(s.contract.status).toBe('active')
    expect(s.account!.fee_reserved).toBe(20_000)
    expect(s.account!.materials_budget).toBe(300_000)
    s = go(s, 'claim_advance', { milestone_id: 'm1' })
    s = go(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 200_000 })
    s = go(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 60_000 })
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'Rough work done, photos attached' })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    s = go(s, 'request_completion', { milestone_id: 'm3', evidence_text: 'All done' })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    expect(s.contract.status).toBe('completed')
    // Final: 3,000 + 400 unspent materials − 1,000 holdback = 2,400 now; holdback in 2 tranches (30-day warranty)
    expect(s.account!.holdback_tranches.map((t) => t.amount)).toEqual([50_000, 50_000])
    s = go(s, 'claim_holdback_tranche', { sequence: 1 }, { now: new Date(T0.getTime() + 15 * DAY) })
    s = go(s, 'claim_holdback_tranche', { sequence: 2 }, { now: new Date(T0.getTime() + 30 * DAY) })

    expect(s.account!.paid_to_contractor).toBe(720_000)
    expect(s.account!.paid_to_suppliers).toBe(260_000)
    expect(s.account!.fee_transferred).toBe(20_000)
    expect((s as any).feeTotal).toBe(20_000)
    expect(s.balances[CONTRACTOR]).toBe(720_000)
    expect(s.balances[SUPPLIER]).toBe(260_000)
    expect(s.balances[CLIENT]).toBe(1_000_000)
    expect(escrowBalance(s.account!)).toBe(0)
    expect(s.contract.status).toBe('closed')
  })
})

describe('fund', () => {
  it('needs the client signature and enough simulated balance', () => {
    expect(() => run(state(), 'fund', {}, { signers: [CONTRACTOR] })).toThrow(/required/)
    const poor = state(); poor.balances[CLIENT] = 999_999
    expect(() => run(poor, 'fund')).toThrow(/balance is too low/)
  })
  it('cannot fund twice', () => {
    expect(() => run(go(state(), 'fund'), 'fund')).toThrow(/not awaiting funding/)
  })
  it('records deposit and fee reserve entries', () => {
    const r = run(state(), 'fund')
    expect(r.entries.map((e) => e.action_type)).toEqual(['deposit', 'fee_reserve'])
  })
})

describe('advance and supplier payments (P10, P23)', () => {
  it('advance only for kind advance, once, and only after funding', () => {
    expect(() => run(state(), 'claim_advance', { milestone_id: 'm1' })).toThrow(/not active/)
    const s = go(go(state(), 'fund'), 'claim_advance', { milestone_id: 'm1' })
    expect(s.balances[CONTRACTOR]).toBe(100_000)
    expect(() => run(s, 'claim_advance', { milestone_id: 'm1' })).toThrow(/already been claimed/)
    expect(() => run(s, 'claim_advance', { milestone_id: 'm2' })).toThrow(/Only an advance/)
  })
  it('supplier payments: contractor alone, verified supplier, within budget, never to a party', () => {
    const s = go(state(), 'fund')
    expect(() => run(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 1 }, { signers: [CLIENT] })).toThrow()
    expect(() => run(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 300_001 })).toThrow(/materials budget/)
    expect(() => run(s, 'pay_supplier', { supplier_id: CONTRACTOR, amount: 1 })).toThrow(/cannot go to the client or the contractor/)
    const unverified = structuredClone(s); unverified.users[SUPPLIER].verified = false
    expect(() => run(unverified, 'pay_supplier', { supplier_id: SUPPLIER, amount: 1 })).toThrow(/verified/)
    const r = run(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 300_000 })
    expect(r.state.account!.fee_reserved).toBe(20_000) // no fee on supplier payments
    const clientNotice = r.notices.find((n) => n.user_id === CLIENT)!
    expect(clientNotice.title + (clientNotice.body ?? '')).not.toMatch(/\d/) // no amount for the client
  })
})

describe('completion requests and approval', () => {
  it('needs evidence; final only after all other milestones are paid', () => {
    const s = go(state(), 'fund')
    expect(() => run(s, 'request_completion', { milestone_id: 'm2', evidence_text: ' ' })).toThrow(/evidence/)
    expect(() => run(s, 'request_completion', { milestone_id: 'm3', evidence_text: 'x' })).toThrow(/after all other milestones/)
    expect(() => run(s, 'request_completion', { milestone_id: 'm1', evidence_text: 'x' })).toThrow(/claimed, not requested/)
  })
  it('a milestone request runs no window; the final delivery runs 14 + 30 days (O24)', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    expect(openRequest(s).response_due_at).toBeNull()
    expect(openRequest(s).payment_deadline_at).toBeNull()
    expect(() => run(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })).toThrow(/not open/)
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    s = go(s, 'claim_advance', { milestone_id: 'm1' })
    s = go(s, 'request_completion', { milestone_id: 'm3', evidence_text: 'x' })
    expect(openRequest(s).response_due_at).toBe(new Date(T0.getTime() + 14 * DAY).toISOString())
    expect(openRequest(s).payment_deadline_at).toBe(new Date(T0.getTime() + 30 * DAY).toISOString())
  })
  it('only the client approves', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    expect(() => run(s, 'approve', { completion_request_id: openRequest(s).id }, { signers: [CONTRACTOR] })).toThrow()
  })
})

function toFinalRequest(over: Parameters<typeof state>[0] = {}) {
  let s = go(state(over), 'fund')
  for (const m of s.milestones.filter((x) => x.kind !== 'final')) {
    if (m.kind === 'advance') s = go(s, 'claim_advance', { milestone_id: m.id })
    else { s = go(s, 'request_completion', { milestone_id: m.id, evidence_text: 'x' }); s = go(s, 'approve', { completion_request_id: openRequest(s).id }) }
  }
  return go(s, 'request_completion', { milestone_id: s.milestones.find((m) => m.kind === 'final')!.id, evidence_text: 'done' })
}

describe('warranty and holdback (§7.2)', () => {
  it('schedules: 15 → day 15; 30 → 50/50 at 15 and 30; 90 → thirds at 30/60/90, last takes the rest', () => {
    expect(holdbackSchedule(100_000, 15, T0).map((t) => t.amount)).toEqual([100_000])
    expect(holdbackSchedule(100_001, 30, T0).map((t) => t.amount)).toEqual([50_001, 50_000])
    const t90 = holdbackSchedule(100_000, 90, T0)
    expect(t90.map((t) => t.amount)).toEqual([33_333, 33_333, 33_334])
    expect(t90.map((t) => (new Date(t.claimable_from).getTime() - T0.getTime()) / DAY)).toEqual([30, 60, 90])
    expect(holdbackSchedule(100_000, 0, T0)).toEqual([])
  })
  it('0-day warranty: everything released at final approval and the contract closes in the same action (O26)', () => {
    let s = toFinalRequest({ warranty: 0 })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    expect(s.contract.status).toBe('closed')
    expect(escrowBalance(s.account!)).toBe(0)
    expect(s.balances[CONTRACTOR]).toBe(980_000)
  })
  it('tranches are claimable from their date only, not automatically', () => {
    let s = toFinalRequest({ warranty: 90 })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    expect(() => run(s, 'claim_holdback_tranche', { sequence: 1 }, { now: new Date(T0.getTime() + 29 * DAY) })).toThrow(/claimable from/)
    s = go(s, 'claim_holdback_tranche', { sequence: 1 }, { now: new Date(T0.getTime() + 30 * DAY) })
    expect(() => run(s, 'claim_holdback_tranche', { sequence: 1 }, { now: new Date(T0.getTime() + 31 * DAY) })).toThrow(/not claimable/)
    expect(s.contract.status).toBe('completed')
  })
  it('final approval transfers the whole frozen fee once and settles the client surplus', () => {
    let s = go(state(), 'fund')
    // Negative Change Order: −1,000 from the work phase (−980) and fee (−20)
    s.changeOrders.push({ id: 'co1', requested_by: CLIENT, amount_delta: -100_000, milestone_changes: [{ milestone_id: 'm2', amount: 182_000 }], expires_at: new Date(T0.getTime() + 30 * DAY).toISOString(), status: 'proposed' })
    s = go(s, 'change_order', { change_order_id: 'co1' })
    expect(s.account!.client_surplus).toBe(100_000)
    expect(s.account!.fee_reserved).toBe(18_000)
    expect(s.account!.holdback_amount).toBe(90_000)
    expect(escrowBalance(s.account!)).toBe(1_000_000) // nothing leaves the escrow yet (P12)
    s = go(s, 'claim_advance', { milestone_id: 'm1' })
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    s = go(s, 'request_completion', { milestone_id: 'm3', evidence_text: 'x' })
    const r = run(s, 'approve', { completion_request_id: openRequest(s).id })
    expect(r.state.feeCollection).toEqual([{ contract_id: 'k1', amount: 18_000 }])
    expect(r.state.balances[CLIENT]).toBe(1_000_000 + 100_000)
    expect(escrowBalance(r.state.account!)).toBe(90_000) // only the holdback remains
  })
})

describe('Change Orders (§4.4)', () => {
  const co = (over: any = {}) => ({ id: 'co', requested_by: CONTRACTOR, amount_delta: 50_000, milestone_changes: [{ milestone_id: 'm3', amount: 349_000 }], expires_at: new Date(T0.getTime() + DAY).toISOString(), status: 'proposed' as const, ...over })
  it('needs both signatures and deposits the extra amount in the same action', () => {
    const s = go(state(), 'fund'); s.changeOrders.push(co())
    expect(() => run(s, 'change_order', { change_order_id: 'co' }, { signers: [CONTRACTOR] })).toThrow(/required/)
    const after = go(s, 'change_order', { change_order_id: 'co' })
    expect(after.account!.principal_total).toBe(1_050_000)
    expect(after.account!.fee_reserved).toBe(21_000)
    expect(after.balances[CLIENT]).toBe(950_000)
  })
  it('fails as a whole when the client balance is short', () => {
    const s = go(state(), 'fund'); s.changeOrders.push(co()); s.balances[CLIENT] = 49_999
    expect(() => run(s, 'change_order', { change_order_id: 'co' })).toThrow(/too low/)
  })
  it('only unpaid, unrequested milestones change; totals must add up', () => {
    let s = go(go(state(), 'fund'), 'claim_advance', { milestone_id: 'm1' })
    s.changeOrders.push(co({ milestone_changes: [{ milestone_id: 'm1', amount: 149_000 }] }))
    expect(() => run(s, 'change_order', { change_order_id: 'co' })).toThrow(/only unpaid/)
    s.changeOrders = [co({ milestone_changes: [{ milestone_id: 'm3', amount: 340_000 }] })]
    expect(() => run(s, 'change_order', { change_order_id: 'co' })).toThrow(/must equal the new contract value/)
  })
  it('keeps the final phase at least the 10% holdback (D27)', () => {
    const s = go(state(), 'fund')
    // +50,000 contract value → holdback 105,000; moving the final phase down to 99,000 is refused
    s.changeOrders.push(co({ milestone_changes: [{ milestone_id: 'm2', amount: 530_000 }, { milestone_id: 'm3', amount: 99_000 }] }))
    expect(() => run(s, 'change_order', { change_order_id: 'co' })).toThrow(/final phase must stay at least 10%/)
  })
  it('is impossible after the final completion request and after expiry', () => {
    const fin = toFinalRequest(); fin.changeOrders.push(co())
    expect(() => run(fin, 'change_order', { change_order_id: 'co' })).toThrow(/after the final completion request/)
    const s = go(state(), 'fund'); s.changeOrders.push(co())
    expect(() => run(s, 'change_order', { change_order_id: 'co' }, { now: new Date(T0.getTime() + 2 * DAY) })).toThrow(/expired/)
  })
})

describe('mutual settlement and fee on cancellation (P1, P7, OD11)', () => {
  it('cancelled in full before any payout: no fee, everything back to the client', () => {
    const s = go(go(state(), 'fund'), 'mutual_settlement', { to_contractor: 0 })
    expect(s.contract.status).toBe('ended_unfinished')
    expect(s.balances[CLIENT]).toBe(2_000_000)
    expect(s.account!.fee_transferred).toBe(0)
    expect(escrowBalance(s.account!)).toBe(0)
  })
  it('partial termination: fee only on amounts paid out', () => {
    let s = go(go(state(), 'fund'), 'claim_advance', { milestone_id: 'm1' })
    s = go(s, 'mutual_settlement', { to_contractor: 100_000 })
    expect(s.account!.fee_transferred).toBe(4_000) // 2% of 200,000 paid out
    expect(s.balances[CONTRACTOR]).toBe(200_000)
    expect(s.balances[CLIENT]).toBe(1_000_000 + 1_000_000 - 200_000 - 4_000)
    expect(escrowBalance(s.account!)).toBe(0)
  })
  it('needs both parties and cannot overpay the contractor', () => {
    const s = go(state(), 'fund')
    expect(() => run(s, 'mutual_settlement', { to_contractor: 0 }, { signers: [CLIENT] })).toThrow()
    expect(() => run(s, 'mutual_settlement', { to_contractor: 1_000_000 })).toThrow(/At most/)
  })
})

describe('replace_mediator', () => {
  it('needs both parties and an active Mediator', () => {
    const s = go(state(), 'fund')
    expect(() => run(s, 'replace_mediator', { mediator_id: CONTRACTOR })).toThrow(/Mediator/)
    expect(go(s, 'replace_mediator', { mediator_id: MEDIATOR2 }).account!.mediator_id).toBe(MEDIATOR2)
  })
})

describe('Path 2: objection, settlement, Mediator (§4.3)', () => {
  it('a full objection freezes only the disputed amount; undisputed releases continue', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'object', { completion_request_id: openRequest(s).id, disputed_amount: 280_000, reason: 'Work not done' })
    expect(s.account!.disputed_amount).toBe(280_000)
    expect(s.disputes[0]).toMatchObject({ status: 'between_parties', scope: 'request', opened_by: 'client' })
    s = go(s, 'claim_advance', { milestone_id: 'm1' }) // undisputed: still works
    expect(s.balances[CONTRACTOR]).toBe(100_000)
  })
  it('an objection needs a reason and an amount within the request', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    const rid = openRequest(s).id
    expect(() => run(s, 'object', { completion_request_id: rid, disputed_amount: 1, reason: '' })).toThrow(/reason/)
    expect(() => run(s, 'object', { completion_request_id: rid, disputed_amount: 280_001, reason: 'x' })).toThrow(/cannot exceed/)
  })
  it('object in part releases the undisputed part now', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'object', { completion_request_id: openRequest(s).id, disputed_amount: 80_000, reason: 'Paint missing' })
    expect(s.balances[CONTRACTOR]).toBe(200_000)
    expect(s.account!.disputed_amount).toBe(80_000)
  })
  it('only settle by both parties releases a disputed amount; the Mediator cannot sign', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'object', { completion_request_id: openRequest(s).id, disputed_amount: 280_000, reason: 'x' })
    const d = s.disputes[0].id
    expect(() => run(s, 'approve', { completion_request_id: s.requests[0].id })).toThrow(/not open/)
    expect(() => run(s, 'settle', { dispute_id: d, to_contractor: 280_000, to_client: 0 }, { signers: [CLIENT, MEDIATOR] })).toThrow()
    expect(() => run(s, 'settle', { dispute_id: d, to_contractor: 1, to_client: 0 })).toThrow(/add up/)
    s = go(s, 'settle', { dispute_id: d, to_contractor: 200_000, to_client: 80_000 })
    expect(s.account!.disputed_amount).toBe(0)
    expect(s.balances[CONTRACTOR]).toBe(200_000)
    expect(s.balances[CLIENT]).toBe(1_080_000)
    expect(s.milestones[1].status).toBe('paid')
  })
  it('withdrawing the objection reopens Path 1', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    const rid = openRequest(s).id
    s = go(s, 'object', { completion_request_id: rid, disputed_amount: 280_000, reason: 'x' })
    s = go(s, 'settle', { dispute_id: s.disputes[0].id, mode: 'withdraw' })
    expect(s.requests[0].status).toBe('open')
    s = go(s, 'approve', { completion_request_id: rid })
    expect(s.balances[CONTRACTOR]).toBe(280_000)
  })
  it('either party activates the Mediator alone; the period runs 30 days from activation', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'object', { completion_request_id: openRequest(s).id, disputed_amount: 280_000, reason: 'x' })
    s = go(s, 'activate_mediator', { dispute_id: s.disputes[0].id }, { actor: CONTRACTOR })
    expect(s.account!.mediator_active).toBe(true)
    expect(s.disputes[0].mediator_due_at).toBe(new Date(T0.getTime() + 30 * DAY).toISOString())
    expect(() => run(s, 'activate_mediator', { dispute_id: s.disputes[0].id }, { actor: CLIENT })).toThrow(/already active/)
    expect(() => run(s, 'activate_mediator', { dispute_id: s.disputes[0].id }, { actor: MEDIATOR })).toThrow(/contract party/)
  })
  it('full objection on the final delivery, then settlement completes the contract', () => {
    let s = toFinalRequest()
    const R = openRequest(s).requested_amount
    expect(R).toBe(300_000 + 300_000 - 100_000) // final + unspent materials − holdback
    s = go(s, 'object', { completion_request_id: openRequest(s).id, disputed_amount: R, reason: 'Defects' })
    expect(s.contract.status).toBe('active')
    s = go(s, 'settle', { dispute_id: s.disputes[0].id, to_contractor: 400_000, to_client: 100_000 })
    expect(s.contract.status).toBe('completed')
    expect(s.account!.fee_transferred).toBe(20_000)
    expect(escrowBalance(s.account!)).toBe(100_000)
  })
  it('warranty objection freezes unclaimed tranches up to the amount; claimed tranches stay final', () => {
    let s = toFinalRequest({ warranty: 30 })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    s = go(s, 'claim_holdback_tranche', { sequence: 1 }, { now: new Date(T0.getTime() + 15 * DAY) })
    s = go(s, 'object', { disputed_amount: 30_000, reason: 'Leak' })
    const frozen = s.account!.holdback_tranches.filter((t) => t.status === 'frozen')
    expect(frozen.reduce((x, t) => x + t.amount, 0)).toBe(30_000)
    const free = s.account!.holdback_tranches.find((t) => t.status === 'pending')!
    expect(free.amount).toBe(20_000)
    expect(() => run(s, 'claim_holdback_tranche', { sequence: frozen[0].sequence }, { now: new Date(T0.getTime() + 31 * DAY) })).toThrow(/frozen/)
    expect(() => run(s, 'object', { disputed_amount: 20_001, reason: 'x' })).toThrow(/At most/)
    s = go(s, 'claim_holdback_tranche', { sequence: free.sequence }, { now: new Date(T0.getTime() + 31 * DAY) })
    s = go(s, 'settle', { dispute_id: s.disputes[0].id, to_contractor: 10_000, to_client: 20_000 })
    expect(s.contract.status).toBe('closed')
    expect(escrowBalance(s.account!)).toBe(0)
  })
  it('system triggers open a case and activate the Mediator without moving money (L4, D17)', () => {
    let s = toFinalRequest()
    const before = structuredClone(s.balances)
    s = go(s, 'system_open_dispute', { completion_request_id: openRequest(s).id, trigger: 'silence' })
    expect(s.disputes[0]).toMatchObject({ opened_by: 'system', trigger: 'silence', status: 'mediator_active' })
    expect(s.balances).toEqual(before)
    const esc = run(s, 'escalate', { dispute_id: s.disputes[0].id }, { actor: CONTRACTOR })
    expect(esc.state.balances).toEqual(before)
  })
})

describe('holdback always 10% (§3.4, D25, D27)', () => {
  it('withholds the full 10% even when the final phase is exactly 10% and no materials are left', () => {
    // 10,000.00: advance 1,000, work 6,800, final 1,000 (10%), materials 1,000 fully spent, fee 200
    let s = go(state({ materials: 100_000, milestones: [['advance', 100_000], ['work', 680_000], ['final', 100_000]] }), 'fund')
    s = go(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 100_000 }, { actor: CONTRACTOR })
    s = go(s, 'claim_advance', { milestone_id: 'm1' })
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    s = go(s, 'request_completion', { milestone_id: 'm3', evidence_text: 'done' })
    expect(openRequest(s).requested_amount).toBe(0) // 1,000 final − 1,000 holdback
    s = go(s, 'approve', { completion_request_id: openRequest(s).id })
    expect(s.account!.holdback_amount).toBe(100_000)
    expect(s.account!.holdback_tranches.reduce((x, t) => x + t.amount, 0)).toBe(100_000)
    expect(escrowBalance(s.account!)).toBe(100_000)
  })
})

describe('contractor opens a dispute (§4.3 stage 1a, D27)', () => {
  it('the contractor alone signs object on their open request; the whole requested amount is frozen', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    const rid = openRequest(s).id
    const a: Action = { type: 'object', params: {}, actor: CONTRACTOR }
    expect(requiredSigners(s, a)).toEqual([CONTRACTOR])
    expect(() => run(s, 'object', { completion_request_id: rid, disputed_amount: 280_000 }, { actor: CONTRACTOR })).toThrow(/reason/)
    expect(() => run(s, 'object', { completion_request_id: rid, disputed_amount: 100_000, reason: 'Client does not respond' }, { actor: CONTRACTOR })).toThrow(/whole requested amount/)
    const r = run(s, 'object', { completion_request_id: rid, disputed_amount: 280_000, reason: 'Client does not respond' }, { actor: CONTRACTOR })
    s = r.state
    expect(s.disputes[0]).toMatchObject({ opened_by: 'contractor', scope: 'request', status: 'between_parties', disputed_amount: 280_000 })
    expect(s.account!.disputed_amount).toBe(280_000)
    expect(s.balances[CONTRACTOR]).toBe(0)
    expect(r.notices[0].user_id).toBe(CLIENT)
    // Undisputed amounts continue on Path 1: the advance can still be claimed.
    s = go(s, 'claim_advance', { milestone_id: 'm1' })
    expect(s.balances[CONTRACTOR]).toBe(100_000)
    // Only settle by both releases the disputed amount.
    s = go(s, 'settle', { dispute_id: s.disputes[0].id, to_contractor: 250_000, to_client: 30_000 })
    expect(s.balances[CONTRACTOR]).toBe(350_000)
    expect(s.account!.disputed_amount).toBe(0)
  })
  it('a contractor needs an open request; a mediator or outsider cannot object', () => {
    const s = go(state(), 'fund')
    expect(() => run(s, 'object', { disputed_amount: 1_000, reason: 'x' }, { actor: CONTRACTOR })).toThrow(/open completion requests/)
    expect(() => run(s, 'object', { disputed_amount: 1_000, reason: 'x' }, { actor: MEDIATOR })).toThrow(/contract party/)
  })
  it('a client still objects alone, and the client signature is not enough for a contractor objection', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    const params = { completion_request_id: openRequest(s).id, disputed_amount: 280_000, reason: 'x' }
    expect(() => run(s, 'object', params, { actor: CONTRACTOR, signers: [CLIENT] })).toThrow()
    expect(go(s, 'object', params, { actor: CLIENT }).disputes[0].opened_by).toBe('client')
  })
})

describe('repair agreements (§4.5, D11)', () => {
  it('release everything except the held amount; a new request for the repair releases the rest', () => {
    let s = go(state(), 'fund')
    s = go(s, 'request_completion', { milestone_id: 'm2', evidence_text: 'x' })
    s = go(s, 'object', { completion_request_id: openRequest(s).id, disputed_amount: 280_000, reason: 'Two doors misaligned' })
    s = go(s, 'repair_agreement', { dispute_id: s.disputes[0].id, held_amount: 30_000, description: 'Realign doors' })
    expect(s.balances[CONTRACTOR]).toBe(250_000)
    expect(s.account!.repair_held).toBe(30_000)
    const ra = s.repairs[0]
    s = go(s, 'request_completion', { repair_agreement_id: ra.id, evidence_text: 'Doors realigned' })
    const rr = openRequest(s)
    expect(rr.requested_amount).toBe(30_000)
    expect(rr.response_due_at).not.toBeNull()
    expect(rr.payment_deadline_at).not.toBeNull()
    s = go(s, 'approve', { completion_request_id: rr.id })
    expect(s.balances[CONTRACTOR]).toBe(280_000)
    expect(s.account!.repair_held).toBe(0)
    expect(s.milestones[1].status).toBe('paid')
  })
})

describe('atomicity', () => {
  it('a rejected action leaves the input state untouched', () => {
    const s = go(state(), 'fund')
    const snapshot = JSON.stringify(s)
    expect(() => run(s, 'pay_supplier', { supplier_id: SUPPLIER, amount: 999_999 })).toThrow()
    expect(JSON.stringify(s)).toBe(snapshot)
  })
})
