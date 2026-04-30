import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { CartSnapshot } from '@einvoice/types';
import { useSubmitOrderMutation, cartKeys } from './use-order-query';

const submitOrderMock = jest.fn();

jest.mock('../services/order.service', () => ({
  orderService: {
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
