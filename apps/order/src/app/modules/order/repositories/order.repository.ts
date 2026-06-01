import { Order } from '@common/entities/order.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PreparationStation } from '@einvoice/types';
import { OrderStatus } from '@einvoice/types';
import { EntityManager, In, Repository } from 'typeorm';
import type { ReportGrain } from '@common/utils/report-range.util';
import { pgBucketExpression } from '@common/utils/report-bucket.util';

@Injectable()
export class OrderRepository {
  constructor(@InjectRepository(Order) private readonly repo: Repository<Order>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Order | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findByIdempotencyKey(tenantId: string, sessionId: string, idempotencyKey: string): Promise<Order | null> {
    return this.repo.findOne({ where: { tenantId, sessionId, idempotencyKey } });
  }

  findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<Order | null> {
    return manager
      .getRepository(Order)
      .createQueryBuilder('ord')
      .setLock('pessimistic_write')
      .where('ord.id = :id', { id })
      .andWhere('ord.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  findBySessionIdAndTenant(sessionId: string, tenantId: string): Promise<Order[]> {
    return this.repo.find({ where: { sessionId, tenantId } });
  }

  countCreatedBetweenByTenant(tenantId: string, start: Date, end: Date): Promise<number> {
    return this.repo
      .createQueryBuilder('o')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.createdAt >= :start', { start })
      .andWhere('o.createdAt < :end', { end })
      .getCount();
  }

  findByIdsAndTenant(ids: string[], tenantId: string): Promise<Order[]> {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids), tenantId } });
  }

  async updateTableForSession(
    sessionId: string,
    tenantId: string,
    tableId: string,
    tableName: string,
    manager?: EntityManager,
  ): Promise<void> {
    const r = manager ? manager.getRepository(Order) : this.repo;
    await r.update({ sessionId, tenantId }, { tableId, tableName });
  }

  findActiveKdsOrders(tenantId: string, station?: PreparationStation): Promise<Order[]> {
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.status IN (:...statuses)', {
        statuses: [OrderStatus.PROCESSING, OrderStatus.READY],
      });

    if (station) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id
            AND oi.tenant_id = :tenantId
            AND oi.station = :station
        )`,
        { tenantId, station },
      );
    }

    return qb.getMany();
  }

  findStaffList(
    tenantId: string,
    opts: { status?: string; tableId?: string; limit: number; offset: number },
  ): Promise<Order[]> {
    const qb = this.repo
      .createQueryBuilder('o')
      .where('o.tenantId = :tenantId', { tenantId })
      .orderBy('o.createdAt', 'DESC')
      .take(opts.limit)
      .skip(opts.offset);
    if (opts.status) {
      qb.andWhere('o.status = :status', { status: opts.status });
    }
    if (opts.tableId) {
      qb.andWhere('o.tableId = :tableId', { tableId: opts.tableId });
    }
    return qb.getMany();
  }

  async aggregateOrderSummary(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
  ): Promise<{ orderCount: number; completedOrderCount: number; cancelledOrderCount: number } | null> {
    const row = await this.repo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'orderCount')
      .addSelect(`SUM(CASE WHEN o.status = :completed THEN 1 ELSE 0 END)`, 'completedOrderCount')
      .addSelect(`SUM(CASE WHEN o.status = :cancelled THEN 1 ELSE 0 END)`, 'cancelledOrderCount')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.createdAt >= :fromUtc', { fromUtc })
      .andWhere('o.createdAt <= :toUtc', { toUtc })
      .setParameters({
        completed: OrderStatus.COMPLETED,
        cancelled: OrderStatus.CANCELED,
      })
      .getRawOne<{ orderCount: string; completedOrderCount: string; cancelledOrderCount: string }>();

    if (!row) {
      return null;
    }

    return {
      orderCount: Number(row.orderCount) || 0,
      completedOrderCount: Number(row.completedOrderCount) || 0,
      cancelledOrderCount: Number(row.cancelledOrderCount) || 0,
    };
  }

  async aggregateOrderSeries(
    tenantId: string,
    fromUtc: Date,
    toUtc: Date,
    grain: ReportGrain,
    timezone: string,
  ): Promise<Array<{ bucket: string; orderCount: number; completedOrderCount: number }>> {
    const bucketExpr = pgBucketExpression('o.created_at', grain, timezone);
    const rows = await this.repo
      .createQueryBuilder('o')
      .select(bucketExpr, 'bucket')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect(`SUM(CASE WHEN o.status = :completed THEN 1 ELSE 0 END)`, 'completedOrderCount')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.createdAt >= :fromUtc', { fromUtc })
      .andWhere('o.createdAt <= :toUtc', { toUtc })
      .setParameter('completed', OrderStatus.COMPLETED)
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany<{ bucket: string; orderCount: string; completedOrderCount: string }>();

    return rows.map((row) => ({
      bucket: row.bucket,
      orderCount: Number(row.orderCount) || 0,
      completedOrderCount: Number(row.completedOrderCount) || 0,
    }));
  }
}
