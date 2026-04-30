import { apiClient } from '@einvoice/frontend-utils';
import { API_CONFIG } from '@/constants/api';

let activeSessionId: string | null = null;
let activeTenantId: string | null = null;

export function setCustomerSessionId(id: string | null): void {
  activeSessionId = id;
}

export function getCustomerSessionId(): string | null {
  return activeSessionId;
}

export function setCustomerTenantId(id: string | null): void {
  activeTenantId = id;
}

export function getCustomerTenantId(): string | null {
  return activeTenantId;
}

export type CustomerApiOptions = RequestInit & {
  /** Join and similar calls must not send a stale Order session id. */
  omitSessionHeader?: boolean;
};

/**
 * Pre-configured API client for the Customer PWA.
 * Prepends BFF base URL, resolves tenant header from joined session when set,
 * and sends `x-session-id` when an Order session is active.
 */
export function customerApi<T>(path: string, options?: CustomerApiOptions): Promise<T> {
  const { omitSessionHeader, headers: optsHeaders, ...rest } = options ?? {};
  const tenantId = activeTenantId ?? API_CONFIG.TENANT_ID;

  const headers: Record<string, string> = {
    'x-tenant-id': tenantId,
    ...(optsHeaders as Record<string, string> | undefined),
  };

  const sid = activeSessionId;
  if (sid && !omitSessionHeader) {
    headers['x-session-id'] = sid;
  }

  return apiClient<T>(path, {
    ...rest,
    baseUrl: API_CONFIG.DEFAULT_BASE_URL,
    headers,
  });
}
