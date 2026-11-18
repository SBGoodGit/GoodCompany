// Negotiation end to end (round 2, D28): job → several introductions → three candidates into the
// technical intake (a fourth is refused) → one swap → two-way intake with the budget question →
// the contractor proposes terms (revision asked, then accepted with the commitment warning) →
// itemised estimate → both sign → completion request shows the lines of its phase.
import { expect, test, type Browser, type Page } from '@playwright/test'
import { createUser, login, stepUp } from './helpers'
import { call, creditBalance, escrowAction, tokenFor } from './api'

async function sessionFor(browser: Browser, user: { email: string; password: string }) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await login(page, user)
  return page
}
const acceptNextDialog = (page: Page, expectText: string) => page.once('dialog', async (dlg) => {
  expect(dlg.message()).toContain(expectText)
  await dlg.accept()
})

test('round 2: candidates, swap, budget, contractor terms, itemised estimate, signing', async ({ browser }) => {
  const client = await createUser('Eve Client', 'client')
  const contractor = await createUser('Carl Carpenter', 'contractor')
  const rivals = await Promise.all(['Rita Rival', 'Rob Rival', 'Ron Rival', 'Rex Rival'].map((n) => createUser(n, 'contractor')))
  const late = await createUser('Lou Late', 'contractor')

  // Client posts a job with an indicative budget
  const c = await sessionFor(browser, client)
  const title = `Oak kitchen cabinets ${Date.now()}`
  await c.goto('/jobs/new')
  await c.getByLabel('Title').fill(title)
  await c.getByLabel('Description').fill('Six wall cabinets in solid oak.')
  await c.getByLabel('Category').selectOption('carpentry')
  await c.getByLabel('Region').fill('Utrecht')
  await c.getByLabel('Indicative budget (EUR, optional)').fill('4321')
  await c.getByRole('button', { name: 'Post job' }).click()
  await expect(c.getByText('Indicative budget (only you see this)')).toBeVisible()
  const jobUrl = c.url()
  const jobId = jobUrl.split('/').pop()!

  // Contractor finds the job, never sees a price, responds
  const k = await sessionFor(browser, contractor)
  await k.goto('/profile')
  await k.getByTestId('expertise-carpentry').check()
  await k.getByTestId('save-profile').click()
  await expect(k.getByText('Profile saved')).toBeVisible()
  await k.goto('/jobs')
  await k.getByRole('button', { name: 'Search' }).click()
  await k.getByRole('link', { name: title }).click()
  await expect(k.getByRole('heading', { name: title })).toBeVisible()
  await expect(k.locator('body')).not.toContainText('4,321')
  const kToken = await tokenFor(contractor)
  expect((await call(kToken, 'GET', `/api/jobs/${jobId}`)).job).not.toHaveProperty('indicative_budget')
  await k.getByLabel('Introduce yourself (optional)').fill('Hello, I build kitchens.')
  await k.getByTestId('respond').click()
  await expect(k.getByText('Hello, I build kitchens.')).toBeVisible()
  await expect(k.getByText('The client decides whether to move you into the technical intake')).toBeVisible()
  await expect(k.getByTestId('advance')).toHaveCount(0)
  const wsUrl = k.url()
  const wsId = wsUrl.split('/').pop()!

  // Several more introductions (unlimited)
  const cToken = await tokenFor(client)
  const rivalWs: string[] = []
  for (const r of rivals) rivalWs.push((await call(await tokenFor(r), 'POST', `/api/jobs/${jobId}/responses`, { message: 'Hi' })).id)

  // The client moves Carl in through the UI, two rivals through the API; the fourth is refused
  await c.goto(wsUrl)
  await expect(c.getByText('Candidates past the introduction: 0 of 3')).toBeVisible()
  await c.getByTestId('advance').click()
  await expect(c.locator('.stepper .step.current')).toHaveText('Technical intake')
  await call(cToken, 'POST', `/api/workspaces/${rivalWs[0]}/advance`)
  await call(cToken, 'POST', `/api/workspaces/${rivalWs[1]}/advance`)
  await expect(call(cToken, 'POST', `/api/workspaces/${rivalWs[2]}/advance`)).rejects.toThrow(/already has 3 candidates past the introduction/)
  await expect(call(await tokenFor(rivals[2]), 'POST', `/api/workspaces/${rivalWs[2]}/advance`)).rejects.toThrow(/client moves a candidate/)

  // One swap: close Rob in the intake, move Ron in
  await call(cToken, 'POST', `/api/workspaces/${rivalWs[1]}/withdraw`)
  await call(cToken, 'POST', `/api/workspaces/${rivalWs[2]}/advance`)
  await c.goto(jobUrl)
  await expect(c.getByTestId('conversations')).toContainText('3 of 3 candidates')
  await expect(c.getByTestId('conversations')).toContainText('swaps used 1 of 2')
  await expect(c.getByTestId('conversation-Rob Rival')).toContainText('withdrawn')

  // Pause new applicants: a late contractor cannot respond; existing conversations continue
  await c.getByTestId('pause-applicants').locator('input').check()
  await expect(c.getByText('No new contractors can respond')).toBeVisible()
  await expect(call(await tokenFor(late), 'POST', `/api/jobs/${jobId}/responses`, {})).rejects.toThrow(/not open for responses/)

  // Back to Carl's conversation via quick switching; private note and constraints
  await c.goto(`/workspaces/${rivalWs[0]}`)
  await c.getByTestId('switch-conversation').selectOption({ label: 'Carl Carpenter — Technical intake' })
  await expect(c).toHaveURL(wsUrl)
  await c.getByTestId('private-note').locator('summary').click()
  await c.getByTestId('private-note-text').fill('Carl seems experienced; check references.')
  await c.getByTestId('save-note').click()
  await expect(c.getByText('Note saved (only you can see it)')).toBeVisible()
  await c.getByTestId('constraint-start').fill('2027-01-04')
  await c.getByTestId('constraint-end').fill('2027-02-26')
  await c.getByTestId('constraint-days').fill('Only Wednesdays and Fridays')
  await c.getByTestId('constraint-access').fill('Third floor, no lift; park on the street.')
  await c.getByTestId('save-constraints').click()
  await expect(c.getByText('Constraints saved')).toBeVisible()

  // Two-way intake: the client asks Carl a question and answers the library questions + budget
  await c.getByTestId('custom-question').fill('Are you insured for work in an apartment?')
  await c.getByLabel('required', { exact: true }).check()
  await c.getByTestId('add-question').click()
  await expect(c.getByText('Waiting for the contractor to answer')).toBeVisible()
  await c.getByTestId('intake-scope').fill('Six oak wall cabinets, soft-close.')
  await c.getByTestId('intake-location_access').fill('Third floor kitchen.')
  await c.getByTestId('save-answers').click()
  await expect(c.getByText('Answers saved')).toBeVisible()
  await c.getByTestId('advance').click()
  await expect(c.getByTestId('error')).toContainText('1 required intake question(s) still need an answer')
  await c.getByTestId('budget-min').fill('12000')
  await c.getByTestId('budget-max').fill('8000')
  await c.getByTestId('save-answers').click()
  await expect(c.getByTestId('error')).toContainText('minimum budget cannot be higher')
  await c.getByTestId('budget-min').fill('8000')
  await c.getByTestId('budget-max').fill('12000')
  await c.getByTestId('save-answers').click()
  await expect(c.getByText('Answers saved')).toBeVisible()
  // Without a budget the intake cannot be completed (checked on a rival's workspace)
  await call(cToken, 'POST', `/api/workspaces/${rivalWs[0]}/intake`, { answers: { scope: 'x', location_access: 'y' } })
  await expect(call(cToken, 'POST', `/api/workspaces/${rivalWs[0]}/advance`)).rejects.toThrow(/budget for this project/)

  // Carl sees the budget and the constraints (not the note), and answers the client's question
  await k.reload()
  await expect(k.getByTestId('budget')).toContainText('€8,000.00 – €12,000.00')
  await expect(k.getByTestId('constraints')).toContainText('Only Wednesdays and Fridays')
  await expect(k.locator('body')).not.toContainText('check references')
  expect((await call(kToken, 'GET', `/api/workspaces/${wsId}`)).workspace).not.toHaveProperty('client_note')
  await k.getByTestId('intake-custom_1').fill('Yes, liability insurance up to €2.5 million.')
  await k.getByTestId('save-answers').click()
  await expect(k.getByText('Answers saved')).toBeVisible()
  await k.getByTestId('advance').click()
  await expect(k.locator('.stepper .step.current')).toHaveText('Terms')

  // Only the contractor proposes terms
  await expect(call(cToken, 'POST', `/api/workspaces/${wsId}/terms-versions`, { warranty_period_days: 30, execution_period_days: 10, payment_phases: [{ kind: 'final', description: 'x', evidence_required: 'x' }] })).rejects.toThrow(/Only the contractor proposes terms/)
  await k.getByLabel('Warranty period').selectOption('30')
  await k.getByLabel('Execution period (days)').fill('45')
  await k.getByTestId('add-advance').click()
  await k.getByTestId('phase-desc-0').fill('Advance for planning')
  await k.getByTestId('propose-terms').click()
  await expect(k.getByText('Terms proposed')).toBeVisible()

  // The client asks for a revision (comment required), then accepts version 2 with the warning
  await c.reload()
  await c.getByTestId('revise-terms').click()
  await expect(c.getByTestId('error')).toContainText('comment is required')
  await c.getByTestId('terms-comment').fill('Please plan the work on Wednesdays and Fridays only.')
  await c.getByTestId('revise-terms').click()
  await expect(c.getByTestId('notice')).toHaveText('Revision requested')
  await k.reload()
  await expect(k.getByText('Please plan the work on Wednesdays and Fridays only.')).toBeVisible()
  await k.getByLabel('Working hours').fill('Wednesdays and Fridays 08:00–17:00')
  await k.getByTestId('propose-terms').click()
  await expect(k.getByText('Terms proposed')).toBeVisible()
  await c.reload()
  await expect(c.getByTestId('terms-response')).toContainText('They will now spend time preparing a quote for you')
  acceptNextDialog(c, 'You are committing to this contractor. They will now spend time preparing a quote for you.')
  await c.getByTestId('accept-terms').click()
  await expect(c.locator('.stepper .step.current')).toHaveText('Quote')

  // Carl builds the itemised estimate: 1,000 + 5,800 labour + 3,000 materials = 9,800 + 200 fee = 10,000
  await k.reload()
  await k.getByTestId('scope-of-work').fill('Six oak wall cabinets, soft-close hinges, fitted. Excluded: electrical work.')
  await k.getByTestId('section-title-0').fill('Kitchen cabinets')
  for (let i = 0; i < 2; i++) await k.getByTestId('add-line-0').click()
  const line = (i: number) => k.getByTestId(`line-0-${i}`)
  await line(0).getByTestId('line-description').fill('Planning and measuring')
  await line(0).getByTestId('line-unit').fill('lump sum')
  await line(0).getByTestId('line-price').fill('1000')
  await line(0).getByTestId('line-phase').selectOption('1')
  await line(1).getByTestId('line-description').fill('Building and fitting cabinets')
  await line(1).getByTestId('line-quantity').fill('58')
  await line(1).getByTestId('line-price').fill('100')
  // Materials bought from third parties go in their own kind of section (D29)
  await k.getByTestId('add-section').click()
  await k.getByTestId('section-title-1').fill('Oak')
  await k.getByTestId('section-kind-1').selectOption('third_party')
  await k.getByTestId('add-line-1').click()
  const oak = k.getByTestId('line-1-0')
  await oak.getByTestId('line-description').fill('Oak boards')
  await oak.getByTestId('line-quantity').fill('12')
  await oak.getByTestId('line-unit').fill('m²')
  await oak.getByTestId('line-price').fill('250')
  await expect(k.getByTestId('estimate-total')).toHaveText('€10,000.00')
  await expect(k.getByTestId('estimate-summary')).toContainText('Platform fee: €200.00 · 2%')
  await expect(k.getByTestId('estimate-summary')).toContainText('Materials budget (bought from third parties): €3,000.00 · 30%')
  await k.getByTestId('detail-lines').check()
  await k.getByTestId('submit-quote').click()
  await expect(k.getByText('Quote submitted')).toBeVisible()

  // The client sees all lines (the contractor chose that level) and accepts → contract preview
  await c.reload()
  await expect(c.getByTestId('estimate-lines')).toContainText('Oak boards')
  await expect(c.getByTestId('quote-total')).toHaveText('€10,000.00')
  await expect(c.getByText('Phase 2 (final): €5,800.00 · 58%')).toBeVisible()
  await c.getByTestId('accept-quote').click()
  await expect(c.getByTestId('contract-preview')).toBeVisible()
  await expect(c.getByText('Holdback: 10% = €1,000.00')).toBeVisible()

  // Both sign with step-up; the contract awaits funding; the rivals' workspaces close
  await k.reload()
  await k.getByTestId('sign').click()
  await stepUp(k, contractor.password)
  await expect(k.getByText('You signed. Waiting for the other party.')).toBeVisible()
  await c.reload()
  await c.getByTestId('sign').click()
  await stepUp(c, client.password)
  await expect(c).toHaveURL(/\/contracts\//)
  await expect(c.getByTestId('contract-status')).toHaveText('awaiting funding')
  const contractId = c.url().split('/').pop()!
  const rita = await sessionFor(browser, rivals[0])
  await rita.goto(`/workspaces/${rivalWs[0]}`)
  await expect(rita.getByText('This job was awarded to another contractor')).toBeVisible()
  await expect(rita.locator('body')).not.toContainText('10,000')

  // A completion request shows the lines of its phase
  await creditBalance(client.email, '10000')
  const cu = { token: cToken, password: client.password }, ku = { token: kToken, password: contractor.password }
  await escrowAction(cu, contractId, 'fund')
  const ms = (await call(kToken, 'GET', `/api/contracts/${contractId}/escrow`)).milestones
  await escrowAction(ku, contractId, 'claim_advance', { milestone_id: ms[0].id })
  await escrowAction(ku, contractId, 'request_completion', { milestone_id: ms[1].id, evidence_text: 'Fitted, photos attached' })
  await c.reload()
  await expect(c.getByTestId('request-lines')).toContainText('Building and fitting cabinets')
  await expect(c.getByTestId('request-lines')).toContainText('Oak boards')

  // The job no longer appears in search
  await k.goto('/jobs')
  await k.getByRole('button', { name: 'Search' }).click()
  await expect(k.getByRole('link', { name: title })).toHaveCount(0)
})
