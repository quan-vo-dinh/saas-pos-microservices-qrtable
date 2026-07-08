'use client';

import { planFeatureVi, subscriptionStatusVi, tenantStatusVi } from '@einvoice/shared-constants';
import { useMemo, useState } from 'react';
import { formatVnd } from '@/lib/format-vnd';
import { saasService } from '@/features/saas/services/saas.service';
import { saasKeys } from '@/features/saas/saas-keys';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  useAdminTenantOrderReport,
  useAdminTenantRevenueReport,
  useAdminTenantTableReport,
} from '../hooks/use-report-query';
import { reportsKeys } from '../reports-keys';
import type { ReportRangeQuery } from '../types';
import { ReportMetricCard } from './report-metric-card';
import { RevenueTrendChart } from './revenue-trend-chart';
import { TopItemsTable } from './top-items-table';
import { TableStatusSummary } from './table-status-summary';

type Props = {
  query: ReportRangeQuery;
};

export function TenantDrilldownPanel({ query }: Props) {
  const [tenantId, setTenantId] = useState<string>('');
  const tenantsQuery = useQuery({
    queryKey: reportsKeys.adminTenantOptions(),
    queryFn: () => saasService.listAdminTenants({ page: 1, limit: 50 }),
  });

  const selectedTenant = useMemo(
    () => tenantsQuery.data?.items.find((t) => t.id === tenantId),
    [tenantId, tenantsQuery.data?.items],
  );

  const plansQuery = useQuery({
    queryKey: saasKeys.plans(),
    queryFn: () => saasService.listPlansAdmin(),
  });

  const tenantPlanFeatures = useMemo(() => {
    if (!selectedTenant?.planCode) {
      return [];
    }
    return plansQuery.data?.find((plan) => plan.code === selectedTenant.planCode)?.features ?? [];
  }, [plansQuery.data, selectedTenant]);

  const revenue = useAdminTenantRevenueReport(tenantId || undefined, query);
  const orders = useAdminTenantOrderReport(tenantId || undefined, query);
  const tables = useAdminTenantTableReport(tenantId || undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drilldown doanh thu nhà hàng</CardTitle>
        <CardDescription>
          Chọn đơn vị thuê bao để xem doanh thu bán hàng — khác với doanh thu subscription ở trên.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={tenantId} onValueChange={setTenantId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Chọn đơn vị thuê bao" />
          </SelectTrigger>
          <SelectContent>
            {(tenantsQuery.data?.items ?? []).map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenantStatusVi(tenant.status)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTenant ? (
          <Alert>
            <AlertTitle>Đang xem: {selectedTenant.name}</AlertTitle>
            <AlertDescription className="space-y-1">
              <span className="block">Slug: {selectedTenant.slug}</span>
              {selectedTenant.planCode ? (
                <span className="block">
                  Gói: <strong>{selectedTenant.planCode}</strong>
                  {selectedTenant.subscriptionStatus
                    ? ` · ${subscriptionStatusVi(selectedTenant.subscriptionStatus)}`
                    : ''}
                </span>
              ) : null}
              <span className="block text-xs">
                Trên dashboard của đơn vị: báo cáo cơ bản{' '}
                {selectedTenant.planCode === 'FREE' ? 'bị khóa' : 'có thể mở tùy tính năng gói'} — Super Admin vẫn
                xem chi tiết được.
              </span>
              {tenantPlanFeatures.length > 0 ? (
                <span className="block text-xs">
                  Tính năng gói: {tenantPlanFeatures.map((f) => planFeatureVi(f)).join(', ')}
                </span>
              ) : selectedTenant.planCode && plansQuery.isLoading ? (
                <span className="block text-xs text-muted-foreground">Đang tải feature gói…</span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {tenantId && revenue.data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReportMetricCard title="Doanh thu bán hàng" value={formatVnd(revenue.data.summary.grossSalesVnd)} />
              <ReportMetricCard title="Thanh toán đã ghi nhận" value={String(revenue.data.summary.paidPaymentCount)} />
            </div>
            <RevenueTrendChart
              title="Xu hướng doanh thu bán hàng"
              description="Thanh toán nhà hàng của đơn vị đã chọn"
              dataKey="grossSalesVnd"
              series={revenue.data.revenueSeries}
            />
            <TopItemsTable items={orders.data?.topItems ?? []} />
            {tables.data ? (
              <TableStatusSummary
                summary={tables.data.summary}
                tableStatusBreakdown={tables.data.tableStatusBreakdown}
              />
            ) : null}
          </>
        ) : null}

        {!tenantId ? (
          <p className="text-muted-foreground text-sm">Chọn tenant để tải báo cáo sales drilldown.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
