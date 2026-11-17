// Path 2 end-to-end (assignment §7): objection → Mediator activation → advice → settlement.
// Plus: trigger (b) silence opens a case and activates the Mediator automatically, without payout.
import { expect, test, type Browser } from '@playwright/test'
import { createUser, login, stepUp } from './helpers'
import { call, creditBalance, escrowAction, signedContract, superuserDb, tokenFor } from './api'

// Restore the seeded default Mediator after these tests change it.
test.afterAll(async () => {
  const sql = superuserDb()
  const [m] = await sql`select id from users where email = 'mediator@goodcompany.test'`
  if (m) await sql`update app_settings set value = ${sql.json(m.id)} where key = 'default_mediator_id'`
  await sql.end()
})

async function pageFor(browser: Browser, u: { email: string; password: string }) {
  const page = await (await browser.newContext()).newPage()
  await login(page, u)
  return page
}

/** A dedicated Mediator for this run, set as the default so the new contract names them. */
async function freshMediator() {
  const m = await createUser('Maya Mediator', 'client')
  const sql = superuserDb()
  await sql`update users set role = 'mediator' where id = ${m.id}`
  await sql`update app_settings set value = ${sql.json(m.id)} where key = 'default_mediator_id'`
  await sql.end()
  return m
}

/** Signed, funded contract with every milestone but the final paid and the final delivery requested. */
async function atFinalRequest(client: any, contractor: any) {
  await creditBalance(client.email, '20000')
  const id = await signedContract(client, contractor)
  const c = { token: await tokenFor(client), password: client.password }
  const k = { token: await tokenFor(contractor), password: contractor.password }
  await escrowAction(c, id, 'fund')
  const esc = await call(c.token, 'GET', `/api/contracts/${id}/escrow`)
  const [adv, work, fin] = esc.milestones
  await escrowAction(k, id, 'claim_advance', { milestone_id: adv.id })
  await escrowAction(k, id, 'request_completion', { milestone_id: work.id, evidence_text: 'Carcasses installed' })
  const r = (await call(c.token, 'GET', `/api/contracts/${id}/escrow`)).requests.find((x: any) => x.status === 'open')
  await escrowAction(c, id, 'approve', { completion_request_id: r.id })
  await escrowAction(k, id, 'request_completion', { milestone_id: fin.id, evidence_text: 'All delivered' })
  return id
}

test('Path 2: objection → Mediator activation → advice after 48h notice → settlement', async ({ browser }) => {
  const mediator = await freshMediator()
  const client = await createUser('Olga Objector', 'client')
  const contractor = await createUser('Bram Builder', 'contractor')
  const id = await atFinalRequest(client, contractor)

  // Client objects to the whole final delivery (5,000 requested: 3,000 final + 3,000 unspent materials − 1,000 holdback)
  const c = await pageFor(browser, client)
  await c.goto(`/contracts/${id}`)
  await expect(c.getByTestId('open-request')).toContainText('Final delivery — €5,000.00 requested')
  await c.getByTestId('mode-object').check()
  await c.getByTestId('objection-reason').fill('Two doors do not close and the worktop is scratched.')
  await c.getByTestId('respond').click()
  await stepUp(c, client.password)
  await expect(c.getByTestId('notice')).toHaveText('Objection recorded; the amount stays in escrow')
  await expect(c.getByText('Disputed and frozen: €5,000.00')).toBeVisible()
  await expect(c.getByTestId('contract-status')).toHaveText('active')

  // Before activation the Mediator cannot see the case (D18)
  const mToken = await tokenFor(mediator)
  expect((await call(mToken, 'GET', '/api/mediator/cases')).length).toBe(0)

  // Contractor activates the Mediator alone
  const k = await pageFor(browser, contractor)
  await k.goto(`/contracts/${id}`)
  await k.getByTestId('dispute-link').click()
  await k.getByTestId('activate-mediator').click()
  await stepUp(k, contractor.password)
  await expect(k.getByTestId('dispute-status')).toHaveText('mediator active')
  const disputeUrl = k.url()

  // Mediator console: notice first, advice refused until 48 hours have passed
  const m = await pageFor(browser, mediator)
  await m.goto('/mediator')
  await m.getByRole('link', { name: /Escrow test job/ }).click()
  await m.getByTestId('advice-content').fill('Contractor repairs the doors; client pays 4,500.00, 500.00 back to the client for the worktop.')
  await m.getByTestId('advice-reasoning').fill('Doors are fixable; the scratch is permanent.')
  await m.getByTestId('issue-advice').click()
  await expect(m.getByTestId('error')).toContainText('Notify both parties first')
  await m.getByTestId('advice-notice').click()
  await expect(m.getByTestId('notice')).toHaveText('Both parties notified')
  await m.getByTestId('issue-advice').click()
  await expect(m.getByTestId('error')).toContainText('The notice period runs until')
  const sql = superuserDb()
  await sql`update dispute_cases set advice_notice_at = now() - interval '49 hours' where contract_id = ${id}`
  await m.reload()
  await m.getByTestId('advice-content').fill('Client pays 4,500.00 to the contractor; 500.00 returns to the client.')
  await m.getByTestId('advice-reasoning').fill('Doors are fixable; the scratch is permanent.')
  await m.getByTestId('issue-advice').click()
  await expect(m.getByTestId('notice')).toHaveText('Advice issued')
  // The Mediator has no signing role: preparing a settlement is refused
  await expect(call(mToken, 'POST', `/api/contracts/${id}/escrow/actions`, { type: 'settle', params: {} })).rejects.toThrow(/404|not found/i)

  // Advice is non-binding: nothing moved. The parties execute it as a settlement.
  await c.goto(disputeUrl)
  await expect(c.getByTestId('advice')).toContainText('Client pays 4,500.00')
  await c.getByTestId('split-contractor').fill('4500')
  await c.getByTestId('split-client').fill('500')
  await c.getByTestId('propose-settle').click()
  await stepUp(c, client.password)
  await expect(c.getByTestId('notice')).toHaveText('Signed. Waiting for the other party.')
  await k.goto(disputeUrl)
  await k.getByTestId('sign-settle').click()
  await stepUp(k, contractor.password)
  await expect(k.getByTestId('dispute-status')).toHaveText('settled')

  // Settlement concluded the final delivery: completed, fee transferred, holdback for the warranty
  await k.goto(`/contracts/${id}`)
  await expect(k.getByTestId('contract-status')).toHaveText('completed')
  const [row] = await sql`select e.disputed_amount, e.holdback_amount, e.fee_transferred,
      (select balance from simulated_balances where user_id = ${contractor.id}) as contractor,
      (select balance from simulated_balances where user_id = ${client.id}) as client
      from escrow_accounts e where e.contract_id = ${id}`
  expect(Number(row.disputed_amount)).toBe(0)
  expect(Number(row.fee_transferred)).toBe(20_000)
  expect(Number(row.holdback_amount)).toBe(100_000)
  expect(Number(row.contractor)).toBe(100_000 + 280_000 + 450_000)
  expect(Number(row.client)).toBe(2_000_000 - 1_000_000 + 50_000)
  await sql.end()
})

test('trigger (b): 14 days of client silence opens a case and activates the Mediator, without payout', async () => {
  await freshMediator()
  const client = await createUser('Silent Sid', 'client')
  const contractor = await createUser('Waiting Wim', 'contractor')
  const id = await atFinalRequest(client, contractor)
  const sql = superuserDb()
  const before = await sql`select balance from simulated_balances where user_id = ${contractor.id}`
  await sql`update completion_requests set last_party_action_at = now() - interval '15 days' where contract_id = ${id} and status = 'open'`
  const admin = await tokenFor({ email: process.env.SEED_ADMIN_EMAIL!, password: process.env.SEED_ADMIN_PASSWORD! })
  const r1 = await call(admin, 'POST', '/api/admin/system/run-job', { job: 'triggers' })
  expect(r1.result.disputes_opened).toBeGreaterThanOrEqual(1)
  const [d] = await sql`select * from dispute_cases where contract_id = ${id}`
  expect(d).toMatchObject({ opened_by: 'system', trigger: 'silence', status: 'mediator_active' })
  expect(d.mediator_activated_at).not.toBeNull()
  const after = await sql`select balance from simulated_balances where user_id = ${contractor.id}`
  expect(after[0].balance).toBe(before[0].balance) // nothing happens by itself (L4)
  // Re-running is idempotent
  await call(admin, 'POST', '/api/admin/system/run-job', { job: 'triggers' })
  expect((await sql`select count(*)::int as n from dispute_cases where contract_id = ${id}`)[0].n).toBe(1)
  // The waiting contractor may confirm the escalation; still no money moves
  await escrowAction({ token: await tokenFor(contractor), password: contractor.password }, id, 'escalate', { dispute_id: d.id })
  expect((await sql`select balance from simulated_balances where user_id = ${contractor.id}`)[0].balance).toBe(before[0].balance)
  await sql.end()
})
