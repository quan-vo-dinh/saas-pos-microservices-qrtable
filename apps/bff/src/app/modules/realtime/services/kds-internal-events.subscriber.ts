import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import type { KdsQueueChangedEvent } from '@einvoice/types';
import { CONFIGURATION } from '../../../../configuration';
import { RealtimeEventsService } from './realtime-events.service';

@Injectable()
export class KdsInternalEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KdsInternalEventsSubscriber.name);
  private subClient?: ReturnType<typeof createClient>;

  constructor(private readonly realtime: RealtimeEventsService) {}

  async onModuleInit(): Promise<void> {
    const { HOST, PORT } = CONFIGURATION.REDIS_CONFIG;
    const url = `redis://${HOST}:${PORT}`;
    this.subClient = createClient({ url });
    await this.subClient.connect();

    await this.subClient.pSubscribe('realtime:kds:*', (message, channel) => {
      void this.onKdsMessage(channel, message);
    });

    this.logger.log('Subscribed to realtime:kds:* (internal KDS fan-out)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.subClient?.quit().catch(() => undefined);
  }

  private onKdsMessage(channel: string, message: string): void {
    try {
      const payload = JSON.parse(message) as KdsQueueChangedEvent;
      if (payload?.eventType !== 'kds.queue_changed' || !payload.tenantId) {
        return;
      }
      this.realtime.emitKdsQueueChanged(payload);
    } catch (e) {
      this.logger.warn(`Bad KDS realtime payload on ${channel}: ${(e as Error).message}`);
    }
  }
}
