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
import { test, expect } from '@playwright/test';
import { loginWithKeycloak } from './helpers/auth';
import { reachable } from './helpers/readiness';

const PWA_BASE = process.env.PHASE3_PWA_BASE_URL ?? 'http://localhost:5173';
const MGMT_BASE = process.env.PHASE3_MANAGEMENT_BASE_URL ?? 'http://localhost:3000';

const WAITER_EMAIL =
  process.env.PHASE3_WAITER_EMAIL ?? process.env.STEPP27_WAITER_EMAIL ?? 'waiter.1700000004@gmail.com';
const WAITER_PASSWORD = process.env.PHASE3_WAITER_PASSWORD ?? process.env.STEPP27_WAITER_PASSWORD ?? 'waiter123';

const OWNER_EMAIL = process.env.PHASE3_OWNER_EMAIL;
const OWNER_PASSWORD = process.env.PHASE3_OWNER_PASSWORD;

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
      test.skip(!(await reachable(page.request, MGMT_BASE, 5_000)), `Management app not reachable at ${MGMT_BASE}`);
    });

    test('cash payment tab on POS', async ({ page }) => {
      await loginWithKeycloak(page, MGMT_BASE, '/pos/payment', WAITER_EMAIL, WAITER_PASSWORD);
      await expect(page.getByRole('tab', { name: /Tiền mặt|Cash/i })).toBeVisible();
    });

    test('vietqr tab displays qr entry', async ({ page }) => {
      await loginWithKeycloak(page, MGMT_BASE, '/pos/payment', WAITER_EMAIL, WAITER_PASSWORD);
      await expect(page.getByRole('tab', { name: /VietQR/i })).toBeVisible();
    });

    test('payment history section is visible (dashboard)', async ({ page }) => {
      if (!OWNER_EMAIL || !OWNER_PASSWORD) {
        test.skip(true, 'Set PHASE3_OWNER_EMAIL and PHASE3_OWNER_PASSWORD (OWNER or MANAGER)');
        return;
      }

      await loginWithKeycloak(page, MGMT_BASE, '/dashboard/orders', OWNER_EMAIL, OWNER_PASSWORD);
      await expect(page.getByText(/Lịch sử thanh toán/i).first()).toBeVisible();
    });
  });
});
