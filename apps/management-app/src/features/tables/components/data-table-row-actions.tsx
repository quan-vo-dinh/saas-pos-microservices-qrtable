'use client';

import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@einvoice/frontend-ui'
import type { Row } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, QrCode, Trash2 } from 'lucide-react';
;
;
import { useTables } from './tables-provider';
import type { RestaurantTable } from '../data/schema';

export function TableRowActions({ row }: { row: Row<RestaurantTable> }) {
  const { setOpen, setCurrentTable } = useTables();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setCurrentTable(row.original);
            setOpen('view-qr');
          }}
        >
          <QrCode className="mr-2 size-4" />
          View QR Code
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setCurrentTable(row.original);
            setOpen('edit-table');
          }}
        >
          <Pencil className="mr-2 size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            setCurrentTable(row.original);
            setOpen('delete-table');
          }}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
