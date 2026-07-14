import type { QueryClient } from '@tanstack/react-query';
import type { CartSnapshot } from '@einvoice/types';
import { orderService } from '../services/order.service';
import { cartKeys } from './order-query-keys';

export async function getOrFetchCartSnapshot(
  queryClient: QueryClient,
  key: ReturnType<typeof cartKeys.snapshot>,
): Promise<CartSnapshot> {
  const cached = queryClient.getQueryData<CartSnapshot>(key);
  if (cached) return cached;

  return queryClient.fetchQuery({ queryKey: key, queryFn: () => orderService.getCart() });
}
