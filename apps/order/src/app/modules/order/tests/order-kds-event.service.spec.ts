import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { OrderItemStatus, OrderStatus } from '@einvoice/types';
import { OrderKdsEventService } from '../services/order-kds-event.service';

describe('OrderKdsEventService', () => {
  let service: OrderKdsEventService;

  beforeEach(() => {
    service = new OrderKdsEventService();
  });

  it('toKdsActiveOrderSnapshot returns confirmed order snapshot', () => {
    const confirmedAt = new Date('2026-05-07T12:00:00.000Z');
    const order = buildOrder({ confirmedAt });
    const item = buildOrderItem({ station: 'KITCHEN' });

    const snapshot = service.toKdsActiveOrderSnapshot(order, [item]);

    expect(snapshot).toEqual({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      tableName: 'T1',
      confirmedAt: confirmedAt.toISOString(),
      confirmedByUserId: 'staff-1',
      items: [
        expect.objectContaining({
          id: 'item-1',
          orderId: 'order-1',
          menuItemId: 'menu-1',
          menuItemName: 'Pho',
          status: OrderItemStatus.PROCESSING,
          station: 'KITCHEN',
        }),
      ],
    });
  });

  it('toKdsActiveOrderSnapshot rejects unconfirmed orders', () => {
    expect(() => service.toKdsActiveOrderSnapshot(buildOrder({ confirmedAt: null }), [])).toThrow(
      expect.objectContaining({ errorCode: ErrorCode.COMMON_INTERNAL_ERROR }),
    );
  });

  it('buildKitchenItemReadyEvent includes tenantId, sessionId, orderId, itemId, and server timestamp', () => {
    const before = Date.now();
    const event = service.buildKitchenItemReadyEvent(
      buildOrder(),
      {
        tenantId: 'tenant-1',
        orderId: 'order-1',
        ticketId: 'order-1:KITCHEN',
        station: 'KITCHEN',
        orderItemIds: ['item-1'],
        userId: 'chef-1',
        requestId: 'request-1',
        correlationId: 'corr-1',
      },
      [buildOrderItem({ id: 'item-1', station: 'KITCHEN' }), buildOrderItem({ id: 'item-2', station: 'BAR' })],
    );
    const after = Date.now();

    expect(event).toEqual(
      expect.objectContaining({
        eventType: 'kitchen.item_ready',
        schemaVersion: 1,
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        orderId: 'order-1',
        ticketId: 'order-1:KITCHEN',
        station: 'KITCHEN',
        correlationId: 'corr-1',
      }),
    );
    expect(event.readyItems).toEqual([expect.objectContaining({ orderItemId: 'item-1' })]);
    expect(new Date(event.occurredAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(event.occurredAt).getTime()).toBeLessThanOrEqual(after);
  });

  it('assertKdsStationTargets rejects item ids outside the requested station', () => {
    expect(() =>
      service.assertKdsStationTargets([buildOrderItem({ id: 'item-1', station: 'BAR' })], ['item-1'], 'KITCHEN'),
    ).toThrow(expect.objectContaining({ errorCode: ErrorCode.COMMON_VALIDATION_FAILED }));
  });
});

function buildOrder(overrides: Partial<Order> = {}): Order {
  const now = new Date('2026-05-07T12:00:00.000Z');
  return {
    id: 'order-1',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    tableId: 'table-1',
    tableName: 'T1',
    status: OrderStatus.PROCESSING,
    totalAmount: 50000,
    idempotencyKey: 'idem-1',
    notes: null,
    confirmedAt: now,
    confirmedByUserId: 'staff-1',
    cancelledAt: null,
    cancelledByUserId: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Order;
}

function buildOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const now = new Date('2026-05-07T12:00:00.000Z');
  return {
    id: 'item-1',
    tenantId: 'tenant-1',
    orderId: 'order-1',
    menuItemId: 'menu-1',
    menuItemName: 'Pho',
    menuItemImageUrl: null,
    quantity: 1,
    unitPrice: 50000,
    note: null,
    status: OrderItemStatus.PROCESSING,
    station: 'KITCHEN',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as OrderItem;
}
