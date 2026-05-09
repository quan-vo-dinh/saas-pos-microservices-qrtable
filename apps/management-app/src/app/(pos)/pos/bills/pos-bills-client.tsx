'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BillStatus } from '@einvoice/types';
import { Button } from '@/components/ui/button';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';
import { useBillsQuery } from '@/features/order/hooks/use-bill-query';

export function PosBillsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedBillId = searchParams.get('billId');
  const billsQuery = useBillsQuery({ status: BillStatus.PENDING_PAYMENT, limit: 100, offset: 0 });

  const pending = useMemo(
    () => (billsQuery.data ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [billsQuery.data],
  );

  useEffect(() => {
    if (billsQuery.isLoading || pending.length === 0) {
      return;
    }

    if (!selectedBillId || !pending.some((b) => b.id === selectedBillId)) {
      const firstPending = pending[0];
      if (!firstPending) {
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      next.set('billId', firstPending.id);
      router.replace(`${pathname}?${next.toString()}`);
    }
  }, [billsQuery.isLoading, pathname, pending, router, searchParams, selectedBillId]);

  const selectBill = (billId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('billId', billId);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1" data-slot="pos-bills-inbox">
      <p className="text-xs text-muted-foreground">Hóa đơn PENDING · {pending.length}</p>
      {billsQuery.isLoading ? <p className="text-xs text-muted-foreground">Đang tải hóa đơn...</p> : null}
      {billsQuery.isError ? <p className="text-xs text-destructive">Không tải được hóa đơn.</p> : null}
      <ul className="flex max-h-[min(50vh,420px)] min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {pending.map((b) => (
          <li key={b.id}>
            <Button
              type="button"
              variant={selectedBillId === b.id ? 'secondary' : 'ghost'}
              className={cn('h-auto w-full justify-start gap-2 py-1.5 text-left font-normal', selectedBillId === b.id && 'ring-1 ring-cyan-500/40')}
              onClick={() => selectBill(b.id)}
            >
              <span className="min-w-0 flex-1 truncate text-xs">
                {b.id} — {b.orderIds.length} đơn
              </span>
              <span className="shrink-0 font-mono text-xs text-foreground tabular-nums">{formatVnd(b.total)}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
