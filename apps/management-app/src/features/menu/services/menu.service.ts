import type { Category, MenuItem } from '@einvoice/types';
import { apiClient } from '@einvoice/frontend-utils';
import { getBffBaseUrl } from '@/lib/auth/bff-server';

const bffUrl = () => getBffBaseUrl();

export const menuService = {
  getCategories: () => apiClient<Category[]>('/catalog/categories', { baseUrl: bffUrl() }),

  getCategory: (id: string) =>
    apiClient<Category>(`/catalog/categories/${encodeURIComponent(id)}`, { baseUrl: bffUrl() }),

  createCategory: (data: { name: string; timeStart?: string; timeEnd?: string; status: string }) =>
    apiClient<Category>('/catalog/categories', {
      baseUrl: bffUrl(),
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCategory: (id: string, data: { name: string; timeStart?: string; timeEnd?: string; status: string }) =>
    apiClient<Category>(`/catalog/categories/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCategory: (id: string) =>
    apiClient<void>(`/catalog/categories/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'DELETE',
    }),

  getMenuItems: (categoryId?: string) => {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    return apiClient<MenuItem[]>(`/catalog/menu-items${query}`, { baseUrl: bffUrl() });
  },

  getMenuItem: (id: string) =>
    apiClient<MenuItem>(`/catalog/menu-items/${encodeURIComponent(id)}`, { baseUrl: bffUrl() }),

  createMenuItem: (data: {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    stock: number;
    status: string;
  }) =>
    apiClient<MenuItem>('/catalog/menu-items', {
      baseUrl: bffUrl(),
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
  ) =>
    apiClient<MenuItem>(`/catalog/menu-items/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMenuItem: (id: string) =>
    apiClient<void>(`/catalog/menu-items/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'DELETE',
    }),
};
