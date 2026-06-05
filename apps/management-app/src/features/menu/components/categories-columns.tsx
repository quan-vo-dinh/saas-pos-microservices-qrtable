'use client';

import { categoryStatusVi } from '@einvoice/shared-constants';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@einvoice/frontend-ui';
import { DataTableColumnHeader } from '@/components/data-table';
import type { Category } from '../data/schema';
import { CategoryRowActions } from './data-table-row-actions';

export const categoriesColumns: ColumnDef<Category>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tên" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('name')}</span>
    ),
  },
  {
    accessorKey: 'sortOrder',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Thứ tự" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue('sortOrder')}</span>
    ),
  },
  {
    id: 'timeRange',
    header: 'Khung giờ',
    cell: ({ row }) => {
      const start = row.original.timeStart;
      const end = row.original.timeEnd;
      if (!start && !end) return <span className="text-muted-foreground">Cả ngày</span>;
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
      <DataTableColumnHeader column={column} title="Trạng thái" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>
          {categoryStatusVi(status)}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'itemCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Số món" />
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
