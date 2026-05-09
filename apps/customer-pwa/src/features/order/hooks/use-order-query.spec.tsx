import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { CartSnapshot, PublicMenuItem } from '@einvoice/types';
import { BillStatus } from '@einvoice/types';
import {
  useCartMutations,
  useCustomerOrdersQuery,
  useSubmitOrderMutation,
  cartKeys,
  resolveCurrentBillPollingInterval,
  type CurrentBillQueryData,
} from './use-order-query';

const submitOrderMock = jest.fn();
const getCartMock = jest.fn();
const getOrdersMock = jest.fn();
const mutateCartMock = jest.fn();

jest.mock('../services/order.service', () => ({
  orderService: {
    getCart: (...args: unknown[]) => getCartMock(...args),
    getOrders: (...args: unknown[]) => getOrdersMock(...args),
    mutateCart: (...args: unknown[]) => mutateCartMock(...args),
    submitOrder: (...args: unknown[]) => submitOrderMock(...args),
  },
}));

jest.mock('@/features/session/context/session-provider', () => ({
  useSession: () => ({
    session: {
      tenantId: 'tenant-1',
      sessionId: 'session-1',
    },
  }),
}));

function makeCartSnapshot(overrides: Partial<CartSnapshot> = {}): CartSnapshot {
  return {
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    cartVersion: 7,
    status: 'ACTIVE',
    updatedAt: '2026-04-30T00:00:00.000Z',
    items: [
      {
        cartLineId: 'line-1',
        menuItemId: 'menu-1',
        menuItemName: 'Phở',
        quantity: 2,
        unitPrice: 50000,
        lineVersion: 1,
      },
    ],
    ...overrides,
  };
}

describe('resolveCurrentBillPollingInterval', () => {
  const baseCart: CartSnapshot = {
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    cartVersion: 1,
    status: 'ACTIVE',
    updatedAt: '2026-04-30T00:00:00.000Z',
    items: [],
  };

  it('polls current bill every 3s while bill is pending payment', () => {
    const data: CurrentBillQueryData = {
      bill: { status: BillStatus.PENDING_PAYMENT } as CurrentBillQueryData['bill'],
      cart: baseCart,
    };
    expect(resolveCurrentBillPollingInterval(data)).toBe(3000);
  });

  it('polls while cart is LOCKED even if bill snapshot is missing pending flag', () => {
    const data: CurrentBillQueryData = {
      bill: null,
      cart: { ...baseCart, status: 'LOCKED' },
    };
    expect(resolveCurrentBillPollingInterval(data)).toBe(3000);
  });

  it('disables polling when bill is paid and cart active', () => {
    const data: CurrentBillQueryData = {
      bill: { status: BillStatus.PAID } as CurrentBillQueryData['bill'],
      cart: baseCart,
    };
    expect(resolveCurrentBillPollingInterval(data)).toBe(false);
  });
});

describe('useSubmitOrderMutation', () => {
  beforeEach(() => {
    submitOrderMock.mockResolvedValue({
      order: { id: 'order-1' },
      bill: { id: 'bill-1' },
      cart: makeCartSnapshot({ items: [], cartVersion: 8 }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits expectedCartVersion and idempotencyKey only (no cart items payload)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(cartKeys.snapshot('tenant-1', 'session-1'), makeCartSnapshot());

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSubmitOrderMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ idempotencyKey: 'idem-123' });
    });

    await waitFor(() => {
      expect(submitOrderMock).toHaveBeenCalledTimes(1);
    });

    const payload = submitOrderMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        expectedCartVersion: 7,
        idempotencyKey: 'idem-123',
      }),
    );
    expect(payload).not.toHaveProperty('items');
  });
});

describe('useCustomerOrdersQuery', () => {
  it('uses a tenant and session scoped query key', async () => {
    getOrdersMock.mockResolvedValue([]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCustomerOrdersQuery(), { wrapper });

    await waitFor(() => {
      expect(getOrdersMock).toHaveBeenCalledTimes(1);
    });

    const queries = queryClient.getQueryCache().findAll();
    expect(queries.map((query) => query.queryKey)).toContainEqual([
      'customer-orders',
      'list',
      'tenant-1',
      'session-1',
    ]);
  });
});

describe('useCartMutations', () => {
  beforeEach(() => {
    getCartMock.mockResolvedValue(makeCartSnapshot({ items: [], cartVersion: 0 }));
    mutateCartMock.mockResolvedValue(makeCartSnapshot({ items: [], cartVersion: 1 }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the cart snapshot before adding an item when the cache is not loaded yet', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const item: PublicMenuItem = {
      id: '11111111-cccc-4111-8111-111111111111',
      name: 'Phở bò tái',
      description: null,
      price: 65000,
      imageUrl: null,
      status: 'available',
    };

    const { result } = renderHook(() => useCartMutations(), { wrapper });

    act(() => {
      result.current.addItem(item, 1);
    });

    await waitFor(() => {
      expect(mutateCartMock).toHaveBeenCalledTimes(1);
    });

    expect(getCartMock).toHaveBeenCalledTimes(1);
    expect(mutateCartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'ADD_ITEM',
        menuItemId: item.id,
        quantity: 1,
        expectedCartVersion: 0,
      }),
    );
  });

  it('keeps the server cart version for ADD_ITEM optimistic state so the mutation sends the pre-mutation version', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      cartKeys.snapshot('tenant-1', 'session-1'),
      makeCartSnapshot({ items: [], cartVersion: 0 }),
    );
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const item: PublicMenuItem = {
      id: '11111111-cccc-4111-8111-111111111111',
      name: 'Phở bò tái',
      description: null,
      price: 65000,
      imageUrl: null,
      status: 'available',
    };

    const { result } = renderHook(() => useCartMutations(), { wrapper });

    act(() => {
      result.current.addItem(item, 1);
    });

    await waitFor(() => {
      expect(mutateCartMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateCartMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'ADD_ITEM',
        expectedCartVersion: 0,
      }),
    );
  });

  it('copies menu item image URL into the optimistic cart line', async () => {
    mutateCartMock.mockImplementation(() => new Promise(() => undefined));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      cartKeys.snapshot('tenant-1', 'session-1'),
      makeCartSnapshot({ items: [], cartVersion: 0 }),
    );
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const item: PublicMenuItem = {
      id: '11111111-cccc-4111-8111-111111111111',
      name: 'Phở bò tái',
      description: null,
      price: 65000,
      imageUrl: 'https://cdn.example.test/menu/pho-bo.jpg',
      status: 'available',
    };

    const { result } = renderHook(() => useCartMutations(), { wrapper });

    act(() => {
      result.current.addItem(item, 1);
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<CartSnapshot>(cartKeys.snapshot('tenant-1', 'session-1'));
      expect(cached?.items[0]?.menuItemImageUrl).toBe('https://cdn.example.test/menu/pho-bo.jpg');
    });
  });

  it('merges ADD_ITEM optimistic state into the matching cart line', async () => {
    mutateCartMock.mockImplementation(() => new Promise(() => undefined));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      cartKeys.snapshot('tenant-1', 'session-1'),
      makeCartSnapshot({
        cartVersion: 0,
        items: [
          {
            cartLineId: 'line-1',
            menuItemId: '11111111-cccc-4111-8111-111111111111',
            menuItemName: 'Phở bò tái',
            quantity: 2,
            unitPrice: 65000,
            note: 'no onions',
            lineVersion: 1,
          },
        ],
      }),
    );
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const item: PublicMenuItem = {
      id: '11111111-cccc-4111-8111-111111111111',
      name: 'Phở bò tái',
      description: null,
      price: 65000,
      imageUrl: null,
      status: 'available',
    };

    const { result } = renderHook(() => useCartMutations(), { wrapper });

    act(() => {
      result.current.addItem(item, 3, ' no onions ');
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<CartSnapshot>(cartKeys.snapshot('tenant-1', 'session-1'));
      expect(cached?.items).toHaveLength(1);
      expect(cached?.items[0]).toEqual(
        expect.objectContaining({
          cartLineId: 'line-1',
          quantity: 5,
          note: 'no onions',
          lineVersion: 2,
        }),
      );
    });
  });
});
