import { apiClient } from '@einvoice/frontend-utils';
import { API_CONFIG, PWA_SESSION_STORAGE_KEY } from '@/constants/api';

let activeSessionId: string | null = null;
let activeTenantId: string | null = null;

export const CUSTOMER_SESSION_EXPIRED_EVENT = 'qrtable:customer-session-expired';

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
  /** Skip `x-tenant-id` (e.g. public tenant resolver before slug → id is known). */
  skipTenantHeader?: boolean;
};

function isSessionClosedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { status?: unknown; errorCode?: unknown };
  return candidate.status === 410 || candidate.errorCode === 'SESSION_CLOSED';
}

function clearCustomerSessionState(): void {
  activeSessionId = null;
  activeTenantId = null;

  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(PWA_SESSION_STORAGE_KEY);
  window.dispatchEvent(new Event(CUSTOMER_SESSION_EXPIRED_EVENT));
}

/**
 * Pre-configured API client for the Customer PWA.
 * Prepends BFF base URL, resolves tenant header from joined session when set,
 * and sends `x-session-id` when an Order session is active.
 */
export async function customerApi<T>(path: string, options?: CustomerApiOptions): Promise<T> {
  const { omitSessionHeader, skipTenantHeader, headers: optsHeaders, ...rest } = options ?? {};
  const fallbackTenant = API_CONFIG.TENANT_ID;
  const tenantId = skipTenantHeader ? undefined : (activeTenantId ?? fallbackTenant);

  const headers: Record<string, string> = {
    ...(optsHeaders as Record<string, string> | undefined),
  };

  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  const sid = activeSessionId;
  if (sid && !omitSessionHeader) {
    headers['x-session-id'] = sid;
  }

  try {
    return await apiClient<T>(path, {
      ...rest,
      baseUrl: API_CONFIG.DEFAULT_BASE_URL,
      headers,
    });
  } catch (error) {
    if (isSessionClosedError(error)) {
      clearCustomerSessionState();
    }
    throw error;
  }
}
