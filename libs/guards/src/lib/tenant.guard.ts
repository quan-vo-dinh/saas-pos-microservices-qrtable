import { MetadataKey } from '@common/constants/common.constant';
import { SESSION_POLICY, TENANT_POLICY } from '@common/constants/request-context.constant';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { getSessionCacheKey } from '@common/utils/request.util';

type SessionData = {
  tenantId?: string;
  createdAt: number;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path as string;

    if (this.isExcludedPath(path)) {
      return true;
    }

    const userData = request[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const claimTenantId = this.getClaimTenantId(userData);
    const tenantId = (request[MetadataKey.TENANT_ID] as string | undefined) || claimTenantId;

    if (tenantId) {
      request[MetadataKey.TENANT_ID] = tenantId;
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant is required');
    }

    if (claimTenantId && claimTenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch with user identity');
    }

    const sessionId = request[MetadataKey.SESSION_ID] as string | undefined;

    if (sessionId) {
      const cacheKey = getSessionCacheKey(sessionId);
      const session = await this.cacheManager.get<SessionData>(cacheKey);

      if (!session) {
        throw new ForbiddenException('Session not found');
      }

      if (session.tenantId && session.tenantId !== tenantId) {
        throw new ForbiddenException('Tenant mismatch with session');
      }

      if (!session.tenantId) {
        await this.cacheManager.set(cacheKey, { ...session, tenantId }, SESSION_POLICY.TTL_MS);
      }
    }

    return true;
  }

  private isExcludedPath(path: string): boolean {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return TENANT_POLICY.EXCLUDED_PATH_PREFIXES.some((prefix) => {
      return (
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`) || normalizedPath.includes(`${prefix}/`)
      );
    });
  }

  private getClaimTenantId(userData?: AuthorizeResponse): string | undefined {
    const jwt = userData?.metadata?.jwt as Record<string, unknown> | undefined;

    if (!jwt) {
      return undefined;
    }

    const tenantFromSnakeCase = jwt['tenant_id'];
    const tenantFromCamelCase = jwt['tenantId'];

    if (typeof tenantFromSnakeCase === 'string' && tenantFromSnakeCase.trim()) {
      return tenantFromSnakeCase;
    }

    if (typeof tenantFromCamelCase === 'string' && tenantFromCamelCase.trim()) {
      return tenantFromCamelCase;
    }

    return undefined;
  }
}
