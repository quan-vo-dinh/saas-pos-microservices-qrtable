'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatQuota, formatVnd } from '@/features/saas/formatters';
import type { BillingPeriod, PricingPlan } from '@/features/saas/types';
import { PlanFeaturePicker } from './plan-feature-picker';

type PlanFormDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  initial?: PricingPlan | null;
  onSubmit: (values: {
    code: string;
    name: string;
    description: string | null;
    priceVnd: number;
    billingPeriod: BillingPeriod;
    maxTables: number;
    maxStaff: number;
    maxOrdersPerDay: number;
    features: string[];
    isActive: boolean;
    displayOrder: number;
  }) => Promise<void>;
};

export function PlanFormDialog({ open, onOpenChange, mode, initial, onSubmit }: PlanFormDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceVnd, setPriceVnd] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('MONTHLY');
  const [maxTables, setMaxTables] = useState(10);
  const [maxStaff, setMaxStaff] = useState(5);
  const [maxOrdersPerDay, setMaxOrdersPerDay] = useState(500);
  const [features, setFeatures] = useState<string[]>(['basic_pos']);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [busy, setBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initial && mode === 'edit') {
      setCode(initial.code);
      setName(initial.name);
      setDescription(initial.description ?? '');
      setPriceVnd(initial.priceVnd);
      setBillingPeriod(initial.billingPeriod);
      setMaxTables(initial.maxTables);
      setMaxStaff(initial.maxStaff);
      setMaxOrdersPerDay(initial.maxOrdersPerDay);
      setFeatures(initial.features?.length ? initial.features : ['basic_pos']);
      setIsActive(initial.isActive);
      setDisplayOrder(initial.displayOrder);
    } else if (mode === 'create') {
      setCode('');
      setName('');
      setDescription('');
      setPriceVnd(0);
      setBillingPeriod('MONTHLY');
      setMaxTables(10);
      setMaxStaff(5);
      setMaxOrdersPerDay(500);
      setFeatures(['basic_pos']);
      setIsActive(true);
      setDisplayOrder(0);
    }
    setCodeError(null);
  }, [open, initial, mode]);

  const preview = `${code || 'PLAN'} · ${formatVnd(priceVnd)} / ${billingPeriod === 'MONTHLY' ? 'tháng' : 'năm'} · ${formatQuota(maxTables)} bàn · ${formatQuota(maxStaff)} nhân sự · ${formatQuota(maxOrdersPerDay)} đơn/ngày`;

  const validate = () => {
    const c = code.trim().toUpperCase();
    if (c.length < 2 || c.length > 40) {
      setCodeError('Mã gói 2–40 ký tự, in hoa.');
      return false;
    }
    setCodeError(null);
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        priceVnd: Math.max(0, priceVnd),
        billingPeriod,
        maxTables,
        maxStaff,
        maxOrdersPerDay,
        features,
        isActive,
        displayOrder,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tạo gói' : 'Sửa gói'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="text-muted-foreground rounded-md border px-3 py-2 text-xs">{preview}</div>
          <div className="grid gap-1.5">
            <Label>Mã (in hoa)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={mode === 'edit'} />
            {codeError ? <p className="text-destructive text-xs">{codeError}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label>Tên</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Mô tả</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Giá (VND)</Label>
              <Input
                type="number"
                value={priceVnd}
                onChange={(e) => setPriceVnd(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Chu kỳ</Label>
              <select
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
              >
                <option value="MONTHLY">Tháng</option>
                <option value="YEARLY">Năm</option>
              </select>
            </div>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>maxTables (-1 = ∞)</Label>
              <Input type="number" value={maxTables} onChange={(e) => setMaxTables(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>maxStaff</Label>
              <Input type="number" value={maxStaff} onChange={(e) => setMaxStaff(Number(e.target.value))} />
            </div>
            <div className="grid gap-1.5">
              <Label>maxOrders/day</Label>
              <Input type="number" value={maxOrdersPerDay} onChange={(e) => setMaxOrdersPerDay(Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Đang bán</span>
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          </label>
          <div className="grid gap-1.5">
            <Label>Thứ tự hiển thị</Label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
          </div>
          <PlanFeaturePicker value={features} onChange={setFeatures} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" disabled={busy} onClick={() => void handleSave()}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
