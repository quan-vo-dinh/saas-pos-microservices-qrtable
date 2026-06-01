'use client';

import Link from 'next/link';
import { Crown, LockKeyhole } from 'lucide-react';
import { planFeatureVi, SAAS_PLAN_FEATURE, type SaasPlanFeature } from '@einvoice/shared-constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardEntitlements } from '../types';

type Props = {
  title: string;
  description: string;
  requiredFeature: SaasPlanFeature;
  recommendedPlan: 'BASIC' | 'PREMIUM';
  entitlements: DashboardEntitlements;
};

export function DashboardFeatureLockCard({
  title,
  description,
  requiredFeature,
  recommendedPlan,
  entitlements,
}: Props) {
  const featureLabel = planFeatureVi(requiredFeature);
  const isPremium = recommendedPlan === 'PREMIUM';

  return (
    <Card className="border-dashed bg-muted/30">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {isPremium ? <Crown className="size-4 text-amber-600" aria-hidden /> : null}
              <LockKeyhole className="size-4 text-muted-foreground" aria-hidden />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline">Gói {recommendedPlan}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Cần tính năng <span className="font-medium text-foreground">{featureLabel}</span>
          {entitlements.currentPlanCode ? (
            <>
              {' '}
              — gói hiện tại: <span className="font-medium text-foreground">{entitlements.currentPlanCode}</span>
            </>
          ) : null}
          .
        </p>
        <Button asChild size="sm" variant={isPremium ? 'default' : 'secondary'}>
          <Link href={entitlements.upgradeUrl}>Nâng cấp gói</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function basicAnalyticsLockProps(entitlements: DashboardEntitlements) {
  return {
    title: 'Báo cáo cơ bản',
    description: 'Doanh thu, đơn hàng và trạng thái bàn trong kỳ.',
    requiredFeature: SAAS_PLAN_FEATURE.ANALYTICS_BASIC,
    recommendedPlan: 'BASIC' as const,
    entitlements,
  };
}

export function advancedAnalyticsLockProps(entitlements: DashboardEntitlements) {
  return {
    title: 'Phân tích nâng cao',
    description: 'Top món, phương thức thanh toán và đối soát gần đây.',
    requiredFeature: SAAS_PLAN_FEATURE.ANALYTICS_ADVANCED,
    recommendedPlan: 'PREMIUM' as const,
    entitlements,
  };
}
