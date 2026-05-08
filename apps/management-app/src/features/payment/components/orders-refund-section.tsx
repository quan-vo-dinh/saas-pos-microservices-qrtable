'use client';

import { useMemo, useState } from 'react';
import { BillStatus } from '@einvoice/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { paymentService } from '@/features/payment/services/payment.service';

export function OrdersRefundSection() {
  const bills = useMockStore((s) => s.bills);
  const paidWithPayment = useMemo(
    () => bills.filter((b) => b.status === BillStatus.PAID && b.paymentId).slice(0, 8),
    [bills],
  );

  return (
    <div className="flex flex-col gap-4" data-slot="orders-refund-section">
      <div>
        <h2 className="text-lg font-semibold">Hoàn tiền / Refund</h2>
        <p className="text-sm text-muted-foreground">
          Yêu cầu hoàn tiền thủ công (mock bill kèm paymentId). Xác nhận sau khi chủ quán đã chuyển khoản.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {paidWithPayment.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs">{b.id}</p>
              <p className="font-mono text-sm tabular-nums">{formatVnd(b.total)}</p>
            </div>
            <RefundDialog paymentId={b.paymentId!} amountLabel={formatVnd(b.total)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RefundDialog({ paymentId, amountLabel }: { paymentId: string; amountLabel: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('Khách yêu cầu hoàn');
  const [refundId, setRefundId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          Refund / Hoàn tiền
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hoàn tiền</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <p className="text-sm text-muted-foreground">
            Bill đã thanh toán · {amountLabel} · paymentId gốc (UUID) được gửi lên BFF.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="refund-reason">Lý do</Label>
            <Input
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={3}
              maxLength={500}
            />
          </div>
          {refundId ? (
            <p className="rounded-md bg-muted/60 p-2 font-mono text-xs">
              refundId: <span className="break-all">{refundId}</span>
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => {
              void (async () => {
                setBusy(true);
                try {
                  const res = await paymentService.requestRefund({ paymentId, reason: reason.trim() });
                  setRefundId(res.id);
                  toast.success('Đã tạo yêu cầu hoàn — chờ chuyển khoản');
                } catch (e) {
                  toast.error((e as Error).message || 'Không tạo được hoàn tiền');
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Gửi yêu cầu hoàn
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !refundId}
            onClick={() => {
              void (async () => {
                if (!refundId) return;
                setBusy(true);
                try {
                  await paymentService.confirmRefund(refundId);
                  toast.success('Đã xác nhận hoàn');
                  setOpen(false);
                  setRefundId(null);
                } catch (e) {
                  toast.error((e as Error).message || 'Không xác nhận được hoàn');
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Xác nhận đã chuyển
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
