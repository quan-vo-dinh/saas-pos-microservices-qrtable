'use client';

import { useQuery } from '@tanstack/react-query';
import { saasApi } from '@/features/saas/api';
import { deriveDashboardEntitlements } from '../utils/derive-dashboard-entitlements';

export function useDashboardEntitlements() {
  const subscriptionQuery = useQuery({
    queryKey: ['dashboard', 'subscription'],
    queryFn: () => saasApi.getDashboardSubscription(),
  });

  const entitlements = deriveDashboardEntitlements(subscriptionQuery.data);

  return {
    ...subscriptionQuery,
    entitlements,
    subscription: subscriptionQuery.data,
  };
}
