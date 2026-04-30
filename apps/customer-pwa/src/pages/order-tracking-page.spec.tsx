import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import type { Order } from '@einvoice/types';
import { OrderStatus } from '@einvoice/types';
import { ROUTES } from '@/constants/routes';
import { OrderTrackingPage } from './order-tracking-page';

const useOrderDetailQueryMock = jest.fn();
const useSessionMock = jest.fn();

jest.mock('@/features/order/hooks/use-order-query', () => ({
  useOrderDetailQuery: (...args: unknown[]) => useOrderDetailQueryMock(...args),
  useCancelCustomerOrderMutation: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/features/session/context/session-provider', () => ({
  useSession: () => useSessionMock(),
}));

jest.mock('@/components/order/order-tracking-stepper', () => ({
  OrderTrackingStepper: () => <div data-testid="order-tracking-stepper">stepper</div>,
}));

jest.mock('@/components/order/order-journey-sheet', () => ({
  OrderJourneySheet: () => null,
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-123',
    tenantId: 'tenant-1',
    tableId: 'table-1',
    tableName: 'Bàn 1',
    sessionId: 'session-1',
    status: OrderStatus.PENDING,
    totalAmount: 100000,
    idempotencyKey: 'idem-1',
    createdAt: '2026-04-30T00:00:00.000Z',
    updatedAt: '2026-04-30T00:00:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('OrderTrackingPage routing behavior', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ isActive: true });
    useOrderDetailQueryMock.mockReturnValue({
      data: makeOrder(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads real order id param from /order-tracking/:orderId', () => {
    render(
      <MemoryRouter initialEntries={['/order-tracking/order-real-1']}>
        <Routes>
          <Route path={ROUTES.ORDER_TRACKING_WITH_ID} element={<OrderTrackingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useOrderDetailQueryMock).toHaveBeenCalledWith('order-real-1');
    expect(screen.getByTestId('order-tracking-stepper')).toBeTruthy();
  });

  it('shows missing-id state at /order-tracking', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.ORDER_TRACKING]}>
        <Routes>
          <Route path={ROUTES.ORDER_TRACKING} element={<OrderTrackingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useOrderDetailQueryMock).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('Chưa có đơn theo dõi — hãy đặt món từ menu.')).toBeTruthy();
  });
});
