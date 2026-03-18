import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '@common/entities/tenant.entity';

@Injectable()
export class SaasRepository {
  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

  create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.repo.create(data);
    return this.repo.save(tenant);
  }

  findAll(): Promise<Tenant[]> {
    return this.repo.find();
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.repo.count({ where: { slug } });
    return count > 0;
  }
}
