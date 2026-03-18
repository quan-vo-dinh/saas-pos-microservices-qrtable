import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogTcpResponse, CreateCatalogTcpRequest, UpdateCatalogTcpRequest } from '@common/interfaces/tcp/catalog';
import { CatalogRepository } from '../repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async create(data: CreateCatalogTcpRequest): Promise<CatalogTcpResponse> {
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
      tenantId,
      name,
      description: data.description?.trim(),
      isActive: data.isActive ?? true,
    });
  }

  getList(): Promise<CatalogTcpResponse[]> {
    return this.catalogRepository.findAll();
  }

  async getById(id: string): Promise<CatalogTcpResponse> {
    const catalog = await this.catalogRepository.findById(id);
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    return catalog;
  }

  async update(data: UpdateCatalogTcpRequest): Promise<CatalogTcpResponse> {
    const current = await this.getById(data.id);
    const nextName = data.name?.trim();

    if (nextName && nextName !== current.name) {
      const exists = await this.catalogRepository.exists(current.tenantId, nextName);
      if (exists) {
        throw new BadRequestException('Catalog already exists');
      }
    }

    const payload = {
      name: nextName,
      description: data.description?.trim(),
      isActive: data.isActive,
    };

    return this.catalogRepository.updateById(data.id, payload);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.catalogRepository.deleteById(id);
  }
}
