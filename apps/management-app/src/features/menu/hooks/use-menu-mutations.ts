'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { menuService } from '../services/menu.service';
import { menuKeys } from './use-menu-query';

// ─── Category Mutations ─────────────────────────────

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; timeStart?: string; timeEnd?: string; status: string }) =>
      menuService.createCategory(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; timeStart?: string; timeEnd?: string; status: string } }) =>
      menuService.updateCategory(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuService.deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`);
    },
  });
}

export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) => menuService.reorderCategories(orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Categories reordered');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder categories: ${error.message}`);
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
      toast.success('Menu item created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create menu item: ${error.message}`);
    },
  });
}

export function useUpdateMenuItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MenuItemInput }) =>
      menuService.updateMenuItem(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success('Menu item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update menu item: ${error.message}`);
    },
  });
}

export function useDeleteMenuItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => menuService.deleteMenuItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success('Menu item deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete menu item: ${error.message}`);
    },
  });
}

export function useUploadMenuItemImageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: string; file: File; onProgress?: (percent: number) => void }) =>
      menuService.uploadMenuItemImage(id, file, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success('Image uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`);
    },
  });
}
