import { useEffect, useState } from 'react';
import { BREAKPOINTS } from '@einvoice/shared-constants';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.MOBILE - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
