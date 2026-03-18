import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTenantTcpRequest, TenantTcpResponse, UpdateTenantTcpRequest } from '@common/interfaces/tcp/saas';
import { SaasRepository } from '../repositories/saas.repository';

@Injectable()
export class SaasService {
  constructor(private readonly saasRepository: SaasRepository) {}

  async create(data: CreateTenantTcpRequest): Promise<TenantTcpResponse> {
    const name = data.name?.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const slug = this.makeSlug(data.slug || name);
    const exists = await this.saasRepository.existsBySlug(slug);
    if (exists) {
      throw new BadRequestException('Tenant already exists');
    }

    return this.saasRepository.create({
      name,
      slug,
      isActive: data.isActive ?? true,
    });
  }

  getList(): Promise<TenantTcpResponse[]> {
    return this.saasRepository.findAll();
  }

  async getById(id: string): Promise<TenantTcpResponse> {
    const tenant = await this.saasRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(data: UpdateTenantTcpRequest): Promise<TenantTcpResponse> {
    const tenant = await this.getById(data.id);
    const name = data.name?.trim() || tenant.name;
    const slug = this.makeSlug(data.slug || name);

    if (slug !== tenant.slug) {
      const exists = await this.saasRepository.existsBySlug(slug);
      if (exists) {
        throw new BadRequestException('Tenant already exists');
      }
    }

    return this.saasRepository.updateById(data.id, {
      name,
      slug,
      isActive: data.isActive,
    });
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.saasRepository.deleteById(id);
  }

  private makeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  }
}
