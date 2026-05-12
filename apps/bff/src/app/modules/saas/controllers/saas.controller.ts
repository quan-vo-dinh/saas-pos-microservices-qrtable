import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { CreateTenantRequestDto, TenantResponseDto, UpdateTenantRequestDto } from '@common/interfaces/gateway/saas';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CreateTenantTcpRequest,
  GetTenantByIdTcpRequest,
  TenantTcpResponse,
  UpdateTenantTcpRequest,
} from '@common/interfaces/tcp/saas';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Delete, Get, GoneException, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';

@ApiTags('SaaS')
@Controller('saas')
export class SaasController {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  @Get('health')
  @ApiOkResponse({ type: ResponseDto<{ service: string; status: 'UP' }> })
  @ApiOperation({ summary: 'Check saas tcp health' })
  health(@ProcessId() processId: string) {
    return this.saasClient
      .send<{ service: string; status: 'UP' }, void>(TCP_REQUEST_MESSAGE.SAAS.HEALTH, { processId })
      .pipe(
        map(
          (response) =>
            new ResponseDto<{ service: string; status: 'UP' }>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TENANT_ONBOARD])
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto> })
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() body: CreateTenantRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.saasClient
      .send<
        TenantTcpResponse,
        CreateTenantTcpRequest
      >(TCP_REQUEST_MESSAGE.SAAS.CREATE, buildTcpRequestContext<CreateTenantTcpRequest>(req, processId, body))
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TENANT_LIST_ALL])
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto[]> })
  @ApiOperation({ summary: 'Get all tenants' })
  findAll(@ProcessId() processId: string, @Req() req: Request) {
    return this.saasClient
      .send<TenantTcpResponse[], void>(TCP_REQUEST_MESSAGE.SAAS.GET_LIST, buildTcpRequestContext<void>(req, processId))
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse[]>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TENANT_READ_ANY])
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto> })
  @ApiOperation({ summary: 'Get tenant by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.saasClient
      .send<
        TenantTcpResponse,
        GetTenantByIdTcpRequest
      >(TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID, buildTcpRequestContext<GetTenantByIdTcpRequest>(req, processId, { id }))
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TENANT_UPDATE])
  @ApiOkResponse({ type: ResponseDto<TenantResponseDto> })
  @ApiOperation({ summary: 'Update tenant by id' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateTenantRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    return this.saasClient
      .send<
        TenantTcpResponse,
        UpdateTenantTcpRequest
      >(TCP_REQUEST_MESSAGE.SAAS.UPDATE, buildTcpRequestContext<UpdateTenantTcpRequest>(req, processId, { id, ...body }))
      .pipe(
        map(
          (response) =>
            new ResponseDto<TenantTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Delete(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TENANT_CLOSE])
  @ApiOkResponse({ type: ResponseDto<boolean> })
  @ApiOperation({ summary: 'Delete tenant by id' })
  remove(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    void id;
    void processId;
    void req;
    throw new GoneException('DELETE /saas/:id is deprecated. Use PATCH /admin/tenants/:id/status with action CLOSE.');
  }
}
