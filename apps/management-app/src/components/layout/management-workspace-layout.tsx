'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { getManagementPageTitle } from '@/lib/navigation/page-titles';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

type ManagementWorkspaceLayoutProps = {
  children: ReactNode;
  /** Command menu + table search — used on owner/manager dashboard surfaces. */
  showGlobalSearch?: boolean;
};

export function ManagementWorkspaceLayout({
  children,
  showGlobalSearch = false,
}: ManagementWorkspaceLayoutProps) {
  const pathname = usePathname();
  const title = getManagementPageTitle(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar title={title} showGlobalSearch={showGlobalSearch} />
        <div className="flex flex-1 flex-col space-y-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
