import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { CONFIGURATION } from '../../../../configuration';
import { PaymentOutboxRepository } from '../repositories/payment-outbox.repository';

const POLL_MS = 2000;
const BATCH = 25;

@Injectable()
export class PaymentOutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentOutboxPublisherService.name);
  private producer: ReturnType<Kafka['producer']> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private publishing = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly outbox: PaymentOutboxRepository) {}

  async onModuleInit(): Promise<void> {
    await this.initializeProducerAndPolling();
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
    const { BROKERS, PAYMENT_CLIENT_ID } = CONFIGURATION.KAFKA_CONFIG;
    if (!BROKERS?.length) {
      this.logger.warn('Kafka brokers empty; payment outbox publisher will not run');
      return;
    }
    if (this.producer) {
      return;
    }
    const kafka = new Kafka({ clientId: PAYMENT_CLIENT_ID, brokers: BROKERS });
    this.producer = kafka.producer();
    try {
      await this.producer.connect();
    } catch (e) {
      this.logger.error(`Kafka producer connect failed: ${(e as Error).message}`);
      await this.producer.disconnect().catch(() => undefined);
      this.producer = null;
      this.scheduleProducerReconnect();
      return;
    }
    if (!this.timer) {
      this.timer = setInterval(() => void this.publishBatchSafe(), POLL_MS);
    }
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

  private async publishBatchSafe(): Promise<void> {
    if (this.publishing) {
      return;
    }
    this.publishing = true;
    try {
      await this.publishBatch();
    } catch (e) {
      this.logger.warn(`Payment outbox poll error: ${(e as Error).message}`);
    } finally {
      this.publishing = false;
    }
  }

  private async publishBatch(): Promise<void> {
    if (!this.producer) {
      return;
    }
    const rows = await this.outbox.findPendingRows(BATCH);
    for (const row of rows) {
      try {
        await this.producer.send({
          topic: row.topic,
          messages: [{ key: row.partitionKey, value: JSON.stringify(row.payload) }],
        });
        await this.outbox.markPublished(row.id, row.tenantId);
      } catch (err) {
        await this.outbox.recordSendFailure(row.id, row.tenantId, (err as Error).message);
      }
    }
  }
}
