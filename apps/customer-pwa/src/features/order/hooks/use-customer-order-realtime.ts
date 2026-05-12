import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type {
  BillRequestedEvent,
  CartUpdatedEvent,
  KitchenItemReadyEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  PaymentCompletedRealtimeEvent,
  TableTransferredEvent,
} from '@einvoice/types';
import { io } from 'socket.io-client';
import { API_CONFIG } from '@/constants/api';
import { TENANT_LIFECYCLE_SOCKET_EVENTS } from '@/constants/tenant-lifecycle';
import { useSession } from '@/features/session/context/session-provider';
import { billKeys, cartKeys, orderKeys } from './use-order-query';

export type CustomerRealtimeStatus = 'idle' | 'connected' | 'reconnecting' | 'degraded' | 'auth-error';

function socketNamespaceUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.origin}/orders`;
  } catch {
    return 'http://localhost:3300/orders';
  }
}

export function useCustomerOrderRealtime(): CustomerRealtimeStatus {
  const queryClient = useQueryClient();
  const { session, patchTenantLifecycle } = useSession();
  const tenantId = session?.tenantId;
  const sessionId = session?.sessionId;
  const tenantSlug = session?.tenantSlug;
  const [status, setStatus] = useState<CustomerRealtimeStatus>('idle');

  useEffect(() => {
    if (!tenantId || !sessionId) {
      return;
    }

    const socket: Socket = io(socketNamespaceUrl(API_CONFIG.DEFAULT_BASE_URL), {
      auth: {
        tenantId,
        sessionId,
        ...(tenantSlug?.trim() ? { tenantSlug: tenantSlug.trim() } : {}),
      },
      autoConnect: true,
      reconnection: true,
      timeout: 10_000,
    });

    const invalidateSessionScope = (): void => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.snapshot(tenantId, sessionId) });
      void queryClient.invalidateQueries({ queryKey: billKeys.current(tenantId, sessionId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    };

    const invalidateOrder = (orderId: string): void => {
      invalidateSessionScope();
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(tenantId, sessionId, orderId) });
    };

    const onConnect = (): void => {
      setStatus('connected');
      invalidateSessionScope();
    };
    const onDisconnect = (): void => setStatus('degraded');
    const onAuthError = (): void => setStatus('auth-error');
    const onReconnectAttempt = (): void => setStatus('reconnecting');
    const onReconnect = (): void => {
      setStatus('connected');
      invalidateSessionScope();
    };
    const onReconnectError = (): void => setStatus('degraded');
    const onReconnectFailed = (): void => setStatus('degraded');
    const onBrowserRecovery = (): void => {
      invalidateSessionScope();
    };
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        invalidateSessionScope();
      }
    };

    const onCartUpdated = (event: CartUpdatedEvent): void => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    };
    const onOrderCreated = (event: OrderCreatedEvent): void => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateOrder(event.orderId);
    };
    const onOrderStatusChanged = (event: OrderStatusChangedEvent): void => {
      if (event.tenantId !== tenantId) return;
      invalidateOrder(event.orderId);
    };
    const onBillRequested = (event: BillRequestedEvent): void => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    };
    const onTableTransferred = (event: TableTransferredEvent): void => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    };
    const onKitchenItemReady = (event: KitchenItemReadyEvent): void => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateOrder(event.orderId);
    };
    const onPaymentCompleted = (event: PaymentCompletedRealtimeEvent): void => {
      if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
      invalidateSessionScope();
    };

    type TenantLifecyclePayload = {
      tenantId?: string;
      status?: 'SUSPENDED' | 'ACTIVE' | 'CLOSED';
      reason?: string | null;
    };

    const onTenantSuspended = (event: TenantLifecyclePayload): void => {
      if (event.tenantId !== tenantId) return;
      patchTenantLifecycle({
        tenantStatus: 'SUSPENDED',
        tenantStatusReason: event.reason ?? null,
      });
    };
    const onTenantActivated = (event: TenantLifecyclePayload): void => {
      if (event.tenantId !== tenantId) return;
      patchTenantLifecycle({ tenantStatus: 'ACTIVE', tenantStatusReason: null });
    };
    const onTenantClosed = (event: TenantLifecyclePayload): void => {
      if (event.tenantId !== tenantId) return;
      patchTenantLifecycle({ tenantStatus: 'CLOSED', tenantStatusReason: event.reason ?? null });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('events.authError', onAuthError);
    socket.on('events.cartUpdated', onCartUpdated);
    socket.on('events.orderCreated', onOrderCreated);
    socket.on('events.orderStatusChanged', onOrderStatusChanged);
    socket.on('events.billRequested', onBillRequested);
    socket.on('events.tableTransferred', onTableTransferred);
    socket.on('events.kitchenItemReady', onKitchenItemReady);
    socket.on('events.paymentCompleted', onPaymentCompleted);
    socket.on(TENANT_LIFECYCLE_SOCKET_EVENTS.SUSPENDED, onTenantSuspended);
    socket.on(TENANT_LIFECYCLE_SOCKET_EVENTS.ACTIVATED, onTenantActivated);
    socket.on(TENANT_LIFECYCLE_SOCKET_EVENTS.CLOSED, onTenantClosed);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.io.on('reconnect_error', onReconnectError);
    socket.io.on('reconnect_failed', onReconnectFailed);
    window.addEventListener('online', onBrowserRecovery);
    window.addEventListener('focus', onBrowserRecovery);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('events.authError', onAuthError);
      socket.off('events.cartUpdated', onCartUpdated);
      socket.off('events.orderCreated', onOrderCreated);
      socket.off('events.orderStatusChanged', onOrderStatusChanged);
      socket.off('events.billRequested', onBillRequested);
      socket.off('events.tableTransferred', onTableTransferred);
      socket.off('events.kitchenItemReady', onKitchenItemReady);
      socket.off('events.paymentCompleted', onPaymentCompleted);
      socket.off(TENANT_LIFECYCLE_SOCKET_EVENTS.SUSPENDED, onTenantSuspended);
      socket.off(TENANT_LIFECYCLE_SOCKET_EVENTS.ACTIVATED, onTenantActivated);
      socket.off(TENANT_LIFECYCLE_SOCKET_EVENTS.CLOSED, onTenantClosed);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.io.off('reconnect_error', onReconnectError);
      socket.io.off('reconnect_failed', onReconnectFailed);
      window.removeEventListener('online', onBrowserRecovery);
      window.removeEventListener('focus', onBrowserRecovery);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      socket.disconnect();
    };
  }, [queryClient, sessionId, tenantId, tenantSlug, patchTenantLifecycle]);

  return status;
}
