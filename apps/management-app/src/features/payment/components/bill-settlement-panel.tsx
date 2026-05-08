'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { BillStatus, PaymentMethod } from '@einvoice/types';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMockStore } from '@/mocks/store';
import { formatVnd } from '@/lib/format-vnd';
import { cn } from '@/lib/utils';
import { paymentService } from '@/features/payment/services/payment.service';
import { paymentQueryKeys, usePaymentHistoryQuery } from '@/features/payment/hooks/use-payment';

const schema = z.object({
  received: z
    .number()
    .int('Số nguyên VND')
    .min(1_000, { message: 'Tối thiểu 1.000₫' }),
});

const chips = [100_000, 200_000, 500_000, 1_000_000] as const;

export function BillSettlementPanel({ billId }: { billId: string }) {
  const queryClient = useQueryClient();
  const bills = useMockStore((s) => s.bills);
  const payCash = useMockStore((s) => s.payCash);
  const [received, setReceived] = useState(300_000);
  const [err, setErr] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [vietQrBusy, setVietQrBusy] = useState(false);

  useEffect(() => {
    setQrUrl(null);
    setErr(null);
  }, [billId]);

  const bill = useMemo(() => bills.find((b) => b.id === billId), [bills, billId]);
  const total = bill?.total ?? 0;
  const change = received - total;
  const canPayCash = total > 0 && received >= total && bill?.status === BillStatus.PENDING_PAYMENT;

  const { data: history } = usePaymentHistoryQuery(billId);

  const terminalFromHistory = useMemo(
    () =>
      (history ?? []).some(
        (r) =>
          r.billId === billId &&
          (r.status === 'PAID' || r.status === 'FAILED' || r.status === 'REFUNDED'),
      ),
    [history, billId],
  );

  useEffect(() => {
    if (!qrUrl || bill?.status !== BillStatus.PENDING_PAYMENT || terminalFromHistory) return;
    const t = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.history(billId) });
    }, 3000);
    return () => clearInterval(t);
  }, [qrUrl, billId, bill?.status, terminalFromHistory, queryClient]);

  const pendingVietQr = useMemo(
    () =>
      (history ?? []).some(
        (r) => r.billId === billId && r.method === PaymentMethod.VIETQR && r.status === 'PENDING',
      ),
    [history, billId],
  );

  if (!bill) {
    return <p className="text-sm text-destructive">Không tìm thấy bill.</p>;
  }

  if (bill.status === BillStatus.PAID) {
    return <p className="text-sm text-muted-foreground">Bill đã thanh toán.</p>;
  }

  return (
    <div className="flex flex-col gap-3" data-slot="bill-settlement-panel">
      <div>
        <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Tổng phải thu</p>
        <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">{formatVnd(total)}</p>
        <p className="text-[0.6rem] text-muted-foreground">Mã: {bill.id}</p>
      </div>

      <Tabs defaultValue="cash">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cash" className="text-xs">
            Tiền mặt
          </TabsTrigger>
          <TabsTrigger value="vietqr" className="text-xs">
            VietQR
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cash" className="mt-3 flex flex-col gap-3">
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
            disabled={!canPayCash}
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
              void (async () => {
                try {
                  await paymentService.confirmCash(bill.id, parsed.data.received);
                  payCash(bill.id, parsed.data.received);
                  toast.success('Đã thu — đóng phiên');
                } catch (e) {
                  toast.error((e as Error).message || 'Không xác nhận tiền mặt');
                }
              })();
            }}
          >
            Đã thu — đóng phiên
          </Button>
        </TabsContent>

        <TabsContent value="vietqr" className="mt-3 flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={bill.status !== BillStatus.PENDING_PAYMENT || vietQrBusy}
            onClick={() => {
              void (async () => {
                setVietQrBusy(true);
                try {
                  const res = await paymentService.createVietQr(bill.id);
                  setQrUrl(res.qrUrl);
                  await queryClient.invalidateQueries({ queryKey: paymentQueryKeys.history(bill.id) });
                  toast.success('Đã tạo mã VietQR');
                } catch (e) {
                  toast.error((e as Error).message || 'Không tạo được VietQR');
                } finally {
                  setVietQrBusy(false);
                }
              })();
            }}
          >
            {vietQrBusy ? 'Đang tạo…' : 'Tạo / làm mới mã QR'}
          </Button>
          {qrUrl ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-border/80 p-3">
              {/* VietQR is an external dynamic URL — avoid next/image remotePatterns churn */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="VietQR" className="max-h-64 w-full max-w-xs object-contain" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Tạo mã QR để khách chuyển khoản qua SePay.</p>
          )}
          {pendingVietQr ? (
            <p className="text-center text-xs text-amber-600">Đang chờ thanh toán… (tự làm mới mỗi 3 giây)</p>
          ) : qrUrl ? (
            <p className="text-center text-xs text-muted-foreground">Không còn giao dịch PENDING cho bill này.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
