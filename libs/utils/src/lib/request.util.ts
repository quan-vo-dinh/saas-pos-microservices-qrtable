import { parseToken } from './string.util';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { MetadataKey } from '@common/constants/common.constant';
import { REQUEST_HEADERS, SESSION_POLICY } from '@common/constants/request-context.constant';
import { Request } from 'express';
import { RequestType } from '@common/interfaces/tcp/common/request.interface';

export function getAccessToken(req: any, keepBearer = false): string {
  const token = req.headers?.['authorization'] || '';

  return keepBearer ? token : parseToken(token);
}

export function setUserData(req: any, userData?: AuthorizeResponse): void {
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

export function getSessionCacheKey(sessionId: string): string {
  return `${SESSION_POLICY.CACHE_PREFIX}:${sessionId}`;
}

export function getSessionIdFromRequest(req: any): string | undefined {
  const headerSessionId = req.headers?.[REQUEST_HEADERS.SESSION_ID];

  if (typeof headerSessionId === 'string' && headerSessionId.trim()) {
    return headerSessionId.trim();
  }

  const cookieHeader = req.headers?.cookie;

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
  const userData = (request as any)[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;

  return {
    processId,
    data,
    tenantId: (request as any)[MetadataKey.TENANT_ID],
    sessionId: (request as any)[MetadataKey.SESSION_ID],
    userId: userData?.metadata?.userId,
  };
}
