import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import type { OrderConfirmedEvent, PreparationStation } from '@einvoice/types';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from '../services/kitchen-events.publisher';
import { OrderConfirmedConsumer } from '../services/order-confirmed.consumer';
import { activeQueueKey, globalSlaDueKey, orderTicketsKey, ticketKey } from '../utils/kds-keys';

const RUN_INTEGRATION = process.env['RUN_PHASE5_KDS_DEDUPE_INTEGRATION'] === '1';
const TENANT_PREFIX = 'phase5-kds-dedupe';
const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

type Harness = {
  redis: Redis;
  consumer: OrderConfirmedConsumer;
};

type ReadinessResult = { ok: boolean; reason?: string };

maybeDescribe('Phase 5 P0-KDS-ORDER-CONFIRMED-DEDUPE Redis integration', () => {
  jest.setTimeout(30000);

  let harness: Harness | null = null;
  let currentTenantId: string | null = null;

  beforeAll(async () => {
    const readiness = await ensureExternalStackReady();
    if (!readiness.ok) {
      throw new Error(`[Phase 5 KDS dedupe integration not ready] ${readiness.reason}`);
    }
    harness = createHarness();
  });

  afterEach(async () => {
    if (harness && currentTenantId) {
      await cleanupTenantKdsKeys(harness.redis, currentTenantId);
    }
    currentTenantId = null;
  });

  afterAll(async () => {
    await harness?.redis.quit();
  });

  it('deduplicates duplicate and reissued order.confirmed delivery by tenant, order, and station', async () => {
    if (!harness) {
      throw new Error('Harness was not initialized');
    }

    currentTenantId = `${TENANT_PREFIX}-${randomUUID()}`;
    await cleanupTenantKdsKeys(harness.redis, currentTenantId);

    const event = orderConfirmedEvent({
      tenantId: currentTenantId,
      eventId: `evt-${randomUUID()}`,
      orderId: `order-${randomUUID()}`,
    });
    const reissuedEvent = { ...event, eventId: `evt-${randomUUID()}` };

    await harness.consumer.handleEvent(event);
    await harness.consumer.handleEvent(event);
    await harness.consumer.handleEvent(reissuedEvent);

    const tickets = await readOrderTickets(harness.redis, event.tenantId, event.orderId);

    expect(tickets).toHaveLength(2);
    expect(tickets.map((ticket) => ticket.station).sort()).toEqual(['BAR', 'KITCHEN']);
    expect(countTickets(tickets, event.orderId, 'KITCHEN')).toBeLessThanOrEqual(1);
    expect(countTickets(tickets, event.orderId, 'BAR')).toBeLessThanOrEqual(1);
    expect(await harness.redis.zrange(activeQueueKey(event.tenantId, 'KITCHEN'), 0, -1)).toEqual([
      `${event.orderId}:KITCHEN`,
    ]);
    expect(await harness.redis.zrange(activeQueueKey(event.tenantId, 'BAR'), 0, -1)).toEqual([`${event.orderId}:BAR`]);
  });
});

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1 to opt in' };
  }

  const redis = createRedis();
  try {
    await redis.ping();
  } catch (error) {
    await redis.disconnect();
    return { ok: false, reason: `Redis not ready: ${readinessMessage(error)}` };
  }
  await redis.quit();
  return { ok: true };
}

function createHarness(): Harness {
  const redis = createRedis();
  const redisClient = { getClient: () => redis } as unknown as RedisClientService;
  const repository = new KdsRedisRepository(redisClient);
  const publisher = new KitchenEventsPublisher(redisClient);
  const consumer = new OrderConfirmedConsumer(repository, publisher);

  return { redis, consumer };
}

function createRedis(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
    maxRetriesPerRequest: 3,
  });
}

function orderConfirmedEvent(overrides: Partial<OrderConfirmedEvent>): OrderConfirmedEvent {
  const orderId = overrides.orderId ?? `order-${randomUUID()}`;

  return {
    eventId: overrides.eventId ?? `evt-${randomUUID()}`,
    eventType: 'order.confirmed',
    schemaVersion: 1,
    tenantId: overrides.tenantId ?? `${TENANT_PREFIX}-${randomUUID()}`,
    orderId,
    sessionId: `session-${randomUUID()}`,
    tableId: `table-${randomUUID()}`,
    tableName: 'Phase 5 KDS Table',
    totalAmount: 200000,
    confirmedAt: '2026-05-07T10:00:00.000Z',
    confirmedByUserId: 'phase5-staff',
    occurredAt: '2026-05-07T10:00:01.000Z',
    correlationId: `corr-${randomUUID()}`,
    items: [
      {
        id: `item-${randomUUID()}`,
        orderId,
        menuItemId: 'menu-kitchen',
        menuItemName: 'Phase 5 Pho',
        quantity: 1,
        unitPrice: 120000,
        status: 'PROCESSING',
        station: 'KITCHEN',
        createdAt: '2026-05-07T09:59:00.000Z',
        updatedAt: '2026-05-07T10:00:00.000Z',
      },
      {
        id: `item-${randomUUID()}`,
        orderId,
        menuItemId: 'menu-bar',
        menuItemName: 'Phase 5 Coffee',
        quantity: 1,
        unitPrice: 80000,
        status: 'PROCESSING',
        station: 'BAR',
        createdAt: '2026-05-07T09:59:00.000Z',
        updatedAt: '2026-05-07T10:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

async function readOrderTickets(
  redis: Redis,
  tenantId: string,
  orderId: string,
): Promise<Array<{ ticketId: string; orderId: string; station: string }>> {
  const ticketIds = await redis.smembers(orderTicketsKey(tenantId, orderId));
  const tickets = await Promise.all(
    ticketIds.map(async (ticketId) => {
      const hash = await redis.hgetall(ticketKey(tenantId, ticketId));
      return {
        ticketId,
        orderId: hash.orderId,
        station: hash.station,
      };
    }),
  );

  return tickets.filter((ticket) => ticket.orderId && ticket.station);
}

function countTickets(
  tickets: Array<{ orderId: string; station: string }>,
  orderId: string,
  station: PreparationStation,
): number {
  return tickets.filter((ticket) => ticket.orderId === orderId && ticket.station === station).length;
}

async function cleanupTenantKdsKeys(redis: Redis, tenantId: string): Promise<void> {
  const keys = await scanKeys(redis, `kds:${tenantId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  const slaMembers = await redis.zrange(globalSlaDueKey(), 0, -1);
  const tenantSlaMembers = slaMembers.filter((member) => member.startsWith(`${tenantId}|`));
  if (tenantSlaMembers.length > 0) {
    await redis.zrem(globalSlaDueKey(), ...tenantSlaMembers);
  }
}

async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  let cursor = '0';
  const keys: string[] = [];

  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  return keys;
}

function readinessMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
