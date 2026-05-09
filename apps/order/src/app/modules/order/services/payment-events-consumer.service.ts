import type { BillMarkPaidTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { CONFIGURATION } from '../../../../configuration';
import { BillService } from './bill.service';

export type PaymentCompletedKafkaEvent = {
  eventId: string;
  eventType: 'payment.completed';
  tenantId: string;
  billId: string;
  paymentId: string;
  /** Actual received (VietQR) or rounded total (cash) — spec §8.1 */
  amount: number;
  method: 'CASH' | 'VIETQR';
  paidAt: string;
  correlationId?: string;
};

export function safePaymentMethod(value: unknown): 'CASH' | 'VIETQR' | null {
  return value === 'CASH' || value === 'VIETQR' ? value : null;
}

/** Parse and validate a Kafka message body; returns null if JSON, shape, or method is invalid. */
export function parsePaymentCompletedEvent(raw: string): PaymentCompletedKafkaEvent | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const o = parsed as Record<string, unknown>;
  if (o.eventType !== 'payment.completed') {
    return null;
  }
  const eventId = typeof o.eventId === 'string' ? o.eventId : '';
  const tenantId = typeof o.tenantId === 'string' ? o.tenantId : '';
  const billId = typeof o.billId === 'string' ? o.billId : '';
  const paymentId = typeof o.paymentId === 'string' ? o.paymentId : '';
  const paidAt = typeof o.paidAt === 'string' ? o.paidAt : '';
  const method = safePaymentMethod(o.method);
  const amount = typeof o.amount === 'number' && Number.isFinite(o.amount) ? o.amount : NaN;
  if (!eventId || !tenantId || !billId || !paymentId || !paidAt || !method || Number.isNaN(amount)) {
    return null;
  }
  const correlationId = typeof o.correlationId === 'string' ? o.correlationId : undefined;
  return {
    eventId,
    eventType: 'payment.completed',
    tenantId,
    billId,
    paymentId,
    amount,
    method,
    paidAt,
    correlationId,
  };
}

export function paymentCompletedToMarkPaidRequest(event: PaymentCompletedKafkaEvent): BillMarkPaidTcpRequest {
  return {
    tenantId: event.tenantId,
    billId: event.billId,
    paymentId: event.paymentId,
    method: event.method,
    paidAt: event.paidAt,
    processId: event.correlationId,
  };
}

@Injectable()
export class PaymentEventsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentEventsConsumerService.name);
  private consumer: Consumer | null = null;

  constructor(private readonly billService: BillService) {}

  /**
   * Parses a Kafka message body and runs Order finalization. Returns whether a valid
   * `payment.completed` event was applied (false = invalid payload, same as consumer skip).
   */
  async dispatchPaymentCompletedPayload(raw: string): Promise<boolean> {
    const event = parsePaymentCompletedEvent(raw);
    if (!event) {
      return false;
    }
    await this.billService.markPaid(paymentCompletedToMarkPaidRequest(event));
    return true;
  }

  async onModuleInit(): Promise<void> {
    const { BROKERS, CLIENT_ID, PAYMENT_COMPLETED_TOPIC } = CONFIGURATION.KAFKA_CONFIG;
    if (!BROKERS?.length) {
      this.logger.warn('Kafka brokers empty; payment consumer will not run');
      return;
    }
    const groupId = process.env['KAFKA_ORDER_PAYMENT_CONSUMER_GROUP'] ?? 'order-payment-consumer-group';
    const kafka = new Kafka({ clientId: `${CLIENT_ID}-payment-consumer`, brokers: BROKERS });
    this.consumer = kafka.consumer({ groupId });

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: PAYMENT_COMPLETED_TOPIC, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({ message, topic, partition }) => {
          const raw = message.value?.toString();
          if (!raw) {
            this.logger.warn(
              `Empty payment.completed message topic=${topic} partition=${partition} offset=${message.offset}`,
            );
            return;
          }
          try {
            const applied = await this.dispatchPaymentCompletedPayload(raw);
            if (!applied) {
              this.logger.warn(
                `Invalid or non-payment.completed payload topic=${topic} partition=${partition} offset=${message.offset} preview=${raw.slice(0, 240)}`,
              );
            }
          } catch (error) {
            const err = error as Error;
            const preview = parsePaymentCompletedEvent(raw);
            const eventId = preview?.eventId ?? 'unknown';
            const billId = preview?.billId ?? 'unknown';
            this.logger.error(
              `markPaid failed after payment.completed eventId=${eventId} billId=${billId}: ${err.message}`,
              err.stack,
            );
            throw error;
          }
        },
      });
    } catch (error) {
      this.logger.error(`Kafka payment.completed consumer failed: ${(error as Error).message}`);
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
}
