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
  orderSubmitIdempotencyKey,
  patchJson,
  postJson,
  staffHeaders,
  withRequestOptions,
} from './helpers.js';

const STATION = __ENV.KDS_STATION || 'KITCHEN';
const WAIT_SECONDS = Number(__ENV.KDS_PULSE_WAIT_SECONDS || 2);

export const options = {
  scenarios: {
    confirm_kds_pulse: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: Number(__ENV.KDS_PULSE_ITERATIONS || 1),
      maxDuration: __ENV.KDS_PULSE_MAX_DURATION || '2m',
      tags: { scenario: 'confirm_kds_pulse' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{scenario:confirm_kds_pulse}': ['p(95)<2500', 'p(99)<5000'],
    checks: ['rate>0.90'],
  },
};

export function setup() {
  const staffToken = __ENV.STAFF_TOKEN;
  if (!staffToken) {
    throw new Error('STAFF_TOKEN is required for 03-confirm-kds-pulse.js.');
  }
  const kdsToken = __ENV.KDS_TOKEN || staffToken;

  const createdOrderId = __ENV.ORDER_ID || createPendingOrder();
  const orderId = createdOrderId || findPendingOrder(staffToken);
  if (!orderId) {
    throw new Error('No pending order available. Run pnpm dev:reseed -- --yes or set ORDER_ID.');
  }

  return { staffToken, kdsToken, orderId };
}

export default function (data) {
  let confirmedOrderId;

  group('staff_confirm_order', () => {
    const response = postJson(
      `/api/v1/admin/orders/${data.orderId}/confirm`,
      {},
      withRequestOptions(staffHeaders(data.staffToken), {
        responseCallback: OK_RESPONSE,
        tags: { route: 'POST /admin/orders/:id/confirm', flow: 'confirm_kds_pulse' },
      }),
    );

    const result = dataOf(response);
    confirmedOrderId = result && result.order ? result.order.id : undefined;
    check(response, {
      'confirm status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'confirm returns order': () => Boolean(confirmedOrderId),
    });
  });

  sleep(WAIT_SECONDS);

  group('kds_queue_snapshot', () => {
    const response = getJson(`/api/v1/admin/kds/queue?station=${STATION}`, withRequestOptions(staffHeaders(data.kdsToken), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /admin/kds/queue', flow: 'confirm_kds_pulse' },
    }));

    const queue = dataOf(response);
    check(response, {
      'KDS queue status is 200': (r) => r.status === 200,
      'KDS queue response exists': () => Boolean(queue),
      'KDS queue can include confirmed order': () => {
        if (!confirmedOrderId || !queue || !Array.isArray(queue.tickets)) {
          return true;
        }
        return queue.tickets.some((ticket) => ticket.orderId === confirmedOrderId);
      },
    });
  });
}

function createPendingOrder() {
  if (__ENV.CREATE_PENDING_ORDER === '0') {
    return undefined;
  }

  const joinResponse = postJson(
    '/api/v1/customer/sessions/join',
    { tableId: TABLE_ID, qrToken: QR_TOKEN },
      withRequestOptions(jsonHeaders(), {
        responseCallback: OK_RESPONSE,
        tags: { route: 'POST /customer/sessions/join', flow: 'confirm_kds_setup' },
      }),
    );
  const session = dataOf(joinResponse);
  if (!session || !session.id) {
    return undefined;
  }

  const cartResponse = getJson('/api/v1/customer/cart', withRequestOptions(customerHeaders(session.id), {
    responseCallback: OK_RESPONSE,
    tags: { route: 'GET /customer/cart', flow: 'confirm_kds_setup' },
  }));
  const cart = dataOf(cartResponse);
  const expectedCartVersion = cart && Number.isFinite(cart.cartVersion) ? cart.cartVersion : 0;

  const patchResponse = patchJson(
    '/api/v1/customer/cart',
    {
      expectedCartVersion,
      operation: 'ADD_ITEM',
      menuItemId: MENU_ITEM_ID,
      quantity: 1,
      sessionClientId: benchmarkId('k6-kds-cart'),
    },
    withRequestOptions(customerHeaders(session.id), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'PATCH /customer/cart', flow: 'confirm_kds_setup' },
    }),
  );
  const updatedCart = dataOf(patchResponse);
  const submitCartVersion =
    updatedCart && Number.isFinite(updatedCart.cartVersion) ? updatedCart.cartVersion : expectedCartVersion + 1;

  const submitResponse = postJson(
    '/api/v1/customer/orders',
    {
      expectedCartVersion: submitCartVersion,
      idempotencyKey: orderSubmitIdempotencyKey(session.id),
      notes: 'k6 confirm/KDS observability pulse',
    },
    withRequestOptions(customerHeaders(session.id), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'POST /customer/orders', flow: 'confirm_kds_setup' },
    }),
  );
  const submitted = dataOf(submitResponse);
  return submitted && submitted.order ? submitted.order.id : undefined;
}

function findPendingOrder(staffToken) {
  const response = getJson('/api/v1/admin/orders?status=PENDING&limit=5', withRequestOptions(staffHeaders(staffToken), {
    responseCallback: OK_RESPONSE,
    tags: { route: 'GET /admin/orders', flow: 'confirm_kds_setup' },
  }));
  const orders = dataOf(response);
  if (!Array.isArray(orders) || orders.length === 0) {
    return undefined;
  }
  return orders[0] ? orders[0].id : undefined;
}
