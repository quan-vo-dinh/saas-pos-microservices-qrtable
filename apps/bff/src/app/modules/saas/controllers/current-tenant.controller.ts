import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import type { PublicTenantMetadataDto } from '@common/interfaces/gateway/saas';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  GetTenantByIdTcpRequest,
  GetTenantBySlugTcpRequest,
  TenantTcpResponse,
} from '@common/interfaces/tcp/saas';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { mapTcpTenantToPublicMetadata } from '../utils/map-tenant-public-metadata';

@ApiTags('Admin — Tenant')
@Controller('admin/tenant')
export class CurrentTenantController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Get('current')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TENANT_READ_OWN])
  @ApiOkResponse({ type: ResponseDto<PublicTenantMetadataDto> })
  @ApiOperation({ summary: 'Current tenant public metadata for staff apps' })
  getCurrent(@ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const isTenantUuid = this.isUuid(tenantId);
    const pattern = isTenantUuid ? TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID : TCP_REQUEST_MESSAGE.SAAS.GET_BY_SLUG;
    const payload: GetTenantByIdTcpRequest | GetTenantBySlugTcpRequest = isTenantUuid
      ? { id: tenantId }
      : { slug: tenantId };

    return this.saasClient
      .send<
        TenantTcpResponse,
        GetTenantByIdTcpRequest | GetTenantBySlugTcpRequest
      >(pattern, buildTcpRequestContext<GetTenantByIdTcpRequest | GetTenantBySlugTcpRequest>(req, processId, payload))
      .pipe(
        map(
          (response) =>
            new ResponseDto<PublicTenantMetadataDto>({
              data: mapTcpTenantToPublicMetadata(response.data),
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
