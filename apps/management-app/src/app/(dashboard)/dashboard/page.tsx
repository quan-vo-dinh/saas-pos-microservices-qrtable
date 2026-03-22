'use client';

import { LayoutDashboard } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ProfileDropdown } from '@/components/profile-dropdown';

export default function DashboardPage() {
  return (
    <>
      <Header fixed>
        <Search />
        <div className="ms-auto flex items-center gap-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Owner and Manager Workspace — Overview
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-8">
          <div className="flex flex-col items-center text-center gap-2">
            <LayoutDashboard className="size-10 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">Dashboard Overview</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Revenue cards, quick metrics, and operational summary widgets will
              be added here in Phase 2.
            </p>
          </div>
        </div>
      </Main>
    </>
  );
}
