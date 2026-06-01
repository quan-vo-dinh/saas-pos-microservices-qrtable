import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import type {
  ConfirmCashTcpRequest,
  CreateVietQrTcpRequest,
  HandleSepayWebhookTcpRequest,
  PaymentHistoryTcpRequest,
  PaymentByIdTcpRequest,
  PaymentSettingsByTenantTcpRequest,
  CreateEmptyPaymentSettingsTcpRequest,
  DisconnectPaymentSettingsTcpRequest,
  GeneratePaymentAuthorizeUrlTcpRequest,
  HandlePaymentOAuthCallbackTcpRequest,
  SelectBankTcpRequest,
} from '@common/interfaces/tcp/payment';
import type {
  GeneratePaymentAuthorizeUrlTcpResponse,
  HandlePaymentOAuthCallbackTcpResponse,
  CreateVietQrTcpResponse,
  PaymentHistoryTcpResponse,
  PaymentRevenueReportResponse,
  PaymentTcpResponse,
  SepayWebhookTcpResponse,
  SelectBankTcpResponse,
  TenantPaymentSettingsTcpResponse,
} from '@common/interfaces/tcp/payment';
import type { PaymentRevenueReportRequest } from '@common/interfaces/tcp/payment';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PaymentReportService } from '../services/payment-report.service';
import { PaymentService } from '../services/payment.service';
import { TenantPaymentSettingsService } from '../services/tenant-payment-settings.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentReportService: PaymentReportService,
    private readonly tenantPaymentSettingsService: TenantPaymentSettingsService,
  ) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR)
  async createVietQr(@RequestParams() body: CreateVietQrTcpRequest): Promise<Response<CreateVietQrTcpResponse>> {
    return Response.success(await this.paymentService.createVietQr(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.CONFIRM_CASH)
  async confirmCash(@RequestParams() body: ConfirmCashTcpRequest): Promise<Response<PaymentTcpResponse>> {
    return Response.success(await this.paymentService.confirmCash(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK)
  async handleSepayWebhook(
    @RequestParams() body: HandleSepayWebhookTcpRequest,
  ): Promise<Response<SepayWebhookTcpResponse>> {
    return Response.success(await this.paymentService.handleSepayWebhook(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY)
  async history(@RequestParams() body: PaymentHistoryTcpRequest): Promise<Response<PaymentHistoryTcpResponse>> {
    return Response.success(await this.paymentService.getHistory(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.GET_STATUS)
  async status(@RequestParams() body: PaymentByIdTcpRequest): Promise<Response<PaymentTcpResponse>> {
    return Response.success(await this.paymentService.getStatus(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE)
  async reportRevenue(
    @RequestParams() body: PaymentRevenueReportRequest,
  ): Promise<Response<PaymentRevenueReportResponse>> {
    return Response.success(await this.paymentReportService.getRevenueReport(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET)
  async getPaymentSettings(
    @RequestParams() body: PaymentSettingsByTenantTcpRequest,
  ): Promise<Response<TenantPaymentSettingsTcpResponse>> {
    return Response.success(await this.tenantPaymentSettingsService.get(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY)
  async createEmptyPaymentSettings(
    @RequestParams() body: CreateEmptyPaymentSettingsTcpRequest,
  ): Promise<Response<TenantPaymentSettingsTcpResponse>> {
    return Response.success(await this.tenantPaymentSettingsService.createEmpty(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GENERATE_AUTHORIZE_URL)
  async generatePaymentAuthorizeUrl(
    @RequestParams() body: GeneratePaymentAuthorizeUrlTcpRequest,
  ): Promise<Response<GeneratePaymentAuthorizeUrlTcpResponse>> {
    return Response.success(await this.tenantPaymentSettingsService.generateAuthorizeUrl(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK)
  async handlePaymentOAuthCallback(
    @RequestParams() body: HandlePaymentOAuthCallbackTcpRequest,
  ): Promise<Response<HandlePaymentOAuthCallbackTcpResponse>> {
    return Response.success(await this.tenantPaymentSettingsService.handleOAuthCallback(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK)
  async selectBank(@RequestParams() body: SelectBankTcpRequest): Promise<Response<SelectBankTcpResponse>> {
    return Response.success(await this.tenantPaymentSettingsService.selectBank(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.DISCONNECT)
  async disconnectPaymentSettings(
    @RequestParams() body: DisconnectPaymentSettingsTcpRequest,
  ): Promise<Response<TenantPaymentSettingsTcpResponse>> {
    return Response.success(await this.tenantPaymentSettingsService.disconnect(body));
  }
}
