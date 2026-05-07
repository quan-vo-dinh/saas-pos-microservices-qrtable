'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type { KdsQueueChangedEvent, KitchenItemReadyEvent, KitchenSlaWarningEvent } from '@einvoice/types';
import type { PreparationStation } from '@einvoice/types';
import { API_CONFIG } from '@/constants/api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { kdsKeys } from '../kds-keys';

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

/**
 * Subscribes to KDS-related Socket.IO events as invalidation hints; refetches REST snapshot.
 * Uses Bearer auth on the handshake (server-derived rooms). Refetches on reconnect.
 */
export function useKdsRealtime(station: PreparationStation, options?: { enabled?: boolean }): void {
  const enabledHook = options?.enabled !== false;
  const queryClient = useQueryClient();
  const tenantId = useAuthStore((s) => s.profile?.tenantId);
  const accessToken = useAuthStore((s) => s.accessToken);

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
        reconnection: true,
        timeout: 10_000,
      });
    } catch {
      return;
    }

    const bump = (): void => {
      invalidateKdsQueue(queryClient, tenantId, station);
    };

    socket.on('connect', bump);

    socket.on('events.kdsQueueChanged', (event: KdsQueueChangedEvent) => {
      if (event.tenantId !== tenantId) return;
      bump();
    });

    socket.on('events.kitchenItemReady', (_event: KitchenItemReadyEvent) => {
      bump();
    });

    socket.on('events.kitchenSlaWarning', (_event: KitchenSlaWarningEvent) => {
      bump();
    });

    return () => {
      socket?.disconnect();
    };
  }, [enabledHook, queryClient, tenantId, accessToken, station]);
}
