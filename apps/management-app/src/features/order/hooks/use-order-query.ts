'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorDisplayMessage, successMessage } from '@einvoice/frontend-utils';
import { OrderStatus } from '@einvoice/types';
import { toast } from 'sonner';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { tableKeys } from '@/features/tables/hooks/use-tables-query';
import {
  orderService,
  type OrderListParams,
  type ReleaseEmptyTableSessionPayload,
  type TransferTablePayload,
} from '../services/order.service';

const ORDER_LIST_REALTIME_FALLBACK_POLL_MS = 15_000;
const ORDER_DETAIL_POLL_MS = 4_000;

export const orderKeys = {
  all: ['admin-orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrderListParams) => [...orderKeys.lists(), params ?? {}] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

type CancelOrderInput = {
  orderId: string;
  status: OrderStatus;
  reason?: string;
};

async function invalidateOrderQueries(queryClient: ReturnType<typeof useQueryClient>, orderId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: orderKeys.details() }),
  ];

  if (orderId) {
    invalidations.push(queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }));
  }

  await Promise.all(invalidations);
}

export function useOrdersQuery(params?: OrderListParams) {
  const authReady = useAuthReadyForBff();

  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => orderService.getOrders(params),
    enabled: authReady,
    placeholderData: (previousData) => previousData,
    refetchInterval: ORDER_LIST_REALTIME_FALLBACK_POLL_MS,
  });
}

export function useOrderDetailQuery(orderId: string | null | undefined) {
  const authReady = useAuthReadyForBff();

  return useQuery({
    queryKey: orderKeys.detail(orderId ?? ''),
    queryFn: () => orderService.getOrder(orderId as string),
    enabled: authReady && Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status === OrderStatus.CANCELED || status === OrderStatus.COMPLETED) {
        return false;
      }

      return ORDER_DETAIL_POLL_MS;
    },
  });
}

export function useConfirmOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.confirmOrder(orderId),
    onSuccess: async (_data, orderId) => {
      await invalidateOrderQueries(queryClient, orderId);
      toast.success(successMessage('updated', 'order'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useMarkOrderServedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.markOrderServed(orderId),
    onSuccess: async (_data, orderId) => {
      await invalidateOrderQueries(queryClient, orderId);
      toast.success(successMessage('updated', 'order'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status, reason }: CancelOrderInput) => {
      if (status === OrderStatus.PENDING) {
        return orderService.cancelPendingOrder(orderId, { reason });
      }

      if (status !== OrderStatus.PROCESSING) {
        throw new Error('Chỉ hỗ trợ huỷ đơn đang chờ hoặc đang xử lý.');
      }

      return orderService.cancelProcessingOrder(orderId, { reason: reason ?? '' });
    },
    onSuccess: async (_data, variables) => {
      await invalidateOrderQueries(queryClient, variables.orderId);
      toast.success(successMessage('updated', 'order'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useTransferTableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransferTablePayload) => orderService.transferTable(payload),
    onSuccess: async () => {
      await invalidateOrderQueries(queryClient);
      await Promise.all([queryClient.invalidateQueries({ queryKey: tableKeys.all })]);
      toast.success(successMessage('updated', 'table'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useReleaseEmptyTableSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReleaseEmptyTableSessionPayload) => orderService.releaseEmptyTableSession(payload),
    onSuccess: async () => {
      await invalidateOrderQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: tableKeys.all });
      toast.success('Đã thả bàn rỗng.');
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useReopenBillMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => orderService.reopenBill(sessionId),
    onSuccess: async () => {
      await invalidateOrderQueries(queryClient);
      await Promise.all([queryClient.invalidateQueries({ queryKey: tableKeys.all })]);
      toast.success(successMessage('updated', 'bill'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}
