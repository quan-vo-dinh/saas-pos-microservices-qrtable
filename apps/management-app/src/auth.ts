import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { type JWT } from 'next-auth/jwt';
import { parseRoles } from '@/lib/auth/role-routing';
import { fetchAuthorizerMe } from '@/lib/auth/bff-server';
import { ROUTES } from '@/constants/routes';
import { TOKEN_REFRESH_BUFFER_MS } from '@/constants/api';

type JwtClaims = {
  email?: string;
  name?: string;
  preferred_username?: string;
  tenant_id?: string;
  realm_access?: {
    roles?: string[];
  };
};

function resolveRolesFromProfileOrClaims(
  profileRoles: unknown,
  claimRoles: unknown,
  existingRoles?: unknown,
): ReturnType<typeof parseRoles> {
  const normalizedProfileRoles = parseRoles(profileRoles);
  if (normalizedProfileRoles.length > 0) {
    return normalizedProfileRoles;
  }

  const normalizedClaimRoles = parseRoles(claimRoles);
  if (normalizedClaimRoles.length > 0) {
    return normalizedClaimRoles;
  }

  return parseRoles(existingRoles);
}

function decodeJwtClaims(accessToken?: string): JwtClaims {
  if (!accessToken) {
    return {};
  }

  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) {
      return {};
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return {};
  }
}

function getIssuerTokenEndpoint(): string {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  if (!issuer) {
    throw new Error('Missing AUTH_KEYCLOAK_ISSUER environment variable');
  }

  return `${issuer.replace(/\/$/, '')}/protocol/openid-connect/token`;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken || typeof token.refreshToken !== 'string') {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }

  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;

  if (!clientId || !clientSecret) {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }

  try {
    const response = await fetch(getIssuerTokenEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
    };

    if (!response.ok || !refreshed.access_token || !refreshed.expires_in) {
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      };
    }

    const claims = decodeJwtClaims(refreshed.access_token);
    const me = await fetchAuthorizerMe(refreshed.access_token, token.tenantId);

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      roles: resolveRolesFromProfileOrClaims(me?.roles, claims.realm_access?.roles, token.roles),
      tenantId: me?.tenantId ?? claims.tenant_id ?? token.tenantId,
      permissions: me?.permissions ?? token.permissions,
      email: me?.email ?? claims.email ?? token.email,
      name: claims.name ?? claims.preferred_username ?? token.name,
      error: undefined,
    };
  } catch {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
        },
      },
    }),
  ],
  pages: {
    signIn: ROUTES.LOGIN,
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        const claims = decodeJwtClaims(account.access_token);
        const me = await fetchAuthorizerMe(account.access_token, claims.tenant_id);

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ? account.expires_at * 1000 : Date.now(),
          roles: resolveRolesFromProfileOrClaims(me?.roles, claims.realm_access?.roles, token.roles),
          tenantId: me?.tenantId ?? claims.tenant_id,
          permissions: me?.permissions,
          userId: me?.userId,
          email: me?.email ?? claims.email,
          name: claims.name ?? claims.preferred_username,
          error: undefined,
        };
      }

      if (typeof token.expiresAt === 'number' && Date.now() < token.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.error = token.error;
      session.accessToken = token.accessToken;

      if (session.user) {
        session.user.id = token.userId ?? token.sub ?? '';
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.roles = parseRoles(token.roles);
        session.user.tenantId = token.tenantId;
        session.user.permissions = token.permissions ?? [];
      }

      return session;
    },
  },
});
