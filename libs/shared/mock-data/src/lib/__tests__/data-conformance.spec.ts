// Import mock data directly từ individual files (avoid barrel import to bypass
// pre-existing categories.ts compile errors out-of-scope cho Step 2.3).
import { orders } from '../orders';
import { sessions } from '../sessions';
import { bills } from '../bills';
import { carts } from '../carts';
import { serviceRequests } from '../service-requests';
import {
  OrderStatus,
  OrderItemStatus,
  BillStatus,
  SessionStatus,
  ServiceRequestStatus,
  ServiceRequestType,
} from '@einvoice/types';

describe('Mock data conforms to type contracts', () => {
  describe('orders mock data', () => {
    it('every order has valid OrderStatus value', () => {
      orders.forEach((order) => {
        expect(Object.values(OrderStatus)).toContain(order.status);
      });
    });

    it('every order has non-empty tenantId and idempotencyKey', () => {
      orders.forEach((order) => {
        expect(order.tenantId).toBeTruthy();
        expect(order.idempotencyKey).toBeTruthy();
        expect(order.idempotencyKey.length).toBeGreaterThan(10);
      });
    });

    it('every order item has valid OrderItemStatus', () => {
      orders.forEach((order) => {
        order.items.forEach((item) => {
          expect(Object.values(OrderItemStatus)).toContain(item.status);
        });
      });
    });

    it('every order item orderId matches parent order id', () => {
      orders.forEach((order) => {
        order.items.forEach((item) => {
          expect(item.orderId).toBe(order.id);
        });
      });
    });

    it('totalAmount = sum(items.unitPrice * quantity) for every order', () => {
      orders.forEach((order) => {
        const calculated = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        expect(order.totalAmount).toBe(calculated);
      });
    });

    it('confirmed orders have confirmedAt + confirmedByUserId set', () => {
      orders
        .filter((o) => o.status !== OrderStatus.DRAFT && o.status !== OrderStatus.PENDING)
        .forEach((order) => {
          expect(order.confirmedAt).toBeTruthy();
          expect(order.confirmedByUserId).toBeTruthy();
        });
    });
  });

  describe('sessions mock data', () => {
    it('every session has valid SessionStatus', () => {
      sessions.forEach((session) => {
        expect(Object.values(SessionStatus)).toContain(session.status);
      });
    });

    it('every session has tenantId, id, tableId, tableName', () => {
      sessions.forEach((session) => {
        expect(session.tenantId).toBeTruthy();
        expect(session.id).toBeTruthy();
        expect(session.tableId).toBeTruthy();
        expect(session.tableName).toBeTruthy();
      });
    });

    it('orderCount matches actual orders for that session', () => {
      sessions.forEach((session) => {
        const actualCount = orders.filter((o) => o.sessionId === session.id).length;
        expect(session.orderCount).toBe(actualCount);
      });
    });

    it('CLOSED sessions have closedAt set', () => {
      sessions
        .filter((s) => s.status === SessionStatus.CLOSED)
        .forEach((session) => {
          expect(session.closedAt).toBeTruthy();
        });
    });
  });

  describe('bills mock data', () => {
    it('every bill references existing session', () => {
      const sessionIds = new Set(sessions.map((s) => s.id));
      bills.forEach((bill) => {
        expect(sessionIds.has(bill.sessionId)).toBe(true);
      });
    });

    it('every bill has valid BillStatus', () => {
      bills.forEach((bill) => {
        expect(Object.values(BillStatus)).toContain(bill.status);
      });
    });

    it('every bill orderId references existing order', () => {
      const orderIds = new Set(orders.map((o) => o.id));
      bills.forEach((bill) => {
        bill.orderIds.forEach((orderId) => {
          expect(orderIds.has(orderId)).toBe(true);
        });
      });
    });

    it('PAID bills have paidAt + paymentMethod set', () => {
      bills
        .filter((b) => b.status === BillStatus.PAID)
        .forEach((bill) => {
          expect(bill.paidAt).toBeTruthy();
          expect(bill.paymentMethod).toBeTruthy();
        });
    });

    it('total = subtotal + roundingAmount for every bill', () => {
      bills.forEach((bill) => {
        expect(bill.total).toBe(bill.subtotal + bill.roundingAmount);
      });
    });
  });

  describe('carts mock data', () => {
    it('every cart item has version >= 1', () => {
      carts.forEach((cart) => {
        cart.items.forEach((item) => {
          expect(item.version).toBeGreaterThanOrEqual(1);
        });
      });
    });

    it('every cart sessionId references existing session', () => {
      const sessionIds = new Set(sessions.map((s) => s.id));
      carts.forEach((cart) => {
        expect(sessionIds.has(cart.sessionId)).toBe(true);
      });
    });
  });

  describe('serviceRequests mock data', () => {
    it('every service request has valid type and status', () => {
      serviceRequests.forEach((req) => {
        expect(Object.values(ServiceRequestType)).toContain(req.type);
        expect(Object.values(ServiceRequestStatus)).toContain(req.status);
      });
    });

    it('ACKNOWLEDGED requests have acknowledgedAt + acknowledgedByUserId', () => {
      serviceRequests
        .filter((r) => r.status !== ServiceRequestStatus.PENDING)
        .forEach((req) => {
          expect(req.acknowledgedAt).toBeTruthy();
          expect(req.acknowledgedByUserId).toBeTruthy();
        });
    });

    it('RESOLVED requests have resolvedAt set', () => {
      serviceRequests
        .filter((r) => r.status === ServiceRequestStatus.RESOLVED)
        .forEach((req) => {
          expect(req.resolvedAt).toBeTruthy();
        });
    });
  });
});
