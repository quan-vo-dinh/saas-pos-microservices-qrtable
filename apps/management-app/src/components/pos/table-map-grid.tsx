'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Armchair, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@einvoice/frontend-ui';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { tableStatusVi } from '@einvoice/shared-constants';
import { OrderStatus } from '@einvoice/types';
import { getErrorDisplayMessage } from '@einvoice/frontend-utils';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';
import { TableStatusBadge } from '@/features/tables/components/table-status-badge';
import { TableStatusLegend } from '@/features/tables/components/table-status-legend';
import { statusBorderColors, statusBgColors } from '@/features/tables/lib/table-surface-styles';
import { useOrdersQuery } from '@/features/order/hooks/use-order-query';
import { usePosTableUiState } from '@/features/tables/hooks/use-pos-table-ui-state';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

function tableCenter(i: number) {
  const col = i % 6;
  const row = Math.floor(i / 6);
  return { x: 40 + col * 70, y: 40 + row * 60 };
}

function sessionLabel(sessionId: string | null) {
  if (!sessionId) return '—';
  return sessionId.length <= 8 ? sessionId : `···${sessionId.slice(-6)}`;
}

export function TableMapGrid() {
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');
  const tablesQuery = useTablesQuery();
  const ordersQuery = useOrdersQuery({ limit: 200 });
  const tables = tablesQuery.data ?? [];
  const liveOrders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const selectTable = usePosTableUiState((s) => s.selectTable);
  const selectedTableId = usePosTableUiState((s) => s.selectedTableId);

  const orderTotalByTable = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of liveOrders) {
      if (
        o.status === OrderStatus.CANCELED ||
        o.status === OrderStatus.COMPLETED ||
        o.status === OrderStatus.DRAFT
      ) {
        continue;
      }
      m[o.tableId] = (m[o.tableId] ?? 0) + o.totalAmount;
    }
    return m;
  }, [liveOrders]);

  useEffect(() => {
    if (highlight) {
      selectTable(highlight);
    }
  }, [highlight, selectTable]);

  const handleSelectTable = useCallback(
    (id: string) => {
      selectTable(id);
    },
    [selectTable],
  );

  if (tablesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải sơ đồ bàn...</p>;
  }

  if (tablesQuery.isError) {
    return (
      <p className="text-sm text-destructive">{getErrorDisplayMessage(tablesQuery.error as Error)}</p>
    );
  }

  if (!tables.length) {
    return <p className="text-sm text-muted-foreground">Chưa có bàn nào.</p>;
  }

  return (
    <Tabs
      value={view}
      onValueChange={(v) => v && setView(v as 'grid' | 'map')}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden"
      data-slot="pos-table-map"
    >
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <TableStatusLegend className="sm:flex-1" />
        <TabsList className="h-9 w-full shrink-0 grid grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="grid" className="text-xs">
            Lưới
          </TabsTrigger>
          <TabsTrigger value="map" className="text-xs">
            Sơ đồ
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="grid"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0 outline-none data-[state=inactive]:hidden"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
          <div className="grid grid-cols-2 gap-3 pb-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {tables.map((t) => {
              const occ = orderTotalByTable[t.id] ?? 0;
              const ring = highlight === t.id || selectedTableId === t.id;
              return (
                <HoverCard key={t.id} openDelay={200}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSelectTable(t.id)}
                      className={cn(
                        'group relative flex w-full flex-col items-center justify-center gap-1 text-center',
                        'rounded-xl border-2 p-3 transition-all',
                        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        statusBorderColors[t.status],
                        statusBgColors[t.status],
                        ring && 'ring-2 ring-ring ring-offset-2 ring-offset-background shadow-md',
                      )}
                    >
                      <Armchair className="size-6 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="text-sm font-semibold">{t.name}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        <span>{t.capacity}</span>
                      </div>
                      <TableStatusBadge status={t.status} className="mt-0.5 text-[10px] px-1.5 py-0" />
                      <div className="w-full border-t border-border/40 pt-1.5 text-[0.65rem] text-muted-foreground">
                        <span className="block">
                          Phiên:{' '}
                          <span className="font-mono text-foreground">{sessionLabel(t.sessionId)}</span>
                          {occ > 0 ? (
                            <span className="ml-1 font-mono text-foreground">{formatVnd(occ)}</span>
                          ) : null}
                        </span>
                      </div>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 text-xs" side="right" align="start">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-muted-foreground">Trạng thái: {tableStatusVi(t.status)}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      Chi tiết đơn & chuyển bàn: panel bên phải.
                    </p>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </div>
      </TabsContent>

      <TabsContent
        value="map"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0 outline-none data-[state=inactive]:hidden"
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border-2 border-border/50 bg-muted/10">
          <div className="absolute inset-0 touch-pan-y cursor-grab">
            <svg
              className="h-full w-full min-h-[200px]"
              viewBox="0 0 520 400"
              role="img"
              aria-label="Sơ đồ bàn (preview)"
            >
              <rect x="8" y="8" width="504" height="384" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
              {tables.map((t, i) => {
                const c = tableCenter(i);
                const isOcc = t.status === 'occupied' || t.status === 'billing';
                const label = t.name.length <= 4 ? t.name : t.name.slice(0, 3);
                return (
                  <g key={t.id} transform={`translate(${c.x},${c.y})`}>
                    {isOcc ? <circle r="22" fill="none" className="animate-pulse" stroke="hsl(var(--accent))" /> : null}
                    <circle
                      r="18"
                      className="cursor-pointer fill-card stroke-border"
                      onClick={() => handleSelectTable(t.id)}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.3em"
                      className="fill-foreground text-[0.45rem] font-mono"
                      pointerEvents="none"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
