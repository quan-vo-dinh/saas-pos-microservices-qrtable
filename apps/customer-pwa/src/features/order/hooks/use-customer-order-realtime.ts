import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  BillRequestedEvent,
  CartUpdatedEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  TableTransferredEvent,
} from '@einvoice/types';
import { io } from 'socket.io-client';
import { API_CONFIG } from '@/constants/api';
import { useSession } from '@/features/session/context/session-provider';
import { billKeys, cartKeys, orderKeys } from './use-order-query';

function socketNamespaceUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.origin}/orders`;
  } catch {
    return 'http://localhost:3300/orders';
  }
}

export function useCustomerOrderRealtime(): void {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;

  useEffect(() => {
    if (!tenantId || !sessionId) return;

    const socket = io(socketNamespaceUrl(API_CONFIG.DEFAULT_BASE_URL), {
      autoConnect: true,
      reconnection: true,
      timeout: 10_000,
    });

    const invalidateSessionScope = (): void => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.snapshot(tenantId, sessionId) });
      void queryClient.invalidateQueries({ queryKey: billKeys.current(tenantId, sessionId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    };

    socket.on('connect', () => {
      socket.emit('join.session', { sessionId });
    });

    socket.on('events.cartUpdated', (event: CartUpdatedEvent) => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    });

    socket.on('events.orderCreated', (event: OrderCreatedEvent) => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(tenantId, sessionId, event.orderId) });
    });

    socket.on('events.orderStatusChanged', (event: OrderStatusChangedEvent) => {
      if (event.tenantId !== tenantId) return;
      invalidateSessionScope();
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(tenantId, sessionId, event.orderId) });
    });

    socket.on('events.billRequested', (event: BillRequestedEvent) => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    });

    socket.on('events.tableTransferred', (event: TableTransferredEvent) => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, sessionId, tenantId]);
}
