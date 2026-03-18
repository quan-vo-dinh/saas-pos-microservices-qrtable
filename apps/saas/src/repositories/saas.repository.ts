import { Tenant } from '@common/entities/tenant.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  findById(id: string): Promise<Tenant> {
    return this.repo.findOne({ where: { id } });
  }

  updateById(id: string, data: Partial<Tenant>): Promise<Tenant> {
    return this.repo.save({ id, ...data });
  }

  deleteById(id: string): Promise<void> {
    return this.repo.delete(id).then(() => undefined);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.repo.count({ where: { slug } });
    return count > 0;
  }
}
