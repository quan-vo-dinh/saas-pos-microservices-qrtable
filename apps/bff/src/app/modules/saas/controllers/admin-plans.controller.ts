import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';
import { CreatePlanDto, ListPlansQueryDto, UpdatePlanDto } from '../dtos/admin-plan.dto';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';
import { ClientProxy } from '@nestjs/microservices';

@ApiTags('SaaS Admin — Plans')
@Controller()
@Authorization({ secured: true })
export class AdminPlansController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Get(SAAS_BFF_ROUTES.adminPlans)
  @Permissions([PERMISSION.PLAN_READ])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List pricing plans for admin' })
  list(@Query() query: ListPlansQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PLAN.LIST, req, processId, query);
  }

  @Post(SAAS_BFF_ROUTES.adminPlans)
  @Permissions([PERMISSION.PLAN_CREATE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Create pricing plan' })
  create(@Body() body: CreatePlanDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PLAN.CREATE, req, processId, body);
  }

  @Patch(SAAS_BFF_ROUTES.adminPlanById)
  @Permissions([PERMISSION.PLAN_UPDATE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Update pricing plan' })
  update(@Param('id') id: string, @Body() body: UpdatePlanDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PLAN.UPDATE, req, processId, { id, ...body });
  }

  @Delete(SAAS_BFF_ROUTES.adminPlanById)
  @Permissions([PERMISSION.PLAN_DELETE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Deactivate pricing plan' })
  remove(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.PLAN.DELETE, req, processId, { id });
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
}
