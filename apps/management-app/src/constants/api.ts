/** Environment-aware BFF API configuration. */
export const API_CONFIG = {
  DEFAULT_BFF_URL: 'http://localhost:3300/api/v1',
  ENDPOINTS: {
    AUTHORIZER_ME: '/authorizer/me',
  },
} as const;

/** Token refresh buffer (ms) — refresh 60s before expiry. */
export const TOKEN_REFRESH_BUFFER_MS = 60_000;
