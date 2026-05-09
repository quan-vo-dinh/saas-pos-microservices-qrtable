const mockUseQuery = jest.fn();
const mockHistory = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/lib/auth/use-auth-ready', () => ({
  useAuthReadyForBff: () => true,
}));

jest.mock('../../services/payment.service', () => ({
  paymentService: {
    history: (...args: unknown[]) => mockHistory(...args),
  },
}));

import { paymentQueryKeys, usePaymentHistoryQuery } from '../use-payment';

describe('usePaymentHistoryQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({});
  });

  it('fetches all payment history when billId is omitted', () => {
    usePaymentHistoryQuery(undefined);

    const config = mockUseQuery.mock.calls[0][0];
    expect(config.queryKey).toEqual(paymentQueryKeys.history(undefined));
    expect(config.enabled).toBe(true);
    expect(config.queryFn()).toBe(mockHistory.mock.results[0].value);
    expect(mockHistory).toHaveBeenCalledWith(undefined);
    expect(config.refetchInterval({ state: { data: [] } })).toBe(false);
  });
});
