import { useQuery } from '@tanstack/react-query';
import { menuService } from '../services/menu.service';

export const customerMenuKeys = {
  all: ['customer-menu'] as const,
  categories: () => [...customerMenuKeys.all, 'categories'] as const,
  items: (categoryId?: string) => [...customerMenuKeys.all, 'items', { categoryId }] as const,
};

export function useCategoriesQuery() {
  return useQuery({
    queryKey: customerMenuKeys.categories(),
    queryFn: menuService.getCategories,
  });
}

export function useMenuItemsQuery(categoryId?: string) {
  return useQuery({
    queryKey: customerMenuKeys.items(categoryId),
    queryFn: () => menuService.getItems(categoryId),
  });
}
