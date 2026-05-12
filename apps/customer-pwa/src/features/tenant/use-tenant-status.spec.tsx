jest.mock('@/constants/api', () => ({
  PWA_SESSION_STORAGE_KEY: 'qrtable:pwa:order-session-test',
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
    TENANT_ID: '023772bb-391b-401c-936a-ed7034b69cec',
    ENDPOINTS: {},
  },
}));

import { renderHook } from '@testing-library/react';
import { SessionProvider } from '@/features/session/context/session-provider';
import { useTenantStatus } from './use-tenant-status';

function wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
  return <SessionProvider>{children}</SessionProvider>;
}

describe('useTenantStatus', () => {
  it('defaults to ACTIVE when session has no tenantStatus', () => {
    const { result } = renderHook(() => useTenantStatus(), { wrapper });

    expect(result.current.status).toBe('ACTIVE');
    expect(result.current.canOrder).toBe(true);
  });
});
