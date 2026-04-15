import type { PublicMenuResponse } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export const menuService = {
  getFullMenu: (): Promise<PublicMenuResponse> =>
    customerApi<PublicMenuResponse>(API_CONFIG.ENDPOINTS.MENU),
};
