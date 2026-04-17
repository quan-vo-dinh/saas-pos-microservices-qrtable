'use client';

import { ConfirmDialog } from '@einvoice/frontend-ui';
import { useTables } from './tables-provider';
import { useDeleteTableMutation } from '../hooks/use-tables-mutations';

export function TableDeleteDialog() {
  const { open, setOpen, currentTable } = useTables();
  const deleteMutation = useDeleteTableMutation();

  return (
    <ConfirmDialog
      open={open === 'delete-table'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Xóa bàn"
      description={`Bạn có chắc chắn muốn xóa bàn "${currentTable?.name ?? ''}"? Mã QR liên kết cũng sẽ bị vô hiệu hóa.`}
      confirmText="Xóa"
      cancelText="Hủy"
      variant="destructive"
      onConfirm={() => {
        if (!currentTable) return;
        deleteMutation.mutate(currentTable.id, {
          onSuccess: () => setOpen(null),
        });
      }}
    />
  );
}
