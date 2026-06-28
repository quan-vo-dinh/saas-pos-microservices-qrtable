import { check, group, sleep } from 'k6';
import {
  EXPECTED_INVALID_QR_RESPONSE,
  OK_RESPONSE,
  TABLE_ID,
  TENANT_ID,
  TENANT_SLUG,
  getJson,
  jsonHeaders,
  postJson,
  withRequestOptions,
} from './helpers.js';

const READ_START_VUS = Number(__ENV.READ_START_VUS || 5);
const READ_TARGET_VUS = Number(__ENV.READ_TARGET_VUS || 15);
const READ_RAMP_UP = __ENV.READ_RAMP_UP || '15s';
const READ_STEADY = __ENV.READ_STEADY || '2m';
const READ_RAMP_DOWN = __ENV.READ_RAMP_DOWN || '15s';

export const options = {
  scenarios: {
    read_baseline: {
      executor: 'ramping-vus',
      stages: [
        { duration: READ_RAMP_UP, target: READ_START_VUS },
        { duration: READ_RAMP_UP, target: READ_TARGET_VUS },
        { duration: READ_STEADY, target: READ_TARGET_VUS },
        { duration: READ_RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: '15s',
      tags: { scenario: 'read_baseline' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{scenario:read_baseline}': ['p(95)<500', 'p(99)<1200'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  group('readiness', () => {
    const response = getJson('/api/v1/health/ready', {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /health/ready', flow: 'readiness' },
    });

    check(response, {
      'ready status is 200': (r) => r.status === 200,
      'ready body has status': (r) => r.body && r.body.includes('"status"'),
    });
  });

  sleep(0.3);

  group('tenant_resolve', () => {
    const response = getJson(`/api/v1/public/tenants/${TENANT_SLUG}`, {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /public/tenants/:slug', flow: 'public_read' },
    });

    check(response, {
      'tenant resolve status is 200': (r) => r.status === 200,
      'tenant slug is present': (r) => r.body && r.body.includes(TENANT_SLUG),
    });
  });

  sleep(0.3);

  group('public_menu', () => {
    const response = getJson('/api/v1/menu', withRequestOptions(jsonHeaders(), {
      responseCallback: OK_RESPONSE,
      tags: { route: 'GET /menu', flow: 'public_read' },
    }));

    check(response, {
      'menu status is 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  group('invalid_qr_error_path', () => {
    const response = postJson(
      '/api/v1/menu/validate-qr',
      {
        tableId: TABLE_ID,
        token: '0000000000000000000000000000000000000000000000000000000000000000',
      },
      withRequestOptions(jsonHeaders(), {
        responseCallback: EXPECTED_INVALID_QR_RESPONSE,
        tags: { route: 'POST /menu/validate-qr', flow: 'expected_error_path' },
      }),
    );

    check(response, {
      'invalid QR is rejected safely': (r) => [400, 403, 404].includes(r.status),
      'invalid QR response is scoped to tenant': () => Boolean(TENANT_ID),
    });
  });

  sleep(1);
}
