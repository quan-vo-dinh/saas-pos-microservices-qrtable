jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../../../../configuration', () => ({
  CONFIGURATION: {
    KAFKA_CONFIG: {
      BFF_CLIENT_ID: 'test-bff',
      BROKERS: ['localhost:29092'],
      BFF_CONSUMER_GROUP: 'test-group',
      KITCHEN_SLA_WARNING_TOPIC: 'kitchen.sla_warning',
      PAYMENT_COMPLETED_TOPIC: 'payment.completed',
    },
  },
}));

const mockConnect = jest.fn();
const mockSubscribe = jest.fn();
const mockRun = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn(() => ({
      connect: mockConnect,
      subscribe: mockSubscribe,
      run: mockRun,
      disconnect: mockDisconnect,
    })),
  })),
}));

import { of } from 'rxjs';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RealtimeEventsService } from '../services/realtime-events.service';
import { RealtimeKafkaBridgeService } from '../services/realtime-kafka-bridge.service';

describe('RealtimeKafkaBridgeService', () => {
  let eachMessage: (args: { message: { value: Buffer | null } }) => Promise<void>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRun.mockImplementation(({ eachMessage: fn }: { eachMessage: typeof eachMessage }) => {
      eachMessage = fn;
    });
  });

  it('consumes payment.completed, enriches sessionId from Order, emits paymentCompleted', async () => {
    const emitPaymentCompleted = jest.fn();
    const emitKitchenSlaWarning = jest.fn();
    const realtime = {
      emitPaymentCompleted,
      emitKitchenSlaWarning,
    } as unknown as RealtimeEventsService;

    const orderClient = {
      send: jest.fn().mockReturnValue(
        of({
          statusCode: 200,
          data: {
            billId: 'bill-1',
            tenantId: 't1',
            sessionId: 'sess-1',
            status: 'PAID',
            rawTotal: 127500,
            roundedTotal: 128000,
            roundingDelta: 500,
          },
        }),
      ),
    };

    const service = new RealtimeKafkaBridgeService(realtime, orderClient as never);
    await service.onModuleInit();

    const payload = {
      eventId: 'event-1',
      eventType: 'payment.completed',
      tenantId: 't1',
      billId: 'bill-1',
      paymentId: 'pay-1',
      method: 'VIETQR',
      amount: 128000,
      paidAt: '2026-05-08T12:00:00.000Z',
      correlationId: 'proc-1',
    };

    await eachMessage({ message: { value: Buffer.from(JSON.stringify(payload)) } });

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT,
      expect.objectContaining({
        tenantId: 't1',
        processId: 'proc-1',
        data: { tenantId: 't1', billId: 'bill-1' },
      }),
    );
    expect(emitPaymentCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        sessionId: 'sess-1',
        billId: 'bill-1',
        paymentId: 'pay-1',
        status: 'PAID',
      }),
    );
  });

  it('does not emit when Order snapshot has no sessionId', async () => {
    const emitPaymentCompleted = jest.fn();
    const realtime = {
      emitPaymentCompleted,
      emitKitchenSlaWarning: jest.fn(),
    } as unknown as RealtimeEventsService;

    const orderClient = {
      send: jest.fn().mockReturnValue(of({ statusCode: 200, data: undefined })),
    };

    const service = new RealtimeKafkaBridgeService(realtime, orderClient as never);
    await service.onModuleInit();

    await eachMessage({
      message: {
        value: Buffer.from(
          JSON.stringify({
            eventId: 'event-1',
            eventType: 'payment.completed',
            tenantId: 't1',
            billId: 'bill-1',
            paymentId: 'pay-1',
            method: 'VIETQR',
            amount: 128000,
            paidAt: '2026-05-08T12:00:00.000Z',
          }),
        ),
      },
    });

    expect(emitPaymentCompleted).not.toHaveBeenCalled();
  });

  it('forwards kitchen.sla_warning to realtime', async () => {
    const emitKitchenSlaWarning = jest.fn();
    const realtime = {
      emitPaymentCompleted: jest.fn(),
      emitKitchenSlaWarning,
    } as unknown as RealtimeEventsService;

    const orderClient = { send: jest.fn() };

    const service = new RealtimeKafkaBridgeService(realtime, orderClient as never);
    await service.onModuleInit();

    const slaPayload = {
      eventType: 'kitchen.sla_warning',
      tenantId: 't1',
      station: 'KITCHEN',
      ticketId: 'tick-1',
      orderId: 'ord-1',
      occurredAt: '2026-05-08T12:00:00.000Z',
    };

    await eachMessage({ message: { value: Buffer.from(JSON.stringify(slaPayload)) } });

    expect(emitKitchenSlaWarning).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't1' }));
    expect(orderClient.send).not.toHaveBeenCalled();
  });
});
