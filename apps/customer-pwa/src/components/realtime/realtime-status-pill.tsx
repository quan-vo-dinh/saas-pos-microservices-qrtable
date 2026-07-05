import type { CustomerRealtimeStatus } from '@/features/order/hooks/use-customer-order-realtime';

type Props = {
  status: CustomerRealtimeStatus;
};

const labelByStatus: Partial<Record<CustomerRealtimeStatus, string>> = {
  reconnecting: 'Đang kết nối lại',
  'auth-error': 'Lỗi phiên realtime',
};

export function RealtimeStatusPill({ status }: Props): React.ReactElement | null {
  const label = labelByStatus[status];
  if (!label) return null;

  return (
    <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
      {label}
    </div>
  );
}
