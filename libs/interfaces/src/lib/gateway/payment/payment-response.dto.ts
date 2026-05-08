export class PaymentResponseDto {
  id!: string;
  tenantId!: string;
  billId!: string;
  billReference!: string;
  method!: string | null;
  status!: string;
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
}

export class RefundResponseDto {
  id!: string;
  tenantId!: string;
  paymentId!: string;
  amount!: number;
  reason!: string;
  status!: string;
  requestedByUserId!: string;
  requestedAt!: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
}
