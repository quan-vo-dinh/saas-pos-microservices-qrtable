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
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  const deactivate = useMutation({
    mutationFn: (id: string) => saasApi.deletePlan(id),
    onSuccess: async () => {
      toast.success('Đã vô hiệu hóa gói');
      await qc.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.serverMessage : 'Thao tác thất bại'),
  });

  const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
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
              <TableCell>{row.billingPeriod}</TableCell>
              <TableCell>{formatQuota(row.maxTables)}</TableCell>
              <TableCell>{formatQuota(row.maxStaff)}</TableCell>
              <TableCell>{formatQuota(row.maxOrdersPerDay)}</TableCell>
              <TableCell>
                <Badge variant={row.isActive ? 'default' : 'secondary'}>{row.isActive ? 'On' : 'Off'}</Badge>
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
                    {hasPermission(permissions, phase4bPermissions.planDelete) ? (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (window.confirm('Vô hiệu hóa gói này? (Không xóa cứng nếu còn lịch sử đăng ký)')) {
                            deactivate.mutate(row.id);
                          }
                        }}
                      >
                        Vô hiệu hóa
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
  );
}
