# Backend Analysis Step 2.6 - Order Kafka, KDS, and WebSocket Gateway

> Scope: Phase 2A/2B Step 2.6 business and architecture analysis only. This document is the source of truth before implementation of Kitchen Service, Kafka bridge, Redis KDS state, and hardened WebSocket gateway.

## 1. Executive Summary

Step 2.6 introduces the Kitchen Display System (KDS) and production-grade realtime delivery around the existing Order flow. The authoritative business boundary remains clear: Order Service owns order/session/bill state in PostgreSQL; Catalog Service owns menu, table, and stock state; Kitchen Service owns derived KDS ticket/queue state in Redis; BFF owns API orchestration and WebSocket routing, but no durable domain state.

The central event is `order.confirmed`. It is produced by Order Service after staff confirmation succeeds, after Catalog stock deduction, and after the order is persisted as `PROCESSING`. Kitchen Service consumes that Kafka event idempotently, splits order items by `MenuItem.station`, creates station-specific KDS tickets in Redis, maintains queue ordering/SLA timers, and emits realtime hints through the WebSocket gateway. KDS state is therefore a derived operational view, not the source of truth for customer-visible order state.

Kafka is for asynchronous cross-context domain events and service integration. BFF Direct WebSocket events are for UI cache invalidation or realtime hints emitted immediately after an authoritative REST/TCP command succeeds. This distinction matters: `order.confirmed` and `kitchen.sla_warning` belong to Kafka; events such as `events.orderStatusChanged`, `events.cartUpdated`, and `events.kitchenItemReady` are BFF Direct side effects.

Current repository reality does not yet satisfy Step 2.6. There is no `apps/kitchen` service, Kafka config currently exposes only `order.confirmed`, BFF WebSocket join events are client-controlled, and `@socket.io/redis-adapter` is not installed. Existing Socket.IO events are useful as invalidation hints, but they are not secure enough for staff/customer trust boundaries and do not provide replay after reconnect.

Context7 was used for current NestJS Kafka and WebSocket/Socket.IO Redis adapter guidance. The checked NestJS docs confirm that Kafka consumers should be configured with explicit `clientId`, broker list, and `consumer.groupId`, while multi-instance Socket.IO requires a custom Redis adapter registered with `app.useWebSocketAdapter(...)`. The Redis adapter provides cross-instance room broadcast; it does not make events durable or replay missed packets.

No MCP database or Keycloak resources were available in this Codex session. To avoid guessing, local live checks were performed instead. PostgreSQL schema, Keycloak realm roles/client mappers, and Mongo role-permission mappings were verified against localhost. Those checks confirm that Keycloak exposes `tenant_id` and `sub_role` claims, Mongo roles include `kitchen.get_queue`, `kitchen.update_ticket`, and `kitchen.recall` for OWNER/MANAGER/CHEF/BARISTA, and the current relational schema contains Order/Catalog tables but no Kitchen persistence.

## 2. Domain Model & Ownership

### Bounded Contexts

| Bounded Context | Owns                                                                                                  | Persistence                               | External Communication                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Order           | Order lifecycle, order items, customer session, bill, service requests, transfer command side effects | PostgreSQL + Redis cache for session/cart | REST/TCP through BFF; produces Kafka `order.confirmed`; emits BFF Direct realtime hints |
| Catalog         | Menu item identity, price/name availability, preparation station, table status, stock                 | PostgreSQL                                | TCP from Order/BFF; BFF Direct realtime hints for menu/table changes                    |
| Kitchen         | KDS tickets, station queues, ticket/item prep state, priority, recall window, SLA warning state       | Redis only in Step 2.6                    | Consumes Kafka; publishes Kafka `kitchen.sla_warning`; command API through BFF          |
| BFF Realtime    | Socket authentication, room assignment, WebSocket delivery, Kafka-to-WebSocket bridge                 | No domain persistence                     | REST/TCP orchestration; Socket.IO rooms; Kafka bridge consumer                          |
| Auth/RBAC       | Staff identity, tenant claim, role, permissions                                                       | Keycloak + Mongo role-permission store    | Guards and handshake validation                                                         |

### Aggregate Roots

| Aggregate Root   | Context         | Notes                                                                                                                                                                                           |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Order`          | Order Service   | Source of truth for customer-visible order status. Contains `OrderItem` entities. Status flow already exists: `PENDING -> PROCESSING -> READY -> SERVED -> COMPLETED`, with cancellation paths. |
| `Session`        | Order Service   | Durable customer dining session. Redis session is only an active cache.                                                                                                                         |
| `Bill`           | Order Service   | Source of truth for bill request/payment readiness. Payment completion is future Phase 3 integration.                                                                                           |
| `ServiceRequest` | Order Service   | Source of truth for waiter/service workflow.                                                                                                                                                    |
| `KdsTicket`      | Kitchen Service | Redis aggregate derived from `order.confirmed`. Recommended identity: deterministic `(tenantId, orderId, station)` or stable generated `ticketId` stored with order mapping.                    |

### Entities

| Entity          | Aggregate    | Owner           | Notes                                                                                                     |
| --------------- | ------------ | --------------- | --------------------------------------------------------------------------------------------------------- |
| `OrderItem`     | `Order`      | Order Service   | Current shared type has item status `PROCESSING`, `READY`, `SERVED`, `CANCELED`; no item-level `PENDING`. |
| `KdsTicketItem` | `KdsTicket`  | Kitchen Service | Recommended entity for per-item prep state, quantity, notes, modifiers, and recall granularity.           |
| `KdsBatch`      | Out of scope | N/A             | Superseded by final Step 2.6 decision: no batching/gộp món under any name.                                |
| `MenuItem`      | Catalog      | Catalog Service | Source of truth for current station. `order.confirmed` carries station snapshot for KDS immutability.     |
| `Table`         | Catalog      | Catalog Service | Source of truth for table status. Order/KDS keep snapshots only.                                          |

### Value Objects

| Value Object         | Purpose                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `TenantScopedId`     | Every key/query/event must include `tenantId`; cross-tenant IDs are never trusted alone.                   |
| `PreparationStation` | Canonical values: `KITCHEN`, `BAR`. Owned by Catalog as menu configuration; snapshotted into order events. |
| `PrepSignature`      | Out of scope. Do not create batching keys, grouped quantities, or cross-order prep signatures in Step 2.6. |
| `QueueScore`         | Redis sorted set score. Recommended composition: priority bucket + `confirmedAt`/sequence.                 |
| `SlaPolicy`          | Thresholds per tenant/station and warning levels.                                                          |
| `Revision`           | Monotonic Redis counter per tenant for snapshot invalidation and optimistic UI refresh.                    |
| `EventId`            | Kafka event idempotency key.                                                                               |
| `CorrelationId`      | Trace propagation across REST/TCP/Kafka/WS.                                                                |

### Source of Truth

| Data                       | Source of Truth                              | Consumers / Copies                                     |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Customer order state       | Order Service PostgreSQL                     | Customer PWA, Management App, KDS read hints           |
| KDS ticket prep state      | Kitchen Service Redis                        | KDS UI, management room, waiter/customer hints         |
| Menu item current station  | Catalog Service PostgreSQL                   | Snapshotted into `order.confirmed`                     |
| Stock                      | Catalog Service PostgreSQL                   | Deducted during staff confirm before `order.confirmed` |
| Customer session           | Order Service PostgreSQL                     | Redis active cache, Customer PWA                       |
| Cart                       | Order Redis cache                            | Customer PWA/Management App via BFF                    |
| Staff identity/tenant/role | Keycloak token + Mongo permissions           | BFF guards, WebSocket handshake                        |
| WebSocket room membership  | BFF process memory + Socket.IO Redis adapter | Ephemeral; rebuilt on reconnect                        |

## 3. Event & Message Contract

### Kafka Domain Events

| Topic                 | Step 2.6 Role                                                                                                              | Producer                       | Consumer Group(s)                                                            | Partition Key | Ordering Need                                                                                    | Idempotency                                               | Schema                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order.confirmed`     | Primary trigger for KDS ticket creation; optional BFF bridge is customer/session tracking only, not KDS queue invalidation | Order Service outbox publisher | `kitchen-service-group`, optional `bff-kafka-bridge`                         | `tenantId`    | Required per tenant for order-confirmed stream; Kafka only guarantees order within one partition | `eventId`; fallback `(tenantId, orderId)`                 | `eventId: string`, `eventType: "order.confirmed"`, `schemaVersion: "1.0"`, `tenantId: string`, `orderId: string`, `sessionId: string`, `tableId: string`, `tableName: string`, `items: OrderConfirmedItem[]`, `totalAmount: number`, `confirmedAt: string`, `confirmedByUserId: string`, `occurredAt: string`, `correlationId?: string` |
| `kitchen.sla_warning` | Alerts management/station rooms when a ticket exceeds threshold                                                            | Kitchen Service                | `bff-kafka-bridge`, future Notification                                      | `tenantId`    | Per-tenant warning order is useful but not financially critical                                  | `eventId`; fallback `(tenantId, ticketId, level, bucket)` | Recommended: `eventId: string`, `eventType: "kitchen.sla_warning"`, `schemaVersion: "1.0"`, `tenantId: string`, `ticketId: string`, `orderId: string`, `station: "KITCHEN" \| "BAR"`, `level: "WARNING" \| "BREACH"`, `waitTimeSeconds: number`, `thresholdSeconds: number`, `occurredAt: string`, `correlationId?: string`             |
| `payment.completed`   | Future bridge to customer/session room and Order/Catalog/Notification sync                                                 | Payment Service                | `payment-order-sync-group`, `notification-service-group`, `bff-kafka-bridge` | `tenantId`    | Required per tenant/bill                                                                         | `eventId`; fallback `(tenantId, paymentId)`               | Recommended minimum: `eventId`, `tenantId`, `paymentId`, `billId`, `sessionId`, `tableId`, `amount`, `method`, `paidAt`, `occurredAt`, `correlationId`                                                                                                                                                                                  |
| `payment.refunded`    | Registry topic, not Step 2.6 KDS-critical                                                                                  | Payment Service                | Order, Notification                                                          | `tenantId`    | Per tenant/payment                                                                               | `eventId`; fallback `(tenantId, refundId)`                | Future Phase 3 contract                                                                                                                                                                                                                                                                                                                 |
| `tenant.created`      | Registry topic, not Step 2.6 KDS-critical                                                                                  | SaaS Service                   | Catalog, Notification                                                        | `tenantId`    | Per tenant                                                                                       | `eventId`; fallback `tenantId`                            | Future SaaS bootstrap contract                                                                                                                                                                                                                                                                                                          |

`OrderConfirmedItem` is already implemented in shared/code as: `orderItemId: string`, `menuItemId: string`, `name: string`, `quantity: number`, `note?: string`, `unitPrice: number`, `station?: PreparationStation`.

### Kafka vs BFF Direct Boundary

| Event                                             | Classification           | Reason                                                                                                      |
| ------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `order.confirmed`                                 | Kafka async domain event | Cross-context integration from Order to Kitchen after durable order state and stock deduction.              |
| `kitchen.sla_warning`                             | Kafka async domain event | Produced by Kitchen timer logic; consumed by BFF bridge and future notification/analytics without coupling. |
| `payment.completed`                               | Kafka async domain event | Payment is a separate bounded context; Order/BFF/customer views react asynchronously.                       |
| `events.orderCreated`                             | BFF Direct side effect   | Emitted after BFF receives successful Order TCP response; UI invalidation/hint only.                        |
| `events.orderStatusChanged`                       | BFF Direct side effect   | Emitted after authoritative Order command response.                                                         |
| `events.cartUpdated`                              | BFF Direct side effect   | Cart mutation is synchronous through BFF/Order Redis; WS only tells clients to refetch.                     |
| `events.serviceRequested`                         | BFF Direct side effect   | Order Service persists service request; BFF notifies staff/session rooms.                                   |
| `events.billRequested`                            | BFF Direct side effect   | Order Service persists bill request; BFF notifies staff/session rooms.                                      |
| `events.tableTransferred`                         | BFF Direct side effect   | Transfer saga is synchronous through Order/Catalog; BFF emits after success.                                |
| `events.kitchenItemReady`                         | BFF Direct side effect   | Recommended after BFF orchestrates Kitchen `done` plus Order item/order update.                             |
| `events.menuUpdated`, `events.tableStatusChanged` | BFF Direct side effect   | Catalog-owned state changes; UI invalidation after authoritative Catalog command.                           |

### WebSocket Events

Namespace should remain `/orders` unless a dedicated `/kds` namespace is explicitly chosen. The existing code uses `/orders`; Step 2.6 can harden this namespace first.

| Event Name                  | Direction        | Room(s)                                                                                | Payload Schema                                                                                                                  | Emit Condition                                                                |
| --------------------------- | ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `events.cartUpdated`        | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                              | Existing `CartUpdatedEvent`: `tenantId`, `sessionId`, `tableId`, `itemCount`, `cartVersion`, `occurredAt`, `correlationId?`     | Cart mutation succeeds.                                                       |
| `events.orderCreated`       | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                              | Existing `OrderCreatedEvent`                                                                                                    | Customer submits order and Order Service persists `PENDING`.                  |
| `events.orderStatusChanged` | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                              | Existing `OrderStatusChangedEvent`                                                                                              | Staff confirm/cancel/serve/complete command succeeds.                         |
| `events.serviceRequested`   | Server -> client | `tenant:{tenantId}:staff`, optionally session room                                     | Existing `ServiceRequestedEvent`                                                                                                | Customer/staff service request command succeeds.                              |
| `events.billRequested`      | Server -> client | `tenant:{tenantId}:staff`, `session:{sessionId}:customer`                              | Existing `BillRequestedEvent`                                                                                                   | Bill request command succeeds.                                                |
| `events.tableTransferred`   | Server -> client | `tenant:{tenantId}:staff`, old/new session room as needed                              | Existing `TableTransferredEvent`                                                                                                | Transfer saga succeeds.                                                       |
| `events.kdsQueueChanged`    | Server -> client | `tenant:{tenantId}:kds:kitchen` or `tenant:{tenantId}:kds:bar`; management subscribers | Recommended: `tenantId`, `station`, `revision`, `ticketId?`, `orderId?`, `reason`, `occurredAt`, `correlationId?`               | Kitchen creates/updates/recalls/voids ticket. Clients refetch queue snapshot. |
| `events.kdsTicketUpdated`   | Server -> client | Station KDS room; management subscribers                                               | Recommended: `tenantId`, `station`, `ticketId`, `status`, `revision`, `occurredAt`, `correlationId?`                            | Ticket state transition succeeds.                                             |
| `events.kitchenItemReady`   | Server -> client | `tenant:{tenantId}:staff`, `session:{sessionId}:customer`                              | Recommended: `tenantId`, `sessionId`, `tableId`, `orderId`, `ticketId`, `station`, `readyItems`, `occurredAt`, `correlationId?` | Ticket/item becomes READY and Order Service update succeeds.                  |
| `events.kitchenSlaWarning`  | Server -> client | `tenant:{tenantId}:management`, station room                                           | Kafka `kitchen.sla_warning` mapped to WS payload                                                                                | BFF Kafka bridge consumes warning.                                            |
| `events.paymentCompleted`   | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                              | Future payment payload                                                                                                          | BFF bridge consumes `payment.completed`.                                      |

Client-originated room joins must be replaced by authenticated handshake and server-side room assignment.

| Event / Action  | Direction        | Decision                                                                                                                                                               |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `join.staff`    | Client -> server | Existing implementation only. Do not trust in Step 2.6 because client supplies `tenantId`. Replace with JWT handshake and server-derived rooms.                        |
| `join.session`  | Client -> server | Existing implementation only. Replace with customer session handshake validated through Order Session source of truth.                                                 |
| `subscribe.kds` | Client -> server | Recommended optional event for OWNER/MANAGER to subscribe to `KITCHEN` or `BAR` after permission validation. CHEF/BARISTA should be auto-joined only to their station. |
| KDS mutations   | Client -> server | Should be REST commands through BFF, not WebSocket mutation events. This preserves guards, auditability, and idempotency.                                              |

## 4. State Machine

### KDS Ticket State Machine

```text
                      order.confirmed consumed
                               |
                               v
                         +-----------+
                         |  PENDING  |
                         +-----------+
                           |       |
                   start   |       | cancel/void from Order
                           v       v
                      +------------+        terminal
                      | PROCESSING | ----> +--------+
                      +------------+       | VOIDED |
                           |               +--------+
                      done |
                           v
                         +-------+
                         | READY |
                         +-------+
                           |   |
     recall within window  |   | cleanup after retention / served
                           v   v
                      +------------+        terminal
                      | PROCESSING |      +----------+
                      +------------+      | ARCHIVED |
                                          +----------+
```

### Valid Transitions

| From                           | To           | Trigger                   | Actor                            | Authorization                                        | Notes                                                                                |
| ------------------------------ | ------------ | ------------------------- | -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------ |
| none                           | `PENDING`    | Kafka `order.confirmed`   | Kitchen consumer                 | Service principal                                    | Idempotent create only.                                                              |
| `PENDING`                      | `PROCESSING` | Start ticket              | CHEF/BARISTA/OWNER/MANAGER       | `kitchen.update_ticket`; station restriction applies | Must use Redis compare-and-set.                                                      |
| `PROCESSING`                   | `READY`      | Done ticket/items         | CHEF/BARISTA/OWNER/MANAGER       | `kitchen.update_ticket`; station restriction applies | Must synchronize with Order Service so customer-visible state can move toward READY. |
| `READY`                        | `PROCESSING` | Recall                    | CHEF/BARISTA/OWNER/MANAGER       | `kitchen.recall`; station restriction applies        | Allowed only inside recall window.                                                   |
| `PENDING`/`PROCESSING`/`READY` | `VOIDED`     | Order cancel/compensation | BFF/Order-driven service command | Order command authorization                          | Terminal for active queue.                                                           |
| `READY`/`VOIDED`               | `ARCHIVED`   | Retention cleanup         | Kitchen internal worker          | Service principal                                    | Removes active queue membership after retention.                                     |

`READY`, `VOIDED`, and `ARCHIVED` are terminal for normal prep flow. `READY` is rollback-capable only during a configured recall window.

### Happy Path

1. Customer submits cart through BFF. Order Service creates `PENDING` order and bill/session linkage, then BFF emits `events.orderCreated`.
2. Staff confirms the order. Order Service locks the order, calls Catalog to deduct stock, updates order and order items to `PROCESSING`, writes an outbox row, and returns success to BFF.
3. Outbox publisher sends Kafka `order.confirmed` with key `tenantId`.
4. Kitchen Service consumes the event in `kitchen-service-group`, checks dedupe keys, splits items by `station`, creates one ticket per station, stores ticket/item hashes, adds ticket IDs to station queue sorted sets, schedules SLA due entries, increments tenant revision, and emits `events.kdsQueueChanged`.
5. CHEF/BARISTA opens KDS. WebSocket handshake joins station room; REST queue snapshot loads from Kitchen Redis.
6. Staff presses Start. BFF authorizes and sends a Kitchen command. Kitchen atomically transitions `PENDING -> PROCESSING`, increments revision, and emits a queue change hint.
7. Staff presses Done. BFF authorizes and orchestrates Kitchen `PROCESSING -> READY`, then calls Order Service to update item/order readiness. After authoritative success, BFF emits `events.kitchenItemReady` and/or `events.orderStatusChanged`.
8. Waiter serves the order. Order Service transitions `READY -> SERVED`; BFF emits existing order status realtime hints.

### Unhappy Paths and Edge Cases

| Scenario                           | Required Behavior                                                                                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicate `order.confirmed`        | Kitchen must ignore using `kds:{tenantId}:dedupe:event:{eventId}` and/or `kds:{tenantId}:dedupe:order:{orderId}`.                                                                                       |
| Kafka consumer lag                 | Order remains authoritative as `PROCESSING`; KDS queue may be delayed. Monitor lag and expose refresh/rebuild path.                                                                                     |
| Kafka rebalancing                  | Handler must be idempotent because messages can be reprocessed after rebalance or crash before commit.                                                                                                  |
| Redis restart/flush                | Active KDS state can disappear unless rebuilt. See recovery strategy in section 5.                                                                                                                      |
| Two chefs press Done               | Redis CAS/Lua transition with expected revision lets one succeed and one receive conflict/current state.                                                                                                |
| Done races with Cancel             | Order cancellation is authoritative. BFF must coordinate: if Order is canceled, Kitchen ticket becomes `VOIDED`; if Kitchen done won first, Order transition rules decide final customer-visible state. |
| Transfer table after tickets exist | Transfer saga must patch active KDS ticket table snapshot after Order/Catalog transfer success.                                                                                                         |
| Client disconnect/reconnect        | Socket events are hints only. Client must refetch queue/order snapshot on reconnect using revision.                                                                                                     |
| SLA worker duplicates warning      | Use due-set claiming and warning dedupe key per `ticketId + level + bucket`.                                                                                                                            |

## 5. Data Structure Strategy

### Redis - Kitchen Service

| Key Pattern                                             | Data Type           | TTL / Retention                                                             | Owner   | Reason                                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kds:{tenantId}:ticket:{ticketId}`                      | Hash                | Active until `READY/VOIDED + retention`; recommended 24-48h for audit/debug | Kitchen | Ticket aggregate root: `tenantId`, `ticketId`, `orderId`, `sessionId`, `tableId`, `tableName`, `station`, `status`, `priority`, `confirmedAt`, `startedAt`, `readyAt`, `revision`, `correlationId`. |
| `kds:{tenantId}:ticket:{ticketId}:items`                | Set                 | Same as ticket                                                              | Kitchen | Item IDs inside ticket.                                                                                                                                                                             |
| `kds:{tenantId}:ticket-item:{ticketItemId}`             | Hash                | Same as ticket                                                              | Kitchen | Per-item state, menu snapshot, quantity, note, modifiers, status.                                                                                                                                   |
| `kds:{tenantId}:station:{station}:PENDING`              | Sorted Set          | No TTL on key; members removed as state changes                             | Kitchen | Active pending queue ordered by priority/confirmed time.                                                                                                                                            |
| `kds:{tenantId}:station:{station}:PROCESSING`           | Sorted Set          | No TTL on key; members removed as state changes                             | Kitchen | Active prep queue.                                                                                                                                                                                  |
| `kds:{tenantId}:station:{station}:READY`                | Sorted Set          | Members retained only during recall/pickup window                           | Kitchen | Ready tickets for recall and staff pickup visibility.                                                                                                                                               |
| `kds:{tenantId}:order:{orderId}:tickets`                | Set                 | Same as ticket retention                                                    | Kitchen | Fast lookup for order cancel/transfer/patch commands.                                                                                                                                               |
| `kds:{tenantId}:dedupe:event:{eventId}`                 | String              | 7-14 days                                                                   | Kitchen | Kafka event idempotency.                                                                                                                                                                            |
| `kds:{tenantId}:dedupe:order:{orderId}`                 | String              | 7-14 days                                                                   | Kitchen | Extra protection against duplicate ticket creation.                                                                                                                                                 |
| `kds:sla:due`                                           | Sorted Set          | Persistent operational key                                                  | Kitchen | Global due index. Score is due timestamp; member should include tenant/ticket/station.                                                                                                              |
| `kds:{tenantId}:ticket:{ticketId}:sla`                  | Hash                | Same as ticket                                                              | Kitchen | SLA state: threshold, dueAt, warningLevel, lastWarningAt.                                                                                                                                           |
| `kds:{tenantId}:dedupe:sla:{ticketId}:{level}:{bucket}` | String              | 1-24h depending warning policy                                              | Kitchen | Prevents repeated alerts for same threshold bucket.                                                                                                                                                 |
| `kds:{tenantId}:revision`                               | String counter      | No TTL                                                                      | Kitchen | Monotonic snapshot revision for WS invalidation.                                                                                                                                                    |
| `kds:{tenantId}:settings`                               | Hash or String JSON | TTL 5-15 minutes                                                            | Kitchen | Cached tenant SLA/station policy. Source should be durable config service/table.                                                                                                                    |
| `lock:kds:{tenantId}:ticket:{ticketId}`                 | String              | Short PX, e.g. 5-10s                                                        | Kitchen | Optional command lock around multi-key transitions. Lua CAS is preferred.                                                                                                                           |

Redis eviction policy for production should not evict active KDS keys under memory pressure. Prefer a dedicated Redis database/instance or keyspace with `noeviction` for operational KDS state. If shared Redis must be used, KDS active keys need memory monitoring and conservative TTLs.

### PostgreSQL

| Data             | Table(s)                | Current Status                                                                        | Recommended Indexes / Notes                                                                                                                          |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orders           | `orders`, `order_items` | Exists and tenant-scoped. Live DB has order idempotency and order-item order indexes. | Add/query-check `orders(tenant_id, status, created_at)` and `orders(tenant_id, table_id, created_at)` for active order rebuild and staff dashboards. |
| Sessions         | `sessions`              | Exists. Redis is active cache; PostgreSQL is durable source.                          | Existing live index covers `(tenant_id, table_id, status)`.                                                                                          |
| Bills            | `bills`                 | Exists.                                                                               | Add/query-check `bills(tenant_id, status, created_at)` before payment/dashboard load.                                                                |
| Service requests | `service_requests`      | Exists.                                                                               | Add/query-check `service_requests(tenant_id, table_id, status)` and `service_requests(tenant_id, created_at)`.                                       |
| Outbox           | `outbox_events`         | Exists. Live DB has `(status, created_at)` index.                                     | Current publisher sends JSON with key `partitionKey`. Consider explicit producer acks/idempotence hardening.                                         |
| Menu items       | `menu_items`            | Exists with `station` column.                                                         | Catalog remains source of truth for current station; event snapshot is immutable for KDS.                                                            |
| Tables           | `tables`                | Exists. Live DB has tenant/status and tenant/name/qr-token indexes.                   | KDS stores table snapshot; table transfer must patch active tickets.                                                                                 |
| KDS tickets      | none                    | Intentional for Step 2.6.                                                             | Redis-only requires explicit rebuild strategy.                                                                                                       |

### In-Memory / Ephemeral State

| Data                       | Location                                                    | Rule                                                           |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Socket connection identity | `socket.data` in BFF gateway instance                       | Derived from JWT/session handshake only; rebuilt on reconnect. |
| Socket room membership     | Socket.IO process memory + Redis adapter broadcast metadata | Not durable; never source of truth.                            |
| SLA worker tick state      | Kitchen process                                             | Must be recoverable from Redis due set.                        |
| Kafka consumer assignment  | Kafka client runtime                                        | Not domain state; rebalances can replay messages.              |

### Redis Restart / Flush Strategy

Kitchen Service has no PostgreSQL table in Step 2.6, so Redis loss is a business continuity risk. Recommended recovery:

1. Normal restart: Redis data remains; Kitchen resumes due-set worker and Kafka consumer group.
2. Consumer crash before commit: Kafka replays; dedupe keys make handling safe.
3. Redis flush while Kafka offsets are already committed: Kitchen cannot recover active tickets from Redis alone. Add an explicit rebuild path before production use:
   - Query Order Service for active `PROCESSING`/`READY` orders by tenant and recent time window, then rebuild deterministic KDS tickets from order item snapshots; or
   - Reset `kitchen-service-group` offsets to a safe retention window and replay `order.confirmed`.
4. Client reconnect after any restart: WebSocket event history is not trusted; clients must refetch REST snapshots and compare revision.

## 6. Authorization Matrix

Live Mongo role-permission checks confirm that OWNER, MANAGER, CHEF, and BARISTA currently have `kitchen.get_queue`, `kitchen.update_ticket`, and `kitchen.recall`; WAITER does not.

| Operation                                                | OWNER               | MANAGER             | WAITER              | CHEF             | BARISTA          | CUSTOMER         | Permission / Guard                                                                                        |
| -------------------------------------------------------- | ------------------- | ------------------- | ------------------- | ---------------- | ---------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| Staff WebSocket handshake                                | Yes                 | Yes                 | Yes                 | Yes              | Yes              | No               | JWT via Keycloak/Authorizer; server derives `tenantId`, role, permissions.                                |
| Customer WebSocket handshake                             | No                  | No                  | No                  | No               | No               | Yes              | Session validation via Order session source; tenant/session scoped.                                       |
| Subscribe staff room `tenant:{tenantId}:staff`           | Yes                 | Yes                 | Yes                 | Yes              | Yes              | No               | Automatic after staff handshake.                                                                          |
| Subscribe management room `tenant:{tenantId}:management` | Yes                 | Yes                 | No                  | No               | No               | No               | Role check.                                                                                               |
| Subscribe KDS kitchen room                               | Yes                 | Yes                 | No                  | Yes              | No               | No               | `kitchen.get_queue`; station restriction.                                                                 |
| Subscribe KDS bar room                                   | Yes                 | Yes                 | No                  | No               | Yes              | No               | `kitchen.get_queue`; station restriction.                                                                 |
| `GET /admin/kitchen/queue?station=KITCHEN`               | Yes                 | Yes                 | No                  | Yes              | No               | No               | `kitchen.get_queue`; tenant guard.                                                                        |
| `GET /admin/kitchen/queue?station=BAR`                   | Yes                 | Yes                 | No                  | No               | Yes              | No               | `kitchen.get_queue`; tenant guard.                                                                        |
| Start KDS ticket                                         | Yes                 | Yes                 | No                  | Station only     | Station only     | No               | `kitchen.update_ticket`; Redis CAS.                                                                       |
| Done KDS ticket                                          | Yes                 | Yes                 | No                  | Station only     | Station only     | No               | `kitchen.update_ticket`; must sync Order Service.                                                         |
| Recall KDS ticket                                        | Yes                 | Yes                 | No                  | Station only     | Station only     | No               | `kitchen.recall`; within recall window.                                                                   |
| Set KDS priority                                         | Yes                 | Yes                 | No                  | No by default    | No by default    | No               | Recommended new permission `kitchen.set_priority`; otherwise role-restrict using `kitchen.update_ticket`. |
| View customer order/session updates                      | Indirect staff view | Indirect staff view | Indirect staff view | Limited KDS view | Limited KDS view | Own session only | Staff JWT vs customer session boundary.                                                                   |
| BFF Kafka bridge emit                                    | Service             | Service             | Service             | Service          | Service          | Service          | No user actor; payload tenant scoped.                                                                     |

### Trust Boundaries

Staff app and customer PWA must use different WebSocket authentication paths:

| Client               | Credential                                   | Validation                                                                                                                               | Room Assignment                                                                       |
| -------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Staff Management App | Keycloak JWT                                 | BFF/Authorizer validates token, extracts `sub`, `tenant_id`, `sub_role`, and permissions. The client-supplied `tenantId` is not trusted. | Server joins staff/role/station rooms based on verified claims and Mongo permissions. |
| Customer PWA         | Session identifier plus tenant/table context | BFF validates active session through Order session cache/PostgreSQL. Treat `sessionId` as bearer capability scoped to one session.       | Server joins only `session:{sessionId}:customer`; never tenant-wide staff/KDS rooms.  |

HTTP protected staff endpoints must keep the required guard order: `UserGuard -> TenantGuard -> PermissionGuard`. Customer endpoints remain session-guarded, not Keycloak-guarded.

## 7. SLA & Timer Logic

### Timer Lifecycle

| Moment                                | Action                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ticket created from `order.confirmed` | Compute `slaDueAt = confirmedAt + thresholdSeconds`, store ticket SLA hash, add member to `kds:sla:due`.                                 |
| Ticket starts processing              | Do not reset the default customer wait SLA. Optionally record `startedAt` for analytics.                                                 |
| Ticket done/ready                     | Remove or mark inactive in `kds:sla:due`; warning state becomes closed.                                                                  |
| Ticket recalled                       | Reopen SLA tracking. Recommended default: set a short recall grace due time from `recalledAt` rather than reusing the original due time. |
| Ticket voided/archived                | Remove from due index and expire ticket keys by retention policy.                                                                        |

### Threshold Configuration

Current docs do not define a durable tenant settings table for SLA thresholds. The KDS mock stores station settings locally, which is not acceptable as a backend source of truth.

Recommended decision:

| Setting                           | Source                                                                                  | Cache                                            |
| --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Default kitchen warning threshold | Durable tenant operational settings owned by SaaS or Order/Kitchen configuration module | `kds:{tenantId}:settings` Redis TTL 5-15 minutes |
| Station-specific threshold        | Same durable source, keyed by tenant and station                                        | Same cache                                       |
| Step 2.6 fallback                 | Static default, e.g. 15 minutes, documented and tenant-overridable later                | Cache optional                                   |

### SLA Breach Flow

1. Kitchen SLA worker polls `kds:sla:due` every 10-30 seconds.
2. Worker claims due members with Lua/lock to prevent multi-instance duplicate handling.
3. Worker reads ticket and verifies it is still `PENDING` or `PROCESSING`.
4. Worker checks warning dedupe key for `ticketId + level + bucket`.
5. Worker publishes Kafka `kitchen.sla_warning` with key `tenantId`.
6. BFF Kafka bridge consumes the warning and emits `events.kitchenSlaWarning` to `tenant:{tenantId}:management` and optionally the station room.
7. KDS/management clients refetch queue snapshot or highlight the affected ticket.

If Kitchen Service restarts, timers are not allowed to live only in process memory. The due sorted set is the recoverable timer source. If Redis itself is lost, tickets and due entries must be rebuilt from Kafka replay or an Order Service active-order snapshot.

## 8. Scaling & Concurrency Risks

### WebSocket Multi-Instance

Socket.IO Redis Adapter guarantees cross-instance room broadcast: if a user is connected to BFF instance B and an event is emitted by instance A, Redis Pub/Sub lets B deliver it. It does not guarantee durable replay, ordered recovery after disconnect, authentication, or domain state consistency.

Required Step 2.6 behavior:

| Concern                         | Decision                                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Multi-instance broadcast        | Use `@socket.io/redis-adapter` with a NestJS `RedisIoAdapter`.                                            |
| Missed events during disconnect | Treat WS as invalidation hints; refetch REST snapshot on reconnect.                                       |
| Client-authenticated rooms      | Assign rooms server-side after handshake validation.                                                      |
| Replayable event history        | Not provided by Redis adapter. Use Redis Streams only if product requires replay beyond snapshot refresh. |

### Kafka Consumer Scaling

`tenantId` should remain the Kafka partition key for `order.confirmed` and `kitchen.sla_warning`. This gives per-tenant ordering as long as all events for a tenant map to the same partition. A consumer group processes each partition on only one instance at a time, so Kitchen scaling is bounded by partition count. A very hot tenant can still overload a single partition; cross-tenant scaling will work better than intra-tenant scaling.

Consumer rules:

| Rule                                                                           | Reason                                                            |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Use explicit group IDs such as `kitchen-service-group` and `bff-kafka-bridge`. | Separate services need independent consumption.                   |
| Make handlers idempotent before committing offsets.                            | At-least-once delivery and rebalance replay are normal.           |
| Monitor consumer lag by topic/partition/group.                                 | Lag directly affects KDS freshness.                               |
| Avoid cross-tenant partition keys for KDS events.                              | Multi-tenant isolation and per-tenant ordering depend on the key. |

### Race Conditions

| Risk                                               | Mitigation                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Two staff update the same ticket                   | Redis Lua compare-and-set on `status` and `revision`; return current state on conflict.                     |
| `done` vs `recall`                                 | Require expected state and revision; recall only from `READY` inside recall window.                         |
| `done` vs Order cancellation                       | BFF must orchestrate against Order source of truth. Kitchen cannot make final order status decisions alone. |
| Duplicate Kafka messages                           | Dedupe by `eventId` and `(tenantId, orderId)`.                                                              |
| SLA worker duplicate publishing                    | Due-set claim plus warning dedupe key.                                                                      |
| Client joins another tenant room                   | Never accept room identifiers from client payload without validated claims/session.                         |
| Redis flush                                        | Explicit rebuild/replay path; client snapshots after reconnect.                                             |
| Transfer table while KDS ticket active             | After transfer saga succeeds, patch Kitchen ticket table snapshot through service command.                  |
| Priority changes reorder active queue unexpectedly | Queue score should separate priority and FIFO time; preserve stable order within same priority.             |

## 9. Open Questions & Recommended Decisions

### Checks Completed Before Finalizing

| Check                   | Result                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Context7 NestJS docs    | Verified current NestJS Kafka client/consumer configuration patterns and Socket.IO Redis adapter registration guidance.                          |
| MCP database resources  | No MCP resources/templates were configured in this session.                                                                                      |
| MCP Keycloak resources  | No MCP resources/templates were configured in this session.                                                                                      |
| Local PostgreSQL schema | Verified live Order/Catalog tables, indexes, `menu_items.station`, and absence of Kitchen tables.                                                |
| Local Keycloak realm    | Verified roles `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`, `SUPER_ADMIN`; `management-app` has `tenant_id` and `sub_role` protocol mappers. |
| Local Mongo RBAC        | Verified kitchen permissions for OWNER/MANAGER/CHEF/BARISTA and no kitchen permissions for WAITER.                                               |

### Gaps, Conflicts, and Decisions

| Issue                                | Current Evidence                                                                                                               | Recommended Decision                                                                                                                                                                              | Trade-off                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| KDS state granularity                | Final Step 2.6 spec removes batching; shared `KDSTicket` is only a Phase 2A view type.                                         | Model `KdsTicket` as aggregate and `KdsTicketItem` as entity. One ticket per `(orderId, station)`, item-level state inside.                                                                       | Slightly more Redis complexity, but supports partial readiness, recall, and future analytics. |
| SLA warning topic                    | Architecture docs previously used a non-canonical shortened variant. Kafka guide lists `kitchen.sla_warning`.                  | Standardize Kafka topic as `kitchen.sla_warning`; WS event as `events.kitchenSlaWarning`.                                                                                                         | Requires cleaning stale references.                                                           |
| `table.status_chg` shorthand         | Technical architecture contains shorthand inconsistent with existing `events.*`.                                               | Use existing descriptive BFF Direct naming: `events.tableStatusChanged`.                                                                                                                          | More verbose, less ambiguity.                                                                 |
| WebSocket room joins                 | Current BFF allows `join.staff` and `join.session` with client-supplied IDs.                                                   | Replace with handshake auth and server-side room assignment. Keep old events only as migration shim if needed.                                                                                    | Requires frontend update, but closes tenant/session spoofing risk.                            |
| Owner/Manager KDS rooms              | Phase doc says OWNER/MANAGER join management room; frontend routing allows KDS screens.                                        | OWNER/MANAGER should be allowed to subscribe to station KDS rooms using `subscribe.kds` after permission check.                                                                                   | Slightly richer gateway logic; matches product/admin UX.                                      |
| Priority permission                  | Permission matrix has no dedicated priority permission.                                                                        | Add `kitchen.set_priority` if priority is a real operation; otherwise restrict priority to OWNER/MANAGER under `kitchen.update_ticket`.                                                           | New permission adds migration overhead; role-only shortcut is faster but less precise.        |
| Kitchen done -> Order READY sync     | Kitchen Redis-only cannot be source of truth for customer order state.                                                         | BFF should orchestrate Kitchen command and Order Service item/order readiness command; emit customer/staff WS only after Order success.                                                           | More coupling in BFF, but preserves Order as source of truth.                                 |
| Recall semantics                     | Docs mention recall, but not window or Order-state effect.                                                                     | Recall allowed only from KDS `READY` within configurable window. It should reopen KDS prep state; Order status rollback needs explicit Order contract if customer-visible status already changed. | Avoids hidden customer-facing rollback unless contract is defined.                            |
| SLA threshold source                 | Mock UI localStorage is not backend source; no live settings table exists.                                                     | Use static Step 2.6 default plus Redis cache shape; add durable tenant operational settings before production customization.                                                                      | Static default is quick; tenant configurability waits for schema/API.                         |
| Redis-only KDS recovery              | Phase doc says Kitchen has no DB.                                                                                              | Add rebuild path from Order active orders or Kafka replay/reset offsets.                                                                                                                          | Rebuild adds operational tooling; without it Redis flush loses active kitchen state.          |
| Socket.IO Redis adapter expectations | Redis adapter provides broadcast only.                                                                                         | Use snapshot-on-reconnect; do not promise pending event replay.                                                                                                                                   | Simpler and reliable; clients need query invalidation/refetch discipline.                     |
| Kafka config coverage                | Code currently exposes only `order.confirmed`.                                                                                 | Add config entries for `kitchen.sla_warning`, `payment.completed`, and consumer groups during implementation.                                                                                     | More config surface, but explicit contracts.                                                  |
| No Kitchen TCP namespace             | Constants currently have no `KITCHEN` TCP messages.                                                                            | Add Kitchen command namespace for queue/start/done/recall/priority when implementing.                                                                                                             | Keeps BFF guard/orchestration pattern consistent.                                             |
| Transfer/cancel after KDS creation   | Order transfer/cancel code currently does not patch Kitchen.                                                                   | After authoritative Order/Catalog success, BFF/Order should command Kitchen to patch table snapshot or void tickets.                                                                              | Adds cross-service side effect; prevents stale KDS display.                                   |
| ERD stock deduction text conflict    | ERD explanation says stock deducted when customer submits; Step 2.4 spec/code deduct on staff confirm.                         | Treat staff confirm as canonical stock deduction point. Update stale ERD docs later.                                                                                                              | Matches implemented transaction and business decision.                                        |
| Catalog stock idempotency            | Step 2.4 spec asks idempotent stock deduction; current Catalog code locks rows but no durable idempotency record was observed. | Track as separate hardening item; Step 2.6 should rely on `order.confirmed` after successful confirm, not call stock directly.                                                                    | Not blocking KDS, but important for retry correctness.                                        |
| DB query indexes                     | Live DB lacks some dashboard/rebuild-friendly indexes.                                                                         | Add indexes for active orders, service requests, and bills before high-load Step 2.6/2.7 usage.                                                                                                   | Extra migrations; avoids slow tenant dashboards/rebuilds.                                     |

### Questions to Confirm Before Implementation

1. Should KDS `done` mark the entire station ticket ready at once, or must staff be able to mark individual items ready inside one ticket?
2. Should recall be visible to customers if an item/order was already announced as ready, or should recall remain KDS/staff-only?
3. What is the default SLA threshold per station for the demo, and is tenant-level customization required in Step 2.6 or can it be deferred?
4. Is priority editing an OWNER/MANAGER-only control, or should CHEF/BARISTA be allowed to reprioritize their own station queue?
5. For Redis flush recovery, do we prefer an explicit Order snapshot rebuild command or Kafka offset replay operational procedure?
6. Should BFF keep the existing `/orders` namespace for all realtime events, or introduce a separate `/kds` namespace during Step 2.6?
7. Do we need durable replay of missed WebSocket events, or is snapshot-on-reconnect accepted as the product behavior?
