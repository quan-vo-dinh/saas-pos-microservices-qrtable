'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { getErrorDisplayMessage } from '@einvoice/frontend-utils';
import { orderItemStatusVi, orderStatusVi } from '@einvoice/shared-constants';
import { OrderStatus } from '@einvoice/types';
import type { Order } from '@einvoice/types';
import { MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { OrderRowContextMenu } from '@/components/pos/order-row-context-menu';
import { CancelOrderDialog } from '@/components/pos/cancel-order-dialog';
import { useConfirmOrderMutation, useMarkOrderServedMutation, useOrdersQuery } from '@/features/order/hooks/use-order-query';
import { useOrderUiState, type OrderViewFilter } from '@/features/order/hooks/use-order-ui-state';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';
import { formatVnd } from '@/lib/format-vnd';
import { orderItemStatusChipClass, orderStatusChipClass } from '@/lib/pos-status-chips';
import { useNowMs, waitMinutes } from '@/lib/use-now-ms';
import { cn } from '@/lib/utils';

function posFilterChipsToView(filter: string): OrderViewFilter {
  if (filter === 'P') return 'PENDING';
  if (filter === 'D') return 'PROCESSING';
  if (filter === 'R') return 'READY';
  if (filter === 'S') return 'SERVED';
  if (filter === 'O') return 'OVERDUE';
  if (filter === 'T') return 'OCCUPIED_TABLE';
  return 'all';
}

const QUICK: { id: string; label: string; value: string }[] = [
  { id: 'a', label: 'Tất cả', value: 'ALL' },
  { id: 'b', label: 'Chờ xác nhận', value: 'P' },
  { id: 'c', label: 'Đang chế biến', value: 'D' },
  { id: 'd', label: 'Sẵn sàng bưng', value: 'R' },
  { id: 'e', label: 'Đã phục vụ', value: 'S' },
  { id: 'f', label: 'Quá SLA', value: 'O' },
  { id: 'g', label: 'Bàn bận', value: 'T' },
];

export function LiveOrdersTable() {
  'use no memo';

  const posViewFilter = useOrderUiState((s) => s.viewFilter);
  const setPosViewFilter = useOrderUiState((s) => s.setViewFilter);
  const selectRow = useOrderUiState((s) => s.selectOrder);
  const selectedRowId = useOrderUiState((s) => s.selectedOrderId);
  const confirmOrderMutation = useConfirmOrderMutation();
  const markServedMutation = useMarkOrderServedMutation();
  const tablesQuery = useTablesQuery();

  const [cancelTarget, setCancelTarget] = useState<{ orderId: string; orderStatus: OrderStatus } | null>(null);
  const [chip, setChip] = useState('ALL');
  const nowMs = useNowMs();

  const orderQueryParams = useMemo(() => {
    switch (posViewFilter) {
      case 'PENDING':
        return { status: OrderStatus.PENDING } as const;
      case 'PROCESSING':
        return { status: OrderStatus.PROCESSING } as const;
      case 'READY':
        return { status: OrderStatus.READY } as const;
      case 'SERVED':
        return { status: OrderStatus.SERVED } as const;
      default:
        return undefined;
    }
  }, [posViewFilter]);
  const ordersQuery = useOrdersQuery(orderQueryParams);
  const confirmingOrderId = confirmOrderMutation.isPending ? confirmOrderMutation.variables : null;
  const servingOrderId = markServedMutation.isPending ? markServedMutation.variables : null;

  useEffect(() => {
    if (posViewFilter === 'PENDING') setChip('P');
    else if (posViewFilter === 'PROCESSING') setChip('D');
    else if (posViewFilter === 'READY') setChip('R');
    else if (posViewFilter === 'SERVED') setChip('S');
    else if (posViewFilter === 'OVERDUE') setChip('O');
    else if (posViewFilter === 'OCCUPIED_TABLE') setChip('T');
    else if (posViewFilter === 'all') setChip('ALL');
  }, [posViewFilter]);

  const rows = useMemo(() => {
    const liveOrders = ordersQuery.data ?? [];
    const tables = tablesQuery.data ?? [];
    const base = liveOrders.filter(
      (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED && o.status !== OrderStatus.DRAFT,
    );
    const occ = new Set(
      tables.filter((t) => t.status === 'occupied' || t.status === 'billing').map((t) => t.id),
    );
    return base.filter((o) => {
      const w = stageWaitMinutes(o, nowMs);
      switch (posViewFilter) {
        case 'PENDING':
          return o.status === OrderStatus.PENDING;
        case 'PROCESSING':
          return o.status === OrderStatus.PROCESSING;
        case 'READY':
          return o.status === OrderStatus.READY;
        case 'SERVED':
          return o.status === OrderStatus.SERVED;
        case 'OVERDUE':
          return w > 15;
        case 'OCCUPIED_TABLE':
          return occ.has(o.tableId);
        default:
          return true;
      }
    });
  }, [ordersQuery.data, tablesQuery.data, posViewFilter, nowMs]);

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
                      <Badge className={cn('shrink-0 px-1 text-[0.6rem]', orderItemStatusChipClass(it.status))}>
                        {orderItemStatusVi(it.status)}
                      </Badge>
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
          <Badge className={cn('h-5 px-1.5 text-[0.6rem] font-medium', orderStatusChipClass(row.original.status))}>
            {orderStatusVi(row.original.status)}
          </Badge>
        ),
        size: 100,
      },
      {
        id: 'wait',
        header: 'Chờ',
        cell: ({ row }) => <WaitCell order={row.original} nowMs={nowMs} />,
        size: 86,
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
          const isConfirming = confirmingOrderId === o.id;
          const isServing = servingOrderId === o.id;
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
                  onClick={() => confirmOrderMutation.mutate(o.id)}
                  disabled={isConfirming}
                >
                  {isConfirming ? 'Đang nhận...' : 'Nhận'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 px-2 text-[0.7rem]"
                  onClick={() => {
                    setCancelTarget({ orderId: o.id, orderStatus: o.status });
                    selectRow(o.id);
                  }}
                >
                  Từ chối
                </Button>
              </div>
            );
          }
          if (o.status === OrderStatus.READY) {
            return (
              <div
                className="flex flex-nowrap items-center justify-end"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  className="h-7 px-2 text-[0.7rem]"
                  onClick={() => markServedMutation.mutate(o.id)}
                  disabled={isServing}
                >
                  {isServing ? 'Đang lưu...' : 'Đã phục vụ'}
                </Button>
              </div>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
        size: 150,
      },
    ],
    [confirmOrderMutation, confirmingOrderId, markServedMutation, selectRow, servingOrderId, nowMs],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is isolated in this "use no memo" component.
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
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs text-muted-foreground">Live API · {rows.length} hiển thị</p>
          {ordersQuery.isError ? (
            <p className="text-xs text-destructive">{getErrorDisplayMessage(ordersQuery.error as Error)}</p>
          ) : null}
        </div>
        <div className="inline-flex min-w-0 max-w-full items-center justify-end">
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
                        if (o.status !== OrderStatus.PENDING && o.status !== OrderStatus.PROCESSING) {
                          toast.error('Chỉ hỗ trợ huỷ đơn đang chờ hoặc đang xử lý.');
                          return;
                        }
                        setCancelTarget({ orderId: o.id, orderStatus: o.status });
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
                        if (o.status !== OrderStatus.PENDING && o.status !== OrderStatus.PROCESSING) {
                          toast.error('Chỉ hỗ trợ huỷ đơn đang chờ hoặc đang xử lý.');
                          return;
                        }
                        setCancelTarget({ orderId: o.id, orderStatus: o.status });
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
                  {ordersQuery.isLoading ? 'Đang tải live orders...' : 'Không có dòng nào khớp bộ lọc.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {cancelTarget ? (
        <CancelOrderDialog
          open={!!cancelTarget}
          onOpenChange={(open) => !open && setCancelTarget(null)}
          orderId={cancelTarget.orderId}
          orderStatus={cancelTarget.orderStatus}
        />
      ) : null}
    </div>
  );
}

function WaitCell({ order, nowMs }: { order: Order; nowMs: number }) {
  const m = stageWaitMinutes(order, nowMs);
  const label = stageWaitLabel(order.status);
  const c =
    m <= 8
      ? 'from-emerald-500/20 to-transparent'
      : m <= 15
        ? 'from-amber-500/25 to-transparent'
        : 'from-destructive/30 to-transparent animate-pulse';
  return (
    <div className={cn('rounded border border-transparent bg-gradient-to-r p-0.5 text-[0.65rem]', c)}>
      <span className="block truncate text-muted-foreground">{label}</span>
      <span className="font-mono text-[0.7rem] tabular-nums">{m.toFixed(0)}&apos;</span>
    </div>
  );
}

function stageWaitMinutes(order: Order, nowMs: number): number {
  return Math.max(0, waitMinutes(stageStartedAt(order), nowMs));
}

function stageStartedAt(order: Order): string {
  if (order.status === OrderStatus.PROCESSING) {
    return order.confirmedAt ?? order.updatedAt ?? order.createdAt;
  }
  if (order.status === OrderStatus.READY || order.status === OrderStatus.SERVED) {
    return order.updatedAt ?? order.createdAt;
  }
  return order.createdAt;
}

function stageWaitLabel(status: OrderStatus): string {
  if (status === OrderStatus.PENDING) return 'Xác nhận';
  if (status === OrderStatus.PROCESSING) return 'Đang làm';
  if (status === OrderStatus.READY) return 'Chờ bưng';
  if (status === OrderStatus.SERVED) return 'Đã phục vụ';
  return 'Chờ';
}
