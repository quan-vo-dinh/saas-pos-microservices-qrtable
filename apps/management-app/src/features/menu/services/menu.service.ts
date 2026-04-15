import type { Category, MenuItem } from '@einvoice/types';
import { uploadFile } from '@einvoice/frontend-utils';
import type { UploadResult } from '@einvoice/frontend-utils';
import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';

export const menuService = {
  // ─── Categories ─────────────────────────────────────
  getCategories: (): Promise<Category[]> =>
    authApiClient<Category[]>(API_CONFIG.ENDPOINTS.CATEGORIES),

  getCategory: (id: string): Promise<Category> =>
    authApiClient<Category>(`${API_CONFIG.ENDPOINTS.CATEGORIES}/${encodeURIComponent(id)}`),

  createCategory: (data: { name: string; timeStart?: string; timeEnd?: string; status: string }): Promise<Category> =>
    authApiClient<Category>(API_CONFIG.ENDPOINTS.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name: string; timeStart?: string; timeEnd?: string; status: string }): Promise<Category> =>
    authApiClient<Category>(`${API_CONFIG.ENDPOINTS.CATEGORIES}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string): Promise<void> =>
    authApiClient<void>(`${API_CONFIG.ENDPOINTS.CATEGORIES}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  reorderCategories: (orderedIds: string[]): Promise<void> =>
    authApiClient<void>(API_CONFIG.ENDPOINTS.CATEGORIES_REORDER, {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    }),

  // ─── Menu Items ─────────────────────────────────────
  getMenuItems: (categoryId?: string): Promise<MenuItem[]> => {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    return authApiClient<MenuItem[]>(`${API_CONFIG.ENDPOINTS.MENU_ITEMS}${query}`);
  },

  getMenuItem: (id: string): Promise<MenuItem> =>
    authApiClient<MenuItem>(`${API_CONFIG.ENDPOINTS.MENU_ITEMS}/${encodeURIComponent(id)}`),

  createMenuItem: (data: {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    stock: number;
    status: string;
  }): Promise<MenuItem> =>
    authApiClient<MenuItem>(API_CONFIG.ENDPOINTS.MENU_ITEMS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMenuItem: (
    id: string,
    data: {
      name: string;
      description?: string;
      price: number;
      categoryId: string;
      stock: number;
      status: string;
    },
  ): Promise<MenuItem> =>
    authApiClient<MenuItem>(`${API_CONFIG.ENDPOINTS.MENU_ITEMS}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMenuItem: (id: string): Promise<void> =>
    authApiClient<void>(`${API_CONFIG.ENDPOINTS.MENU_ITEMS}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  uploadMenuItemImage: (
    id: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<UploadResult> => {
    const baseUrl = API_CONFIG.DEFAULT_BFF_URL;
    const url = `${baseUrl}${API_CONFIG.ENDPOINTS.MENU_ITEMS}/${encodeURIComponent(id)}/image`;
    return uploadFile({ url, file, onProgress });
  },
};
