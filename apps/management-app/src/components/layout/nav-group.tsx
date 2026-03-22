'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NavCollapsible, NavGroup as NavGroupProps, NavItem, NavLink } from '@/components/layout/types';

function isPathActive(pathname: string, item: NavItem): boolean {
  if ('url' in item) {
    return pathname === item.url;
  }

  return item.items.some((child) => pathname === child.url || pathname.startsWith(`${child.url}/`));
}

function NavBadge({ children }: { children: string }) {
  return <Badge className="rounded-full px-1 py-0 text-[10px]">{children}</Badge>;
}

function SidebarLink({ item }: { item: NavLink }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isPathActive(pathname, item)}>
        <Link href={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon ? <item.icon /> : null}
          <span>{item.title}</span>
          {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarCollapsibleMenu({ item }: { item: NavCollapsible }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Collapsible asChild defaultOpen={isPathActive(pathname, item)} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            {item.icon ? <item.icon /> : null}
            <span>{item.title}</span>
            {item.badge ? <NavBadge>{item.badge}</NavBadge> : null}
            <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((child) => (
              <SidebarMenuSubItem key={`${item.title}-${child.url}`}>
                <SidebarMenuSubButton asChild isActive={pathname === child.url}>
                  <Link href={child.url} onClick={() => setOpenMobile(false)}>
                    {child.icon ? <child.icon /> : null}
                    <span>{child.title}</span>
                    {child.badge ? <NavBadge>{child.badge}</NavBadge> : null}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarCollapsedDropdown({ item }: { item: NavCollapsible }) {
  const pathname = usePathname();

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton isActive={isPathActive(pathname, item)}>
            {item.icon ? <item.icon /> : null}
            <span>{item.title}</span>
            <ChevronRight className="ms-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={8}>
          <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((child) => (
            <DropdownMenuItem key={`${child.title}-${child.url}`} asChild>
              <Link href={child.url}>{child.title}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          if ('url' in item) {
            return <SidebarLink key={`${title}-${item.url}`} item={item} />;
          }

          if (state === 'collapsed' && !isMobile) {
            return <SidebarCollapsedDropdown key={`${title}-${item.title}`} item={item} />;
          }

          return <SidebarCollapsibleMenu key={`${title}-${item.title}`} item={item} />;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
