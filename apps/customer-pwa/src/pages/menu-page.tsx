import { useState } from 'react';
import type { Category, MenuItem } from '@einvoice/types';
import { getMenuByCategory } from '@einvoice/mock-data';
import { useCart } from '@/features/cart/context/cart-provider';
import { CategoryTabs } from '@/features/menu/components/category-tabs';
import { MenuItemsGrid } from '@/features/menu/components/menu-items-grid';
import { MenuItemDetailDrawer } from '@/features/menu/components/menu-item-detail-drawer';
import { CartFloatingButton } from '@/features/menu/components/cart-floating-button';
import { CartDrawer } from '@/features/menu/components/cart-drawer';

const menuData = getMenuByCategory();

export function MenuPage() {
  const { addItem, totalItems } = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const categories: Category[] = menuData.map(
    ({ id, name, sortOrder, timeStart, timeEnd, status, itemCount, createdAt }) => ({
      id,
      name,
      sortOrder,
      timeStart,
      timeEnd,
      status,
      itemCount,
      createdAt,
    }),
  );
  const filteredItems = activeCategoryId
    ? menuData.find((c) => c.id === activeCategoryId)?.items ?? []
    : menuData.flatMap((c) => c.items);

  const handleItemTap = (item: MenuItem): void => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleQuickAdd = (item: MenuItem): void => {
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
