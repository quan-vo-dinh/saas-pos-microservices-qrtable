import type { Area, RestaurantTable } from '@einvoice/types';
import { apiClient } from '@einvoice/frontend-utils';
import { getBffBaseUrl } from '@/lib/auth/bff-server';

const bffUrl = () => getBffBaseUrl();

export const tablesService = {
  getAreas: () => apiClient<Area[]>('/catalog/areas', { baseUrl: bffUrl() }),

  getArea: (id: string) => apiClient<Area>(`/catalog/areas/${encodeURIComponent(id)}`, { baseUrl: bffUrl() }),

  createArea: (data: { name: string; sortOrder?: number }) =>
    apiClient<Area>('/catalog/areas', {
      baseUrl: bffUrl(),
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateArea: (id: string, data: { name: string; sortOrder?: number }) =>
    apiClient<Area>(`/catalog/areas/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteArea: (id: string) =>
    apiClient<void>(`/catalog/areas/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'DELETE',
    }),

  getTables: (areaId?: string) => {
    const query = areaId ? `?areaId=${encodeURIComponent(areaId)}` : '';
    return apiClient<RestaurantTable[]>(`/catalog/tables${query}`, { baseUrl: bffUrl() });
  },

  getTable: (id: string) =>
    apiClient<RestaurantTable>(`/catalog/tables/${encodeURIComponent(id)}`, { baseUrl: bffUrl() }),

  createTable: (data: { name: string; areaId: string; capacity: number }) =>
    apiClient<RestaurantTable>('/catalog/tables', {
      baseUrl: bffUrl(),
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTable: (id: string, data: { name: string; areaId: string; capacity: number }) =>
    apiClient<RestaurantTable>(`/catalog/tables/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTable: (id: string) =>
    apiClient<void>(`/catalog/tables/${encodeURIComponent(id)}`, {
      baseUrl: bffUrl(),
      method: 'DELETE',
    }),
};
