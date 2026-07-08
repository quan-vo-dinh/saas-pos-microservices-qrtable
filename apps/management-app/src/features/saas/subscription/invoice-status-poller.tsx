'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { saasService } from '@/features/saas/services/saas.service';
import { saasKeys } from '@/features/saas/saas-keys';
import type { InvoiceStatus } from '@/features/saas/types';

type InvoiceStatusPollerProps = {
  invoiceId: string | null;
  enabled: boolean;
  onPaid: () => void;
  onTerminal: (status: InvoiceStatus | string) => void;
};

export function InvoiceStatusPoller({ invoiceId, enabled, onPaid, onTerminal }: InvoiceStatusPollerProps) {
  const handled = useRef(false);
  const authReady = useAuthReadyForBff();

  useEffect(() => {
    handled.current = false;
  }, [invoiceId]);

  const query = useQuery({
    queryKey: saasKeys.dashboardInvoiceStatus(invoiceId ?? ''),
    queryFn: () => (invoiceId ? saasService.getDashboardInvoiceStatus(invoiceId) : Promise.resolve({ status: '' })),
    enabled: authReady && Boolean(invoiceId) && enabled,
    refetchInterval: authReady && enabled && invoiceId ? 5000 : false,
  });

  useEffect(() => {
    const status = query.data?.status;
    if (!status || status === 'PENDING' || handled.current) {
      return;
    }
    handled.current = true;
    if (status === 'PAID') {
      onPaid();
    } else {
      onTerminal(status);
    }
  }, [onPaid, onTerminal, query.data?.status]);

  return null;
}
