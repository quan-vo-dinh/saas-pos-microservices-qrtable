import type { CartSnapshot, Order } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export type CartMutateOperation = 'ADD_ITEM' | 'SET_QUANTITY' | 'UPDATE_NOTE' | 'REMOVE_LINE' | 'CLEAR';

export type CartMutatePayload = {
  expectedCartVersion: number;
  operation: CartMutateOperation;
  menuItemId?: string;
  cartLineId?: string;
  quantity?: number;
  note?: string;
  sessionClientId?: string;
};

export const orderService = {
  getCart: (): Promise<CartSnapshot> => customerApi<CartSnapshot>(API_CONFIG.ENDPOINTS.CART),

  mutateCart: (payload: CartMutatePayload): Promise<CartSnapshot> =>
    customerApi<CartSnapshot>(API_CONFIG.ENDPOINTS.CART, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  clearCart: (expectedCartVersion: number): Promise<CartSnapshot> => {
    const q = new URLSearchParams({ expectedCartVersion: String(expectedCartVersion) });
    return customerApi<CartSnapshot>(`${API_CONFIG.ENDPOINTS.CART}?${q.toString()}`, {
      method: 'DELETE',
    });
  },

  getOrderById: (orderId: string): Promise<Order> => customerApi<Order>(API_CONFIG.ENDPOINTS.ORDER_BY_ID(orderId)),
};
