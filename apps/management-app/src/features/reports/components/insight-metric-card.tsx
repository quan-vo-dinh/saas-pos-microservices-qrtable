'use client';

import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  title: string;
  description?: string;
  value: string;
  icon: LucideIcon;
  badge?: string;
  loading?: boolean;
};

export function InsightMetricCard({ title, description, value, icon: Icon, badge, loading }: Props) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="gap-1 font-normal">
            <Icon className="size-3" aria-hidden />
            {badge ?? 'KPI'}
          </Badge>
        </CardAction>
        {loading ? <Skeleton className="h-8 w-28" /> : <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>}
        {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      </CardHeader>
    </Card>
  );
}
