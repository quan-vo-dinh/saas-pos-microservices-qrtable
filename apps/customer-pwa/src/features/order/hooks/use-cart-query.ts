import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@einvoice/frontend-utils';
import type { CartSnapshot, PublicMenuItem } from '@einvoice/types';
import { useSession } from '@/features/session/context/session-provider';
import { optimisticPatch, type PatchVars } from './cart-optimistic';
import { getOrFetchCartSnapshot } from './cart-query-cache';
import { cartKeys } from './order-query-keys';
import { orderService } from '../services/order.service';

function isCartConflict(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 409 || error.errorCode === 'CART_VERSION_CONFLICT');
}

export function useCustomerCartQuery() {
  const { session } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;

  return useQuery({
    queryKey: cartKeys.snapshot(tenantId ?? '', sessionId ?? ''),
    queryFn: () => orderService.getCart(),
    enabled: !!tenantId && !!sessionId,
  });
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const key = cartKeys.snapshot(session?.tenantId ?? '', session?.sessionId ?? '');

  const patchCart = useMutation({
    mutationFn: async (vars: PatchVars) => {
      const snapshot = await getOrFetchCartSnapshot(queryClient, key);
      return orderService.mutateCart({
        operation: vars.operation,
        menuItemId: vars.menuItemId,
        cartLineId: vars.cartLineId,
        quantity: vars.quantity,
        note: vars.note,
        expectedCartVersion: snapshot.cartVersion,
      });
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CartSnapshot>(key);
      if (!previous) return { previous };
      queryClient.setQueryData(key, optimisticPatch(previous, vars));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (isCartConflict(error)) void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (data) => queryClient.setQueryData(key, data),
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      const snapshot = await getOrFetchCartSnapshot(queryClient, key);
      return orderService.clearCart(snapshot.cartVersion);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CartSnapshot>(key);
      if (!previous) return { previous };
      queryClient.setQueryData(key, optimisticPatch(previous, { operation: 'CLEAR' }));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      if (isCartConflict(error)) void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (data) => queryClient.setQueryData(key, data),
  });

  return {
    addItem: (menuItem: PublicMenuItem, quantity = 1, note?: string) =>
      patchCart.mutate({ operation: 'ADD_ITEM', menuItemId: menuItem.id, quantity, note, menuItem }),
    setQuantity: (cartLineId: string, quantity: number) =>
      patchCart.mutate({ operation: 'SET_QUANTITY', cartLineId, quantity }),
    updateNote: (cartLineId: string, note: string) => patchCart.mutate({ operation: 'UPDATE_NOTE', cartLineId, note }),
    removeLine: (cartLineId: string) => patchCart.mutate({ operation: 'REMOVE_LINE', cartLineId }),
    clearCart: () => clearCart.mutate(),
    isUpdating: patchCart.isPending || clearCart.isPending,
  };
}
