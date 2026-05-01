/* ── Mock @einvoice/frontend-utils BEFORE importing SUT ───── */
const mockApiClient = jest.fn();

jest.mock('@einvoice/frontend-utils', () => ({
  apiClient: mockApiClient,
}));

jest.mock('@/constants/api', () => ({
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
    TENANT_ID: 'tenant_a',
    ENDPOINTS: {},
  },
}));

import { customerApi, setCustomerSessionId, setCustomerTenantId } from '../api-client';

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
    expect(callArgs.headers).toEqual(expect.objectContaining({ 'x-tenant-id': 'tenant_a' }));
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
        'x-tenant-id': 'tenant_a',
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
          'x-tenant-id': 'tenant_a',
          'x-custom': 'value',
        },
      }),
    );
  });
});
