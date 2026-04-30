import type { Bill, CartSnapshot, Order, ServiceRequest, ServiceRequestType } from '@einvoice/types';
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

export type SubmitOrderPayload = {
  expectedCartVersion: number;
  idempotencyKey: string;
  notes?: string;
};

export type SubmitOrderResponse = {
  order: Order;
  bill: Bill;
  cart: CartSnapshot;
};

export type CancelOrderResponse = {
  order: Order;
  bill?: Bill;
};

export type CreateServiceRequestPayload = {
  type: ServiceRequestType;
  note?: string;
};

export type CreateServiceRequestResponse = {
  request: ServiceRequest;
};

export type RequestBillResponse = {
  bill: Bill;
  request?: ServiceRequest;
  cart: CartSnapshot;
};

export type CurrentBillResponse = {
  bill: Bill | null;
  cart: CartSnapshot;
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

  submitOrder: (payload: SubmitOrderPayload): Promise<SubmitOrderResponse> =>
    customerApi<SubmitOrderResponse>(API_CONFIG.ENDPOINTS.ORDERS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOrderById: (orderId: string): Promise<Order> => customerApi<Order>(API_CONFIG.ENDPOINTS.ORDER_BY_ID(orderId)),

  cancelOrder: (orderId: string, reason?: string): Promise<CancelOrderResponse> =>
    customerApi<CancelOrderResponse>(API_CONFIG.ENDPOINTS.ORDER_BY_ID(orderId), {
      method: 'DELETE',
      body: JSON.stringify(reason ? { reason } : {}),
    }),

  createServiceRequest: (payload: CreateServiceRequestPayload): Promise<CreateServiceRequestResponse> =>
    customerApi<CreateServiceRequestResponse>(API_CONFIG.ENDPOINTS.SERVICE_REQUESTS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  requestBill: (): Promise<RequestBillResponse> =>
    customerApi<RequestBillResponse>(API_CONFIG.ENDPOINTS.BILL_REQUEST, {
      method: 'POST',
    }),

  getCurrentBill: (): Promise<CurrentBillResponse> =>
    customerApi<CurrentBillResponse>(API_CONFIG.ENDPOINTS.BILL_CURRENT),
};
