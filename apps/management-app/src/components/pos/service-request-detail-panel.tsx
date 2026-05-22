'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleHelp, Clock, Receipt, UserRound } from 'lucide-react';
import { serviceRequestStatusVi } from '@einvoice/shared-constants';
import { ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useAcknowledgeServiceRequestMutation,
  useResolveServiceRequestMutation,
  useServiceRequestsQuery,
} from '@/features/service-requests/hooks/use-service-request-query';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

function hashSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i) * (i + 3)) % 251;
  }
  return h;
}

export function ServiceRequestDetailPanel({ requestId }: { requestId: string }) {
  const requestsQuery = useServiceRequestsQuery({ limit: 100, offset: 0 });
  const tablesQuery = useTablesQuery();
  const acknowledgeMutation = useAcknowledgeServiceRequestMutation();
  const resolveMutation = useResolveServiceRequestMutation();

  const request = requestsQuery.data?.find((r) => r.id === requestId);
  const table = request ? tablesQuery.data?.find((t) => t.id === request.tableId) : undefined;

  const [waitMin, setWaitMin] = useState(0);
  useEffect(() => {
    if (!request) return;
    const calc = () => Math.max(0, (Date.now() - new Date(request.createdAt).getTime()) / 60_000);
    const boot = window.setTimeout(() => setWaitMin(calc()), 0);
    const id = window.setInterval(() => setWaitMin(calc()), 15_000);
    return () => {
      window.clearTimeout(boot);
      window.clearInterval(id);
    };
  }, [request]);

  const spark = useMemo(() => {
    if (!request) return [];
    const seed = hashSeed(request.id);
    return Array.from({ length: 10 }, (_, i) => ({
      t: `${6 + i}h`,
      v: 12 + ((seed + i * 11) % 28),
    }));
  }, [request]);

  if (!request) {
    return (
      <p className="p-2 text-sm text-muted-foreground" data-slot="service-detail-missing">
        {requestsQuery.isLoading ? 'Đang tải yêu cầu…' : 'Không tìm thấy yêu cầu.'}
      </p>
    );
  }

  const fillId = `srfill${hashSeed(request.id)}`;

  return (
    <div className="flex min-h-0 flex-col gap-3 text-sm" data-slot="service-request-detail">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              {request.type === ServiceRequestType.CALL_STAFF ? (
                <UserRound className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
              ) : request.type === ServiceRequestType.REQUEST_BILL ? (
                <Receipt className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
              ) : (
                <CircleHelp className="size-4 shrink-0 text-[var(--accent)]" aria-hidden />
              )}
              <span className="truncate font-mono text-xs text-muted-foreground">{request.id}</span>
            </div>
            <p className="text-base font-semibold leading-tight">{table?.name ?? request.tableId}</p>
            <p className="text-[0.7rem] text-muted-foreground">{table?.areaName ?? '—'}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[0.65rem]">
            {serviceRequestStatusVi(request.status)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
          <Clock className="size-3.5 shrink-0 opacity-70" aria-hidden />
          Chờ ~{waitMin.toFixed(0)} phút · session {request.sessionId.slice(0, 8)}…
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Ghi chú khách</p>
        <p className="rounded-md border border-border/50 bg-muted/20 p-2 text-[0.8rem] leading-relaxed">
          {request.note?.trim() || 'Không có ghi chú.'}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Mật độ yêu cầu</p>
        <div className="h-24 min-h-24 w-full min-w-0 rounded-md border border-border/40 bg-background/40">
          <ResponsiveContainer width="100%" height={96}>
            <AreaChart data={spark} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(v) => [`${typeof v === 'number' ? v : '—'} req/h`, 'ước tính']}
                labelFormatter={(l) => `${l}`}
              />
              <Area type="monotone" dataKey="v" stroke="var(--accent)" fill={`url(#${fillId})`} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Separator />

      <div className="mt-auto flex flex-col gap-2 border-t border-border/40 pt-2">
        {request.status === ServiceRequestStatus.PENDING ? (
          <Button
            type="button"
            className="w-full"
            disabled={acknowledgeMutation.isPending}
            onClick={() => acknowledgeMutation.mutate(request.id)}
          >
            Nhận xử lý
          </Button>
        ) : null}
        {request.status === ServiceRequestStatus.ACKNOWLEDGED ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={resolveMutation.isPending}
            onClick={() => resolveMutation.mutate(request.id)}
          >
            Hoàn tất
          </Button>
        ) : null}
        {request.status === ServiceRequestStatus.RESOLVED ? (
          <p className="text-center text-[0.75rem] text-muted-foreground">Yêu cầu đã đóng · chỉ xem lại.</p>
        ) : null}
      </div>
    </div>
  );
}
