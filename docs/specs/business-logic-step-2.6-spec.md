# Step 2.6 — Formal Architecture & Business Specification

> **Phase:** 2B — Kitchen service + WebSocket Gateway
> **Step:** 2.6 — KDS Redis-only, SLA Worker, WebSocket Gateway hardening
> **Date:** 2026-05-07
> **Status:** Finalized after audit Step 2.6
> **Purpose:** This document stores the finalized technical/business specification for Step 2.6. This is **not** an implementation plan; Final deployment status see [Phase 2B record](../phases/phase-2b-kitchen-websocket.md).

---

## 0. Minutes of decision

| Question | Decision                                          | Closing content                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1       | According to audit recommendations — **Option B** | Kitchen service consumes `order.confirmed`, writes Redis, then broadcasts internal Redis Pub/Sub event to BFF WebSocket Gateway emit `events.kdsQueueChanged`. BFF does not emit KDS queue hint directly from `order.confirmed` to avoid race. |
| Q2       | According to audit recommendations — **Option A** | SLA uses Redis Sorted Set `kds:sla:due` + internal worker Kitchen service. Do not use request-driven check, do not use Redis keyspace notification.                                                                                            |
| Q3       | **Completely eliminate batching**                 | There is no function to combine orders/orders in the system. No creation of Redis batch keys, no batch projection, no UI/API batch contract. The old batching acceptances in the doc phase are replaced by FIFO/priority by ticket.            |
| Q4       | According to audit recommendations — **Option A** | Redis-only KDS must have recovery: rebuild from Order service active orders when Kitchen starts or when Redis is detected losing state. Kafka replay is the hardening of the future.                                                           |
| Q5       | According to audit recommendations — **Option A** | Add new permission `KITCHEN_SET_PRIORITY` for Owner/Manager-only priority flagging. Do not use `KITCHEN_UPDATE_TICKET` for priority operations.                                                                                                |

### 0.1 Which old points does this document override?

1. `docs/phases/phase-2b-kitchen-websocket.md` has the request "Batching: collecting the same item from different orders". This requirement is **completely eliminated** by decision Q3.
2. BFF Kafka bridge in phase doc says `order.confirmed → room KDS/staff`. With decision Q1, BFF **does not** use `order.confirmed` to emit the KDS queue directly. KDS queue events are only emitted after Kitchen has written to Redis.
3. The canonical topic name is `kitchen.sla_warning`. Any `kitchen.sla_warn` variant is just old document drift and should not be used.

---

## 1. Scope and out of scope

### 1.1 Within Step 2.6

1. **Kitchen Service Redis-only**

- Create a separate `kitchen` service, owning the KDS ticket/queue state in Redis.
- Consume Kafka topic `order.confirmed`.
- Separate ticket by `station` from item snapshot: `KITCHEN` or `BAR`.
- Create a maximum of one ticket for each `(tenantId, orderId, station)`.
- Maintain FIFO/priority queue using Redis Sorted Set.
- Ticket lifecycle support: `PENDING → PROCESSING → READY`, recall `READY → PROCESSING`, void/archive.
- Run the internal SLA worker and produce Kafka `kitchen.sla_warning`.
- Expose TCP commands for BFF to call via REST guarded endpoints.
- No separate PostgreSQL/MongoDB for Kitchen.

2. **WebSocket Gateway hardening**

- Socket.IO Gateway in BFF authenticates handshake instead of trusting the client to join the room.
- Attach Socket.IO Redis Adapter to scale multiple BFF instances.
- Assign room according to role/session from server-side auth context.
- Emit realtime hints from BFF Direct, Kafka bridge, and Kitchen internal events.
- Reconnect policy: client always refetch snapshot after reconnecting.

3. **KDS REST/BFF endpoints**

- Queue snapshot query.
- Start ticket.
- Mark ticket done/ready.
- Recall ticket.
- Set/unset priority.

4. **Integration with Order service**

- Kitchen ticket creation originates from `order.confirmed`.
- When the ticket is done/ready, the customer-visible state must still be synchronized to Order service.
- Transfer table after having KDS ticket must patch table snapshot in active KDS ticket.
- Redis recovery rebuild active KDS state from Order service active orders.

5. **RBAC**

- Use existing permissions:
  - `KITCHEN_GET_QUEUE`
  - `KITCHEN_UPDATE_TICKET`
  - `KITCHEN_RECALL`
- Add new permission:
  - `KITCHEN_SET_PRIORITY`
- CHEF can only operate station `KITCHEN`.
- BARISTA can only operate station `BAR`.
- Owner/MANAGER can view/manipulate both stations and priorities.

### 1.2 Outside the scope of Step 2.6

1. Do not deploy batching/combining orders/combining orders in any form.
2. Do not add new Kafka topic like `kitchen.ticket_changed`.
3. Do not do Redis Stream replay for WebSocket packets.
4. Do not complete CDC/Debezium outbox.
5. Not implementing full Payment service, refund, or receipt.
6. Do not replace Order service as the source of truth for customer-visible order state.
7. Do not allow clients to mutate KDS directly via WebSocket.

---

## 2. Bounded Context & Source of Truth

| Context                  | Own                                                                             | Storage                               | Communication                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Order service**        | Order, order item, session, bill, service request, customer-visible order state | PostgreSQL + Redis session/cart cache | TCP from BFF; Kafka producer `order.confirmed`; BFF Direct events                                          |
| **service Catalog**      | Menu items, station config, stock, table status                                 | PostgreSQL                            | TCP from BFF/Order                                                                                         |
| **Kitchen service**      | KDS ticket, station queue, prep state, priority, recall window, SLA state       | Redis-only                            | Kafka consumer `order.confirmed`; Kafka producer `kitchen.sla_warning`; TCP from BFF; Redis Pub/Sub to BFF |
| **BFF Realtime Gateway** | HTTP guard boundary, WebSocket handshake, room assignment, WS delivery          | Stateless + Socket.IO Redis Adapter   | REST/TCP orchestration, Redis Pub/Sub, Kafka bridge                                                        |
| **Auth/User-Access**     | Staff identity, tenant claim, roles, permissions                                | Keycloak + MongoDB roles              | gRPC/TCP via existing guard/auth flow                                                                      |

### 2.1 Source of truth principle

1. Order service is the source of truth that shows customers what status their order is in.
2. Kitchen Redis is the source of truth that shows the KDS screen what prep status the ticket is in.
3. Catalog is the source of truth for `MenuItem.station` currently, but `order.confirmed` carries an immutable station snapshot for KDS.
4. WebSocket events are just realtime hints. The new REST/TCP snapshot is the data to render accurately after reconnecting.
5. Every key, event, command, query must have `tenantId`.

---

## 3. Kafka Topic Registry for Step 2.6

### 3.1 Topic `order.confirmed`

| Attributes         | Value                                          |
| ------------------ | ---------------------------------------------- |
| Producer           | Order service outbox publisher                 |
| Main consumer      | Kitchen service                                |
| Consumer group     | `kitchen-service-group`                        |
| Partition key      | `tenantId`                                     |
| Delivery semantics | At-least-once                                  |
| Idempotency        | `eventId` + `(tenantId, orderId, station)`     |
| BFF direct bridge? | Do not emit KDS queue directly from this topic |

Current payload canonical:

```ts
type OrderConfirmedEvent = {
  eventId: string;
  eventType: 'order.confirmed';
  schemaVersion: 1;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    note?: string;
    status: 'PROCESSING' | 'READY' | 'SERVED' | 'CANCELED';
    station?: 'KITCHEN' | 'BAR';
    createdAt: string;
    updatedAt: string;
  }>;
  totalAmount: number;
  confirmedAt: string;
  confirmedByUserId: string;
  occurredAt: string;
  correlationId?: string;
};
```

Validation rules:

1. `schemaVersion` must be `1`.
2. `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, `eventId` are required.
3. Each item must have `station`.
4. Items missing `station` are included in the Redis dead-letter key, not falling back to the category in Step 2.6.
5. An order can be created:
   - 0 tickets if all items are invalid/canceled.
   - 1 ticket if there is only one station.
   - 2 tickets if there are both `KITCHEN` and `BAR`.

### 3.2 Topic `kitchen.sla_warning`

| Attributes            | Value                                             |
| --------------------- | ------------------------------------------------- |
| Producer              | Kitchen service SLA Worker                        |
| Main consumer         | BFF Kafka bridge                                  |
| Future Consumer       | Notifications/Analytics                           |
| Consumer group of BFF | `bff-kafka-bridge`                                |
| Partition key         | `tenantId`                                        |
| Delivery semantics    | At-least-once                                     |
| Idempotency           | `eventId` + `(tenantId, ticketId, level, bucket)` |

Payload canonical:

```ts
type KitchenSlaWarningEvent = {
  eventId: string;
  eventType: 'kitchen.sla_warning';
  schemaVersion: 1;
  tenantId: string;
  ticketId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: 'KITCHEN' | 'BAR';
  level: 'WARNING' | 'BREACH';
  waitTimeSeconds: number;
  thresholdSeconds: number;
  occurredAt: string;
  correlationId?: string;
};
```

WS mapping:

- `kitchen.sla_warning` → `events.kitchenSlaWarning`
- Rooms:
  - `tenant:{tenantId}:management`
  - `tenant:{tenantId}:kds:kitchen` if station is `KITCHEN`
  - `tenant:{tenantId}:kds:bar` if station is `BAR`

### 3.3 Topic `payment.completed`

Step 2.6 only prepares the bridge contract because this topic belongs to Phase 3.

| Attributes            | Value                                 |
| --------------------- | ------------------------------------- |
| Producer              | Payment service                       |
| Main consumer         | Order/Catalog/Notification/BFF bridge |
| Consumer group of BFF | `bff-kafka-bridge`                    |
| Partition key         | `tenantId`                            |

Minimum payload for BFF bridge:

```ts
type PaymentCompletedEvent = {
  eventId: string;
  eventType: 'payment.completed';
  schemaVersion: 1;
  tenantId: string;
  paymentId: string;
  billId: string;
  sessionId: string;
  tableId: string;
  amount: number;
  method: 'cash' | 'stripe' | 'bank_transfer';
  paidAt: string;
  occurredAt: string;
  correlationId?: string;
};
```

WS mapping:

- `payment.completed` → `events.paymentCompleted`
- Rooms:
  - `session:{sessionId}:customer`
  - `tenant:{tenantId}:staff`

### 3.4 Internal Redis Pub/Sub event from Kitchen to BFF

Do not add Kafka topic for KDS queue change. Kitchen publishes Redis Pub/Sub after Redis writes successfully.

Channel:

```txt
realtime:kds:{tenantId}
```

BFF subscribe pattern:

```txt
realtime:kds:*
```

Payload:

```ts
type KdsQueueChangedInternalEvent = {
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  ticketId?: string;
  orderId?: string;
  reason:
    | 'TICKET_CREATED'
    | 'TICKET_STARTED'
    | 'TICKET_READY'
    | 'TICKET_RECALLED'
    | 'TICKET_VOIDED'
    | 'PRIORITY_CHANGED'
    | 'TABLE_SNAPSHOT_PATCHED'
    | 'SNAPSHOT_REBUILT'
    | 'SLA_CHANGED';
  revision: number;
  occurredAt: string;
  correlationId?: string;
};
```

Redis Pub/Sub event is a non-durable hint. If BFF or client misses event, reconnect/refetch snapshot must still be correct.

---

## 4. Redis Data Structure — Kitchen Service

### 4.1 Station values

Canonical station values:

```txt
KITCHEN
BAR
```

Station slug used for required phase keys:

```txt
KITCHEN -> kitchen
BAR     -> bar
```

### 4.2 Ticket identity

A ticket represents an order at a station.

```txt
ticketId = {orderId}:{station}
```

For example:

```txt
0a1b...-order-id:KITCHEN
0a1b...-order-id:BAR
```

`ticketId` is deterministic to prevent duplicates when Kafka retry.

### 4.3 Ticket item identity

A `orderItemId` maps directly to a KDS ticket item.

```txt
ticketItemId = {orderItemId}
```

Do not create your own ID if you do not need it, because `orderItemId` is already a persistent identity from Order service.

### 4.4 Core keys

| Key                                                | Type           | TTL / retention                                  | Owner   | Purpose                                                                       |
| -------------------------------------------------- | -------------- | ------------------------------------------------ | ------- | ----------------------------------------------------------------------------- |
| `kds:{tid}:ticket:{ticketId}`                      | Hash           | No TTL when active; set TTL 24-48h later archive | Kitchen | Aggregate root of KDS ticket.                                                 |
| `kds:{tid}:ticket:{ticketId}:items`                | Set            | Same retention with tickets                      | Kitchen | List `ticketItemId`.                                                          |
| `kds:{tid}:ticket-item:{ticketItemId}`             | Hash           | Same retention with tickets                      | Kitchen | State each item in the ticket.                                                |
| `kds:{tid}:order:{orderId}:tickets`                | Set            | Same retention with tickets                      | Kitchen | Lookup tickets according to order to cancel/transfer/patch.                   |
| `kds:{tid}:kitchen`                                | Sorted Set     | No TTL                                           | Kitchen | Active queue of station KITCHEN: contains tickets `PENDING` and `PROCESSING`. |
| `kds:{tid}:bar`                                    | Sorted Set     | No TTL                                           | Kitchen | Active queue of station BAR: contains tickets `PENDING` and `PROCESSING`.     |
| `kds:{tid}:station:{station}:READY`                | Sorted Set     | Recall/pickup window                             | Kitchen | Ticket READY can also be recalled or requires staff visibility.               |
| `kds:{tid}:revision`                               | String counter | No TTL                                           | Kitchen | tenant-level revision.                                                        |
| `kds:{tid}:station:{station}:revision`             | String counter | No TTL                                           | Kitchen | Station-level revision.                                                       |
| `kds:{tid}:dedupe:event:{eventId}`                 | String         | 14 days                                          | Kitchen | Idempotency according to Kafka events.                                        |
| `kds:{tid}:dedupe:order:{orderId}:{station}`       | String         | 14 days                                          | Kitchen | Prevent duplicate tickets by order/station.                                   |
| `kds:{tid}:source-event:{eventId}:tickets`         | Set            | 14 days                                          | Kitchen | Debug mapping event → ticket IDs.                                             |
| `kds:sla:due`                                      | Sorted Set     | No TTL                                           | Kitchen | Global due index for worker SLA.                                              |
| `kds:{tid}:ticket:{ticketId}:sla`                  | Hash           | Same retention with tickets                      | Kitchen | SLA state of the ticket.                                                      |
| `kds:{tid}:dedupe:sla:{ticketId}:{level}:{bucket}` | String         | 24h                                              | Kitchen | Prevent repeated SLA warnings.                                                |
| `kds:cleanup:due`                                  | Sorted Set     | No TTL                                           | Kitchen | Expired tickets archive/delete.                                               |
| `kds:{tid}:dead-letter:order-confirmed`            | List or Stream | Cap 1000 records, TTL 7 days                     | Kitchen | Save invalid payload for debugging.                                           |
| `lock:kds:{tid}:ticket:{ticketId}`                 | String         | PX 5-10s                                         | Kitchen | Optional lock for complex commands.                                           |
| `lock:kds:rebuild:{tid}`                           | String         | PX according to rebuild timeout                  | Kitchen | Prevent multiple rebuilds within the same tenant.                             |

### 4.5 Ticket hash fields

```txt
tenantId
ticketId
orderId
sessionId
tableId
tableName
station
status                 # PENDING | PROCESSING | READY | VOIDED | ARCHIVED
priority               # 0 | 1
queueScore
confirmedAt
createdAt
startedAt
readyAt
voidedAt
archivedAt
recallUntil
slaSeconds
slaDueAt
lastWarningLevel       # NONE | WARNING | BREACH
revision
sourceEventId
correlationId
recovered              # 0 | 1
recoveredAt
updatedAt
```

### 4.6 Ticket item hash fields

```txt
tenantId
ticketItemId
ticketId
orderId
orderItemId
menuItemId
menuItemName
quantity
unitPrice
note
station
status                 # PENDING | PROCESSING | READY | CANCELED
createdAt
startedAt
readyAt
revision
```

### 4.7 Queue score

Redis Sorted Set score:

```txt
PRIORITY_BUCKET_FACTOR = 10_000_000_000_000
priorityRank = 0 if priority = true
priorityRank = 1 if priority = false
queueScore = priorityRank * PRIORITY_BUCKET_FACTOR + confirmedAtEpochMs
```

Meaning:

- Priority tickets always come before normal tickets in the same station.
- FIFO remains inside each priority bucket.
- When turning priority on/off, update `queueScore` in the corresponding active queue.

### 4.8 No batching keys

The following keys are **not created** in Step 2.6:

```txt
kds:{tid}:station:{station}:batches
kds:{tid}:batch:{...}
kds:{tid}:batch:{...}:items
kds:{tid}:ticket-item:{ticketItemId}:batch
```

There is no `prepSignature`, no `activeQuantity`, no group total across orders.

KDS UI can display multiple tickets for the same item, but cannot combine them into a batch backend contract.

---

## 5. KDS Ticket Lifecycle

### 5.1 State machine

```txt
Kafka order.confirmed
        |
        v
     PENDING
        |
        | start
        v
   PROCESSING
        |
        | done
        v
      READY
        |
| recall in recall window
        v
   PROCESSING

PENDING / PROCESSING / READY -- order cancel / compensation --> VOIDED
READY / VOIDED -- cleanup retention --> ARCHIVED
```

### 5.2 Transition rules

| From                           | Big          | Triggers                  | Actor                      | Permission                        | Notes                                                               |
| ------------------------------ | ------------ | ------------------------- | -------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| none                           | `PENDING`    | Kafka `order.confirmed`   | Kitchen consumers          | service principal                 | Idempotent create.                                                  |
| `PENDING`                      | `PROCESSING` | Start ticket              | CHEF/BARISTA/Owner/MANAGER | `KITCHEN_UPDATE_TICKET`           | Station restriction required.                                       |
| `PROCESSING`                   | `READY`      | Done ticket               | CHEF/BARISTA/Owner/MANAGER | `KITCHEN_UPDATE_TICKET`           | Must sync Order service before emitting customer/staff ready event. |
| `READY`                        | `PROCESSING` | Recall                    | CHEF/BARISTA/Owner/MANAGER | `KITCHEN_RECALL`                  | Only in recall window.                                              |
| `PENDING`/`PROCESSING`/`READY` | `VOIDED`     | Order cancel/compensation | Order/BFF-driven command   | According to the original command | Remove from active/ready queue.                                     |
| `READY`/`VOIDED`               | `ARCHIVED`   | Cleanup worker            | Kitchen interior           | service principal                 | Delete from queue, set TTL or delete.                               |

### 5.3 Start ticket

Input command:

```ts
type KdsStartTicketCommand = {
  tenantId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  userId: string;
  requestId: string;
  correlationId?: string;
};
```

Behavior:

1. Validate ticket exists and `tenantId/station` match.
2. Validate ticket status is `PENDING`.
3. Atomically:
   - set ticket `status = PROCESSING`;
   - set `startedAt`;
   - set every ticket item `status = PROCESSING`;
   - increment tenant/station revision;
   - keep member in `kds:{tid}:{stationSlug}` active queue.
4. Publish internal Redis Pub/Sub `kds.queue_changed` reason `TICKET_STARTED`.

Idempotency:

- If same `requestId` repeats after success, return current ticket state.
- If ticket already `PROCESSING`, return success only when same user/request path is idempotent; otherwise return conflict with current state.

### 5.4 Done / ready ticket

Input command:

```ts
type KdsMarkTicketReadyCommand = {
  tenantId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  userId: string;
  requestId: string;
  correlationId?: string;
};
```

Authoritative sequence through BFF:

1. BFF validates JWT + `KITCHEN_UPDATE_TICKET` + station restriction.
2. BFF calls Kitchen TCP `KITCHEN.MARK_READY`.
3. Kitchen atomically transitions Redis ticket `PROCESSING → READY`.
4. BFF calls Order TCP command to mark corresponding order items ready.
5. If Order update succeeds:
   - BFF emits `events.kitchenItemReady` to staff/customer rooms.
   - BFF emits/keeps `events.orderStatusChanged` according to Order response.
6. If Order update fails:
   - BFF calls Kitchen compensation command to recall ticket back to `PROCESSING`.
   - BFF does **not** emit customer ready event.
   - If compensation fails, log critical operational error with `correlationId`.

Kitchen Redis mutation:

- Remove `ticketId` from active queue `kds:{tid}:{stationSlug}`.
- Add `ticketId` to `kds:{tid}:station:{station}:READY` with score `readyAtEpochMs`.
- Set `readyAt`.
- Set `recallUntil = readyAt + recallWindowSeconds`.
- Increment revisions.
- Publish internal event `TICKET_READY`.

### 5.5 Recall ticket

Input command:

```ts
type KdsRecallTicketCommand = {
  tenantId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  userId: string;
  requestId: string;
  reason?: string;
  correlationId?: string;
};
```

Behavior:

1. Validate ticket status is `READY`.
2. Validate `now <= recallUntil`.
3. Atomically:
   - set `status = PROCESSING`;
   - clear `readyAt` or retain as historical field and set `updatedAt`;
   - remove from `READY` sorted set;
   - re-add to active queue `kds:{tid}:{stationSlug}` using original `queueScore`;
   - increment revisions.
4. BFF calls Order Service to revert item/order readiness where business rules allow.
5. Publish internal event `TICKET_RECALLED`.

Recall window default:

```txt
KDS_RECALL_WINDOW_SECONDS = 300
```

### 5.6 Void ticket

Void is not a normal KDS user action. It is triggered by Order cancel or compensation.

Input:

```ts
type KdsVoidTicketsByOrderCommand = {
  tenantId: string;
  orderId: string;
  reason: 'ORDER_CANCELED' | 'STOCK_COMPENSATION' | 'TRANSFER_COMPENSATION';
  correlationId?: string;
};
```

Behavior:

- Lookup `kds:{tid}:order:{orderId}:tickets`.
- For each ticket:
  - set status `VOIDED`;
  - remove from active queue and READY queue;
  - remove SLA due entries where possible;
  - schedule cleanup.
- Publish internal event `TICKET_VOIDED`.

### 5.7 Archive / cleanup

Cleanup worker handles:

- `READY` after recall/pickup window.
- `VOIDED` after debug retention.
- Dangling queue members.

Default retention:

```txt
KDS_READY_RETENTION_SECONDS = 3600
KDS_ARCHIVED_TTL_SECONDS = 86400
```

---

## 6. SLA Worker

### 6.1 SLA policy

Default policy:

```txt
KDS_DEFAULT_SLA_SECONDS = 900          # 15 minutes
KDS_BREACH_GRACE_SECONDS = 300 # add 5 minutes after WARNING
KDS_SLA_WORKER_INTERVAL_MS = 5000
```

Per-tenant/per-station config can be cached at:

```txt
kds:{tid}:settings
```

If there is no tenant settings service, Step 2.6 uses default config from env.

### 6.2 Due index

Key:

```txt
kds:sla:due
```

Member format:

```txt
{tenantId}|{station}|{ticketId}|{level}
```

Scores:

```txt
WARNING score = confirmedAtEpochMs + slaSeconds * 1000
BREACH score  = confirmedAtEpochMs + (slaSeconds + breachGraceSeconds) * 1000
```

### 6.3 Worker algorithm

1. Every `KDS_SLA_WORKER_INTERVAL_MS`, scan:

```txt
ZRANGEBYSCORE kds:sla:due -inf now LIMIT 0 N
```

2. Claim due member using Lua or short lock.
3. Re-read ticket hash.
4. Skip if ticket status is `READY`, `VOIDED`, or `ARCHIVED`.
5. Check dedupe:

```txt
kds:{tid}:dedupe:sla:{ticketId}:{level}:{bucket}
```

6. Produce Kafka `kitchen.sla_warning`.
7. Update `lastWarningLevel`.
8. Publish internal Redis Pub/Sub reason `SLA_CHANGED`.

### 6.4 SLA warning levels

| Level     | Conditions                                             | UI expectations       | Kafka                         |
| --------- | ------------------------------------------------------ | --------------------- | ----------------------------- |
| `WARNING` | `now >= confirmedAt + slaSeconds`                      | Yellow warning ticket | Produce `kitchen.sla_warning` |
| `BREACH`  | `now >= confirmedAt + slaSeconds + breachGraceSeconds` | Red warning ticket    | Produce `kitchen.sla_warning` |

---

## 7. WebSocket Gateway

### 7.1 Namespace

Keep the existing namespace:

```txt
/orders
```

Creating `/kds` is not required in Step 2.6. If the namespace is later separated, the contract room/event will remain the same.

### 7.2 Socket.IO Redis Adapter

BFF must use custom `IoAdapter` with Socket.IO Redis Adapter to broadcast across multiple instances.

Operating requirements:

- Use separate Redis pub/sub client for Socket.IO adapter.
- Register adapter before app listen/gateway operates.
- If long-polling is enabled, the load balancer must be sticky-session; or configure client `transports: ['websocket']`.
- Adapter does not provide replays. Reconnect still requires a REST snapshot.

### 7.3 Handshake auth — Staff

Client sends JWT in one of the supported locations:

```txt
Authorization: Bearer <jwt>
auth.token
```

Gateway must:

1. verify JWT via Authorizer or shared auth verification service equivalent to `UserGuard`.
2. Resolve `tenantId` from claim `tenant_id`.
3. Resolve roles/permissions from AuthorizeResponse.
4. Reject socket if:
   - token invalid;
   - user not provisioned;
   - tenant missing/mismatch;
   - role does not have any valid rooms.

### 7.4 Handshake auth — Customer

Client sent:

```txt
x-session-id
x-tenant-id or tenant context equivalent QR/session flow
```

Gateway must:

1. Validate session ID exists and belongs to the tenant.
2. Do not create new sessions in the WebSocket handshake.
3. Join room `session:{sessionId}:customer` after successful validation.
4. If session expires/closed, reject socket or emit auth error then disconnect.

### 7.5 Room assignment

| Actor    | Room                       |
| -------- | -------------------------- |
| WAITER   | `tenant:{tid}:staff`       |
| CHEF     | `tenant:{tid}:kds:kitchen` |
| BARISTA  | `tenant:{tid}:kds:bar`     |
| OWNER    | `tenant:{tid}:management`  |
| MANAGER  | `tenant:{tid}:management`  |
| CUSTOMER | `session:{sid}:customer`   |

OWNER/MANAGER station subscriptions:

- OWNER/MANAGER may subscribe to `tenant:{tid}:kds:kitchen` and/or `tenant:{tid}:kds:bar`.
- Subscription must be server-validated.
- CHEF/BARISTA cannot subscribe to the other station.

Client-originated `join.staff` and `join.session` are deprecated and must not be trusted after Step 2.6.

### 7.6 WebSocket event names and payloads

#### `events.kdsQueueChanged`

Rooms:

- `tenant:{tid}:kds:kitchen` for KITCHEN.
- `tenant:{tid}:kds:bar` for BAR.
- `tenant:{tid}:management`.

Payload:

```ts
type KdsQueueChangedEvent = {
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  revision: number;
  reason:
    | 'TICKET_CREATED'
    | 'TICKET_STARTED'
    | 'TICKET_READY'
    | 'TICKET_RECALLED'
    | 'TICKET_VOIDED'
    | 'PRIORITY_CHANGED'
    | 'TABLE_SNAPSHOT_PATCHED'
    | 'SNAPSHOT_REBUILT'
    | 'SLA_CHANGED';
  ticketId?: string;
  orderId?: string;
  occurredAt: string;
  correlationId?: string;
};
```

Client action:

- Invalidate/refetch KDS queue snapshot.
- Do not mutate local state as source of truth unless optimistic UI is explicitly guarded by revision.

#### `events.kitchenItemReady`

Rooms:

- `tenant:{tid}:staff`
- `session:{sid}:customer`

Payload:

```ts
type KitchenItemReadyEvent = {
  eventId: string;
  eventType: 'kitchen.item_ready';
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  orderId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  readyItems: Array<{
    orderItemId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    note?: string;
  }>;
  occurredAt: string;
  correlationId?: string;
};
```

Emit condition:

- Only emit after Kitchen ticket/item ready and Order service readiness update are both successful.

#### `events.kitchenSlaWarning`

Rooms:

- `tenant:{tid}:management`
- Station KDS room respectively.

Payload:

```ts
type KitchenSlaWarningWsEvent = KitchenSlaWarningEvent;
```

#### Existing direct events

Step 2.4 events remain:

- `events.cartUpdated`
- `events.orderCreated`
- `events.orderStatusChanged`
- `events.serviceRequested`
- `events.billRequested`
- `events.tableTransferred`

---

## 8. BFF REST Contract for KDS

All endpoint staff use:

```txt
UserGuard -> TenantGuard -> PermissionGuard
```

The global runtime still has `SessionGuard`, but the secured route must bypass the session according to the current pattern.

### 8.1 Get KDS queue

```http
GET /api/v1/admin/kds/queue?station=KITCHEN
GET /api/v1/admin/kds/queue?station=BAR
```

Permission:

```txt
KITCHEN_GET_QUEUE
```

Response:

```ts
type KdsQueueSnapshot = {
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  revision: number;
  serverTime: string;
  tickets: KdsTicketDto[];
};
```

Ticket DTO:

```ts
type KdsTicketDto = {
  ticketId: string;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: 'KITCHEN' | 'BAR';
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'VOIDED' | 'ARCHIVED';
  priority: boolean;
  queueScore: number;
  queuePosition: number;
  confirmedAt: string;
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  recallUntil?: string;
  slaSeconds: number;
  slaDueAt: string;
  waitTimeSeconds: number;
  warningLevel: 'NONE' | 'WARNING' | 'BREACH';
  recovered: boolean;
  items: KdsTicketItemDto[];
};
```

Item DTO:

```ts
type KdsTicketItemDto = {
  ticketItemId: string;
  orderItemId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'CANCELED';
};
```

No batching fields are allowed in this response.

### 8.2 Start ticket

```http
POST /api/v1/admin/kds/tickets/:ticketId/start
```

Permission:

```txt
KITCHEN_UPDATE_TICKET
```

Body:

```ts
type StartTicketRequest = {
  requestId: string;
};
```

### 8.3 Mark ticket done

```http
POST /api/v1/admin/kds/tickets/:ticketId/done
```

Permission:

```txt
KITCHEN_UPDATE_TICKET
```

Body:

```ts
type DoneTicketRequest = {
  requestId: string;
};
```

### 8.4 Recall ticket

```http
POST /api/v1/admin/kds/tickets/:ticketId/recall
```

Permission:

```txt
KITCHEN_RECALL
```

Body:

```ts
type RecallTicketRequest = {
  requestId: string;
  reason?: string;
};
```

### 8.5 Set priority

```http
POST /api/v1/admin/kds/tickets/:ticketId/priority
```

Permission:

```txt
KITCHEN_SET_PRIORITY
```

Body:

```ts
type SetTicketPriorityRequest = {
  requestId: string;
  priority: boolean;
};
```

Authorization:

- OWNER/MANAGER only through new permission.
- CHEF/BARISTA must not receive this permission in `role.json`.

---

## 9. TCP Message Contract

### 9.1 New Kitchen TCP message group

Add conceptual message patterns:

```ts
TCP_REQUEST_MESSAGE.KITCHEN = {
  GET_QUEUE: 'kitchen.get_queue',
  START_TICKET: 'kitchen.start_ticket',
  MARK_READY: 'kitchen.mark_ready',
  RECALL_TICKET: 'kitchen.recall_ticket',
  SET_PRIORITY: 'kitchen.set_priority',
  VOID_BY_ORDER: 'kitchen.void_by_order',
  PATCH_TABLE_SNAPSHOT: 'kitchen.patch_table_snapshot',
  REBUILD_TENANT: 'kitchen.rebuild_tenant',
};
```

### 9.2 Kitchen command common context

```ts
type KitchenCommandContext = {
  tenantId: string;
  userId?: string;
  requestId: string;
  processId?: string;
  correlationId?: string;
};
```

### 9.3 Order TCP additions needed by Step 2.6

Kitchen/BFF needs Order Service support for:

```ts
TCP_REQUEST_MESSAGE.ORDER.KDS_ACTIVE_ORDERS_GET = 'order.kds_active_orders_get';
TCP_REQUEST_MESSAGE.ORDER.MARK_ITEMS_READY = 'order.mark_items_ready';
TCP_REQUEST_MESSAGE.ORDER.REVERT_ITEMS_PROCESSING = 'order.revert_items_processing';
```

These are blueprint-level contracts for the later implementation plan.

`KDS_ACTIVE_ORDERS_GET` response should return active order snapshots shaped close to `OrderConfirmedEvent`, so Kitchen can rebuild Redis without querying Catalog.

---

## 10. Recovery / Rebuild

### 10.1 Trigger conditions

Kitchen must support rebuild when:

1. Kitchen starts and detects missing tenant/station revision keys while active orders exist.
2. Admin/dev explicitly triggers rebuild.
3. Health check detects Redis KDS keys are empty/inconsistent.

### 10.2 Rebuild source

Primary rebuild source:

```txt
Order Service active orders
```

Kitchen calls Order TCP:

```txt
order.kds_active_orders_get
```

Input:

```ts
type KdsActiveOrdersGetRequest = {
  tenantId: string;
  station?: 'KITCHEN' | 'BAR';
};
```

Response:

```ts
type KdsActiveOrderSnapshot = {
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  confirmedAt: string;
  confirmedByUserId?: string;
  items: OrderConfirmedEvent['items'];
  correlationId?: string;
};
```

### 10.3 Rebuild behavior

1. Acquire `lock:kds:rebuild:{tenantId}`.
2. Load active Order snapshots.
3. For each snapshot, derive station tickets.
4. Create missing tickets idempotently.
5. Tickets rebuilt from Order use:

```txt
status = PENDING
recovered = 1
recoveredAt = now
sourceEventId = "rebuild:{tenantId}:{orderId}:{station}"
```

6. If Order item status is already `READY`/`SERVED`, do not rebuild it into active KDS.
7. Increment tenant/station revision.
8. Publish internal event `SNAPSHOT_REBUILT`.
9. Release rebuild lock.

### 10.4 Recovery limitation

Redis rebuild from Order cannot perfectly restore whether a chef had already pressed Start before Redis loss. This is acceptable for Step 2.6 because Order is the durable source and KDS is an operational view.

If siner prep-state recovery is required later, use Kafka replay plus durable KDS audit in a future hardening phase.

---

## 11. Table Transfer Interaction

Step 2.4 transfer table remains BFF Direct and does not add Kafka topic.

After transfer succeeds:

1. BFF receives authoritative `tableTransferred` response from Order/Catalog saga.
2. BFF emits existing `events.tableTransferred`.
3. BFF calls Kitchen TCP:

```txt
kitchen.patch_table_snapshot
```

Input:

```ts
type PatchKdsTableSnapshotCommand = {
  tenantId: string;
  sessionId: string;
  fromTableId: string;
  toTableId: string;
  toTableName: string;
  requestId: string;
  correlationId?: string;
};
```

Kitchen behavior:

- Find active tickets by scanning/maintaining session lookup.
- Patch `tableId/tableName` on ticket hashes.
- Increment revision.
- Publish internal event `TABLE_SNAPSHOT_PATCHED`.

Recommended additional index:

```txt
kds:{tid}:session:{sessionId}:tickets
```

Type:

```txt
Set(ticketId)
```

Retention:

- Same as ticket retention.

---

## 12. RBAC Updates

### 12.1 New permission

Add:

```ts
PERMISSION.KITCHEN_SET_PRIORITY = 'kitchen.set_priority';
```

### 12.2 Role matrix update

| Permission              | SUPER_ADMIN | OWNER | MANAGER | WAITER | CHEF | BARISTA |
| ----------------------- | ----------- | ----- | ------- | ------ | ---- | ------- |
| `kitchen.get_queue`     | yes         | yes   | yes     | no     | yes  | yes     |
| `kitchen.update_ticket` | yes         | yes   | yes     | no     | yes  | yes     |
| `kitchen.recall`        | yes         | yes   | yes     | no     | yes  | yes     |
| `kitchen.set_priority`  | yes         | yes   | yes     | no     | no   | no      |

### 12.3 Station restriction

Permission alone is not enough. Service must also enforce station scope:

| Role        | Station access                                              |
| ----------- | ----------------------------------------------------------- |
| CHEF        | `KITCHEN` only                                              |
| BARISTA     | `BAR` only                                                  |
| OWNER       | `KITCHEN`, `BAR`                                            |
| MANAGER     | `KITCHEN`, `BAR`                                            |
| SUPER_ADMIN | Debug/admin only; tenant rules still need explicit handling |

---

## 13. Idempotency and Race Conditions

### 13.1 Kafka consumer idempotency

Kitchen consumer must treat duplicates as success.

Atomic create script must ensure:

```txt
SET NX kds:{tid}:dedupe:event:{eventId}
SET NX kds:{tid}:dedupe:order:{orderId}:{station}
```

If dedupe keys already exist and ticket exists, handler returns success and commits Kafka offset.

### 13.2 Command idempotency

Every mutating REST command requires `requestId`.

Recommended key:

```txt
kds:{tid}:command:{requestId}
```

Type:

```txt
String or Hash
```

TTL:

```txt
24h
```

Stores:

- command type;
- ticketId;
- result status;
- response snapshot hash or minimal result.

### 13.3 Atomicity

Use Lua script or `WATCH`/`MULTI` for any operation touching multiple keys:

- create ticket from Kafka;
- start ticket;
- mark ready;
- recall;
- priority update;
- void ticket;
- SLA claim;
- cleanup.

No independent `GET` then `SET` sequence is allowed for ticket status transitions.

---

## 14. Reconnection and Snapshot Policy

### 14.1 KDS client reconnect

On socket reconnect:

1. Gateway re-authenticates socket.
2. Gateway rejoins server-derived rooms.
3. Client immediately calls queue snapshot REST.
4. Client replaces local KDS state with snapshot.

### 14.2 Revision policy

Every KDS snapshot includes:

```txt
revision
serverTime
```

Every KDS WS hint includes:

```txt
revision
```

If client observes a revision gap or any reconnect event, it refetches snapshot.

### 14.3 No pending event replay

Step 2.6 does not implement durable WS packet replay.

Allowed:

- reconnect → REST snapshot;
- React Query invalidation;
- optional local UI optimistic state while request is pending.

Not allowed:

- relying on Socket.IO adapter for replay;
- storing mandatory UI events only in memory.

---

## 15. No Batching Policy

This section is intentionally explicit because older docs mention batching.

### 15.1 Removed concepts

The following concepts do not exist in Step 2.6:

- batch queue;
- batch total;
- batch item group;
- prep signature;
- grouped KDS row;
- "same item across tables" aggregation;
- batch Redis key;
- batch WebSocket event;
- batch API endpoint.

### 15.2 Display rule

If three tables order `Pho bo`, KDS shows them as normal tickets/items according to order/station/FIFO/priority. It does not show "Pho bo x3" as a backend-derived group.

### 15.3 Same order duplicate item lines

If the same order contains multiple lines for the same menu item:

- Keep them as their own `orderItemId` lines.
- Do not merge them in Kitchen.
- UI may render them visually adjacent inside the same ticket, but the backend state remains line-based.

---

## 16. Acceptance Criteria — Updated

### 16.1 KDS

- `order.confirmed` creates deterministic station tickets in Redis.
- Same Kafka event retry does not create duplicate tickets.
- FIFO works by `confirmedAt` within normal priority bucket.
- Priority moves ticket before normal tickets and is Owner/Manager-only.
- CHEF cannot access BAR queue; BARISTA cannot access KITCHEN queue.
- Start/Done/Recall mutate Redis atomically and increment revision.
- Done updates Order Service before customer/staff ready notification is emitted.
- Recall is possible only within recall window.
- Transfer table patches active KDS ticket table snapshot.
- Redis rebuild from Order active orders works after empty KDS Redis state.
- No batching behavior exists anywhere in backend contract.

### 16.2 SLA

- SLA worker emits `kitchen.sla_warning` without requiring HTTP traffic.
- Duplicate worker scans do not emit repeated warnings for the same bucket.
- WARNING and BREACH levels map to station room and management room.

### 16.3 WebSocket

- Socket rooms are server-derived from JWT/session.
- Client cannot self-join arbitrary tenant/session/station rooms.
- Socket.IO Redis Adapter supports multi-instance broadcast.
- Reconnect triggers room rejoin and REST snapshot refresh.
- WS event is a hint; REST snapshot is source of truth.

### 16.4 Kafka / topic contract

- Canonical topics:
  - `order.confirmed`
  - `kitchen.sla_warning`
  - `payment.completed`
- No `kitchen.sla_warn`.
- No `kitchen.ticket_changed` in Step 2.6.
- BFF does not emit KDS queue directly from `order.confirmed`.

---

## 17. Verification Scenarios for Future Plan

These are scenario requirements, not implementation tasks.

1. Publish `order.confirmed` with KITCHEN item → Redis ticket appears in `kds:{tid}:kitchen`; KDS room receives `events.kdsQueueChanged`.
2. Publish duplicate `order.confirmed` with same `eventId` → no duplicate ticket.
3. Publish duplicate with different `eventId` but same `(orderId, station)` → no duplicate ticket.
4. Start ticket as CHEF for KITCHEN → success.
5. Start BAR ticket as CHEF → 403/permission or station scope error.
6. Set priority as MANAGER → queue score updates.
7. Set priority as CHEF → forbidden.
8. Done ticket → Kitchen Redis ready + Order item ready + customer/staff WS ready event.
9. Done ticket while Order update fails → Kitchen rollback/compensation and no customer ready event.
10. Recall within window → ticket returns to PROCESSING.
11. Recall after window → conflict.
12. SLA due passes with no requests → Kafka `kitchen.sla_warning` produced.
13. KDS client disconnects before ticket created, reconnects later → queue snapshot contains ticket.
14. Redis KDS keys flushed while Order has active PROCESSING orders → rebuild recreates KDS tickets with `recovered = true`.
15. Multiple same menu items across tables → no batch/group total appears in API or Redis.

---

## 18. Historical Implementation Boundaries

When comparing implementations or writing hardening plans later, you must still keep the locked boundaries:

1. Do not reintroduce batching as "small helper" or UI convenience.
2. Add `KITCHEN_SET_PRIORITY` before exposing priority endpoint.
3. Build WS handshake hardening before relying on KDS rooms.
4. Treat Redis Pub/Sub as hint channel only.
5. Include recovery/rebuild in the first complete Step 2.6 slice, because Redis-only without rebuild is an unsafe operational story.
