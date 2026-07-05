import { CATEGORY_STATUS, MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RedisKey } from '@common/constants/redis-key.constants';
import { SubscriptionStatus, TenantStatus, TenantType } from '@common/constants/saas.constants';
import { Bill } from '@common/entities/bill.entity';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Session } from '@common/entities/session.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type {
  CartGetTcpRequest,
  CartMutateTcpRequest,
  StaffOrderActionTcpRequest,
  SubmitOrderTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  CartTcpResponse,
  OrderActionTcpResponse,
  SubmitOrderTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import { firstValueFrom, timeout } from 'rxjs';
import { DataSource, ObjectLiteral } from 'typeorm';

const BILL_STATUS_OPEN = 'OPEN';
const ORDER_ITEM_STATUS_PROCESSING = 'PROCESSING';
const ORDER_STATUS_PENDING = 'PENDING';
const SESSION_STATUS_ACTIVE = 'ACTIVE';

export type ScaleSeed = {
  tenantId: string;
  tenantSlug: string;
  sessionId: string;
  tableId: string;
  menuItemId: string;
};

export type StockRaceSeed = {
  tenantId: string;
  orderIds: [string, string];
  menuItemId: string;
};

export type SaasSubscriptionSeed = {
  tenantId: string;
  planCode: string;
};

const DEFAULT_TCP_TIMEOUT_MS = 7000;
const DEFAULT_CART_TTL_MS = 30 * 60 * 1000;

export function envNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function scaleTenantId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function createRedis(): Redis {
  return new Redis({
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: envNumber('REDIS_PORT', 16379),
    maxRetriesPerRequest: 3,
  });
}

export async function createOrderDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['ORDER_TYPEORM_DATABASE'] ?? 'qrtable_order', [
    Session,
    Order,
    OrderItem,
    Bill,
    OutboxEvent,
  ]);
}

export async function createCatalogDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['CATALOG_TYPEORM_DATABASE'] ?? 'qrtable_catalog', [
    Category,
    MenuItem,
    StockReservation,
  ]);
}

export async function createSaasDataSource(): Promise<DataSource> {
  return createPostgresDataSource(process.env['SAAS_TYPEORM_DATABASE'] ?? 'qrtable_saas', [
    Tenant,
    PricingPlan,
    Subscription,
  ]);
}

export async function destroyDataSources(...sources: Array<DataSource | null | undefined>): Promise<void> {
  for (const source of sources) {
    if (source?.isInitialized) {
      await source.destroy();
    }
  }
}

export function createOrderClient(host: string, port: number): ClientProxy {
  return ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host, port },
  });
}

export async function closeClients(...clients: Array<ClientProxy | null | undefined>): Promise<void> {
  for (const client of clients) {
    await client?.close();
  }
}

export async function waitForHttp(url: string, label: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(1500);
  }

  throw new Error(`${label} is not ready at ${url}: ${lastError}`);
}

export async function waitForTcp(host: string, port: number, label: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';

  while (Date.now() < deadline) {
    const result = await canConnectTcp(host, port);
    if (result.ok) {
      return;
    }
    lastError = result.reason ?? 'unknown error';
    await delay(1000);
  }

  throw new Error(`${label} is not ready at ${host}:${port}: ${lastError}`);
}

export async function seedBffCartFixture(params: {
  orderDataSource: DataSource;
  saasDataSource: DataSource;
  redis: Redis;
  tenantId: string;
  tenantSlug: string;
}): Promise<ScaleSeed> {
  await params.saasDataSource.getRepository(Tenant).save(
    params.saasDataSource.getRepository(Tenant).create({
      id: params.tenantId,
      name: 'Scale Test Tenant',
      slug: params.tenantSlug,
      isActive: true,
      status: TenantStatus.ACTIVE,
      type: TenantType.RESTAURANT,
      address: null,
      ownerId: null,
      defaultCurrency: 'VND',
      defaultLocale: 'vi-VN',
      operatingModes: ['INSTANT_ORDER', 'DIGITAL_MENU'],
      suspendedAt: null,
      suspendedReason: null,
      closedAt: null,
      closedReason: null,
    }),
  );

  try {
    const seed = await seedOrderSessionWithCart(params.orderDataSource, params.redis, params.tenantId);
    return { ...seed, tenantSlug: params.tenantSlug };
  } catch (error) {
    await cleanupSaasTenant(params.saasDataSource, params.tenantId);
    throw error;
  }
}

export async function seedOrderSessionWithCart(
  orderDataSource: DataSource,
  redis: Redis,
  tenantId: string,
): Promise<Omit<ScaleSeed, 'tenantSlug'>> {
  const now = new Date();
  const tableId = randomUUID();
  const menuItemId = randomUUID();
  const session = await orderDataSource.getRepository(Session).save(
    orderDataSource.getRepository(Session).create({
      tenantId,
      tableId,
      tableName: 'Scale Test Table',
      status: SESSION_STATUS_ACTIVE,
      startedAt: now,
      lastActivity: now,
      closedAt: null,
      orderCount: 0,
      currentBillId: null,
      version: 1,
    }),
  );

  await redis.hset(RedisKey.session.data(tenantId, session.id), {
    tenantId,
    sessionId: session.id,
    tableId,
    tableName: session.tableName,
    status: SESSION_STATUS_ACTIVE,
    startedAt: now.toISOString(),
    lastActivity: now.toISOString(),
    orderCount: '0',
    closedAt: '',
  });
  await redis.pexpire(RedisKey.session.data(tenantId, session.id), DEFAULT_CART_TTL_MS);

  await redis.hset(RedisKey.cart.data(tenantId, session.id), {
    tenantId,
    sessionId: session.id,
    cartVersion: '1',
    status: 'ACTIVE',
    updatedAt: now.toISOString(),
    items: JSON.stringify([
      {
        cartLineId: 'line-1',
        menuItemId,
        menuItemName: 'Scale Test Item',
        menuItemImageUrl: null,
        quantity: 1,
        unitPrice: 1200,
        lineVersion: 1,
        station: PREPARATION_STATION.KITCHEN,
      },
    ]),
  });
  await redis.pexpire(RedisKey.cart.data(tenantId, session.id), DEFAULT_CART_TTL_MS);

  return {
    tenantId,
    sessionId: session.id,
    tableId,
    menuItemId,
  };
}

export async function cleanupOrderTenant(orderDataSource: DataSource, redis: Redis, seed: ScaleSeed): Promise<void> {
  await orderDataSource.getRepository(OutboxEvent).delete({ tenantId: seed.tenantId });
  await orderDataSource.getRepository(OrderItem).delete({ tenantId: seed.tenantId });
  await orderDataSource.getRepository(Order).delete({ tenantId: seed.tenantId });
  await orderDataSource.getRepository(Bill).delete({ tenantId: seed.tenantId });
  await orderDataSource.getRepository(Session).delete({ tenantId: seed.tenantId });
  await redis.del(RedisKey.cart.data(seed.tenantId, seed.sessionId));
  await redis.del(RedisKey.session.data(seed.tenantId, seed.sessionId));
}

export async function cleanupSaasTenant(saasDataSource: DataSource, tenantId: string): Promise<void> {
  await saasDataSource.getRepository(Subscription).delete({ tenantId });
  await saasDataSource.getRepository(Tenant).delete({ id: tenantId });
}

export async function cleanupSaasSubscriptionSeed(
  saasDataSource: DataSource,
  seed: SaasSubscriptionSeed,
): Promise<void> {
  await cleanupSaasTenant(saasDataSource, seed.tenantId);
  await saasDataSource.getRepository(PricingPlan).delete({ code: seed.planCode });
}

export async function seedSaasActiveSubscription(
  saasDataSource: DataSource,
  tenantId: string,
): Promise<SaasSubscriptionSeed> {
  const planCode = `SCALE_${randomUUID().replace(/-/g, '').toUpperCase()}`;
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);

  await saasDataSource.getRepository(Tenant).save(
    saasDataSource.getRepository(Tenant).create({
      id: tenantId,
      name: 'Scale Order Tenant',
      slug: `scale-order-${Date.now()}`,
      isActive: true,
      status: TenantStatus.ACTIVE,
      type: TenantType.RESTAURANT,
      address: null,
      ownerId: null,
      defaultCurrency: 'VND',
      defaultLocale: 'vi-VN',
      operatingModes: ['INSTANT_ORDER', 'DIGITAL_MENU'],
      suspendedAt: null,
      suspendedReason: null,
      closedAt: null,
      closedReason: null,
    }),
  );

  try {
    const plan = await saasDataSource.getRepository(PricingPlan).save(
      saasDataSource.getRepository(PricingPlan).create({
        code: planCode,
        name: 'Scale Test Plan',
        description: 'Local functional scale-out test plan',
        billingPeriod: 'MONTHLY',
        priceVnd: 0,
        maxTables: 100,
        maxStaff: 100,
        maxOrdersPerDay: 1000,
        features: ['basic_pos'],
        isActive: true,
        displayOrder: 9999,
      }),
    );
    await saasDataSource.getRepository(Subscription).save(
      saasDataSource.getRepository(Subscription).create({
        tenantId,
        pricingPlanId: plan.id,
        planCodeSnapshot: plan.code,
        priceVndSnapshot: 0,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
        expiresAt,
        supersededBySubscriptionId: null,
        canceledAt: null,
        canceledReason: null,
        expiredAt: null,
        source: 'ADMIN_ASSIGN',
        sourceInvoiceId: null,
        createdByUserId: 'scale-test',
      }),
    );
    return { tenantId, planCode };
  } catch (error) {
    await cleanupSaasSubscriptionSeed(saasDataSource, { tenantId, planCode });
    throw error;
  }
}

export async function cleanupStockRaceTenant(
  orderDataSource: DataSource,
  catalogDataSource: DataSource,
  tenantId: string,
): Promise<void> {
  await orderDataSource.getRepository(OutboxEvent).delete({ tenantId });
  await orderDataSource.getRepository(OrderItem).delete({ tenantId });
  await orderDataSource.getRepository(Order).delete({ tenantId });
  await orderDataSource.getRepository(Bill).delete({ tenantId });
  await orderDataSource.getRepository(Session).delete({ tenantId });
  await catalogDataSource.getRepository(StockReservation).delete({ tenantId });
  await catalogDataSource.getRepository(MenuItem).delete({ tenantId });
  await catalogDataSource.getRepository(Category).delete({ tenantId });
}

export async function cartMutate(
  client: ClientProxy,
  payload: CartMutateTcpRequest,
): Promise<ResponseType<CartTcpResponse>> {
  return firstValueFrom(
    client
      .send<
        ResponseType<CartTcpResponse>,
        Request<CartMutateTcpRequest>
      >(TCP_REQUEST_MESSAGE.ORDER.CART_MUTATE, new Request({ tenantId: payload.tenantId, sessionId: payload.sessionId, data: payload }))
      .pipe(timeout(DEFAULT_TCP_TIMEOUT_MS)),
  );
}

export async function cartGet(client: ClientProxy, payload: CartGetTcpRequest): Promise<ResponseType<CartTcpResponse>> {
  return firstValueFrom(
    client
      .send<
        ResponseType<CartTcpResponse>,
        Request<CartGetTcpRequest>
      >(TCP_REQUEST_MESSAGE.ORDER.CART_GET, new Request({ tenantId: payload.tenantId, sessionId: payload.sessionId, data: payload }))
      .pipe(timeout(DEFAULT_TCP_TIMEOUT_MS)),
  );
}

export async function submitOrder(
  client: ClientProxy,
  payload: SubmitOrderTcpRequest,
): Promise<ResponseType<SubmitOrderTcpResponse>> {
  return firstValueFrom(
    client
      .send<
        ResponseType<SubmitOrderTcpResponse>,
        Request<SubmitOrderTcpRequest>
      >(TCP_REQUEST_MESSAGE.ORDER.SUBMIT, new Request({ tenantId: payload.tenantId, sessionId: payload.sessionId, data: payload }))
      .pipe(timeout(DEFAULT_TCP_TIMEOUT_MS)),
  );
}

export async function confirmOrder(
  client: ClientProxy,
  payload: StaffOrderActionTcpRequest,
): Promise<ResponseType<OrderActionTcpResponse>> {
  return firstValueFrom(
    client
      .send<
        ResponseType<OrderActionTcpResponse>,
        Request<StaffOrderActionTcpRequest>
      >(TCP_REQUEST_MESSAGE.ORDER.CONFIRM, new Request({ tenantId: payload.tenantId, userId: payload.userId, data: payload }))
      .pipe(timeout(DEFAULT_TCP_TIMEOUT_MS)),
  );
}

export async function seedStockRace(
  orderDataSource: DataSource,
  catalogDataSource: DataSource,
  tenantId: string,
): Promise<StockRaceSeed> {
  await cleanupStockRaceTenant(orderDataSource, catalogDataSource, tenantId);

  const now = new Date();
  const tableId = randomUUID();
  const category = await catalogDataSource.getRepository(Category).save(
    catalogDataSource.getRepository(Category).create({
      tenantId,
      name: `Scale Stock ${randomUUID()}`,
      sortOrder: 0,
      status: CATEGORY_STATUS.ACTIVE,
    }),
  );
  const menuItem = await catalogDataSource.getRepository(MenuItem).save(
    catalogDataSource.getRepository(MenuItem).create({
      tenantId,
      categoryId: category.id,
      name: 'Scale Stock Item',
      description: null,
      price: 1000,
      imageUrl: null,
      imagePublicId: null,
      stock: 1,
      sortOrder: 0,
      status: MENU_ITEM_STATUS.AVAILABLE,
      station: PREPARATION_STATION.KITCHEN,
    }),
  );
  const session = await orderDataSource.getRepository(Session).save(
    orderDataSource.getRepository(Session).create({
      tenantId,
      tableId,
      tableName: 'Scale Stock Table',
      status: SESSION_STATUS_ACTIVE,
      startedAt: now,
      lastActivity: now,
      closedAt: null,
      orderCount: 2,
      currentBillId: null,
      version: 1,
    }),
  );
  const orders = await orderDataSource.getRepository(Order).save([
    orderDataSource.getRepository(Order).create({
      tenantId,
      tableId,
      tableName: session.tableName,
      sessionId: session.id,
      status: ORDER_STATUS_PENDING,
      totalAmount: 1000,
      idempotencyKey: `scale-${randomUUID()}`,
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      stockReservationVersion: null,
    }),
    orderDataSource.getRepository(Order).create({
      tenantId,
      tableId,
      tableName: session.tableName,
      sessionId: session.id,
      status: ORDER_STATUS_PENDING,
      totalAmount: 1000,
      idempotencyKey: `scale-${randomUUID()}`,
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      stockReservationVersion: null,
    }),
  ]);

  await orderDataSource.getRepository(OrderItem).save(
    orders.map((order) =>
      orderDataSource.getRepository(OrderItem).create({
        tenantId,
        orderId: order.id,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        menuItemImageUrl: null,
        quantity: 1,
        unitPrice: 1000,
        note: null,
        status: ORDER_ITEM_STATUS_PROCESSING,
        station: PREPARATION_STATION.KITCHEN,
      }),
    ),
  );

  const bill = await orderDataSource.getRepository(Bill).save(
    orderDataSource.getRepository(Bill).create({
      tenantId,
      sessionId: session.id,
      orderIds: orders.map((order) => order.id),
      subtotal: 2000,
      total: 2000,
      roundingAmount: 0,
      paymentMethod: null,
      status: BILL_STATUS_OPEN,
      closedAt: null,
      paidAt: null,
      paymentId: null,
    }),
  );
  session.currentBillId = bill.id;
  await orderDataSource.getRepository(Session).save(session);

  return { tenantId, orderIds: [orders[0].id, orders[1].id], menuItemId: menuItem.id };
}

export function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function readErrorCode(error: unknown): unknown {
  if (error && typeof error === 'object') {
    const candidate = error as {
      errorCode?: unknown;
      error?: { errorCode?: unknown };
      response?: { errorCode?: unknown };
    };
    return candidate.errorCode ?? candidate.error?.errorCode ?? candidate.response?.errorCode;
  }
  return undefined;
}

export function logPass(message: string): void {
  console.log(`PASS ${message}`);
}

export function logInfo(message: string): void {
  console.log(`INFO ${message}`);
}

export function responseData<T>(response: { data?: T }, label: string): T {
  assertOk(response.data, `${label} response has no data`);
  return response.data;
}

function createPostgresDataSource(database: string, entities: Array<new () => ObjectLiteral>): Promise<DataSource> {
  return new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: envNumber('TYPEORM_PORT', 15432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database,
    synchronize: false,
    entities,
  }).initialize();
}

function canConnectTcp(host: string, port: number): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (result: { ok: boolean; reason?: string }) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, reason: `${host}:${port} timed out` }));
    socket.once('error', (error) => done({ ok: false, reason: `${host}:${port} ${error.message}` }));
    socket.connect(port, host);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ORDER_A_TCP = {
  host: process.env['SCALE_TEST_ORDER_A_TCP_HOST'] ?? process.env['TCP_ORDER_SERVICE_HOST'] ?? 'localhost',
  port: envNumber('SCALE_TEST_ORDER_A_TCP_PORT', 4201),
};

export const ORDER_B_TCP = {
  host: process.env['SCALE_TEST_ORDER_B_TCP_HOST'] ?? 'localhost',
  port: envNumber('SCALE_TEST_ORDER_B_TCP_PORT', 4211),
};
