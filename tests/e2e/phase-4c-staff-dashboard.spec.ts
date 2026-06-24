/**
 * Phase 4C — Management App `/dashboard/staff` smoke (Owner).
 *
 * Prerequisites:
 * - `pnpm dev:reseed -- --yes` (or seeded tenant)
 * - `pnpm dev --projects=bff,user-access` + `pnpm nx serve authorizer` + `pnpm nx serve saas`
 * - `pnpm nx serve management-app`
 *
 * Skip: `SKIP_PHASE4C_STAFF_E2E=1`
 *
 * Credentials default from `tools/auth-bootstrap-users.json`; override:
 * - `PHASE4C_OWNER_EMAIL`, `PHASE4C_OWNER_PASSWORD`
 */
import { expect, test, type Page } from '@playwright/test';
import { attachPageShot, setAllureContext } from './helpers/allure';
import { loginWithKeycloakOrSkip } from './helpers/auth';
import { reachable } from './helpers/readiness';

const MGMT_BASE = process.env.PHASE4C_MANAGEMENT_BASE_URL ?? 'http://localhost:3000';
const BFF_HEALTH_URL = process.env.PHASE4C_BFF_HEALTH_URL ?? 'http://localhost:3300/api/v1/health';
const KEYCLOAK_REALM_URL = process.env.PHASE4C_KEYCLOAK_REALM_URL ?? 'http://localhost:8180/realms/qrtable';

const OWNER_EMAIL = process.env.PHASE4C_OWNER_EMAIL ?? 'owner.1700000002@gmail.com';
const OWNER_PASSWORD = process.env.PHASE4C_OWNER_PASSWORD ?? 'owner';

const STAFF_PATH = '/dashboard/staff';

async function expectStaffPageRenders(page: Page): Promise<void> {
  await expect(page.locator('body')).toContainText(/Nhân viên/);
  await expect(page.getByRole('button', { name: 'Thêm nhân viên' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\bWAITER\b/);
  await expect(page.locator('body')).not.toContainText(/\bACTIVE\b/);
}

test.describe('Phase 4C staff dashboard', () => {
  test.beforeEach(async ({ request }) => {
    test.skip(process.env.SKIP_PHASE4C_STAFF_E2E === '1', 'SKIP_PHASE4C_STAFF_E2E=1');

    test.skip(
      !(await reachable(request, MGMT_BASE)),
      `Management app not reachable at ${MGMT_BASE} (pnpm nx serve management-app)`,
    );
    test.skip(!(await reachable(request, BFF_HEALTH_URL)), `BFF not reachable at ${BFF_HEALTH_URL}`);
    test.skip(!(await reachable(request, KEYCLOAK_REALM_URL)), `Keycloak realm not reachable at ${KEYCLOAK_REALM_URL}`);
  });

  test('owner opens /dashboard/staff with Vietnamese labels', async ({ page }, testInfo) => {
    setAllureContext({
      epic: 'Staff management',
      feature: 'Management dashboard localization',
      story: 'Owner can open staff dashboard with Vietnamese labels',
      suite: 'E2E / Phase 4C',
    });
    await loginWithKeycloakOrSkip(page, MGMT_BASE, STAFF_PATH, OWNER_EMAIL, OWNER_PASSWORD);
    await expectStaffPageRenders(page);
    await attachPageShot(page, testInfo, 'staff dashboard overview');
  });

  test('create staff dialog shows localized role labels', async ({ page }, testInfo) => {
    setAllureContext({
      epic: 'Staff management',
      feature: 'Management dashboard localization',
      story: 'Create staff dialog uses localized role labels',
      suite: 'E2E / Phase 4C',
    });
    await loginWithKeycloakOrSkip(page, MGMT_BASE, STAFF_PATH, OWNER_EMAIL, OWNER_PASSWORD);
    await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
    await expect(page.getByRole('dialog')).toContainText(/Thêm nhân viên/);
    await expect(page.getByRole('dialog')).not.toContainText(/\bWAITER\b/);
    await attachPageShot(page, testInfo, 'create staff dialog');
  });
});
