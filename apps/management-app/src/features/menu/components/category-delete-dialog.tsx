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
      title="Xóa danh mục"
      description={`Bạn có chắc chắn muốn xóa "${currentCategory?.name ?? ''}"? Thao tác này không thể hoàn tác. Tất cả món ăn trong danh mục này cần được gán lại.`}
      confirmText="Xóa"
      cancelText="Hủy"
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
