'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { useMockStore } from '@/mocks/store';

export function NonOrderRouteReset() {
  const pathname = usePathname();

  useEffect(() => {
    const store = useMockStore.getState();

    if (!pathname.startsWith(ROUTES.POS_TABLES)) store.selectTable(null);
    if (!pathname.startsWith(ROUTES.POS_BILLS)) store.selectBill(null);
    if (!pathname.startsWith(ROUTES.POS_SERVICE_REQUESTS)) store.selectServiceRequest(null);
  }, [pathname]);

  return null;
}
