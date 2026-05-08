import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { RequestType } from '@common/interfaces/tcp/common/request.interface';
import type {
  ConfirmCashTcpRequest,
  CreateVietQrTcpRequest,
  HandleSepayWebhookTcpRequest,
  PaymentHistoryTcpRequest,
  PaymentStatusTcpRequest,
} from '@common/interfaces/tcp/payment';
import type {
  CreateVietQrTcpResponse,
  PaymentHistoryTcpResponse,
  PaymentTcpResponse,
  SepayWebhookTcpResponse,
} from '@common/interfaces/tcp/payment';
import type {
  BillMarkPaidTcpRequest,
  BillPaymentSnapshotTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillMarkedPaidTcpResponse,
  BillPaymentSnapshotTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BillStatus, PaymentMethod } from '@einvoice/types';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { firstValueFrom, map } from 'rxjs';
import { PaymentEntity } from '../entities/payment.entity';
import { AuditPaymentRepository } from '../repositories/audit-payment.repository';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentReferenceService } from './payment-reference.service';

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const q = error as QueryFailedError & { code?: string; driverError?: { code?: string } };
  return q.code === '23505' || q.driverError?.code === '23505';
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private readonly sepayQrAccount = process.env['PAYMENT_SEPAY_QR_ACCOUNT'] ?? '9332770502';
  private readonly sepayQrBank = process.env['PAYMENT_SEPAY_QR_BANK'] ?? 'Vietcombank';

  constructor(
    private readonly dataSource: DataSource,
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditRepo: AuditPaymentRepository,
    private readonly outboxRepo: PaymentOutboxRepository,
    private readonly reference: PaymentReferenceService,
  ) {}

  async createVietQr(dto: CreateVietQrTcpRequest): Promise<CreateVietQrTcpResponse> {
    const snapshot = await this.getBillPaymentSnapshot(dto.tenantId, dto.billId, dto.processId);
    if (snapshot.status !== BillStatus.PENDING_PAYMENT) {
      throw new ConflictException('Bill is not pending payment');
    }

    const existing = await this.paymentRepo.findByTenantAndBill(dto.tenantId, dto.billId);
    if (existing) {
      if (existing.status === 'PENDING') {
        return { ...this.toPaymentResponse(existing), qrUrl: this.buildQrUrl(existing) };
      }
      throw new ConflictException('Bill already paid');
    }

    let payment = this.paymentRepo.create({
      tenantId: dto.tenantId,
      billId: dto.billId,
      billReference: this.reference.createBillReference(dto.billId),
      method: null,
      status: 'PENDING',
      rawTotal: snapshot.rawTotal,
      roundedTotal: snapshot.roundedTotal,
      roundingDelta: snapshot.roundingDelta,
    });

    payment = await this.persistNewPaymentWithFallbackReference(payment);
    await this.auditRepo.createPaymentAudit(payment, 'PAYMENT_CREATED', 'USER', dto.userId, null, null);
    return { ...this.toPaymentResponse(payment), qrUrl: this.buildQrUrl(payment) };
  }

  async confirmCash(dto: ConfirmCashTcpRequest): Promise<PaymentTcpResponse> {
    const snapshot = await this.getBillPaymentSnapshot(dto.tenantId, dto.billId, dto.processId);
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
      await this.markBillPaidTcp({
        tenantId: billPaidMarker.tenantId,
        billId: billPaidMarker.billId,
        paymentId: billPaidMarker.paymentId,
        method: 'CASH',
        paidAt: billPaidMarker.paidAt,
        processId: dto.processId,
      });
    }

    const fresh = await this.paymentRepo.findByTenantAndBill(dto.tenantId, dto.billId);
    if (!fresh) {
      throw new ConflictException('Payment state is inconsistent');
    }
    return this.toPaymentResponse(fresh);
  }

  async handleSepayWebhook(dto: HandleSepayWebhookTcpRequest): Promise<SepayWebhookTcpResponse> {
    const payload = dto.payload;
    const billReference = this.reference.extractBillReference({
      code: payload.code,
      content: payload.content,
    });

    if (!billReference || payload.transferType !== 'in') {
      this.logger.warn(
        `Unmatched or non-incoming SePay webhook id=${payload.id} transferType=${payload.transferType} amount=${payload.transferAmount}`,
      );
      return { status: 'success' };
    }

    let completion:
      | {
          tenantId: string;
          billId: string;
          paymentId: string;
          paidAt: Date;
        }
      | undefined;

    await this.dataSource.transaction(async (manager) => {
      const payment = await this.paymentRepo.findByBillReferenceForUpdate(manager, billReference);
      if (!payment) {
        this.logger.warn(`SePay webhook matched no payment for billReference=${billReference}`);
        return;
      }

      await this.auditRepo.createPaymentAudit(
        payment,
        'SEPAY_WEBHOOK_RECEIVED',
        'SEPAY',
        null,
        null,
        { payload },
        manager,
      );

      if (payment.sepayTransactionId === payload.id) {
        await this.auditRepo.createPaymentAudit(
          payment,
          'SEPAY_WEBHOOK_DUPLICATE',
          'SEPAY',
          null,
          null,
          { payload },
          manager,
        );
        return;
      }

      if (payment.status === 'PAID' || payment.status === 'REFUND_PENDING' || payment.status === 'REFUNDED') {
        await this.auditRepo.createPaymentAudit(
          payment,
          'SEPAY_WEBHOOK_AFTER_PAID',
          'SEPAY',
          null,
          null,
          { payload },
          manager,
        );
        return;
      }

      if (payload.transferAmount < payment.roundedTotal) {
        await this.auditRepo.createPaymentAudit(
          payment,
          'SEPAY_WEBHOOK_UNDERPAID',
          'SEPAY',
          null,
          null,
          {
            expectedAmount: payment.roundedTotal,
            actualAmount: payload.transferAmount,
            payload,
          },
          manager,
        );
        return;
      }

      const paidAt = new Date();
      payment.method = PaymentMethod.VIETQR;
      payment.status = 'PAID';
      payment.paidAmount = payload.transferAmount;
      payment.sepayTransactionId = payload.id;
      payment.sepayReferenceCode = payload.referenceCode;
      payment.sepayGateway = payload.gateway;
      payment.sepayAccountNumber = payload.accountNumber;
      payment.sepayTransferContent = payload.content;
      payment.sepayTransactionDate = this.parseSepayDate(payload.transactionDate);
      payment.paidAt = paidAt;

      await manager.save(PaymentEntity, payment);
      await this.auditRepo.createPaymentAudit(
        payment,
        'PAYMENT_COMPLETED',
        'SEPAY',
        null,
        null,
        { method: 'VIETQR' },
        manager,
      );
      await this.outboxRepo.createCompleted(manager, payment, dto.processId);

      completion = {
        tenantId: payment.tenantId,
        billId: payment.billId,
        paymentId: payment.id,
        paidAt,
      };
    });

    if (completion) {
      await this.markBillPaidTcp({
        tenantId: completion.tenantId,
        billId: completion.billId,
        paymentId: completion.paymentId,
        method: 'VIETQR',
        paidAt: completion.paidAt,
        processId: dto.processId,
      });
    }

    return { status: 'success' };
  }

  async getHistory(dto: PaymentHistoryTcpRequest): Promise<PaymentHistoryTcpResponse> {
    const rows = await this.paymentRepo.findByTenantOrdered(dto.tenantId, {
      billId: dto.billId,
      status: dto.status,
      limit: dto.limit,
      offset: dto.offset,
    });
    return rows.map((p) => this.toPaymentResponse(p));
  }

  async getStatus(dto: PaymentStatusTcpRequest): Promise<PaymentTcpResponse> {
    const payment = await this.paymentRepo.findByTenantAndId(dto.tenantId, dto.paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.toPaymentResponse(payment);
  }

  private async getBillPaymentSnapshot(
    tenantId: string,
    billId: string,
    processId?: string,
  ): Promise<BillPaymentSnapshotTcpResponse> {
    const req: RequestType<BillPaymentSnapshotTcpRequest> = {
      tenantId,
      processId,
      data: { tenantId, billId },
    };
    const wrapped = await firstValueFrom(
      this.orderClient
        .send<
          BillPaymentSnapshotTcpResponse,
          BillPaymentSnapshotTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT, req)
        .pipe(map((r) => r)),
    );
    if (!wrapped?.data) {
      throw new ConflictException('Unable to load bill snapshot');
    }
    return wrapped.data;
  }

  private async markBillPaidTcp(params: {
    tenantId: string;
    billId: string;
    paymentId: string;
    method: 'CASH' | 'VIETQR';
    paidAt: Date;
    processId?: string;
  }): Promise<void> {
    const req: RequestType<BillMarkPaidTcpRequest> = {
      tenantId: params.tenantId,
      processId: params.processId,
      data: {
        tenantId: params.tenantId,
        billId: params.billId,
        paymentId: params.paymentId,
        method: params.method,
        paidAt: params.paidAt.toISOString(),
        processId: params.processId,
      },
    };
    try {
      await firstValueFrom(
        this.orderClient
          .send<BillMarkedPaidTcpResponse, BillMarkPaidTcpRequest>(TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID, req)
          .pipe(map((r) => r)),
      );
    } catch (e) {
      this.logger.warn(`BILL_MARK_PAID failed for bill ${params.billId}: ${(e as Error).message}`);
    }
  }

  private toPaymentResponse(p: PaymentEntity): PaymentTcpResponse {
    return {
      id: p.id,
      tenantId: p.tenantId,
      billId: p.billId,
      billReference: p.billReference,
      method: p.method,
      status: p.status,
      rawTotal: p.rawTotal,
      roundedTotal: p.roundedTotal,
      roundingDelta: p.roundingDelta,
      paidAmount: p.paidAmount ?? undefined,
      amountReceived: p.amountReceived ?? undefined,
      changeAmount: p.changeAmount ?? undefined,
      paidAt: p.paidAt?.toISOString(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private buildQrUrl(payment: PaymentEntity): string {
    return this.reference.buildQrUrl({
      account: this.sepayQrAccount,
      bank: this.sepayQrBank,
      amount: payment.roundedTotal,
      description: payment.billReference,
    });
  }

  private parseSepayDate(raw: string): Date {
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  private async persistNewPaymentWithFallbackReference(payment: PaymentEntity): Promise<PaymentEntity> {
    try {
      return await this.paymentRepo.save(payment);
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        payment.billReference = this.reference.createCollisionFallbackReference(payment.billId);
        return await this.paymentRepo.save(payment);
      }
      throw e;
    }
  }

  private async persistNewPayment(manager: EntityManager, payment: PaymentEntity): Promise<PaymentEntity> {
    try {
      return await manager.save(PaymentEntity, payment);
    } catch (e) {
      if (isPostgresUniqueViolation(e)) {
        payment.billReference = this.reference.createCollisionFallbackReference(payment.billId);
        return await manager.save(PaymentEntity, payment);
      }
      throw e;
    }
  }
}
