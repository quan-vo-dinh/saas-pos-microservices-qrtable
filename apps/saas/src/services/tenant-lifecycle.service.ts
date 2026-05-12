import { TenantStatus } from '@common/constants/saas.constants';
import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStatusCacheService } from './tenant-status-cache.service';

@Injectable()
export class TenantLifecycleService {
  constructor(
    private readonly tenantRepository: {
      findById(id: string): Promise<{ id: string; status: TenantStatus } | null>;
      updateStatus(id: string, patch: Record<string, unknown>): Promise<unknown>;
    },
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

  private async assertTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
  }
}
