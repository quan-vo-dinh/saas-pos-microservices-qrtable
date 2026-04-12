import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import {
  CategoryResponseDto,
  CreateCategoryRequestDto,
  ReorderCategoryRequestDto,
  UpdateCategoryRequestDto,
} from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CategoryTcpResponse,
  CreateCategoryTcpRequest,
  DeleteCategoryTcpRequest,
  GetCategoryByIdTcpRequest,
  GetCategoryListTcpRequest,
  ReorderCategoryTcpRequest,
  UpdateCategoryTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';

@ApiTags('Categories (Admin)')
@Controller('admin/categories')
export class CategoryAdminController {
  constructor(
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto> })
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Body() body: CreateCategoryRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<CategoryTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<CategoryTcpResponse, CreateCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.CREATE,
          buildTcpRequestContext<CreateCategoryTcpRequest>(req, processId, {
            tenantId,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<CategoryTcpResponse>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );

    await this.invalidateMenuCache(req);
    return result;
  }

  @Get()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_GET_LIST])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto[]> })
  @ApiOperation({ summary: 'Get all categories' })
  findAll(@ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<CategoryTcpResponse[], GetCategoryListTcpRequest>(
        TCP_REQUEST_MESSAGE.CATEGORY.GET_LIST,
        buildTcpRequestContext<GetCategoryListTcpRequest>(req, processId, {
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<CategoryTcpResponse[]>({
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
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto> })
  @ApiOperation({ summary: 'Get category by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<CategoryTcpResponse, GetCategoryByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.CATEGORY.GET_BY_ID,
        buildTcpRequestContext<GetCategoryByIdTcpRequest>(req, processId, {
          id,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<CategoryTcpResponse>({
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
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto[]> })
  @ApiOperation({ summary: 'Reorder categories' })
  async reorder(
    @Body() body: ReorderCategoryRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<CategoryTcpResponse[]>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<CategoryTcpResponse[], ReorderCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.REORDER,
          buildTcpRequestContext<ReorderCategoryTcpRequest>(req, processId, {
            tenantId,
            items: body.items,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<CategoryTcpResponse[]>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );

    await this.invalidateMenuCache(req);
    return result;
  }

  @Patch(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto> })
  @ApiOperation({ summary: 'Update category by id' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<CategoryTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<CategoryTcpResponse, UpdateCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.UPDATE,
          buildTcpRequestContext<UpdateCategoryTcpRequest>(req, processId, {
            id,
            tenantId,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<CategoryTcpResponse>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );

    await this.invalidateMenuCache(req);
    return result;
  }

  @Delete(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_DELETE])
  @ApiOkResponse({ type: ResponseDto<boolean> })
  @ApiOperation({ summary: 'Delete category by id' })
  async remove(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<boolean>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<boolean, DeleteCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.DELETE,
          buildTcpRequestContext<DeleteCategoryTcpRequest>(req, processId, {
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
        ),
    );

    await this.invalidateMenuCache(req);
    return result;
  }

  private async invalidateMenuCache(req: Request): Promise<void> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    if (tenantId) {
      await this.cacheManager.del(`menu:${tenantId}`);
    }
  }
}
