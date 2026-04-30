import { Order } from '@common/entities/order.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

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
}
