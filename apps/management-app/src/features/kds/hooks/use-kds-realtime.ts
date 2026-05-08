'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type {
  KdsQueueChangedEvent,
  KitchenItemReadyEvent,
  KitchenSlaWarningEvent,
  PreparationStation,
} from '@einvoice/types';
import { API_CONFIG } from '@/constants/api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { kdsKeys } from '../kds-keys';

export type KdsRealtimeStatus = 'idle' | 'connected' | 'reconnecting' | 'degraded' | 'auth-error';

function socketNamespaceUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.origin}/orders`;
  } catch {
    return 'http://localhost:3300/orders';
  }
}

function invalidateKdsQueue(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  station: PreparationStation,
): void {
  void queryClient.invalidateQueries({ queryKey: kdsKeys.queue(tenantId, station) });
}

function matchesTenantStation(
  event: { tenantId: string; station: PreparationStation },
  tenantId: string,
  station: PreparationStation,
): boolean {
  return event.tenantId === tenantId && event.station === station;
}

/**
 * Subscribes to KDS-related Socket.IO events as invalidation hints; refetches REST snapshot.
 * Uses staff JWT in `auth.token` (server-derived rooms). Filters by tenant + station.
 */
export function useKdsRealtime(
  station: PreparationStation,
  options?: { enabled?: boolean; subscribeStation?: boolean },
): KdsRealtimeStatus {
  const enabledHook = options?.enabled !== false;
  const shouldSubscribeStation = options?.subscribeStation === true;
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((s) => s.profile?.tenantId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState<KdsRealtimeStatus>('idle');

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

    const bump = (): void => {
      invalidateKdsQueue(queryClient, tenantId, station);
    };
    const subscribeToStation = (): void => {
      if (shouldSubscribeStation) {
        socket.emit('subscribe.kds', { station });
      }
    };

    const onConnect = (): void => {
      setStatus('connected');
      subscribeToStation();
      bump();
    };
    const onDisconnect = (): void => setStatus('degraded');
    const onAuthError = (): void => setStatus('auth-error');
    const onReconnectAttempt = (): void => setStatus('reconnecting');
    const onReconnect = (): void => {
      setStatus('connected');
      subscribeToStation();
      bump();
    };
    const onReconnectError = (): void => setStatus('degraded');
    const onReconnectFailed = (): void => setStatus('degraded');

    const onKdsQueueChanged = (event: KdsQueueChangedEvent): void => {
      if (!matchesTenantStation(event, tenantId, station)) return;
      bump();
    };

    const onKitchenItemReady = (event: KitchenItemReadyEvent): void => {
      if (!matchesTenantStation(event, tenantId, station)) return;
      bump();
    };

    const onKitchenSlaWarning = (event: KitchenSlaWarningEvent): void => {
      if (!matchesTenantStation(event, tenantId, station)) return;
      bump();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('events.authError', onAuthError);
    socket.on('events.kdsQueueChanged', onKdsQueueChanged);
    socket.on('events.kitchenItemReady', onKitchenItemReady);
    socket.on('events.kitchenSlaWarning', onKitchenSlaWarning);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.io.on('reconnect_error', onReconnectError);
    socket.io.on('reconnect_failed', onReconnectFailed);

    return () => {
      setStatus('idle');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('events.authError', onAuthError);
      socket.off('events.kdsQueueChanged', onKdsQueueChanged);
      socket.off('events.kitchenItemReady', onKitchenItemReady);
      socket.off('events.kitchenSlaWarning', onKitchenSlaWarning);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.io.off('reconnect_error', onReconnectError);
      socket.io.off('reconnect_failed', onReconnectFailed);
      socket.disconnect();
    };
  }, [enabledHook, shouldSubscribeStation, queryClient, tenantId, accessToken, station]);

  return status;
}
