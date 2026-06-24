import { allure } from 'allure-playwright';
import type { Page, TestInfo } from '@playwright/test';

export function setAllureContext(params: { epic: string; feature: string; story: string; suite?: string }): void {
  allure.epic(params.epic);
  allure.feature(params.feature);
  allure.story(params.story);
  if (params.suite) {
    allure.parentSuite(params.suite);
  }
}

export async function attachPageShot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

export async function attachText(testInfo: TestInfo, name: string, text: string): Promise<void> {
  await testInfo.attach(name, {
    body: text,
    contentType: 'text/plain',
  });
}
