'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SepayConnectButton } from '@/features/saas/payment-settings/sepay-connect-button';
import { PaymentSettingsSummary } from '@/features/saas/payment-settings/payment-settings-summary';
import { DisconnectSepayDialog } from '@/features/saas/payment-settings/disconnect-sepay-dialog';
import { saasApi } from '@/features/saas/api';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';

export default function DashboardPaymentSettingsPage() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const authReady = useAuthReadyForBff();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['dashboard-payment-settings'],
    queryFn: () => saasApi.getDashboardPaymentSettings(),
    enabled: authReady,
  });

  const canUpdate = hasPermission(permissions, phase4bPermissions.paymentSettingsUpdateOwn);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Thanh toán — VietQR / SePay</h1>
        <p className="text-muted-foreground text-sm">Kết nối OAuth SePay cho tenant (không lưu client secret trên trình duyệt).</p>
      </div>

      {q.isLoading ? <p className="text-muted-foreground text-sm">Đang tải…</p> : null}
      {q.isError ? <p className="text-destructive text-sm">{(q.error as Error).message}</p> : null}
      {q.data ? <PaymentSettingsSummary s={q.data} /> : null}

      <div className="flex flex-wrap gap-2">
        {canUpdate && q.data?.connectionStatus !== 'CONNECTED' ? <SepayConnectButton /> : null}
        {canUpdate && q.data?.connectionStatus === 'CONNECTED' ? (
          <>
            <SepayConnectButton label="Đổi / kết nối lại SePay" />
            <DisconnectSepayDialog onDisconnected={() => void qc.invalidateQueries({ queryKey: ['dashboard-payment-settings'] })} />
          </>
        ) : null}
        {!canUpdate ? (
          <Button type="button" variant="outline" disabled>
            Chỉ xem — thiếu quyền cập nhật
          </Button>
        ) : null}
      </div>
    </div>
  );
}
