import type { Order, OrderStatus } from '@einvoice/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  Badge,
} from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';
import { OrderItemsList } from './order-items-list';
import { OrderStatusTimeline } from './order-status-timeline';

type OrderSummaryCardProps = {
  order: Order;
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const STATUS_BADGE: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Chờ xác nhận', variant: 'outline' },
  confirmed: { label: 'Đã xác nhận', variant: 'secondary' },
  preparing: { label: 'Đang chế biến', variant: 'default' },
  ready: { label: 'Sẵn sàng', variant: 'default' },
  served: { label: 'Đã phục vụ', variant: 'secondary' },
  cancelled: { label: 'Đã hủy', variant: 'destructive' },
};

export function OrderSummaryCard({
  order,
}: OrderSummaryCardProps): React.ReactElement {
  const badge = STATUS_BADGE[order.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Đơn #{order.id.slice(-3)}</CardTitle>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <OrderItemsList items={order.items} />
        <OrderStatusTimeline
          status={order.status}
          createdAt={order.createdAt}
          updatedAt={order.updatedAt}
        />
      </CardContent>

      <CardFooter className="justify-between">
        <span className="text-sm text-muted-foreground">Tổng cộng</span>
        <span className="text-base font-bold">
          {formatCurrency(order.totalAmount)}
        </span>
      </CardFooter>
    </Card>
  );
}
