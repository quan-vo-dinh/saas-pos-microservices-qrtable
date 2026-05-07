'use client';

import type { StaffRealtimeStatus } from '@/features/order/hooks/use-staff-order-realtime';

type Props = {
  status: StaffRealtimeStatus;
  tone?: 'default' | 'kds';
};

const labelByStatus: Partial<Record<StaffRealtimeStatus, string>> = {
  reconnecting: 'Đang kết nối lại',
  degraded: 'Realtime gián đoạn',
  'auth-error': 'Lỗi phiên realtime',
};

export function RealtimeStatusPill({ status, tone = 'default' }: Props): React.ReactElement | null {
  const label = labelByStatus[status];
  if (!label) return null;

  const className =
    tone === 'kds'
      ? 'fixed right-3 top-3 z-50 rounded-full border border-white/15 bg-black/80 px-3 py-1 font-[family-name:var(--font-kds-mono)] text-xs text-[var(--ink)] shadow-sm'
      : 'fixed right-4 top-4 z-50 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur';

  return <div className={className}>{label}</div>;
}
