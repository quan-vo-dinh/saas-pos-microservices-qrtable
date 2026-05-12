import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  CreateTenantTcpRequest,
  DeleteTenantTcpRequest,
  GetTenantByIdTcpRequest,
  GetTenantBySlugTcpRequest,
  HandleSubscriptionWebhookTcpRequest,
  OnboardTenantTcpRequest,
  TenantTcpResponse,
  UpdateTenantTcpRequest,
} from '@common/interfaces/tcp/saas';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { OnboardingSagaService } from '../services/onboarding-saga.service';
import { SaasService } from '../services/saas.service';
import { SubscriptionInvoiceService } from '../services/subscription-invoice.service';
import { TenantLifecycleService } from '../services/tenant-lifecycle.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller('saas')
export class SaasController {
  constructor(
    private readonly saasService: SaasService,
    private readonly onboardingSagaService: OnboardingSagaService,
    private readonly tenantLifecycleService: TenantLifecycleService,
    private readonly subscriptionInvoiceService: SubscriptionInvoiceService,
  ) {}

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

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.ONBOARD)
  async onboard(@RequestParams() body: OnboardTenantTcpRequest): Promise<Response<unknown>> {
    return Response.success(
      await this.onboardingSagaService.onboard({
        tenantName: body.name,
        ownerEmail: body.ownerEmail,
        ownerPassword: body.ownerPassword,
        ownerFirstName: body.ownerFirstName,
        ownerLastName: body.ownerLastName,
        type: body.type,
        address: body.address,
        planCode: body.planCode,
        createdByUserId: body.createdByUserId,
        processId: body.processId,
      }),
    );
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.SUSPEND)
  async suspend(@RequestParams() body: { tenantId: string; reason: string }): Promise<Response<boolean>> {
    await this.tenantLifecycleService.suspend(body);
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.ACTIVATE)
  async activate(@RequestParams() body: { tenantId: string }): Promise<Response<boolean>> {
    await this.tenantLifecycleService.activate(body);
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.HANDLE_WEBHOOK)
  async handleSubscriptionWebhook(
    @RequestParams() body: HandleSubscriptionWebhookTcpRequest,
  ): Promise<Response<boolean>> {
    const { payload } = body;
    if (payload.code) {
      await this.subscriptionInvoiceService.handleWebhook({
        code: payload.code,
        transferAmount: payload.transferAmount,
        sepayTransactionId: String(payload.id),
        referenceCode: payload.referenceCode,
        content: payload.content,
      });
    }
    return Response.success(true);
  }
}
