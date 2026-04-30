import type { OrderConfirmedEvent } from '@einvoice/types';
import type { Order } from '@common/entities/order.entity';
import type { OrderItem } from '@common/entities/order-item.entity';
import { randomUUID } from 'crypto';

export function buildOrderConfirmedKafkaPayload(input: {
  tenantId: string;
  order: Order;
  items: OrderItem[];
  confirmedAt: Date;
  confirmedByUserId: string;
  correlationId?: string;
}): OrderConfirmedEvent {
  const { tenantId, order, items, confirmedAt, confirmedByUserId, correlationId } = input;
  const iso = (d: Date) => d.toISOString();
  return {
    eventId: randomUUID(),
    eventType: 'order.confirmed',
    schemaVersion: 1,
    tenantId,
    orderId: order.id,
    sessionId: order.sessionId,
    tableId: order.tableId,
    tableName: order.tableName,
    items: items.map((it) => ({
      id: it.id,
      orderId: it.orderId,
      menuItemId: it.menuItemId,
      menuItemName: it.menuItemName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      note: it.note ?? undefined,
      status: it.status,
      station: it.station ?? undefined,
      createdAt: iso(it.createdAt),
      updatedAt: iso(it.updatedAt),
    })),
    totalAmount: order.totalAmount,
    confirmedAt: iso(confirmedAt),
    confirmedByUserId,
    occurredAt: iso(new Date()),
    correlationId,
  };
}
