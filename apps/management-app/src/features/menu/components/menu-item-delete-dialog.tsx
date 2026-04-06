'use client';

import { ConfirmDialog } from '@einvoice/frontend-ui';
import { useMenu } from './menu-provider';

export function MenuItemDeleteDialog() {
  const { open, setOpen, currentItem } = useMenu();

  return (
    <ConfirmDialog
      open={open === 'delete-item'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Delete Menu Item"
      description={`Are you sure you want to delete "${currentItem?.name ?? ''}"? This action cannot be undone.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={() => {
        console.log('Delete item:', currentItem?.id);
        setOpen(null);
      }}
    />
  );
}
