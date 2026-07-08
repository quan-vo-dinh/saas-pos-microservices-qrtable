'use client';

import { useQuery } from '@tanstack/react-query';
import { tenantKeys } from '../tenant-keys';
import { currentTenantService } from '../services/current-tenant.service';

export function useCurrentTenantQuery() {
  return useQuery({
    queryKey: tenantKeys.current(),
    queryFn: () => currentTenantService.getCurrent(),
  });
}
