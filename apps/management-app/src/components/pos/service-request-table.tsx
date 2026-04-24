'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import type { ServiceRequest } from '@einvoice/types';
import { CircleHelp, Clock, Receipt, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@einvoice/frontend-ui';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useMockStore } from '@/mocks/store';

function typeIcon(t: ServiceRequest['type']) {
  if (t === ServiceRequestType.CALL_STAFF) return UserRound;
  if (t === ServiceRequestType.REQUEST_BILL) return Receipt;
  return CircleHelp;
}

function statusTab(s: ServiceRequestStatus) {
  if (s === ServiceRequestStatus.PENDING) return 'PENDING' as const;
  if (s === ServiceRequestStatus.ACKNOWLEDGED) return 'ACKNOWLEDGED' as const;
  return 'RESOLVED' as const;
}

function waitM(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60_000;
}

function sessionMinutes(sessionId: string) {
  return 37 + (sessionId.length % 20);
}

export function ServiceRequestTable() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? 'staff-waiter-1';
  const [tab, setTab] = useState<'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'>('PENDING');
  const requests = useMockStore((s) => s.serviceRequests);
  const tables = useMockStore((s) => s.tables);
  const mockUsers = useMockStore((s) => s.mockUsers);
  const ack = useMockStore((s) => s.acknowledgeRequest);
  const resolve = useMockStore((s) => s.resolveRequest);
  const selectedServiceRequestId = useMockStore((s) => s.selectedServiceRequestId);
  const selectServiceRequest = useMockStore((s) => s.selectServiceRequest);

  const tableName = useCallback(
    (id: string) => tables.find((t) => t.id === id)?.name ?? id,
    [tables],
  );

  const data = useMemo(
    () => requests.filter((r) => statusTab(r.status) === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, tab],
  );

  const columns: ColumnDef<ServiceRequest>[] = useMemo(
    () => [
      {
        id: 't',
        header: '',
        cell: ({ row }) => {
          const I = typeIcon(row.original.type);
          return <I className="size-4 text-muted-foreground" aria-label={row.original.type} />;
        },
        size: 28,
      },
      {
        id: 'table',
        header: 'Bàn',
        cell: ({ row }) => <span className="text-xs font-medium">{tableName(row.original.tableId)}</span>,
      },
      {
        id: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => {
          const r = row.original;
          const n = r.note?.trim() ?? '';
          return (
            <HoverCard>
              <HoverCardTrigger asChild>
                <span className="line-clamp-2 max-w-40 text-[0.7rem] text-muted-foreground" tabIndex={0}>
                  {n || '—'}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 text-xs" side="right">
                <p>{n || 'Không có'}</p>
                <p className="mt-1 text-[0.65rem] text-muted-foreground">Đã ngồi ~{sessionMinutes(r.sessionId)} phút (mock)</p>
              </HoverCardContent>
            </HoverCard>
          );
        },
      },
      {
        id: 'wait',
        header: 'Chờ',
        cell: ({ row }) => {
          const m = waitM(row.original.createdAt);
          return (
            <div className="inline-flex items-center gap-0.5 font-mono text-[0.7rem] tabular-nums">
              <Clock className="size-3 opacity-60" />
              {m.toFixed(0)}&apos;
            </div>
          );
        },
      },
      {
        id: 'staff',
        header: 'NV',
        cell: () => {
          const u = mockUsers[0];
          return (
            <Avatar className="size-6">
              <AvatarFallback className="text-[0.5rem]">{u.name[0]}</AvatarFallback>
            </Avatar>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const r = row.original;
          if (r.status === ServiceRequestStatus.PENDING) {
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  className="h-7 px-2 text-[0.7rem]"
                  onClick={() => {
                    void ack(r.id, userId);
                    toast('Đã xác nhận', {
                      action: { label: 'Gỡ', onClick: () => void toast('Undo mock: không hỗ trợ') },
                    });
                    setTab('ACKNOWLEDGED');
                  }}
                >
                  Nhận
                </Button>
              </div>
            );
          }
          if (r.status === ServiceRequestStatus.ACKNOWLEDGED) {
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-7 px-2 text-[0.7rem]"
                  onClick={() => {
                    void resolve(r.id, userId);
                    toast('Đã xong');
                    setTab('RESOLVED');
                  }}
                >
                  Xong
                </Button>
              </div>
            );
          }
          return <span className="text-[0.65rem] text-muted-foreground">—</span>;
        },
      },
    ],
    [ack, mockUsers, resolve, tableName, userId],
  );

  const t = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2" data-slot="pos-service-inbox">
      <ToggleGroup
        type="single"
        className="h-7 w-full min-w-0 max-w-sm justify-start gap-0.5"
        value={tab}
        onValueChange={(v) => v && setTab(v as 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED')}
        aria-label="Bộ lọc trạng thái yêu cầu"
      >
        <ToggleGroupItem className="h-6 text-[0.7rem] px-2" value="PENDING">
          PENDING
        </ToggleGroupItem>
        <ToggleGroupItem className="h-6 text-[0.7rem] px-2" value="ACKNOWLEDGED">
          Đã nhận
        </ToggleGroupItem>
        <ToggleGroupItem className="h-6 text-[0.7rem] px-2" value="RESOLVED">
          Xong
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="min-h-0 max-h-[min(64vh,560px)] flex-1 overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            {t.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="h-7">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="p-1 text-[0.65rem]">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {t.getRowModel().rows.length ? (
              t.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={selectedServiceRequestId === row.original.id ? 'selected' : undefined}
                  className={cn(
                    'h-8 cursor-pointer',
                    selectedServiceRequestId === row.original.id && 'bg-muted/40',
                  )}
                  onClick={() => selectServiceRequest(row.original.id)}
                >
                  {row.getVisibleCells().map((c) => (
                    <TableCell key={c.id} className="p-1">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-20 text-center text-sm text-muted-foreground"
                >
                  Không có yêu cầu ở tab này.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
