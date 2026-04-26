'use client';

import { useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { orderItemStatusVi, orderStatusVi } from '@einvoice/shared-constants';
import { OrderItemStatus, OrderStatus } from '@einvoice/types';
import { Check, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@einvoice/frontend-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CancelOrderDialog } from '@/components/pos/cancel-order-dialog';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { orderItemStatusChipClass, orderStatusChipClass } from '@/lib/pos-status-chips';
import { cn } from '@/lib/utils';

/** Mock ảnh món — map theo seed menu; fallback deterministic cho id lạ (vd. realtime mock). */
function mockOrderItemImageUrl(menuItemId: string): string {
  const byId: Record<string, string> = {
    'mi-pho':
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=128&h=128&q=80&auto=format&fit=crop',
    'mi-bun':
      'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=128&h=128&q=80&auto=format&fit=crop',
    'mi-com':
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=128&h=128&q=80&auto=format&fit=crop',
    'mi-tra':
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=128&h=128&q=80&auto=format&fit=crop',
    'mi-nuoc':
      'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=128&h=128&q=80&auto=format&fit=crop',
  };
  return (
    byId[menuItemId] ??
    `https://picsum.photos/seed/${encodeURIComponent(menuItemId)}/96/96`
  );
}

export function OrderDetailPanel({ orderId }: { orderId: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? 'staff-waiter-1';
  const order = useMockStore((s) => s.liveOrders.find((o) => o.id === orderId));
  const mockUsers = useMockStore((s) => s.mockUsers);
  const orderPriority = useMockStore((s) => s.orderPriority[orderId]);
  const confirmOrder = useMockStore((s) => s.confirmOrder);
  const updateItem = useMockStore((s) => s.updateOrderItemStatus);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const events = useMemo(() => {
    if (!order) return [];
    const e: { at: string; text: string }[] = [
      { at: order.createdAt, text: 'Đơn tạo (mock OrderCreatedEvent)' },
    ];
    if (order.confirmedAt) {
      e.push({
        at: order.confirmedAt,
        text: 'Xác nhận bởi nhân viên',
      });
    }
    e.push({
      at: order.updatedAt,
      text: `Cập nhật trạng thái ${orderStatusVi(order.status)} (OrderStatusChangedEvent mock)`,
    });
    return e.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [order]);

  if (!order) {
    return (
      <p className="p-2 text-sm text-destructive" data-slot="pos-order-missing">
        Không tìm thấy đơn.
      </p>
    );
  }

  const canConfirm = order.status === OrderStatus.PENDING;
  const waiter = mockUsers[0];

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col gap-2"
      data-slot="pos-order-detail"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs text-muted-foreground">#{order.id}</p>
            <p className="text-sm font-medium">{order.tableName}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={order.status} layout>
              <Badge className={cn('border-0 font-normal', orderStatusChipClass(order.status))}>
                {orderStatusVi(order.status)}
              </Badge>
            </motion.div>
          </AnimatePresence>
        </div>
        {orderPriority ? <Badge className="w-fit border-fuchsia-500/40 bg-fuchsia-500/15">Ưu tiên</Badge> : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {canConfirm ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                confirmOrder(order.id, userId);
                setJustConfirmed(true);
                window.setTimeout(() => setJustConfirmed(false), 1200);
              }}
            >
              {justConfirmed ? <Check className="size-4" data-icon="inline-start" /> : null}
              Xác nhận
            </Button>
          ) : null}
          {order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.COMPLETED ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
              Huỷ
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">Tổng {formatVnd(order.totalAmount)}</p>
      </div>

      <Separator />

      <Tabs defaultValue="items" className="min-h-0 flex-1 flex flex-col gap-2">
        <TabsList className="h-8 w-full justify-start">
          <TabsTrigger className="text-xs" value="items">
            Món
          </TabsTrigger>
          <TabsTrigger className="text-xs" value="activity">
            Nhật ký
          </TabsTrigger>
          <TabsTrigger className="text-xs" value="customer">
            Khách
          </TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-[min(50vh,420px)] rounded-md border border-border/40 pr-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Món</TableHead>
                  <TableHead className="w-20 text-end">SL</TableHead>
                  <TableHead className="w-24">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Checkbox
                        checked={it.status === OrderItemStatus.SERVED}
                        disabled={it.status === OrderItemStatus.CANCELED}
                        onCheckedChange={() => {
                          const next =
                            it.status === OrderItemStatus.SERVED
                              ? OrderItemStatus.READY
                              : OrderItemStatus.SERVED;
                          updateItem(order.id, it.id, next);
                        }}
                        aria-label={`Đánh dấu đã phục vụ ${it.menuItemName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 max-w-[min(100%,14rem)] items-start gap-2">
                        <Avatar className="size-10 shrink-0 rounded-md border border-border/50 after:rounded-md">
                          <AvatarImage
                            src={mockOrderItemImageUrl(it.menuItemId)}
                            alt={it.menuItemName}
                            className="rounded-md object-cover"
                          />
                          <AvatarFallback className="rounded-md text-[0.6rem]">
                            {it.menuItemName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-xs font-medium">{it.menuItemName}</span>
                          {it.note ? (
                            <em className="text-[0.7rem] leading-tight text-muted-foreground">{it.note}</em>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-mono text-xs tabular-nums">{it.quantity}</TableCell>
                    <TableCell>
                      <Badge className={cn('px-1 font-mono text-[0.65rem]', orderItemStatusChipClass(it.status))}>
                        {orderItemStatusVi(it.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {order.notes ? <p className="mt-1 text-xs text-muted-foreground">Ghi chú: {order.notes}</p> : null}
        </TabsContent>
        <TabsContent value="activity" className="min-h-0">
          <ul className="flex flex-col gap-2 pl-0 text-xs">
            {events.map((ev) => (
              <li
                key={`${ev.at}-${ev.text}`}
                className="flex gap-2 border-s-2 border-border ps-2"
              >
                <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                  {new Date(ev.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-foreground/90">{ev.text}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="customer" className="min-h-0">
          <div className="flex items-center gap-2 text-xs">
            <Avatar className="size-8">
              <AvatarImage src="" alt="" />
              <AvatarFallback>
                <UserRound className="size-4 opacity-60" />
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span>Phiên {order.sessionId}</span>
              <span className="text-muted-foreground">12 đơn từ trước đến giờ (mock loyalty)</span>
            </div>
            <div className="ms-auto text-end">
              <p className="text-[0.65rem] text-muted-foreground">Phục vụ (mock)</p>
              <p className="font-medium">{waiter.name}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CancelOrderDialog open={cancelOpen} onOpenChange={setCancelOpen} orderId={order.id} userId={userId} />
    </div>
  );
}
