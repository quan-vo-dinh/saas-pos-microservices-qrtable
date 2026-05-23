import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ProcessId } from '@common/decorators/processId.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import {
  CartMutateRequestDto,
  CreateCustomerServiceRequestDto,
  CustomerCancelOrderRequestDto,
  SubmitOrderRequestDto,
} from '@common/interfaces/gateway/order';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  BillSessionTcpRequest,
  CartClearTcpRequest,
  CartGetTcpRequest,
  CartMutateTcpRequest,
  CreateServiceRequestTcpRequest,
  CustomerCancelPendingTcpRequest,
  CustomerListOrdersTcpRequest,
  OrderIdTcpRequest,
  SubmitOrderTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type { CreateVietQrTcpRequest, CreateVietQrTcpResponse } from '@common/interfaces/tcp/payment';
import type {
  BillCurrentTcpResponse,
  BillRequestedTcpResponse,
  CartTcpResponse,
  OrderActionTcpResponse,
  OrderTcpResponse,
  ServiceRequestCreatedTcpResponse,
  SubmitOrderTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { BillStatus, type ServiceRequestType } from '@einvoice/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map, timeout } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

@ApiTags('Customer Orders')
@Controller('customer')
@SetMetadata(MetadataKey.SKIP_BFF_SESSION_GUARD, true)
export class CustomerOrderController {
  constructor(
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    @Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
    private readonly realtimeEvents: RealtimeEventsService,
    private readonly configService: ConfigService,
  ) {}

  private paymentTcpTimeoutMs(): number {
    const parsed = Number(this.configService.get<number>('BFF_PAYMENT_CONFIG.PAYMENT_TCP_TIMEOUT_MS') ?? 5000);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5000;
  }

  @Get('cart')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get cart snapshot' })
  async getCart(@ProcessId() processId: string, @Req() req: Request): Promise<ResponseDto<CartTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          CartTcpResponse,
          CartGetTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.CART_GET, buildTcpRequestContext<CartGetTcpRequest>(req, processId, { tenantId, sessionId }))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<CartTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Patch('cart')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Mutate cart' })
  async patchCart(
    @Body() body: CartMutateRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<CartTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const payload: CartMutateTcpRequest = {
      tenantId,
      sessionId,
      expectedCartVersion: body.expectedCartVersion,
      operation: body.operation,
      menuItemId: body.menuItemId,
      cartLineId: body.cartLineId,
      quantity: body.quantity,
      note: body.note,
      sessionClientId: body.sessionClientId,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          CartTcpResponse,
          CartMutateTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.CART_MUTATE, buildTcpRequestContext<CartMutateTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    if (tcp.data) {
      this.realtimeEvents.emitCartUpdated({
        tenantId: tcp.data.tenantId,
        sessionId: tcp.data.sessionId,
        cartVersion: tcp.data.cartVersion,
        status: tcp.data.status,
        items: tcp.data.items,
        updatedAt: tcp.data.updatedAt,
      });
    }
    return new ResponseDto<CartTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Delete('cart')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Clear cart (requires expectedCartVersion query)' })
  async deleteCart(
    @Query('expectedCartVersion', ParseIntPipe) expectedCartVersion: number,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<CartTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<CartTcpResponse, CartClearTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.CART_CLEAR,
          buildTcpRequestContext<CartClearTcpRequest>(req, processId, {
            tenantId,
            sessionId,
            expectedCartVersion,
          }),
        )
        .pipe(map((r) => r)),
    );
    if (tcp.data) {
      this.realtimeEvents.emitCartUpdated({
        tenantId: tcp.data.tenantId,
        sessionId: tcp.data.sessionId,
        cartVersion: tcp.data.cartVersion,
        status: tcp.data.status,
        items: tcp.data.items,
        updatedAt: tcp.data.updatedAt,
      });
    }
    return new ResponseDto<CartTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('orders')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Submit order from cart' })
  async submitOrder(
    @Body() body: SubmitOrderRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<SubmitOrderTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const payload: SubmitOrderTcpRequest = {
      tenantId,
      sessionId,
      expectedCartVersion: body.expectedCartVersion,
      idempotencyKey: body.idempotencyKey,
      notes: body.notes,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          SubmitOrderTcpResponse,
          SubmitOrderTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.SUBMIT, buildTcpRequestContext<SubmitOrderTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    if (tcp.data?.events) {
      this.realtimeEvents.emitCartUpdated(tcp.data.events.cartUpdated);
      this.realtimeEvents.emitOrderCreated(tcp.data.events.orderCreated);
    }
    return new ResponseDto<SubmitOrderTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Get('orders')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List orders for current customer table session' })
  async listOrders(@ProcessId() processId: string, @Req() req: Request): Promise<ResponseDto<OrderTcpResponse[]>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<OrderTcpResponse[], CustomerListOrdersTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.GET_SESSION_LIST,
          buildTcpRequestContext<CustomerListOrdersTcpRequest>(req, processId, {
            tenantId,
            sessionId,
          }),
        )
        .pipe(map((r) => r)),
    );
    return new ResponseDto<OrderTcpResponse[]>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Get('orders/:id')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get order detail (session must own order)' })
  async getOrder(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<OrderTcpResponse, OrderIdTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.GET_BY_ID,
          buildTcpRequestContext<OrderIdTcpRequest>(req, processId, {
            tenantId,
            orderId: id,
            sessionId,
          }),
        )
        .pipe(map((r) => r)),
    );
    return new ResponseDto<OrderTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Delete('orders/:id')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Cancel pending order (customer)' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: CustomerCancelOrderRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderActionTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const payload: CustomerCancelPendingTcpRequest = {
      tenantId,
      sessionId,
      orderId: id,
      reason: body.reason,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          OrderActionTcpResponse,
          CustomerCancelPendingTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.CUSTOMER_CANCEL_PENDING, buildTcpRequestContext<CustomerCancelPendingTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    if (tcp.data?.events?.orderStatusChanged && tcp.data.order) {
      this.realtimeEvents.emitOrderStatusChanged(tcp.data.events.orderStatusChanged, tcp.data.order.sessionId);
    }
    return new ResponseDto<OrderActionTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('service-requests')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Create service request' })
  async createServiceRequest(
    @Body() body: CreateCustomerServiceRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<ServiceRequestCreatedTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const payload: CreateServiceRequestTcpRequest = {
      tenantId,
      sessionId,
      type: body.type as ServiceRequestType,
      note: body.note,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          ServiceRequestCreatedTcpResponse,
          CreateServiceRequestTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_CREATE, buildTcpRequestContext<CreateServiceRequestTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    if (tcp.data?.events?.serviceRequested) {
      this.realtimeEvents.emitServiceRequested(tcp.data.events.serviceRequested);
    }
    return new ResponseDto<ServiceRequestCreatedTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('bill/request')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Request bill (cart must be empty, orders served)' })
  async requestBill(
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<BillRequestedTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const payload: BillSessionTcpRequest = { tenantId, sessionId };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          BillRequestedTcpResponse,
          BillSessionTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_REQUEST, buildTcpRequestContext<BillSessionTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    if (tcp.data?.events) {
      if (tcp.data.events.cartUpdated) {
        this.realtimeEvents.emitCartUpdated(tcp.data.events.cartUpdated);
      }
      if (tcp.data.events.billRequested) {
        this.realtimeEvents.emitBillRequested(tcp.data.events.billRequested);
      }
      if (tcp.data.events.serviceRequested) {
        this.realtimeEvents.emitServiceRequested(tcp.data.events.serviceRequested);
      }
    }
    return new ResponseDto<BillRequestedTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Get('bill/current')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get current bill and cart for session' })
  async getCurrentBill(
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<BillCurrentTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          BillCurrentTcpResponse,
          BillSessionTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT, buildTcpRequestContext<BillSessionTcpRequest>(req, processId, { tenantId, sessionId }))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<BillCurrentTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('payment/vietqr/create-qr')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Create or reuse VietQR for current session bill' })
  async createCustomerVietQr(
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<CreateVietQrTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const sessionId = req[MetadataKey.SESSION_ID] as string;
    const currentBill = await firstValueFrom(
      this.orderClient
        .send<
          BillCurrentTcpResponse,
          BillSessionTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT, buildTcpRequestContext<BillSessionTcpRequest>(req, processId, { tenantId, sessionId }))
        .pipe(map((r) => r)),
    );
    const bill = currentBill.data?.bill;
    if (!bill || bill.status !== BillStatus.PENDING_PAYMENT) {
      throw new BusinessException(ErrorCode.PAYMENT_BILL_NOT_PENDING_PAYMENT, HttpStatus.CONFLICT);
    }
    if (bill.sessionId !== sessionId) {
      throw new BusinessException(ErrorCode.BILL_SESSION_MISMATCH, HttpStatus.CONFLICT);
    }

    const payload: CreateVietQrTcpRequest = {
      tenantId,
      billId: bill.id,
      userId: `customer-session:${sessionId}`,
      processId,
    };
    const tcp = await firstValueFrom(
      this.paymentClient
        .send<
          CreateVietQrTcpResponse,
          CreateVietQrTcpRequest
        >(TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR, buildTcpRequestContext<CreateVietQrTcpRequest>(req, processId, payload))
        .pipe(
          timeout({ first: this.paymentTcpTimeoutMs() }),
          map((r) => r),
        ),
    );
    return new ResponseDto<CreateVietQrTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }
}
