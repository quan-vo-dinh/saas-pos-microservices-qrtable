import { useQuery } from '@tanstack/react-query';
import type { PublicMenuCategory, PublicMenuItem } from '@einvoice/types';
import { menuService } from '../services/menu.service';

/** Tab menu — chỉ field UI cần; không dùng full `Category` từ domain để tránh drift với public API */
export type CustomerCategoryTab = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

export const customerMenuKeys = {
  all: ['customer-menu'] as const,
  fullMenu: (tenantId: string) => [...customerMenuKeys.all, tenantId, 'full'] as const,
};

export function useFullMenuQuery(tenantId: string | undefined) {
  return useQuery({
    queryKey: customerMenuKeys.fullMenu(tenantId ?? ''),
    queryFn: async () => {
      const response = await menuService.getFullMenu();
      return response.categories;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function extractCategories(menu: PublicMenuCategory[]): CustomerCategoryTab[] {
  return menu.map((cat) => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sortOrder,
    itemCount: cat.items.length,
  }));
}

export function extractItems(menu: PublicMenuCategory[], categoryId?: string | null): PublicMenuItem[] {
  if (categoryId) {
    return menu.find((cat) => cat.id === categoryId)?.items ?? [];
  }
  return menu.flatMap((cat) => cat.items);
}
