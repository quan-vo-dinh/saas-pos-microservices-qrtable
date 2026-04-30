import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import type {
  BillSessionTcpRequest,
  CreateServiceRequestTcpRequest,
  CustomerCancelPendingTcpRequest,
  ServiceRequestActionTcpRequest,
  StaffOrderActionTcpRequest,
  SubmitOrderTcpRequest,
  TransferTableTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillRequestedTcpResponse,
  OrderActionTcpResponse,
  ServiceRequestCreatedTcpResponse,
  SubmitOrderTcpResponse,
  TableTransferredTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { BillService } from '../services/bill.service';
import { OrderService } from '../services/order.service';
import { ServiceRequestService } from '../services/service-request.service';
import { TransferService } from '../services/transfer.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly billService: BillService,
    private readonly serviceRequestService: ServiceRequestService,
    private readonly transferService: TransferService,
  ) {}

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

  @MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_CREATE)
  async serviceRequestCreate(
    @RequestParams() body: CreateServiceRequestTcpRequest,
  ): Promise<Response<ServiceRequestCreatedTcpResponse>> {
    const data = await this.serviceRequestService.create(body);
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
}
