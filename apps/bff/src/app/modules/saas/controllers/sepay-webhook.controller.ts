import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Body, Controller, Headers, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { map } from 'rxjs';
import { SepayWebhookPayloadDto } from '../dtos/webhook.dto';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

@ApiTags('SaaS SePay Webhooks')
@Controller()
export class SepayWebhookController {
  constructor(
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
    @Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
  ) {}

  @Post(SAAS_BFF_ROUTES.tier2Webhook)
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Handle platform subscription SePay webhook' })
  handlePlatformWebhook(@Headers('x-secret-key') secret: string, @Body() payload: SepayWebhookPayloadDto) {
    this.assertSecret(secret);
    const processId = randomUUID();

    return this.saasClient
      .send(TCP_REQUEST_MESSAGE.SUBSCRIPTION.HANDLE_WEBHOOK, {
        processId,
        data: {
          secret,
          payload,
          processId,
        },
      })
      .pipe(
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

  @Post(SAAS_BFF_ROUTES.tier1Webhook)
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Handle tenant bill SePay webhook' })
  handleTenantWebhook(
    @Param('tenantSlug') tenantSlug: string,
    @Headers('x-secret-key') secret: string,
    @Body() payload: SepayWebhookPayloadDto,
  ) {
    this.assertSecret(secret);
    const processId = randomUUID();

    return this.paymentClient
      .send(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK, {
        processId,
        data: {
          tenantSlug,
          secret,
          payload,
          processId,
        },
      })
      .pipe(
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

  private assertSecret(secret?: string): void {
    if (!secret?.trim()) {
      throw new BusinessException(ErrorCode.SEPAY_SECRET_REQUIRED, HttpStatus.UNAUTHORIZED);
    }
  }
}
