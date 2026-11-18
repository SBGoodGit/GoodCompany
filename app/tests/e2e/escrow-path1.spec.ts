// Path 1 end-to-end (assignment §7): signed contract → funding → advance and supplier payment →
// completion → approval → holdback tranches, with the §7.1 numbers:
// contract 10,000.00 → contractor 7,200.00, suppliers 2,600.00, fee 200.00, escrow empty.
import { expect, test, type Browser } from '@playwright/test'
import { createUser, login, stepUp } from './helpers'
import { call, creditBalance, signedContract, superuserDb, tokenFor } from './api'

async function pageFor(browser: Browser, u: { email: string; password: string }) {
  const page = await (await browser.newContext()).newPage()
  await login(page, u)
  return page
}

test('Path 1: fund → advance → supplier → completion → approval → holdback tranches', async ({ browser }) => {
  const client = await createUser('Paula Client', 'client')
  const contractor = await createUser('Kees Contractor', 'contractor')
  const supplier = await createUser('Wood Supplier', 'contractor')
  await creditBalance(client.email, '25000')
  const contractId = await signedContract(client, contractor)

  // Client funds the escrow (step-up)
  const c = await pageFor(browser, client)
  await c.goto(`/contracts/${contractId}`)
  await expect(c.getByTestId('contract-status')).toHaveText('awaiting funding')
  await c.getByTestId('fund').click()
  await expect(c.getByTestId('step-up')).toContainText('€200.00 platform fee is frozen')
  await stepUp(c, client.password)
  await expect(c.getByTestId('contract-status')).toHaveText('active')
  await expect(c.getByTestId('my-balance')).toHaveText('€15,000.00')
  await expect(c.getByText('SIMULATED BALANCES — NO REAL MONEY')).toBeVisible()

  // Contractor: advance, supplier payments 2,600 linked to the material line (sets it to ordered)
  const k = await pageFor(browser, contractor)
  await k.goto(`/contracts/${contractId}`)
  await k.getByTestId('claim-advance').click()
  await stepUp(k, contractor.password)
  await expect(k.getByTestId('notice')).toHaveText('Advance paid')
  await expect(k.getByTestId('pay-supplier')).toBeDisabled() // the supplier declaration is required (D29)
  await k.getByTestId('supplier-not-connected').check()
  for (const amount of ['2000', '600']) {
    await k.getByTestId('supplier-email').fill(supplier.email)
    await k.getByTestId('supplier-amount').fill(amount)
    await k.getByTestId('pay-line-1').check()
    await k.getByTestId('pay-supplier').click()
    await stepUp(k, contractor.password)
    await expect(k.getByTestId('notice')).toHaveText('Supplier paid')
  }
  await expect(k.getByText('paid to suppliers €2,600.00 · left €400.00')).toBeVisible()

  // The client never sees supplier payment amounts
  await c.reload()
  await expect(c.locator('body')).not.toContainText('2,600')
  await expect(c.locator('body')).not.toContainText('€600.00')
  await expect(c.getByTestId('material-line-1').getByTestId('material-status-tag')).toHaveText('ordered') // status only (D29)
  await c.goto('/dashboard')
  await expect(c.getByText('The contractor paid a supplier from the materials budget').first()).toBeVisible()
  const clientToken = await tokenFor(client)
  const clientEscrow = await call(clientToken, 'GET', `/api/contracts/${contractId}/escrow`)
  expect(clientEscrow.escrow).not.toHaveProperty('paid_to_suppliers')
  expect(Object.keys(clientEscrow.material_lines[0]).sort()).toEqual(['description', 'id', 'position', 'status'])
  expect(clientEscrow.escrow).not.toHaveProperty('balance')
  const clientLedger = await call(clientToken, 'GET', `/api/contracts/${contractId}/ledger`)
  expect(clientLedger.map((l: any) => l.action_type)).not.toContain('supplier_payment')

  // Work milestone: request with evidence → client approves
  await k.getByTestId('evidence-2').fill('Photos of the installed carcasses')
  await k.getByTestId('request-2').click()
  await stepUp(k, contractor.password)
  await expect(k.getByTestId('notice')).toHaveText('Completion requested')
  await c.goto(`/contracts/${contractId}`)
  await expect(c.getByTestId('open-request')).toContainText('€2,800.00 requested')
  await c.getByTestId('respond').click() // approve is the default
  await stepUp(c, client.password)
  await expect(c.getByTestId('notice')).toHaveText('Approved')

  // Final delivery: 14-day window runs; client approves → completed, holdback withheld, fee to collect-wallet
  await k.reload()
  await k.getByTestId('evidence-3').fill('Walkthrough done, photos attached')
  await k.getByTestId('request-3').click()
  await stepUp(k, contractor.password)
  await expect(k.getByTestId('notice')).toHaveText('Completion requested')
  await c.reload()
  await expect(c.getByTestId('open-request')).toContainText('Final delivery — €2,400.00 requested')
  await expect(c.getByTestId('open-request')).toContainText('Response window: 13 days')
  await c.getByTestId('respond').click()
  await stepUp(c, client.password)
  await expect(c.getByTestId('contract-status')).toHaveText('completed')

  // Tranches are not claimable before their date; move the warranty start 30 days back in the test DB
  await k.reload()
  await expect(k.getByTestId('claim-tranche-1')).toBeDisabled()
  const sql = superuserDb()
  const [acc] = await sql`select holdback_tranches from escrow_accounts where contract_id = ${contractId}`
  const shifted = acc.holdback_tranches.map((t: any) => ({ ...t, claimable_from: new Date(Date.now() - 1000).toISOString() }))
  await sql`update escrow_accounts set holdback_tranches = ${sql.json(shifted)} where contract_id = ${contractId}`
  await k.reload()
  for (const n of [1, 2]) {
    await k.getByTestId(`claim-tranche-${n}`).click()
    await stepUp(k, contractor.password)
    await expect(k.getByTestId('notice')).toHaveText('Tranche claimed')
  }
  await expect(k.getByTestId('contract-status')).toHaveText('closed')
  await expect(k.getByTestId('escrow-balance')).toHaveText('€0.00')

  // §7.1: contractor 7,200, suppliers 2,600, fee 200
  const [bal] = await sql`select (select balance from simulated_balances where user_id = ${contractor.id}) as contractor,
                                 (select balance from simulated_balances where user_id = ${supplier.id}) as supplier,
                                 (select amount from fee_collection_items where contract_id = ${contractId}) as fee`
  expect(Number(bal.contractor)).toBe(720_000)
  expect(Number(bal.supplier)).toBe(260_000)
  expect(Number(bal.fee)).toBe(20_000)
  await sql.end()
})
