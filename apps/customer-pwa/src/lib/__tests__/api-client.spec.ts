/* ── Mock @einvoice/frontend-utils BEFORE importing SUT ───── */
const mockApiClient = jest.fn();

jest.mock('@einvoice/frontend-utils', () => ({
  apiClient: mockApiClient,
  ApiError: class ApiError extends Error {
    status: number;
    errorCode?: string;

    constructor(status: number, errorCode?: string) {
      super(errorCode ?? String(status));
      this.status = status;
      this.errorCode = errorCode;
    }
  },
}));

jest.mock('@/constants/api', () => ({
  PWA_SESSION_STORAGE_KEY: 'qrtable:pwa:order-session',
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
    TENANT_ID: '023772bb-391b-401c-936a-ed7034b69cec',
    ENDPOINTS: {},
  },
}));

import {
  CUSTOMER_SESSION_EXPIRED_EVENT,
  customerApi,
  getCustomerSessionId,
  getCustomerTenantId,
  setCustomerSessionId,
  setCustomerTenantId,
} from '../api-client';

describe('customerApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
    setCustomerSessionId(null);
    setCustomerTenantId(null);
  });

  it('calls apiClient with correct BFF base URL', async () => {
    mockApiClient.mockResolvedValue({ ok: true });

    await customerApi('/menu');

    expect(mockApiClient).toHaveBeenCalledTimes(1);
    expect(mockApiClient).toHaveBeenCalledWith(
      '/menu',
      expect.objectContaining({
        baseUrl: 'http://localhost:3300/api/v1',
      }),
    );
  });

  it('includes x-tenant-id header in all requests', async () => {
    mockApiClient.mockResolvedValue([]);

    await customerApi('/menu');

    const callArgs = mockApiClient.mock.calls[0][1];
    expect(callArgs.headers).toEqual(
      expect.objectContaining({ 'x-tenant-id': '023772bb-391b-401c-936a-ed7034b69cec' }),
    );
  });

  it('uses tenant from joined session when activeTenantId is set', async () => {
    mockApiClient.mockResolvedValue([]);
    setCustomerTenantId('tenant_joined');

    await customerApi('/customer/cart');

    const callArgs = mockApiClient.mock.calls[0][1];
    expect(callArgs.headers).toEqual(expect.objectContaining({ 'x-tenant-id': 'tenant_joined' }));
  });

  it('adds x-session-id after Order session is activated', async () => {
    mockApiClient.mockResolvedValue({});
    setCustomerSessionId('550e8400-e29b-41d4-a716-446655440000');

    await customerApi('/customer/cart');

    const callArgs = mockApiClient.mock.calls[0][1];
    expect(callArgs.headers).toEqual(
      expect.objectContaining({
        'x-tenant-id': '023772bb-391b-401c-936a-ed7034b69cec',
        'x-session-id': '550e8400-e29b-41d4-a716-446655440000',
      }),
    );
  });

  it('omitSessionHeader skips x-session-id even when session is set', async () => {
    mockApiClient.mockResolvedValue({});
    setCustomerSessionId('550e8400-e29b-41d4-a716-446655440000');

    await customerApi('/customer/sessions/join', {
      method: 'POST',
      body: '{}',
      omitSessionHeader: true,
    });

    const callArgs = mockApiClient.mock.calls[0][1];
    expect(callArgs.headers['x-session-id']).toBeUndefined();
  });

  it('skipTenantHeader omits x-tenant-id for public bootstrap calls', async () => {
    mockApiClient.mockResolvedValue({});
    setCustomerTenantId('tenant_joined');

    await customerApi('/public/tenants/acme', {
      method: 'GET',
      omitSessionHeader: true,
      skipTenantHeader: true,
    });

    const callArgs = mockApiClient.mock.calls[0][1];
    expect(callArgs.headers['x-tenant-id']).toBeUndefined();
    expect(callArgs.headers['x-session-id']).toBeUndefined();
  });

  it('preserves caller-provided options (method, body)', async () => {
    mockApiClient.mockResolvedValue({ id: 'order-1' });

    const body = JSON.stringify({ items: [{ id: '1', qty: 2 }] });

    await customerApi('/customer/orders', {
      method: 'POST',
      body,
      headers: { 'x-custom': 'value' },
    });

    expect(mockApiClient).toHaveBeenCalledWith(
      '/customer/orders',
      expect.objectContaining({
        method: 'POST',
        body,
        baseUrl: 'http://localhost:3300/api/v1',
        headers: {
          'x-tenant-id': '023772bb-391b-401c-936a-ed7034b69cec',
          'x-custom': 'value',
        },
      }),
    );
  });

  it('clears stale session state and emits event when API returns SESSION_CLOSED', async () => {
    const listener = jest.fn();
    window.addEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, listener);
    setCustomerSessionId('stale-session');
    setCustomerTenantId('tenant_joined');
    localStorage.setItem('qrtable:pwa:order-session', JSON.stringify({ sessionId: 'stale-session' }));
    mockApiClient.mockRejectedValue(
      Object.assign(new Error('Phiên đã đóng'), { status: 410, errorCode: 'SESSION_CLOSED' }),
    );

    await expect(customerApi('/customer/cart')).rejects.toThrow('Phiên đã đóng');

    expect(getCustomerSessionId()).toBeNull();
    expect(getCustomerTenantId()).toBeNull();
    expect(localStorage.getItem('qrtable:pwa:order-session')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, listener);
  });
});
