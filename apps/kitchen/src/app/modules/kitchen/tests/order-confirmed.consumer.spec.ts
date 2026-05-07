import { OrderConfirmedConsumer } from '../services/order-confirmed.consumer';
import { KitchenEventsPublisher } from '../services/kitchen-events.publisher';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { activeQueueKey, deadLetterOrderConfirmedKey, ticketKey } from '../utils/kds-keys';
import { FakeRedis, redisService } from './fake-redis';
import type { OrderConfirmedEvent } from '@einvoice/types';

function event(overrides: Partial<OrderConfirmedEvent> = {}): OrderConfirmedEvent {
  return {
    eventId: 'evt-1',
    eventType: 'order.confirmed',
    schemaVersion: 1,
    tenantId: 'tenant-a',
    orderId: 'order-1',
    sessionId: 'session-1',
    tableId: 'table-1',
    tableName: 'A1',
    totalAmount: 100,
    confirmedAt: '2026-05-07T10:00:00.000Z',
    confirmedByUserId: 'staff-1',
    occurredAt: '2026-05-07T10:00:01.000Z',
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        menuItemId: 'menu-1',
        menuItemName: 'Pho',
        quantity: 1,
        unitPrice: 100,
        status: 'PROCESSING',
        station: 'KITCHEN',
        createdAt: '2026-05-07T09:59:00.000Z',
        updatedAt: '2026-05-07T10:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('OrderConfirmedConsumer', () => {
  function setup() {
    const redis = new FakeRedis();
    const repository = new KdsRedisRepository(redisService(redis) as never);
    const publisher = new KitchenEventsPublisher(redisService(redis) as never);
    const consumer = new OrderConfirmedConsumer(repository, publisher);
    return { redis, consumer };
  }

  it('creates a kitchen ticket from order.confirmed and publishes after Redis writes', async () => {
    const { redis, consumer } = setup();

    await consumer.handleEvent(event());

    expect(await redis.zrange(activeQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual(['order-1:KITCHEN']);
    expect((await redis.hgetall(ticketKey('tenant-a', 'order-1:KITCHEN'))).status).toBe('PENDING');
    expect(redis.published).toHaveLength(1);
    expect(redis.published[0].channel).toBe('realtime:kds:tenant-a');
    expect(JSON.parse(redis.published[0].payload)).toMatchObject({
      eventType: 'kds.queue_changed',
      reason: 'TICKET_CREATED',
      ticketId: 'order-1:KITCHEN',
    });
  });

  it('splits one order into one ticket per station', async () => {
    const { redis, consumer } = setup();

    await consumer.handleEvent(
      event({
        items: [
          ...event().items,
          {
            id: 'item-2',
            orderId: 'order-1',
            menuItemId: 'menu-2',
            menuItemName: 'Coffee',
            quantity: 1,
            unitPrice: 50,
            status: 'PROCESSING',
            station: 'BAR',
            createdAt: '2026-05-07T09:59:00.000Z',
            updatedAt: '2026-05-07T10:00:00.000Z',
          },
        ],
      }),
    );

    expect(await redis.zrange(activeQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual(['order-1:KITCHEN']);
    expect(await redis.zrange(activeQueueKey('tenant-a', 'BAR'), 0, -1)).toEqual(['order-1:BAR']);
    expect(redis.published).toHaveLength(2);
  });

  it('dedupes by eventId and by order station identity', async () => {
    const { redis, consumer } = setup();

    await consumer.handleEvent(event());
    await consumer.handleEvent(event());
    await consumer.handleEvent(event({ eventId: 'evt-2' }));

    expect(await redis.zrange(activeQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual(['order-1:KITCHEN']);
    expect(redis.published).toHaveLength(1);
  });

  it('dead-letters items missing station without creating a ticket', async () => {
    const { redis, consumer } = setup();

    await consumer.handleEvent(
      event({
        items: [
          {
            ...event().items[0],
            station: undefined,
          },
        ],
      }),
    );

    expect(await redis.zrange(activeQueueKey('tenant-a', 'KITCHEN'), 0, -1)).toEqual([]);
    expect(redis.lists.get(deadLetterOrderConfirmedKey('tenant-a'))).toHaveLength(1);
    expect(redis.published).toHaveLength(0);
  });

  it('does not write forbidden grouped-prep keys or fields', async () => {
    const { redis, consumer } = setup();

    await consumer.handleEvent(event());

    const writtenKeys = [
      ...redis.hashes.keys(),
      ...redis.sets.keys(),
      ...redis.sortedSets.keys(),
      ...redis.strings.keys(),
    ].join('\n');
    const writtenFields = [...redis.hashes.values()].flatMap((hash) => Object.keys(hash)).join('\n');

    expect(`${writtenKeys}\n${writtenFields}`).not.toMatch(
      /prepSignature|activeQuantity|batchId|batchTotal|batchQuantity|batch/,
    );
  });
});
