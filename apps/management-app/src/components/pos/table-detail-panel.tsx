'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@einvoice/frontend-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TransferTableDialog } from '@/components/pos/transfer-table-dialog';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { orderStatusVi, tableStatusVi } from '@einvoice/shared-constants';
import { OrderStatus } from '@einvoice/types';

function statusVariant(s: string) {
  if (s === 'available') return 'default';
  if (s === 'occupied') return 'secondary';
  if (s === 'billing') return 'destructive';
  return 'outline';
}

export function TableDetailPanel({ tableId }: { tableId: string }) {
  const tables = useMockStore((s) => s.tables);
  const liveOrders = useMockStore((s) => s.liveOrders);
  const mockPresence = useMockStore((s) => s.mockPresence);
  const setTableStatus = useMockStore((s) => s.setTableStatus);
  const markTableClean = useMockStore((s) => s.markTableClean);
  const [transferOpen, setTransferOpen] = useState(false);

  const table = useMemo(() => tables.find((t) => t.id === tableId), [tables, tableId]);
  const orders = useMemo(
    () => liveOrders.filter((o) => o.tableId === tableId && o.status !== OrderStatus.CANCELED),
    [liveOrders, tableId],
  );
  const pres = mockPresence.find((p) => p.tableId === tableId);
  const total = orders.reduce((s, o) => s + o.totalAmount, 0);

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
        <p className="text-xs text-muted-foreground">Sức chứa {table.capacity} · Phiên {table.sessionId ?? '—'}</p>
        {pres && pres.guests.length ? (
          <div className="flex items-center gap-1">
            <Users className="size-3.5 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              {pres.guests.slice(0, 4).map((g) => (
                <Avatar key={g.name} className="size-6 border border-border">
                  <AvatarFallback className="text-[0.6rem]">{g.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <Separator />
      <p className="text-[0.65rem] font-medium text-muted-foreground">Timeline (5 sự kiện gần nhất — mock)</p>
      <ul className="flex flex-col gap-1 text-[0.7rem] text-foreground/90">
        {['Phiên mở', 'Khách vào', 'Gọi món', 'Bếp xác nhận', 'Cập nhật bill'].map((e, i) => (
          <li key={e} className="border-s-2 border-border ps-1.5">
            {e} · bước {i + 1}
          </li>
        ))}
      </ul>
      <Separator />
      <p className="text-[0.65rem] font-medium text-muted-foreground">Đơn tại bàn</p>
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
      <p className="text-sm font-mono">Tổng chạy: {formatVnd(total)}</p>
      <div className="mt-auto flex flex-col gap-1.5">
        <Button type="button" className="w-full" onClick={() => setTransferOpen(true)} disabled={table.status === 'available'}>
          Chuyển bàn
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            if (table.status === 'available') return;
            setTableStatus(table.id, 'cleaning');
            toast('Đã đóng phiên (mock) — bàn dọn');
          }}
          disabled={table.status === 'available'}
        >
          Đóng phiên
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            if (table.status !== 'cleaning') {
              toast.error('Chỉ khi bàn ở trạng thái dọn');
              return;
            }
            markTableClean(table.id);
            toast('Đã sẵn sàng (mock)');
          }}
        >
          Đánh dấu sạch
        </Button>
      </div>
      <TransferTableDialog open={transferOpen} onOpenChange={setTransferOpen} fromTableId={table.id} />
    </div>
  );
}
