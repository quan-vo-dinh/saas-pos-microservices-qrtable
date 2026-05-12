import { BILL_REF_PREFIXES, SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SubscriptionInvoiceRepository } from '../repositories/subscription-invoice.repository';
import { SubscriptionService } from './subscription.service';

export type SubscriptionWebhookInput = {
  code: string;
  transferAmount: number;
  sepayTransactionId: string;
  referenceCode?: string;
  content?: string;
};

@Injectable()
export class SubscriptionInvoiceService {
  private readonly logger = new Logger(SubscriptionInvoiceService.name);

  constructor(
    @Inject(SubscriptionInvoiceRepository)
    private readonly invoiceRepository: {
      findByBillingReferenceForUpdate(billingReference: string): Promise<{
        id: string;
        billingReference: string;
        amountVnd: number;
        status: SubscriptionInvoiceStatus;
        tenantId: string;
        planCodeSnapshot: string;
      } | null>;
      markPaid(id: string, patch: Record<string, unknown>): Promise<void>;
      auditUnderpaid(id: string, patch: Record<string, unknown>): Promise<void>;
    },
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async handleWebhook(input: SubscriptionWebhookInput): Promise<void> {
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

    await this.invoiceRepository.markPaid(invoice.id, {
      status: SubscriptionInvoiceStatus.PAID,
      sepayTransactionId: input.sepayTransactionId,
      paidAmountVnd: input.transferAmount,
      paidAt: new Date(),
    });

    const now = new Date();
    await this.subscriptionService.assignPlan({
      tenantId: invoice.tenantId,
      planCode: invoice.planCodeSnapshot,
      source: 'SUBSCRIPTION_PAYMENT',
      startsAt: now,
      expiresAt: this.addOneMonth(now),
    });
  }

  private addOneMonth(now: Date): Date {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    return next;
  }
}
