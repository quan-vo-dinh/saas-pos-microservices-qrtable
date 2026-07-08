'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type {
  BillRequestedEvent,
  CartUpdatedEvent,
  KitchenItemReadyEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  PaymentCompletedRealtimeEvent,
  ServiceRequestedEvent,
  TableTransferredEvent,
} from '@einvoice/types';
import { API_CONFIG } from '@/constants/api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { billKeys } from '@/features/order/bill-keys';
import { orderKeys } from '@/features/order/order-keys';
import { paymentKeys } from '@/features/payment/payment-keys';
import { serviceRequestKeys } from '@/features/service-requests/service-request-keys';
import { tableKeys } from '@/features/tables/table-keys';

export type StaffRealtimeStatus = 'idle' | 'connected' | 'reconnecting' | 'degraded' | 'auth-error';

function socketNamespaceUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.origin}/orders`;
  } catch {
    return 'http://localhost:3300/orders';
  }
}

function invalidateOrders(queryClient: ReturnType<typeof useQueryClient>, orderId?: string): void {
  void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: orderKeys.details() });

  if (orderId) {
    void queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
  }
}

function invalidateServiceRequests(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: serviceRequestKeys.lists() });
}

function invalidateTables(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: tableKeys.all });
}

function invalidatePaymentState(queryClient: ReturnType<typeof useQueryClient>, billId?: string): void {
  void queryClient.invalidateQueries({ queryKey: billKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: tableKeys.all });
  void queryClient.invalidateQueries({ queryKey: paymentKeys.history(billId) });
}

export function useStaffOrderRealtime(options?: { enabled?: boolean }): StaffRealtimeStatus {
  const enabledHook = options?.enabled !== false;
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((state) => state.profile?.tenantId);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [status, setStatus] = useState<StaffRealtimeStatus>('idle');

  useEffect(() => {
    if (!enabledHook) {
      return;
    }
    if (!tenantId || !accessToken) {
      return;
    }

    let socket: Socket | undefined;

    try {
      socket = io(socketNamespaceUrl(API_CONFIG.DEFAULT_BFF_URL), {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        timeout: 10_000,
      });
    } catch {
      return;
    }

    const onConnect = (): void => {
      setStatus('connected');
      invalidateOrders(queryClient);
      invalidateServiceRequests(queryClient);
      invalidateTables(queryClient);
    };
    const onDisconnect = (): void => setStatus('degraded');
    const onAuthError = (): void => setStatus('auth-error');
    const onReconnectAttempt = (): void => setStatus('reconnecting');
    const onReconnect = (): void => {
      setStatus('connected');
      invalidateOrders(queryClient);
      invalidateServiceRequests(queryClient);
      invalidateTables(queryClient);
    };
    const onDisconnectError = (): void => setStatus('degraded');
    const onReconnectFailed = (): void => setStatus('degraded');

    const onCartUpdated = (event: CartUpdatedEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient);
    };

    const onOrderCreated = (event: OrderCreatedEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient, event.orderId);
      invalidateTables(queryClient);
    };

    const onOrderStatusChanged = (event: OrderStatusChangedEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient, event.orderId);
      invalidateTables(queryClient);
    };

    const onServiceRequested = (event: ServiceRequestedEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateServiceRequests(queryClient);
    };

    const onTableTransferred = (event: TableTransferredEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient);
      invalidateServiceRequests(queryClient);
      invalidateTables(queryClient);
    };

    const onBillRequested = (event: BillRequestedEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient);
      invalidateServiceRequests(queryClient);
    };

    const onKitchenItemReady = (event: KitchenItemReadyEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient, event.orderId);
    };

    const onPaymentCompleted = (event: PaymentCompletedRealtimeEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrders(queryClient);
      invalidatePaymentState(queryClient, event.billId);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('events.authError', onAuthError);
    socket.on('events.cartUpdated', onCartUpdated);
    socket.on('events.orderCreated', onOrderCreated);
    socket.on('events.orderStatusChanged', onOrderStatusChanged);
    socket.on('events.serviceRequested', onServiceRequested);
    socket.on('events.tableTransferred', onTableTransferred);
    socket.on('events.billRequested', onBillRequested);
    socket.on('events.kitchenItemReady', onKitchenItemReady);
    socket.on('events.paymentCompleted', onPaymentCompleted);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.io.on('reconnect_error', onDisconnectError);
    socket.io.on('reconnect_failed', onReconnectFailed);

    return () => {
      setStatus('idle');
      if (!socket) return;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('events.authError', onAuthError);
      socket.off('events.cartUpdated', onCartUpdated);
      socket.off('events.orderCreated', onOrderCreated);
      socket.off('events.orderStatusChanged', onOrderStatusChanged);
      socket.off('events.serviceRequested', onServiceRequested);
      socket.off('events.tableTransferred', onTableTransferred);
      socket.off('events.billRequested', onBillRequested);
      socket.off('events.kitchenItemReady', onKitchenItemReady);
      socket.off('events.paymentCompleted', onPaymentCompleted);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.io.off('reconnect_error', onDisconnectError);
      socket.io.off('reconnect_failed', onReconnectFailed);
      socket.disconnect();
    };
  }, [enabledHook, queryClient, tenantId, accessToken]);

  return status;
}
