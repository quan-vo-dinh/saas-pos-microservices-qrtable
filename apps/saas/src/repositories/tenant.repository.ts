import { TenantStatus } from '@common/constants/saas.constants';
import { Tenant } from '@common/entities/tenant.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TenantRepository {
  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

  create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.repo.create(data);
    return this.repo.save(tenant);
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async updateStatus(id: string, patch: Partial<Tenant> & { status: TenantStatus }): Promise<void> {
    await this.repo.update({ id }, patch);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
