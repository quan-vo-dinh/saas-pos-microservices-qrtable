import { ServiceRequest } from '@common/entities/service-request.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ServiceRequestRepository {
  constructor(@InjectRepository(ServiceRequest) private readonly repo: Repository<ServiceRequest>) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<ServiceRequest | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }
}
