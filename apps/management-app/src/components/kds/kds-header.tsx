'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, History, Wine, Settings, Timer, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/constants/routes';
import type { KDSStation } from '@/mocks/kds-ticket';
import type { KDSTicketMock } from '@/mocks/kds-ticket';

type Props = {
  station: KDSStation;
  tickets: KDSTicketMock[];
  onOpenRecall?: () => void;
  onOpenSettings?: () => void;
};

export function KdsHeader({ station, tickets, onOpenRecall, onOpenSettings }: Props) {
  const pathname = usePathname();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const boot = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, []);

  const { waiting, inProg, avgSlaSec } = useMemo(() => {
    const mine = tickets.filter((t) => t.station === station);
    const w = mine.filter((t) => t.columnStatus === 'WAITING').length;
    const p = mine.filter((t) => t.columnStatus === 'IN_PROGRESS').length;
    const avg =
      mine.length > 0
        ? Math.round(mine.reduce((s, t) => s + t.slaSeconds, 0) / mine.length)
        : 0;
    return { waiting: w, inProg: p, avgSlaSec: avg };
  }, [station, tickets]);

  const clock =
    now == null
      ? '—'
      : new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const tab = pathname.includes('/bar') ? 'bar' : 'kitchen';

  return (
    <header
      className="flex shrink-0 flex-col gap-2 border-b border-white/10 px-3 py-2 md:flex-row md:items-center md:justify-between md:px-4"
      data-slot="kds-header"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-[var(--ink)] active:bg-white/15" asChild>
          <Link href={ROUTES.POS}>
            <ArrowLeft className="size-4" aria-hidden />
            <span className="hidden sm:inline">POS</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {station === 'KITCHEN' ? (
            <ChefHat className="size-6 text-[var(--lime)]" aria-hidden />
          ) : (
            <Wine className="size-6 text-[var(--pink)]" aria-hidden />
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold tracking-tight">
              {station === 'KITCHEN' ? 'KITCHEN' : 'BAR'}
            </span>
            <span className="font-mono text-xs text-white/60 tabular-nums">{clock}</span>
          </div>
        </div>
        <Badge variant="outline" className="border-white/20 bg-black/40 font-mono text-[0.65rem] text-[var(--lime)]">
          <Timer className="size-3 opacity-80" aria-hidden />
          {waiting} chờ · {inProg} đang làm · SLA TB {Math.floor(avgSlaSec / 60)}m
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs key={pathname} value={tab} className="w-full min-w-0 sm:w-auto">
          <TabsList className="h-8 w-full bg-black/50 sm:w-auto" variant="line">
            <TabsTrigger className="text-[0.7rem]" value="kitchen" asChild>
              <Link href={ROUTES.KDS_KITCHEN}>Bếp</Link>
            </TabsTrigger>
            <TabsTrigger className="text-[0.7rem]" value="bar" asChild>
              <Link href={ROUTES.KDS_BAR}>Bar</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-white/20 bg-black/30 text-[0.7rem] text-[var(--ink)] active:bg-white/15"
          onClick={() => onOpenRecall?.()}
        >
          <History data-icon="inline-start" aria-hidden />
          Recall
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="border-white/20 bg-black/30 text-[var(--ink)] active:bg-white/15"
          aria-label="Cài đặt trạm"
          onClick={() => onOpenSettings?.()}
        >
          <Settings className="size-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}
