'use client';

import { useMemo, useState } from 'react';
import { formatVnd } from '@/lib/format-vnd';
import { PaymentMethodChart } from './components/payment-method-chart';
import { ReportMetricCard } from './components/report-metric-card';
import { ReportErrorState, ReportLoadingGrid } from './components/report-state';
import { ReportRangeFilter } from './components/report-range-filter';
import { RevenueTrendChart } from './components/revenue-trend-chart';
import { TableStatusSummary } from './components/table-status-summary';
import { TopItemsTable } from './components/top-items-table';
import { buildDefaultReportQuery } from './utils/default-report-query';
import { useTenantOrderReport, useTenantRevenueReport, useTenantTableReport } from './hooks/use-report-query';
import type { ReportRangeQuery } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { billStatusVi } from '@einvoice/shared-constants';
import { BillStatus } from '@einvoice/types';

export function TenantDashboardClient() {
  const [query, setQuery] = useState<ReportRangeQuery>(() => buildDefaultReportQuery());
  const revenue = useTenantRevenueReport(query);
  const orders = useTenantOrderReport(query);
  const tables = useTenantTableReport();

  const revenueSeries = useMemo(
    () =>
      (revenue.data?.revenueSeries ?? []).map((row) => ({
        label: row.label,
        grossSalesVnd: row.grossSalesVnd,
      })),
    [revenue.data],
  );

  const anyLoading = revenue.isLoading || orders.isLoading || tables.isLoading;
  const revenueError = revenue.isError ? 'Doanh thu' : null;
  const ordersError = orders.isError ? 'Đơn hàng' : null;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Doanh thu bán hàng và vận hành nhà hàng</p>
        </div>
        <ReportRangeFilter value={query} onChange={setQuery} />
      </div>

      {anyLoading ? <ReportLoadingGrid /> : null}

      {revenueError ? (
        <ReportErrorState message={`Không tải báo cáo ${revenueError}.`} onRetry={() => revenue.refetch()} />
      ) : null}
      {ordersError ? (
        <ReportErrorState message={`Không tải báo cáo ${ordersError}.`} onRetry={() => orders.refetch()} />
      ) : null}

      {!anyLoading && revenue.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetricCard title="Doanh thu bán hàng" value={formatVnd(revenue.data.summary.grossSalesVnd)} />
          <ReportMetricCard title="Đã thu" value={formatVnd(revenue.data.summary.collectedVnd)} />
          <ReportMetricCard
            title="Thanh toán đã ghi nhận"
            value={String(revenue.data.summary.paidPaymentCount)}
          />
          <ReportMetricCard
            title="Giá trị TB / thanh toán"
            value={formatVnd(revenue.data.summary.averagePaidPaymentVnd)}
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
        <PaymentMethodChart breakdown={revenue.data?.paymentMethodBreakdown ?? []} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopItemsTable items={orders.data?.topItems ?? []} />
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
              {orders.data.summary.paidBillCount} đã thanh toán · {orders.data.summary.pendingBillCount} chờ thanh toán
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
    </div>
  );
}
