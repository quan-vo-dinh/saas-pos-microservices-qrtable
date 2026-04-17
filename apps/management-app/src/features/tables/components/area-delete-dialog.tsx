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
      description={`Bạn có chắc chắn muốn xóa "${currentArea?.name ?? ''}"? Tất cả các bàn trong khu vực này cũng sẽ bị xóa.`}
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
