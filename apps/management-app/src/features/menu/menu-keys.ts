export const menuKeys = {
  all: ['menu'] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
  category: (id: string) => [...menuKeys.categories(), id] as const,
  itemsRoot: () => [...menuKeys.all, 'items'] as const,
  items: (categoryId?: string) => [...menuKeys.itemsRoot(), { categoryId }] as const,
  item: (id: string) => [...menuKeys.all, 'item', id] as const,
};
