import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

type ServiceHealth = {
  service: string;
  status: 'UP';
};

type DownstreamHealth = {
  status: 'UP' | 'DEGRADED';
  services: {
    catalog: 'UP' | 'DOWN';
    saas: 'UP' | 'DOWN';
  };
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
  ) {}

  @Get()
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Check BFF downstream health status' })
  async getHealth(@ProcessId() processId: string): Promise<ResponseDto<DownstreamHealth>> {
    const [catalogResult, saasResult] = await Promise.allSettled([
      firstValueFrom(
        this.catalogClient.send<ServiceHealth, void>(TCP_REQUEST_MESSAGE.CATALOG.HEALTH, {
          processId,
        }),
      ),
      firstValueFrom(
        this.saasClient.send<ServiceHealth, void>(TCP_REQUEST_MESSAGE.SAAS.HEALTH, {
          processId,
        }),
      ),
    ]);

    const catalogStatus = catalogResult.status === 'fulfilled' ? 'UP' : 'DOWN';
    const saasStatus = saasResult.status === 'fulfilled' ? 'UP' : 'DOWN';
    const status = catalogStatus === 'UP' && saasStatus === 'UP' ? 'UP' : 'DEGRADED';

    return new ResponseDto<DownstreamHealth>({
      data: {
        status,
        services: {
          catalog: catalogStatus,
          saas: saasStatus,
        },
      },
      message: HTTP_MESSAGE.OK,
    });
  }
}
