import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export type PublicTenantResolve = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  suspendedReason?: string | null;
};

export const tenantService = {
  getBySlug: (slug: string): Promise<PublicTenantResolve> =>
    customerApi<PublicTenantResolve>(API_CONFIG.ENDPOINTS.PUBLIC_TENANT(slug), {
      method: 'GET',
      omitSessionHeader: true,
      skipTenantHeader: true,
    }),
};
