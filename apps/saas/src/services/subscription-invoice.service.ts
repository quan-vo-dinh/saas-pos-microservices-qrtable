import { BILL_REF_PREFIXES, SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'crypto';
import { CONFIGURATION } from '../configuration';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionInvoiceRepository } from '../repositories/subscription-invoice.repository';
import { SubscriptionService } from './subscription.service';

export type SubscriptionWebhookInput = {
  code: string;
  transferAmount: number;
  sepayTransactionId: string;
  secret?: string;
  referenceCode?: string;
  content?: string;
};

@Injectable()
export class SubscriptionInvoiceService {
  private readonly logger = new Logger(SubscriptionInvoiceService.name);

  constructor(
    @Inject(SubscriptionInvoiceRepository)
    private readonly invoiceRepository: {
      createInvoice(data: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice>;
      findById(id: string): Promise<SubscriptionInvoice | null>;
      findByBillingReferenceForUpdate(billingReference: string): Promise<{
        id: string;
        billingReference: string;
        amountVnd: number;
        status: SubscriptionInvoiceStatus;
        tenantId: string;
        planCodeSnapshot: string;
        periodEndsAt: Date;
      } | null>;
      list(
        query: Record<string, unknown>,
      ): Promise<{ items: SubscriptionInvoice[]; page: number; limit: number; total: number }>;
      markPaid(id: string, patch: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice | null>;
      updateById(id: string, patch: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice>;
      auditUnderpaid(id: string, patch: Record<string, unknown>): Promise<void>;
    },
    private readonly subscriptionService: SubscriptionService,
    @Optional() private readonly planRepository?: PricingPlanRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async checkout(input: {
    tenantId: string;
    planCode: string;
    billingPeriod: 'MONTHLY' | 'YEARLY';
    requestedByUserId: string;
  }): Promise<Record<string, unknown>> {
    const plan = await this.planRepository?.findActiveByCode(input.planCode);
    if (!plan) {
      throw new BusinessException(ErrorCode.SAAS_PLAN_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const now = new Date();
    const periodEndsAt = this.addBillingPeriod(now, input.billingPeriod);
    const amountVnd = this.calculateAmount(plan.priceVnd, plan.billingPeriod, input.billingPeriod);
    const invoice = await this.invoiceRepository.createInvoice({
      tenantId: input.tenantId,
      pricingPlanId: plan.id,
      planCodeSnapshot: plan.code,
      amountVnd,
      billingPeriod: input.billingPeriod,
      periodStartsAt: now,
      periodEndsAt,
      billingReference: this.createBillingReference(),
      status: SubscriptionInvoiceStatus.PENDING,
      qrExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      requestedByUserId: input.requestedByUserId,
    });

    const qrUrl = this.buildQrUrl(invoice);
    const saved = qrUrl ? await this.invoiceRepository.updateById(invoice.id, { qrUrl }) : invoice;
    return this.toInvoiceResponse(saved);
  }

  async list(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await this.invoiceRepository.list(query);
    return {
      ...result,
      items: result.items.map((invoice) => this.toInvoiceResponse(invoice)),
    };
  }

  async getInvoice(input: {
    tenantId?: string;
    invoiceId: string;
    statusOnly?: boolean;
  }): Promise<Record<string, unknown>> {
    const invoice = await this.invoiceRepository.findById(input.invoiceId);
    if (!invoice || (input.tenantId && invoice.tenantId !== input.tenantId)) {
      throw new BusinessException(ErrorCode.SAAS_SUBSCRIPTION_INVOICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const response = this.toInvoiceResponse(invoice);
    return input.statusOnly ? { id: response.id, status: response.status } : response;
  }

  async cancelInvoice(input: {
    tenantId?: string;
    invoiceId: string;
    reason?: string | null;
  }): Promise<Record<string, unknown>> {
    const invoice = await this.invoiceRepository.findById(input.invoiceId);
    if (!invoice || (input.tenantId && invoice.tenantId !== input.tenantId)) {
      throw new BusinessException(ErrorCode.SAAS_SUBSCRIPTION_INVOICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (invoice.status !== SubscriptionInvoiceStatus.PENDING) {
      throw new BusinessException(ErrorCode.SAAS_ONLY_PENDING_INVOICE_CAN_BE_CANCELED, HttpStatus.BAD_REQUEST);
    }
    return this.toInvoiceResponse(
      await this.invoiceRepository.updateById(invoice.id, {
        status: SubscriptionInvoiceStatus.CANCELED,
        canceledAt: new Date(),
        canceledReason: input.reason ?? 'Canceled by user',
      }),
    );
  }

  async manualConfirm(input: {
    invoiceId: string;
    confirmedByUserId: string;
    note?: string | null;
  }): Promise<Record<string, unknown>> {
    const invoice = await this.invoiceRepository.findById(input.invoiceId);
    if (!invoice) {
      throw new BusinessException(ErrorCode.SAAS_SUBSCRIPTION_INVOICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (invoice.status !== SubscriptionInvoiceStatus.PENDING) {
      throw new BusinessException(ErrorCode.SAAS_ONLY_PENDING_INVOICE_CAN_BE_CONFIRMED, HttpStatus.BAD_REQUEST);
    }

    const paid = await this.invoiceRepository.markPaid(invoice.id, {
      status: SubscriptionInvoiceStatus.PAID,
      paidAt: new Date(),
      paidAmountVnd: invoice.amountVnd,
      manuallyConfirmedByUserId: input.confirmedByUserId,
      manuallyConfirmedAt: new Date(),
      sepayTransferContent: input.note ?? invoice.sepayTransferContent ?? null,
    });
    if (!paid) {
      throw new BusinessException(ErrorCode.SAAS_ONLY_PENDING_INVOICE_CAN_BE_CONFIRMED, HttpStatus.BAD_REQUEST);
    }

    await this.subscriptionService.assignPlan({
      tenantId: invoice.tenantId,
      planCode: invoice.planCodeSnapshot,
      source: 'SUBSCRIPTION_PAYMENT',
      sourceInvoiceId: invoice.id,
      startsAt: new Date(),
      expiresAt: invoice.periodEndsAt,
      createdByUserId: input.confirmedByUserId,
    });

    return this.toInvoiceResponse(paid);
  }

  async handleWebhook(input: SubscriptionWebhookInput): Promise<void> {
    this.verifyPlatformWebhookSecret(input.secret);

    if (!input.code.startsWith(BILL_REF_PREFIXES.SUBSCRIPTION)) {
      this.logger.warn(`Ignoring non-subscription webhook code=${input.code}`);
      return;
    }

    const invoice = await this.invoiceRepository.findByBillingReferenceForUpdate(input.code);
    if (!invoice || invoice.status !== SubscriptionInvoiceStatus.PENDING) {
      return;
    }

    if (input.transferAmount < invoice.amountVnd) {
      await this.invoiceRepository.auditUnderpaid(invoice.id, input);
      return;
    }

    const paid = await this.invoiceRepository.markPaid(invoice.id, {
      status: SubscriptionInvoiceStatus.PAID,
      sepayTransactionId: Number(input.sepayTransactionId) || null,
      paidAmountVnd: input.transferAmount,
      paidAt: new Date(),
    });
    if (!paid) {
      return;
    }

    await this.subscriptionService.assignPlan({
      tenantId: invoice.tenantId,
      planCode: invoice.planCodeSnapshot,
      source: 'SUBSCRIPTION_PAYMENT',
      sourceInvoiceId: invoice.id,
      startsAt: new Date(),
      expiresAt: invoice.periodEndsAt,
    });
  }

  private addBillingPeriod(now: Date, billingPeriod: 'MONTHLY' | 'YEARLY'): Date {
    const next = new Date(now);
    if (billingPeriod === 'YEARLY') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private calculateAmount(
    planPriceVnd: number,
    planBillingPeriod: 'MONTHLY' | 'YEARLY',
    requestedBillingPeriod: 'MONTHLY' | 'YEARLY',
  ): number {
    if (planBillingPeriod === requestedBillingPeriod) {
      return Number(planPriceVnd);
    }
    return requestedBillingPeriod === 'YEARLY' ? Number(planPriceVnd) * 12 : Math.ceil(Number(planPriceVnd) / 12);
  }

  private createBillingReference(): string {
    return `${BILL_REF_PREFIXES.SUBSCRIPTION}${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private buildQrUrl(invoice: SubscriptionInvoice): string | null {
    const account = this.platformPaymentConfig('QR_ACCOUNT');
    const bank = this.platformPaymentConfig('QR_BANK');
    if (!account || !bank) {
      return null;
    }

    const params = new URLSearchParams({
      acc: account,
      bank,
      amount: String(invoice.amountVnd),
      des: invoice.billingReference,
    });
    return `https://qr.sepay.vn/img?${params.toString()}`;
  }

  private verifyPlatformWebhookSecret(secret?: string): void {
    const expectedSecret = this.platformPaymentConfig('WEBHOOK_SECRET')?.trim();
    const providedSecret = secret?.trim();
    if (!expectedSecret || !providedSecret || !constantTimeEquals(expectedSecret, providedSecret)) {
      throw new BusinessException(ErrorCode.SEPAY_PLATFORM_WEBHOOK_SECRET_INVALID, HttpStatus.UNAUTHORIZED);
    }
  }

  private platformPaymentConfig(key: 'QR_ACCOUNT' | 'QR_BANK' | 'WEBHOOK_SECRET'): string | undefined {
    return (
      this.configService?.get<string>(`SAAS_PLATFORM_PAYMENT_CONFIG.${key}`) ??
      CONFIGURATION.SAAS_PLATFORM_PAYMENT_CONFIG[key]
    );
  }

  private toInvoiceResponse(invoice: SubscriptionInvoice): Record<string, unknown> {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      pricingPlanId: invoice.pricingPlanId,
      planCodeSnapshot: invoice.planCodeSnapshot,
      amountVnd: Number(invoice.amountVnd),
      billingPeriod: invoice.billingPeriod,
      billingReference: invoice.billingReference,
      status: invoice.status,
      qrUrl: invoice.qrUrl ?? null,
      qrExpiresAt: invoice.qrExpiresAt?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      createdAt: invoice.createdAt?.toISOString?.() ?? invoice.createdAt,
    };
  }
}

function constantTimeEquals(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(actual, 'utf8');
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}
