import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Session } from '@common/entities/session.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { StockDeductForOrderTcpRequest } from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type { StockMutationResult } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import type {
  StaffOrderActionTcpRequest,
  SubmitOrderTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  OrderActionTcpResponse,
  SubmitOrderTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import type { Bill as BillDto, Order as OrderDto, OrderItem as OrderItemDto } from '@einvoice/types';
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
import { DataSource, EntityManager, In } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { CONFIGURATION } from '../../../../configuration';
import { buildOrderConfirmedKafkaPayload } from '../order-confirmed-payload';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from './cart.service';
import { SessionService } from './session.service';

type SubmitTxOutcome =
  | { kind: 'replay'; order: Order }
  | { kind: 'created'; order: Order; bill: Bill; items: OrderItem[] };

type ConfirmTxOutcome =
  | { kind: 'replay'; order: Order; items: OrderItem[]; bill: Bill | null }
  | { kind: 'confirmed'; order: Order; items: OrderItem[]; bill: Bill | null };

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
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  async submitOrder(dto: SubmitOrderTcpRequest): Promise<SubmitOrderTcpResponse> {
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);

    const snapshot = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
    if (snapshot.cartVersion !== dto.expectedCartVersion) {
      throw new BusinessException(ErrorCode.CART_VERSION_CONFLICT, HttpStatus.CONFLICT);
    }
    if (snapshot.items.length === 0) {
      throw new BusinessException(ErrorCode.ORDER_EMPTY_CART, HttpStatus.BAD_REQUEST);
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
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
      await this.recalculateBillTotals(manager, bill, dto.tenantId);
      await manager.save(Bill, bill);

      session.orderCount += 1;
      session.currentBillId = bill.id;
      await manager.save(Session, session);

      return { kind: 'created', order, bill, items } satisfies SubmitTxOutcome;
    });

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

  private async recalculateBillTotals(manager: EntityManager, bill: Bill, tenantId: string): Promise<void> {
    const ids = (bill.orderIds ?? []).filter(Boolean);
    if (ids.length === 0) {
      bill.subtotal = 0;
      bill.total = bill.roundingAmount;
      return;
    }
    const orders = await manager.find(Order, { where: { id: In(ids), tenantId } });
    const byId = new Map(orders.map((o) => [o.id, o]));
    bill.subtotal = ids.reduce((sum, id) => sum + (byId.get(id)?.totalAmount ?? 0), 0);
    bill.total = bill.subtotal + bill.roundingAmount;
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
      if (e instanceof RpcException) {
        const err = e.getError() as { code?: number; errorCode?: ErrorCode; message?: string };
        if (err?.errorCode) {
          throw new BusinessException(err.errorCode, (err.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
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
