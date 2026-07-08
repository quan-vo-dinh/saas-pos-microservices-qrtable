'use client';

import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { playTap } from '@/mocks/audio';
import { useMockStore } from '@/mocks/store';
import type { ColumnStatus } from '@/mocks/kds-ticket';
import type { KDSTicketMock } from '@/mocks/kds-ticket';

const COLUMNS: ColumnStatus[] = ['WAITING', 'IN_PROGRESS', 'DONE'];

function isColumnId(id: unknown): id is ColumnStatus {
  return typeof id === 'string' && (COLUMNS as string[]).includes(id);
}

type Props = {
  children: ReactNode;
  tickets: KDSTicketMock[];
  /** Live/API board supplies callback; mock-only flows omit it and use the mock store. */
  onColumnChange?: (ticketId: string, column: ColumnStatus) => void;
};

export function KdsDndWrapper({ children, tickets, onColumnChange }: Props) {
  const [active, setActive] = useState<KDSTicketMock | null>(null);
  const setColumnMock = useMockStore((s) => s.setKdsTicketColumn);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const t = tickets.find((x) => x.ticketId === id) ?? null;
    setActive(t);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const ticketId = String(e.active.id);
    const overId = e.over?.id;
    if (isColumnId(overId)) {
      if (onColumnChange) {
        onColumnChange(ticketId, overId);
      } else {
        setColumnMock(ticketId, overId);
      }
      playTap();
    }
    setActive(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
        {active ? (
          <div className="w-[220px] rounded-lg border border-ring/50 bg-card p-2 font-mono text-sm text-card-foreground shadow-xl">
            <p className="text-lg font-bold text-primary">#{active.ticketId.slice(-3).toUpperCase()}</p>
            <p className="truncate text-xs text-muted-foreground">{active.tableName}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
