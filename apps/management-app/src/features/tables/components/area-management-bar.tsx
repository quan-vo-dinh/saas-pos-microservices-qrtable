'use client';

import { MapPinned, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@einvoice/frontend-ui';
import type { Area } from '../data/schema';
import { useTables } from './tables-provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type AreaManagementBarProps = {
  areas: Area[];
};

/** Above this count, the bar starts collapsed so the table view stays visible. */
const COLLAPSE_WHEN_AREA_COUNT_AT_LEAST = 5;

export function AreaManagementBar({ areas }: AreaManagementBarProps) {
  const { setCurrentArea, setOpen } = useTables();

  if (areas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
        Chưa có khu vực. Tạo khu vực trước khi thêm bàn.
      </div>
    );
  }

  const defaultOpen = areas.length < COLLAPSE_WHEN_AREA_COUNT_AT_LEAST;

  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible w-full min-w-0">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex h-auto min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left font-normal hover:bg-accent/50"
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <MapPinned className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">Quản lý khu vực</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {areas.length} khu
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="max-h-[min(45vh,280px)] overflow-y-auto pt-2">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2"
              >
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
                    aria-label={`Chỉnh sửa khu ${area.name}`}
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
                    aria-label={`Xóa khu ${area.name}`}
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
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
