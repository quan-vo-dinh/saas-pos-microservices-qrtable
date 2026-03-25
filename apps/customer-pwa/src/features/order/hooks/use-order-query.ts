import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/order.service';

export const orderKeys = {
  all: ['orders'] as const,
  status: (sessionId: string) => [...orderKeys.all, 'status', sessionId] as const,
};

export function useOrderStatusQuery(sessionId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.status(sessionId ?? ''),
    queryFn: () => orderService.getStatus(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 5_000,
  });
}
