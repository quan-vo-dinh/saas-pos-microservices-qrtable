'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@einvoice/frontend-ui';
import { ROUTES } from '@/constants/routes';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { saasApi } from '@/features/saas/api';
import { formatDateTime } from '@/features/saas/formatters';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import type { TenantDetail, TenantStatus } from '@/features/saas/types';
import { getActivePlanOptions, getNextPlanCode } from './plan-options';
import { TenantStatusBadge } from './tenant-status-badge';

export function TenantDetailHeader({ tenant, permissions }: { tenant: TenantDetail; permissions: string[] }) {
  const qc = useQueryClient();
  const [closeOpen, setCloseOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [closeReason, setCloseReason] = useState('');

  const invalidate = () =>
    void qc
      .invalidateQueries({ queryKey: ['admin-tenant', tenant.id] })
      .then(() => qc.invalidateQueries({ queryKey: ['admin-tenants'] }));

  const statusMutation = useMutation({
    mutationFn: async (input: { action: 'SUSPEND' | 'ACTIVATE' | 'CLOSE'; reason?: string }) => {
      await saasApi.updateTenantStatus(tenant.id, input);
    },
    onSuccess: async (_, v) => {
      toast.success(v.action === 'CLOSE' ? 'Tenant đã đóng' : 'Đã cập nhật trạng thái');
      setCloseOpen(false);
      setConfirmName('');
      setCloseReason('');
      await invalidate();
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Thao tác thất bại');
    },
  });

  const canSuspend = tenant.status === 'ACTIVE' && hasPermission(permissions, phase4bPermissions.tenantSuspend);
  const canActivate = tenant.status === 'SUSPENDED' && hasPermission(permissions, phase4bPermissions.tenantActivate);
  const canClose = tenant.status !== 'CLOSED' && hasPermission(permissions, phase4bPermissions.tenantClose);

  return (
    <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{tenant.name}</h1>
          <TenantStatusBadge status={tenant.status} />
          {tenant.planCode ? <Badge variant="secondary">{tenant.planCode}</Badge> : null}
        </div>
        <p className="text-muted-foreground text-sm">{tenant.slug}</p>
        <p className="text-sm">
          Chủ: {tenant.ownerName ?? tenant.ownerEmail ?? '—'}
          {tenant.ownerName && tenant.ownerEmail ? (
            <span className="text-muted-foreground"> ({tenant.ownerEmail})</span>
          ) : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canSuspend ? (
          <Button type="button" variant="outline" onClick={() => statusMutation.mutate({ action: 'SUSPEND' })}>
            Tạm khóa
          </Button>
        ) : null}
        {canActivate ? (
          <Button type="button" onClick={() => statusMutation.mutate({ action: 'ACTIVATE' })}>
            Kích hoạt
          </Button>
        ) : null}
        {canClose ? (
          <Button type="button" variant="destructive" onClick={() => setCloseOpen(true)}>
            Đóng tenant
          </Button>
        ) : null}
      </div>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đóng tenant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-destructive text-sm">
              Hành động này không thể hoàn tác. Nhập đúng tên tenant để xác nhận.
            </p>
            <div className="grid gap-1.5">
              <Label>Tên tenant</Label>
              <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
            </div>
            <div className="grid gap-1.5">
              <Label>Lý do</Label>
              <Textarea value={closeReason} onChange={(e) => setCloseReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseOpen(false)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmName.trim() !== tenant.name || statusMutation.isPending}
              onClick={() => statusMutation.mutate({ action: 'CLOSE', reason: closeReason.trim() || undefined })}
            >
              Xác nhận đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TenantOverviewTab({ tenant }: { tenant: TenantDetail }) {
  return (
    <div className="grid max-w-2xl gap-3 text-sm">
      <div className="flex justify-between gap-4 border-b py-2">
        <span className="text-muted-foreground">Loại</span>
        <span>{tenant.type}</span>
      </div>
      <div className="flex justify-between gap-4 border-b py-2">
        <span className="text-muted-foreground">Địa chỉ</span>
        <span className="text-end">{tenant.address ?? '—'}</span>
      </div>
      <div className="flex justify-between gap-4 border-b py-2">
        <span className="text-muted-foreground">Locale / tiền tệ</span>
        <span>
          {tenant.defaultLocale} · {tenant.defaultCurrency}
        </span>
      </div>
      <div className="flex justify-between gap-4 border-b py-2">
        <span className="text-muted-foreground">Chế độ</span>
        <span>{tenant.operatingModes?.join(', ') || '—'}</span>
      </div>
      <div className="flex justify-between gap-4 border-b py-2">
        <span className="text-muted-foreground">Tạo lúc</span>
        <span>{formatDateTime(tenant.createdAt)}</span>
      </div>
    </div>
  );
}

export function TenantSubscriptionsTab({
  tenantId,
  tenantStatus,
  permissions,
}: {
  tenantId: string;
  tenantStatus: TenantStatus;
  permissions: string[];
}) {
  const qc = useQueryClient();
  const authReady = useAuthReadyForBff();
  const list = useQuery({
    queryKey: ['admin-tenant-subs', tenantId],
    queryFn: () => saasApi.listTenantSubscriptions(tenantId),
    enabled: authReady,
  });
  const [planCode, setPlanCode] = useState('');
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [effectiveAt] = useState(() => new Date().toISOString());
  const plans = useQuery({
    queryKey: ['admin-plans', 'assign-options'],
    queryFn: () => saasApi.listPlansAdmin(),
    enabled: authReady,
  });
  const activePlanOptions = useMemo(() => getActivePlanOptions(plans.data), [plans.data]);
  const selectedPlanCode = getNextPlanCode({ plans: plans.data, currentPlanCode: planCode });

  const assign = useMutation({
    mutationFn: () => saasApi.assignTenantSubscription(tenantId, { planCode: selectedPlanCode, billingPeriod }),
    onSuccess: async () => {
      toast.success('Đã gán gói');
      await qc.invalidateQueries({ queryKey: ['admin-tenant-subs', tenantId] });
      await qc.invalidateQueries({ queryKey: ['admin-tenant', tenantId] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.serverMessage : 'Gán gói thất bại'),
  });

  const canAssign = hasPermission(permissions, phase4bPermissions.subscriptionAssign);

  return (
    <div className="space-y-6">
      {canAssign ? (
        <div className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-end">
          <div className="grid flex-1 gap-2 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Gói</Label>
              <Select
                value={selectedPlanCode}
                onValueChange={setPlanCode}
                disabled={plans.isLoading || activePlanOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn gói" />
                </SelectTrigger>
                <SelectContent>
                  {activePlanOptions.map((plan) => (
                    <SelectItem key={plan.id} value={plan.code}>
                      {plan.code} · {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!plans.isLoading && activePlanOptions.length === 0 ? (
                <p className="text-destructive text-xs">Chưa có gói đang bán để gán.</p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label>Chu kỳ</Label>
              <Select value={billingPeriod} onValueChange={(value) => setBillingPeriod(value as 'MONTHLY' | 'YEARLY')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Tháng</SelectItem>
                  <SelectItem value="YEARLY">Năm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Hiệu lực</Label>
              <Input value={formatDateTime(effectiveAt)} readOnly />
            </div>
          </div>
          <div className="text-muted-foreground text-xs md:flex-1">
            {tenantStatus === 'ACTIVE' ? (
              <p>Gói hiện tại sẽ chuyển sang SUPERSEDED khi gán gói mới.</p>
            ) : (
              <p>Kích hoạt gói mới sẽ mở lại tenant nếu đang tạm khóa.</p>
            )}
          </div>
          <Button
            type="button"
            disabled={assign.isPending || plans.isLoading || activePlanOptions.length === 0 || !selectedPlanCode}
            onClick={() => assign.mutate()}
          >
            Gán gói
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-start">Gói</th>
              <th className="p-2 text-start">Trạng thái</th>
              <th className="p-2 text-start">Hết hạn</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.planCode}</td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{formatDateTime(row.expiresAt ?? null)}</td>
              </tr>
            ))}
            {!list.data?.length && !list.isLoading ? (
              <tr>
                <td className="text-muted-foreground p-4" colSpan={3}>
                  Chưa có lịch sử đăng ký.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotaBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max <= 0 || max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {max === -1 ? '∞' : max}
        </span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TenantUsageTab({ tenantId }: { tenantId: string }) {
  const authReady = useAuthReadyForBff();
  const usage = useQuery({
    queryKey: ['admin-tenant-usage', tenantId],
    queryFn: () => saasApi.getTenantUsage(tenantId),
    enabled: authReady,
    refetchInterval: authReady ? 30_000 : false,
  });
  const u = usage.data ?? {};
  return (
    <div className="max-w-lg space-y-4">
      <QuotaBar label="Bàn" used={u.tablesUsed ?? 0} max={u.tablesMax ?? 0} />
      <QuotaBar label="Nhân sự" used={u.staffUsed ?? 0} max={u.staffMax ?? 0} />
      <QuotaBar label="Đơn hôm nay" used={u.ordersToday ?? 0} max={u.ordersMaxPerDay ?? 0} />
    </div>
  );
}

export function TenantAuditTab({ tenantId }: { tenantId: string }) {
  const authReady = useAuthReadyForBff();
  const audit = useQuery({
    queryKey: ['admin-tenant-audit', tenantId],
    queryFn: () => saasApi.getTenantAudit(tenantId),
    enabled: authReady,
  });
  return (
    <ol className="border-s-muted max-w-2xl space-y-3 border-s ps-4 text-sm">
      {(audit.data ?? []).map((e, i) => (
        <li key={e.id ?? `${e.at}-${i}`} className="relative">
          <span className="text-muted-foreground absolute -start-[21px] mt-1 size-2 rounded-full bg-primary" />
          <p className="font-medium">{e.action}</p>
          <p className="text-muted-foreground text-xs">{formatDateTime(e.at ?? null)}</p>
          {e.detail ? <p className="mt-1">{e.detail}</p> : null}
        </li>
      ))}
      {!audit.data?.length && !audit.isLoading ? (
        <li className="text-muted-foreground">Chưa có sự kiện audit.</li>
      ) : null}
    </ol>
  );
}

export function TenantBillingLinkTab({ tenantId }: { tenantId: string }) {
  const href = `${ROUTES.ADMIN_BILLING}?tenantId=${encodeURIComponent(tenantId)}`;
  return (
    <p className="text-sm">
      Xem hóa đơn subscription trong{' '}
      <Link href={href} className="text-primary font-medium underline">
        Billing
      </Link>
      .
    </p>
  );
}
