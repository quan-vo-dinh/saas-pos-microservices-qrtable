import type { OrderListParams } from './services/order.service';

export const orderKeys = {
  all: ['admin-orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (params?: OrderListParams) => [...orderKeys.lists(), params ?? {}] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};
