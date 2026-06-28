import { check, group, sleep } from 'k6';
import {
  MENU_ITEM_ID,
  OK_RESPONSE,
  QR_TOKEN,
  TABLE_ID,
  benchmarkId,
  customerHeaders,
  dataOf,
  getJson,
  jsonHeaders,
  patchJson,
  postJson,
  orderSubmitIdempotencyKey,
  withRequestOptions,
} from './helpers.js';

const CUSTOMER_VUS = Number(__ENV.CUSTOMER_VUS || 1);
const CUSTOMER_ITERATIONS = Number(__ENV.CUSTOMER_ITERATIONS || 5);
const CUSTOMER_MAX_DURATION = __ENV.CUSTOMER_MAX_DURATION || '3m';

export const options = {
  scenarios: {
    customer_ordering: {
      executor: 'shared-iterations',
      vus: CUSTOMER_VUS,
      iterations: CUSTOMER_ITERATIONS,
      maxDuration: CUSTOMER_MAX_DURATION,
      tags: { scenario: 'customer_ordering' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{scenario:customer_ordering}': ['p(95)<1200', 'p(99)<2500'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const session = joinSession();
  if (!session || !session.id) {
    return;
  }

  sleep(0.2);

  group('fetch_menu', () => {
    const response = getJson('/api/v1/menu', withRequestOptions(customerHeaders(session.id), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /menu', flow: 'customer_ordering' },
    }));

    check(response, {
      'menu status is 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  const cartBefore = getCart(session.id);
  const beforeVersion = cartBefore && Number.isFinite(cartBefore.cartVersion) ? cartBefore.cartVersion : 0;
  const cartAfter = mutateCart(session.id, beforeVersion);
  const afterVersion = cartAfter && Number.isFinite(cartAfter.cartVersion) ? cartAfter.cartVersion : beforeVersion + 1;
  const submitted = submitOrder(session.id, afterVersion);

  sleep(0.2);

  group('list_customer_orders', () => {
    const response = getJson('/api/v1/customer/orders', withRequestOptions(customerHeaders(session.id), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /customer/orders', flow: 'customer_ordering' },
    }));

    check(response, {
      'customer orders status is 200': (r) => r.status === 200,
      'submitted order appears in list': (r) => {
        const orders = dataOf(r);
        if (!submitted || !submitted.order || !submitted.order.id || !Array.isArray(orders)) {
          return r.status === 200;
        }
        return orders.some((order) => order.id === submitted.order.id);
      },
    });
  });

  sleep(1);
}

function joinSession() {
  return group('join_session', () => {
    const response = postJson(
      '/api/v1/customer/sessions/join',
      {
        tableId: TABLE_ID,
        qrToken: QR_TOKEN,
      },
      withRequestOptions(jsonHeaders(), {
        responseCallback: OK_RESPONSE,
        tags: { route: 'POST /customer/sessions/join', flow: 'customer_ordering' },
      }),
    );

    const session = dataOf(response);
    check(response, {
      'join status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'join returns session id': () => Boolean(session && session.id),
    });
    return session;
  });
}

function getCart(sessionId) {
  return group('get_cart', () => {
    const response = getJson('/api/v1/customer/cart', withRequestOptions(customerHeaders(sessionId), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /customer/cart', flow: 'customer_ordering' },
    }));

    const cart = dataOf(response);
    check(response, {
      'cart status is 200': (r) => r.status === 200,
      'cart version is numeric': () => Boolean(cart) && Number.isFinite(cart.cartVersion),
    });
    return cart;
  });
}

function mutateCart(sessionId, expectedCartVersion) {
  return group('patch_cart_add_item', () => {
    const response = patchJson(
      '/api/v1/customer/cart',
      {
        expectedCartVersion,
        operation: 'ADD_ITEM',
        menuItemId: MENU_ITEM_ID,
        quantity: 1,
        sessionClientId: benchmarkId('k6-cart'),
      },
      withRequestOptions(customerHeaders(sessionId), {
        responseCallback: OK_RESPONSE,
        tags: { route: 'PATCH /customer/cart', flow: 'customer_ordering' },
      }),
    );

    const cart = dataOf(response);
    check(response, {
      'cart patch status is 200': (r) => r.status === 200,
      'cart version increments': () => Boolean(cart) && Number.isFinite(cart.cartVersion) && cart.cartVersion > expectedCartVersion,
      'cart has item': () => Boolean(cart) && Array.isArray(cart.items) && cart.items.length > 0,
    });
    return cart;
  });
}

function submitOrder(sessionId, expectedCartVersion) {
  return group('submit_order', () => {
    const response = postJson(
      '/api/v1/customer/orders',
      {
        expectedCartVersion,
        idempotencyKey: orderSubmitIdempotencyKey(sessionId),
        notes: 'k6 local observability benchmark',
      },
      withRequestOptions(customerHeaders(sessionId), {
        responseCallback: OK_RESPONSE,
        tags: { route: 'POST /customer/orders', flow: 'customer_ordering' },
      }),
    );

    const submitted = dataOf(response);
    check(response, {
      'submit status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'submit returns order id': () => Boolean(submitted && submitted.order && submitted.order.id),
    });
    return submitted;
  });
}
