import http from 'k6/http';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3300';
export const TENANT_ID = __ENV.TENANT_ID || '023772bb-391b-401c-936a-ed7034b69cec';
export const TENANT_SLUG = __ENV.TENANT_SLUG || 'pho-viet';
export const TABLE_ID = __ENV.TABLE_ID || '22222222-dddd-4222-8222-222222222222';
export const TABLE_NAME = __ENV.TABLE_NAME || 'A02';
export const MENU_ITEM_ID = __ENV.MENU_ITEM_ID || '11111111-cccc-4111-8111-111111111111';
export const QR_TOKEN =
  __ENV.QR_TOKEN || 'b7d18d28b33eea7b768661247332e78a12acbef84edea4ce3d549a0030344c55';

export const OK_RESPONSE = http.expectedStatuses({ min: 200, max: 299 });
export const EXPECTED_INVALID_QR_RESPONSE = http.expectedStatuses(400, 403, 404);

export function jsonHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };
  Object.keys(extra).forEach((key) => {
    headers[key] = extra[key];
  });

  return {
    headers,
  };
}

export function customerHeaders(sessionId, extra = {}) {
  const headers = {
    'x-session-id': sessionId,
  };
  Object.keys(extra).forEach((key) => {
    headers[key] = extra[key];
  });
  return jsonHeaders(headers);
}

export function staffHeaders(token, extra = {}) {
  const authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  const headers = {
    Authorization: authorization,
  };
  Object.keys(extra).forEach((key) => {
    headers[key] = extra[key];
  });

  return jsonHeaders(headers);
}

export function withRequestOptions(params, options) {
  const next = {
    headers: params.headers,
  };
  Object.keys(options).forEach((key) => {
    next[key] = options[key];
  });
  return next;
}

export function dataOf(response) {
  try {
    const body = response.json();
    return body && typeof body === 'object' ? body.data : undefined;
  } catch (error) {
    return undefined;
  }
}

export function postJson(path, payload, params) {
  return http.post(`${BASE_URL}${path}`, JSON.stringify(payload), params);
}

export function patchJson(path, payload, params) {
  return http.patch(`${BASE_URL}${path}`, JSON.stringify(payload), params);
}

export function getJson(path, params) {
  return http.get(`${BASE_URL}${path}`, params);
}

export function benchmarkId(prefix) {
  const vu = typeof __VU === 'number' ? __VU : 0;
  const iter = typeof __ITER === 'number' ? __ITER : 0;
  return `${prefix}:vu-${vu}:iter-${iter}:${Date.now()}`;
}

export function orderSubmitIdempotencyKey(sessionId) {
  const vu = typeof __VU === 'number' ? __VU : 0;
  const iter = typeof __ITER === 'number' ? __ITER : 0;
  const sessionFragment = String(sessionId || 'session').replaceAll('-', '').slice(0, 8);
  return `order:submit:${sessionFragment}:${vu}:${iter}:${Date.now().toString(36)}`;
}
