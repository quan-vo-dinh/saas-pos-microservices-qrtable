import { Bill } from '@common/entities/bill.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

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
}
