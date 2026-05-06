'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TransferTableDialog } from '@/components/pos/transfer-table-dialog';
import { formatVnd } from '@/lib/format-vnd';
import { orderStatusVi, tableStatusVi } from '@einvoice/shared-constants';
import { OrderStatus, type Order } from '@einvoice/types';
import { getErrorDisplayMessage } from '@einvoice/frontend-utils';
import { useOrdersQuery } from '@/features/order/hooks/use-order-query';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';
import { useUpdateTableStatusMutation } from '@/features/tables/hooks/use-tables-mutations';

function statusVariant(s: string) {
  if (s === 'available') return 'default';
  if (s === 'occupied') return 'secondary';
  if (s === 'billing') return 'destructive';
  return 'outline';
}

function isActiveOrder(o: Order) {
  return (
    o.status !== OrderStatus.CANCELED &&
    o.status !== OrderStatus.COMPLETED &&
    o.status !== OrderStatus.DRAFT
  );
}

function formatActivityTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TableDetailPanel({ tableId }: { tableId: string }) {
  const tablesQuery = useTablesQuery();
  const ordersQuery = useOrdersQuery({ tableId, limit: 50 });
  const updateStatusMutation = useUpdateTableStatusMutation();
  const [transferOpen, setTransferOpen] = useState(false);

  const table = useMemo(
    () => tablesQuery.data?.find((t) => t.id === tableId),
    [tablesQuery.data, tableId],
  );

  const orders = useMemo(
    () => (ordersQuery.data ?? []).filter((o) => o.tableId === tableId && isActiveOrder(o)),
    [ordersQuery.data, tableId],
  );

  const activityLines = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return sorted.slice(0, 5).map((o) => ({
      key: o.id,
      text: `Đơn …${o.id.slice(-4)} · ${orderStatusVi(o.status)} · ${formatActivityTime(o.updatedAt)}`,
    }));
  }, [orders]);

  const total = orders.reduce((s, o) => s + o.totalAmount, 0);

  if (tablesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải thông tin bàn...</p>;
  }

  if (tablesQuery.isError) {
    return (
      <p className="text-sm text-destructive">{getErrorDisplayMessage(tablesQuery.error as Error)}</p>
    );
  }

  if (!table) {
    return <p className="text-sm text-destructive">Không tìm thấy bàn.</p>;
  }

  return (
    <div className="flex min-h-0 flex-col gap-2" data-slot="pos-table-detail">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{table.name}</h2>
            <p className="text-[0.7rem] text-muted-foreground">{table.areaName}</p>
          </div>
          <Badge variant={statusVariant(table.status)} className="shrink-0">
            {tableStatusVi(table.status)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Sức chứa {table.capacity} · Phiên{' '}
          {table.sessionId ? (
            <span className="font-mono text-foreground">{table.sessionId}</span>
          ) : (
            '—'
          )}
        </p>
      </div>
      <Separator />
      <p className="text-[0.65rem] font-medium text-muted-foreground">Hoạt động gần đây (theo đơn)</p>
      {activityLines.length ? (
        <ul className="flex flex-col gap-1 text-[0.7rem] text-foreground/90">
          {activityLines.map((line) => (
            <li key={line.key} className="border-s-2 border-border ps-1.5">
              {line.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.7rem] text-muted-foreground">Chưa có đơn hoạt động để hiển thị.</p>
      )}
      <Separator />
      <p className="text-[0.65rem] font-medium text-muted-foreground">Đơn tại bàn</p>
      {ordersQuery.isError ? (
        <p className="text-sm text-destructive">{getErrorDisplayMessage(ordersQuery.error as Error)}</p>
      ) : ordersQuery.isLoading ? (
        <p className="text-[0.7rem] text-muted-foreground">Đang tải đơn...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="h-6">
              <TableHead className="p-1 text-[0.65rem]">Mã</TableHead>
              <TableHead className="p-1 text-[0.65rem]">TT</TableHead>
              <TableHead className="p-1 text-end text-[0.65rem]">Tổng</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length ? (
              orders.map((o) => (
                <TableRow key={o.id} className="h-6 text-xs">
                  <TableCell className="p-1 font-mono">…{o.id.slice(-4)}</TableCell>
                  <TableCell className="p-1">{orderStatusVi(o.status)}</TableCell>
                  <TableCell className="p-1 text-end font-mono tabular-nums">{formatVnd(o.totalAmount)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="p-2 text-center text-[0.7rem] text-muted-foreground">
                  Chưa có đơn.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
      <p className="text-sm font-mono">Tổng chạy: {formatVnd(total)}</p>
      <div className="mt-auto flex flex-col gap-1.5">
        <Button
          type="button"
          className="w-full"
          onClick={() => setTransferOpen(true)}
          disabled={!table.sessionId}
        >
          Chuyển bàn
        </Button>
        <Button type="button" variant="secondary" className="w-full" disabled title="Giai đoạn thanh toán (Phase 3)">
          Đóng phiên
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={table.status !== 'cleaning' || updateStatusMutation.isPending}
          onClick={() => {
            updateStatusMutation.mutate({ id: table.id, status: 'available' });
          }}
        >
          Đánh dấu sạch
        </Button>
      </div>
      <TransferTableDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        fromTableId={table.id}
        sessionId={table.sessionId}
      />
    </div>
  );
}
