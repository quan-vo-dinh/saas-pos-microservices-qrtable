import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  RefundConfirmTcpRequest,
  RefundRequestTcpRequest,
  RefundTcpResponse,
} from '@common/interfaces/tcp/payment';
import { PaymentEntity } from '../entities/payment.entity';
import { RefundEntity } from '../entities/refund.entity';
import { AuditPaymentRepository } from '../repositories/audit-payment.repository';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';

@Injectable()
export class RefundService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly paymentRepo: PaymentRepository,
    private readonly refundRepo: RefundRepository,
    private readonly auditRepo: AuditPaymentRepository,
    private readonly outboxRepo: PaymentOutboxRepository,
  ) {}

  async requestRefund(dto: RefundRequestTcpRequest): Promise<RefundTcpResponse> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.paymentRepo.findByTenantAndIdForUpdate(manager, dto.tenantId, dto.paymentId);
      if (!payment || payment.status !== 'PAID') {
        throw new ConflictException('Payment is not paid');
      }

      const blocking = await this.refundRepo.findBlockingRefundForPayment(manager, payment.id);
      if (blocking) {
        throw new ConflictException('Refund already exists for this payment');
      }

      payment.status = 'REFUND_PENDING';
      await manager.save(PaymentEntity, payment);

      const refund = manager.create(RefundEntity, {
        tenantId: dto.tenantId,
        paymentId: dto.paymentId,
        amount: payment.paidAmount ?? payment.roundedTotal,
        reason: dto.reason,
        customerBankAccount: dto.customerBankAccount ?? null,
        customerBankName: dto.customerBankName ?? null,
        customerAccountName: dto.customerAccountName ?? null,
        requestedByUserId: dto.userId,
        status: 'PENDING_STAFF_ACTION',
      });
      const saved = await manager.save(RefundEntity, refund);
      await this.auditRepo.createRefundAudit(saved, payment, 'REFUND_REQUESTED', dto.userId, dto.reason, manager);
      return this.toRefundResponse(saved);
    });
  }

  async confirmRefund(dto: RefundConfirmTcpRequest): Promise<RefundTcpResponse> {
    return this.dataSource.transaction(async (manager) => {
      const refund = await this.refundRepo.findByTenantAndIdForUpdate(manager, dto.tenantId, dto.refundId);
      if (!refund || refund.status !== 'PENDING_STAFF_ACTION') {
        throw new ConflictException('Refund is not pending staff action');
      }

      const payment = await this.paymentRepo.findByTenantAndIdForUpdate(manager, dto.tenantId, refund.paymentId);
      if (!payment || payment.status !== 'REFUND_PENDING') {
        throw new ConflictException('Payment is not waiting for refund confirmation');
      }

      refund.status = 'CONFIRMED';
      refund.confirmedByUserId = dto.userId;
      refund.confirmedAt = new Date();
      payment.status = 'REFUNDED';

      await manager.save(RefundEntity, refund);
      await manager.save(PaymentEntity, payment);
      await this.auditRepo.createRefundAudit(refund, payment, 'REFUND_CONFIRMED', dto.userId, null, manager);
      await this.outboxRepo.createRefunded(manager, payment, refund, dto.processId);
      return this.toRefundResponse(refund);
    });
  }

  private toRefundResponse(r: RefundEntity): RefundTcpResponse {
    return {
      id: r.id,
      tenantId: r.tenantId,
      paymentId: r.paymentId,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      requestedByUserId: r.requestedByUserId,
      requestedAt: r.requestedAt.toISOString(),
      confirmedByUserId: r.confirmedByUserId ?? undefined,
      confirmedAt: r.confirmedAt?.toISOString(),
    };
  }
}
