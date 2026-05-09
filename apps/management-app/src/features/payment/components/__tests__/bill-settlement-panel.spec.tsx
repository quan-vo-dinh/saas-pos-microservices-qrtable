import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BillStatus } from '@einvoice/types';
import { BillSettlementPanel } from '../bill-settlement-panel';

const mockUsePaymentHistoryQuery = jest.fn();

jest.mock('@/features/payment/hooks/use-payment', () => ({
  paymentQueryKeys: {
    history: (billId?: string) => ['payment', 'history', billId ?? 'all'],
  },
  usePaymentHistoryQuery: (...args: unknown[]) => mockUsePaymentHistoryQuery(...args),
}));

jest.mock('@/mocks/store', () => ({
  useMockStore: jest.fn(() => {
    throw new Error('BillSettlementPanel must not read mock store');
  }),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const bill = {
  id: 'bill-real-1',
  tenantId: 'tenant-1',
  sessionId: 'session-1',
  orderIds: ['order-1'],
  subtotal: 127_500,
  total: 128_000,
  roundingAmount: 500,
  status: BillStatus.PENDING_PAYMENT,
  createdAt: '2026-05-08T10:00:00.000Z',
  updatedAt: '2026-05-08T10:00:00.000Z',
};

describe('BillSettlementPanel', () => {
  beforeEach(() => {
    mockUsePaymentHistoryQuery.mockReset();
  });

  it('renders bill totals from the provided server bill', () => {
    mockUsePaymentHistoryQuery.mockReturnValue({ data: [] });

    renderWithQueryClient(<BillSettlementPanel bill={bill} />);

    expect(screen.getByText(/128\.000\s*₫/)).not.toBeNull();
    expect(screen.getByText('Mã: bill-real-1')).not.toBeNull();
  });
});
