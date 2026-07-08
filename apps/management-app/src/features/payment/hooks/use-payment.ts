import { useQuery } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { paymentKeys } from '../payment-keys';
import { paymentService, type StaffPaymentRecord } from '../services/payment.service';

function hasPendingForBill(rows: StaffPaymentRecord[] | undefined, billId: string): boolean {
  return (rows ?? []).some((r) => r.billId === billId && r.status === 'PENDING');
}

/**
 * Fetches `/payment/history` for an optional bill filter.
 * Refetches every 3s while any payment row for this bill is `PENDING`.
 */
export function usePaymentHistoryQuery(billId: string | undefined) {
  const authReady = useAuthReadyForBff();

  return useQuery({
    queryKey: paymentKeys.history(billId),
    queryFn: () => paymentService.history(billId),
    enabled: authReady,
    refetchInterval: (query) => {
      if (!billId) return false;
      return hasPendingForBill(query.state.data, billId) ? 3000 : false;
    },
  });
}
