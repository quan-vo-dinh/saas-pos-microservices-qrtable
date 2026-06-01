'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SepayConnectButton } from '@/features/saas/payment-settings/sepay-connect-button';
import { PaymentSettingsSummary } from '@/features/saas/payment-settings/payment-settings-summary';
import { DisconnectSepayDialog } from '@/features/saas/payment-settings/disconnect-sepay-dialog';
import { PaymentSettingsShell } from '@/features/saas/payment-settings/payment-settings-shell';
import { PaymentPartnershipHero } from '@/features/saas/payment-settings/payment-partnership-hero';
import { saasApi } from '@/features/saas/api';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
    <PaymentSettingsShell hero={<PaymentPartnershipHero />}>
      {q.isLoading ? (
        <div className="grid w-full gap-3">
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-10 w-36" />
        </div>
      ) : null}

      {q.isError ? <p className="text-destructive text-sm">{(q.error as Error).message}</p> : null}

      {q.data ? <PaymentSettingsSummary s={q.data} /> : null}

      <div className="flex flex-wrap gap-2">
        {canUpdate && q.data?.connectionStatus !== 'CONNECTED' ? <SepayConnectButton /> : null}
        {canUpdate && q.data?.connectionStatus === 'CONNECTED' ? (
          <>
            <SepayConnectButton label="Đổi / kết nối lại SePay" variant="outline" />
            <DisconnectSepayDialog onDisconnected={() => void qc.invalidateQueries({ queryKey: ['dashboard-payment-settings'] })} />
          </>
        ) : null}
        {!canUpdate ? (
          <Button type="button" variant="outline" disabled>
            Chỉ xem — thiếu quyền cập nhật
          </Button>
        ) : null}
      </div>
    </PaymentSettingsShell>
  );
}
