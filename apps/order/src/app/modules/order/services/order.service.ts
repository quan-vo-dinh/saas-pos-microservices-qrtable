import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { Session } from '@common/entities/session.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Table } from '@common/entities/table.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  UpdateTableStatusTcpRequest,
  ValidateQrTokenTcpRequest,
} from '@common/interfaces/tcp/catalog/table-request.interface';
import type {
  CustomerCancelPendingTcpRequest,
  CustomerListOrdersTcpRequest,
  JoinSessionTcpRequest,
  KdsActiveOrdersGetTcpRequest,
  ListOrdersTcpRequest,
  MarkOrderItemsReadyTcpRequest,
  OrderIdTcpRequest,
  RevertOrderItemsProcessingTcpRequest,
  StaffOrderActionTcpRequest,
  SubmitOrderTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  KdsActiveOrdersGetTcpResponse,
  MarkOrderItemsReadyTcpResponse,
  OrderActionTcpResponse,
  OrderTcpResponse,
  RevertOrderItemsProcessingTcpResponse,
  SessionTcpResponse,
  SubmitOrderTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import type {
  KdsActiveOrderSnapshot,
  Order as OrderDto,
  OrderItem as OrderItemDto,
  Session as SessionDto,
} from '@einvoice/types';
import { SessionStatus } from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OrderKdsEventService } from './order-kds-event.service';
import { OrderStateTransitionService } from './order-state-transition.service';
import { OrderSubmitService } from './order-submit.service';
import { SessionService } from './session.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly sessionService: SessionService,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    private readonly orderSubmitService: OrderSubmitService,
    private readonly orderKdsEventService: OrderKdsEventService,
    private readonly orderStateTransitionService: OrderStateTransitionService,
  ) {}

  async joinSession(dto: JoinSessionTcpRequest): Promise<SessionTcpResponse> {
    const table = await this.callCatalogValidateQrToken(dto);

    if (table.status === TABLE_STATUS.BILLING) {
      throw new BusinessException(ErrorCode.ORDER_JOIN_TABLE_BILLING, HttpStatus.CONFLICT);
    }
    if (table.status === TABLE_STATUS.CLEANING) {
      throw new BusinessException(ErrorCode.ORDER_JOIN_TABLE_CLEANING, HttpStatus.CONFLICT);
    }

    if (table.status === TABLE_STATUS.OCCUPIED) {
      if (!table.sessionId) {
        throw new BusinessException(ErrorCode.ORDER_SESSION_MISSING_FOR_OCCUPIED_TABLE, HttpStatus.CONFLICT);
      }
      const existing = await this.sessionRepository.findActiveByIdAndTenant(table.sessionId, dto.tenantId);
      if (!existing) {
        throw new BusinessException(ErrorCode.ORDER_SESSION_MISSING_FOR_OCCUPIED_TABLE, HttpStatus.CONFLICT);
      }
      await this.sessionService.touchCustomerSessionActivity(dto.tenantId, existing.id);
      const refreshed = await this.sessionRepository.findActiveByIdAndTenant(existing.id, dto.tenantId);
      if (!refreshed) {
        throw new BusinessException(ErrorCode.ORDER_SESSION_MISSING_FOR_OCCUPIED_TABLE, HttpStatus.CONFLICT);
      }
      return this.toSessionDto(refreshed);
    }

    const now = new Date();
    const row = new Session();
    row.tenantId = dto.tenantId;
    row.tableId = table.id;
    row.tableName = table.name;
    row.status = SessionStatus.ACTIVE;
    row.startedAt = now;
    row.lastActivity = now;
    row.closedAt = null;
    row.orderCount = 0;
    row.currentBillId = null;
    row.version = 1;
    const saved = await this.sessionRepository.save(row);
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, saved.id);
    await this.callCatalogUpdateTableStatus({
      id: table.id,
      tenantId: dto.tenantId,
      status: TABLE_STATUS.OCCUPIED,
      sessionId: saved.id,
    });
    return this.toSessionDto(saved);
  }

  async listOrdersForStaff(dto: ListOrdersTcpRequest): Promise<OrderTcpResponse[]> {
    const limit = Math.min(Math.max(dto.limit ?? 50, 1), 200);
    const offset = Math.max(dto.offset ?? 0, 0);
    const rows = await this.orderRepository.findStaffList(dto.tenantId, {
      status: dto.status,
      tableId: dto.tableId,
      limit,
      offset,
    });
    const out: OrderTcpResponse[] = [];
    for (const r of rows) {
      const items = await this.orderItemRepository.findByOrderIdAndTenant(r.id, dto.tenantId);
      out.push(this.toOrderDto(r, items));
    }
    return out;
  }

  async listOrdersForCustomerSession(dto: CustomerListOrdersTcpRequest): Promise<OrderTcpResponse[]> {
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);
    const rows = await this.orderRepository.findBySessionIdAndTenant(dto.sessionId, dto.tenantId);
    const out: OrderTcpResponse[] = [];
    for (const r of rows) {
      const items = await this.orderItemRepository.findByOrderIdAndTenant(r.id, dto.tenantId);
      out.push(this.toOrderDto(r, items));
    }
    return out;
  }

  async getOrderById(dto: OrderIdTcpRequest): Promise<OrderTcpResponse> {
    const order = await this.orderRepository.findByIdAndTenant(dto.orderId, dto.tenantId);
    if (!order) {
      throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (dto.sessionId !== undefined && order.sessionId !== dto.sessionId) {
      throw new BusinessException(ErrorCode.TENANT_MISMATCH_SESSION, HttpStatus.FORBIDDEN);
    }
    const items = await this.orderItemRepository.findByOrderIdAndTenant(order.id, dto.tenantId);
    return this.toOrderDto(order, items);
  }

  async submitOrder(dto: SubmitOrderTcpRequest): Promise<SubmitOrderTcpResponse> {
    return this.orderSubmitService.submitOrder(dto);
  }

  async confirmOrder(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    return this.orderStateTransitionService.confirmOrder(dto);
  }

  async customerCancelPending(dto: CustomerCancelPendingTcpRequest): Promise<OrderActionTcpResponse> {
    return this.orderStateTransitionService.customerCancelPending(dto);
  }

  async cancelPendingStaff(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    return this.orderStateTransitionService.cancelPendingStaff(dto);
  }

  async cancelProcessing(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    return this.orderStateTransitionService.cancelProcessing(dto);
  }

  async markOrderServed(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    return this.orderStateTransitionService.markOrderServed(dto);
  }

  async getKdsActiveOrderSnapshots(dto: KdsActiveOrdersGetTcpRequest): Promise<KdsActiveOrdersGetTcpResponse> {
    const orders = await this.orderRepository.findActiveKdsOrders(dto.tenantId, dto.station);
    const out: KdsActiveOrderSnapshot[] = [];
    for (const order of orders) {
      const allItems = await this.orderItemRepository.findByOrderIdAndTenant(order.id, dto.tenantId);
      const items = dto.station ? allItems.filter((i) => i.station === dto.station) : allItems;
      if (items.length === 0) {
        continue;
      }
      out.push(this.orderKdsEventService.toKdsActiveOrderSnapshot(order, items));
    }
    return out;
  }

  async markOrderItemsReady(dto: MarkOrderItemsReadyTcpRequest): Promise<MarkOrderItemsReadyTcpResponse> {
    return this.orderStateTransitionService.markOrderItemsReady(dto);
  }

  async revertOrderItemsProcessing(
    dto: RevertOrderItemsProcessingTcpRequest,
  ): Promise<RevertOrderItemsProcessingTcpResponse> {
    return this.orderStateTransitionService.revertOrderItemsProcessing(dto);
  }

  private toOrderDto(entity: Order, items: OrderItem[]): OrderDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      tableId: entity.tableId,
      tableName: entity.tableName,
      sessionId: entity.sessionId,
      status: entity.status,
      totalAmount: entity.totalAmount,
      idempotencyKey: entity.idempotencyKey,
      notes: entity.notes ?? undefined,
      confirmedAt: entity.confirmedAt?.toISOString(),
      confirmedByUserId: entity.confirmedByUserId ?? undefined,
      cancelledAt: entity.cancelledAt?.toISOString(),
      cancelledByUserId: entity.cancelledByUserId ?? undefined,
      cancelReason: entity.cancelReason ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      items: items.map((it) => this.toOrderItemDto(it)),
    };
  }

  private toOrderItemDto(entity: OrderItem): OrderItemDto {
    return {
      id: entity.id,
      orderId: entity.orderId,
      menuItemId: entity.menuItemId,
      menuItemName: entity.menuItemName,
      menuItemImageUrl: entity.menuItemImageUrl ?? null,
      quantity: entity.quantity,
      unitPrice: entity.unitPrice,
      note: entity.note ?? undefined,
      status: entity.status,
      station: entity.station ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private async callCatalogValidateQrToken(dto: JoinSessionTcpRequest): Promise<Table> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<Table>, ValidateQrTokenTcpRequest>(
          TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN,
          new Request<ValidateQrTokenTcpRequest>({
            tenantId: dto.tenantId,
            data: { tableId: dto.tableId, token: dto.qrToken, tenantId: dto.tenantId },
          }),
        ),
      );
      if (response.statusCode >= 400 || !response.data) {
        throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN, HttpStatus.FORBIDDEN);
      }
      return response.data as unknown as Table;
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      if (e instanceof RpcException) {
        const err = e.getError() as { code?: number; errorCode?: ErrorCode; message?: string };
        if (err?.errorCode) {
          throw new BusinessException(err.errorCode, (err.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private async callCatalogUpdateTableStatus(payload: UpdateTableStatusTcpRequest): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<Table>, UpdateTableStatusTcpRequest>(
          TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS,
          new Request<UpdateTableStatusTcpRequest>({ tenantId: payload.tenantId, data: payload }),
        ),
      );
      if (response.statusCode >= 400) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, response.statusCode as HttpStatus);
      }
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      if (e instanceof RpcException) {
        const err = e.getError() as { code?: number; errorCode?: ErrorCode; message?: string };
        if (err?.errorCode) {
          throw new BusinessException(err.errorCode, (err.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private toSessionDto(row: Session): SessionDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tableId: row.tableId,
      tableName: row.tableName,
      status: row.status as SessionDto['status'],
      startedAt: row.startedAt.toISOString(),
      lastActivity: row.lastActivity.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      orderCount: row.orderCount,
    };
  }
}
