import {
  ALLOWED_ORDER_TRANSITIONS,
  ALLOWED_BILL_TRANSITIONS,
  ALLOWED_SERVICE_REQUEST_TRANSITIONS,
  OrderStatus,
  BillStatus,
  ServiceRequestStatus,
} from '../../index';

describe('State transition matrices — Phase 2A spec §8', () => {
  describe('ALLOWED_ORDER_TRANSITIONS', () => {
    it('every OrderStatus appears as key', () => {
      Object.values(OrderStatus).forEach((status) => {
        expect(ALLOWED_ORDER_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('every transition target is a valid OrderStatus', () => {
      Object.values(ALLOWED_ORDER_TRANSITIONS).forEach((targets) => {
        targets.forEach((target) => {
          expect(Object.values(OrderStatus)).toContain(target);
        });
      });
    });

    it('terminal states (COMPLETED, CANCELED) have no outgoing transitions', () => {
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.COMPLETED]).toEqual([]);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.CANCELED]).toEqual([]);
    });

    it('canonical happy path: DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED', () => {
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.DRAFT]).toContain(OrderStatus.PENDING);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PENDING]).toContain(OrderStatus.PROCESSING);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PROCESSING]).toContain(OrderStatus.READY);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.READY]).toContain(OrderStatus.SERVED);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.SERVED]).toContain(OrderStatus.COMPLETED);
    });

    it('CANCELED reachable từ DRAFT, PENDING, PROCESSING (per phase doc §8)', () => {
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.DRAFT]).toContain(OrderStatus.CANCELED);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PENDING]).toContain(OrderStatus.CANCELED);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PROCESSING]).toContain(OrderStatus.CANCELED);
    });

    it('CANNOT cancel after READY (business rule: order đã ra món, không revert)', () => {
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.READY]).not.toContain(OrderStatus.CANCELED);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.SERVED]).not.toContain(OrderStatus.CANCELED);
    });

    it('CANNOT skip states (vd: PENDING không thể nhảy thẳng READY)', () => {
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PENDING]).not.toContain(OrderStatus.READY);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PENDING]).not.toContain(OrderStatus.SERVED);
      expect(ALLOWED_ORDER_TRANSITIONS[OrderStatus.PENDING]).not.toContain(OrderStatus.COMPLETED);
    });
  });

  describe('ALLOWED_BILL_TRANSITIONS', () => {
    it('every BillStatus appears as key', () => {
      Object.values(BillStatus).forEach((status) => {
        expect(ALLOWED_BILL_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('OPEN → PENDING_PAYMENT → PAID', () => {
      expect(ALLOWED_BILL_TRANSITIONS[BillStatus.OPEN]).toContain(BillStatus.PENDING_PAYMENT);
      expect(ALLOWED_BILL_TRANSITIONS[BillStatus.PENDING_PAYMENT]).toContain(BillStatus.PAID);
    });

    it('PENDING_PAYMENT → OPEN allowed (revert request_bill nếu customer order thêm)', () => {
      expect(ALLOWED_BILL_TRANSITIONS[BillStatus.PENDING_PAYMENT]).toContain(BillStatus.OPEN);
    });

    it('PAID is terminal', () => {
      expect(ALLOWED_BILL_TRANSITIONS[BillStatus.PAID]).toEqual([]);
    });

    it('OPEN cannot skip directly to PAID (must go via PENDING_PAYMENT)', () => {
      expect(ALLOWED_BILL_TRANSITIONS[BillStatus.OPEN]).not.toContain(BillStatus.PAID);
    });
  });

  describe('ALLOWED_SERVICE_REQUEST_TRANSITIONS', () => {
    it('every ServiceRequestStatus appears as key', () => {
      Object.values(ServiceRequestStatus).forEach((status) => {
        expect(ALLOWED_SERVICE_REQUEST_TRANSITIONS).toHaveProperty(status);
      });
    });

    it('PENDING → ACKNOWLEDGED → RESOLVED (per phase doc §8)', () => {
      expect(ALLOWED_SERVICE_REQUEST_TRANSITIONS[ServiceRequestStatus.PENDING]).toEqual([
        ServiceRequestStatus.ACKNOWLEDGED,
      ]);
      expect(ALLOWED_SERVICE_REQUEST_TRANSITIONS[ServiceRequestStatus.ACKNOWLEDGED]).toEqual([
        ServiceRequestStatus.RESOLVED,
      ]);
      expect(ALLOWED_SERVICE_REQUEST_TRANSITIONS[ServiceRequestStatus.RESOLVED]).toEqual([]);
    });

    it('PENDING cannot skip directly to RESOLVED (must acknowledge first)', () => {
      expect(ALLOWED_SERVICE_REQUEST_TRANSITIONS[ServiceRequestStatus.PENDING]).not.toContain(
        ServiceRequestStatus.RESOLVED,
      );
    });
  });
});
