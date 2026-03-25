import type { UserProfile } from '@einvoice/types';
import { API_CONFIG } from '@/constants/api';

function normalizeBaseUrl(rawUrl?: string): string {
  if (!rawUrl) {
    return API_CONFIG.DEFAULT_BFF_URL;
  }

  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
}

export function getBffBaseUrl(): string {
  return normalizeBaseUrl(process.env.MANAGEMENT_BFF_BASE_URL ?? process.env.NEXT_PUBLIC_BFF_BASE_URL);
}

function unwrapResponse<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const directPayload = payload as Record<string, unknown>;
  if ('userId' in directPayload) {
    return payload as T;
  }

  const maybeData = (payload as { data?: unknown }).data;
  if (!maybeData || typeof maybeData !== 'object') {
    return null;
  }

  return maybeData as T;
}

export async function fetchAuthorizerMe(accessToken: string, tenantId?: string): Promise<UserProfile | null> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const response = await fetch(`${getBffBaseUrl()}${API_CONFIG.ENDPOINTS.AUTHORIZER_ME}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  return unwrapResponse<UserProfile>(payload);
}
