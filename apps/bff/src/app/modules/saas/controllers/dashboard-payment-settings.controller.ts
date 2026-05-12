import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, ForbiddenException, Get, Inject, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { SelectSepayBankAccountDto } from '../dtos/payment-settings.dto';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

@ApiTags('SaaS Dashboard — Payment Settings')
@Controller()
@Authorization({ secured: true })
export class DashboardPaymentSettingsController {
  constructor(@Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient) {}

  @Get(SAAS_BFF_ROUTES.dashboardPaymentSettings)
  @Permissions([PERMISSION.PAYMENT_SETTINGS_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get tenant payment settings' })
  getSettings(@ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET, req, processId, this.tenantPayload(req));
  }

  @Get(SAAS_BFF_ROUTES.dashboardSepayAuthorizeUrl)
  @Permissions([PERMISSION.PAYMENT_SETTINGS_UPDATE_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Generate SePay OAuth authorize URL' })
  getSepayAuthorizeUrl(@ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GENERATE_AUTHORIZE_URL, req, processId, {
      ...this.tenantPayload(req),
      ownerUserId: this.userId(req),
    });
  }

  @Get(SAAS_BFF_ROUTES.dashboardSepayCallback)
  @Authorization({ secured: false })
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Handle SePay OAuth callback' })
  handleSepayCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    return this.forward(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK, req, processId, {
      code,
      state,
      requestIp: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post(SAAS_BFF_ROUTES.dashboardSepaySelectBank)
  @Permissions([PERMISSION.PAYMENT_SETTINGS_UPDATE_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Select connected SePay bank account' })
  selectBank(@Body() body: SelectSepayBankAccountDto, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    return this.forward(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK, req, processId, {
      ...body,
      ...this.tenantPayload(req),
      ownerUserId: this.userId(req),
      webhookUrl: this.tenantWebhookUrl(tenantId),
    });
  }

  @Post(SAAS_BFF_ROUTES.dashboardSepayDisconnect)
  @Permissions([PERMISSION.PAYMENT_SETTINGS_UPDATE_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Disconnect SePay account' })
  disconnect(@ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.DISCONNECT, req, processId, {
      ...this.tenantPayload(req),
      ownerUserId: this.userId(req),
    });
  }

  private tenantPayload(req: Request): { tenantId: string; requestedByUserId: string } {
    const tenantId = req[MetadataKey.TENANT_ID] as string | undefined;
    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }

    return {
      tenantId,
      requestedByUserId: this.userId(req),
    };
  }

  private userId(req: Request): string {
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const userId = userData?.metadata?.userId;
    if (!userId) {
      throw new ForbiddenException('USER_ID_REQUIRED');
    }
    return userId;
  }

  private tenantWebhookUrl(tenantSlug: string): string {
    const baseUrl = process.env.PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? '';
    const path = `/api/v1/payment/sepay/webhook/${tenantSlug}`;
    return baseUrl ? `${baseUrl}${path}` : path;
  }

  private forward(pattern: unknown, req: Request, processId: string, data: unknown) {
    return this.paymentClient.send(pattern, buildTcpRequestContext(req, processId, data)).pipe(
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
}
