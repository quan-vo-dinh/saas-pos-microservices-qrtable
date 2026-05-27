'use client';

import { tenantStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';
import type { TenantStatus } from '@/features/saas/types';

const statusStyles: Record<TenantStatus, string> = {
  ACTIVE: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  SUSPENDED: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  CLOSED: 'bg-muted text-muted-foreground',
};

export function TenantStatusBadge({ status }: { status: TenantStatus | string }) {
  const key = status as TenantStatus;
  return (
    <Badge variant="outline" className={cn(statusStyles[key] ?? '')}>
      {tenantStatusVi(status)}
    </Badge>
  );
}
