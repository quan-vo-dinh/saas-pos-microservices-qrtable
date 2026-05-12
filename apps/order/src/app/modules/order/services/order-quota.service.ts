import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Inject, Injectable } from '@nestjs/common';

type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
};

const HCM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const COUNTER_TTL_SECONDS = 60 * 60 * 48;

@Injectable()
export class OrderQuotaService {
  constructor(@Inject(RedisClientService) private readonly redis: RedisClientService | RedisLike) {}

  buildDailyOrderKey(tenantId: string, now = new Date()): string {
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: HCM_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return `quota:${tenantId}:orders:${date}`;
  }

  async incrementDailyOrders(tenantId: string, now = new Date()): Promise<number> {
    const key = this.buildDailyOrderKey(tenantId, now);
    const count = await this.client().incr(key);
    if (count === 1) {
      await this.client().expire(key, COUNTER_TTL_SECONDS);
    }
    return count;
  }

  async getDailyOrders(tenantId: string, now = new Date()): Promise<number> {
    const value = await this.client().get(this.buildDailyOrderKey(tenantId, now));
    return value ? Number(value) : 0;
  }

  private client(): RedisLike {
    if ('getClient' in this.redis) {
      return this.redis.getClient();
    }
    return this.redis;
  }
}
