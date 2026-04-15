/* ── Mock @einvoice/frontend-utils BEFORE importing SUT ───── */
const mockApiClient = jest.fn();

jest.mock('@einvoice/frontend-utils', () => ({
  apiClient: mockApiClient,
}));

jest.mock('@/constants/api', () => ({
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
    TENANT_ID: 'tenant_a',
  },
}));

import { customerApi } from '../api-client';

// ─── Tests ──────────────────────────────────────────────

describe('customerApi', () => {
  afterEach(() => jest.clearAllMocks());

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
