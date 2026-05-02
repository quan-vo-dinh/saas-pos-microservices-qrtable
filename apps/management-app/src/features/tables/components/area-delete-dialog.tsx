'use client';

import { ConfirmDialog } from '@einvoice/frontend-ui';
import { useTables } from './tables-provider';
import { useDeleteAreaMutation } from '../hooks/use-tables-mutations';

export function AreaDeleteDialog() {
  const { open, setOpen, currentArea } = useTables();
  const deleteMutation = useDeleteAreaMutation();

  return (
    <ConfirmDialog
      open={open === 'delete-area'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Xóa khu vực"
      description={`Chỉ có thể xóa khu vực chưa có bàn. Bạn có chắc chắn muốn xóa "${currentArea?.name ?? ''}"?`}
      confirmText="Xóa"
      cancelText="Hủy"
      variant="destructive"
      onConfirm={() => {
        if (!currentArea) return;
        deleteMutation.mutate(currentArea.id, {
          onSuccess: () => setOpen(null),
        });
      }}
    />
  );
}
