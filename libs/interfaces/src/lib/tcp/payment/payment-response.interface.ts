import type { PaymentMethod, PaymentStatusValue, RefundStatusValue } from '@einvoice/types';

export type PaymentTcpResponse = {
  id: string;
  tenantId: string;
  billId: string;
  billReference: string;
  method: PaymentMethod | null;
  status: PaymentStatusValue;
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
  bankAccount: string;
  bankName: string;
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
  status: RefundStatusValue;
  requestedByUserId: string;
  requestedAt: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
};

export type PaymentHistoryTcpResponse = PaymentTcpResponse[];
