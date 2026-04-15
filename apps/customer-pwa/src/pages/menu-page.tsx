import { useState } from 'react';
import type { PublicMenuItem } from '@einvoice/types';
import { useCart } from '@/features/cart/context/cart-provider';
import { useFullMenuQuery, extractCategories, extractItems } from '@/features/menu/hooks/use-menu-query';
import { CategoryTabs } from '@/features/menu/components/category-tabs';
import { MenuItemsGrid } from '@/features/menu/components/menu-items-grid';
import { MenuItemDetailDrawer } from '@/features/menu/components/menu-item-detail-drawer';
import { CartFloatingButton } from '@/features/menu/components/cart-floating-button';
import { CartDrawer } from '@/features/menu/components/cart-drawer';

export function MenuPage() {
  const { addItem, totalItems } = useCart();
  const { data: menu, isPending, isError } = useFullMenuQuery();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Đang tải menu...</p>
      </div>
    );
  }

  if (isError || !menu) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-destructive">Không thể tải menu. Vui lòng thử lại.</p>
      </div>
    );
  }

  if (menu.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-muted-foreground">Menu hiện đang trống.</p>
      </div>
    );
  }

  const categories = extractCategories(menu);
  const filteredItems = extractItems(menu, activeCategoryId);

  const handleItemTap = (item: PublicMenuItem): void => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleQuickAdd = (item: PublicMenuItem): void => {
    if (item.status !== 'out_of_stock') {
      addItem(item);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CategoryTabs
        categories={categories}
        activeId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />
      <MenuItemsGrid
        items={filteredItems}
        onItemTap={handleItemTap}
        onQuickAdd={handleQuickAdd}
      />
      <MenuItemDetailDrawer
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      {totalItems > 0 && (
        <CartFloatingButton onClick={() => setCartOpen(true)} />
      )}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
