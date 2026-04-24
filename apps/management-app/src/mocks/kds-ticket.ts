import type { KDSTicket } from '@einvoice/types';

export type KDSStation = 'KITCHEN' | 'BAR';

export type ColumnStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE';

export type KDSTicketMock = KDSTicket & {
  station: KDSStation;
  columnStatus: ColumnStatus;
};

export function toKDSTicket(mock: KDSTicketMock): KDSTicket {
  const { ticketId, tenantId, orderId, tableId, tableName, items, priority, createdAt, slaSeconds } = mock;
  return { ticketId, tenantId, orderId, tableId, tableName, items, priority, createdAt, slaSeconds };
}
