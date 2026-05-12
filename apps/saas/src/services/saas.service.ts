import { HttpStatus, Injectable } from '@nestjs/common';
import { TenantStatus } from '@common/constants/saas.constants';
import { Tenant } from '@common/entities/tenant.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import {
  CreateTenantTcpRequest,
  TenantTcpResponse,
  TenantSummaryTcpResponse,
  UpdateTenantTcpRequest,
} from '@common/interfaces/tcp/saas';
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

    const tenant = await this.saasRepository.create({
      name,
      slug,
      isActive: data.isActive ?? true,
    });
    return this.toTenantResponse(tenant);
  }

  async getList(): Promise<TenantTcpResponse[]> {
    const tenants = await this.saasRepository.findAll();
    return tenants.map((tenant) => this.toTenantResponse(tenant));
  }

  async getById(id: string): Promise<TenantTcpResponse> {
    const tenant = await this.saasRepository.findById(id);
    if (!tenant) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return this.toTenantResponse(tenant);
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

    return this.toTenantResponse(tenant);
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

    const updated = await this.saasRepository.updateById(data.id, {
      name,
      slug,
      isActive: data.isActive,
    });
    return this.toTenantResponse(updated);
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

  private toTenantResponse(tenant: Tenant): TenantSummaryTcpResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status ?? (tenant.isActive ? TenantStatus.ACTIVE : TenantStatus.SUSPENDED),
      isActive: tenant.isActive ?? tenant.status === TenantStatus.ACTIVE,
      defaultCurrency: tenant.defaultCurrency ?? 'VND',
      defaultLocale: tenant.defaultLocale ?? 'vi-VN',
      ownerId: tenant.ownerId ?? null,
      createdAt: this.toIsoString(tenant.createdAt),
      updatedAt: this.toIsoString(tenant.updatedAt),
    };
  }

  private toIsoString(value: Date | string | undefined): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value ?? '';
  }
}
