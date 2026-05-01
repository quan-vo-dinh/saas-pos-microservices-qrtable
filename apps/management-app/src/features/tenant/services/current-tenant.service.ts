import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';

export type CurrentTenantPublic = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

export const currentTenantService = {
  getCurrent: (): Promise<CurrentTenantPublic> =>
    authApiClient<CurrentTenantPublic>(API_CONFIG.ENDPOINTS.ADMIN_CURRENT_TENANT),
};
