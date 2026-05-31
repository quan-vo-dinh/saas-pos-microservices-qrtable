'use client';

import { staffRoleVi, staffStatusVi } from '@einvoice/shared-constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StaffListQuery, StaffRoleName, StaffStatus } from '../types';

const ROLE_OPTIONS: { value: StaffRoleName; label: string }[] = [
  { value: 'MANAGER', label: staffRoleVi('MANAGER') },
  { value: 'WAITER', label: staffRoleVi('WAITER') },
  { value: 'CHEF', label: staffRoleVi('CHEF') },
  { value: 'BARISTA', label: staffRoleVi('BARISTA') },
];

const STATUS_OPTIONS: { value: StaffStatus; label: string }[] = [
  { value: 'ACTIVE', label: staffStatusVi('ACTIVE') },
  { value: 'DISABLED', label: staffStatusVi('DISABLED') },
];

type StaffFiltersProps = {
  query: StaffListQuery;
  onQueryChange: (query: StaffListQuery) => void;
};

export function StaffFilters({ query, onQueryChange }: StaffFiltersProps) {
  const patch = (patchQuery: Partial<StaffListQuery>) => {
    onQueryChange({ ...query, page: 1, ...patchQuery });
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="grid w-full gap-1.5 md:w-72">
        <Label htmlFor="staff-search">Tìm kiếm</Label>
        <Input
          id="staff-search"
          className="w-full md:w-72"
          placeholder="Tên, email…"
          value={query.search ?? ''}
          onChange={(e) => patch({ search: e.target.value || undefined })}
        />
      </div>
      <div className="grid w-full gap-1.5 md:w-44">
        <Label htmlFor="staff-role-filter">Vai trò</Label>
        <Select
          value={query.roleName ?? 'ALL'}
          onValueChange={(v) => patch({ roleName: v === 'ALL' ? undefined : (v as StaffRoleName) })}
        >
          <SelectTrigger id="staff-role-filter" className="w-full md:w-44">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả vai trò</SelectItem>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid w-full gap-1.5 md:w-44">
        <Label htmlFor="staff-status-filter">Trạng thái</Label>
        <Select
          value={query.status ?? 'ALL'}
          onValueChange={(v) => patch({ status: v === 'ALL' ? undefined : (v as StaffStatus) })}
        >
          <SelectTrigger id="staff-status-filter" className="w-full md:w-44">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
