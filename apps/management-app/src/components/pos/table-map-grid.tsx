'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@einvoice/frontend-ui';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';

function statusClass(s: string) {
  if (s === 'available') return 'border-emerald-500/50 bg-emerald-500/5';
  if (s === 'occupied') return 'border-amber-500/50 bg-amber-500/5';
  if (s === 'billing') return 'border-rose-500/50 bg-rose-500/5';
  return 'border-sky-500/50 bg-sky-500/5';
}

function tableCenter(i: number) {
  const col = i % 6;
  const row = Math.floor(i / 6);
  return { x: 40 + col * 70, y: 40 + row * 60 };
}

export function TableMapGrid() {
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const searchParams = useSearchParams();
  const highlight = searchParams.get('highlight');
  const tables = useMockStore((s) => s.tables);
  const liveOrders = useMockStore((s) => s.liveOrders);
  const mockPresence = useMockStore((s) => s.mockPresence);
  const selectTable = useMockStore((s) => s.selectTable);
  const selectedTableId = useMockStore((s) => s.selectedTableId);

  const orderTotalByTable = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of liveOrders) {
      if (o.status === 'CANCELED' || o.status === 'COMPLETED') continue;
      m[o.tableId] = (m[o.tableId] ?? 0) + o.totalAmount;
    }
    return m;
  }, [liveOrders]);

  const idleLabel = useCallback((sessionId: string | null) => {
    if (!sessionId) return "—";
    return `${12 + (sessionId.length % 20)}'`;
  }, []);

  useEffect(() => {
    if (highlight) {
      void selectTable(highlight);
    }
  }, [highlight, selectTable]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2" data-slot="pos-table-map">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Bàn (mock) · {tables.length}</p>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as 'grid' | 'map')}
          className="h-7"
        >
          <ToggleGroupItem value="grid" className="h-6 px-2 text-[0.7rem]">
            Grid
          </ToggleGroupItem>
          <ToggleGroupItem value="map" className="h-6 px-2 text-[0.7rem]">
            Map
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === 'grid' ? (
        <ScrollArea className="h-[min(60vh,520px)] pr-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {tables.map((t) => {
              const pres = mockPresence.find((p) => p.tableId === t.id);
              const occ = orderTotalByTable[t.id] ?? 0;
              const ring = highlight === t.id || selectedTableId === t.id;
              return (
                <HoverCard key={t.id} openDelay={200}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      onClick={() => void selectTable(t.id)}
                      className={cn('text-start', ring && 'ring-2 ring-cyan-500/60')}
                    >
                      <Card
                        className={cn(
                          'h-full min-h-24 border border-dashed p-0 transition-shadow hover:shadow-sm',
                          statusClass(t.status),
                        )}
                      >
                        <CardHeader className="p-1.5 pb-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-semibold">{t.name}</span>
                            <Badge
                              variant="outline"
                              className="h-4 border-0 px-1 text-[0.6rem] uppercase"
                            >
                              {t.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-1 p-1.5 pt-0 text-[0.65rem] text-muted-foreground">
                          <span>∅ {t.capacity} · {idleLabel(t.sessionId)}</span>
                          {occ > 0 ? <span className="font-mono text-foreground">{formatVnd(occ)}</span> : <span>—</span>}
                          {pres && pres.guests.length ? (
                            <div className="flex items-center gap-0.5">
                              <Users className="size-3 opacity-70" />
                              <div className="flex gap-0.5">
                                {pres.guests.slice(0, 3).map((g) => (
                                  <Avatar key={g.name} className="size-5">
                                    <AvatarFallback className="text-[0.5rem]">{g.name[0]}</AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 text-xs" side="right" align="start">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-muted-foreground">5 sự kiện gần nhất (wireframe) — bước 2.5 sẽ stream log.</p>
                    <p className="mt-1 text-[0.65rem]">Chuyển bàn: dùng panel phải.</p>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="relative h-[min(60vh,520px)] overflow-hidden rounded-lg border border-border/50 bg-background/30">
          <div className="absolute inset-0 touch-pan-y cursor-grab">
            <svg
              className="h-full w-full"
              viewBox="0 0 520 400"
              role="img"
              aria-label="Sơ đồ bàn tĩnh (pan kéo)"
            >
              <rect x="8" y="8" width="504" height="384" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
              {tables.map((t, i) => {
                const c = tableCenter(i);
                const isOcc = t.status === 'occupied' || t.status === 'billing';
                return (
                  <g key={t.id} transform={`translate(${c.x},${c.y})`}>
                    {isOcc ? <circle r="22" fill="none" className="animate-pulse" stroke="hsl(var(--accent))" /> : null}
                    <circle
                      r="18"
                      className="cursor-pointer fill-card stroke-border"
                      onClick={() => void selectTable(t.id)}
                    />
                    <text textAnchor="middle" dy="0.3em" className="fill-foreground text-[0.5rem] font-mono" pointerEvents="none">
                      {i + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
