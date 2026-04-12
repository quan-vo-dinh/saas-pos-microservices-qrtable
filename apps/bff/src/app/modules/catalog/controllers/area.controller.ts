import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import {
  AreaResponseDto,
  CreateAreaRequestDto,
  ReorderAreaRequestDto,
  UpdateAreaRequestDto,
} from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  AreaTcpResponse,
  CreateAreaTcpRequest,
  DeleteAreaTcpRequest,
  GetAreaByIdTcpRequest,
  GetAreaListTcpRequest,
  ReorderAreaTcpRequest,
  UpdateAreaTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { map } from 'rxjs';

@ApiTags('Areas (Admin)')
@Controller('admin/areas')
export class AreaAdminController {
  constructor(@Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient) {}

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  @ApiOkResponse({ type: ResponseDto<AreaResponseDto> })
  @ApiOperation({ summary: 'Create a new area' })
  create(@Body() body: CreateAreaRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<AreaTcpResponse, CreateAreaTcpRequest>(
        TCP_REQUEST_MESSAGE.AREA.CREATE,
        buildTcpRequestContext<CreateAreaTcpRequest>(req, processId, {
          tenantId,
          ...body,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<AreaTcpResponse>({
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
  @ApiOkResponse({ type: ResponseDto<AreaResponseDto[]> })
  @ApiOperation({ summary: 'Get all areas' })
  findAll(@ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<AreaTcpResponse[], GetAreaListTcpRequest>(
        TCP_REQUEST_MESSAGE.AREA.GET_LIST,
        buildTcpRequestContext<GetAreaListTcpRequest>(req, processId, {
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<AreaTcpResponse[]>({
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
  @ApiOkResponse({ type: ResponseDto<AreaResponseDto> })
  @ApiOperation({ summary: 'Get area by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<AreaTcpResponse, GetAreaByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.AREA.GET_BY_ID,
        buildTcpRequestContext<GetAreaByIdTcpRequest>(req, processId, {
          id,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<AreaTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch('reorder')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<AreaResponseDto[]> })
  @ApiOperation({ summary: 'Reorder areas' })
  reorder(@Body() body: ReorderAreaRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<AreaTcpResponse[], ReorderAreaTcpRequest>(
        TCP_REQUEST_MESSAGE.AREA.REORDER,
        buildTcpRequestContext<ReorderAreaTcpRequest>(req, processId, {
          tenantId,
          items: body.items,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<AreaTcpResponse[]>({
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
  @ApiOkResponse({ type: ResponseDto<AreaResponseDto> })
  @ApiOperation({ summary: 'Update area by id' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateAreaRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<AreaTcpResponse, UpdateAreaTcpRequest>(
        TCP_REQUEST_MESSAGE.AREA.UPDATE,
        buildTcpRequestContext<UpdateAreaTcpRequest>(req, processId, {
          id,
          tenantId,
          ...body,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<AreaTcpResponse>({
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
  @ApiOperation({ summary: 'Delete area by id' })
  remove(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<boolean, DeleteAreaTcpRequest>(
        TCP_REQUEST_MESSAGE.AREA.DELETE,
        buildTcpRequestContext<DeleteAreaTcpRequest>(req, processId, {
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
