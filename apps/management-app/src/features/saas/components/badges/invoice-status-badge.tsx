'use client';

import { invoiceStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/features/saas/types';

const statusStyles: Record<InvoiceStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
  PAID: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300',
  UNDERPAID: 'bg-orange-500/15 text-orange-900 dark:text-orange-200',
  EXPIRED: 'bg-muted text-muted-foreground',
  CANCELED: 'bg-muted text-muted-foreground',
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus | string }) {
  const key = status as InvoiceStatus;
  return (
    <Badge variant="outline" className={cn(statusStyles[key] ?? '')}>
      {invoiceStatusVi(status)}
    </Badge>
  );
}
