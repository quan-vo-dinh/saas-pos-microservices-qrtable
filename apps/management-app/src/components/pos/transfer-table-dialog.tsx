'use client';

import { useMemo } from 'react';
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
import { useTransferTableMutation } from '@/features/order/hooks/use-order-query';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fromTableId?: string | null;
  sessionId?: string | null;
  requestId?: string;
};

export function TransferTableDialog({ open, onOpenChange, fromTableId, sessionId, requestId }: Props) {
  const tablesQuery = useTablesQuery();
  const transferMutation = useTransferTableMutation();
  const canTransfer = Boolean(sessionId && fromTableId);
  const available = useMemo(
    () => (tablesQuery.data ?? []).filter((t) => t.id !== fromTableId && t.status === 'available'),
    [tablesQuery.data, fromTableId],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chuyển bàn</DialogTitle>
          <DialogDescription>
            Chỉ bàn <span className="font-medium">available</span> hiển thị. Cần có phiên bàn đang mở để chuyển.
          </DialogDescription>
        </DialogHeader>
        <Command className="rounded-lg border">
          <CommandInput placeholder="Tìm bàn…" disabled={!canTransfer || transferMutation.isPending} />
          <CommandList>
            <CommandEmpty>
              {canTransfer ? 'Không có bàn trống phù hợp.' : 'Không đủ thông tin phiên để chuyển bàn.'}
            </CommandEmpty>
            <CommandGroup heading="Bàn trống">
              {available.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.name} ${t.areaName}`}
                  disabled={!canTransfer || transferMutation.isPending}
                  onSelect={() => {
                    if (!sessionId || !fromTableId) {
                      return;
                    }

                    transferMutation.mutate(
                      {
                        sessionId,
                        fromTableId,
                        toTableId: t.id,
                        requestId,
                      },
                      {
                        onSuccess: () => onOpenChange(false),
                      },
                    );
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
