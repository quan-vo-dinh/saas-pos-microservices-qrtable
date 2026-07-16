import { TCP_SERVICES } from '@common/configuration/tcp.config';
import {
  CATEGORY_STATUS,
  MENU_ITEM_STATUS,
  PREPARATION_STATION,
  StockReservationState,
} from '@common/constants/enum/catalog.enum';
import { Bill } from '@common/entities/bill.entity';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Session } from '@common/entities/session.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import type {
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
} from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { BillStatus, OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { Socket } from 'node:net';
import { DataSource } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { CatalogStockGatewayService } from '../services/catalog-stock-gateway.service';
import { OrderConfirmSagaService } from '../services/order-confirm-saga.service';

const RUN_INTEGRATION = process.env['RUN_PHASE5_STOCK_INTEGRATION'] === '1';
const TENANT_PREFIX = 'phase5-stock-idempotency';
const maybeDescribe = RUN_INTEGRATION ? describe : describe.skip;

type Harness = {
  orderDataSource: DataSource;
  catalogDataSource: DataSource;
  catalogClient: ClientProxy;
  catalogGateway: CatalogStockGatewayService;
};

type SeedRows = {
  tenantId: string;
  orderId: string;
  menuItemId: string;
  initialStock: number;
  quantity: number;
};

type ReadinessResult = { ok: boolean; reason?: string };

maybeDescribe('Order Confirm stock reservation idempotency integration', () => {
  jest.setTimeout(30_000);

  let harness: Harness | null = null;
  let currentTenantId: string | null = null;

  beforeAll(async () => {
    const readiness = await ensureExternalStackReady();
    if (!readiness.ok) {
      throw new Error(`[Order Confirm stock idempotency integration not ready] ${readiness.reason}`);
    }
    harness = await createHarness();
  });

  afterEach(async () => {
    if (harness && currentTenantId) {
      await cleanupTenant(harness, currentTenantId);
    }
    currentTenantId = null;
  });

  afterAll(async () => {
    await harness?.catalogClient.close();
    if (harness?.orderDataSource.isInitialized) {
      await harness.orderDataSource.destroy();
    }
    if (harness?.catalogDataSource.isInitialized) {
      await harness.catalogDataSource.destroy();
    }
  });

  it('deducts stock once when the same tenant, order, key, and payload are sent twice', async () => {
    console.log(
      '\n  [TEST 2.1] 🚀 Starting Integration Flow: Verify stock is deducted exactly once on duplicate requests',
    );
    const activeHarness = requireHarness(harness);
    const seed = await seedPendingOrder(activeHarness);
    currentTenantId = seed.tenantId;
    const request = deductRequest(seed);

    console.log('  [TEST 2.1] 🔄 Send stock deduct request #1...');
    const first = await activeHarness.catalogGateway.deductForOrder(request);
    console.log('  [TEST 2.1] 🔄 Send stock deduct request #2 (Duplicate)...');
    const second = await activeHarness.catalogGateway.deductForOrder(request);

    console.log('  [TEST 2.1] ✅ Verify outcomes: 1st = APPLIED, 2nd = REPLAYED');
    expect(first.outcome).toBe('APPLIED');
    expect(second.outcome).toBe('REPLAYED');
    expect(second.reservationVersion).toBe(first.reservationVersion);
    const finalMenuItem = await activeHarness.catalogDataSource
      .getRepository(MenuItem)
      .findOneByOrFail({ id: seed.menuItemId, tenantId: seed.tenantId });
    console.log(
      `  [TEST 2.1] 📊 Initial stock: ${seed.initialStock}, Final stock after 2 calls: ${finalMenuItem.stock} (Reduced by exactly ${seed.quantity} unit(s))`,
    );
    expect(finalMenuItem.stock).toBe(seed.initialStock - seed.quantity);
    console.log('  [TEST 2.1] 🎉 Test Case 2.1 PASSED!');
  });

  it('recovers a lost deduct response on confirm retry without a second stock mutation', async () => {
    console.log('\n  [TEST 2.2] 🚀 Starting Integration Flow: Recover lost deduct response on confirm retry');
    const activeHarness = requireHarness(harness);
    const seed = await seedPendingOrder(activeHarness);
    currentTenantId = seed.tenantId;
    const syntheticTransportError = new Error('Synthetic lost Catalog deduct response');
    let discardFirstResponse = true;
    const faultInjectingGateway = {
      deductForOrder: async (request: StockDeductForOrderTcpRequest) => {
        const result = await activeHarness.catalogGateway.deductForOrder(request);
        if (discardFirstResponse) {
          discardFirstResponse = false;
          console.log('  [TEST 2.2] 💥 [Simulated] Network lost immediately after Catalog reserves stock in DB');
          throw syntheticTransportError;
        }
        return result;
      },
      releaseForOrder: (request: StockReleaseForOrderTcpRequest) =>
        activeHarness.catalogGateway.releaseForOrder(request),
    };
    const saga = createOrderConfirmSaga(activeHarness.orderDataSource, faultInjectingGateway);

    console.log('  [TEST 2.2] 🔄 Staff confirms order first time -> Expecting transport network error');
    await expect(
      saga.confirmOrder({ tenantId: seed.tenantId, orderId: seed.orderId, userId: 'phase5-staff' }),
    ).rejects.toBe(syntheticTransportError);

    const orderAfterLostResponse = await activeHarness.orderDataSource
      .getRepository(Order)
      .findOneByOrFail({ id: seed.orderId, tenantId: seed.tenantId });
    const stockAfterLostResponse = await activeHarness.catalogDataSource
      .getRepository(MenuItem)
      .findOneByOrFail({ id: seed.menuItemId, tenantId: seed.tenantId });
    console.log('  [TEST 2.2] 📊 Verify: Order remains PENDING but Catalog has already deducted the stock');
    expect(orderAfterLostResponse.status).toBe(OrderStatus.PENDING);
    expect(stockAfterLostResponse.stock).toBe(seed.initialStock - seed.quantity);

    console.log('  [TEST 2.2] 🔄 Staff triggers confirm order again (Retry)...');
    await saga.confirmOrder({ tenantId: seed.tenantId, orderId: seed.orderId, userId: 'phase5-staff' });

    const confirmedOrder = await activeHarness.orderDataSource
      .getRepository(Order)
      .findOneByOrFail({ id: seed.orderId, tenantId: seed.tenantId });
    const finalMenuItem = await activeHarness.catalogDataSource
      .getRepository(MenuItem)
      .findOneByOrFail({ id: seed.menuItemId, tenantId: seed.tenantId });
    const outboxRows = await activeHarness.orderDataSource.getRepository(OutboxEvent).findBy({
      tenantId: seed.tenantId,
      aggregateId: seed.orderId,
      eventType: 'order.confirmed',
    });
    console.log(
      '  [TEST 2.2] ✅ Verify: Order changes to PROCESSING successfully, Outbox Event is created, and final stock is unchanged',
    );
    expect(confirmedOrder.status).toBe(OrderStatus.PROCESSING);
    expect(confirmedOrder.stockReservationVersion).toBe(1);
    expect(finalMenuItem.stock).toBe(seed.initialStock - seed.quantity);
    expect(outboxRows).toHaveLength(1);
    console.log('  [TEST 2.2] 🎉 Test Case 2.2 PASSED!');
  });

  it('increments the version after compensation and ignores a stale release', async () => {
    console.log(
      '\n  [TEST 2.3] 🚀 Starting Integration Flow: Increment version after compensation and ignore stale releases',
    );
    const activeHarness = requireHarness(harness);
    const seed = await seedPendingOrder(activeHarness);
    currentTenantId = seed.tenantId;
    const deduct = deductRequest(seed);

    console.log('  [TEST 2.3] 🔄 Step 1: Deduct stock version 1');
    const firstDeduct = await activeHarness.catalogGateway.deductForOrder(deduct);
    console.log('  [TEST 2.3] 🔄 Step 2: Trigger release stock version 1');
    const firstRelease = await activeHarness.catalogGateway.releaseForOrder({
      ...releaseRequest(seed, firstDeduct.reservationVersion),
      idempotencyKey: `confirm-order-compensation:${seed.orderId}:1`,
    });
    console.log('  [TEST 2.3] 🔄 Step 3: Deduct stock version 2');
    const secondDeduct = await activeHarness.catalogGateway.deductForOrder(deduct);
    console.log('  [TEST 2.3] 🔄 Step 4: Simulate delayed stale release (version 1) arriving late at Catalog');
    const staleRelease = await activeHarness.catalogGateway.releaseForOrder({
      ...releaseRequest(seed, firstDeduct.reservationVersion),
      idempotencyKey: `delayed-compensation:${seed.orderId}:1`,
    });

    console.log(
      '  [TEST 2.3] ✅ Verify: Catalog detects stale release version and ignores it to prevent wrong inventory state',
    );
    expect(firstDeduct).toMatchObject({ reservationVersion: 1, outcome: 'APPLIED' });
    expect(firstRelease).toMatchObject({ reservationVersion: 1, outcome: 'APPLIED' });
    expect(secondDeduct).toMatchObject({ reservationVersion: 2, outcome: 'APPLIED' });
    expect(staleRelease).toEqual({ reservationVersion: 2, outcome: 'STALE', items: [] });
    const reservation = await activeHarness.catalogDataSource
      .getRepository(StockReservation)
      .findOneByOrFail({ tenantId: seed.tenantId, orderId: seed.orderId });
    const finalMenuItem = await activeHarness.catalogDataSource
      .getRepository(MenuItem)
      .findOneByOrFail({ id: seed.menuItemId, tenantId: seed.tenantId });
    expect(reservation).toMatchObject({ version: 2, state: StockReservationState.Reserved });
    expect(finalMenuItem.stock).toBe(seed.initialStock - seed.quantity);
    console.log('  [TEST 2.3] 🎉 Test Case 2.3 PASSED!');
  });
});

function createOrderConfirmSaga(
  dataSource: DataSource,
  catalogGateway: Pick<CatalogStockGatewayService, 'deductForOrder' | 'releaseForOrder'>,
): OrderConfirmSagaService {
  return new OrderConfirmSagaService(
    dataSource,
    new OrderRepository(dataSource.getRepository(Order)),
    new OrderItemRepository(dataSource.getRepository(OrderItem)),
    new BillRepository(dataSource.getRepository(Bill)),
    catalogGateway as CatalogStockGatewayService,
  );
}

async function createHarness(): Promise<Harness> {
  const orderDataSource = await createOrderDataSource();
  const catalogDataSource = await createCatalogDataSource();
  const catalogClient = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: catalogTcpOptions(),
  });
  await catalogClient.connect();
  return {
    orderDataSource,
    catalogDataSource,
    catalogClient,
    catalogGateway: new CatalogStockGatewayService(catalogClient as unknown as TcpClient),
  };
}

function createOrderDataSource(): Promise<DataSource> {
  return new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database: process.env['ORDER_TYPEORM_DATABASE'] ?? 'qrtable_order',
    synchronize: false,
    entities: [Session, Order, OrderItem, Bill, OutboxEvent],
  }).initialize();
}

function createCatalogDataSource(): Promise<DataSource> {
  return new DataSource({
    type: 'postgres',
    host: process.env['TYPEORM_HOST'] ?? 'localhost',
    port: Number(process.env['TYPEORM_PORT'] ?? 5432),
    username: process.env['TYPEORM_USERNAME'] ?? 'postgres',
    password: process.env['TYPEORM_PASSWORD'] ?? 'postgres',
    database: process.env['CATALOG_TYPEORM_DATABASE'] ?? 'qrtable_catalog',
    synchronize: false,
    entities: [Category, MenuItem, StockReservation],
  }).initialize();
}

async function seedPendingOrder(harness: Harness): Promise<SeedRows> {
  const tenantId = `${TENANT_PREFIX}-${randomUUID()}`;
  const initialStock = 5;
  const quantity = 2;
  await cleanupTenant(harness, tenantId);

  const categoryRepository = harness.catalogDataSource.getRepository(Category);
  const menuItemRepository = harness.catalogDataSource.getRepository(MenuItem);
  const category = await categoryRepository.save(
    categoryRepository.create({
      tenantId,
      name: `Idempotency ${randomUUID()}`,
      sortOrder: 0,
      status: CATEGORY_STATUS.ACTIVE,
    }),
  );
  const menuItem = await menuItemRepository.save(
    menuItemRepository.create({
      tenantId,
      categoryId: category.id,
      name: 'Idempotency Item',
      description: null,
      price: 1_000,
      imageUrl: null,
      imagePublicId: null,
      stock: initialStock,
      sortOrder: 0,
      status: MENU_ITEM_STATUS.AVAILABLE,
      station: PREPARATION_STATION.KITCHEN,
    }),
  );

  const sessionRepository = harness.orderDataSource.getRepository(Session);
  const orderRepository = harness.orderDataSource.getRepository(Order);
  const session = await sessionRepository.save(
    sessionRepository.create({
      tenantId,
      tableId: randomUUID(),
      tableName: 'Idempotency Table',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
      lastActivity: new Date(),
      closedAt: null,
      orderCount: 1,
      currentBillId: null,
      version: 1,
    }),
  );
  const order = await orderRepository.save(
    orderRepository.create({
      tenantId,
      tableId: session.tableId,
      tableName: session.tableName,
      sessionId: session.id,
      status: OrderStatus.PENDING,
      totalAmount: quantity * 1_000,
      idempotencyKey: `phase5-${randomUUID()}`,
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      stockReservationVersion: null,
    }),
  );
  await harness.orderDataSource.getRepository(OrderItem).save({
    tenantId,
    orderId: order.id,
    menuItemId: menuItem.id,
    menuItemName: menuItem.name,
    menuItemImageUrl: null,
    quantity,
    unitPrice: 1_000,
    note: null,
    status: OrderItemStatus.PROCESSING,
    station: PREPARATION_STATION.KITCHEN,
  });
  const bill = await harness.orderDataSource.getRepository(Bill).save({
    tenantId,
    sessionId: session.id,
    orderIds: [order.id],
    subtotal: quantity * 1_000,
    total: quantity * 1_000,
    roundingAmount: 0,
    paymentMethod: null,
    status: BillStatus.OPEN,
    closedAt: null,
    paidAt: null,
    paymentId: null,
  });
  session.currentBillId = bill.id;
  await sessionRepository.save(session);

  return { tenantId, orderId: order.id, menuItemId: menuItem.id, initialStock, quantity };
}

function deductRequest(seed: SeedRows): StockDeductForOrderTcpRequest {
  return {
    tenantId: seed.tenantId,
    orderId: seed.orderId,
    idempotencyKey: `confirm-order:${seed.orderId}`,
    items: [{ menuItemId: seed.menuItemId, quantity: seed.quantity }],
  };
}

function releaseRequest(seed: SeedRows, reservationVersion: number): StockReleaseForOrderTcpRequest {
  return {
    tenantId: seed.tenantId,
    orderId: seed.orderId,
    idempotencyKey: `release:${seed.orderId}:${reservationVersion}`,
    reservationVersion,
    items: [{ menuItemId: seed.menuItemId, quantity: seed.quantity }],
  };
}

async function cleanupTenant(harness: Harness, tenantId: string): Promise<void> {
  await harness.orderDataSource.getRepository(OutboxEvent).delete({ tenantId });
  await harness.orderDataSource.getRepository(OrderItem).delete({ tenantId });
  await harness.orderDataSource.getRepository(Order).delete({ tenantId });
  await harness.orderDataSource.getRepository(Bill).delete({ tenantId });
  await harness.orderDataSource.getRepository(Session).delete({ tenantId });
  await harness.catalogDataSource.getRepository(StockReservation).delete({ tenantId });
  await harness.catalogDataSource.getRepository(MenuItem).delete({ tenantId });
  await harness.catalogDataSource.getRepository(Category).delete({ tenantId });
}

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
    await catalogProbe.destroy();
  } catch (error) {
    return { ok: false, reason: `PostgreSQL not ready: ${readinessMessage(error)}` };
  }

  const catalogTcp = await canConnectTcp(catalogTcpOptions().host, catalogTcpOptions().port);
  return catalogTcp.ok
    ? { ok: true }
    : { ok: false, reason: `Catalog TCP not ready: ${catalogTcp.reason ?? 'unknown readiness failure'}` };
}

function catalogTcpOptions(): { host: string; port: number } {
  return {
    host: process.env['TCP_CATALOG_SERVICE_HOST'] ?? 'localhost',
    port: Number(process.env[`${TCP_SERVICES.CATALOG_SERVICE}_PORT`] ?? 3205),
  };
}

function canConnectTcp(host: string, port: number): Promise<ReadinessResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    const done = (result: ReadinessResult) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(1_000);
    socket.once('connect', () => done({ ok: true }));
    socket.once('timeout', () => done({ ok: false, reason: `${host}:${port} timed out` }));
    socket.once('error', (error) => done({ ok: false, reason: `${host}:${port} ${readinessMessage(error)}` }));
    socket.connect(port, host);
  });
}

function requireHarness(harness: Harness | null): Harness {
  if (!harness) {
    throw new Error('Integration harness is not initialized');
  }
  return harness;
}

function readinessMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
