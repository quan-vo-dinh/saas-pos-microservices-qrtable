import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { CartSnapshot, PublicMenuItem } from '@einvoice/types';
import { useCartMutations, useSubmitOrderMutation, cartKeys } from './use-order-query';

const submitOrderMock = jest.fn();
const getCartMock = jest.fn();
const mutateCartMock = jest.fn();

jest.mock('../services/order.service', () => ({
  orderService: {
    getCart: (...args: unknown[]) => getCartMock(...args),
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
});
