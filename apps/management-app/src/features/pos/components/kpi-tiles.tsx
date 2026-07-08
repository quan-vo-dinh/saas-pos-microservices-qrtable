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
import { useOrdersQuery } from '@/features/order/hooks/use-order-query';
import { useOrderUiState } from '@/features/order/hooks/use-order-ui-state';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';
import { useNowMs, waitMinutes } from '@/lib/use-now-ms';
import { cn } from '@/lib/utils';

export function KpiTiles() {
  const liveOrdersQuery = useOrdersQuery();
  const tablesQuery = useTablesQuery();
  const posViewFilter = useOrderUiState((s) => s.viewFilter);
  const setPosViewFilter = useOrderUiState((s) => s.setViewFilter);
  const nowMs = useNowMs();

  const { pending, avgMin, overdue, occPct } = useMemo(() => {
    const liveOrders = liveOrdersQuery.data ?? [];
    const tables = tablesQuery.data ?? [];
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
  }, [liveOrdersQuery.data, tablesQuery.data, nowMs]);
  const hasDataError = liveOrdersQuery.isError || tablesQuery.isError;
  const pendingValue = hasDataError ? '—' : String(pending);
  const avgValue = hasDataError ? '—' : Number.isFinite(avgMin) ? formatMinutes(avgMin) : '—';
  const overdueValue = hasDataError ? '—' : String(overdue);
  const occPctValue = hasDataError ? '—' : `${occPct}%`;

  return (
    <div className="flex flex-col gap-1" data-slot="pos-kpi">
      {hasDataError ? (
        <p className="text-[0.65rem] leading-snug text-destructive">
          Không thể tải KPI POS. Kiểm tra kết nối hoặc quyền truy cập.
        </p>
      ) : null}
      <div className="flex flex-nowrap items-stretch gap-1">
        <Kpi
          label="Chờ xác nhận"
          value={pendingValue}
          icon={Clock3Icon}
          active={posViewFilter === 'PENDING'}
          onClick={() => setPosViewFilter('PENDING')}
          cta="Mở danh sách"
        />
        <Kpi
          label="TB chờ xử lý"
          value={avgValue}
          icon={CircleCheckBigIcon}
          active={false}
          cta="Theo dõi"
        />
        <Kpi
          label="Quá SLA 15′"
          value={overdueValue}
          icon={AlertTriangleIcon}
          active={posViewFilter === 'OVERDUE'}
          onClick={() => setPosViewFilter('OVERDUE')}
          cta="Ưu tiên xử lý"
        />
        <Kpi
          label="Bàn bận"
          value={occPctValue}
          icon={ArmchairIcon}
          active={posViewFilter === 'OCCUPIED_TABLE'}
          onClick={() => setPosViewFilter('OCCUPIED_TABLE')}
          cta="Xem bàn"
        />
      </div>
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
        className="block w-full rounded-lg px-0 py-0 text-start disabled:cursor-default"
      >
        <CardContent className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0 p-1.5 sm:p-2">
          <div
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/90 text-primary-foreground [&_svg]:size-3.5',
              active && 'bg-cyan-600',
            )}
          >
            <Icon aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[0.58rem] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
              {label}
            </p>
            <span className="mt-0.5 inline-flex max-w-full items-center gap-0.5 truncate text-[0.62rem] font-medium text-primary">
              {cta}
              <ChevronRightIcon aria-hidden="true" className="size-2.5 shrink-0 opacity-80" />
            </span>
          </div>
          <p
            className={cn(
              'shrink-0 font-mono text-base font-semibold tabular-nums leading-none text-foreground sm:text-lg',
              active && 'text-cyan-400',
            )}
          >
            {value}
          </p>
        </CardContent>
      </button>
    </Card>
  );
}
