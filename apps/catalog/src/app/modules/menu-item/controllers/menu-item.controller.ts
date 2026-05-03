import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  MenuItemTcpResponse,
  CreateMenuItemTcpRequest,
  GetMenuItemListTcpRequest,
  GetMenuItemByIdTcpRequest,
  UpdateMenuItemTcpRequest,
  SoftDeleteMenuItemTcpRequest,
  UpdateMenuItemImageTcpRequest,
  ClearMenuItemImageTcpRequest,
  ValidateOrderableTcpRequest,
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
  type OrderableMenuItemSnapshot,
  type StockMutationResult,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MenuItemService } from '../services/menu-item.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.CREATE)
  async create(@RequestParams() body: CreateMenuItemTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.create(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.GET_LIST)
  async getList(@RequestParams() body: GetMenuItemListTcpRequest): Promise<Response<MenuItemTcpResponse[]>> {
    const result = await this.menuItemService.getList(body);
    return Response.success<MenuItemTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.GET_BY_ID)
  async getById(@RequestParams() body: GetMenuItemByIdTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.getById(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE)
  async update(@RequestParams() body: UpdateMenuItemTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.update(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.SOFT_DELETE)
  async softDelete(@RequestParams() body: SoftDeleteMenuItemTcpRequest): Promise<Response<boolean>> {
    await this.menuItemService.softDelete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE_IMAGE)
  async updateImage(@RequestParams() body: UpdateMenuItemImageTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.updateImage(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.CLEAR_IMAGE)
  async clearImage(@RequestParams() body: ClearMenuItemImageTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.clearImage(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.VALIDATE_ORDERABLE)
  async validateOrderable(
    @RequestParams() body: ValidateOrderableTcpRequest,
  ): Promise<Response<OrderableMenuItemSnapshot[]>> {
    const result = await this.menuItemService.validateOrderable(body);
    return Response.success<OrderableMenuItemSnapshot[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER)
  async deductForOrder(@RequestParams() body: StockDeductForOrderTcpRequest): Promise<Response<StockMutationResult[]>> {
    const result = await this.menuItemService.deductForOrder(body);
    return Response.success<StockMutationResult[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER)
  async releaseForOrder(
    @RequestParams() body: StockReleaseForOrderTcpRequest,
  ): Promise<Response<StockMutationResult[]>> {
    const result = await this.menuItemService.releaseForOrder(body);
    return Response.success<StockMutationResult[]>(result);
  }
}
