import type { PaymentTcpResponse } from '@common/interfaces/tcp/payment';
import { Injectable } from '@nestjs/common';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class PaymentMapper {
  toPaymentResponse(payment: PaymentEntity): PaymentTcpResponse {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      billId: payment.billId,
      billReference: payment.billReference,
      method: payment.method,
      status: payment.status,
      rawTotal: payment.rawTotal,
      roundedTotal: payment.roundedTotal,
      roundingDelta: payment.roundingDelta,
      paidAmount: payment.paidAmount ?? undefined,
      amountReceived: payment.amountReceived ?? undefined,
      changeAmount: payment.changeAmount ?? undefined,
      paidAt: payment.paidAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
