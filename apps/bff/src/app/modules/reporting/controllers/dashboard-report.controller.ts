import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { PLAN_FEATURE_CODES } from '@common/constants/saas.constants';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { RequiresPlanFeature } from '@common/decorators/requires-plan-feature.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ReportRangeQueryDto } from '@common/interfaces/gateway/report';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Controller, Get, HttpStatus, Inject, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { REPORTING_BFF_ROUTES } from '../reporting-bff-routes';
import { buildTenantReportTcpPayload } from '../reporting-query.util';

@ApiTags('Dashboard Reports')
@Controller()
@Authorization({ secured: true })
export class DashboardReportController {
  constructor(
    @Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  @Get(REPORTING_BFF_ROUTES.dashboardRevenue)
  @RequiresPlanFeature(PLAN_FEATURE_CODES.ANALYTICS_BASIC)
  @Permissions([PERMISSION.REPORT_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Tenant sales revenue report' })
  getRevenue(@Query() query: ReportRangeQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(
      this.paymentClient,
      TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE,
      req,
      processId,
      buildTenantReportTcpPayload(this.tenantId(req), query),
    );
  }

  @Get(REPORTING_BFF_ROUTES.dashboardOrders)
  @RequiresPlanFeature(PLAN_FEATURE_CODES.ANALYTICS_BASIC)
  @Permissions([PERMISSION.REPORT_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Tenant order and bill report' })
  getOrders(@Query() query: ReportRangeQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(
      this.orderClient,
      TCP_REQUEST_MESSAGE.ORDER.REPORT_ORDERS,
      req,
      processId,
      buildTenantReportTcpPayload(this.tenantId(req), query),
    );
  }

  @Get(REPORTING_BFF_ROUTES.dashboardTables)
  @RequiresPlanFeature(PLAN_FEATURE_CODES.ANALYTICS_BASIC)
  @Permissions([PERMISSION.REPORT_READ_OWN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Tenant table and menu availability report' })
  getTables(@ProcessId() processId: string, @Req() req: Request) {
    return this.forward(this.catalogClient, TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES, req, processId, {
      tenantId: this.tenantId(req),
    });
  }

  private tenantId(req: Request): string {
    const tenantId = req[MetadataKey.TENANT_ID] as string | undefined;
    if (!tenantId) {
      throw new BusinessException(ErrorCode.TENANT_REQUIRED, HttpStatus.FORBIDDEN);
    }
    return tenantId;
  }

  private forward(client: TcpClient, pattern: unknown, req: Request, processId: string, data: unknown) {
    return client.send(pattern, buildTcpRequestContext(req, processId, data)).pipe(
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
