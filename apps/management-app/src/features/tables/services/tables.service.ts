import type { Area, RestaurantTable } from '@einvoice/types';
import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';

export const tablesService = {
  // ─── Areas ──────────────────────────────────────────
  getAreas: (): Promise<Area[]> =>
    authApiClient<Area[]>(API_CONFIG.ENDPOINTS.AREAS),

  getArea: (id: string): Promise<Area> =>
    authApiClient<Area>(`${API_CONFIG.ENDPOINTS.AREAS}/${encodeURIComponent(id)}`),

  createArea: (data: { name: string; sortOrder?: number }): Promise<Area> =>
    authApiClient<Area>(API_CONFIG.ENDPOINTS.AREAS, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateArea: (id: string, data: { name: string; sortOrder?: number }): Promise<Area> =>
    authApiClient<Area>(`${API_CONFIG.ENDPOINTS.AREAS}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteArea: (id: string): Promise<void> =>
    authApiClient<void>(`${API_CONFIG.ENDPOINTS.AREAS}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  reorderAreas: (orderedIds: string[]): Promise<void> =>
    authApiClient<void>(API_CONFIG.ENDPOINTS.AREAS_REORDER, {
      method: 'PATCH',
      body: JSON.stringify({ orderedIds }),
    }),

  // ─── Tables ─────────────────────────────────────────
  getTables: (areaId?: string): Promise<RestaurantTable[]> => {
    const query = areaId ? `?areaId=${encodeURIComponent(areaId)}` : '';
    return authApiClient<RestaurantTable[]>(`${API_CONFIG.ENDPOINTS.TABLES}${query}`);
  },

  getTable: (id: string): Promise<RestaurantTable> =>
    authApiClient<RestaurantTable>(`${API_CONFIG.ENDPOINTS.TABLES}/${encodeURIComponent(id)}`),

  createTable: (data: { name: string; areaId: string; capacity: number }): Promise<RestaurantTable> =>
    authApiClient<RestaurantTable>(API_CONFIG.ENDPOINTS.TABLES, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTable: (id: string, data: { name: string; areaId: string; capacity: number }): Promise<RestaurantTable> =>
    authApiClient<RestaurantTable>(`${API_CONFIG.ENDPOINTS.TABLES}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTable: (id: string): Promise<void> =>
    authApiClient<void>(`${API_CONFIG.ENDPOINTS.TABLES}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  updateTableStatus: (id: string, status: string): Promise<RestaurantTable> =>
    authApiClient<RestaurantTable>(`${API_CONFIG.ENDPOINTS.TABLES}/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  regenerateQr: (id: string): Promise<RestaurantTable> =>
    authApiClient<RestaurantTable>(`${API_CONFIG.ENDPOINTS.TABLES}/${encodeURIComponent(id)}/regenerate-qr`, {
      method: 'POST',
    }),
};
