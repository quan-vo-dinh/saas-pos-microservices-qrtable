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
      title="Delete Table"
      description={`Are you sure you want to delete table "${currentTable?.name ?? ''}"? The associated QR code will also be invalidated.`}
      confirmText="Delete"
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
