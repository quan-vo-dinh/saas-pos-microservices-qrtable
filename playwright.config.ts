import { defineConfig, devices } from '@playwright/test';

/**
 * Step 2.7 local E2E — expects dev stack per handoff:
 * `pnpm dev:reseed -- --yes`, `pnpm dev:bff-order`, `nx serve customer-pwa`, `nx serve management-app`.
 *
 * URLs overridable via STEPP27_* env vars (see tests/e2e/step-2.7-realtime.spec.ts).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 240_000,
  expect: { timeout: 60_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', { resultsDir: 'allure-results', detail: true, suiteTitle: true }],
  ],
  use: {
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
