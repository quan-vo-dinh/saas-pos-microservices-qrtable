'use client';

import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { billingPeriodVi, planFeatureVi } from '@einvoice/shared-constants';
import { SubscriptionStatusBadge, TenantStatusBadge } from '@/features/saas/components/badges';
import { formatDateTime } from '@/features/saas/formatters';
import type { DashboardSubscription } from '@/features/saas/types';

function Bar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max <= 0 || max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {max === -1 ? '∞' : max}
        </span>
      </div>
      <div className="bg-muted h-2 rounded-full">
        <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CurrentPlanPanel({ data }: { data: DashboardSubscription }) {
  const tenant = data.tenant;
  const cur = data.current;
  const usage = data.usage ?? {};

  return (
    <div className="space-y-4">
      {tenant?.status === 'SUSPENDED' ? (
        <Alert variant="destructive">
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Tenant đang tạm khóa <TenantStatusBadge status="SUSPENDED" />
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span>Vui lòng thanh toán hóa đơn hoặc chọn gói mới để tiếp tục.</span>
            <Button asChild size="sm" variant="secondary">
              <Link href={ROUTES.SUBSCRIPTION}>Xem subscription</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-md border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Gói hiện tại</h2>
          {cur ? <Badge>{cur.planCode}</Badge> : <Badge variant="secondary">Chưa có</Badge>}
          {cur?.status ? <SubscriptionStatusBadge status={cur.status} /> : null}
        </div>
        {cur ? (
          <p className="text-muted-foreground mt-2 text-sm">Hết hạn: {formatDateTime(cur.expiresAt)}</p>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">Chưa có subscription kích hoạt.</p>
        )}
        {cur?.billingPeriod ? (
          <p className="text-muted-foreground text-xs">Chu kỳ: {billingPeriodVi(cur.billingPeriod)}</p>
        ) : null}
        <div className="mt-4 max-w-md space-y-3">
          <Bar label="Bàn" used={usage.tablesUsed ?? 0} max={usage.tablesMax ?? cur?.maxTables ?? 0} />
          <Bar label="Nhân sự" used={usage.staffUsed ?? 0} max={usage.staffMax ?? cur?.maxStaff ?? 0} />
          <Bar label="Đơn hôm nay" used={usage.ordersToday ?? 0} max={usage.ordersMaxPerDay ?? cur?.maxOrdersPerDay ?? 0} />
        </div>
        {cur?.features?.length ? (
          <ul className="text-muted-foreground mt-3 list-inside list-disc text-xs">
            {cur.features.map((f) => (
              <li key={f}>{planFeatureVi(f)}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
