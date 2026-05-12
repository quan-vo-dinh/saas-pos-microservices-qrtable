import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams, RequestProcessId } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  CreateTenantTcpRequest,
  CheckoutInvoiceTcpRequest,
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
import { PricingPlanAdminService } from '../services/pricing-plan-admin.service';
import { SaasService } from '../services/saas.service';
import { SubscriptionDashboardService } from '../services/subscription-dashboard.service';
import { SubscriptionInvoiceService } from '../services/subscription-invoice.service';
import { TenantAdminService } from '../services/tenant-admin.service';
import { TenantLifecycleService } from '../services/tenant-lifecycle.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller('saas')
export class SaasController {
  constructor(
    private readonly saasService: SaasService,
    private readonly tenantAdminService: TenantAdminService,
    private readonly pricingPlanAdminService: PricingPlanAdminService,
    private readonly subscriptionDashboardService: SubscriptionDashboardService,
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
  async onboard(
    @RequestParams() body: OnboardTenantTcpRequest & Record<string, unknown>,
    @RequestProcessId() processId?: string,
  ): Promise<Response<unknown>> {
    return Response.success(
      await this.onboardingSagaService.onboard({
        tenantName: String(body.name ?? body.tenantName ?? ''),
        ownerEmail: body.ownerEmail,
        ownerPassword: body.ownerPassword,
        ownerFirstName: body.ownerFirstName,
        ownerLastName: body.ownerLastName,
        type: String(body.type ?? body.tenantType ?? 'RESTAURANT'),
        address: body.address,
        planCode: String(body.planCode ?? body.initialPlanCode ?? ''),
        createdByUserId: body.createdByUserId,
        processId: processId ?? body.processId,
      }),
    );
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_PLATFORM_STATS)
  async getPlatformStats(): Promise<Response<unknown>> {
    return Response.success(await this.tenantAdminService.getPlatformStats());
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.LIST)
  async listTenants(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
    return Response.success(await this.tenantAdminService.list(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_BY_ID)
  async getTenantById(@RequestParams() body: { id: string }): Promise<Response<unknown>> {
    return Response.success(await this.tenantAdminService.get(body.id));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.UPDATE)
  async updateTenant(@RequestParams() body: { id: string } & Record<string, unknown>): Promise<Response<unknown>> {
    const { id, ...patch } = body;
    return Response.success(await this.tenantAdminService.update(id, patch));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.SUSPEND)
  async suspend(
    @RequestParams() body: { id?: string; tenantId?: string; reason?: string },
  ): Promise<Response<boolean>> {
    await this.tenantLifecycleService.suspend({ tenantId: this.tenantId(body), reason: body.reason ?? '' });
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.ACTIVATE)
  async activate(@RequestParams() body: { id?: string; tenantId?: string }): Promise<Response<boolean>> {
    await this.tenantLifecycleService.activate({ tenantId: this.tenantId(body) });
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.CLOSE)
  async close(
    @RequestParams() body: { id?: string; tenantId?: string; reason?: string | null },
  ): Promise<Response<boolean>> {
    await this.tenantLifecycleService.close({ tenantId: this.tenantId(body), reason: body.reason ?? null });
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_USAGE)
  async getTenantUsage(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
    return Response.success(await this.tenantAdminService.usage(body.tenantId));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_AUDIT)
  async getTenantAudit(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
    return Response.success(await this.tenantAdminService.audit(body.tenantId));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PLAN.LIST_ACTIVE)
  async listActivePlans(): Promise<Response<unknown>> {
    return Response.success(await this.pricingPlanAdminService.listPublic());
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PLAN.LIST)
  async listPlans(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
    return Response.success(await this.pricingPlanAdminService.list(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PLAN.CREATE)
  async createPlan(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
    return Response.success(await this.pricingPlanAdminService.create(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PLAN.UPDATE)
  async updatePlan(@RequestParams() body: { id: string } & Record<string, unknown>): Promise<Response<unknown>> {
    const { id, ...patch } = body;
    return Response.success(await this.pricingPlanAdminService.update(id, patch));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PLAN.DELETE)
  async deletePlan(@RequestParams() body: { id: string }): Promise<Response<unknown>> {
    return Response.success(await this.pricingPlanAdminService.deactivate(body.id));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT)
  async getCurrentSubscription(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.getDashboardSubscription(body.tenantId));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE)
  async checkoutInvoice(@RequestParams() body: CheckoutInvoiceTcpRequest): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.checkoutInvoice(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL)
  async cancelSubscription(
    @RequestParams() body: { tenantId: string; reason?: string | null },
  ): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.cancelSubscription(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_HISTORY)
  async listSubscriptionHistory(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.listSubscriptions(body.tenantId));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.ASSIGN)
  async assignSubscription(
    @RequestParams()
    body: {
      tenantId: string;
      planCode: string;
      billingPeriod?: 'MONTHLY' | 'YEARLY';
      createdByUserId?: string;
    },
  ): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.assignSubscription(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_INVOICES)
  async listInvoices(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.listInvoices(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE)
  async getInvoice(
    @RequestParams() body: { tenantId?: string; invoiceId: string; statusOnly?: boolean },
  ): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.getInvoice(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE)
  async cancelInvoice(
    @RequestParams() body: { tenantId?: string; invoiceId: string; reason?: string | null },
  ): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.cancelInvoice(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.MANUAL_CONFIRM_INVOICE)
  async manualConfirmInvoice(
    @RequestParams() body: { invoiceId: string; confirmedByUserId: string; note?: string | null },
  ): Promise<Response<unknown>> {
    return Response.success(await this.subscriptionDashboardService.manualConfirmInvoice(body));
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

  private tenantId(body: { id?: string; tenantId?: string }): string {
    return body.tenantId ?? body.id ?? '';
  }
}
