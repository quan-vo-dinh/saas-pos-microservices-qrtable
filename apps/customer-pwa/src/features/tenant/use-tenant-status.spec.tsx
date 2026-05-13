import { renderHook } from '@testing-library/react';
import { useTenantStatus } from './use-tenant-status';

const useSessionMock = jest.fn();

jest.mock('@/features/session/context/session-provider', () => ({
  useSession: () => useSessionMock(),
}));

describe('useTenantStatus', () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({ session: null });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to ACTIVE when session has no tenantStatus', () => {
    useSessionMock.mockReturnValue({ session: { tenantStatus: undefined } });

    const { result } = renderHook(() => useTenantStatus());

    expect(result.current.status).toBe('ACTIVE');
    expect(result.current.canOrder).toBe(true);
  });

  it('blocks ordering for suspended tenant', () => {
    useSessionMock.mockReturnValue({
      session: { tenantStatus: 'SUSPENDED', tenantStatusReason: 'SUBSCRIPTION_EXPIRED' },
    });

    const { result } = renderHook(() => useTenantStatus());

    expect(result.current.status).toBe('SUSPENDED');
    expect(result.current.reason).toBe('SUBSCRIPTION_EXPIRED');
    expect(result.current.canOrder).toBe(false);
  });

  it('blocks ordering for closed tenant', () => {
    useSessionMock.mockReturnValue({ session: { tenantStatus: 'CLOSED', tenantStatusReason: 'closed by admin' } });

    const { result } = renderHook(() => useTenantStatus());

    expect(result.current.status).toBe('CLOSED');
    expect(result.current.reason).toBe('closed by admin');
    expect(result.current.canOrder).toBe(false);
  });
});
