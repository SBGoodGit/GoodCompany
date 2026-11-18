// Round 2b (D29): a material-only delivery from estimate through signing, funding, completion
// request and approval. No holdback and no warranty tranches; the 14-day window and the 2% fee apply.
// Third-party material lines carry an order status the client sees without amounts.
import { expect, test } from '@playwright/test'
import { createUser, login } from './helpers'
import { call, creditBalance, escrowAction, stepUpToken, toQuoteStage, tokenFor } from './api'

test('material-only delivery: no holdback, line status, final approval closes the contract', async ({ browser }) => {
  const client = await createUser('Dora Delivery', 'client')
  const contractor = await createUser('Tom Tiles', 'contractor')
  const supplier = await createUser('Tile Wholesale', 'contractor')
  const c = { ...client, token: await tokenFor(client) }
  const k = { ...contractor, token: await tokenFor(contractor) }
  const job = await call(c.token, 'POST', '/api/jobs', { title: `Roof tiles delivery ${Date.now()}`, category: 'roofing', region: 'Utrecht', description: 'Deliver tiles' })
  const ws = await toQuoteStage(c, k, job.id, {
    warranty_period_days: 30, execution_period_days: 7,
    payment_phases: [{ kind: 'final', description: 'Delivery on site', evidence_required: 'Signed delivery note' }],
  }, { roofing_type: 'Pitched, ceramic tiles' })

  // Estimate: tiles bought from a third party, ridge tiles from own stock, transport
  const quote = await call(k.token, 'POST', `/api/workspaces/${ws.id}/quote`, {
    scope_of_work: 'Deliver 400 roof tiles and 20 ridge tiles to the site. No fitting.', detail_level: 'lines',
    sections: [{ key: 'm', title: 'Tiles', kind: 'third_party' }, { key: 'o', title: 'Ridge tiles', kind: 'own_supply' }, { key: 't', title: 'Transport', kind: 'general' }],
    lines: [
      { section: 'm', description: 'Ceramic roof tiles', kind: 'material', quantity: 400, unit: 'piece', unit_price: '25', phase: 1 },
      { section: 'o', description: 'Ridge tiles from own stock', kind: 'material', quantity: 20, unit: 'piece', unit_price: '5', phase: 1 },
      { section: 't', description: 'Delivery to site', kind: 'transport', quantity: 1, unit: 'trip', unit_price: '50', phase: 1 },
    ],
  })
  expect(quote.materials_budget_amount).toBe(1_000_000)
  expect(quote.phase_amounts[0].amount).toBe(15_000)
  expect(quote.estimate.holdback_applies).toBe(false)

  // The client sees the kind of each section and that no holdback applies, then accepts
  const cp = await (await browser.newContext()).newPage()
  await login(cp, client)
  await cp.goto(`/workspaces/${ws.id}`)
  await expect(cp.getByTestId('estimate-lines')).toContainText('Materials bought from third parties')
  await expect(cp.getByTestId('estimate-lines')).toContainText('Materials supplied by the contractor')
  await expect(cp.getByTestId('delivery-note')).toBeVisible()
  await cp.getByTestId('accept-quote').click()
  await expect(cp.getByText('Holdback: 0% = €0.00')).toBeVisible()
  await expect(cp.getByText('This is a material-only delivery: no holdback applies')).toBeVisible()

  // Both sign; the client funds
  const view = await call(c.token, 'GET', `/api/workspaces/${ws.id}`)
  let contractId = ''
  for (const u of [k, c]) {
    const r = await call(u.token, 'POST', `/api/workspaces/${ws.id}/sign`, { snapshot_hash: view.preview.hash }, { 'x-step-up-token': await stepUpToken(u.token, u.password) })
    if (r.contract_id) contractId = r.contract_id
  }
  expect(contractId).not.toBe('')
  await creditBalance(client.email, String(quote.total_amount / 100))
  await escrowAction(c, contractId, 'fund')

  // Supplier payment linked to the tile line → ordered; the declaration is required
  let e = await call(k.token, 'GET', `/api/contracts/${contractId}/escrow`)
  expect(e.material_lines).toHaveLength(1)
  const tiles = e.material_lines[0]
  expect(tiles).toMatchObject({ description: 'Ceramic roof tiles', status: 'not_ordered', amount: 1_000_000 })
  await expect(escrowAction(k, contractId, 'pay_supplier', { supplier_email: supplier.email, amount: '9500', material_line_ids: [tiles.id] })).rejects.toThrow(/not a company connected to you/)
  await expect(call(k.token, 'POST', `/api/contracts/${contractId}/escrow/actions`, { type: 'pay_supplier', params: { supplier_email: supplier.email, amount: '9500', supplier_not_connected: true } })).rejects.toThrow(/Choose the material line/)
  const paid = await escrowAction(k, contractId, 'pay_supplier', { supplier_email: supplier.email, amount: '9500', material_line_ids: [tiles.id], supplier_not_connected: true })
  expect(paid.status).toBe('applied')
  e = await call(c.token, 'GET', `/api/contracts/${contractId}/escrow`)
  expect(e.material_lines).toEqual([{ id: tiles.id, position: 1, description: 'Ceramic roof tiles', status: 'ordered' }])
  await call(k.token, 'POST', `/api/contracts/${contractId}/material-lines/${tiles.id}`, { status: 'delivered' })
  await expect(call(c.token, 'POST', `/api/contracts/${contractId}/material-lines/${tiles.id}`, { status: 'not_ordered' })).rejects.toThrow(/Only the contractor/)
  await cp.goto(`/contracts/${contractId}`)
  await expect(cp.getByTestId('material-line-1').getByTestId('material-status-tag')).toHaveText('delivered')
  await expect(cp.getByTestId('materials')).not.toContainText('9,500')

  // Final completion request with proof of delivery: the 14-day window applies; approval pays out, no holdback
  e = await call(k.token, 'GET', `/api/contracts/${contractId}/escrow`)
  await escrowAction(k, contractId, 'request_completion', { milestone_id: e.milestones[0].id, evidence_text: 'Delivery note signed by the client on site' })
  e = await call(c.token, 'GET', `/api/contracts/${contractId}/escrow`)
  const req = e.requests.find((r: any) => r.status === 'open')
  expect(req.response_due_at).not.toBeNull()
  expect(req.requested_amount).toBe(15_000 + 50_000) // transport + own supply + unspent materials budget
  await escrowAction(c, contractId, 'approve', { completion_request_id: req.id })
  e = await call(k.token, 'GET', `/api/contracts/${contractId}/escrow`)
  expect(e.contract_status).toBe('closed')
  expect(e.escrow.holdback_tranches).toEqual([])
  expect(e.escrow.fee_transferred).toBe(quote.fee_amount)
})
