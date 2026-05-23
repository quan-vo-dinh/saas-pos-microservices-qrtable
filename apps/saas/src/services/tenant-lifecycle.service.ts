import { TenantStatus } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable } from '@nestjs/common';
import { TenantRepository } from '../repositories/tenant.repository';
import { TenantStatusCacheService } from './tenant-status-cache.service';

@Injectable()
export class TenantLifecycleService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly tenantStatusCache: TenantStatusCacheService,
  ) {}

  async suspend(params: { tenantId: string; reason: string }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.SUSPENDED,
      isActive: false,
      suspendedAt: new Date(),
      suspendedReason: params.reason,
    });
    await this.tenantStatusCache.markSuspended(params.tenantId);
  }

  async activate(params: { tenantId: string }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.ACTIVE,
      isActive: true,
      suspendedAt: null,
      suspendedReason: null,
    });
    await this.tenantStatusCache.clearSuspended(params.tenantId);
  }

  async close(params: { tenantId: string; reason?: string | null }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.CLOSED,
      isActive: false,
      closedAt: new Date(),
      closedReason: params.reason ?? null,
    });
    await this.tenantStatusCache.markSuspended(params.tenantId);
  }

  private async assertTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }
}
