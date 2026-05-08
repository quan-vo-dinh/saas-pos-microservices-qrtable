import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';

export function buildPaymentCompletedPayload(
  payment: PaymentEntity,
  eventId: string,
  correlationId?: string,
): Record<string, unknown> {
  return {
    eventId,
    eventType: 'payment.completed',
    tenantId: payment.tenantId,
    billId: payment.billId,
    paymentId: payment.id,
    method: payment.method,
    amount: payment.paidAmount ?? payment.roundedTotal,
    paidAt: (payment.paidAt ?? new Date()).toISOString(),
    correlationId,
  };
}

export function buildPaymentRefundedPayload(
  payment: PaymentEntity,
  refund: RefundEntity,
  eventId: string,
  correlationId?: string,
): Record<string, unknown> {
  return {
    eventId,
    eventType: 'payment.refunded',
    tenantId: payment.tenantId,
    billId: payment.billId,
    paymentId: payment.id,
    refundId: refund.id,
    amount: refund.amount,
    confirmedByUserId: refund.confirmedByUserId,
    confirmedAt: (refund.confirmedAt ?? new Date()).toISOString(),
    correlationId,
  };
}
