import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import type { PublicTenantMetadataDto } from '@common/interfaces/gateway/saas';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { GetTenantBySlugTcpRequest, TenantTcpResponse } from '@common/interfaces/tcp/saas';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { mapTcpTenantToPublicMetadata } from '../utils/map-tenant-public-metadata';

@ApiTags('Public — Tenant')
@Controller('public/tenants')
export class PublicTenantController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Get(':slug')
  @ApiOkResponse({ type: ResponseDto<PublicTenantMetadataDto> })
  @ApiOperation({ summary: 'Resolve tenant metadata by public slug (no auth)' })
  getBySlug(@Param('slug') slug: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.saasClient
      .send<
        TenantTcpResponse,
        GetTenantBySlugTcpRequest
      >(TCP_REQUEST_MESSAGE.SAAS.GET_BY_SLUG, buildTcpRequestContext<GetTenantBySlugTcpRequest>(req, processId, { slug }))
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
}
