'use client';

import { useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useMockStore } from '@/mocks/store';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fromTableId: string;
};

export function TransferTableDialog({ open, onOpenChange, fromTableId }: Props) {
  const tables = useMockStore((s) => s.tables);
  const transferTable = useMockStore((s) => s.transferTable);
  const available = useMemo(
    () => tables.filter((t) => t.id !== fromTableId && t.status === 'available'),
    [tables, fromTableId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển bàn</DialogTitle>
          <DialogDescription>
            Chỉ bàn <span className="font-medium">available</span> hiển thị. Các bàn bận/bếp/dọn không hợp lệ ở mock
            này.
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border">
          <CommandInput placeholder="Tìm bàn…" />
          <CommandList>
            <CommandEmpty>Không có bàn trống phù hợp.</CommandEmpty>
            <CommandGroup heading="Bàn trống">
              {available.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.name} ${t.areaName}`}
                  onSelect={() => {
                    transferTable(fromTableId, t.id);
                    toast.success('Đã chuyển bàn (mock)');
                    onOpenChange(false);
                  }}
                >
                  {t.name} — {t.areaName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
