'use client';

import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from '@einvoice/frontend-ui';
import { Armchair, Pencil, QrCode, Trash2, Users } from 'lucide-react';
import { TableStatusBadge } from './table-status-badge';
import { TableStatusLegend } from './table-status-legend';
import { useTables } from './tables-provider';
import { cn } from '@/lib/utils';
import type { RestaurantTable } from '../data/schema';
import { statusBorderColors, statusBgColors } from '../lib/table-surface-styles';

type TableFloorPlanProps = {
  tables: RestaurantTable[];
};

export function TableFloorPlan({ tables }: TableFloorPlanProps) {
  const { selectedTableId, setSelectedTableId, setCurrentTable, setOpen } =
    useTables();

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <TableStatusLegend />

      {/* Floor Plan Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {tables.map((table) => (
          <Popover key={table.id}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={() => setSelectedTableId(table.id)}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-1',
                  'rounded-xl border-2 p-4 transition-all',
                  'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  statusBorderColors[table.status],
                  statusBgColors[table.status],
                  selectedTableId === table.id &&
                    'ring-2 ring-ring ring-offset-2 ring-offset-background shadow-md'
                )}
              >
                <Armchair className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm font-semibold">{table.name}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="size-3" />
                  {table.capacity}
                </div>
                <TableStatusBadge
                  status={table.status}
                  className="mt-1 text-[10px] px-1.5 py-0"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="center">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{table.name}</span>
                  <TableStatusBadge status={table.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Sức chứa: {table.capacity} • {table.areaName}
                </div>
                {table.sessionId && (
                  <div className="text-xs text-muted-foreground">
                    Phiên: {table.sessionId}
                  </div>
                )}
                <Separator />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => {
                      setCurrentTable(table);
                      setOpen('view-qr');
                    }}
                  >
                    <QrCode className="mr-1 size-3" />
                    Mã QR
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => {
                      setCurrentTable(table);
                      setOpen('edit-table');
                    }}
                  >
                    <Pencil className="mr-1 size-3" />
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      setCurrentTable(table);
                      setOpen('delete-table');
                    }}
                  >
                    <Trash2 className="mr-1 size-3" />
                    Xóa
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}
