'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KdsHeader } from '@/components/kds/kds-header';
import { KdsColumn } from '@/components/kds/kds-column';
import { KdsTicketCard } from '@/components/kds/kds-ticket-card';
import { KdsDndWrapper } from '@/components/kds/kds-dnd-wrapper';
import { KdsTicketSheet } from '@/components/kds/kds-ticket-sheet';
import { KdsBatchingPanel } from '@/components/kds/kds-batching-panel';
import { RecallLogSheet } from '@/components/kds/recall-log-sheet';
import { StationSettingsPopover } from '@/components/kds/station-settings-popover';
import { useFakeRealtime } from '@/mocks/use-fake-realtime';
import { useMockStore } from '@/mocks/store';
import type { KDSStation } from '@/mocks/kds-ticket';
import type { ColumnStatus } from '@/mocks/kds-ticket';
import { effectiveSlaSeconds, readKdsFontPx, readKdsSlaCapMinutes } from '@/lib/kds-station-prefs';
import { parseRoles, type AppRole } from '@/lib/auth/role-routing';
import { ROUTES } from '@/constants/routes';

function roleAllowed(station: KDSStation, roles: AppRole[]) {
  const set = new Set(roles);
  if (set.has('OWNER') || set.has('MANAGER')) return true;
  if (station === 'KITCHEN') return set.has('CHEF');
  return set.has('BARISTA');
}

export function KdsBoard({ station }: { station: KDSStation }) {
  const { data: session, status } = useSession();
  const roles = parseRoles(session?.user?.roles);
  const allowed = roles.length === 0 || roleAllowed(station, roles);
  const userId = session?.user?.id ?? 'staff-chef-1';
  const userName = session?.user?.name ?? 'Đầu bếp mock';

  const kdsTickets = useMockStore((s) => s.kdsTickets);
  const highlightedItemName = useMockStore((s) => s.kdsHighlightedItemName);
  const kdsSelectedTicketId = useMockStore((s) => s.kdsSelectedTicketId);
  const setKdsHighlightedItemName = useMockStore((s) => s.setKdsHighlightedItemName);
  const selectKdsTicket = useMockStore((s) => s.selectKdsTicket);
  const advanceTicket = useMockStore((s) => s.advanceTicket);
  const recallTicket = useMockStore((s) => s.recallTicket);

  const [sheetTicketId, setSheetTicketId] = useState<string | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefsTick, setPrefsTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [flashTicketId, setFlashTicketId] = useState<string | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const surfaceRefs = useRef(new Map<string, HTMLDivElement | null>());

  useFakeRealtime();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* prefsTick: bump after StationSettings saves so we re-read localStorage caps. */
  const slaCapMinutes = useMemo(
    () => readKdsSlaCapMinutes(station),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefsTick is an intentional invalidation token
    [station, prefsTick],
  );
  const fontPx = useMemo(
    () => readKdsFontPx(station),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefsTick is an intentional invalidation token
    [station, prefsTick],
  );

  const mine = useMemo(
    () => kdsTickets.filter((t) => t.station === station),
    [kdsTickets, station],
  );

  const byColumn = (c: ColumnStatus) => mine.filter((t) => t.columnStatus === c);

  const setSurfaceRef = useCallback((ticketId: string, el: HTMLDivElement | null) => {
    if (el) surfaceRefs.current.set(ticketId, el);
    else surfaceRefs.current.delete(ticketId);
  }, []);

  const focusTicket = useCallback(
    (ticketId: string) => {
      selectKdsTicket(ticketId);
      const el = surfaceRefs.current.get(ticketId);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      setFlashTicketId(ticketId);
      window.setTimeout(() => {
        setFlashTicketId((cur) => (cur === ticketId ? null : cur));
      }, 1800);
    },
    [selectKdsTicket],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('[data-kds-ignore-shortcuts]')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;

      if (!['1', '2', '3'].includes(e.key)) return;

      const sid = useMockStore.getState().kdsSelectedTicketId;
      if (!sid) return;

      const all = useMockStore.getState().kdsTickets;
      const tix = all.find((t) => t.ticketId === sid && t.station === station);
      if (!tix) return;

      if (e.key === '1' && tix.columnStatus === 'WAITING') {
        e.preventDefault();
        advanceTicket(sid);
      } else if (e.key === '2' && tix.columnStatus === 'IN_PROGRESS') {
        e.preventDefault();
        advanceTicket(sid);
      } else if (e.key === '3' && tix.columnStatus === 'DONE') {
        e.preventDefault();
        recallTicket(sid, 'Phím tắt recall', userId, userName);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advanceTicket, recallTicket, station, userId, userName]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-kds-mono)] text-sm text-white/60">
        Đang tải phiên…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md border-white/15 bg-black/60 text-[var(--ink)]">
          <CardHeader>
            <CardTitle>Không có quyền KDS</CardTitle>
            <CardDescription className="text-white/60">
              Trạm {station === 'KITCHEN' ? 'bếp' : 'bar'} yêu cầu vai phù hợp (mock RBAC theo role-routing).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="border-white/20 active:bg-white/10">
              <Link href={ROUTES.DASHBOARD}>Về dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      tabIndex={-1}
      className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-[var(--lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      style={{ fontSize: `${fontPx}px` }}
      data-slot="kds-board"
      aria-label="Bảng KDS — phím 1 bắt đầu, 2 xong, 3 recall khi ticket được chọn"
    >
      <KdsHeader
        station={station}
        tickets={kdsTickets}
        onOpenRecall={() => setRecallOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden xl:flex-row">
        <KdsDndWrapper>
          <div className="flex min-h-[240px] min-w-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden p-2 md:min-h-0 md:p-3 xl:overflow-hidden">
            <KdsColumn
              columnId="WAITING"
              title="Chờ"
              accentClass="bg-[var(--lime)]/15"
              count={byColumn('WAITING').length}
            >
              {byColumn('WAITING').map((t) => (
                <KdsTicketCard
                  key={t.ticketId}
                  ticket={t}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  highlightedItemName={highlightedItemName}
                  isSelected={kdsSelectedTicketId === t.ticketId}
                  flash={flashTicketId === t.ticketId}
                  surfaceRef={(el) => setSurfaceRef(t.ticketId, el)}
                  onSelect={() => selectKdsTicket(t.ticketId)}
                  onTitleClick={() => {
                    selectKdsTicket(t.ticketId);
                    setSheetTicketId(t.ticketId);
                  }}
                />
              ))}
            </KdsColumn>
            <KdsColumn
              columnId="IN_PROGRESS"
              title="Đang làm"
              accentClass="bg-[var(--amber)]/20"
              count={byColumn('IN_PROGRESS').length}
            >
              {byColumn('IN_PROGRESS').map((t) => (
                <KdsTicketCard
                  key={t.ticketId}
                  ticket={t}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  highlightedItemName={highlightedItemName}
                  isSelected={kdsSelectedTicketId === t.ticketId}
                  flash={flashTicketId === t.ticketId}
                  surfaceRef={(el) => setSurfaceRef(t.ticketId, el)}
                  onSelect={() => selectKdsTicket(t.ticketId)}
                  onTitleClick={() => {
                    selectKdsTicket(t.ticketId);
                    setSheetTicketId(t.ticketId);
                  }}
                />
              ))}
            </KdsColumn>
            <KdsColumn columnId="DONE" title="Hoàn thành" accentClass="bg-[var(--pink)]/15" count={byColumn('DONE').length}>
              {byColumn('DONE').map((t) => (
                <KdsTicketCard
                  key={t.ticketId}
                  ticket={t}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  highlightedItemName={highlightedItemName}
                  isSelected={kdsSelectedTicketId === t.ticketId}
                  flash={flashTicketId === t.ticketId}
                  surfaceRef={(el) => setSurfaceRef(t.ticketId, el)}
                  onSelect={() => selectKdsTicket(t.ticketId)}
                  onTitleClick={() => {
                    selectKdsTicket(t.ticketId);
                    setSheetTicketId(t.ticketId);
                  }}
                />
              ))}
            </KdsColumn>
          </div>
        </KdsDndWrapper>

        <KdsBatchingPanel
          station={station}
          slaCapMinutes={slaCapMinutes}
          now={now}
          className="min-h-[200px] xl:min-h-0"
          onItemTap={(name) => setKdsHighlightedItemName(highlightedItemName === name ? null : name)}
          onFocusTicket={focusTicket}
        />
      </div>

      <KdsTicketSheet
        ticketId={sheetTicketId}
        station={station}
        open={Boolean(sheetTicketId)}
        onOpenChange={(o) => {
          if (!o) setSheetTicketId(null);
        }}
      />

      <RecallLogSheet open={recallOpen} onOpenChange={setRecallOpen} />
      <StationSettingsPopover
        station={station}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => setPrefsTick((x) => x + 1)}
      />
    </div>
  );
}
