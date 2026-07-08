'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { successMessage, getErrorDisplayMessage } from '@einvoice/frontend-utils';
import type { MenuItem } from '../data/schema';
import { menuService } from '../services/menu.service';
import { menuKeys } from '../menu-keys';

// ─── Category Mutations ─────────────────────────────

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; timeStart?: string; timeEnd?: string; status: string }) =>
      menuService.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success(successMessage('created', 'category'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; timeStart?: string; timeEnd?: string; status: string };
    }) => menuService.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success(successMessage('updated', 'category'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success(successMessage('deleted', 'category'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ id: string; sortOrder: number }>) => menuService.reorderCategories(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success(successMessage('reordered', 'category'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

// ─── Menu Item Mutations ────────────────────────────

type MenuItemInput = {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  stock: number;
  status: string;
};

export function useCreateMenuItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MenuItemInput) => menuService.createMenuItem(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success(successMessage('created', 'menuItem'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useUpdateMenuItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MenuItemInput }) => menuService.updateMenuItem(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success(successMessage('updated', 'menuItem'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useDeleteMenuItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuService.deleteMenuItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success(successMessage('deleted', 'menuItem'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useClearMenuItemImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuService.clearMenuItemImage(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<MenuItem>(menuKeys.item(id), (old) => (old ? { ...old, imageUrl: null } : old));
      queryClient.setQueriesData<MenuItem[]>({ queryKey: menuKeys.itemsRoot() }, (old) =>
        old?.map((item) => (item.id === id ? { ...item, imageUrl: null } : item)),
      );
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success(successMessage('imageRemoved'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}

export function useUploadMenuItemImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: string; file: File; onProgress?: (percent: number) => void }) =>
      menuService.uploadMenuItemImage(id, file, onProgress),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<MenuItem>(menuKeys.item(variables.id), (old) =>
        old ? { ...old, imageUrl: data.imageUrl } : old,
      );
      queryClient.setQueriesData<MenuItem[]>({ queryKey: menuKeys.itemsRoot() }, (old) =>
        old?.map((item) => (item.id === variables.id ? { ...item, imageUrl: data.imageUrl } : item)),
      );
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success(successMessage('imageUploaded'));
    },
    onError: (error: Error) => {
      toast.error(getErrorDisplayMessage(error));
    },
  });
}
