import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { map } from 'rxjs';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

@ApiTags('SaaS Public')
@Controller()
export class PublicSaasController {
  constructor(
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
    private readonly configService: ConfigService,
  ) {}

  @Get(SAAS_BFF_ROUTES.publicPlans)
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List public pricing plans' })
  listPublicPlans(@ProcessId() processId: string) {
    return this.saasClient.send(TCP_REQUEST_MESSAGE.PLAN.LIST_ACTIVE, { processId }).pipe(
      map(
        (response) =>
          new ResponseDto({
            data: response.data,
            statusCode: response.statusCode,
            message: response.code as HTTP_MESSAGE,
            processID: processId,
          }),
      ),
    );
  }

  @Get(SAAS_BFF_ROUTES.publicLandingInfo)
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get public landing page information' })
  getLandingInfo(@ProcessId() processId: string) {
    return new ResponseDto({
      data: {
        productName: 'QRTable',
        market: 'Vietnamese F&B SaaS POS',
        contactEmail: this.configService.get<string>('BFF_PLATFORM_CONFIG.PLATFORM_CONTACT_EMAIL'),
      },
      processID: processId,
    });
  }
}
