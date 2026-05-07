import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { Injectable } from '@nestjs/common';
import type { KdsQueueChangedEvent } from '@einvoice/types';

@Injectable()
export class KitchenEventsPublisher {
  constructor(private readonly redisClientService: RedisClientService) {}

  async publish(event: KdsQueueChangedEvent): Promise<void> {
    await this.redisClientService.getClient().publish(`realtime:kds:${event.tenantId}`, JSON.stringify(event));
  }

  async publishMany(events: KdsQueueChangedEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
