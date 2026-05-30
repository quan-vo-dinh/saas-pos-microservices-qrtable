import { PaymentEntity } from '../entities/payment.entity';

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
