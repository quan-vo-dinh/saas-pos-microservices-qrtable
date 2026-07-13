# Phase 2B — Kitchen Service & WebSocket

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Redis-only Kitchen Display System (KDS), station queues, ticket lifecycle, priority, recall, SLA warnings, recovery, and order-ready synchronization.
- Kafka consumption of `order.confirmed`, production of `kitchen.sla_warning`, and authenticated BFF Socket.IO fan-out.

## Accepted Decisions

- Kitchen owns active KDS state in Redis only; Order remains the source of truth for customer-visible order state.
- One `(tenantId, orderId, station)` ticket is created from immutable event station snapshots; missing station data is dead-lettered rather than inferred.
- KDS queue changes use Kitchen Redis Pub/Sub internally and BFF WebSocket hints externally; neither is a replay log.
- Clients mutate KDS through guarded HTTP/TCP commands and refetch REST snapshots after hints, reconnects, or mutations.
- KDS batching is rejected as a product behavior, not silently deferred.

## Final Business Behavior

- Confirmed items are split to Kitchen or Bar tickets; Chef and Barista see only permitted station queues while Owner/Manager can access both.
- Tickets move through pending, processing, ready, voided, and archived operational states; ready items synchronize back to Order.
- Priority and recall follow permission/window rules, and SLA warnings notify the appropriate management and station audiences.

## Final Technical Behavior

- Kitchen uses tenant-scoped Redis ticket, queue, revision, dedupe, dead-letter, SLA, and recovery keys through its repository façade.
- Kafka processing is idempotent by event and station-ticket identity; KDS notifications flow through shared rooms and the `/orders` Socket.IO namespace.
- BFF validates staff JWT or customer session context, derives rooms server-side, rejects client-directed joins, and coordinates KDS/Order commands.

## Acceptance Evidence

- Kitchen consumer, Redis stores, SLA/recovery services, BFF KDS routes/realtime components, shared contracts, and frontend KDS/realtime hooks are implemented.
- Focused tests cover Redis/Kafka/SLA/recovery behavior, role/station access, KDS mutations, and snapshot-refetch client behavior.

## Deferred Work

- Durable realtime replay, Redis Streams, CDC replay, kitchen analytics, and production SLA/dead-letter operations remain hardening work.
- Menu realtime and payment settlement remain outside Kitchen ownership.
