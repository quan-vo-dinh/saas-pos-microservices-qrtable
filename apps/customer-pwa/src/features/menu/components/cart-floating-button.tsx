import { Badge, Button } from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/features/cart/context/cart-provider';

type CartFloatingButtonProps = {
  onClick: () => void;
};

export function CartFloatingButton({
  onClick,
}: CartFloatingButtonProps): React.JSX.Element {
  const { totalItems, totalAmount } = useCart();

  return (
    <Button
      size="lg"
      className="fixed bottom-6 right-4 z-30 flex items-center gap-2 rounded-full shadow-lg"
      onClick={onClick}
    >
      <div className="relative">
        <ShoppingCart className="h-5 w-5" />
        <Badge
          variant="destructive"
          className="absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
        >
          {totalItems}
        </Badge>
      </div>
      <span className="ml-1">{formatCurrency(totalAmount)}</span>
    </Button>
  );
}
