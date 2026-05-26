'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saasApi } from '@/features/saas/api';
import { formatDateTime, formatVnd } from '@/features/saas/formatters';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import type { InvoiceStatus, SubscriptionInvoice } from '@/features/saas/types';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { ManualConfirmDialog } from './manual-confirm-dialog';

export function AdminBillingClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const authReady = useAuthReadyForBff();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [manual, setManual] = useState<SubscriptionInvoice | null>(null);

  const filters = useMemo(
    () => ({
      status: (searchParams.get('status') as InvoiceStatus | '') || '',
      tenantId: searchParams.get('tenantId') ?? '',
      planCode: searchParams.get('planCode') ?? '',
      from: searchParams.get('from') ?? '',
      to: searchParams.get('to') ?? '',
      page: Number(searchParams.get('page') ?? '1') || 1,
      limit: 20,
    }),
    [searchParams],
  );

  const pushParams = (mutate: (n: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    router.push(`/admin/billing?${next.toString()}`);
  };

  const list = useQuery({
    queryKey: ['admin-billing', filters],
    queryFn: () =>
      saasApi.listAdminInvoices({
        status: filters.status || undefined,
        tenantId: filters.tenantId || undefined,
        planCode: filters.planCode || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page: filters.page,
        limit: filters.limit,
      }),
    enabled: authReady,
  });

  const confirm = async (note: string) => {
    if (!manual) {
      return;
    }
    try {
      await saasApi.manualConfirmInvoice(manual.id, { note });
      toast.success('Đã xác nhận hóa đơn');
      await qc.invalidateQueries({ queryKey: ['admin-billing'] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Xác nhận thất bại');
      throw e;
    }
  };

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="grid gap-1.5">
          <Label>Trạng thái</Label>
          <Select
            value={filters.status || 'ALL'}
            onValueChange={(v) =>
              pushParams((n) => {
                if (v === 'ALL') {
                  n.delete('status');
                } else {
                  n.set('status', v as InvoiceStatus);
                }
                n.set('page', '1');
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="PAID">PAID</SelectItem>
              <SelectItem value="UNDERPAID">UNDERPAID</SelectItem>
              <SelectItem value="EXPIRED">EXPIRED</SelectItem>
              <SelectItem value="CANCELED">CANCELED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Tenant ID</Label>
          <Input
            defaultValue={filters.tenantId}
            onBlur={(e) =>
              pushParams((n) => {
                const v = e.target.value.trim();
                if (v) {
                  n.set('tenantId', v);
                } else {
                  n.delete('tenantId');
                }
                n.set('page', '1');
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Plan code</Label>
          <Input
            defaultValue={filters.planCode}
            placeholder="Nhập mã gói"
            onBlur={(e) =>
              pushParams((n) => {
                const v = e.target.value.trim().toUpperCase();
                if (v) {
                  n.set('planCode', v);
                } else {
                  n.delete('planCode');
                }
                n.set('page', '1');
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Từ ngày</Label>
          <Input
            type="date"
            defaultValue={filters.from}
            onChange={(e) =>
              pushParams((n) => {
                const v = e.target.value;
                if (v) {
                  n.set('from', v);
                } else {
                  n.delete('from');
                }
                n.set('page', '1');
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Đến ngày</Label>
          <Input
            type="date"
            defaultValue={filters.to}
            onChange={(e) =>
              pushParams((n) => {
                const v = e.target.value;
                if (v) {
                  n.set('to', v);
                } else {
                  n.delete('to');
                }
                n.set('page', '1');
              })
            }
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã TT</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Gói</TableHead>
              <TableHead>Số tiền</TableHead>
              <TableHead>TT</TableHead>
              <TableHead>QR hết hạn</TableHead>
              <TableHead>Đã TT</TableHead>
              <TableHead>Tạo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-xs">{inv.billingReference}</TableCell>
                <TableCell className="max-w-[140px] truncate text-xs">{inv.tenantId}</TableCell>
                <TableCell>{inv.planCodeSnapshot}</TableCell>
                <TableCell className="whitespace-nowrap text-end text-sm">
                  <InvoiceAmount invoice={inv} />
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(inv.qrExpiresAt)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(inv.paidAt)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatDateTime(inv.createdAt)}</TableCell>
                <TableCell className="text-end">
                  {inv.status === 'PENDING' && inv.qrUrl ? (
                    <Button asChild size="sm" variant="outline" className="me-1">
                      <a href={inv.qrUrl} target="_blank" rel="noreferrer">
                        QR
                      </a>
                    </Button>
                  ) : null}
                  {['PENDING', 'UNDERPAID'].includes(inv.status) &&
                  hasPermission(permissions, phase4bPermissions.subscriptionAssign) ? (
                    <Button size="sm" variant="destructive" onClick={() => setManual(inv)}>
                      Xác nhận tay
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && !list.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground p-6 text-center text-sm">
                  Không có hóa đơn.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between text-sm text-muted-foreground">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.page <= 1}
          onClick={() =>
            pushParams((n) => {
              n.set('page', String(filters.page - 1));
            })
          }
        >
          Trước
        </Button>
        <span>
          Trang {filters.page}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filters.page >= totalPages}
          onClick={() =>
            pushParams((n) => {
              n.set('page', String(filters.page + 1));
            })
          }
        >
          Sau
        </Button>
      </div>

      <ManualConfirmDialog invoice={manual} open={Boolean(manual)} onOpenChange={(o) => !o && setManual(null)} onConfirm={confirm} />
    </div>
  );
}

function InvoiceAmount({ invoice }: { invoice: SubscriptionInvoice }) {
  if (invoice.status !== 'UNDERPAID') {
    return <span>{formatVnd(invoice.amountVnd)}</span>;
  }

  const paidAmount = Math.max(0, invoice.paidAmountVnd ?? 0);
  const shortfall = Math.max(0, invoice.amountVnd - paidAmount);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span>{formatVnd(invoice.amountVnd)}</span>
      <span className="text-muted-foreground text-xs">Đã nhận {formatVnd(paidAmount)}</span>
      <span className="text-destructive text-xs">Thiếu {formatVnd(shortfall)}</span>
    </div>
  );
}
