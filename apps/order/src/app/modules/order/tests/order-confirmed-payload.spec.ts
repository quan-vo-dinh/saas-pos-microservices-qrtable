import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OrderItemStatus } from '@einvoice/types';
import { buildOrderConfirmedKafkaPayload } from '../order-confirmed-payload';

describe('buildOrderConfirmedKafkaPayload', () => {
  it('builds canonical order.confirmed payload', () => {
    const confirmedAt = new Date('2026-04-30T12:00:00.000Z');
    const order = {
      id: 'order-1',
      tenantId: 'tenant-1',
      tableId: 'table-1',
      tableName: 'A1',
      sessionId: 'session-1',
      totalAmount: 50000,
    } as Order;
    const items = [
      {
        id: 'line-1',
        orderId: 'order-1',
        menuItemId: 'mi-1',
        menuItemName: 'Phở',
        quantity: 1,
        unitPrice: 50000,
        note: null,
        status: OrderItemStatus.PROCESSING,
        station: 'KITCHEN',
        createdAt: confirmedAt,
        updatedAt: confirmedAt,
      } as OrderItem,
    ];
    const payload = buildOrderConfirmedKafkaPayload({
      tenantId: 'tenant-1',
      order,
      items,
      confirmedAt,
      confirmedByUserId: 'staff-1',
      correlationId: 'corr-1',
    });
    expect(payload.eventType).toBe('order.confirmed');
    expect(payload.schemaVersion).toBe(1);
    expect(payload.tenantId).toBe('tenant-1');
    expect(payload.orderId).toBe('order-1');
    expect(payload.confirmedByUserId).toBe('staff-1');
    expect(payload.correlationId).toBe('corr-1');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].menuItemName).toBe('Phở');
  });
});
