'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@einvoice/frontend-ui';
import { ApiError } from '@einvoice/frontend-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { billingPeriodVi } from '@einvoice/shared-constants';
import { saasApi } from '@/features/saas/api';
import { formatQuota, formatVnd } from '@/features/saas/formatters';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import type { PricingPlan } from '@/features/saas/types';

type PlansTableProps = {
  data: PricingPlan[];
  permissions: string[];
  onEdit: (plan: PricingPlan) => void;
};

export function PlansTable({ data, permissions, onEdit }: PlansTableProps) {
  const qc = useQueryClient();
  const [statusTarget, setStatusTarget] = useState<{ plan: PricingPlan; nextActive: boolean } | null>(null);
  const updateStatus = useMutation({
    mutationFn: ({ plan, nextActive }: { plan: PricingPlan; nextActive: boolean }) =>
      nextActive ? saasApi.updatePlan(plan.id, { isActive: true }) : saasApi.deletePlan(plan.id),
    onSuccess: async (_data, variables) => {
      toast.success(variables.nextActive ? 'Đã bán lại gói' : 'Đã ngừng bán gói');
      setStatusTarget(null);
      await qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.serverMessage : 'Thao tác thất bại'),
  });

  const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
  const canDeactivate = hasPermission(permissions, phase4bPermissions.planDelete);
  const canReactivate = hasPermission(permissions, phase4bPermissions.planUpdate);

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Chu kỳ</TableHead>
              <TableHead>Bàn</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Đơn/ngày</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.displayOrder}</TableCell>
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{formatVnd(row.priceVnd)}</TableCell>
                <TableCell>{billingPeriodVi(row.billingPeriod)}</TableCell>
                <TableCell>{formatQuota(row.maxTables)}</TableCell>
                <TableCell>{formatQuota(row.maxStaff)}</TableCell>
                <TableCell>{formatQuota(row.maxOrdersPerDay)}</TableCell>
                <TableCell>
                  <Badge variant={row.isActive ? 'default' : 'secondary'}>{row.isActive ? 'Đang bán' : 'Ngừng bán'}</Badge>
                </TableCell>
                <TableCell className="text-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasPermission(permissions, phase4bPermissions.planUpdate) ? (
                        <DropdownMenuItem onClick={() => onEdit(row)}>Sửa</DropdownMenuItem>
                      ) : null}
                      {(row.isActive ? canDeactivate : canReactivate) ? (
                        <DropdownMenuItem
                          className={row.isActive ? 'text-destructive' : undefined}
                          onClick={() => setStatusTarget({ plan: row, nextActive: !row.isActive })}
                        >
                          {row.isActive ? 'Ngừng bán' : 'Bán lại'}
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusTarget?.nextActive ? 'Bán lại gói' : 'Ngừng bán gói'}</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.nextActive
                ? `Gói ${statusTarget.plan.code} sẽ xuất hiện lại trong onboarding và gán subscription mới.`
                : `Gói ${statusTarget?.plan.code ?? ''} sẽ ẩn khỏi onboarding và gán subscription mới. Lịch sử đăng ký hiện có vẫn được giữ nguyên.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant={statusTarget?.nextActive ? 'default' : 'destructive'}
              disabled={!statusTarget || updateStatus.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!statusTarget) {
                  return;
                }
                updateStatus.mutate(statusTarget);
              }}
            >
              {updateStatus.isPending ? 'Đang lưu...' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
