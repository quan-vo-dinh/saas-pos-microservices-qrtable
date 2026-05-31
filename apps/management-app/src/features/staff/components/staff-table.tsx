'use client';

import { useState } from 'react';
import { staffRoleVi, staffStatusVi, type StaffStatusLabel } from '@einvoice/shared-constants';
import { Badge } from '@einvoice/frontend-ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/features/saas/formatters';
import { cn } from '@/lib/utils';
import type { StaffProfile } from '../types';
import { ChangeStaffRoleDialog } from './change-staff-role-dialog';
import { StaffStatusDialog } from './staff-status-dialog';

function staffStatusKey(profile: StaffProfile): StaffStatusLabel {
  return profile.isActive ? 'ACTIVE' : 'DISABLED';
}

const statusStyles: Record<StaffStatusLabel, string> = {
  ACTIVE: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  DISABLED: 'bg-muted text-muted-foreground',
};

type StaffTableProps = {
  items: StaffProfile[];
  loading: boolean;
  error: Error | null;
  isOwner: boolean;
  onRetry: () => void;
};

export function StaffTable({ items, loading, error, isOwner, onRetry }: StaffTableProps) {
  const [roleTarget, setRoleTarget] = useState<StaffProfile | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ staff: StaffProfile; action: 'enable' | 'disable' } | null>(
    null,
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Không tải được danh sách nhân viên</AlertTitle>
        <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span>{error.message}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!loading && !items.length) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Chưa có nhân viên phù hợp.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Tham gia</TableHead>
              {isOwner ? <TableHead className="w-48 text-end">Thao tác</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell colSpan={isOwner ? 6 : 5}>
                      <div className="bg-muted h-4 w-full animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((row) => {
                  const status = staffStatusKey(row);
                  return (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.displayName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{staffRoleVi(row.roleName)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(statusStyles[status])}>
                          {staffStatusVi(status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.createdAt)}</TableCell>
                      {isOwner ? (
                        <TableCell className="text-end">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setRoleTarget(row)}
                            >
                              Đổi vai trò
                            </Button>
                            {row.isActive ? (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => setStatusTarget({ staff: row, action: 'disable' })}
                              >
                                Vô hiệu hóa
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setStatusTarget({ staff: row, action: 'enable' })}
                              >
                                Kích hoạt
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      <ChangeStaffRoleDialog
        staff={roleTarget}
        open={Boolean(roleTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRoleTarget(null);
          }
        }}
      />

      <StaffStatusDialog
        staff={statusTarget?.staff ?? null}
        action={statusTarget?.action ?? 'disable'}
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setStatusTarget(null);
          }
        }}
      />
    </>
  );
}
