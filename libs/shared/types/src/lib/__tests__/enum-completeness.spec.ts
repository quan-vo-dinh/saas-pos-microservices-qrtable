import {
  OrderStatus,
  OrderItemStatus,
  BillStatus,
  SessionStatus,
  ServiceRequestType,
  ServiceRequestStatus,
  PaymentMethod,
  KdsTicketItemStatus,
  KdsTicketStatus,
  PaymentActorType,
  PaymentAuditAction,
  PaymentStatus,
  RefundStatus,
} from '../../index';
import type { KdsQueueChangedEvent, KitchenSlaWarningEvent } from '../../index';
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

  it('PaymentMethod has exactly 2 values for Phase 3', () => {
    expect(Object.values(PaymentMethod).sort()).toEqual(['CASH', 'VIETQR'].sort());
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
      KdsTicketStatus,
      KdsTicketItemStatus,
      PaymentStatus,
      RefundStatus,
      PaymentAuditAction,
      PaymentActorType,
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
      KdsTicketStatus,
      KdsTicketItemStatus,
      PaymentStatus,
      RefundStatus,
      PaymentAuditAction,
      PaymentActorType,
    ];
    allEnums.forEach((enumObj) => {
      Object.entries(enumObj).forEach(([key, value]) => {
        expect(key).toBe(value);
      });
    });
  });
});

describe('Phase 3 payment contracts', () => {
  it('PaymentStatus has exactly the Phase 3 values', () => {
    expect(Object.values(PaymentStatus).sort()).toEqual(
      ['FAILED', 'PAID', 'PENDING', 'REFUNDED', 'REFUND_PENDING'].sort(),
    );
  });

  it('RefundStatus has exactly the Phase 3 values', () => {
    expect(Object.values(RefundStatus).sort()).toEqual(['CANCELED', 'CONFIRMED', 'PENDING_STAFF_ACTION'].sort());
  });

  it('Payment audit contracts have exactly the Phase 3 values', () => {
    expect(Object.values(PaymentAuditAction).sort()).toEqual(
      [
        'CASH_CONFIRMED',
        'PAYMENT_COMPLETED',
        'PAYMENT_CREATED',
        'REFUND_CANCELED',
        'REFUND_CONFIRMED',
        'REFUND_REQUESTED',
        'SEPAY_WEBHOOK_AFTER_PAID',
        'SEPAY_WEBHOOK_DUPLICATE',
        'SEPAY_WEBHOOK_RECEIVED',
        'SEPAY_WEBHOOK_UNDERPAID',
      ].sort(),
    );
    expect(Object.values(PaymentActorType).sort()).toEqual(['SEPAY', 'SYSTEM', 'USER'].sort());
  });
});

describe('Step 2.6 KDS contract compile checks', () => {
  it('KdsTicketStatus has exactly the Redis-only ticket lifecycle values', () => {
    expect(Object.values(KdsTicketStatus).sort()).toEqual(
      ['ARCHIVED', 'PENDING', 'PROCESSING', 'READY', 'VOIDED'].sort(),
    );
  });

  it('KdsTicketItemStatus has exactly the item prep lifecycle values', () => {
    expect(Object.values(KdsTicketItemStatus).sort()).toEqual(['CANCELED', 'PENDING', 'PROCESSING', 'READY'].sort());
  });

  it('accepts canonical kds.queue_changed event metadata', () => {
    const event: KdsQueueChangedEvent = {
      eventId: 'event-1',
      eventType: 'kds.queue_changed',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      station: 'KITCHEN',
      revision: 2,
      reason: 'TICKET_CREATED',
      occurredAt: '2026-05-07T00:00:00.000Z',
    };

    expect(event.eventType).toBe('kds.queue_changed');
  });

  it('accepts canonical kitchen.sla_warning event metadata', () => {
    const event: KitchenSlaWarningEvent = {
      eventId: 'event-1',
      eventType: 'kitchen.sla_warning',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      ticketId: 'ticket-1',
      orderId: 'order-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      tableName: 'Ban 01',
      station: 'BAR',
      level: 'WARNING',
      waitTimeSeconds: 901,
      thresholdSeconds: 900,
      occurredAt: '2026-05-07T00:00:00.000Z',
    };

    expect(event.eventType).toBe('kitchen.sla_warning');
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
