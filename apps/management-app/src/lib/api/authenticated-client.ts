'use client';

import { apiClient } from '@einvoice/frontend-utils';
import { getBffBaseUrl } from '@/lib/auth/bff-server';
import { useAuthStore } from '@/lib/auth/auth-store';

type AuthClientOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export function authApiClient<T>(path: string, options?: AuthClientOptions): Promise<T> {
  const { profile, accessToken } = useAuthStore.getState();
  const authHeaders: Record<string, string> = {};

  if (accessToken) {
    authHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  if (profile?.tenantId) {
    authHeaders['x-tenant-id'] = profile.tenantId;
  }

  return apiClient<T>(path, {
    ...options,
    baseUrl: getBffBaseUrl(),
    headers: {
      ...authHeaders,
      ...options?.headers,
    },
  });
}
