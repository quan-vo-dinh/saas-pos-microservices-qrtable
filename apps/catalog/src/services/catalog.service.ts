import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CatalogTcpResponse,
  CreateCatalogTcpRequest,
  GetCatalogListTcpRequest,
  UpdateCatalogTcpRequest,
} from '@common/interfaces/tcp/catalog';
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

  async getList(data: GetCatalogListTcpRequest): Promise<CatalogTcpResponse[]> {
    const tenantId = data.tenantId?.trim();

    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.catalogRepository.findAllByTenant(tenantId);
  }

  async getById(id: string, tenantId: string): Promise<CatalogTcpResponse> {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId is required');
    }

    const catalog = await this.catalogRepository.findByIdAndTenant(id, tenantId);
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    return catalog;
  }

  async update(data: UpdateCatalogTcpRequest): Promise<CatalogTcpResponse> {
    const tenantId = data.tenantId?.trim();
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    const current = await this.getById(data.id, tenantId);
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

    return this.catalogRepository.updateByIdAndTenant(data.id, tenantId, payload);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.getById(id, tenantId);
    await this.catalogRepository.deleteByIdAndTenant(id, tenantId);
  }
}
