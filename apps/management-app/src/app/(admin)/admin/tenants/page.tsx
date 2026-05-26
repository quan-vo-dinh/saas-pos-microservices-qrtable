'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { OnboardTenantDialog } from '@/features/saas/admin-tenants/onboard-tenant-dialog';
import { TenantFilters } from '@/features/saas/admin-tenants/tenant-filters';
import { TenantsTable } from '@/features/saas/admin-tenants/tenants-table';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { saasApi } from '@/features/saas/api';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';

function AdminTenantsClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const authReady = useAuthReadyForBff();
  const searchParams = useSearchParams();
  const [onboardOpen, setOnboardOpen] = useState(false);

  const query = useMemo(
    () => ({
      search: searchParams.get('search') ?? undefined,
      status: (searchParams.get('status') as '' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | null) ?? '',
      planCode: searchParams.get('planCode') ?? undefined,
      page: Number(searchParams.get('page') ?? '1') || 1,
      limit: Number(searchParams.get('limit') ?? '20') || 20,
    }),
    [searchParams],
  );

  const tenantsQuery = useQuery({
    queryKey: ['admin-tenants', query],
    queryFn: () =>
      saasApi.listAdminTenants({
        search: query.search,
        status: query.status || undefined,
        planCode: query.planCode,
        page: query.page,
        limit: query.limit,
      }),
    enabled: authReady,
    retry: 1,
  });

  const plansQuery = useQuery({
    queryKey: ['admin-plans', 'codes'],
    queryFn: () => saasApi.listPlansAdmin(),
    enabled: authReady,
  });

  const extraPlanCodes = useMemo(() => (plansQuery.data ?? []).map((p) => p.code).filter(Boolean), [plansQuery.data]);

  const totalPages = useMemo(() => {
    const { total, limit } = tenantsQuery.data ?? { total: 0, limit: query.limit };
    return Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  }, [tenantsQuery.data, query.limit]);

  const patchPage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(page));
    router.push(`/admin/tenants?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground text-sm">
            Tổng {tenantsQuery.data?.total ?? '—'} · Trang {query.page}
          </p>
        </div>
        {hasPermission(permissions, phase4bPermissions.tenantOnboard) ? (
          <Button type="button" onClick={() => setOnboardOpen(true)}>
            Onboard tenant
          </Button>
        ) : null}
      </div>

      <TenantFilters extraPlanCodes={extraPlanCodes} />

      <TenantsTable
        data={tenantsQuery.data?.items ?? []}
        loading={tenantsQuery.isLoading}
        error={(tenantsQuery.error as Error | null) ?? null}
        permissions={permissions}
        page={query.page}
        totalPages={totalPages}
        onRetry={() => void tenantsQuery.refetch()}
        onPageChange={patchPage}
      />

      <OnboardTenantDialog
        open={onboardOpen}
        onOpenChange={setOnboardOpen}
        plans={plansQuery.data ?? []}
        plansLoading={plansQuery.isLoading}
        onCreated={() => void tenantsQuery.refetch()}
      />
    </div>
  );
}

export default function AdminTenantsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Đang tải danh sách tenant…</p>}>
      <AdminTenantsClient />
    </Suspense>
  );
}
