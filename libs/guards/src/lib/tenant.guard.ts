import { MetadataKey } from '@common/constants/common.constant';
import { SESSION_POLICY, TENANT_POLICY } from '@common/constants/request-context.constant';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CanActivate, ExecutionContext, Inject, Injectable, Logger, HttpStatus } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
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
    const isSuperAdmin = this.isSuperAdmin(userData);
    const claimTenantId = this.getClaimTenantId(userData);
    const tenantId = (request[MetadataKey.TENANT_ID] as string | undefined) || claimTenantId;

    if (tenantId) {
      request[MetadataKey.TENANT_ID] = tenantId;
    }

    if (isSuperAdmin) {
      return true;
    }

    if (!tenantId) {
      throw new BusinessException(ErrorCode.TENANT_REQUIRED, HttpStatus.FORBIDDEN);
    }

    if (claimTenantId && claimTenantId !== tenantId) {
      throw new BusinessException(ErrorCode.TENANT_MISMATCH_IDENTITY, HttpStatus.FORBIDDEN);
    }

    const sessionId = request[MetadataKey.SESSION_ID] as string | undefined;

    if (sessionId) {
      const cacheKey = getSessionCacheKey(sessionId);
      const session = await this.cacheManager.get<SessionData>(cacheKey);

      if (!session) {
        throw new BusinessException(ErrorCode.TENANT_SESSION_NOT_FOUND, HttpStatus.FORBIDDEN);
      }

      if (session.tenantId && session.tenantId !== tenantId) {
        throw new BusinessException(ErrorCode.TENANT_MISMATCH_SESSION, HttpStatus.FORBIDDEN);
      }

      if (!session.tenantId) {
        await this.cacheManager.set(cacheKey, { ...session, tenantId }, SESSION_POLICY.TTL_MS);
      }
    }

    return true;
  }

  private isExcludedPath(path: string): boolean {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // Match excluded prefixes by path segment so it works with global prefixes
    // (e.g. "/api/v1/health" should match "/health") and without requiring a trailing slash.
    return TENANT_POLICY.EXCLUDED_PATH_PREFIXES.some((prefix) => {
      const segment = prefix.startsWith('/') ? prefix.slice(1) : prefix;
      if (!segment) return false;

      // Escape regex special chars to avoid accidental pattern injection.
      const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|/)${escaped}(/|$)`);
      return re.test(normalizedPath);
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

  private isSuperAdmin(userData?: AuthorizeResponse): boolean {
    const jwt = userData?.metadata?.jwt as Record<string, unknown> | undefined;

    if (!jwt) {
      return false;
    }

    // Handle both snake_case (raw JWT) and camelCase (proto-loader deserialized)
    const realmAccess = (jwt['realm_access'] ?? jwt['realmAccess']) as Record<string, unknown> | undefined;
    const roles = Array.isArray(realmAccess?.['roles']) ? (realmAccess?.['roles'] as unknown[]) : [];

    return roles.some((role) => typeof role === 'string' && role === 'SUPER_ADMIN');
  }
}
