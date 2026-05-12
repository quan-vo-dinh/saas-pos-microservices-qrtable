import { Injectable } from '@nestjs/common';
import { buildTenantCustomersSocketRoom, buildTenantSlugCustomersSocketRoom } from '@common/constants/saas.constants';
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
    const roomCustomer = `session:${event.sessionId}:customer`;
    const roomStaff = `tenant:${event.tenantId}:staff`;
    this.gateway.emitToRoom(roomCustomer, 'events.cartUpdated', event);
    this.gateway.emitToRoom(roomStaff, 'events.cartUpdated', event);
  }

  emitOrderCreated(event: OrderCreatedEvent): void {
    const roomCustomer = `session:${event.sessionId}:customer`;
    const roomStaff = `tenant:${event.tenantId}:staff`;
    this.gateway.emitToRoom(roomCustomer, 'events.orderCreated', event);
    this.gateway.emitToRoom(roomStaff, 'events.orderCreated', event);
  }

  emitOrderStatusChanged(event: OrderStatusChangedEvent, sessionId?: string): void {
    const roomStaff = `tenant:${event.tenantId}:staff`;
    this.gateway.emitToRoom(roomStaff, 'events.orderStatusChanged', event);
    if (sessionId) {
      this.gateway.emitToRoom(`session:${sessionId}:customer`, 'events.orderStatusChanged', event);
    }
  }

  emitServiceRequested(event: ServiceRequestedEvent): void {
    const roomCustomer = `session:${event.sessionId}:customer`;
    const roomStaff = `tenant:${event.tenantId}:staff`;
    this.gateway.emitToRoom(roomCustomer, 'events.serviceRequested', event);
    this.gateway.emitToRoom(roomStaff, 'events.serviceRequested', event);
  }

  emitBillRequested(event: BillRequestedEvent): void {
    const roomCustomer = `session:${event.sessionId}:customer`;
    const roomStaff = `tenant:${event.tenantId}:staff`;
    this.gateway.emitToRoom(roomCustomer, 'events.billRequested', event);
    this.gateway.emitToRoom(roomStaff, 'events.billRequested', event);
  }

  emitTableTransferred(event: TableTransferredEvent): void {
    const roomCustomer = `session:${event.sessionId}:customer`;
    const roomStaff = `tenant:${event.tenantId}:staff`;
    this.gateway.emitToRoom(roomCustomer, 'events.tableTransferred', event);
    this.gateway.emitToRoom(roomStaff, 'events.tableTransferred', event);
  }

  emitKdsQueueChanged(event: KdsQueueChangedEvent): void {
    const tid = event.tenantId;
    const stationRoom = event.station === 'KITCHEN' ? `tenant:${tid}:kds:kitchen` : `tenant:${tid}:kds:bar`;
    this.gateway.emitToRoom(stationRoom, 'events.kdsQueueChanged', event);
    this.gateway.emitToRoom(`tenant:${tid}:management`, 'events.kdsQueueChanged', event);
  }

  emitKitchenItemReady(event: KitchenItemReadyEvent): void {
    this.gateway.emitToRoom(`tenant:${event.tenantId}:staff`, 'events.kitchenItemReady', event);
    this.gateway.emitToRoom(`session:${event.sessionId}:customer`, 'events.kitchenItemReady', event);
  }

  emitKitchenSlaWarning(event: KitchenSlaWarningEvent): void {
    const tid = event.tenantId;
    const stationRoom = event.station === 'KITCHEN' ? `tenant:${tid}:kds:kitchen` : `tenant:${tid}:kds:bar`;
    this.gateway.emitToRoom(stationRoom, 'events.kitchenSlaWarning', event);
    this.gateway.emitToRoom(`tenant:${tid}:management`, 'events.kitchenSlaWarning', event);
  }

  emitPaymentCompleted(event: PaymentCompletedRealtimeEvent): void {
    this.gateway.emitToRoom(`session:${event.sessionId}:customer`, 'events.paymentCompleted', event);
    this.gateway.emitToRoom(`tenant:${event.tenantId}:staff`, 'events.paymentCompleted', event);
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
    const idRoom = buildTenantCustomersSocketRoom(params.tenantId);
    const slugRoom = buildTenantSlugCustomersSocketRoom(params.tenantSlug);
    this.gateway.emitToRoom(idRoom, params.eventName, payload);
    if (params.tenantSlug?.trim()) {
      this.gateway.emitToRoom(slugRoom, params.eventName, payload);
    }
  }
}
