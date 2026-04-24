'use client';

import { useMemo } from 'react';
import { OrderStatus } from '@einvoice/types';
import { Card, CardContent } from '@/components/ui/card';
import { useMockStore } from '@/mocks/store';
import { cn } from '@/lib/utils';

function waitMinutes(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60_000;
}

export function KpiTiles() {
  const liveOrders = useMockStore((s) => s.liveOrders);
  const tables = useMockStore((s) => s.tables);
  const posViewFilter = useMockStore((s) => s.posViewFilter);
  const setPosViewFilter = useMockStore((s) => s.setPosViewFilter);

  const { pending, avgMin, overdue, occPct } = useMemo(() => {
    const active = liveOrders.filter(
      (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.DRAFT,
    );
    const pend = active.filter((o) => o.status === OrderStatus.PENDING);
    const processing = active.filter((o) => o.status === OrderStatus.PROCESSING);
    const times = [...pend, ...processing].map((o) => waitMinutes(o.createdAt));
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const ovd = active.filter((o) => waitMinutes(o.createdAt) > 15).length;
    const tot = tables.length;
    const occ = tables.filter((t) => t.status === 'occupied' || t.status === 'billing').length;
    const pct = tot ? Math.round((occ / tot) * 100) : 0;
    return { pending: pend.length, avgMin: avg, overdue: ovd, occPct: pct };
  }, [liveOrders, tables]);

  return (
    <div className="flex flex-nowrap items-stretch gap-1.5" data-slot="pos-kpi">
      <Kpi
        label="Chờ xác nhận"
        value={String(pending)}
        active={posViewFilter === 'PENDING'}
        onClick={() => setPosViewFilter('PENDING')}
      />
      <Kpi
        label="TB phục vụ (demo)"
        value={Number.isFinite(avgMin) ? formatMinutes(avgMin) : '—'}
        active={false}
      />
      <Kpi
        label="Quá SLA 15′"
        value={String(overdue)}
        active={posViewFilter === 'OVERDUE'}
        onClick={() => setPosViewFilter('OVERDUE')}
      />
      <Kpi
        label="Bàn bận"
        value={`${occPct}%`}
        active={posViewFilter === 'OCCUPIED_TABLE'}
        onClick={() => setPosViewFilter('OCCUPIED_TABLE')}
      />
    </div>
  );
}

function formatMinutes(n: number) {
  if (!n || n < 0) return "0'00";
  const m = Math.floor(n);
  const s = Math.floor((n - m) * 60);
  return `${m.toString()}'${String(s).padStart(2, '0')}`;
}

function Kpi({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card className="min-w-0 flex-1 border border-border/40 bg-card/30 p-0 py-0 text-sm ring-0 shadow-sm">
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="block w-full min-h-[3.5rem] rounded-lg text-start disabled:cursor-default"
      >
        <CardContent className="p-1.5">
          <p className="truncate text-[0.6rem] font-medium uppercase text-muted-foreground">
            {label}
          </p>
          <p
            className={cn('mt-0.5 font-mono text-lg font-semibold text-foreground tabular-nums', active && 'text-cyan-400')}
          >
            {value}
          </p>
        </CardContent>
      </button>
    </Card>
  );
}
