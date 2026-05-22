import { CONFIGURATION } from '../configuration';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import { SaasOutboxRepository } from '../repositories/saas-outbox.repository';

const POLL_MS = 2000;
const BATCH = 25;

@Injectable()
export class SaasOutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SaasOutboxPublisherService.name);
  private producer: ReturnType<Kafka['producer']> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private publishing = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly outbox: SaasOutboxRepository,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeProducerAndPolling();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.producer) {
      await this.producer.disconnect().catch(() => undefined);
      this.producer = null;
    }
  }

  private scheduleProducerReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.initializeProducerAndPolling();
    }, 5000);
  }

  private async initializeProducerAndPolling(): Promise<void> {
    const brokers = CONFIGURATION.KAFKA_CONFIG.BROKERS;
    if (!brokers?.length) {
      this.logger.warn('Kafka brokers empty; SaaS outbox publisher will not run');
      return;
    }
    if (this.producer) {
      return;
    }
    const kafka = new Kafka({
      clientId:
        this.configService?.get<string>('SAAS_KAFKA_CLIENT_CONFIG.CLIENT_ID') ??
        CONFIGURATION.SAAS_KAFKA_CLIENT_CONFIG.CLIENT_ID,
      brokers,
    });
    this.producer = kafka.producer();
    try {
      await this.producer.connect();
    } catch (error) {
      this.logger.error(`Kafka producer connect failed: ${(error as Error).message}`);
      await this.producer.disconnect().catch(() => undefined);
      this.producer = null;
      this.scheduleProducerReconnect();
      return;
    }
    if (!this.timer) {
      this.timer = setInterval(() => void this.publishBatchSafe(), POLL_MS);
    }
  }

  private async publishBatchSafe(): Promise<void> {
    if (this.publishing) {
      return;
    }
    this.publishing = true;
    try {
      await this.publishBatch();
    } catch (error) {
      this.logger.warn(`SaaS outbox poll error: ${(error as Error).message}`);
    } finally {
      this.publishing = false;
    }
  }

  async publishPendingBatch(limit = BATCH): Promise<{ published: number; failed: number }> {
    if (!this.producer) {
      return { published: 0, failed: 0 };
    }
    const rows = await this.outbox.lockPending(limit);
    let published = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.producer.send({
          topic: row.topic,
          messages: [{ key: row.partitionKey, value: JSON.stringify(row.payload) }],
        });
        await this.outbox.markPublishedById(row.id);
        published += 1;
      } catch (error) {
        await this.outbox.markAttemptFailed(row.id, error);
        failed += 1;
      }
    }
    return { published, failed };
  }

  private async publishBatch(): Promise<void> {
    await this.publishPendingBatch(BATCH);
  }
}
