import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useCustomerOrderRealtime } from './use-customer-order-realtime';
import { billKeys, cartKeys } from './use-order-query';

const ioMock = jest.fn();
const onMock = jest.fn();
const emitMock = jest.fn();
const disconnectMock = jest.fn();

jest.mock('@/constants/api', () => ({
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
  },
}));

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

jest.mock('@/features/session/context/session-provider', () => ({
  useSession: () => ({
    session: {
      tenantId: 'tenant-1',
      sessionId: 'session-1',
    },
  }),
}));

describe('useCustomerOrderRealtime', () => {
  beforeEach(() => {
    onMock.mockReset();
    emitMock.mockReset();
    disconnectMock.mockReset();

    ioMock.mockReturnValue({
      on: onMock,
      emit: emitMock,
      disconnect: disconnectMock,
    } as unknown as Socket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates cart/bill queries for matching cartUpdated events', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useCustomerOrderRealtime(), { wrapper });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    const cartUpdatedHandler = onCalls.find(([event]) => event === 'events.cartUpdated')?.[1];

    expect(connectHandler).toBeDefined();
    expect(cartUpdatedHandler).toBeDefined();

    connectHandler?.();
    expect(emitMock).toHaveBeenCalledWith('join.session', { sessionId: 'session-1' });

    cartUpdatedHandler?.({
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      cartVersion: 2,
      status: 'ACTIVE',
      items: [],
      updatedAt: '2026-04-30T00:00:00.000Z',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: cartKeys.snapshot('tenant-1', 'session-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: billKeys.current('tenant-1', 'session-1'),
    });
  });
});
