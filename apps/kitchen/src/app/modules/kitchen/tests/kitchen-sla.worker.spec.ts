import { CONFIGURATION } from '../../../../configuration';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from '../services/kitchen-events.publisher';
import { KitchenSlaWorker, parseGlobalSlaDueMember, slaDayBucketUtc } from '../services/kitchen-sla.worker';
import { globalSlaDueKey, slaDedupeKey, ticketKey } from '../utils/kds-keys';
import { FakeRedis, redisService } from './fake-redis';
import type { OrderConfirmedEvent } from '@einvoice/types';

function confirmedEvent(orderId: string, confirmedAt: string): OrderConfirmedEvent {
  return {
    eventId: `evt-${orderId}`,
    eventType: 'order.confirmed',
    schemaVersion: 1,
    tenantId: 'tenant-a',
    orderId,
    sessionId: 'session-1',
    tableId: 'table-1',
    tableName: 'A1',
    totalAmount: 100,
    confirmedAt,
    confirmedByUserId: 'staff-1',
    occurredAt: confirmedAt,
    items: [
      {
        id: `${orderId}-item`,
        orderId,
        menuItemId: `menu-${orderId}`,
        menuItemName: 'Phở',
        quantity: 1,
        unitPrice: 100,
        status: 'PROCESSING',
        station: 'KITCHEN',
        createdAt: confirmedAt,
        updatedAt: confirmedAt,
      },
    ],
  };
}

describe('KitchenSlaWorker', () => {
  function setup() {
    const redis = new FakeRedis();
    const repository = new KdsRedisRepository(redisService(redis) as never);
    const publisher = new KitchenEventsPublisher(redisService(redis) as never);
    const kafka = {
      publishSlaWarning: jest.fn().mockResolvedValue(true),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
    };
    const worker = new KitchenSlaWorker(repository, kafka as never, publisher);
    return { redis, repository, publisher, kafka, worker };
  }

  it('emits kafka kitchen.sla_warning and SLA_CHANGED for a due WARNING member', async () => {
    const { redis, repository, kafka, worker } = setup();
    await repository.createTicketsFromConfirmedOrder(confirmedEvent('order-1', '2026-05-07T10:00:00.000Z'));
    redis.published.length = 0;

    const nowMs = Date.parse('2026-05-07T10:15:30.000Z');
    await worker.runTick(nowMs);

    expect(kafka.publishSlaWarning).toHaveBeenCalledTimes(1);
    const payload = kafka.publishSlaWarning.mock.calls[0][0];
    expect(payload.eventType).toBe('kitchen.sla_warning');
    expect(payload.level).toBe('WARNING');
    expect(payload.thresholdSeconds).toBe(CONFIGURATION.KDS_CONFIG.DEFAULT_SLA_SECONDS);

    expect(redis.published).toHaveLength(1);
    const internal = JSON.parse(redis.published[0].payload);
    expect(internal.reason).toBe('SLA_CHANGED');
    expect(internal.eventType).toBe('kds.queue_changed');

    const warningMember = `tenant-a|KITCHEN|order-1:KITCHEN|WARNING`;
    expect(await redis.zrange(globalSlaDueKey(), 0, -1)).not.toContain(warningMember);
  });

  it('uses slaSeconds + breach grace for BREACH thresholdSeconds', async () => {
    const { repository, kafka, worker } = setup();
    await repository.createTicketsFromConfirmedOrder(confirmedEvent('order-breach', '2026-05-07T10:00:00.000Z'));

    const nowMs = Date.parse('2026-05-07T11:00:00.000Z');
    await worker.runTick(nowMs);

    expect(kafka.publishSlaWarning).toHaveBeenCalled();
    const breachCall = kafka.publishSlaWarning.mock.calls.map((c) => c[0]).find((p) => p.level === 'BREACH');
    expect(breachCall).toBeDefined();
    expect(breachCall.thresholdSeconds).toBe(
      CONFIGURATION.KDS_CONFIG.DEFAULT_SLA_SECONDS + CONFIGURATION.KDS_CONFIG.BREACH_GRACE_SECONDS,
    );
  });

  it('does not emit duplicate kafka when dedupe key already exists for bucket', async () => {
    const { redis, repository, kafka, worker } = setup();
    await repository.createTicketsFromConfirmedOrder(confirmedEvent('order-dedupe', '2026-05-07T10:00:00.000Z'));

    const nowMs = Date.parse('2026-05-07T10:15:30.000Z');
    const bucket = slaDayBucketUtc(nowMs);
    await redis.set(slaDedupeKey('tenant-a', 'order-dedupe:KITCHEN', 'WARNING', bucket), '1');

    await worker.runTick(nowMs);

    expect(kafka.publishSlaWarning).not.toHaveBeenCalled();
    const warningMember = `tenant-a|KITCHEN|order-dedupe:KITCHEN|WARNING`;
    expect(await redis.zrange(globalSlaDueKey(), 0, -1)).not.toContain(warningMember);
  });

  it('skips READY tickets and removes due member without kafka', async () => {
    const { redis, repository, kafka, worker } = setup();
    await repository.createTicketsFromConfirmedOrder(confirmedEvent('order-ready', '2026-05-07T10:00:00.000Z'));
    await repository.startTicket({
      tenantId: 'tenant-a',
      ticketId: 'order-ready:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef',
      requestId: 'start-1',
    });
    await repository.markReady({
      tenantId: 'tenant-a',
      ticketId: 'order-ready:KITCHEN',
      station: 'KITCHEN',
      userId: 'chef',
      requestId: 'ready-1',
    });
    kafka.publishSlaWarning.mockClear();

    const nowMs = Date.parse('2026-05-07T10:40:00.000Z');
    await worker.runTick(nowMs);

    expect(kafka.publishSlaWarning).not.toHaveBeenCalled();
    expect(await redis.zrange(globalSlaDueKey(), 0, -1)).toHaveLength(0);
  });

  it('skips VOIDED tickets', async () => {
    const { redis, repository, kafka, worker } = setup();
    await repository.createTicketsFromConfirmedOrder(confirmedEvent('order-void', '2026-05-07T10:00:00.000Z'));
    await repository.voidByOrder({
      tenantId: 'tenant-a',
      orderId: 'order-void',
      reason: 'ORDER_CANCELED',
    });
    kafka.publishSlaWarning.mockClear();

    const nowMs = Date.parse('2026-05-07T10:40:00.000Z');
    await worker.runTick(nowMs);

    expect(kafka.publishSlaWarning).not.toHaveBeenCalled();
    expect(await redis.zrange(globalSlaDueKey(), 0, -1)).toHaveLength(0);
  });

  it('skips ARCHIVED tickets', async () => {
    const { redis, repository, kafka, worker } = setup();
    await repository.createTicketsFromConfirmedOrder(confirmedEvent('order-arch', '2026-05-07T10:00:00.000Z'));
    await redis.hset(ticketKey('tenant-a', 'order-arch:KITCHEN'), {
      status: 'ARCHIVED',
    });
    kafka.publishSlaWarning.mockClear();

    const nowMs = Date.parse('2026-05-07T10:40:00.000Z');
    await worker.runTick(nowMs);

    expect(kafka.publishSlaWarning).not.toHaveBeenCalled();
  });

  it('parses global SLA member tokens', () => {
    expect(parseGlobalSlaDueMember('tenant-a|KITCHEN|order-1:KITCHEN|WARNING')).toEqual({
      tenantId: 'tenant-a',
      station: 'KITCHEN',
      ticketId: 'order-1:KITCHEN',
      level: 'WARNING',
    });
    expect(parseGlobalSlaDueMember('bad')).toBeNull();
  });
});
