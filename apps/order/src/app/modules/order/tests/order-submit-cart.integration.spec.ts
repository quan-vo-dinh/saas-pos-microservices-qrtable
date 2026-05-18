import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { Session } from '@common/entities/session.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { OrderStatus, SessionStatus } from '@einvoice/types';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { of } from 'rxjs';
import { DataSource } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from '../services/cart.service';
import { OrderQuotaService } from '../services/order-quota.service';
import { OrderService } from '../services/order.service';
import { SessionService } from '../services/session.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_ORDER_SUBMIT_INTEGRATION'] === '1';
const TENANT_PREFIX = 'phase5-submit';
const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

type Harness = {
  dataSource: DataSource;
  redis: Redis;
  cartService: CartService;
  orderService: OrderService;
};

type SeedRows = {
  tenantId: string;
  sessionId: string;
  tableId: string;
  menuItemId: string;
};

maybeDescribe('Phase 5 P0 order cart/version submit integration', () => {
  jest.setTimeout(30000);

  let harness: Harness | null = null;
  let currentSeed: SeedRows | null = null;

  beforeAll(async () => {
    harness = await createHarness();
  });

  afterEach(async () => {
    if (harness && currentSeed) {
      await cleanupSeed(harness, currentSeed);
    }
    currentSeed = null;
  });

  afterAll(async () => {
    if (harness?.dataSource.isInitialized) {
      await harness.dataSource.destroy();
    }
    await harness?.redis.quit();
  });

  it('allows only one concurrent cart mutation for the same expected cartVersion', async () => {
    const ready = await ensureReady();
    if (!ready.ok) {
      throw new Error(`[Phase 5 order submit integration not ready] ${ready.reason}`);
    }
    if (!harness) {
      throw new Error('Harness was not initialized');
    }
    currentSeed = await seedSessionWithCart(harness, `${TENANT_PREFIX}-cart-${randomUUID()}`);

    const results = await Promise.allSettled([
      harness.cartService.mutate({
        tenantId: currentSeed.tenantId,
        sessionId: currentSeed.sessionId,
        expectedCartVersion: 1,
        operation: 'SET_QUANTITY',
        cartLineId: 'line-1',
        quantity: 2,
      }),
      harness.cartService.mutate({
        tenantId: currentSeed.tenantId,
        sessionId: currentSeed.sessionId,
        expectedCartVersion: 1,
        operation: 'UPDATE_NOTE',
        cartLineId: 'line-1',
        note: 'no onion',
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(readErrorCode(rejected[0].reason)).toBe(ErrorCode.CART_VERSION_CONFLICT);

    const finalCart = await harness.cartService.getSnapshot(currentSeed.tenantId, currentSeed.sessionId);
    expect(finalCart.cartVersion).toBe(2);
    expect(finalCart.items).toHaveLength(1);
  });

  it('deduplicates concurrent submit by idempotency key, clears cart once, and never persists DRAFT', async () => {
    const ready = await ensureReady();
    if (!ready.ok) {
      throw new Error(`[Phase 5 order submit integration not ready] ${ready.reason}`);
    }
    if (!harness) {
      throw new Error('Harness was not initialized');
    }
    currentSeed = await seedSessionWithCart(harness, `${TENANT_PREFIX}-idem-${randomUUID()}`);
    const idempotencyKey = `idem-${randomUUID()}`;

    const results = await Promise.allSettled([
      harness.orderService.submitOrder({
        tenantId: currentSeed.tenantId,
        sessionId: currentSeed.sessionId,
        expectedCartVersion: 1,
        idempotencyKey,
      }),
      harness.orderService.submitOrder({
        tenantId: currentSeed.tenantId,
        sessionId: currentSeed.sessionId,
        expectedCartVersion: 1,
        idempotencyKey,
      }),
    ]);

    expect(results).toEqual([
      expect.objectContaining({ status: 'fulfilled' }),
      expect.objectContaining({ status: 'fulfilled' }),
    ]);

    const orders = await harness.dataSource.getRepository(Order).findBy({
      tenantId: currentSeed.tenantId,
      sessionId: currentSeed.sessionId,
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ status: OrderStatus.PENDING, idempotencyKey });
    expect(orders.some((order) => order.status === OrderStatus.DRAFT)).toBe(false);

    const items = await harness.dataSource.getRepository(OrderItem).findBy({
      tenantId: currentSeed.tenantId,
      orderId: orders[0].id,
    });
    expect(items).toHaveLength(1);

    const finalCart = await harness.cartService.getSnapshot(currentSeed.tenantId, currentSeed.sessionId);
    expect(finalCart.cartVersion).toBe(2);
    expect(finalCart.items).toEqual([]);
  });

  it('rejects concurrent submit with stale cartVersion before a second order is persisted', async () => {
    const ready = await ensureReady();
    if (!ready.ok) {
      throw new Error(`[Phase 5 order submit integration not ready] ${ready.reason}`);
    }
    if (!harness) {
      throw new Error('Harness was not initialized');
    }
    currentSeed = await seedSessionWithCart(harness, `${TENANT_PREFIX}-stale-${randomUUID()}`);

    const results = await Promise.allSettled([
      harness.orderService.submitOrder({
        tenantId: currentSeed.tenantId,
        sessionId: currentSeed.sessionId,
        expectedCartVersion: 1,
        idempotencyKey: `idem-a-${randomUUID()}`,
      }),
      harness.orderService.submitOrder({
        tenantId: currentSeed.tenantId,
        sessionId: currentSeed.sessionId,
        expectedCartVersion: 1,
        idempotencyKey: `idem-b-${randomUUID()}`,
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(readErrorCode(rejected[0].reason)).toBe(ErrorCode.CART_VERSION_CONFLICT);

    const orders = await harness.dataSource.getRepository(Order).findBy({
      tenantId: currentSeed.tenantId,
      sessionId: currentSeed.sessionId,
    });
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe(OrderStatus.PENDING);
  });
});

async function ensureReady(): Promise<{ ok: boolean; reason?: string }> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_ORDER_SUBMIT_INTEGRATION=1 to opt in' };
  }
  try {
    const probe = await createDataSource();
    await probe.query('SELECT 1');
    await probe.destroy();
  } catch (error) {
    return { ok: false, reason: `PostgreSQL not ready: ${readinessMessage(error)}` };
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

async function createHarness(): Promise<Harness> {
  const dataSource = await createDataSource();
  const redis = createRedis();
  const redisClient = { getClient: () => redis } as unknown as RedisClientService;
  const sessionRepository = new SessionRepository(dataSource.getRepository(Session));
  const sessionService = new SessionService(redisClient, sessionRepository);
  const catalogClient = { send: jest.fn(), emit: jest.fn() } as unknown as TcpClient;
  const saasClient = {
    send: jest.fn(() =>
      of({
        statusCode: 200,
        data: {
          tenant: { id: 'phase5', name: 'Phase 5', slug: 'phase5', status: 'ACTIVE' },
          current: {
            planCode: 'PHASE5',
            planName: 'Phase 5',
            status: SubscriptionStatus.ACTIVE,
            expiresAt: null,
            billingPeriod: 'MONTHLY',
            features: [],
            maxTables: 10,
            maxStaff: 10,
            maxOrdersPerDay: -1,
          },
          usage: {},
          plans: [],
          history: [],
        },
      }),
    ),
    emit: jest.fn(),
  } as unknown as TcpClient;
  const cartService = new CartService(redisClient, catalogClient, sessionService);
  const orderQuotaService = new OrderQuotaService(redisClient);
  const orderService = new OrderService(
    dataSource,
    new OrderRepository(dataSource.getRepository(Order)),
    new OrderItemRepository(dataSource.getRepository(OrderItem)),
    new BillRepository(dataSource.getRepository(Bill)),
    sessionRepository,
    cartService,
    sessionService,
    orderQuotaService,
    catalogClient,
    saasClient,
  );

  return { dataSource, redis, cartService, orderService };
}

function createDataSource(): Promise<DataSource> {
  return new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database: process.env['ORDER_TYPEORM_DATABASE'] ?? process.env['TYPEORM_DATABASE'] ?? 'qrtable',
    synchronize: false,
    entities: [Session, Order, OrderItem, Bill],
  }).initialize();
}

function createRedis(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
    maxRetriesPerRequest: 3,
  });
}

async function seedSessionWithCart(harness: Harness, tenantId: string): Promise<SeedRows> {
  const session = await harness.dataSource.getRepository(Session).save(
    harness.dataSource.getRepository(Session).create({
      tenantId,
      tableId: randomUUID(),
      tableName: 'Phase 5 Submit Table',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
      lastActivity: new Date(),
      closedAt: null,
      orderCount: 0,
      currentBillId: null,
      version: 1,
    }),
  );
  const menuItemId = randomUUID();
  await harness.redis.hset(`cart:${tenantId}:${session.id}`, {
    tenantId,
    sessionId: session.id,
    cartVersion: '1',
    status: 'ACTIVE',
    updatedAt: new Date().toISOString(),
    items: JSON.stringify([
      {
        cartLineId: 'line-1',
        menuItemId,
        menuItemName: 'Phase 5 Submit Item',
        menuItemImageUrl: null,
        quantity: 1,
        unitPrice: 1200,
        lineVersion: 1,
        station: 'KITCHEN',
      },
    ]),
  });
  await harness.redis.pexpire(`cart:${tenantId}:${session.id}`, 60_000);
  await harness.redis.del(`session:${tenantId}:${session.id}`);
  return { tenantId, sessionId: session.id, tableId: session.tableId, menuItemId };
}

async function cleanupSeed(harness: Harness, seed: SeedRows): Promise<void> {
  await harness.dataSource.getRepository(OrderItem).delete({ tenantId: seed.tenantId });
  await harness.dataSource.getRepository(Order).delete({ tenantId: seed.tenantId });
  await harness.dataSource.getRepository(Bill).delete({ tenantId: seed.tenantId });
  await harness.dataSource.getRepository(Session).delete({ tenantId: seed.tenantId });
  await harness.redis.del(`cart:${seed.tenantId}:${seed.sessionId}`);
  await harness.redis.del(`session:${seed.tenantId}:${seed.sessionId}`);
}

function readErrorCode(error: unknown): unknown {
  if (error && typeof error === 'object') {
    const candidate = error as {
      errorCode?: unknown;
      response?: { errorCode?: unknown };
      getResponse?: () => unknown;
    };
    const response = typeof candidate.getResponse === 'function' ? candidate.getResponse() : candidate.response;
    if (response && typeof response === 'object') {
      return candidate.errorCode ?? (response as { errorCode?: unknown }).errorCode;
    }
    return candidate.errorCode;
  }
  return undefined;
}

function readinessMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
