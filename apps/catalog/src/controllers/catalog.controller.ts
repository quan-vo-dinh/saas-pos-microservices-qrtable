import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  CatalogTcpResponse,
  CreateCatalogTcpRequest,
  DeleteCatalogTcpRequest,
  GetCatalogByIdTcpRequest,
  UpdateCatalogTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CatalogService } from '../services/catalog.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.CREATE)
  async create(@RequestParams() body: CreateCatalogTcpRequest): Promise<Response<CatalogTcpResponse>> {
    const result = await this.catalogService.create(body);
    return Response.success<CatalogTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.GET_LIST)
  async getList(): Promise<Response<CatalogTcpResponse[]>> {
    const result = await this.catalogService.getList();
    return Response.success<CatalogTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.GET_BY_ID)
  async getById(@RequestParams() body: GetCatalogByIdTcpRequest): Promise<Response<CatalogTcpResponse>> {
    const result = await this.catalogService.getById(body.id);
    return Response.success<CatalogTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.UPDATE)
  async update(@RequestParams() body: UpdateCatalogTcpRequest): Promise<Response<CatalogTcpResponse>> {
    const result = await this.catalogService.update(body);
    return Response.success<CatalogTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.DELETE)
  async remove(@RequestParams() body: DeleteCatalogTcpRequest): Promise<Response<boolean>> {
    await this.catalogService.delete(body.id);
    return Response.success<boolean>(true);
  }
}
