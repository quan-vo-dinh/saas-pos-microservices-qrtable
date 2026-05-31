import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { Session } from '@common/entities/session.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { StaffOrderActionTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { OrderActionTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import type { Bill as BillDto, Order as OrderDto, OrderItem as OrderItemDto } from '@einvoice/types';
import { BillStatus, OrderItemStatus, OrderStatus, OrderStatusChangedEvent } from '@einvoice/types';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CONFIGURATION } from '../../../../configuration';
import { buildOrderConfirmedKafkaPayload } from '../order-confirmed-payload';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { CatalogStockGatewayService } from './catalog-stock-gateway.service';

type ConfirmTxOutcome =
  | { kind: 'replay'; order: Order; items: OrderItem[]; bill: Bill | null }
  | { kind: 'confirmed'; order: Order; items: OrderItem[]; bill: Bill | null };

type StockCompensationPayload = {
  tenantId: string;
  orderId: string;
  items: Array<{ menuItemId: string; quantity: number }>;
};

@Injectable()
export class OrderConfirmSagaService {
  private readonly logger = new Logger(OrderConfirmSagaService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly billRepository: BillRepository,
    private readonly catalogStockGateway: CatalogStockGatewayService,
  ) {}

  async confirmOrder(dto: StaffOrderActionTcpRequest): Promise<OrderActionTcpResponse> {
    let compensationPayload: StockCompensationPayload | null = null;
    let stockDeducted = false;
    let outcome: ConfirmTxOutcome | null = null;

    try {
      outcome = await this.dataSource.transaction(async (manager) => {
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
        compensationPayload = {
          tenantId: dto.tenantId,
          orderId: order.id,
          items: items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
        };

        await this.catalogStockGateway.deductForOrder({
          ...compensationPayload,
          idempotencyKey: `confirm-order:${order.id}`,
        });
        stockDeducted = true;

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

      stockDeducted = false;
      compensationPayload = null;
    } catch (error) {
      if (stockDeducted && compensationPayload) {
        await this.compensateStock(compensationPayload, error);
      }
      throw error;
    }

    if (!outcome) {
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return this.buildConfirmResponse(dto, outcome);
  }

  private async compensateStock(payload: StockCompensationPayload, originalError: unknown): Promise<void> {
    try {
      await this.catalogStockGateway.releaseForOrder({
        ...payload,
        idempotencyKey: `confirm-order-compensation:${payload.orderId}`,
      });
    } catch (compensationError) {
      const message = [
        'Order confirm compensation failed',
        `tenantId=${payload.tenantId}`,
        `orderId=${payload.orderId}`,
        `idempotencyKey=confirm-order-compensation:${payload.orderId}`,
        `originalError=${this.getErrorMessage(originalError)}`,
        `compensationError=${this.getErrorMessage(compensationError)}`,
      ].join(' ');
      this.logger.error(message, this.getErrorStack(compensationError));
    }
  }

  private buildConfirmResponse(dto: StaffOrderActionTcpRequest, outcome: ConfirmTxOutcome): OrderActionTcpResponse {
    const orderStatusChanged: OrderStatusChangedEvent = {
      tenantId: dto.tenantId,
      orderId: outcome.order.id,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.PROCESSING,
      changedByUserId: dto.userId,
      timestamp: (outcome.order.confirmedAt ?? new Date()).toISOString(),
    };

    return {
      order: this.toOrderDto(outcome.order, outcome.items),
      bill: outcome.bill ? this.toBillDto(outcome.bill) : undefined,
      events: { orderStatusChanged },
    };
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

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
