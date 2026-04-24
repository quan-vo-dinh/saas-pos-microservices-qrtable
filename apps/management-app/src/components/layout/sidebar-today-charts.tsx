'use client';

import { usePathname } from 'next/navigation';
import { TodayMiniCharts } from '@/components/pos/today-mini-charts';

export function SidebarTodayCharts() {
  const pathname = usePathname();
  if (!pathname.startsWith('/pos')) {
    return null;
  }
  return (
    <div className="border-t border-sidebar-border/60 px-1 py-1">
      <TodayMiniCharts />
    </div>
  );
}
