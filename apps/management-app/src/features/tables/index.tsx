'use client';

import { useMemo } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
} from '@einvoice/frontend-ui';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TablesProvider } from './components/tables-provider';
import { TablesPrimaryButtons } from './components/tables-primary-buttons';
import { TablesTable } from './components/tables-table';
import { TableFloorPlan } from './components/table-floor-plan';
import { TablesDialogs } from './components/tables-dialogs';
import { AreaManagementBar } from './components/area-management-bar';
import { useAreasQuery, useTablesQuery } from './hooks/use-tables-query';
import type { Area, RestaurantTable } from '@einvoice/types';

export function TablesPage() {
  const { data: areas, isPending: areasPending } = useAreasQuery();
  const { data: tables, isPending: tablesPending } = useTablesQuery();

  const defaultArea = areas?.[0]?.id ?? 'all';
  const isPending = areasPending || tablesPending;

  if (isPending) {
    return (
      <TablesProvider>
        <div className="flex flex-1 flex-col gap-4 sm:gap-6">
          <div className="space-y-3">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-[500px] w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </TablesProvider>
    );
  }

  return (
    <TablesProvider>
      <div className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Quản lý bàn
            </h2>
            <p className="text-muted-foreground">
              Quản lý khu vực, bàn và mã QR đặt món.
            </p>
          </div>
          <TablesPrimaryButtons />
        </div>

        <Tabs defaultValue={defaultArea} className="flex flex-1 flex-col">
          <AreaManagementBar areas={areas ?? []} />

          <TabsList>
            <TabsTrigger value="all">Tất cả khu</TabsTrigger>
            {(areas ?? []).map((area) => (
              <TabsTrigger key={area.id} value={area.id}>
                {area.name} ({area.tableCount})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="flex flex-1 flex-col mt-4">
            <SplitView tables={tables ?? []} areas={areas ?? []} />
          </TabsContent>

          {(areas ?? []).map((area) => (
            <TabsContent
              key={area.id}
              value={area.id}
              className="flex flex-1 flex-col mt-4"
            >
              <AreaSplitView areaId={area.id} tables={tables ?? []} areas={areas ?? []} />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <TablesDialogs />
    </TablesProvider>
  );
}

function AreaSplitView({ areaId, tables, areas }: { areaId: string; tables: RestaurantTable[]; areas: Area[] }) {
  const filtered = useMemo(
    () => tables.filter((t) => t.areaId === areaId),
    [areaId, tables],
  );
  return <SplitView tables={filtered} areas={areas} />;
}

function SplitView({ tables, areas }: { tables: RestaurantTable[]; areas: Area[] }) {
  return (
    <ResizablePanelGroup className="min-h-[500px]">
      <ResizablePanel defaultSize={40} minSize={30}>
        <ScrollArea className="h-full pr-4">
          <TablesTable data={tables} areas={areas} />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={60} minSize={30}>
        <ScrollArea className="h-full pl-4">
          <TableFloorPlan tables={tables} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
