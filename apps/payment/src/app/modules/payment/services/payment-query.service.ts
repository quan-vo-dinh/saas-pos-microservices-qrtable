import type {
  PaymentByIdTcpRequest,
  PaymentHistoryTcpRequest,
  PaymentHistoryTcpResponse,
  PaymentTcpResponse,
} from '@common/interfaces/tcp/payment';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMapper } from './payment.mapper';

@Injectable()
export class PaymentQueryService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly mapper: PaymentMapper,
  ) {}

  async getHistory(dto: PaymentHistoryTcpRequest): Promise<PaymentHistoryTcpResponse> {
    const rows = await this.paymentRepo.findByTenantOrdered(dto.tenantId, {
      billId: dto.billId,
      status: dto.status,
      limit: dto.limit,
      offset: dto.offset,
    });
    return rows.map((payment) => this.mapper.toPaymentResponse(payment));
  }

  async getStatus(dto: PaymentByIdTcpRequest): Promise<PaymentTcpResponse> {
    const payment = await this.paymentRepo.findByTenantAndId(dto.tenantId, dto.paymentId);
    if (!payment) {
      throw new BusinessException(ErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return this.mapper.toPaymentResponse(payment);
  }
}
