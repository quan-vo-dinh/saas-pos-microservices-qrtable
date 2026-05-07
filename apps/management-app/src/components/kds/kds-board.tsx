'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PreparationStation } from '@einvoice/types';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KdsHeader } from '@/components/kds/kds-header';
import { KdsColumn } from '@/components/kds/kds-column';
import { KdsTicketCard } from '@/components/kds/kds-ticket-card';
import { KdsDndWrapper } from '@/components/kds/kds-dnd-wrapper';
import { KdsTicketSheet } from '@/components/kds/kds-ticket-sheet';
import { RealtimeStatusPill } from '@/components/realtime/realtime-status-pill';
import { RecallLogSheet } from '@/components/kds/recall-log-sheet';
import { StationSettingsPopover } from '@/components/kds/station-settings-popover';
import { useFakeRealtime } from '@/mocks/use-fake-realtime';
import { useMockStore } from '@/mocks/store';
import type { KDSStation } from '@/mocks/kds-ticket';
import type { ColumnStatus } from '@/mocks/kds-ticket';
import { effectiveSlaSeconds, readKdsFontPx, readKdsSlaCapMinutes } from '@/lib/kds-station-prefs';
import { parseRoles, type AppRole } from '@/lib/auth/role-routing';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/lib/auth/auth-store';
import { kdsKeys } from '@/features/kds/kds-keys';
import { useKdsQueue } from '@/features/kds/hooks/use-kds-queue';
import { useKdsRealtime } from '@/features/kds/hooks/use-kds-realtime';
import { mapSnapshotToBoardTickets } from '@/features/kds/lib/map-queue-tickets';
import {
  markKdsTicketDone,
  recallKdsTicket,
  startKdsTicket,
} from '@/features/kds/services/kds.service';

function roleAllowed(station: KDSStation, roles: AppRole[]) {
  const set = new Set(roles);
  if (set.has('OWNER') || set.has('MANAGER')) return true;
  if (station === 'KITCHEN') return set.has('CHEF');
  return set.has('BARISTA');
}

export function KdsBoard({ station }: { station: KDSStation }) {
  const USE_KDS_MOCK = process.env.NEXT_PUBLIC_KDS_MOCK === '1';

  const { data: session, status } = useSession();
  const tenantId = useAuthStore((s) => s.profile?.tenantId);
  const queryClient = useQueryClient();
  const stationEnum = station as PreparationStation;

  const { data: snapshot, isLoading: queueLoading, error: queueError } = useKdsQueue(stationEnum, {
    enabled: !USE_KDS_MOCK,
  });
  const realtimeStatus = useKdsRealtime(stationEnum, { enabled: !USE_KDS_MOCK });

  const roles = parseRoles(session?.user?.roles);
  const allowed = roles.length === 0 || roleAllowed(station, roles);
  const userId = session?.user?.id ?? 'staff-chef-1';
  const userName = session?.user?.name ?? 'Đầu bếp mock';

  const mockTickets = useMockStore((s) => s.kdsTickets);
  const mockSelectedTicketId = useMockStore((s) => s.kdsSelectedTicketId);
  const mockSelectKdsTicket = useMockStore((s) => s.selectKdsTicket);
  const mockAdvanceTicket = useMockStore((s) => s.advanceTicket);
  const mockRecallTicket = useMockStore((s) => s.recallTicket);

  const [liveSelectedTicketId, setLiveSelectedTicketId] = useState<string | null>(null);

  const kdsSelectedTicketId = USE_KDS_MOCK ? mockSelectedTicketId : liveSelectedTicketId;

  const selectKdsTicket = useCallback(
    (id: string | null) => {
      if (USE_KDS_MOCK) {
        mockSelectKdsTicket(id);
      } else {
        setLiveSelectedTicketId(id);
      }
    },
    [USE_KDS_MOCK, mockSelectKdsTicket],
  );

  const liveTickets = useMemo(
    () => (snapshot?.tickets?.length ? mapSnapshotToBoardTickets(snapshot.tickets, station) : []),
    [snapshot, station],
  );

  const kdsTickets = USE_KDS_MOCK ? mockTickets : liveTickets;

  const invalidateQueue = useCallback(() => {
    if (tenantId) {
      void queryClient.invalidateQueries({ queryKey: kdsKeys.queue(tenantId, stationEnum) });
    }
  }, [queryClient, tenantId, stationEnum]);

  const startMut = useMutation({
    mutationFn: ({ ticketId, requestId }: { ticketId: string; requestId: string }) =>
      startKdsTicket(stationEnum, ticketId, requestId),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể bắt đầu ticket';
      toast.error(msg);
    },
  });

  const doneMut = useMutation({
    mutationFn: ({ ticketId, requestId }: { ticketId: string; requestId: string }) =>
      markKdsTicketDone(stationEnum, ticketId, requestId),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể đánh dấu xong';
      toast.error(msg);
    },
  });

  const recallMut = useMutation({
    mutationFn: ({
      ticketId,
      requestId,
      reason,
    }: {
      ticketId: string;
      requestId: string;
      reason?: string;
    }) => recallKdsTicket(stationEnum, ticketId, requestId, reason),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể recall ticket';
      toast.error(msg);
    },
  });

  const liveAdvanceTicket = useCallback(
    (ticketId: string) => {
      const t = kdsTickets.find((x) => x.ticketId === ticketId);
      if (!t) return;
      const requestId = crypto.randomUUID();
      if (t.columnStatus === 'WAITING') {
        startMut.mutate({ ticketId, requestId });
      } else if (t.columnStatus === 'IN_PROGRESS') {
        doneMut.mutate({ ticketId, requestId });
      }
    },
    [kdsTickets, startMut, doneMut],
  );

  const liveRecallTicket = useCallback(
    (ticketId: string, reason: string, _userId: string, _userName: string) => {
      recallMut.mutate({ ticketId, requestId: crypto.randomUUID(), reason });
    },
    [recallMut],
  );

  const handleLiveColumnChange = useCallback(
    (ticketId: string, col: ColumnStatus) => {
      const t = kdsTickets.find((x) => x.ticketId === ticketId);
      if (!t) return;
      const requestId = crypto.randomUUID();
      if (t.columnStatus === 'WAITING' && col === 'IN_PROGRESS') {
        startMut.mutate({ ticketId, requestId });
      } else if (t.columnStatus === 'IN_PROGRESS' && col === 'DONE') {
        doneMut.mutate({ ticketId, requestId });
      } else if (t.columnStatus === 'DONE' && col === 'IN_PROGRESS') {
        recallMut.mutate({ ticketId, requestId, reason: 'Kéo thả recall' });
      }
    },
    [kdsTickets, startMut, doneMut, recallMut],
  );

  const advanceTicket = USE_KDS_MOCK ? mockAdvanceTicket : liveAdvanceTicket;
  const recallTicket = USE_KDS_MOCK ? mockRecallTicket : liveRecallTicket;

  const liveActions = USE_KDS_MOCK
    ? undefined
    : {
        advanceTicket: liveAdvanceTicket,
        recallTicket: liveRecallTicket,
        updateItem: () => {
          toast.message('Cập nhật món trên KDS mock-only — dùng luồng ticket.');
        },
      };

  const [sheetTicketId, setSheetTicketId] = useState<string | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefsTick, setPrefsTick] = useState(0);

  const boardRef = useRef<HTMLDivElement>(null);

  useFakeRealtime(USE_KDS_MOCK);

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('[data-kds-ignore-shortcuts]')) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;

      if (!['1', '2', '3'].includes(e.key)) return;

      const sid = kdsSelectedTicketId;
      if (!sid) return;

      const all = USE_KDS_MOCK ? useMockStore.getState().kdsTickets : kdsTickets;
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
  }, [advanceTicket, recallTicket, station, userId, userName, kdsTickets, kdsSelectedTicketId, USE_KDS_MOCK]);

  if (!USE_KDS_MOCK && tenantId && queueLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-kds-mono)] text-sm text-white/60">
        Đang tải hàng đợi KDS…
      </div>
    );
  }

  if (!USE_KDS_MOCK && queueError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-4">
        <Card className="max-w-md border-white/15 bg-black/60 text-[var(--ink)]">
          <CardHeader>
            <CardTitle>Không tải được KDS</CardTitle>
            <CardDescription className="text-white/60">
              {(queueError as Error)?.message ?? 'Lỗi API hoặc quyền truy cập.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="border-white/20 active:bg-white/10"
              onClick={() => void queryClient.invalidateQueries({ queryKey: kdsKeys.queue(tenantId ?? '', stationEnum) })}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <RealtimeStatusPill status={realtimeStatus} tone="kds" />
      <KdsHeader
        station={station}
        tickets={kdsTickets}
        onOpenRecall={() => setRecallOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <KdsDndWrapper
          tickets={mine}
          onColumnChange={USE_KDS_MOCK ? undefined : handleLiveColumnChange}
        >
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
                  liveActions={liveActions}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  isSelected={kdsSelectedTicketId === t.ticketId}
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
                  liveActions={liveActions}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  isSelected={kdsSelectedTicketId === t.ticketId}
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
                  liveActions={liveActions}
                  effectiveSlaSeconds={effectiveSlaSeconds(t.slaSeconds, slaCapMinutes)}
                  isSelected={kdsSelectedTicketId === t.ticketId}
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
      </div>

      <KdsTicketSheet
        ticketId={sheetTicketId}
        station={station}
        open={Boolean(sheetTicketId)}
        tickets={kdsTickets}
        liveMode={!USE_KDS_MOCK}
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
