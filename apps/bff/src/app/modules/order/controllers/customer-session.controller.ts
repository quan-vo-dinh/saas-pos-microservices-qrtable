import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { JoinSessionRequestDto } from '@common/interfaces/gateway/order';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { JoinSessionTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { SessionTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Inject, Post, Req, SetMetadata } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';

@ApiTags('Customer Sessions')
@Controller('customer/sessions')
export class CustomerSessionController {
  constructor(@Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient) {}

  @Post('join')
  @SetMetadata(MetadataKey.SKIP_BFF_SESSION_MINT, true)
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Join table session via QR validation' })
  async join(
    @Body() body: JoinSessionRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<SessionTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<SessionTcpResponse, JoinSessionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.SESSION_JOIN,
          buildTcpRequestContext<JoinSessionTcpRequest>(req, processId, {
            tenantId,
            tableId: body.tableId,
            qrToken: body.qrToken,
          }),
        )
        .pipe(map((r) => r)),
    );
    return new ResponseDto<SessionTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }
}
