'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { useMockStore } from '@/mocks/store';
import { usePosTableUiState } from '@/features/tables/hooks/use-pos-table-ui-state';

export function NonOrderRouteReset() {
  const pathname = usePathname();

  useEffect(() => {
    const store = useMockStore.getState();

    if (!pathname.startsWith(ROUTES.POS_TABLES)) {
      usePosTableUiState.getState().selectTable(null);
    }
    if (!pathname.startsWith(ROUTES.POS_BILLS)) store.selectBill(null);
    if (!pathname.startsWith(ROUTES.POS_SERVICE_REQUESTS)) store.selectServiceRequest(null);
  }, [pathname]);

  return null;
}
