'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { PreparationStation } from '@einvoice/types';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import type { KdsRealtimeStatus } from './use-kds-realtime';
import { useKdsRealtime } from './use-kds-realtime';
import { useKdsQueue } from './use-kds-queue';
import { kdsKeys } from '../kds-keys';
import { useMockStore } from '@/mocks/store';
import { useFakeRealtime } from '@/mocks/use-fake-realtime';
import type { ColumnStatus, KDSTicketMock } from '@/mocks/kds-ticket';
import { mapSnapshotToBoardTickets } from '../lib/map-queue-tickets';
import { markKdsTicketDone, recallKdsTicket, setKdsTicketPriority, startKdsTicket } from '../services/kds.service';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface KdsBoardActions {
  advanceTicket: (id: string) => void;
  recallTicket: (id: string, reason: string, userId: string, userName: string) => void;
  togglePriority?: (id: string, priority: boolean) => void;
}

/**
 * Unified data contract returned by `useKdsBoardAdapter`.
 * `KdsBoard` depends only on this interface — no direct mock/live branching needed.
 */
export interface KdsBoardData {
  tickets: KDSTicketMock[];
  /** Sync read of latest tickets — used inside keyboard-shortcut effect to bypass stale closure. */
  getAllTickets: () => KDSTicketMock[];
  selectedTicketId: string | null;
  selectTicket: (id: string | null) => void;
  /** For keyboard shortcuts (1 = advance, 3 = recall). */
  advanceTicket: (id: string) => void;
  /** For keyboard shortcuts. */
  recallTicket: (id: string, reason: string, userId: string, userName: string) => void;
  /** Passed to KdsTicketCard; undefined in mock mode (mock handles actions internally). */
  liveActions: KdsBoardActions | undefined;
  /** Passed to KdsDndWrapper; undefined in mock mode. */
  onColumnChange: ((ticketId: string, col: ColumnStatus) => void) | undefined;
  realtimeStatus: KdsRealtimeStatus;
  queueLoading: boolean;
  queueError: Error | null;
  invalidateQueue: () => void;
  /** True when running against local mock store (NEXT_PUBLIC_KDS_MOCK=1). */
  isMock: boolean;
}

interface AdapterOptions {
  /** Constant derived from `process.env.NEXT_PUBLIC_KDS_MOCK`. */
  useMock: boolean;
  /** Full guard: !useMock && authHydrated && tenantId && accessToken. */
  liveEnabled: boolean;
  canManage: boolean;
  tenantId: string | undefined;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Adapter that unifies mock and live data behind a single `KdsBoardData` interface.
 *
 * Strategy pattern: both layers are always called (Rules of Hooks), but the live
 * layer is disabled (`enabled: false`) when `useMock` is true. The final return
 * value selects the appropriate layer.
 */
export function useKdsBoardAdapter(
  station: PreparationStation,
  { useMock, liveEnabled, canManage, tenantId }: AdapterOptions,
): KdsBoardData {
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Mock layer — always subscribed (React Rules of Hooks)
  // -------------------------------------------------------------------------
  useFakeRealtime(useMock);
  const mockTickets = useMockStore((s) => s.kdsTickets);
  const mockSelectedTicketId = useMockStore((s) => s.kdsSelectedTicketId);
  const mockSelectKdsTicket = useMockStore((s) => s.selectKdsTicket);
  const mockAdvanceTicket = useMockStore((s) => s.advanceTicket);
  const mockRecallTicket = useMockStore((s) => s.recallTicket);

  // -------------------------------------------------------------------------
  // Live layer — disabled when useMock=true
  // -------------------------------------------------------------------------
  const {
    data: snapshot,
    isLoading: queueLoading,
    error: queueError,
  } = useKdsQueue(station, {
    enabled: liveEnabled,
  });
  const realtimeStatus = useKdsRealtime(station, {
    enabled: liveEnabled,
    subscribeStation: canManage,
  });

  const [liveSelectedTicketId, setLiveSelectedTicketId] = useState<string | null>(null);

  const liveTickets = useMemo(
    () => (snapshot?.tickets?.length ? mapSnapshotToBoardTickets(snapshot.tickets, station) : []),
    [snapshot, station],
  );

  // Stable ref so getAllTickets() always reads the latest slice without stale closure.
  const ticketsRef = useRef<KDSTicketMock[]>([]);
  ticketsRef.current = useMock ? mockTickets : liveTickets;
  const getAllTickets = useCallback(() => ticketsRef.current, []);

  const invalidateQueue = useCallback(() => {
    if (tenantId) {
      void queryClient.invalidateQueries({ queryKey: kdsKeys.queue(tenantId, station) });
    }
  }, [queryClient, tenantId, station]);

  // Live mutations
  const startMut = useMutation({
    mutationFn: ({ ticketId, requestId }: { ticketId: string; requestId: string }) =>
      startKdsTicket(station, ticketId, requestId),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể bắt đầu ticket';
      toast.error(msg);
    },
  });

  const doneMut = useMutation({
    mutationFn: ({ ticketId, requestId }: { ticketId: string; requestId: string }) =>
      markKdsTicketDone(station, ticketId, requestId),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể đánh dấu xong';
      toast.error(msg);
    },
  });

  const recallMut = useMutation({
    mutationFn: ({ ticketId, requestId, reason }: { ticketId: string; requestId: string; reason?: string }) =>
      recallKdsTicket(station, ticketId, requestId, reason),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể recall ticket';
      toast.error(msg);
    },
  });

  const priorityMut = useMutation({
    mutationFn: ({ ticketId, requestId, priority }: { ticketId: string; requestId: string; priority: boolean }) =>
      setKdsTicketPriority(station, ticketId, requestId, priority),
    onSuccess: invalidateQueue,
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.serverMessage : 'Không thể cập nhật ưu tiên ticket';
      toast.error(msg);
    },
  });

  const liveAdvanceTicket = useCallback(
    (ticketId: string) => {
      const t = liveTickets.find((x) => x.ticketId === ticketId);
      if (!t) return;
      const requestId = crypto.randomUUID();
      if (t.columnStatus === 'WAITING') {
        startMut.mutate({ ticketId, requestId });
      } else if (t.columnStatus === 'IN_PROGRESS') {
        doneMut.mutate({ ticketId, requestId });
      }
    },
    [liveTickets, startMut, doneMut],
  );

  const liveRecallTicket = useCallback(
    (ticketId: string, reason: string) => {
      recallMut.mutate({ ticketId, requestId: crypto.randomUUID(), reason });
    },
    [recallMut],
  );

  const liveTogglePriority = useCallback(
    (ticketId: string, priority: boolean) => {
      priorityMut.mutate({ ticketId, requestId: crypto.randomUUID(), priority });
    },
    [priorityMut],
  );

  const handleLiveColumnChange = useCallback(
    (ticketId: string, col: ColumnStatus) => {
      const t = liveTickets.find((x) => x.ticketId === ticketId);
      if (!t) return;
      const requestId = crypto.randomUUID();
      if (t.columnStatus === 'WAITING' && col === 'IN_PROGRESS') {
        startMut.mutate({ ticketId, requestId });
      } else if (t.columnStatus === 'IN_PROGRESS' && col === 'DONE') {
        doneMut.mutate({ ticketId, requestId });
      } else if (t.columnStatus === 'DONE' && col === 'IN_PROGRESS') {
        recallMut.mutate({ ticketId, requestId, reason: 'Kéo thả recall' });
      }
    },
    [liveTickets, startMut, doneMut, recallMut],
  );

  const liveLiveActions: KdsBoardActions = {
    advanceTicket: liveAdvanceTicket,
    recallTicket: liveRecallTicket,
    togglePriority: canManage ? liveTogglePriority : undefined,
  };

  // -------------------------------------------------------------------------
  // Return unified interface
  // -------------------------------------------------------------------------
  if (useMock) {
    return {
      tickets: mockTickets,
      getAllTickets,
      selectedTicketId: mockSelectedTicketId,
      selectTicket: mockSelectKdsTicket,
      advanceTicket: mockAdvanceTicket,
      recallTicket: mockRecallTicket,
      liveActions: undefined,
      onColumnChange: undefined,
      realtimeStatus: 'connected' as KdsRealtimeStatus,
      queueLoading: false,
      queueError: null,
      invalidateQueue: () => {
        /* no-op: cache invalidation is not applicable in mock mode */
      },
      isMock: true,
    };
  }

  return {
    tickets: liveTickets,
    getAllTickets,
    selectedTicketId: liveSelectedTicketId,
    selectTicket: setLiveSelectedTicketId,
    advanceTicket: liveAdvanceTicket,
    recallTicket: liveRecallTicket,
    liveActions: liveLiveActions,
    onColumnChange: handleLiveColumnChange,
    realtimeStatus,
    queueLoading,
    queueError: queueError as Error | null,
    invalidateQueue,
    isMock: false,
  };
}
