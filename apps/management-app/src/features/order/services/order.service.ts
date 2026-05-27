import type {
  Bill,
  BillStatus,
  BillRequestedEvent,
  CartSnapshot,
  CartUpdatedEvent,
  Order,
  OrderStatus,
  OrderStatusChangedEvent,
  ServiceRequest,
  ServiceRequestedEvent,
  Session,
  TableTransferredEvent,
} from '@einvoice/types';
import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';

export type OrderListParams = {
  status?: OrderStatus;
  tableId?: string;
  limit?: number;
  offset?: number;
};

export type BillListParams = {
  status?: BillStatus;
  limit?: number;
  offset?: number;
};

export type CancelOrderPayload = {
  reason?: string;
};

export type TransferTablePayload = {
  sessionId: string;
  fromTableId: string;
  toTableId: string;
  requestId: string;
};

export type ReleaseEmptyTableSessionPayload = {
  tableId: string;
  sessionId: string;
};

export type OrderActionResult = {
  order: Order;
  bill?: Bill;
  events: {
    orderStatusChanged: OrderStatusChangedEvent;
  };
};

export type TransferTableResult = {
  session: Session;
  events: {
    tableTransferred: TableTransferredEvent;
  };
};

export type ReleaseEmptyTableSessionResult = {
  tenantId: string;
  tableId: string;
  sessionId: string;
  released: true;
};

export type ReopenBillResult = {
  bill: Bill;
  request?: ServiceRequest;
  cart: CartSnapshot;
  events: {
    billRequested?: BillRequestedEvent;
    serviceRequested?: ServiceRequestedEvent;
    cartUpdated: CartUpdatedEvent;
  };
};

function buildOrdersQuery(params?: OrderListParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.tableId) {
    searchParams.set('tableId', params.tableId);
  }

  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }

  if (typeof params.offset === 'number') {
    searchParams.set('offset', String(params.offset));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function buildBillsQuery(params?: BillListParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }

  if (typeof params.offset === 'number') {
    searchParams.set('offset', String(params.offset));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const orderService = {
  getOrders: (params?: OrderListParams): Promise<Order[]> =>
    authApiClient<Order[]>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}${buildOrdersQuery(params)}`),

  getBills: (params?: BillListParams): Promise<Bill[]> =>
    authApiClient<Bill[]>(`${API_CONFIG.ENDPOINTS.ADMIN_BILLS}${buildBillsQuery(params)}`),

  getOrder: (id: string): Promise<Order> =>
    authApiClient<Order>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${encodeURIComponent(id)}`),

  confirmOrder: (id: string): Promise<OrderActionResult> =>
    authApiClient<OrderActionResult>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
    }),

  markOrderServed: (id: string): Promise<OrderActionResult> =>
    authApiClient<OrderActionResult>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${encodeURIComponent(id)}/serve`, {
      method: 'POST',
    }),

  cancelPendingOrder: (id: string, payload: CancelOrderPayload): Promise<OrderActionResult> =>
    authApiClient<OrderActionResult>(`${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${encodeURIComponent(id)}/cancel-pending`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelProcessingOrder: (id: string, payload: { reason: string }): Promise<OrderActionResult> =>
    authApiClient<OrderActionResult>(
      `${API_CONFIG.ENDPOINTS.ADMIN_ORDERS}/${encodeURIComponent(id)}/cancel-processing`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  transferTable: (payload: TransferTablePayload): Promise<TransferTableResult> =>
    authApiClient<TransferTableResult>(API_CONFIG.ENDPOINTS.ADMIN_TABLES_TRANSFER, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  releaseEmptyTableSession: (payload: ReleaseEmptyTableSessionPayload): Promise<ReleaseEmptyTableSessionResult> =>
    authApiClient<ReleaseEmptyTableSessionResult>(
      API_CONFIG.ENDPOINTS.ADMIN_TABLES_RELEASE_EMPTY_SESSION(payload.tableId),
      {
        method: 'POST',
        body: JSON.stringify({ sessionId: payload.sessionId }),
      },
    ),

  reopenBill: (sessionId: string): Promise<ReopenBillResult> =>
    authApiClient<ReopenBillResult>(
      `${API_CONFIG.ENDPOINTS.ADMIN_BILLS_REOPEN}/${encodeURIComponent(sessionId)}/reopen`,
      {
        method: 'POST',
      },
    ),
};
