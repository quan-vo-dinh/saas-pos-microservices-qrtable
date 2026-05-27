'use client';

import { planFeatureVi } from '@einvoice/shared-constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/** Wire codes stored in DB/API — display via planFeatureVi(). */
export const PLAN_FEATURE_WIRE_CODES = [
  'basic_pos',
  'analytics_basic',
  'analytics_advanced',
  'priority_support',
] as const;

export type PlanFeatureWireCode = (typeof PLAN_FEATURE_WIRE_CODES)[number];

export function PlanFeaturePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (code: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, code])));
    } else {
      onChange(value.filter((v) => v !== code));
    }
  };

  return (
    <div className="grid gap-2">
      <Label>Tính năng</Label>
      <div className="grid gap-2">
        {PLAN_FEATURE_WIRE_CODES.map((code) => (
          <label key={code} className="flex items-center gap-2 text-sm">
            <Checkbox checked={value.includes(code)} onCheckedChange={(v) => toggle(code, v === true)} />
            {planFeatureVi(code)}
          </label>
        ))}
      </div>
    </div>
  );
}
