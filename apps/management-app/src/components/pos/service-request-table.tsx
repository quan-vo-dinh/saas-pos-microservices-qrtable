'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import type { ServiceRequest } from '@einvoice/types';
import { CircleHelp, Clock, Receipt, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useMockStore } from '@/mocks/store';
import {
  useAcknowledgeServiceRequestMutation,
  useResolveServiceRequestMutation,
  useServiceRequestsQuery,
} from '@/features/service-requests/hooks/use-service-request-query';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

function typeIcon(t: ServiceRequest['type']) {
  if (t === ServiceRequestType.CALL_STAFF) return UserRound;
  if (t === ServiceRequestType.REQUEST_BILL) return Receipt;
  return CircleHelp;
}

function waitM(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60_000;
}

function sessionMinutes(sessionId: string) {
  return 37 + (sessionId.length % 20);
}

export function ServiceRequestTable() {
  'use no memo';

  const [tab, setTab] = useState<'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'>('PENDING');
  const selectedServiceRequestId = useMockStore((s) => s.selectedServiceRequestId);
  const selectServiceRequest = useMockStore((s) => s.selectServiceRequest);
  const status = ServiceRequestStatus[tab];
  const requestsQuery = useServiceRequestsQuery({ status, limit: 100, offset: 0 });
  const tablesQuery = useTablesQuery();
  const acknowledgeMutation = useAcknowledgeServiceRequestMutation();
  const resolveMutation = useResolveServiceRequestMutation();

  const tableName = useCallback(
    (id: string) => tablesQuery.data?.find((t) => t.id === id)?.name ?? id,
    [tablesQuery.data],
  );

  const data = useMemo(
    () => (requestsQuery.data ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requestsQuery.data],
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
                <p className="mt-1 text-[0.65rem] text-muted-foreground">Đã ngồi ~{sessionMinutes(r.sessionId)} phút</p>
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
        cell: ({ row }) => (
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            {row.original.acknowledgedByUserId?.slice(0, 6) ?? '—'}
          </span>
        ),
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
                  disabled={acknowledgeMutation.isPending}
                  onClick={() => acknowledgeMutation.mutate(r.id)}
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
                  disabled={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate(r.id)}
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
    [acknowledgeMutation, resolveMutation, tableName],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is isolated in this "use no memo" component.
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
                  {requestsQuery.isLoading ? 'Đang tải yêu cầu…' : 'Không có yêu cầu ở tab này.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
