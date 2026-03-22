'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { useTables } from './tables-provider';

export function TableDeleteDialog() {
  const { open, setOpen, currentTable } = useTables();

  return (
    <ConfirmDialog
      open={open === 'delete-table'}
      onOpenChange={(v) => !v && setOpen(null)}
      title="Delete Table"
      description={`Are you sure you want to delete table "${currentTable?.name ?? ''}"? The associated QR code will also be invalidated.`}
      confirmText="Delete"
      variant="destructive"
      onConfirm={() => {
        console.log('Delete table:', currentTable?.id);
        setOpen(null);
      }}
    />
  );
}
