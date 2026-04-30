import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import type {
  StaffOrderActionTcpRequest,
  SubmitOrderTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  OrderActionTcpResponse,
  SubmitOrderTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { OrderService } from '../services/order.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

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
}
