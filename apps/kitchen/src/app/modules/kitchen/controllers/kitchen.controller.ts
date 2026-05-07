import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import type {
  KdsGetQueueTcpRequest,
  KdsMutationTcpResponse,
  KdsPatchTableSnapshotTcpRequest,
  KdsQueueTcpResponse,
  KdsRecallTicketTcpRequest,
  KdsRebuildTenantTcpRequest,
  KdsRebuildTenantTcpResponse,
  KdsSetPriorityTcpRequest,
  KdsTicketActionTcpRequest,
  KdsVoidByOrderTcpRequest,
} from '@common/interfaces/tcp/kitchen';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { KdsTicketService } from '../services/kds-ticket.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class KitchenController {
  constructor(private readonly ticketService: KdsTicketService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.GET_QUEUE)
  async getQueue(@RequestParams() body: KdsGetQueueTcpRequest): Promise<Response<KdsQueueTcpResponse>> {
    return Response.success(await this.ticketService.getQueue(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.START_TICKET)
  async startTicket(@RequestParams() body: KdsTicketActionTcpRequest): Promise<Response<KdsMutationTcpResponse>> {
    return Response.success(await this.ticketService.startTicket(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.MARK_READY)
  async markReady(@RequestParams() body: KdsTicketActionTcpRequest): Promise<Response<KdsMutationTcpResponse>> {
    return Response.success(await this.ticketService.markReady(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.RECALL_TICKET)
  async recallTicket(@RequestParams() body: KdsRecallTicketTcpRequest): Promise<Response<KdsMutationTcpResponse>> {
    return Response.success(await this.ticketService.recallTicket(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.SET_PRIORITY)
  async setPriority(@RequestParams() body: KdsSetPriorityTcpRequest): Promise<Response<KdsMutationTcpResponse>> {
    return Response.success(await this.ticketService.setPriority(body));
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.VOID_BY_ORDER)
  async voidByOrder(@RequestParams() body: KdsVoidByOrderTcpRequest): Promise<Response<boolean>> {
    await this.ticketService.voidByOrder(body);
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.PATCH_TABLE_SNAPSHOT)
  async patchTableSnapshot(@RequestParams() body: KdsPatchTableSnapshotTcpRequest): Promise<Response<boolean>> {
    await this.ticketService.patchTableSnapshot(body);
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KITCHEN.REBUILD_TENANT)
  async rebuildTenant(
    @RequestParams() body: KdsRebuildTenantTcpRequest,
  ): Promise<Response<KdsRebuildTenantTcpResponse>> {
    return Response.success({
      tenantId: body.tenantId,
      station: body.station,
      rebuiltTickets: 0,
      revision: 0,
    });
  }
}
