'use client';

import { useSyncExternalStore } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@einvoice/frontend-ui';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { sidebarData } from '@/components/layout/data/sidebar-data';
import { NavGroup } from '@/components/layout/nav-group';
import { SidebarTodayCharts } from '@/components/layout/sidebar-today-charts';
import { TenantSwitcherPopover } from '@/components/layout/tenant-switcher-popover';
import { filterSidebarNavByRoles } from '@/lib/navigation/filter-sidebar-nav';
import { parseRoles } from '@/lib/auth/role-routing';
import { LogOut, UserCircle2 } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useAuthStore } from '@/lib/auth/auth-store';

export function AppSidebar() {
  const { data: session, status } = useSession();
  const profile = useAuthStore((s) => s.profile);
  /** Same first paint as SSR, then true — avoids nav tree size mismatch (Radix useId) without effect setState. */
  const hasClientMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const roles = parseRoles(session?.user?.roles);
  const displayName = session?.user?.name ?? profile?.email ?? 'QRTable User';
  const displayEmail = profile?.email ?? session?.user?.email ?? '';
  const avatarFallback =
    displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'QT';

  const navGroups =
    !hasClientMounted || status === 'loading'
      ? sidebarData.navGroups
      : filterSidebarNavByRoles(sidebarData.navGroups, roles, session?.user?.permissions ?? []);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border/60 pb-2">
        <SidebarMenu>
          <TenantSwitcherPopover />
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
        <SidebarTodayCharts />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 shrink-0 rounded-md">
                    <AvatarImage src={undefined} alt="" />
                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{displayEmail || '—'}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-52">
                <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserCircle2 />
                  Hồ sơ
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void signOut({ callbackUrl: '/login' });
                  }}
                >
                  <LogOut />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
