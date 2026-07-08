'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saasService } from '@/features/saas/services/saas.service';
import type { OnboardTenantPayload, PricingPlan } from '@/features/saas/types';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import { getActivePlanOptions, getNextPlanCode } from './plan-options';

const DEFAULT_MODES = ['INSTANT_ORDER', 'DIGITAL_MENU'] as const;

type OnboardTenantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanCode?: string;
  plans?: PricingPlan[];
  plansLoading?: boolean;
  onCreated: () => void;
};

export function OnboardTenantDialog({
  open,
  onOpenChange,
  defaultPlanCode = '',
  plans = [],
  plansLoading = false,
  onCreated,
}: OnboardTenantDialogProps) {
  const [tenantName, setTenantName] = useState('');
  const [tenantType, setTenantType] = useState('RESTAURANT');
  const [address, setAddress] = useState('');
  const [planCode, setPlanCode] = useState(defaultPlanCode);
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [instant, setInstant] = useState(true);
  const [digitalMenu, setDigitalMenu] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const activePlanOptions = useMemo(() => getActivePlanOptions(plans), [plans]);
  const selectedPlanCode = getNextPlanCode({
    plans,
    currentPlanCode: planCode || defaultPlanCode,
  });

  const reset = () => {
    setTenantName('');
    setTenantType('RESTAURANT');
    setAddress('');
    setPlanCode(getNextPlanCode({ plans, currentPlanCode: defaultPlanCode }));
    setOwnerFirstName('');
    setOwnerLastName('');
    setOwnerEmail('');
    setOwnerPassword('');
    setInstant(true);
    setDigitalMenu(true);
    setEmailError(null);
  };

  const handleSubmit = async () => {
    if (!selectedPlanCode) {
      return;
    }
    setEmailError(null);
    const operatingModes: string[] = [];
    if (instant) {
      operatingModes.push('INSTANT_ORDER');
    }
    if (digitalMenu) {
      operatingModes.push('DIGITAL_MENU');
    }
    if (!operatingModes.length) {
      operatingModes.push(...DEFAULT_MODES);
    }

    const payload: OnboardTenantPayload = {
      tenantName: tenantName.trim(),
      tenantType,
      address: address.trim() || undefined,
      initialPlanCode: selectedPlanCode,
      ownerEmail: ownerEmail.trim(),
      ownerPassword,
      ownerFirstName: ownerFirstName.trim(),
      ownerLastName: ownerLastName.trim(),
      operatingModes,
    };

    setSubmitting(true);
    try {
      await saasService.onboardTenant(payload);
      onCreated();
      onOpenChange(false);
      reset();
    } catch (e) {
      if (e instanceof ApiError && /email|duplicate|exists/i.test(e.serverMessage)) {
        setEmailError(e.serverMessage);
        return;
      }
      toast.error(e instanceof ApiError ? e.serverMessage : 'Onboarding tenant thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          reset();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Onboard tenant mới</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ob-name">Tên nhà hàng</Label>
            <Input id="ob-name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Loại hình</Label>
            <Input value={tenantType} onChange={(e) => setTenantType(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ob-addr">Địa chỉ</Label>
            <Input id="ob-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Gói ban đầu</Label>
            <Select
              value={selectedPlanCode}
              onValueChange={setPlanCode}
              disabled={plansLoading || activePlanOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={plansLoading ? 'Đang tải gói...' : 'Chọn gói'} />
              </SelectTrigger>
              <SelectContent>
                {activePlanOptions.map((plan) => (
                  <SelectItem key={plan.id} value={plan.code}>
                    {plan.code} · {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!plansLoading && activePlanOptions.length === 0 ? (
              <p className="text-destructive text-sm">Chưa có gói đang bán để onboard tenant.</p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ob-fn">Tên</Label>
              <Input id="ob-fn" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ob-ln">Họ</Label>
              <Input id="ob-ln" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ob-email">Email chủ sở hữu</Label>
            <Input
              id="ob-email"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              aria-invalid={Boolean(emailError)}
            />
            {emailError ? <p className="text-destructive text-sm">{emailError}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ob-password">Mật khẩu tạm thời</Label>
            <Input
              id="ob-password"
              type="password"
              value={ownerPassword}
              minLength={8}
              maxLength={128}
              onChange={(e) => setOwnerPassword(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Tối thiểu 8 ký tự. Owner sẽ dùng mật khẩu này để đăng nhập lần đầu.</p>
          </div>
          <div className="grid gap-2">
            <Label>Chế độ vận hành</Label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={instant} onCheckedChange={(v) => setInstant(v === true)} />
              INSTANT_ORDER
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={digitalMenu} onCheckedChange={(v) => setDigitalMenu(v === true)} />
              DIGITAL_MENU
            </label>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={
              submitting ||
              !tenantName.trim() ||
              !selectedPlanCode ||
              !ownerEmail.trim() ||
              ownerPassword.length < 8 ||
              !ownerFirstName.trim() ||
              !ownerLastName.trim()
            }
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Đang tạo…' : 'Tạo tenant'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
