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
      title="Xóa món ăn"
      description={`Bạn có chắc chắn muốn xóa "${currentItem?.name ?? ''}"? Thao tác này không thể hoàn tác.`}
      confirmText="Xóa"
      cancelText="Hủy"
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
