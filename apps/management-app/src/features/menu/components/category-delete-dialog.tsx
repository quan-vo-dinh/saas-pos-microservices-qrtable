'use client';

import { ConfirmDialog } from '@einvoice/frontend-ui';
import { useMenu } from './menu-provider';

export function CategoryDeleteDialog() {
  const { open, setOpen, currentCategory } = useMenu();

  return (
    <ConfirmDialog
      open={open === 'delete-category'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Delete Category"
      description={`Are you sure you want to delete "${currentCategory?.name ?? ''}"? This action cannot be undone. All menu items in this category will need to be reassigned.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={() => {
        console.log('Delete category:', currentCategory?.id);
        setOpen(null);
      }}
    />
  );
}
