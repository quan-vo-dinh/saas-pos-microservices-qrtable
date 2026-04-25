'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { OrderStatus } from '@einvoice/types';
import type { Order } from '@einvoice/types';
import { MessageSquareText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { OrderRowContextMenu } from '@/components/pos/order-row-context-menu';
import { CancelOrderDialog } from '@/components/pos/cancel-order-dialog';
import { useMockStore, type PosViewFilter } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';

function waitMinutes(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 60_000;
}

function useLiveTick(createdAt: string) {
  const [, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 10_000);
    return () => clearInterval(i);
  }, [createdAt]);
  return waitMinutes(createdAt);
}

function orderStatusBadge(s: string) {
  if (s === OrderStatus.PENDING) return 'bg-amber-500/25 text-amber-100';
  if (s === OrderStatus.PROCESSING) return 'bg-cyan-500/25 text-cyan-100';
  if (s === OrderStatus.READY) return 'bg-violet-500/25 text-violet-100';
  if (s === OrderStatus.SERVED) return 'bg-emerald-500/25 text-emerald-200';
  return 'bg-muted text-muted-foreground';
}

function posFilterChipsToView(filter: string): PosViewFilter {
  if (filter === 'P') return 'PENDING';
  if (filter === 'R') return 'READY';
  if (filter === 'D') return 'PROCESSING';
  if (filter === 'O') return 'OVERDUE';
  if (filter === 'T') return 'OCCUPIED_TABLE';
  return 'all';
}

const QUICK: { id: string; label: string; value: string }[] = [
  { id: 'a', label: 'Tất cả', value: 'ALL' },
  { id: 'b', label: 'Chờ', value: 'P' },
  { id: 'c', label: 'Bếp', value: 'D' },
  { id: 'd', label: 'Sẵn sàng', value: 'R' },
  { id: 'e', label: "Quá 15'", value: 'O' },
  { id: 'f', label: 'Bàn bận', value: 'T' },
];

export function LiveOrdersTable() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? 'staff-waiter-1';
  const liveOrders = useMockStore((s) => s.liveOrders);
  const tables = useMockStore((s) => s.tables);
  const posViewFilter = useMockStore((s) => s.posViewFilter);
  const setPosViewFilter = useMockStore((s) => s.setPosViewFilter);
  const selectRow = useMockStore((s) => s.selectRow);
  const selectedRowId = useMockStore((s) => s.selectedRowId);
  const confirmOrder = useMockStore((s) => s.confirmOrder);

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [chip, setChip] = useState('ALL');
  useEffect(() => {
    if (posViewFilter === 'PENDING') setChip('P');
    else if (posViewFilter === 'PROCESSING') setChip('D');
    else if (posViewFilter === 'READY') setChip('R');
    else if (posViewFilter === 'OVERDUE') setChip('O');
    else if (posViewFilter === 'OCCUPIED_TABLE') setChip('T');
    else if (posViewFilter === 'all') setChip('ALL');
  }, [posViewFilter]);

  const rows = useMemo(() => {
    const base = liveOrders.filter(
      (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.DRAFT,
    );
    const occ = new Set(
      tables.filter((t) => t.status === 'occupied' || t.status === 'billing').map((t) => t.id),
    );
    return base.filter((o) => {
      const w = waitMinutes(o.createdAt);
      switch (posViewFilter) {
        case 'PENDING':
          return o.status === OrderStatus.PENDING;
        case 'PROCESSING':
          return o.status === OrderStatus.PROCESSING;
        case 'READY':
          return o.status === OrderStatus.READY;
        case 'OVERDUE':
          return w > 15;
        case 'OCCUPIED_TABLE':
          return occ.has(o.tableId);
        default:
          return true;
      }
    });
  }, [liveOrders, tables, posViewFilter]);

  const columns: ColumnDef<Order>[] = useMemo(
    () => [
      {
        id: 'shortId',
        header: 'Mã',
        cell: ({ row }) => {
          const id = row.original.id;
          const s = id.slice(-4);
          return (
            <span className="font-mono text-xs tabular-nums text-muted-foreground" title={id}>
              {s}
            </span>
          );
        },
        size: 64,
      },
      {
        id: 'table',
        header: 'Bàn / khu',
        cell: ({ row }) => <span className="max-w-[8rem] truncate text-xs font-medium">{row.original.tableName}</span>,
      },
      {
        id: 'count',
        header: 'Món',
        cell: ({ row }) => {
          const o = row.original;
          return (
            <HoverCard>
              <HoverCardTrigger asChild>
                <span className="text-xs text-muted-foreground underline decoration-dotted" tabIndex={0}>
                  {o.items.length}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 p-2" align="start" side="bottom">
                <p className="text-[0.7rem] font-medium text-foreground/90">Nội dung ({o.items.length} món)</p>
                <ul className="mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto pr-0.5 text-xs">
                  {o.items.slice(0, 6).map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-1">
                      <span className="truncate">{it.menuItemName}</span>
                      <Badge className="shrink-0 px-1 text-[0.6rem]">{it.status}</Badge>
                    </li>
                  ))}
                </ul>
              </HoverCardContent>
            </HoverCard>
          );
        },
        size: 40,
      },
      {
        id: 'total',
        header: 'Tổng',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground tabular-nums">{formatVnd(row.original.totalAmount)}</span>
        ),
      },
      {
        id: 'status',
        header: 'TT',
        cell: ({ row }) => (
          <Badge className={cn('h-5 px-1.5 text-[0.6rem] font-medium', orderStatusBadge(row.original.status))}>
            {row.original.status}
          </Badge>
        ),
        size: 100,
      },
      {
        id: 'wait',
        header: 'Chờ',
        cell: ({ row }) => <WaitCell createdAt={row.original.createdAt} />,
        size: 64,
      },
      {
        id: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => {
          const o = row.original;
          const n =
            o.notes?.trim() ||
            o.items
              .map((i) => i.note)
              .filter((x): x is string => Boolean(x))
              .join(' · ') ||
            '';
          if (!n) {
            return <span className="text-muted-foreground/50">—</span>;
          }
          return (
            <HoverCard>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground"
                  aria-label="Xem toàn bộ ghi chú"
                >
                  <MessageSquareText className="size-4" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 text-xs" align="end">
                {n}
              </HoverCardContent>
            </HoverCard>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const o = row.original;
          if (o.status === OrderStatus.PENDING) {
            return (
              <div
                className="flex flex-nowrap items-center justify-end gap-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  className="h-7 px-2 text-[0.7rem]"
                  onClick={() => void confirmOrder(o.id, userId)}
                >
                  Nhận
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-2 text-[0.7rem]"
                  onClick={() => {
                    setCancelId(o.id);
                    selectRow(o.id);
                  }}
                >
                  Từ chối
                </Button>
              </div>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
        size: 150,
      },
    ],
    [confirmOrder, selectRow, userId],
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  const scrollParentRef = useRef<HTMLDivElement>(null);
  const useVirtual = rows.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 28,
    overscan: 12,
    enabled: useVirtual,
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2" data-slot="pos-live-orders">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Live (mock) · {rows.length} hiển thị</p>
        <div className="inline-flex min-w-0 max-w-full flex-1 items-center justify-end">
          <ToggleGroup
            type="single"
            className="flex h-auto min-w-0 max-w-full flex-wrap justify-end gap-0.5 p-0.5"
            value={chip}
            onValueChange={(v) => {
              if (!v) return;
              setChip(v);
              if (v === 'ALL') setPosViewFilter('all');
              else setPosViewFilter(posFilterChipsToView(v));
            }}
            aria-label="Lọc trạng thái nhanh"
          >
            {QUICK.map((q) => (
              <ToggleGroupItem key={q.id} value={q.value} className="h-6 px-1.5 text-[0.6rem]">
                {q.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div
        ref={scrollParentRef}
        className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-border/50"
      >
        <Table className={useVirtual ? 'table-fixed' : undefined}>
          <colgroup>
            {table.getHeaderGroups()[0]?.headers.map((h) => (
              <col key={h.id} style={{ width: `${h.getSize()}px` }} />
            ))}
          </colgroup>
          <TableHeader className={useVirtual ? 'sticky top-0 z-10 bg-background' : undefined}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="h-7 hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="p-1 text-[0.65rem] text-muted-foreground" style={{ width: h.getSize() }}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={cn(useVirtual && 'relative block')}
            style={useVirtual ? { height: `${rowVirtualizer.getTotalSize()}px` } : undefined}
          >
            {table.getRowModel().rows.length ? (
              useVirtual ? (
                rowVirtualizer.getVirtualItems().map((vr) => {
                  const row = table.getRowModel().rows[vr.index];
                  const o = row.original;
                  return (
                    <OrderRowContextMenu
                      key={o.id}
                      orderId={o.id}
                      onCancelClick={() => {
                        setCancelId(o.id);
                        selectRow(o.id);
                      }}
                    >
                      <TableRow
                        ref={rowVirtualizer.measureElement}
                        data-index={vr.index}
                        data-state={selectedRowId === o.id ? 'selected' : undefined}
                        onClick={() => void selectRow(o.id)}
                        className={cn(
                          'absolute left-0 top-0 box-border h-7 w-full cursor-pointer border-b border-border/30 text-sm leading-tight',
                          selectedRowId === o.id && 'bg-muted/60',
                        )}
                        style={{ transform: `translateY(${vr.start}px)` }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="p-1"
                            style={{ maxWidth: cell.column.getSize(), width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    </OrderRowContextMenu>
                  );
                })
              ) : (
                table.getRowModel().rows.map((row) => {
                  const o = row.original;
                  return (
                    <OrderRowContextMenu
                      key={o.id}
                      orderId={o.id}
                      onCancelClick={() => {
                        setCancelId(o.id);
                        selectRow(o.id);
                      }}
                    >
                      <motion.tr
                        layout
                        data-state={selectedRowId === o.id ? 'selected' : undefined}
                        onClick={() => void selectRow(o.id)}
                        className={cn(
                          'h-7 cursor-pointer border-b border-border/30 text-sm leading-tight',
                          selectedRowId === o.id && 'bg-muted/60',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className="p-1"
                            style={{ maxWidth: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </motion.tr>
                    </OrderRowContextMenu>
                  );
                })
              )
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-4 text-center text-sm text-muted-foreground">
                  Không có dòng nào khớp bộ lọc.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {cancelId ? (
        <CancelOrderDialog
          open={!!cancelId}
          onOpenChange={(open) => !open && setCancelId(null)}
          orderId={cancelId}
          userId={userId}
        />
      ) : null}
    </div>
  );
}

function WaitCell({ createdAt }: { createdAt: string }) {
  const m = useLiveTick(createdAt);
  const c =
    m <= 8
      ? 'from-emerald-500/20 to-transparent'
      : m <= 15
        ? 'from-amber-500/25 to-transparent'
        : 'from-destructive/30 to-transparent animate-pulse';
  return (
    <div className={cn('rounded border border-transparent bg-gradient-to-r p-0.5 font-mono text-[0.7rem] tabular-nums', c)}>
      {m < 0 ? '0' : m.toFixed(0)}&apos;
    </div>
  );
}
