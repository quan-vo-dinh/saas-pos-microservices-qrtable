'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

export type KdsSlaRadialDatum = { name: string; value: number; fill: string };

type Props = {
  chartData: KdsSlaRadialDatum[];
};

/** Client-only radial chart to avoid Recharts measuring (-1) during Next prerender. */
export function KdsSlaRadial({ chartData }: Props) {
  return (
    <div className="h-44 min-h-[176px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={176}>
        <RadialBarChart innerRadius="68%" outerRadius="100%" data={chartData} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--muted)' }} />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
