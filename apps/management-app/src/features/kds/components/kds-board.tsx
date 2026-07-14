'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { PreparationStation } from '@einvoice/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KdsHeader } from '@/features/kds/components/kds-header';
import { KdsColumn } from '@/features/kds/components/kds-column';
import { KdsTicketCard } from '@/features/kds/components/kds-ticket-card';
import { KdsDndWrapper } from '@/features/kds/components/kds-dnd-wrapper';
import { KdsTicketSheet } from '@/features/kds/components/kds-ticket-sheet';
import { RealtimeStatusPill } from '@/components/realtime/realtime-status-pill';
import { RecallLogSheet } from '@/features/kds/components/recall-log-sheet';
import { StationSettingsPopover } from '@/features/kds/components/station-settings-popover';
import { effectiveSlaSeconds, readKdsFontPx, readKdsSlaCapMinutes } from '@/lib/kds-station-prefs';
import { parseRoles, type AppRole } from '@/lib/auth/role-routing';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/lib/auth/auth-store';
import type { KDSStation, ColumnStatus } from '@/mocks/kds-ticket';
import { useKdsBoardAdapter } from '@/features/kds/hooks/use-kds-board-adapter';

function roleAllowed(station: KDSStation, roles: AppRole[]) {
  const set = new Set(roles);
  if (set.has('OWNER') || set.has('MANAGER')) return true;
  if (station === 'KITCHEN') return set.has('CHEF');
  return set.has('BARISTA');
}

export function KdsBoard({ station }: { station: KDSStation }) {
  const USE_KDS_MOCK = process.env.NEXT_PUBLIC_KDS_MOCK === '1';

  const { data: session, status } = useSession();
  const profile = useAuthStore((s) => s.profile);
  const tenantId = profile?.tenantId;
  const accessToken = useAuthStore((s) => s.accessToken);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const stationEnum = station as PreparationStation;
  const roles = parseRoles(session?.user?.roles);
  const canManageStationSubscription = roles.includes('OWNER') || roles.includes('MANAGER');
  const liveEnabled = !USE_KDS_MOCK && authHydrated && Boolean(tenantId) && Boolean(accessToken);

  const board = useKdsBoardAdapter(stationEnum, {
    useMock: USE_KDS_MOCK,
    liveEnabled,
    canManage: canManageStationSubscription,
    tenantId,
  });

  const allowed = roles.length === 0 || roleAllowed(station, roles);
  const userId = session?.user?.id ?? 'staff-chef-1';
  const userName = session?.user?.name ?? profile?.email ?? 'Nhân viên KDS';

  const [sheetTicketId, setSheetTicketId] = useState<string | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefsTick, setPrefsTick] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);

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
  const boardStyle = USE_KDS_MOCK ? { fontSize: `${fontPx}px` } : undefined;

  const mine = useMemo(
    () => board.tickets.filter((t) => t.station === station),
    [board.tickets, station],
  );

  const byColumn = (c: ColumnStatus) => mine.filter((t) => t.columnStatus === c);

  const { selectedTicketId, advanceTicket, recallTicket, tickets } = board;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('[data-kds-ignore-shortcuts]')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;

      if (!['1', '2', '3'].includes(e.key)) return;

      const sid = selectedTicketId;
      if (!sid) return;

      const tix = tickets.find((t) => t.ticketId === sid && t.station === station);
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
  }, [selectedTicketId, advanceTicket, recallTicket, tickets, station, userId, userName]);

  // -------------------------------------------------------------------------
  // Live-mode guards (skipped in mock mode)
  // -------------------------------------------------------------------------
  if (!USE_KDS_MOCK && (status === 'loading' || !authHydrated)) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground"
      >
        Đang đồng bộ phiên quản trị…
      </div>
    );
  }

  if (!USE_KDS_MOCK && (!tenantId || !accessToken)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Chưa sẵn sàng tải KDS</CardTitle>
            <CardDescription>
              Thiếu tenant hoặc token trong phiên quản trị. Hãy tải lại sau khi đăng nhập đúng tenant.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!USE_KDS_MOCK && board.queueLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground"
      >
        Đang tải hàng đợi KDS…
      </div>
    );
  }

  if (!USE_KDS_MOCK && board.queueError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Không tải được KDS</CardTitle>
            <CardDescription>
              {(board.queueError as Error)?.message ?? 'Lỗi API hoặc quyền truy cập.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={board.invalidateQueue}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground"
      >
        Đang tải phiên…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Không có quyền KDS</CardTitle>
            <CardDescription>
              Trạm {station === 'KITCHEN' ? 'bếp' : 'bar'} yêu cầu vai Chef hoặc Barista (hoặc quản lý).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link href={ROUTES.DASHBOARD}>Về dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main board render
  // -------------------------------------------------------------------------
  return (
    <div
      ref={boardRef}
      tabIndex={-1}
      className="relative flex min-h-[calc(100dvh-8rem)] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={boardStyle}
      data-slot="kds-board"
      aria-label="Bảng KDS — phím 1 bắt đầu, 2 xong, 3 recall khi ticket được chọn"
    >
      <RealtimeStatusPill status={board.realtimeStatus} tone="kds" />
      <KdsHeader
        station={station}
        tickets={board.tickets}
        onOpenRecall={() => setRecallOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onRefresh={board.invalidateQueue}
        refreshDisabled={board.queueLoading}
        showStationTools={board.isMock}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <KdsDndWrapper
          tickets={mine}
          onColumnChange={board.onColumnChange}
        >
          <div className="flex min-h-[240px] min-w-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden p-2 md:min-h-0 md:p-3 xl:overflow-hidden">
            <KdsColumn
              columnId="WAITING"
              title="Chờ"
              accentClass="bg-primary/5"
              count={byColumn('WAITING').length}
            >
              {byColumn('WAITING').map((t) => (
                <KdsTicketCard
                  key={t.ticketId}
                  ticket={t}
                  liveActions={board.liveActions}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  isSelected={board.selectedTicketId === t.ticketId}
                  onSelect={() => board.selectTicket(t.ticketId)}
                  onTitleClick={() => {
                    board.selectTicket(t.ticketId);
                    setSheetTicketId(t.ticketId);
                  }}
                />
              ))}
            </KdsColumn>
            <KdsColumn
              columnId="IN_PROGRESS"
              title="Đang làm"
              accentClass="bg-chart-4/10"
              count={byColumn('IN_PROGRESS').length}
            >
              {byColumn('IN_PROGRESS').map((t) => (
                <KdsTicketCard
                  key={t.ticketId}
                  ticket={t}
                  liveActions={board.liveActions}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  isSelected={board.selectedTicketId === t.ticketId}
                  onSelect={() => board.selectTicket(t.ticketId)}
                  onTitleClick={() => {
                    board.selectTicket(t.ticketId);
                    setSheetTicketId(t.ticketId);
                  }}
                />
              ))}
            </KdsColumn>
            <KdsColumn columnId="DONE" title="Hoàn thành" accentClass="bg-muted/50" count={byColumn('DONE').length}>
              {byColumn('DONE').map((t) => (
                <KdsTicketCard
                  key={t.ticketId}
                  ticket={t}
                  liveActions={board.liveActions}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  isSelected={board.selectedTicketId === t.ticketId}
                  onSelect={() => board.selectTicket(t.ticketId)}
                  onTitleClick={() => {
                    board.selectTicket(t.ticketId);
                    setSheetTicketId(t.ticketId);
                  }}
                />
              ))}
            </KdsColumn>
          </div>
        </KdsDndWrapper>
      </div>

      <KdsTicketSheet
        ticketId={sheetTicketId}
        station={station}
        open={Boolean(sheetTicketId)}
        tickets={board.tickets}
        liveMode={!board.isMock}
        onOpenChange={(o) => {
          if (!o) setSheetTicketId(null);
        }}
      />

      {board.isMock ? <RecallLogSheet open={recallOpen} onOpenChange={setRecallOpen} /> : null}
      {board.isMock ? (
        <StationSettingsPopover
          station={station}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={() => setPrefsTick((x) => x + 1)}
        />
      ) : null}
    </div>
  );
}
