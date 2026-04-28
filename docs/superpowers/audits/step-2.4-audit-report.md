# Step 2.4 — System Audit & Resolution Report

> **Phase:** 2A / Step 2.4 — Order Service backend, Redis, Kafka, BFF Direct  
> **Date:** 2026-04-27  
> **Scope:** Audit only. Chưa viết final business spec, chưa lập implementation plan, chưa code.  
> **Sources cross-checked:**
>
> - `docs/phases/phase-2a-order-kafka.md` — Step 2.4 source spec
> - `docs/business-logic.md` — §3, §4, §5, §6, §7, §8, §9
> - `docs/technical-architecture.md` — §3.2, §6.2.5, §7.2–7.4, §9.2, §12, §15
> - `docs/implementation_plan.md` — architectural decisions
> - `docs/architecture/permission-matrix.md`
> - `docs/references/auth-system-reference.md`
> - Step 2.2 handoffs: `docs/superpowers/handoffs/2026-04-25-step-2.2-batch-1..5-handoff.md`
> - Step 2.3 shared types: `libs/shared/types/src/lib/*`, especially `order.types.ts`, `session.types.ts`, `bill.types.ts`, `service-request.types.ts`, `realtime-events.types.ts`

---

## 0. Executive Summary

Step 2.4 is feasible, but several documents currently mix three architectural models:

1. **Strict microservice ownership**: Catalog owns menu/table data, Order owns order/bill/session, Redis owns ephemeral session/cart.
2. **Shared PostgreSQL locking**: Order Service directly locks `menu_items` with `SELECT ... FOR UPDATE`.
3. **Cross-service “atomic” transactions**: transfer table updates Order DB + Catalog DB + Redis in one conceptual transaction.

The main risks are not “NestJS coding complexity”; they are **source-of-truth boundaries**, **concurrency semantics**, **event contract sufficiency**, and **state machine/RBAC drift**.

Highest-priority decisions before implementation:

1. **Inventory stock owner:** Will Order Service directly lock Catalog’s `menu_items`, or will Catalog expose a transactional stock reservation/deduct endpoint?
2. **Stock timing:** Does stock deduct happen on customer submit (`DRAFT → PENDING`) or staff confirm (`PENDING → PROCESSING`)? Current docs disagree.
3. **Bill timing:** Is one bill created at session start, first order submit, first confirm, or first payment request?
4. **Transfer table consistency:** What consistency level is acceptable across Order DB + Catalog tables + Redis cart/session?
5. **Realtime contract:** Do we extend Step 2.3 event types before Step 2.4, or keep minimal events and accept extra reads/query coupling?
6. **WebSocket phase boundary:** Does Step 2.4 include a minimal BFF WS gateway, or only emits through an already-existing/future gateway in Step 2.5/2B?

---

## 1. Conflict Matrix

| ID  | Area                                                  | Conflict / inconsistency                                                                                                                                                                                                                                         | Evidence                                                                                                                                             | Impact                                                                                                                                                     | Severity | Recommended direction                                                                                                                                       |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Inventory ownership                                   | Step 2.4/technical arch says Order Service performs `SELECT ... FOR UPDATE` on `menu_items`, but Catalog Service owns menu item persistence and has its own `qrtable_catalog` DB.                                                                                | `technical-architecture.md` has `qrtable_order` and `qrtable_catalog` separate; §6.2.5 says lock `menu_items`; ERD shows `menu_items` under Catalog. | Violates service data ownership or requires cross-DB access. Locking only works if all writers use same DB transaction/row.                                | Critical | Decide inventory ownership for Phase 2A before any code. See R01 options.                                                                                   |
| C02 | Stock deduct timing                                   | `technical-architecture.md` §3.2 shows stock lock during “submit order”; business logic §8 and Step 2.4 say staff confirm validates/deducts stock when `PENDING → PROCESSING`.                                                                                   | Business `Pending → Processing`: deduct stock; Step 2.4: “khi confirm”; technical §3.2: “submit order → lock stock”.                                 | Different UX and cancellation semantics. If deduct on submit, pending orders reserve stock and cancel restores. If confirm, pending orders can fail later. | Critical | Prefer deduct/reserve on confirm for current business flow, but explicitly show pending submit performs availability snapshot only.                         |
| C03 | Draft persistence                                     | Step 2.3 includes `OrderStatus.DRAFT`, while business logic says Draft is cart-only and “KHÔNG tạo order record”. Step 2.4 says persistence for whole order aggregate.                                                                                           | `order.types.ts` includes DRAFT; business §8 says Draft not persisted.                                                                               | Implementation may create DB rows for cart drafts, causing cleanup and cancellation ambiguity.                                                             | High     | Treat DRAFT as FE/cart state only; DB `orders` starts at `PENDING`. Keep DRAFT in shared transition matrix for UI only.                                     |
| C04 | Bill status vocabulary                                | Business logic uses `Completed`, `Closed`, `payment_status`, and “bill_status == Closed”; Step 2.3 canonical `BillStatus` is `OPEN → PENDING_PAYMENT → PAID`.                                                                                                    | `business-logic.md` §6/§8 vs `bill.types.ts`.                                                                                                        | Confusing state transitions and acceptance criteria.                                                                                                       | High     | Canonicalize Phase 2A to `OPEN`, `PENDING_PAYMENT`, `PAID`; map “closed/completed” to `PENDING_PAYMENT` or `PAID` depending context.                        |
| C05 | Bill/payment phase boundary                           | Step 2.4 says bills belong to Order Service, but Step 2.2 mock includes cash bill UI and permission matrix includes payment permissions. Phase 3 says Payment Service handles cash/Stripe.                                                                       | Phase 2.4 requirements, Step 2.2 mock `CashBillPanel`, Phase 3.                                                                                      | Risk implementing cash payment twice or too early.                                                                                                         | High     | In Step 2.4, support bill aggregation and `REQUEST_BILL → PENDING_PAYMENT`; defer actual payment completion unless explicitly scoped.                       |
| C06 | `REQUEST_BILL` side effects                           | Service request type `REQUEST_BILL` exists, but Step 2.4 service request requirement only says create entity/status. Business/table rules say request payment locks ordering, table becomes `Billing`, bill becomes pending payment.                             | `ServiceRequestType.REQUEST_BILL`; business §3/§6; Step 2.4 endpoints.                                                                               | Customer can request bill but ordering may remain open unless explicitly handled.                                                                          | High     | Define `REQUEST_BILL` as a compound command: create service request + transition bill/table/cart lock atomically enough.                                    |
| C07 | Transfer table atomicity                              | Step 2.4 says transfer is atomic across orders, sessions, cart, old/new tables. But tables are Catalog-owned and cart/session in Redis. A single ACID transaction cannot cover Order DB + Catalog DB/service + Redis.                                            | Step 2.4; technical §6.2.5; Catalog Phase 1 ownership.                                                                                               | False atomicity claim; failures can orphan cart/order/table status.                                                                                        | Critical | Replace “atomic” with explicit consistency model: same-DB transaction if shared DB, or saga/compensation with transfer lock. See R06 options.               |
| C08 | Transfer table notification channel                   | `technical-architecture.md` §6.2.5 says “Notify KDS via Kafka: Bàn old → new”, but Kafka registry only permits five topics and Step 2.4 says only producer `order.confirmed`.                                                                                    | `technical-architecture.md` §6.2.5 vs §7.2/Step 2.4.                                                                                                 | New unauthorized Kafka topic/event or lost KDS table rename.                                                                                               | Medium   | Do not add Kafka topic in Step 2.4. Use BFF Direct WS/table status event or include table snapshot in KDS derived view.                                     |
| C09 | BFF Direct event list drift                           | Step 2.4 says BFF Direct emits `order.created` and `service.requested`. Step 2.3 also defines `OrderStatusChangedEvent`; technical §6.2.5 lists `order.ready`; §9.2 lists `order.confirmed` as WS sources.                                                       | `realtime-events.types.ts`; technical §9.2; phase doc.                                                                                               | UI tracking/POS may miss confirm/cancel/status updates if only two events emit.                                                                            | High     | Define exact BFF Direct scope for Step 2.4: at least `order.created`, `service.requested`, and likely `order.status_changed`; keep Kafka for cross-context. |
| C10 | Kafka `OrderConfirmedEvent` insufficient for KDS      | Current `OrderConfirmedEvent` lacks `tableId`, `tableName`, event metadata, schema version, idempotency key, and item route/station. KDS ticket shape needs table data.                                                                                          | `realtime-events.types.ts`: `OrderConfirmedEvent` only has tenantId, orderId, sessionId, items, total, confirmedAt, confirmedByUserId.               | Kitchen consumer must synchronously query Order Service to build ticket, increasing coupling and failure modes.                                            | High     | Extend event contract now or accept query-on-consume as explicit Phase 2B trade-off. See R09 options.                                                       |
| C11 | Cart version semantics                                | Step 2.4 says cart Redis Hash has field `version`; `CartItem` has `version` per item. A shared cart usually needs a global cart version for conflict detection.                                                                                                  | `session.types.ts` `CartItem.version`; Step 2.4 “Hash kèm field version”.                                                                            | Version conflict can be missed when different items update concurrently or over-trigger when one item changes.                                             | High     | Define both `cart.version` global and optional per-line version, or choose one. See R02 options.                                                            |
| C12 | Cart line identity                                    | Redis key “item_id → {qty,note,price,version}” cannot represent the same menu item twice with different notes. UI cart has per-line note.                                                                                                                        | Business cart note per item; Step 2.2 mock has `CartLine = CartItem & { lineId }`.                                                                   | User cannot order two variants of same item note separately, or updates overwrite notes.                                                                   | Medium   | Use `cartLineId` or composite `{menuItemId,note}`.                                                                                                          |
| C13 | Cart WS event missing                                 | Step 2.4 requires broadcast cart changes to other devices in same session, but Step 2.3 event types do not define `CartUpdatedEvent`/`CartConflictEvent`.                                                                                                        | Step 2.4 vs `realtime-events.types.ts`.                                                                                                              | FE/BE will invent divergent payloads in Step 2.5.                                                                                                          | High     | Add/define cart realtime contract before implementation or explicitly use REST refresh only for Step 2.4.                                                   |
| C14 | Session Redis key format conflicts with current guard | Step 2.4 requires `session:{tenant_id}:{session_id}`; existing `SessionGuard` stores `session:{sessionId}` with data `{tenantId, createdAt, lastActivityAt}`.                                                                                                    | `libs/guards/src/lib/session.guard.ts`, `request.util.ts`.                                                                                           | Order Service and BFF guard may look at different keys; tenant isolation weaker at key level.                                                              | Critical | Decide whether to refactor shared SessionGuard in Step 2.4 or namespace Order session separately.                                                           |
| C15 | Session idle rule conflicts with current guard        | Step 2.4/business says if idle >30m and `order_count == 0` close; if order_count >0 do not auto-close. Existing `SessionGuard` deletes any idle session after 30m and does not store `orderCount`.                                                               | `SessionGuard`; Step 2.4 session rule.                                                                                                               | Active dining sessions with existing orders can be invalidated after 30m inactivity.                                                                       | Critical | Refactor session state model before enabling real ordering.                                                                                                 |
| C16 | Session persistence ambiguity                         | Step 2.3 has a `Session` domain type; Step 2.4 says sessions in Redis, while transfer pseudocode updates `sessions` in a transaction. No `sessions` table listed in Step 2.4 PostgreSQL entities.                                                                | Step 2.3 `Session`; Step 2.4; business transfer logic.                                                                                               | Transfer/bill/payment cannot reliably query historical sessions if Redis expires.                                                                          | High     | Decide Redis-only session vs PostgreSQL session table with Redis cache.                                                                                     |
| C17 | RBAC: Waiter pending cancel mismatch                  | Business §8 says `Pending → Canceled` actor Customer, Staff, Manager. Permission matrix denies `ORDER_CANCEL` to WAITER; BFF guard spec says “WAITER denied ORDER_CANCEL (manager-only)”.                                                                        | `business-logic.md`; `permission-matrix.md`; BFF permission tests.                                                                                   | Waiter UI “Từ chối” pending order from Step 2.2 may fail real API.                                                                                         | High     | Split cancel permissions by state or allow WAITER pending cancel with service-layer guard.                                                                  |
| C18 | RBAC: `ORDER_CREATE` ambiguity                        | Permission matrix grants `ORDER_CREATE` to OWNER/MANAGER but customer submit uses `SessionGuard` no `@Permissions`. Staff POS create order is not listed in Step 2.4 endpoints.                                                                                  | `permission-matrix.md` §6/§7; Step 2.4 BFF endpoints.                                                                                                | Dead permission or unplanned staff order endpoint.                                                                                                         | Medium   | Either document `ORDER_CREATE` as future/staff POS endpoint, or remove from Step 2.4 staff surface.                                                         |
| C19 | Endpoint list incomplete                              | Step 2.4 requirements include transfer table, service request resolve, bill aggregation, cart broadcast, but BFF REST endpoint list omits transfer table, service request resolve, bill get/request/lock endpoints, cart GET, order status update for KDS/serve. | Step 2.4 endpoint list vs requirements and mock UI.                                                                                                  | Step 2.5 cannot replace mock fully.                                                                                                                        | High     | Add endpoint inventory to final spec before plan.                                                                                                           |
| C20 | Table status casing/source drift                      | Shared `RestaurantTable` uses lowercase statuses (`available`, `occupied`, `billing`, `cleaning`) while business docs use Title Case.                                                                                                                            | Step 2.2 handoff Batch 1; shared table types.                                                                                                        | DTO mapping bugs and invalid transition checks.                                                                                                            | Medium   | Canonical API payload should use shared lowercase table status; docs can remain prose.                                                                      |
| C21 | KDS station routing missing                           | Step 2.2 mock adds `KDSTicketMock.station` only in mock layer. Catalog `MenuItem` lacks station/route metadata.                                                                                                                                                  | Step 2.2 plan/handoff; `menu.types.ts`; `KDSTicket`.                                                                                                 | Backend cannot route food vs drink to `/kds/kitchen` vs `/kds/bar` deterministically.                                                                      | High     | Add menu item `station`/`preparationStation` or derive from category with explicit contract.                                                                |
| C22 | Order priority/servedAt drift                         | Step 2.2 plan records tech debt: `Order.priority`, `OrderItem.servedAt`. KDS mock supports priority; shared types do not.                                                                                                                                        | Step 2.2 plan, mock store.                                                                                                                           | POS/KDS priority UI cannot persist. Served timestamp unavailable for SLA/analytics.                                                                        | Medium   | Decide defer vs extend shared types before Step 2.4.                                                                                                        |
| C23 | Outbox decision drift                                 | Technical §7.4 says DB-derived Kafka event must use Outbox Pattern; same section notes full outbox later. Implementation plan decision says “Simplified Outbox = outbox_events table + cron poll.” Step 2.4 only says Kafka producer.                            | `technical-architecture.md`; `implementation_plan.md`; Step 2.4.                                                                                     | Dual-write risk: order confirmed in DB but Kafka message lost, or Kafka sent then DB rollback.                                                             | High     | Choose direct producer vs simplified outbox for Step 2.4. For thesis/demo, simplified outbox is safer and already documented.                               |
| C24 | WebSocket phase boundary                              | Step 2.4 verify says UI receives WS from `order.created`/`service.requested`; Phase 2B owns WebSocket Gateway + Redis Adapter.                                                                                                                                   | Step 2.4 verify vs Phase 2B scope.                                                                                                                   | Step 2.4 may depend on infrastructure not yet built.                                                                                                       | Medium   | Implement minimal in-BFF WS emitter now or move WS verification to Step 2.5/2B with BFF-side event envelope tested.                                         |
| C25 | Payment request precondition mismatch                 | Business says request payment only when all items Ready; table state transition says exists `Ready`; shared/order states allow `SERVED → COMPLETED`. Need clarify whether bill can be requested when items are Ready or Served.                                  | Business §3 and §6.                                                                                                                                  | Customer may request payment too early/late.                                                                                                               | Medium   | For restaurant UX, prefer “all non-canceled items are `SERVED` or at least `READY`?” must be decided.                                                       |

---

## 2. Deep-Dive Business Logic Clarifications Needed

### 2.1 Shared Cart Optimistic Locking

#### Current ambiguity

- Step 2.4 says Redis Hash `cart:{tenant_id}:{session_id}` with `version`.
- Shared type `CartItem.version` implies per-item version.
- Step 2.2 mock uses a `lineId` extension for cart lines.
- No shared realtime payload exists for cart updates/conflicts.

#### Recommended canonical flow

1. Client fetches cart snapshot:
   - `cartVersion`: integer global version
   - `items[]`: each with `cartLineId`, `menuItemId`, `quantity`, `note`, `unitPrice`, optional `lineVersion`
2. Client sends update command:
   - `expectedCartVersion`
   - operation: `add`, `setQuantity`, `remove`, `updateNote`, `clear`
   - target `cartLineId` or new line data
3. Backend performs atomic Redis compare-and-swap:
   - `WATCH cartKey` + read version + `MULTI/EXEC`, or Lua script.
   - If `version != expectedCartVersion`: reject with conflict and current snapshot.
   - If match: apply mutation, increment `cartVersion`, refresh TTL, emit cart update.
4. Client conflict handling:
   - Default: server wins; client refreshes snapshot and shows diff/toast.
   - Optional for additive changes: auto-rebase if operation does not touch a changed line.

#### Conflict UX options

| Option                                    | Behavior                                                                                                      | Pros                            | Cons                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| A. Strict conflict reject                 | Return `409 CART_VERSION_CONFLICT` with latest cart. Client discards local pending mutation and user retries. | Safest, easiest to reason/test. | More friction when many diners edit.                                     |
| B. Server auto-rebase for commutative ops | If client adds item A and server changed item B, backend applies update despite global version drift.         | Better UX.                      | More complex merge rules; must be deterministic.                         |
| C. Last-write-wins                        | Always apply latest command.                                                                                  | Simple.                         | Can overwrite notes/quantities silently; not acceptable for shared cart. |

**Recommendation:** Option A for Step 2.4; optionally allow Option B later for `add` operations only.

---

### 2.2 Stock Pessimistic Locking / Oversell Prevention

#### Critical architecture constraint

`SELECT ... FOR UPDATE` only prevents oversell if:

- the row being locked is in the same PostgreSQL database/transaction used by the writer, and
- all stock-changing code paths use the same lock protocol.

If Catalog Service owns `menu_items` in a separate DB/service and Order Service directly writes it, service boundaries are compromised. If Order Service calls Catalog over TCP, the lock must be inside Catalog’s transaction.

#### Recommended confirm flow if stock deduct happens at confirm

1. Staff calls confirm order.
2. Order Service starts DB transaction and locks the `orders` row:
   - `SELECT ... FROM orders WHERE tenant_id=? AND id=? FOR UPDATE`
   - verify status `PENDING` and idempotency.
3. Inventory deduct/reserve happens through the chosen stock owner model:
   - direct same-DB lock, or
   - Catalog `reserveStock(items, tenantId, orderId)` TCP command that internally locks menu rows.
4. If stock OK:
   - update order status to `PROCESSING`
   - set `confirmedAt`, `confirmedByUserId`
   - update or create bill aggregates
   - write Kafka outbox row or publish event after commit, depending chosen event model
5. If insufficient stock:
   - rollback all local changes
   - return structured error: item id/name, requested, available, recoverable=true
6. Lock timeout/deadlock handling:
   - set `lock_timeout` / statement timeout.
   - lock menu rows in deterministic sorted order by `(tenantId, menuItemId)`.
   - on timeout/deadlock return `409/423 STOCK_LOCK_CONFLICT_RETRYABLE` and allow staff retry.

#### Locking options

| Option                                              | Model                                                                             | Pros                                                  | Cons                                                                                            |
| --------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A. Order Service directly accesses Catalog DB/table | Order opens transaction against `menu_items` and `orders`.                        | Strongest immediate lock; simplest stress test.       | Violates microservice DB ownership; hard to evolve.                                             |
| B. Catalog owns stock lock/deduct endpoint          | Order calls Catalog TCP `reserve/deduct`, Catalog does `SELECT FOR UPDATE`.       | Preserves ownership; all stock writes centralized.    | Cross-service saga; Order transaction cannot include Catalog DB. Need compensation/idempotency. |
| C. Move stock reservation ledger to Order Service   | Catalog stores display status; Order stores stock/reservations used for ordering. | Order can lock locally; clean order-domain semantics. | Duplicates inventory data; requires sync/invalidation.                                          |

**Recommendation:** Option B if preserving microservice architecture is more important; Option A only if thesis scope explicitly prioritizes demo simplicity over strict service ownership.

---

### 2.3 Bill Merge by Session

#### Current ambiguity

- “Merge nhiều orders thành 1 bill per session” is agreed.
- It is unclear when the bill is created and what happens if orders are canceled.
- `BillStatus` is `OPEN → PENDING_PAYMENT → PAID`, but business prose also says “Closed/Completed”.

#### Options

| Option                                | When bill exists                                      | Pros                                      | Cons                                                                        |
| ------------------------------------- | ----------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| A. Create bill at session start       | One bill row always exists for active session.        | Simplifies request bill and table detail. | Empty bills for sessions with no orders; cleanup needed.                    |
| B. Create bill on first order submit  | Bill exists once the session has real business value. | Good POS running bill; avoids empty bill. | Need handle pending-only canceled orders.                                   |
| C. Create bill on first order confirm | Bill reflects only confirmed kitchen work.            | Avoids billing unconfirmed orders.        | POS “pending running total” needs separate calculation; late bill creation. |
| D. Create bill on request payment     | Most minimal persistence.                             | Simple Step 2.4.                          | Harder POS running bill and payment request validation.                     |

**Recommendation:** Option B with dynamic recomputation from non-canceled orders; if all orders are canceled before payment, bill can remain `OPEN` with total 0 or be soft-canceled/voided if a `VOID` status is added later.

#### Proposed cancel effects

| Order state canceled              | Stock effect                                                                                                 | Bill effect                                         | Customer/POS effect                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------- |
| `PENDING` canceled before confirm | No stock restore if stock not deducted on submit.                                                            | Remove/exclude from bill subtotal.                  | `order.status_changed` to CANCELED. |
| `PROCESSING` canceled by Manager  | Restore stock only if business decides prepared stock is reusable; otherwise no restore but exclude revenue. | Exclude from bill or add negative adjustment/audit. | Notify KDS to stop/void.            |
| `READY/SERVED` cancel             | Not in Step 2.4 unless Manager override is accepted.                                                         | Requires adjustment/refund flow, probably Phase 3+. | Avoid unless explicitly scoped.     |

---

### 2.4 Transfer Table

#### Required invariant

After transfer from table A to table B:

- active session references B,
- open orders/bills/service requests show B,
- cart key follows the same session and displays B,
- table A becomes `available`, table B becomes `occupied`,
- no customer using old table QR can mutate the moved session unless the session/table binding is updated securely.

#### Atomicity options

| Option                                                       | Model                                                                                                                                                   | Pros                                                | Cons                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| A. Single DB transaction by co-locating tables/session/order | Put table status and order session in same DB transaction for Phase 2A.                                                                                 | True atomicity; easiest to test.                    | Breaks Catalog ownership or requires schema move. |
| B. Saga with transfer lock                                   | Order creates `transfer_in_progress` lock in Redis/DB; updates Order DB; calls Catalog to update table statuses; updates Redis; compensates on failure. | Preserves boundaries; realistic distributed design. | More logic; eventual consistency window.          |
| C. Catalog-first with rollback                               | Lock destination table in Catalog, update table statuses, then update Order/Redis; rollback Catalog if Order fails.                                     | Protects table double-booking.                      | Still not atomic; compensation can fail.          |

**Recommendation:** Option B. For Step 2.4, explicitly call it “atomic from client perspective with transfer lock and compensation”, not ACID across all stores.

#### Redis/session notes

- If cart key is `cart:{tenantId}:{sessionId}`, transfer does not require renaming cart key because session stays the same.
- Session payload must update `tableId/tableName` and likely a `version`.
- Customer clients should receive a `session.table_changed` or generic status update; otherwise old UI shows old table.

---

### 2.5 Kafka and WebSocket Payloads

#### Existing Step 2.3 payloads

```ts
OrderCreatedEvent       { tenantId, orderId, tableId, tableName, sessionId, items, totalAmount, timestamp }
OrderStatusChangedEvent { tenantId, orderId, fromStatus, toStatus, changedByUserId?, timestamp }
ServiceRequestedEvent   { tenantId, requestId, tableId, tableName, sessionId, type, note?, timestamp }
OrderConfirmedEvent     { tenantId, orderId, sessionId, items, totalAmount, confirmedAt, confirmedByUserId }
KDSTicket               { ticketId, tenantId, orderId, tableId, tableName, items, priority, createdAt, slaSeconds }
```

#### Issues

- `OrderConfirmedEvent` cannot build `KDSTicket` without table info.
- Event metadata is missing: `eventId`, `schemaVersion`, `occurredAt`, `correlationId`/`processId`.
- No route/station info exists for KDS split.
- No cart updated event exists despite Step 2.4 cart broadcast requirement.

#### Payload options

| Option                                 | Contract                                                                         | Pros                                       | Cons                                           |
| -------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| A. Keep Step 2.3 minimal               | No shared type changes; Kitchen queries Order/Catalog for missing table/station. | Avoids Step 2.3 churn.                     | Coupled consumers; slower; more failure paths. |
| B. Extend `OrderConfirmedEvent`        | Add tableId/tableName, event metadata, maybe item station/category snapshot.     | Self-contained Kafka event; better replay. | Requires Step 2.3 type update.                 |
| C. Envelope + versioned domain payload | `{ eventId, eventType, version, tenantId, occurredAt, payload: {...} }`.         | Scales best for future Kafka topics.       | More work now.                                 |

**Recommendation:** Option B for Step 2.4, or Option C if you want the Kafka registry to be durable for later phases.

#### Proposed minimum `order.confirmed` payload if extended

```ts
{
  eventId: string;
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
    status: 'PROCESSING';
    station?: 'KITCHEN' | 'BAR';
  }>;
  totalAmount: number;
  confirmedAt: string;
  confirmedByUserId: string;
  occurredAt: string;
  correlationId?: string;
}
```

#### Proposed WebSocket events for Step 2.4

| Event                            | Room                                                             | Trigger                             | Minimum payload source                           |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `order.created`                  | `tenant:{tid}:staff`                                             | Customer submit successful          | Existing `OrderCreatedEvent`                     |
| `order.status_changed`           | `tenant:{tid}:staff`, `session:{sid}:customer`                   | confirm/cancel/ready/served         | Existing `OrderStatusChangedEvent`               |
| `service.requested`              | `tenant:{tid}:staff`                                             | Customer service request            | Existing `ServiceRequestedEvent`                 |
| `cart.updated`                   | `session:{sid}:customer`                                         | Cart mutation success by any device | Needs new contract                               |
| `cart.conflict` or REST 409 only | originating client                                               | Cart version mismatch               | Needs decision                                   |
| `table.transferred`              | `tenant:{tid}:staff`, `session:{sid}:customer`, future KDS rooms | Transfer table success              | Needs new contract or reuse generic status event |

---

## 3. Blind Spots & Risks With Actionable Solutions

### R01. Inventory locking across microservice boundary

**Risk:** Order Service cannot safely `SELECT ... FOR UPDATE` Catalog-owned `menu_items` unless it shares the same physical database/table and owns all writers. Otherwise stock can still oversell or service ownership is violated.

| Solution                               | Pros                                           | Cons                                                                   |
| -------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| A. Phase 2A pragmatic direct DB access | Fast, true row locks, easy concurrency demo.   | Architectural debt; Order depends on Catalog schema.                   |
| B. Catalog transactional stock command | Clean ownership; all stock writes centralized. | Requires idempotent reserve/deduct/release commands and saga handling. |
| C. Order stock ledger/reservation      | Order controls ordering inventory.             | Data sync complexity; Catalog display stock may drift.                 |

**Audit recommendation:** Choose B if Step 2.4 is meant to be production-aligned; choose A only with explicit documented thesis-scope exception.

---

### R02. Shared cart race conditions and Redis CAS

**Risk:** Naive read-modify-write on Redis Hash loses updates when two diners update simultaneously. Per-item version alone does not protect total cart invariants.

| Solution                                  | Pros                                             | Cons                                    |
| ----------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| A. `WATCH/MULTI/EXEC` global cart version | Native Redis optimistic locking; clear conflict. | Retries under high contention.          |
| B. Lua CAS script                         | Atomic, single round-trip, deterministic.        | More complex to maintain/test.          |
| C. RedisJSON with JSONPath CAS            | Cleaner document model if RedisJSON available.   | Requires module/support not guaranteed. |

**Audit recommendation:** Use Lua CAS or `WATCH/MULTI` with a global `cartVersion`; return `409` plus latest snapshot.

---

### R03. Redis idle timer vs session with orders

**Risk:** Current `SessionGuard` deletes idle sessions after 30 minutes without checking `orderCount`. Step 2.4 requires sessions with orders to stay open/extend. This can strand bills/orders and block customer tracking.

| Solution                                                                           | Pros                                              | Cons                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| A. Store `orderCount` in BFF session Redis and update on order submit              | Minimal change.                                   | BFF guard now depends on Order domain updates. |
| B. Add PostgreSQL `sessions` table in Order Service and keep Redis as active cache | Durable; supports bills/payment/history/transfer. | More schema/work than “Redis-only”.            |
| C. Keep Redis-only but create separate Order session key with richer payload       | Avoids refactoring global guard too much.         | Two session sources can drift.                 |

**Audit recommendation:** B is safest for business correctness; if too heavy, C with a clear synchronization contract.

---

### R04. Idempotency not fully specified

**Risk:** Double tap, mobile retry, or offline replay can create duplicate orders or duplicate confirmations. Types include `idempotencyKey`, but Step 2.4 does not define storage/TTL/error semantics.

| Solution                                                                     | Pros                                    | Cons                                               |
| ---------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| A. Unique DB constraint `(tenant_id, session_id, idempotency_key)` on orders | Strong, simple for submit.              | Only covers order creation.                        |
| B. Redis `SET NX idem:{tenant}:{session}:{key}` with response cache          | Fast, handles in-flight duplicate.      | Need durable DB constraint too for crash recovery. |
| C. Full idempotency table                                                    | Auditable and reusable across commands. | More code.                                         |

**Audit recommendation:** Combine A + short-lived Redis in-flight lock for submit. Use order row lock/idempotent status check for confirm.

---

### R05. Kafka dual-write problem

**Risk:** Confirm order DB commit succeeds but Kafka publish fails; KDS never sees ticket. Or Kafka publish succeeds but DB rollback happens.

| Solution                                 | Pros                                                   | Cons                                                  |
| ---------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| A. Direct publish after DB commit        | Simple for demo.                                       | Event loss on producer failure; manual repair needed. |
| B. Simplified outbox table + cron/poller | Matches implementation plan decision; reliable enough. | Adds outbox schema/poller.                            |
| C. Full transactional outbox/CDC         | Best long-term.                                        | Out of thesis scope now.                              |

**Audit recommendation:** Use B if possible; otherwise document A as temporary and provide an admin repair/replay path.

---

### R06. Transfer table consistency

**Risk:** Updating tables, sessions, orders, bills, service requests, cart, and KDS views can partially fail.

| Solution                                          | Pros                             | Cons                                |
| ------------------------------------------------- | -------------------------------- | ----------------------------------- |
| A. Same DB transaction                            | True atomicity.                  | Requires same data owner/DB.        |
| B. Saga + transfer lock + compensation            | Realistic microservice approach. | More edge cases.                    |
| C. Defer real transfer to Step 2.5+ and mock only | Reduces Step 2.4 scope.          | Mock UI cannot be fully integrated. |

**Audit recommendation:** Implement B semantics in final spec if transfer is required in Step 2.4.

---

### R07. Bill/request payment locking

**Risk:** `REQUEST_BILL` as plain service request does not lock cart/order, contrary to business logic. Customers may continue ordering during billing.

| Solution                                                                    | Pros                                                  | Cons                                                             |
| --------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| A. `REQUEST_BILL` triggers bill/table/cart lock immediately                 | Matches business UX.                                  | Requires cross-service table status update.                      |
| B. Staff acknowledge request triggers lock                                  | Gives staff control; avoids accidental customer lock. | Customer can still order after requesting bill until staff acts. |
| C. Separate endpoint `POST /bill/request` and service request just notifies | Clean command semantics.                              | Adds endpoint and UI mapping.                                    |

**Audit recommendation:** A or C. Prefer C for explicitness: service request type can be created as side effect of bill request.

---

### R08. RBAC and state guard mismatch

**Risk:** `ORDER_CANCEL` is manager-only in current matrix/tests, but business and mock UI allow staff/waiter to reject pending orders. Permission alone is too coarse for cancel by state.

| Solution                                                             | Pros                              | Cons                                                   |
| -------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| A. Grant WAITER `ORDER_CANCEL`; service layer restricts to `PENDING` | Simple; aligns POS reject button. | Same permission name covers manager processing cancel. |
| B. Add `ORDER_CANCEL_PENDING` and `ORDER_CANCEL_PROCESSING`          | Precise.                          | Requires Step 2.0 permission changes/reseed/tests.     |
| C. Keep WAITER denied; remove/disable waiter cancel from UI          | No RBAC change.                   | Diverges from business and Step 2.2 POS.               |

**Audit recommendation:** B is cleanest; A is pragmatic if avoiding permission churn.

---

### R09. Event payload insufficient for downstream consumers

**Risk:** KDS/Notification/Analytics consume `order.confirmed` but need table/station/audit metadata not currently in type.

| Solution                                   | Pros                          | Cons                                    |
| ------------------------------------------ | ----------------------------- | --------------------------------------- |
| A. Extend event payload now                | Better consumer independence. | Requires updating Step 2.3 types/tests. |
| B. Consumers query Order Service           | Smaller payload.              | Coupling, latency, failure chain.       |
| C. Create separate KDS command/event later | Keeps order event lean.       | Phase 2B rework.                        |

**Audit recommendation:** Extend `OrderConfirmedEvent` with table snapshot and event metadata now.

---

### R10. WebSocket disconnect / missed events

**Risk:** PWA/POS/KDS may miss `order.created`, `service.requested`, or `order.status_changed` during network flaps. Business §7 requires offline resilience eventually; Step 2.4 lacks reconciliation strategy.

| Solution                                               | Pros                 | Cons                                       |
| ------------------------------------------------------ | -------------------- | ------------------------------------------ |
| A. WS as hint, REST polling/refetch is source of truth | Simple and reliable. | Slight latency; more API calls.            |
| B. WS event sequence numbers + replay endpoint         | Robust real-time.    | More infrastructure.                       |
| C. Kafka-backed replay for BFF bridge                  | Powerful.            | Not justified for UI side effects per AP1. |

**Audit recommendation:** Step 2.4/2.5 should define WS as non-authoritative hint; clients refetch on reconnect/focus and POS can poll.

---

### R11. KDS station routing missing

**Risk:** Without `MenuItem.station` or equivalent, Order/Kitchen cannot split food/drinks.

| Solution                                  | Pros                                           | Cons                                           |
| ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| A. Add `station` to MenuItem/Catalog now  | Direct, clear.                                 | Catalog schema/type migration.                 |
| B. Derive station from Category           | Less schema change if category already exists. | Categories may mix food/drinks; less flexible. |
| C. Use name/seed heuristics for demo only | Fast.                                          | Not production-grade; hidden magic.            |

**Audit recommendation:** Add explicit station metadata at Catalog/Menu level if KDS is a core demo feature.

---

### R12. Table status and session ownership

**Risk:** QR session initiation, Billing lock, transfer, and cleanup require a consistent table/session binding. Current SessionGuard only creates anonymous session by header/cookie and tenant; it does not enforce table binding or `orderCount` idle rules.

| Solution                                                                                              | Pros                       | Cons                                                       |
| ----------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| A. SessionGuard remains generic; Order/BFF customer endpoints validate table/session in Order Service | Avoid global guard churn.  | Session can exist without table until endpoint validation. |
| B. Enhance SessionGuard to understand QR table token and table binding                                | Centralized customer auth. | Guard becomes domain-heavy.                                |
| C. Add dedicated CustomerSessionGuard for order routes                                                | Clean separation.          | Additional guard pattern.                                  |

**Audit recommendation:** C for Step 2.4: keep global guard simple, add order-domain session validation for customer routes.

---

## 4. UI / Shared Type Coverage Gaps From Step 2.2 and 2.3

| Gap                                       | Where observed                            | Backend Step 2.4 implication                          | Severity | Options                                                              |
| ----------------------------------------- | ----------------------------------------- | ----------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `KDSTicket.station` mock-only             | Step 2.2 `KDSTicketMock`                  | Need station routing for KDS kitchen/bar.             | High     | Add station to event/item/catalog, or document KDS query derivation. |
| `MenuItem.station` tech debt              | Step 2.2 plan out-of-scope                | Needed to split food/drink.                           | High     | Extend Catalog schema/types or derive from category.                 |
| `Order.priority` mock/store               | Step 2.2 KDS priority UI                  | Priority cannot persist or emit.                      | Medium   | Add field now or disable priority persistence.                       |
| `OrderItem.servedAt` tech debt            | Step 2.2 plan                             | Serve timing/SLA/history limited.                     | Medium   | Add optional timestamp fields or defer.                              |
| Cart `lineId` in PWA mock                 | Step 2.2 mock `CartLine`                  | Redis hash by menu item loses duplicate notes.        | Medium   | Add `cartLineId`.                                                    |
| Cart changed WS payload missing           | Step 2.4 requirement                      | Multi-device cart cannot integrate cleanly.           | High     | Define `CartUpdatedEvent`.                                           |
| `OrderConfirmedEvent` lacks table info    | Step 2.3 shared type                      | KDS ticket creation not self-contained.               | High     | Extend event.                                                        |
| Service request payment lock data missing | `ServiceRequestedEvent`                   | POS Bills panel needs bill total/status/table lock.   | Medium   | Separate bill endpoint/event or enrich response.                     |
| Table status casing lowercase             | Step 2.2 handoff/shared table types       | API DTOs must map to lowercase.                       | Medium   | Document canonical API casing.                                       |
| Realtime source replacement               | Step 2.2 fake events match existing types | If Step 2.4 invents new event names, Step 2.5 rework. | High     | Keep exact event names/payloads or update shared types first.        |

---

## 5. RBAC Audit For Step 2.4 Endpoints

### 5.1 Endpoint-to-guard matrix proposed by current docs

| Endpoint / action           | Actor                       | Current guard/permission expectation                                                | Audit finding                                                                         |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Customer submit order       | CUSTOMER                    | `SessionGuard → TenantGuard`, ownership check                                       | OK, but must validate QR/table session and idempotency.                               |
| Staff confirm order         | OWNER/MANAGER/WAITER        | `UserGuard → TenantGuard → PermissionGuard(ORDER_CONFIRM)`                          | OK. Must additionally service-guard status `PENDING`.                                 |
| Customer cancel own pending | CUSTOMER                    | `SessionGuard → TenantGuard`, `order.sessionId === req.sessionId`, status `PENDING` | OK. No stock restore if stock not deducted on submit.                                 |
| Staff cancel pending        | Business says Staff allowed | Current WAITER lacks `ORDER_CANCEL`                                                 | Conflict C17. Decide.                                                                 |
| Manager cancel processing   | OWNER/MANAGER               | `ORDER_CANCEL` + role/state guard + reason                                          | OK for Owner/Manager, but permission alone insufficient.                              |
| Staff order list            | OWNER/MANAGER/WAITER        | `ORDER_GET_LIST`                                                                    | OK. Chef/Barista should not see raw orders, only KDS.                                 |
| Customer order detail       | CUSTOMER                    | `SessionGuard → TenantGuard`, ownership                                             | Needs separate route from staff detail to avoid `PermissionGuard`.                    |
| Staff order detail          | OWNER/MANAGER/WAITER        | `ORDER_GET_BY_ID`                                                                   | OK.                                                                                   |
| Cart CRUD                   | CUSTOMER                    | `SessionGuard → TenantGuard`                                                        | OK, but needs table/billing lock.                                                     |
| Service request submit      | CUSTOMER                    | `SessionGuard → TenantGuard`                                                        | OK; if staff create is needed, separate staff endpoint with `SERVICE_REQUEST_CREATE`. |
| Service request acknowledge | OWNER/MANAGER/WAITER        | `SERVICE_REQUEST_ACKNOWLEDGE`                                                       | OK.                                                                                   |
| Service request resolve     | OWNER/MANAGER/WAITER        | `SERVICE_REQUEST_RESOLVE`                                                           | Missing from Step 2.4 BFF endpoint list.                                              |
| Transfer table              | OWNER/MANAGER/WAITER        | `TABLE_TRANSFER`                                                                    | Required by Step 2.4 but missing from endpoint list.                                  |
| Table status update         | OWNER/MANAGER/WAITER        | `TABLE_UPDATE_STATUS`                                                               | Required by billing/cleaning flow but missing from endpoint list.                     |
| Bill view/request payment   | CUSTOMER/STAFF              | Not clearly specified                                                               | Needed for Step 2.2 Bills and request payment flow.                                   |

### 5.2 RBAC holes / decisions

1. **Cancel permission too coarse:** Need state-aware cancel authorization.
2. **`ORDER_CREATE` staff permission is orphaned:** If no staff order create endpoint, leave as future permission or document POS manual order is deferred.
3. **SUPER_ADMIN with tenant bypass:** For operational order endpoints, if Super Admin can access, service queries still need explicit tenant context or debug mode. Do not allow unscoped order list.
4. **Customer ownership is not RBAC:** Every customer route must perform session/table/order ownership check; `SessionGuard` alone is insufficient.
5. **Billing lock needs authorization:** Customer can request bill, but only staff can acknowledge/resolve and later confirm cash in Phase 3.

---

## 6. Open Questions For User Decision

Please answer or choose options before Phase 2 final business spec.

### Q1. Inventory stock owner / locking model

Which option do you want for Step 2.4?

- **Q1-A:** Order Service directly locks Catalog `menu_items` table for thesis/demo simplicity.
- **Q1-B:** Catalog Service exposes transactional `reserve/deduct/release stock` TCP commands; Order uses saga/idempotency.
- **Q1-C:** Order Service owns a stock reservation ledger separate from Catalog display stock.

**Recommendation:** Q1-B for architecture correctness; Q1-A only if you explicitly accept temporary boundary debt.

### Q2. Stock deduction timing

- **Q2-A:** Deduct stock when customer submits order (`DRAFT → PENDING`).
- **Q2-B:** Deduct stock when staff confirms (`PENDING → PROCESSING`).
- **Q2-C:** Reserve on submit, finalize deduct on confirm, release on cancel/timeout.

**Recommendation:** Q2-B for current business docs; Q2-C if you want better customer certainty but more complexity.

### Q3. Bill creation timing

- **Q3-A:** Create bill at session start.
- **Q3-B:** Create bill on first order submit.
- **Q3-C:** Create bill on first order confirm.
- **Q3-D:** Create bill only when customer requests payment.

**Recommendation:** Q3-B.

### Q4. `REQUEST_BILL` behavior

- **Q4-A:** Customer `REQUEST_BILL` immediately locks cart/order and table goes `billing`.
- **Q4-B:** It only creates service request; staff acknowledgement locks billing.
- **Q4-C:** Add explicit bill request command; service request is only notification side effect.

**Recommendation:** Q4-C or Q4-A. Avoid plain notification-only unless business intentionally permits ordering after request bill.

### Q5. Transfer table consistency model

- **Q5-A:** True ACID by sharing/co-locating table/session/order writes.
- **Q5-B:** Saga with transfer lock and compensation across Order/Catalog/Redis.
- **Q5-C:** Defer real transfer implementation; keep mock until later.

**Recommendation:** Q5-B.

### Q6. Session storage model

- **Q6-A:** Redis-only sessions, but refactor SessionGuard key/payload to include tenant/table/orderCount.
- **Q6-B:** PostgreSQL `sessions` table in Order Service + Redis active cache.
- **Q6-C:** Existing BFF session key remains; Order Service has separate richer session key.

**Recommendation:** Q6-B if payment/history/transfer correctness matters; Q6-C if minimizing guard refactor.

### Q7. Cancel permission policy

- **Q7-A:** Waiter can cancel/reject `PENDING`; Manager/Owner can cancel `PROCESSING` with reason.
- **Q7-B:** Only Manager/Owner can cancel any submitted order.
- **Q7-C:** Add two permissions: pending cancel vs processing cancel.

**Recommendation:** Q7-C if willing to adjust RBAC; otherwise Q7-A with service-layer status guard.

### Q8. Event contract update before Step 2.4

- **Q8-A:** Keep Step 2.3 event types as-is and accept query-on-consume.
- **Q8-B:** Extend `OrderConfirmedEvent` with table snapshot + metadata + station route.
- **Q8-C:** Introduce generic event envelope for Kafka now.

**Recommendation:** Q8-B.

### Q9. Cart realtime contract

- **Q9-A:** Add shared `CartUpdatedEvent`/cart snapshot payload now.
- **Q9-B:** Do not use WebSocket for cart in Step 2.4; clients refetch after mutation only.
- **Q9-C:** Use ad-hoc event payload in BFF and formalize later.

**Recommendation:** Q9-A or Q9-B. Avoid Q9-C.

### Q10. WebSocket scope in Step 2.4

- **Q10-A:** Implement minimal BFF WebSocket gateway now for Step 2.4/2.5 direct events.
- **Q10-B:** Step 2.4 only returns event envelopes; actual WS gateway remains Phase 2B.
- **Q10-C:** Use polling in Step 2.5 and defer all WS.

**Recommendation:** Q10-A if demo needs realtime after Step 2.5; Q10-B if strictly preserving Phase 2B scope.

### Q11. KDS station source

- **Q11-A:** Add `station` to Catalog `MenuItem`.
- **Q11-B:** Add `station` to Category and inherit to items.
- **Q11-C:** Derive station in Kitchen Service by category/name for demo.

**Recommendation:** Q11-A.

### Q12. Payment/cash in Step 2.4

- **Q12-A:** Step 2.4 stops at bill `PENDING_PAYMENT`; no cash confirmation.
- **Q12-B:** Step 2.4 includes basic cash payment despite Phase 3.
- **Q12-C:** Step 2.4 exposes bill read endpoints only; request payment deferred.

**Recommendation:** Q12-A to respect Phase 3 boundary while supporting request-bill UX.

---

## 7. Proposed Resolutions To Carry Into Final Spec After Approval

These are not final decisions yet; they are the audit’s recommended defaults:

1. **Order DB rows start at `PENDING`; `DRAFT` remains Redis cart/UI-only.**
2. **Stock deduct at staff confirm**, not submit; submit validates current availability only.
3. **Catalog owns stock locking** through idempotent TCP commands, unless thesis scope accepts direct DB lock debt.
4. **Bill is created on first order submit** and recalculated from non-canceled orders in the session.
5. **`REQUEST_BILL` locks ordering** and transitions bill/table to payment-pending/billing through an explicit command.
6. **Transfer table uses saga + transfer lock**, not claimed ACID across DB + Redis.
7. **Add/confirm missing contracts** before Step 2.4 implementation:
   - cart snapshot/update event or choose REST-only cart sync,
   - enriched `OrderConfirmedEvent`,
   - station routing source,
   - state-aware cancel permission policy.
8. **Use simplified outbox** for `order.confirmed` if within scope; otherwise document direct producer as temporary.
9. **WebSocket events are hints, REST/polling/refetch is source of truth** after reconnect.
10. **Refactor session key/payload strategy** so BFF guard and Order Service do not disagree.

---

## 8. Stop Gate

Per requested two-stage workflow, this report intentionally stops here. It does **not** write `docs/business-logic-step-2.4-spec.md` yet.

Next action: user chooses/answers the open questions above. After decisions are confirmed, Phase 2 output should be a final business logic spec at:

`docs/business-logic-step-2.4-spec.md`

---

## 9. Post–spec closure status (updated 2026-04-28 — does not rewrite audit findings above)

`docs/business-logic-step-2.4-spec.vi.md` (Q1–Q12) is closed; the repo has merged **prerequisite** work after the audit:

| Code / topic        | Short note                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C01 / R01**       | Code: Catalog TCP patterns `MENU_ITEM.STOCK_*` + `VALIDATE_ORDERABLE`; Catalog design §3.8 + technical-architecture §6.2.5 — Order does not `FOR UPDATE` `menu_items`. |
| **C02**             | Spec + docs: deduct on confirm, not on submit.                                                                                                                         |
| **C17 / R08**       | Code: `ORDER_CANCEL_PENDING` / `ORDER_CANCEL_PROCESSING` + `role.json` + tests + 52-row matrix.                                                                        |
| **C14 / C15**       | Code: `getSessionCacheKey(tenantId, sessionId)`, `SessionData.orderCount`, idle does not evict when orders exist; one-time legacy key fallback.                        |
| **C09 / C13 / R09** | Types: enriched `OrderConfirmedEvent`, `CartUpdatedEvent`, `BillRequestedEvent`, `TableTransferredEvent`; technical-architecture §7.3 includes `bill.requested`.       |
| **C12 / R02**       | Types: `PreparationStation`, `station` on `MenuItem` / `OrderItem`; cart version remains on existing session types.                                                    |
| **C06 / Q4**        | Docs + types only; explicit bill-request endpoint awaits Order/BFF.                                                                                                    |
| **C07 / R06**       | Docs saga; transfer code awaits Order service.                                                                                                                         |

**Not in prerequisite PR:** Catalog PostgreSQL migration for `station`; TCP handlers implementing `STOCK_*`; Order `sessions` table; Kafka consumer — follow-on Step 2.4 implementation.
