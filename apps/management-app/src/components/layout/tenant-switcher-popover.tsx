'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { ROUTES } from '@/constants/routes';
import { saasApi } from '@/features/saas/api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { parseRoles } from '@/lib/auth/role-routing';
import { useSession } from 'next-auth/react';

export function TenantSwitcherPopover() {
  const { data: session } = useSession();
  const profile = useAuthStore((s) => s.profile);
  const authReady = useAuthReadyForBff();
  const roles = parseRoles(session?.user?.roles);
  const isPlatformAdmin = roles.includes('SUPER_ADMIN');

  const subscriptionQuery = useQuery({
    queryKey: ['dashboard', 'subscription'],
    queryFn: () => saasApi.getDashboardSubscription(),
    enabled: authReady && !isPlatformAdmin,
  });

  const tenantName = isPlatformAdmin
    ? 'Quản trị nền tảng'
    : (subscriptionQuery.data?.tenant?.name ?? 'Nhà hàng');
  const subtitle = isPlatformAdmin
    ? 'Super Admin · QRTable'
    : (subscriptionQuery.data?.tenant?.slug ?? profile?.tenantId?.slice(0, 8) ?? 'Đang tải…');

  if (isPlatformAdmin) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" className="data-[state=open]:bg-sidebar-accent">
          <Link href={ROUTES.ADMIN_TENANTS}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="size-4" aria-hidden />
            </div>
            <div className="grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-semibold">{tenantName}</span>
              <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-4" aria-hidden />
        </div>
        <div className="grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-sm font-semibold">
            {subscriptionQuery.isLoading ? 'Đang tải…' : tenantName}
          </span>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
