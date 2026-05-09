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
  RefundConfirmTcpRequest,
  RefundRequestTcpRequest,
} from '@common/interfaces/tcp/payment';
import type {
  CreateVietQrTcpResponse,
  PaymentHistoryTcpResponse,
  PaymentTcpResponse,
  RefundTcpResponse,
  SepayWebhookTcpResponse,
} from '@common/interfaces/tcp/payment';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { PaymentService } from '../services/payment.service';
import { RefundService } from '../services/refund.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly refundService: RefundService,
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

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.REFUND_REQUEST)
  async requestRefund(@RequestParams() body: RefundRequestTcpRequest): Promise<Response<RefundTcpResponse>> {
    return Response.success(await this.refundService.requestRefund(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.REFUND_CONFIRM)
  async confirmRefund(@RequestParams() body: RefundConfirmTcpRequest): Promise<Response<RefundTcpResponse>> {
    return Response.success(await this.refundService.confirmRefund(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY)
  async history(@RequestParams() body: PaymentHistoryTcpRequest): Promise<Response<PaymentHistoryTcpResponse>> {
    return Response.success(await this.paymentService.getHistory(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.GET_STATUS)
  async status(@RequestParams() body: PaymentByIdTcpRequest): Promise<Response<PaymentTcpResponse>> {
    return Response.success(await this.paymentService.getStatus(body));
  }
}
