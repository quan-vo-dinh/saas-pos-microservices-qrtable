/**
 * Phase 5 admin/dashboard route smoke — optional local dev stack.
 *
 * Prerequisites:
 * `pnpm dev:reseed -- --yes`, local auth stack (`bff`, `authorizer`, `user-access`, `saas`),
 * `nx serve management-app`, Keycloak 8180.
 *
 * Skip: `SKIP_PHASE5_ADMIN_ROUTES_E2E=1`, or when management-app/BFF/Keycloak/auth seed is not ready.
 */
import { expect, test, type Page } from '@playwright/test';
import { attachPageShot, setAllureContext } from './helpers/allure';
import { loginWithKeycloakOrSkip } from './helpers/auth';
import { reachable } from './helpers/readiness';

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

test.describe('Phase 5 admin/dashboard route smoke', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(process.env.SKIP_PHASE5_ADMIN_ROUTES_E2E === '1', 'SKIP_PHASE5_ADMIN_ROUTES_E2E=1');

    test.skip(
      !(await reachable(request, MGMT_BASE)),
      `Management app not reachable at ${MGMT_BASE} (start nx serve management-app)`,
    );
  });

  test('public landing renders without auth', async ({ page }, testInfo) => {
    setAllureContext({
      epic: 'Admin dashboard routing',
      feature: 'Public and protected route smoke',
      story: 'Public landing renders without auth and protected routes stay healthy',
      suite: 'E2E / Phase 5',
    });
    await expectNotBlankOrServerError(page, '/', /QRTable|Đặt món qua QR/i);
    await attachPageShot(page, testInfo, 'public landing');
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
      test(`${route.path} is not blank, 401, or 500`, async ({ page }, testInfo) => {
        await loginWithKeycloakOrSkip(page, MGMT_BASE, route.path, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
        await expectNotBlankOrServerError(page, route.path, route.visibleText);
        await attachPageShot(page, testInfo, `admin route ${route.path}`);
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
      test(`${route.path} is not blank, 401, or 500`, async ({ page }, testInfo) => {
        await loginWithKeycloakOrSkip(page, MGMT_BASE, route.path, OWNER_EMAIL, OWNER_PASSWORD);
        await expectNotBlankOrServerError(page, route.path, route.visibleText);
        await attachPageShot(page, testInfo, `dashboard route ${route.path}`);
      });
    }
  });
});
