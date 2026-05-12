import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantPaymentSettingsEntity } from '../entities/tenant-payment-settings.entity';

@Injectable()
export class TenantPaymentSettingsRepository {
  constructor(
    @InjectRepository(TenantPaymentSettingsEntity) private readonly repo: Repository<TenantPaymentSettingsEntity>,
  ) {}

  findByTenantId(tenantId: string): Promise<TenantPaymentSettingsEntity | null> {
    return this.repo.findOne({ where: { tenantId } });
  }

  createEmpty(tenantId: string): Promise<TenantPaymentSettingsEntity> {
    return this.saveEmptyOrReadExisting(tenantId);
  }

  async updateByTenantId(
    tenantId: string,
    patch: Partial<TenantPaymentSettingsEntity>,
  ): Promise<TenantPaymentSettingsEntity> {
    await this.repo.update({ tenantId }, { ...patch, updatedAt: new Date() });
    const updated = await this.findByTenantId(tenantId);
    if (!updated) {
      throw new NotFoundException('TENANT_PAYMENT_SETTINGS_NOT_FOUND');
    }
    return updated;
  }

  private async saveEmptyOrReadExisting(tenantId: string): Promise<TenantPaymentSettingsEntity> {
    try {
      return await this.repo.save(
        this.repo.create({
          tenantId,
          cashEnabled: true,
          vietqrEnabled: false,
          connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
          sepayTokenScopes: [],
        }),
      );
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }

      const existing = await this.findByTenantId(tenantId);
      if (!existing) {
        throw error;
      }
      return existing;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505'
    );
  }
}
