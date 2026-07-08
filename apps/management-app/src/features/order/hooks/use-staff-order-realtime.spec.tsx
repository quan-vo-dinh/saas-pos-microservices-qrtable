import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { billKeys } from '@/features/order/bill-keys';
import { orderKeys } from '@/features/order/order-keys';
import { paymentKeys } from '@/features/payment/payment-keys';
import { serviceRequestKeys } from '@/features/service-requests/service-request-keys';
import { tableKeys } from '@/features/tables/table-keys';
import { useStaffOrderRealtime } from './use-staff-order-realtime';

const ioMock = jest.fn();
const onMock = jest.fn();
const offMock = jest.fn();
const emitMock = jest.fn();
const disconnectMock = jest.fn();
const managerOnMock = jest.fn();
const managerOffMock = jest.fn();

jest.mock('@/constants/api', () => ({
  API_CONFIG: {
    DEFAULT_BFF_URL: 'http://localhost:3300/api/v1',
  },
}));

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

jest.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (selector: (state: { profile: { tenantId: string }; accessToken: string }) => unknown) =>
    selector({ profile: { tenantId: 'tenant-1' }, accessToken: 'jwt-token' }),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useStaffOrderRealtime', () => {
  beforeEach(() => {
    onMock.mockReset();
    offMock.mockReset();
    emitMock.mockReset();
    disconnectMock.mockReset();
    managerOnMock.mockReset();
    managerOffMock.mockReset();

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

  it('connects with staff auth token and does not emit join.staff', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    const orderCreatedHandler = onCalls.find(([event]) => event === 'events.orderCreated')?.[1];

    expect(ioMock).toHaveBeenCalledWith('http://localhost:3300/orders', {
      auth: { token: 'jwt-token' },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      timeout: 10_000,
    });

    expect(connectHandler).toBeDefined();
    act(() => {
      connectHandler?.();
    });
    expect(emitMock).not.toHaveBeenCalledWith('join.staff', expect.anything());

    orderCreatedHandler?.({
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      orderId: 'order-1',
      status: 'PENDING',
      createdAt: '2026-04-30T00:00:00.000Z',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.detail('order-1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tableKeys.all });
  });

  it('invalidates bills, tables, and payment history on paymentCompleted for matching tenant', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const paymentHandler = onCalls.find(([event]) => event === 'events.paymentCompleted')?.[1];

    paymentHandler?.({
      eventId: 'pc-1',
      eventType: 'payment.completed',
      tenantId: 'other-tenant',
      sessionId: 'session-1',
      billId: 'bill-1',
      paymentId: 'pay-1',
      method: 'VIETQR',
      status: 'PAID',
      paidAt: '2026-05-08T12:00:00.000Z',
      amount: 128_000,
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: billKeys.lists() });

    invalidateSpy.mockClear();

    paymentHandler?.({
      eventId: 'pc-1',
      eventType: 'payment.completed',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      billId: 'bill-1',
      paymentId: 'pay-1',
      method: 'VIETQR',
      status: 'PAID',
      paidAt: '2026-05-08T12:00:00.000Z',
      amount: 128_000,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: billKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: tableKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: paymentKeys.history('bill-1') });
  });

  it('invalidates service-request lists for matching service request events only', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const serviceRequestedHandler = onCalls.find(([event]) => event === 'events.serviceRequested')?.[1];

    serviceRequestedHandler?.({
      tenantId: 'other-tenant',
      sessionId: 'session-1',
      tableId: 'table-1',
      requestId: 'request-1',
      type: 'CALL_STAFF',
      status: 'PENDING',
      timestamp: '2026-04-30T00:00:00.000Z',
    });

    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: serviceRequestKeys.lists() });

    serviceRequestedHandler?.({
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      requestId: 'request-1',
      type: 'CALL_STAFF',
      status: 'PENDING',
      timestamp: '2026-04-30T00:00:00.000Z',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serviceRequestKeys.lists() });
  });

  it('invalidates order lists for matching cartUpdated events', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const cartHandler = onCalls.find(([event]) => event === 'events.cartUpdated')?.[1];

    cartHandler?.({
      tenantId: 'other-tenant',
      sessionId: 'session-1',
      cartVersion: 1,
      status: 'ACTIVE',
      items: [],
      updatedAt: '2026-05-07T00:00:00.000Z',
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: orderKeys.lists() });

    invalidateSpy.mockClear();

    cartHandler?.({
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      cartVersion: 2,
      status: 'ACTIVE',
      items: [],
      updatedAt: '2026-05-07T00:00:00.000Z',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
  });

  it('invalidates order detail for matching kitchen item ready events', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

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

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.details() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.detail('order-1') });
  });

  it('invalidates service and order domains for matching bill requests', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const billHandler = onCalls.find(([event]) => event === 'events.billRequested')?.[1];

    billHandler?.({
      tenantId: 'tenant-1',
      billId: 'bill-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      tableName: 'Bàn 1',
      status: 'PENDING_PAYMENT',
      total: 65000,
      requestedAt: '2026-05-07T00:00:00.000Z',
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.lists() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: serviceRequestKeys.lists() });
  });

  it('exposes reconnecting when manager reconnect_attempt fires', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const managerCalls = managerOnMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onReconnectAttempt = managerCalls.find(([event]) => event === 'reconnect_attempt')?.[1];
    expect(onReconnectAttempt).toBeDefined();

    act(() => {
      onReconnectAttempt?.(1);
    });

    expect(result.current).toBe('reconnecting');
  });

  it('exposes auth-error on events.authError', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

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

    const { result } = renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onDisconnect = onCalls.find(([event]) => event === 'disconnect')?.[1];
    expect(onDisconnect).toBeDefined();

    act(() => {
      onDisconnect?.();
    });

    expect(result.current).toBe('degraded');
  });

  it('unsubscribes socket and manager listeners on unmount', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { unmount } = renderHook(() => useStaffOrderRealtime(), { wrapper: createWrapper(queryClient) });

    unmount();

    expect(offMock).toHaveBeenCalled();
    expect(managerOffMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('does not initialize socket connection when enabled is false', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useStaffOrderRealtime({ enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(ioMock).not.toHaveBeenCalled();
    expect(result.current).toBe('idle');
  });
});
