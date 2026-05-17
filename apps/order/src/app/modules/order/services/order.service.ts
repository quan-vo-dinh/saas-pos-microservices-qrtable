import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Session } from '@common/entities/session.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { Table } from '@common/entities/table.entity';
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
  SubscriptionDashboardTcpResponse,
  TenantPlanLimitExceededDetails,
} from '@common/interfaces/tcp/saas/saas-response.interface';
import type {
  Bill as BillDto,
  KitchenItemReadyEvent,
  KdsActiveOrderSnapshot,
  Order as OrderDto,
  OrderItem as OrderItemDto,
  Session as SessionDto,
} from '@einvoice/types';
import {
  BillStatus,
  OrderCreatedEvent,
  OrderItemStatus,
  OrderStatus,
  OrderStatusChangedEvent,
  SessionStatus,
} from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { firstValueFrom, timeout } from 'rxjs';
import { CONFIGURATION } from '../../../../configuration';
import { buildOrderConfirmedKafkaPayload } from '../order-confirmed-payload';
import { recalculateBillTotals } from '../utils/recalculate-bill-totals';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from './cart.service';
import { OrderQuotaService } from './order-quota.service';
import { SessionService } from './session.service';

type SubmitTxOutcome =
  | { kind: 'replay'; order: Order }
  | { kind: 'created'; order: Order; bill: Bill; items: OrderItem[] };

type ConfirmTxOutcome =
  | { kind: 'replay'; order: Order; items: OrderItem[]; bill: Bill | null }
  | { kind: 'confirmed'; order: Order; items: OrderItem[]; bill: Bill | null };

const SAAS_ORDER_QUOTA_TIMEOUT_MS = 2500;

type TcpBusinessErrorPayload = { code?: number; errorCode?: ErrorCode; message?: string };

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly billRepository: BillRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly cartService: CartService,
    private readonly sessionService: SessionService,
    private readonly orderQuotaService: OrderQuotaService,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
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
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);

    const snapshot = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
    if (snapshot.cartVersion !== dto.expectedCartVersion) {
      throw new BusinessException(ErrorCode.CART_VERSION_CONFLICT, HttpStatus.CONFLICT);
    }
    if (snapshot.items.length === 0) {
      throw new BusinessException(ErrorCode.ORDER_EMPTY_CART, HttpStatus.BAD_REQUEST);
    }

    const existingBeforeQuota = await this.orderRepository.findByIdempotencyKey(
      dto.tenantId,
      dto.sessionId,
      dto.idempotencyKey,
    );
    let quotaReserved = false;
    if (!existingBeforeQuota) {
      quotaReserved = await this.reserveDailyOrderQuota(dto.tenantId);
    }

    let outcome: SubmitTxOutcome;
    try {
      outcome = await this.dataSource.transaction(async (manager) => {
        const session = await this.lockSession(manager, dto.sessionId, dto.tenantId);
        if (!session || session.status !== SessionStatus.ACTIVE) {
          throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
        }

        const existing = await manager.getRepository(Order).findOne({
          where: { tenantId: dto.tenantId, sessionId: dto.sessionId, idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
          return { kind: 'replay', order: existing } satisfies SubmitTxOutcome;
        }

        const totalAmount = snapshot.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

        const bill = await this.resolveOpenBillForSubmit(manager, session, dto.tenantId);

        const order = manager.create(Order, {
          tenantId: dto.tenantId,
          tableId: session.tableId,
          tableName: session.tableName,
          sessionId: dto.sessionId,
          status: OrderStatus.PENDING,
          totalAmount,
          idempotencyKey: dto.idempotencyKey,
          notes: dto.notes?.trim() ? dto.notes.trim().slice(0, 2000) : null,
          confirmedAt: null,
          confirmedByUserId: null,
          cancelledAt: null,
          cancelledByUserId: null,
          cancelReason: null,
        });
        await manager.save(Order, order);

        const items: OrderItem[] = [];
        for (const line of snapshot.items) {
          const row = manager.create(OrderItem, {
            tenantId: dto.tenantId,
            orderId: order.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            menuItemImageUrl: line.menuItemImageUrl ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            note: line.note ?? null,
            status: OrderItemStatus.PROCESSING,
            station: line.station ?? null,
          });
          await manager.save(OrderItem, row);
          items.push(row);
        }

        const orderIds = [...(bill.orderIds ?? []).filter(Boolean), order.id];
        bill.orderIds = orderIds;
        await recalculateBillTotals(manager, bill, dto.tenantId);
        await manager.save(Bill, bill);

        session.orderCount += 1;
        session.currentBillId = bill.id;
        await manager.save(Session, session);

        return { kind: 'created', order, bill, items } satisfies SubmitTxOutcome;
      });
    } catch (error) {
      if (quotaReserved) {
        await this.orderQuotaService.decrementDailyOrders(dto.tenantId);
      }
      throw error;
    }

    if (quotaReserved && outcome.kind === 'replay') {
      await this.orderQuotaService.decrementDailyOrders(dto.tenantId);
    }

    let cartUpdated: SubmitOrderTcpResponse['events']['cartUpdated'];
    if (outcome.kind === 'created') {
      const ev = await this.cartService.mutate({
        tenantId: dto.tenantId,
        sessionId: dto.sessionId,
        expectedCartVersion: dto.expectedCartVersion,
        operation: 'CLEAR',
      });
      cartUpdated = ev;
    } else {
      const snap = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
      cartUpdated = {
        tenantId: snap.tenantId,
        sessionId: snap.sessionId,
        cartVersion: snap.cartVersion,
        status: snap.status,
        items: snap.items,
        updatedAt: snap.updatedAt,
      };
    }

    const orderEntity = outcome.order;
    const items =
      outcome.kind === 'created'
        ? outcome.items
        : await this.orderItemRepository.findByOrderIdAndTenant(orderEntity.id, dto.tenantId);
    const billEntity =
      outcome.kind === 'created'
        ? outcome.bill
        : await this.resolveBillForOrder(orderEntity.sessionId, dto.tenantId, orderEntity.id);

    if (!billEntity) {
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const orderDto = this.toOrderDto(orderEntity, items);
    const billDto = this.toBillDto(billEntity);
    const cartDto = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);

    const orderCreated: OrderCreatedEvent = {
      tenantId: dto.tenantId,
      orderId: orderEntity.id,
      tableId: orderEntity.tableId,
      tableName: orderEntity.tableName,
      sessionId: orderEntity.sessionId,
      items: orderDto.items,
      totalAmount: orderEntity.totalAmount,
      timestamp: orderEntity.createdAt.toISOString(),
    };

    return {
      order: orderDto,
      bill: billDto,
      cart: cartDto,
      events: { cartUpdated, orderCreated },
    };
  }

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

  async getKdsActiveOrderSnapshots(dto: KdsActiveOrdersGetTcpRequest): Promise<KdsActiveOrdersGetTcpResponse> {
    const orders = await this.orderRepository.findActiveKdsOrders(dto.tenantId, dto.station);
    const out: KdsActiveOrderSnapshot[] = [];
    for (const order of orders) {
      const allItems = await this.orderItemRepository.findByOrderIdAndTenant(order.id, dto.tenantId);
      const items = dto.station ? allItems.filter((i) => i.station === dto.station) : allItems;
      if (items.length === 0) {
        continue;
      }
      out.push(this.toKdsActiveOrderSnapshot(order, items));
    }
    return out;
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
      this.assertKdsStationTargets(items, dto.orderItemIds, dto.station);

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
      if (order.status === OrderStatus.PROCESSING && this.noKitchenProcessingItemsRemaining(updatedItems)) {
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

      const kitchenItemReady = this.buildKitchenItemReadyEvent(order, dto, updatedItems);

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
      this.assertKdsStationTargets(items, dto.orderItemIds, dto.station);

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
      if (order.status === OrderStatus.READY && this.hasKitchenProcessingItems(updatedItems)) {
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

  private toKdsActiveOrderSnapshot(order: Order, items: OrderItem[]): KdsActiveOrderSnapshot {
    if (!order.confirmedAt) {
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return {
      tenantId: order.tenantId,
      orderId: order.id,
      sessionId: order.sessionId,
      tableId: order.tableId,
      tableName: order.tableName,
      confirmedAt: order.confirmedAt.toISOString(),
      confirmedByUserId: order.confirmedByUserId ?? undefined,
      items: items.map((it) => ({
        id: it.id,
        orderId: it.orderId,
        menuItemId: it.menuItemId,
        menuItemName: it.menuItemName,
        menuItemImageUrl: it.menuItemImageUrl ?? undefined,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        note: it.note ?? undefined,
        status: it.status,
        station: it.station ?? undefined,
        createdAt: it.createdAt.toISOString(),
        updatedAt: it.updatedAt.toISOString(),
      })),
    };
  }

  private assertKdsStationTargets(items: OrderItem[], targetIds: string[], station: OrderItem['station']): void {
    const map = new Map(items.map((i) => [i.id, i]));
    for (const id of targetIds) {
      const line = map.get(id);
      if (!line) {
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
      }
      if (!line.station || line.station !== station) {
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
      }
      if (line.status === OrderItemStatus.CANCELED) {
        throw new BusinessException(ErrorCode.ORDER_INVALID_STATE, HttpStatus.CONFLICT);
      }
    }
  }

  private noKitchenProcessingItemsRemaining(items: OrderItem[]): boolean {
    return !items.some((i) => i.status !== OrderItemStatus.CANCELED && i.status === OrderItemStatus.PROCESSING);
  }

  private hasKitchenProcessingItems(items: OrderItem[]): boolean {
    return items.some((i) => i.status !== OrderItemStatus.CANCELED && i.status === OrderItemStatus.PROCESSING);
  }

  private buildKitchenItemReadyEvent(
    order: Order,
    dto: MarkOrderItemsReadyTcpRequest,
    items: OrderItem[],
  ): KitchenItemReadyEvent {
    const selected = items.filter((i) => dto.orderItemIds.includes(i.id));
    return {
      eventId: randomUUID(),
      eventType: 'kitchen.item_ready',
      schemaVersion: 1,
      tenantId: dto.tenantId,
      sessionId: order.sessionId,
      tableId: order.tableId,
      tableName: order.tableName,
      orderId: order.id,
      ticketId: dto.ticketId,
      station: dto.station,
      readyItems: selected.map((i) => ({
        orderItemId: i.id,
        menuItemId: i.menuItemId,
        menuItemName: i.menuItemName,
        quantity: i.quantity,
        note: i.note ?? undefined,
      })),
      occurredAt: new Date().toISOString(),
      correlationId: dto.correlationId,
    };
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

  private async lockSession(manager: EntityManager, sessionId: string, tenantId: string): Promise<Session | null> {
    return manager
      .getRepository(Session)
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.id = :sessionId', { sessionId })
      .andWhere('s.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  private async resolveOpenBillForSubmit(manager: EntityManager, session: Session, tenantId: string): Promise<Bill> {
    if (session.currentBillId) {
      const bill = await this.billRepository.findByIdAndTenantForUpdate(session.currentBillId, tenantId, manager);
      if (!bill) {
        throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
      }
      if (bill.status !== BillStatus.OPEN) {
        throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
      }
      return bill;
    }

    const bill = manager.create(Bill, {
      tenantId,
      sessionId: session.id,
      orderIds: [],
      subtotal: 0,
      total: 0,
      roundingAmount: 0,
      paymentMethod: null,
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
    });
    await manager.save(Bill, bill);
    return bill;
  }

  private async resolveBillForOrder(sessionId: string, tenantId: string, orderId: string): Promise<Bill | null> {
    const session = await this.sessionRepository.findByIdAndTenant(sessionId, tenantId);
    if (!session?.currentBillId) {
      return null;
    }
    const bill = await this.billRepository.findByIdAndTenant(session.currentBillId, tenantId);
    if (!bill?.orderIds?.includes(orderId)) {
      return null;
    }
    return bill;
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

  private async reserveDailyOrderQuota(tenantId: string): Promise<boolean> {
    const dashboard = await this.callSaasCurrentSubscription(tenantId);
    const limit = dashboard.current?.maxOrdersPerDay;

    if (dashboard.current?.status !== SubscriptionStatus.ACTIVE || !Number.isSafeInteger(limit) || limit < -1) {
      throw this.buildTenantPlanLimitExceeded(0, 0);
    }

    if (limit === -1) {
      return false;
    }

    const reservedCount = await this.orderQuotaService.incrementDailyOrders(tenantId);
    if (reservedCount > limit) {
      await this.orderQuotaService.decrementDailyOrders(tenantId);
      throw this.buildTenantPlanLimitExceeded(limit, reservedCount - 1);
    }
    return true;
  }

  private async callSaasCurrentSubscription(tenantId: string): Promise<SubscriptionDashboardTcpResponse> {
    try {
      const response = await firstValueFrom(
        this.saasClient
          .send<
            SubscriptionDashboardTcpResponse,
            { tenantId: string }
          >(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT, new Request<{ tenantId: string }>({ tenantId, data: { tenantId } }))
          .pipe(timeout({ first: SAAS_ORDER_QUOTA_TIMEOUT_MS })),
      );
      if (response.error || response.statusCode >= 400 || !response.data?.current) {
        throw this.buildTenantPlanLimitExceeded(0, 0);
      }
      return response.data;
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      throw this.buildTenantPlanLimitExceeded(0, 0);
    }
  }

  private buildTenantPlanLimitExceeded(limit: number, current: number): BusinessException {
    const details: TenantPlanLimitExceededDetails = {
      limitType: 'max_orders_per_day',
      limit,
      current,
      upgradeUrl: '/dashboard/subscription',
    };
    return new BusinessException(
      ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      HttpStatus.FORBIDDEN,
      undefined,
      undefined,
      details,
    );
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
