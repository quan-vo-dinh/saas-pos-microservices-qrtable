'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@einvoice/frontend-ui';
import { ChevronDown, Command } from 'lucide-react';
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
import { filterSidebarNavByRoles } from '@/lib/navigation/filter-sidebar-nav';
import { parseRoles } from '@/lib/auth/role-routing';

export function AppSidebar() {
  const { data: session, status } = useSession();

  const navGroups = useMemo(() => {
    const roles = parseRoles(session?.user?.roles);
    if (status === 'loading') {
      return sidebarData.navGroups;
    }
    return filterSidebarNavByRoles(sidebarData.navGroups, roles);
  }, [session?.user?.roles, status]);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="border-b border-sidebar-border/60 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold">{sidebarData.appName}</span>
                    <span className="truncate text-xs text-muted-foreground">{sidebarData.appSubtitle}</span>
                  </div>
                  <ChevronDown className="ms-auto size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56">
                <DropdownMenuItem>Tenant A</DropdownMenuItem>
                <DropdownMenuItem>Tenant B</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
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
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 shrink-0 rounded-md">
                <AvatarImage src="https://github.com/shadcn.png" alt="User avatar" />
                <AvatarFallback>QT</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">QRTable User</span>
                <span className="truncate text-xs text-muted-foreground">management@qrtable.local</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
