'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { orderItemStatusVi, orderStatusVi } from '@einvoice/shared-constants';
import { OrderItemStatus, OrderStatus } from '@einvoice/types';
import { UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@einvoice/frontend-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CancelOrderDialog } from '@/components/pos/cancel-order-dialog';
import {
  useConfirmOrderMutation,
  useMarkOrderServedMutation,
  useOrderDetailQuery,
} from '@/features/order/hooks/use-order-query';
import { getErrorDisplayMessage } from '@einvoice/frontend-utils';
import { formatVnd } from '@/lib/format-vnd';
import { orderItemStatusChipClass, orderStatusChipClass } from '@/lib/pos-status-chips';
import { cn } from '@/lib/utils';

export function OrderDetailPanel({ orderId }: { orderId: string }) {
  const orderDetailQuery = useOrderDetailQuery(orderId);
  const confirmOrderMutation = useConfirmOrderMutation();
  const markServedMutation = useMarkOrderServedMutation();
  const [cancelOpen, setCancelOpen] = useState(false);
  const order = orderDetailQuery.data;

  const events = useMemo(() => {
    if (!order) return [];
    const e: { at: string; text: string }[] = [
      { at: order.createdAt, text: 'Đơn đã được tạo' },
    ];
    if (order.confirmedAt) {
      e.push({
        at: order.confirmedAt,
        text: order.confirmedByUserId ? `Xác nhận bởi ${order.confirmedByUserId}` : 'Xác nhận bởi nhân viên',
      });
    }
    if (order.cancelReason && order.cancelledAt) {
      e.push({
        at: order.cancelledAt,
        text: `Huỷ đơn: ${order.cancelReason}`,
      });
    } else if (order.updatedAt !== order.createdAt) {
      e.push({
        at: order.updatedAt,
        text: `Cập nhật trạng thái ${orderStatusVi(order.status)}`,
      });
    }
    return e.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [order]);

  if (orderDetailQuery.isLoading) {
    return (
      <p className="p-2 text-sm text-muted-foreground" data-slot="pos-order-loading">
        Đang tải chi tiết đơn...
      </p>
    );
  }

  if (orderDetailQuery.isError) {
    return (
      <p className="p-2 text-sm text-destructive" data-slot="pos-order-error">
        {getErrorDisplayMessage(orderDetailQuery.error as Error)}
      </p>
    );
  }

  if (!order) {
    return (
      <p className="p-2 text-sm text-destructive" data-slot="pos-order-missing">
        Không tìm thấy đơn.
      </p>
    );
  }

  const canConfirm = order.status === OrderStatus.PENDING;
  const canServe = order.status === OrderStatus.READY;
  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.PROCESSING;
  const isConfirming = confirmOrderMutation.isPending && confirmOrderMutation.variables === order.id;
  const isServing = markServedMutation.isPending && markServedMutation.variables === order.id;

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-col gap-2"
      data-slot="pos-order-detail"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[0.8rem] text-muted-foreground">#{order.id}</p>
            <p className="text-base font-medium">{order.tableName}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={order.status} layout>
              <Badge className={cn('h-6 border-0 px-2 text-xs font-normal', orderStatusChipClass(order.status))}>
                {orderStatusVi(order.status)}
              </Badge>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canConfirm ? (
            <Button
              type="button"
              size="sm"
              onClick={() => confirmOrderMutation.mutate(order.id)}
              disabled={isConfirming}
            >
              {isConfirming ? 'Đang xác nhận...' : 'Xác nhận'}
            </Button>
          ) : null}
          {canServe ? (
            <Button
              type="button"
              size="sm"
              onClick={() => markServedMutation.mutate(order.id)}
              disabled={isServing}
            >
              {isServing ? 'Đang lưu...' : 'Xác nhận đã phục vụ'}
            </Button>
          ) : null}
          {canCancel ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
              Huỷ
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">Tổng {formatVnd(order.totalAmount)}</p>
      </div>

      <Separator />

      <Tabs defaultValue="items" className="min-h-0 flex-1 flex flex-col gap-2">
        <TabsList className="h-9 w-full justify-start">
          <TabsTrigger className="text-sm" value="items">
            Món
          </TabsTrigger>
          <TabsTrigger className="text-sm" value="activity">
            Nhật ký
          </TabsTrigger>
          <TabsTrigger className="text-sm" value="customer">
            Khách
          </TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="min-h-0 flex-1 p-0">
          <ScrollArea className="h-[min(50vh,420px)] rounded-md border border-border/40 pr-1">
            <Table>
              <TableHeader>
                <TableRow className="h-9">
                  <TableHead className="w-8" />
                  <TableHead className="text-sm">Món</TableHead>
                  <TableHead className="w-20 text-end text-sm">SL</TableHead>
                  <TableHead className="w-28 text-sm">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((it) => (
                  <TableRow key={it.id} className="h-12">
                    <TableCell>
                      <Checkbox
                        checked={it.status === OrderItemStatus.SERVED}
                        disabled
                        aria-label={`Đánh dấu đã phục vụ ${it.menuItemName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 max-w-[min(100%,14rem)] items-start gap-2">
                        <Avatar className="size-10 shrink-0 rounded-md border border-border/50 after:rounded-md">
                          <AvatarImage
                            src={it.menuItemImageUrl ?? ''}
                            alt={it.menuItemName}
                            className="rounded-md object-cover"
                          />
                          <AvatarFallback className="rounded-md text-xs">
                            {it.menuItemName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{it.menuItemName}</span>
                          {it.note ? (
                            <em className="text-xs leading-snug text-muted-foreground">{it.note}</em>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-mono text-sm tabular-nums">{it.quantity}</TableCell>
                    <TableCell>
                      <Badge className={cn('px-2 font-mono text-xs', orderItemStatusChipClass(it.status))}>
                        {orderItemStatusVi(it.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {order.notes ? <p className="mt-1 text-sm text-muted-foreground">Ghi chú: {order.notes}</p> : null}
        </TabsContent>
        <TabsContent value="activity" className="min-h-0">
          <ul className="flex flex-col gap-2 pl-0 text-sm">
            {events.map((ev) => (
              <li
                key={`${ev.at}-${ev.text}`}
                className="flex gap-2 border-s-2 border-border ps-2"
              >
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {new Date(ev.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-foreground/90">{ev.text}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="customer" className="min-h-0">
          <div className="flex items-center gap-2 text-sm">
            <Avatar className="size-8">
              <AvatarImage src="" alt="" />
              <AvatarFallback>
                <UserRound className="size-4 opacity-60" />
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span>Phiên {order.sessionId}</span>
              <span className="text-muted-foreground">
                {order.confirmedByUserId ? `Nhân viên xác nhận: ${order.confirmedByUserId}` : 'Chưa có nhân viên xác nhận'}
              </span>
            </div>
            <div className="ms-auto text-end">
              <p className="text-[0.65rem] text-muted-foreground">Cập nhật gần nhất</p>
              <p className="font-medium">
                {new Date(order.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {cancelOpen ? (
        <CancelOrderDialog
          key={order.id}
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          orderId={order.id}
          orderStatus={order.status}
        />
      ) : null}
    </div>
  );
}
