import type { BillListParams } from './services/order.service';

export const billKeys = {
  all: ['admin-bills'] as const,
  lists: () => [...billKeys.all, 'list'] as const,
  list: (params?: BillListParams) => [...billKeys.lists(), params ?? {}] as const,
};
