'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { usePosServiceRequestUiState } from '@/features/tables/hooks/use-pos-service-request-ui-state';
import { usePosTableUiState } from '@/features/tables/hooks/use-pos-table-ui-state';

export function NonOrderRouteReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith(ROUTES.POS_TABLES)) {
      usePosTableUiState.getState().selectTable(null);
    }
    if (!pathname.startsWith(ROUTES.POS_SERVICE_REQUESTS)) {
      usePosServiceRequestUiState.getState().selectServiceRequest(null);
    }
  }, [pathname]);

  return null;
}
