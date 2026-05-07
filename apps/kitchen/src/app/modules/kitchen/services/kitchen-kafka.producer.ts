import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { KitchenSlaWarningEvent } from '@einvoice/types';
import { Kafka } from 'kafkajs';
import { CONFIGURATION } from '../../../../configuration';

@Injectable()
export class KitchenKafkaProducer implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(KitchenKafkaProducer.name);
  private producer: ReturnType<Kafka['producer']> | null = null;

  isConnected(): boolean {
    return this.producer !== null;
  }

  async onModuleInit(): Promise<void> {
    const { BROKERS, KITCHEN_CLIENT_ID } = CONFIGURATION.KAFKA_CONFIG;
    if (!BROKERS?.length) {
      this.logger.warn('Kafka brokers empty; kitchen.sla_warning producer will not run');
      return;
    }

    const kafka = new Kafka({ clientId: KITCHEN_CLIENT_ID, brokers: BROKERS });
    this.producer = kafka.producer();
    try {
      await this.producer.connect();
    } catch (e) {
      this.logger.error(`Kafka SLA producer connect failed: ${(e as Error).message}`);
      this.producer = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect().catch(() => undefined);
      this.producer = null;
    }
  }

  async publishSlaWarning(event: KitchenSlaWarningEvent): Promise<boolean> {
    if (!this.producer) {
      return false;
    }
    const topic = CONFIGURATION.KAFKA_CONFIG.KITCHEN_SLA_WARNING_TOPIC;
    await this.producer.send({
      topic,
      messages: [{ key: event.tenantId, value: JSON.stringify(event) }],
    });
    return true;
  }
}
