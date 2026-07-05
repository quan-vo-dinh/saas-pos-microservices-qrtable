import { io, type Socket as SocketIoClient } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import {
  cartGet,
  cartMutate,
  cleanupOrderTenant,
  cleanupSaasSubscriptionSeed,
  cleanupSaasTenant,
  cleanupStockRaceTenant,
  closeClients,
  confirmOrder,
  createCatalogDataSource,
  createOrderClient,
  createOrderDataSource,
  createRedis,
  createSaasDataSource,
  destroyDataSources,
  ORDER_A_TCP,
  ORDER_B_TCP,
  readErrorCode,
  responseData,
  scaleTenantId,
  seedBffCartFixture,
  seedOrderSessionWithCart,
  seedSaasActiveSubscription,
  seedStockRace,
  submitOrder,
  waitForHttp,
  waitForTcp,
} from './scale-test-utils';

type ApiResponse<T> = {
  data?: T;
  statusCode?: number;
  message?: string;
};

type CartLine = {
  cartLineId: string;
  quantity: number;
};

type CartSnapshot = {
  tenantId: string;
  sessionId: string;
  cartVersion: number;
  items: CartLine[];
};

type CartUpdatedEvent = CartSnapshot & {
  updatedAt: string;
};

type EvidenceMode = 'bff' | 'order';

const BFF_A_URL = process.env['SCALE_TEST_BFF_A_URL'] ?? 'http://localhost:4300';
const BFF_B_URL = process.env['SCALE_TEST_BFF_B_URL'] ?? 'http://localhost:4302';
const API_PREFIX = process.env['GLOBAL_PREFIX'] ?? 'api/v1';
const SOCKET_EVENT_TIMEOUT_MS = 12_000;
const SOCKET_DUPLICATE_SETTLE_MS = 500;
const ORDER_STATUS_PENDING = 'PENDING';
const ORDER_STATUS_PROCESSING = 'PROCESSING';

async function main(): Promise<void> {
  const mode = process.argv[2] as EvidenceMode | undefined;
  if (mode !== 'bff' && mode !== 'order') {
    throw new Error('Usage: collect-scale-out-evidence.ts <bff|order>');
  }

  const evidence = mode === 'bff' ? await collectBffEvidence() : await collectOrderEvidence();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}

async function collectBffEvidence(): Promise<Record<string, unknown>> {
  const startedAt = new Date().toISOString();
  await waitForHttp(`${BFF_A_URL}/${API_PREFIX}/health/live`, 'BFF-A');
  await waitForHttp(`${BFF_B_URL}/${API_PREFIX}/health/live`, 'BFF-B');

  const orderDataSource = await createOrderDataSource();
  const saasDataSource = await createSaasDataSource();
  const redis = createRedis();
  const tenantId = randomUUID();
  const tenantSlug = `scale-bff-allure-${Date.now()}`;
  const seed = await seedBffCartFixture({ orderDataSource, saasDataSource, redis, tenantId, tenantSlug });
  let socket: SocketIoClient | null = null;

  try {
    socket = await connectCustomerSocket(seed.tenantId, seed.sessionId);
    const eventPromise = collectCartUpdatedEvents(socket, seed.sessionId);
    const requestBody = {
      expectedCartVersion: 1,
      operation: 'SET_QUANTITY',
      cartLineId: 'line-1',
      quantity: 2,
      sessionClientId: 'scale-test-bff-a-allure',
    };
    const patch = await patchCartThroughBffA(seed.tenantId, seed.sessionId, requestBody);
    const eventEvidence = await eventPromise;
    const readBack = await getCartThroughBffB(seed.tenantId, seed.sessionId);

    assertEqual(patch.cartVersion, 2, 'BFF-A patch cartVersion');
    assertEqual(patch.items[0]?.quantity, 2, 'BFF-A patch quantity');
    assertAtLeast(eventEvidence.receivedCount, 1, 'BFF-B received event count');
    assertEqual(eventEvidence.firstEvent.cartVersion, 2, 'BFF-B event cartVersion');
    assertEqual(readBack.cartVersion, 2, 'BFF-B read cartVersion');
    assertEqual(readBack.items[0]?.quantity, 2, 'BFF-B read quantity');

    return {
      kind: 'bff-scale-out',
      startedAt,
      completedAt: new Date().toISOString(),
      endpoints: { bffA: BFF_A_URL, bffB: BFF_B_URL, apiPrefix: API_PREFIX },
      seed,
      socket: {
        namespace: '/orders',
        connectedTo: BFF_B_URL,
        tenantId: seed.tenantId,
        sessionId: seed.sessionId,
      },
      command: {
        instance: 'BFF-A',
        method: 'PATCH',
        url: `${BFF_A_URL}/${API_PREFIX}/customer/cart`,
        requestBody,
        response: patch,
      },
      event: eventEvidence,
      readBack: {
        instance: 'BFF-B',
        url: `${BFF_B_URL}/${API_PREFIX}/customer/cart`,
        response: readBack,
      },
      conclusion: {
        claim: 'BFF functional scale-out for customer realtime/session path',
        redisAdapterEvidence: 'BFF-B received cartUpdated after BFF-A mutation',
        duplicateCount: eventEvidence.duplicateCount,
        finalCartVersion: readBack.cartVersion,
      },
    };
  } finally {
    socket?.disconnect();
    await cleanupOrderTenant(orderDataSource, redis, seed);
    await cleanupSaasTenant(saasDataSource, seed.tenantId);
    await destroyDataSources(orderDataSource, saasDataSource);
    await redis.quit();
  }
}

async function collectOrderEvidence(): Promise<Record<string, unknown>> {
  const startedAt = new Date().toISOString();
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
    const cartContinuity = await collectOrderCartContinuity(orderDataSource, redis, orderA, orderB);
    const submitReplay = await collectSubmitReplay(orderDataSource, saasDataSource, redis, orderA, orderB);
    const confirmConcurrency = await collectConfirmConcurrency(orderDataSource, catalogDataSource, orderA, orderB);

    return {
      kind: 'order-scale-out',
      startedAt,
      completedAt: new Date().toISOString(),
      endpoints: { orderA: ORDER_A_TCP, orderB: ORDER_B_TCP },
      cartContinuity,
      submitReplay,
      confirmConcurrency,
      conclusion: {
        claim: 'Order functional scale-out for shared state, idempotency, and command concurrency',
        invariants: [
          'one persisted order for replayed submit',
          'one confirmed order when stock is one',
          'one outbox row',
        ],
      },
    };
  } finally {
    await closeClients(orderA, orderB);
    await destroyDataSources(orderDataSource, catalogDataSource, saasDataSource);
    await redis.quit();
  }
}

async function collectOrderCartContinuity(
  orderDataSource: Awaited<ReturnType<typeof createOrderDataSource>>,
  redis: ReturnType<typeof createRedis>,
  orderA: ReturnType<typeof createOrderClient>,
  orderB: ReturnType<typeof createOrderClient>,
): Promise<Record<string, unknown>> {
  const seed = await seedOrderSessionWithCart(orderDataSource, redis, scaleTenantId('scale-allure-cart'));
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
    const readBack = responseData(
      await cartGet(orderB, { tenantId: seed.tenantId, sessionId: seed.sessionId }),
      'Order-B cart get',
    );
    assertEqual(mutated.cartVersion, 2, 'Order-A mutated cartVersion');
    assertEqual(readBack.cartVersion, 2, 'Order-B read cartVersion');
    return {
      seed,
      mutated: {
        instance: 'Order-A',
        port: ORDER_A_TCP.port,
        response: mutated,
      },
      readBack: {
        instance: 'Order-B',
        port: ORDER_B_TCP.port,
        response: readBack,
      },
    };
  } finally {
    await cleanupOrderTenant(orderDataSource, redis, { ...seed, tenantSlug: 'unused' });
  }
}

async function collectSubmitReplay(
  orderDataSource: Awaited<ReturnType<typeof createOrderDataSource>>,
  saasDataSource: Awaited<ReturnType<typeof createSaasDataSource>>,
  redis: ReturnType<typeof createRedis>,
  orderA: ReturnType<typeof createOrderClient>,
  orderB: ReturnType<typeof createOrderClient>,
): Promise<Record<string, unknown>> {
  const tenantId = randomUUID();
  const saasSeed = await seedSaasActiveSubscription(saasDataSource, tenantId);
  const seed = await seedOrderSessionWithCart(orderDataSource, redis, tenantId);
  const idempotencyKey = `scale-allure-submit-${randomUUID()}`;
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
    const orders = await orderDataSource.getRepository(Order).findBy({
      tenantId: seed.tenantId,
      sessionId: seed.sessionId,
    });
    assertEqual(
      results.every((result) => result.status === 'fulfilled'),
      true,
      'submit replay fulfillment',
    );
    assertEqual(orders.length, 1, 'persisted order count');
    return {
      seed,
      idempotencyKey,
      concurrentRequests: [
        { index: 0, targetInstance: 'Order-A', port: ORDER_A_TCP.port },
        { index: 1, targetInstance: 'Order-B', port: ORDER_B_TCP.port },
      ],
      results: summarizeSettledResults(results),
      persistedOrders: orders.map((order) => ({
        id: order.id,
        status: order.status,
        idempotencyKey: order.idempotencyKey,
      })),
    };
  } finally {
    await cleanupOrderTenant(orderDataSource, redis, { ...seed, tenantSlug: 'unused' });
    await cleanupSaasSubscriptionSeed(saasDataSource, saasSeed);
  }
}

async function collectConfirmConcurrency(
  orderDataSource: Awaited<ReturnType<typeof createOrderDataSource>>,
  catalogDataSource: Awaited<ReturnType<typeof createCatalogDataSource>>,
  orderA: ReturnType<typeof createOrderClient>,
  orderB: ReturnType<typeof createOrderClient>,
): Promise<Record<string, unknown>> {
  const tenantId = scaleTenantId('scale-allure-confirm');
  const seed = await seedStockRace(orderDataSource, catalogDataSource, tenantId);
  try {
    const results = await Promise.allSettled([
      confirmOrder(orderA, { tenantId, orderId: seed.orderIds[0], userId: 'scale-staff-a' }),
      confirmOrder(orderB, { tenantId, orderId: seed.orderIds[1], userId: 'scale-staff-b' }),
    ]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    const finalMenuItem = await catalogDataSource.getRepository(MenuItem).findOneByOrFail({ id: seed.menuItemId });
    const orders = await orderDataSource.getRepository(Order).find({
      where: seed.orderIds.map((id) => ({ id, tenantId })),
    });
    const outboxRows = await orderDataSource.getRepository(OutboxEvent).findBy({
      tenantId,
      eventType: 'order.confirmed',
    });
    assertEqual(fulfilled.length, 1, 'confirm success count');
    assertEqual(rejected.length, 1, 'confirm failure count');
    assertEqual(readErrorCode(rejected[0].reason), ErrorCode.CATALOG_STOCK_INSUFFICIENT, 'confirm failure code');
    assertEqual(finalMenuItem.stock, 0, 'final stock');
    assertEqual(orders.filter((order) => order.status === ORDER_STATUS_PROCESSING).length, 1, 'PROCESSING order count');
    assertEqual(orders.filter((order) => order.status === ORDER_STATUS_PENDING).length, 1, 'PENDING order count');
    return {
      seed,
      concurrentRequests: [
        { index: 0, targetInstance: 'Order-A', port: ORDER_A_TCP.port, orderId: seed.orderIds[0] },
        { index: 1, targetInstance: 'Order-B', port: ORDER_B_TCP.port, orderId: seed.orderIds[1] },
      ],
      results: summarizeSettledResults(results),
      finalStock: finalMenuItem.stock,
      orderStatuses: orders.map((order) => ({ id: order.id, status: order.status })),
      orderConfirmedOutboxRows: outboxRows.map((row) => ({ id: row.id, status: row.status })),
    };
  } finally {
    await cleanupStockRaceTenant(orderDataSource, catalogDataSource, tenantId);
  }
}

async function connectCustomerSocket(tenantId: string, sessionId: string): Promise<SocketIoClient> {
  const socket = io(`${BFF_B_URL}/orders`, {
    transports: ['websocket'],
    auth: { tenantId, sessionId },
    reconnection: false,
    timeout: SOCKET_EVENT_TIMEOUT_MS,
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Socket.IO connect timeout on BFF-B')), SOCKET_EVENT_TIMEOUT_MS);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once('events.authError', (payload) => {
      clearTimeout(timer);
      reject(new Error(`Socket auth error: ${JSON.stringify(payload)}`));
    });
  });

  return socket;
}

function collectCartUpdatedEvents(
  socket: SocketIoClient,
  sessionId: string,
): Promise<{
  firstEvent: CartUpdatedEvent;
  receivedCount: number;
  duplicateCount: number;
  receivedEvents: CartUpdatedEvent[];
}> {
  return new Promise((resolve, reject) => {
    const events: CartUpdatedEvent[] = [];
    let settleTimer: NodeJS.Timeout | null = null;
    const timeoutTimer = setTimeout(() => {
      socket.off('events.cartUpdated', onEvent);
      reject(new Error('Timed out waiting for events.cartUpdated on BFF-B socket'));
    }, SOCKET_EVENT_TIMEOUT_MS);

    const finish = () => {
      clearTimeout(timeoutTimer);
      socket.off('events.cartUpdated', onEvent);
      resolve({
        firstEvent: events[0],
        receivedCount: events.length,
        duplicateCount: Math.max(0, events.length - 1),
        receivedEvents: events,
      });
    };

    const onEvent = (event: CartUpdatedEvent) => {
      if (event.sessionId !== sessionId) {
        return;
      }
      events.push(event);
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      settleTimer = setTimeout(finish, SOCKET_DUPLICATE_SETTLE_MS);
    };

    socket.on('events.cartUpdated', onEvent);
  });
}

async function patchCartThroughBffA(
  tenantId: string,
  sessionId: string,
  requestBody: Record<string, unknown>,
): Promise<CartSnapshot> {
  const response = await fetch(`${BFF_A_URL}/${API_PREFIX}/customer/cart`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      'x-session-id': sessionId,
    },
    body: JSON.stringify(requestBody),
  });
  return readApiData<CartSnapshot>(response, 'BFF-A PATCH /customer/cart');
}

async function getCartThroughBffB(tenantId: string, sessionId: string): Promise<CartSnapshot> {
  const response = await fetch(`${BFF_B_URL}/${API_PREFIX}/customer/cart`, {
    headers: {
      'x-tenant-id': tenantId,
      'x-session-id': sessionId,
    },
  });
  return readApiData<CartSnapshot>(response, 'BFF-B GET /customer/cart');
}

async function readApiData<T>(response: Response, label: string): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as ApiResponse<T> | undefined;
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  if (!body?.data) {
    throw new Error(`${label} response did not contain data`);
  }
  return body.data;
}

function summarizeSettledResults(results: Array<PromiseSettledResult<unknown>>): Array<Record<string, unknown>> {
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { index, status: 'fulfilled' };
    }
    return {
      index,
      status: 'rejected',
      errorCode: readErrorCode(result.reason),
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertAtLeast(actual: number, min: number, label: string): void {
  if (actual < min) {
    throw new Error(`${label}: expected at least ${min}, got ${actual}`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
