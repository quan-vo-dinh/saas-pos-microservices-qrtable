import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { OrderConfirmedEvent } from '@einvoice/types';
import { Consumer, Kafka } from 'kafkajs';
import { CONFIGURATION } from '../../../../configuration';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from './kitchen-events.publisher';

@Injectable()
export class OrderConfirmedConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderConfirmedConsumer.name);
  private consumer: Consumer | null = null;

  constructor(
    private readonly repository: KdsRedisRepository,
    private readonly eventsPublisher: KitchenEventsPublisher,
  ) {}

  async onModuleInit(): Promise<void> {
    const { BROKERS, KITCHEN_CLIENT_ID, KITCHEN_CONSUMER_GROUP, ORDER_CONFIRMED_TOPIC } = CONFIGURATION.KAFKA_CONFIG;
    if (!BROKERS?.length) {
      this.logger.warn('Kafka brokers empty; order.confirmed consumer will not run');
      return;
    }

    const kafka = new Kafka({ clientId: KITCHEN_CLIENT_ID, brokers: BROKERS });
    this.consumer = kafka.consumer({ groupId: KITCHEN_CONSUMER_GROUP });

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: ORDER_CONFIRMED_TOPIC, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({ message }) => {
          const raw = message.value?.toString();
          if (!raw) {
            return;
          }
          await this.handleRawMessage(raw);
        },
      });
    } catch (error) {
      this.logger.error(`Kafka order.confirmed consumer failed: ${(error as Error).message}`);
      await this.consumer.disconnect().catch(() => undefined);
      this.consumer = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect().catch(() => undefined);
      this.consumer = null;
    }
  }

  async handleRawMessage(raw: string): Promise<void> {
    let event: unknown;
    try {
      event = JSON.parse(raw);
    } catch {
      this.logger.warn('Ignoring malformed order.confirmed payload');
      return;
    }
    await this.handleEvent(event);
  }

  async handleEvent(event: unknown): Promise<void> {
    if (!this.isOrderConfirmedEvent(event)) {
      this.logger.warn('Ignoring invalid order.confirmed payload');
      return;
    }

    const events = await this.repository.createTicketsFromConfirmedOrder(event);
    await this.eventsPublisher.publishMany(events);
  }

  private isOrderConfirmedEvent(value: unknown): value is OrderConfirmedEvent {
    const event = value as Partial<OrderConfirmedEvent>;
    return (
      event?.eventType === 'order.confirmed' &&
      event.schemaVersion === 1 &&
      Boolean(event.eventId) &&
      Boolean(event.tenantId) &&
      Boolean(event.orderId) &&
      Boolean(event.sessionId) &&
      Boolean(event.tableId) &&
      Boolean(event.tableName) &&
      Array.isArray(event.items) &&
      Boolean(event.confirmedAt) &&
      Boolean(event.confirmedByUserId) &&
      Boolean(event.occurredAt)
    );
  }
}
