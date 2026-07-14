import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ServiceRequestType } from '@einvoice/types';
import { useSession } from '@/features/session/context/session-provider';
import { createAndPersistIdempotencyKey } from '@/lib/idempotency';
import { orderService } from '../services/order.service';
import { getOrFetchCartSnapshot } from './cart-query-cache';
import { invalidateOrderDomainQueries } from './order-query-cache';
import { billKeys, cartKeys, orderKeys } from './order-query-keys';

export function useOrderDetailQuery(orderId?: string) {
  const { session } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;

  return useQuery({
    queryKey: orderKeys.detail(tenantId ?? '', sessionId ?? '', orderId ?? ''),
    queryFn: () => orderService.getOrderById(orderId ?? ''),
    enabled: !!tenantId && !!sessionId && !!orderId,
  });
}

export function useCustomerOrdersQuery() {
  const { session } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;

  return useQuery({
    queryKey: orderKeys.list(tenantId ?? '', sessionId ?? ''),
    queryFn: () => orderService.getOrders(),
    enabled: !!tenantId && !!sessionId,
  });
}

type SubmitOrderVars = { notes?: string; idempotencyKey?: string };

export function useSubmitOrderMutation() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const tenantId = session?.tenantId ?? '';
  const sessionId = session?.sessionId ?? '';
  const cartKey = cartKeys.snapshot(tenantId, sessionId);
  const currentBillKey = billKeys.current(tenantId, sessionId);

  return useMutation({
    mutationFn: async (vars: SubmitOrderVars) => {
      const snapshot = await getOrFetchCartSnapshot(queryClient, cartKey);
      return orderService.submitOrder({
        expectedCartVersion: snapshot.cartVersion,
        idempotencyKey: vars.idempotencyKey ?? createAndPersistIdempotencyKey(),
        notes: vars.notes,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKey, data.cart);
      queryClient.setQueryData(orderKeys.detail(tenantId, sessionId, data.order.id), data.order);
      queryClient.setQueryData(currentBillKey, { bill: data.bill, cart: data.cart });
      invalidateOrderDomainQueries(queryClient);
    },
  });
}

type CancelOrderVars = { orderId: string; reason?: string };

export function useCancelCustomerOrderMutation() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const tenantId = session?.tenantId ?? '';
  const sessionId = session?.sessionId ?? '';

  return useMutation({
    mutationFn: ({ orderId, reason }: CancelOrderVars) => orderService.cancelOrder(orderId, reason),
    onSuccess: (data) => {
      queryClient.setQueryData(orderKeys.detail(tenantId, sessionId, data.order.id), data.order);
      invalidateOrderDomainQueries(queryClient);
    },
  });
}

type CreateServiceRequestVars = { type: ServiceRequestType; note?: string };

export function useCreateServiceRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServiceRequestVars) => orderService.createServiceRequest(payload),
    onSuccess: () => invalidateOrderDomainQueries(queryClient),
  });
}
