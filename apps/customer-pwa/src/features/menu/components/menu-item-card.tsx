import type { MenuItem } from '@einvoice/types';
import { Badge, Button, Card, CardContent } from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';
import { Plus } from 'lucide-react';

type MenuItemCardProps = {
  item: MenuItem;
  onTap: () => void;
  onQuickAdd: () => void;
};

export function MenuItemCard({
  item,
  onTap,
  onQuickAdd,
}: MenuItemCardProps): React.JSX.Element {
  const isOutOfStock = item.status === 'out_of_stock';

  return (
    <Card
      className={`overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${
        isOutOfStock ? 'opacity-50' : ''
      }`}
      onClick={onTap}
    >
      {/* Image area — 1:1 aspect ratio */}
      <div className="relative aspect-square overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
            <span className="text-2xl font-semibold text-muted-foreground">
              {item.name.charAt(0)}
            </span>
          </div>
        )}

        {isOutOfStock && (
          <Badge
            variant="destructive"
            className="absolute top-2 left-2"
          >
            Hết hàng
          </Badge>
        )}
      </div>

      {/* Info area */}
      <CardContent className="p-3">
        <h3 className="line-clamp-1 text-sm font-medium">{item.name}</h3>

        <p className="line-clamp-2 text-xs text-muted-foreground mt-1">
          {item.description ?? '—'}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold">
            {formatCurrency(item.price)}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={isOutOfStock}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onQuickAdd();
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
