import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { Area } from '@common/entities/area.entity';
import { Bill } from '@common/entities/bill.entity';
import { Order } from '@common/entities/order.entity';
import { ServiceRequest } from '@common/entities/service-request.entity';
import { Session } from '@common/entities/session.entity';
import { Table } from '@common/entities/table.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { BillStatus, OrderStatus, ServiceRequestStatus, ServiceRequestType, SessionStatus } from '@einvoice/types';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderRepository } from '../repositories/order.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { BillService } from '../services/bill.service';
import { CartService } from '../services/cart.service';
import { SessionService } from '../services/session.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_ORDER_BILL_REQUEST_INTEGRATION'] === '1';
const TENANT_PREFIX = 'phase5-bill-request';
const TCP_TIMEOUT_MS = 1000;

type Harness = {
  dataSource: DataSource;
  redis: Redis;
  catalogClient: ClientProxy;
  billService: BillService;
  cartService: CartService;
};

type SeedRows = {
  tenantId: string;
  sessionId: string;
  tableId: string;
  billId: string;
  orderId: string;
};

type ReadinessResult = { ok: boolean; reason?: string };

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-ORD-BILL-REQUEST external-stack integration', () => {
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

  it('rejects bill request while the Redis cart still has items', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedOpenBill(h, `${TENANT_PREFIX}-cart-${randomUUID()}`, OrderStatus.SERVED);
    currentTenantId = seed.tenantId;
    await writeCart(h.redis, seed, 'ACTIVE', [
      {
        cartLineId: 'line-1',
        menuItemId: randomUUID(),
        menuItemName: 'Phase 5 Bill Item',
        menuItemImageUrl: null,
        quantity: 1,
        unitPrice: 25000,
        lineVersion: 1,
        station: 'KITCHEN',
      },
    ]);

    await expect(
      h.billService.requestBill({ tenantId: seed.tenantId, sessionId: seed.sessionId }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.BILL_CART_NOT_EMPTY });

    await expect(h.dataSource.getRepository(Bill).findOneByOrFail({ id: seed.billId })).resolves.toMatchObject({
      status: BillStatus.OPEN,
    });
    await expect(h.dataSource.getRepository(Table).findOneByOrFail({ id: seed.tableId })).resolves.toMatchObject({
      status: TABLE_STATUS.OCCUPIED,
      sessionId: seed.sessionId,
    });
  });

  it('rejects bill request until every active order on the bill is served', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedOpenBill(h, `${TENANT_PREFIX}-orders-${randomUUID()}`, OrderStatus.PROCESSING);
    currentTenantId = seed.tenantId;

    await expect(
      h.billService.requestBill({ tenantId: seed.tenantId, sessionId: seed.sessionId }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.BILL_ORDERS_NOT_ALL_SERVED });

    await expect(h.dataSource.getRepository(Bill).findOneByOrFail({ id: seed.billId })).resolves.toMatchObject({
      status: BillStatus.OPEN,
    });
    await expect(h.dataSource.getRepository(Table).findOneByOrFail({ id: seed.tableId })).resolves.toMatchObject({
      status: TABLE_STATUS.OCCUPIED,
      sessionId: seed.sessionId,
    });
  });

  it('moves OPEN bill to PENDING_PAYMENT, locks the cart, and moves Catalog table to billing', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedOpenBill(h, `${TENANT_PREFIX}-success-${randomUUID()}`, OrderStatus.SERVED);
    currentTenantId = seed.tenantId;

    const result = await h.billService.requestBill({ tenantId: seed.tenantId, sessionId: seed.sessionId });

    expect(result.bill).toMatchObject({
      id: seed.billId,
      status: BillStatus.PENDING_PAYMENT,
      sessionId: seed.sessionId,
    });
    expect(result.cart).toMatchObject({
      status: 'LOCKED',
      cartVersion: 1,
      items: [],
    });
    expect(result.request).toMatchObject({
      type: ServiceRequestType.REQUEST_BILL,
      status: ServiceRequestStatus.PENDING,
      sessionId: seed.sessionId,
    });
    expect(result.events.billRequested).toMatchObject({
      tenantId: seed.tenantId,
      billId: seed.billId,
      sessionId: seed.sessionId,
      status: 'PENDING_PAYMENT',
    });

    await expect(h.dataSource.getRepository(Bill).findOneByOrFail({ id: seed.billId })).resolves.toMatchObject({
      status: BillStatus.PENDING_PAYMENT,
      closedAt: expect.any(Date),
    });
    await expect(h.dataSource.getRepository(ServiceRequest).countBy({ tenantId: seed.tenantId })).resolves.toBe(1);
    await expect(h.dataSource.getRepository(Table).findOneByOrFail({ id: seed.tableId })).resolves.toMatchObject({
      status: TABLE_STATUS.BILLING,
      sessionId: seed.sessionId,
    });

    await expect(
      h.cartService.mutate({
        tenantId: seed.tenantId,
        sessionId: seed.sessionId,
        expectedCartVersion: 1,
        operation: 'CLEAR',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CART_LOCKED });
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
    throw new Error(`[Phase 5 order bill request integration not ready] ${readiness.reason}`);
  }
}

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_ORDER_BILL_REQUEST_INTEGRATION=1 to opt in' };
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
  const billService = new BillService(
    dataSource,
    new BillRepository(dataSource.getRepository(Bill)),
    sessionRepository,
    new OrderRepository(dataSource.getRepository(Order)),
    new ServiceRequestRepository(dataSource.getRepository(ServiceRequest)),
    cartService,
    sessionService,
    catalogClient as unknown as TcpClient,
  );

  return { dataSource, redis, catalogClient, billService, cartService };
}

function createDataSource(): Promise<DataSource> {
  return createPostgresDataSource(
    process.env['ORDER_TYPEORM_DATABASE'] ?? process.env['TYPEORM_DATABASE'] ?? 'qrtable',
    [Area, Table, Session, Order, Bill, ServiceRequest],
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

async function seedOpenBill(harness: Harness, tenantId: string, orderStatus: OrderStatus): Promise<SeedRows> {
  await cleanupTenant(harness, tenantId);

  const area = await harness.dataSource.getRepository(Area).save(
    harness.dataSource.getRepository(Area).create({
      tenantId,
      name: `Phase 5 Bill Area ${randomUUID()}`,
      sortOrder: 0,
    }),
  );
  const table = await harness.dataSource.getRepository(Table).save(
    harness.dataSource.getRepository(Table).create({
      tenantId,
      areaId: area.id,
      name: `Phase 5 Bill Table ${randomUUID()}`,
      capacity: 2,
      status: TABLE_STATUS.OCCUPIED,
      qrToken: randomUUID().replace(/-/g, '').padEnd(64, '0'),
      sessionId: null,
    }),
  );
  const now = new Date();
  const session = await harness.dataSource.getRepository(Session).save(
    harness.dataSource.getRepository(Session).create({
      tenantId,
      tableId: table.id,
      tableName: table.name,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivity: now,
      closedAt: null,
      orderCount: 1,
      currentBillId: null,
      version: 1,
    }),
  );
  table.sessionId = session.id;
  await harness.dataSource.getRepository(Table).save(table);
  const order = await harness.dataSource.getRepository(Order).save(
    harness.dataSource.getRepository(Order).create({
      tenantId,
      tableId: table.id,
      tableName: table.name,
      sessionId: session.id,
      status: orderStatus,
      totalAmount: 25000,
      idempotencyKey: `phase5-bill-${randomUUID()}`,
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
    }),
  );
  const bill = await harness.dataSource.getRepository(Bill).save(
    harness.dataSource.getRepository(Bill).create({
      tenantId,
      sessionId: session.id,
      orderIds: [order.id],
      subtotal: 25000,
      total: 25000,
      roundingAmount: 0,
      paymentMethod: null,
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
      paymentId: null,
    }),
  );
  session.currentBillId = bill.id;
  await harness.dataSource.getRepository(Session).save(session);
  await harness.redis.del(`cart:${tenantId}:${session.id}`);
  await harness.redis.del(`session:${tenantId}:${session.id}`);
  return { tenantId, sessionId: session.id, tableId: table.id, billId: bill.id, orderId: order.id };
}

async function writeCart(
  redis: Redis,
  seed: SeedRows,
  status: 'ACTIVE' | 'LOCKED',
  items: Array<Record<string, unknown>>,
): Promise<void> {
  await redis.hset(`cart:${seed.tenantId}:${seed.sessionId}`, {
    tenantId: seed.tenantId,
    sessionId: seed.sessionId,
    cartVersion: '1',
    status,
    updatedAt: new Date().toISOString(),
    items: JSON.stringify(items),
  });
  await redis.pexpire(`cart:${seed.tenantId}:${seed.sessionId}`, 60_000);
}

async function cleanupTenant(harness: Harness, tenantId: string): Promise<void> {
  const sessions = await harness.dataSource.getRepository(Session).findBy({ tenantId });
  await harness.dataSource.getRepository(ServiceRequest).delete({ tenantId });
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
