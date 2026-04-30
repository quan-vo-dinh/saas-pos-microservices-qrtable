import { Order } from '@common/entities/order.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

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
}
