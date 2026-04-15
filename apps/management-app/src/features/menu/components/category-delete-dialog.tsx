'use client';

import { ConfirmDialog } from '@einvoice/frontend-ui';
import { useMenu } from './menu-provider';
import { useDeleteCategoryMutation } from '../hooks/use-menu-mutations';

export function CategoryDeleteDialog() {
  const { open, setOpen, currentCategory } = useMenu();
  const deleteMutation = useDeleteCategoryMutation();

  return (
    <ConfirmDialog
      open={open === 'delete-category'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Delete Category"
      description={`Are you sure you want to delete "${currentCategory?.name ?? ''}"? This action cannot be undone. All menu items in this category will need to be reassigned.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={() => {
        if (!currentCategory) return;
        deleteMutation.mutate(currentCategory.id, {
          onSuccess: () => setOpen(null),
        });
      }}
    />
  );
}
