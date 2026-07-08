import { useQuery } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { menuKeys } from '../menu-keys';
import { menuService } from '../services/menu.service';

export function useCategoriesQuery() {
  const authReady = useAuthReadyForBff();
  return useQuery({
    queryKey: menuKeys.categories(),
    queryFn: menuService.getCategories,
    enabled: authReady,
  });
}

export function useMenuItemsQuery(categoryId?: string) {
  const authReady = useAuthReadyForBff();
  return useQuery({
    queryKey: menuKeys.items(categoryId),
    queryFn: () => menuService.getMenuItems(categoryId),
    enabled: authReady,
  });
}

export function useMenuItemQuery(id: string | undefined, options?: { enabled?: boolean }) {
  const authReady = useAuthReadyForBff();
  const enabled = authReady && !!id && (options?.enabled ?? true);
  return useQuery({
    queryKey: menuKeys.item(id ?? ''),
    queryFn: () => {
      if (!id) {
        throw new Error('useMenuItemQuery: id is required when query runs');
      }
      return menuService.getMenuItem(id);
    },
    enabled,
    /** Opening the edit drawer must not reuse a stale detail row (e.g. previous image URL). */
    refetchOnMount: 'always',
  });
}
