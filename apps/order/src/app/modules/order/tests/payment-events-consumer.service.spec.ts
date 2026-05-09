import type { BillService } from '../services/bill.service';
import {
  PaymentEventsConsumerService,
  parsePaymentCompletedEvent,
  paymentCompletedToMarkPaidRequest,
  safePaymentMethod,
} from '../services/payment-events-consumer.service';

describe('payment-events-consumer helpers', () => {
  describe('safePaymentMethod', () => {
    it('accepts CASH and VIETQR', () => {
      expect(safePaymentMethod('CASH')).toBe('CASH');
      expect(safePaymentMethod('VIETQR')).toBe('VIETQR');
    });
    it('rejects other values', () => {
      expect(safePaymentMethod('CARD')).toBeNull();
      expect(safePaymentMethod(null)).toBeNull();
    });
  });

  describe('parsePaymentCompletedEvent', () => {
    it('returns null for invalid JSON', () => {
      expect(parsePaymentCompletedEvent('not json')).toBeNull();
    });

    it('returns null when eventType is not payment.completed', () => {
      expect(
        parsePaymentCompletedEvent(
          JSON.stringify({
            eventId: 'e1',
            eventType: 'payment.refunded',
            tenantId: 't1',
            billId: 'b1',
            paymentId: 'p1',
            method: 'VIETQR',
            paidAt: '2026-01-01T00:00:00.000Z',
          }),
        ),
      ).toBeNull();
    });

    it('returns null when amount is missing or not a finite number', () => {
      expect(
        parsePaymentCompletedEvent(
          JSON.stringify({
            eventId: 'e1',
            eventType: 'payment.completed',
            tenantId: 't1',
            billId: 'b1',
            paymentId: 'p1',
            method: 'VIETQR',
            paidAt: '2026-01-01T00:00:00.000Z',
          }),
        ),
      ).toBeNull();
      expect(
        parsePaymentCompletedEvent(
          JSON.stringify({
            eventId: 'e1',
            eventType: 'payment.completed',
            tenantId: 't1',
            billId: 'b1',
            paymentId: 'p1',
            method: 'VIETQR',
            paidAt: '2026-01-01T00:00:00.000Z',
            amount: 'not-a-number',
          }),
        ),
      ).toBeNull();
    });

    it('returns null when method is not CASH or VIETQR', () => {
      expect(
        parsePaymentCompletedEvent(
          JSON.stringify({
            eventId: 'e1',
            eventType: 'payment.completed',
            tenantId: 't1',
            billId: 'b1',
            paymentId: 'p1',
            method: 'WIRE',
            paidAt: '2026-01-01T00:00:00.000Z',
            amount: 1000,
          }),
        ),
      ).toBeNull();
    });

    it('parses a valid payment.completed payload', () => {
      const raw = JSON.stringify({
        eventId: 'e1',
        eventType: 'payment.completed',
        tenantId: 't1',
        billId: 'b1',
        paymentId: 'p1',
        method: 'VIETQR',
        paidAt: '2026-01-01T00:00:00.000Z',
        amount: 128000,
        correlationId: 'corr-1',
      });
      const ev = parsePaymentCompletedEvent(raw);
      expect(ev).toEqual({
        eventId: 'e1',
        eventType: 'payment.completed',
        tenantId: 't1',
        billId: 'b1',
        paymentId: 'p1',
        amount: 128000,
        method: 'VIETQR',
        paidAt: '2026-01-01T00:00:00.000Z',
        correlationId: 'corr-1',
      });
    });
  });

  describe('paymentCompletedToMarkPaidRequest', () => {
    it('maps correlationId to processId', () => {
      const req = paymentCompletedToMarkPaidRequest({
        eventId: 'e1',
        eventType: 'payment.completed',
        tenantId: 't1',
        billId: 'b1',
        paymentId: 'p1',
        amount: 500,
        method: 'CASH',
        paidAt: '2026-01-01T00:00:00.000Z',
        correlationId: 'c1',
      });
      expect(req).toEqual({
        tenantId: 't1',
        billId: 'b1',
        paymentId: 'p1',
        method: 'CASH',
        paidAt: '2026-01-01T00:00:00.000Z',
        processId: 'c1',
      });
    });
  });

  describe('PaymentEventsConsumerService.dispatchPaymentCompletedPayload', () => {
    it('maps valid payment.completed JSON to BillService.markPaid (Kafka → Order finalization)', async () => {
      const billService = { markPaid: jest.fn().mockResolvedValue(undefined) };
      const svc = new PaymentEventsConsumerService(billService as unknown as BillService);
      const raw = JSON.stringify({
        eventId: 'e1',
        eventType: 'payment.completed',
        tenantId: 't1',
        billId: 'b1',
        paymentId: 'p1',
        method: 'VIETQR',
        paidAt: '2026-05-08T12:00:00.000Z',
        amount: 128_000,
        correlationId: 'corr-1',
      });

      await expect(svc.dispatchPaymentCompletedPayload(raw)).resolves.toBe(true);

      expect(billService.markPaid).toHaveBeenCalledWith({
        tenantId: 't1',
        billId: 'b1',
        paymentId: 'p1',
        method: 'VIETQR',
        paidAt: '2026-05-08T12:00:00.000Z',
        processId: 'corr-1',
      });
    });

    it('returns false and does not call markPaid for invalid payload', async () => {
      const billService = { markPaid: jest.fn() };
      const svc = new PaymentEventsConsumerService(billService as unknown as BillService);

      await expect(svc.dispatchPaymentCompletedPayload('not json')).resolves.toBe(false);
      expect(billService.markPaid).not.toHaveBeenCalled();
    });
  });
});
