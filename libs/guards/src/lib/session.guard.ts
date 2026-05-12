import { MetadataKey } from '@common/constants/common.constant';
import { REQUEST_HEADERS, SESSION_POLICY } from '@common/constants/request-context.constant';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { getSessionCacheKey, getSessionIdFromRequest } from '@common/utils/request.util';

type SessionData = {
  tenantId?: string;
  createdAt: number;
  lastActivityAt: number;
  /** When > 0, idle timeout does not evict session (Step 2.4 / audit C15) — set by Order flows when wired */
  orderCount?: number;
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
    const authOptions = this.reflector.getAllAndOverride<{ secured: boolean }>(MetadataKey.SECURED, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (authOptions?.secured) {
      return true;
    }

    const skipBffSession = this.reflector.getAllAndOverride<boolean>(MetadataKey.SKIP_BFF_SESSION_GUARD, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipBffSession === true) {
      const headerSessionId = getSessionIdFromRequest(request);
      if (!headerSessionId?.trim()) {
        throw new BusinessException(ErrorCode.TENANT_SESSION_NOT_FOUND, HttpStatus.BAD_REQUEST);
      }
      request[MetadataKey.SESSION_ID] = headerSessionId.trim();
      request.res?.setHeader(REQUEST_HEADERS.SESSION_ID, headerSessionId.trim());
      return true;
    }

    const skipBffSessionMint = this.reflector.getAllAndOverride<boolean>(MetadataKey.SKIP_BFF_SESSION_MINT, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipBffSessionMint === true) {
      return true;
    }

    const existingSessionId = getSessionIdFromRequest(request);
    const tenantId = request[MetadataKey.TENANT_ID] as string | undefined;

    if (existingSessionId) {
      const cacheKey = getSessionCacheKey(existingSessionId, tenantId);
      let existingSession = await this.cacheManager.get<SessionData>(cacheKey);

      // Legacy key migration: try non–tenant-scoped key if tenant-scoped miss
      if (!existingSession && tenantId) {
        const legacyKey = getSessionCacheKey(existingSessionId);
        existingSession = await this.cacheManager.get<SessionData>(legacyKey);

        if (existingSession) {
          await this.cacheManager.del(legacyKey);
        }
      }

      if (existingSession) {
        const now = Date.now();
        const idleTime = now - (existingSession.lastActivityAt || existingSession.createdAt);
        const orderCount = existingSession.orderCount ?? 0;
        const withinIdleWindow = idleTime <= SESSION_POLICY.IDLE_TIMEOUT_MS;
        const hasOrdersKeepAlive = orderCount > 0 && idleTime > SESSION_POLICY.IDLE_TIMEOUT_MS;

        if (withinIdleWindow || hasOrdersKeepAlive) {
          await this.cacheManager.set(
            cacheKey,
            {
              ...existingSession,
              lastActivityAt: now,
              tenantId: existingSession.tenantId || tenantId,
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
    const cacheKey = getSessionCacheKey(sessionId, tenantId);

    await this.cacheManager.set(
      cacheKey,
      {
        tenantId,
        createdAt: now,
        lastActivityAt: now,
        orderCount: 0,
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
