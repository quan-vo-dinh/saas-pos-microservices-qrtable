import type {
  ConfirmCashTcpRequest,
  CreateVietQrTcpRequest,
  CreateVietQrTcpResponse,
  PaymentTcpResponse,
} from '@common/interfaces/tcp/payment';
import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { BillStatus, PaymentMethod } from '@einvoice/types';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { CONFIGURATION } from '../../../../configuration';
import { PaymentEntity } from '../entities/payment.entity';
import { AuditPaymentRepository } from '../repositories/audit-payment.repository';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMapper } from './payment.mapper';
import { PaymentOrderGateway } from './payment-order.gateway';
import { PaymentReferenceService } from './payment-reference.service';

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const q = error as QueryFailedError & { code?: string; driverError?: { code?: string } };
  return q.code === '23505' || q.driverError?.code === '23505';
}

type PaymentPersistResult = {
  payment: PaymentEntity;
  created: boolean;
};

@Injectable()
export class PaymentSettlementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderGateway: PaymentOrderGateway,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditRepo: AuditPaymentRepository,
    private readonly outboxRepo: PaymentOutboxRepository,
    private readonly reference: PaymentReferenceService,
    private readonly mapper: PaymentMapper,
  ) {}

  async createVietQr(dto: CreateVietQrTcpRequest): Promise<CreateVietQrTcpResponse> {
    const snapshot = await this.orderGateway.getBillPaymentSnapshot(dto.tenantId, dto.billId, dto.processId);
    if (snapshot.status !== BillStatus.PENDING_PAYMENT) {
      throw new ConflictException('Bill is not pending payment');
    }

    const existing = await this.paymentRepo.findByTenantAndBill(dto.tenantId, dto.billId);
    if (existing) {
      if (existing.status === 'PENDING') {
        return { ...this.mapper.toPaymentResponse(existing), qrUrl: this.buildQrUrl(existing) };
      }
      throw new ConflictException('Bill already paid');
    }

    const payment = this.paymentRepo.create({
      tenantId: dto.tenantId,
      billId: dto.billId,
      billReference: this.reference.createBillReference(dto.billId),
      method: null,
      status: 'PENDING',
      rawTotal: snapshot.rawTotal,
      roundedTotal: snapshot.roundedTotal,
      roundingDelta: snapshot.roundingDelta,
    });

    const persisted = await this.persistNewPaymentWithFallbackReference(payment);
    if (persisted.created) {
      await this.auditRepo.createPaymentAudit(persisted.payment, 'PAYMENT_CREATED', 'USER', dto.userId, null, null);
    }
    return { ...this.mapper.toPaymentResponse(persisted.payment), qrUrl: this.buildQrUrl(persisted.payment) };
  }

  async confirmCash(dto: ConfirmCashTcpRequest): Promise<PaymentTcpResponse> {
    const snapshot = await this.orderGateway.getBillPaymentSnapshot(dto.tenantId, dto.billId, dto.processId);
    if (snapshot.status !== BillStatus.PENDING_PAYMENT) {
      throw new ConflictException('Bill is not pending payment');
    }

    let billPaidMarker:
      | {
          tenantId: string;
          billId: string;
          paymentId: string;
          paidAt: Date;
        }
      | undefined;

    await this.dataSource.transaction(async (manager) => {
      let payment = await this.paymentRepo.findByTenantBillForUpdate(manager, dto.tenantId, dto.billId);

      if (!payment) {
        payment = this.paymentRepo.create({
          tenantId: dto.tenantId,
          billId: dto.billId,
          billReference: this.reference.createBillReference(dto.billId),
          method: null,
          status: 'PENDING',
          rawTotal: snapshot.rawTotal,
          roundedTotal: snapshot.roundedTotal,
          roundingDelta: snapshot.roundingDelta,
        });
        payment = await this.persistNewPayment(manager, payment);
      }

      if (payment.status !== 'PENDING') {
        throw new ConflictException('Bill already paid');
      }

      if (dto.amountReceived < payment.roundedTotal) {
        throw new BadRequestException('Insufficient amount received');
      }

      const paidAt = new Date();
      payment.method = PaymentMethod.CASH;
      payment.status = 'PAID';
      payment.paidAmount = payment.roundedTotal;
      payment.amountReceived = dto.amountReceived;
      payment.changeAmount = dto.amountReceived - payment.roundedTotal;
      payment.paidAt = paidAt;

      await manager.save(PaymentEntity, payment);
      await this.auditRepo.createPaymentAudit(payment, 'CASH_CONFIRMED', 'USER', dto.userId, null, null, manager);
      await this.auditRepo.createPaymentAudit(
        payment,
        'PAYMENT_COMPLETED',
        'USER',
        dto.userId,
        null,
        { method: 'CASH' },
        manager,
      );
      await this.outboxRepo.createCompleted(manager, payment, dto.processId);

      billPaidMarker = {
        tenantId: payment.tenantId,
        billId: payment.billId,
        paymentId: payment.id,
        paidAt,
      };
    });

    if (billPaidMarker) {
      await this.orderGateway.markBillPaid({
        tenantId: billPaidMarker.tenantId,
        billId: billPaidMarker.billId,
        paymentId: billPaidMarker.paymentId,
        method: 'CASH',
        paidAt: billPaidMarker.paidAt.toISOString(),
        processId: dto.processId,
      });
    }

    const fresh = await this.paymentRepo.findByTenantAndBill(dto.tenantId, dto.billId);
    if (!fresh) {
      throw new ConflictException('Payment state is inconsistent');
    }
    return this.mapper.toPaymentResponse(fresh);
  }

  private buildQrUrl(payment: PaymentEntity): string {
    const qrConfig = this.getSepayQrConfig();
    return this.reference.buildQrUrl({
      account: qrConfig.account,
      bank: qrConfig.bank,
      amount: payment.roundedTotal,
      description: payment.billReference,
    });
  }

  private getSepayQrConfig(): { account: string; bank: string } {
    const { QR_ACCOUNT, QR_BANK } = CONFIGURATION.SEPAY_CONFIG;
    if (!QR_ACCOUNT || !QR_BANK) {
      throw new ServiceUnavailableException('SePay QR account and bank are not configured');
    }
    return { account: QR_ACCOUNT, bank: QR_BANK };
  }

  private async persistNewPaymentWithFallbackReference(payment: PaymentEntity): Promise<PaymentPersistResult> {
    try {
      return { payment: await this.paymentRepo.save(payment), created: true };
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        const existing = await this.paymentRepo.findByTenantAndBill(payment.tenantId, payment.billId);
        if (existing) {
          return { payment: existing, created: false };
        }
        payment.billReference = this.reference.createCollisionFallbackReference(payment.billId);
        return { payment: await this.paymentRepo.save(payment), created: true };
      }
      throw e;
    }
  }

  private async persistNewPayment(manager: EntityManager, payment: PaymentEntity): Promise<PaymentEntity> {
    try {
      return await manager.save(PaymentEntity, payment);
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        const existing = await this.paymentRepo.findByTenantBillForUpdate(manager, payment.tenantId, payment.billId);
        if (existing) {
          return existing;
        }
        payment.billReference = this.reference.createCollisionFallbackReference(payment.billId);
        return await manager.save(PaymentEntity, payment);
      }
      throw e;
    }
  }
}
