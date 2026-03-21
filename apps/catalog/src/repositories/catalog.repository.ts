import { Catalog } from '@common/entities/catalog.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CatalogRepository {
  constructor(@InjectRepository(Catalog) private readonly repo: Repository<Catalog>) {}

  create(data: Partial<Catalog>): Promise<Catalog> {
    const catalog = this.repo.create(data);
    return this.repo.save(catalog);
  }

  findAllByTenant(tenantId: string): Promise<Catalog[]> {
    return this.repo.find({ where: { tenantId } });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Catalog> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Catalog>): Promise<Catalog> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    return this.repo.delete({ id, tenantId }).then(() => undefined);
  }

  async exists(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }
}
