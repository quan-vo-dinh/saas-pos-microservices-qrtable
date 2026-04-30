import type { ServiceRequestType } from '@einvoice/types';

export type JoinSessionTcpRequest = {
  tenantId: string;
  tableId: string;
  qrToken: string;
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
};

export type StaffOrderActionTcpRequest = OrderIdTcpRequest & {
  userId: string;
  reason?: string;
  processId?: string;
};

export type ListOrdersTcpRequest = {
  tenantId: string;
  status?: string;
  tableId?: string;
  limit?: number;
  offset?: number;
};

export type CreateServiceRequestTcpRequest = {
  tenantId: string;
  sessionId: string;
  type: ServiceRequestType;
  note?: string;
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
