# Phase 2B — Kitchen Service + WebSocket

> **Status:** Done
> **Canonical Role:** Final phase record after implementation/audit.
> **Last Updated:** 2026-05-13

## Final Scope

Phase 2B completes the KDS realtime layer for QRTable: Kitchen service consumes Kafka `order.confirmed`, creates Redis KDS tickets by station, operates kitchen/bar queue, issues SLA warnings, and BFF WebSocket Gateway distributes realtime hints to the correct role/session.

The final scope includes:

- Kitchen service Redis-only for KDS ticket state, station queues, priority, recall, void/archive, table snapshot patch, SLA metadata and recovery rebuild from active Order snapshots.
- Kafka consumer `order.confirmed` and producer `kitchen.sla_warning`; Do not add a Kafka topic for each queue change.
- WebSocket namespace `/orders` with Socket.IO Redis Adapter, server-managed room assignment, staff JWT auth, customer session auth, and legacy join rejection.
- BFF KDS REST edge: queue snapshot, start ticket, mark done/ready, recall, set priority, station access checks and Order sync on ready.
- Customer PWA, Management POS and Management KDS realtime hooks that treat WebSocket messages as invalidation hints and refetch REST/TanStack Query snapshots.

## Accepted Decisions

- Kitchen service owns KDS prep state only. Order service remains source of truth for customer-visible order state; Redis KDS snapshot is source of truth for KDS screen state.
- Kitchen service has no PostgreSQL/MongoDB persistence. Redis keys are tenant-scoped and optimized for active operational queues.
- `order.confirmed` creates at most one ticket per `(tenantId, orderId, station)`. Items are split by immutable station snapshot from the event: `KITCHEN` or `BAR`.
- Missing item station is dead-lettered in Redis instead of guessed from category/name. Frontend never routes food/drink by display text.
- KDS batching/item batching/order batching is rejected, not deferred. Cart line merging before submit is unrelated and remains allowed.
- Queue order is FIFO with priority override. Priority is a separate permission-backed action (`kitchen.set_priority` / `KITCHEN_SET_PRIORITY`), not part of generic ticket update permission.
- BFF does not emit KDS queue hints directly from Kafka `order.confirmed`. Kitchen writes Redis first, then publishes internal Redis Pub/Sub `kds.queue_changed`; BFF emits `events.kdsQueueChanged` after that.
- WebSocket is a realtime hint channel. REST snapshots are the rendering source after reconnect, mutation, missed event or tab wake.
- KDS mutations are guarded HTTP commands through BFF and TCP to Kitchen/Order. Clients do not mutate KDS over WebSocket.
- Staff rooms are derived server-side from auth context: tenant staff, station KDS rooms and management room. Customer room is derived from validated tenant/session.
- Step 2B does not implement menu realtime. Existing menu cache/invalidation behavior remains separate.

## Final Business Behavior

When staff confirms an order, Order Service publishes `order.confirmed`. Kitchen Service validates the event, partitions active order items by station, writes one KDS ticket per station to Redis, increments station revision and publishes a queue-changed internal event. KDS clients receive `events.kdsQueueChanged`, filter by tenant/station, then refetch queue snapshot.

Chef sees `KITCHEN` tickets; Barista sees `BAR` tickets; Owner/Manager can access both stations and may opt into station rooms. WAITER receives staff order/service hints but not station queue rooms by default.

Ticket lifecycle is `PENDING -> PROCESSING -> READY`, with `VOIDED`/`ARCHIVED` for removal paths. Start moves a ticket into processing. Done moves ticket items to ready in Kitchen, then BFF calls Order Service to mark corresponding order items ready. If Order sync fails, BFF attempts recall compensation. When all active items on an order are ready, Order can move `PROCESSING -> READY` and emit customer/staff status hints.

Recall is allowed only inside the configured recall window after a ticket becomes ready. Recall returns ticket/items to processing and re-adds SLA tracking when applicable.

Priority can be toggled for active pending/processing tickets, affects queue score/order and emits queue-changed hints. Priority is intended for Owner/Manager workflows and guarded by `kitchen.set_priority`.

SLA worker scans `kds:sla:due`, emits Kafka `kitchen.sla_warning` at warning/breach levels, updates ticket warning state and emits `events.kitchenSlaWarning`/queue invalidation to management and station rooms.

Table transfer patches active KDS tickets for the session so KDS reflects the new table name/id. Processing-order cancel voids active tickets. Reconnect, network recovery and tab visibility recovery all converge by refetching REST snapshots.

## Final Technical Behavior

Service ownership after Phase 2B:

- Kitchen Service owns Redis KDS keys: ticket hashes, ticket item hashes, `kds:{tenantId}:kitchen`, `kds:{tenantId}:bar`, ready queues, revision keys, dedupe keys, dead-letter keys, session/order ticket indexes, `kds:sla:due`, SLA claim/dedupe keys and rebuild locks.
- Kitchen Kafka consumer reads `order.confirmed` with at-least-once semantics and idempotency by `eventId` plus `(tenantId, orderId, station)`.
- Kitchen SLA worker produces `kitchen.sla_warning`; BFF Kafka bridge consumes that topic and emits `events.kitchenSlaWarning`.
- Kitchen internal events use Redis Pub/Sub channel `realtime:kds:{tenantId}` for `kds.queue_changed`; BFF subscriber maps them to station/management WebSocket rooms.
- BFF KDS controller exposes `GET /admin/kds/queue`, `POST /admin/kds/tickets/:ticketId/start`, `done`, `recall` and `priority`, guarded by permissions and station-role checks.
- BFF Order/Kitchen orchestration syncs `done` to Order Service, emits `events.kitchenItemReady`, emits `events.orderStatusChanged` when order readiness changes, and patches/voids KDS tickets on table transfer or processing cancel.
- WebSocket gateway runs namespace `/orders`, accepts staff `auth.token` or Authorization bearer fallback, accepts customer `auth.tenantId/sessionId` with header fallback, and rejects client-driven `join.session` / `join.staff`.
- Socket.IO Redis Adapter supports multi-instance room fan-out. Realtime auth caches valid staff token checks and derives rooms from JWT roles and tenant.
- Management KDS uses real `KdsQueueSnapshot` API, invalidates/refetches on `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`, reconnect and explicit mutations.
- Customer PWA and Management POS listen to order/status/bill/payment/kitchen-ready events, filter tenant/session, and refetch snapshots instead of building domain state from packets.

## Acceptance Evidence

Implementation evidence present in the repo on 2026-05-13:

- `apps/kitchen` contains the Kafka consumer, Redis repository, ticket service, SLA worker, recovery service, Kafka producer and internal Redis publisher for KDS.
- `libs/shared/types/src/lib/kds.types.ts` defines KDS ticket, queue snapshot, queue changed, kitchen item ready, SLA warning and active-order snapshot contracts.
- BFF realtime module includes Socket.IO gateway, auth service, Redis adapter, KDS internal subscriber, Kafka bridge and event fan-out service.
- BFF Kitchen controller and station-access service enforce queue/action permissions, station boundaries and Order sync for ready events.
- Management App KDS services/hooks/components consume live queue APIs, perform strict refetch-after-mutation and filter realtime by tenant/station.
- Customer PWA and Management POS realtime hooks listen to `/orders`, clean up listeners, handle reconnect states and invalidate active query domains.
- Focused tests exist for Kitchen Redis/Kafka/SLA/recovery behavior, BFF realtime/KDS controllers, shared KDS contracts, Management KDS query/realtime behavior and Customer/POS realtime hooks.

## Handoff / Deferred Work

- Durable WebSocket replay, Redis Streams, CDC/outbox replay for KDS packets and historical kitchen analytics remain future hardening. Current contract is snapshot plus hint.
- Production readiness still needs provider-level Kafka/Redis monitoring, SLA tuning per tenant, dead-letter dashboards, and runbooks for Redis state rebuild.
- Menu realtime remains intentionally out of Phase 2B; do not add `menu.updated` or `events.menuUpdated` without a new product decision.
- Payment-completed realtime bridge is present for later phases, but payment settlement behavior belongs to the payment phases, not Kitchen ownership.
- KDS batching is not a backlog item under another name; future prep optimization must preserve ticket source-of-truth rules and pass a new design review.
