'use client';

import { useMemo, useState } from 'react';
import { BillStatus } from '@einvoice/types';
import { useMockStore } from '@/mocks/store';
import { BillSettlementPanel } from '@/features/payment/components/bill-settlement-panel';
import { Button } from '@/components/ui/button';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';

export function PosPaymentClient() {
  const bills = useMockStore((s) => s.bills);
  const selectedBillId = useMockStore((s) => s.selectedBillId);
  const selectBill = useMockStore((s) => s.selectBill);

  const pending = useMemo(
    () => bills.filter((b) => b.status === BillStatus.PENDING_PAYMENT).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bills],
  );

  const [pickedId, setPickedId] = useState<string | null>(null);

  const activeBillId = useMemo(() => {
    if (pickedId && pending.some((b) => b.id === pickedId)) return pickedId;
    if (selectedBillId && pending.some((b) => b.id === selectedBillId)) return selectedBillId;
    return pending[0]?.id ?? null;
  }, [pickedId, pending, selectedBillId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4" data-slot="pos-payment-client">
      <div>
        <h1 className="text-lg font-semibold">Thanh toán POS</h1>
        <p className="text-sm text-muted-foreground">Chọn bill PENDING, thu tiền mặt hoặc tạo VietQR (BFF → Payment).</p>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Bill chờ thanh toán · {pending.length}</p>
          <ul className="flex max-h-[min(50vh,420px)] min-h-0 flex-col gap-0.5 overflow-y-auto pr-0.5">
            {pending.map((b) => (
              <li key={b.id}>
                <Button
                  type="button"
                  variant={activeBillId === b.id ? 'secondary' : 'ghost'}
                  className={cn(
                    'h-auto w-full justify-start gap-2 py-1.5 text-left font-normal',
                    activeBillId === b.id && 'ring-1 ring-cyan-500/40',
                  )}
                  onClick={() => {
                    setPickedId(b.id);
                    void selectBill(b.id);
                  }}
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
        <div className="min-h-0 min-w-0 rounded-lg border border-border/80 bg-card/30 p-3">
          {activeBillId ? <BillSettlementPanel billId={activeBillId} /> : <p className="text-sm text-muted-foreground">Không có bill PENDING.</p>}
        </div>
      </div>
    </div>
  );
}
