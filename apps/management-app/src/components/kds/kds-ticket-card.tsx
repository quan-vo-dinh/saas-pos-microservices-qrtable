'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { OrderItemStatus } from '@einvoice/types';
import { AlertCircle, AlertTriangle, Circle, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KDSTicketMock } from '@/mocks/kds-ticket';
import { useMockStore } from '@/mocks/store';

type Props = {
  ticket: KDSTicketMock;
  onTitleClick: () => void;
};

const HOLD_MS = 600;

function slaBand(ratio: number) {
  if (ratio < 0.6) return { bg: 'bg-[var(--lime)]', kind: 'ok' as const, label: 'Ổn định' };
  if (ratio < 0.9) return { bg: 'bg-[var(--amber)]', kind: 'warn' as const, label: 'Gần SLA' };
  return { bg: 'bg-[var(--pink)]', kind: 'over' as const, label: 'Quá SLA' };
}

export function KdsTicketCard({ ticket, onTitleClick }: Props) {
  const [now, setNow] = useState<number | null>(null);
  const advanceTicket = useMockStore((s) => s.advanceTicket);
  const recallTicket = useMockStore((s) => s.recallTicket);
  const updateItem = useMockStore((s) => s.updateKdsTicketItemStatus);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    const boot = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, []);

  const created = new Date(ticket.createdAt).getTime();
  const elapsed = ((now ?? created) - created) / 1000;
  const ratio = elapsed / Math.max(1, ticket.slaSeconds);
  const band = slaBand(ratio);
  const pulse = ratio >= 0.9;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.ticketId,
    data: { ticket },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  const clearHold = useCallback(() => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const startDoneHold = useCallback(() => {
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      advanceTicket(ticket.ticketId);
      holdTimer.current = null;
    }, HOLD_MS);
  }, [advanceTicket, clearHold, ticket.ticketId]);

  useEffect(() => () => clearHold(), [clearHold]);

  const shortId = ticket.ticketId.slice(-3).toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'relative flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-black/80',
        pulse && 'animate-pulse',
      )}
      data-slot="kds-ticket-card"
    >
      <div className={cn('absolute start-0 top-0 h-full w-1', band.bg)} aria-hidden />
      <div
        className="absolute end-1 top-1 flex size-7 cursor-grab items-center justify-center rounded-md border border-white/10 bg-black/50 text-white/70 hover:bg-white/10 active:cursor-grabbing"
        {...listeners}
        aria-label="Kéo ticket"
      >
        <GripVertical className="size-4" aria-hidden />
      </div>
      <button
        type="button"
        className="flex flex-col gap-1 border-b border-white/10 p-2 ps-3 text-start hover:bg-white/5"
        onClick={(e) => {
          e.stopPropagation();
          onTitleClick();
        }}
      >
        <div className="flex items-center gap-1.5">
          {band.kind === 'ok' ? (
            <Circle className="size-3.5 shrink-0 text-[var(--ink)]" aria-hidden />
          ) : band.kind === 'warn' ? (
            <AlertTriangle className="size-3.5 shrink-0 text-[var(--ink)]" aria-hidden />
          ) : (
            <AlertCircle className="size-3.5 shrink-0 text-[var(--ink)]" aria-hidden />
          )}
          <span className="sr-only">{band.label}</span>
          <span className="font-mono text-2xl font-bold leading-none tracking-tight text-[var(--lime)]">
            #{shortId}
          </span>
        </div>
        <span className="truncate text-lg font-semibold text-[var(--ink)]">{ticket.tableName}</span>
        <span className="font-mono text-[0.65rem] text-white/50">
          SLA {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')} / {Math.floor(ticket.slaSeconds / 60)}m
        </span>
      </button>
      <ul className="flex max-h-28 flex-col gap-1 overflow-auto px-2 py-1.5 text-[0.75rem] leading-snug">
        {ticket.items.map((it) => (
          <li key={it.id} className="flex items-start gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <Checkbox
              checked={it.status === OrderItemStatus.READY || it.status === OrderItemStatus.SERVED}
              onCheckedChange={(v) => {
                const next = v === true ? OrderItemStatus.READY : OrderItemStatus.PROCESSING;
                updateItem(ticket.ticketId, it.id, next);
              }}
              aria-label={`Trạng thái ${it.menuItemName}`}
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium text-[var(--ink)]">{it.quantity}×</span> {it.menuItemName}
              {it.note ? (
                <span className="mt-0.5 block font-mono text-[0.65rem] text-white/60 italic">{it.note}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex gap-1 border-t border-white/10 p-2" onPointerDown={(e) => e.stopPropagation()}>
        {ticket.columnStatus === 'WAITING' ? (
          <Button
            type="button"
            className="h-11 flex-1 bg-[var(--lime)] text-black hover:bg-[var(--lime)]/90"
            onClick={() => advanceTicket(ticket.ticketId)}
          >
            Bắt đầu
          </Button>
        ) : null}
        {ticket.columnStatus === 'IN_PROGRESS' ? (
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1 border-[var(--pink)]/50 bg-[var(--pink)]/20 text-[var(--ink)] hover:bg-[var(--pink)]/30"
            onPointerDown={startDoneHold}
            onPointerUp={clearHold}
            onPointerLeave={clearHold}
          >
            Giữ để Xong
          </Button>
        ) : null}
        {ticket.columnStatus === 'DONE' ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 border-white/20 text-[0.7rem]"
            onClick={() => recallTicket(ticket.ticketId, 'Khách đổi món', 'staff-chef-1', 'Chị Lan')}
          >
            Recall
          </Button>
        ) : null}
      </div>
    </div>
  );
}
