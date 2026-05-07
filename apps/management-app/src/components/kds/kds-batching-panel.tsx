'use client';

import { useMemo } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { effectiveSlaSeconds } from '@/lib/kds-station-prefs';
import { useMockStore } from '@/mocks/store';
import type { KDSStation } from '@/mocks/kds-ticket';
import type { KDSTicketMock } from '@/mocks/kds-ticket';

type AggRow = { name: string; qty: number; tableIds: Set<string> };

function aggregateTickets(tickets: KDSTicketMock[]): AggRow[] {
  const map = new Map<string, { qty: number; tables: Set<string> }>();
  for (const t of tickets) {
    if (t.columnStatus !== 'WAITING' && t.columnStatus !== 'IN_PROGRESS') continue;
    for (const it of t.items) {
      const key = it.menuItemName.trim();
      const cur = map.get(key) ?? { qty: 0, tables: new Set<string>() };
      cur.qty += it.quantity;
      cur.tables.add(t.tableId);
      map.set(key, cur);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, tableIds: v.tables }))
    .sort((a, b) => b.qty - a.qty);
}

function slaWatchRows(tickets: KDSTicketMock[], slaCapMinutes: number, now: number) {
  const active = tickets.filter((t) => t.columnStatus === 'WAITING' || t.columnStatus === 'IN_PROGRESS');
  return active
    .map((t) => {
      const created = new Date(t.createdAt).getTime();
      const elapsedSec = (now - created) / 1000;
      const eff = effectiveSlaSeconds(t.slaSeconds, slaCapMinutes);
      const ratio = elapsedSec / eff;
      return { ticket: t, ratio, elapsedSec, eff };
    })
    .filter((x) => x.ratio >= 0.8)
    .sort((a, b) => b.ratio - a.ratio);
}

type Props = {
  station: KDSStation;
  slaCapMinutes: number;
  now: number;
  className?: string;
  onItemTap: (itemName: string) => void;
  onFocusTicket: (ticketId: string) => void;
  /** When provided (live KDS), replaces mock store tickets for this station. */
  tickets?: KDSTicketMock[];
};

export function KdsBatchingPanel({ station, slaCapMinutes, now, className, onItemTap, onFocusTicket, tickets: ticketsProp }: Props) {
  const mockTickets = useMockStore((s) => s.kdsTickets);
  const kdsTickets = ticketsProp ?? mockTickets;
  const highlighted = useMockStore((s) => s.kdsHighlightedItemName);

  const mine = useMemo(() => kdsTickets.filter((t) => t.station === station), [kdsTickets, station]);
  const rows = useMemo(() => aggregateTickets(mine), [mine]);
  const watch = useMemo(() => slaWatchRows(mine, slaCapMinutes, now), [mine, slaCapMinutes, now]);

  const maxQty = rows[0]?.qty ?? 1;

  return (
    <aside
      className={cn(
        'flex min-h-0 w-full shrink-0 flex-col gap-2 border border-white/10 bg-black/50 p-2 font-[family-name:var(--font-kds-body)] xl:w-[360px]',
        className,
      )}
      data-slot="kds-batching-panel"
      data-kds-ignore-shortcuts
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight text-[var(--ink)]">Batching</p>
        <Badge variant="outline" className="border-white/20 font-mono text-[0.65rem] text-[var(--lime)]">
          {rows.length} món
        </Badge>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="flex flex-col gap-2 pr-2">
          {rows.length === 0 ? (
            <li className="text-sm text-white/50">Không có ticket chờ / đang làm.</li>
          ) : (
            rows.map((r) => {
              const active = highlighted === r.name;
              return (
                <li key={r.name}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-md border border-white/10 bg-black/60 p-2 text-start active:bg-white/10',
                      active && 'ring-2 ring-[var(--lime)] ring-offset-2 ring-offset-black',
                    )}
                    onClick={() => onItemTap(r.name)}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)]">{r.name}</span>
                      <span className="shrink-0 font-mono text-xs text-white/60">
                        {r.qty} ({r.tableIds.size} bàn)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-white/10">
                      <div
                        className="h-full bg-[var(--lime)]"
                        style={{ width: `${Math.max(6, Math.round((r.qty / maxQty) * 100))}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>

      <Separator className="bg-white/10" />

      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/55">SLA watch</p>
        <p className="text-[0.65rem] text-white/45">≥80% ngưỡng hiệu chỉnh (cap {slaCapMinutes}m)</p>
      </div>
      <ScrollArea className="max-h-40">
        <ul className="flex flex-col gap-1 pr-2">
          {watch.length === 0 ? (
            <li className="text-sm text-white/50">Không có ticket gần / quá SLA.</li>
          ) : (
            watch.map(({ ticket, ratio }) => {
              const sev = ratio >= 0.9 ? 'over' : 'warn';
              return (
                <li key={ticket.ticketId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-black/60 px-2 py-1.5 text-start active:bg-white/10"
                    onClick={() => onFocusTicket(ticket.ticketId)}
                  >
                    {sev === 'over' ? (
                      <AlertCircle className="size-4 shrink-0 text-[var(--pink)]" aria-hidden />
                    ) : (
                      <AlertTriangle className="size-4 shrink-0 text-[var(--amber)]" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 font-mono text-xs text-[var(--ink)]">
                      #{ticket.ticketId.slice(-4)} · {new Date(ticket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="shrink-0 text-[0.65rem] text-white/60">{Math.round(ratio * 100)}%</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </ScrollArea>
    </aside>
  );
}
