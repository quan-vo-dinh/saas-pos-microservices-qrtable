/**
 * Realtime event payloads — Phase 2A QRTable.
 * Includes BFF Direct WebSocket events + Kafka topic payload + derived data shapes.
 *
 * BFF Direct (4P+2AP — Anti-Pattern 1, no Kafka):
 *   - OrderCreatedEvent       → emit khi customer submit order thành công
 *   - OrderStatusChangedEvent → emit khi order status thay đổi
 *   - ServiceRequestedEvent   → emit khi customer trigger service request
 *   - CartUpdatedEvent        → cart mutation / lock (Step 2.4)
 *   - BillRequestedEvent      → explicit bill request (Step 2.4)
 *   - TableTransferredEvent   → transfer table saga hoàn tất (Step 2.4)
 *   - PaymentCompletedRealtimeEvent → Kafka bridge hint after Payment outbox event (Phase 3)
 *
 * Kafka (4 Producers — domain events post-confirmation):
 *   - OrderConfirmedEvent     → topic `order.confirmed` cho cross-service consumers
 *
 * Data shapes (not events themselves):
 *   - KDSTicket               → Phase 2A derived view cho mock/UI render
 *
 * @see docs/guides/kafka-qrtable.md (4P+2AP rationale)
 * @see docs/superpowers/specs/2026-04-19-step-2.3-shared-types-design.md
 * @see docs/business-logic-step-2.4-spec.vi.md §15
 */

import type { OrderItem, OrderStatus } from './order.types';
import type { PreparationStation } from './menu.types';
import type { ServiceRequestType } from './service-request.types';
import type { CartLine } from './session.types';

// ─── BFF Direct WebSocket events ────────────────────

/**
 * BFF Direct → WebSocket emit khi customer submit order thành công.
 * Channel: per-tenant POS dashboard subscription.
 */
export type OrderCreatedEvent = {
  tenantId: string;
  orderId: string;
  tableId: string;
  tableName: string;
  sessionId: string;
  items: OrderItem[];
  totalAmount: number;
  /** ISO 8601 — emit time */
  timestamp: string;
};

/**
 * BFF Direct → WebSocket emit khi order status thay đổi (confirm/cancel/etc).
 * Channels:
 *   - per-session subscription (customer tracking page)
 *   - per-tenant POS dashboard (staff live view)
 */
export type OrderStatusChangedEvent = {
  tenantId: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  /** Staff Keycloak sub, undefined nếu customer hành động (vd: customer cancel DRAFT) */
  changedByUserId?: string;
  timestamp: string;
};

/**
 * BFF Direct → WebSocket emit khi customer trigger service request.
 * Channel: per-tenant POS dashboard.
 */
export type ServiceRequestedEvent = {
  tenantId: string;
  requestId: string;
  tableId: string;
  tableName: string;
  sessionId: string;
  type: ServiceRequestType;
  note?: string;
  timestamp: string;
};

/** BFF Direct — shared cart / lock state (Step 2.4 §15.3) */
export type CartUpdatedEvent = {
  tenantId: string;
  sessionId: string;
  cartVersion: number;
  /** ACTIVE | LOCKED (bill request) — string để mở rộng sau */
  status: 'ACTIVE' | 'LOCKED';
  items: CartLine[];
  updatedAt: string;
  changedBySessionClientId?: string;
};

/** BFF Direct — sau explicit bill request thành công */
export type BillRequestedEvent = {
  tenantId: string;
  billId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  status: 'PENDING_PAYMENT';
  total: number;
  requestedAt: string;
};

/** BFF Direct — transfer table saga hoàn tất */
export type TableTransferredEvent = {
  tenantId: string;
  sessionId: string;
  fromTableId: string;
  fromTableName: string;
  toTableId: string;
  toTableName: string;
  transferredByUserId: string;
  timestamp: string;
};

/** BFF Direct — hint sau khi Payment hoàn tất (polling vẫn là nguồn chuẩn). */
export type PaymentCompletedRealtimeEvent = {
  eventId: string;
  eventType: 'payment.completed';
  tenantId: string;
  sessionId: string;
  billId: string;
  paymentId: string;
  method: 'CASH' | 'VIETQR';
  status: 'PAID';
  paidAt: string;
  amount: number;
  correlationId?: string;
};

// ─── Kafka topic payload ────────────────────────────

/**
 * Kafka topic `order.confirmed` payload.
 * Producer: Order Service (Step 2.4).
 * Consumers:
 *   - Kitchen Service (Phase 2B) — render KDS tickets
 *   - Notification Service (Phase 4C) — staff notifications
 *   - Analytics Service (future) — revenue tracking
 *
 * Partition key: tenantId (per Kafka ADR partition strategy).
 */
/** Payload item cho Kafka — có station cho KDS routing */
export type OrderConfirmedEventItem = OrderItem & {
  station?: PreparationStation;
};

export type OrderConfirmedEvent = {
  eventId: string;
  eventType: 'order.confirmed';
  schemaVersion: 1;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  items: OrderConfirmedEventItem[];
  totalAmount: number;
  /** ISO 8601 — confirmation time */
  confirmedAt: string;
  /** Staff Keycloak sub */
  confirmedByUserId: string;
  /** ISO 8601 — wall-clock event time */
  occurredAt: string;
  correlationId?: string;
};

// ─── Derived data shapes (not events) ───────────────

/**
 * Data structure cho KDS render (kitchen + bar tickets).
 * Derived view từ Order + Menu metadata; không phải standalone event ở Phase 2A.
 *
 * Step 2.6 richer KDS contracts live in `kds.types.ts`.
 */
export type KDSTicket = {
  /** Initially = orderId; Phase 2B có thể split per-station (kitchen-{orderId}, bar-{orderId}) */
  ticketId: string;
  tenantId: string;
  orderId: string;
  tableId: string;
  tableName: string;
  items: OrderItem[];
  /** VIP/rush flag, Phase 2B logic */
  priority: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** SLA timer threshold per item category — Phase 2B determines per item type */
  slaSeconds: number;
};
