import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import {
  CancelProcessingRequestDto,
  StaffCancelPendingRequestDto,
  TransferTableRequestDto,
} from '@common/interfaces/gateway/order';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import type {
  BillSessionTcpRequest,
  ListBillsTcpRequest,
  ListOrdersTcpRequest,
  ListServiceRequestsTcpRequest,
  OrderIdTcpRequest,
  ServiceRequestActionTcpRequest,
  StaffOrderActionTcpRequest,
  TransferTableTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillListTcpResponse,
  BillRequestedTcpResponse,
  OrderActionTcpResponse,
  OrderTcpResponse,
  ServiceRequestCreatedTcpResponse,
  ServiceRequestListTcpResponse,
  TableTransferredTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import type { KdsPatchTableSnapshotTcpRequest, KdsVoidByOrderTcpRequest } from '@common/interfaces/tcp/kitchen';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, Inject, Logger, Param, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

@ApiTags('Orders (Admin)')
@Controller('admin')
export class StaffOrderController {
  private readonly logger = new Logger(StaffOrderController.name);

  constructor(
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    @Inject(TCP_SERVICES.KITCHEN_SERVICE) private readonly kitchenClient: TcpClient,
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

  @Get('orders')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.ORDER_GET_LIST])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List orders' })
  async listOrders(
    @ProcessId() processId: string,
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('tableId') tableId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ResponseDto<OrderTcpResponse[]>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: ListOrdersTcpRequest = {
      tenantId,
      status,
      tableId,
      limit: limit !== undefined ? Number.parseInt(limit, 10) : undefined,
      offset: offset !== undefined ? Number.parseInt(offset, 10) : undefined,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          OrderTcpResponse[],
          ListOrdersTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.GET_LIST, buildTcpRequestContext<ListOrdersTcpRequest>(req, processId, payload))
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
  @Authorization({ secured: true })
  @Permissions([PERMISSION.ORDER_GET_BY_ID])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Get order by id' })
  async getOrder(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          OrderTcpResponse,
          OrderIdTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.GET_BY_ID, buildTcpRequestContext<OrderIdTcpRequest>(req, processId, { tenantId, orderId: id }))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<OrderTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Get('bills')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.PAYMENT_GET_HISTORY])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List bills for POS settlement' })
  async listBills(
    @ProcessId() processId: string,
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ResponseDto<BillListTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: ListBillsTcpRequest = {
      tenantId,
      status,
      limit: limit !== undefined ? Number.parseInt(limit, 10) : undefined,
      offset: offset !== undefined ? Number.parseInt(offset, 10) : undefined,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          BillListTcpResponse,
          ListBillsTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_LIST, buildTcpRequestContext<ListBillsTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<BillListTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('orders/:id/confirm')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.ORDER_CONFIRM])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Confirm pending order' })
  async confirm(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderActionTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<OrderActionTcpResponse, StaffOrderActionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.CONFIRM,
          buildTcpRequestContext<StaffOrderActionTcpRequest>(req, processId, {
            tenantId,
            orderId: id,
            userId,
            processId,
          }),
        )
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

  @Post('orders/:id/serve')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.ORDER_CONFIRM])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Mark ready order as served' })
  async serve(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderActionTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<OrderActionTcpResponse, StaffOrderActionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.MARK_SERVED,
          buildTcpRequestContext<StaffOrderActionTcpRequest>(req, processId, {
            tenantId,
            orderId: id,
            userId,
            processId,
          }),
        )
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

  @Post('orders/:id/cancel-pending')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.ORDER_CANCEL_PENDING])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Cancel pending order (staff)' })
  async cancelPending(
    @Param('id') id: string,
    @Body() body: StaffCancelPendingRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderActionTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<OrderActionTcpResponse, StaffOrderActionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.CANCEL_PENDING,
          buildTcpRequestContext<StaffOrderActionTcpRequest>(req, processId, {
            tenantId,
            orderId: id,
            userId,
            reason: body.reason,
            processId,
          }),
        )
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

  @Post('orders/:id/cancel-processing')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.ORDER_CANCEL_PROCESSING])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Cancel processing order (requires reason)' })
  async cancelProcessing(
    @Param('id') id: string,
    @Body() body: CancelProcessingRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<OrderActionTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<OrderActionTcpResponse, StaffOrderActionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.CANCEL_PROCESSING,
          buildTcpRequestContext<StaffOrderActionTcpRequest>(req, processId, {
            tenantId,
            orderId: id,
            userId,
            reason: body.reason,
            processId,
          }),
        )
        .pipe(map((r) => r)),
    );

    if (tcp.statusCode === 200) {
      try {
        await firstValueFrom(
          this.kitchenClient
            .send<unknown, KdsVoidByOrderTcpRequest>(
              TCP_REQUEST_MESSAGE.KITCHEN.VOID_BY_ORDER,
              buildTcpRequestContext<KdsVoidByOrderTcpRequest>(req, processId, {
                tenantId,
                orderId: id,
                reason: 'ORDER_CANCELED',
                correlationId: processId,
              }),
            )
            .pipe(map((r) => r)),
        );
      } catch (e) {
        this.logger.error({ processId, orderId: id, err: e }, 'Kitchen VOID_BY_ORDER failed after cancel-processing');
      }
    }

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

  @Get('service-requests')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'List service requests' })
  async listServiceRequests(
    @ProcessId() processId: string,
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ResponseDto<ServiceRequestListTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const payload: ListServiceRequestsTcpRequest = {
      tenantId,
      status,
      limit: limit !== undefined ? Number.parseInt(limit, 10) : undefined,
      offset: offset !== undefined ? Number.parseInt(offset, 10) : undefined,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          ServiceRequestListTcpResponse,
          ListServiceRequestsTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_GET_LIST, buildTcpRequestContext<ListServiceRequestsTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );
    return new ResponseDto<ServiceRequestListTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('service-requests/:id/acknowledge')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Acknowledge service request' })
  async acknowledgeRequest(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<ServiceRequestCreatedTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<ServiceRequestCreatedTcpResponse, ServiceRequestActionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_ACKNOWLEDGE,
          buildTcpRequestContext<ServiceRequestActionTcpRequest>(req, processId, {
            tenantId,
            requestId: id,
            userId,
          }),
        )
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

  @Post('service-requests/:id/resolve')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.SERVICE_REQUEST_RESOLVE])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Resolve service request' })
  async resolveRequest(
    @Param('id') id: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<ServiceRequestCreatedTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<ServiceRequestCreatedTcpResponse, ServiceRequestActionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_RESOLVE,
          buildTcpRequestContext<ServiceRequestActionTcpRequest>(req, processId, {
            tenantId,
            requestId: id,
            userId,
          }),
        )
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

  @Post('bills/:sessionId/reopen')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TABLE_UPDATE_STATUS])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Reopen bill for session' })
  async reopenBill(
    @Param('sessionId') sessionId: string,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<BillRequestedTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const tcp = await firstValueFrom(
      this.orderClient
        .send<BillRequestedTcpResponse, BillSessionTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.BILL_REOPEN,
          buildTcpRequestContext<BillSessionTcpRequest>(req, processId, {
            tenantId,
            sessionId,
            userId,
          }),
        )
        .pipe(map((r) => r)),
    );
    if (tcp.data?.events?.cartUpdated) {
      this.realtimeEvents.emitCartUpdated(tcp.data.events.cartUpdated);
    }
    return new ResponseDto<BillRequestedTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }

  @Post('tables/transfer')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.TABLE_TRANSFER])
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Transfer session to another table' })
  async transferTable(
    @Body() body: TransferTableRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ): Promise<ResponseDto<TableTransferredTcpResponse>> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const userId = this.staffUserId(req);
    const payload: TransferTableTcpRequest = {
      tenantId,
      sessionId: body.sessionId,
      fromTableId: body.fromTableId,
      toTableId: body.toTableId,
      userId,
      requestId: body.requestId,
    };
    const tcp = await firstValueFrom(
      this.orderClient
        .send<
          TableTransferredTcpResponse,
          TransferTableTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.TABLE_TRANSFER, buildTcpRequestContext<TransferTableTcpRequest>(req, processId, payload))
        .pipe(map((r) => r)),
    );

    const patch = tcp.data?.kitchenSnapshotPatch;
    if (patch && tcp.statusCode === 200) {
      try {
        await firstValueFrom(
          this.kitchenClient
            .send<unknown, KdsPatchTableSnapshotTcpRequest>(
              TCP_REQUEST_MESSAGE.KITCHEN.PATCH_TABLE_SNAPSHOT,
              buildTcpRequestContext<KdsPatchTableSnapshotTcpRequest>(req, processId, {
                tenantId: patch.tenantId,
                sessionId: patch.sessionId,
                tableId: patch.tableId,
                tableName: patch.tableName,
                correlationId: processId,
              }),
            )
            .pipe(map((r) => r)),
        );
      } catch (e) {
        this.logger.warn({ processId, err: e }, 'Kitchen PATCH_TABLE_SNAPSHOT failed after table transfer');
      }
    }

    if (tcp.data?.events?.tableTransferred) {
      this.realtimeEvents.emitTableTransferred(tcp.data.events.tableTransferred);
    }
    return new ResponseDto<TableTransferredTcpResponse>({
      data: tcp.data,
      statusCode: tcp.statusCode,
      message: tcp.code as HTTP_MESSAGE,
      processID: processId,
    });
  }
}
