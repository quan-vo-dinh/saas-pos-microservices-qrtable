/**
 * Step 2.7 E2E — real dev stack (no mocked realtime). Prerequisites: Batch 5 handoff
 * (`pnpm dev:reseed -- --yes`, `pnpm dev:bff-order`, both Nx serves, Keycloak 8180).
 * BFF default here is port 3300 + `GLOBAL_PREFIX=api/v1` (see repo `.env.example`); override via `STEPP27_BFF_HEALTH_URL`.
 * Skip entirely: `SKIP_STEPP27_E2E=1`, or when BFF health is unreachable.
 */
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { attachPageShot, attachText, setAllureContext } from './helpers/allure';
import { loginWithKeycloak } from './helpers/auth';
import { devQrTokenHex } from './helpers/qr';
import { reachable } from './helpers/readiness';

/** Matches `tools/dev-seed/constants.js` + `tools/dev-seed/postgres/data.js` */
const DEV_TENANT_ID = '023772bb-391b-401c-936a-ed7034b69cec';
const TABLE_A02_ID = '22222222-dddd-4222-8222-222222222222';
const TENANT_SLUG = 'pho-viet';

const PWA_BASE = process.env.STEPP27_PWA_BASE_URL ?? 'http://localhost:5173';
const MGMT_BASE = process.env.STEPP27_MANAGEMENT_BASE_URL ?? 'http://localhost:3000';
const BFF_HEALTH_URL = process.env.STEPP27_BFF_HEALTH_URL ?? 'http://localhost:3300/api/v1/health';

const WAITER_EMAIL = process.env.STEPP27_WAITER_EMAIL ?? 'waiter.1700000004@gmail.com';
const WAITER_PASSWORD = process.env.STEPP27_WAITER_PASSWORD ?? 'waiter123';
const CHEF_EMAIL = process.env.STEPP27_CHEF_EMAIL ?? 'chef.1700000005@gmail.com';
const CHEF_PASSWORD = process.env.STEPP27_CHEF_PASSWORD ?? 'chef123';

test.describe('Step 2.7 realtime (dev stack)', () => {
  test.describe.configure({ mode: 'serial' });

  test('PWA → POS → KDS → POS serve → customer SERVED after reconnect + reload keeps snapshot', async ({
    browser,
    request,
  }, testInfo) => {
    test.skip(process.env.SKIP_STEPP27_E2E === '1', 'Step 2.7 E2E skipped: set SKIP_STEPP27_E2E=1');

    test.skip(
      !(await reachable(request, BFF_HEALTH_URL)),
      `BFF not reachable at ${BFF_HEALTH_URL} (start pnpm dev:bff-order after pnpm dev:reseed -- --yes)`,
    );
    setAllureContext({
      epic: 'Realtime ordering',
      feature: 'Step 2.7 customer-to-kitchen handoff',
      story: 'Customer order survives reconnect and is served end-to-end',
      suite: 'E2E / Step 2.7',
    });

    const qrToken = devQrTokenHex(DEV_TENANT_ID, 'A02');
    const landingUrl = `${PWA_BASE}/landing?tenant=${encodeURIComponent(TENANT_SLUG)}&table=${encodeURIComponent(TABLE_A02_ID)}&token=${encodeURIComponent(qrToken)}`;

    await allure.step('Customer opens QR landing page', async () => {
      const pwaContext = await browser.newContext();
      const pwa = await pwaContext.newPage();
      try {
        await pwa.goto(landingUrl, { waitUntil: 'domcontentloaded' });
        await expect(pwa.getByRole('button', { name: 'Vào thực đơn' })).toBeVisible();
        await attachText(testInfo, 'landing-url', landingUrl);
        await pwa.getByRole('button', { name: 'Vào thực đơn' }).click();

        await expect(pwa.getByRole('button', { name: 'Tất cả' })).toBeVisible();
        await pwa.locator('button[aria-label="Thêm vào giỏ"]').first().click();
        await expect(pwa.getByRole('button', { name: 'Mở giỏ hàng' })).toBeVisible();
        await pwa.getByRole('button', { name: 'Mở giỏ hàng' }).click();
        await pwa.getByRole('button', { name: 'Đặt món' }).click();

        await expect(pwa).toHaveURL(/\/order-tracking\/[^/]+/, { timeout: 120_000 });
        const trackingUrl = pwa.url();
        await attachText(testInfo, 'tracking-url', trackingUrl);
        await attachPageShot(pwa, testInfo, 'customer tracking screenshot');

        await pwaContext.setOffline(true);
        await pwa.waitForTimeout(10_000);

        await allure.step('Waiter accepts order in POS', async () => {
          const waiterContext = await browser.newContext();
          const waiter = await waiterContext.newPage();
          try {
            await loginWithKeycloak(waiter, MGMT_BASE, '/pos', WAITER_EMAIL, WAITER_PASSWORD);
            const liveOrders = waiter.locator('[data-slot="pos-live-orders"]');
            await expect(liveOrders).toBeVisible();
            await liveOrders.getByRole('button', { name: 'Nhận', exact: true }).first().click();
            await expect(waiter.getByText('Đang chế biến').first()).toBeVisible({ timeout: 120_000 });
            await attachPageShot(waiter, testInfo, 'pos live orders screenshot');
          } finally {
            await waiterContext.close();
          }
        });

        await allure.step('Chef finishes ticket on KDS', async () => {
          const chefContext = await browser.newContext();
          const chef = await chefContext.newPage();
          try {
            await loginWithKeycloak(chef, MGMT_BASE, '/kds/kitchen', CHEF_EMAIL, CHEF_PASSWORD);
            await expect(chef.getByRole('button', { name: 'Bắt đầu', exact: true }).first()).toBeVisible({
              timeout: 180_000,
            });
            await chef.getByRole('button', { name: 'Bắt đầu', exact: true }).first().click();

            const doneBtn = chef.getByRole('button', { name: 'Giữ để Xong', exact: true }).first();
            await expect(doneBtn).toBeVisible();
            await doneBtn.dispatchEvent('pointerdown');
            await chef.waitForTimeout(900);

            await attachPageShot(chef, testInfo, 'kds ticket before serve');

            const serveContext = await browser.newContext();
            const servePage = await serveContext.newPage();
            try {
              await loginWithKeycloak(servePage, MGMT_BASE, '/pos', WAITER_EMAIL, WAITER_PASSWORD);
              const liveOrders = servePage.locator('[data-slot="pos-live-orders"]');
              await expect(liveOrders).toBeVisible();
              await expect(liveOrders.getByRole('button', { name: 'Đã phục vụ', exact: true }).first()).toBeVisible({
                timeout: 120_000,
              });
              await liveOrders.getByRole('button', { name: 'Đã phục vụ', exact: true }).first().click();
              await expect(servePage.getByText('Đã phục vụ').first()).toBeVisible({ timeout: 120_000 });
              await attachPageShot(servePage, testInfo, 'pos served screenshot');
            } finally {
              await serveContext.close();
            }
          } finally {
            await chefContext.close();
          }
        });

        await pwaContext.setOffline(false);
        await pwa.bringToFront();
        await expect(pwa.getByText(/SERVED|Đã phục vụ/).first()).toBeVisible({ timeout: 180_000 });

        await pwa.reload({ waitUntil: 'domcontentloaded' });
        await expect(pwa).toHaveURL(trackingUrl);
        await expect(pwa.getByText(/SERVED|Đã phục vụ/).first()).toBeVisible({ timeout: 60_000 });
        await attachPageShot(pwa, testInfo, 'customer served screenshot');
      } finally {
        await pwaContext.setOffline(false).catch(() => undefined);
        await pwaContext.close();
      }
    });
  });
});
