import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { ReportRangeQueryDto } from '@common/interfaces/gateway/report';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { REPORTING_BFF_ROUTES } from '../reporting-bff-routes';
import { buildPlatformReportTcpPayload, buildTenantReportTcpPayload } from '../reporting-query.util';

@ApiTags('Admin Analytics')
@Controller()
@Authorization({ secured: true })
export class AdminAnalyticsController {
  constructor(
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
    @Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  @Get(REPORTING_BFF_ROUTES.adminPlatform)
  @Permissions([PERMISSION.REPORT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Platform SaaS analytics' })
  getPlatform(@Query() query: ReportRangeQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(
      this.saasClient,
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.REPORT_PLATFORM,
      req,
      processId,
      buildPlatformReportTcpPayload(query),
    );
  }

  @Get('/admin/analytics/tenants/:tenantId/reports/revenue')
  @Permissions([PERMISSION.REPORT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Tenant sales revenue drilldown' })
  getTenantRevenue(
    @Param('tenantId') tenantId: string,
    @Query() query: ReportRangeQueryDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    return this.forward(
      this.paymentClient,
      TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE,
      req,
      processId,
      buildTenantReportTcpPayload(tenantId, query),
    );
  }

  @Get('/admin/analytics/tenants/:tenantId/reports/orders')
  @Permissions([PERMISSION.REPORT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Tenant order drilldown' })
  getTenantOrders(
    @Param('tenantId') tenantId: string,
    @Query() query: ReportRangeQueryDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    return this.forward(
      this.orderClient,
      TCP_REQUEST_MESSAGE.ORDER.REPORT_ORDERS,
      req,
      processId,
      buildTenantReportTcpPayload(tenantId, query),
    );
  }

  @Get('/admin/analytics/tenants/:tenantId/reports/tables')
  @Permissions([PERMISSION.REPORT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Tenant table drilldown' })
  getTenantTables(@Param('tenantId') tenantId: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(this.catalogClient, TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES, req, processId, { tenantId });
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
