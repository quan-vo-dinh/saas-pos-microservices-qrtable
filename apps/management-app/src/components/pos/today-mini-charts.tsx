'use client';

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';
import { useDashboardEntitlements } from '@/features/reports/hooks/use-dashboard-entitlements';
import { useTenantOrderReport, useTenantRevenueReport } from '@/features/reports/hooks/use-report-query';
import { buildTodayReportQuery } from '@/features/reports/utils/default-report-query';
import { formatVnd } from '@/lib/format-vnd';

const TABLE_STATUS_COLORS: Record<string, string> = {
  available: 'hsl(160 60% 40%)',
  occupied: 'hsl(45 90% 45%)',
  billing: 'hsl(0 70% 50%)',
  cleaning: 'hsl(210 70% 50%)',
};

export function TodayMiniCharts() {
  const todayQuery = useMemo(() => buildTodayReportQuery(), []);
  const { entitlements } = useDashboardEntitlements();
  const reportEnabled = entitlements.hasBasicAnalytics;

  const tablesQuery = useTablesQuery();
  const revenue = useTenantRevenueReport(todayQuery, { enabled: reportEnabled });
  const orders = useTenantOrderReport(todayQuery, { enabled: reportEnabled });

  const { lineData, barData, pieData } = useMemo(() => {
    const line = (revenue.data?.revenueSeries ?? []).map((row) => ({
      t: row.label,
      v: row.collectedVnd,
    }));

    const bar = (orders.data?.topItems ?? []).slice(0, 5).map((row) => ({
      name: row.menuItemName.length > 12 ? `${row.menuItemName.slice(0, 12)}…` : row.menuItemName,
      c: row.quantity,
    }));

    const tables = tablesQuery.data ?? [];
    const statusCount = {
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      billing: tables.filter((t) => t.status === 'billing').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
    };
    const pie = [
      { name: 'Trống', value: statusCount.available, fill: TABLE_STATUS_COLORS.available },
      { name: 'Có khách', value: statusCount.occupied, fill: TABLE_STATUS_COLORS.occupied },
      { name: 'Thanh toán', value: statusCount.billing, fill: TABLE_STATUS_COLORS.billing },
      { name: 'Dọn', value: statusCount.cleaning, fill: TABLE_STATUS_COLORS.cleaning },
    ].filter((row) => row.value > 0);

    return { lineData: line, barData: bar, pieData: pie };
  }, [orders.data?.topItems, revenue.data?.revenueSeries, tablesQuery.data]);

  return (
    <Collapsible defaultOpen className="group/collapsible w-full min-w-0">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex h-8 w-full min-w-0 items-center justify-between gap-1 px-2 text-xs font-medium"
        >
          <span className="truncate">Hôm nay</span>
          <ChevronDown className="size-4 shrink-0 transition group-data-[state=open]/collapsible:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="min-w-0 px-1 pb-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="h-24 w-full min-w-0 min-h-24">
            <p className="mb-0.5 text-[0.6rem] text-muted-foreground">Doanh thu hôm nay</p>
            {!reportEnabled ? (
              <p className="flex h-20 items-center justify-center text-center text-[0.65rem] text-muted-foreground">
                Cần gói có báo cáo cơ bản.
              </p>
            ) : revenue.isLoading ? (
              <p className="flex h-20 items-center justify-center text-[0.65rem] text-muted-foreground">Đang tải…</p>
            ) : lineData.length === 0 ? (
              <p className="flex h-20 items-center justify-center text-[0.65rem] text-muted-foreground">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={lineData} margin={{ top: 2, right: 2, left: -18, bottom: 0 }}>
                  <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => formatVnd(Number(v))} />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="h-24 w-full min-w-0 min-h-24">
            <p className="mb-0.5 text-[0.6rem] text-muted-foreground">Top món hôm nay</p>
            {!reportEnabled ? (
              <p className="flex h-20 items-center justify-center text-center text-[0.65rem] text-muted-foreground">
                Cần gói có báo cáo cơ bản.
              </p>
            ) : orders.isLoading ? (
              <p className="flex h-20 items-center justify-center text-[0.65rem] text-muted-foreground">Đang tải…</p>
            ) : barData.length === 0 ? (
              <p className="flex h-20 items-center justify-center text-[0.65rem] text-muted-foreground">Chưa có đơn.</p>
            ) : (
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="c" fill="hsl(var(--accent))" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="h-28 w-full min-w-0 min-h-28">
            <p className="mb-0.5 text-[0.6rem] text-muted-foreground">Trạng thái bàn</p>
            {tablesQuery.isLoading ? (
              <p className="flex h-24 items-center justify-center text-[0.65rem] text-muted-foreground">Đang tải…</p>
            ) : pieData.length === 0 ? (
              <p className="flex h-24 items-center justify-center text-[0.65rem] text-muted-foreground">Chưa có bàn.</p>
            ) : (
              <ResponsiveContainer width="100%" height={96}>
                <PieChart>
                  <Tooltip />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={22} outerRadius={40} paddingAngle={2}>
                    {pieData.map((e) => (
                      <Cell key={e.name} fill={e.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
