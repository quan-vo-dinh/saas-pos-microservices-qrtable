import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@einvoice/frontend-utils';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Separator,
} from '@einvoice/frontend-ui';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/features/cart/context/cart-provider';
import { ROUTES } from '@/constants/routes';

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartDrawer({
  open,
  onOpenChange,
}: CartDrawerProps): React.JSX.Element {
  const { items, totalAmount, totalItems, updateQuantity, removeItem, clear } =
    useCart();
  const navigate = useNavigate();

  const handlePlaceOrder = (): void => {
    onOpenChange(false);
    clear();
    navigate(ROUTES.ORDER_TRACKING);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Giỏ hàng</DrawerTitle>
          <DrawerDescription>({totalItems} món)</DrawerDescription>
        </DrawerHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Giỏ hàng trống</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-4">
              <ul className="space-y-3">
                {items.map((cartItem) => (
                  <li
                    key={cartItem.menuItem.id}
                    className="flex items-center gap-3"
                  >
                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {cartItem.menuItem.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(cartItem.menuItem.price)}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(
                            cartItem.menuItem.id,
                            cartItem.quantity - 1,
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {cartItem.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          updateQuantity(
                            cartItem.menuItem.id,
                            cartItem.quantity + 1,
                          )
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Line total */}
                    <span className="w-20 text-right text-sm font-semibold">
                      {formatCurrency(
                        cartItem.menuItem.price * cartItem.quantity,
                      )}
                    </span>

                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeItem(cartItem.menuItem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <Separator className="my-2" />

            <DrawerFooter>
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium">Tổng cộng</span>
                <span className="text-lg font-bold">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <Button onClick={handlePlaceOrder}>Đặt món</Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
