import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@einvoice/frontend-utils';
import type { CartSnapshot, MenuItem } from '@einvoice/types';
import { useSession } from '@/features/session/context/session-provider';
import { orderService, type CartMutateOperation } from '../services/order.service';

export const cartKeys = {
  all: ['customer-cart'] as const,
  snapshot: (tenantId: string, sessionId: string) => [...cartKeys.all, tenantId, sessionId] as const,
};

export const orderKeys = {
  all: ['customer-orders'] as const,
  detail: (tenantId: string, sessionId: string, orderId: string) =>
    [...orderKeys.all, 'detail', tenantId, sessionId, orderId] as const,
};

function isCartConflict(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 409 || err.errorCode === 'CART_VERSION_CONFLICT');
}

export function useCustomerCartQuery() {
  const { session } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;
  const key = cartKeys.snapshot(tenantId ?? '', sessionId ?? '');

  return useQuery({
    queryKey: key,
    queryFn: () => orderService.getCart(),
    enabled: !!tenantId && !!sessionId,
  });
}

type PatchVars = {
  operation: CartMutateOperation;
  menuItemId?: string;
  cartLineId?: string;
  quantity?: number;
  note?: string;
  /** Used only for optimistic ADD_ITEM UI */
  menuItem?: MenuItem;
};

function optimisticPatch(prev: CartSnapshot, vars: PatchVars): CartSnapshot {
  const items = [...prev.items];
  const now = new Date().toISOString();

  switch (vars.operation) {
    case 'ADD_ITEM': {
      const mi = vars.menuItem;
      const qty = vars.quantity ?? 1;
      if (!mi || !vars.menuItemId) return prev;
      items.push({
        cartLineId: `optimistic-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`,
        menuItemId: mi.id,
        menuItemName: mi.name,
        quantity: qty,
        unitPrice: mi.price,
        note: vars.note,
        lineVersion: 1,
      });
      break;
    }
    case 'SET_QUANTITY': {
      if (!vars.cartLineId || vars.quantity === undefined) return prev;
      const idx = items.findIndex((l) => l.cartLineId === vars.cartLineId);
      if (idx < 0) return prev;
      if (vars.quantity <= 0) {
        items.splice(idx, 1);
      } else {
        const line = items[idx];
        items[idx] = {
          ...line,
          quantity: vars.quantity,
          lineVersion: line.lineVersion + 1,
        };
      }
      break;
    }
    case 'UPDATE_NOTE': {
      if (!vars.cartLineId) return prev;
      const idx = items.findIndex((l) => l.cartLineId === vars.cartLineId);
      if (idx < 0) return prev;
      const line = items[idx];
      items[idx] = {
        ...line,
        note: vars.note,
        lineVersion: line.lineVersion + 1,
      };
      break;
    }
    case 'REMOVE_LINE': {
      if (!vars.cartLineId) return prev;
      return {
        ...prev,
        items: items.filter((l) => l.cartLineId !== vars.cartLineId),
        updatedAt: now,
        cartVersion: prev.cartVersion + 1,
      };
    }
    case 'CLEAR':
      return {
        ...prev,
        items: [],
        updatedAt: now,
        cartVersion: prev.cartVersion + 1,
      };
    default:
      return prev;
  }

  return {
    ...prev,
    items,
    updatedAt: now,
    cartVersion: prev.cartVersion + 1,
  };
}

export function useCartMutations() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const tenantId = session?.tenantId ?? '';
  const sessionId = session?.sessionId ?? '';
  const key = cartKeys.snapshot(tenantId, sessionId);

  const patchCart = useMutation({
    mutationFn: async (vars: PatchVars) => {
      const snap = queryClient.getQueryData<CartSnapshot>(key);
      if (!snap) {
        throw new Error('Cart not loaded');
      }
      return orderService.mutateCart({
        operation: vars.operation,
        menuItemId: vars.menuItemId,
        cartLineId: vars.cartLineId,
        quantity: vars.quantity,
        note: vars.note,
        expectedCartVersion: snap.cartVersion,
      });
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<CartSnapshot>(key);
      if (!prev) return { prev };
      const next = optimisticPatch(prev, vars);
      queryClient.setQueryData(key, next);
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(key, ctx.prev);
      }
      if (isCartConflict(err)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      const snap = queryClient.getQueryData<CartSnapshot>(key);
      if (!snap) {
        throw new Error('Cart not loaded');
      }
      return orderService.clearCart(snap.cartVersion);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<CartSnapshot>(key);
      if (!prev) return { prev };
      queryClient.setQueryData(key, optimisticPatch(prev, { operation: 'CLEAR' }));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(key, ctx.prev);
      }
      if (isCartConflict(err)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
    },
  });

  const pending = patchCart.isPending || clearCart.isPending;

  return {
    addItem: (menuItem: MenuItem, quantity = 1, note?: string) =>
      patchCart.mutate({
        operation: 'ADD_ITEM',
        menuItemId: menuItem.id,
        quantity,
        note,
        menuItem,
      }),
    setQuantity: (cartLineId: string, quantity: number) =>
      patchCart.mutate({ operation: 'SET_QUANTITY', cartLineId, quantity }),
    updateNote: (cartLineId: string, note: string) => patchCart.mutate({ operation: 'UPDATE_NOTE', cartLineId, note }),
    removeLine: (cartLineId: string) => patchCart.mutate({ operation: 'REMOVE_LINE', cartLineId }),
    clearCart: () => clearCart.mutate(),
    isUpdating: pending,
  };
}
