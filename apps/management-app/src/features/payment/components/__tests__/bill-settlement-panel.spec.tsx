import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BillStatus } from '@einvoice/types';
import { billKeys } from '@/features/order/bill-keys';
import { paymentKeys } from '@/features/payment/payment-keys';
import { paymentService } from '@/features/payment/services/payment.service';
import { tableKeys } from '@/features/tables/table-keys';
import { BillSettlementPanel } from '../bill-settlement-panel';

const mockUsePaymentHistoryQuery = jest.fn();

jest.mock('@/features/payment/hooks/use-payment', () => ({
  usePaymentHistoryQuery: (...args: unknown[]) => mockUsePaymentHistoryQuery(...args),
}));

jest.mock('@/features/payment/services/payment.service', () => ({
  paymentService: {
    confirmCash: jest.fn(),
    createVietQr: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/mocks/store', () => ({
  useMockStore: jest.fn(() => {
    throw new Error('BillSettlementPanel must not read mock store');
  }),
}));

function renderWithQueryClient(ui: React.ReactElement, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
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
    jest.mocked(paymentService.confirmCash).mockReset();
  });

  it('renders bill totals from the provided server bill', () => {
    mockUsePaymentHistoryQuery.mockReturnValue({ data: [] });

    renderWithQueryClient(<BillSettlementPanel bill={bill} />);

    expect(screen.getByText(/128\.000\s*₫/)).not.toBeNull();
    expect(screen.getByText('Mã: bill-real-1')).not.toBeNull();
  });

  it('invalidates bills, payment history, and tables after cash confirmation', async () => {
    mockUsePaymentHistoryQuery.mockReturnValue({ data: [] });
    jest.mocked(paymentService.confirmCash).mockResolvedValue({
      id: 'pay-1',
      tenantId: 'tenant-1',
      billId: bill.id,
      billReference: 'REF',
      method: 'CASH',
      status: 'PAID',
      rawTotal: bill.subtotal,
      roundedTotal: bill.total,
      roundingDelta: bill.roundingAmount,
      createdAt: '2026-05-08T10:00:00.000Z',
      updatedAt: '2026-05-08T10:00:00.000Z',
    });

    const { queryClient } = renderWithQueryClient(<BillSettlementPanel bill={bill} />);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(screen.getByRole('button', { name: /Đã thu — đóng phiên/i }));

    await waitFor(() => {
      expect(paymentService.confirmCash).toHaveBeenCalledWith('bill-real-1', 300_000);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: billKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paymentKeys.history('bill-real-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tableKeys.all });
  });

  it('invalidates bill list and tables when payment history shows PAID for the bill', async () => {
    mockUsePaymentHistoryQuery.mockReturnValue({
      data: [
        {
          id: 'pay-1',
          tenantId: 'tenant-1',
          billId: bill.id,
          billReference: 'REF',
          method: 'VIETQR',
          status: 'PAID',
          rawTotal: bill.subtotal,
          roundedTotal: bill.total,
          roundingDelta: bill.roundingAmount,
          createdAt: '2026-05-08T10:00:00.000Z',
          updatedAt: '2026-05-08T10:00:00.000Z',
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderWithQueryClient(<BillSettlementPanel bill={bill} />, queryClient);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: billKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tableKeys.all });
    });

    expect(screen.getByText(/Bill đã thanh toán/i)).not.toBeNull();
  });
});
