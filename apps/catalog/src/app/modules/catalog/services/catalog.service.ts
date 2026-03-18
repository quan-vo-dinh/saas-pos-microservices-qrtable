import { BadRequestException, Injectable } from '@nestjs/common';
import { Catalog } from '@common/entities/catalog.entity';
import { CatalogRepository } from '../repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async create(data: Partial<Catalog>) {
    const tenantId = data.tenantId?.trim();
    const name = data.name?.trim();

    if (!tenantId || !name) {
      throw new BadRequestException('tenantId and name are required');
    }

    const exists = await this.catalogRepository.exists(tenantId, name);
    if (exists) {
      throw new BadRequestException('Catalog already exists');
    }

    return this.catalogRepository.create({
      ...data,
      tenantId,
      name,
    });
  }

  getList() {
    return this.catalogRepository.findAll();
  }
}
