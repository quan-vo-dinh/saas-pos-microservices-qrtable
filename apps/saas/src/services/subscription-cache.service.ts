import { buildCurrentSubscriptionRedisKey } from '@common/constants/saas.constants';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Inject, Injectable } from '@nestjs/common';

export interface CurrentSubscriptionCacheValue {
  tenantId: string;
  planCode: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELED';
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
  features: string[];
  expiresAt: string | null;
}

type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

const SUBSCRIPTION_CACHE_TTL_SECONDS = 300;

@Injectable()
export class SubscriptionCacheService {
  constructor(@Inject(RedisClientService) private readonly redis: RedisClientService | RedisLike) {}

  async getCurrent(tenantId: string): Promise<CurrentSubscriptionCacheValue | null> {
    const value = await this.client().get(buildCurrentSubscriptionRedisKey(tenantId));
    return value ? (JSON.parse(value) as CurrentSubscriptionCacheValue) : null;
  }

  async setCurrent(tenantId: string, value: CurrentSubscriptionCacheValue): Promise<void> {
    await this.client().set(
      buildCurrentSubscriptionRedisKey(tenantId),
      JSON.stringify(value),
      'EX',
      SUBSCRIPTION_CACHE_TTL_SECONDS,
    );
  }

  async clearCurrent(tenantId: string): Promise<void> {
    await this.client().del(buildCurrentSubscriptionRedisKey(tenantId));
  }

  private client(): RedisLike {
    if ('getClient' in this.redis) {
      return this.redis.getClient();
    }
    return this.redis;
  }
}
