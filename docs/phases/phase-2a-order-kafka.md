# Phase 2A — QR Order Flow + Order/Kafka

> **Status:** Done
> **Canonical Role:** Final phase record after implementation/audit.
> **Last Updated:** 2026-05-13

## Final Scope

Phase 2A completes the QR ordering platform for QRTable: customers enter the session using QR, use shared cart, submit order, staff confirm/cancel/serve, bill is collected by session, service request is sent to POS, and Order service publishes Kafka `order.confirmed` for post-processing consumers.

The final scope includes:

- QR customer session flow: validate QR/table via Catalog, create or join active session, persist session in Order PostgreSQL and cache active session in Redis.
- Shared cart by session: Redis cart, optimistic `cartVersion`, conflict when client uses old version, lock cart when bill is waiting for payment.
- Order lifecycle: cart/UI `DRAFT`, DB order starts from `PENDING`, staff confirm to `PROCESSING`, kitchen can send order/item to `READY`, service staff to `SERVED`, cancel according to state, and `COMPLETED` belongs to payment completion in the next phase.
- Bill/session lifecycle: a current bill for the active session, created at the first order submission, aggregate orders that have not been canceled, `OPEN -> PENDING_PAYMENT` when the customer requests the bill.
- Order service ownership for orders, order items, sessions, bills, service requests, cart/session Redis semantics, and simplified outbox for Kafka.
- BFF customer/admin REST routes, BFF Direct realtime events, Customer PWA order/cart/bill flows, and Management POS order/service/table surfaces.

## Accepted Decisions

- Order service is the source of truth for session, cart snapshot, order, order item, bill and service request; Catalog is the source of truth for menu items, stock, table status, QR token and `MenuItem.station`.
- Session is a durable entity in PostgreSQL. Redis key `session:{tenantId}:{sessionId}` is an active cache with a TTL of 2 hours; idle close after 30 minutes only applies when `orderCount == 0`.
- Cart is in Redis key `cart:{tenantId}:{sessionId}` with `cartVersion`. REST snapshot is the standard data source after reconnection; WebSocket/realtime event is just a hint to invalidate/refetch.
- `DRAFT` does not create DB order row. Submit cart creates order `PENDING`, clear cart after success, and use `idempotencyKey` to avoid repeated submissions.
- Submit only validates snapshot availability. Stock deduction only occurs when staff confirm `PENDING -> PROCESSING` via Catalog TCP transactional command (`STOCK_DEDUCT_FOR_ORDER`); cancel processing calls release/restore via Catalog policy (`STOCK_RELEASE_FOR_ORDER`).
- Kafka is only used for post-confirmation domain events: Order service records outbox `order.confirmed`, publisher sends topic with partition key `tenantId` and payload has table/session/item/station snapshot.
- Realtime UI does not go through Kafka in Phase 2A. BFF broadcasts direct events after TCP success: `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.billRequested`, `events.tableTransferred`.
- Bill request is an explicit command. `REQUEST_BILL` service request is a notification/audit side effect, does not replace the command request bill.
- Bill request requires an empty cart and orders that have not been canceled have been served; When valid, bill goes to `PENDING_PAYMENT`, cart goes to `LOCKED`, table goes to `billing`.
- Customer only cancels order `PENDING` in his session. Staff cancel separates permissions `order.cancel_pending` and `order.cancel_processing`; cancel processing requires reason.
- Switch tables using saga-style consistency with Redis locks, Order DB update, Catalog table status update and realtime `tableTransferred`; Does not require ACID transactions across all stores.

## Final Business Behavior

Guests scan the QR to join the session. If the table is available, the system creates a new session, sets the table occupied via Catalog and caches the session for the PWA. If the occupied table has a valid session, the customer rejoins that session. Tables that are billing or cleaning do not accept new order sessions.

Customers add/edit/delete items in cart according to `expectedCartVersion`; The server rejects the old mutation with a conflict so the client can refetch the snapshot. Cart line can combine the same items/notes in the same session before submitting; This is cart behavior, not KDS batching.

When submitting an order, Order service persist order `PENDING`, order items, current bill if not available, increase `orderCount`, clear cart, and BFF emit `events.orderCreated` and `events.cartUpdated`. POS staff reads orders via BFF admin routes and receives realtime hints for refetching.

When staff confirms, Order service locks the order, deducts stock via Catalog, transfers order to `PROCESSING`, creates outbox `order.confirmed`, and BFF emits `events.orderStatusChanged`. Kitchen/KDS Phase 2B consumes this Kafka event to create station tickets.

Customer or staff can cancel `PENDING`; Owner/Manager can cancel `PROCESSING` with reason, Order service updates bill totals and calls Catalog release stock. Canceled orders do not participate in the total bill.

Customer requests bill after cart is empty and item is served. Bill transfers `PENDING_PAYMENT`, cart is locked, table transfers billing, and staff receives service/bill realtime hint. Full payment, refund, split bill and settlement belong to the following phases, although the current code has expansion points for Phase 3+.

service requests `CALL_STAFF`, `GENERAL_HELP`, `REQUEST_BILL` are stored in the Order domain; staff acknowledge/resolve via POS. Table transfer preserves session id, updates table snapshot in Order DB, Redis session metadata, Catalog table statuses and realtime hint.

## Final Technical Behavior

Service ownership after Phase 2A:

- Order Service owns PostgreSQL entities `sessions`, `orders`, `order_items`, `bills`, `service_requests`, `outbox_events`; Redis cart/session semantics; order state transitions; bill request; table transfer; stock-deduct/release orchestration through Catalog; and Kafka `order.confirmed` outbox production.
- Catalog Service owns QR token validation, table status transitions, menu item snapshots, stock and station metadata. Order stores denormalized table/menu/station snapshots for history and display only.
- BFF owns HTTP edge routes, staff permission guards, customer session/tenant context, TCP orchestration, and direct WebSocket emits after successful service responses.
- Customer PWA owns QR session persistence, cart/order/bill API usage, idempotency key creation, optimistic cart UX with server reconciliation, and realtime invalidation/refetch for session-scoped data.
- Management App POS owns staff order list/detail/actions, service-request handling, table transfer surfaces and hybrid polling/realtime invalidation.
- Shared types in `libs/shared/types` define `OrderStatus`, `OrderItemStatus`, `BillStatus`, `SessionStatus`, `ServiceRequestStatus`, transition matrices and event payload contracts shared by FE/BE.

Kafka/event behavior:

- `order.confirmed` payload includes `eventId`, `schemaVersion`, `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, items with station snapshots, totals, confirmation metadata and correlation id.
- `order.status_changed` is the durable Order outbox topic for status projection/audit. BFF Direct remains the immediate WebSocket path for `events.orderStatusChanged` after successful TCP responses.
- Outbox publisher sends pending rows to Kafka and marks success/failure; at-least-once delivery is handled by downstream idempotency.
- BFF Direct events are not replay logs. Clients treat them as realtime hints and refetch REST snapshots.

## Acceptance Evidence

Implementation evidence present in the repo on 2026-05-13:

- Order domain services, repositories and tests cover session join/cache, cart version conflicts, submit/confirm/cancel/serve, bill request/reopen/payment hooks, service requests, transfer table and Kafka payload construction. `OrderService` remains the TCP-facing façade while submit flow, state transitions and KDS event mapping are delegated to focused services.
- BFF customer/admin controllers expose cart, orders, bill, service request, staff order actions and transfer endpoints with tenant/session context and permission guards.
- BFF realtime gateway/service emits cart/order/status/service/bill/transfer hints to session and tenant staff rooms.
- Customer PWA order hooks/services use live BFF APIs for cart, orders, current bill, bill request, idempotency and session-scoped realtime invalidation.
- Management App order/service/table hooks and POS surfaces use live BFF/Catalog APIs with polling plus realtime invalidation.
- Shared type tests cover transition matrices and enum completeness for the Order/Bill/Service Request contracts.

## Handoff / Deferred Work

- Phase 2B owns KDS ticket materialization, station queues, Kitchen Service Redis state, SLA worker, WebSocket hardening and kitchen/customer ready realtime.
- Phase 3+ owns payment execution, cash/VietQR settlement, refund, receipt, payment-driven session close and final bill `PAID -> order COMPLETED` behavior.
- Durable event replay, full CDC/outbox hardening, offline customer/POS queueing, cross-service saga observability and production Kafka/Redis alerting remain operational hardening outside Phase 2A.
- Any future change to order states, bill states, event names or Redis key semantics must update shared types and BFF/customer/management consumers together.
