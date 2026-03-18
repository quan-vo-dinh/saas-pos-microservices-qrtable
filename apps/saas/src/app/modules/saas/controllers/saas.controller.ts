import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { Tenant } from '@common/entities/tenant.entity';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SaasService } from '../services/saas.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller('saas')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.CREATE)
  async create(@RequestParams() body: Partial<Tenant>): Promise<Response<Tenant>> {
    const result = await this.saasService.create(body);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.GET_LIST)
  async getList(): Promise<Response<Tenant[]>> {
    const result = await this.saasService.getList();
    return Response.success(result);
  }
}
