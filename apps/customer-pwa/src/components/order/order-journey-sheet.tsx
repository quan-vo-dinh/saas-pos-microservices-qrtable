import { OrderItemStatus, OrderStatus, type Order } from '@einvoice/types';
import {
  Badge,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Separator,
} from '@einvoice/frontend-ui';
import { Avatar, AvatarFallback } from '@einvoice/frontend-ui';

type OrderJourneySheetProps = {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function itemStatusLabel(s: (typeof OrderItemStatus)[keyof typeof OrderItemStatus]): string {
  switch (s) {
    case OrderItemStatus.PROCESSING:
      return 'Đang làm';
    case OrderItemStatus.READY:
      return 'Sẵn sàng';
    case OrderItemStatus.SERVED:
      return 'Đã phục vụ';
    case OrderItemStatus.CANCELED:
      return 'Đã hủy';
    default:
      return s;
  }
}

export function OrderJourneySheet({ order, open, onOpenChange }: OrderJourneySheetProps): React.ReactElement {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Hành trình đơn hàng</DrawerTitle>
          <DrawerDescription>Theo dõi xác nhận, bếp và từng món (mock).</DrawerDescription>
        </DrawerHeader>
        {order && (
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-8">
            <ol className="flex flex-col gap-4 border-l border-border pl-4">
              <li className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" aria-hidden />
                <p className="text-sm font-medium">Đã gửi đơn</p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                <p className="text-xs text-muted-foreground">Khách · QRTable PWA</p>
              </li>
              {(order.status !== OrderStatus.PENDING || order.confirmedAt) && (
                <li className="relative">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" aria-hidden />
                  <p className="text-sm font-medium">Nhân viên xác nhận</p>
                  <p className="text-xs text-muted-foreground">
                    {order.confirmedAt
                      ? new Date(order.confirmedAt).toLocaleString('vi-VN')
                      : 'Đang chờ quầy (mock)'}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback>PV</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">Phục vụ · {order.confirmedByUserId ?? 'waiter-mock'}</span>
                  </div>
                </li>
              )}
              <li className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium">Bếp / quầy bar</p>
                <p className="text-xs text-muted-foreground">
                  {order.status === OrderStatus.PROCESSING || order.status === OrderStatus.READY || order.status === OrderStatus.SERVED
                    ? 'Đang xử lý theo SLA (mock)'
                    : 'Chờ xác nhận để vào bếp'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>ĐB</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">Đầu bếp mock</span>
                </div>
              </li>
              <li className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-muted-foreground/50" aria-hidden />
                <p className="text-sm font-medium">Mang ra bàn</p>
                <p className="text-xs text-muted-foreground">
                  {order.status === OrderStatus.READY || order.status === OrderStatus.SERVED
                    ? new Date(order.updatedAt).toLocaleString('vi-VN')
                    : '—'}
                </p>
              </li>
            </ol>
            <Separator />
            <div>
              <p className="text-sm font-semibold">Theo dõi từng món</p>
              <ul className="mt-3 flex flex-col gap-2">
                {order.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.menuItemName}</p>
                      {it.note ? <p className="text-xs italic text-muted-foreground">{it.note}</p> : null}
                    </div>
                    <Badge variant="outline">{itemStatusLabel(it.status)}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
