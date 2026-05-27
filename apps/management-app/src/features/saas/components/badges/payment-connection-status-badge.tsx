'use client';

import { paymentConnectionStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';
import type { PaymentConnectionStatus } from '@/features/saas/types';

const statusStyles: Record<PaymentConnectionStatus, string> = {
  NOT_CONNECTED: 'bg-muted text-muted-foreground',
  CONNECTED: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  TOKEN_EXPIRED: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  REVOKED: 'bg-muted text-muted-foreground',
  ERROR: 'bg-destructive/15 text-destructive',
};

export function PaymentConnectionStatusBadge({ status }: { status: PaymentConnectionStatus | string }) {
  const key = status as PaymentConnectionStatus;
  return (
    <Badge variant="outline" className={cn(statusStyles[key] ?? 'bg-muted text-muted-foreground')}>
      {paymentConnectionStatusVi(status)}
    </Badge>
  );
}
