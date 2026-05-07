'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  ServiceRequestedEvent,
  TableTransferredEvent,
} from '@einvoice/types';
import { io } from 'socket.io-client';
import { API_CONFIG } from '@/constants/api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { tableKeys } from '@/features/tables/hooks/use-tables-query';
import { serviceRequestKeys } from '@/features/service-requests/hooks/use-service-request-query';
import { orderKeys } from './use-order-query';

function socketNamespaceUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.origin}/orders`;
  } catch {
    return 'http://localhost:3300/orders';
  }
}

export function useStaffOrderRealtime(): void {
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.profile?.tenantId);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!tenantId || !accessToken) return;

    const socket = io(socketNamespaceUrl(API_CONFIG.DEFAULT_BFF_URL), {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      timeout: 10_000,
    });

    const invalidateOrders = (orderId?: string): void => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: orderKeys.details() });

      if (orderId) {
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
      }
    };

    const invalidateServiceRequests = (): void => {
      void queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
    };

    const invalidateTables = (): void => {
      void queryClient.invalidateQueries({ queryKey: tableKeys.all });
    };

    socket.on('connect', () => {
      socket.emit('join.staff', { tenantId });
    });

    socket.on('events.orderCreated', (event: OrderCreatedEvent) => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(event.orderId);
      invalidateTables();
    });

    socket.on('events.orderStatusChanged', (event: OrderStatusChangedEvent) => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(event.orderId);
      invalidateTables();
    });

    socket.on('events.serviceRequested', (event: ServiceRequestedEvent) => {
      if (event.tenantId !== tenantId) return;
      invalidateServiceRequests();
    });

    socket.on('events.tableTransferred', (event: TableTransferredEvent) => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders();
      invalidateServiceRequests();
      invalidateTables();
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, tenantId, accessToken]);
}
