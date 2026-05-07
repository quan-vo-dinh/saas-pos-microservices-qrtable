import type { PreparationStation } from './menu.types';
import type { OrderConfirmedEvent } from './realtime-events.types';

export const KdsTicketStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  VOIDED: 'VOIDED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type KdsTicketStatus = (typeof KdsTicketStatus)[keyof typeof KdsTicketStatus];

export const KdsTicketItemStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  CANCELED: 'CANCELED',
} as const;
export type KdsTicketItemStatus = (typeof KdsTicketItemStatus)[keyof typeof KdsTicketItemStatus];

export type KdsWarningLevel = 'NONE' | 'WARNING' | 'BREACH';

export type KdsQueueChangedReason =
  | 'TICKET_CREATED'
  | 'TICKET_STARTED'
  | 'TICKET_READY'
  | 'TICKET_RECALLED'
  | 'TICKET_VOIDED'
  | 'PRIORITY_CHANGED'
  | 'TABLE_SNAPSHOT_PATCHED'
  | 'SNAPSHOT_REBUILT'
  | 'SLA_CHANGED';

export type KdsTicketItemDto = {
  ticketItemId: string;
  orderItemId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  status: KdsTicketItemStatus;
};

export type KdsTicketDto = {
  ticketId: string;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: PreparationStation;
  status: KdsTicketStatus;
  priority: boolean;
  queueScore: number;
  queuePosition: number;
  confirmedAt: string;
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  recallUntil?: string;
  slaSeconds: number;
  slaDueAt: string;
  waitTimeSeconds: number;
  warningLevel: KdsWarningLevel;
  recovered: boolean;
  items: KdsTicketItemDto[];
};

export type KdsQueueSnapshot = {
  tenantId: string;
  station: PreparationStation;
  revision: number;
  serverTime: string;
  tickets: KdsTicketDto[];
};

export type KdsQueueChangedEvent = {
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: PreparationStation;
  revision: number;
  reason: KdsQueueChangedReason;
  ticketId?: string;
  orderId?: string;
  occurredAt: string;
  correlationId?: string;
};

export type KitchenItemReadyEvent = {
  eventId: string;
  eventType: 'kitchen.item_ready';
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  orderId: string;
  ticketId: string;
  station: PreparationStation;
  readyItems: Array<{
    orderItemId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    note?: string;
  }>;
  occurredAt: string;
  correlationId?: string;
};

export type KitchenSlaWarningEvent = {
  eventId: string;
  eventType: 'kitchen.sla_warning';
  schemaVersion: 1;
  tenantId: string;
  ticketId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: PreparationStation;
  level: 'WARNING' | 'BREACH';
  waitTimeSeconds: number;
  thresholdSeconds: number;
  occurredAt: string;
  correlationId?: string;
};

export type KdsActiveOrderSnapshot = {
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  confirmedAt: string;
  confirmedByUserId?: string;
  items: OrderConfirmedEvent['items'];
  correlationId?: string;
};
