'use client';

import type { ReactElement } from 'react';
import type { StaffRealtimeStatus } from '@/features/order/hooks/use-staff-order-realtime';
import type { KdsRealtimeStatus } from '@/features/kds/hooks/use-kds-realtime';

export type RealtimePillStatus = StaffRealtimeStatus | KdsRealtimeStatus;

type Props = {
  status: RealtimePillStatus;
  tone?: 'default' | 'kds';
};

const labelByStatus: Partial<Record<RealtimePillStatus, string>> = {
  reconnecting: 'Đang kết nối lại',
  degraded: 'Realtime gián đoạn',
  'auth-error': 'Lỗi phiên realtime',
};

export function RealtimeStatusPill({ status, tone = 'default' }: Props): ReactElement | null {
  const label = labelByStatus[status];
  if (!label) return null;

  const className =
    tone === 'kds'
      ? 'absolute right-3 top-3 z-10 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur'
      : 'fixed right-4 top-4 z-50 rounded-full border border-border/60 bg-background/95 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur';

  return <div className={className}>{label}</div>;
}
