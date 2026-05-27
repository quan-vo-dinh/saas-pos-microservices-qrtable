import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { Area } from '@common/entities/area.entity';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { Session } from '@common/entities/session.entity';
import { Table } from '@common/entities/table.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { SessionStatus } from '@einvoice/types';
import Redis from 'ioredis';
import { randomBytes, randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import { of } from 'rxjs';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from '../services/cart.service';
import { OrderKdsEventService } from '../services/order-kds-event.service';
import { OrderQuotaService } from '../services/order-quota.service';
import { OrderService } from '../services/order.service';
import { OrderStateTransitionService } from '../services/order-state-transition.service';
import { OrderSubmitService } from '../services/order-submit.service';
import { SessionService } from '../services/session.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_ORDER_SESSION_JOIN_INTEGRATION'] === '1';
const TENANT_PREFIX = 'p5-session-join';
const TCP_TIMEOUT_MS = 1000;

type Harness = {
  dataSource: DataSource;
  redis: Redis;
  catalogClient: ClientProxy;
  orderService: OrderService;
};

type SeedTable = {
  tenantId: string;
  tableId: string;
  tableName: string;
  qrToken: string;
  sessionId?: string;
};

type ReadinessResult = { ok: boolean; reason?: string };

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-ORD-SESSION-JOIN external-stack integration', () => {
  jest.setTimeout(30000);

  let harness: Harness | null = null;
  let currentTenantId: string | null = null;

  afterEach(async () => {
    if (harness && currentTenantId) {
      await cleanupTenant(harness, currentTenantId);
    }
    currentTenantId = null;
  });

  afterAll(async () => {
    await harness?.catalogClient.close();
    await harness?.redis.quit();
    if (harness?.dataSource.isInitialized) {
      await harness.dataSource.destroy();
    }
  });

  it('validates Catalog QR for an available table, creates an active Order session, caches it in Redis, and marks the table occupied', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedCatalogTable(h, `${TENANT_PREFIX}-available-${randomUUID()}`, TABLE_STATUS.AVAILABLE);
    currentTenantId = seed.tenantId;

    const session = await h.orderService.joinSession({
      tenantId: seed.tenantId,
      tableId: seed.tableId,
      qrToken: seed.qrToken,
    });

    expect(session).toMatchObject({
      tenantId: seed.tenantId,
      tableId: seed.tableId,
      tableName: seed.tableName,
      status: SessionStatus.ACTIVE,
      orderCount: 0,
    });
    await expect(h.dataSource.getRepository(Session).findOneByOrFail({ id: session.id })).resolves.toMatchObject({
      tenantId: seed.tenantId,
      tableId: seed.tableId,
      status: SessionStatus.ACTIVE,
    });
    await expect(h.redis.hgetall(`session:${seed.tenantId}:${session.id}`)).resolves.toMatchObject({
      tenantId: seed.tenantId,
      sessionId: session.id,
      tableId: seed.tableId,
      status: SessionStatus.ACTIVE,
    });
    await expect(h.dataSource.getRepository(Table).findOneByOrFail({ id: seed.tableId })).resolves.toMatchObject({
      status: TABLE_STATUS.OCCUPIED,
      sessionId: session.id,
    });
  });

  it('rejoins an occupied table only when Catalog points at an active Order session and refreshes session activity', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedCatalogTable(h, `${TENANT_PREFIX}-occupied-${randomUUID()}`, TABLE_STATUS.OCCUPIED);
    currentTenantId = seed.tenantId;
    const activeSession = await seedActiveSession(h, seed);
    await h.dataSource
      .getRepository(Table)
      .update({ id: seed.tableId, tenantId: seed.tenantId }, { sessionId: activeSession.id });
    const oldActivity = new Date(Date.now() - 60_000);
    await h.redis.hset(`session:${seed.tenantId}:${activeSession.id}`, {
      tenantId: seed.tenantId,
      sessionId: activeSession.id,
      tableId: seed.tableId,
      tableName: seed.tableName,
      status: SessionStatus.ACTIVE,
      startedAt: activeSession.startedAt.toISOString(),
      lastActivity: oldActivity.toISOString(),
      orderCount: String(activeSession.orderCount),
      closedAt: '',
    });

    const rejoined = await h.orderService.joinSession({
      tenantId: seed.tenantId,
      tableId: seed.tableId,
      qrToken: seed.qrToken,
    });

    expect(rejoined.id).toBe(activeSession.id);
    const pgSession = await h.dataSource.getRepository(Session).findOneByOrFail({ id: activeSession.id });
    expect(pgSession.lastActivity.getTime()).toBeGreaterThan(oldActivity.getTime());
    const cached = await h.redis.hgetall(`session:${seed.tenantId}:${activeSession.id}`);
    expect(new Date(cached['lastActivity']).getTime()).toBeGreaterThan(oldActivity.getTime());
    await expect(h.dataSource.getRepository(Table).findOneByOrFail({ id: seed.tableId })).resolves.toMatchObject({
      status: TABLE_STATUS.OCCUPIED,
      sessionId: activeSession.id,
    });
  });

  it.each([
    [TABLE_STATUS.BILLING, ErrorCode.ORDER_JOIN_TABLE_BILLING],
    [TABLE_STATUS.CLEANING, ErrorCode.ORDER_JOIN_TABLE_CLEANING],
  ])('rejects join for %s table after live Catalog QR validation', async (status, errorCode) => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedCatalogTable(h, `${TENANT_PREFIX}-${status}-${randomUUID()}`, status);
    currentTenantId = seed.tenantId;

    await expect(
      h.orderService.joinSession({
        tenantId: seed.tenantId,
        tableId: seed.tableId,
        qrToken: seed.qrToken,
      }),
    ).rejects.toMatchObject({ errorCode });
  });

  async function getHarness(): Promise<Harness> {
    if (harness) {
      return harness;
    }
    harness = await createHarness();
    return harness;
  }
});

async function ensureHarnessReady(): Promise<void> {
  const readiness = await ensureExternalStackReady();
  if (!readiness.ok) {
    throw new Error(`[Phase 5 order session join integration not ready] ${readiness.reason}`);
  }
}

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_ORDER_SESSION_JOIN_INTEGRATION=1 to opt in' };
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

  const catalogTcp = await canConnectTcp(catalogTcpOptions().host, catalogTcpOptions().port);
  if (!catalogTcp.ok) {
    return { ok: false, reason: `Catalog TCP not ready: ${catalogTcp.reason ?? 'unknown readiness failure'}` };
  }

  return { ok: true };
}

async function createHarness(): Promise<Harness> {
  const dataSource = await createDataSource();
  const redis = createRedis();
  const redisClient = { getClient: () => redis } as unknown as RedisClientService;
  const catalogClient = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: catalogTcpOptions(),
  });
  await catalogClient.connect();
  const sessionRepository = new SessionRepository(dataSource.getRepository(Session));
  const sessionService = new SessionService(redisClient, sessionRepository, catalogClient as unknown as TcpClient);
  const cartService = new CartService(redisClient, catalogClient as unknown as TcpClient, sessionService);
  const orderQuotaService = new OrderQuotaService(redisClient);
  const saasClient = createSaasClient();
  const orderRepository = new OrderRepository(dataSource.getRepository(Order));
  const orderItemRepository = new OrderItemRepository(dataSource.getRepository(OrderItem));
  const billRepository = new BillRepository(dataSource.getRepository(Bill));
  const orderKdsEventService = new OrderKdsEventService();
  const orderSubmitService = new OrderSubmitService(
    dataSource,
    orderRepository,
    orderItemRepository,
    billRepository,
    sessionRepository,
    cartService,
    sessionService,
    orderQuotaService,
    saasClient,
  );
  const orderStateTransitionService = new OrderStateTransitionService(
    dataSource,
    orderRepository,
    orderItemRepository,
    billRepository,
    orderKdsEventService,
    catalogClient as unknown as TcpClient,
  );
  const orderService = new OrderService(
    orderRepository,
    orderItemRepository,
    sessionRepository,
    sessionService,
    catalogClient as unknown as TcpClient,
    orderSubmitService,
    orderKdsEventService,
    orderStateTransitionService,
  );

  return { dataSource, redis, catalogClient, orderService };
}

function createDataSource(): Promise<DataSource> {
  return createPostgresDataSource(
    process.env['ORDER_TYPEORM_DATABASE'] ?? process.env['TYPEORM_DATABASE'] ?? 'qrtable',
    [Area, Table, Session, Order, OrderItem, Bill],
  ).initialize();
}

function createPostgresDataSource(database: string, entities: DataSourceOptions['entities']): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database,
    synchronize: false,
    entities,
  });
}

function createRedis(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
    maxRetriesPerRequest: 3,
  });
}

function createSaasClient(): TcpClient {
  return {
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
}

async function seedCatalogTable(harness: Harness, tenantId: string, status: TABLE_STATUS): Promise<SeedTable> {
  await cleanupTenant(harness, tenantId);
  const area = await harness.dataSource.getRepository(Area).save(
    harness.dataSource.getRepository(Area).create({
      tenantId,
      name: `Phase 5 Join Area ${randomUUID()}`,
      sortOrder: 0,
    }),
  );
  const table = await harness.dataSource.getRepository(Table).save(
    harness.dataSource.getRepository(Table).create({
      tenantId,
      areaId: area.id,
      name: `Phase 5 Join Table ${randomUUID()}`,
      capacity: 2,
      status,
      qrToken: randomBytes(32).toString('hex'),
      sessionId: null,
    }),
  );
  return { tenantId, tableId: table.id, tableName: table.name, qrToken: table.qrToken };
}

async function seedActiveSession(harness: Harness, seed: SeedTable): Promise<Session> {
  const now = new Date();
  return harness.dataSource.getRepository(Session).save(
    harness.dataSource.getRepository(Session).create({
      tenantId: seed.tenantId,
      tableId: seed.tableId,
      tableName: seed.tableName,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivity: now,
      closedAt: null,
      orderCount: 1,
      currentBillId: null,
      version: 1,
    }),
  );
}

async function cleanupTenant(harness: Harness, tenantId: string): Promise<void> {
  const sessions = await harness.dataSource.getRepository(Session).findBy({ tenantId });
  await harness.dataSource.getRepository(OrderItem).delete({ tenantId });
  await harness.dataSource.getRepository(Order).delete({ tenantId });
  await harness.dataSource.getRepository(Bill).delete({ tenantId });
  await harness.dataSource.getRepository(Session).delete({ tenantId });
  await harness.dataSource.getRepository(Table).delete({ tenantId });
  await harness.dataSource.getRepository(Area).delete({ tenantId });
  for (const session of sessions) {
    await harness.redis.del(`cart:${tenantId}:${session.id}`);
    await harness.redis.del(`session:${tenantId}:${session.id}`);
  }
}

function catalogTcpOptions(): { host: string; port: number } {
  return {
    host: process.env['TCP_CATALOG_SERVICE_HOST'] ?? process.env['CATALOG_SERVICE_HOST'] ?? 'localhost',
    port: Number(process.env[TCP_SERVICES.CATALOG_SERVICE + '_PORT'] ?? 3205),
  };
}

function canConnectTcp(host: string, port: number): Promise<ReadinessResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (result: ReadinessResult) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(TCP_TIMEOUT_MS);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, reason: `${host}:${port} timed out` }));
    socket.once('error', (error) => done({ ok: false, reason: `${host}:${port} ${readinessMessage(error)}` }));
    socket.connect(port, host);
  });
}

function readinessMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
