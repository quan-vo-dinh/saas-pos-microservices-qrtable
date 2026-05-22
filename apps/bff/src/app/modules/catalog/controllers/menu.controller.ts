import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { RedisKey } from '@common/constants/redis-key.constants';
import { ProcessId } from '@common/decorators/processId.decorator';
import { PublicMenuResponseDto, ValidateQrTokenRequestDto, TableResponseDto } from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';
import { TableTcpResponse, ValidateQrTokenTcpRequest } from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';

@ApiTags('Menu (Public)')
@Controller('menu')
export class MenuPublicController {
  private static readonly MENU_CACHE_TTL = 600; // 10 minutes in seconds

  constructor(
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get()
  @ApiOkResponse({ type: ResponseDto<PublicMenuResponseDto> })
  @ApiOperation({ summary: 'Get public menu' })
  async getMenu(@ProcessId() processId: string, @Req() req: Request): Promise<ResponseDto<PublicMenuTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const cacheKey = RedisKey.menu.public(tenantId);

    const cached = await this.cacheManager.get<PublicMenuTcpResponse>(cacheKey);
    if (cached) {
      return new ResponseDto<PublicMenuTcpResponse>({
        data: cached,
        statusCode: 200,
        message: HTTP_MESSAGE.OK,
      });
    }

    const result = await firstValueFrom(
      this.catalogClient
        .send<
          PublicMenuTcpResponse,
          GetPublicMenuTcpRequest
        >(TCP_REQUEST_MESSAGE.MENU.GET_PUBLIC_MENU, buildTcpRequestContext<GetPublicMenuTcpRequest>(req, processId, { tenantId }))
        .pipe(map((response) => response.data)),
    );

    if (result) {
      await this.cacheManager.set(cacheKey, result, MenuPublicController.MENU_CACHE_TTL * 1000);
    }

    return new ResponseDto<PublicMenuTcpResponse>({
      data: result,
      statusCode: 200,
      message: HTTP_MESSAGE.OK,
    });
  }

  @Post('validate-qr')
  @ApiOkResponse({ type: ResponseDto<TableResponseDto> })
  @ApiOperation({ summary: 'Validate QR token' })
  validateQr(@Body() body: ValidateQrTokenRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, ValidateQrTokenTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN,
        buildTcpRequestContext<ValidateQrTokenTcpRequest>(req, processId, {
          ...body,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }
}
