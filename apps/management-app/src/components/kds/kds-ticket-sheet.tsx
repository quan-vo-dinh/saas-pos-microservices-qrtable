'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { orderItemStatusVi, orderStatusVi } from '@einvoice/shared-constants';
import { OrderItemStatus, OrderStatus, type OrderItem } from '@einvoice/types';
import { Link2, ChefHat, Wine } from 'lucide-react';
import { toast } from 'sonner';
import { effectiveSlaSeconds, readKdsSlaCapMinutes } from '@/lib/kds-station-prefs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useMockStore } from '@/mocks/store';
import type { KDSTicketMock, KDSStation } from '@/mocks/kds-ticket';

const KdsSlaRadial = dynamic(
  () => import('@/components/kds/kds-sla-radial').then((m) => m.KdsSlaRadial),
  { ssr: false, loading: () => <div className="h-44 animate-pulse rounded-md bg-muted" aria-hidden /> },
);

type Props = {
  ticketId: string | null;
  station: KDSStation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live KDS passes snapshot-derived tickets so the sheet resolves without the mock store. */
  tickets?: KDSTicketMock[];
  /** Hides mock-only controls (order mutation, stock demo). */
  liveMode?: boolean;
};

export function KdsTicketSheet({ ticketId, station, open, onOpenChange, tickets: ticketsProp, liveMode }: Props) {
  const [now, setNow] = useState<number | null>(null);
  const mockTickets = useMockStore((s) => s.kdsTickets);
  const tickets = ticketsProp ?? mockTickets;
  const liveOrders = useMockStore((s) => s.liveOrders);
  const updateItem = useMockStore((s) => s.updateKdsTicketItemStatus);
  const updateOrderStatus = useMockStore((s) => s.updateOrderStatus);
  const recallTicket = useMockStore((s) => s.recallTicket);

  useEffect(() => {
    const boot = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, []);

  const ticket = ticketId ? tickets.find((t) => t.ticketId === ticketId) : undefined;
  const order = ticket && !liveMode ? liveOrders.find((o) => o.id === ticket.orderId) : undefined;

  const { ratio, pct, chartData } = useMemo(() => {
    if (!ticket) {
      return { ratio: 0, pct: 0, chartData: [{ name: 'sla', value: 0, fill: 'var(--primary)' }] };
    }
    const capMin = readKdsSlaCapMinutes(station);
    const created = new Date(ticket.createdAt).getTime();
    const t = now ?? created;
    const elapsed = (t - created) / 1000;
    const eff = effectiveSlaSeconds(ticket.slaSeconds, capMin);
    const r = elapsed / eff;
    const p = Math.min(100, Math.round(r * 100));
    const f = r < 0.6 ? 'var(--chart-2)' : r < 0.9 ? 'var(--chart-4)' : 'var(--destructive)';
    return { ratio: r, pct: p, chartData: [{ name: 'sla', value: p, fill: f }] };
  }, [now, station, ticket]);

  const timelineNow = now == null ? '—' : new Date(now).toLocaleTimeString('vi-VN');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l border-border bg-background p-0 text-foreground sm:max-w-[480px]"
        showCloseButton
      >
        {!ticket ? (
          <div className="p-6 text-sm text-muted-foreground">Không tìm thấy ticket.</div>
        ) : (
          <>
        <SheetHeader className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <SheetTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary">
                #{ticket.ticketId.slice(-3).toUpperCase()}
                <Badge variant="outline" className="border-border/60 font-mono text-[0.65rem] uppercase">
                  {station === 'KITCHEN' ? (
                    <span className="inline-flex items-center gap-1">
                      <ChefHat className="size-3" aria-hidden />
                      Kitchen
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Wine className="size-3" aria-hidden />
                      Bar
                    </span>
                  )}
                </Badge>
              </SheetTitle>
              <SheetDescription className="text-xs">{ticket.tableName}</SheetDescription>
            </div>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[0.7rem]"
                >
                  <Link2 className="size-4" aria-hidden />
                  Liên kết đơn
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 text-xs" side="left">
                <p className="font-mono text-[0.65rem] text-muted-foreground">orderId</p>
                <p className="break-all font-mono">{ticket.orderId}</p>
                {order ? (
                  <p className="mt-2 text-muted-foreground">
                    Trạng thái đơn: <span className="text-foreground">{orderStatusVi(order.status)}</span> ·{' '}
                    {order.items.length} dòng
                  </p>
                ) : liveMode ? (
                  <p className="mt-2 text-muted-foreground">Chi tiết đơn lấy từ ticket snapshot live.</p>
                ) : (
                  <p className="mt-2 text-muted-foreground">Không tìm thấy đơn mock.</p>
                )}
              </HoverCardContent>
            </HoverCard>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 py-3">
          <section className="flex flex-col gap-2">
            <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Món theo ticket</p>
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[0.65rem]">Món</TableHead>
                    <TableHead className="w-24 text-[0.65rem]">SL</TableHead>
                    <TableHead className="text-[0.65rem]">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticket.items.map((it) => (
                    <TableRow key={it.id} className="border-border">
                      <TableCell className="max-w-40 text-[0.75rem]">
                        <span className="font-medium">{it.menuItemName}</span>
                        {it.note ? (
                          <span className="mt-0.5 block font-mono text-[0.65rem] text-muted-foreground">{it.note}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{it.quantity}</TableCell>
                      <TableCell>
                        <Select
                          value={it.status}
                          disabled={Boolean(liveMode)}
                          onValueChange={(v) =>
                            updateItem(ticket.ticketId, it.id, v as OrderItem['status'])
                          }
                        >
                          <SelectTrigger size="sm" className="h-7 w-[128px] text-[0.65rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value={OrderItemStatus.PROCESSING}>
                                {orderItemStatusVi(OrderItemStatus.PROCESSING)}
                              </SelectItem>
                              <SelectItem value={OrderItemStatus.READY}>
                                {orderItemStatusVi(OrderItemStatus.READY)}
                              </SelectItem>
                              <SelectItem value={OrderItemStatus.SERVED}>
                                {orderItemStatusVi(OrderItemStatus.SERVED)}
                              </SelectItem>
                              <SelectItem value={OrderItemStatus.CANCELED}>
                                {orderItemStatusVi(OrderItemStatus.CANCELED)}
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">
              {liveMode ? 'Timeline' : 'Timeline (mock)'}
            </p>
            <ol className="flex flex-col gap-2 border-s border-border ps-3 text-[0.75rem]">
              <li>
                <span className="font-mono text-muted-foreground">{new Date(ticket.createdAt).toLocaleTimeString('vi-VN')}</span>{' '}
                Ticket tạo từ đơn ({orderStatusVi(OrderStatus.PROCESSING)})
              </li>
              <li>
                <span className="font-mono text-muted-foreground">{timelineNow}</span> SLA đạt {pct}%
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">SLA gauge</p>
            <KdsSlaRadial chartData={chartData} />
            <p className="text-center font-mono text-xs text-muted-foreground">
              {ratio < 0.6 ? 'Trong ngưỡng an toàn' : ratio < 0.9 ? 'Cảnh báo amber' : 'Vượt SLA — ưu tiên xử lý'}
            </p>
          </section>
        </div>

        <div className="mt-auto flex flex-col gap-2 border-t border-border px-4 py-3">
          {!liveMode ? (
            <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                updateOrderStatus(ticket.orderId, OrderStatus.READY, 'staff-chef-1');
                toast('Đã đánh dấu Ready (mock)');
              }}
            >
              Đánh dấu Ready
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                recallTicket(ticket.ticketId, 'Sheet recall', 'staff-chef-1', 'Chị Lan');
                toast('Recall (mock)');
              }}
            >
              Recall
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="secondary">
                  Báo hết hàng
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận hết hàng</AlertDialogTitle>
                  <AlertDialogDescription>
                    Mock: đánh dấu một món trong ticket là CANCELED để demo luồng báo bếp.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const first = ticket.items[0];
                      if (first) updateItem(ticket.ticketId, first.id, OrderItemStatus.CANCELED);
                      toast('Đã báo hết hàng (mock)');
                    }}
                  >
                    Xác nhận
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Separator />
          <p className="text-[0.65rem] text-muted-foreground">
            Mở sheet bằng tap vùng tiêu đề ticket · chân nút không mở sheet (blueprint bước 4.3).
          </p>
            </>
          ) : (
            <p className="text-[0.7rem] text-muted-foreground">
              Luồng live: dùng nút trên thẻ ticket (Bắt đầu / Xong / Recall). Sheet chỉ xem chi tiết.
            </p>
          )}
        </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
