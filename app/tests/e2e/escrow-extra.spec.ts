// API-level checks of the remaining escrow flows against the real database: Change Orders
// (positive, negative, rejection), repair agreement, nested contract, mutual settlement.
import { expect, test } from '@playwright/test'
import { createUser } from './helpers'
import { call, creditBalance, escrowAction, estimateFor, signedContract, stepUpToken, superuserDb, tokenFor } from './api'

async function parties() {
  const client = await createUser('Cora Client', 'client')
  const contractor = await createUser('Dirk Doer', 'contractor')
  await creditBalance(client.email, '30000')
  const id = await signedContract(client, contractor)
  const c = { token: await tokenFor(client), password: client.password, id: client.id }
  const k = { token: await tokenFor(contractor), password: contractor.password, id: contractor.id }
  await escrowAction(c, id, 'fund')
  const esc = await call(c.token, 'GET', `/api/contracts/${id}/escrow`)
  return { id, c, k, milestones: esc.milestones }
}
const escrowOf = (u: { token: string }, id: string) => call(u.token, 'GET', `/api/contracts/${id}/escrow`)
const openReq = async (u: { token: string }, id: string) => (await escrowOf(u, id)).requests.find((r: any) => r.status === 'open')

test('Change Orders: positive deposit in one action, negative to client surplus, rejection needs a reason', async () => {
  const { id, c, k, milestones } = await parties()
  const final = milestones.find((m: any) => m.kind === 'final')
  // Contractor proposes +500.00: final 3,000 → 3,490 (fee +10)
  const st = await stepUpToken(k.token, k.password)
  const res = await call(k.token, 'POST', `/api/contracts/${id}/change-orders`,
    { description: 'Extra shelf', motivation: 'Client asked for it', amount_delta: '500', milestone_changes: [{ milestone_id: final.id, amount: '3490' }] },
    { 'x-step-up-token': st })
  expect(res.action.status).toBe('awaiting_signatures')
  const st2 = await stepUpToken(c.token, c.password)
  const signed = await call(c.token, 'POST', `/api/escrow/actions/${res.action.id}/sign`, {}, { 'x-step-up-token': st2 })
  expect(signed.status).toBe('applied')
  let e = await escrowOf(k, id)
  expect(e.escrow.principal_total).toBe(1_050_000)
  expect(e.escrow.fee_reserved).toBe(21_000)
  expect(e.escrow.holdback_amount).toBe(105_000)
  expect(e.change_orders[0].status).toBe('effective')

  // Client proposes −1,000.00 off the work phase (−980) and fee (−20); contractor accepts
  const work = milestones.find((m: any) => m.kind === 'work')
  const st3 = await stepUpToken(c.token, c.password)
  const neg = await call(c.token, 'POST', `/api/contracts/${id}/change-orders`,
    { description: 'Drop the plinth', motivation: 'Not needed', amount_delta: '-1000', milestone_changes: [{ milestone_id: work.id, amount: '1820' }] },
    { 'x-step-up-token': st3 })
  const st4 = await stepUpToken(k.token, k.password)
  await call(k.token, 'POST', `/api/escrow/actions/${neg.action.id}/sign`, {}, { 'x-step-up-token': st4 })
  e = await escrowOf(k, id)
  expect(e.escrow.client_surplus).toBe(100_000)
  expect(e.escrow.balance).toBe(1_050_000) // nothing left the escrow (P12)

  // A third one is rejected: a reason is required
  const st5 = await stepUpToken(k.token, k.password)
  const third = await call(k.token, 'POST', `/api/contracts/${id}/change-orders`,
    { description: 'Paint', motivation: 'Looks better', amount_delta: '0', milestone_changes: [] }, { 'x-step-up-token': st5 })
  await expect(call(c.token, 'POST', `/api/contracts/${id}/change-orders/${third.change_order.id}/reject`, { response_note: ' ' })).rejects.toThrow(/reason is required/)
  await call(c.token, 'POST', `/api/contracts/${id}/change-orders/${third.change_order.id}/reject`, { response_note: 'Not now' })
  expect((await escrowOf(k, id)).change_orders.find((x: any) => x.id === third.change_order.id).status).toBe('rejected')
})

test('repair agreement, then a nested contract after a part-payment', async () => {
  const { id, c, k, milestones } = await parties()
  const [adv, work, fin] = milestones
  await escrowAction(k, id, 'claim_advance', { milestone_id: adv.id })
  await escrowAction(k, id, 'request_completion', { milestone_id: work.id, evidence_text: 'done' })
  let r = await openReq(c, id)
  await escrowAction(c, id, 'object', { completion_request_id: r.id, disputed_amount: '2800', reason: 'Doors misaligned' })
  const dispute = (await escrowOf(c, id)).disputes[0]
  // Repair agreement: both sign; 2,500 released now, 300 held
  const ra = await call(c.token, 'POST', `/api/contracts/${id}/escrow/actions`, { type: 'repair_agreement', params: { dispute_id: dispute.id, held_amount: '300', description: 'Realign doors' } })
  for (const u of [c, k]) {
    const st = await stepUpToken(u.token, u.password)
    await call(u.token, 'POST', `/api/escrow/actions/${ra.id}/sign`, {}, { 'x-step-up-token': st })
  }
  let e = await escrowOf(k, id)
  expect(e.escrow.repair_held).toBe(30_000)
  expect(e.escrow.paid_to_contractor).toBe(100_000 + 250_000)
  const repairId = e.repairs[0].id
  await escrowAction(k, id, 'request_completion', { repair_agreement_id: repairId, evidence_text: 'Doors realigned' })
  r = await openReq(c, id)
  expect(r.requested_amount).toBe(30_000)
  expect(r.response_due_at).not.toBeNull()
  await escrowAction(c, id, 'approve', { completion_request_id: r.id })
  e = await escrowOf(k, id)
  expect(e.escrow.repair_held).toBe(0)
  expect(e.milestones[1].status).toBe('paid')

  // Final request, then extra work as a nested contract: signing waits for a (part-)payment of the first
  await escrowAction(k, id, 'request_completion', { milestone_id: fin.id, evidence_text: 'all done' })
  const ws = await call(c.token, 'POST', `/api/contracts/${id}/nested`, { message: 'Add a pantry cabinet' })
  expect(ws.stage).toBe('terms')
  const v = await call(k.token, 'POST', `/api/workspaces/${ws.id}/terms-versions`, {
    warranty_period_days: 15, execution_period_days: 10,
    payment_phases: [{ kind: 'final', description: 'Pantry cabinet', evidence_required: 'Photo' }],
  })
  await call(c.token, 'POST', `/api/workspaces/${ws.id}/terms-versions/${v.id}/accept`)
  await call(k.token, 'POST', `/api/workspaces/${ws.id}/quote`, estimateFor('1500', [{ kind: 'final', percentage: 98, description: 'Pantry cabinet' }], 0))
  await call(c.token, 'POST', `/api/workspaces/${ws.id}/quote/accept`)
  const view = await call(c.token, 'GET', `/api/workspaces/${ws.id}`)
  const sign = async (u: any) => call(u.token, 'POST', `/api/workspaces/${ws.id}/sign`, { snapshot_hash: view.preview.hash }, { 'x-step-up-token': await stepUpToken(u.token, u.password) })
  await expect(sign(k)).rejects.toThrow(/paid out, at least in part/)
  r = await openReq(c, id)
  await escrowAction(c, id, 'approve', { completion_request_id: r.id })
  await sign(k)
  const done = await sign(c)
  expect(done.status).toBe('contract_created')
  const sql = superuserDb()
  const [nested] = await sql`select parent_contract_id, status from contracts where id = ${done.contract_id}`
  expect(nested).toMatchObject({ parent_contract_id: id, status: 'awaiting_funding' })
  await sql.end()
})

test('mutual settlement before any payout: everything back to the client, no fee', async () => {
  const { id, c, k } = await parties()
  const before = (await escrowOf(c, id)).my_simulated_balance
  const a = await call(c.token, 'POST', `/api/contracts/${id}/escrow/actions`, { type: 'mutual_settlement', params: { to_contractor: '0' } })
  for (const u of [c, k]) await call(u.token, 'POST', `/api/escrow/actions/${a.id}/sign`, {}, { 'x-step-up-token': await stepUpToken(u.token, u.password) })
  const e = await escrowOf(c, id)
  expect(e.contract_status).toBe('ended_unfinished')
  expect(e.my_simulated_balance).toBe(before + 1_000_000)
  expect(e.escrow.fee_transferred).toBe(0)
})
