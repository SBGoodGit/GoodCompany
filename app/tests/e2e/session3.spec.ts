// Parts 9–12: final evaluation, invoices, reviews; fee batches and the Community Bank loan cycle;
// system jobs; admin settings. Time-dependent steps move timestamps back in the test database.
import { expect, test, type Browser } from '@playwright/test'
import { createUser, login } from './helpers'
import { call, creditBalance, escrowAction, signedContract, superuserDb, tokenFor } from './api'

const adminToken = () => tokenFor({ email: process.env.SEED_ADMIN_EMAIL!, password: process.env.SEED_ADMIN_PASSWORD! })
const setSetting = async (key: string, value: unknown) => call(await adminToken(), 'PUT', `/api/admin/settings/${key}`, { value })
const runJob = async (job: string) => call(await adminToken(), 'POST', '/api/admin/system/run-job', { job })

async function pageFor(browser: Browser, u: { email: string; password: string }) {
  const page = await (await browser.newContext()).newPage()
  await login(page, u)
  return page
}

/** Contract taken through to final approval (0-day warranty, so it closes at once). */
async function completedContract(warranty = 0) {
  const client = await createUser('Ines Invoice', 'client')
  const contractor = await createUser('Rob Review', 'contractor')
  await creditBalance(client.email, '20000')
  const id = await signedContract(client, contractor, { warranty })
  const c = { token: await tokenFor(client), password: client.password }
  const k = { token: await tokenFor(contractor), password: contractor.password }
  await escrowAction(c, id, 'fund')
  const ms = (await call(c.token, 'GET', `/api/contracts/${id}/escrow`)).milestones
  await escrowAction(k, id, 'claim_advance', { milestone_id: ms[0].id })
  for (const m of ms.slice(1)) {
    await escrowAction(k, id, 'request_completion', { milestone_id: m.id, evidence_text: 'done' })
    const r = (await call(c.token, 'GET', `/api/contracts/${id}/escrow`)).requests.find((x: any) => x.status === 'open')
    await escrowAction(c, id, 'approve', { completion_request_id: r.id })
  }
  return { id, client, contractor, c, k }
}

test('part 9: final approval produces the evaluation, invoices, fee statement; reviews with Rookie Stage', async ({ browser }) => {
  const { id, client, contractor, k } = await completedContract(0)
  const p = await pageFor(browser, client)
  await p.goto(`/contracts/${id}`)
  await expect(p.getByTestId('contract-status')).toHaveText('closed')
  await expect(p.getByTestId('evaluation')).toContainText('Signed by the contractor (final delivery)')
  // Client gets a `received` invoice for 100% of the contract amount (P19)
  await expect(p.getByTestId('invoice')).toHaveCount(1)
  await expect(p.getByTestId('invoice')).toContainText('invoice (received) · €10,000.00')
  // Contractor: issued invoice for 100% and a separate fee statement
  const inv = await call(k.token, 'GET', '/api/invoices')
  expect(inv.map((i: any) => [i.kind, i.direction, i.amount]).sort()).toEqual([['fee_statement', 'received', 20_000], ['invoice', 'issued', 1_000_000]])
  expect(inv[0].external_reference_id).toMatch(/^GC-(INV|FEE)-\d{4}-\d{6}$/)

  // Review: rating ≤ 3 needs a motivation of 100+ characters
  await p.getByTestId('review-rating').selectOption('2')
  await p.getByTestId('review-motivation').fill('Late.')
  await p.getByTestId('submit-review').click()
  await expect(p.getByTestId('error')).toContainText('at least 100 characters')
  await p.getByTestId('review-motivation').fill('The work was finished two weeks late and two cabinet doors had to be adjusted afterwards, which cost me an extra day off work.')
  await p.getByTestId('submit-review').click()
  await expect(p.getByTestId('notice')).toHaveText('Review submitted')
  await expect(p.getByTestId('submit-review')).toHaveCount(0) // one review per party per contract

  // Score counts internally, but is not public during the Rookie Stage
  const own = await call(k.token, 'GET', '/api/profile')
  expect(own.profile.reputation_score_as_contractor).toBe(2)
  expect(own.reviews[0].motivation).toMatch(/two weeks late/)
  const pub = await call(await tokenFor(client), 'GET', `/api/profiles/${contractor.id}`)
  expect(pub.reputation_public).toBe(false)
  expect(pub.reputation_score_as_contractor).toBeNull()
  expect(pub.completed_as_contractor).toBe(1)
  expect(pub.warranty_offered_rate).toBe(0)
  expect(JSON.stringify(pub)).not.toContain('two weeks late') // motivation stays private
})

test('part 10: fee batch to the reserves, loan voted, released to the supplier and repaid early', async () => {
  const sql = superuserDb()
  try {
    // Fee batch: lower the minimum count so this run's fees form a batch
    await completedContract(0)
    await setSetting('fee_batch_min_count', 1)
    const before = Object.fromEntries((await sql`select type, balance from reserves`).map((r: any) => [r.type, Number(r.balance)]))
    const fee = await runJob('fee_aggregation')
    expect(fee.result.batch).toBeTruthy()
    const after = Object.fromEntries((await sql`select type, balance from reserves`).map((r: any) => [r.type, Number(r.balance)]))
    const total = fee.result.total
    expect(after.organization - before.organization).toBe(Math.round(total / 100))
    expect(['safety', 'credit', 'legal', 'innovation', 'organization'].reduce((a, k) => a + after[k] - before[k], 0)).toBe(total)
    const [pf] = await sql`select count(*)::int as n from ledger_transactions where source_type = 'platform_fee' and related_contract_id is not null`
    expect(pf.n).toBe(0) // fee income never references a contract (D10)
    const batches = await (await fetch(`${process.env.APP_URL}/api/community-bank/fee-batches`)).json()
    expect(Object.keys(batches[0]).sort()).toEqual(['executed_at', 'fee_count', 'total_amount'])

    // Loan: seed reserves, tiny vote tiers for the test, one eligible voter
    const admin = await adminToken()
    await call(admin, 'POST', '/api/admin/reserves/seed', { reserve: 'safety', amount: '20000' })
    await call(admin, 'POST', '/api/admin/reserves/seed', { reserve: 'credit', amount: '10000' })
    await setSetting('required_votes_tiers', [1, 1, 1, 1])
    await setSetting('audience_multiplier', 1)
    const applicant = await createUser('Lena Loan', 'contractor')
    const supplier = await createUser('Tool Shop', 'contractor')
    const voter = await createUser('Victor Voter', 'client')
    await sql`update users set created_at = now() - interval '31 days' where id = ${voter.id}`
    await sql`update profiles set completed_as_client = 1 where user_id = ${voter.id}`
    const a = { token: await tokenFor(applicant), password: applicant.password }
    await expect(call(a.token, 'POST', '/api/loan-applications', { purpose_category: 'holiday', purpose: 'x', amount_requested: '1000', repayment_term_months: 12, supplier_email: supplier.email })).rejects.toThrow(/allowed purpose/)
    const loan = await call(a.token, 'POST', '/api/loan-applications', {
      purpose_category: 'equipment', purpose: 'A table saw', amount_requested: '1000', repayment_term_months: 18, supplier_email: supplier.email, projected_income: '5000',
    })
    expect(loan.status).toBe('community_voting')
    expect(Number(loan.interest_rate)).toBe(4.25)
    // The random sample may pick any eligible member; point the single invitation at our voter
    await sql`delete from vote_invitations where loan_application_id = ${loan.id}`
    await sql`insert into vote_invitations (loan_application_id, voter_id) values (${loan.id}, ${voter.id})`
    const outsider = await createUser('Not Invited', 'client')
    await expect(call(await tokenFor(outsider), 'POST', `/api/loan-applications/${loan.id}/votes`, { choice: 'for' })).rejects.toThrow(/no open invitation/)
    const vt = await tokenFor(voter)
    const voted = await call(vt, 'POST', `/api/loan-applications/${loan.id}/votes`, { choice: 'for' })
    expect(voted.outcome).toBe('approved')
    await expect(call(vt, 'POST', `/api/loan-applications/${loan.id}/votes`, { choice: 'for' })).rejects.toThrow(/closed/)

    // The money goes to the supplier through the sub-escrow, never to the applicant
    await creditBalance(applicant.email, '2000')
    await call(a.token, 'POST', `/api/loan-applications/${loan.id}/release`)
    const [sup] = await sql`select balance from simulated_balances where user_id = ${supplier.id}`
    expect(Number(sup.balance)).toBe(100_000)
    const supInvoices = await call(await tokenFor(supplier), 'GET', '/api/invoices')
    expect(supInvoices[0]).toMatchObject({ direction: 'issued', amount: 100_000 })
    // Partial, then full early repayment without penalty
    await call(a.token, 'POST', `/api/loan-applications/${loan.id}/repayments`, { amount: '400' })
    let detail = await call(a.token, 'GET', `/api/loan-applications/${loan.id}`)
    expect(detail.loan.principal_outstanding).toBe(60_000)
    await call(a.token, 'POST', `/api/loan-applications/${loan.id}/repayments`, { amount: '600' })
    detail = await call(a.token, 'GET', `/api/loan-applications/${loan.id}`)
    expect(detail.loan.status).toBe('repaid')
    const [app] = await sql`select balance from simulated_balances where user_id = ${applicant.id}`
    expect(Number(app.balance)).toBe(100_000) // 2,000 − 1,000 repaid; the loan itself never reached the applicant
  } finally {
    await setSetting('fee_batch_min_count', 5)
    await setSetting('required_votes_tiers', [50, 100, 250, 500])
    await setSetting('audience_multiplier', 3)
    await sql.end()
  }
})

test('part 12: system jobs are idempotent — inactivity, Change Order expiry, reconciliation, health score', async () => {
  const sql = superuserDb()
  // Workspace inactivity: notice at day 18, expiry at day 21
  const client = await createUser('Quiet Quinn', 'client')
  const contractor = await createUser('Idle Ivo', 'contractor')
  const ct = await tokenFor(client), kt = await tokenFor(contractor)
  const job = await call(ct, 'POST', '/api/jobs', { title: `Idle job ${Date.now()}`, category: 'carpentry' })
  const ws = await call(kt, 'POST', `/api/jobs/${job.id}/responses`, {})
  await sql`update negotiation_workspaces set last_activity_at = now() - interval '19 days' where id = ${ws.id}`
  await runJob('workspace_inactivity')
  await runJob('workspace_inactivity')
  const notices = await sql`select count(*)::int as n from notifications where user_id = ${client.id} and type = 'workspace_inactive'`
  expect(notices[0].n).toBe(1) // re-running does not notify twice
  await sql`update negotiation_workspaces set last_activity_at = now() - interval '22 days' where id = ${ws.id}`
  await runJob('workspace_inactivity')
  const [w] = await sql`select stage, outcome from negotiation_workspaces where id = ${ws.id}`
  expect(w).toEqual({ stage: 'closed', outcome: 'expired' })

  // Change Order expiry: no consequence for the contract
  await creditBalance(client.email, '20000')
  const id = await signedContract({ ...client }, { ...contractor })
  await escrowAction({ token: ct, password: client.password }, id, 'fund')
  const { stepUpToken } = await import('./api')
  const co = await call(kt, 'POST', `/api/contracts/${id}/change-orders`, { description: 'x', motivation: 'y', amount_delta: '0', milestone_changes: [] },
    { 'x-step-up-token': await stepUpToken(kt, contractor.password) })
  await sql`update change_orders set expires_at = now() - interval '1 minute' where id = ${co.change_order.id}`
  await runJob('change_order_expiry')
  const [c1] = await sql`select status from change_orders where id = ${co.change_order.id}`
  const [a1] = await sql`select status from escrow_actions where id = ${co.action.id}`
  expect([c1.status, a1.status]).toEqual(['expired', 'expired'])
  const [k1] = await sql`select status from contracts where id = ${id}`
  expect(k1.status).toBe('active')

  // Contact reconciliation links a contact once the person signs up
  const email = `later.${Date.now()}@e2e.test`
  const contact = await call(ct, 'POST', '/api/contacts', { display_name: 'Later Member', email })
  expect(contact.status).toBe('unlinked')
  await createUser('Later Member', 'contractor').then(async (u) => sql`update users set email = ${email} where id = ${u.id}`)
  await runJob('contact_reconciliation')
  const [linked] = await sql`select status from contacts where id = ${contact.id}`
  expect(linked.status).toBe('linked')

  // Health score snapshot and job log
  const h = await runJob('health_score')
  expect(h.result.computed_score).toBeGreaterThanOrEqual(0)
  const jobs = await call(await adminToken(), 'GET', '/api/admin/system/jobs')
  expect(jobs.find((j: any) => j.name === 'health_score').last.finished_at).toBeTruthy()
  await sql.end()
})

test('part 11: dashboard deadlines, notifications page, admin settings with the fixed holdback', async ({ browser }) => {
  const client = await createUser('Dana Dashboard', 'client')
  const contractor = await createUser('Finn Final', 'contractor')
  await creditBalance(client.email, '20000')
  const id = await signedContract(client, contractor)
  const c = { token: await tokenFor(client), password: client.password }
  const k = { token: await tokenFor(contractor), password: contractor.password }
  await escrowAction(c, id, 'fund')
  const ms = (await call(c.token, 'GET', `/api/contracts/${id}/escrow`)).milestones
  await escrowAction(k, id, 'claim_advance', { milestone_id: ms[0].id })
  await escrowAction(k, id, 'request_completion', { milestone_id: ms[1].id, evidence_text: 'x' })
  const r = (await call(c.token, 'GET', `/api/contracts/${id}/escrow`)).requests.find((x: any) => x.status === 'open')
  await escrowAction(c, id, 'approve', { completion_request_id: r.id })
  await escrowAction(k, id, 'request_completion', { milestone_id: ms[2].id, evidence_text: 'all done' })

  const p = await pageFor(browser, client)
  await expect(p.getByTestId('deadlines')).toContainText('delivery to respond to')
  await expect(p.getByTestId('deadlines')).toContainText('13 days')
  await p.getByTestId('notifications-link').click()
  await expect(p.getByText('Delivery reported: you have 14 days to respond').first()).toBeVisible()

  const admin = await pageFor(browser, { email: process.env.SEED_ADMIN_EMAIL!, password: process.env.SEED_ADMIN_PASSWORD! })
  await admin.goto('/admin')
  await expect(admin.getByTestId('setting-holdback_percentage')).toBeDisabled()
  await expect(call(await adminToken(), 'PUT', '/api/admin/settings/holdback_percentage', { value: 15 })).rejects.toThrow(/fixed/)
  await admin.getByTestId('setting-silence_days').fill('15')
  await admin.getByTestId('save-silence_days').click()
  await expect(admin.getByTestId('notice')).toHaveText('Saved silence_days')
  await setSetting('silence_days', 14)
})
