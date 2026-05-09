import { render, screen } from '@testing-library/react';
import { BillStatus } from '@einvoice/types';
import PosBillsPage from '../page';

const mockReplace = jest.fn();
const mockUseBillsQuery = jest.fn();
let mockBillId: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/pos/bills',
  useSearchParams: () => ({
    get: (key: string) => (key === 'billId' ? mockBillId : null),
    toString: () => (mockBillId ? `billId=${mockBillId}` : ''),
  }),
}));

jest.mock('@/features/order/hooks/use-bill-query', () => ({
  useBillsQuery: (...args: unknown[]) => mockUseBillsQuery(...args),
}));

jest.mock('@/mocks/store', () => ({
  useMockStore: jest.fn(() => {
    throw new Error('POS bills page must not read mock store');
  }),
}));

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

describe('PosBillsPage', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseBillsQuery.mockReset();
    mockBillId = null;
  });

  it('renders real pending bills from the server query without mock label', () => {
    mockUseBillsQuery.mockReturnValue({ data: [bill], isLoading: false, isError: false, error: null });

    render(<PosBillsPage />);

    expect(screen.getByText('Hóa đơn PENDING · 1')).not.toBeNull();
    expect(screen.queryByText(/mock/i)).toBeNull();
    expect(screen.getByText(/bill-real-1/)).not.toBeNull();
  });
});
