import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { RequestType } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { BillPaymentSnapshotTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { BillPaymentSnapshotTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { Kafka, type Consumer } from 'kafkajs';
import type { KitchenSlaWarningEvent } from '@einvoice/types';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { CONFIGURATION } from '../../../../configuration';
import { RealtimeEventsService } from './realtime-events.service';

type PaymentCompletedKafkaEvent = {
  eventId: string;
  eventType: 'payment.completed';
  tenantId: string;
  billId: string;
  paymentId: string;
  method: string;
  amount: number;
  paidAt: string;
  correlationId?: string;
};

@Injectable()
export class RealtimeKafkaBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeKafkaBridgeService.name);
  private consumer?: Consumer;

  constructor(
    private readonly realtime: RealtimeEventsService,
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
  ) {}

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
    await consumer.subscribe({ topic: kafkaConfig.PAYMENT_COMPLETED_TOPIC, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const raw = message.value?.toString();
          if (!raw) {
            return;
          }
          const event = JSON.parse(raw) as { eventType?: string };
          if (event.eventType === 'kitchen.sla_warning') {
            this.realtime.emitKitchenSlaWarning(event as KitchenSlaWarningEvent);
            return;
          }
          if (event.eventType === 'payment.completed') {
            await this.emitPaymentCompleted(event as PaymentCompletedKafkaEvent);
          }
        } catch (e) {
          this.logger.warn(`Kafka bridge parse error: ${(e as Error).message}`);
        }
      },
    });

    this.logger.log(
      `Kafka consumer running on topics ${kafkaConfig.KITCHEN_SLA_WARNING_TOPIC}, ${kafkaConfig.PAYMENT_COMPLETED_TOPIC}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect().catch(() => undefined);
  }

  private async emitPaymentCompleted(event: PaymentCompletedKafkaEvent): Promise<void> {
    const req: RequestType<BillPaymentSnapshotTcpRequest> = {
      tenantId: event.tenantId,
      processId: event.correlationId,
      data: { tenantId: event.tenantId, billId: event.billId },
    };
    const snapshot = await firstValueFrom(
      this.orderClient
        .send<
          BillPaymentSnapshotTcpResponse,
          BillPaymentSnapshotTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT, req)
        .pipe(map((r) => r)),
    );
    const sessionId = snapshot.data?.sessionId;
    if (!sessionId) {
      this.logger.warn(`payment.completed bridge missing sessionId billId=${event.billId}`);
      return;
    }
    this.realtime.emitPaymentCompleted({
      eventId: event.eventId,
      eventType: 'payment.completed',
      tenantId: event.tenantId,
      sessionId,
      billId: event.billId,
      paymentId: event.paymentId,
      method: event.method === 'CASH' ? 'CASH' : 'VIETQR',
      status: 'PAID',
      paidAt: event.paidAt,
      amount: event.amount,
      correlationId: event.correlationId,
    });
  }
}
