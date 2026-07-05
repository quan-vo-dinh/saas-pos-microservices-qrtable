import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { randomUUID } from 'node:crypto';
import {
  assertOk,
  cartGet,
  cartMutate,
  cleanupOrderTenant,
  cleanupSaasSubscriptionSeed,
  cleanupStockRaceTenant,
  closeClients,
  confirmOrder,
  createCatalogDataSource,
  createOrderClient,
  createOrderDataSource,
  createRedis,
  createSaasDataSource,
  destroyDataSources,
  logPass,
  ORDER_A_TCP,
  ORDER_B_TCP,
  readErrorCode,
  responseData,
  scaleTenantId,
  seedSaasActiveSubscription,
  seedOrderSessionWithCart,
  seedStockRace,
  submitOrder,
  waitForTcp,
} from './scale-test-utils';

const ORDER_STATUS_PENDING = 'PENDING';
const ORDER_STATUS_PROCESSING = 'PROCESSING';

async function main(): Promise<void> {
  await waitForTcp(ORDER_A_TCP.host, ORDER_A_TCP.port, 'Order-A TCP');
  await waitForTcp(ORDER_B_TCP.host, ORDER_B_TCP.port, 'Order-B TCP');

  const orderDataSource = await createOrderDataSource();
  const catalogDataSource = await createCatalogDataSource();
  const saasDataSource = await createSaasDataSource();
  const redis = createRedis();
  const orderA = createOrderClient(ORDER_A_TCP.host, ORDER_A_TCP.port);
  const orderB = createOrderClient(ORDER_B_TCP.host, ORDER_B_TCP.port);
  await Promise.all([orderA.connect(), orderB.connect()]);

  try {
    await runCartContinuity(orderDataSource, redis, orderA, orderB);
    await runSubmitReplay(orderDataSource, saasDataSource, redis, orderA, orderB);
    await runConfirmConcurrency(orderDataSource, catalogDataSource, orderA, orderB);
    logPass('Order functional scale-out smoke completed');
  } finally {
    await closeClients(orderA, orderB);
    await destroyDataSources(orderDataSource, catalogDataSource, saasDataSource);
    await redis.quit();
  }
}

async function runCartContinuity(
  orderDataSource: Awaited<ReturnType<typeof createOrderDataSource>>,
  redis: ReturnType<typeof createRedis>,
  orderA: ReturnType<typeof createOrderClient>,
  orderB: ReturnType<typeof createOrderClient>,
): Promise<void> {
  const seed = await seedOrderSessionWithCart(orderDataSource, redis, scaleTenantId('scale-order-cart'));
  try {
    const mutated = responseData(
      await cartMutate(orderA, {
        tenantId: seed.tenantId,
        sessionId: seed.sessionId,
        expectedCartVersion: 1,
        operation: 'SET_QUANTITY',
        cartLineId: 'line-1',
        quantity: 3,
      }),
      'Order-A cart mutate',
    );
    assertOk(mutated.cartVersion === 2, `Order-A cartVersion=${mutated.cartVersion}, expected 2`);

    const readBack = responseData(
      await cartGet(orderB, { tenantId: seed.tenantId, sessionId: seed.sessionId }),
      'Order-B cart get',
    );
    assertOk(readBack.cartVersion === 2, `Order-B cartVersion=${readBack.cartVersion}, expected 2`);
    assertOk(readBack.items[0]?.quantity === 3, 'Order-B did not observe Order-A cart quantity');
    logPass('Order cart/session continuity works across Order-A and Order-B');
  } finally {
    await cleanupOrderTenant(orderDataSource, redis, { ...seed, tenantSlug: 'unused' });
  }
}

async function runSubmitReplay(
  orderDataSource: Awaited<ReturnType<typeof createOrderDataSource>>,
  saasDataSource: Awaited<ReturnType<typeof createSaasDataSource>>,
  redis: ReturnType<typeof createRedis>,
  orderA: ReturnType<typeof createOrderClient>,
  orderB: ReturnType<typeof createOrderClient>,
): Promise<void> {
  const tenantId = randomUUID();
  const saasSeed = await seedSaasActiveSubscription(saasDataSource, tenantId);
  const seed = await seedOrderSessionWithCart(orderDataSource, redis, tenantId);
  const idempotencyKey = `scale-submit-${randomUUID()}`;
  try {
    const results = await Promise.allSettled([
      submitOrder(orderA, {
        tenantId: seed.tenantId,
        sessionId: seed.sessionId,
        expectedCartVersion: 1,
        idempotencyKey,
      }),
      submitOrder(orderB, {
        tenantId: seed.tenantId,
        sessionId: seed.sessionId,
        expectedCartVersion: 1,
        idempotencyKey,
      }),
    ]);

    assertOk(
      results.every((result) => result.status === 'fulfilled'),
      'Submit replay should fulfill on both instances',
    );
    const rows = await orderDataSource.getRepository(Order).findBy({
      tenantId: seed.tenantId,
      sessionId: seed.sessionId,
    });
    assertOk(rows.length === 1, `Expected one persisted order after replay, got ${rows.length}`);
    assertOk(rows[0].idempotencyKey === idempotencyKey, 'Persisted order idempotency key mismatch');
    logPass('Order idempotency/replay works across Order-A and Order-B');
  } finally {
    await cleanupOrderTenant(orderDataSource, redis, { ...seed, tenantSlug: 'unused' });
    await cleanupSaasSubscriptionSeed(saasDataSource, saasSeed);
  }
}

async function runConfirmConcurrency(
  orderDataSource: Awaited<ReturnType<typeof createOrderDataSource>>,
  catalogDataSource: Awaited<ReturnType<typeof createCatalogDataSource>>,
  orderA: ReturnType<typeof createOrderClient>,
  orderB: ReturnType<typeof createOrderClient>,
): Promise<void> {
  const tenantId = scaleTenantId('scale-order-confirm');
  const seed = await seedStockRace(orderDataSource, catalogDataSource, tenantId);
  try {
    const results = await Promise.allSettled([
      confirmOrder(orderA, { tenantId, orderId: seed.orderIds[0], userId: 'scale-staff-a' }),
      confirmOrder(orderB, { tenantId, orderId: seed.orderIds[1], userId: 'scale-staff-b' }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    assertOk(fulfilled.length === 1, `Expected one confirm success, got ${fulfilled.length}`);
    assertOk(rejected.length === 1, `Expected one confirm failure, got ${rejected.length}`);
    assertOk(
      readErrorCode(rejected[0].reason) === ErrorCode.CATALOG_STOCK_INSUFFICIENT,
      `Expected CATALOG_STOCK_INSUFFICIENT, got ${String(readErrorCode(rejected[0].reason))}`,
    );

    const finalMenuItem = await catalogDataSource.getRepository(MenuItem).findOneByOrFail({ id: seed.menuItemId });
    assertOk(finalMenuItem.stock === 0, `Final stock=${finalMenuItem.stock}, expected 0`);

    const orders = await orderDataSource.getRepository(Order).find({
      where: seed.orderIds.map((id) => ({ id, tenantId })),
    });
    assertOk(
      orders.filter((order) => order.status === ORDER_STATUS_PROCESSING).length === 1,
      'Expected one PROCESSING order',
    );
    assertOk(
      orders.filter((order) => order.status === ORDER_STATUS_PENDING).length === 1,
      'Expected one PENDING order',
    );

    const outboxRows = await orderDataSource.getRepository(OutboxEvent).findBy({
      tenantId,
      eventType: 'order.confirmed',
    });
    assertOk(outboxRows.length === 1, `Expected one order.confirmed outbox row, got ${outboxRows.length}`);

    logPass('Order command concurrency works across Order-A and Order-B');
  } finally {
    await cleanupStockRaceTenant(orderDataSource, catalogDataSource, tenantId);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
