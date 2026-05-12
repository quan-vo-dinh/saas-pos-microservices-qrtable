import { Badge } from '@/components/ui/badge';
import type { TenantStatus } from '@/features/saas/types';

const styles: Record<TenantStatus, string> = {
  ACTIVE: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  SUSPENDED: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  CLOSED: 'bg-muted text-muted-foreground',
};

const labels: Record<TenantStatus, string> = {
  ACTIVE: 'Hoạt động',
  SUSPENDED: 'Tạm khóa',
  CLOSED: 'Đã đóng',
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <Badge className={styles[status] ?? ''}>{labels[status] ?? status}</Badge>;
}
