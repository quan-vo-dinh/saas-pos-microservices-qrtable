'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@einvoice/frontend-ui';

type HeaderProps = {
  children?: ReactNode;
  fixed?: boolean;
};

/**
 * Legacy in-page header — prefer {@link AppTopbar} via {@link ManagementWorkspaceLayout} / {@link AppShell}
 * so the trigger, height, and chrome stay aligned with the rest of the app.
 */
export function Header({ children, fixed }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center gap-3 border-b px-4 transition-[width,height] ease-linear md:px-6',
        'group-has-data-[collapsible=icon]/sidebar-wrapper:h-16',
        fixed && 'sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
      )}
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger variant="outline" className="-ms-0.5" />
        <Separator orientation="vertical" className="h-6 self-center" />
      </div>
      {children}
    </header>
  );
}
