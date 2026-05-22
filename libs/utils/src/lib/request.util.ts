import { parseToken } from './string.util';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { MetadataKey } from '@common/constants/common.constant';
import { REQUEST_HEADERS, SESSION_POLICY } from '@common/constants/request-context.constant';
import { Request } from 'express';
import { RequestType } from '@common/interfaces/tcp/common/request.interface';

type HeaderCarrier = {
  headers?: Partial<Record<string, string | string[] | undefined>>;
};

type MetadataCarrier = Partial<Record<MetadataKey, unknown>>;

export function getAccessToken(req: HeaderCarrier, keepBearer = false): string {
  const token = getHeaderValue(req.headers?.['authorization']) ?? '';

  return keepBearer ? token : parseToken(token);
}

export function setUserData(req: MetadataCarrier, userData?: AuthorizeResponse): void {
  req[MetadataKey.USER_DATA] = userData;
}

export function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0]?.trim();
  }

  return value.trim();
}

/**
 * Redis session key. Canonical Step 2.4 / audit C14: `session:{tenantId}:{sessionId}` when tenant is known.
 * Falls back to `session:{sessionId}` only if `tenantId` is missing (legacy / pre-middleware).
 */
export function getSessionCacheKey(sessionId: string, tenantId?: string): string {
  if (tenantId && tenantId.trim()) {
    return `${SESSION_POLICY.CACHE_PREFIX}:${tenantId.trim()}:${sessionId}`;
  }

  return `${SESSION_POLICY.CACHE_PREFIX}:${sessionId}`;
}

export function getSessionIdFromRequest(req: HeaderCarrier): string | undefined {
  const headerSessionId = req.headers?.[REQUEST_HEADERS.SESSION_ID];

  if (typeof headerSessionId === 'string' && headerSessionId.trim()) {
    return headerSessionId.trim();
  }

  const cookieHeader = req.headers?.['cookie'];

  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) {
    return undefined;
  }

  const sessionCookie = cookieHeader
    .split(';')
    .map((item: string) => item.trim())
    .find((item: string) => item.startsWith(`${SESSION_POLICY.COOKIE_KEY}=`));

  if (!sessionCookie) {
    return undefined;
  }

  return sessionCookie.split('=')[1];
}

export function buildTcpRequestContext<T>(request: Request, processId: string, data?: T): RequestType<T> {
  const requestMetadata = request as Request & MetadataCarrier;
  const userData = requestMetadata[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;

  return {
    processId,
    data,
    tenantId: requestMetadata[MetadataKey.TENANT_ID] as string | undefined,
    sessionId: requestMetadata[MetadataKey.SESSION_ID] as string | undefined,
    userId: userData?.metadata?.userId,
  };
}
