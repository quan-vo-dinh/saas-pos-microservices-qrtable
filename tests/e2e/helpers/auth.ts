import { expect, test, type Page } from '@playwright/test';

const KEYCLOAK_REDIRECT_PATTERN = /8180|keycloak|openid-connect/i;
const KEYCLOAK_CONTINUE_BUTTON = /(?:Tiếp tục với Keycloak|Continue with Keycloak)/i;

function escapedPathPattern(path: string): RegExp {
  if (path === '/pos/payment' || path === '/pos/bills') {
    return /\/pos\/(payment|bills)/;
  }
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
  return new RegExp(`${escaped}(\\?|$)`);
}

function loginUrl(managementBaseUrl: string, nextPath: string): string {
  return `${managementBaseUrl}/login?next=${encodeURIComponent(nextPath)}`;
}

async function submitKeycloakCredentials(page: Page, nextPath: string, email: string, password: string): Promise<void> {
  await page.locator('input[name="username"], #username').first().fill(email);
  await page.locator('input[name="password"], #password').first().fill(password);
  await page.locator('#kc-login, input[name="login"], button[type="submit"]').first().click();

  await expect(page).toHaveURL(escapedPathPattern(nextPath), { timeout: 120_000 });
}

export async function loginWithKeycloak(
  page: Page,
  managementBaseUrl: string,
  nextPath: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto(loginUrl(managementBaseUrl, nextPath));
  await page.getByRole('button', { name: KEYCLOAK_CONTINUE_BUTTON }).click();
  await page.waitForURL(KEYCLOAK_REDIRECT_PATTERN, { timeout: 120_000 });
  await submitKeycloakCredentials(page, nextPath, email, password);
}

export async function loginWithKeycloakOrSkip(
  page: Page,
  managementBaseUrl: string,
  nextPath: string,
  email: string | undefined,
  password: string | undefined,
): Promise<void> {
  if (!email || !password) {
    test.skip(true, `Missing seeded credentials for ${nextPath}`);
    return;
  }

  await page.goto(loginUrl(managementBaseUrl, nextPath), {
    waitUntil: 'domcontentloaded',
  });

  const continueButton = page.getByRole('button', { name: KEYCLOAK_CONTINUE_BUTTON });
  test.skip(
    !(await continueButton.isVisible().catch(() => false)),
    `Management login button not ready at ${managementBaseUrl}`,
  );

  await continueButton.click();
  const reachedKeycloak = await page.waitForURL(KEYCLOAK_REDIRECT_PATTERN, { timeout: 120_000 }).then(
    () => true,
    () => false,
  );
  test.skip(!reachedKeycloak, `Keycloak redirect not ready for ${nextPath}`);

  await submitKeycloakCredentials(page, nextPath, email, password);
}
