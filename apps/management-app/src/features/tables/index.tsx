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
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { TablesProvider } from './components/tables-provider';
import { TablesPrimaryButtons } from './components/tables-primary-buttons';
import { TablesTable } from './components/tables-table';
import { TableFloorPlan } from './components/table-floor-plan';
import { TablesDialogs } from './components/tables-dialogs';
import { areas } from './data/areas';
import { tables } from './data/tables';

export function TablesPage() {
  const defaultArea = areas[0]?.id ?? 'all';

  return (
    <TablesProvider>
      <Header fixed>
        <Search />
        <div className="ms-auto flex items-center gap-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Table Management
            </h2>
            <p className="text-muted-foreground">
              Manage restaurant areas, tables, and QR codes.
            </p>
          </div>
          <TablesPrimaryButtons />
        </div>

        <Tabs defaultValue={defaultArea} className="flex flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="all">All Areas</TabsTrigger>
            {areas.map((area) => (
              <TabsTrigger key={area.id} value={area.id}>
                {area.name} ({area.tableCount})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="flex flex-1 flex-col mt-4">
            <SplitView tables={tables} />
          </TabsContent>

          {areas.map((area) => (
            <TabsContent
              key={area.id}
              value={area.id}
              className="flex flex-1 flex-col mt-4"
            >
              <AreaSplitView areaId={area.id} />
            </TabsContent>
          ))}
        </Tabs>
      </Main>

      <TablesDialogs />
    </TablesProvider>
  );
}

function AreaSplitView({ areaId }: { areaId: string }) {
  const filtered = useMemo(
    () => tables.filter((t) => t.areaId === areaId),
    [areaId]
  );
  return <SplitView tables={filtered} />;
}

function SplitView({ tables: tableData }: { tables: typeof tables }) {
  return (
    <ResizablePanelGroup className="min-h-[500px]">
      {/* Left: DataTable List */}
      <ResizablePanel defaultSize={40} minSize={30}>
        <ScrollArea className="h-full pr-4">
          <TablesTable data={tableData} />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right: Floor Plan View */}
      <ResizablePanel defaultSize={60} minSize={30}>
        <ScrollArea className="h-full pl-4">
          <TableFloorPlan tables={tableData} />
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
