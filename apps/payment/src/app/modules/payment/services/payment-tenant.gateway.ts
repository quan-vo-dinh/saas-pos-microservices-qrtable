import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { RequestType } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  GetTenantByIdTcpRequest,
  GetTenantBySlugTcpRequest,
  TenantTcpResponse,
} from '@common/interfaces/tcp/saas';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import { CONFIGURATION } from '../../../../configuration';

@Injectable()
export class PaymentTenantGateway {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  async resolveByKey(key: string, processId?: string): Promise<{ id: string; slug: string }> {
    return isUuid(key) ? this.resolveById(key, processId) : this.resolveBySlug(key, processId);
  }

  async resolveById(id: string, processId?: string): Promise<{ id: string; slug: string }> {
    const req: RequestType<GetTenantByIdTcpRequest> = {
      processId,
      data: { id },
    };
    const wrapped = await firstValueFrom(
      this.saasClient
        .send<TenantTcpResponse, GetTenantByIdTcpRequest>(TCP_REQUEST_MESSAGE.TENANT.GET_BY_ID, req)
        .pipe(timeout({ first: CONFIGURATION.PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS })),
    );
    if (!wrapped?.data?.id) {
      throw new BusinessException(ErrorCode.SEPAY_TENANT_NOT_FOUND, HttpStatus.UNAUTHORIZED);
    }
    return { id: wrapped.data.id, slug: wrapped.data.slug ?? id };
  }

  async resolveBySlug(slug: string, processId?: string): Promise<{ id: string; slug: string }> {
    const req: RequestType<GetTenantBySlugTcpRequest> = {
      processId,
      data: { slug },
    };
    const wrapped = await firstValueFrom(
      this.saasClient
        .send<TenantTcpResponse, GetTenantBySlugTcpRequest>(TCP_REQUEST_MESSAGE.SAAS.GET_BY_SLUG, req)
        .pipe(timeout({ first: CONFIGURATION.PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS })),
    );
    if (!wrapped?.data?.id) {
      throw new BusinessException(ErrorCode.SEPAY_TENANT_NOT_FOUND, HttpStatus.UNAUTHORIZED);
    }
    return { id: wrapped.data.id, slug: wrapped.data.slug ?? slug };
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
