/**
 * Phase 5 suspended tenant smoke — optional dev stack.
 *
 * Prerequisites:
 * `pnpm dev:reseed -- --yes`, `pnpm dev:bff-order`, `nx serve customer-pwa`.
 *
 * Skip: `SKIP_PHASE5_SUSPENDED_E2E=1`, or when BFF/PWA are unreachable.
 */
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

const SUSPENDED_TENANT_ID = '0f5c8b74-3c4d-47db-9a07-3a8f30f1b5d1';
const SUSPENDED_TENANT_SLUG = 'pho-viet-suspended';
const SUSPENDED_TABLE_ID = '11111111-ddde-4111-8111-111111111111';

const PWA_BASE = process.env.PHASE5_SUSPENDED_PWA_BASE_URL ?? 'http://localhost:5173';
const BFF_HEALTH_URL = process.env.PHASE5_SUSPENDED_BFF_HEALTH_URL ?? 'http://localhost:3300/api/v1/health';

function devQrTokenHex(tableKey: string): string {
  return createHash('sha256').update(`${SUSPENDED_TENANT_ID}:${tableKey}:qrtable-dev-qr`).digest('hex');
}

test.describe('Phase 5 suspended tenant customer PWA', () => {
  test('keeps menu readable and disables new cart/order mutations', async ({ page, request }) => {
    test.skip(process.env.SKIP_PHASE5_SUSPENDED_E2E === '1', 'SKIP_PHASE5_SUSPENDED_E2E=1');

    const bffHealth = await request.get(BFF_HEALTH_URL, { timeout: 10_000 }).catch(() => null);
    test.skip(!bffHealth?.ok(), `BFF not reachable at ${BFF_HEALTH_URL}`);

    const pwaHealth = await request.get(PWA_BASE, { timeout: 10_000 }).catch(() => null);
    test.skip(!pwaHealth?.ok(), `Customer PWA not reachable at ${PWA_BASE}`);

    const landingUrl = `${PWA_BASE}/landing?tenant=${encodeURIComponent(
      SUSPENDED_TENANT_SLUG,
    )}&table=${encodeURIComponent(SUSPENDED_TABLE_ID)}&token=${encodeURIComponent(devQrTokenHex('S01'))}`;

    await page.goto(landingUrl, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Vào Menu' })).toBeVisible();
    await page.getByRole('button', { name: 'Vào Menu' }).click();

    await expect(page.getByText('Cửa hàng đang tạm khóa')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tất cả' })).toBeVisible();
    await expect(page.getByText('Phở bò tạm khóa')).toBeVisible();

    const addToCart = page.locator('button[aria-label="Thêm vào giỏ"]').first();
    await expect(addToCart).toBeVisible();
    await expect(addToCart).toBeDisabled();

    await page.goto(`${PWA_BASE}/request-payment`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Thanh toán' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Yêu cầu thanh toán/i })).toBeDisabled();
  });
});
