import { Injectable } from '@nestjs/common';
import type {
  BillRequestedEvent,
  CartUpdatedEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
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
}
