import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION, ROLE } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import {
  ChangeStaffRoleDto,
  CreateStaffRequestDto,
  ListStaffQueryDto,
  SetStaffStatusDto,
} from '@common/interfaces/gateway/user';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, HttpStatus, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';

@ApiTags('Dashboard Staff')
@Controller('dashboard/staff')
@Authorization({ secured: true })
export class DashboardStaffController {
  constructor(@Inject(TCP_SERVICES.USER_ACCESS_SERVICE) private readonly userAccessClient: TcpClient) {}

  @Get()
  @Permissions([PERMISSION.USER_GET_ALL])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List tenant staff' })
  list(@Query() query: ListStaffQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_LIST, req, processId, query);
  }

  @Get(':userId')
  @Permissions([PERMISSION.USER_GET_BY_ID])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get tenant staff profile' })
  get(@Param('userId') userId: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_GET, req, processId, { userId });
  }

  @Post()
  @Permissions([PERMISSION.USER_CREATE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Create tenant staff' })
  create(@Body() body: CreateStaffRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_CREATE, req, processId, body);
  }

  @Patch(':userId/role')
  @Permissions([PERMISSION.USER_UPDATE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Change staff role (Owner only)' })
  changeRole(
    @Param('userId') userId: string,
    @Body() body: ChangeStaffRoleDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertOwner(req);
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_CHANGE_ROLE, req, processId, { userId, ...body });
  }

  @Post(':userId/disable')
  @Permissions([PERMISSION.USER_DELETE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Disable staff (Owner only)' })
  disable(
    @Param('userId') userId: string,
    @Body() body: SetStaffStatusDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertOwner(req);
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS, req, processId, {
      userId,
      enabled: false,
      reason: body.reason,
    });
  }

  @Post(':userId/enable')
  @Permissions([PERMISSION.USER_UPDATE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Re-enable staff (Owner only)' })
  enable(
    @Param('userId') userId: string,
    @Body() body: SetStaffStatusDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertOwner(req);
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS, req, processId, {
      userId,
      enabled: true,
      reason: body.reason,
    });
  }

  private forward(pattern: unknown, req: Request, processId: string, data: unknown) {
    return this.userAccessClient
      .send(pattern, buildTcpRequestContext(req, processId, this.buildPayload(req, processId, data)))
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

  private buildPayload(req: Request, processId: string, data: unknown) {
    const tenantId = req[MetadataKey.TENANT_ID] as string | undefined;
    if (!tenantId) {
      throw new BusinessException(ErrorCode.TENANT_REQUIRED, HttpStatus.FORBIDDEN);
    }

    return {
      tenantId,
      requestedByUserId: this.userId(req),
      requestedByRoles: this.roles(req),
      ...(typeof data === 'object' && data !== null ? data : {}),
      processId,
    };
  }

  private userId(req: Request): string {
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const userId = userData?.metadata?.userId;
    if (!userId) {
      throw new BusinessException(ErrorCode.USER_ID_REQUIRED, HttpStatus.FORBIDDEN);
    }
    return userId;
  }

  private roles(req: Request): string[] {
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const rolesFromUser = userData?.metadata?.user?.roles?.map((role) => role.name).filter(Boolean) ?? [];
    return rolesFromUser.length ? rolesFromUser : [];
  }

  private assertOwner(req: Request): void {
    if (!this.roles(req).some((role) => role.toUpperCase() === ROLE.OWNER)) {
      throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
    }
  }
}
