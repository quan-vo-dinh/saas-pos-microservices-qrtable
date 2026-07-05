import { io, type Socket as SocketIoClient } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
import {
  assertOk,
  cleanupOrderTenant,
  cleanupSaasTenant,
  createOrderDataSource,
  createRedis,
  createSaasDataSource,
  destroyDataSources,
  logInfo,
  logPass,
  scaleTenantId,
  seedBffCartFixture,
  waitForHttp,
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

const BFF_A_URL = process.env['SCALE_TEST_BFF_A_URL'] ?? 'http://localhost:4300';
const BFF_B_URL = process.env['SCALE_TEST_BFF_B_URL'] ?? 'http://localhost:4302';
const API_PREFIX = process.env['GLOBAL_PREFIX'] ?? 'api/v1';
const SOCKET_EVENT_TIMEOUT_MS = 12_000;

async function main(): Promise<void> {
  await waitForHttp(`${BFF_A_URL}/${API_PREFIX}/health/live`, 'BFF-A');
  await waitForHttp(`${BFF_B_URL}/${API_PREFIX}/health/live`, 'BFF-B');

  const orderDataSource = await createOrderDataSource();
  const saasDataSource = await createSaasDataSource();
  const redis = createRedis();
  const tenantId = randomUUID();
  const tenantSlug = `scale-bff-${Date.now()}`;
  const seed = await seedBffCartFixture({ orderDataSource, saasDataSource, redis, tenantId, tenantSlug });
  let socket: SocketIoClient | null = null;

  try {
    socket = await connectCustomerSocket(seed.tenantId, seed.sessionId);
    const eventPromise = waitForCartUpdated(socket, seed.sessionId);

    const patch = await patchCartThroughBffA(seed.tenantId, seed.sessionId);
    assertOk(patch.cartVersion === 2, `BFF-A cart mutation returned cartVersion=${patch.cartVersion}, expected 2`);
    assertOk(patch.items[0]?.quantity === 2, 'BFF-A cart mutation did not update line quantity to 2');
    logPass('BFF-A accepted customer cart mutation with shared Order/Redis state');

    const event = await eventPromise;
    assertOk(event.cartVersion === 2, `BFF-B socket event cartVersion=${event.cartVersion}, expected 2`);
    assertOk(event.items[0]?.quantity === 2, 'BFF-B socket event did not contain updated quantity');
    logPass('BFF-B socket received events.cartUpdated emitted by BFF-A through Redis Adapter');

    const readBack = await getCartThroughBffB(seed.tenantId, seed.sessionId);
    assertOk(readBack.cartVersion === 2, `BFF-B read cartVersion=${readBack.cartVersion}, expected 2`);
    assertOk(readBack.items[0]?.quantity === 2, 'BFF-B read did not observe cart quantity from BFF-A mutation');
    logPass('BFF customer session continuity works across BFF-A and BFF-B');

    await maybeRunStaffAuthContinuity();
    logPass('BFF functional scale-out smoke completed');
  } finally {
    socket?.disconnect();
    await cleanupOrderTenant(orderDataSource, redis, seed);
    await cleanupSaasTenant(saasDataSource, seed.tenantId);
    await destroyDataSources(orderDataSource, saasDataSource);
    await redis.quit();
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

  logPass('Customer Socket.IO client connected to BFF-B /orders namespace');
  return socket;
}

function waitForCartUpdated(socket: SocketIoClient, sessionId: string): Promise<CartUpdatedEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out waiting for events.cartUpdated on BFF-B socket')),
      SOCKET_EVENT_TIMEOUT_MS,
    );
    socket.on('events.cartUpdated', (event: CartUpdatedEvent) => {
      if (event.sessionId !== sessionId) {
        return;
      }
      clearTimeout(timer);
      resolve(event);
    });
  });
}

async function patchCartThroughBffA(tenantId: string, sessionId: string): Promise<CartSnapshot> {
  const response = await fetch(`${BFF_A_URL}/${API_PREFIX}/customer/cart`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      'x-session-id': sessionId,
    },
    body: JSON.stringify({
      expectedCartVersion: 1,
      operation: 'SET_QUANTITY',
      cartLineId: 'line-1',
      quantity: 2,
      sessionClientId: 'scale-test-bff-a',
    }),
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

async function maybeRunStaffAuthContinuity(): Promise<void> {
  const staffToken = process.env['SCALE_TEST_STAFF_TOKEN']?.trim();
  if (!staffToken) {
    logInfo('Skipping staff auth continuity: set SCALE_TEST_STAFF_TOKEN to enable it');
    return;
  }

  await Promise.all([getMe(BFF_A_URL, staffToken, 'BFF-A'), getMe(BFF_B_URL, staffToken, 'BFF-B')]);
  logPass('Staff auth continuity works across BFF-A and BFF-B with the same JWT');
}

async function getMe(baseUrl: string, token: string, label: string): Promise<void> {
  const response = await fetch(`${baseUrl}/${API_PREFIX}/authorizer/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  await readApiData<unknown>(response, `${label} GET /authorizer/me`);
}

async function readApiData<T>(response: Response, label: string): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as ApiResponse<T> | undefined;
  if (!response.ok) {
    throw new Error(`${label} failed with ${response.status}: ${JSON.stringify(body)}`);
  }
  assertOk(body?.data, `${label} response did not contain data`);
  return body.data;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
