import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentStatus } from '@einvoice/types';
import { EntityManager, Repository } from 'typeorm';
import type { ReportGrain } from '@common/utils/report-range.util';
import { pgBucketExpression } from '@common/utils/report-bucket.util';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class PaymentRepository {
  constructor(@InjectRepository(PaymentEntity) private readonly repo: Repository<PaymentEntity>) {}

  create(input: Partial<PaymentEntity>): PaymentEntity {
    return this.repo.create(input);
  }

  save(entity: PaymentEntity, manager?: EntityManager): Promise<PaymentEntity> {
    return manager ? manager.save(PaymentEntity, entity) : this.repo.save(entity);
  }

  findByTenantAndBill(tenantId: string, billId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { tenantId, billId } });
  }

  findByTenantAndId(tenantId: string, id: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { tenantId, id } });
  }

  findByBillReferenceForUpdate(manager: EntityManager, billReference: string): Promise<PaymentEntity | null> {
    return manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.billReference = :billReference', { billReference })
      .getOne();
  }

  findByTenantBillForUpdate(manager: EntityManager, tenantId: string, billId: string): Promise<PaymentEntity | null> {
    return manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.billId = :billId', { billId })
      .getOne();
  }

  findByTenantAndIdForUpdate(
    manager: EntityManager,
    tenantId: string,
    paymentId: string,
  ): Promise<PaymentEntity | null> {
    return manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.id = :paymentId', { paymentId })
      .getOne();
  }

  async findByTenantOrdered(
    tenantId: string,
    opts: { billId?: string; status?: string; limit?: number; offset?: number },
  ): Promise<PaymentEntity[]> {
    const limit = Math.min(opts.limit ?? 50, 200);
    const offset = opts.offset ?? 0;
    const qb = this.repo
      .createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId })
      .orderBy('payment.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    if (opts.billId) {
      qb.andWhere('payment.billId = :billId', { billId: opts.billId });
    }
    if (opts.status) {
      qb.andWhere('payment.status = :status', { status: opts.status });
    }
    return qb.getMany();
  }

  async aggregatePaidSummary(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{
    grossSalesVnd: number;
    collectedVnd: number;
    roundingDeltaVnd: number;
    paidPaymentCount: number;
  } | null> {
    const row = await this.repo
      .createQueryBuilder('payment')
      .select('COALESCE(SUM(payment.roundedTotal), 0)', 'grossSalesVnd')
      .addSelect('COALESCE(SUM(COALESCE(payment.paidAmount, payment.roundedTotal)), 0)', 'collectedVnd')
      .addSelect('COALESCE(SUM(payment.roundingDelta), 0)', 'roundingDeltaVnd')
      .addSelect('COUNT(*)', 'paidPaymentCount')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.paidAt >= :fromUtc', { fromUtc })
      .andWhere('payment.paidAt <= :toUtc', { toUtc })
      .getRawOne<{
        grossSalesVnd: string;
        collectedVnd: string;
        roundingDeltaVnd: string;
        paidPaymentCount: string;
      }>();

    if (!row) {
      return null;
    }

    return {
      grossSalesVnd: Number(row.grossSalesVnd) || 0,
      collectedVnd: Number(row.collectedVnd) || 0,
      roundingDeltaVnd: Number(row.roundingDeltaVnd) || 0,
      paidPaymentCount: Number(row.paidPaymentCount) || 0,
    };
  }

  async aggregateRevenueSeries(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
    grain: ReportGrain,
    timezone: string,
  ): Promise<Array<{ bucket: string; grossSalesVnd: number; collectedVnd: number; paymentCount: number }>> {
    const bucketExpr = pgBucketExpression('payment.paid_at', grain, timezone);
    const rows = await this.repo
      .createQueryBuilder('payment')
      .select(bucketExpr, 'bucket')
      .addSelect('COALESCE(SUM(payment.roundedTotal), 0)', 'grossSalesVnd')
      .addSelect('COALESCE(SUM(COALESCE(payment.paidAmount, payment.roundedTotal)), 0)', 'collectedVnd')
      .addSelect('COUNT(*)', 'paymentCount')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.paidAt IS NOT NULL')
      .andWhere('payment.paidAt >= :fromUtc', { fromUtc })
      .andWhere('payment.paidAt <= :toUtc', { toUtc })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: string; grossSalesVnd: string; collectedVnd: string; paymentCount: string }>();

    return rows.map((row) => ({
      bucket: row.bucket,
      grossSalesVnd: Number(row.grossSalesVnd) || 0,
      collectedVnd: Number(row.collectedVnd) || 0,
      paymentCount: Number(row.paymentCount) || 0,
    }));
  }

  async aggregateMethodBreakdown(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<Array<{ method: string | null; grossSalesVnd: number; collectedVnd: number; paymentCount: number }>> {
    const rows = await this.repo
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('COALESCE(SUM(payment.roundedTotal), 0)', 'grossSalesVnd')
      .addSelect('COALESCE(SUM(COALESCE(payment.paidAmount, payment.roundedTotal)), 0)', 'collectedVnd')
      .addSelect('COUNT(*)', 'paymentCount')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.paidAt >= :fromUtc', { fromUtc })
      .andWhere('payment.paidAt <= :toUtc', { toUtc })
      .groupBy('payment.method')
      .getRawMany<{ method: string | null; grossSalesVnd: string; collectedVnd: string; paymentCount: string }>();

    return rows.map((row) => ({
      method: row.method,
      grossSalesVnd: Number(row.grossSalesVnd) || 0,
      collectedVnd: Number(row.collectedVnd) || 0,
      paymentCount: Number(row.paymentCount) || 0,
    }));
  }

  async findRecentPaid(tenantId: string, fromUtc: Date, toUtc: Date, limit: number): Promise<PaymentEntity[]> {
    return this.repo
      .createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PAID })
      .andWhere('payment.paidAt >= :fromUtc', { fromUtc })
      .andWhere('payment.paidAt <= :toUtc', { toUtc })
      .orderBy('payment.paidAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
