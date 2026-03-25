import type { Order } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

type CreateOrderPayload = {
  sessionId: string;
  tableId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    note?: string;
  }>;
};

export const orderService = {
  create: (data: CreateOrderPayload) =>
    customerApi<Order>(API_CONFIG.ENDPOINTS.ORDER_CREATE, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStatus: (sessionId: string) =>
    customerApi<Order[]>(`${API_CONFIG.ENDPOINTS.ORDER_STATUS}?sessionId=${encodeURIComponent(sessionId)}`),
};
