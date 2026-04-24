'use client';

import { useMemo, useState } from 'react';
import { Bell, ChefHat, ConciergeBell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@einvoice/frontend-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Separator } from '@/components/ui/separator';
import { useMockStore } from '@/mocks/store';

function formatRelativeVi(ts: number) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return 'vừa xong';
  if (sec < 60) return `${sec}s trước`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  return `${h} giờ trước`;
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const notifications = useMockStore((s) => s.notifications);
  const unread = notifications.length;

  const { all, orders, services } = useMemo(() => {
    const order = notifications.filter((n) => n.kind === 'order');
    const service = notifications.filter((n) => n.kind === 'service');
    return { all: notifications, orders: order, services: service };
  }, [notifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative shrink-0"
          aria-label="Thông báo POS"
        >
          <Bell />
          {unread > 0 ? (
            <Badge
              variant="secondary"
              className="absolute -end-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full p-0 text-[0.6rem]"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-[min(480px,calc(100vw-2rem))] flex-col gap-2 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex flex-col gap-1 border-b border-border/60 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thông báo</p>
          <p className="text-[0.7rem] text-muted-foreground">Đồng bộ mock realtime · {unread} sự kiện gần nhất</p>
        </div>
        <Tabs defaultValue="all" className="flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2">
          <TabsList className="h-8 w-full shrink-0" variant="line">
            <TabsTrigger className="text-[0.7rem]" value="all">
              Tất cả
            </TabsTrigger>
            <TabsTrigger className="gap-1 text-[0.7rem]" value="order">
              <ChefHat className="size-3 opacity-70" aria-hidden />
              Đơn
            </TabsTrigger>
            <TabsTrigger className="gap-1 text-[0.7rem]" value="service">
              <ConciergeBell className="size-3 opacity-70" aria-hidden />
              DV
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-0 min-h-0 flex-1">
            <NotificationList items={all} />
          </TabsContent>
          <TabsContent value="order" className="mt-0 min-h-0 flex-1">
            <NotificationList items={orders} empty="Chưa có thông báo đơn." />
          </TabsContent>
          <TabsContent value="service" className="mt-0 min-h-0 flex-1">
            <NotificationList items={services} empty="Chưa có yêu cầu phục vụ." />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function NotificationList({
  items,
  empty = 'Trống.',
}: {
  items: { id: string; kind: string; createdAt: number; preview: string }[];
  empty?: string;
}) {
  if (!items.length) {
    return (
      <div className="px-2 py-6 text-center text-sm text-muted-foreground" data-slot="notifications-empty">
        {empty}
      </div>
    );
  }
  return (
    <ScrollArea className="h-64">
      <ul className="flex flex-col gap-0.5 pe-2" data-slot="notifications-list">
        {items.map((n, i) => (
          <li key={n.id}>
            {i > 0 ? <Separator className="my-1 opacity-50" /> : null}
            <HoverCard openDelay={80}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted/60"
                >
                  <span className="line-clamp-2 text-[0.8rem] leading-snug">{n.preview}</span>
                  <span className="font-mono text-[0.65rem] text-muted-foreground tabular-nums">
                    {formatRelativeVi(n.createdAt)}
                  </span>
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-72 text-xs" side="left">
                <p className="font-medium capitalize text-foreground">{n.kind}</p>
                <p className="mt-1 text-muted-foreground">{n.preview}</p>
                <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString('vi-VN')}
                </p>
              </HoverCardContent>
            </HoverCard>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
