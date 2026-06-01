'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReportGrain, ReportRangeQuery } from '../types';

type Props = {
  value: ReportRangeQuery;
  onChange: (next: ReportRangeQuery) => void;
};

const GRAIN_OPTIONS: { value: ReportGrain; label: string }[] = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'week', label: 'Theo tuần' },
  { value: 'month', label: 'Theo tháng' },
];

export function ReportRangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.grain ?? 'day'}
        onValueChange={(grain) => onChange({ ...value, grain: grain as ReportGrain })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Nhóm theo" />
        </SelectTrigger>
        <SelectContent>
          {GRAIN_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-xs">Mặc định 7 ngày gần nhất · múi giờ Asia/Ho_Chi_Minh</p>
    </div>
  );
}
