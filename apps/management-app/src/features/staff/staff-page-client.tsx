'use client';

import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { CreateStaffDialog } from './components/create-staff-dialog';
import { StaffFilters } from './components/staff-filters';
import { StaffTable } from './components/staff-table';
import { useStaffListQuery } from './hooks/use-staff-query';
import type { StaffListQuery } from './types';

function isOwnerRole(roles: string[]): boolean {
  return roles.some((role) => role.toUpperCase() === 'OWNER');
}

export function StaffPageClient() {
  const [query, setQuery] = useState<StaffListQuery>({ page: 1, limit: 20 });
  const profile = useAuthStore((state) => state.profile);
  const currentRoles = useMemo(() => profile?.roles ?? [], [profile?.roles]);
  const isOwner = useMemo(() => isOwnerRole(currentRoles), [currentRoles]);

  const { data, isLoading, isError, error, refetch } = useStaffListQuery(query);
  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nhân viên</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý tài khoản nhân viên trong tenant — tạo, lọc, đổi vai trò và trạng thái.
          </p>
        </div>
        <CreateStaffDialog currentRoles={currentRoles} />
      </div>

      <StaffFilters query={query} onQueryChange={setQuery} />

      {isError && !data ? (
        <p className="text-destructive text-sm">{(error as Error).message}</p>
      ) : null}

      <StaffTable
        items={items}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        isOwner={isOwner}
        onRetry={() => void refetch()}
      />

      {data ? (
        <p className="text-muted-foreground text-sm">
          Hiển thị {items.length} / {data.total} nhân viên
        </p>
      ) : null}
    </div>
  );
}
