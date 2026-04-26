import { useSyncExternalStore } from 'react';
import { BREAKPOINTS } from '@einvoice/shared-constants';

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.MOBILE - 1}px)`);
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth < BREAKPOINTS.MOBILE,
    () => false,
  );
}
