'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { saasApi } from '@/features/saas/api';
import { billingPeriodVi } from '@einvoice/shared-constants';
import { InvoiceStatusBadge } from '@/features/saas/components/badges';
import { formatDateTime, formatVnd } from '@/features/saas/formatters';
import { InvoiceStatusPoller } from '@/features/saas/subscription/invoice-status-poller';

export default function DashboardBillingInvoicePage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const qc = useQueryClient();
  const authReady = useAuthReadyForBff();

  const inv = useQuery({
    queryKey: ['dashboard-invoice', id],
    queryFn: () => saasApi.getDashboardInvoice(id),
    enabled: authReady && Boolean(id),
  });

  const cancel = async () => {
    try {
      await saasApi.cancelDashboardInvoice(id);
      toast.success('Đã huỷ hóa đơn');
      await qc.invalidateQueries({ queryKey: ['dashboard-invoice', id] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Huỷ thất bại');
    }
  };

  if (!id) {
    return null;
  }

  if (inv.isLoading) {
    return <p className="text-muted-foreground p-6 text-sm">Đang tải…</p>;
  }

  if (inv.isError || !inv.data) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-destructive text-sm">Không tải được hóa đơn.</p>
        <Button asChild variant="outline">
          <Link href={ROUTES.SUBSCRIPTION}>← Subscription</Link>
        </Button>
      </div>
    );
  }

  const row = inv.data;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Hóa đơn</h1>
        <InvoiceStatusBadge status={row.status} />
      </div>
      <p className="font-mono text-sm">{row.billingReference}</p>
      <p className="text-sm">
        Gói: {row.planCodeSnapshot} · Chu kỳ: {billingPeriodVi(row.billingPeriod)}
      </p>
      <p className="text-lg font-medium">{formatVnd(row.amountVnd)}</p>
      {row.qrUrl && row.status === 'PENDING' ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.qrUrl} alt="QR" width={240} height={240} className="rounded-md border" />
          <InvoiceStatusPoller
            invoiceId={row.id}
            enabled={row.status === 'PENDING'}
            onPaid={() => void qc.invalidateQueries({ queryKey: ['dashboard-invoice', id] })}
            onTerminal={() => void qc.invalidateQueries({ queryKey: ['dashboard-invoice', id] })}
          />
        </div>
      ) : null}
      {row.paidAt ? <p className="text-muted-foreground text-sm">Đã thanh toán: {formatDateTime(row.paidAt)}</p> : null}
      {row.status === 'PENDING' ? (
        <Button type="button" variant="destructive" onClick={() => void cancel()}>
          Huỷ hóa đơn chờ thanh toán
        </Button>
      ) : null}
      <Button asChild variant="outline">
        <Link href={ROUTES.SUBSCRIPTION}>Quay lại subscription</Link>
      </Button>
    </div>
  );
}
