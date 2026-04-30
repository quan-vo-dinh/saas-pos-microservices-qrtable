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

  findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<Bill | null> {
    return manager
      .getRepository(Bill)
      .createQueryBuilder('b')
      .setLock('pessimistic_write')
      .where('b.id = :id', { id })
      .andWhere('b.tenantId = :tenantId', { tenantId })
      .getOne();
  }
}
