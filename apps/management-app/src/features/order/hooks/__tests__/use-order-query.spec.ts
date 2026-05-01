const mockUseQuery = jest.fn();
const mockGetOrders = jest.fn();
const mockGetOrder = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('@/lib/auth/use-auth-ready', () => ({
  useAuthReadyForBff: () => true,
}));

jest.mock('../../services/order.service', () => ({
  orderService: {
    getOrders: (...args: unknown[]) => mockGetOrders(...args),
    getOrder: (...args: unknown[]) => mockGetOrder(...args),
  },
}));

import { OrderStatus } from '@einvoice/types';
import { useOrderDetailQuery, useOrdersQuery } from '../use-order-query';

describe('order query polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({});
  });

  it('uses the fast interval for unfiltered and pending order lists', () => {
    useOrdersQuery();
    let config = mockUseQuery.mock.calls[0][0];
    expect(config.refetchInterval).toBe(3000);

    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({});

    useOrdersQuery({ status: OrderStatus.PENDING });
    config = mockUseQuery.mock.calls[0][0];
    expect(config.refetchInterval).toBe(3000);
  });

  it('uses the slow interval for non-pending filtered order lists', () => {
    useOrdersQuery({ status: OrderStatus.PROCESSING });

    const config = mockUseQuery.mock.calls[0][0];
    expect(config.refetchInterval).toBe(5000);
  });

  it('stops detail polling for terminal states', () => {
    useOrderDetailQuery('order-1');

    const config = mockUseQuery.mock.calls[0][0];
    expect(
      config.refetchInterval({
        state: {
          data: { status: OrderStatus.CANCELED },
        },
      }),
    ).toBe(false);
    expect(
      config.refetchInterval({
        state: {
          data: { status: OrderStatus.COMPLETED },
        },
      }),
    ).toBe(false);
    expect(
      config.refetchInterval({
        state: {
          data: { status: OrderStatus.PROCESSING },
        },
      }),
    ).toBe(4000);
  });
});
