'use client';

import { cn } from '@/lib/utils';
import type { TableStatus } from '../data/schema';
import { statusConfig } from './table-status-badge';
import { statusBorderColors, statusBgColors } from '../lib/table-surface-styles';
import { tableStatusVi } from '@einvoice/shared-constants';

export function TableStatusLegend({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-xs text-muted-foreground', className)}>
      {(Object.keys(statusConfig) as TableStatus[]).map((status) => (
        <div key={status} className="flex items-center gap-1.5">
          <div
            className={cn(
              'size-3 rounded-sm border',
              statusBorderColors[status],
              statusBgColors[status],
            )}
          />
          <span>{tableStatusVi(status)}</span>
        </div>
      ))}
    </div>
  );
}
