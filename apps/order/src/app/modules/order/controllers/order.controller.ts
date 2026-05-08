import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import type {
  BillMarkPaidTcpRequest,
  BillPaymentSnapshotTcpRequest,
  BillSessionTcpRequest,
  CartClearTcpRequest,
  CartGetTcpRequest,
  CartMutateTcpRequest,
  CreateServiceRequestTcpRequest,
  CustomerCancelPendingTcpRequest,
  CustomerListOrdersTcpRequest,
  JoinSessionTcpRequest,
  KdsActiveOrdersGetTcpRequest,
  ListOrdersTcpRequest,
  ListServiceRequestsTcpRequest,
  MarkOrderItemsReadyTcpRequest,
  OrderIdTcpRequest,
  RevertOrderItemsProcessingTcpRequest,
  ServiceRequestActionTcpRequest,
  StaffOrderActionTcpRequest,
  SubmitOrderTcpRequest,
  TransferTableTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillCurrentTcpResponse,
  BillMarkedPaidTcpResponse,
  BillPaymentSnapshotTcpResponse,
  BillRequestedTcpResponse,
  CartTcpResponse,
  KdsActiveOrdersGetTcpResponse,
  MarkOrderItemsReadyTcpResponse,
  OrderActionTcpResponse,
  OrderTcpResponse,
  RevertOrderItemsProcessingTcpResponse,
  ServiceRequestCreatedTcpResponse,
  ServiceRequestListTcpResponse,
  SessionTcpResponse,
  SubmitOrderTcpResponse,
  TableTransferredTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BillService } from '../services/bill.service';
import { CartService } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { ServiceRequestService } from '../services/service-request.service';
import { TransferService } from '../services/transfer.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly billService: BillService,
    private readonly cartService: CartService,
    private readonly serviceRequestService: ServiceRequestService,
    private readonly transferService: TransferService,
  ) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SESSION_JOIN)
  async sessionJoin(@RequestParams() body: JoinSessionTcpRequest): Promise<Response<SessionTcpResponse>> {
    const data = await this.orderService.joinSession(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CART_GET)
  async cartGet(@RequestParams() body: CartGetTcpRequest): Promise<Response<CartTcpResponse>> {
    const data = await this.cartService.getSnapshot(body.tenantId, body.sessionId);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CART_MUTATE)
  async cartMutate(@RequestParams() body: CartMutateTcpRequest): Promise<Response<CartTcpResponse>> {
    const ev = await this.cartService.mutate(body);
    return Response.success({
      tenantId: ev.tenantId,
      sessionId: ev.sessionId,
      cartVersion: ev.cartVersion,
      status: ev.status,
      updatedAt: ev.updatedAt,
      items: ev.items,
    });
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CART_CLEAR)
  async cartClear(@RequestParams() body: CartClearTcpRequest): Promise<Response<CartTcpResponse>> {
    const ev = await this.cartService.mutate({
      tenantId: body.tenantId,
      sessionId: body.sessionId,
      expectedCartVersion: body.expectedCartVersion,
      operation: 'CLEAR',
    });
    return Response.success({
      tenantId: ev.tenantId,
      sessionId: ev.sessionId,
      cartVersion: ev.cartVersion,
      status: ev.status,
      updatedAt: ev.updatedAt,
      items: ev.items,
    });
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.GET_LIST)
  async getList(@RequestParams() body: ListOrdersTcpRequest): Promise<Response<OrderTcpResponse[]>> {
    const data = await this.orderService.listOrdersForStaff(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.GET_SESSION_LIST)
  async getSessionList(@RequestParams() body: CustomerListOrdersTcpRequest): Promise<Response<OrderTcpResponse[]>> {
    const data = await this.orderService.listOrdersForCustomerSession(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.GET_BY_ID)
  async getById(@RequestParams() body: OrderIdTcpRequest): Promise<Response<OrderTcpResponse>> {
    const data = await this.orderService.getOrderById(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT)
  async billGetCurrent(@RequestParams() body: BillSessionTcpRequest): Promise<Response<BillCurrentTcpResponse>> {
    const data = await this.billService.getCurrentBill(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT)
  async billGetPaymentSnapshot(
    @RequestParams() body: BillPaymentSnapshotTcpRequest,
  ): Promise<Response<BillPaymentSnapshotTcpResponse>> {
    const data = await this.billService.getPaymentSnapshot(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID)
  async billMarkPaid(@RequestParams() body: BillMarkPaidTcpRequest): Promise<Response<BillMarkedPaidTcpResponse>> {
    const data = await this.billService.markPaid(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SUBMIT)
  async submit(@RequestParams() body: SubmitOrderTcpRequest): Promise<Response<SubmitOrderTcpResponse>> {
    const data = await this.orderService.submitOrder(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CONFIRM)
  async confirm(@RequestParams() body: StaffOrderActionTcpRequest): Promise<Response<OrderActionTcpResponse>> {
    const data = await this.orderService.confirmOrder(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CANCEL_PENDING)
  async cancelPending(@RequestParams() body: StaffOrderActionTcpRequest): Promise<Response<OrderActionTcpResponse>> {
    const data = await this.orderService.cancelPendingStaff(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CUSTOMER_CANCEL_PENDING)
  async customerCancelPending(
    @RequestParams() body: CustomerCancelPendingTcpRequest,
  ): Promise<Response<OrderActionTcpResponse>> {
    const data = await this.orderService.customerCancelPending(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.CANCEL_PROCESSING)
  async cancelProcessing(@RequestParams() body: StaffOrderActionTcpRequest): Promise<Response<OrderActionTcpResponse>> {
    const data = await this.orderService.cancelProcessing(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.MARK_SERVED)
  async markServed(@RequestParams() body: StaffOrderActionTcpRequest): Promise<Response<OrderActionTcpResponse>> {
    const data = await this.orderService.markOrderServed(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_CREATE)
  async serviceRequestCreate(
    @RequestParams() body: CreateServiceRequestTcpRequest,
  ): Promise<Response<ServiceRequestCreatedTcpResponse>> {
    const data = await this.serviceRequestService.create(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_GET_LIST)
  async serviceRequestGetList(
    @RequestParams() body: ListServiceRequestsTcpRequest,
  ): Promise<Response<ServiceRequestListTcpResponse>> {
    const data = await this.serviceRequestService.list(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_ACKNOWLEDGE)
  async serviceRequestAck(
    @RequestParams() body: ServiceRequestActionTcpRequest,
  ): Promise<Response<ServiceRequestCreatedTcpResponse>> {
    const data = await this.serviceRequestService.acknowledge(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_RESOLVE)
  async serviceRequestResolve(
    @RequestParams() body: ServiceRequestActionTcpRequest,
  ): Promise<Response<ServiceRequestCreatedTcpResponse>> {
    const data = await this.serviceRequestService.resolve(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.BILL_REQUEST)
  async billRequest(@RequestParams() body: BillSessionTcpRequest): Promise<Response<BillRequestedTcpResponse>> {
    const data = await this.billService.requestBill(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.BILL_REOPEN)
  async billReopen(@RequestParams() body: BillSessionTcpRequest): Promise<Response<BillRequestedTcpResponse>> {
    const data = await this.billService.reopenBill(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.TABLE_TRANSFER)
  async tableTransfer(@RequestParams() body: TransferTableTcpRequest): Promise<Response<TableTransferredTcpResponse>> {
    const data = await this.transferService.transferTable(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.KDS_ACTIVE_ORDERS_GET)
  async kdsActiveOrdersGet(
    @RequestParams() body: KdsActiveOrdersGetTcpRequest,
  ): Promise<Response<KdsActiveOrdersGetTcpResponse>> {
    const data = await this.orderService.getKdsActiveOrderSnapshots(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.MARK_ITEMS_READY)
  async markItemsReady(
    @RequestParams() body: MarkOrderItemsReadyTcpRequest,
  ): Promise<Response<MarkOrderItemsReadyTcpResponse>> {
    const data = await this.orderService.markOrderItemsReady(body);
    return Response.success(data);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.REVERT_ITEMS_PROCESSING)
  async revertItemsProcessing(
    @RequestParams() body: RevertOrderItemsProcessingTcpRequest,
  ): Promise<Response<RevertOrderItemsProcessingTcpResponse>> {
    const data = await this.orderService.revertOrderItemsProcessing(body);
    return Response.success(data);
  }
}
