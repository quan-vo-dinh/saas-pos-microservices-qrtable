/**
 * Phase 5 admin/dashboard route smoke — optional local dev stack.
 *
 * Prerequisites:
 * `pnpm dev:reseed -- --yes`, local auth stack (`bff`, `authorizer`, `user-access`, `saas`),
 * `nx serve management-app`, Keycloak 8180.
 *
 * Skip: `SKIP_PHASE5_ADMIN_ROUTES_E2E=1`, or when management-app/BFF/Keycloak/auth seed is not ready.
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type RouteSmoke = {
  path: string;
  visibleText: RegExp;
};

const MGMT_BASE = process.env.PHASE5_ADMIN_MANAGEMENT_BASE_URL ?? 'http://localhost:3000';
const BFF_HEALTH_URL = process.env.PHASE5_ADMIN_BFF_HEALTH_URL ?? 'http://localhost:3300/api/v1/health';
const KEYCLOAK_REALM_URL = process.env.PHASE5_ADMIN_KEYCLOAK_REALM_URL ?? 'http://localhost:8180/realms/qrtable';

const SUPER_ADMIN_EMAIL = process.env.PHASE5_SUPER_ADMIN_EMAIL ?? 'superadmin.1700000001@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.PHASE5_SUPER_ADMIN_PASSWORD ?? 'superadmin123';
const OWNER_EMAIL = process.env.PHASE5_OWNER_EMAIL ?? 'owner.1700000002@gmail.com';
const OWNER_PASSWORD = process.env.PHASE5_OWNER_PASSWORD ?? 'owner123';

const ADMIN_ROUTES: RouteSmoke[] = [
  { path: '/admin/tenants', visibleText: /Tenants/i },
  { path: '/admin/plans', visibleText: /Gói cước|Pricing plans/i },
  { path: '/admin/billing', visibleText: /Billing|Subscription invoices/i },
];

const DASHBOARD_ROUTES: RouteSmoke[] = [
  { path: '/dashboard/subscription', visibleText: /Subscription/i },
  { path: '/dashboard/payment-settings', visibleText: /Thanh toán|VietQR|SePay/i },
  {
    path: '/dashboard/payment-settings/sepay-callback?code=phase5-invalid-code&state=phase5-invalid-state',
    visibleText: /callback SePay|invalid|không hợp lệ|lỗi|error|Về cài đặt thanh toán/i,
  },
];

async function reachable(request: APIRequestContext, url: string, timeout = 10_000): Promise<boolean> {
  const response = await request.get(url, { timeout }).catch(() => null);
  return Boolean(response?.ok());
}

function absoluteUrl(path: string): string {
  return `${MGMT_BASE}${path}`;
}

async function expectNotBlankOrServerError(page: Page, path: string, visibleText: RegExp): Promise<void> {
  const response = await page.goto(absoluteUrl(path), { waitUntil: 'domcontentloaded' });
  expect(response, `Navigation response for ${path}`).not.toBeNull();
  const status = response?.status() ?? 0;
  expect(status, `${path} must not return 401`).not.toBe(401);
  expect(status, `${path} must not return 500`).not.toBe(500);
  expect(status, `${path} must not return a server error`).toBeLessThan(500);

  await expect(page.locator('body')).toContainText(/\S/);
  await expect(page.locator('body')).toContainText(visibleText);
}

async function loginWithSeed(page: Page, nextPath: string, email: string, password: string): Promise<void> {
  test.skip(!email || !password, `Missing seeded credentials for ${nextPath}`);

  await page.goto(`${MGMT_BASE}/login?next=${encodeURIComponent(nextPath)}`, { waitUntil: 'domcontentloaded' });
  const continueButton = page.getByRole('button', { name: /Continue with Keycloak/i });
  test.skip(
    !(await continueButton.isVisible().catch(() => false)),
    `Management login button not ready at ${MGMT_BASE}`,
  );

  await continueButton.click();
  const reachedKeycloak = await page.waitForURL(/8180|keycloak|openid-connect/i, { timeout: 120_000 }).then(
    () => true,
    () => false,
  );
  test.skip(!reachedKeycloak, `Keycloak redirect not ready for ${nextPath}`);

  await page.locator('input[name="username"], #username').first().fill(email);
  await page.locator('input[name="password"], #password').first().fill(password);
  await page.locator('#kc-login, input[name="login"], button[type="submit"]').first().click();

  const escaped = nextPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
  await expect(page).toHaveURL(new RegExp(`${escaped}(\\?|$)`), { timeout: 120_000 });
}

test.describe('Phase 5 admin/dashboard route smoke', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(process.env.SKIP_PHASE5_ADMIN_ROUTES_E2E === '1', 'SKIP_PHASE5_ADMIN_ROUTES_E2E=1');

    test.skip(
      !(await reachable(request, MGMT_BASE)),
      `Management app not reachable at ${MGMT_BASE} (start nx serve management-app)`,
    );
  });

  test('public landing renders without auth', async ({ page }) => {
    await expectNotBlankOrServerError(page, '/', /QRTable|Đặt món qua QR/i);
  });

  test.describe('admin routes (SUPER_ADMIN)', () => {
    test.beforeEach(async ({ request }) => {
      test.skip(
        !(await reachable(request, BFF_HEALTH_URL)),
        `BFF not reachable at ${BFF_HEALTH_URL} (start pnpm dev:bff-auth after pnpm dev:reseed -- --yes)`,
      );
      test.skip(
        !(await reachable(request, KEYCLOAK_REALM_URL)),
        `Keycloak realm not reachable at ${KEYCLOAK_REALM_URL}`,
      );
    });

    for (const route of ADMIN_ROUTES) {
      test(`${route.path} is not blank, 401, or 500`, async ({ page }) => {
        await loginWithSeed(page, route.path, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
        await expectNotBlankOrServerError(page, route.path, route.visibleText);
      });
    }
  });

  test.describe('dashboard routes (OWNER)', () => {
    test.beforeEach(async ({ request }) => {
      test.skip(
        !(await reachable(request, BFF_HEALTH_URL)),
        `BFF not reachable at ${BFF_HEALTH_URL} (start pnpm dev:bff-auth after pnpm dev:reseed -- --yes)`,
      );
      test.skip(
        !(await reachable(request, KEYCLOAK_REALM_URL)),
        `Keycloak realm not reachable at ${KEYCLOAK_REALM_URL}`,
      );
    });

    for (const route of DASHBOARD_ROUTES) {
      test(`${route.path} is not blank, 401, or 500`, async ({ page }) => {
        await loginWithSeed(page, route.path, OWNER_EMAIL, OWNER_PASSWORD);
        await expectNotBlankOrServerError(page, route.path, route.visibleText);
      });
    }
  });
});
