import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { CreateTenantTcpRequest, TenantTcpResponse, UpdateTenantTcpRequest } from '@common/interfaces/tcp/saas';
import { SaasRepository } from '../repositories/saas.repository';

@Injectable()
export class SaasService {
  constructor(private readonly saasRepository: SaasRepository) {}

  async create(data: CreateTenantTcpRequest): Promise<TenantTcpResponse> {
    const name = data.name?.trim();
    if (!name) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NAME_REQUIRED, HttpStatus.BAD_REQUEST);
    }

    const slug = this.makeSlug(data.slug || name);
    const exists = await this.saasRepository.existsBySlug(slug);
    if (exists) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_ALREADY_EXISTS, HttpStatus.CONFLICT);
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
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return tenant;
  }

  async getBySlug(rawSlug: string): Promise<TenantTcpResponse> {
    const slug = this.makeSlug(rawSlug || '');
    if (!slug) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const tenant = await this.saasRepository.findBySlug(slug);
    if (!tenant) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!tenant.isActive) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_INACTIVE, HttpStatus.FORBIDDEN);
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
        throw new BusinessException(ErrorCode.SAAS_TENANT_ALREADY_EXISTS, HttpStatus.CONFLICT);
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
      .replace(/[^a-z0-9_\s-]/g, '')
      .replace(/\s+/g, '-');
  }
}
