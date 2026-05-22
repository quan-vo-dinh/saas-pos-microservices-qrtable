import { Injectable } from '@nestjs/common';
import { WsRoom } from '@common/constants/ws-room.constants';
import type {
  BillRequestedEvent,
  CartUpdatedEvent,
  KdsQueueChangedEvent,
  KitchenItemReadyEvent,
  KitchenSlaWarningEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  PaymentCompletedRealtimeEvent,
  ServiceRequestedEvent,
  TableTransferredEvent,
} from '@einvoice/types';
import { OrderEventsGateway } from '../gateways/order-events.gateway';

@Injectable()
export class RealtimeEventsService {
  constructor(private readonly gateway: OrderEventsGateway) {}

  emitCartUpdated(event: CartUpdatedEvent): void {
    const roomCustomer = WsRoom.customer(event.sessionId);
    const roomStaff = WsRoom.staff(event.tenantId);
    this.gateway.emitToRoom(roomCustomer, 'events.cartUpdated', event);
    this.gateway.emitToRoom(roomStaff, 'events.cartUpdated', event);
  }

  emitOrderCreated(event: OrderCreatedEvent): void {
    const roomCustomer = WsRoom.customer(event.sessionId);
    const roomStaff = WsRoom.staff(event.tenantId);
    this.gateway.emitToRoom(roomCustomer, 'events.orderCreated', event);
    this.gateway.emitToRoom(roomStaff, 'events.orderCreated', event);
  }

  emitOrderStatusChanged(event: OrderStatusChangedEvent, sessionId?: string): void {
    const roomStaff = WsRoom.staff(event.tenantId);
    this.gateway.emitToRoom(roomStaff, 'events.orderStatusChanged', event);
    if (sessionId) {
      this.gateway.emitToRoom(WsRoom.customer(sessionId), 'events.orderStatusChanged', event);
    }
  }

  emitServiceRequested(event: ServiceRequestedEvent): void {
    const roomCustomer = WsRoom.customer(event.sessionId);
    const roomStaff = WsRoom.staff(event.tenantId);
    this.gateway.emitToRoom(roomCustomer, 'events.serviceRequested', event);
    this.gateway.emitToRoom(roomStaff, 'events.serviceRequested', event);
  }

  emitBillRequested(event: BillRequestedEvent): void {
    const roomCustomer = WsRoom.customer(event.sessionId);
    const roomStaff = WsRoom.staff(event.tenantId);
    this.gateway.emitToRoom(roomCustomer, 'events.billRequested', event);
    this.gateway.emitToRoom(roomStaff, 'events.billRequested', event);
  }

  emitTableTransferred(event: TableTransferredEvent): void {
    const roomCustomer = WsRoom.customer(event.sessionId);
    const roomStaff = WsRoom.staff(event.tenantId);
    this.gateway.emitToRoom(roomCustomer, 'events.tableTransferred', event);
    this.gateway.emitToRoom(roomStaff, 'events.tableTransferred', event);
  }

  emitKdsQueueChanged(event: KdsQueueChangedEvent): void {
    const tid = event.tenantId;
    const stationRoom = WsRoom.kds(tid, event.station);
    this.gateway.emitToRoom(stationRoom, 'events.kdsQueueChanged', event);
    this.gateway.emitToRoom(WsRoom.management(tid), 'events.kdsQueueChanged', event);
  }

  emitKitchenItemReady(event: KitchenItemReadyEvent): void {
    this.gateway.emitToRoom(WsRoom.staff(event.tenantId), 'events.kitchenItemReady', event);
    this.gateway.emitToRoom(WsRoom.customer(event.sessionId), 'events.kitchenItemReady', event);
  }

  emitKitchenSlaWarning(event: KitchenSlaWarningEvent): void {
    const tid = event.tenantId;
    const stationRoom = WsRoom.kds(tid, event.station);
    this.gateway.emitToRoom(stationRoom, 'events.kitchenSlaWarning', event);
    this.gateway.emitToRoom(WsRoom.management(tid), 'events.kitchenSlaWarning', event);
  }

  emitPaymentCompleted(event: PaymentCompletedRealtimeEvent): void {
    this.gateway.emitToRoom(WsRoom.customer(event.sessionId), 'events.paymentCompleted', event);
    this.gateway.emitToRoom(WsRoom.staff(event.tenantId), 'events.paymentCompleted', event);
  }

  /** Phase 4B — broadcast tenant lifecycle to all customer sockets for the tenant. */
  emitTenantLifecycle(params: {
    eventName: string;
    tenantId: string;
    tenantSlug: string;
    status: 'SUSPENDED' | 'ACTIVE' | 'CLOSED';
    reason: string | null;
    occurredAt: string;
  }): void {
    const payload = {
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      status: params.status,
      reason: params.reason,
      occurredAt: params.occurredAt,
    };
    const idRoom = WsRoom.customers(params.tenantId);
    const slugRoom = WsRoom.tenantSlugCustomers(params.tenantSlug);
    this.gateway.emitToRoom(idRoom, params.eventName, payload);
    if (params.tenantSlug?.trim()) {
      this.gateway.emitToRoom(slugRoom, params.eventName, payload);
    }
  }
}
