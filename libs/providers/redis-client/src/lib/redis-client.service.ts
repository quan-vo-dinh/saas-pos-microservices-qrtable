import { RedisConfiguration } from '@common/configuration/redis.config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const config = new RedisConfiguration();
    this.client = new Redis({
      host: config.HOST,
      port: config.PORT,
      maxRetriesPerRequest: 3,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
