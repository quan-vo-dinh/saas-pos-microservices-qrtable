import { render, waitFor } from '@testing-library/react';
import { AuthSessionHydrator } from './auth-session-hydrator';
import { useAuthStore } from '@/lib/auth/auth-store';

const mockUseSession = jest.fn();
const mockSignIn = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe('AuthSessionHydrator', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    mockUseSession.mockReset();
    mockSignIn.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps session tenant when internal profile omits tenantId', async () => {
    mockUseSession.mockReturnValue({
      status: 'authenticated',
      data: {
        accessToken: 'access-token',
        user: {
          id: 'u1',
          email: 'chef@example.test',
          tenantId: 'tenant-from-session',
          roles: ['CHEF'],
          permissions: ['kitchen.get_queue'],
        },
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        userId: 'u1',
        email: 'chef@example.test',
        roles: ['CHEF'],
        permissions: ['kitchen.get_queue'],
      }),
    });

    render(<AuthSessionHydrator />);

    await waitFor(() => expect(useAuthStore.getState().hydrated).toBe(true));
    expect(useAuthStore.getState().profile?.tenantId).toBe('tenant-from-session');
  });
});
