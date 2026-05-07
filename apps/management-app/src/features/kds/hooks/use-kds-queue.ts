'use client';

import { useQuery } from '@tanstack/react-query';
import type { PreparationStation } from '@einvoice/types';
import { useAuthStore } from '@/lib/auth/auth-store';
import { kdsKeys } from '../kds-keys';
import { fetchKdsQueue } from '../services/kds.service';

export function useKdsQueue(station: PreparationStation, options?: { enabled?: boolean }) {
  const tenantId = useAuthStore((s) => s.profile?.tenantId);
  const enabled = options?.enabled !== false;

  return useQuery({
    queryKey: kdsKeys.queue(tenantId ?? '', station),
    queryFn: () => fetchKdsQueue(station),
    enabled: Boolean(tenantId) && enabled,
    staleTime: 0,
  });
}
