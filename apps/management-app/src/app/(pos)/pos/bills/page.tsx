'use client';

import { useEffect, useMemo } from 'react';
import { BillStatus } from '@einvoice/types';
import { Button } from '@/components/ui/button';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';

export default function PosBillsPage() {
  const bills = useMockStore((s) => s.bills);
  const selectedBillId = useMockStore((s) => s.selectedBillId);
  const selectBill = useMockStore((s) => s.selectBill);

  const pending = useMemo(
    () => bills.filter((b) => b.status === BillStatus.PENDING_PAYMENT).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bills],
  );

  useEffect(() => {
    if (!selectedBillId && pending[0]) {
      void selectBill(pending[0].id);
    }
  }, [pending, selectBill, selectedBillId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1" data-slot="pos-bills-inbox">
      <p className="text-xs text-muted-foreground">Hóa đơn PENDING (mock) · {pending.length}</p>
      <ul className="flex max-h-[min(50vh,420px)] min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {pending.map((b) => (
          <li key={b.id}>
            <Button
              type="button"
              variant={selectedBillId === b.id ? 'secondary' : 'ghost'}
              className={cn('h-auto w-full justify-start gap-2 py-1.5 text-left font-normal', selectedBillId === b.id && 'ring-1 ring-cyan-500/40')}
              onClick={() => void selectBill(b.id)}
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
