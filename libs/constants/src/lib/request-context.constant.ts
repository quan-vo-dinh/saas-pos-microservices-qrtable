export const REQUEST_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  SESSION_ID: 'x-session-id',
  FORWARDED_HOST: 'x-forwarded-host',
} as const;

export const SESSION_POLICY = {
  ID_PREFIX: 'sid_',
  CACHE_PREFIX: 'session',
  TTL_MS: 24 * 60 * 60 * 1000,
  COOKIE_KEY: 'x-session-id',
} as const;

export const TENANT_POLICY = {
  HOST_MIN_SEGMENTS: 3,
  EXCLUDED_PATH_PREFIXES: ['/authorizer', '/saas', '/health', '/users'] as const,
} as const;
