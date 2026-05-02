'use client';

import { MapPinned, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@einvoice/frontend-ui';
import type { Area } from '../data/schema';
import { useTables } from './tables-provider';

type AreaManagementBarProps = {
  areas: Area[];
};

export function AreaManagementBar({ areas }: AreaManagementBarProps) {
  const { setCurrentArea, setOpen } = useTables();

  if (areas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        Chưa có khu vực. Tạo khu vực trước khi thêm bàn.
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MapPinned className="size-4 text-muted-foreground" />
        <span>Khu vực</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <div key={area.id} className="flex items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{area.name}</p>
              <p className="text-xs text-muted-foreground">
                {area.tableCount} bàn · thứ tự {area.sortOrder}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Edit area ${area.name}`}
                onClick={() => {
                  setCurrentArea(area);
                  setOpen('edit-area');
                }}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive"
                aria-label={`Delete area ${area.name}`}
                disabled={area.tableCount > 0}
                onClick={() => {
                  setCurrentArea(area);
                  setOpen('delete-area');
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
