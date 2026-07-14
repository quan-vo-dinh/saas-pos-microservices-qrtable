import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Bill, CartSnapshot } from '@einvoice/types';
import { BillStatus } from '@einvoice/types';
import { useSession } from '@/features/session/context/session-provider';
import { orderService } from '../services/order.service';
import { invalidateOrderDomainQueries } from './order-query-cache';
import { billKeys, cartKeys } from './order-query-keys';

export type CurrentBillQueryData = { bill: Bill | null; cart: CartSnapshot };

export function resolveCurrentBillPollingInterval(data: CurrentBillQueryData | undefined): number | false {
  if (!data) return false;
  return data.bill?.status === BillStatus.PENDING_PAYMENT || data.cart.status === 'LOCKED' ? 3000 : false;
}

export function useCurrentBillQuery() {
  const { session } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;

  return useQuery({
    queryKey: billKeys.current(tenantId ?? '', sessionId ?? ''),
    queryFn: () => orderService.getCurrentBill(),
    enabled: !!tenantId && !!sessionId,
    refetchInterval: (query) => resolveCurrentBillPollingInterval(query.state.data as CurrentBillQueryData | undefined),
  });
}

export function useRequestBillMutation() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const tenantId = session?.tenantId ?? '';
  const sessionId = session?.sessionId ?? '';
  const cartKey = cartKeys.snapshot(tenantId, sessionId);
  const currentBillKey = billKeys.current(tenantId, sessionId);

  return useMutation({
    mutationFn: () => orderService.requestBill(),
    onSuccess: (data) => {
      queryClient.setQueryData<CartSnapshot>(cartKey, data.cart);
      queryClient.setQueryData(currentBillKey, { bill: data.bill, cart: data.cart });
      invalidateOrderDomainQueries(queryClient);
    },
  });
}
