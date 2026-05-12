import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@einvoice/types';
import {
  CUSTOMER_SESSION_EXPIRED_EVENT,
  setCustomerSessionId,
  setCustomerTenantId,
} from '@/lib/api-client';
import { PWA_SESSION_STORAGE_KEY } from '@/constants/api';

export type TenantLifecycleStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export type SessionInfo = {
  sessionId: string;
  tenantId: string;
  tableId: string;
  tableName: string;
  restaurantName?: string;
  startedAt?: string;
  lastActivity?: string;
  tenantStatus?: TenantLifecycleStatus;
  tenantStatusReason?: string | null;
  /** Public slug from QR URL — used for optional Socket.io slug room. */
  tenantSlug?: string;
};

type SessionContextValue = {
  session: SessionInfo | null;
  isActive: boolean;
  hydrated: boolean;
  startSession: (info: SessionInfo) => void;
  endSession: () => void;
  patchTenantLifecycle: (patch: { tenantStatus: TenantLifecycleStatus; tenantStatusReason?: string | null }) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function persistSession(info: SessionInfo | null): void {
  if (typeof window === 'undefined') return;
  if (!info) {
    window.localStorage.removeItem(PWA_SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(PWA_SESSION_STORAGE_KEY, JSON.stringify(info));
}

/** Maps Order `Session` entity from join response into UI + persistence shape. */
export function sessionEntityToInfo(
  entity: Session,
  restaurantName?: string,
  tenantSlug?: string,
): SessionInfo {
  return {
    sessionId: entity.id,
    tenantId: entity.tenantId,
    tableId: entity.tableId,
    tableName: entity.tableName,
    restaurantName: restaurantName ?? entity.tableName,
    startedAt: entity.startedAt,
    lastActivity: entity.lastActivity,
    tenantStatus: entity.tenantStatus,
    tenantStatusReason: entity.tenantStatusReason ?? null,
    tenantSlug,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PWA_SESSION_STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as SessionInfo;
        if (parsed?.sessionId && parsed?.tenantId && parsed?.tableId) {
          setSession(parsed);
          setCustomerSessionId(parsed.sessionId);
          setCustomerTenantId(parsed.tenantId);
        }
      }
    } catch {
      // ignore corrupt storage
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setSession(null);
      setCustomerSessionId(null);
      setCustomerTenantId(null);
      persistSession(null);
    };

    window.addEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const startSession = useCallback((info: SessionInfo) => {
    setSession(info);
    setCustomerSessionId(info.sessionId);
    setCustomerTenantId(info.tenantId);
    persistSession(info);
  }, []);

  const endSession = useCallback(() => {
    setSession(null);
    setCustomerSessionId(null);
    setCustomerTenantId(null);
    persistSession(null);
  }, []);

  const patchTenantLifecycle = useCallback(
    (patch: { tenantStatus: TenantLifecycleStatus; tenantStatusReason?: string | null }) => {
      setSession((prev) => {
        if (!prev) {
          return prev;
        }
        const next: SessionInfo = {
          ...prev,
          tenantStatus: patch.tenantStatus,
          tenantStatusReason: patch.tenantStatusReason ?? null,
        };
        persistSession(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      session,
      isActive: session !== null,
      hydrated,
      startSession,
      endSession,
      patchTenantLifecycle,
    }),
    [session, hydrated, startSession, endSession, patchTenantLifecycle],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
