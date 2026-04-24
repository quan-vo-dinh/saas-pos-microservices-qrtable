'use client';

import { LayoutDashboard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Owner and Manager Workspace — Overview</p>
      </div>

      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <LayoutDashboard className="size-10 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">Dashboard Overview</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Revenue cards, quick metrics, and operational summary widgets will be added here in Phase 2.
          </p>
        </div>
      </div>
    </div>
  );
}
