/**
 * Realtime event payloads — Phase 2A QRTable.
 * Includes BFF Direct WebSocket events + Kafka topic payload + derived data shapes.
 *
 * BFF Direct (4P+2AP — Anti-Pattern 1, no Kafka):
 *   - OrderCreatedEvent       → emit khi customer submit order thành công
 *   - OrderStatusChangedEvent → emit khi order status thay đổi
 *   - ServiceRequestedEvent   → emit khi customer trigger service request
 *
 * Kafka (4 Producers — domain events post-confirmation):
 *   - OrderConfirmedEvent     → topic `order.confirmed` cho cross-service consumers
 *
 * Data shapes (not events themselves):
 *   - KDSTicket               → derived view cho UI render kitchen/bar tickets
 *
 * @see docs/guides/kafka-qrtable.md (4P+2AP rationale)
 * @see docs/superpowers/specs/2026-04-19-step-2.3-shared-types-design.md
 */

import type { OrderItem, OrderStatus } from './order.types';
import type { ServiceRequestType } from './service-request.types';

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
export type OrderConfirmedEvent = {
  tenantId: string;
  orderId: string;
  sessionId: string;
  items: OrderItem[];
  totalAmount: number;
  /** ISO 8601 — confirmation time */
  confirmedAt: string;
  /** Staff Keycloak sub */
  confirmedByUserId: string;
};

// ─── Derived data shapes (not events) ───────────────

/**
 * Data structure cho KDS render (kitchen + bar tickets).
 * Derived view từ Order + Menu metadata; không phải standalone event ở Phase 2A.
 *
 * Phase 2B sẽ promote thành Kafka event độc lập (`kitchen.ticket.created`,
 * `bar.ticket.created`) nếu cần per-station routing.
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
