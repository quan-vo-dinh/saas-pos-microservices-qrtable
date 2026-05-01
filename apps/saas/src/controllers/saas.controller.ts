import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  CreateTenantTcpRequest,
  DeleteTenantTcpRequest,
  GetTenantByIdTcpRequest,
  GetTenantBySlugTcpRequest,
  TenantTcpResponse,
  UpdateTenantTcpRequest,
} from '@common/interfaces/tcp/saas';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SaasService } from '../services/saas.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller('saas')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.HEALTH)
  async health(): Promise<Response<{ service: string; status: 'UP' }>> {
    return Response.success<{ service: string; status: 'UP' }>({
      service: 'saas',
      status: 'UP',
    });
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.CREATE)
  async create(@RequestParams() body: CreateTenantTcpRequest): Promise<Response<TenantTcpResponse>> {
    const result = await this.saasService.create(body);
    return Response.success<TenantTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.GET_LIST)
  async getList(): Promise<Response<TenantTcpResponse[]>> {
    const result = await this.saasService.getList();
    return Response.success<TenantTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID)
  async getById(@RequestParams() body: GetTenantByIdTcpRequest): Promise<Response<TenantTcpResponse>> {
    const result = await this.saasService.getById(body.id);
    return Response.success<TenantTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.GET_BY_SLUG)
  async getBySlug(@RequestParams() body: GetTenantBySlugTcpRequest): Promise<Response<TenantTcpResponse>> {
    const result = await this.saasService.getBySlug(body.slug);
    return Response.success<TenantTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.UPDATE)
  async update(@RequestParams() body: UpdateTenantTcpRequest): Promise<Response<TenantTcpResponse>> {
    const result = await this.saasService.update(body);
    return Response.success<TenantTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SAAS.DELETE)
  async remove(@RequestParams() body: DeleteTenantTcpRequest): Promise<Response<boolean>> {
    await this.saasService.delete(body.id);
    return Response.success<boolean>(true);
  }
}
