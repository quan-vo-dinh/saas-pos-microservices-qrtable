jest.mock('@/constants/api', () => ({
  PWA_SESSION_STORAGE_KEY: 'qrtable:pwa:order-session-test',
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
    TENANT_ID: '023772bb-391b-401c-936a-ed7034b69cec',
    ENDPOINTS: {},
  },
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PWA_SESSION_STORAGE_KEY } from '@/constants/api';
import {
  setCustomerSessionId,
  setCustomerTenantId,
} from '@/lib/api-client';
import { SessionProvider, useSession } from './context/session-provider';

function Probe(): React.ReactElement {
  const { session, hydrated, startSession, endSession } = useSession();
  return (
    <div>
      <span data-testid="hydrated">{hydrated ? 'yes' : 'no'}</span>
      <span data-testid="session-id">{session?.sessionId ?? ''}</span>
      <button
        type="button"
        onClick={() =>
          startSession({
            sessionId: 'sid-1',
            tenantId: 'ten-1',
            tableId: 'tbl-1',
            tableName: 'Bàn 1',
          })
        }
      >
        start
      </button>
      <button type="button" onClick={() => endSession()}>
        end
      </button>
    </div>
  );
}

describe('SessionProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    setCustomerSessionId(null);
    setCustomerTenantId(null);
  });

  it('hydrates session from localStorage and exposes hydrated flag', async () => {
    localStorage.setItem(
      PWA_SESSION_STORAGE_KEY,
      JSON.stringify({
        sessionId: 'stored-sid',
        tenantId: 'stored-ten',
        tableId: 'stored-tbl',
        tableName: 'Bàn stored',
      }),
    );

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('hydrated').textContent).toBe('yes');
    });

    expect(screen.getByTestId('session-id').textContent).toBe('stored-sid');
  });

  it('persists session on start and clears on end', async () => {
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('hydrated').textContent).toBe('yes'));

    fireEvent.click(screen.getByText('start'));

    await waitFor(() => {
      expect(screen.getByTestId('session-id').textContent).toBe('sid-1');
    });

    const raw = localStorage.getItem(PWA_SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).sessionId).toBe('sid-1');

    fireEvent.click(screen.getByText('end'));

    await waitFor(() => {
      expect(screen.getByTestId('session-id').textContent).toBe('');
    });

    expect(localStorage.getItem(PWA_SESSION_STORAGE_KEY)).toBeNull();
  });
});
