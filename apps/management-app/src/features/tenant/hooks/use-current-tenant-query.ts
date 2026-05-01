'use client';

import { useQuery } from '@tanstack/react-query';
import { currentTenantService } from '../services/current-tenant.service';

export const currentTenantKeys = {
  all: ['tenant'] as const,
  current: () => [...currentTenantKeys.all, 'current'] as const,
};

export function useCurrentTenantQuery() {
  return useQuery({
    queryKey: currentTenantKeys.current(),
    queryFn: () => currentTenantService.getCurrent(),
  });
}
