'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatVnd } from '@/lib/format-vnd';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ReportEmptyState } from './report-state';

type Point = { label: string; grossSalesVnd: number; collectedVnd?: number; platformRevenueVnd?: number };

type Props = {
  title: string;
  description: string;
  dataKey: 'grossSalesVnd' | 'platformRevenueVnd';
  series: Point[];
};

const chartConfig = {
  grossSalesVnd: { label: 'Doanh thu bán hàng', color: 'hsl(var(--chart-1))' },
  platformRevenueVnd: { label: 'Doanh thu nền tảng', color: 'hsl(var(--chart-2))' },
};

export function RevenueTrendChart({ title, description, dataKey, series }: Props) {
  const hasData = series.some((row) => (row[dataKey] ?? 0) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <ReportEmptyState message="Không có giao dịch trong khoảng thời gian đã chọn." />
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
            <BarChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} width={48} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value) => formatVnd(Number(value))} />
                }
              />
              <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
