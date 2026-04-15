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
      title="Delete Area"
      description={`Are you sure you want to delete "${currentArea?.name ?? ''}"? All tables in this area will also be removed.`}
      confirmText="Delete"
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
