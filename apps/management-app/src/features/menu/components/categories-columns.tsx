'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@einvoice/frontend-ui';
import { DataTableColumnHeader } from '@/components/data-table';
import type { Category } from '../data/schema';
import { CategoryRowActions } from './data-table-row-actions';

export const categoriesColumns: ColumnDef<Category>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'sortOrder',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('sortOrder')}</span>
    ),
  },
  {
    id: 'timeRange',
    header: 'Time Range',
    cell: ({ row }) => {
      const start = row.original.timeStart;
      const end = row.original.timeEnd;
      if (!start && !end) return <span className="text-muted-foreground">All day</span>;
      return (
        <span className="text-sm">
          {start ?? '--'} → {end ?? '--'}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'itemCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('itemCount')}</span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <CategoryRowActions row={row} />,
  },
];
