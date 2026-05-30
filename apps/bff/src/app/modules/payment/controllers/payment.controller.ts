import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { RawResponse } from '@common/decorators/raw-response.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import {
  ConfirmCashRequestDto,
  CreateVietQrRequestDto,
  SepayWebhookRequestDto,
} from '@common/interfaces/gateway/payment';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import type { RequestType } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import type {
  ConfirmCashTcpRequest,
  CreateVietQrTcpRequest,
  HandleSepayWebhookTcpRequest,
  PaymentHistoryTcpRequest,
} from '@common/interfaces/tcp/payment';
import type {
  CreateVietQrTcpResponse,
  PaymentHistoryTcpResponse,
  PaymentTcpResponse,
  SepayWebhookTcpResponse,
} from '@common/interfaces/tcp/payment';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, HttpStatus, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map, timeout } from 'rxjs';
import { SepayWebhookSecretGuard } from '../guards/sepay-webhook-secret.guard';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    @Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
    private readonly configService: ConfigService,
  ) {}

  private userId(req: Request): string {
    const u = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const id = u?.metadata?.userId;
    if (!id) {
      throw new BusinessException(ErrorCode.USER_ID_REQUIRED, HttpStatus.UNAUTHORIZED);
    }
    return id;
  }

  private paymentTcpTimeoutMs(): number {
    const parsed = Number(this.configService.get<number>('BFF_PAYMENT_CONFIG.PAYMENT_TCP_TIMEOUT_MS') ?? 5000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
  }

  private sendPaymentTcp<TResponse, TRequest>(
    pattern: unknown,
    request: RequestType<TRequest>,
  ): Promise<ResponseType<TResponse>> {
    return firstValueFrom(
      this.paymentClient.send<TResponse, TRequest>(pattern, request).pipe(
        timeout({ first: this.paymentTcpTimeoutMs() }),
        map((r) => r),
      ),
    );
  }

  @Post('vietqr/create-qr')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.PAYMENT_CREATE])
  @ApiOperation({ summary: 'Create or reuse VietQR payment QR' })
  async createVietQr(
    @Body() dto: CreateVietQrRequestDto,
    @Req() req: Request,
    @ProcessId() processId: string,
  ): Promise<ResponseDto<CreateVietQrTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: CreateVietQrTcpRequest = { tenantId, billId: dto.billId, userId: this.userId(req), processId };
    const tcp = await this.sendPaymentTcp<CreateVietQrTcpResponse, CreateVietQrTcpRequest>(
      TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR,
      buildTcpRequestContext(req, processId, payload),
    );
    return new ResponseDto<CreateVietQrTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('cash/confirm')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.PAYMENT_CONFIRM_CASH])
  @ApiOperation({ summary: 'Confirm cash payment' })
  async confirmCash(
    @Body() dto: ConfirmCashRequestDto,
    @Req() req: Request,
    @ProcessId() processId: string,
  ): Promise<ResponseDto<PaymentTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: ConfirmCashTcpRequest = {
      tenantId,
      billId: dto.billId,
      amountReceived: dto.amountReceived,
      userId: this.userId(req),
      processId,
    };
    const tcp = await this.sendPaymentTcp<PaymentTcpResponse, ConfirmCashTcpRequest>(
      TCP_REQUEST_MESSAGE.PAYMENT.CONFIRM_CASH,
      buildTcpRequestContext(req, processId, payload),
    );
    return new ResponseDto<PaymentTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('sepay/webhook')
  @Authorization({ secured: false })
  @UseGuards(SepayWebhookSecretGuard)
  @RawResponse()
  @ApiOperation({ summary: 'SePay bank transfer webhook' })
  async sepayWebhook(
    @Body() payload: SepayWebhookRequestDto,
    @ProcessId() processId: string,
  ): Promise<{ success: true }> {
    const tcpData: HandleSepayWebhookTcpRequest = { payload, processId };
    await this.sendPaymentTcp<SepayWebhookTcpResponse, HandleSepayWebhookTcpRequest>(
      TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK,
      { data: tcpData, processId },
    );
    return { success: true };
  }

  @Get('history')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.PAYMENT_GET_HISTORY])
  @ApiOperation({ summary: 'Payment history' })
  async history(
    @Req() req: Request,
    @ProcessId() processId: string,
    @Query('billId') billId?: string,
  ): Promise<ResponseDto<PaymentHistoryTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: PaymentHistoryTcpRequest = { tenantId, billId };
    const tcp = await this.sendPaymentTcp<PaymentHistoryTcpResponse, PaymentHistoryTcpRequest>(
      TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY,
      buildTcpRequestContext(req, processId, payload),
    );
    return new ResponseDto<PaymentHistoryTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }
}
