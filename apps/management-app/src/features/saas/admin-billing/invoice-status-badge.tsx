import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/features/saas/types';

const map: Record<InvoiceStatus, { label: string; className: string }> = {
  PENDING: { label: 'Chờ TT', className: 'bg-amber-500/15 text-amber-900 dark:text-amber-200' },
  PAID: { label: 'Đã TT', className: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-300' },
  UNDERPAID: { label: 'Thiếu tiền', className: 'bg-orange-500/15 text-orange-900 dark:text-orange-200' },
  EXPIRED: { label: 'Hết hạn', className: 'bg-muted text-muted-foreground' },
  CANCELED: { label: 'Huỷ', className: 'bg-muted text-muted-foreground' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const m = map[status] ?? { label: status, className: '' };
  return <Badge className={m.className}>{m.label}</Badge>;
}
