import type { APIRequestContext } from '@playwright/test';

export async function reachable(request: APIRequestContext, url: string, timeout = 10_000): Promise<boolean> {
  const response = await request.get(url, { timeout }).catch(() => null);
  return Boolean(response?.ok());
}
