import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { tableKeys } from '@/features/tables/hooks/use-tables-query';
import { serviceRequestKeys } from '@/features/service-requests/hooks/use-service-request-query';
import { orderKeys } from './use-order-query';
import { useStaffOrderRealtime } from './use-staff-order-realtime';

const ioMock = jest.fn();
const onMock = jest.fn();
const emitMock = jest.fn();
const disconnectMock = jest.fn();

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

  it('joins staff room and invalidates order/table queries for matching order events', () => {
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

    connectHandler?.();
    expect(emitMock).toHaveBeenCalledWith('join.staff', { tenantId: 'tenant-1' });

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
});
