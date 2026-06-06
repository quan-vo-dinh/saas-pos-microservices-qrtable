import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { Area } from '@common/entities/area.entity';
import { Bill } from '@common/entities/bill.entity';
import { Order } from '@common/entities/order.entity';
import { ServiceRequest } from '@common/entities/service-request.entity';
import { Session } from '@common/entities/session.entity';
import { Table } from '@common/entities/table.entity';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { BillStatus, PaymentMethod, SessionStatus } from '@einvoice/types';
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

const RUN_INTEGRATION = process.env['RUN_PHASE5_ORDER_PAYMENT_FINALIZATION_INTEGRATION'] === '1';
const TENANT_PREFIX = 'p5-pay-final';
const TCP_TIMEOUT_MS = 1000;

type Harness = {
  dataSource: DataSource;
  redis: Redis;
  catalogClient: ClientProxy;
  billService: BillService;
};

type SeedRows = {
  tenantId: string;
  sessionId: string;
  tableId: string;
  billId: string;
  paymentId: string;
};

type ReadinessResult = { ok: boolean; reason?: string };

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-ORD-PAYMENT-FINALIZATION external-stack integration', () => {
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

  it('marks a pending bill paid once, closes the session, deletes Redis keys, moves table to cleaning, and tolerates replay', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedBillForPayment(h, `${TENANT_PREFIX}-pending-${randomUUID()}`, BillStatus.PENDING_PAYMENT);
    currentTenantId = seed.tenantId;

    const paidAt = new Date().toISOString();
    const first = await h.billService.markPaid({
      tenantId: seed.tenantId,
      billId: seed.billId,
      paymentId: seed.paymentId,
      method: PaymentMethod.CASH,
      paidAt,
      processId: 'phase5-payment-finalization-1',
    });
    const replay = await h.billService.markPaid({
      tenantId: seed.tenantId,
      billId: seed.billId,
      paymentId: randomUUID(),
      method: PaymentMethod.CASH,
      paidAt: new Date().toISOString(),
      processId: 'phase5-payment-finalization-replay',
    });

    expect(first.bill).toMatchObject({ id: seed.billId, status: BillStatus.PAID, paymentId: seed.paymentId });
    expect(replay.bill).toMatchObject({ id: seed.billId, status: BillStatus.PAID, paymentId: seed.paymentId });
    await expectFinalized(h, seed);
  });

  it('replayed BILL_MARK_PAID finalizes stale Order-side side effects for an already-paid bill', async () => {
    await ensureHarnessReady();
    const h = await getHarness();
    const seed = await seedBillForPayment(h, `${TENANT_PREFIX}-replay-${randomUUID()}`, BillStatus.PAID);
    currentTenantId = seed.tenantId;

    const replay = await h.billService.markPaid({
      tenantId: seed.tenantId,
      billId: seed.billId,
      paymentId: randomUUID(),
      method: PaymentMethod.CASH,
      paidAt: new Date().toISOString(),
      processId: 'phase5-payment-finalization-stale-replay',
    });

    expect(replay.bill).toMatchObject({ id: seed.billId, status: BillStatus.PAID, paymentId: seed.paymentId });
    await expectFinalized(h, seed);
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
    throw new Error(`[Phase 5 order payment finalization integration not ready] ${readiness.reason}`);
  }
}

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_ORDER_PAYMENT_FINALIZATION_INTEGRATION=1 to opt in' };
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

  return { dataSource, redis, catalogClient, billService };
}

function createDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['ORDER_TYPEORM_DATABASE'] ?? 'qrtable_order', [
    Area,
    Table,
    Session,
    Order,
    Bill,
    ServiceRequest,
  ]).initialize();
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

async function seedBillForPayment(harness: Harness, tenantId: string, status: BillStatus): Promise<SeedRows> {
  await cleanupTenant(harness, tenantId);
  const paymentId = randomUUID();
  const area = await harness.dataSource.getRepository(Area).save(
    harness.dataSource.getRepository(Area).create({
      tenantId,
      name: `Phase 5 Pay Area ${randomUUID()}`,
      sortOrder: 0,
    }),
  );
  const table = await harness.dataSource.getRepository(Table).save(
    harness.dataSource.getRepository(Table).create({
      tenantId,
      areaId: area.id,
      name: `Phase 5 Pay Table ${randomUUID()}`,
      capacity: 2,
      status: TABLE_STATUS.BILLING,
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
  const bill = await harness.dataSource.getRepository(Bill).save(
    harness.dataSource.getRepository(Bill).create({
      tenantId,
      sessionId: session.id,
      orderIds: [],
      subtotal: 127500,
      total: 128000,
      roundingAmount: 500,
      paymentMethod: status === BillStatus.PAID ? PaymentMethod.CASH : null,
      status,
      closedAt: now,
      paidAt: status === BillStatus.PAID ? now : null,
      paymentId: status === BillStatus.PAID ? paymentId : null,
    }),
  );
  session.currentBillId = bill.id;
  await harness.dataSource.getRepository(Session).save(session);
  await writeRedisSessionAndCart(harness.redis, tenantId, session, 'LOCKED');
  return { tenantId, sessionId: session.id, tableId: table.id, billId: bill.id, paymentId };
}

async function writeRedisSessionAndCart(
  redis: Redis,
  tenantId: string,
  session: Session,
  cartStatus: 'ACTIVE' | 'LOCKED',
): Promise<void> {
  await redis.hset(`session:${tenantId}:${session.id}`, {
    tenantId,
    sessionId: session.id,
    tableId: session.tableId,
    tableName: session.tableName,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    lastActivity: session.lastActivity.toISOString(),
    orderCount: String(session.orderCount),
    closedAt: '',
  });
  await redis.hset(`cart:${tenantId}:${session.id}`, {
    tenantId,
    sessionId: session.id,
    cartVersion: '3',
    status: cartStatus,
    updatedAt: new Date().toISOString(),
    items: JSON.stringify([]),
  });
  await redis.pexpire(`session:${tenantId}:${session.id}`, 60_000);
  await redis.pexpire(`cart:${tenantId}:${session.id}`, 60_000);
}

async function expectFinalized(harness: Harness, seed: SeedRows): Promise<void> {
  await expect(harness.dataSource.getRepository(Bill).findOneByOrFail({ id: seed.billId })).resolves.toMatchObject({
    status: BillStatus.PAID,
    paymentId: seed.paymentId,
    paymentMethod: PaymentMethod.CASH,
    paidAt: expect.any(Date),
  });
  await expect(
    harness.dataSource.getRepository(Session).findOneByOrFail({ id: seed.sessionId }),
  ).resolves.toMatchObject({
    status: SessionStatus.CLOSED,
    closedAt: expect.any(Date),
  });
  await expect(harness.redis.exists(`session:${seed.tenantId}:${seed.sessionId}`)).resolves.toBe(0);
  await expect(harness.redis.exists(`cart:${seed.tenantId}:${seed.sessionId}`)).resolves.toBe(0);
  await expect(harness.dataSource.getRepository(Table).findOneByOrFail({ id: seed.tableId })).resolves.toMatchObject({
    status: TABLE_STATUS.CLEANING,
    sessionId: seed.sessionId,
  });
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
