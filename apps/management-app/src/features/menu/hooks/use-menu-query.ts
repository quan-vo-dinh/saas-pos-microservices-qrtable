import { useQuery } from '@tanstack/react-query';
import { menuService } from '../services/menu.service';

export const menuKeys = {
  all: ['menu'] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
  category: (id: string) => [...menuKeys.categories(), id] as const,
  items: (categoryId?: string) => [...menuKeys.all, 'items', { categoryId }] as const,
  item: (id: string) => [...menuKeys.all, 'item', id] as const,
};

export function useCategoriesQuery() {
  return useQuery({
    queryKey: menuKeys.categories(),
    queryFn: menuService.getCategories,
  });
}

export function useMenuItemsQuery(categoryId?: string) {
  return useQuery({
    queryKey: menuKeys.items(categoryId),
    queryFn: () => menuService.getMenuItems(categoryId),
  });
}
