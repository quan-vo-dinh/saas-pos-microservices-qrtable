import { MetadataKey } from '@common/constants/common.constant';
import { REQUEST_HEADERS, SESSION_POLICY } from '@common/constants/request-context.constant';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { getSessionCacheKey, getSessionIdFromRequest } from '@common/utils/request.util';

type SessionData = {
  tenantId?: string;
  createdAt: number;
  lastActivityAt: number;
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Nhánh bypass cho các route không yêu cầu session
    const authOptions = this.reflector.get<{ secured: boolean }>(MetadataKey.SECURED, context.getHandler());

    if (authOptions?.secured) {
      return true;
    }

    const existingSessionId = getSessionIdFromRequest(request);
    const tenantId = request[MetadataKey.TENANT_ID] as string | undefined;

    if (existingSessionId) {
      const cacheKey = getSessionCacheKey(existingSessionId);
      const existingSession = await this.cacheManager.get<SessionData>(cacheKey);

      if (existingSession) {
        const now = Date.now();
        const idleTime = now - (existingSession.lastActivityAt || existingSession.createdAt);

        if (idleTime <= SESSION_POLICY.IDLE_TIMEOUT_MS) {
          await this.cacheManager.set(
            cacheKey,
            {
              ...existingSession,
              lastActivityAt: now,
            },
            SESSION_POLICY.TTL_MS,
          );

          request[MetadataKey.SESSION_ID] = existingSessionId;
          request[MetadataKey.TENANT_ID] = request[MetadataKey.TENANT_ID] || existingSession.tenantId;
          request.res?.setHeader(REQUEST_HEADERS.SESSION_ID, existingSessionId);

          return true;
        }

        await this.cacheManager.del(cacheKey);
      }
    }

    const now = Date.now();
    const sessionId = this.generateSessionId();
    const cacheKey = getSessionCacheKey(sessionId);

    await this.cacheManager.set(
      cacheKey,
      {
        tenantId,
        createdAt: now,
        lastActivityAt: now,
      },
      SESSION_POLICY.TTL_MS,
    );

    request[MetadataKey.SESSION_ID] = sessionId;
    request.res?.setHeader(REQUEST_HEADERS.SESSION_ID, sessionId);

    return true;
  }

  private generateSessionId(): string {
    return `${SESSION_POLICY.ID_PREFIX}${randomUUID()}`;
  }
}
