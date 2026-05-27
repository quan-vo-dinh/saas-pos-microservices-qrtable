'use client';

import { Button } from '@/components/ui/button';
import { planFeatureVi } from '@einvoice/shared-constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatQuota, formatVnd } from '@/features/saas/formatters';
import type { BillingPeriod, PricingPlan } from '@/features/saas/types';

type PlanCompareTableProps = {
  plans: PricingPlan[];
  currentPlanCode?: string | null;
  billingPeriod: BillingPeriod;
  onCheckout: (planCode: string) => void;
  busyCode: string | null;
};

export function PlanCompareTable({
  plans,
  currentPlanCode,
  billingPeriod,
  onCheckout,
  busyCode,
}: PlanCompareTableProps) {
  const rows = [...plans].filter((p) => p.isActive).sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gói</TableHead>
            <TableHead>Giá ({billingPeriod === 'MONTHLY' ? 'tháng' : 'năm'})</TableHead>
            <TableHead>Bàn</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Đơn/ngày</TableHead>
            <TableHead>Tính năng</TableHead>
            <TableHead className="text-end">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const isCurrent = currentPlanCode === p.code;
            const isFree = p.code === 'FREE';
            const featureLabels = p.features?.map(planFeatureVi).join(', ') || '—';
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{formatVnd(p.priceVnd)}</TableCell>
                <TableCell>{formatQuota(p.maxTables)}</TableCell>
                <TableCell>{formatQuota(p.maxStaff)}</TableCell>
                <TableCell>{formatQuota(p.maxOrdersPerDay)}</TableCell>
                <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                  {featureLabels}
                </TableCell>
                <TableCell className="text-end">
                  {isCurrent ? (
                    <Button size="sm" variant="secondary" disabled>
                      Đang dùng
                    </Button>
                  ) : isFree ? (
                    <Button size="sm" variant="outline" disabled title="Phase 4B — liên hệ admin để hạ gói">
                      Liên hệ admin
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={busyCode === p.code}
                      onClick={() => onCheckout(p.code)}
                    >
                      {busyCode === p.code ? 'Đang tạo…' : 'Thanh toán'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
