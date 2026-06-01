'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  title: string;
  description?: string;
  value: string;
  loading?: boolean;
};

export function ReportMetricCard({ title, description, value, loading }: Props) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        {loading ? <Skeleton className="h-8 w-28" /> : <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>}
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </CardHeader>
    </Card>
  );
}
