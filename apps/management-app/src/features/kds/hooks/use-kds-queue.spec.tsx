import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { PreparationStation } from '@einvoice/types';
import { useKdsQueue } from './use-kds-queue';

jest.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: (selector: (s: { profile?: { tenantId: string } }) => unknown) =>
    selector({ profile: { tenantId: 'tenant-1' } }),
}));

const fetchKdsQueueMock = jest.fn();
jest.mock('../services/kds.service', () => ({
  fetchKdsQueue: (...args: unknown[]) => fetchKdsQueueMock(...args),
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useKdsQueue', () => {
  beforeEach(() => {
    fetchKdsQueueMock.mockReset();
  });

  it('loads queue snapshot when tenant is present', async () => {
    const snapshot = {
      tenantId: 'tenant-1',
      station: PreparationStation.KITCHEN,
      revision: 1,
      serverTime: '2026-05-07T00:00:00.000Z',
      tickets: [],
    };
    fetchKdsQueueMock.mockResolvedValue(snapshot);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useKdsQueue(PreparationStation.KITCHEN), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(snapshot);
    expect(fetchKdsQueueMock).toHaveBeenCalledWith(PreparationStation.KITCHEN);
  });

  it('does not fetch when hook is disabled', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useKdsQueue(PreparationStation.KITCHEN, { enabled: false }), {
      wrapper: createWrapper(queryClient),
    });

    expect(fetchKdsQueueMock).not.toHaveBeenCalled();
  });
});
