import {
  OrderStatus,
  OrderItemStatus,
  BillStatus,
  SessionStatus,
  ServiceRequestType,
  ServiceRequestStatus,
  PaymentMethod,
} from '../../index';
import type { CartUpdatedEvent, OrderConfirmedEvent } from '../realtime-events.types';

describe('Enum completeness — canonical values per Step 2.3 spec', () => {
  it('OrderStatus has exactly 7 values per phase doc §8', () => {
    expect(Object.values(OrderStatus).sort()).toEqual(
      ['CANCELED', 'COMPLETED', 'DRAFT', 'PENDING', 'PROCESSING', 'READY', 'SERVED'].sort(),
    );
  });

  it('OrderItemStatus has exactly 4 values (kitchen subset, no DRAFT/PENDING/COMPLETED)', () => {
    expect(Object.values(OrderItemStatus).sort()).toEqual(['CANCELED', 'PROCESSING', 'READY', 'SERVED'].sort());
  });

  it('BillStatus has exactly 3 values (Phase 2A scope, PAID forward-compat)', () => {
    expect(Object.values(BillStatus).sort()).toEqual(['OPEN', 'PAID', 'PENDING_PAYMENT'].sort());
  });

  it('SessionStatus has exactly 2 values (IDLE is internal Redis TTL, not exposed)', () => {
    expect(Object.values(SessionStatus).sort()).toEqual(['ACTIVE', 'CLOSED'].sort());
  });

  it('ServiceRequestType has exactly 3 values per phase doc', () => {
    expect(Object.values(ServiceRequestType).sort()).toEqual(['CALL_STAFF', 'GENERAL_HELP', 'REQUEST_BILL'].sort());
  });

  it('ServiceRequestStatus has exactly 3 values per phase doc §8', () => {
    expect(Object.values(ServiceRequestStatus).sort()).toEqual(['ACKNOWLEDGED', 'PENDING', 'RESOLVED'].sort());
  });

  it('PaymentMethod has exactly 1 value (Phase 2A — CASH only; Phase 3 mở rộng)', () => {
    expect(Object.values(PaymentMethod).sort()).toEqual(['CASH']);
  });

  it('All enum values are UPPERCASE strings (no lowercase, no kebab-case)', () => {
    const allEnums = [
      OrderStatus,
      OrderItemStatus,
      BillStatus,
      SessionStatus,
      ServiceRequestType,
      ServiceRequestStatus,
      PaymentMethod,
    ];
    allEnums.forEach((enumObj) => {
      Object.values(enumObj).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value).toBe(String(value).toUpperCase());
      });
    });
  });

  it('All enum keys === values (no accidental key/value mismatch)', () => {
    const allEnums = [
      OrderStatus,
      OrderItemStatus,
      BillStatus,
      SessionStatus,
      ServiceRequestType,
      ServiceRequestStatus,
      PaymentMethod,
    ];
    allEnums.forEach((enumObj) => {
      Object.entries(enumObj).forEach(([key, value]) => {
        expect(key).toBe(value);
      });
    });
  });
});

describe('Step 2.4 realtime contract compile checks', () => {
  it('accepts cart.updated payload with cart line ids', () => {
    const event: CartUpdatedEvent = {
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      cartVersion: 2,
      status: 'ACTIVE',
      updatedAt: '2026-04-28T00:00:00.000Z',
      items: [
        {
          cartLineId: 'line-1',
          menuItemId: 'item-1',
          menuItemName: 'Pho bo',
          quantity: 1,
          unitPrice: 65000,
          lineVersion: 1,
        },
      ],
    };

    expect(event.items[0].cartLineId).toBe('line-1');
  });

  it('accepts canonical order.confirmed event metadata', () => {
    const event: OrderConfirmedEvent = {
      eventId: 'event-1',
      eventType: 'order.confirmed',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      orderId: 'order-1',
      sessionId: 'sess-1',
      tableId: 'table-1',
      tableName: 'Ban 01',
      items: [],
      totalAmount: 0,
      confirmedAt: '2026-04-28T00:00:00.000Z',
      confirmedByUserId: 'user-1',
      occurredAt: '2026-04-28T00:00:00.000Z',
      correlationId: 'process-1',
    };

    expect(event.eventType).toBe('order.confirmed');
  });
});
