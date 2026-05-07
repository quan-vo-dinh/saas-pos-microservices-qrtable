import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, type Consumer } from 'kafkajs';
import type { KitchenSlaWarningEvent } from '@einvoice/types';
import { CONFIGURATION } from '../../../../configuration';
import { RealtimeEventsService } from './realtime-events.service';

@Injectable()
export class RealtimeKafkaBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeKafkaBridgeService.name);
  private consumer?: Consumer;

  constructor(private readonly realtime: RealtimeEventsService) {}

  async onModuleInit(): Promise<void> {
    const kafkaConfig = CONFIGURATION.KAFKA_CONFIG;
    const kafka = new Kafka({
      clientId: kafkaConfig.BFF_CLIENT_ID,
      brokers: kafkaConfig.BROKERS,
    });
    const consumer = kafka.consumer({ groupId: kafkaConfig.BFF_CONSUMER_GROUP });
    this.consumer = consumer;

    await consumer.connect();
    await consumer.subscribe({ topic: kafkaConfig.KITCHEN_SLA_WARNING_TOPIC, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) {
            return;
          }
          const event = JSON.parse(raw) as KitchenSlaWarningEvent;
          if (event.eventType !== 'kitchen.sla_warning') {
            return;
          }
          this.realtime.emitKitchenSlaWarning(event);
        } catch (e) {
          this.logger.warn(`Kitchen SLA Kafka bridge parse error: ${(e as Error).message}`);
        }
      },
    });

    this.logger.log(`Kafka consumer running on topic ${kafkaConfig.KITCHEN_SLA_WARNING_TOPIC}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect().catch(() => undefined);
  }
}
