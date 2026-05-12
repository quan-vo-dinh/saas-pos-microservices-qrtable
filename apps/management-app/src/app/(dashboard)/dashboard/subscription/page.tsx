'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saasApi } from '@/features/saas/api';
import { formatDateTime } from '@/features/saas/formatters';
import type { BillingPeriod } from '@/features/saas/types';
import { CheckoutQrDialog } from '@/features/saas/subscription/checkout-qr-dialog';
import { CurrentPlanPanel } from '@/features/saas/subscription/current-plan-panel';
import { PlanCompareTable } from '@/features/saas/subscription/plan-compare-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardSubscriptionPage() {
  const qc = useQueryClient();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<Awaited<ReturnType<typeof saasApi.checkoutSubscription>> | null>(
    null,
  );
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const sub = useQuery({
    queryKey: ['dashboard-subscription'],
    queryFn: () => saasApi.getDashboardSubscription(),
  });

  const onCheckout = useCallback(
    async (planCode: string) => {
      setBusyCode(planCode);
      try {
        const inv = await saasApi.checkoutSubscription({ planCode, billingPeriod });
        setPendingInvoice(inv);
        setCheckoutOpen(true);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.serverMessage : 'Checkout thất bại');
      } finally {
        setBusyCode(null);
      }
    },
    [billingPeriod],
  );

  const plans = sub.data?.plans ?? [];

  return (
    <div className="flex flex-col gap-8 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground text-sm">Gói cước tenant và thanh toán Tier 2.</p>
      </div>

      {sub.isLoading ? <p className="text-muted-foreground text-sm">Đang tải…</p> : null}
      {sub.isError ? (
        <p className="text-destructive text-sm">{(sub.error as Error).message}</p>
      ) : null}
      {sub.data ? <CurrentPlanPanel data={sub.data} /> : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold">So sánh gói</h2>
          <div className="grid gap-1.5 sm:w-48">
            <Label>Chu kỳ thanh toán</Label>
            <Select value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as BillingPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Tháng</SelectItem>
                <SelectItem value="YEARLY">Năm</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <PlanCompareTable
          plans={plans}
          currentPlanCode={sub.data?.current?.planCode}
          billingPeriod={billingPeriod}
          onCheckout={(code) => void onCheckout(code)}
          busyCode={busyCode}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Lịch sử đăng ký</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hết hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sub.data?.history ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.planCode}</TableCell>
                  <TableCell>{h.status}</TableCell>
                  <TableCell>{formatDateTime(h.expiresAt ?? null)}</TableCell>
                </TableRow>
              ))}
              {!sub.data?.history?.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground p-4 text-center text-sm">
                    Chưa có lịch sử.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <CheckoutQrDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        invoice={pendingInvoice}
        onPaid={() => void qc.invalidateQueries({ queryKey: ['dashboard-subscription'] })}
      />
    </div>
  );
}
