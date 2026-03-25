import type { Category, MenuItem } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export const menuService = {
  getCategories: () => customerApi<Category[]>(API_CONFIG.ENDPOINTS.MENU_CATEGORIES),

  getItems: (categoryId?: string) => {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    return customerApi<MenuItem[]>(`${API_CONFIG.ENDPOINTS.MENU_ITEMS}${query}`);
  },
};
