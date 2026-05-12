import { buildTenantSuspendedRedisKey } from '@common/constants/saas.constants';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Inject, Injectable } from '@nestjs/common';

type RedisLike = {
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  get(key: string): Promise<string | null>;
};

@Injectable()
export class TenantStatusCacheService {
  constructor(@Inject(RedisClientService) private readonly redis: RedisClientService | RedisLike) {}

  async markSuspended(tenantId: string): Promise<void> {
    await this.client().set(buildTenantSuspendedRedisKey(tenantId), '1');
  }

  async clearSuspended(tenantId: string): Promise<void> {
    await this.client().del(buildTenantSuspendedRedisKey(tenantId));
  }

  async isSuspended(tenantId: string): Promise<boolean> {
    return (await this.client().get(buildTenantSuspendedRedisKey(tenantId))) === '1';
  }

  private client(): RedisLike {
    if ('getClient' in this.redis) {
      return this.redis.getClient();
    }
    return this.redis;
  }
}
