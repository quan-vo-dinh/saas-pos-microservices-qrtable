import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import {
  CreateTableRequestDto,
  TableResponseDto,
  UpdateTableRequestDto,
  UpdateTableStatusRequestDto,
} from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CreateTableTcpRequest,
  DeleteTableTcpRequest,
  GetTableByIdTcpRequest,
  GetTableListTcpRequest,
  RegenerateQrTokenTcpRequest,
  TableTcpResponse,
  UpdateTableStatusTcpRequest,
  UpdateTableTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';

@ApiTags('Tables (Admin)')
@Controller('admin/tables')
export class TableAdminController {
  constructor(@Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient) {}

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  @ApiOkResponse({ type: ResponseDto<TableResponseDto> })
  @ApiOperation({ summary: 'Create a new table' })
  create(@Body() body: CreateTableRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, CreateTableTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.CREATE,
        buildTcpRequestContext<CreateTableTcpRequest>(req, processId, {
          tenantId,
          ...body,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_GET_LIST])
  @ApiOkResponse({ type: ResponseDto<TableResponseDto[]> })
  @ApiOperation({ summary: 'Get all tables' })
  findAll(@ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse[], GetTableListTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.GET_LIST,
        buildTcpRequestContext<GetTableListTcpRequest>(req, processId, {
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse[]>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_GET_BY_ID])
  @ApiOkResponse({ type: ResponseDto<TableResponseDto> })
  @ApiOperation({ summary: 'Get table by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, GetTableByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.GET_BY_ID,
        buildTcpRequestContext<GetTableByIdTcpRequest>(req, processId, {
          id,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<TableResponseDto> })
  @ApiOperation({ summary: 'Update table by id' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateTableRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, UpdateTableTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.UPDATE,
        buildTcpRequestContext<UpdateTableTcpRequest>(req, processId, {
          id,
          tenantId,
          ...body,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch(':id/status')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<TableResponseDto> })
  @ApiOperation({ summary: 'Update table status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateTableStatusRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, UpdateTableStatusTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS,
        buildTcpRequestContext<UpdateTableStatusTcpRequest>(req, processId, {
          id,
          tenantId,
          ...body,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Post(':id/regenerate-qr')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<TableResponseDto> })
  @ApiOperation({ summary: 'Regenerate QR token for table' })
  regenerateQr(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, RegenerateQrTokenTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.REGENERATE_QR_TOKEN,
        buildTcpRequestContext<RegenerateQrTokenTcpRequest>(req, processId, {
          id,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Delete(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_DELETE])
  @ApiOkResponse({ type: ResponseDto<boolean> })
  @ApiOperation({ summary: 'Delete table by id' })
  remove(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<boolean, DeleteTableTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.DELETE,
        buildTcpRequestContext<DeleteTableTcpRequest>(req, processId, {
          id,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<boolean>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }
}
