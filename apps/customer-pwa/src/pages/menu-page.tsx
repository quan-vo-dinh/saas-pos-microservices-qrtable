import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { PublicMenuItem } from '@einvoice/types';
import { BillStatus } from '@einvoice/types';
import { Button } from '@einvoice/frontend-ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MenuItemCard } from '@/components/menu/menu-item-card';
import { MenuItemDialog } from '@/components/menu/menu-item-dialog';
import { CartPill } from '@/components/menu/cart-pill';
import { CartDrawer } from '@/pages/cart/cart-drawer';
import { useSession } from '@/features/session/context/session-provider';
import { useCurrentBillQuery } from '@/features/order/hooks/use-bill-query';
import { useCartMutations, useCustomerCartQuery } from '@/features/order/hooks/use-cart-query';
import { extractCategories, extractItems, useFullMenuQuery } from '@/features/menu/hooks/use-menu-query';
import { ROUTES } from '@/constants/routes';
import { useTenantStatus } from '@/features/tenant/use-tenant-status';

export function MenuPage(): React.ReactElement {
  const { session, hydrated } = useSession();
  const { canOrder } = useTenantStatus();
  const tenantOrderLocked = !canOrder;
  const {
    data: menu = [],
    isPending: menuPending,
    isError: menuError,
    refetch: refetchMenu,
  } = useFullMenuQuery(session?.tenantId);
  const { data: cart } = useCustomerCartQuery();
  const { data: currentBill } = useCurrentBillQuery();
  const { addItem, isUpdating } = useCartMutations();
  const billLockActive = cart?.status === 'LOCKED' || currentBill?.bill?.status === BillStatus.PENDING_PAYMENT;

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = useMemo(() => extractCategories(menu), [menu]);

  const filtered = useMemo(() => extractItems(menu, activeCategoryId), [menu, activeCategoryId]);

  const handleOpenDetail = (item: PublicMenuItem): void => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleQuickAdd = (item: PublicMenuItem): void => {
    if (billLockActive || tenantOrderLocked || isUpdating || item.status !== 'available') return;
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
          <AlertDescription>Không thể đặt thêm món trong lúc chờ thanh toán.</AlertDescription>
        </Alert>
      )}

      {menuPending && <div className="py-16 text-center text-sm text-muted-foreground">Đang tải menu…</div>}

      {menuError && (
        <Alert variant="destructive">
          <AlertTitle>Không tải được thực đơn</AlertTitle>
          <AlertDescription>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetchMenu()}>
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!menuPending && !menuError && (
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
      )}

      {!menuPending && !menuError && (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onOpenDetail={handleOpenDetail}
              onQuickAdd={handleQuickAdd}
              disabled={billLockActive || tenantOrderLocked || isUpdating}
            />
          ))}
        </div>
      )}

      <MenuItemDialog item={selectedItem} open={detailOpen} onOpenChange={setDetailOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <CartPill drawerOpen={cartOpen} onOpenDrawer={() => setCartOpen(true)} />
    </div>
  );
}
