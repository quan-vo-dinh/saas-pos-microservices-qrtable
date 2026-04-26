'use client';

import { useMemo } from 'react';
import { OrderStatus } from '@einvoice/types';
import {
  Clock3Icon,
  AlertTriangleIcon,
  CircleCheckBigIcon,
  ArmchairIcon,
  ChevronRightIcon,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useMockStore } from '@/mocks/store';
import { useNowMs, waitMinutes } from '@/lib/use-now-ms';
import { cn } from '@/lib/utils';

export function KpiTiles() {
  const liveOrders = useMockStore((s) => s.liveOrders);
  const tables = useMockStore((s) => s.tables);
  const posViewFilter = useMockStore((s) => s.posViewFilter);
  const setPosViewFilter = useMockStore((s) => s.setPosViewFilter);
  const nowMs = useNowMs();

  const { pending, avgMin, overdue, occPct } = useMemo(() => {
    const active = liveOrders.filter(
      (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.DRAFT,
    );
    const pend = active.filter((o) => o.status === OrderStatus.PENDING);
    const processing = active.filter((o) => o.status === OrderStatus.PROCESSING);
    const times = [...pend, ...processing].map((o) => waitMinutes(o.createdAt, nowMs));
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const ovd = active.filter((o) => waitMinutes(o.createdAt, nowMs) > 15).length;
    const tot = tables.length;
    const occ = tables.filter((t) => t.status === 'occupied' || t.status === 'billing').length;
    const pct = tot ? Math.round((occ / tot) * 100) : 0;
    return { pending: pend.length, avgMin: avg, overdue: ovd, occPct: pct };
  }, [liveOrders, tables, nowMs]);

  return (
    <div className="flex flex-nowrap items-stretch gap-1.5" data-slot="pos-kpi">
      <Kpi
        label="Chờ xác nhận"
        value={String(pending)}
        icon={Clock3Icon}
        active={posViewFilter === 'PENDING'}
        onClick={() => setPosViewFilter('PENDING')}
        cta="Mở danh sách"
      />
      <Kpi
        label="TB phục vụ (demo)"
        value={Number.isFinite(avgMin) ? formatMinutes(avgMin) : '—'}
        icon={CircleCheckBigIcon}
        active={false}
        cta="Theo dõi"
      />
      <Kpi
        label="Quá SLA 15′"
        value={String(overdue)}
        icon={AlertTriangleIcon}
        active={posViewFilter === 'OVERDUE'}
        onClick={() => setPosViewFilter('OVERDUE')}
        cta="Ưu tiên xử lý"
      />
      <Kpi
        label="Bàn bận"
        value={`${occPct}%`}
        icon={ArmchairIcon}
        active={posViewFilter === 'OCCUPIED_TABLE'}
        onClick={() => setPosViewFilter('OCCUPIED_TABLE')}
        cta="Xem bàn"
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
  icon: Icon,
  cta,
  active,
  onClick,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  cta: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'min-w-0 flex-1 border border-border/40 bg-card/60 p-0 text-sm shadow-sm transition-colors',
        active && 'border-cyan-500/40 bg-cyan-500/5',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className="block w-full min-h-[5.75rem] rounded-lg px-0 py-0 text-start disabled:cursor-default"
      >
        <CardContent className="grid grid-cols-[1fr_auto] items-start gap-2 p-2">
          <div className="flex min-w-0 flex-col gap-2">
            <div
              className={cn(
                'rounded-md bg-primary/90 text-primary-foreground flex size-9 items-center justify-center [&_svg]:size-4',
                active && 'bg-cyan-600',
              )}
            >
              <Icon aria-hidden="true" />
            </div>
            <p className="truncate text-[0.62rem] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <span className="text-primary inline-flex items-center gap-1 text-[0.68rem] font-medium">
              {cta}
              <ChevronRightIcon aria-hidden="true" className="size-3 shrink-0" />
            </span>
          </div>
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
