'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@einvoice/frontend-ui';
import { ImageIcon } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/data-table';
import type { MenuItem } from '../data/schema';
import { MenuItemRowActions } from './data-table-row-actions';

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

export const menuItemsColumns: ColumnDef<MenuItem>[] = [
  {
    id: 'image',
    header: '',
    cell: ({ row }) => {
      const imageUrl = row.original.imageUrl;
      return (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted overflow-hidden border border-border">
          {imageUrl ? (
            <img src={imageUrl} alt={row.original.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground/60" />
          )}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.getValue('name')}</span>
        {row.original.description && (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {row.original.description}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'categoryName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue('categoryName')}</Badge>
    ),
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{formatVND(row.getValue('price'))}</span>
    ),
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const stock = row.getValue('stock') as number;
      return (
        <span className={stock === 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
          {stock}
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
        <Badge variant={status === 'available' ? 'default' : 'destructive'}>
          {status === 'available' ? 'Available' : 'Out of stock'}
        </Badge>
      );
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    id: 'actions',
    cell: ({ row }) => <MenuItemRowActions row={row} />,
  },
];
