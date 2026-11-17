import { defineConfig } from '@playwright/test'
import { loadEnv } from 'vite'

Object.assign(process.env, loadEnv('', process.cwd(), ''))

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: 'list',
  use: { testIdAttribute: 'data-test', baseURL: process.env.APP_URL || 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: process.env.APP_URL || 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
