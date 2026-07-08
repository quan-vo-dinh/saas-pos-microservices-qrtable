'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';
import { Button } from '@/components/ui/button';
import { PlanFormDialog } from '@/features/saas/admin-plans/plan-form-dialog';
import { PlansTable } from '@/features/saas/admin-plans/plans-table';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { saasService } from '@/features/saas/services/saas.service';
import { saasKeys } from '@/features/saas/saas-keys';
import { phase4bPermissions, hasPermission } from '@/features/saas/permissions';
import type { CreatePlanPayload, PricingPlan, UpdatePlanPayload } from '@/features/saas/types';

export default function AdminPlansPage() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const authReady = useAuthReadyForBff();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editing, setEditing] = useState<PricingPlan | null>(null);

  const plansQuery = useQuery({
    queryKey: saasKeys.plans(),
    queryFn: () => saasService.listPlansAdmin(),
    enabled: authReady,
  });

  const handleSubmit = async (values: CreatePlanPayload) => {
    try {
      if (mode === 'create') {
        await saasService.createPlan(values);
        toast.success('Đã tạo gói');
      } else if (editing) {
        await saasService.updatePlan(editing.id, toUpdatePlanPayload(values));
        toast.success('Đã cập nhật gói');
      }
      await plansQuery.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Lưu thất bại');
      throw e;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gói cước</h1>
          <p className="text-muted-foreground text-sm">Quản lý pricing plans nền tảng.</p>
        </div>
        {hasPermission(permissions, phase4bPermissions.planCreate) ? (
          <Button
            type="button"
            onClick={() => {
              setMode('create');
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Tạo gói
          </Button>
        ) : null}
      </div>

      <PlansTable
        data={plansQuery.data ?? []}
        permissions={permissions}
        onEdit={(p) => {
          setMode('edit');
          setEditing(p);
          setDialogOpen(true);
        }}
      />

      <PlanFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function toUpdatePlanPayload(values: CreatePlanPayload): UpdatePlanPayload {
  return {
    name: values.name,
    description: values.description,
    priceVnd: values.priceVnd,
    billingPeriod: values.billingPeriod,
    maxTables: values.maxTables,
    maxStaff: values.maxStaff,
    maxOrdersPerDay: values.maxOrdersPerDay,
    features: values.features,
    isActive: values.isActive,
    displayOrder: values.displayOrder,
  };
}
