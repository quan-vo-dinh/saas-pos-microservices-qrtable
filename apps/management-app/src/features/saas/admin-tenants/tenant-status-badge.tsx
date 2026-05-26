import { tenantStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@/components/ui/badge';
import type { TenantStatus } from '@/features/saas/types';

const styles: Record<TenantStatus, string> = {
  ACTIVE: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  SUSPENDED: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  CLOSED: 'bg-muted text-muted-foreground',
};

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  return <Badge className={styles[status] ?? ''}>{tenantStatusVi(status)}</Badge>;
}
