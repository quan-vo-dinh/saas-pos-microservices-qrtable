import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const mockUsePaymentHistoryQuery = jest.fn();

jest.mock('@/features/payment/hooks/use-payment', () => ({
  usePaymentHistoryQuery: (...args: unknown[]) => mockUsePaymentHistoryQuery(...args),
}));

jest.mock('@/mocks/store', () => ({
  useMockStore: () => {
    throw new Error('OrdersRefundSection must not read mock bills');
  },
}));

import { OrdersRefundSection } from '../orders-refund-section';

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('OrdersRefundSection', () => {
  beforeEach(() => {
    mockUsePaymentHistoryQuery.mockReset();
  });

  it('renders refundable paid payments from payment history instead of mock bills', () => {
    mockUsePaymentHistoryQuery.mockReturnValue({
      data: [
        {
          id: 'payment-real-1',
          tenantId: 'tenant-1',
          billId: 'bill-real-1',
          billReference: 'BILL-001',
          method: 'CASH',
          status: 'PAID',
          rawTotal: 128000,
          roundedTotal: 128000,
          roundingDelta: 0,
          createdAt: '2026-05-08T00:00:00.000Z',
          updatedAt: '2026-05-08T00:00:00.000Z',
        },
      ],
    });

    renderWithQueryClient(<OrdersRefundSection />);

    expect(mockUsePaymentHistoryQuery).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('payment-real-1')).toBeTruthy();
    expect(screen.getByText(/128\.000\s*₫/)).toBeTruthy();
    expect(screen.queryByText(/mock/i)).toBeNull();
  });
});
