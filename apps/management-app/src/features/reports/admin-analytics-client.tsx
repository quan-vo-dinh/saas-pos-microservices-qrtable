'use client';

import { invoiceStatusVi, tenantStatusVi } from '@einvoice/shared-constants';
import { useMemo, useState } from 'react';
import { formatVnd } from '@/lib/format-vnd';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportMetricCard } from './components/report-metric-card';
import { ReportErrorState, ReportLoadingGrid } from './components/report-state';
import { ReportRangeFilter } from './components/report-range-filter';
import { RevenueTrendChart } from './components/revenue-trend-chart';
import { TenantDrilldownPanel } from './components/tenant-drilldown-panel';
import { buildDefaultReportQuery } from './utils/default-report-query';
import { usePlatformAnalyticsReport } from './hooks/use-report-query';
import type { ReportRangeQuery } from './types';

export function AdminAnalyticsClient() {
  const [query, setQuery] = useState<ReportRangeQuery>(() => buildDefaultReportQuery());
  const platform = usePlatformAnalyticsReport(query);

  const revenueSeries = useMemo(
    () =>
      (platform.data?.revenueSeries ?? []).map((row) => ({
        label: row.label,
        platformRevenueVnd: row.platformRevenueVnd,
      })),
    [platform.data],
  );

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Analytics</h2>
          <p className="text-muted-foreground">Doanh thu subscription SaaS và sức khỏe tenant</p>
        </div>
        <ReportRangeFilter value={query} onChange={setQuery} />
      </div>

      {platform.isLoading ? <ReportLoadingGrid /> : null}
      {platform.isError ? (
        <ReportErrorState message="Không tải analytics nền tảng." onRetry={() => platform.refetch()} />
      ) : null}

      {platform.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportMetricCard
              title="Platform revenue"
              description="Subscription invoices (paid)"
              value={formatVnd(platform.data.summary.platformRevenueVnd)}
            />
            <ReportMetricCard
              title="Paid invoices"
              value={String(platform.data.summary.paidInvoiceCount)}
            />
            <ReportMetricCard title="Active tenants" value={String(platform.data.summary.activeTenantCount)} />
            <ReportMetricCard title="Suspended tenants" value={String(platform.data.summary.suspendedTenantCount)} />
          </div>

          <RevenueTrendChart
            title="Platform revenue trend"
            description="Subscription revenue — not restaurant sales"
            dataKey="platformRevenueVnd"
            series={revenueSeries}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tenant status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {platform.data.tenantStatusBreakdown.map((row) => (
                  <Badge key={row.status} variant="secondary">
                    {tenantStatusVi(row.status)}:{' '}
                    {row.count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Invoice status</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {platform.data.invoiceStatusBreakdown.map((row) => (
                  <Badge key={row.status} variant="outline">
                    {invoiceStatusVi(row.status)}
                    : {row.count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Plan distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {platform.data.planBreakdown.map((plan) => (
                <div key={plan.planCode} className="flex justify-between gap-4">
                  <span>{plan.planName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {plan.activeSubscriptionCount} active / {plan.tenantCount} tenants
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}

      <TenantDrilldownPanel query={query} />
    </div>
  );
}
