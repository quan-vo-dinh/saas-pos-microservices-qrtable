import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetadataKey } from '@common/constants/common.constant';
import { REQUEST_HEADERS, TENANT_POLICY } from '@common/constants/request-context.constant';
import { getHeaderValue } from '@common/utils/request.util';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = this.resolveTenantId(req);

    if (tenantId) {
      req[MetadataKey.TENANT_ID] = tenantId;
    }

    Logger.debug(`TenantMiddleware: tenant ID: ${tenantId || 'none'}`, TenantMiddleware.name);

    next();
  }

  private resolveTenantId(req: Request): string | undefined {
    // cách 1: dựa trên custom header (x-tenant-id)
    const headerTenant = getHeaderValue(req.headers[REQUEST_HEADERS.TENANT_ID]);

    if (headerTenant) {
      return headerTenant;
    }

    // cách 2: dựa trên subdomain (tenantId.example.com)
    const host = getHeaderValue(req.headers[REQUEST_HEADERS.FORWARDED_HOST]) || getHeaderValue(req.headers.host);

    if (!host) {
      return undefined;
    }

    const hostWithoutPort = host.split(':')[0];
    const chunks = hostWithoutPort.split('.').filter(Boolean);

    if (chunks.length < TENANT_POLICY.HOST_MIN_SEGMENTS) {
      return undefined;
    }

    return chunks[0]?.trim();
  }
}
