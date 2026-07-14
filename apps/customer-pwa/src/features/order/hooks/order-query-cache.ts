import type { QueryClient } from '@tanstack/react-query';
import { billKeys, cartKeys, orderKeys } from './order-query-keys';

export function invalidateOrderDomainQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: cartKeys.all });
  void queryClient.invalidateQueries({ queryKey: orderKeys.all });
  void queryClient.invalidateQueries({ queryKey: billKeys.all });
}
