import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAcknowledgeServiceRequest = jest.fn();
const mockResolveServiceRequest = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

jest.mock('@einvoice/frontend-utils', () => ({
  getErrorDisplayMessage: (error: Error) => error.message,
  successMessage: (_action: string, entity?: string) => entity ?? 'success',
}));

jest.mock('../../services/service-request.service', () => ({
  serviceRequestService: {
    acknowledgeServiceRequest: (...args: unknown[]) => mockAcknowledgeServiceRequest(...args),
    resolveServiceRequest: (...args: unknown[]) => mockResolveServiceRequest(...args),
  },
}));

import {
  serviceRequestKeys,
  useAcknowledgeServiceRequestMutation,
  useResolveServiceRequestMutation,
} from '../use-service-request-query';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('service request mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates service request lists after acknowledge succeeds', async () => {
    mockAcknowledgeServiceRequest.mockResolvedValue({ id: 'request-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useAcknowledgeServiceRequestMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('request-1');
    });

    expect(mockAcknowledgeServiceRequest).toHaveBeenCalledWith('request-1');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: serviceRequestKeys.lists() });
    expect(mockToastSuccess).toHaveBeenCalledWith('service request');
  });

  it('invalidates service request lists after resolve succeeds', async () => {
    mockResolveServiceRequest.mockResolvedValue({ id: 'request-1' });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    const { result } = renderHook(() => useResolveServiceRequestMutation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync('request-1');
    });

    expect(mockResolveServiceRequest).toHaveBeenCalledWith('request-1');
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: serviceRequestKeys.lists() });
    expect(mockToastSuccess).toHaveBeenCalledWith('service request');
  });
});
