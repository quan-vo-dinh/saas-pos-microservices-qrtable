'use client';

import { Armchair, Pencil, QrCode, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Button,
  Separator,
} from '@einvoice/frontend-ui';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@einvoice/frontend-ui';
import type { RestaurantTable, TableStatus } from '../data/schema';
import { TableStatusBadge, statusConfig } from './table-status-badge';
import { useTables } from './tables-provider';

const statusBorderColors: Record<TableStatus, string> = {
  available: 'border-emerald-500/40 hover:border-emerald-500',
  occupied: 'border-amber-500/40 hover:border-amber-500',
  billing: 'border-blue-500/40 hover:border-blue-500',
  cleaning: 'border-gray-500/40 hover:border-gray-500',
};

const statusBgColors: Record<TableStatus, string> = {
  available: 'bg-emerald-500/5',
  occupied: 'bg-amber-500/5',
  billing: 'bg-blue-500/5',
  cleaning: 'bg-gray-500/5',
};

type TableFloorPlanProps = {
  tables: RestaurantTable[];
};

export function TableFloorPlan({ tables }: TableFloorPlanProps) {
  const { selectedTableId, setSelectedTableId, setCurrentTable, setOpen } =
    useTables();

  return (
    <div className="flex flex-col gap-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(Object.entries(statusConfig) as [TableStatus, { label: string; className: string }][]).map(
          ([status, config]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className={cn(
                  'size-3 rounded-sm border',
                  statusBorderColors[status],
                  statusBgColors[status]
                )}
              />
              <span>{config.label}</span>
            </div>
          )
        )}
      </div>

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
                  Capacity: {table.capacity} • {table.areaName}
                </div>
                {table.sessionId && (
                  <div className="text-xs text-muted-foreground">
                    Session: {table.sessionId}
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
                    QR
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
                    Edit
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
                    Delete
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
