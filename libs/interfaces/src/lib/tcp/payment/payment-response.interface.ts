import type { PaymentMethod, PaymentStatusValue } from '@einvoice/types';

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

export type PaymentHistoryTcpResponse = PaymentTcpResponse[];
