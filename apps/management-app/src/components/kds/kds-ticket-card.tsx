'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { OrderItemStatus } from '@einvoice/types';
import { AlertCircle, AlertTriangle, Circle, GripVertical, Star } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KDSTicketMock } from '@/mocks/kds-ticket';
import { useMockStore } from '@/mocks/store';

type Props = {
  ticket: KDSTicketMock;
  onTitleClick: () => void;
  /** SLA seconds used for band math (may be capped by station settings). */
  effectiveSlaSeconds: number;
  isSelected: boolean;
  onSelect: () => void;
  /** When provided, KDS uses live API actions instead of the mock store. */
  liveActions?: {
    advanceTicket: (ticketId: string) => void;
    recallTicket: (ticketId: string, reason: string, userId: string, userName: string) => void;
    togglePriority?: (ticketId: string, priority: boolean) => void;
    updateItem?: (ticketId: string, itemId: string, status: OrderItemStatus) => void;
  };
};

const HOLD_MS = 600;

function slaBand(ratio: number) {
  if (ratio < 0.6) return { bg: 'bg-chart-2', kind: 'ok' as const, label: 'Ổn định' };
  if (ratio < 0.9) return { bg: 'bg-chart-4', kind: 'warn' as const, label: 'Gần SLA' };
  return { bg: 'bg-destructive', kind: 'over' as const, label: 'Quá SLA' };
}

export function KdsTicketCard({
  ticket,
  onTitleClick,
  effectiveSlaSeconds,
  isSelected,
  onSelect,
  liveActions,
}: Props) {
  const [now, setNow] = useState<number | null>(null);
  const advanceMock = useMockStore((s) => s.advanceTicket);
  const recallMock = useMockStore((s) => s.recallTicket);
  const updateMock = useMockStore((s) => s.updateKdsTicketItemStatus);

  const advanceTicket = liveActions?.advanceTicket ?? advanceMock;
  const recallTicket = liveActions?.recallTicket ?? recallMock;
  const togglePriority = liveActions?.togglePriority;
  const updateItem = liveActions?.updateItem ?? updateMock;
  const canUpdateItems = !liveActions || Boolean(liveActions.updateItem);
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
  const ratio = elapsed / Math.max(1, effectiveSlaSeconds);
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
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest('button') || t.closest('[data-slot="checkbox"]') || t.closest('[data-kds-drag-handle]')) return;
        onSelect();
      }}
      className={cn(
        'relative flex w-[220px] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
        pulse && 'animate-pulse',
        isSelected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
      data-slot="kds-ticket-card"
    >
      <div className={cn('absolute start-0 top-0 h-full w-1', band.bg)} aria-hidden />
      {togglePriority ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={ticket.priority ? 'Bỏ ưu tiên ticket' : 'Ưu tiên ticket'}
          className={cn(
            'absolute end-9 top-1 z-10 size-7 border border-border bg-background/80',
            ticket.priority ? 'text-primary' : 'text-muted-foreground',
          )}
          onClick={(e) => {
            e.stopPropagation();
            togglePriority(ticket.ticketId, !ticket.priority);
          }}
        >
          <Star className={cn('size-4', ticket.priority && 'fill-current')} aria-hidden />
        </Button>
      ) : null}
      <div
        className="absolute end-1 top-1 flex size-7 cursor-grab items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground active:cursor-grabbing active:bg-muted"
        data-kds-drag-handle
        {...listeners}
        aria-label="Kéo ticket"
      >
        <GripVertical className="size-4" aria-hidden />
      </div>
      <button
        type="button"
        className="flex flex-col gap-1 border-b border-border/60 p-2 ps-3 text-start active:bg-muted/50"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
          onTitleClick();
        }}
      >
        <div className="flex items-center gap-1.5">
          {band.kind === 'ok' ? (
            <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : band.kind === 'warn' ? (
            <AlertTriangle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <AlertCircle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="sr-only">{band.label}</span>
          <span className="font-mono text-2xl font-bold leading-none tracking-tight text-primary">
            #{shortId}
          </span>
        </div>
        <span className="truncate text-lg font-semibold text-foreground">{ticket.tableName}</span>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          SLA {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')} /{' '}
          {Math.floor(effectiveSlaSeconds / 60)}m
        </span>
      </button>
      <ul className="flex max-h-28 flex-col gap-1 overflow-auto px-2 py-1.5 text-[0.75rem] leading-snug">
        {ticket.items.map((it) => {
          return (
            <li
              key={it.id}
              className="flex items-start gap-2 rounded-sm"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={it.status === OrderItemStatus.READY || it.status === OrderItemStatus.SERVED}
                disabled={!canUpdateItems}
                onCheckedChange={(v) => {
                  if (!canUpdateItems) return;
                  const next = v === true ? OrderItemStatus.READY : OrderItemStatus.PROCESSING;
                  updateItem(ticket.ticketId, it.id, next);
                }}
                aria-label={`Trạng thái ${it.menuItemName}`}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{it.quantity}×</span> {it.menuItemName}
                {it.note ? (
                  <span className="mt-0.5 block font-mono text-[0.65rem] text-muted-foreground italic">
                    {it.note}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <div
        className="mt-auto flex gap-1 border-t border-border/60 p-2"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {ticket.columnStatus === 'WAITING' ? (
          <Button
            type="button"
            className="h-11 flex-1"
            onClick={() => advanceTicket(ticket.ticketId)}
          >
            Bắt đầu
          </Button>
        ) : null}
        {ticket.columnStatus === 'IN_PROGRESS' ? (
          <Button
            type="button"
            variant="secondary"
            className="h-11 flex-1"
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
            className="h-11 flex-1 text-[0.7rem]"
            onClick={() => recallTicket(ticket.ticketId, 'Khách đổi món', 'staff-chef-1', 'Chị Lan')}
          >
            Recall
          </Button>
        ) : null}
      </div>
    </div>
  );
}
