import { useState } from 'react';
import type { PublicMenuItem } from '@einvoice/types';
import { formatCurrency } from '@einvoice/frontend-utils';
import {
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Textarea,
} from '@einvoice/frontend-ui';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/features/cart/context/cart-provider';

type MenuItemDetailDrawerProps = {
  item: PublicMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MenuItemDetailDrawer({
  item,
  open,
  onOpenChange,
}: MenuItemDetailDrawerProps): React.JSX.Element {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setQuantity(1);
      setNote('');
    }
    onOpenChange(nextOpen);
  };

  const handleAdd = (): void => {
    if (!item) return;
    addItem(item, quantity, note);
    handleOpenChange(false);
  };

  if (!item) {
    return (
      <Drawer open={false} onOpenChange={handleOpenChange}>
        <DrawerContent />
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="p-0">
            {/* 16:9 image area */}
            <div className="relative aspect-video w-full overflow-hidden">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                  <span className="text-4xl font-semibold text-muted-foreground">
                    {item.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 p-4">
              <DrawerTitle className="text-lg font-semibold">
                {item.name}
              </DrawerTitle>
              {item.description && (
                <DrawerDescription>{item.description}</DrawerDescription>
              )}
              <p className="text-xl font-bold">{formatCurrency(item.price)}</p>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-2">
            {/* Quantity picker */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-10 text-center text-lg font-semibold">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                disabled={quantity >= 99}
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Note */}
            <Textarea
              placeholder="Ghi chú cho món này..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleAdd}>
            Thêm vào giỏ — {formatCurrency(item.price * quantity)}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
