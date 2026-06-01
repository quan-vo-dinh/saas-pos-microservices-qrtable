'use client';

import Link from 'next/link';
import { Sparkles, Table2, Users, UtensilsCrossed } from 'lucide-react';
import { planFeatureVi, subscriptionStatusVi } from '@einvoice/shared-constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';
import type { DashboardSubscription } from '@/features/saas/types';
import type { DashboardEntitlements } from '../types';

function QuotaBar({ label, used, max, icon }: { label: string; used: number; max: number; icon: ReactNode }) {
  const pct = max <= 0 || max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-foreground">
          {used} / {max === -1 ? '∞' : max}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

type Props = {
  subscription?: DashboardSubscription;
  entitlements: DashboardEntitlements;
  loading?: boolean;
};

export function DashboardPlanOverviewCard({ subscription, entitlements, loading }: Props) {
  const tenant = subscription?.tenant;
  const current = subscription?.current;
  const usage = subscription?.usage ?? {};

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Gói & hạn mức</CardTitle>
        <CardDescription>
          {tenant?.name ? `${tenant.name} · ` : ''}
          Theo dõi quota và nâng cấp khi cần thêm báo cáo.
        </CardDescription>
        <CardAction>
          <Button asChild size="sm" variant="outline">
            <Link href={entitlements.upgradeUrl}>
              <Sparkles className="size-3.5" aria-hidden />
              Quản lý gói
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {entitlements.currentPlanCode ? (
            <Badge>{entitlements.currentPlanCode}</Badge>
          ) : (
            <Badge variant="secondary">Chưa có gói</Badge>
          )}
          {current?.status ? <Badge variant="outline">{subscriptionStatusVi(current.status)}</Badge> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <QuotaBar
            label="Bàn"
            used={usage.tablesUsed ?? 0}
            max={usage.tablesMax ?? current?.maxTables ?? 0}
            icon={<Table2 className="size-3.5" aria-hidden />}
          />
          <QuotaBar
            label="Nhân sự"
            used={usage.staffUsed ?? 0}
            max={usage.staffMax ?? current?.maxStaff ?? 0}
            icon={<Users className="size-3.5" aria-hidden />}
          />
          <QuotaBar
            label="Đơn hôm nay"
            used={usage.ordersToday ?? 0}
            max={usage.ordersMaxPerDay ?? current?.maxOrdersPerDay ?? 0}
            icon={<UtensilsCrossed className="size-3.5" aria-hidden />}
          />
        </div>

        {entitlements.features.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {entitlements.features.map((code) => (
              <Badge key={code} variant="secondary" className="font-normal">
                {planFeatureVi(code)}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
