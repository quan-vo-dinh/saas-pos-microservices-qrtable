/**
 * Unit tests for paymentService
 * @see ../payment.service.ts
 */
import { API_CONFIG } from '@/constants/api';

const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

jest.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'test-access-token',
      profile: { tenantId: '023772bb-391b-401c-936a-ed7034b69cec' },
    }),
  },
}));

import { paymentService } from '../payment.service';

const EP = API_CONFIG.ENDPOINTS;

describe('paymentService', () => {
  beforeEach(() => {
    mockAuthApiClient.mockReset();
  });

  it('createVietQr posts billId', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'p1', qrUrl: 'https://qr.example/x' });
    const billId = '11111111-1111-4111-8111-111111111111';
    const res = await paymentService.createVietQr(billId);
    expect(mockAuthApiClient).toHaveBeenCalledWith(EP.PAYMENT_CREATE_VIETQR, {
      method: 'POST',
      body: JSON.stringify({ billId }),
    });
    expect(res.qrUrl).toBe('https://qr.example/x');
  });

  it('confirmCash posts amountReceived', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'p1' });
    await paymentService.confirmCash('22222222-2222-4222-8222-222222222222', 350_000);
    expect(mockAuthApiClient).toHaveBeenCalledWith(EP.PAYMENT_CONFIRM_CASH, {
      method: 'POST',
      body: JSON.stringify({ billId: '22222222-2222-4222-8222-222222222222', amountReceived: 350_000 }),
    });
  });

  it('history adds billId query when provided', async () => {
    mockAuthApiClient.mockResolvedValue([]);
    await paymentService.history('55555555-5555-4555-8555-555555555555');
    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${EP.PAYMENT_HISTORY}?billId=${encodeURIComponent('55555555-5555-4555-8555-555555555555')}`,
    );
  });

  it('history omits query when billId omitted', async () => {
    mockAuthApiClient.mockResolvedValue([]);
    await paymentService.history();
    expect(mockAuthApiClient).toHaveBeenCalledWith(EP.PAYMENT_HISTORY);
  });
});
