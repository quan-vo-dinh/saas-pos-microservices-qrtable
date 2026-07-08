'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrderStatus } from '@einvoice/types';
import { ChefHat } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { ROUTES } from '@/constants/routes';
import { useConfirmOrderMutation, useOrdersQuery } from '@/features/order/hooks/use-order-query';
import { useOrderUiState } from '@/features/order/hooks/use-order-ui-state';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const tablesQuery = useTablesQuery();
  const tables = tablesQuery.data ?? [];
  const liveOrdersQuery = useOrdersQuery();
  const liveOrders = liveOrdersQuery.data ?? [];
  const selectRow = useOrderUiState((s) => s.selectOrder);
  const confirmOrderMutation = useConfirmOrderMutation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed end-3 top-16 z-30 hidden md:block">
      </div>
      <CommandDialog open={open} onOpenChange={setOpen} title="POS Command" description="Bàn, đơn, thao tác nhanh">
        <Command className="rounded-lg border-0">
          <CommandInput placeholder="Gõ tên bàn, mã đơn, hoặc hành động…" />
          <CommandList>
            <CommandEmpty>Không thấy kết quả.</CommandEmpty>
            <CommandGroup heading="Bàn">
              {tables.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.name} ${t.areaName} ${t.id}`}
                  onSelect={() => {
                    setOpen(false);
                    void router.push(`${ROUTES.POS_TABLES}?highlight=${encodeURIComponent(t.id)}`);
                  }}
                >
                  {t.name} — {t.areaName}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Đơn (theo 4 ký tự cuối)">
              {liveOrders.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.id} ${o.tableName}`}
                  onSelect={() => {
                    setOpen(false);
                    void selectRow(o.id);
                    void router.push(ROUTES.POS);
                  }}
                >
                  <span className="font-mono">…{o.id.slice(-4)}</span>
                  <span className="text-muted-foreground">{o.tableName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Hành động">
              <CommandItem
                value="xác nhận đơn mới pending"
                onSelect={() => {
                  const p = liveOrders.find((o) => o.status === OrderStatus.PENDING);
                  if (p) confirmOrderMutation.mutate(p.id);
                  setOpen(false);
                }}
              >
                Xác nhận đơn PENDING đầu tiên
              </CommandItem>
              <CommandItem
                value="kds kitchen"
                onSelect={() => {
                  setOpen(false);
                  void router.push(ROUTES.KDS_KITCHEN);
                }}
              >
                <ChefHat className="size-4" data-icon="inline-start" />
                Mở KDS bếp
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
