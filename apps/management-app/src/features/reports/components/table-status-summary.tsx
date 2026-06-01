'use client';

import { tableStatusVi } from '@einvoice/shared-constants';
import type { TableStatus } from '@einvoice/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportEmptyState } from './report-state';

type Props = {
  summary: {
    totalTables: number;
    availableTables: number;
    occupiedTables: number;
    unavailableTables: number;
    totalMenuItems: number;
    activeMenuItems: number;
    outOfStockItems: number;
  };
  tableStatusBreakdown: Array<{ status: string; count: number }>;
};

export function TableStatusSummary({ summary, tableStatusBreakdown }: Props) {
  if (summary.totalTables === 0 && summary.totalMenuItems === 0) {
    return <ReportEmptyState message="Chưa có bàn hoặc món trong catalog." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bàn & thực đơn</CardTitle>
        <CardDescription>Trạng thái hiện tại từ Catalog</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Bàn trống</p>
            <p className="text-lg font-semibold tabular-nums">{summary.availableTables}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Đang phục vụ</p>
            <p className="text-lg font-semibold tabular-nums">{summary.occupiedTables}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Món hết hàng</p>
            <p className="text-lg font-semibold tabular-nums">{summary.outOfStockItems}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tableStatusBreakdown.map((row) => (
            <Badge key={row.status} variant="secondary">
              {tableStatusVi(row.status as TableStatus)}: {row.count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
