'use client';

import { Banknote, ClipboardList, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatVnd } from '@/lib/format-vnd';
import { billStatusVi } from '@einvoice/shared-constants';
import { BillStatus } from '@einvoice/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdvancedInsightsSection } from './components/advanced-insights-section';
import {
  DashboardFeatureLockCard,
  basicAnalyticsLockProps,
} from './components/dashboard-feature-lock-card';
import { DashboardPlanOverviewCard } from './components/dashboard-plan-overview-card';
import { InsightMetricCard } from './components/insight-metric-card';
import { ReportFeatureGate } from './components/report-feature-gate';
import { ReportErrorState, ReportLoadingGrid } from './components/report-state';
import { ReportRangeFilter } from './components/report-range-filter';
import { RevenueTrendChart } from './components/revenue-trend-chart';
import { TableStatusSummary } from './components/table-status-summary';
import { useDashboardEntitlements } from './hooks/use-dashboard-entitlements';
import { useTenantOrderReport, useTenantRevenueReport, useTenantTableReport } from './hooks/use-report-query';
import { buildDefaultReportQuery } from './utils/default-report-query';
import type { ReportRangeQuery } from './types';

export function TenantDashboardClient() {
  const { entitlements, subscription, isLoading: subscriptionLoading } = useDashboardEntitlements();
  const [query, setQuery] = useState<ReportRangeQuery>(() => buildDefaultReportQuery());

  const reportEnabled = entitlements.hasBasicAnalytics;
  const revenue = useTenantRevenueReport(query, { enabled: reportEnabled });
  const orders = useTenantOrderReport(query, { enabled: reportEnabled });
  const tables = useTenantTableReport({ enabled: reportEnabled });

  const revenueSeries = useMemo(
    () =>
      (revenue.data?.revenueSeries ?? []).map((row) => ({
        label: row.label,
        grossSalesVnd: row.grossSalesVnd,
      })),
    [revenue.data],
  );

  const anyReportLoading = reportEnabled && (revenue.isLoading || orders.isLoading || tables.isLoading);
  const basicLock = <DashboardFeatureLockCard {...basicAnalyticsLockProps(entitlements)} />;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Tổng quan gói, hạn mức và báo cáo vận hành</p>
        </div>
        {reportEnabled ? (
          <ReportRangeFilter
            value={query}
            onChange={setQuery}
            canUseExtendedRange={entitlements.canUseExtendedRange}
          />
        ) : null}
      </div>

      <DashboardPlanOverviewCard
        subscription={subscription}
        entitlements={entitlements}
        loading={subscriptionLoading}
      />

      <ReportFeatureGate enabled={reportEnabled} locked={basicLock}>
        {anyReportLoading ? <ReportLoadingGrid /> : null}

        {revenue.isError ? (
          <ReportErrorState message="Không tải báo cáo doanh thu." onRetry={() => revenue.refetch()} />
        ) : null}
        {orders.isError ? (
          <ReportErrorState message="Không tải báo cáo đơn hàng." onRetry={() => orders.refetch()} />
        ) : null}

        {!anyReportLoading && revenue.data ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InsightMetricCard
              title="Doanh thu bán hàng"
              value={formatVnd(revenue.data.summary.grossSalesVnd)}
              icon={Wallet}
              badge="Doanh thu"
            />
            <InsightMetricCard
              title="Đã thu"
              value={formatVnd(revenue.data.summary.collectedVnd)}
              icon={Banknote}
              badge="Thu tiền"
            />
            <InsightMetricCard
              title="Thanh toán đã ghi nhận"
              value={String(revenue.data.summary.paidPaymentCount)}
              icon={ClipboardList}
            />
            <InsightMetricCard
              title="Giá trị TB / thanh toán"
              value={formatVnd(revenue.data.summary.averagePaidPaymentVnd)}
              icon={TrendingUp}
            />
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <RevenueTrendChart
            title="Xu hướng doanh thu bán hàng"
            description="Theo thời gian thanh toán (paidAt)"
            dataKey="grossSalesVnd"
            series={revenueSeries}
          />
          {tables.data ? (
            <TableStatusSummary
              summary={tables.data.summary}
              tableStatusBreakdown={tables.data.tableStatusBreakdown}
            />
          ) : tables.isError ? (
            <ReportErrorState message="Không tải báo cáo bàn/thực đơn." onRetry={() => tables.refetch()} />
          ) : null}
        </div>

        {orders.data ? (
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái hóa đơn</CardTitle>
              <CardDescription>
                {orders.data.summary.paidBillCount} đã thanh toán · {orders.data.summary.pendingBillCount} chờ thanh
                toán
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {orders.data.billStatusBreakdown.map((row) => (
                <Badge key={row.status} variant="outline">
                  {row.status in BillStatus ? billStatusVi(row.status as BillStatus) : row.status}: {row.count}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </ReportFeatureGate>

      {!reportEnabled ? <div className="grid gap-4 lg:grid-cols-2">{basicLock}</div> : null}

      <AdvancedInsightsSection entitlements={entitlements} revenue={revenue.data} orders={orders.data} />
    </div>
  );
}
