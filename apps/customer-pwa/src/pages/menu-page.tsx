import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { MenuItem } from '@einvoice/types';
import { Button } from '@einvoice/frontend-ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MenuItemCard } from '@/components/menu/menu-item-card';
import { MenuItemDialog } from '@/components/menu/menu-item-dialog';
import { CartPill } from '@/components/menu/cart-pill';
import { CartDrawer } from '@/pages/cart/cart-drawer';
import { useSession } from '@/features/session/context/session-provider';
import { useCartMutations } from '@/features/order/hooks/use-order-query';
import { usePwaMockStore } from '@/mocks/store';
import { ROUTES } from '@/constants/routes';

type Tab = { id: string; name: string; sortOrder: number };

export function MenuPage(): React.ReactElement {
  const { session, hydrated } = useSession();
  const menu = usePwaMockStore((s) => s.menu);
  const billLockActive = usePwaMockStore((s) => s.billLockActive);
  const { addItem, isUpdating } = useCartMutations();

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const categories: Tab[] = useMemo(() => {
    const map = new Map<string, Tab>();
    for (const m of menu) {
      if (!map.has(m.categoryId)) {
        map.set(m.categoryId, { id: m.categoryId, name: m.categoryName, sortOrder: m.sortOrder });
      }
    }
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [menu]);

  const filtered = useMemo(() => {
    if (!activeCategoryId) return menu;
    return menu.filter((m) => m.categoryId === activeCategoryId);
  }, [menu, activeCategoryId]);

  const handleOpenDetail = (item: MenuItem): void => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleQuickAdd = (item: MenuItem): void => {
    if (billLockActive || isUpdating || item.status !== 'available' || (item.stock ?? 0) <= 0) return;
    addItem(item, 1);
  };

  if (!hydrated) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Đang tải phiên…</div>;
  }

  if (!session?.sessionId) {
    return <Navigate to={ROUTES.LANDING} replace />;
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      {billLockActive && (
        <Alert variant="default" className="border-amber-500/60 bg-amber-500/10">
          <AlertTitle>Bàn đang thanh toán</AlertTitle>
          <AlertDescription>Không thể đặt thêm món trong lúc chờ thanh toán (mock).</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Button
          type="button"
          size="sm"
          variant={activeCategoryId === null ? 'default' : 'outline'}
          className="shrink-0 rounded-full"
          onClick={() => setActiveCategoryId(null)}
        >
          Tất cả
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            type="button"
            size="sm"
            variant={activeCategoryId === c.id ? 'default' : 'outline'}
            className="shrink-0 rounded-full"
            onClick={() => setActiveCategoryId(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onOpenDetail={handleOpenDetail}
            onQuickAdd={handleQuickAdd}
            disabled={billLockActive || isUpdating}
          />
        ))}
      </div>

      <MenuItemDialog item={selectedItem} open={detailOpen} onOpenChange={setDetailOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <CartPill drawerOpen={cartOpen} onOpenDrawer={() => setCartOpen(true)} />
    </div>
  );
}
