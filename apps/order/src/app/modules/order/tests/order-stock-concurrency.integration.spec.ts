import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { CATEGORY_STATUS, MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Session } from '@common/entities/session.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { OrderActionTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { BillStatus, OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { randomUUID } from 'crypto';
import { Socket } from 'net';
import { firstValueFrom, timeout } from 'rxjs';
import { DataSource } from 'typeorm';

const RUN_INTEGRATION = process.env['RUN_PHASE5_STOCK_INTEGRATION'] === '1';
const TENANT_PREFIX = 'phase5-stock';
const TCP_TIMEOUT_MS = 5000;

type SeedRows = {
  tenantId: string;
  orderIds: [string, string];
  menuItemId: string;
};

type ReadinessResult = { ok: boolean; reason?: string };

const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

maybeDescribe('Phase 5 P0-ORD-STATE-STOCK external-stack integration', () => {
  jest.setTimeout(30000);

  let orderDataSource: DataSource | null = null;
  let catalogDataSource: DataSource | null = null;
  let orderClient: ClientProxy | null = null;
  let seed: SeedRows | null = null;
  let currentTenantId: string | null = null;

  afterEach(async () => {
    if (orderDataSource && catalogDataSource && currentTenantId) {
      await cleanupTenant(orderDataSource, catalogDataSource, currentTenantId);
    }
    seed = null;
    currentTenantId = null;
  });

  afterAll(async () => {
    await orderClient?.close();
    if (orderDataSource?.isInitialized) {
      await orderDataSource.destroy();
    }
    if (catalogDataSource?.isInitialized && catalogDataSource !== orderDataSource) {
      await catalogDataSource.destroy();
    }
  });

  it('stock=1 with two concurrent staff confirmations yields one success, one stock failure, final stock 0, and one order.confirmed outbox', async () => {
    console.log(
      '\n  [TEST 3.1] 🚀 Starting Concurrent Integration Flow: Race Condition on last item in stock (stock = 1)',
    );
    const readiness = await ensureExternalStackReady();
    if (!readiness.ok) {
      throw new Error(`[Phase 5 stock integration not ready] ${readiness.reason ?? 'external stack is not ready'}`);
    }

    orderDataSource = await createOrderDataSource();
    catalogDataSource = await createCatalogDataSource();
    currentTenantId = `${TENANT_PREFIX}-${randomUUID()}`;

    console.log(
      '  [TEST 3.1] 🔍 Step 1: Seed data - Set stock = 1, create 2 concurrent PENDING orders purchasing this item',
    );
    seed = await seedStockRace(orderDataSource, catalogDataSource, currentTenantId);
    orderClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: process.env['TCP_ORDER_SERVICE_HOST'] ?? 'localhost',
        port: Number(process.env[TCP_SERVICES.ORDER_SERVICE + '_PORT'] ?? 3201),
      },
    });
    await orderClient.connect();

    console.log('  [TEST 3.1] 🔄 Step 2: Send 2 concurrent confirmOrder() requests (Race Condition)...');
    const results = await Promise.allSettled([
      confirmOrder(orderClient, seed.tenantId, seed.orderIds[0], 'phase5-staff-1'),
      confirmOrder(orderClient, seed.tenantId, seed.orderIds[1], 'phase5-staff-2'),
    ]);

    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<ResponseType<OrderActionTcpResponse>> => result.status === 'fulfilled',
    );
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    console.log(
      '  [TEST 3.1] ✅ Step 3: Verify results - Exactly 1 request succeeds, 1 request fails with stock insufficient error',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(readErrorCode(rejected[0].reason)).toBe(ErrorCode.CATALOG_STOCK_INSUFFICIENT);

    const finalMenuItem = await catalogDataSource.getRepository(MenuItem).findOneByOrFail({ id: seed.menuItemId });
    console.log(
      `  [TEST 3.1] 📊 Verify final stock quantity: ${finalMenuItem.stock} (reduced to 0 and marked OUT_OF_STOCK)`,
    );
    expect(finalMenuItem.stock).toBe(0);
    expect(finalMenuItem.stock).toBeGreaterThanOrEqual(0);
    expect(finalMenuItem.status).toBe(MENU_ITEM_STATUS.OUT_OF_STOCK);

    const finalOrders = await orderDataSource.getRepository(Order).find({
      where: seed.orderIds.map((id) => ({ id, tenantId: seed?.tenantId })),
      order: { id: 'ASC' },
    });
    console.log(
      `  [TEST 3.1] 📊 Trạng thái 2 đơn hàng: Order 1 = ${finalOrders[0].status}, Order 2 = ${finalOrders[1].status}`,
    );
    expect(finalOrders).toHaveLength(2);
    expect(finalOrders.filter((order) => order.status === OrderStatus.PROCESSING)).toHaveLength(1);
    expect(finalOrders.filter((order) => order.status === OrderStatus.PENDING)).toHaveLength(1);

    const outboxRows = await orderDataSource.getRepository(OutboxEvent).findBy({
      tenantId: seed.tenantId,
      eventType: 'order.confirmed',
    });
    console.log(
      `  [TEST 3.1] 💾 Verify Outbox Event: Correctly saved ${outboxRows.length} event record(s) for the successful order`,
    );
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0].aggregateId).toBe(finalOrders.find((order) => order.status === OrderStatus.PROCESSING)?.id);
    expect(outboxRows[0].payload).toEqual(
      expect.objectContaining({
        eventType: 'order.confirmed',
        tenantId: seed.tenantId,
        orderId: outboxRows[0].aggregateId,
      }),
    );
    console.log('  [TEST 3.1] 🎉 Test Case 3.1 PASSED!');
  });
});

async function ensureExternalStackReady(): Promise<ReadinessResult> {
  if (!RUN_INTEGRATION) {
    return { ok: false, reason: 'set RUN_PHASE5_STOCK_INTEGRATION=1 to opt in' };
  }

  try {
    const orderProbe = await createOrderDataSource();
    await orderProbe.query('SELECT 1');
    await orderProbe.destroy();

    const catalogProbe = await createCatalogDataSource();
    await catalogProbe.query('SELECT 1');
    if (catalogProbe !== orderProbe) {
      await catalogProbe.destroy();
    }
  } catch (error) {
    return { ok: false, reason: `PostgreSQL not ready: ${readinessMessage(error)}` };
  }

  const orderTcp = await canConnectTcp(
    process.env['TCP_ORDER_SERVICE_HOST'] ?? 'localhost',
    Number(process.env[TCP_SERVICES.ORDER_SERVICE + '_PORT'] ?? 3201),
  );
  if (!orderTcp.ok) {
    return { ok: false, reason: `Order TCP not ready: ${orderTcp.reason ?? 'unknown readiness failure'}` };
  }

  const catalogTcp = await canConnectTcp(
    process.env['TCP_CATALOG_SERVICE_HOST'] ?? 'localhost',
    Number(process.env[TCP_SERVICES.CATALOG_SERVICE + '_PORT'] ?? 3205),
  );
  if (!catalogTcp.ok) {
    return { ok: false, reason: `Catalog TCP not ready: ${catalogTcp.reason ?? 'unknown readiness failure'}` };
  }

  return { ok: true };
}

function createOrderDataSource(): Promise<DataSource> {
  const source = new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database: process.env['ORDER_TYPEORM_DATABASE'] ?? 'qrtable_order',
    synchronize: false,
    entities: [Category, MenuItem, Session, Order, OrderItem, Bill, OutboxEvent],
  });
  return source.initialize();
}

function createCatalogDataSource(): Promise<DataSource> {
  const source = new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database: process.env['CATALOG_TYPEORM_DATABASE'] ?? 'qrtable_catalog',
    synchronize: false,
    entities: [Category, MenuItem, StockReservation],
  });
  return source.initialize();
}

async function seedStockRace(
  orderDataSource: DataSource,
  catalogDataSource: DataSource,
  tenantId: string,
): Promise<SeedRows> {
  await cleanupTenant(orderDataSource, catalogDataSource, tenantId);

  const now = new Date();
  const tableId = randomUUID();
  const category = await catalogDataSource.getRepository(Category).save(
    catalogDataSource.getRepository(Category).create({
      tenantId,
      name: `Phase 5 Stock ${randomUUID()}`,
      sortOrder: 0,
      status: CATEGORY_STATUS.ACTIVE,
    }),
  );
  const menuItem = await catalogDataSource.getRepository(MenuItem).save(
    catalogDataSource.getRepository(MenuItem).create({
      tenantId,
      categoryId: category.id,
      name: 'Phase 5 Stock Item',
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
      tableName: 'Phase 5 Table',
      status: SessionStatus.ACTIVE,
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
      tableName: 'Phase 5 Table',
      sessionId: session.id,
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      idempotencyKey: `phase5-${randomUUID()}`,
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
      tableName: 'Phase 5 Table',
      sessionId: session.id,
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      idempotencyKey: `phase5-${randomUUID()}`,
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
        status: OrderItemStatus.PROCESSING,
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
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
      paymentId: null,
    }),
  );
  session.currentBillId = bill.id;
  await orderDataSource.getRepository(Session).save(session);

  return { tenantId, orderIds: [orders[0].id, orders[1].id], menuItemId: menuItem.id };
}

async function confirmOrder(
  client: ClientProxy,
  tenantId: string,
  orderId: string,
  userId: string,
): Promise<ResponseType<OrderActionTcpResponse>> {
  return firstValueFrom(
    client
      .send<
        ResponseType<OrderActionTcpResponse>,
        Request<{ tenantId: string; orderId: string; userId: string }>
      >(TCP_REQUEST_MESSAGE.ORDER.CONFIRM, new Request({ tenantId, data: { tenantId, orderId, userId } }))
      .pipe(timeout(TCP_TIMEOUT_MS)),
  );
}

async function cleanupTenant(
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

function canConnectTcp(host: string, port: number): Promise<ReadinessResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (result: ReadinessResult) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, reason: `${host}:${port} timed out` }));
    socket.once('error', (error) => done({ ok: false, reason: `${host}:${port} ${readinessMessage(error)}` }));
    socket.connect(port, host);
  });
}

function readErrorCode(error: unknown): unknown {
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

function readinessMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
