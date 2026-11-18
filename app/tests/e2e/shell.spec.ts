// Step A: the work environment of the showcase. Sidebar modules per role, "Coming later" entries disabled,
// unread counter in the top bar, avatar menu, and the menu button at phone width.
import { expect, test, type Browser } from '@playwright/test'
import { createUser, login } from './helpers'
import { superuserDb } from './api'

async function pageFor(browser: Browser, u: { email: string; password: string }, viewport?: { width: number; height: number }) {
  const page = await (await browser.newContext(viewport ? { viewport } : {})).newPage()
  await login(page, u)
  return page
}
const MODULES = ['dashboard', 'marketplace', 'goodtrade', 'workspaces', 'contracts', 'contacts', 'community-bank', 'invoices', 'profile']

test('sidebar per role, Coming later disabled, unread counter, avatar menu', async ({ browser }) => {
  const sql = superuserDb()
  try {
    const client = await createUser('Shell Client', 'client')
    const mediator = await createUser('Shell Mediator', 'client')
    await sql`update users set role = 'mediator' where id = ${mediator.id}`

    // Client: all modules, no role entries; page heading from the shell
    const c = await pageFor(browser, client)
    for (const m of MODULES) await expect(c.getByTestId(`nav-${m}`)).toBeVisible()
    await expect(c.getByTestId('nav-cases')).toHaveCount(0)
    await expect(c.getByTestId('nav-admin')).toHaveCount(0)
    await expect(c.getByTestId('page-heading')).toContainText('Overview of all your GoodCompany activity')
    for (const s of ['Dispute Center', 'Innovation Fund', 'Plugin Marketplace', 'AVI identity', 'Bank link']) {
      await expect(c.getByTestId(`soon-${s}`)).toBeDisabled()
      await expect(c.getByTestId(`soon-${s}`)).toContainText('SOON')
    }
    await c.getByTestId('nav-community-bank').click()
    await expect(c).toHaveURL(/\/community-bank$/)
    await expect(c.getByTestId('nav-community-bank')).toHaveClass(/active/)
    await expect(c.getByTestId('page-heading')).toContainText('Reserves, loans and voting')

    // Unread counter in the top bar
    await expect(c.getByTestId('unread-count')).toHaveCount(0)
    await sql`insert into notifications (user_id, type, title) values (${client.id}, 'test', 'Shell test notice'), (${client.id}, 'test', 'Second notice')`
    await c.goto('/dashboard')
    await expect(c.getByTestId('unread-count')).toHaveText('2')
    await c.getByTestId('notifications-link').click()
    await expect(c).toHaveURL(/\/notifications$/)

    // Avatar menu: name, role, sign out
    await c.getByTestId('avatar').click()
    await expect(c.getByTestId('avatar-menu')).toContainText('Shell Client')
    await expect(c.getByTestId('avatar-menu')).toContainText('client')
    await c.getByTestId('sign-out').click()
    await expect(c).toHaveURL(/\/login/)
    await expect(c.getByTestId('sidebar')).toHaveCount(0)

    // Mediator: Cases, no Admin
    const m = await pageFor(browser, mediator)
    await expect(m.getByTestId('nav-cases')).toBeVisible()
    await expect(m.getByTestId('nav-admin')).toHaveCount(0)

    // Admin: Admin, no Cases
    const a = await pageFor(browser, { email: process.env.SEED_ADMIN_EMAIL!, password: process.env.SEED_ADMIN_PASSWORD! })
    await expect(a.getByTestId('nav-admin')).toBeVisible()
    await expect(a.getByTestId('nav-cases')).toHaveCount(0)
  } finally {
    await sql.end()
  }
})

test('phone width: the menu button opens and closes the sidebar, no horizontal scrolling', async ({ browser }) => {
  const client = await createUser('Phone Client', 'client')
  const p = await pageFor(browser, client, { width: 375, height: 812 })
  const sidebar = p.getByTestId('sidebar')
  const left = async () => (await sidebar.boundingBox())!.x
  await expect(p.getByTestId('menu-button')).toBeVisible()
  await expect.poll(left).toBeLessThan(0) // hidden off-screen
  await p.getByTestId('menu-button').click()
  await expect.poll(left).toBe(0)
  await p.getByTestId('nav-contacts').click()
  await expect(p).toHaveURL(/\/contacts$/)
  await expect.poll(left).toBeLessThan(0) // closes after navigating
  for (const path of ['/dashboard', '/jobs', '/community-bank', '/profile']) {
    await p.goto(path)
    await expect(p.getByTestId('page-heading')).toBeVisible()
    expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  }
})
