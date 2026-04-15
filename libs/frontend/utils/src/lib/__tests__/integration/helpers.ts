const BFF_BASE = process.env['BFF_URL'] || 'http://localhost:3300/api/v1';
const KEYCLOAK_URL = process.env['KEYCLOAK_URL'] || 'http://localhost:8180';
const TENANT_ID = 'tenant_a';

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getOwnerToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const res = await fetch(`${KEYCLOAK_URL}/realms/qrtable/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'management-app',
      username: 'owner.1700000002@gmail.com',
      password: 'owner',
      scope: 'openid',
    }),
  });

  if (!res.ok) {
    throw new Error(`Keycloak token failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 30) * 1000,
  };
  return tokenCache.token;
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<{ status: number; data: T; raw: Record<string, unknown> }> {
  const token = options.token ?? (await getOwnerToken());

  const res = await fetch(`${BFF_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-tenant-id': TENANT_ID,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const raw = (await res.json()) as Record<string, unknown>;

  // Use BFF wrapper statusCode when available, fallback to HTTP status
  const status = typeof raw['statusCode'] === 'number' ? (raw['statusCode'] as number) : res.status;

  return { status, data: raw['data'] as T, raw };
}

export async function apiPublicFetch<T>(
  path: string,
): Promise<{ status: number; data: T; raw: Record<string, unknown> }> {
  const res = await fetch(`${BFF_BASE}${path}`, {
    headers: { 'x-tenant-id': TENANT_ID },
  });

  const raw = (await res.json()) as Record<string, unknown>;
  const status = typeof raw['statusCode'] === 'number' ? (raw['statusCode'] as number) : res.status;

  return { status, data: raw['data'] as T, raw };
}

export const BFF_URL = BFF_BASE;
export const TENANT = TENANT_ID;
