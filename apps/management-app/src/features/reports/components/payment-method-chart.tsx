'use client';

import { paymentMethodVi } from '@einvoice/shared-constants';
import { PaymentMethod } from '@einvoice/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatVnd } from '@/lib/format-vnd';
import { Cell, Pie, PieChart } from 'recharts';
import { ReportEmptyState } from './report-state';

type Props = {
  breakdown: Array<{ method: string; grossSalesVnd: number }>;
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

function methodLabel(method: string): string {
  if (method === PaymentMethod.CASH || method === PaymentMethod.VIETQR) {
    return paymentMethodVi(method);
  }
  return method === 'UNKNOWN' ? 'Khác' : method;
}

export function PaymentMethodChart({ breakdown }: Props) {
  const data = breakdown
    .filter((row) => row.grossSalesVnd > 0)
    .map((row) => ({ name: methodLabel(row.method), value: row.grossSalesVnd }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phương thức thanh toán</CardTitle>
        <CardDescription>Tiền mặt so với VietQR/SePay</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ReportEmptyState message="Chưa có thanh toán theo phương thức trong kỳ." />
        ) : (
          <ChartContainer config={{ value: { label: 'Doanh thu' } }} className="mx-auto min-h-[240px] max-w-md">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatVnd(Number(v))} />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
