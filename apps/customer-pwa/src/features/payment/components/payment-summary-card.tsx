import type { Order } from '@einvoice/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@einvoice/frontend-ui';
import { Separator } from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';

type PaymentSummaryCardProps = {
  orders: Order[];
};

export function PaymentSummaryCard({ orders }: PaymentSummaryCardProps) {
  const totalItems = orders.reduce(
    (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
    0,
  );
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tổng hóa đơn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Số đơn hàng</span>
          <span>{orders.length} đơn hàng</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Tổng món</span>
          <span>{totalItems} món</span>
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span>Tạm tính</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Tổng cộng</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
