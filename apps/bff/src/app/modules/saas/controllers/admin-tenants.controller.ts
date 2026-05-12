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
import { SAAS_EVENTS, TenantStatus } from '@common/constants/saas.constants';
import type { GetTenantByIdTcpRequest } from '@common/interfaces/tcp/saas';
import type { TenantTcpResponse } from '@common/interfaces/tcp/saas';
import { Body, Controller, ForbiddenException, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, from, map, mergeMap } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import {
  AdminListTenantsQueryDto,
  AssignTenantSubscriptionDto,
  OnboardTenantDto,
  TenantStatusActionDtoValue,
  UpdateTenantDto,
  UpdateTenantStatusDto,
} from '../dtos/admin-tenant.dto';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

@ApiTags('SaaS Admin — Tenants')
@Controller()
@Authorization({ secured: true })
export class AdminTenantsController {
  constructor(
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  @Get(SAAS_BFF_ROUTES.adminPlatformStats)
  @Permissions([PERMISSION.TENANT_LIST_ALL])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get platform SaaS statistics' })
  getPlatformStats(@ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.GET_PLATFORM_STATS, req, processId);
  }

  @Get(SAAS_BFF_ROUTES.adminTenants)
  @Permissions([PERMISSION.TENANT_LIST_ALL])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List tenants for platform admin' })
  list(@Query() query: AdminListTenantsQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.LIST, req, processId, query);
  }

  @Post(SAAS_BFF_ROUTES.adminTenantOnboard)
  @Permissions([PERMISSION.TENANT_ONBOARD])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Onboard a new tenant' })
  onboard(@Body() body: OnboardTenantDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.ONBOARD, req, processId, {
      ...body,
      createdByUserId: this.userId(req),
    });
  }

  @Get(SAAS_BFF_ROUTES.adminTenantById)
  @Permissions([PERMISSION.TENANT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get tenant detail' })
  getById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.GET_BY_ID, req, processId, { id });
  }

  @Patch(SAAS_BFF_ROUTES.adminTenantById)
  @Permissions([PERMISSION.TENANT_UPDATE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Update tenant profile' })
  update(@Param('id') id: string, @Body() body: UpdateTenantDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.UPDATE, req, processId, { id, ...body });
  }

  @Patch(SAAS_BFF_ROUTES.adminTenantStatus)
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Update tenant status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateTenantStatusDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertStatusPermission(req, body.action);
    const pattern = {
      [TenantStatusActionDtoValue.SUSPEND]: TCP_REQUEST_MESSAGE.TENANT.SUSPEND,
      [TenantStatusActionDtoValue.ACTIVATE]: TCP_REQUEST_MESSAGE.TENANT.ACTIVATE,
      [TenantStatusActionDtoValue.CLOSE]: TCP_REQUEST_MESSAGE.TENANT.CLOSE,
    }[body.action];

    return this.saasClient
      .send(
        pattern,
        buildTcpRequestContext(req, processId, {
          id,
          reason: body.reason ?? null,
          requestedByUserId: this.userId(req),
        }),
      )
      .pipe(
        mergeMap((response) =>
          from(
            (async () => {
              if (response.statusCode >= 200 && response.statusCode < 300) {
                await this.emitTenantLifecycleSocket(req, processId, id, body);
              }
              return response;
            })(),
          ),
        ),
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

  @Get(SAAS_BFF_ROUTES.adminTenantSubscriptions)
  @Permissions([PERMISSION.SUBSCRIPTION_LIST_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List tenant subscription history' })
  listSubscriptions(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_HISTORY, req, processId, { tenantId: id });
  }

  @Post(SAAS_BFF_ROUTES.adminTenantSubscriptions)
  @Permissions([PERMISSION.SUBSCRIPTION_ASSIGN])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Assign tenant subscription' })
  assignSubscription(
    @Param('id') id: string,
    @Body() body: AssignTenantSubscriptionDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    return this.forward(TCP_REQUEST_MESSAGE.SUBSCRIPTION.ASSIGN, req, processId, {
      ...body,
      tenantId: id,
      createdByUserId: this.userId(req),
    });
  }

  @Get(SAAS_BFF_ROUTES.adminTenantUsage)
  @Permissions([PERMISSION.TENANT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get tenant usage' })
  getUsage(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.GET_USAGE, req, processId, { tenantId: id });
  }

  @Get(SAAS_BFF_ROUTES.adminTenantAudit)
  @Permissions([PERMISSION.TENANT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get tenant audit trail' })
  getAudit(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.TENANT.GET_AUDIT, req, processId, { tenantId: id });
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

  private async emitTenantLifecycleSocket(
    req: Request,
    processId: string,
    tenantId: string,
    body: UpdateTenantStatusDto,
  ): Promise<void> {
    const tcp = await firstValueFrom(
      this.saasClient.send<TenantTcpResponse, GetTenantByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID,
        buildTcpRequestContext<GetTenantByIdTcpRequest>(req, processId, { id: tenantId }),
      ),
    );
    const t = tcp.data;
    if (!t?.slug) {
      return;
    }

    const eventByAction = {
      [TenantStatusActionDtoValue.SUSPEND]: SAAS_EVENTS.TENANT_SUSPENDED,
      [TenantStatusActionDtoValue.ACTIVATE]: SAAS_EVENTS.TENANT_ACTIVATED,
      [TenantStatusActionDtoValue.CLOSE]: SAAS_EVENTS.TENANT_CLOSED,
    } as const;

    const statusByAction: Record<TenantStatusActionDtoValue, 'SUSPENDED' | 'ACTIVE' | 'CLOSED'> = {
      [TenantStatusActionDtoValue.SUSPEND]: TenantStatus.SUSPENDED,
      [TenantStatusActionDtoValue.ACTIVATE]: TenantStatus.ACTIVE,
      [TenantStatusActionDtoValue.CLOSE]: TenantStatus.CLOSED,
    } as const;

    const reason =
      body.action === TenantStatusActionDtoValue.SUSPEND
        ? (t.suspendedReason ?? body.reason ?? null)
        : body.action === TenantStatusActionDtoValue.CLOSE
          ? (body.reason ?? null)
          : null;

    this.realtimeEvents.emitTenantLifecycle({
      eventName: eventByAction[body.action],
      tenantId: t.id,
      tenantSlug: t.slug,
      status: statusByAction[body.action],
      reason,
      occurredAt: new Date().toISOString(),
    });
  }

  private userId(req: Request): string {
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const userId = userData?.metadata?.userId;
    if (!userId) {
      throw new ForbiddenException('USER_ID_REQUIRED');
    }
    return userId;
  }

  private assertStatusPermission(req: Request, action: TenantStatusActionDtoValue): void {
    const requiredPermissionByAction = {
      [TenantStatusActionDtoValue.SUSPEND]: PERMISSION.TENANT_SUSPEND,
      [TenantStatusActionDtoValue.ACTIVATE]: PERMISSION.TENANT_ACTIVATE,
      [TenantStatusActionDtoValue.CLOSE]: PERMISSION.TENANT_CLOSE,
    } as const;
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const permissions = userData?.metadata?.permissions ?? [];

    if (!permissions.includes(requiredPermissionByAction[action])) {
      throw new ForbiddenException('AUTH_PERMISSION_DENIED');
    }
  }
}
