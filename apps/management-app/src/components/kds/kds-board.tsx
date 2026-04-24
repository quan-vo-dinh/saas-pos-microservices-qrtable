'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KdsHeader } from '@/components/kds/kds-header';
import { KdsColumn } from '@/components/kds/kds-column';
import { KdsTicketCard } from '@/components/kds/kds-ticket-card';
import { KdsDndWrapper } from '@/components/kds/kds-dnd-wrapper';
import { KdsTicketSheet } from '@/components/kds/kds-ticket-sheet';
import { useFakeRealtime } from '@/mocks/use-fake-realtime';
import { useMockStore } from '@/mocks/store';
import type { KDSStation } from '@/mocks/kds-ticket';
import type { ColumnStatus } from '@/mocks/kds-ticket';
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

  const kdsTickets = useMockStore((s) => s.kdsTickets);
  const recallLog = useMockStore((s) => s.recallLog);

  const [sheetTicketId, setSheetTicketId] = useState<string | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);

  useFakeRealtime();

  const mine = useMemo(
    () => kdsTickets.filter((t) => t.station === station),
    [kdsTickets, station],
  );

  const byColumn = (c: ColumnStatus) => mine.filter((t) => t.columnStatus === c);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-mono text-sm text-white/60">
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
            <Button asChild variant="outline" className="border-white/20">
              <Link href={ROUTES.DASHBOARD}>Về dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-slot="kds-board">
      <KdsHeader
        station={station}
        tickets={kdsTickets}
        onOpenRecall={() => setRecallOpen(true)}
        onOpenSettings={() => toast.info('Cài đặt trạm (Task 30: station-settings-popover).')}
      />
      <KdsDndWrapper>
        <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2 md:p-3">
          <KdsColumn
            columnId="WAITING"
            title="Chờ"
            accentClass="bg-[var(--lime)]/15"
            count={byColumn('WAITING').length}
          >
            {byColumn('WAITING').map((t) => (
              <KdsTicketCard key={t.ticketId} ticket={t} onTitleClick={() => setSheetTicketId(t.ticketId)} />
            ))}
          </KdsColumn>
          <KdsColumn
            columnId="IN_PROGRESS"
            title="Đang làm"
            accentClass="bg-[var(--amber)]/20"
            count={byColumn('IN_PROGRESS').length}
          >
            {byColumn('IN_PROGRESS').map((t) => (
              <KdsTicketCard key={t.ticketId} ticket={t} onTitleClick={() => setSheetTicketId(t.ticketId)} />
            ))}
          </KdsColumn>
          <KdsColumn columnId="DONE" title="Hoàn thành" accentClass="bg-[var(--pink)]/15" count={byColumn('DONE').length}>
            {byColumn('DONE').map((t) => (
              <KdsTicketCard key={t.ticketId} ticket={t} onTitleClick={() => setSheetTicketId(t.ticketId)} />
            ))}
          </KdsColumn>
        </div>
      </KdsDndWrapper>

      <KdsTicketSheet
        ticketId={sheetTicketId}
        station={station}
        open={Boolean(sheetTicketId)}
        onOpenChange={(o) => {
          if (!o) setSheetTicketId(null);
        }}
      />

      <Sheet open={recallOpen} onOpenChange={setRecallOpen}>
        <SheetContent side="right" className="border-l border-white/10 bg-[#090b10] text-[var(--ink)] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Recall log</SheetTitle>
            <SheetDescription className="text-white/55">Batch 4 stub — đầy đủ ở Task 30.</SheetDescription>
          </SheetHeader>
          <div className="max-h-[70vh] overflow-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[0.65rem]">Lúc</TableHead>
                  <TableHead className="text-[0.65rem]">Ticket</TableHead>
                  <TableHead className="text-[0.65rem]">Lý do</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recallLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-white/50">
                      Chưa có recall.
                    </TableCell>
                  </TableRow>
                ) : (
                  recallLog.map((e) => (
                    <TableRow key={e.id} className="border-white/10">
                      <TableCell className="font-mono text-[0.65rem]">
                        {new Date(e.createdAt).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.ticketId.slice(-4)}</TableCell>
                      <TableCell className="text-[0.75rem]">{e.reason}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
