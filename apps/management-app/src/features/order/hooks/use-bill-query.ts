'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { orderService, type BillListParams } from '../services/order.service';

const BILL_LIST_POLL_MS = 10_000;

export const billKeys = {
  all: ['admin-bills'] as const,
  lists: () => [...billKeys.all, 'list'] as const,
  list: (params?: BillListParams) => [...billKeys.lists(), params ?? {}] as const,
};

export function useBillsQuery(params?: BillListParams) {
  const authReady = useAuthReadyForBff();

  return useQuery({
    queryKey: billKeys.list(params),
    queryFn: () => orderService.getBills(params),
    enabled: authReady,
    placeholderData: (previousData) => previousData,
    refetchInterval: BILL_LIST_POLL_MS,
  });
}
