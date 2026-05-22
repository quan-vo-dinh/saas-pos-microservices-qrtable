import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { MarkOrderItemsReadyTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { KitchenItemReadyEvent, KdsActiveOrderSnapshot } from '@einvoice/types';
import { OrderItemStatus } from '@einvoice/types';
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class OrderKdsEventService {
  toKdsActiveOrderSnapshot(order: Order, items: OrderItem[]): KdsActiveOrderSnapshot {
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

  assertKdsStationTargets(items: OrderItem[], targetIds: string[], station: OrderItem['station']): void {
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

  noKitchenProcessingItemsRemaining(items: OrderItem[]): boolean {
    return !items.some((i) => i.status !== OrderItemStatus.CANCELED && i.status === OrderItemStatus.PROCESSING);
  }

  hasKitchenProcessingItems(items: OrderItem[]): boolean {
    return items.some((i) => i.status !== OrderItemStatus.CANCELED && i.status === OrderItemStatus.PROCESSING);
  }

  buildKitchenItemReadyEvent(
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
}
