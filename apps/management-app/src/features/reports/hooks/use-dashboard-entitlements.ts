'use client';

import { useQuery } from '@tanstack/react-query';
import { saasService } from '@/features/saas/services/saas.service';
import { saasKeys } from '@/features/saas/saas-keys';
import { deriveDashboardEntitlements } from '../utils/derive-dashboard-entitlements';

export function useDashboardEntitlements() {
  const subscriptionQuery = useQuery({
    queryKey: saasKeys.dashboardSubscription(),
    queryFn: () => saasService.getDashboardSubscription(),
  });

  const entitlements = deriveDashboardEntitlements(subscriptionQuery.data);

  return {
    ...subscriptionQuery,
    entitlements,
    subscription: subscriptionQuery.data,
  };
}
