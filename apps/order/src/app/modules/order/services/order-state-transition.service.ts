import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Session } from '@common/entities/session.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
} from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type { StockMutationResult } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import type {
  CustomerCancelPendingTcpRequest,
  MarkOrderItemsReadyTcpRequest,
  RevertOrderItemsProcessingTcpRequest,
  StaffOrderActionTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  MarkOrderItemsReadyTcpResponse,
  OrderActionTcpResponse,
  RevertOrderItemsProcessingTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import type { Bill as BillDto, Order as OrderDto, OrderItem as OrderItemDto } from '@einvoice/types';
import { BillStatus, OrderItemStatus, OrderStatus, OrderStatusChangedEvent } from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DataSource, EntityManager } from 'typeorm';
import { CONFIGURATION } from '../../../../configuration';
import { buildOrderConfirmedKafkaPayload } from '../order-confirmed-payload';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { recalculateBillTotals } from '../utils/recalculate-bill-totals';
import { OrderKdsEventService } from './order-kds-event.service';

type ConfirmTxOutcome =
  | { kind: 'replay'; order: Order; items: OrderItem[]; bill: Bill | null }
  | { kind: 'confirmed'; order: Order; items: OrderItem[]; bill: Bill | null };

type TcpBusinessErrorPayload = { code?: number; errorCode?: ErrorCode; message?: string };

const ORDER_STATUS_CHANGED_EVENT_TYPE = 'order.status_changed';

@Injectable()
export class OrderStateTransitionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly billRepository: BillRepository,
    private readonly orderKdsEventService: OrderKdsEventService,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  async confirmOrder(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const order = await this.orderRepository.findByIdAndTenantForUpdate(dto.orderId, dto.tenantId, manager);
      if (!order) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (order.status === OrderStatus.PROCESSING) {
        const items = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
          dto.orderId,
          dto.tenantId,
          manager,
        );
        const bill = await this.loadBillForSessionOrder(manager, order.sessionId, dto.tenantId, dto.orderId);
        return { kind: 'replay', order, items, bill } satisfies ConfirmTxOutcome;
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const bill = await this.loadBillForSessionOrder(manager, order.sessionId, dto.tenantId, dto.orderId);
      if (!bill || bill.status !== BillStatus.OPEN) {
        throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
      }

      const items = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );

      await this.callCatalogStockDeduct({
        tenantId: dto.tenantId,
        orderId: order.id,
        idempotencyKey: `confirm-order:${order.id}`,
        items: items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
      });

      const now = new Date();
      order.status = OrderStatus.PROCESSING;
      order.confirmedAt = now;
      order.confirmedByUserId = dto.userId;
      await manager.save(Order, order);

      for (const line of items) {
        line.status = OrderItemStatus.PROCESSING;
        await manager.save(OrderItem, line);
      }

      const kafkaPayload = buildOrderConfirmedKafkaPayload({
        tenantId: dto.tenantId,
        order,
        items,
        confirmedAt: now,
        confirmedByUserId: dto.userId,
        correlationId: dto.processId,
      });

      const outbox = manager.create(OutboxEvent, {
        tenantId: dto.tenantId,
        topic: CONFIGURATION.KAFKA_CONFIG.ORDER_CONFIRMED_TOPIC,
        eventType: 'order.confirmed',
        aggregateId: order.id,
        partitionKey: dto.tenantId,
        payload: kafkaPayload as unknown as Record<string, unknown>,
        status: 'PENDING',
        publishedAt: null,
        attemptCount: 0,
        lastError: null,
      });
      await manager.save(OutboxEvent, outbox);

      return { kind: 'confirmed', order, items, bill } satisfies ConfirmTxOutcome;
    });

    const orderDto = this.toOrderDto(outcome.order, outcome.items);
    const billDto = outcome.bill ? this.toBillDto(outcome.bill) : undefined;

    const orderStatusChanged: OrderStatusChangedEvent = {
      tenantId: dto.tenantId,
      orderId: outcome.order.id,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.PROCESSING,
      changedByUserId: dto.userId,
      timestamp: (outcome.order.confirmedAt ?? new Date()).toISOString(),
    };

    return {
      order: orderDto,
      bill: billDto,
      events: { orderStatusChanged },
    };
  }

  async customerCancelPending(dto: CustomerCancelPendingTcpRequest): Promise<OrderActionTcpResponse> {
    const reason = (dto.reason ?? 'CUSTOMER_REQUESTED').trim().slice(0, 255) || 'CUSTOMER_REQUESTED';
    const { order, items, bill } = await this.runPendingCancelTransaction(
      dto.tenantId,
      dto.orderId,
      dto.sessionId,
      null,
      reason,
    );
    return this.buildCancelResponse(dto.tenantId, order, items, bill, OrderStatus.PENDING, undefined);
  }

  async cancelPendingStaff(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    const reason = (dto.reason ?? 'STAFF_CANCELLED').trim().slice(0, 255) || 'STAFF_CANCELLED';
    const { order, items, bill } = await this.runPendingCancelTransaction(
      dto.tenantId,
      dto.orderId,
      undefined,
      dto.userId,
      reason,
    );
    return this.buildCancelResponse(dto.tenantId, order, items, bill, OrderStatus.PENDING, dto.userId);
  }

  async cancelProcessing(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    if (!dto.reason?.trim()) {
      throw new BusinessException(ErrorCode.ORDER_CANCEL_REASON_REQUIRED, HttpStatus.BAD_REQUEST);
    }
    const reason = dto.reason.trim().slice(0, 255);
    const { order, items, bill } = await this.dataSource.transaction(async (manager) => {
      const ord = await this.orderRepository.findByIdAndTenantForUpdate(dto.orderId, dto.tenantId, manager);
      if (!ord) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      if (ord.status !== OrderStatus.PROCESSING) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const lines = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );

      await this.callCatalogStockRelease({
        tenantId: dto.tenantId,
        orderId: ord.id,
        idempotencyKey: `cancel-processing:${ord.id}`,
        items: lines.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
      });

      const now = new Date();
      ord.status = OrderStatus.CANCELED;
      ord.cancelledAt = now;
      ord.cancelledByUserId = dto.userId;
      ord.cancelReason = reason;
      await manager.save(Order, ord);

      for (const line of lines) {
        line.status = OrderItemStatus.CANCELED;
        await manager.save(OrderItem, line);
      }

      const bill = await this.loadBillForSessionOrder(manager, ord.sessionId, dto.tenantId, ord.id);
      if (bill) {
        await recalculateBillTotals(manager, bill, dto.tenantId);
        await manager.save(Bill, bill);
      }

      const orderStatusChanged = this.buildOrderStatusChangedEvent(
        dto.tenantId,
        ord.id,
        OrderStatus.PROCESSING,
        OrderStatus.CANCELED,
        dto.userId,
        now,
      );
      await this.saveOrderStatusChangedOutbox(manager, dto.tenantId, ord.id, orderStatusChanged);

      return { order: ord, items: lines, bill };
    });

    return this.buildCancelResponse(dto.tenantId, order, items, bill, OrderStatus.PROCESSING, dto.userId);
  }

  async markOrderServed(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    const { order, items, bill, fromStatus } = await this.dataSource.transaction(async (manager) => {
      const ord = await this.orderRepository.findByIdAndTenantForUpdate(dto.orderId, dto.tenantId, manager);
      if (!ord) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const lines = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );

      if (ord.status !== OrderStatus.READY) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const activeLines = lines.filter((line) => line.status !== OrderItemStatus.CANCELED);
      if (activeLines.length === 0 || activeLines.some((line) => line.status !== OrderItemStatus.READY)) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const now = new Date();
      await manager
        .createQueryBuilder()
        .update(OrderItem)
        .set({ status: OrderItemStatus.SERVED, updatedAt: now })
        .where('tenantId = :tenantId', { tenantId: dto.tenantId })
        .andWhere('orderId = :orderId', { orderId: dto.orderId })
        .andWhere('status = :fromStatus', { fromStatus: OrderItemStatus.READY })
        .execute();

      ord.status = OrderStatus.SERVED;
      ord.updatedAt = now;
      await manager.save(Order, ord);

      const updatedItems = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );
      const currentBill = await this.loadBillForSessionOrder(manager, ord.sessionId, dto.tenantId, ord.id);

      return { order: ord, items: updatedItems, bill: currentBill, fromStatus: OrderStatus.READY };
    });

    const orderStatusChanged: OrderStatusChangedEvent = {
      tenantId: dto.tenantId,
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.SERVED,
      changedByUserId: dto.userId,
      timestamp: order.updatedAt.toISOString(),
    };

    return {
      order: this.toOrderDto(order, items),
      bill: bill ? this.toBillDto(bill) : undefined,
      events: { orderStatusChanged },
    };
  }

  async markOrderItemsReady(dto: MarkOrderItemsReadyTcpRequest): Promise<MarkOrderItemsReadyTcpResponse> {
    if (dto.orderItemIds.length === 0) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await this.orderRepository.findByIdAndTenantForUpdate(dto.orderId, dto.tenantId, manager);
      if (!order) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      if (order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.READY) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const items = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );
      this.orderKdsEventService.assertKdsStationTargets(items, dto.orderItemIds, dto.station);

      await manager
        .createQueryBuilder()
        .update(OrderItem)
        .set({ status: OrderItemStatus.READY, updatedAt: new Date() })
        .where('tenantId = :tenantId', { tenantId: dto.tenantId })
        .andWhere('orderId = :orderId', { orderId: dto.orderId })
        .andWhere('id IN (:...ids)', { ids: dto.orderItemIds })
        .andWhere('station = :station', { station: dto.station })
        .andWhere('status = :fromStatus', { fromStatus: OrderItemStatus.PROCESSING })
        .execute();

      const updatedItems = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );

      let orderStatusChanged: OrderStatusChangedEvent | undefined;
      if (
        order.status === OrderStatus.PROCESSING &&
        this.orderKdsEventService.noKitchenProcessingItemsRemaining(updatedItems)
      ) {
        order.status = OrderStatus.READY;
        await manager.save(Order, order);
        orderStatusChanged = {
          tenantId: dto.tenantId,
          orderId: order.id,
          fromStatus: OrderStatus.PROCESSING,
          toStatus: OrderStatus.READY,
          changedByUserId: dto.userId,
          timestamp: new Date().toISOString(),
        };
      }

      const kitchenItemReady = this.orderKdsEventService.buildKitchenItemReadyEvent(order, dto, updatedItems);

      return { kitchenItemReady, orderStatusChanged };
    });
  }

  async revertOrderItemsProcessing(
    dto: RevertOrderItemsProcessingTcpRequest,
  ): Promise<RevertOrderItemsProcessingTcpResponse> {
    if (dto.orderItemIds.length === 0) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await this.orderRepository.findByIdAndTenantForUpdate(dto.orderId, dto.tenantId, manager);
      if (!order) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      if (order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.READY) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const items = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );
      this.orderKdsEventService.assertKdsStationTargets(items, dto.orderItemIds, dto.station);

      await manager
        .createQueryBuilder()
        .update(OrderItem)
        .set({ status: OrderItemStatus.PROCESSING, updatedAt: new Date() })
        .where('tenantId = :tenantId', { tenantId: dto.tenantId })
        .andWhere('orderId = :orderId', { orderId: dto.orderId })
        .andWhere('id IN (:...ids)', { ids: dto.orderItemIds })
        .andWhere('station = :station', { station: dto.station })
        .andWhere('status = :fromStatus', { fromStatus: OrderItemStatus.READY })
        .execute();

      const updatedItems = await this.orderItemRepository.findByOrderIdAndTenantWithManager(
        dto.orderId,
        dto.tenantId,
        manager,
      );

      let orderStatusChanged: OrderStatusChangedEvent | undefined;
      if (order.status === OrderStatus.READY && this.orderKdsEventService.hasKitchenProcessingItems(updatedItems)) {
        order.status = OrderStatus.PROCESSING;
        await manager.save(Order, order);
        orderStatusChanged = {
          tenantId: dto.tenantId,
          orderId: order.id,
          fromStatus: OrderStatus.READY,
          toStatus: OrderStatus.PROCESSING,
          changedByUserId: dto.userId,
          timestamp: new Date().toISOString(),
        };
      }

      return { orderStatusChanged };
    });
  }

  private buildCancelResponse(
    tenantId: string,
    order: Order,
    items: OrderItem[],
    bill: Bill | null,
    fromStatus: OrderStatus,
    changedBy: string | null,
  ): OrderActionTcpResponse {
    const orderDto = this.toOrderDto(order, items);
    const billDto = bill ? this.toBillDto(bill) : undefined;
    const orderStatusChanged: OrderStatusChangedEvent = {
      tenantId,
      orderId: order.id,
      fromStatus,
      toStatus: OrderStatus.CANCELED,
      changedByUserId: changedBy ?? undefined,
      timestamp: (order.cancelledAt ?? new Date()).toISOString(),
    };
    return { order: orderDto, bill: billDto, events: { orderStatusChanged } };
  }

  private buildOrderStatusChangedEvent(
    tenantId: string,
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    changedByUserId: string | undefined,
    changedAt: Date,
  ): OrderStatusChangedEvent {
    return {
      tenantId,
      orderId,
      fromStatus,
      toStatus,
      changedByUserId,
      timestamp: changedAt.toISOString(),
    };
  }

  private async saveOrderStatusChangedOutbox(
    manager: EntityManager,
    tenantId: string,
    orderId: string,
    payload: OrderStatusChangedEvent,
  ): Promise<void> {
    const outbox = manager.create(OutboxEvent, {
      tenantId,
      topic: CONFIGURATION.KAFKA_CONFIG.ORDER_STATUS_CHANGED_TOPIC,
      eventType: ORDER_STATUS_CHANGED_EVENT_TYPE,
      aggregateId: orderId,
      partitionKey: tenantId,
      payload: payload as unknown as Record<string, unknown>,
      status: 'PENDING',
      publishedAt: null,
      attemptCount: 0,
      lastError: null,
    });
    await manager.save(OutboxEvent, outbox);
  }

  private async runPendingCancelTransaction(
    tenantId: string,
    orderId: string,
    enforceSessionId: string | undefined,
    cancelledByUserId: string | null,
    cancelReason: string,
  ): Promise<{ order: Order; items: OrderItem[]; bill: Bill | null }> {
    return this.dataSource.transaction(async (manager) => {
      const order = await this.orderRepository.findByIdAndTenantForUpdate(orderId, tenantId, manager);
      if (!order) {
        throw new BusinessException(ErrorCode.ORDER_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      if (enforceSessionId && order.sessionId !== enforceSessionId) {
        throw new BusinessException(ErrorCode.TENANT_MISMATCH_SESSION, HttpStatus.FORBIDDEN);
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }

      const now = new Date();
      order.status = OrderStatus.CANCELED;
      order.cancelledAt = now;
      order.cancelledByUserId = cancelledByUserId;
      order.cancelReason = cancelReason;
      await manager.save(Order, order);

      const items = await this.orderItemRepository.findByOrderIdAndTenantWithManager(orderId, tenantId, manager);
      for (const line of items) {
        line.status = OrderItemStatus.CANCELED;
        await manager.save(OrderItem, line);
      }

      const bill = await this.loadBillForSessionOrder(manager, order.sessionId, tenantId, order.id);
      if (bill) {
        await recalculateBillTotals(manager, bill, tenantId);
        await manager.save(Bill, bill);
      }

      return { order, items, bill };
    });
  }

  private async loadBillForSessionOrder(
    manager: EntityManager,
    sessionId: string,
    tenantId: string,
    orderId: string,
  ): Promise<Bill | null> {
    const session = await manager.findOne(Session, { where: { id: sessionId, tenantId } });
    if (!session?.currentBillId) {
      return null;
    }
    const bill = await this.billRepository.findByIdAndTenantForUpdate(session.currentBillId, tenantId, manager);
    if (!bill?.orderIds?.includes(orderId)) {
      return null;
    }
    return bill;
  }

  private async callCatalogStockDeduct(payload: StockDeductForOrderTcpRequest): Promise<StockMutationResult[]> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<StockMutationResult[]>, StockDeductForOrderTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER,
          new Request<StockDeductForOrderTcpRequest>({ tenantId: payload.tenantId, data: payload }),
        ),
      );
      if (response.statusCode >= 400) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, response.statusCode as HttpStatus);
      }
      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      const tcpError = this.getTcpBusinessError(e);
      if (tcpError?.errorCode) {
        throw new BusinessException(tcpError.errorCode, (tcpError.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private async callCatalogStockRelease(payload: StockReleaseForOrderTcpRequest): Promise<StockMutationResult[]> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<StockMutationResult[]>, StockReleaseForOrderTcpRequest>(
          TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER,
          new Request<StockReleaseForOrderTcpRequest>({ tenantId: payload.tenantId, data: payload }),
        ),
      );
      if (response.statusCode >= 400) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, response.statusCode as HttpStatus);
      }
      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      const tcpError = this.getTcpBusinessError(e);
      if (tcpError?.errorCode) {
        throw new BusinessException(tcpError.errorCode, (tcpError.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private getTcpBusinessError(error: unknown): TcpBusinessErrorPayload | null {
    const payload = error instanceof RpcException ? error.getError() : error;
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const candidate = payload as TcpBusinessErrorPayload & { error?: TcpBusinessErrorPayload };
    return candidate.errorCode ? candidate : (candidate.error ?? null);
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

  private toBillDto(entity: Bill): BillDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      sessionId: entity.sessionId,
      orderIds: entity.orderIds ?? [],
      subtotal: entity.subtotal,
      total: entity.total,
      roundingAmount: entity.roundingAmount,
      paymentMethod: entity.paymentMethod ?? undefined,
      status: entity.status,
      closedAt: entity.closedAt?.toISOString(),
      paidAt: entity.paidAt?.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
