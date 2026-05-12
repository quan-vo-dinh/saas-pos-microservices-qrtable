import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SubscriptionInvoiceRepository {
  constructor(@InjectRepository(SubscriptionInvoice) private readonly repo: Repository<SubscriptionInvoice>) {}

  findByBillingReferenceForUpdate(billingReference: string): Promise<SubscriptionInvoice | null> {
    return this.repo.findOne({ where: { billingReference } });
  }

  async markPaid(id: string, patch: Partial<SubscriptionInvoice>): Promise<void> {
    await this.repo.update({ id }, patch);
  }

  async auditUnderpaid(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.repo.update(
      { id },
      {
        status: SubscriptionInvoiceStatus.UNDERPAID,
        paidAmountVnd: Number(patch.transferAmount ?? 0),
        sepayTransactionId: Number(patch.sepayTransactionId) || null,
        sepayReferenceCode: String(patch.referenceCode ?? ''),
        sepayTransferContent: String(patch.content ?? ''),
      },
    );
  }
}
