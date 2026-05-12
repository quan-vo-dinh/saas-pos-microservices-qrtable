'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const PLAN_FEATURE_OPTIONS = [
  { value: 'basic_pos', label: 'basic_pos' },
  { value: 'analytics_basic', label: 'analytics_basic' },
  { value: 'analytics_advanced', label: 'analytics_advanced' },
  { value: 'priority_support', label: 'priority_support' },
] as const;

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
        {PLAN_FEATURE_OPTIONS.map((f) => (
          <label key={f.value} className="flex items-center gap-2 text-sm">
            <Checkbox checked={value.includes(f.value)} onCheckedChange={(v) => toggle(f.value, v === true)} />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  );
}
