'use client';

import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useMemo } from 'react';
import { useMockStore } from '@/mocks/store';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const HOURS = ['6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'];

export function TodayMiniCharts() {
  const tables = useMockStore((s) => s.tables);

  const { lineData, barData, pieData } = useMemo(() => {
    const line = HOURS.map((h, i) => ({
      t: h,
      v: 120_000 + i * 28_000 + (i % 3) * 12_000,
    }));
    const top = [
      { name: 'Phở bò', c: 42 },
      { name: 'Cơm tấm', c: 36 },
      { name: 'Bún chả', c: 28 },
      { name: 'Trà đào', c: 22 },
      { name: 'Gỏi cuốn', c: 18 },
    ];
    const statusCount = {
      available: tables.filter((t) => t.status === 'available').length,
      occupied: tables.filter((t) => t.status === 'occupied').length,
      billing: tables.filter((t) => t.status === 'billing').length,
      cleaning: tables.filter((t) => t.status === 'cleaning').length,
    };
    const pie = [
      { name: 'Trống', value: statusCount.available, fill: 'hsl(160 60% 40%)' },
      { name: 'Có khách', value: statusCount.occupied, fill: 'hsl(45 90% 45%)' },
      { name: 'Thanh toán', value: statusCount.billing, fill: 'hsl(0 70% 50%)' },
      { name: 'Dọn', value: statusCount.cleaning, fill: 'hsl(210 70% 50%)' },
    ];
    return { lineData: line, barData: top, pieData: pie };
  }, [tables]);

  return (
    <Collapsible defaultOpen className="group/collapsible w-full min-w-0">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="flex h-8 w-full min-w-0 items-center justify-between gap-1 px-2 text-xs font-medium"
        >
          <span className="truncate">Today (mock)</span>
          <ChevronDown className="size-4 shrink-0 transition group-data-[state=open]/collapsible:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="min-w-0 px-1 pb-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="h-24 w-full min-w-0 min-h-24">
            <p className="mb-0.5 text-[0.6rem] text-muted-foreground">Doanh thu 6h–22h</p>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={lineData} margin={{ top: 2, right: 2, left: -18, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fontSize: 9 }} />
                <YAxis hide />
                <Tooltip />
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-24 w-full min-w-0 min-h-24">
            <p className="mb-0.5 text-[0.6rem] text-muted-foreground">Top 5 món (từ mock)</p>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="c" fill="hsl(var(--accent))" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-28 w-full min-w-0 min-h-28">
            <p className="mb-0.5 text-[0.6rem] text-muted-foreground">Trạng thái bàn</p>
            <ResponsiveContainer width="100%" height={96}>
              <PieChart>
                <Tooltip />
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={22} outerRadius={40} paddingAngle={2}>
                  {pieData.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
