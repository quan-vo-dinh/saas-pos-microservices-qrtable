import type { OrderItem } from '@einvoice/types';
import { formatCurrency } from '@einvoice/frontend-utils';
import { Separator } from '@einvoice/frontend-ui';

type OrderItemsListProps = {
  items: OrderItem[];
};

export function OrderItemsList({
  items,
}: OrderItemsListProps): React.ReactElement {
  return (
    <div className="flex flex-col">
      {items.map((item, index) => (
        <div key={item.id}>
          {index > 0 && <Separator />}
          <div className="flex items-start justify-between py-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{item.menuItemName}</span>
              {item.note && (
                <span className="text-xs italic text-muted-foreground">
                  {item.note}
                </span>
              )}
            </div>
            <div className="shrink-0 text-right text-sm">
              <span className="text-muted-foreground">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </span>
              <div className="font-medium">
                {formatCurrency(item.quantity * item.unitPrice)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
