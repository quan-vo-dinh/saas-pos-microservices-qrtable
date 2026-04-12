import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  AreaTcpResponse,
  CreateAreaTcpRequest,
  DeleteAreaTcpRequest,
  GetAreaByIdTcpRequest,
  GetAreaListTcpRequest,
  ReorderAreaTcpRequest,
  UpdateAreaTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AreaService } from './area.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.CREATE)
  async create(@RequestParams() body: CreateAreaTcpRequest): Promise<Response<AreaTcpResponse>> {
    const result = await this.areaService.create(body);
    return Response.success<AreaTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.GET_LIST)
  async getList(@RequestParams() body: GetAreaListTcpRequest): Promise<Response<AreaTcpResponse[]>> {
    const result = await this.areaService.getList(body);
    return Response.success<AreaTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.GET_BY_ID)
  async getById(@RequestParams() body: GetAreaByIdTcpRequest): Promise<Response<AreaTcpResponse>> {
    const result = await this.areaService.getById(body);
    return Response.success<AreaTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.UPDATE)
  async update(@RequestParams() body: UpdateAreaTcpRequest): Promise<Response<AreaTcpResponse>> {
    const result = await this.areaService.update(body);
    return Response.success<AreaTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.DELETE)
  async remove(@RequestParams() body: DeleteAreaTcpRequest): Promise<Response<boolean>> {
    await this.areaService.delete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.REORDER)
  async reorder(@RequestParams() body: ReorderAreaTcpRequest): Promise<Response<AreaTcpResponse[]>> {
    const result = await this.areaService.reorder(body);
    return Response.success<AreaTcpResponse[]>(result);
  }
}
