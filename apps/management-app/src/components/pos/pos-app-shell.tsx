'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { getManagementPageTitle } from '@/lib/navigation/page-titles';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { PosSubNav } from '@/components/pos/pos-sub-nav';
import { PosRightInspector } from '@/components/pos/pos-right-inspector';
import { KpiTiles } from '@/components/pos/kpi-tiles';
import { CommandPalette } from '@/components/pos/command-palette';
import { NonOrderRouteReset } from '@/components/pos/non-order-route-reset';
import { useOrderUiState } from '@/features/order/hooks/use-order-ui-state';
import { useStaffOrderRealtime } from '@/features/order/hooks/use-staff-order-realtime';
import { ROUTES } from '@/constants/routes';
import { usePathname } from 'next/navigation';

type Props = {
  children: ReactNode;
};

export function PosAppShell({ children }: Props) {
  const pathname = usePathname();
  const title = getManagementPageTitle(pathname);
  const clearSelectedOrder = useOrderUiState((s) => s.selectOrder);
  useStaffOrderRealtime();

  useEffect(() => {
    const onLiveOrders = pathname === ROUTES.POS || pathname === `${ROUTES.POS}/`;
    if (!onLiveOrders) clearSelectedOrder(null);
  }, [clearSelectedOrder, pathname]);

  return (
    <SidebarProvider className="flex min-h-0 max-h-full flex-1 overflow-hidden">
      <NonOrderRouteReset />
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        <AppTopbar title={title} />
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 md:p-4">
          <PosSubNav />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            <ResizablePanelGroup
              orientation="horizontal"
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-border/40"
            >
              <ResizablePanel
                defaultSize={60}
                minSize={40}
                className="flex min-h-0 min-w-0 flex-col overflow-hidden p-2"
              >
                {children}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={28} className="min-w-0 border-s border-border/30 bg-muted/10 p-2">
                <div className="flex h-full min-h-0 flex-col gap-1">
                  <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Chi tiết</p>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <PosRightInspector />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
            <div className="sticky bottom-0 z-10 border-t border-border/50 bg-background/95 py-1 backdrop-blur">
              <KpiTiles />
            </div>
          </div>
        </div>
        <CommandPalette />
      </SidebarInset>
    </SidebarProvider>
  );
}
