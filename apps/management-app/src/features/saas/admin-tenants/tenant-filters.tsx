'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TenantStatus } from '@/features/saas/types';

const PAGE_SIZES = [10, 20, 50] as const;

type TenantFiltersProps = {
  extraPlanCodes: string[];
};

export function TenantFilters({ extraPlanCodes }: TenantFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [searchDraft, setSearchDraft] = useState(urlSearch);

  useEffect(() => {
    setSearchDraft(urlSearch);
  }, [urlSearch]);

  const status = (searchParams.get('status') ?? '') as TenantStatus | '';
  const planCode = searchParams.get('planCode') ?? '';
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const limit = Number(searchParams.get('limit') ?? '20') || 20;

  const planOptions = useMemo(
    () => Array.from(new Set([...extraPlanCodes, planCode].filter(Boolean))).sort(),
    [extraPlanCodes, planCode],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (searchDraft === urlSearch) {
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      if (searchDraft) {
        next.set('search', searchDraft);
      } else {
        next.delete('search');
      }
      next.set('page', '1');
      router.push(`/admin/tenants?${next.toString()}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [router, searchDraft, searchParams, urlSearch]);

  const patchUrl = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    router.push(`/admin/tenants?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="grid w-full gap-1.5 md:max-w-xs">
        <Label htmlFor="tenant-search">Tìm kiếm</Label>
        <Input
          id="tenant-search"
          placeholder="Tên, slug, email…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Trạng thái</Label>
        <ToggleGroup
          type="single"
          value={status || 'ALL'}
          onValueChange={(v) => {
            const nextStatus = v === 'ALL' ? undefined : v;
            patchUrl({ status: nextStatus, page: '1' });
          }}
          variant="outline"
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="ALL" aria-label="Tất cả">
            Tất cả
          </ToggleGroupItem>
          <ToggleGroupItem value="ACTIVE">Hoạt động</ToggleGroupItem>
          <ToggleGroupItem value="SUSPENDED">Tạm khóa</ToggleGroupItem>
          <ToggleGroupItem value="CLOSED">Đã đóng</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid w-full gap-1.5 md:w-48">
        <Label>Gói</Label>
        <Select
          value={planCode || 'ALL'}
          onValueChange={(v) => patchUrl({ planCode: v === 'ALL' ? undefined : v, page: '1' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Gói" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả gói</SelectItem>
            {planOptions.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid w-full gap-1.5 md:w-40">
        <Label>Số dòng</Label>
        <Select value={String(limit)} onValueChange={(v) => patchUrl({ limit: v, page: '1' })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / trang
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-muted-foreground text-sm md:ms-auto md:self-end">Trang {page}</div>
    </div>
  );
}
