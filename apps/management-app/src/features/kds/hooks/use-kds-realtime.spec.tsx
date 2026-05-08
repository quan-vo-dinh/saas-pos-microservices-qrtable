import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import type { KdsQueueChangedEvent } from '@einvoice/types';
import { PreparationStation } from '@einvoice/types';
import { kdsKeys } from '@/features/kds/kds-keys';
import { useKdsRealtime } from './use-kds-realtime';

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

describe('useKdsRealtime', () => {
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

  it('uses staff auth token and invalidates queue on connect and matching kdsQueueChanged', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useKdsRealtime(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    expect(ioMock).toHaveBeenCalledWith('http://localhost:3300/orders', {
      auth: { token: 'jwt-token' },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      timeout: 10_000,
    });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    const kdsChangedHandler = onCalls.find(([event]) => event === 'events.kdsQueueChanged')?.[1];

    act(() => {
      connectHandler?.();
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: kdsKeys.queue('tenant-1', PreparationStation.KITCHEN),
    });

    invalidateSpy.mockClear();

    const ev: KdsQueueChangedEvent = {
      eventId: 'e1',
      eventType: 'kds.queue_changed',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      station: PreparationStation.KITCHEN,
      revision: 2,
      reason: 'TICKET_STARTED',
      occurredAt: '2026-05-07T00:00:00.000Z',
    };
    kdsChangedHandler?.(ev);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: kdsKeys.queue('tenant-1', PreparationStation.KITCHEN),
    });
  });

  it('ignores kdsQueueChanged for other tenants', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useKdsRealtime(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const kdsChangedHandler = onCalls.find(([event]) => event === 'events.kdsQueueChanged')?.[1];

    invalidateSpy.mockClear();

    const ev: KdsQueueChangedEvent = {
      eventId: 'e2',
      eventType: 'kds.queue_changed',
      schemaVersion: 1,
      tenantId: 'other-tenant',
      station: PreparationStation.KITCHEN,
      revision: 1,
      reason: 'TICKET_STARTED',
      occurredAt: '2026-05-07T00:00:00.000Z',
    };
    kdsChangedHandler?.(ev);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('requests a validated station subscription when enabled for management roles', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(
      () => useKdsRealtime(PreparationStation.KITCHEN, { subscribeStation: true }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    const managerCalls = managerOnMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const reconnectHandler = managerCalls.find(([event]) => event === 'reconnect')?.[1];

    act(() => {
      connectHandler?.();
    });
    expect(emitMock).toHaveBeenCalledWith('subscribe.kds', { station: PreparationStation.KITCHEN });

    emitMock.mockClear();

    act(() => {
      reconnectHandler?.();
    });
    expect(emitMock).toHaveBeenCalledWith('subscribe.kds', { station: PreparationStation.KITCHEN });
  });

  it('ignores kds events for another station', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useKdsRealtime(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const kdsChangedHandler = onCalls.find(([event]) => event === 'events.kdsQueueChanged')?.[1];

    invalidateSpy.mockClear();
    kdsChangedHandler?.({
      eventId: 'e-bar',
      eventType: 'kds.queue_changed',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      station: PreparationStation.BAR,
      revision: 3,
      reason: 'TICKET_STARTED',
      occurredAt: '2026-05-07T00:00:00.000Z',
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('filters kitchenItemReady and kitchenSlaWarning by tenant and station', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useKdsRealtime(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const readyHandler = onCalls.find(([event]) => event === 'events.kitchenItemReady')?.[1];
    const slaHandler = onCalls.find(([event]) => event === 'events.kitchenSlaWarning')?.[1];

    readyHandler?.({
      eventId: 'ready-bar',
      eventType: 'kitchen.item_ready',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      tableName: 'Bàn 1',
      orderId: 'order-1',
      ticketId: 'ticket-bar',
      station: PreparationStation.BAR,
      readyItems: [],
      occurredAt: '2026-05-07T00:00:00.000Z',
    });

    slaHandler?.({
      eventId: 'sla-bar',
      eventType: 'kitchen.sla_warning',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      ticketId: 'ticket-bar',
      orderId: 'order-1',
      sessionId: 'session-1',
      tableId: 'table-1',
      tableName: 'Bàn 1',
      station: PreparationStation.BAR,
      level: 'WARNING',
      waitTimeSeconds: 100,
      thresholdSeconds: 90,
      occurredAt: '2026-05-07T00:00:00.000Z',
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('exposes reconnecting when manager reconnect_attempt fires', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useKdsRealtime(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    const managerCalls = managerOnMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const onReconnectAttempt = managerCalls.find(([event]) => event === 'reconnect_attempt')?.[1];
    expect(onReconnectAttempt).toBeDefined();

    act(() => {
      onReconnectAttempt?.(1);
    });

    expect(result.current).toBe('reconnecting');
  });

  it('unsubscribes socket and manager listeners on unmount', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { unmount } = renderHook(() => useKdsRealtime(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    unmount();

    expect(offMock).toHaveBeenCalled();
    expect(managerOffMock).toHaveBeenCalled();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('does not open a socket when disabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useKdsRealtime(PreparationStation.KITCHEN, { enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('returns idle after disconnecting when the hook becomes disabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useKdsRealtime(PreparationStation.KITCHEN, { enabled }),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { enabled: true },
      },
    );

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    act(() => {
      connectHandler?.();
    });
    expect(result.current).toBe('connected');

    rerender({ enabled: false });
    expect(result.current).toBe('idle');
  });
});
