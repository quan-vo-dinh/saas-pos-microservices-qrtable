'use client';

import { useEffect, useState } from 'react';
import { CircleHelp, Clock, Receipt, UserRound } from 'lucide-react';
import { serviceRequestStatusVi, serviceRequestTypeVi } from '@einvoice/shared-constants';
import { ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useAcknowledgeServiceRequestMutation,
  useResolveServiceRequestMutation,
  useServiceRequestsQuery,
} from '@/features/service-requests/hooks/use-service-request-query';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

function formatViDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN');
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

  if (!request) {
    return (
      <p className="p-2 text-sm text-muted-foreground" data-slot="service-detail-missing">
        {requestsQuery.isLoading ? 'Đang tải yêu cầu…' : 'Không tìm thấy yêu cầu.'}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 text-sm" data-slot="service-request-detail">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              {request.type === ServiceRequestType.CALL_STAFF ? (
                <UserRound className="size-4 shrink-0 text-accent" aria-hidden />
              ) : request.type === ServiceRequestType.REQUEST_BILL ? (
                <Receipt className="size-4 shrink-0 text-accent" aria-hidden />
              ) : (
                <CircleHelp className="size-4 shrink-0 text-accent" aria-hidden />
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

      <dl className="grid gap-2 text-[0.75rem]">
        <div>
          <dt className="text-muted-foreground">Loại yêu cầu</dt>
          <dd className="font-medium">{serviceRequestTypeVi(request.type)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tạo lúc</dt>
          <dd className="font-mono tabular-nums">{formatViDateTime(request.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Nhận xử lý</dt>
          <dd className="font-mono tabular-nums">{formatViDateTime(request.acknowledgedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Hoàn tất</dt>
          <dd className="font-mono tabular-nums">{formatViDateTime(request.resolvedAt)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1">
        <p className="text-[0.65rem] font-medium uppercase text-muted-foreground">Ghi chú khách</p>
        <p className="rounded-md border border-border/50 bg-muted/20 p-2 text-[0.8rem] leading-relaxed">
          {request.note?.trim() || 'Không có ghi chú.'}
        </p>
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
