import { ServiceRequest } from '@common/entities/service-request.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class ServiceRequestRepository {
  constructor(@InjectRepository(ServiceRequest) private readonly repo: Repository<ServiceRequest>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<ServiceRequest | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<ServiceRequest | null> {
    return manager
      .getRepository(ServiceRequest)
      .createQueryBuilder('sr')
      .setLock('pessimistic_write')
      .where('sr.id = :id', { id })
      .andWhere('sr.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  save(entity: ServiceRequest): Promise<ServiceRequest> {
    return this.repo.save(entity);
  }

  async updateTableForSession(
    sessionId: string,
    tenantId: string,
    tableId: string,
    tableName: string,
    manager?: EntityManager,
  ): Promise<void> {
    const r = manager ? manager.getRepository(ServiceRequest) : this.repo;
    await r.update({ sessionId, tenantId }, { tableId, tableName });
  }
}
