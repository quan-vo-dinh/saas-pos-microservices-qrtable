import { apiClient } from '@einvoice/frontend-utils';
import { API_CONFIG } from '@/constants/api';

/**
 * Pre-configured API client for the Customer PWA.
 * Automatically prepends the BFF base URL and includes tenant header.
 */
export function customerApi<T>(path: string, options?: RequestInit): Promise<T> {
  return apiClient<T>(path, {
    ...options,
    baseUrl: API_CONFIG.DEFAULT_BASE_URL,
    headers: {
      'x-tenant-id': API_CONFIG.TENANT_ID,
      ...options?.headers,
    },
  });
}
