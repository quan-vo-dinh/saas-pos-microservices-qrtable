import { Bill } from '@common/entities/bill.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BillStatus } from '@einvoice/types';
import { EntityManager, Repository } from 'typeorm';
import type { ReportGrain } from '@common/utils/report-range.util';
import { pgBucketExpression } from '@common/utils/report-bucket.util';

@Injectable()
export class BillRepository {
  constructor(@InjectRepository(Bill) private readonly repo: Repository<Bill>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Bill | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findBySessionIdAndTenant(sessionId: string, tenantId: string): Promise<Bill | null> {
    return this.repo.findOne({ where: { sessionId, tenantId } });
  }

  findStaffList(tenantId: string, opts: { status?: string; limit: number; offset: number }): Promise<Bill[]> {
    const qb = this.repo
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .orderBy('b.createdAt', 'DESC')
      .take(opts.limit)
      .skip(opts.offset);
    if (opts.status) {
      qb.andWhere('b.status = :status', { status: opts.status });
    }
    return qb.getMany();
  }

  findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<Bill | null> {
    return manager
      .getRepository(Bill)
      .createQueryBuilder('b')
      .setLock('pessimistic_write')
      .where('b.id = :id', { id })
      .andWhere('b.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  save(bill: Bill): Promise<Bill> {
    return this.repo.save(bill);
  }

  async aggregateBillStatusBreakdown(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<Array<{ status: string; count: number; totalVnd: number }>> {
    const rows = await this.repo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(b.total), 0)', 'totalVnd')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.createdAt >= :fromUtc', { fromUtc })
      .andWhere('b.createdAt <= :toUtc', { toUtc })
      .groupBy('b.status')
      .getRawMany<{ status: string; count: string; totalVnd: string }>();

    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count) || 0,
      totalVnd: Number(row.totalVnd) || 0,
    }));
  }

  async aggregatePaidBillSummary(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{ paidBillCount: number; paidBillTotalVnd: number; pendingBillCount: number }> {
    const paidRow = await this.repo
      .createQueryBuilder('b')
      .select('COUNT(*)', 'paidBillCount')
      .addSelect('COALESCE(SUM(b.total), 0)', 'paidBillTotalVnd')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.status = :paidStatus', { paidStatus: BillStatus.PAID })
      .andWhere('b.paidAt >= :fromUtc', { fromUtc })
      .andWhere('b.paidAt <= :toUtc', { toUtc })
      .getRawOne<{ paidBillCount: string; paidBillTotalVnd: string }>();

    const pendingCount = await this.repo.count({
      where: { tenantId, status: BillStatus.PENDING_PAYMENT },
    });

    return {
      paidBillCount: Number(paidRow?.paidBillCount) || 0,
      paidBillTotalVnd: Number(paidRow?.paidBillTotalVnd) || 0,
      pendingBillCount: pendingCount,
    };
  }

  async aggregatePaidBillSeries(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
    grain: ReportGrain,
    timezone: string,
  ): Promise<Array<{ bucket: string; paidBillCount: number }>> {
    const bucketExpr = pgBucketExpression('b.paid_at', grain, timezone);
    const rows = await this.repo
      .createQueryBuilder('b')
      .select(bucketExpr, 'bucket')
      .addSelect('COUNT(*)', 'paidBillCount')
      .where('b.tenantId = :tenantId', { tenantId })
      .andWhere('b.status = :paidStatus', { paidStatus: BillStatus.PAID })
      .andWhere('b.paidAt IS NOT NULL')
      .andWhere('b.paidAt >= :fromUtc', { fromUtc })
      .andWhere('b.paidAt <= :toUtc', { toUtc })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: string; paidBillCount: string }>();

    return rows.map((row) => ({
      bucket: row.bucket,
      paidBillCount: Number(row.paidBillCount) || 0,
    }));
  }
}
