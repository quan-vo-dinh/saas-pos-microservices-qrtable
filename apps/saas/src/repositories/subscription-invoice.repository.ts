import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ReportGrain } from '@common/utils/report-range.util';
import { pgBucketExpression } from '@common/utils/report-bucket.util';
import { In, LessThan, Repository } from 'typeorm';

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

  async markPaid(
    id: string,
    patch: Partial<SubscriptionInvoice>,
    allowedStatuses: SubscriptionInvoiceStatus[] = [SubscriptionInvoiceStatus.PENDING],
  ): Promise<SubscriptionInvoice | null> {
    const result = await this.repo.update({ id, status: In(allowedStatuses) }, patch);
    if (!result.affected) {
      return null;
    }
    return this.findById(id);
  }

  async updateById(id: string, patch: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice> {
    await this.repo.update({ id }, { ...patch, updatedAt: new Date() });
    const updated = await this.findById(id);
    if (!updated) {
      throw new BusinessException(ErrorCode.SAAS_SUBSCRIPTION_INVOICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  async auditUnderpaid(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.repo.update(
      { id, status: SubscriptionInvoiceStatus.PENDING },
      {
        status: SubscriptionInvoiceStatus.UNDERPAID,
        paidAmountVnd: Number(patch.transferAmount ?? 0),
        sepayTransactionId: Number(patch.sepayTransactionId) || null,
        sepayReferenceCode: String(patch.referenceCode ?? ''),
        sepayTransferContent: String(patch.content ?? ''),
      },
    );
  }

  async expirePendingPastQrExpiry(now: Date): Promise<number> {
    const result = await this.repo.update(
      {
        status: SubscriptionInvoiceStatus.PENDING,
        qrExpiresAt: LessThan(now),
      },
      {
        status: SubscriptionInvoiceStatus.EXPIRED,
        updatedAt: new Date(),
      },
    );
    return result.affected ?? 0;
  }

  async aggregatePlatformRevenueSummary(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{ platformRevenueVnd: number; paidInvoiceCount: number; pendingInvoiceCount: number }> {
    const paidRow = await this.repo
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.paidAmountVnd), 0)', 'platformRevenueVnd')
      .addSelect('COUNT(*)', 'paidInvoiceCount')
      .where('invoice.status = :paidStatus', { paidStatus: SubscriptionInvoiceStatus.PAID })
      .andWhere('invoice.paidAt >= :fromUtc', { fromUtc })
      .andWhere('invoice.paidAt <= :toUtc', { toUtc })
      .getRawOne<{ platformRevenueVnd: string; paidInvoiceCount: string }>();

    const pendingInvoiceCount = await this.repo.count({
      where: { status: SubscriptionInvoiceStatus.PENDING },
    });

    return {
      platformRevenueVnd: Number(paidRow?.platformRevenueVnd) || 0,
      paidInvoiceCount: Number(paidRow?.paidInvoiceCount) || 0,
      pendingInvoiceCount,
    };
  }

  async aggregatePlatformRevenueSeries(
    fromUtc: Date,
    toUtc: Date,
    grain: ReportGrain,
    timezone: string,
  ): Promise<Array<{ bucket: string; platformRevenueVnd: number; paidInvoiceCount: number }>> {
    const bucketExpr = pgBucketExpression('invoice.paid_at', grain, timezone);
    const rows = await this.repo
      .createQueryBuilder('invoice')
      .select(bucketExpr, 'bucket')
      .addSelect('COALESCE(SUM(invoice.paidAmountVnd), 0)', 'platformRevenueVnd')
      .addSelect('COUNT(*)', 'paidInvoiceCount')
      .where('invoice.status = :paidStatus', { paidStatus: SubscriptionInvoiceStatus.PAID })
      .andWhere('invoice.paidAt IS NOT NULL')
      .andWhere('invoice.paidAt >= :fromUtc', { fromUtc })
      .andWhere('invoice.paidAt <= :toUtc', { toUtc })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: string; platformRevenueVnd: string; paidInvoiceCount: string }>();

    return rows.map((row) => ({
      bucket: row.bucket,
      platformRevenueVnd: Number(row.platformRevenueVnd) || 0,
      paidInvoiceCount: Number(row.paidInvoiceCount) || 0,
    }));
  }

  async aggregateInvoiceStatusBreakdown(
    fromUtc: Date,
    toUtc: Date,
  ): Promise<Array<{ status: string; count: number; totalVnd: number }>> {
    const rows = await this.repo
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(invoice.amountVnd), 0)', 'totalVnd')
      .where('invoice.createdAt >= :fromUtc', { fromUtc })
      .andWhere('invoice.createdAt <= :toUtc', { toUtc })
      .groupBy('invoice.status')
      .getRawMany<{ status: string; count: string; totalVnd: string }>();

    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count) || 0,
      totalVnd: Number(row.totalVnd) || 0,
    }));
  }
}
