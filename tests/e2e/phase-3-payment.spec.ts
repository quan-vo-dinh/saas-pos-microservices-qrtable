/**
 * Phase 3 payment smoke — optional dev stack + Keycloak.
 *
 * - Customer PWA: no auth (always runs when PWA is up).
 * - Management POS: waiter account (reuse Step 2.7 env defaults).
 * - Dashboard refund: owner/manager only — set `PHASE3_OWNER_EMAIL` + `PHASE3_OWNER_PASSWORD` or test is skipped.
 *
 * Skip management / Keycloak-dependent tests: `SKIP_PHASE3_E2E=1`.
 * Customer PWA test still runs unless `SKIP_PHASE3_PWA_E2E=1`.
 */
import { test, expect, type Page } from '@playwright/test';

const PWA_BASE = process.env.PHASE3_PWA_BASE_URL ?? 'http://localhost:5173';
const MGMT_BASE = process.env.PHASE3_MANAGEMENT_BASE_URL ?? 'http://localhost:3000';

const WAITER_EMAIL =
  process.env.PHASE3_WAITER_EMAIL ?? process.env.STEPP27_WAITER_EMAIL ?? 'waiter.1700000004@gmail.com';
const WAITER_PASSWORD = process.env.PHASE3_WAITER_PASSWORD ?? process.env.STEPP27_WAITER_PASSWORD ?? 'waiter123';

const OWNER_EMAIL = process.env.PHASE3_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.PHASE3_OWNER_PASSWORD;

async function staffLogin(page: Page, nextPath: string, email: string, password: string): Promise<void> {
  await page.goto(`${MGMT_BASE}/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByRole('button', { name: /Continue with Keycloak/i }).click();
  await page.waitForURL(/8180|keycloak|openid-connect/i, { timeout: 120_000 });
  await page.locator('input[name="username"], #username').first().fill(email);
  await page.locator('input[name="password"], #password').first().fill(password);
  const submit = page.locator('#kc-login, input[name="login"], button[type="submit"]').first();
  await submit.click();
  const escaped = nextPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
  await expect(page).toHaveURL(new RegExp(`${escaped}(\\?|$)`), { timeout: 120_000 });
}

test.describe('Phase 3 payment smoke', () => {
  test('customer payment status screen renders', async ({ page }) => {
    test.skip(process.env.SKIP_PHASE3_PWA_E2E === '1', 'SKIP_PHASE3_PWA_E2E=1');
    await page.goto(`${PWA_BASE}/request-payment`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Thanh toán' })).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });

  test.describe('management (auth)', () => {
    test.skip(process.env.SKIP_PHASE3_E2E === '1', 'SKIP_PHASE3_E2E=1');

    test.beforeEach(async ({ page }) => {
      const ping = await page.request.get(MGMT_BASE, { timeout: 5_000 }).catch(() => null);
      test.skip(!ping?.ok(), `Management app not reachable at ${MGMT_BASE}`);
    });

    test('cash payment tab on POS', async ({ page }) => {
      await staffLogin(page, '/pos/payment', WAITER_EMAIL, WAITER_PASSWORD);
      await expect(page.getByRole('tab', { name: /Tiền mặt|Cash/i })).toBeVisible();
    });

    test('vietqr tab displays qr entry', async ({ page }) => {
      await staffLogin(page, '/pos/payment', WAITER_EMAIL, WAITER_PASSWORD);
      await expect(page.getByRole('tab', { name: /VietQR/i })).toBeVisible();
    });

    test('refund action is visible for paid bill (dashboard)', async ({ page }) => {
      test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, 'Set PHASE3_OWNER_EMAIL and PHASE3_OWNER_PASSWORD (OWNER or MANAGER)');
      await staffLogin(page, '/dashboard/orders', OWNER_EMAIL!, OWNER_PASSWORD!);
      await expect(page.getByRole('button', { name: /Refund|Hoàn tiền/i }).first()).toBeVisible();
    });
  });
});
