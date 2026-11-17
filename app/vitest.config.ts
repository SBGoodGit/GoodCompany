import { defineConfig, loadEnv } from 'vite'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/db/**/*.test.ts'],
    env: loadEnv('', process.cwd(), ''),
    testTimeout: 20000,
  },
})
