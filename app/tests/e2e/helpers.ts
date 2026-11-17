import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const admin = () => createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

export const runId = () => `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`

/** Test account with a verified email (created through the Supabase admin API). */
export async function createUser(name: string, role: 'client' | 'contractor' | 'both', expertise: string[] = []) {
  const email = `${name.toLowerCase().replace(/\W+/g, '.')}.${runId()}@e2e.test`
  const password = randomBytes(9).toString('hex')
  const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name, role } })
  if (error) throw error
  return { id: data.user!.id, email, password, name, expertise }
}

export async function login(page: Page, u: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(u.email)
  await page.getByLabel('Password').fill(u.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible()
}

/** Confirm the step-up dialog by re-entering the password. */
export async function stepUp(page: Page, password: string) {
  const dialog = page.getByTestId('step-up')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Password').fill(password)
  await dialog.getByRole('button', { name: 'Confirm and sign' }).click()
}

export async function latestEmailTo(address: string): Promise<string> {
  const base = process.env.MAILPIT_URL!
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`)
    const json: any = await res.json()
    if (json.messages?.length) {
      const msg: any = await (await fetch(`${base}/api/v1/message/${json.messages[0].ID}`)).json()
      return msg.Text || msg.HTML
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No email for ${address}`)
}
