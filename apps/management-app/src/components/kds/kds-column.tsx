'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ColumnStatus } from '@/mocks/kds-ticket';

type Props = {
  columnId: ColumnStatus;
  title: string;
  accentClass: string;
  count: number;
  children: ReactNode;
};

export function KdsColumn({ columnId, title, accentClass, count, children }: Props) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      data-slot="kds-column"
      className={cn(
        'flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border/60 bg-muted/20',
        isOver && 'ring-2 ring-ring/50',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-between border-b border-border/60 px-2 py-1.5',
          accentClass,
        )}
      >
        <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-foreground">{title}</span>
        <Badge variant="secondary" className="h-5 min-w-6 justify-center bg-background font-mono text-[0.65rem]">
          {count}
        </Badge>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">{children}</div>
    </div>
  );
}
