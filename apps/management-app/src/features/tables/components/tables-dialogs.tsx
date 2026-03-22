'use client';

import { AreaMutateDialog } from './area-mutate-dialog';
import { AreaDeleteDialog } from './area-delete-dialog';
import { TableMutateDialog } from './table-mutate-dialog';
import { TableDeleteDialog } from './table-delete-dialog';
import { QrCodeDialog } from './qr-code-dialog';

export function TablesDialogs() {
  return (
    <>
      <AreaMutateDialog />
      <AreaDeleteDialog />
      <TableMutateDialog />
      <TableDeleteDialog />
      <QrCodeDialog />
    </>
  );
}
