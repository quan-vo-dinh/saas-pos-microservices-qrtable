import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useCustomerOrderRealtime } from './use-customer-order-realtime';
import { billKeys, cartKeys, orderKeys } from './order-query-keys';

const ioMock = jest.fn();
const onMock = jest.fn();
const offMock = jest.fn();
const emitMock = jest.fn();
const disconnectMock = jest.fn();
const managerOnMock = jest.fn();
const managerOffMock = jest.fn();
const patchTenantLifecycleMock = jest.fn();

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
      tenantSlug: 'my-rest',
    },
    patchTenantLifecycle: patchTenantLifecycleMock,
  }),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCustomerOrderRealtime', () => {
  beforeEach(() => {
    onMock.mockReset();
    offMock.mockReset();
    emitMock.mockReset();
    disconnectMock.mockReset();
    managerOnMock.mockReset();
    managerOffMock.mockReset();
    patchTenantLifecycleMock.mockReset();

    ioMock.mockReturnValue({
      on: onMock,
      off: offMock,
      emit: emitMock,
      disconnect: disconnectMock,
      io: {
        on: managerOnMock,
        off: managerOffMock,
      },
    } as unknown as Socket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connects with Socket.IO auth and does not emit join.session', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    expect(ioMock).toHaveBeenCalledWith('http://localhost:3300/orders', {
      auth: { tenantId: 'tenant-1', sessionId: 'session-1', tenantSlug: 'my-rest' },
      autoConnect: true,
      reconnection: true,
      timeout: 10_000,
    });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    expect(connectHandler).toBeDefined();
    act(() => {
      connectHandler?.();
    });
    expect(emitMock).not.toHaveBeenCalledWith('join.session', expect.anything());
  });

  it('invalidates cart, bill, and order list for matching paymentCompleted events', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const paymentCompletedHandler = onCalls.find(([event]) => event === 'events.paymentCompleted')?.[1];

    paymentCompletedHandler?.({
      eventId: 'pay-event-1',
      eventType: 'payment.completed',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      billId: 'bill-1',
      paymentId: 'payment-1',
      method: 'VIETQR',
      status: 'PAID',
      paidAt: '2026-05-10T12:00:00.000Z',
      amount: 128000,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: cartKeys.snapshot('tenant-1', 'session-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: billKeys.current('tenant-1', 'session-1'),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.all });
  });

  it('invalidates cart, bill, and order list for matching cartUpdated events', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const cartUpdatedHandler = onCalls.find(([event]) => event === 'events.cartUpdated')?.[1];

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
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.all });
  });

  it('invalidates customer order scope for matching kitchenItemReady events', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const readyHandler = onCalls.find(([event]) => event === 'events.kitchenItemReady')?.[1];

    readyHandler?.({
      eventId: 'ready-1',
      eventType: 'kitchen.item_ready',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      tableName: 'Bàn 1',
      orderId: 'order-1',
      ticketId: 'ticket-1',
      station: 'KITCHEN',
      readyItems: [],
      occurredAt: '2026-05-07T00:00:00.000Z',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.detail('tenant-1', 'session-1', 'order-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.all });
  });

  it('exposes reconnecting when manager reconnect_attempt fires', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const managerCalls = managerOnMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onReconnectAttempt = managerCalls.find(([event]) => event === 'reconnect_attempt')?.[1];
    expect(onReconnectAttempt).toBeDefined();

    act(() => {
      onReconnectAttempt?.();
    });

    expect(result.current).toBe('reconnecting');
  });

  it('invalidates active customer order domain on socket reconnect and browser online recovery', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const managerCalls = managerOnMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onReconnect = managerCalls.find(([event]) => event === 'reconnect')?.[1];
    expect(onReconnect).toBeDefined();

    act(() => {
      onReconnect?.();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.all });

    invalidateSpy.mockClear();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.all });
  });

  it('exposes auth-error on events.authError', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onAuthError = onCalls.find(([event]) => event === 'events.authError')?.[1];
    expect(onAuthError).toBeDefined();

    act(() => {
      onAuthError?.();
    });

    expect(result.current).toBe('auth-error');
  });

  it('exposes degraded on disconnect', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onDisconnect = onCalls.find(([event]) => event === 'disconnect')?.[1];
    expect(onDisconnect).toBeDefined();

    act(() => {
      onDisconnect?.();
    });

    expect(result.current).toBe('degraded');
  });

  it('patches customer tenant status from lifecycle socket events', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const suspended = onCalls.find(([event]) => event === 'tenant.suspended')?.[1];
    const activated = onCalls.find(([event]) => event === 'tenant.activated')?.[1];
    const closed = onCalls.find(([event]) => event === 'tenant.closed')?.[1];

    suspended?.({ tenantId: 'tenant-1', reason: 'expired' });
    activated?.({ tenantId: 'tenant-1' });
    closed?.({ tenantId: 'tenant-1', reason: 'closed' });

    expect(patchTenantLifecycleMock).toHaveBeenCalledWith({
      tenantStatus: 'SUSPENDED',
      tenantStatusReason: 'expired',
    });
    expect(patchTenantLifecycleMock).toHaveBeenCalledWith({ tenantStatus: 'ACTIVE', tenantStatusReason: null });
    expect(patchTenantLifecycleMock).toHaveBeenCalledWith({ tenantStatus: 'CLOSED', tenantStatusReason: 'closed' });
  });

  it('unsubscribes socket and manager listeners on unmount', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { unmount } = renderHook(() => useCustomerOrderRealtime(), { wrapper: createWrapper(queryClient) });

    unmount();

    expect(offMock).toHaveBeenCalled();
    expect(managerOffMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('does not initialize socket connection when enabled is false', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useCustomerOrderRealtime({ enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(ioMock).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });
});
