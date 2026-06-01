import { SAAS_PLAN_FEATURE } from '@einvoice/shared-constants';
import { ROUTES } from '@/constants/routes';
import type { DashboardSubscription } from '@/features/saas/types';
import type { DashboardEntitlements } from '../types';

export function deriveDashboardEntitlements(subscription: DashboardSubscription | undefined): DashboardEntitlements {
  const features = subscription?.current?.features ?? [];
  const currentPlanCode = subscription?.current?.planCode ?? null;

  const hasBasicAnalytics = features.includes(SAAS_PLAN_FEATURE.ANALYTICS_BASIC);
  const hasAdvancedAnalytics = features.includes(SAAS_PLAN_FEATURE.ANALYTICS_ADVANCED);

  return {
    currentPlanCode,
    features,
    hasBasicAnalytics,
    hasAdvancedAnalytics,
    canUseExtendedRange: hasAdvancedAnalytics,
    upgradeUrl: ROUTES.SUBSCRIPTION,
  };
}
