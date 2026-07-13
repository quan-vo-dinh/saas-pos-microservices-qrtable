# Phase 2A — QR Order Flow, Order Service & Kafka

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- QR customer sessions, Redis-backed shared carts, orders, bills, service requests, table transfer, safe empty-session release, and staff POS actions.
- Order confirmation, Catalog stock orchestration, and the Order outbox publication of `order.confirmed`.

## Accepted Decisions

- Order owns sessions, carts, orders, order items, bills, service requests, and Order outbox rows; Catalog owns QR/table/stock/menu/station truth.
- Redis session/cart entries are operational caches; PostgreSQL and explicit validation decide durable session/order state.
- `DRAFT` is UI/cart-only; submit creates `PENDING`; staff confirmation deducts stock and moves the order to `PROCESSING`.
- Realtime packets are invalidation hints. REST snapshots are the rendering source after reconnect or mutation.
- Kafka is used for durable post-confirmation events; BFF Direct provides immediate client hints after successful commands.

## Final Business Behavior

- A guest joins or safely creates a QR-table session, edits a versioned shared cart, and submits an idempotent order.
- Staff confirms, cancels, serves, transfers, or safely releases eligible sessions according to role and state rules.
- An eligible bill request locks the cart, changes the bill to pending payment, and changes the table to billing.

## Final Technical Behavior

- Order persists tenant-scoped session/order/bill data, coordinates Catalog TCP stock commands, and publishes the `order.confirmed` outbox event using the shared Kafka topic.
- BFF enforces customer/session and staff/permission context, exposes REST routes, and emits session/staff realtime hints.
- Customer PWA and Management App reconcile optimistic actions and realtime events by refetching session-scoped snapshots.

## Acceptance Evidence

- Order domain services, repositories, TCP contracts, BFF controllers, realtime fan-out, shared contracts, and focused unit/integration/UI tests exist.
- Evidence covers session join/recovery, cart-version conflicts, submit/confirm/cancel/serve, bill request, service requests, table transfer, safe release, and Kafka payload construction.

## Deferred Work

- KDS ticket materialization is Phase 2B; settlement/refund and payment-driven completion are Phase 3.
- Durable replay, CDC-grade outbox hardening, offline queues, and production event monitoring remain later hardening.
