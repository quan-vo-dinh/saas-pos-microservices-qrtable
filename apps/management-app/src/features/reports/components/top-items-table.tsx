'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatVnd } from '@/lib/format-vnd';
import { ReportEmptyState } from './report-state';

type Props = {
  items: Array<{ menuItemName: string; quantity: number; revenueVnd: number }>;
};

export function TopItemsTable({ items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Món bán chạy</CardTitle>
        <CardDescription>Theo số lượng và doanh thu trong kỳ</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {items.length === 0 ? (
          <ReportEmptyState message="Chưa có món nào được ghi nhận trong kỳ." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Món</TableHead>
                <TableHead className="text-right">SL</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.menuItemName}>
                  <TableCell>{item.menuItemName}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(item.revenueVnd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
