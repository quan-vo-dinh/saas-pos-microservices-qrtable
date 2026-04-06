'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { QrCode, Users } from 'lucide-react';
import { Button } from '@einvoice/frontend-ui';
import { DataTableColumnHeader } from '@/components/data-table';
import type { RestaurantTable } from '../data/schema';
import { TableStatusBadge } from './table-status-badge';
import { TableRowActions } from './data-table-row-actions';

export const tablesColumns: ColumnDef<RestaurantTable>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Table" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'areaName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Area" />
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'capacity',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Capacity" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Users className="size-3.5" />
        {row.getValue('capacity')}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <TableStatusBadge status={row.getValue('status')} />,
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    id: 'qr',
    header: 'QR',
    cell: () => {
      // This is handled via row actions context
      return (
        <Button variant="ghost" size="sm" className="size-8 p-0" disabled>
          <QrCode className="size-4" />
        </Button>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <TableRowActions row={row} />,
  },
];
