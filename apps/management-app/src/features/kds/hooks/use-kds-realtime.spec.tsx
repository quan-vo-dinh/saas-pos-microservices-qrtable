import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import type { KdsQueueChangedEvent } from '@einvoice/types';
import { PreparationStation } from '@einvoice/types';
import { kdsKeys } from '@/features/kds/kds-keys';
import { useKdsRealtime } from './use-kds-realtime';

const ioMock = jest.fn();
const onMock = jest.fn();
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

describe('useKdsRealtime', () => {
  beforeEach(() => {
    onMock.mockReset();
    disconnectMock.mockReset();
    ioMock.mockReturnValue({
      on: onMock,
      disconnect: disconnectMock,
    } as unknown as Socket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses Bearer handshake and invalidates queue on connect and kdsQueueChanged', () => {
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
      reconnection: true,
      timeout: 10_000,
    });

    const onCalls = onMock.mock.calls as Array<[string, (...args: unknown[]) => void]>;
    const connectHandler = onCalls.find(([event]) => event === 'connect')?.[1];
    const kdsChangedHandler = onCalls.find(([event]) => event === 'events.kdsQueueChanged')?.[1];

    connectHandler?.();
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

  it('does not open a socket when disabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useKdsRealtime(PreparationStation.KITCHEN, { enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(ioMock).not.toHaveBeenCalled();
  });
});
