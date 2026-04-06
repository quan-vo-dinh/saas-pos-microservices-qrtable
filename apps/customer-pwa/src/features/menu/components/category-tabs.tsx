import type { Category } from '@einvoice/types';
import { Button } from '@einvoice/frontend-ui';

type CategoryTabsProps = {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
};

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: CategoryTabsProps): React.JSX.Element {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Button
        variant={activeId === null ? 'default' : 'ghost'}
        size="sm"
        className="shrink-0 whitespace-nowrap rounded-full"
        onClick={() => onSelect(null)}
      >
        Tất cả
      </Button>

      {categories.map((category) => (
        <Button
          key={category.id}
          variant={activeId === category.id ? 'default' : 'ghost'}
          size="sm"
          className="shrink-0 whitespace-nowrap rounded-full"
          onClick={() => onSelect(category.id)}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}
