# Step 2.6 Architecture Audit & Edge Cases

> Phase: 2B — Kitchen Service + WebSocket Gateway  
> Date: 2026-05-05  
> Scope: business logic and architecture audit only. This is **not** an implementation plan.  
> Requested gate: after this report, stop and wait for decisions before writing `docs/specs/business-logic-step-2.6-spec.vi.md`.

## 0. Sources Checked

Primary docs:

- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-2a-order-kafka.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/implementation_plan.md`
- `docs/business-logic-step-2.4-spec.vi.md`
- `docs/superpowers/specs/2026-04-28-step-2.4-architecture-decisions.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- Step 2.4 and Step 2.5 handoff docs under `docs/superpowers/handoffs/`

Codebase scan:

- No MCP codebase resources were configured in this Codex session (`list_mcp_resources` and `list_mcp_resource_templates` returned empty), so codebase reality was scanned with `rg`, `sed`, and `ls`.
- Relevant current files inspected include:
  - `apps/order/src/app/modules/order/services/order.service.ts`
  - `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`
  - `apps/order/src/app/modules/order/order-confirmed-payload.ts`
  - `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
  - `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - `libs/shared/types/src/lib/realtime-events.types.ts`
  - `libs/configuration/src/lib/kafka.config.ts`
  - `libs/providers/redis-client/src/lib/redis-client.service.ts`
  - `libs/guards/src/lib/*.ts`
  - `apps/user-access/src/seeder/role.json`

Context7:

- Ran `npx ctx7@latest library NestJS ...` and selected `/nestjs/docs.nestjs.com`.
- Ran `npx ctx7@latest docs /nestjs/docs.nestjs.com ...`.
- Relevant findings: NestJS Kafka examples require explicit `client.clientId`, `client.brokers`, and `consumer.groupId`; NestJS Socket.IO multi-instance broadcast requires a custom `IoAdapter` using `@socket.io/redis-adapter`, registered before gateway use. The adapter only shares Socket.IO packets across instances; it is not durable replay.

## 1. Executive Summary

Step 2.6 is feasible, but the current specification still mixes three different timing models:

1. Kitchen Service consumes `order.confirmed`, writes KDS state to Redis, then KDS clients read current queue state.
2. Earlier drafts allowed BFF to consume `order.confirmed` directly and push WebSocket events to KDS/staff rooms.
3. BFF emits direct WebSocket side effects only after authoritative TCP command responses.

These models can all exist, but the order of operations must be made explicit. The most dangerous blind spot is: if BFF emits `order.confirmed` to KDS before Kitchen has written Redis, reconnect/refetch clients can receive a "new ticket" hint and then load an empty or stale queue snapshot.

The second critical blind spot is WebSocket trust boundary. Current BFF WebSocket code accepts `join.staff` with a client-supplied `tenantId` and `join.session` with a client-supplied `sessionId`. That was acceptable for Step 2.4/2.5 minimal realtime hints, but it is not acceptable for Step 2.6 role-scoped KDS rooms.

The third critical blind spot is Redis-only durability. Kitchen Service deliberately has no PostgreSQL database, so Redis key design must include retention, cleanup, idempotency, revisioning, and a rebuild strategy after Redis restart/flush. "Redis-only" cannot mean "state can disappear silently during demo".

Recommended direction for the final spec:

- Treat WebSocket messages as invalidation hints, never as source of truth.
- On connect/reconnect, every KDS/POS/customer client must fetch a REST snapshot with a server revision.
- Kitchen should own KDS Redis writes and expose authoritative queue snapshots.
- BFF should own socket authentication and room delivery.
- KDS mutations should be REST/TCP commands through BFF guards, not client-originated WebSocket commands.
- Batching/gộp món is superseded by the final Step 2.6 decision record and must not be implemented under any name.

## 2. Current Codebase Reality

### What already exists and helps Step 2.6

| Area                      | Current reality                                                                                                                                                                                  | Why it helps                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Order outbox              | `OutboxPublisherService` polls `outbox_events` every 2s and publishes with KafkaJS.                                                                                                              | Step 2.6 can consume `order.confirmed` without adding dual-write risk in Order confirm flow. |
| `order.confirmed` payload | `buildOrderConfirmedKafkaPayload()` includes `eventId`, `eventType`, `schemaVersion`, `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, item station, timestamps, and `correlationId`. | Good enough to create KDS tickets without querying Order/Catalog for basic routing.          |
| Catalog station           | `MenuItem.station` exists and `VALIDATE_ORDERABLE` returns station snapshot.                                                                                                                     | Matches Step 2.4 decision Q11 and Step 2.6 canonical routing.                                |
| Redis direct client       | `libs/providers/redis-client` uses `ioredis` and Order Service already uses Redis hashes/transactions for cart/session.                                                                          | Kitchen Service can reuse or extend this provider for hashes, sorted sets, Lua, and locks.   |
| RBAC constants            | `KITCHEN_GET_QUEUE`, `KITCHEN_UPDATE_TICKET`, `KITCHEN_RECALL` exist and role seed gives them to OWNER/MANAGER/CHEF/BARISTA.                                                                     | Base permissions are ready for queue/update/recall endpoints.                                |
| Minimal WS service        | BFF has `/orders` Socket.IO gateway and direct event service for cart/order/service/bill/table transfer.                                                                                         | A starting point exists, but it must be hardened before Step 2.6.                            |

### What is not implemented yet

| Missing piece                 | Evidence                                                                                                                  | Impact                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/kitchen` service        | `ls apps` has no `kitchen`.                                                                                               | No Kafka consumer, no KDS Redis owner, no KDS command API.                                                      |
| Kafka consumer config         | `libs/configuration/src/lib/kafka.config.ts` only exposes `ORDER_CONFIRMED_TOPIC`; no consumer group IDs or other topics. | Step 2.6 needs `kitchen-service-group`, BFF bridge group, `kitchen.sla_warning`, and later `payment.completed`. |
| Socket.IO Redis adapter       | `package.json` has `socket.io`, but no `@socket.io/redis-adapter`. No custom `IoAdapter` exists.                          | Horizontal BFF gateway scaling is not ready.                                                                    |
| WS authenticated handshake    | `join.staff` trusts `tenantId`; `join.session` trusts `sessionId`.                                                        | Cross-tenant room join is possible if exposed beyond dev/test.                                                  |
| KDS REST endpoints            | TCP constants have no `KITCHEN` message group and BFF has no `/kds` controllers.                                          | Queue query/start/done/recall/priority endpoints still need contract decisions.                                 |
| KDS real frontend integration | Step 2.5 handoffs explicitly keep KDS mock/deferred.                                                                      | UI currently cannot be used to verify real queue semantics.                                                     |

## 3. Conflict & Blind Spots

### C01 — BFF Kafka Bridge vs Kitchen Redis Write Ordering

Earlier Step 2.6 drafts said BFF Kafka Consumer Bridge maps `order.confirmed` to KDS/staff rooms. The final decision supersedes that: BFF must not emit KDS queue changes directly from `order.confirmed`. Kitchen Service consumes `order.confirmed`, writes Redis tickets first, then publishes an internal invalidation hint. If BFF and Kitchen independently emit from the same Kafka event, packet ordering is not guaranteed across consumer groups.

Risk:

- BFF emits `events.kdsQueueChanged`.
- KDS client refetches queue immediately.
- Kitchen has not written Redis yet.
- UI misses the new ticket until another event or polling interval.

This is a correctness issue, not just a UX issue. The final spec must decide whether `order.confirmed` WS hints are emitted before or after Kitchen Redis mutation.

### C02 — Current WebSocket Join Is Client-Controlled

Current gateway:

- `join.staff` joins `tenant:${body.tenantId}:staff`.
- `join.session` joins `session:${body.sessionId}:customer`.

There is no server-side JWT verification, no session lookup, no tenant consistency check, and no role/station restriction inside the gateway. This conflicts with Step 2.6 room assignment and the global auth model.

Required for Step 2.6:

- Staff socket handshake must validate JWT through the same trust boundary as `UserGuard` or a shared auth service.
- Customer socket handshake must validate session ID and tenant binding.
- Rooms must be derived by server from token/session, not from client body.
- CHEF can join only `tenant:{tid}:kds:kitchen`; BARISTA can join only `tenant:{tid}:kds:bar`.
- OWNER/MANAGER need an explicit rule for management room and optional station subscriptions.

### C03 — Socket.IO Redis Adapter Does Not Provide Replay

Context7 confirms NestJS multi-instance Socket.IO requires a custom `IoAdapter` with Redis pub/sub. This adapter solves cross-instance broadcast, not durable delivery.

Risk:

- A client disconnected during `events.kdsQueueChanged` will not receive that packet later.
- Reconnect and room rejoin are necessary but not sufficient.

Required policy:

- On reconnect, client fetches REST snapshot from Kitchen/Order.
- WS payloads carry `revision` so clients can detect stale local state.
- No screen should rely on "pending events" stored in Socket.IO.

### C04 — Topic Registry and Naming Drift

Docs previously mixed the canonical topic with a shortened non-canonical variant.

The canonical registry in `technical-architecture.md` and Step 2.6 uses `kitchen.sla_warning`.

Code currently has only:

- `KAFKA_ORDER_CONFIRMED_TOPIC=order.confirmed`

Required:

- Canonicalize `kitchen.sla_warning`.
- Add topic config constants for `kitchen.sla_warning` and `payment.completed` before BFF bridge work.
- Do not introduce extra Kafka topics unless explicitly approved.

### C05 — Priority Flagging Has No Dedicated Permission

Step 2.6 says Owner/Manager can mark priority. Existing permissions are:

- `kitchen.get_queue`
- `kitchen.update_ticket`
- `kitchen.recall`

But CHEF/BARISTA also have `kitchen.update_ticket`. If priority is implemented as generic update, chefs/baristas may get priority control accidentally.

Options:

- Add `KITCHEN_SET_PRIORITY`.
- Keep `KITCHEN_UPDATE_TICKET` but enforce role-level check for OWNER/MANAGER only.
- Allow CHEF/BARISTA to set station-local priority intentionally.

This needs a decision because it affects the permission matrix and UX.

### C06 — Redis-only KDS Needs Recovery Semantics

Kitchen Service has no database by design. Redis is primary operational state for KDS, but Redis can restart, flush, evict, or lose volatile memory depending on deployment.

Blind spot:

- Existing docs say Redis-only but do not define rebuild.
- If Redis is empty while Order has `PROCESSING` orders, Kitchen queue is wrong.

Minimum needed:

- Redis production policy: avoid evicting active KDS keys.
- Recovery path: rebuild active tickets from Order active orders, or replay Kafka from retention and reconcile.
- Health/readiness must fail or degrade if Kitchen cannot trust KDS state after startup.

### C07 — Superseded: No Batching Under Any Name

Earlier audit notes discussed batching/gộp món rules. The final Step 2.6 decision removes batching entirely.

Required:

- Do not create backend batch keys, batch DTO fields, batch events, `prepSignature`, grouped active quantity, or cross-order batch totals.
- Keep one KDS ticket per `(tenantId, orderId, station)` with item-level prep state.
- If UI needs visual grouping later, it must be a separate future decision and cannot change Step 2.6 backend contracts.

Recommendation: remove batching from Step 2.6 implementation scope.

### C08 — Atomic Updates Still Required Without Batch Projection

Ticket creation, ticket status transition, queue index updates, SLA scheduling, and revision increments still touch multiple Redis keys. These mutations must be atomic even though batch projections are not implemented.

Examples:

- Duplicate `order.confirmed` events create the same station ticket concurrently.
- Chef marks item done while SLA worker is scanning.
- Recall or cleanup races with ticket queue/index updates.

Required:

- Use Lua scripts or `WATCH`/`MULTI` with revision checks for multi-key KDS mutations.
- Prefer Lua for status transitions because several keys must move consistently.

### C09 — Done/Ready Must Sync with Order Service

Business logic says KDS state must match what customer sees. Kitchen Redis can mark a ticket READY, but Order Service owns customer-visible order/order-item state.

Risk:

- Kitchen says READY.
- Order Service update fails.
- Customer still sees PROCESSING.

Required:

- BFF command path for Done should orchestrate:
  1. authorize actor;
  2. transition Kitchen ticket/item to READY with idempotency key;
  3. update Order item/order readiness through Order Service;
  4. emit `kitchen.item_ready` / `order.status_changed` only after authoritative success.
- Or invert it: Order Service command calls Kitchen. But one service must own the orchestration and compensation rule.

### C10 — Recall Requires READY Retention

Step 2.6 says Done removes ticket from KDS screen and Recall puts it back into Processing. If READY tickets are deleted immediately, recall is impossible.

Required:

- READY tickets must remain in Redis for a recall window.
- Use `kds:{tid}:station:{station}:READY` sorted set or equivalent.
- Cleanup after recall/pickup retention, not immediately at Done.

### C11 — Transfer Table After KDS Ticket Exists

Step 2.4 transfer table is BFF Direct and explicitly does not add a Kafka topic. But active KDS tickets contain denormalized `tableId/tableName`.

Risk:

- Staff transfers a session after order confirmed.
- POS/customer show new table.
- KDS still shows old table.

Required:

- Final spec must define how `table.transferred` patches active KDS Redis tickets.
- Since no Kafka topic is allowed for table rename, likely BFF should call Kitchen command after transfer success, or Kitchen should expose `patchTableSnapshotBySession`.

### C12 — Customer Room Does Not Include Tenant

The room contract is `session:{sid}:customer`. This is acceptable only if session IDs are globally unguessable and every handshake validates tenant/session binding. It is weaker for observability and isolation than `tenant:{tid}:session:{sid}:customer`.

Given Step 2.6 explicitly fixes the room name, keep the room name but require handshake validation and never let clients self-join arbitrary session rooms.

### C13 — Outbox Publisher Can Publish Duplicate Kafka Messages

Current publisher sends Kafka then marks row published. If Kafka send succeeds but `markPublished` fails, it will retry the same row and publish duplicate `order.confirmed` with the same payload/eventId.

This is normal at-least-once behavior. Kitchen must dedupe by `eventId` and should also dedupe by deterministic ticket identity `(tenantId, orderId, station)`.

### C14 — SLA Trigger Cannot Depend on HTTP Requests

Step 2.6 asks how `kitchen.sla_warning` is triggered if no request comes in. It must be a background worker/timer inside Kitchen Service or an external queue scheduler.

Request-driven checks are invalid because quiet periods are exactly when missed SLA warnings matter.

### C15 — BFF Direct vs Kafka Duplicate Customer Status Events

Step 2.4 already emits `order.status_changed` after staff confirm. Step 2.6 says Kafka bridge maps `order.confirmed` too.

Risk:

- Customer/POS receives both `events.orderStatusChanged` and a Kafka-derived `order.confirmed`/status hint for the same transition.

Required:

- Final spec should avoid Kafka-as-UI-proxy for status already emitted by BFF Direct.
- If BFF consumes `order.confirmed`, its role is customer/session tracking only; KDS queue invalidation must come from Kitchen's post-Redis-write `kds.queue_changed` hint.

## 4. Proposed Redis Data Structure Draft

This draft keeps Step 2.6's required station queue names while adding the extra indexes needed for race-free operations, SLA, reconnect snapshot, and cleanup. Batching/gộp món is explicitly out of scope.

### 4.1 Naming Conventions

Use uppercase station values in payloads and keys:

- `KITCHEN`
- `BAR`

Compatibility aliases for required phase doc names:

- `kds:{tenantId}:kitchen` means active KITCHEN display queue.
- `kds:{tenantId}:bar` means active BAR display queue.

Internal keys should use a clearer station namespace:

- `kds:{tenantId}:station:{station}:PENDING`
- `kds:{tenantId}:station:{station}:PROCESSING`
- `kds:{tenantId}:station:{station}:READY`

### 4.2 Ticket Identity

Recommended ticket identity:

```txt
ticketId = kds_{tenantIdHash}_{orderId}_{station}
```

or simply deterministic internal ID:

```txt
{orderId}:{station}
```

Reason:

- Kafka retries can be processed idempotently.
- One order can produce two tickets: one KITCHEN, one BAR.
- `orderId` alone is not enough once station split is real.

### 4.3 Queue Score

Sorted sets return lower scores first. Recommended score:

```txt
PRIORITY_BUCKET_FACTOR = 10_000_000_000_000
priorityRank = 0 for priority, 1 for normal
queueScore = priorityRank * PRIORITY_BUCKET_FACTOR + confirmedAtEpochMs
```

Properties:

- Priority tickets always appear before normal tickets.
- FIFO is preserved inside each priority bucket.
- The value stays within safe Redis double precision for current epoch ranges.

If "priority should jump only within a station/day" is preferred, choose that in the open questions.

### 4.4 Core Keys

| Key                                      | Type           | TTL / retention                                  | Purpose                                         |
| ---------------------------------------- | -------------- | ------------------------------------------------ | ----------------------------------------------- |
| `kds:{tid}:ticket:{ticketId}`            | Hash           | No TTL while active; expire 24-48h after archive | Ticket aggregate root.                          |
| `kds:{tid}:ticket:{ticketId}:items`      | Set            | Same as ticket                                   | Item IDs inside ticket.                         |
| `kds:{tid}:ticket-item:{ticketItemId}`   | Hash           | Same as ticket                                   | Per-item prep state and snapshots.              |
| `kds:{tid}:order:{orderId}:tickets`      | Set            | Same as ticket                                   | Fast lookup for cancel/transfer/order patch.    |
| `kds:{tid}:station:{station}:PENDING`    | Sorted Set     | No key TTL; remove members on transition         | Pending queue.                                  |
| `kds:{tid}:station:{station}:PROCESSING` | Sorted Set     | No key TTL; remove members on transition         | In-progress queue.                              |
| `kds:{tid}:station:{station}:READY`      | Sorted Set     | Recall/pickup retention                          | Ready tickets for recall/pickup visibility.     |
| `kds:{tid}:kitchen`                      | Sorted Set     | No key TTL                                       | Compatibility active view for `KITCHEN`.        |
| `kds:{tid}:bar`                          | Sorted Set     | No key TTL                                       | Compatibility active view for `BAR`.            |
| `kds:{tid}:revision`                     | String counter | No TTL                                           | Monotonic queue revision for reconnect/refetch. |
| `kds:{tid}:station:{station}:revision`   | String counter | No TTL                                           | Optional station-level revision.                |

Suggested ticket hash fields:

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
updatedAt
```

Suggested ticket item hash fields:

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
normalizedNote
modifierHash           # empty string until modifiers exist
station
status                 # PENDING | PROCESSING | READY | CANCELED
createdAt
startedAt
readyAt
revision
```

### 4.5 No Batching Keys

Step 2.6 must not create batching/gộp món data structures under any name.

Do not add:

- station batch indexes,
- `kds:{tid}:batch:*` hashes,
- active grouped quantity counters,
- `prepSignature` fields,
- reverse lookup keys from ticket items to batch summaries,
- batch DTO fields or batch WebSocket events.

Tickets/items remain the only authoritative KDS prep state. Queue snapshots expose FIFO/priority ticket ordering, not cross-order grouped prep totals.

### 4.6 Idempotency and Kafka Dedupe Keys

| Key                                          | Type   | TTL                                   | Purpose                                                    |
| -------------------------------------------- | ------ | ------------------------------------- | ---------------------------------------------------------- |
| `kds:{tid}:dedupe:event:{eventId}`           | String | 7-14 days or Kafka retention + safety | Idempotency for Kafka event processing.                    |
| `kds:{tid}:dedupe:order:{orderId}:{station}` | String | 7-14 days                             | Prevent duplicate station tickets even if eventId differs. |
| `kds:{tid}:source-event:{eventId}:tickets`   | Set    | Same as dedupe                        | Debug mapping from event to generated tickets.             |

Consumer rule:

1. Validate payload schema/version and tenant.
2. Derive station groups.
3. For each station, derive deterministic ticketId.
4. Run atomic Redis script:
   - `SET NX dedupe:event:{eventId}` or verify existing mapping.
   - `SET NX dedupe:order:{orderId}:{station}`.
   - create ticket/items/queues/SLA.
   - increment revision.
5. Commit Kafka offset only after Redis mutation succeeds.

If event dedupe exists and ticket mapping exists, return success and commit offset.

### 4.7 SLA Keys

| Key                                                | Type       | TTL / retention | Purpose                                  |
| -------------------------------------------------- | ---------- | --------------- | ---------------------------------------- |
| `kds:sla:due`                                      | Sorted Set | No key TTL      | Global due index. Score = due timestamp. |
| `kds:{tid}:ticket:{ticketId}:sla`                  | Hash       | Same as ticket  | SLA policy and warning state.            |
| `kds:{tid}:dedupe:sla:{ticketId}:{level}:{bucket}` | String     | 1-24h           | Prevent duplicate warnings.              |
| `lock:kds:sla:{ticketId}`                          | String     | PX 5-10s        | Optional claim lock.                     |

Suggested `kds:sla:due` member:

```txt
{tenantId}|{station}|{ticketId}|{level}
```

SLA worker rule:

1. Poll `ZRANGEBYSCORE kds:sla:due -inf now LIMIT 0 N`.
2. Claim due entries atomically using Lua or short lock.
3. Re-read ticket state.
4. Skip if `READY`, `VOIDED`, `ARCHIVED`.
5. Emit Kafka `kitchen.sla_warning` once per warning bucket.
6. Update ticket SLA hash and reschedule next level if any.

### 4.8 Cleanup and Retention Keys

| Key                                 | Type                     | TTL / retention | Purpose                                 |
| ----------------------------------- | ------------------------ | --------------- | --------------------------------------- |
| `kds:cleanup:due`                   | Sorted Set               | No key TTL      | Tickets/items ready for archive/delete. |
| `kds:{tid}:ticket:{ticketId}:audit` | Stream or List, optional | 24-48h          | Short debug trail if needed.            |

Cleanup rule:

- Do not put TTL directly on active ticket hashes while they are in active sorted sets.
- When a ticket becomes terminal (`READY` after pickup window, `VOIDED`, or explicit archive), remove it from active queues first.
- Then either delete immediately or set TTL 24-48h for debug.
- Cleanup must remove dangling members from station queues.

## 5. Event Delivery and Idempotency

### 5.1 `order.confirmed` Consumer Contract

Kitchen consumer should treat Kafka as at-least-once:

- Duplicate messages are normal.
- Message processing can crash after Redis write but before offset commit.
- Rebalancing can re-deliver messages.

Required invariants:

- A single `(tenantId, orderId, station)` creates at most one active KDS ticket.
- Reprocessing the same event is a success, not an error.
- Different stations from the same order can be created independently but should use the same correlation ID.

### 5.2 Consumer Group

Use a dedicated group:

```txt
kitchen-service-group
```

For BFF Kafka bridge, use a separate group:

```txt
bff-kafka-bridge
```

But see open question Q1: BFF consuming `order.confirmed` directly can race with Kitchen Redis writes.

### 5.3 Producer Semantics

Current Order outbox is correct for Step 2.6 baseline:

- DB transition and outbox row are in one Order transaction.
- Publisher sends later.
- Duplicate Kafka publish is possible and must be handled downstream.

Hardening to consider later:

- Producer acks/idempotent producer config.
- Outbox row lock/claim if multiple Order instances run publisher.
- Dead-letter handling for `FAILED` outbox rows.

These are not blockers for business logic, but they affect production readiness.

## 6. WebSocket Reconnection and State Sync

WebSocket must be a hint channel. Snapshot APIs are source of truth.

### 6.1 Staff / KDS Reconnect Flow

1. Client reconnects to `/orders` or future `/kds` namespace.
2. Handshake carries JWT.
3. Gateway verifies JWT and derives:
   - `tenantId`
   - roles
   - permissions
   - station access
4. Gateway joins server-derived rooms:
   - WAITER: `tenant:{tid}:staff`
   - CHEF: `tenant:{tid}:kds:kitchen`
   - BARISTA: `tenant:{tid}:kds:bar`
   - OWNER/MANAGER: `tenant:{tid}:management`, and optionally station rooms if approved.
5. Client immediately calls REST:
   - `GET /api/v1/admin/kds/queue?station=KITCHEN`
   - or equivalent route.
6. Snapshot response includes:
   - `tenantId`
   - `station`
   - `revision`
   - `tickets`
   - `serverTime`
7. Future WS events include `revision`.
8. If client sees a revision gap or reconnect event, refetch snapshot.

### 6.2 Customer Reconnect Flow

1. Client reconnects with session ID and tenant context from existing customer session flow.
2. Gateway validates session via BFF/Order session source.
3. Gateway joins `session:{sid}:customer`.
4. Client refetches order tracking state through REST.
5. WS events only trigger React Query invalidation/refetch.

### 6.3 Pending Events Policy

Do not build pending event replay in Socket.IO for Step 2.6. It increases complexity and still needs conflict resolution.

Use:

- REST snapshot after reconnect.
- Server revision in every KDS queue event.
- Optional short Redis Stream for audit/debug later, not required for UI correctness.

## 7. Open Questions for Approval

### Q1 — Who emits the KDS queue-changed WebSocket hint after `order.confirmed`?

#### Option A — BFF consumes `order.confirmed` directly and emits KDS hint

Pros:

- Matches the simple reading of Step 2.6 "Kafka Consumer Bridge".
- BFF bridge owns all Kafka-to-WS mapping.
- No extra internal channel.

Cons:

- Race with Kitchen consumer writing Redis.
- KDS client may refetch before ticket exists.
- Requires client retry/backoff around snapshot.

#### Option B — Kitchen writes Redis, then notifies BFF through Redis Pub/Sub/internal event

Pros:

- WS hint happens after authoritative KDS state exists.
- No extra Kafka topic.
- Fits "Kitchen owns Redis; BFF owns WS".

Cons:

- Adds internal BFF/Kitchen coupling through Redis Pub/Sub.
- Redis Pub/Sub is not durable, but this is acceptable if WS is only a hint.

#### Option C — Add a new Kafka topic `kitchen.ticket_changed`

Pros:

- Durable cross-service event after Kitchen state change.
- Clean event ordering for BFF bridge.

Cons:

- Expands topic registry beyond the 5 approved topics.
- More infrastructure and contract surface for Step 2.6.

Recommendation: **Option B** for Step 2.6. It prevents the most obvious race without expanding Kafka topics.

### Q2 — How should SLA warnings be triggered?

#### Option A — Redis due sorted set + Kitchen worker

Pros:

- Minimal dependency.
- Precise enough for KDS SLA.
- Works without HTTP traffic.
- Easy to make idempotent with claim/dedupe keys.

Cons:

- Requires careful Lua/claim logic in multi-instance Kitchen.
- Worker observability must be added.

#### Option B — BullMQ delayed jobs

Pros:

- Mature Redis-backed job semantics.
- Retries, delayed jobs, and dashboard tooling are common.

Cons:

- Adds a new operational abstraction and dependency.
- Can be heavier than needed for Step 2.6.
- Still requires idempotency and cleanup.

#### Option C — Redis keyspace notifications

Pros:

- Conceptually simple: expire key, receive event.

Cons:

- Requires Redis server config.
- Expiry notifications are not a durable queue.
- Missed notifications after restart/disconnect are possible.
- Harder to test deterministically.

Recommendation: **Option A**. Avoid keyspace notifications for business-critical SLA.

### Q3 — What is the batching rule?

Decision: **No batching under any name**.

Step 2.6 does not implement persistent batch indexes, derived batch projections, `prepSignature`, grouped active quantities, batch DTO fields, or batch events. KDS queue snapshots remain ticket/item snapshots ordered by FIFO/priority.

Rationale:

- Avoids cross-order grouped prep semantics that conflict with item notes/modifiers.
- Avoids batch counter race conditions in Redis.
- Keeps Kitchen Service aligned with the final Step 2.6 spec and Batch 1 contracts.

### Q4 — How should Redis-only KDS recover after Redis restart/flush?

#### Option A — Rebuild from Order Service active orders

Kitchen asks Order Service for active `PROCESSING`/not-served orders and recreates KDS tickets.

Pros:

- Rebuilds from durable source of truth.
- Can reflect current cancellations/transfers.

Cons:

- Requires a Kitchen-facing Order query contract.
- Rebuilt ticket prep state may be approximate unless Order has item readiness detail.

#### Option B — Replay Kafka `order.confirmed` from retention and reconcile with Order

Pros:

- Preserves event-driven architecture.
- Can rebuild from original event snapshots.

Cons:

- Needs offset reset/replay tooling.
- Must reconcile canceled/served/completed state from Order anyway.

#### Option C — Accept loss in dev/staging only

Pros:

- Fastest for thesis demo if infra is stable.

Cons:

- Operationally unsafe.
- A Redis flush makes KDS wrong while Order still has active orders.

Recommendation: **Option A** for the final spec baseline, with Option B as future hardening.

### Q5 — How should priority authorization work?

#### Option A — Add `KITCHEN_SET_PRIORITY`

Pros:

- Clean RBAC matrix.
- Owner/Manager-only rule is explicit.

Cons:

- Requires permission enum, seed, tests, and docs update.

#### Option B — Use `KITCHEN_UPDATE_TICKET` plus role check

Pros:

- No new permission value.
- Faster implementation.

Cons:

- Role-specific logic bypasses permission matrix clarity.
- Harder to test and audit consistently.

#### Option C — Let CHEF/BARISTA prioritize within their station

Pros:

- Practical in a real kitchen.
- Avoids manager bottleneck.

Cons:

- Conflicts with Step 2.6 wording "Owner/Manager".
- Could let kitchen reorder business priority without management approval.

Recommendation: **Option A** if priority is user-facing in Step 2.6; otherwise defer priority flagging.

## 8. Decisions Needed Before Final Spec

Please decide:

1. Q1: WS hint source after `order.confirmed`.
2. Q2: SLA trigger mechanism.
3. Q3: no batching/gộp món under any name.
4. Q4: Redis recovery expectation for Step 2.6.
5. Q5: priority authorization.

After these are answered, the final spec can lock:

- exact Kafka topics and payloads;
- exact Redis keys and Lua/atomicity expectations;
- exact BFF/Kitchen REST/TCP boundaries;
- exact socket handshake and room assignment rules;
- exact reconnect snapshot policy.

## 9. Stop Gate

This audit intentionally stops here. The next file, `docs/specs/business-logic-step-2.6-spec.vi.md`, should not be written until the open questions above are answered.
