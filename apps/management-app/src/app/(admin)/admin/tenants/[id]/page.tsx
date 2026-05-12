'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@einvoice/frontend-ui';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ROUTES } from '@/constants/routes';
import { saasApi } from '@/features/saas/api';
import {
  TenantAuditTab,
  TenantBillingLinkTab,
  TenantDetailHeader,
  TenantOverviewTab,
  TenantSubscriptionsTab,
  TenantUsageTab,
} from '@/features/saas/admin-tenants/tenant-detail-tabs';

export default function AdminTenantDetailPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];

  const tenantQuery = useQuery({
    queryKey: ['admin-tenant', id],
    queryFn: () => saasApi.getTenant(id),
    enabled: Boolean(id),
  });

  if (!id) {
    return null;
  }

  if (tenantQuery.isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (tenantQuery.isError || !tenantQuery.data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <p className="text-destructive text-sm">Không tải được tenant hoặc không tồn tại.</p>
        <Button asChild variant="outline">
          <Link href={ROUTES.ADMIN_TENANTS}>← Danh sách tenant</Link>
        </Button>
        <Button type="button" variant="ghost" onClick={() => void tenantQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  const tenant = tenantQuery.data;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={ROUTES.ADMIN_TENANTS} className="text-muted-foreground hover:text-foreground">
          Tenants
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{tenant.name}</span>
      </div>

      <TenantDetailHeader tenant={tenant} permissions={permissions} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="subscriptions">Đăng ký</TabsTrigger>
          <TabsTrigger value="usage">Sử dụng</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="billing">Thanh toán</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <TenantOverviewTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="subscriptions" className="pt-4">
          <TenantSubscriptionsTab tenantId={tenant.id} tenantStatus={tenant.status} permissions={permissions} />
        </TabsContent>
        <TabsContent value="usage" className="pt-4">
          <TenantUsageTab tenantId={tenant.id} />
        </TabsContent>
        <TabsContent value="audit" className="pt-4">
          <TenantAuditTab tenantId={tenant.id} />
        </TabsContent>
        <TabsContent value="billing" className="pt-4">
          <TenantBillingLinkTab tenantId={tenant.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
