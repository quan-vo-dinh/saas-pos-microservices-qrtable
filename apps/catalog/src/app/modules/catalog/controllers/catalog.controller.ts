import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { Catalog } from '@common/entities/catalog.entity';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CatalogService } from '../services/catalog.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.CREATE)
  async create(@RequestParams() body: Partial<Catalog>): Promise<Response<Catalog>> {
    const result = await this.catalogService.create(body);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.GET_LIST)
  async getList(): Promise<Response<Catalog[]>> {
    const result = await this.catalogService.getList();
    return Response.success(result);
  }
}
