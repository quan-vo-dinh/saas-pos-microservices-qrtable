import type { PaymentMethod, PaymentStatusValue } from '@einvoice/types';

export class PaymentResponseDto {
  id!: string;
  tenantId!: string;
  billId!: string;
  billReference!: string;
  method!: PaymentMethod | null;
  status!: PaymentStatusValue;
  rawTotal!: number;
  roundedTotal!: number;
  roundingDelta!: number;
  paidAmount?: number;
  amountReceived?: number;
  changeAmount?: number;
  paidAt?: string;
  createdAt!: string;
  updatedAt!: string;
}

export class CreateVietQrResponseDto extends PaymentResponseDto {
  qrUrl!: string;
  bankAccount!: string;
  bankName!: string;
}
