'use client';

import { subscriptionStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';
import type { SubscriptionStatus } from '@/features/saas/types';

const statusStyles: Record<SubscriptionStatus, string> = {
  ACTIVE: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  EXPIRED: 'bg-muted text-muted-foreground',
  SUPERSEDED: 'bg-blue-500/15 text-blue-800 dark:text-blue-300',
  CANCELED: 'bg-muted text-muted-foreground',
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
};

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | string }) {
  const key = status as SubscriptionStatus;
  return (
    <Badge variant="outline" className={cn(statusStyles[key] ?? '')}>
      {subscriptionStatusVi(status)}
    </Badge>
  );
}
