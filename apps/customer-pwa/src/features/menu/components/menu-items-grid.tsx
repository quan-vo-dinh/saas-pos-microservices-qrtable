import type { PublicMenuItem } from '@einvoice/types';
import { MenuItemCard } from './menu-item-card';

type MenuItemsGridProps = {
  items: PublicMenuItem[];
  onItemTap: (item: PublicMenuItem) => void;
  onQuickAdd: (item: PublicMenuItem) => void;
};

export function MenuItemsGrid({
  items,
  onItemTap,
  onQuickAdd,
}: MenuItemsGridProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">
          Không có món ăn trong danh mục này
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          onTap={() => onItemTap(item)}
          onQuickAdd={() => onQuickAdd(item)}
        />
      ))}
    </div>
  );
}
