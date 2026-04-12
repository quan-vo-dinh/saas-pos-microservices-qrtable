import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MenuService } from './menu.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU.GET_PUBLIC_MENU)
  async getPublicMenu(@RequestParams() body: GetPublicMenuTcpRequest): Promise<Response<PublicMenuTcpResponse>> {
    const result = await this.menuService.getPublicMenu(body);
    return Response.success<PublicMenuTcpResponse>(result);
  }
}
