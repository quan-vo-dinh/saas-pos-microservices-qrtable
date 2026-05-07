import type { PreparationStation, ServiceRequestType } from '@einvoice/types';

export type JoinSessionTcpRequest = {
  tenantId: string;
  tableId: string;
  qrToken: string;
};

export type CartGetTcpRequest = {
  tenantId: string;
  sessionId: string;
};

export type CartClearTcpRequest = {
  tenantId: string;
  sessionId: string;
  expectedCartVersion: number;
};

export type CartMutationOperation = 'ADD_ITEM' | 'SET_QUANTITY' | 'UPDATE_NOTE' | 'REMOVE_LINE' | 'CLEAR';

export type CartMutateTcpRequest = {
  tenantId: string;
  sessionId: string;
  expectedCartVersion: number;
  operation: CartMutationOperation;
  menuItemId?: string;
  cartLineId?: string;
  quantity?: number;
  note?: string;
  sessionClientId?: string;
};

export type SubmitOrderTcpRequest = {
  tenantId: string;
  sessionId: string;
  expectedCartVersion: number;
  idempotencyKey: string;
  notes?: string;
};

export type OrderIdTcpRequest = {
  tenantId: string;
  orderId: string;
  /** BFF customer flows: must match order.sessionId */
  sessionId?: string;
};

export type StaffOrderActionTcpRequest = OrderIdTcpRequest & {
  userId: string;
  reason?: string;
  processId?: string;
};

/** Customer-only: session must own the PENDING order. */
export type CustomerCancelPendingTcpRequest = {
  tenantId: string;
  sessionId: string;
  orderId: string;
  reason?: string;
};

export type ListOrdersTcpRequest = {
  tenantId: string;
  status?: string;
  tableId?: string;
  limit?: number;
  offset?: number;
};

export type CustomerListOrdersTcpRequest = {
  tenantId: string;
  sessionId: string;
};

export type CreateServiceRequestTcpRequest = {
  tenantId: string;
  sessionId: string;
  type: ServiceRequestType;
  note?: string;
};

export type ListServiceRequestsTcpRequest = {
  tenantId: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type ServiceRequestActionTcpRequest = {
  tenantId: string;
  requestId: string;
  userId: string;
};

export type BillSessionTcpRequest = {
  tenantId: string;
  sessionId: string;
  userId?: string;
};

export type TransferTableTcpRequest = {
  tenantId: string;
  sessionId: string;
  fromTableId: string;
  toTableId: string;
  userId: string;
  requestId: string;
};

export type KdsActiveOrdersGetTcpRequest = {
  tenantId: string;
  station?: PreparationStation;
};

export type MarkOrderItemsReadyTcpRequest = {
  tenantId: string;
  orderId: string;
  ticketId: string;
  station: PreparationStation;
  orderItemIds: string[];
  userId: string;
  requestId: string;
  correlationId?: string;
};

export type RevertOrderItemsProcessingTcpRequest = MarkOrderItemsReadyTcpRequest & {
  reason: 'KITCHEN_COMPENSATION' | 'KITCHEN_RECALL';
};
