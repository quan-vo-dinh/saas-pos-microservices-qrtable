import type {
  Bill,
  CartSnapshot,
  Order,
  ServiceRequest,
  Session,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  CartUpdatedEvent,
  ServiceRequestedEvent,
  BillRequestedEvent,
  TableTransferredEvent,
} from '@einvoice/types';

export type OrderTcpResponse = Order;
export type SessionTcpResponse = Session;
export type CartTcpResponse = CartSnapshot;
export type BillTcpResponse = Bill;
export type ServiceRequestTcpResponse = ServiceRequest;

export type SubmitOrderTcpResponse = {
  order: Order;
  bill: Bill;
  cart: CartSnapshot;
  events: {
    cartUpdated: CartUpdatedEvent;
    orderCreated: OrderCreatedEvent;
  };
};

export type OrderActionTcpResponse = {
  order: Order;
  bill?: Bill;
  events: {
    orderStatusChanged: OrderStatusChangedEvent;
  };
};

export type ServiceRequestCreatedTcpResponse = {
  request: ServiceRequest;
  events: {
    serviceRequested: ServiceRequestedEvent;
  };
};

export type BillRequestedTcpResponse = {
  bill: Bill;
  request: ServiceRequest;
  cart: CartSnapshot;
  events: {
    billRequested: BillRequestedEvent;
    serviceRequested: ServiceRequestedEvent;
    cartUpdated: CartUpdatedEvent;
  };
};

export type TableTransferredTcpResponse = {
  session: Session;
  events: {
    tableTransferred: TableTransferredEvent;
  };
};
