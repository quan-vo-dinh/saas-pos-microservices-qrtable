import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { buildTenantSuspendedRedisKey, TenantStatus } from '@common/constants/saas.constants';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { buildTcpRequestContext } from '@common/utils/request.util';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { GetTenantByIdTcpRequest } from '@common/interfaces/tcp/saas';
import type { TenantTcpResponse } from '@common/interfaces/tcp/saas';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import type { Request } from 'express';

function normalizedPath(req: Request): string {
  const raw = (req.path as string) || (req.url as string)?.split('?')[0] || '';
  return raw;
}

function isCustomerOrMenuPath(path: string): boolean {
  return path.includes('/customer/') || path.includes('/menu');
}

function isPostSessionsJoin(path: string, method: string): boolean {
  return method === 'POST' && path.includes('/customer/sessions/join');
}

function isPostMenuValidateQr(path: string, method: string): boolean {
  return method === 'POST' && path.includes('/menu/validate-qr');
}

function isPostCustomerVietQr(path: string, method: string): boolean {
  return method === 'POST' && path.includes('/customer/payment/vietqr');
}

@Injectable()
export class CustomerTenantLifecycleGuard implements CanActivate {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const path = normalizedPath(req);
    const method = (req.method || 'GET').toUpperCase();

    if (!isCustomerOrMenuPath(path)) {
      return true;
    }

    const tenantId = (req[MetadataKey.TENANT_ID] as string | undefined)?.trim();
    if (!tenantId) {
      return true;
    }

    const redisSuspended = (await this.cache.get<string>(buildTenantSuspendedRedisKey(tenantId))) === '1';

    const status = await this.loadTenantStatus(req, tenantId);

    if (!status) {
      if (method === 'GET' || method === 'HEAD' || isPostMenuValidateQr(path, method)) {
        return true;
      }
      if (isPostSessionsJoin(path, method)) {
        return true;
      }
      if (isPostCustomerVietQr(path, method)) {
        if (redisSuspended) {
          return true;
        }
        throw new BusinessException(ErrorCode.TENANT_STATUS_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
      }
      if (path.includes('/customer/')) {
        if (redisSuspended) {
          throw new BusinessException(ErrorCode.TENANT_SUSPENDED, HttpStatus.FORBIDDEN);
        }
        throw new BusinessException(ErrorCode.TENANT_STATUS_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
      }
      return true;
    }

    if (status === TenantStatus.CLOSED) {
      throw new BusinessException(ErrorCode.TENANT_CLOSED, HttpStatus.FORBIDDEN);
    }

    if (status === TenantStatus.SUSPENDED) {
      if (method === 'GET' || method === 'HEAD') {
        return true;
      }
      if (isPostSessionsJoin(path, method) || isPostMenuValidateQr(path, method)) {
        return true;
      }
      if (isPostCustomerVietQr(path, method)) {
        return true;
      }
      throw new BusinessException(ErrorCode.TENANT_SUSPENDED, HttpStatus.FORBIDDEN);
    }

    return true;
  }

  private async loadTenantStatus(req: Request, tenantId: string): Promise<TenantStatus | null> {
    try {
      const res = await firstValueFrom(
        this.saasClient
          .send<
            TenantTcpResponse,
            GetTenantByIdTcpRequest
          >(TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID, buildTcpRequestContext<GetTenantByIdTcpRequest>(req, randomUUID(), { id: tenantId }))
          .pipe(timeout({ first: 2500 })),
      );
      if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.status) {
        return res.data.status as TenantStatus;
      }
    } catch {
      /* SaaS unreachable — caller applies Redis / fail-open policy */
    }
    return null;
  }
}
