'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorDisplayMessage, successMessage } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { serviceRequestService, type ServiceRequestListParams } from '../services/service-request.service';

const SERVICE_REQUEST_LIST_POLL_MS = 3_000;

export const serviceRequestKeys = {
  all: ['admin-service-requests'] as const,
  lists: () => [...serviceRequestKeys.all, 'list'] as const,
  list: (params?: ServiceRequestListParams) => [...serviceRequestKeys.lists(), params ?? {}] as const,
};

async function invalidateServiceRequestQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
}

export function useServiceRequestsQuery(params?: ServiceRequestListParams) {
  const authReady = useAuthReadyForBff();

  return useQuery({
    queryKey: serviceRequestKeys.list(params),
    queryFn: () => serviceRequestService.getServiceRequests(params),
    enabled: authReady,
    placeholderData: (previousData) => previousData,
    refetchInterval: SERVICE_REQUEST_LIST_POLL_MS,
  });
}

export function useAcknowledgeServiceRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => serviceRequestService.acknowledgeServiceRequest(requestId),
    onSuccess: async () => {
      await invalidateServiceRequestQueries(queryClient);
      toast.success(successMessage('updated', 'service request'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useResolveServiceRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => serviceRequestService.resolveServiceRequest(requestId),
    onSuccess: async () => {
      await invalidateServiceRequestQueries(queryClient);
      toast.success(successMessage('updated', 'service request'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}
