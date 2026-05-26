import { invoiceStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/features/saas/types';

const map: Record<InvoiceStatus, { className: string }> = {
  PENDING: { className: 'bg-amber-500/15 text-amber-900 dark:text-amber-200' },
  PAID: { className: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' },
  UNDERPAID: { className: 'bg-orange-500/15 text-orange-900 dark:text-orange-200' },
  EXPIRED: { className: 'bg-muted text-muted-foreground' },
  CANCELED: { className: 'bg-muted text-muted-foreground' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const m = map[status] ?? { className: '' };
  return <Badge className={m.className}>{invoiceStatusVi(status)}</Badge>;
}
