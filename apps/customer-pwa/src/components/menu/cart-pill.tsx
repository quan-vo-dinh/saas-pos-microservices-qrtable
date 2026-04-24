import { ChevronUp } from 'lucide-react';
import { formatCurrency } from '@einvoice/frontend-utils';
import { Button } from '@einvoice/frontend-ui';
import { usePwaMockStore } from '@/mocks/store';

type CartPillProps = {
  drawerOpen: boolean;
  onOpenDrawer: () => void;
};

export function CartPill({ drawerOpen, onOpenDrawer }: CartPillProps): React.ReactElement | null {
  const cart = usePwaMockStore((s) => s.cart);
  const totalItems = cart.items.reduce((sum, l) => sum + l.quantity, 0);
  const totalAmount = cart.items.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  if (drawerOpen || totalItems === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <Button
        type="button"
        onClick={onOpenDrawer}
        className="pointer-events-auto h-14 max-w-md gap-3 rounded-full px-6 shadow-lg"
        aria-label="Mở giỏ hàng"
      >
        <span className="text-sm font-semibold tabular-nums">
          {totalItems} món · {formatCurrency(totalAmount)}
        </span>
        <ChevronUp className="size-5 shrink-0" aria-hidden />
      </Button>
    </div>
  );
}
