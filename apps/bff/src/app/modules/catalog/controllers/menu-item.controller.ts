import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { RedisKey } from '@common/constants/redis-key.constants';
import { ProcessId } from '@common/decorators/processId.decorator';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import {
  CreateMenuItemRequestDto,
  MenuItemResponseDto,
  UpdateMenuItemRequestDto,
} from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CreateMenuItemTcpRequest,
  GetMenuItemByIdTcpRequest,
  GetMenuItemListTcpRequest,
  MenuItemTcpResponse,
  SoftDeleteMenuItemTcpRequest,
  UpdateMenuItemImageTcpRequest,
  ClearMenuItemImageTcpRequest,
  UpdateMenuItemTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { CloudinaryService } from '@common/providers/cloudinary/cloudinary.service';
import { CloudinaryFolder } from '@common/providers/cloudinary/cloudinary.constants';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';

@ApiTags('Menu Items (Admin)')
@Controller('admin/menu-items')
export class MenuItemAdminController {
  constructor(
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  @ApiOkResponse({ type: ResponseDto<MenuItemResponseDto> })
  @ApiOperation({ summary: 'Create a new menu item' })
  async create(
    @Body() body: CreateMenuItemRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<MenuItemTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<MenuItemTcpResponse, CreateMenuItemTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.CREATE,
          buildTcpRequestContext<CreateMenuItemTcpRequest>(req, processId, {
            tenantId,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<MenuItemTcpResponse>({
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
  @ApiOkResponse({ type: ResponseDto<MenuItemResponseDto[]> })
  @ApiOperation({ summary: 'Get all menu items' })
  findAll(@ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<MenuItemTcpResponse[], GetMenuItemListTcpRequest>(
        TCP_REQUEST_MESSAGE.MENU_ITEM.GET_LIST,
        buildTcpRequestContext<GetMenuItemListTcpRequest>(req, processId, {
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<MenuItemTcpResponse[]>({
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
  @ApiOkResponse({ type: ResponseDto<MenuItemResponseDto> })
  @ApiOperation({ summary: 'Get menu item by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<MenuItemTcpResponse, GetMenuItemByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.MENU_ITEM.GET_BY_ID,
        buildTcpRequestContext<GetMenuItemByIdTcpRequest>(req, processId, {
          id,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<MenuItemTcpResponse>({
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
  @ApiOkResponse({ type: ResponseDto<MenuItemResponseDto> })
  @ApiOperation({ summary: 'Update menu item by id' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateMenuItemRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<MenuItemTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<MenuItemTcpResponse, UpdateMenuItemTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE,
          buildTcpRequestContext<UpdateMenuItemTcpRequest>(req, processId, {
            id,
            tenantId,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<MenuItemTcpResponse>({
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

  @Delete(':id/image')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<MenuItemResponseDto> })
  @ApiOperation({ summary: 'Remove menu item image (Cloudinary + DB)' })
  async removeImage(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<MenuItemTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const currentItem = await firstValueFrom(
      this.catalogClient
        .send<
          MenuItemTcpResponse,
          GetMenuItemByIdTcpRequest
        >(TCP_REQUEST_MESSAGE.MENU_ITEM.GET_BY_ID, buildTcpRequestContext<GetMenuItemByIdTcpRequest>(req, processId, { id, tenantId }))
        .pipe(map((r) => r.data)),
    );

    if (currentItem?.imagePublicId) {
      await this.cloudinaryService.deleteImage(currentItem.imagePublicId);
    }

    const result = await firstValueFrom(
      this.catalogClient
        .send<MenuItemTcpResponse, ClearMenuItemImageTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.CLEAR_IMAGE,
          buildTcpRequestContext<ClearMenuItemImageTcpRequest>(req, processId, {
            id,
            tenantId,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<MenuItemTcpResponse>({
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
  @ApiOperation({ summary: 'Soft delete menu item by id' })
  async remove(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<boolean>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const result = await firstValueFrom(
      this.catalogClient
        .send<boolean, SoftDeleteMenuItemTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.SOFT_DELETE,
          buildTcpRequestContext<SoftDeleteMenuItemTcpRequest>(req, processId, {
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

  @Post(':id/image')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOkResponse({ type: ResponseDto<MenuItemResponseDto> })
  @ApiOperation({ summary: 'Upload menu item image' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<MenuItemTcpResponse>> {
    if (!file) {
      throw new BusinessException(ErrorCode.UPLOAD_FILE_REQUIRED, HttpStatus.BAD_REQUEST);
    }

    const tenantId = req[MetadataKey.TENANT_ID] as string;

    const currentItem = await firstValueFrom(
      this.catalogClient
        .send<
          MenuItemTcpResponse,
          GetMenuItemByIdTcpRequest
        >(TCP_REQUEST_MESSAGE.MENU_ITEM.GET_BY_ID, buildTcpRequestContext<GetMenuItemByIdTcpRequest>(req, processId, { id, tenantId }))
        .pipe(map((r) => r.data)),
    );

    const uploadResult = await this.cloudinaryService.uploadImage(file.buffer, {
      tenantId,
      folder: CloudinaryFolder.MENU,
      mimetype: file.mimetype,
      fileName: file.originalname,
    });

    if (currentItem?.imagePublicId) {
      await this.cloudinaryService.deleteImage(currentItem.imagePublicId);
    }

    const result = await firstValueFrom(
      this.catalogClient
        .send<MenuItemTcpResponse, UpdateMenuItemImageTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE_IMAGE,
          buildTcpRequestContext<UpdateMenuItemImageTcpRequest>(req, processId, {
            id,
            tenantId,
            imageUrl: uploadResult.secureUrl,
            imagePublicId: uploadResult.publicId,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<MenuItemTcpResponse>({
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
      await this.cacheManager.del(RedisKey.menu.public(tenantId));
    }
  }
}
