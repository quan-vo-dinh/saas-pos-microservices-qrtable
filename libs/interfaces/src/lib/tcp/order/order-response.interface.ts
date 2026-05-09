import type {
  Bill,
  CartSnapshot,
  Order,
  ServiceRequest,
  Session,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  CartUpdatedEvent,
  KdsActiveOrderSnapshot,
  KitchenItemReadyEvent,
  ServiceRequestedEvent,
  BillRequestedEvent,
  TableTransferredEvent,
} from '@einvoice/types';

export type OrderTcpResponse = Order;
export type SessionTcpResponse = Session;
export type CartTcpResponse = CartSnapshot;
export type BillTcpResponse = Bill;
export type ServiceRequestTcpResponse = ServiceRequest;

export type BillListTcpResponse = Bill[];

export type ServiceRequestListTcpResponse = ServiceRequest[];

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
  /** Present when a new service request row is created (explicit bill request). */
  request?: ServiceRequest;
  cart: CartSnapshot;
  events: {
    billRequested?: BillRequestedEvent;
    serviceRequested?: ServiceRequestedEvent;
    cartUpdated: CartUpdatedEvent;
  };
};

export type TableTransferredTcpResponse = {
  session: Session;
  events: {
    tableTransferred: TableTransferredEvent;
  };
  /** Denormalized for BFF → Kitchen `PATCH_TABLE_SNAPSHOT` without rereading session */
  kitchenSnapshotPatch: {
    tenantId: string;
    sessionId: string;
    tableId: string;
    tableName: string;
  };
};

/** Current bill for session (may be null before first submit). */
export type BillCurrentTcpResponse = {
  bill: Bill | null;
  cart: CartSnapshot;
};

export type KdsActiveOrdersGetTcpResponse = KdsActiveOrderSnapshot[];

export type MarkOrderItemsReadyTcpResponse = {
  kitchenItemReady: KitchenItemReadyEvent;
  orderStatusChanged?: OrderStatusChangedEvent;
};

export type RevertOrderItemsProcessingTcpResponse = {
  orderStatusChanged?: OrderStatusChangedEvent;
};

export type BillPaymentSnapshotTcpResponse = {
  billId: string;
  tenantId: string;
  sessionId: string;
  status: Bill['status'];
  rawTotal: number;
  roundedTotal: number;
  roundingDelta: number;
};

export type BillMarkedPaidTcpResponse = {
  bill: Bill;
};
