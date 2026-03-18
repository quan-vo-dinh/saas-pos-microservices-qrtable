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

  findAll(): Promise<Catalog[]> {
    return this.repo.find();
  }

  findById(id: string): Promise<Catalog> {
    return this.repo.findOne({ where: { id } });
  }

  updateById(id: string, data: Partial<Catalog>): Promise<Catalog> {
    return this.repo.save({ id, ...data });
  }

  deleteById(id: string): Promise<void> {
    return this.repo.delete(id).then(() => undefined);
  }

  async exists(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }
}
