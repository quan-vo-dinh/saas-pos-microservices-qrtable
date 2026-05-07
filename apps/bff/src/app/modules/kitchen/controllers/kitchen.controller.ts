import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import {
  KdsQueueQueryDto,
  KdsRecallTicketRequestDto,
  KdsSetPriorityRequestDto,
  KdsTicketActionRequestDto,
} from '@common/interfaces/gateway/kitchen';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import type {
  KdsGetQueueTcpRequest,
  KdsRecallTicketTcpRequest,
  KdsSetPriorityTcpRequest,
  KdsTicketActionTcpRequest,
} from '@common/interfaces/tcp/kitchen';
import type {
  KdsMutationTcpResponse,
  KdsQueueTcpResponse,
} from '@common/interfaces/tcp/kitchen/kitchen-response.interface';
import type { MarkOrderItemsReadyTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { MarkOrderItemsReadyTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { buildTcpRequestContext } from '@common/utils/request.util';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreparationStation } from '@einvoice/types';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { KdsStationAccessService } from '../services/kds-station-access.service';

@ApiTags('Kitchen / KDS (Admin)')
@Controller('admin/kds')
export class KitchenController {
  private readonly logger = new Logger(KitchenController.name);

  constructor(
    @Inject(TCP_SERVICES.KITCHEN_SERVICE) private readonly kitchenClient: TcpClient,
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    private readonly stationAccess: KdsStationAccessService,
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  private staffUserId(req: Request): string {
    const u = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const id = u?.metadata?.userId;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get('queue')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.KITCHEN_GET_QUEUE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'KDS queue snapshot for station' })
  async getQueue(
    @Query() query: KdsQueueQueryDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<KdsQueueTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const user = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    this.stationAccess.assertCanAccessStation(user, query.station);

    const payload: KdsGetQueueTcpRequest = { tenantId, station: query.station };
    const tcp = await firstValueFrom(
      this.kitchenClient
        .send<
          KdsQueueTcpResponse,
          KdsGetQueueTcpRequest
        >(TCP_REQUEST_MESSAGE.KITCHEN.GET_QUEUE, buildTcpRequestContext<KdsGetQueueTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );

    return new ResponseDto<KdsQueueTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('tickets/:ticketId/start')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.KITCHEN_UPDATE_TICKET])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Start ticket (PROCESSING)' })
  async startTicket(
    @Param('ticketId') ticketId: string,
    @Query('station', new ParseEnumPipe(PreparationStation)) station: PreparationStation,
    @Body() body: KdsTicketActionRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<KdsMutationTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const user = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    this.stationAccess.assertCanAccessStation(user, station);

    const payload: KdsTicketActionTcpRequest = {
      tenantId,
      ticketId,
      station,
      userId,
      requestId: body.requestId,
      correlationId: processId,
    };

    const tcp = await firstValueFrom(
      this.kitchenClient
        .send<
          KdsMutationTcpResponse,
          KdsTicketActionTcpRequest
        >(TCP_REQUEST_MESSAGE.KITCHEN.START_TICKET, buildTcpRequestContext<KdsTicketActionTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );

    return new ResponseDto<KdsMutationTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('tickets/:ticketId/done')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.KITCHEN_UPDATE_TICKET])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Mark ticket ready and sync order items' })
  async markDone(
    @Param('ticketId') ticketId: string,
    @Query('station', new ParseEnumPipe(PreparationStation)) station: PreparationStation,
    @Body() body: KdsTicketActionRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<KdsMutationTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const user = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    this.stationAccess.assertCanAccessStation(user, station);

    const markReadyPayload: KdsTicketActionTcpRequest = {
      tenantId,
      ticketId,
      station,
      userId,
      requestId: body.requestId,
      correlationId: processId,
    };

    const kitchenTcp = await firstValueFrom(
      this.kitchenClient
        .send<
          KdsMutationTcpResponse,
          KdsTicketActionTcpRequest
        >(TCP_REQUEST_MESSAGE.KITCHEN.MARK_READY, buildTcpRequestContext<KdsTicketActionTcpRequest>(req, processId, markReadyPayload))
        .pipe(map((r) => r)),
    );

    if (kitchenTcp.statusCode !== HttpStatus.OK || !kitchenTcp.data?.ticket) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_GATEWAY);
    }

    const ticket = kitchenTcp.data.ticket;
    const orderItemIds = ticket.items.map((i) => i.orderItemId);

    const markOrderPayload: MarkOrderItemsReadyTcpRequest = {
      tenantId,
      orderId: ticket.orderId,
      ticketId: ticket.ticketId,
      station,
      orderItemIds,
      userId,
      requestId: body.requestId,
      correlationId: processId,
    };

    let compensated = false;
    try {
      const orderTcp = await firstValueFrom(
        this.orderClient
          .send<
            MarkOrderItemsReadyTcpResponse,
            MarkOrderItemsReadyTcpRequest
          >(TCP_REQUEST_MESSAGE.ORDER.MARK_ITEMS_READY, buildTcpRequestContext<MarkOrderItemsReadyTcpRequest>(req, processId, markOrderPayload))
          .pipe(map((r) => r)),
      );

      if (orderTcp.statusCode !== HttpStatus.OK || !orderTcp.data) {
        await this.compensateRecallAfterOrderFailure(req, processId, {
          tenantId,
          ticketId,
          station,
          userId,
          requestId: body.requestId,
        });
        compensated = true;
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_GATEWAY);
      }

      this.realtimeEvents.emitKitchenItemReady(orderTcp.data.kitchenItemReady);
      if (orderTcp.data.orderStatusChanged) {
        this.realtimeEvents.emitOrderStatusChanged(orderTcp.data.orderStatusChanged, ticket.sessionId);
      }

      return new ResponseDto<KdsMutationTcpResponse>({
        data: kitchenTcp.data,
        statusCode: kitchenTcp.statusCode,
        message: kitchenTcp.code as HTTP_MESSAGE,
        processID: processId,
      });
    } catch (err) {
      if (!compensated) {
        await this.compensateRecallAfterOrderFailure(req, processId, {
          tenantId,
          ticketId,
          station,
          userId,
          requestId: body.requestId,
        });
      }
      throw err;
    }
  }

  private async compensateRecallAfterOrderFailure(
    req: Request,
    processId: string,
    ctx: { tenantId: string; ticketId: string; station: PreparationStation; userId: string; requestId: string },
  ): Promise<void> {
    const recallPayload: KdsRecallTicketTcpRequest = {
      tenantId: ctx.tenantId,
      ticketId: ctx.ticketId,
      station: ctx.station,
      userId: ctx.userId,
      requestId: `${ctx.requestId}:compensation`,
      reason: 'KITCHEN_COMPENSATION',
      correlationId: processId,
    };

    try {
      await firstValueFrom(
        this.kitchenClient
          .send<
            KdsMutationTcpResponse,
            KdsRecallTicketTcpRequest
          >(TCP_REQUEST_MESSAGE.KITCHEN.RECALL_TICKET, buildTcpRequestContext<KdsRecallTicketTcpRequest>(req, processId, recallPayload))
          .pipe(map((r) => r)),
      );
    } catch (e) {
      this.logger.error(
        { processId, err: e },
        'Kitchen RECALL_TICKET compensation failed after Order MARK_ITEMS_READY failure',
      );
    }
  }

  @Post('tickets/:ticketId/recall')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.KITCHEN_RECALL])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Recall ticket within window' })
  async recallTicket(
    @Param('ticketId') ticketId: string,
    @Query('station', new ParseEnumPipe(PreparationStation)) station: PreparationStation,
    @Body() body: KdsRecallTicketRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<KdsMutationTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const user = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    this.stationAccess.assertCanAccessStation(user, station);

    const payload: KdsRecallTicketTcpRequest = {
      tenantId,
      ticketId,
      station,
      userId,
      requestId: body.requestId,
      reason: body.reason,
      correlationId: processId,
    };

    const tcp = await firstValueFrom(
      this.kitchenClient
        .send<
          KdsMutationTcpResponse,
          KdsRecallTicketTcpRequest
        >(TCP_REQUEST_MESSAGE.KITCHEN.RECALL_TICKET, buildTcpRequestContext<KdsRecallTicketTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );

    return new ResponseDto<KdsMutationTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('tickets/:ticketId/priority')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.KITCHEN_SET_PRIORITY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Toggle ticket priority in queue' })
  async setPriority(
    @Param('ticketId') ticketId: string,
    @Query('station', new ParseEnumPipe(PreparationStation)) station: PreparationStation,
    @Body() body: KdsSetPriorityRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<KdsMutationTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const user = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    this.stationAccess.assertCanAccessStation(user, station);

    const payload: KdsSetPriorityTcpRequest = {
      tenantId,
      ticketId,
      station,
      userId,
      requestId: body.requestId,
      priority: body.priority,
      correlationId: processId,
    };

    const tcp = await firstValueFrom(
      this.kitchenClient
        .send<
          KdsMutationTcpResponse,
          KdsSetPriorityTcpRequest
        >(TCP_REQUEST_MESSAGE.KITCHEN.SET_PRIORITY, buildTcpRequestContext<KdsSetPriorityTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );

    return new ResponseDto<KdsMutationTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }
}
