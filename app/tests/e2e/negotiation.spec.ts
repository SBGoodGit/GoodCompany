// Session 1 end-to-end: posting a job → Negotiation Workspace (five stages) → signed contract,
// without money. A second candidate's workspace closes when the contract is signed.
import { expect, test, type Browser } from '@playwright/test'
import { createUser, login, stepUp } from './helpers'

async function sessionFor(browser: Browser, user: { email: string; password: string }) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await login(page, user)
  return page
}

test('job → workspace → terms → quote → both sign → contract awaiting funding', async ({ browser }) => {
  const client = await createUser('Eve Client', 'client')
  const contractor = await createUser('Carl Carpenter', 'contractor')
  const rival = await createUser('Rita Rival', 'contractor')

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
  await expect(c.getByText('€4,321.00')).toBeVisible()
  const jobUrl = c.url()

  // Contractor sets expertise, finds the job, never sees the budget, responds
  const k = await sessionFor(browser, contractor)
  await k.goto('/profile')
  await k.getByTestId('expertise-carpentry').check()
  await k.getByTestId('save-profile').click()
  await expect(k.getByText('Profile saved')).toBeVisible()
  await k.goto('/jobs')
  await k.getByRole('button', { name: 'Search' }).click()
  await k.getByRole('link', { name: title }).click()
  await expect(k.getByRole('heading', { name: title })).toBeVisible()
  await expect(k.getByText('Indicative budget')).toHaveCount(0)
  await expect(k.locator('body')).not.toContainText('4,321')
  const apiJob = await k.evaluate(async (url) => {
    const s = JSON.parse(localStorage.getItem(Object.keys(localStorage).find((x) => x.includes('auth-token'))!)!)
    return (await fetch(`/api/jobs/${url.split('/').pop()}`, { headers: { Authorization: `Bearer ${s.access_token}` } })).json()
  }, jobUrl)
  expect(apiJob.job).not.toHaveProperty('indicative_budget')
  await k.getByLabel('Introduce yourself (optional)').fill('Hello, I build kitchens.')
  await k.getByTestId('respond').click()
  await expect(k.getByText('Hello, I build kitchens.')).toBeVisible()
  const wsUrl = k.url()

  // A second candidate also responds
  const r = await sessionFor(browser, rival)
  await r.goto(jobUrl)
  await r.getByTestId('respond').click()
  await expect(r.locator('.stepper .step.current')).toHaveText('Introduction')
  const rivalWsUrl = r.url()

  // Stage 1 → 2: contractor moves to technical intake
  await k.getByTestId('advance').click()
  await expect(k.locator('.stepper .step.current')).toHaveText('Technical intake')
  await k.getByPlaceholder('Add your own question for the client').fill('Which handles do you prefer?')
  await k.getByRole('button', { name: 'Add question' }).click()
  await expect(k.getByText('Which handles do you prefer?')).toBeVisible()

  // Client answers the required questions and moves to terms
  await c.goto(wsUrl)
  await c.getByTestId('intake-scope').fill('Six oak wall cabinets, soft-close.')
  await c.getByTestId('intake-location_access').fill('Ground floor kitchen, street parking.')
  await c.getByTestId('save-answers').click()
  await expect(c.getByText('Answers saved')).toBeVisible()
  await c.getByTestId('advance').click()
  await expect(c.locator('.stepper .step.current')).toHaveText('Terms')

  // Contractor proposes terms: advance 10%, final 58%, materials 30%, fee 2%
  await k.reload()
  await k.getByLabel('Warranty period').selectOption('30')
  await k.getByLabel('Execution period (days)').fill('45')
  await k.getByLabel('Materials budget (% of contract value)').fill('30')
  await k.getByTestId('add-advance').click()
  await k.getByTestId('phase-pct-0').fill('10')
  await k.getByTestId('phase-desc-0').fill('Advance for planning')
  await k.getByTestId('phase-pct-1').fill('58')
  await k.getByTestId('propose-terms').click()
  await expect(k.getByText('Terms proposed')).toBeVisible()
  await expect(k.getByText(/Waiting for the other party to accept version 1/)).toBeVisible()

  // Client accepts → quote stage
  await c.reload()
  await c.getByTestId('accept-terms').click()
  await expect(c.locator('.stepper .step.current')).toHaveText('Quote')

  // Contractor quotes 10,000.00 with 2,500.00 materials (informational)
  await k.reload()
  await k.getByLabel(/Total amount/).fill('10000')
  await k.getByLabel(/Materials amount/).fill('2500')
  await expect(k.getByText('Materials budget: €3,000.00 · Fee: €200.00')).toBeVisible()
  await k.getByTestId('submit-quote').click()
  await expect(k.getByText('Quote submitted')).toBeVisible()

  // Client accepts the quote → contract preview
  await c.reload()
  await expect(c.getByText('Phase 1 (advance): €1,000.00')).toBeVisible()
  await expect(c.getByText('Phase 2 (final): €5,800.00')).toBeVisible()
  await c.getByTestId('accept-quote').click()
  await expect(c.getByTestId('contract-preview')).toBeVisible()
  await expect(c.getByText('Holdback: 10% = €1,000.00')).toBeVisible()
  await expect(c.getByText(/The holdback is a motivation amount, not insurance/).first()).toBeVisible()

  // Signing requires step-up: a wrong password is refused
  await k.reload()
  await k.getByTestId('sign').click()
  const dialog = k.getByTestId('step-up')
  await dialog.getByLabel('Password').fill('wrong-password')
  await dialog.getByRole('button', { name: 'Confirm and sign' }).click()
  await expect(dialog.getByText('Password incorrect')).toBeVisible()
  await dialog.getByLabel('Password').fill(contractor.password)
  await dialog.getByRole('button', { name: 'Confirm and sign' }).click()
  await expect(k.getByText('You signed. Waiting for the other party.')).toBeVisible()

  // Client signs → contract created, awaiting funding
  await c.reload()
  await c.getByTestId('sign').click()
  await stepUp(c, client.password)
  await expect(c).toHaveURL(/\/contracts\//)
  await expect(c.getByTestId('contract-status')).toHaveText('awaiting funding')
  await expect(c.getByText('Execution may not start until the client has funded the escrow')).toBeVisible()
  await expect(c.getByText('contract created')).toBeVisible()
  const milestoneRows = c.locator('table').nth(0).locator('tbody tr')
  await expect(milestoneRows).toHaveCount(2)

  // The rival's workspace closed with outcome closed_other_selected, without the winning terms
  await r.goto(rivalWsUrl)
  await expect(r.getByText('This job was awarded to another contractor')).toBeVisible()
  await r.goto('/dashboard')
  await expect(r.getByText(`"${title}" has been awarded to another contractor`)).toBeVisible()
  await expect(r.locator('body')).not.toContainText('10,000')

  // The job no longer appears in search
  await k.goto('/jobs')
  await k.getByRole('button', { name: 'Search' }).click()
  await expect(k.getByRole('link', { name: title })).toHaveCount(0)
})
