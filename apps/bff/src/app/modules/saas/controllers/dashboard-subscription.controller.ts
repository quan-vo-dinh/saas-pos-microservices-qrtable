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
import { Body, Controller, ForbiddenException, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { CancelSubscriptionDto, CheckoutSubscriptionDto } from '../dtos/subscription.dto';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

@ApiTags('SaaS Dashboard — Subscription')
@Controller()
@Authorization({ secured: true })
export class DashboardSubscriptionController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Get(SAAS_BFF_ROUTES.dashboardSubscription)
  @Permissions([PERMISSION.SUBSCRIPTION_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get current tenant subscription' })
  getCurrent(@ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT, req, processId, this.tenantPayload(req));
  }

  @Post(SAAS_BFF_ROUTES.dashboardSubscriptionCheckout)
  @Permissions([PERMISSION.SUBSCRIPTION_CHECKOUT])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Create subscription checkout invoice' })
  checkout(@Body() body: CheckoutSubscriptionDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE, req, processId, {
      ...body,
      ...this.tenantPayload(req),
    });
  }

  @Post(SAAS_BFF_ROUTES.dashboardSubscriptionCancel)
  @Permissions([PERMISSION.SUBSCRIPTION_CHECKOUT])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Cancel current subscription' })
  cancel(@Body() body: CancelSubscriptionDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL, req, processId, {
      ...body,
      ...this.tenantPayload(req),
    });
  }

  @Get(SAAS_BFF_ROUTES.dashboardBillingInvoiceById)
  @Permissions([PERMISSION.SUBSCRIPTION_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get subscription invoice detail' })
  getInvoice(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE, req, processId, {
      ...this.tenantPayload(req),
      invoiceId: id,
    });
  }

  @Get(SAAS_BFF_ROUTES.dashboardBillingInvoiceStatus)
  @Permissions([PERMISSION.SUBSCRIPTION_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get subscription invoice status' })
  getInvoiceStatus(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE, req, processId, {
      ...this.tenantPayload(req),
      invoiceId: id,
      statusOnly: true,
    });
  }

  @Post(SAAS_BFF_ROUTES.dashboardBillingInvoiceCancel)
  @Permissions([PERMISSION.SUBSCRIPTION_CHECKOUT])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Cancel subscription invoice' })
  cancelInvoice(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE, req, processId, {
      ...this.tenantPayload(req),
      invoiceId: id,
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

  private forward(pattern: unknown, req: Request, processId: string, data: unknown) {
    return this.saasClient.send(pattern, buildTcpRequestContext(req, processId, data)).pipe(
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
