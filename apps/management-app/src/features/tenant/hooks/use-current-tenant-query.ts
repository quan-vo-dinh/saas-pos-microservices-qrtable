'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { tenantKeys } from '../tenant-keys';
import { currentTenantService } from '../services/current-tenant.service';

export function useCurrentTenantQuery() {
  const authReady = useAuthReadyForBff();
  return useQuery({
    queryKey: tenantKeys.current(),
    queryFn: () => currentTenantService.getCurrent(),
    enabled: authReady,
  });
}
