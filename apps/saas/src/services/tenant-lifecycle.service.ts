import { buildTenantSuspendedRedisKey, TenantStatus } from '@common/constants/saas.constants';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

type RedisLike = {
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

@Injectable()
export class TenantLifecycleService {
  constructor(
    private readonly tenantRepository: {
      findById(id: string): Promise<{ id: string; status: TenantStatus } | null>;
      updateStatus(id: string, patch: Record<string, unknown>): Promise<unknown>;
    },
    @Inject(RedisClientService) private readonly redis: RedisLike | RedisClientService,
  ) {}

  async suspend(params: { tenantId: string; reason: string }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.SUSPENDED,
      isActive: false,
      suspendedAt: new Date(),
      suspendedReason: params.reason,
    });
    await this.redisClient().set(buildTenantSuspendedRedisKey(params.tenantId), '1');
  }

  async activate(params: { tenantId: string }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.ACTIVE,
      isActive: true,
      suspendedAt: null,
      suspendedReason: null,
    });
    await this.redisClient().del(buildTenantSuspendedRedisKey(params.tenantId));
  }

  private async assertTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
  }

  private redisClient(): RedisLike {
    if ('getClient' in this.redis) {
      return this.redis.getClient();
    }
    return this.redis;
  }
}
