import type { PreparationStation } from '@einvoice/types';

export type KitchenCommandContext = {
  tenantId: string;
  userId?: string;
  requestId: string;
  processId?: string;
  correlationId?: string;
};

export type KitchenUserCommandContext = KitchenCommandContext & {
  userId: string;
};

export type KdsGetQueueTcpRequest = {
  tenantId: string;
  station: PreparationStation;
};

export type KdsTicketActionTcpRequest = KitchenUserCommandContext & {
  ticketId: string;
  station: PreparationStation;
};

export type KdsRecallTicketTcpRequest = KdsTicketActionTcpRequest & {
  reason?: string;
};

export type KdsSetPriorityTcpRequest = KdsTicketActionTcpRequest & {
  priority: boolean;
};

export type KdsVoidByOrderTcpRequest = {
  tenantId: string;
  orderId: string;
  reason: 'ORDER_CANCELED' | 'STOCK_COMPENSATION' | 'TRANSFER_COMPENSATION';
  correlationId?: string;
};

export type KdsPatchTableSnapshotTcpRequest = {
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  correlationId?: string;
};

export type KdsRebuildTenantTcpRequest = {
  tenantId: string;
  station?: PreparationStation;
  requestId: string;
  correlationId?: string;
};
