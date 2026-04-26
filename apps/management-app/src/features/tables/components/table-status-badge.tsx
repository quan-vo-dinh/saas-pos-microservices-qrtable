'use client';

import { tableStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';
import type { TableStatus } from '../data/schema';

const statusConfig: Record<TableStatus, { className: string }> = {
  available: {
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  occupied: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  billing: {
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  cleaning: {
    className: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20',
  },
};

type TableStatusBadgeProps = {
  status: TableStatus;
  className?: string;
};

export function TableStatusBadge({ status, className }: TableStatusBadgeProps) {
  const normalizedStatus = (status || '').toLowerCase() as TableStatus;
  const config = statusConfig[normalizedStatus] ?? {
    className: 'bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/20',
  };
  const label =
    normalizedStatus in statusConfig ? tableStatusVi(normalizedStatus) : status || '—';

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {label}
    </Badge>
  );
}

export { statusConfig };
