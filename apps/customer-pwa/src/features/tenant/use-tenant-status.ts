import { useSession } from '@/features/session/context/session-provider';

export type TenantStatusState = {
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  reason: string | null;
  canOrder: boolean;
};

export function useTenantStatus(): TenantStatusState {
  const { session } = useSession();
  const status = session?.tenantStatus ?? 'ACTIVE';
  const reason = session?.tenantStatusReason ?? null;
  return {
    status,
    reason,
    canOrder: status === 'ACTIVE',
  };
}
