import type { HandleSepayWebhookTcpRequest, SepayWebhookTcpResponse } from '@common/interfaces/tcp/payment';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PaymentMethod } from '@einvoice/types';
import { timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { AuditPaymentRepository } from '../repositories/audit-payment.repository';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { TenantPaymentSettingsRepository } from '../repositories/tenant-payment-settings.repository';
import { PaymentOrderGateway } from './payment-order.gateway';
import { PaymentSecretsService } from './payment-secrets.service';
import { PaymentReferenceService } from './payment-reference.service';
import { PaymentTenantGateway } from './payment-tenant.gateway';

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
    private readonly tenantPaymentSettingsRepo: TenantPaymentSettingsRepository,
    private readonly secrets: PaymentSecretsService,
    private readonly tenantGateway: PaymentTenantGateway,
  ) {}

  async handleSepayWebhook(dto: HandleSepayWebhookTcpRequest): Promise<SepayWebhookTcpResponse> {
    const routeTenantId = await this.verifyTenantWebhookSecret(dto);
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
      if (routeTenantId && payment.tenantId !== routeTenantId) {
        throw new BusinessException(ErrorCode.SEPAY_TENANT_MISMATCH, HttpStatus.FORBIDDEN);
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

      if (payment.status === 'PAID') {
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

  private async verifyTenantWebhookSecret(dto: HandleSepayWebhookTcpRequest): Promise<string | undefined> {
    const usesTenantRoute = dto.tenantSlug !== undefined || dto.secret !== undefined;
    if (!usesTenantRoute) {
      return undefined;
    }

    const tenantSlug = dto.tenantSlug?.trim();
    const providedSecret = dto.secret?.trim();
    if (!tenantSlug || !providedSecret) {
      throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SECRET_REQUIRED, HttpStatus.UNAUTHORIZED);
    }

    const tenant = await this.tenantGateway.resolveByKey(tenantSlug, dto.processId);
    const settings = await this.tenantPaymentSettingsRepo.findByTenantId(tenant.id);
    if (!settings?.webhookSecretEncrypted) {
      throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SECRET_NOT_CONFIGURED, HttpStatus.UNAUTHORIZED);
    }

    const expectedSecret = this.decryptWebhookSecret(settings.webhookSecretEncrypted);
    if (!constantTimeEquals(expectedSecret, providedSecret)) {
      throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SECRET_INVALID, HttpStatus.UNAUTHORIZED);
    }

    return tenant.id;
  }

  private decryptWebhookSecret(encryptedSecret: string): string {
    try {
      const secret = this.secrets.decrypt(encryptedSecret).trim();
      if (!secret) {
        throw new Error('empty secret');
      }
      return secret;
    } catch {
      throw new BusinessException(ErrorCode.SEPAY_WEBHOOK_SECRET_NOT_CONFIGURED, HttpStatus.UNAUTHORIZED);
    }
  }
}

function constantTimeEquals(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(actual, 'utf8');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
