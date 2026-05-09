import type { PaymentMethod } from './bill.types';

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RefundStatus = {
  PENDING_STAFF_ACTION: 'PENDING_STAFF_ACTION',
  CONFIRMED: 'CONFIRMED',
  CANCELED: 'CANCELED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const PaymentAuditAction = {
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  CASH_CONFIRMED: 'CASH_CONFIRMED',
  SEPAY_WEBHOOK_RECEIVED: 'SEPAY_WEBHOOK_RECEIVED',
  SEPAY_WEBHOOK_DUPLICATE: 'SEPAY_WEBHOOK_DUPLICATE',
  SEPAY_WEBHOOK_UNDERPAID: 'SEPAY_WEBHOOK_UNDERPAID',
  SEPAY_WEBHOOK_AFTER_PAID: 'SEPAY_WEBHOOK_AFTER_PAID',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_CONFIRMED: 'REFUND_CONFIRMED',
  REFUND_CANCELED: 'REFUND_CANCELED',
} as const;
export type PaymentAuditAction = (typeof PaymentAuditAction)[keyof typeof PaymentAuditAction];

export const PaymentActorType = {
  USER: 'USER',
  SEPAY: 'SEPAY',
  SYSTEM: 'SYSTEM',
} as const;
export type PaymentActorType = (typeof PaymentActorType)[keyof typeof PaymentActorType];

export type PaymentCompletedEvent = {
  eventId: string;
  eventType: 'payment.completed';
  tenantId: string;
  billId: string;
  paymentId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  correlationId?: string;
};

export type PaymentRefundedEvent = {
  eventId: string;
  eventType: 'payment.refunded';
  tenantId: string;
  billId: string;
  paymentId: string;
  refundId: string;
  amount: number;
  confirmedByUserId: string | null;
  confirmedAt: string;
  correlationId?: string;
};
