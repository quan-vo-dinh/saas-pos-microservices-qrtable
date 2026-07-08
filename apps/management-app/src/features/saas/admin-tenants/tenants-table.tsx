'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Textarea,
} from '@einvoice/frontend-ui';
import { ApiError } from '@einvoice/frontend-utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ROUTES } from '@/constants/routes';
import { saasService } from '@/features/saas/services/saas.service';
import { formatDateTime } from '@/features/saas/formatters';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import { saasKeys } from '@/features/saas/saas-keys';
import type { TenantListItem } from '@/features/saas/types';
import { TenantStatusBadge } from '@/features/saas/components/badges';

type TenantsTableProps = {
  data: TenantListItem[];
  loading: boolean;
  error: Error | null;
  permissions: string[];
  page: number;
  totalPages: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
};

export function TenantsTable({
  data,
  loading,
  error,
  permissions,
  page,
  totalPages,
  onRetry,
  onPageChange,
}: TenantsTableProps) {
  const qc = useQueryClient();
  const [suspendTarget, setSuspendTarget] = useState<TenantListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const statusMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'SUSPEND' | 'ACTIVATE'; reason?: string }) => {
      if (action === 'SUSPEND') {
        await saasService.updateTenantStatus(id, { action: 'SUSPEND', reason });
      } else {
        await saasService.updateTenantStatus(id, { action: 'ACTIVATE' });
      }
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật trạng thái tenant');
      setSuspendTarget(null);
      setSuspendReason('');
      await qc.invalidateQueries({ queryKey: saasKeys.tenants() });
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Cập nhật thất bại';
      toast.error(msg);
    },
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Không tải được danh sách</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span>{error.message}</span>
          <UiButton type="button" variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </UiButton>
        </AlertDescription>
      </Alert>
    );
  }

  if (!loading && !data.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Chưa có tenant phù hợp.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Chủ</TableHead>
              <TableHead>Gói</TableHead>
              <TableHead>Hết hạn</TableHead>
              <TableHead>Tạo lúc</TableHead>
              <TableHead className="w-12 text-end"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.map((row) => (
                  <TableRow key={row.id} className="h-12">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-muted-foreground text-xs">{row.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TenantStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {row.ownerName ?? row.ownerEmail ?? '—'}
                      {row.ownerName && row.ownerEmail ? (
                        <span className="text-muted-foreground block truncate text-xs">{row.ownerEmail}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{row.planCode ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.expiresAt)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="size-8 p-0">
                            <span className="sr-only">Thao tác</span>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={ROUTES.ADMIN_TENANT_DETAIL(row.id)}>Xem chi tiết</Link>
                          </DropdownMenuItem>
                          {row.status === 'ACTIVE' && hasPermission(permissions, phase4bPermissions.tenantSuspend) ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setSuspendTarget(row);
                              }}
                            >
                              Tạm khóa
                            </DropdownMenuItem>
                          ) : null}
                          {row.status === 'SUSPENDED' &&
                          hasPermission(permissions, phase4bPermissions.tenantActivate) ? (
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, action: 'ACTIVATE' })}>
                              Kích hoạt lại
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <UiButton type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Trước
        </UiButton>
        <span className="text-muted-foreground text-sm">
          Trang {page} / {Math.max(totalPages, 1)}
        </span>
        <UiButton
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
        </UiButton>
      </div>

      <Dialog open={Boolean(suspendTarget)} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạm khóa tenant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <p className="text-muted-foreground text-sm">
              Tenant: <span className="text-foreground font-medium">{suspendTarget?.name}</span>
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="suspend-reason">Lý do (tuỳ chọn)</Label>
              <Textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <UiButton type="button" variant="outline" onClick={() => setSuspendTarget(null)}>
              Hủy
            </UiButton>
            <UiButton
              type="button"
              variant="destructive"
              disabled={!suspendTarget || statusMutation.isPending}
              onClick={() => {
                if (!suspendTarget) {
                  return;
                }
                statusMutation.mutate({
                  id: suspendTarget.id,
                  action: 'SUSPEND',
                  reason: suspendReason.trim() || undefined,
                });
              }}
            >
              Xác nhận tạm khóa
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
