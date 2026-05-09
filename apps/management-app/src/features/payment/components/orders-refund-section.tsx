'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { formatVnd } from '@/lib/format-vnd';
import { paymentQueryKeys, usePaymentHistoryQuery } from '@/features/payment/hooks/use-payment';
import { paymentService, type StaffPaymentRecord } from '@/features/payment/services/payment.service';

export function OrdersRefundSection() {
  const queryClient = useQueryClient();
  const historyQuery = usePaymentHistoryQuery(undefined);
  const paidPayments = useMemo(
    () => (historyQuery.data ?? []).filter((p) => p.status === 'PAID').slice(0, 8),
    [historyQuery.data],
  );

  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: paymentQueryKeys.history(undefined) });

  return (
    <div className="flex flex-col gap-4" data-slot="orders-refund-section">
      <div>
        <h2 className="text-lg font-semibold">Hoàn tiền / Refund</h2>
        <p className="text-sm text-muted-foreground">
          Yêu cầu hoàn tiền thủ công từ payment đã thanh toán. Xác nhận sau khi chủ quán đã chuyển khoản.
        </p>
      </div>
      {historyQuery.isLoading ? <p className="text-sm text-muted-foreground">Đang tải payment history...</p> : null}
      {historyQuery.isError ? <p className="text-sm text-destructive">Không tải được payment history.</p> : null}
      {!historyQuery.isLoading && paidPayments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có payment đã thanh toán để hoàn tiền.</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {paidPayments.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs">{p.id}</p>
              <p className="text-xs text-muted-foreground">Bill: {paymentBillLabel(p)}</p>
              <p className="font-mono text-sm tabular-nums">{formatVnd(p.roundedTotal)}</p>
            </div>
            <RefundDialog
              paymentId={p.id}
              amountLabel={formatVnd(p.roundedTotal)}
              onRefundConfirmed={refreshHistory}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function paymentBillLabel(payment: StaffPaymentRecord) {
  return payment.billReference || payment.billId;
}

function RefundDialog({
  paymentId,
  amountLabel,
  onRefundConfirmed,
}: {
  paymentId: string;
  amountLabel: string;
  onRefundConfirmed: () => Promise<unknown>;
}) {
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
                  await onRefundConfirmed();
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
