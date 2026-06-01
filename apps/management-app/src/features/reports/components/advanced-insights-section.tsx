'use client';

import { PaymentMethodChart } from './payment-method-chart';
import { TopItemsTable } from './top-items-table';
import { ReportFeatureGate } from './report-feature-gate';
import {
  DashboardFeatureLockCard,
  advancedAnalyticsLockProps,
} from './dashboard-feature-lock-card';
import type { DashboardEntitlements } from '../types';
import type { OrderReport, PaymentRevenueReport } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatVnd } from '@/lib/format-vnd';
import { paymentMethodVi } from '@einvoice/shared-constants';
import { PaymentMethod } from '@einvoice/types';

type Props = {
  entitlements: DashboardEntitlements;
  revenue?: PaymentRevenueReport;
  orders?: OrderReport;
};

function methodLabel(method: string): string {
  if (method === PaymentMethod.CASH || method === PaymentMethod.VIETQR) {
    return paymentMethodVi(method);
  }
  return method === 'UNKNOWN' ? 'Khác' : method;
}

export function AdvancedInsightsSection({ entitlements, revenue, orders }: Props) {
  const lockCard = <DashboardFeatureLockCard {...advancedAnalyticsLockProps(entitlements)} />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReportFeatureGate enabled={entitlements.hasAdvancedAnalytics} locked={lockCard}>
        <PaymentMethodChart breakdown={revenue?.paymentMethodBreakdown ?? []} />
      </ReportFeatureGate>

      <ReportFeatureGate enabled={entitlements.hasAdvancedAnalytics} locked={lockCard}>
        <TopItemsTable items={orders?.topItems ?? []} />
      </ReportFeatureGate>

      <ReportFeatureGate
        enabled={entitlements.hasAdvancedAnalytics}
        locked={<div className="lg:col-span-2">{lockCard}</div>}
      >
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Thanh toán gần đây</CardTitle>
            <CardDescription>Đối soát nhanh các khoản đã ghi nhận trong kỳ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(revenue?.recentPayments ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">Chưa có thanh toán trong kỳ.</p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {(revenue?.recentPayments ?? []).slice(0, 5).map((row) => (
                  <li key={row.paymentId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span>
                      {row.billReference} · {methodLabel(row.method)}
                    </span>
                    <span className="font-medium tabular-nums">{formatVnd(row.collectedVnd)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </ReportFeatureGate>
    </div>
  );
}
