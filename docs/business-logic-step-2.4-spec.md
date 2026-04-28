# Step 2.4 — Final Business Logic Spec

> **Phase:** 2A — Permissions + Order + Kafka  
> **Step:** 2.4 — Order Service backend, Redis, Kafka, BFF Direct  
> **Date:** 2026-04-27  
> **Status:** Finalized from audit decisions Q1–Q12  
> **Purpose:** This document is the canonical business-logic input for the next implementation planning session. It is not an implementation plan and contains no code task breakdown.

---

## 0. Decision Record

This spec resolves the open questions from `docs/superpowers/audits/step-2.4-audit-report.md` as follows:

| Question | Selected | Decision                                                                                                                                                                                                   |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1       | **B**    | Catalog Service owns stock locking/deduction through transactional TCP commands. Order Service must not directly mutate Catalog-owned menu item stock.                                                     |
| Q2       | **B**    | Stock is deducted when staff confirms an order: `PENDING → PROCESSING`. Customer submit only validates availability snapshot.                                                                              |
| Q3       | **B**    | Bill is created on first order submit in a session. It starts as `OPEN` and aggregates all non-canceled orders in the session.                                                                             |
| Q4       | **C**    | Add an explicit bill request command. `REQUEST_BILL` service request is a notification side effect, not the only business command.                                                                         |
| Q5       | **B**    | Transfer table uses saga-style consistency with transfer lock and compensation across Order, Catalog, and Redis. It is atomic from the user/client perspective, not a single cross-store ACID transaction. |
| Q6       | **B**    | Sessions are persisted in PostgreSQL in Order Service, with Redis as active/session-cache layer.                                                                                                           |
| Q7       | **C**    | Split cancel permission by state: pending cancel vs processing cancel. This requires RBAC update before or during Step 2.4 implementation planning.                                                        |
| Q8       | **B**    | Extend `OrderConfirmedEvent` with table snapshot, event metadata, and station route/item metadata.                                                                                                         |
| Q9       | **A**    | Add shared cart realtime contract: `CartUpdatedEvent` and conflict semantics.                                                                                                                              |
| Q10      | **A**    | Implement minimal BFF WebSocket gateway now for Step 2.4/2.5 direct events. Phase 2B can harden/scale it with Redis Adapter and Kafka bridge.                                                              |
| Q11      | **A**    | Add `station` to Catalog `MenuItem` as the canonical KDS routing source.                                                                                                                                   |
| Q12      | **A**    | Step 2.4 stops at bill `PENDING_PAYMENT`; no cash payment confirmation. Payment execution remains Phase 3.                                                                                                 |

---

## 1. Scope and Non-Scope

### 1.1 In Scope

Step 2.4 defines backend business logic for:

1. **Customer session lifecycle**

- Session persisted in Order PostgreSQL.
- Redis active cache for fast customer access and idle/TTL metadata.
- QR/table-scoped session ownership validation.

2. **Shared cart**

- Redis cart per session.
- Global cart version for optimistic locking.
- Cart update broadcast to all devices in the session.

3. **Order submit**

- Customer submits cart to create an order in `PENDING`.
- Cart is cleared after successful submit.
- No stock deduction at submit.
- First submit creates the session bill if absent.
- BFF emits `order.created` to staff room.

4. **Order confirmation**

- Staff confirms `PENDING → PROCESSING`.
- Order Service calls Catalog Service transactional stock deduct command.
- On success, order becomes `PROCESSING` and `order.confirmed` is produced to Kafka.
- Event payload is self-contained enough for KDS routing.

5. **Order cancellation**

- Customer can cancel own `PENDING` order.
- Staff with pending-cancel permission can cancel/reject `PENDING` order.
- Manager/Owner with processing-cancel permission can cancel `PROCESSING` order with reason.
- Bill totals exclude canceled orders.

6. **Bill aggregation**

- One bill per active session.
- Created on first order submit.
- Aggregates all non-canceled orders in the session.
- `OPEN → PENDING_PAYMENT` in Step 2.4.
- `PAID` is reserved for Phase 3.

7. **Explicit bill request**

- Customer calls a bill-request command.
- Backend validates payment preconditions.
- Bill transitions `OPEN → PENDING_PAYMENT`.
- Ordering/cart is locked.
- Table transitions to `billing` via Catalog table-status command.
- A `REQUEST_BILL` service request is created as notification/audit side effect.

8. **Service requests**

- Customer creates `CALL_STAFF`, `GENERAL_HELP`, and bill-request side-effect `REQUEST_BILL` requests.
- Staff acknowledges and resolves service requests.
- BFF emits `service.requested` to staff room.

9. **Transfer table**

- Staff transfers an active session and its open orders/bill/cart from one table to another.
- Uses transfer lock and saga/compensation.
- Updates Order DB, Redis session/cart metadata, and Catalog table statuses.
- Emits realtime transfer/status event.

10. **Minimal BFF WebSocket gateway**

- Supports Step 2.4/2.5 direct events.
  - Phase 2B later scales/hardens the gateway.

11. **Catalog station metadata**

- `MenuItem.station` is the canonical routing field for KDS: `KITCHEN` or `BAR`.

### 1.2 Out of Scope

Step 2.4 does **not** implement or define final behavior for:

1. Cash payment confirmation.
2. Stripe or bank transfer payment.
3. Refunds.
4. Split bill.
5. Full Payment Service integration.
6. Full WebSocket Gateway Redis Adapter scaling.
7. Kitchen Service consumer implementation.
8. KDS ticket persistence beyond `order.confirmed` contract.
9. Full saga hardening and full outbox/CDC beyond the chosen minimal reliable approach.
10. Offline queued writes in customer/POS apps. Step 2.4 defines idempotency-compatible backend semantics only.

---

## 2. Canonical Domain Ownership

### 2.1 Service Ownership

| Domain concept                            | Source of truth | Storage                               | Notes                                                                                         |
| ----------------------------------------- | --------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Menu item name/price/status/stock/station | Catalog Service | Catalog PostgreSQL                    | Catalog owns stock locking and deduct/release.                                                |
| Table/area/QR token/table status          | Catalog Service | Catalog PostgreSQL                    | Order Service must call Catalog for table status changes.                                     |
| Customer session                          | Order Service   | Order PostgreSQL + Redis active cache | PostgreSQL is durable source; Redis is active/session cache.                                  |
| Cart                                      | Order Service   | Redis                                 | Ephemeral but business-critical during active session. Snapshot included in events/responses. |
| Order/order items                         | Order Service   | Order PostgreSQL                      | DB orders start at `PENDING`; `DRAFT` is cart/UI only.                                        |
| Bill                                      | Order Service   | Order PostgreSQL                      | One active bill per session; payment completion deferred to Phase 3.                          |
| Service request                           | Order Service   | Order PostgreSQL                      | Notification side effects emitted by BFF.                                                     |
| Kafka `order.confirmed`                   | Order Service   | Kafka via simplified outbox           | Self-contained payload for Kitchen/Notification/Analytics.                                    |
| WebSocket UI events                       | BFF             | Runtime                               | BFF direct after successful TCP responses.                                                    |

### 2.2 Strict Boundary Rules

1. Order Service must not directly update Catalog-owned stock or table status.
2. Order Service stores denormalized snapshots for display and historical audit:

- `tableName`
- `menuItemName`
- `unitPrice`
- `station`

3. Denormalized snapshots do not transfer ownership. Catalog remains source of truth for current menu/table state.
4. Every command and query must include `tenantId` and must scope all database/Redis keys by tenant.
5. Customer commands must validate session ownership in addition to tenant.

---

## 3. Canonical State Machines

### 3.1 Order State Machine

Canonical shared values:

```txt
DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED
                ↘ CANCELED
```

Step 2.4 interpretation:

| State        | Persisted in DB?                                | Meaning                                                                                                                          |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DRAFT`      | No                                              | Cart/UI-only state before submit. No DB order row exists.                                                                        |
| `PENDING`    | Yes                                             | Customer submitted order; waiting for staff confirmation. Stock has not been deducted.                                           |
| `PROCESSING` | Yes                                             | Staff confirmed; Catalog stock deducted; order is routed through Kafka to Kitchen/KDS.                                           |
| `READY`      | Yes                                             | Kitchen marks done. Step 2.4 keeps the state and validation compatible; Phase 2B implements the full KDS transition UI/consumer. |
| `SERVED`     | Yes                                             | Staff served items/table. Step 2.4 keeps the state compatible; later phases implement the full serving workflow.                 |
| `COMPLETED`  | Yes, but Phase 3 payment completion drives this | Payment is complete and bill is paid.                                                                                            |
| `CANCELED`   | Yes                                             | Terminal canceled state.                                                                                                         |

### 3.2 Allowed Order Transitions in Step 2.4

| Transition              | Actor         | Permission / guard                               | Step 2.4 behavior                                                                           |
| ----------------------- | ------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Cart/DRAFT → `PENDING`  | Customer      | `SessionGuard → TenantGuard` + session ownership | Create order and order items from cart snapshot.                                            |
| `PENDING → PROCESSING`  | Staff         | `ORDER_CONFIRM`                                  | Deduct stock through Catalog, confirm order, emit Kafka.                                    |
| `PENDING → CANCELED`    | Customer      | `SessionGuard → TenantGuard` + own session       | Cancel own pending order.                                                                   |
| `PENDING → CANCELED`    | Staff         | New pending-cancel permission                    | Reject/cancel pending order. No stock restore needed.                                       |
| `PROCESSING → CANCELED` | Manager/Owner | New processing-cancel permission + reason        | Cancel after confirmation; release/restore stock through Catalog according to stock policy. |

Transitions `PROCESSING → READY`, `READY → SERVED`, `SERVED → COMPLETED` remain compatible with shared types but are primarily completed in Phase 2B/3. Step 2.4 should not block later phases from using them.

### 3.3 Bill State Machine

Canonical values:

```txt
OPEN → PENDING_PAYMENT → PAID
          ↘ OPEN  (staff reopen before payment)
```

Step 2.4 interpretation:

| State             | Meaning in Step 2.4                                                        |
| ----------------- | -------------------------------------------------------------------------- |
| `OPEN`            | Session has at least one submitted order and is still accepting orders.    |
| `PENDING_PAYMENT` | Customer requested payment; ordering is locked; table is in billing state. |
| `PAID`            | Reserved for Phase 3 after Payment Service confirms payment.               |

### 3.4 Service Request State Machine

```txt
PENDING → ACKNOWLEDGED → RESOLVED
```

| Transition                | Actor    | Permission / guard                            |
| ------------------------- | -------- | --------------------------------------------- |
| Create request            | Customer | `SessionGuard → TenantGuard` + active session |
| `PENDING → ACKNOWLEDGED`  | Staff    | `SERVICE_REQUEST_ACKNOWLEDGE`                 |
| `ACKNOWLEDGED → RESOLVED` | Staff    | `SERVICE_REQUEST_RESOLVE`                     |

### 3.5 Table State Machine Interaction

Canonical shared table statuses are lowercase:

```txt
available → occupied → billing → cleaning → available
```

Step 2.4 uses Catalog Service commands to change table statuses:

| Trigger                              | Table transition                                | Owner                                                 |
| ------------------------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| QR/session starts at available table | `available → occupied`                          | Catalog command, initiated by BFF/Order session flow  |
| Customer requests bill               | `occupied → billing`                            | Catalog command, initiated by Order bill request flow |
| Transfer table                       | old table → `available`; new table → `occupied` | Catalog command with saga semantics                   |

Payment completion and `billing → cleaning` are Phase 3.

---

## 4. Session Lifecycle

### 4.1 Session Storage Model

Because Q6-B is selected, sessions are durable Order-domain entities.

#### PostgreSQL session record

A session record should contain at minimum:

| Field             | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `id`              | Session ID.                                                                  |
| `tenant_id`       | Tenant isolation.                                                            |
| `table_id`        | Current table.                                                               |
| `table_name`      | Denormalized display snapshot.                                               |
| `status`          | `ACTIVE` or `CLOSED`.                                                        |
| `started_at`      | Server UTC timestamp.                                                        |
| `last_activity`   | Server UTC timestamp, updated by customer/staff session actions.             |
| `closed_at`       | Set when session closes.                                                     |
| `order_count`     | Denormalized active order count for idle/session decisions.                  |
| `current_bill_id` | Direct pointer to session bill once created; null before first order submit. |
| `version`         | Optimistic version for transfer/session metadata updates.                    |

#### Redis active session key

Canonical active cache key:

```txt
session:{tenantId}:{sessionId}
```

Minimum payload:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "tableId": "...",
  "tableName": "...",
  "status": "ACTIVE",
  "startedAt": "ISO-8601",
  "lastActivity": "ISO-8601",
  "orderCount": 0,
  "currentBillId": null,
  "version": 1
}
```

TTL: **2 hours**.

Idle rule: **30 minutes**.

### 4.2 Idle Handling Rules

1. If `lastActivity > 30 minutes` and `orderCount == 0`:

- Close session.
- Delete cart key.
- Mark table available if the table was only occupied by this empty session.

2. If `lastActivity > 30 minutes` and `orderCount > 0`:

- Do **not** auto-close session.
- Keep session active or refresh active cache from PostgreSQL.
- Customer must refetch/rejoin the active session view, but orders/bill remain intact.

3. Redis expiry is not the source of truth for session closure. PostgreSQL session status is authoritative.
4. If Redis key is missing but PostgreSQL session is active, backend rehydrates Redis after validating tenant/table/session ownership.

### 4.3 Session Creation / Join Rules

When customer scans QR or enters table flow:

1. Validate QR token through Catalog-owned table/QR validation.
2. Resolve `tenantId`, `tableId`, `tableName`, and current table status.
3. If table is `available`:

- Create new Order session in PostgreSQL.
- Cache session in Redis.
- Ask Catalog to mark table `occupied`.

4. If table is `occupied`:

- Join current active session for that table if billing is not active.
- Return same session ID or bind client to existing session according to BFF/session cookie policy.

5. If table is `billing`:

- Reject ordering/join for mutations.
- Allow read-only bill/tracking view only if session ownership is valid.

6. If table is `cleaning`:

- Reject ordering and show “Bàn đang dọn dẹp”.

### 4.4 Customer Ownership Rules

For every customer command:

1. The request must have a valid session ID.
2. The session must exist in PostgreSQL and be `ACTIVE` unless the endpoint is read-only tracking/bill view.
3. The session tenant must match request tenant.
4. The target order/bill/service request/cart must belong to the same session.
5. If table status is `billing`, cart mutation and order submit are rejected.

---

## 5. Shared Cart Business Logic

### 5.1 Cart Storage

Canonical Redis key:

```txt
cart:{tenantId}:{sessionId}
```

The cart is session-scoped and ephemeral. It is not a DB order until submit.

Minimum cart snapshot:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "cartVersion": 7,
  "status": "ACTIVE",
  "updatedAt": "ISO-8601",
  "items": [
    {
      "cartLineId": "...",
      "menuItemId": "...",
      "menuItemName": "...",
      "quantity": 2,
      "unitPrice": 45000,
      "note": "ít cay",
      "station": "KITCHEN",
      "lineVersion": 3
    }
  ]
}
```

### 5.2 Cart Line Identity

`cartLineId` is required because the same menu item can appear multiple times with different notes.

Examples:

```txt
Line A: Phở bò x1, note = "không hành"
Line B: Phở bò x1, note = "thêm hành"
```

These must not overwrite each other.

### 5.3 Cart Versioning

Step 2.4 uses a **global cart version** as the canonical optimistic lock.

Rules:

1. Every cart mutation request includes `expectedCartVersion`.
2. Backend compares `expectedCartVersion` with Redis `cartVersion` atomically.
3. If equal:

- Apply mutation.
- Increment `cartVersion` by 1.
- Refresh cart/session TTL.
- Broadcast `cart.updated` to `session:{sessionId}:customer` room.

4. If different:

- Reject with conflict.
- Return latest cart snapshot.
- Do not apply mutation.

Per-line `lineVersion` is allowed for display/debug, but conflict authority is global `cartVersion`.

### 5.4 Cart Conflict Response

Conflict response semantics:

```txt
HTTP status or wrapped app code: 409 CART_VERSION_CONFLICT
Recoverable: true
Payload: latest cart snapshot
Client behavior: replace local cart, show “Người cùng bàn vừa đổi giỏ — đã đồng bộ”, let user retry
```

No last-write-wins behavior is allowed for Step 2.4.

### 5.5 Cart Mutations

Supported operations:

| Operation    | Rules                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add item     | Validate menu item exists, belongs to tenant, status is available, table is not billing. Snapshot current name/price/station.                                                                           |
| Set quantity | Quantity must be positive. Quantity 0 should be represented as remove.                                                                                                                                  |
| Update note  | Note length must be bounded. Updating a note mutates the existing cart line identified by `cartLineId`; creating the same menu item with a different note uses Add item and creates a new `cartLineId`. |
| Remove line  | Remove by `cartLineId`.                                                                                                                                                                                 |
| Clear cart   | Delete/empty cart only if not locked.                                                                                                                                                                   |

### 5.6 Cart Submit Lock

When customer submits order:

1. Backend atomically reads cart snapshot.
2. If cart is empty, reject.
3. If bill/table is billing, reject.
4. Create order from snapshot.
5. Clear cart after successful order creation.
6. Broadcast cart updated with empty cart and incremented version.

Cart is not permanently locked by submitting one order. Customers may add more items after submit while bill is `OPEN` and table is not billing.

---

## 6. Order Submit Flow

### 6.1 Business Meaning

Customer submit transforms the current cart into a persisted `PENDING` order.

It does **not** deduct stock.

It does **not** send the order to KDS.

It does notify staff/POS that a new order awaits confirmation.

### 6.2 Preconditions

1. Session exists and is active.
2. Session tenant matches request tenant.
3. Table is not `billing` or `cleaning`.
4. Cart exists and contains at least one item.
5. Cart version matches `expectedCartVersion` or submit uses latest server snapshot.
6. Every menu item still exists in Catalog and is currently `available`.
7. Submitted total is computed server-side only.
8. Idempotency key is present and unique for `(tenantId, sessionId, idempotencyKey)`.

### 6.3 Submit Steps

1. BFF receives customer submit request.
2. BFF validates session/tenant and forwards command to Order Service.
3. Order Service loads active session from PostgreSQL/Redis.
4. Order Service reads cart snapshot from Redis.
5. Order Service validates menu item availability through Catalog.
6. Order Service starts Order DB transaction.
7. If session has no bill:

- Create bill with `status = OPEN`.

8. Create order:

- `status = PENDING`
- `tenantId`, `sessionId`, `tableId`, `tableName`
- `idempotencyKey`
- `totalAmount` server-calculated from snapshots.

9. Create order items with denormalized snapshots:

- `menuItemName`
- `unitPrice`
- `station`
- `note`
- initial item status compatible with order pending/processing flow.

10. Append order to bill aggregate.
11. Increment session `orderCount`.
12. Commit transaction.
13. Clear Redis cart and broadcast `cart.updated`.
14. Return order and bill summary to BFF.
15. BFF emits `order.created` to staff room.

### 6.4 Idempotency

Order submit requires an idempotency key.

Rules:

1. Unique key scope: `(tenantId, sessionId, idempotencyKey)`.
2. If the same key is received again after success:

- Return the original order response.
- Do not create another order.

3. If the same key is currently in-flight:

- Return retryable/in-progress response or wait according to implementation decision.

4. If the same key is reused with a different cart payload:

- Return idempotency conflict.

### 6.5 Submit Failure Cases

| Failure                   | Result                                                     |
| ------------------------- | ---------------------------------------------------------- |
| Empty cart                | Reject, no DB write.                                       |
| Cart version conflict     | Reject with latest cart snapshot.                          |
| Item unavailable          | Reject with item detail; cart remains for user correction. |
| Price changed             | Server returns latest price; client must confirm/resubmit. |
| Session inactive          | Reject and require rescan/staff help.                      |
| Table billing             | Reject ordering and show billing lock message.             |
| Duplicate idempotency key | Return original response or conflict if payload differs.   |

---

## 7. Order Confirmation and Stock Deduction

### 7.1 Business Meaning

Staff confirmation transforms a submitted order into a kitchen-processing order.

This is the moment where stock is deducted and Kafka `order.confirmed` is produced.

### 7.2 Preconditions

1. Actor is authenticated staff/owner/manager with `ORDER_CONFIRM`.
2. Order exists in same tenant.
3. Order status is `PENDING`.
4. Session is active or at least not closed/paid.
5. Bill is `OPEN`.
6. Table is not `billing`.
7. All items still exist and are stock-deductible in Catalog.

### 7.3 Catalog Stock Deduct Contract

Because Q1-B is selected, Order Service calls Catalog Service for stock deduction.

Catalog command semantics:

```txt
catalog.stock.deduct_for_order
```

Minimum request:

```json
{
  "tenantId": "...",
  "orderId": "...",
  "idempotencyKey": "confirm-order:{orderId}",
  "items": [
    {
      "menuItemId": "...",
      "quantity": 2
    }
  ]
}
```

Minimum response success:

```json
{
  "success": true,
  "deductions": [
    {
      "menuItemId": "...",
      "deductedQuantity": 2,
      "remainingStock": 8,
      "status": "available"
    }
  ]
}
```

Minimum response failure:

```json
{
  "success": false,
  "reason": "INSUFFICIENT_STOCK",
  "items": [
    {
      "menuItemId": "...",
      "menuItemName": "Phở bò",
      "requested": 2,
      "available": 1
    }
  ]
}
```

Catalog internal rule:

1. Sort item IDs deterministically before locking to reduce deadlocks.
2. Lock relevant `menu_items` rows with `SELECT ... FOR UPDATE` inside Catalog DB transaction.
3. Validate tenant and availability.
4. Deduct stock if all items pass.
5. Store idempotency record for `orderId`/`idempotencyKey` so retried confirm does not double-deduct.
6. Commit and return remaining stock.

### 7.4 Confirm Steps

1. BFF receives staff confirm request.
2. Guard chain: `UserGuard → TenantGuard → PermissionGuard(ORDER_CONFIRM)`.
3. BFF sends confirm command to Order Service.
4. Order Service locks order row in Order DB transaction.
5. Validate status `PENDING`.
6. Call Catalog stock deduct command with idempotency key.
7. If Catalog returns insufficient stock:

- Roll back local transaction.
- Return “Món đã hết” with item details.
- Order remains `PENDING` unless business later chooses auto-reject.

8. If Catalog succeeds:

- Update order status to `PROCESSING`.
- Set `confirmedAt`, `confirmedByUserId`.
- Set order item statuses to `PROCESSING`.
- Recompute bill totals if needed.
- Create outbox/event record or prepare publish according to reliability decision.

9. Commit local transaction.
10. Produce Kafka `order.confirmed` reliably.
11. Return confirmed order response to BFF.
12. BFF emits `order.status_changed` to staff and customer rooms.

### 7.5 Confirm Retry and Idempotency

If confirm request is retried:

| Current state                                   | Behavior                                              |
| ----------------------------------------------- | ----------------------------------------------------- |
| `PENDING` and no prior successful deduction     | Attempt confirm normally.                             |
| `PROCESSING` and same actor/request correlation | Return existing confirmed order; do not deduct again. |
| `PROCESSING` and different request              | Return idempotent success or “already confirmed”.     |
| `CANCELED`                                      | Reject invalid transition.                            |

Catalog deduct command must be idempotent by order ID or confirm idempotency key.

### 7.6 Lock Timeout / Deadlock

If Catalog stock lock times out:

1. Do not update Order status.
2. Return retryable error:

- `STOCK_LOCK_TIMEOUT`
- `recoverable = true`

3. POS can show “Đang có người xác nhận món này, thử lại”.

If Order DB row lock times out:

1. Return retryable conflict.
2. Do not call Catalog if order lock was not acquired.

---

## 8. Kafka `order.confirmed` Event Contract

### 8.1 Event Purpose

`order.confirmed` is a cross-context domain event.

Consumers are:

- Kitchen Service — create KDS tickets.
- Notification Service — staff/customer notifications later.
- Analytics — future reporting.

The event must be self-contained enough for Kitchen to create initial tickets without synchronously querying Order Service for table names or station routes.

### 8.2 Extended Payload

Canonical Step 2.4 payload:

```json
{
  "eventId": "uuid",
  "eventType": "order.confirmed",
  "schemaVersion": 1,
  "tenantId": "tenant-id",
  "orderId": "order-id",
  "sessionId": "session-id",
  "tableId": "table-id",
  "tableName": "Bàn 05",
  "items": [
    {
      "id": "order-item-id",
      "orderId": "order-id",
      "menuItemId": "menu-item-id",
      "menuItemName": "Phở bò",
      "quantity": 2,
      "unitPrice": 65000,
      "note": "ít hành",
      "status": "PROCESSING",
      "station": "KITCHEN"
    }
  ],
  "totalAmount": 130000,
  "confirmedAt": "ISO-8601",
  "confirmedByUserId": "keycloak-sub",
  "occurredAt": "ISO-8601",
  "correlationId": "process-id-or-request-id"
}
```

### 8.3 Partition Key

Kafka partition key:

```txt
tenantId
```

Rationale:

- Preserves tenant-scoped ordering.
- Matches Kafka guide tenant isolation principle.

### 8.4 Event Reliability

Minimum acceptable reliability for Step 2.4:

1. Do not publish before DB commit.
2. Prefer simplified outbox if implementation scope permits:

- Write outbox row in same Order DB transaction as confirm.
- Background publisher sends to Kafka.
- Mark outbox row as published.

3. If direct publish after commit is used temporarily:

- Document as technical debt.
- Log failure with enough data to replay.
- Provide manual repair/retry path in admin/dev scripts later.

### 8.5 Consumer Idempotency Requirement

Consumers must treat `eventId` and/or `(tenantId, orderId)` as idempotency key.

Kitchen must not create duplicate KDS tickets if the same `order.confirmed` event is delivered more than once.

---

## 9. Bill Aggregation

### 9.1 Bill Creation

A bill is created when the first order is successfully submitted in a session.

Rules:

1. One active bill per active session.
2. Bill starts with `status = OPEN`.
3. Bill includes the submitted order ID.
4. Bill total is calculated by server from non-canceled orders.

### 9.2 Bill Total Calculation

For Step 2.4:

```txt
subtotal = sum(orderItem.unitPrice * orderItem.quantity) for all non-canceled orders/items in the bill
total = subtotal + roundingAmount
```

Rounding behavior:

- Step 2.3 includes `roundingAmount`.
- Business/Phase 3 mentions VND rounding.
- Step 2.4 stores `roundingAmount = 0`; Payment Phase finalizes exact payment rounding.

Recommended Step 2.4 default:

```txt
roundingAmount = 0
total = subtotal
```

Phase 3 can apply cash/payment rounding.

### 9.3 Order Inclusion Rules

| Order state  | Included in bill total?         | Included in `orderIds` audit list?    |
| ------------ | ------------------------------- | ------------------------------------- |
| `PENDING`    | Yes as provisional running bill | Yes                                   |
| `PROCESSING` | Yes                             | Yes                                   |
| `READY`      | Yes                             | Yes                                   |
| `SERVED`     | Yes                             | Yes                                   |
| `COMPLETED`  | Yes                             | Yes                                   |
| `CANCELED`   | No                              | Yes or retained through order history |

Rationale:

- POS/table map should show running total immediately after submit.
- Canceled orders should remain auditable but not billed.

### 9.4 Bill Recalculation Triggers

Recompute bill totals when:

1. Order is submitted.
2. Order is canceled.
3. Order item is canceled or adjusted by authorized manager flow.
4. Future Phase 3 payment rounding is applied.

### 9.5 First Order Canceled Edge Case

If first order creates bill and is later canceled before any other order exists:

- Bill remains `OPEN` with total `0`.
- Session remains active if not idle-closed.
- Future orders in same session reuse the same bill.

No new `VOID` bill status is introduced in Step 2.4.

---

## 10. Explicit Bill Request Flow

### 10.1 Business Meaning

Bill request is the customer’s explicit intent to stop ordering and pay.

Because Q4-C is selected, this is not merely a service request. It is a business command that has service-request notification as a side effect.

### 10.2 Preconditions

1. Customer session is active.
2. Session has an `OPEN` bill.
3. Bill total is greater than or equal to 0 and has at least one non-canceled order for normal payment.
4. Table is `occupied`.
5. Cart must be empty. If cart contains unsubmitted items, reject bill request and ask customer to submit or clear the cart first.
6. Payment readiness condition is satisfied.

### 10.3 Payment Readiness Condition

For Step 2.4, choose this canonical rule:

```txt
Customer can request bill only when all non-canceled orders are at least SERVED.
```

Reason:

- Business docs mention both `Ready` and “chặn thanh toán khi món chưa xong”.
- Restaurant payment should normally happen after items are served, not merely cooked.
- If demo needs faster flow, UI can simulate served state.

Alternative allowed only if explicitly overridden later:

```txt
all non-canceled orders are READY or SERVED
```

### 10.4 Bill Request Steps

1. Customer calls explicit bill request endpoint/command.
2. Backend validates active session and bill ownership.
3. Backend validates cart is empty or asks customer to submit/clear cart.
4. Backend validates all non-canceled orders are payment-ready.
5. Backend transitions bill:

- `OPEN → PENDING_PAYMENT`
- set `closedAt` as the timestamp when the bill becomes `PENDING_PAYMENT`.

6. Backend locks ordering for the session.
7. Backend asks Catalog Service to set table status:

- `occupied → billing`

8. Backend creates a `ServiceRequest`:

- `type = REQUEST_BILL`
- `status = PENDING`

9. Backend updates Redis session/cart state:

- cart status locked
- session bill status summary

10. BFF emits:

- `service.requested` to staff room
- `bill.requested` to staff and customer rooms
- `cart.updated` showing locked/empty cart state if needed.

### 10.5 Reopen Before Payment

If customer/staff cancels payment request before payment is completed:

1. Authorized staff can transition bill `PENDING_PAYMENT → OPEN`.
2. Catalog table status returns `billing → occupied`.
3. Ordering/cart unlocks.
4. Existing `REQUEST_BILL` service request should be resolved or marked not active according to service request audit rules.

This reopen behavior is allowed by existing `ALLOWED_BILL_TRANSITIONS`.

---

## 11. Service Request Logic

### 11.1 Request Types

| Type           | Meaning                                                | Business side effects                                                              |
| -------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `CALL_STAFF`   | Customer asks staff to come to table.                  | Create request and notify staff.                                                   |
| `GENERAL_HELP` | Customer asks for general help.                        | Create request and notify staff.                                                   |
| `REQUEST_BILL` | Notification/audit generated by explicit bill request. | Should be created by bill-request command, not as standalone payment lock command. |

### 11.2 Standalone Service Request Submit

For `CALL_STAFF` and `GENERAL_HELP`:

1. Validate active session.
2. Create service request with `PENDING`.
3. Return request response to BFF.
4. BFF emits `service.requested` to `tenant:{tenantId}:staff`.

### 11.3 REQUEST_BILL Creation

A direct `POST service-requests` with type `REQUEST_BILL` should either:

- be rejected with “Use bill request endpoint”, or
- internally route to the explicit bill request command.

Recommended: route to explicit bill request command to avoid duplicate UI behavior.

### 11.4 Acknowledge / Resolve

Acknowledge:

1. Staff has `SERVICE_REQUEST_ACKNOWLEDGE`.
2. Request is `PENDING`.
3. Set `ACKNOWLEDGED`, `acknowledgedAt`, `acknowledgedByUserId`.

Resolve:

1. Staff has `SERVICE_REQUEST_RESOLVE`.
2. Request is `ACKNOWLEDGED`.
3. Set `RESOLVED`, `resolvedAt`.

---

## 12. Order Cancellation

### 12.1 Permission Model

Because Q7-C is selected, Step 2.4 requires permission split:

| New permission            | Purpose                               | Suggested roles        |
| ------------------------- | ------------------------------------- | ---------------------- |
| `order.cancel_pending`    | Cancel/reject `PENDING` order         | OWNER, MANAGER, WAITER |
| `order.cancel_processing` | Cancel `PROCESSING` order with reason | OWNER, MANAGER         |

Existing `order.cancel` can be deprecated, kept as alias for manager-level cancel, or mapped during migration. Final implementation plan must update `permission-matrix.md`, constants, role seed, and tests accordingly.

### 12.2 Customer Cancel Pending

Customer may cancel only their own pending order.

Preconditions:

1. Session owns order.
2. Order status is `PENDING`.
3. Order has not been confirmed.

Effects:

1. Set order `CANCELED`.
2. Set `cancelledAt`.
3. `cancelledByUserId` is null/guest marker.
4. `cancelReason` from customer is accepted when provided and otherwise stored as `CUSTOMER_REQUESTED`.
5. Recompute bill total excluding order.
6. No stock restore is needed because stock was not deducted.
7. BFF emits `order.status_changed` to staff and customer rooms.

### 12.3 Staff Reject Pending

Staff with pending-cancel permission may reject/cancel a pending order.

Effects:

1. Set order `CANCELED`.
2. Store staff actor ID.
3. Store cancel reason if provided or required by policy.
4. Recompute bill.
5. Notify customer via `order.status_changed`.

### 12.4 Manager Cancel Processing

Manager/Owner with processing-cancel permission may cancel a processing order.

Preconditions:

1. Order status is `PROCESSING`.
2. Cancel reason is required.
3. Actor is Manager/Owner or has explicit processing-cancel permission.

Effects:

1. Set order `CANCELED`.
2. Store `cancelledAt`, `cancelledByUserId`, `cancelReason`.
3. Recompute bill excluding order.
4. Call Catalog stock release/restore command if business stock policy says prepared stock can be restored.
5. Notify KDS/clients via status event.

### 12.5 Stock Restore Policy

For Step 2.4 default:

| Order state    | Restore Catalog stock?             | Reason                                                |
| -------------- | ---------------------------------- | ----------------------------------------------------- |
| `PENDING`      | No                                 | Stock was not deducted.                               |
| `PROCESSING`   | Yes by default, but audit-required | Simplified inventory model has no ingredient wastage. |
| `READY/SERVED` | Not in Step 2.4                    | Requires manager adjustment/refund policy.            |

Ingredient wastage/no-restore policy is outside Step 2.4 and must not override the Step 2.4 default restore behavior.

---

## 13. Transfer Table Flow

### 13.1 Business Meaning

Transfer table moves the active dining session from old table to new table.

It must preserve:

- session ID,
- cart,
- orders,
- bill,
- service requests,
- customer tracking continuity.

The cart key remains `cart:{tenantId}:{sessionId}` because session does not change.

### 13.2 Preconditions

1. Actor has `TABLE_TRANSFER`.
2. Old table belongs to tenant.
3. New table belongs to tenant.
4. New table status is `available`.
5. Session is active and currently attached to old table.
6. Bill is not `PAID`.
7. No other transfer is in progress for the same session, old table, or new table.

### 13.3 Transfer Lock

Acquire transfer lock before any mutation:

```txt
transfer:{tenantId}:{sessionId}
```

Additional locks:

```txt
table-transfer:{tenantId}:{oldTableId}
table-transfer:{tenantId}:{newTableId}
```

Rules:

1. Lock uses `SET NX` with short TTL.
2. If lock exists, reject with retryable conflict.
3. Lock is released after success/failure.
4. Expired locks must be recoverable by checking DB state.

### 13.4 Saga Steps

Recommended order:

1. Acquire transfer lock.
2. Validate Order session and bill state.
3. Ask Catalog to reserve/mark destination table for transfer if supported.
4. Update Order DB transaction:

- session `tableId/tableName`, increment version,
- all open/non-terminal orders table snapshot,
- bill/table snapshot if stored,
- service request table snapshot if active.

5. Ask Catalog to update table statuses:

- old table → `available`,
- new table → `occupied`.

6. Update Redis session payload with new table.
7. Cart key remains same, but cart snapshot metadata should update table if stored.
8. Emit realtime transfer/table status event.
9. Release transfer lock.

### 13.5 Compensation

| Failure point                                          | Compensation                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Catalog destination reservation fails                  | Abort; no Order mutation.                                                        |
| Order DB update fails after Catalog reservation        | Release Catalog reservation / revert destination table.                          |
| Catalog final table update fails after Order DB update | Revert Order DB if still safe, or mark transfer recovery-needed and alert staff. |
| Redis update fails after DB/Catalog success            | Rehydrate Redis from PostgreSQL on next request; emit warning log.               |
| WS emit fails                                          | Do not rollback business transaction; clients refetch/poll.                      |

### 13.6 Customer QR After Transfer

After transfer:

- Existing customer devices in session continue using same session ID.
- UI should show new table via session/table transfer event or refetch.
- New scans on old table should not join transferred session.
- New scans on new table join the transferred session if the table is occupied by that session and not billing.

---

## 14. Catalog Changes Required by Business Logic

### 14.1 MenuItem Station

Because Q11-A is selected, Catalog `MenuItem` needs a canonical station field.

Allowed values:

```txt
KITCHEN
BAR
```

Purpose:

- `KITCHEN`: food/prep station.
- `BAR`: drinks/bar station.

Rules:

1. Every orderable menu item must have a station.
2. Public menu responses should include station only if frontend needs it; otherwise Order Service can retrieve it via internal Catalog command.
3. Order item snapshot stores station at submit time.
4. `order.confirmed` includes station for each item.

### 14.2 Catalog Availability vs Stock

Catalog exposes both:

- display status: `available` / `out_of_stock`,
- numeric stock.

Business rules:

1. Customer can add/submit only `available` items.
2. Staff confirm can fail if numeric stock is insufficient.
3. After deduction makes stock `0`, Catalog should mark or expose item as out of stock according to Catalog policy.
4. BFF/clients should receive menu stock update via existing/future menu update mechanism.

### 14.3 Catalog Stock Commands

Required internal commands:

| Command                         | Purpose                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `stock.deduct_for_order`        | Deduct stock at order confirm.                             |
| `stock.release_for_order`       | Restore stock on processing cancel if policy allows.       |
| `menu_items.validate_orderable` | Validate current item status/price/station at cart submit. |

Exact TCP message names can be finalized in implementation planning, but the business capabilities are required.

---

## 15. WebSocket / Realtime Contract

### 15.1 Minimal BFF Gateway Scope

Because Q10-A is selected, Step 2.4 includes a minimal BFF WebSocket gateway sufficient for Step 2.5 FE integration.

Phase 2B later adds:

- Redis Adapter,
- Kafka bridge consumers,
- KDS-specific rooms and scaling,
- SLA warning bridge.

### 15.2 Rooms

Minimum rooms:

| Room                           | Members                                        |
| ------------------------------ | ---------------------------------------------- |
| `tenant:{tenantId}:staff`      | Owner/Manager/Waiter POS clients for tenant.   |
| `session:{sessionId}:customer` | Customer devices sharing the table session.    |
| `tenant:{tenantId}:management` | Manager/Owner clients for manager-only alerts. |

KDS rooms are reserved for Phase 2B and use this naming:

```txt
tenant:{tenantId}:kds:kitchen
tenant:{tenantId}:kds:bar
```

### 15.3 WebSocket Events

#### `order.created`

Room:

```txt
tenant:{tenantId}:staff
```

Payload:

```json
{
  "tenantId": "...",
  "orderId": "...",
  "tableId": "...",
  "tableName": "...",
  "sessionId": "...",
  "items": [],
  "totalAmount": 0,
  "timestamp": "ISO-8601"
}
```

Source: BFF direct after successful order submit TCP response.

#### `order.status_changed`

Rooms:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload follows existing `OrderStatusChangedEvent`:

```json
{
  "tenantId": "...",
  "orderId": "...",
  "fromStatus": "PENDING",
  "toStatus": "PROCESSING",
  "changedByUserId": "...",
  "timestamp": "ISO-8601"
}
```

#### `service.requested`

Room:

```txt
tenant:{tenantId}:staff
```

Payload follows `ServiceRequestedEvent`.

#### `cart.updated`

Room:

```txt
session:{sessionId}:customer
```

Payload:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "cartVersion": 8,
  "status": "ACTIVE",
  "items": [],
  "updatedAt": "ISO-8601",
  "changedBySessionClientId": "session-client-id-or-null"
}
```

#### `bill.requested`

Rooms:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload:

```json
{
  "tenantId": "...",
  "billId": "...",
  "sessionId": "...",
  "tableId": "...",
  "tableName": "...",
  "status": "PENDING_PAYMENT",
  "total": 130000,
  "requestedAt": "ISO-8601"
}
```

Source: BFF direct after successful explicit bill request command.

#### `table.transferred`

Rooms:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "fromTableId": "...",
  "fromTableName": "Bàn 03",
  "toTableId": "...",
  "toTableName": "Bàn 08",
  "transferredByUserId": "...",
  "timestamp": "ISO-8601"
}
```

### 15.4 WebSocket Reliability Model

WebSocket events are hints, not source of truth.

Rules:

1. Clients must refetch on reconnect.
2. POS can poll live orders until Phase 2B hardens WS bridge.
3. Failed WS emit does not rollback business transaction.
4. Event payloads should include enough IDs for client refetch.

---

## 16. Endpoint / Command Inventory

This section lists business capabilities needed by Step 2.4. Exact paths can be finalized in implementation planning.

### 16.1 Customer Commands

| Capability                  | Guard                              | Required behavior                                              |
| --------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| Get/join session            | Session/customer QR guard + tenant | Create or join active table session.                           |
| Get cart                    | Session + tenant                   | Return cart snapshot/version.                                  |
| Mutate cart                 | Session + tenant                   | Optimistic lock, broadcast cart update.                        |
| Submit order                | Session + tenant                   | Create `PENDING` order, create bill if needed, clear cart.     |
| Cancel own pending order    | Session + tenant                   | Own session only, `PENDING` only.                              |
| Get own order detail/status | Session + tenant                   | Own session only.                                              |
| Create service request      | Session + tenant                   | `CALL_STAFF`/`GENERAL_HELP`; bill type routes to bill request. |
| Request bill                | Session + tenant                   | Explicit bill request command.                                 |
| Get current bill            | Session + tenant                   | Own session bill only.                                         |

### 16.2 Staff Commands

| Capability                  | Guard/permission                                                                 | Required behavior                                             |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| List orders                 | `ORDER_GET_LIST`                                                                 | Tenant-scoped POS list.                                       |
| Get order detail            | `ORDER_GET_BY_ID`                                                                | Tenant-scoped.                                                |
| Confirm order               | `ORDER_CONFIRM`                                                                  | Deduct stock via Catalog; `PENDING → PROCESSING`; emit Kafka. |
| Cancel pending order        | `ORDER_CANCEL_PENDING`                                                           | Staff reject pending.                                         |
| Cancel processing order     | `ORDER_CANCEL_PROCESSING`                                                        | Manager/Owner with reason.                                    |
| Acknowledge service request | `SERVICE_REQUEST_ACKNOWLEDGE`                                                    | `PENDING → ACKNOWLEDGED`.                                     |
| Resolve service request     | `SERVICE_REQUEST_RESOLVE`                                                        | `ACKNOWLEDGED → RESOLVED`.                                    |
| Transfer table              | `TABLE_TRANSFER`                                                                 | Saga transfer.                                                |
| Reopen bill before payment  | `TABLE_UPDATE_STATUS` plus bill ownership in same tenant; OWNER, MANAGER, WAITER | `PENDING_PAYMENT → OPEN`.                                     |
| Get bill/list pending bills | Existing/future bill/payment read permission                                     | Needed by POS Bills view.                                     |

### 16.3 Permission Update Required

Because Q7-C is selected, Step 2.4 requires updating RBAC docs/code before endpoint implementation:

```txt
ORDER_CANCEL_PENDING
ORDER_CANCEL_PROCESSING
```

Mapping recommendation:

| Role     | Pending cancel                               | Processing cancel |
| -------- | -------------------------------------------- | ----------------- |
| OWNER    | Yes                                          | Yes               |
| MANAGER  | Yes                                          | Yes               |
| WAITER   | Yes                                          | No                |
| CHEF     | No                                           | No                |
| BARISTA  | No                                           | No                |
| CUSTOMER | Session-scoped own pending only, not DB role | No                |

---

## 17. Data Consistency and Recovery

### 17.1 Tenant Isolation

Every persistent query must include `tenant_id`.

Every Redis key must include tenant ID except legacy/global guard keys that are explicitly migrated or isolated.

Canonical keys:

```txt
session:{tenantId}:{sessionId}
cart:{tenantId}:{sessionId}
transfer:{tenantId}:{sessionId}
idempotency:order-submit:{tenantId}:{sessionId}:{key}
```

### 17.2 Server Time

All timestamps must be generated server-side in UTC.

Client timestamps are never authoritative.

### 17.3 Saga Recovery Principles

For multi-service operations:

1. Store enough local state to know operation phase.
2. Make downstream commands idempotent.
3. Prefer compensation over pretending cross-service ACID exists.
4. Surface recovery-needed states to staff/admin logs.

Operations requiring saga/recovery:

- order confirm with Catalog stock deduct,
- processing cancel with stock release,
- transfer table,
- bill request table status update.

### 17.4 Idempotency Summary

| Command               | Idempotency key                                 |
| --------------------- | ----------------------------------------------- |
| Submit order          | FE-generated key scoped to tenant/session.      |
| Confirm order         | `confirm-order:{orderId}` or request key.       |
| Catalog stock deduct  | Same confirm/order key.                         |
| Catalog stock release | `release-order:{orderId}:{cancelEventId}`.      |
| Bill request          | `request-bill:{sessionId}:{billId}`.            |
| Transfer table        | `transfer:{sessionId}:{from}:{to}:{requestId}`. |

---

## 18. Error Semantics

### 18.1 Business Error Categories

| Error                      | Meaning                               | Recoverable?    | Client behavior                                             |
| -------------------------- | ------------------------------------- | --------------- | ----------------------------------------------------------- |
| `CART_VERSION_CONFLICT`    | Cart changed since client snapshot.   | Yes             | Replace cart with latest snapshot and retry.                |
| `ITEM_UNAVAILABLE`         | Menu item no longer orderable.        | Yes             | Remove/disable item.                                        |
| `PRICE_CHANGED`            | Price changed since cart snapshot.    | Yes             | Show latest price and ask user to confirm.                  |
| `INSUFFICIENT_STOCK`       | Confirm failed due to stock.          | Yes             | Staff/customer chooses replacement or cancel pending order. |
| `STOCK_LOCK_TIMEOUT`       | Concurrent stock lock timeout.        | Yes             | Retry confirm.                                              |
| `INVALID_ORDER_TRANSITION` | State transition not allowed.         | Usually no      | Refetch state.                                              |
| `BILL_NOT_READY`           | Customer requested payment too early. | Yes             | Show which orders/items are not served.                     |
| `TABLE_NOT_AVAILABLE`      | Transfer destination unavailable.     | Yes             | Choose different table.                                     |
| `TRANSFER_IN_PROGRESS`     | Another transfer is active.           | Yes             | Retry after short delay.                                    |
| `SESSION_CLOSED`           | Session no longer active.             | No for mutation | Rescan or ask staff.                                        |
| `TENANT_MISMATCH`          | Cross-tenant/session mismatch.        | No              | Security error.                                             |

### 18.2 Response Wrapping

HTTP responses remain wrapped by existing `ExceptionInterceptor` shape:

```json
{
  "data": {},
  "message": "...",
  "statusCode": 200,
  "duration": "12ms",
  "processID": "..."
}
```

Business errors should still carry structured machine-readable error details inside the wrapped error response according to existing error conventions.

---

## 19. Acceptance Criteria for Business Logic

Step 2.4 is business-complete when all criteria below are satisfied conceptually and can be verified by tests/manual flows during implementation.

### 19.1 Session and Cart

- Session is persisted in Order PostgreSQL and cached in Redis with key `session:{tenantId}:{sessionId}`.
- Redis idle expiration does not close sessions with `orderCount > 0`.
- Cart key is `cart:{tenantId}:{sessionId}`.
- Cart mutation requires matching global `cartVersion`.
- Cart conflict returns latest snapshot.
- Cart updates emit `cart.updated` to session customer room.

### 19.2 Order Submit

- Customer submit creates `PENDING` order.
- No stock is deducted on submit.
- First submit creates `OPEN` bill.
- Cart clears after successful submit.
- Duplicate submit with same idempotency key does not create duplicate order.
- BFF emits `order.created`.

### 19.3 Order Confirm

- Staff confirm requires `ORDER_CONFIRM`.
- Confirm calls Catalog transactional stock deduct command.
- Concurrent confirms for last stock cannot oversell.
- Insufficient stock leaves order `PENDING` and returns item details.
- Successful confirm transitions order to `PROCESSING`.
- Successful confirm produces enriched `order.confirmed` event.
- BFF emits `order.status_changed`.

### 19.4 Bill Request

- Bill exists after first submit.
- Customer bill request uses explicit command.
- Bill request transitions `OPEN → PENDING_PAYMENT`.
- Ordering/cart becomes locked.
- Table status changes to `billing` through Catalog command.
- `REQUEST_BILL` service request is created as notification/audit side effect.
- No cash/payment confirmation is implemented in Step 2.4.

### 19.5 Cancellation

- Customer can cancel own `PENDING` order only.
- Waiter/staff can cancel/reject `PENDING` order with pending-cancel permission.
- Manager/Owner can cancel `PROCESSING` order with processing-cancel permission and reason.
- Bill total excludes canceled orders.
- Processing cancel calls Catalog stock release according to Step 2.4 stock policy.

### 19.6 Transfer Table

- Transfer requires `TABLE_TRANSFER`.
- Destination table must be `available`.
- Transfer uses lock to prevent concurrent transfer/double-booking.
- Session/orders/bill/service requests reflect new table.
- Old table becomes `available`; new table becomes `occupied` through Catalog.
- Redis active session is updated or rehydratable.
- Cart/order are not lost.
- Clients receive or can refetch transfer result.

### 19.7 RBAC

- Staff endpoints follow `UserGuard → TenantGuard → PermissionGuard`.
- Customer endpoints follow `SessionGuard/customer session validation → TenantGuard` and explicit ownership checks.
- Permission matrix includes pending vs processing cancel distinction.
- Chef/Barista do not gain raw order permissions through Step 2.4.

### 19.8 Event Contracts

- `order.created`, `order.status_changed`, `service.requested`, `cart.updated`, `bill.requested`, and `table.transferred` have stable payloads before FE integration.
- `order.confirmed` includes table and station snapshots.
- WebSocket events are treated as hints; clients refetch on reconnect.

---

## 20. Required Document Updates Before Implementation Planning

The following have been **synced in-repo (2026-04-28)**; wiring Order/BFF endpoints remains per implementation plan:

1. `docs/architecture/permission-matrix.md` — §6 matrix (52 permissions) + §6.1 cancel split.
2. `libs/constants/src/lib/enum/role.enum.ts` — `ORDER_CANCEL_PENDING` / `ORDER_CANCEL_PROCESSING` (replaces `ORDER_CANCEL`).
3. `apps/user-access/src/seeder/role.json` + `role.spec.ts` + `apps/bff/.../permission.guard.spec.ts` + `tools/verify-permission-matrix.sh` — WAITER pending cancel mapping.
4. `libs/shared/types/src/lib/realtime-events.types.ts` — enriched `OrderConfirmedEvent`, `CartUpdatedEvent`, `BillRequestedEvent`, `TableTransferredEvent`.
5. `libs/shared/types/src/lib/menu.types.ts` + `order.types.ts` — `PreparationStation` / optional `station` on order items.
6. `docs/superpowers/specs/2026-04-11-catalog-service-backend-design.md` — `station` column + §3.8 TCP stock semantics; **Catalog DB migration TODO** when implementing.
7. `libs/utils/request.util.ts` + `SessionGuard` + `TenantGuard` — `session:{tenantId}:{sessionId}`, optional `orderCount` idle rule (audit C14/C15); `docs/references/auth-system-reference.md` + `technical-architecture.md` updated accordingly.
8. `libs/constants/.../tcp-request-message.ts` — `MENU_ITEM.VALIDATE_ORDERABLE`, `STOCK_DEDUCT_FOR_ORDER`, `STOCK_RELEASE_FOR_ORDER`.

---

## 21. Final Canonical Defaults

Unless a later approved document supersedes this spec, Step 2.4 uses these defaults:

1. **DRAFT is not persisted as an order.** Cart is the draft.
2. **Order submit creates `PENDING`.**
3. **Stock deduct happens at confirm.**
4. **Catalog owns stock locking.**
5. **Bill is created on first submit.**
6. **Bill totals include pending/processing/ready/served orders but exclude canceled orders.**
7. **Bill request is explicit and locks ordering.**
8. **Payment execution is deferred.**
9. **Transfer table is saga-based, not cross-store ACID.**
10. **Session is durable in PostgreSQL and cached in Redis.**
11. **Cart optimistic lock uses global cart version.**
12. **Kafka `order.confirmed` is enriched for KDS.**
13. **Minimal BFF WebSocket exists in Step 2.4.**
14. **KDS route comes from `MenuItem.station`.**
15. **Cancel permission is split by order state.**

---

## 22. Stop Gate

This document finalizes business logic for Step 2.4 and is ready to be used as input for a future implementation plan.

Prerequisite RBAC/types/TCP pattern code has been merged separately; this spec still does not contain the full Order service implementation plan.
