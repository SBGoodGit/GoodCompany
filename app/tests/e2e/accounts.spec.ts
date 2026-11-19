import { expect, test } from '@playwright/test'
import { latestEmailTo, runId } from './helpers'

test('sign-up requires a verified email address before sign-in (§7.6)', async ({ page }) => {
  const email = `new.user.${runId()}@e2e.test`
  const password = 'correct-horse-battery'
  await page.goto('/signup')
  await page.getByLabel('Name or company name').fill('New User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByLabel('I want to').selectOption('contractor')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByTestId('check-email')).toBeVisible()

  // Not verified yet: sign-in is refused
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText(/Verify your email address first/)).toBeVisible()

  // Open the verification link from the email
  const body = await latestEmailTo(email)
  const link = body.match(/https?:\/\/[^\s"<>)\]]+verify[^\s"<>)\]]+/)?.[0]?.replace(/&amp;/g, '&')
  expect(link).toBeTruthy()
  await page.goto(link!)
  await expect(page.getByRole('heading', { name: /Welcome, New User/ })).toBeVisible()
  // Name and role are in the avatar menu of the work environment (step A)
  await page.getByTestId('avatar').click()
  await expect(page.getByTestId('avatar-menu')).toContainText('New User')
  await expect(page.getByTestId('avatar-menu')).toContainText('contractor')
})
