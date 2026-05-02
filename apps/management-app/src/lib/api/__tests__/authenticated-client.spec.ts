import type { UserProfile } from '@einvoice/types';

/* ------------------------------------------------------------------ */
/*  Mocks – declared before the module under test is imported          */
/* ------------------------------------------------------------------ */

// Mock `apiClient` from the shared frontend-utils library
const mockApiClient = jest.fn();
jest.mock('@einvoice/frontend-utils', () => ({
  apiClient: mockApiClient,
}));

// Mock `getBffBaseUrl` to return a deterministic URL
const FAKE_BFF_URL = 'http://localhost:3300/api/v1';
jest.mock('@/lib/auth/bff-server', () => ({
  getBffBaseUrl: () => FAKE_BFF_URL,
}));

/* ------------------------------------------------------------------ */
/*  Real Zustand store – works fine in a Node / jsdom environment      */
/* ------------------------------------------------------------------ */
import { useAuthStore } from '@/lib/auth/auth-store';

/* ------------------------------------------------------------------ */
/*  Module under test                                                  */
/* ------------------------------------------------------------------ */
import { authApiClient } from '../authenticated-client';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const TEST_PROFILE: UserProfile = {
  userId: '1',
  email: 'test@test.com',
  tenantId: '023772bb-391b-401c-936a-ed7034b69cec',
  roles: ['OWNER'],
  permissions: [],
};

const TEST_TOKEN = 'jwt-access-token-xyz';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe('authApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().reset();
    // Default: mockApiClient resolves with undefined (caller doesn't care here)
    mockApiClient.mockResolvedValue(undefined);
  });

  // ── 1. Authorization header ─────────────────────────────────────
  it('injects Authorization: Bearer <token> when accessToken is present', async () => {
    useAuthStore.getState().setAccessToken(TEST_TOKEN);

    await authApiClient('/some/path');

    expect(mockApiClient).toHaveBeenCalledTimes(1);
    const [, opts] = mockApiClient.mock.calls[0];
    expect(opts.headers).toHaveProperty('Authorization', `Bearer ${TEST_TOKEN}`);
  });

  // ── 2. x-tenant-id header ──────────────────────────────────────
  it('injects x-tenant-id from store profile', async () => {
    useAuthStore.getState().setAccessToken(TEST_TOKEN);
    useAuthStore.getState().setProfile(TEST_PROFILE);

    await authApiClient('/menu');

    const [, opts] = mockApiClient.mock.calls[0];
    expect(opts.headers).toHaveProperty('x-tenant-id', '023772bb-391b-401c-936a-ed7034b69cec');
  });

  // ── 3. No Authorization when token absent ──────────────────────
  it('does NOT include Authorization when there is no accessToken', async () => {
    // Store is already reset (no token)
    await authApiClient('/public');

    const [, opts] = mockApiClient.mock.calls[0];
    expect(opts.headers).not.toHaveProperty('Authorization');
  });

  // ── 4. No x-tenant-id when profile absent ─────────────────────
  it('does NOT include x-tenant-id when there is no profile', async () => {
    useAuthStore.getState().setAccessToken(TEST_TOKEN);
    // profile is null after reset

    await authApiClient('/something');

    const [, opts] = mockApiClient.mock.calls[0];
    expect(opts.headers).not.toHaveProperty('x-tenant-id');
  });

  // ── 5. Forwards HTTP method and body ───────────────────────────
  it('forwards method and body to apiClient', async () => {
    useAuthStore.getState().setAccessToken(TEST_TOKEN);

    const body = JSON.stringify({ name: 'New Item' });
    await authApiClient('/items', { method: 'POST', body });

    const [path, opts] = mockApiClient.mock.calls[0];
    expect(path).toBe('/items');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBe(body);
  });

  // ── 6. Caller-provided headers merge & override ────────────────
  it('merges caller-provided headers with auth headers (caller wins on conflict)', async () => {
    useAuthStore.getState().setAccessToken(TEST_TOKEN);
    useAuthStore.getState().setProfile(TEST_PROFILE);

    await authApiClient('/merge', {
      headers: {
        Authorization: 'Bearer override-token',
        'x-custom': 'custom-value',
      },
    });

    const [, opts] = mockApiClient.mock.calls[0];
    // Caller-supplied Authorization should override the store-based one
    expect(opts.headers['Authorization']).toBe('Bearer override-token');
    // Auth-store tenant header should still be present
    expect(opts.headers['x-tenant-id']).toBe('023772bb-391b-401c-936a-ed7034b69cec');
    // Custom header should be forwarded
    expect(opts.headers['x-custom']).toBe('custom-value');
  });

  // ── 7. Uses BFF base URL from getBffBaseUrl() ──────────────────
  it('passes the BFF base URL returned by getBffBaseUrl()', async () => {
    await authApiClient('/health');

    const [, opts] = mockApiClient.mock.calls[0];
    expect(opts.baseUrl).toBe(FAKE_BFF_URL);
  });
});
