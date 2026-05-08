import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import {
  ConfirmCashRequestDto,
  CreateVietQrRequestDto,
  RefundConfirmRequestDto,
  RefundRequestDto,
} from '@common/interfaces/gateway/payment';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import type {
  ConfirmCashTcpRequest,
  CreateVietQrTcpRequest,
  HandleSepayWebhookTcpRequest,
  PaymentHistoryTcpRequest,
  RefundConfirmTcpRequest,
  RefundRequestTcpRequest,
  SepayWebhookPayload,
} from '@common/interfaces/tcp/payment';
import type {
  CreateVietQrTcpResponse,
  PaymentHistoryTcpResponse,
  PaymentTcpResponse,
  RefundTcpResponse,
  SepayWebhookTcpResponse,
} from '@common/interfaces/tcp/payment';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, Headers, Inject, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';
import { assertSepayWebhookSecret } from '../verify-sepay-webhook-secret';

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
    if (!id) throw new UnauthorizedException();
    return id;
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
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          CreateVietQrTcpResponse,
          CreateVietQrTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR, buildTcpRequestContext(req, processId, payload))
        .pipe(map((r) => r)),
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
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          PaymentTcpResponse,
          ConfirmCashTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.CONFIRM_CASH, buildTcpRequestContext(req, processId, payload))
        .pipe(map((r) => r)),
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
  @ApiOperation({ summary: 'SePay bank transfer webhook' })
  async sepayWebhook(
    @Headers('x-secret-key') secretKey: string | undefined,
    @Body() payload: SepayWebhookPayload,
    @ProcessId() processId: string,
  ): Promise<ResponseDto<SepayWebhookTcpResponse>> {
    const expected =
      this.configService.get<string>('SEPAY_WEBHOOK_SECRET') || process.env['SEPAY_WEBHOOK_SECRET'] || '';
    assertSepayWebhookSecret(secretKey, expected);
    const tcpData: HandleSepayWebhookTcpRequest = { payload, processId };
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          SepayWebhookTcpResponse,
          HandleSepayWebhookTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK, { data: tcpData, processId })
        .pipe(map((r) => r)),
    );
    return new ResponseDto<SepayWebhookTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('refund/request')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.PAYMENT_REFUND])
  @ApiOperation({ summary: 'Request refund' })
  async requestRefund(
    @Body() dto: RefundRequestDto,
    @Req() req: Request,
    @ProcessId() processId: string,
  ): Promise<ResponseDto<RefundTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: RefundRequestTcpRequest = { tenantId, userId: this.userId(req), processId, ...dto };
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          RefundTcpResponse,
          RefundRequestTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.REFUND_REQUEST, buildTcpRequestContext(req, processId, payload))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<RefundTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('refund/confirm')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.PAYMENT_REFUND])
  @ApiOperation({ summary: 'Confirm refund' })
  async confirmRefund(
    @Body() dto: RefundConfirmRequestDto,
    @Req() req: Request,
    @ProcessId() processId: string,
  ): Promise<ResponseDto<RefundTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: RefundConfirmTcpRequest = { tenantId, refundId: dto.refundId, userId: this.userId(req), processId };
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          RefundTcpResponse,
          RefundConfirmTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.REFUND_CONFIRM, buildTcpRequestContext(req, processId, payload))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<RefundTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
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
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          PaymentHistoryTcpResponse,
          PaymentHistoryTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY, buildTcpRequestContext(req, processId, payload))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<PaymentHistoryTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }
}
