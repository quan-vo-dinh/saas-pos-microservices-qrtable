import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Catalog } from '@common/entities/catalog.entity';

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

  async exists(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }
}
