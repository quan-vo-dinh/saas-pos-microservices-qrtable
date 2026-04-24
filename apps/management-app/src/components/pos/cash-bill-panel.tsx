'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { BillStatus } from '@einvoice/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';

const schema = z.object({
  received: z
    .number()
    .int('Số nguyên VND')
    .min(1_000, { message: 'Tối thiểu 1.000₫' }),
});

const chips = [100_000, 200_000, 500_000, 1_000_000] as const;

export function CashBillPanel({ billId }: { billId: string }) {
  const bills = useMockStore((s) => s.bills);
  const payCash = useMockStore((s) => s.payCash);
  const [received, setReceived] = useState(300_000);
  const [err, setErr] = useState<string | null>(null);

  const bill = useMemo(() => bills.find((b) => b.id === billId), [bills, billId]);
  const total = bill?.total ?? 0;
  const change = received - total;
  const canPay = total > 0 && received >= total && bill?.status === BillStatus.PENDING_PAYMENT;

  if (!bill) {
    return <p className="text-sm text-destructive">Không tìm thấy bill.</p>;
  }

  if (bill.status === BillStatus.PAID) {
    return <p className="text-sm text-muted-foreground">Bill đã thanh toán.</p>;
  }

  return (
    <div className="flex flex-col gap-3" data-slot="pos-cash-bill">
      <div>
        <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Tổng phải thu</p>
        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{formatVnd(total)}</p>
        <p className="text-[0.6rem] text-muted-foreground">Mã: {bill.id}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recv">Tiền nhận (VND)</Label>
        <Input
          id="recv"
          className="font-mono"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={Number.isNaN(received) ? 0 : received}
          onChange={(e) => {
            setReceived(Number(e.target.value));
            setErr(null);
          }}
        />
        {err ? <p className="text-xs text-destructive">{err}</p> : null}
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <Button
              type="button"
              key={c}
              size="sm"
              variant="outline"
              className="h-7 text-[0.7rem] font-mono"
              onClick={() => {
                setReceived(c);
                setErr(null);
              }}
            >
              {formatVnd(c)}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[0.65rem] text-muted-foreground">Tiền thừa (tự tính)</p>
        <p className={cn('font-mono text-lg', change < 0 && 'text-destructive', change >= 0 && 'text-foreground')}>
          {formatVnd(change)}
        </p>
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={!canPay}
        onClick={() => {
          const parsed = schema.safeParse({ received });
          if (!parsed.success) {
            setErr(parsed.error.issues[0]?.message ?? 'Giá trị không hợp lệ');
            return;
          }
          if (parsed.data.received < total) {
            setErr('Nhận thiếu so với tổng');
            return;
          }
          void payCash(bill.id, parsed.data.received);
          toast('Đã thu — bàn dọn (mock)', { className: 'font-sans' });
        }}
      >
        Đã thu — đóng phiên
      </Button>
    </div>
  );
}
