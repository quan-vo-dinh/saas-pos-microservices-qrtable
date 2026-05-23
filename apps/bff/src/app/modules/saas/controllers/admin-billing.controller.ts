import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, HttpStatus, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { ManualConfirmSubscriptionInvoiceDto } from '../dtos/subscription.dto';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

@ApiTags('SaaS Admin — Billing')
@Controller()
@Authorization({ secured: true })
export class AdminBillingController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Get(SAAS_BFF_ROUTES.adminBillingInvoices)
  @Permissions([PERMISSION.SUBSCRIPTION_LIST_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List subscription invoices' })
  list(@Query() query: Record<string, string>, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_INVOICES, req, processId, query);
  }

  @Post(SAAS_BFF_ROUTES.adminBillingInvoiceManualConfirm)
  @Permissions([PERMISSION.SUBSCRIPTION_ASSIGN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Manually confirm subscription invoice' })
  manualConfirm(
    @Param('id') id: string,
    @Body() body: ManualConfirmSubscriptionInvoiceDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.MANUAL_CONFIRM_INVOICE, req, processId, {
      invoiceId: id,
      confirmedByUserId: this.userId(req),
      note: body.note ?? null,
    });
  }

  private forward(pattern: unknown, req: Request, processId: string, data?: unknown) {
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

  private userId(req: Request): string {
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const userId = userData?.metadata?.userId;
    if (!userId) {
      throw new BusinessException(ErrorCode.USER_ID_REQUIRED, HttpStatus.FORBIDDEN);
    }
    return userId;
  }
}
