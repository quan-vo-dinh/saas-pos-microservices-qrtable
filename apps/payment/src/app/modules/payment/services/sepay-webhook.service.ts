import type { HandleSepayWebhookTcpRequest, SepayWebhookTcpResponse } from '@common/interfaces/tcp/payment';
import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethod } from '@einvoice/types';
import { DataSource } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { AuditPaymentRepository } from '../repositories/audit-payment.repository';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentOrderGateway } from './payment-order.gateway';
import { PaymentReferenceService } from './payment-reference.service';

@Injectable()
export class SepayWebhookService {
  private readonly logger = new Logger(SepayWebhookService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly orderGateway: PaymentOrderGateway,
    private readonly paymentRepo: PaymentRepository,
    private readonly auditRepo: AuditPaymentRepository,
    private readonly outboxRepo: PaymentOutboxRepository,
    private readonly reference: PaymentReferenceService,
  ) {}

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
      await this.orderGateway.markBillPaid({
        tenantId: completion.tenantId,
        billId: completion.billId,
        paymentId: completion.paymentId,
        method: 'VIETQR',
        paidAt: completion.paidAt.toISOString(),
        processId: dto.processId,
      });
    }

    return { status: 'success' };
  }

  private parseSepayDate(raw: string): Date {
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
}
