import type { PaymentMethod } from '@einvoice/types';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUND_PENDING' | 'REFUNDED' | 'FAILED';
export type RefundStatus = 'PENDING_STAFF_ACTION' | 'CONFIRMED' | 'CANCELED';

export type PaymentTcpResponse = {
  id: string;
  tenantId: string;
  billId: string;
  billReference: string;
  method: PaymentMethod | null;
  status: PaymentStatus;
  rawTotal: number;
  roundedTotal: number;
  roundingDelta: number;
  paidAmount?: number;
  amountReceived?: number;
  changeAmount?: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateVietQrTcpResponse = PaymentTcpResponse & {
  qrUrl: string;
};

export type SepayWebhookTcpResponse = {
  status: 'success';
};

export type RefundTcpResponse = {
  id: string;
  tenantId: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedByUserId: string;
  requestedAt: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
};

export type PaymentHistoryTcpResponse = PaymentTcpResponse[];
