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
    return this.repo.save(
      this.repo.create({
        tenantId,
        cashEnabled: true,
        vietqrEnabled: false,
        connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
        sepayTokenScopes: [],
      }),
    );
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
}
