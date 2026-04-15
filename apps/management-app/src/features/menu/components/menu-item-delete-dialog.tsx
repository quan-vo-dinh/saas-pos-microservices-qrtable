'use client';

import { ConfirmDialog } from '@einvoice/frontend-ui';
import { useMenu } from './menu-provider';
import { useDeleteMenuItemMutation } from '../hooks/use-menu-mutations';

export function MenuItemDeleteDialog() {
  const { open, setOpen, currentItem } = useMenu();
  const deleteMutation = useDeleteMenuItemMutation();

  return (
    <ConfirmDialog
      open={open === 'delete-item'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Delete Menu Item"
      description={`Are you sure you want to delete "${currentItem?.name ?? ''}"? This action cannot be undone.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={() => {
        if (!currentItem) return;
        deleteMutation.mutate(currentItem.id, {
          onSuccess: () => setOpen(null),
        });
      }}
    />
  );
}
