'use client';

import { ChevronDown, Command } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@einvoice/frontend-ui';
import { sidebarData } from '@/components/layout/data/sidebar-data';
import { NavGroup } from '@/components/layout/nav-group';

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-semibold">{sidebarData.appName}</span>
                    <span className="truncate text-xs text-muted-foreground">{sidebarData.appSubtitle}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" sideOffset={8}>
                <DropdownMenuItem>Tenant A</DropdownMenuItem>
                <DropdownMenuItem>Tenant B</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Avatar className="size-7 rounded-md">
                <AvatarImage src="https://github.com/shadcn.png" alt="User avatar" />
                <AvatarFallback>QT</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
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
