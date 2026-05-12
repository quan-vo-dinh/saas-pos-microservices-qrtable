import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class SubscriptionInvoiceRepository {
  constructor(@InjectRepository(SubscriptionInvoice) private readonly repo: Repository<SubscriptionInvoice>) {}

  findByBillingReferenceForUpdate(billingReference: string): Promise<SubscriptionInvoice | null> {
    return this.repo.findOne({ where: { billingReference } });
  }

  findById(id: string): Promise<SubscriptionInvoice | null> {
    return this.repo.findOne({ where: { id } });
  }

  async createInvoice(data: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice> {
    return this.repo.save(this.repo.create(data));
  }

  async list(query: {
    tenantId?: string;
    status?: string;
    planCode?: string;
    from?: string;
    to?: string;
    page?: number | string;
    limit?: number | string;
  }): Promise<{ items: SubscriptionInvoice[]; page: number; limit: number; total: number }> {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
    const qb = this.repo.createQueryBuilder('invoice');

    if (query.tenantId) {
      qb.andWhere('invoice.tenantId = :tenantId', { tenantId: query.tenantId });
    }

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    if (query.planCode) {
      qb.andWhere('invoice.planCodeSnapshot = :planCode', { planCode: query.planCode.trim().toUpperCase() });
    }

    if (query.from) {
      qb.andWhere('invoice.createdAt >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('invoice.createdAt <= :to', { to: new Date(query.to) });
    }

    const [items, total] = await qb
      .orderBy('invoice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, page, limit, total };
  }

  async markPaid(id: string, patch: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice | null> {
    const result = await this.repo.update({ id, status: SubscriptionInvoiceStatus.PENDING }, patch);
    if (!result.affected) {
      return null;
    }
    return this.findById(id);
  }

  async updateById(id: string, patch: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice> {
    await this.repo.update({ id }, { ...patch, updatedAt: new Date() });
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('SUBSCRIPTION_INVOICE_NOT_FOUND');
    }
    return updated;
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
