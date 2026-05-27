# Step 2.4 — Final Business Flow Specification

> **Phase:** 2A — Decentralization + Orders + Kafka
> **Step:** 2.4 — Backend Order service, Redis, Kafka, live BFF
> **Date:** 2026-04-27
> **Status:** Finalized from review decisions Q1–Q12
> **Purpose:** This document stores the finalized business specification for Step 2.4. This is not an implementation plan; Final deployment status see [Phase 2A record](../phases/phase-2a-order-kafka.md).

---

## 0. Minutes of decision

This specification finalizes review decisions Q1–Q12 as follows:

| Question | Options | Decision                                                                                                                                                                                                        |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1       | **B**   | Catalog service owns locking/deduction stock via transactional TCP commands. Order service cannot directly mutate stock menu items owned by Catalog.                                                            |
| Q2       | **B**   | Stock is deducted when staff confirms order: `PENDING → PROCESSING`. The customer's submit action only validates the availability snapshot.                                                                     |
| Q3       | **B**   | Bill is created at the first order submission in the session. Bill starts in state `OPEN` and aggregates all orders that were not canceled during the session.                                                  |
| Q4       | **C**   | Add explicit bill request command. `REQUEST_BILL` service request is a side effect for notifications, not the only business command.                                                                            |
| Q5       | **B**   | Transfer table uses saga-style consistency with transfer lock and compensation between Order, Catalog and Redis. From a user/client perspective it is atomic, but not an ACID transaction across the datastore. |
| Q6       | **B**   | Session is persisted in PostgreSQL of Order service, Redis is used as active/session-cache layer.                                                                                                               |
| Q7       | **C**   | Separate cancellation rights by state: pending cancel and processing cancel. RBAC needs to be updated before or during implementation planning Step 2.4.                                                        |
| Q8       | **B**   | Extend `OrderConfirmedEvent` with table snapshot, event metadata and station route/item metadata.                                                                                                               |
| Q9       | **A**   | Add shared cart realtime contract: `CartUpdatedEvent` and conflict semantics.                                                                                                                                   |
| Q10      | **A**   | Deploy minimal BFF WebSocket gateway now for direct events Step 2.4/2.5. Phase 2B will harden/scale using Redis Adapter and Kafka bridge.                                                                       |
| Q11      | **A**   | Add `station` to Catalog `MenuItem` as canonical source for KDS routing.                                                                                                                                        |
| Q12      | **A**   | Step 2.4 stops at bill `PENDING_PAYMENT`; There is no cash payment confirmation yet. Payment execution is left for Phase 3.                                                                                     |

---

## 1. Scope and out of scope

### 1.1 Within range

Step 2.4 defines the backend business flow for:

1. **Customer Session Lifecycle**

- Session is persisted in Order PostgreSQL.
- Redis active cache for quick customer access and save idle/TTL metadata.
- Validate session ownership according to QR/table range.

2. **Shared shopping cart**

- Redis cart by session.
- Global cart version for optimistic locking.
- Broadcast cart updates to all devices in the session.

3. **Send order**

- Customer submits cart to create order in status `PENDING`.
- Cart is cleared after successful submission.
- No stock deduction at the time of submission.
- The first submission creates a session bill if there is no one.
- BFF emit `order.created` to staff room.

4. **Order confirmation**

- Staff confirm `PENDING → PROCESSING`.
- Order service calls transactional stock deduct command of Catalog service.
- If successful, the order to `PROCESSING` and `order.confirmed` are published to Kafka.
- Event payload is self-contained enough for KDS routing.

5. **Cancel order**

- Customer can cancel his own order `PENDING`.
- Staff with pending-cancel permission can cancel/reject order `PENDING`.
- Manager/Owner with processing-cancel permission can cancel order `PROCESSING` with reason.
- Total bill does not include canceled orders.

6. **Collect invoices**

- One bill for each active session.
- Created when submitting the first order.
- Aggregate all orders that have not been canceled during the session.
- `OPEN → PENDING_PAYMENT` in Step 2.4.
- `PAID` is for Phase 3.

7. **Request for clear invoice**

- Customer calls bill-request command.
- Backend validates payment preconditions.
- Bill transfer `OPEN → PENDING_PAYMENT`.
- Ordering/cart is locked.
- Table changes to `billing` via table-status command of Catalog.
- Create `REQUEST_BILL` service request as side effect for notification/audit.

8. **service request**

- Customer creates requests `CALL_STAFF`, `GENERAL_HELP` and `REQUEST_BILL` (side effect bill-request).
- Staff acknowledge and resolve service requests.
- BFF emit `service.requested` to staff room.

9. **Changing tables**

- Staff transfers active sessions and open orders/bills/carts from one desk to another.
- Use transfer lock and saga/compensation.
- Update Order DB, Redis session/cart metadata and Catalog table statuses.
- Emit realtime transfer/status event.

10. **Minimum BFF WebSocket Port**

- Support direct events for Step 2.4/2.5.
- Phase 2B expands scaling/hardening capabilities for the gateway.

11. **Catalog Metadata station**

- `MenuItem.station` is the canonical field for KDS routing: `KITCHEN` or `BAR`.

### 1.2 Out of scope

Step 2.4 **does** not implement or lock in the final behavior for:

1. Confirm cash payment.
2. Pay with SePay/VietQR, Cash or full payment gateway; Phase 3 finalizes the scope of Payment service.
3. Refunds.
4. Split bill.
5. Fully integrate Payment service.
6. Fully extend WebSocket Gateway Redis Adapter.
7. Deploy Kitchen service consumers.
8. KDS ticket persistence outside contract `order.confirmed`.
9. Complete saga (hardening) and complete outbox/CDC beyond the chosen minimum approach.
10. Record offline queue in customer/POS application. Step 2.4 only defines idempotency compatible backend semantics.

---

## 2. Standard domain ownership

### 2.1 Ownership by service

| Domain concept                            | Standard data source | Storage                               | Notes                                                                                         |
| ----------------------------------------- | -------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Menu item name/price/status/stock/station | service Catalog      | PostgreSQL Catalog                    | Catalog owns stock locking and deduct/release.                                                |
| Table/area/QR token/table status          | service Catalog      | PostgreSQL Catalog                    | Order service must call Catalog when changing table status.                                   |
| Customer sessions                         | Order service        | Order PostgreSQL + Redis active cache | PostgreSQL is durable source; Redis is the active/session cache.                              |
| Cart                                      | Order service        | Redis                                 | Ephemeral but business-critical in active session. Snapshots are located in events/responses. |
| Order/order items                         | Order service        | Order PostgreSQL                      | DB orders starts at `PENDING`; `DRAFT` belongs to cart/UI only.                               |
| Bill                                      | Order service        | Order PostgreSQL                      | One active bill per session; payment completion leaves Phase 3.                               |
| service request                           | Order service        | Order PostgreSQL                      | Notification side effects are emitted by BFF.                                                 |
| Kafka `order.confirmed`                   | Order service        | Kafka via simplified outbox           | Payload self-contained for current Kitchen; Notification/Analytics is consumer future.        |
| WebSocket UI events                       | BFF                  | Runtime                               | BFF streams directly after a successful TCP response.                                         |

### 2.2 Strict boundary rules

1. Order service cannot directly update stock or table status owned by the Catalog.
2. Order service saves denormalized snapshots for display and historical audit:

- `tableName`
- `menuItemName`
- `unitPrice`
- `station`

3. Denormalized snapshots do not transfer data ownership. The catalog is still the source of truth for the current menu/table state.
4. All commands and queries must have `tenantId`, and scope all database/Redis keys according to tenant.
5. Customer commands must validate session ownership for the tenant.

---

## 3. Standard state machine

### 3.1 Order status machine

Shared canonical value:

```txt
DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED
                ↘ CANCELED
```

Explanation in Step 2.4:

| Status       | Is there a DB saved?                            | Meaning                                                                                                                        |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `DRAFT`      | No                                              | Status only belongs to cart/UI before submit. There is no DB order row yet.                                                    |
| `PENDING`    | Yes                                             | Customer has submitted order; Waiting for staff confirmation. Stock has not been deducted yet.                                 |
| `PROCESSING` | Yes                                             | Staff confirmed; Catalog has deductible stock; order is routed through Kafka to Kitchen/KDS.                                   |
| `READY`      | Yes                                             | Kitchen marked complete. Step 2.4 keeps state and validation compatible; Phase 2B fully implements the UI/consumer transition. |
| `SERVED`     | Yes                                             | Staff served the dish/table. Step 2.4 keeps state compatibility; The following phases deploy full serving workflow.            |
| `COMPLETED`  | Yes, but Phase 3 payment completion drives this | Payment completed and bill paid.                                                                                               |
| `CANCELED`   | Yes                                             | Cancel status ends.                                                                                                            |

### 3.2 Order status transitions are allowed in Step 2.4

| Status transition       | Actor         | Permissions /guard                               | Behavior in Step 2.4                                                                    |
| ----------------------- | ------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Cart/DRAFT → `PENDING`  | Customers     | `SessionGuard → TenantGuard` + session ownership | Create orders and order items from cart snapshots.                                      |
| `PENDING → PROCESSING`  | Staff         | `ORDER_CONFIRM`                                  | Deduct stock via Catalog, confirm order, emit Kafka.                                    |
| `PENDING → CANCELED`    | Customers     | `SessionGuard → TenantGuard` + own session       | Cancel your own pending order.                                                          |
| `PENDING → CANCELED`    | Staff         | New pending-cancel permission                    | Reject/cancel pending order. No need to restore stock.                                  |
| `PROCESSING → CANCELED` | Manager/Owner | New processing-cancel permission + reason        | Cancel after confirmation; release/restore stock via Catalog according to stock policy. |

The transitions `PROCESSING → READY`, `READY → SERVED`, `SERVED → COMPLETED` are still compatible with shared types but are mainly completed in Phase 2B/3. Step 2.4 should not prevent future phases from using these transitions.

### 3.3 Invoice status machine

Canonical value:

```txt
OPEN → PENDING_PAYMENT → PAID
          ↘ OPEN  (staff reopen before payment)
```

Explanation in Step 2.4:

| Status            | Meaning in Step 2.4                                                             |
| ----------------- | ------------------------------------------------------------------------------- |
| `OPEN`            | Session has at least one submitted order and still receives new orders.         |
| `PENDING_PAYMENT` | Customer has requested payment; ordering is locked; table is in billing status. |
| `PAID`            | For Phase 3 after Payment service confirms payment.                             |

### 3.4 service request state machine

```txt
PENDING → ACKNOWLEDGED → RESOLVED
```

| Status transition         | Actor     | Permissions /guard                            |
| ------------------------- | --------- | --------------------------------------------- |
| Create request            | Customers | `SessionGuard → TenantGuard` + active session |
| `PENDING → ACKNOWLEDGED`  | Staff     | `SERVICE_REQUEST_ACKNOWLEDGE`                 |
| `ACKNOWLEDGED → RESOLVED` | Staff     | `SERVICE_REQUEST_RESOLVE`                     |

### 3.5 Interacting with table state machines

Canonical table statuses use lowercase letters:

```txt
available → occupied → billing → cleaning → available
```

Step 2.4 use Catalog service commands to change table statuses:

| Trigger                             | Switch table status                             | Owner                                                         |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| QR/session starts at desk available | `available → occupied`                          | Catalog command, initialized from BFF/Order session flow      |
| Empty/stuck session recovery        | `occupied → available`                          | Order validates empty session, Catalog updates by `sessionId` |
| Customer request bill               | `occupied → billing`                            | Catalog command, initialized from Order bill request flow     |
| Transfer tables                     | old table → `available`; new table → `occupied` | Catalog command with saga semantics                           |

Payment completion and `billing → cleaning` belong to Phase 3.

---

## 4. Session lifecycle

### 4.1 Session storage model

Due to choosing Q6-B, sessions are durable entities in the Order domain.

#### Session records in PostgreSQL

A minimum session record should have:

| School            | Purpose                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| `id`              | Session ID.                                                                  |
| `tenant_id`       | tenant isolation.                                                            |
| `table_id`        | Current table.                                                               |
| `table_name`      | Denormalized snapshot for display.                                           |
| `status`          | `ACTIVE` or `CLOSED`.                                                        |
| `started_at`      | Server UTC timestamp.                                                        |
| `last_activity`   | Server UTC timestamp, updated when customer/staff manipulate session.        |
| `closed_at`       | Set when session closes.                                                     |
| `order_count`     | Denormalized active order count serves idle/session decision.                |
| `current_bill_id` | Direct pointer to session bill after creation; null before first submission. |
| `version`         | Optimistic version for transfer/session metadata updates.                    |

#### Active session key in Redis

The cache lock is working properly:

```txt
session:{tenantId}:{sessionId}
```

Minimum Payload:

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

### 4.2 Idle handling rules

1. If `lastActivity > 30 minutes` and `orderCount == 0`:

- Close session.
- Delete cart key.
- Mark a table as available if that table is only occupied by this empty session.
- The same release path can be triggered manually by staff when the bound occupied table has no orders or bill.

2. If `lastActivity > 30 minutes` and `orderCount > 0`:

- **No** auto-close session.
- Keep session active or refresh active cache from PostgreSQL.
- Customer must refetch/rejoin the active session screen, but orders/bills remain intact.

3. Redis expiry is not a source of truth for closing sessions. The new PostgreSQL session status is authoritative.
4. If the Redis key is missing but the PostgreSQL session is still active, the backend rehydrates Redis after validating tenant/table/session ownership.

### 4.3 Session creation/joining rules

When a customer scans QR or enters table flow:

1. Validate QR token through the validation table/QR process of the Catalog.
2. Resolve `tenantId`, `tableId`, `tableName` and current table status.
3. If table is `available`:

- Create a new Order session in PostgreSQL.
- Cache sessions into Redis.
- Request Catalog to mark table `occupied`.

4. If table is `occupied`:

- Join the current active session of the table if billing is not active.
- If the bound session is stale empty or already closed empty, Order safely releases the old table binding, deletes Redis session/cart keys, and creates a fresh session.
- Returns the same session ID or binds the client to an existing session according to the BFF/session cookie policy.

5. If table is `billing`:

- Refuse ordering/joining for mutation operations.
- Only allow read-only bill/tracking view if session ownership is valid.

6. If table is `cleaning`:

- Refuse ordering and display “Table is being cleaned”.

### 4.4 Customer ownership rules

For all customer orders:

1. Request must have a valid session ID.
2. Session must exist in PostgreSQL and be in `ACTIVE` state, except for the tracking/bill view read-only endpoint.
3. Session tenant must match request tenant.
4. Target order/bill/service request/cart must be in the same session.
5. If table status is `billing`, cart mutation and order submission are rejected.

---

## 5. Shared shopping cart business flow

### 5.1 Cart storage

Standard Redis key:

```txt
cart:{tenantId}:{sessionId}
```

Cart has session scope and is ephemeral data. Cart is not a DB order until submitted.

Minimum cart photo:

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
      "note": "less spicy",
      "station": "KITCHEN",
      "lineVersion": 3
    }
  ]
}
```

### 5.2 Cart line identifier

`cartLineId` is required because the same menu item can appear multiple times with different notes.

For example:

```txt
Line A: Beef pho x1, note = "no onion"
Line B: Beef pho x1, note = "extra onion"
```

These lines must not overwrite each other.

### 5.3 Cart version

Step 2.4 uses **global cart version** as optimistic lock canonical.

Rules:

1. Each cart mutation request must have `expectedCartVersion`.
2. Backend atomically compares `expectedCartVersion` and Redis `cartVersion`.
3. If equal:

- Apply mutations.
- Increase `cartVersion` by 1.
- Refresh cart/session TTL.
- Broadcast `cart.updated` to room `session:{sessionId}:customer`.

4. If different:

- Refuse to conflict.
- Return latest cart snapshot.
- Mutations do not apply.

Line-by-line `lineVersion` is allowed for display/debug purposes, but conflict authority remains with global `cartVersion`.

### 5.4 Respond to shopping cart conflicts

Conflict response semantics:

```txt
HTTP status or wrapped app code: 409 CART_VERSION_CONFLICT
Recoverable: true
Payload: latest cart snapshot
Client-side behavior: replace local cart with latest version, display “The person at the table just changed cart — synced”, allowing user to try again
```

Step 2.4 does not allow last-write-wins behavior.

### 5.5 Cart change operations

Support operations:

| Operation    | Rules                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add item     | Validate menu item exists, same tenant, status is available, table is not in billing status. Snapshot of current name/price/station.                                                               |
| Set quantity | Quantity must be positive. Quantity = 0 should be represented by the remove operation.                                                                                                             |
| Update notes | Notes must be limited in length. Update note will mutate the existing cart line according to `cartLineId`; Create the same menu item as another note using Add item and create a new `cartLineId`. |
| Remove line  | Remove by `cartLineId`.                                                                                                                                                                            |
| Clear cart   | Only delete/empty cart when the cart is not locked.                                                                                                                                                |

### 5.6 Lock when sending cart

When the customer submits the order:

1. The backend reads the cart snapshot atomically.
2. If the cart is empty, reject.
3. If the bill/table is being billed, reject.
4. Create order from snapshot.
5. Clear cart after successfully creating order.
6. Broadcast cart updated with empty cart and increased version.

Cart is not locked permanently after submitting an order. Customers can still add items after submitting when the bill is `OPEN` and the table is not in billing status.

---

## 6. Order submission flow

### 6.1 Business significance

Customer submit converts the current cart into a persisted `PENDING` order.

This action **does not** deduct stock.
This action **does not** send orders to KDS.
This action notifies staff/POS that there is a new order waiting for confirmation.

### 6.2 Prerequisites

1. Session exists and is active.
2. Session tenant matches request tenant.
3. Table is not in state `billing` or `cleaning`.
4. Cart exists and has at least one item.
5. Cart version matches `expectedCartVersion` or submit using latest server snapshot.
6. All menu items still exist in the Catalog and are `available`.
7. Submitted total is only calculated server-side.
8. Idempotency key must be present and unique for `(tenantId, sessionId, idempotencyKey)`.

### 6.3 Submission steps

1. BFF receives customer submit request.
2. BFF validates the session/tenant and then forwards the command to Order service.
3. Order service loads active session from PostgreSQL/Redis.
4. Order service reads cart snapshot from Redis.
5. Order service validates menu item availability via Catalog.
6. Order service opens Order DB transaction.
7. If the session does not have a bill:

- Create bill with `status = OPEN`.

8. Create order:

- `status = PENDING`
- `tenantId`, `sessionId`, `tableId`, `tableName`
- `idempotencyKey`
- `totalAmount` calculated by the server from snapshots.

9. Create order items with denormalized snapshots:

- `menuItemName`
- `unitPrice`
- `station`
- `note`
- Initial item status is compatible with the pending/processing flow of the order.

10. Append order to bill aggregate.
11. Increase session's `orderCount`.
12. Commit transaction.
13. Clear Redis cart and broadcast `cart.updated`.
14. Return order and bill summary to BFF.
15. BFF emit `order.created` to staff room.

### 6.4 Idempotency

Order submission must have an idempotency key.

Rules:

1. Unique key range: `(tenantId, sessionId, idempotencyKey)`.
2. If the same key is sent again after success:

- Return the original order response.
- Do not create new orders.

3. If the same key is in-flight:

- Return retryable/in-progress response or wait according to implementation decision.

4. If the same key is reused with another cart payload:

- Return idempotency conflict.

### 6.5 Cases of failed application submission

| Error                     | Results                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| Empty cart                | Reject, do not write to DB.                                            |
| Cart version conflict     | Reject with latest cart snapshot.                                      |
| Item unavailable          | Reject with item details; cart remains intact for the user to edit.    |
| Price changed             | Server pays latest price; The client must confirm/resubmit.            |
| Session inactive          | Reject and request to rescan/ask staff for support.                    |
| Table billing             | Reject ordering and display billing lock message.                      |
| Duplicate idempotency key | Returns the original response or conflict if the payload is different. |

---

## 7. Confirm orders and deduct inventory

### 7.1 Business significance

Staff confirmation converts submitted orders into orders being processed by the kitchen.

This is the time when stock is deducted and Kafka `order.confirmed` is generated.

### 7.2 Prerequisites

1. The agent is authenticated staff/Owner/manager and has `ORDER_CONFIRM`.
2. Order exists in the same tenant.
3. Order status is `PENDING`.
4. Session is active or at least not closed/paid.
5. Bill is `OPEN`.
6. Table is not at `billing`.
7. All items still exist and can be deducted from the stock in the Catalog.

### 7.3 Inventory deduction contract with Catalog

By choosing Q1-B, Order service calls Catalog service to deduct stock.

Catalog command semantics:

```txt
catalog.stock.deduct_for_order
```

Minimum requirements:

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

Minimum successful response:

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

Minimum failure response:

```json
{
  "success": false,
  "reason": "INSUFFICIENT_STOCK",
  "items": [
    {
      "menuItemId": "...",
      "menuItemName": "Beef Pho",
      "requested": 2,
      "available": 1
    }
  ]
}
```

Catalog internal rules:

1. Sort item IDs in a predetermined order before locking to reduce deadlock.
2. Lock related `menu_items` rows with `SELECT ... FOR UPDATE` in Catalog DB transaction.
3. Validate tenant and availability.
4. Deduct stock if all items pass.
5. Save idempotency record as `orderId`/`idempotencyKey` to confirm retry without double-deduct.
6. Commit and return remaining stock.

### 7.4 Confirmation steps

1. BFF receives staff confirmation request.
2. Guard chain: `UserGuard → TenantGuard → PermissionGuard(ORDER_CONFIRM)`.
3. BFF sends confirmation command to Order service.
4. Order service locks order row in Order DB transaction.
5. Validate status `PENDING`.
6. Call Catalog stock deduction command with idempotency key.
7. If Catalog provides insufficient stock:

- Rollback local transactions.
- Return "Item is sold out" with item details.
- Order keeps `PENDING` unless the business later chooses auto-reject.

8. If Catalog is successful:

- Update order status to `PROCESSING`.
- Set `confirmedAt`, `confirmedByUserId`.
- Set order item statuses to `PROCESSING`.
- Recompute bill totals if necessary.
- Create outbox/event record or prepare to publish according to reliability decisions.

9. Commit local transaction.
10. Publish Kafka `order.confirmed` reliably.
11. Return confirmed order response to BFF.
12. BFF emit `order.status_changed` to staff and customer rooms.

### 7.5 Retry assertions and idempotency

If confirm request is retried:

| Current Status                                           | Behavior                                          |
| -------------------------------------------------------- | ------------------------------------------------- |
| `PENDING` and has not had a successful deductible before | Try confirming normally.                          |
| `PROCESSING` and the same actor/request correlation      | Return existing confirmed order; no deductible.   |
| `PROCESSING` and other request                           | Return idempotent success or “already confirmed”. |
| `CANCELED`                                               | Reject invalid transition.                        |

Catalog deduction command must be idempotent according to order ID or confirm idempotency key.

### 7.6 Lock timeout / deadlock

If Catalog stock lock timeout:

1. Do not update Order status.
2. Return errors that can be retried:

- `STOCK_LOCK_TIMEOUT`
- `recoverable = true`

3. POS may display "Someone is claiming this item, try again".

If Order DB row lock timeout:

1. Return retryable conflict.
2. Do not call Catalog if the order lock has not been acquired.

---

## 8. Kafka Event Contract `order.confirmed`

### 8.1 Event purpose

`order.confirmed` is a cross-context domain event.

Consumers include:

- Kitchen service — create KDS tickets.
- Notification service — notify staff/customer in the following steps.
- Analytics — reporting in the future.

The event must be self-contained enough for Kitchen to create initial tickets without needing to query synchronously to Order service to get table names or station routes.

### 8.2 Extended Payload

Standard payload for Step 2.4:

```json
{
  "eventId": "uuid",
  "eventType": "order.confirmed",
  "schemaVersion": 1,
  "tenantId": "tenant-id",
  "orderId": "order-id",
  "sessionId": "session-id",
  "tableId": "table-id",
  "tableName": "Table 05",
  "items": [
    {
      "id": "order-item-id",
      "orderId": "order-id",
      "menuItemId": "menu-item-id",
      "menuItemName": "Beef Pho",
      "quantity": 2,
      "unitPrice": 65000,
      "note": "little onions",
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

### 8.3 Partition key

Kafka partition key:

```txt
tenantId
```

Reason:

- Keep order by tenant scope.
- Complies with the tenant isolation principle in the Kafka guide.

### 8.4 Event Reliability

Minimum Acceptable Reliability for Step 2.4:

1. Do not publish before DB commit.
2. Prioritize simplified outbox if the scope of deployment allows:

- Record outbox row in the same Order DB transaction with confirm.
- Background publisher sent to Kafka.
- Mark the outbox row as published.

3. If temporarily using direct publish after commit:

- Documentation into technical debt.
- Log errors with enough data to replay.
- Provide a way to manually edit/retry in admin/dev scripts later.

### 8.5 Request idempotency for consumer

Consumers must consider `eventId` and/or `(tenantId, orderId)` as idempotency keys.

Kitchen must not create duplicate KDS tickets if the same event `order.confirmed` is delivered more than once.

---

## 9. Consolidate invoices

### 9.1 Create invoice

Bill is created when the first order in the session is successfully submitted.

Rules:

1. One active bill for each active session.
2. Bill starts with `status = OPEN`.
3. Bill contains submitted order ID.
4. Total bill calculated by the server from orders that have not been canceled.

### 9.2 Calculate total invoice

In Step 2.4:

```txt
subtotal = sum(orderItem.unitPrice * orderItem.quantity) for all non-canceled orders/items in the bill
total = subtotal + roundingAmount
```

Rounding behavior:

- Step 2.3 has `roundingAmount`.
- Business/Phase 3 mentioned rounding VND.
- Step 2.4 save `roundingAmount = 0`; Payment Phase will finalize the payment rounding logic.

Recommended default values for Step 2.4:

```txt
roundingAmount = 0
total = subtotal
```

Phase 3 can apply rounding to cash/payment.

### 9.3 Rules for calculating order into bill

| Order state  | Included in bill total?          | Included in `orderIds` audit list? |
| ------------ | -------------------------------- | ---------------------------------- |
| `PENDING`    | Yes, like temporary running bill | Yes                                |
| `PROCESSING` | Yes                              | Yes                                |
| `READY`      | Yes                              | Yes                                |
| `SERVED`     | Yes                              | Yes                                |
| `COMPLETED`  | Yes                              | Yes                                |
| `CANCELED`   | No                               | Have or keep via order history     |

Reason:

- POS/table map needs to display running total right after submit.
- Canceled orders still need to be audited but not charged.

### 9.4 Trigger for bill recalculation

Recompute bill totals when:

1. Order is submitted.
2. Order is canceled.
3. Order item is canceled or adjusted by authorized manager flow.
4. Apply payment rounding in Phase 3.

### 9.5 Borderline case when the first order is canceled

If the first order creates a bill and is canceled before another order:

- Bill is still `OPEN` with total `0`.
- Session is still active if it has not been idle-closed.
- Future orders in the same session reuse the same bill.

Do not add bill status `VOID` in Step 2.4.

---

## 10. Explicit invoice call request flow

### 10.1 Business significance

Bill request is the customer's clear intention to stop ordering and pay.

By choosing Q4-C, this is not just a service request. This is a business command with service-request notification as a side effect.

### 10.2 Prerequisites

1. Customer session is active.
2. Session has bill in status `OPEN`.
3. Bill total is greater than or equal to 0 and has at least one non-canceled order for normal payment.
4. Table is `occupied`.
5. Cart must be empty. If the cart has unsubmitted items, reject the bill request and ask the customer to submit or clear the cart first.
6. Payment readiness condition is satisfied.

### 10.3 Conditions of readiness to pay

In Step 2.4, select the canonical rule:

```txt
Customer can request bill only when all non-canceled orders are at least SERVED.
```

Reason:

- Business docs mention both `Ready` and “block payment when order is not yet completed”.
- Payment at restaurants usually takes place after the dish is served, not just after cooking.
- If the demo needs faster flow, the UI can simulate served state.

The alternative is only used when there is an explicit override later:

```txt
all non-canceled orders are READY or SERVED
```

### 10.4 Bill request steps

1. Customer calls explicit bill request endpoint/command.
2. Backend validates active session and bill ownership.
3. Backend validates empty cart or requires customer submit/clear cart.
4. Backend validates all non-canceled orders that are ready for payment.
5. Bill transfer backend:

- `OPEN → PENDING_PAYMENT`
- set `closedAt` as timestamp when bill to `PENDING_PAYMENT`.

6. Backend lock ordering for session.
7. Backend requires Catalog service to set table status:

- `occupied → billing`

8. Backend creates a `ServiceRequest`:

- `type = REQUEST_BILL`
- `status = PENDING`

9. Backend updates Redis session/cart state:

- cart status locked
- session bill status summary

10. BFF emit:

- `service.requested` goes to the staff room
- `bill.requested` to staff and customer rooms
- `cart.updated` to represent cart locked/empty if needed.

### 10.5 Reopen before payment

If the customer/staff cancels the payment request before payment is completed:

1. Authorized staff can transfer bill `PENDING_PAYMENT → OPEN`.
2. Catalog table status dial `billing → occupied`.
3. Ordering/cart is unlocked.
4. `REQUEST_BILL` existing service request should be resolved or marked inactive according to service request audit rules.

This reopen behavior is allowed by the existing `ALLOWED_BILL_TRANSITIONS`.

---

## 11. service request business flow

### 11.1 Request type

| Type           | Meaning                                                  | Professional side effects                                                         |
| -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `CALL_STAFF`   | Customer calls staff to the table.                       | Create request and notify staff.                                                  |
| `GENERAL_HELP` | Customer requests general support.                       | Create request and notify staff.                                                  |
| `REQUEST_BILL` | Notification/audit generated from explicit bill request. | Should be generated by bill-request command, not standalone payment lock command. |

### 11.2 Submit an independent service request

With `CALL_STAFF` and `GENERAL_HELP`:

1. Validate active session.
2. Create a service request in state `PENDING`.
3. Return request response to BFF.
4. BFF emit `service.requested` to `tenant:{tenantId}:staff`.

### 11.3 Create REQUEST_BILL

`POST service-requests` directly with type `REQUEST_BILL` so:

- rejected with the message “Use bill request endpoint”, or
- internally routed to explicit bill request command.

Recommended: route to explicit bill request command to avoid duplicate UI behavior.

### 11.4 Confirmation of receipt / Completion of processing

Acknowledge:

1. Staff has `SERVICE_REQUEST_ACKNOWLEDGE`.
2. Request is in `PENDING` state.
3. Set `ACKNOWLEDGED`, `acknowledgedAt`, `acknowledgedByUserId`.

Resolve:

1. Staff has `SERVICE_REQUEST_RESOLVE`.
2. Request is in `ACKNOWLEDGED` state.
3. Set `RESOLVED`, `resolvedAt`.

---

## 12. Cancel order

### 12.1 Decentralization model

Due to choosing Q7-C, Step 2.4 requires separation of rights:

| New rights                | Purpose                               | Proposed Role          |
| ------------------------- | ------------------------------------- | ---------------------- |
| `order.cancel_pending`    | Cancel/reject order `PENDING`         | Owner, MANAGER, WAITER |
| `order.cancel_processing` | Cancel order `PROCESSING` with reason | Owner, MANAGER         |

The existing `order.cancel` can be deprecated, kept as an alias for manager-level cancel, or mapped during migration. The final implementation plan needs to update `permission-matrix.md`, constants, role seed and tests accordingly.

### 12.2 Customer cancel pending

Customers can only cancel their own pending orders.

Prerequisites:

1. Session owns the order.
2. Order status is `PENDING`.
3. Order has not been confirmed.

Impact:

1. Set order `CANCELED`.
2. Set `cancelledAt`.
3. `cancelledByUserId` is null/guest marker.
4. `cancelReason` from customer is received if any; otherwise save `CUSTOMER_REQUESTED`.
5. Recompute bill total, remove this order.
6. No need to restore stock because stock has not been deducted yet.
7. BFF emit `order.status_changed` to staff and customer rooms.

### 12.3 Staff rejects application pending confirmation

Staff with pending-cancel permission can reject/cancel pending orders.

Effects:

1. Set order `CANCELED`.
2. Save the staff actor ID.
3. Save cancel reason if available or if required by policy.
4. Recompute bill.
5. Notify customer via `order.status_changed`.

### 12.4 Manage cancellation of pending orders

Manager/Owner with processing-cancel permission can cancel processing order.

Preconditions:

1. Order status is `PROCESSING`.
2. Must have cancellation reason.
3. The agent is Manager/Owner or has clear processing-cancel permission.

Effects:

1. Set order `CANCELED`.
2. Save `cancelledAt`, `cancelledByUserId`, `cancelReason`.
3. Recompute bill, remove this order.
4. Call Catalog stock release/restore command if business stock policy allows restoring prepared stock.
5. Notify KDS/clients via status event.

### 12.5 Inventory return policy

Default for Step 2.4:

| Order state    | Restore stock catalog?             | Reason                                                        |
| -------------- | ---------------------------------- | ------------------------------------------------------------- |
| `PENDING`      | No                                 | Stock has not been deducted yet.                              |
| `PROCESSING`   | Yes by default, but audit-required | The simple inventory model does not include ingredient waste. |
| `READY/SERVED` | No in Step 2.4                     | Need to manage adjustment/refund policy.                      |

The Ingredient wastage/no-restore policy is outside of Step 2.4 and should not override the default restore behavior of Step 2.4.

---

## 13. Table transfer flow

### 13.1 Business significance

Transfer table transfers the active dining session from the old table to the new table.

Must preserve:

- session ID,
- cart,
- orders,
- bill,
- service requests,
- customer tracking continuity.

Cart key is still `cart:{tenantId}:{sessionId}` because the session is unchanged.

### 13.2 Prerequisites

1. The agent has `TABLE_TRANSFER`.
2. The old desk belongs to the tenant.
3. The new desk belongs to the tenant.
4. The new table has status `available`.
5. Session is active and is attached to the old table.
6. Bill is not in `PAID` state.
7. There are no other transfers running for the same session, old table, or new table.

### 13.3 Transfer lock

Acquire transfer lock before any mutations:

```txt
transfer:{tenantId}:{sessionId}
```

Additional locks:

```txt
table-transfer:{tenantId}:{oldTableId}
table-transfer:{tenantId}:{newTableId}
```

Rules:

1. Lock uses `SET NX` with a short TTL.
2. If lock exists, reject with retryable conflict.
3. Lock is released after success/failure.
4. Expired locks must be recoverable by checking DB state.

### 13.4 Saga steps

Recommended order:

1. Acquire transfer lock.
2. Validate state of Order session and bill.
3. Request Catalog reserve/mark destination table for transfer if supported.
4. Update Order DB transaction:

- session `tableId/tableName`, increase version,
- table snapshot of all open/non-terminal orders,
- bill/table snapshot if saved,
- service request table snapshot if active.

5. Request Catalog to update table statuses:

- old table → `available`,
- new table → `occupied`.

6. Update Redis session payload with new table.
7. Cart key remains the same, but cart snapshot metadata should update the table if saved.
8. Emit realtime transfer/table status event.
9. Release transfer lock.

### 13.5 Compensation

| Error score                                            | Compensation mechanism                                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Catalog destination reservation failed                 | Abort; Do not mutate Order.                                                                    |
| Order DB update failed after Catalog reservation       | Release Catalog reservation / revert destination table.                                        |
| Catalog final table update error after Order DB update | Revert Order DB if it is still safe, or mark the transfer as needing recovery and alert staff. |
| Redis update error after DB/Catalog successful         | Rehydrate Redis from PostgreSQL in the next request; emit warning log.                         |
| WS emit error                                          | Do not rollback business transactions; clients refetch/poll.                                   |

### 13.6 Customer's QR after changing tables

Sau transfer:

- Existing customer devices in the session continue to use the same session ID.
- UI should display new table via session/table transfer event or refetch.
- New scans at the old table cannot join transferred session.
- New scans at the new table will join transferred session if the table is occupied by that session and not in billing.

---

## 14. Change Catalog required according to business flow

### 14.1 Station of MenuItem

Due to selecting Q11-A, Catalog `MenuItem` needs the station canonical field.

Allowed values:

```txt
KITCHEN
BAR
```

Purpose:

- `KITCHEN`: food processing station.
- `BAR`: drinks station/bar.

Rules:

1. Every menu item that can be ordered must have a station.
2. Public menu responses only need to include station if the frontend needs it; Otherwise, Order service can be obtained via internal Catalog command.
3. Order the snapshot item to save the station at the time of submission.
4. `order.confirmed` includes station for each item.

### 14.2 Catalog and inventory availability

Catalog exposed at the same time:

- display status: `available` / `out_of_stock`,
- numeric stock.

Business rules:

1. Customer can only add/submit item `available`.
2. Staff confirm may fail if numeric stock is not enough.
3. After deducting the stock to `0`, the Catalog should mark/expose the item out of stock according to the Catalog policy.
4. BFF/clients should receive stock menu updates via existing/future menu update mechanism.

### 14.3 Catalog inventory orders

Required internal commands:

| Command                         | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `stock.deduct_for_order`        | Deduct stock upon confirmation of order.                       |
| `stock.release_for_order`       | Restore stock when canceling processing if policy allows.      |
| `menu_items.validate_orderable` | Validate current item status/price/station at cart submission. |

The exact TCP message name can be determined at the implementation planning stage, but these business capabilities are required.

---

## 15. WebSocket/Realtime Contracts

### 15.1 Minimum BFF Port Range

By choosing Q10-A, Step 2.4 includes a minimal BFF WebSocket gateway that is enough for FE integration Step 2.5.

Phase 2B will add:

- Redis Adapter,
- Kafka bridge consumers,
- KDS-specific rooms and scaling,
- SLA warning bridge.

### 15.2 Room

Minimum rooms:

| Room                           | Member                                          |
| ------------------------------ | ----------------------------------------------- |
| `tenant:{tenantId}:staff`      | Owner/Manager/Waiter POS clients of the tenant. |
| `session:{sessionId}:customer` | Customer devices share the session table.       |
| `tenant:{tenantId}:management` | Manager/Owner clients for manager-only alerts.  |

KDS rooms for Phase 2B, using naming:

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

Source: BFF direct after TCP response submit order successfully.

#### `order.status_changed`

Rooms:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload according to `OrderStatusChangedEvent` is available:

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

Payload theo `ServiceRequestedEvent`.

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

Source: BFF direct after explicit bill request command successfully.

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
  "fromTableName": "Table 03",
  "toTableId": "...",
  "toTableName": "Table 08",
  "transferredByUserId": "...",
  "timestamp": "ISO-8601"
}
```

### 15.4 WebSocket Reliability Model

WebSocket events are hints, not standard data sources.

Rules:

1. Clients must refetch when reconnecting.
2. POS can poll live orders until the WS bridge is hardened in Phase 2B.
3. WS emit error does not rollback business transaction.
4. Event payloads should have enough IDs for the client to refetch.

---

## 16. Endpoint / Command category

This section lists the business capabilities needed for Step 2.4. The exact path will be finalized at the implementation planning stage.

### 16.1 Customer orders

| Capacity                     | Guard                              | Compulsive behavior                                           |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| Get/join session             | Session/customer QR guard + tenant | Create or join active table session.                          |
| Get cart                     | Session + tenant                   | Return cart snapshot/version.                                 |
| Mutate cart                  | Session + tenant                   | Optimistic lock, broadcast cart update.                       |
| Submit order                 | Session + tenant                   | Create order `PENDING`, create bill if necessary, clear cart. |
| Cancel own pending order     | Session + tenant                   | Only my own session, only state `PENDING`.                    |
| Get own order details/status | Session + tenant                   | Just your own session.                                        |
| Create service request       | Session + tenant                   | `CALL_STAFF`/`GENERAL_HELP`; bill type route to bill request. |
| Request bill                 | Session + tenant                   | Explicit bill request command.                                |
| Get current bill             | Session + tenant                   | Only bill of current session.                                 |

### 16.2 Staff orders

| Capacity                    | Guard/rights                                                                      | Compulsive behavior                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| List orders                 | `ORDER_GET_LIST`                                                                  | tenant-scoped POS list.                                                                       |
| Get order detail            | `ORDER_GET_BY_ID`                                                                 | tenant-scoped.                                                                                |
| Confirm order               | `ORDER_CONFIRM`                                                                   | Deduct stock qua Catalog; `PENDING → PROCESSING`; emit Kafka.                                 |
| Cancel pending order        | `ORDER_CANCEL_PENDING`                                                            | Staff reject pending.                                                                         |
| Cancel processing order     | `ORDER_CANCEL_PROCESSING`                                                         | Manager/Owner + reason.                                                                       |
| Acknowledge service request | `SERVICE_REQUEST_ACKNOWLEDGE`                                                     | `PENDING → ACKNOWLEDGED`.                                                                     |
| Resolve service request     | `SERVICE_REQUEST_RESOLVE`                                                         | `ACKNOWLEDGED → RESOLVED`.                                                                    |
| Transfer table              | `TABLE_TRANSFER`                                                                  | Saga transfer.                                                                                |
| Release empty table session | `TABLE_UPDATE_STATUS`                                                             | Only same-tenant occupied table with matching empty session; no bill and no persisted orders. |
| Reopen bill before payment  | `TABLE_UPDATE_STATUS` + bill ownership in the same tenant; Owner, MANAGER, WAITER | `PENDING_PAYMENT → OPEN`.                                                                     |
| Get bill/list pending bills | Existing/future bill/payment read permission                                      | Needed for POS Bills view.                                                                    |

### 16.3 Permission update required

Due to selecting Q7-C, Step 2.4 requires updating the RBAC docs/code before deploying the endpoint:

```txt
ORDER_CANCEL_PENDING
ORDER_CANCEL_PROCESSING
```

Recommended mapping:

| Role     | Pending cancel                               | Processing cancel |
| -------- | -------------------------------------------- | ----------------- |
| OWNER    | Yes                                          | Yes               |
| MANAGER  | Yes                                          | Yes               |
| WAITER   | Yes                                          | No                |
| CHEF     | No                                           | No                |
| BARISTA  | No                                           | No                |
| CUSTOMER | Session-scoped own pending only, not DB role | No                |

---

## 17. Data consistency and recovery

### 17.1 Tenant isolation

Every persistent query must have `tenant_id`.

Every Redis key must have a tenant ID, except legacy/global guard keys that have been migrated or explicitly isolated.

Standard courses:

```txt
session:{tenantId}:{sessionId}
cart:{tenantId}:{sessionId}
transfer:{tenantId}:{sessionId}
idempotency:order-submit:{tenantId}:{sessionId}:{key}
```

### 17.2 Server time

All timestamps must be generated server-side in UTC.

Client timestamps are never authoritative.

### 17.3 Saga recovery principles

With multi-service operations:

1. Save enough local state to know which phase the operation is in.
2. Make downstream commands idempotent.
3. Prioritize compensation rather than assuming cross-service ACID.
4. Display recovery status on staff/admin logs.

Operations that require saga/recovery:

- order confirm with Catalog stock deduct,
- processing cancel with stock release,
- transfer table,
- bill request table status update.

### 17.4 Summary of idempotency

| Command               | Idempotency key                                 |
| --------------------- | ----------------------------------------------- |
| Submit order          | FE-generated key scoped theo tenant/session.    |
| Confirm order         | `confirm-order:{orderId}` or request key.       |
| Catalog stock deduct  | Same confirm/order key.                         |
| Catalog stock release | `release-order:{orderId}:{cancelEventId}`.      |
| Bill request          | `request-bill:{sessionId}:{billId}`.            |
| Transfer table        | `transfer:{sessionId}:{from}:{to}:{requestId}`. |

---

## 18. Error semantics

### 18.1 Group of business errors

| Error code                 | Meaning                                          | Is recovery possible? | Client-side behavior                                                     |
| -------------------------- | ------------------------------------------------ | --------------------- | ------------------------------------------------------------------------ |
| `CART_VERSION_CONFLICT`    | Cart changes compared to client snapshot.        | Yes                   | Replace cart with latest snapshot then retry.                            |
| `ITEM_UNAVAILABLE`         | Menu items can no longer be ordered.             | Yes                   | Remove/disable items.                                                    |
| `PRICE_CHANGED`            | Prices vary from cart snapshot.                  | Yes                   | Display the latest price and ask the user to confirm.                    |
| `INSUFFICIENT_STOCK`       | Confirmation failed due to lack of stock.        | Yes                   | Staff/customer chooses an alternative item or cancels the pending order. |
| `STOCK_LOCK_TIMEOUT`       | Timeout when locking stock simultaneously.       | Yes                   | Retry confirmed.                                                         |
| `INVALID_ORDER_TRANSITION` | State transition is not valid.                   | Usually no            | Refetch state.                                                           |
| `BILL_NOT_READY`           | Customer requested payment too early.            | Yes                   | Indicates which order/item has not been served.                          |
| `TABLE_NOT_AVAILABLE`      | Destination table for transfer is not available. | Yes                   | Choose another table.                                                    |
| `TRANSFER_IN_PROGRESS`     | Another transfer is running.                     | Yes                   | Retry after a short interval.                                            |
| `SESSION_CLOSED`           | Session is no longer active.                     | No for mutations      | Re-scan the QR or ask the staff.                                         |
| `TENANT_MISMATCH`          | tenant/session differences across domains.       | No                    | Security error.                                                          |

### 18.2 Response wrap mechanism

HTTP responses still use the wrap structure of `ExceptionInterceptor`:

```json
{
  "data": {},
  "message": "...",
  "statusCode": 200,
  "duration": "12ms",
  "processID": "..."
}
```

Business errors still need to contain machine-readable error details structured within a wrapped error response according to existing error conventions.

---

## 19. Acceptance criteria for business flows

Step 2.4 is considered professionally complete when all of the criteria below are satisfied at the conceptual level and can be verified by testing/hand flow during deployment.

### 19.1 Session and Cart

- Session is persisted in Order PostgreSQL and cached in Redis with key `session:{tenantId}:{sessionId}`.
- Redis idle expiration does not close session when `orderCount > 0`.
- Cart key is `cart:{tenantId}:{sessionId}`.
- Cart mutation requires global `cartVersion` to match.
- Cart conflict returns latest snapshot.
- Cart updates emit `cart.updated` to session customer room.

### 19.2 Submit orders

- Customer submits to create order `PENDING`.
- No stock deduction when submitting.
- First submission creates bill `OPEN`.
- Cart is cleared after successful submission.
- Submitting with the same idempotency key does not create duplicate order.
- BFF emit `order.created`.

### 19.3 Order confirmation

- Staff confirm request `ORDER_CONFIRM`.
- Confirm the transactional stock deduction command call of the Catalog.
- Concurrent confirmations on the last stock cannot be oversold.
- Lack of stock, keep order at `PENDING` and return item details.
- Confirm successful transfer of order to `PROCESSING`.
- Confirm successful broadcast of enriched `order.confirmed` event.
- BFF emit `order.status_changed`.

### 19.4 Request to call invoice

- Bill exists after the first submission.
- Customer bill request uses explicit command.
- Bill request transfer `OPEN → PENDING_PAYMENT`.
- Ordering/cart is locked.
- Table status changed to `billing` via Catalog command.
- `REQUEST_BILL` service request is created as notification/audit side effect.
- Step 2.4 has not yet implemented cash/payment confirmation.

### 19.5 Cancellation

- Customers can only cancel their own order `PENDING`.
- Waiter/staff can cancel/reject order `PENDING` with pending-cancel permission.
- Manager/Owner can cancel order `PROCESSING` with processing-cancel permission and reason.
- Bill total type canceled orders.
- Processing cancel calls Catalog stock release according to stock policy of Step 2.4.

### 19.6 Table change

- Transfer requires `TABLE_TRANSFER`.
- Destination table must be `available`.
- Transfer uses locks to prevent concurrent transfers/double-booking.
- Session/orders/bill/service requests reflect the new table.
- Old table becomes `available`; The new table becomes `occupied` via Catalog.
- Redis active session is updated or can be rehydrated.
- Cart/order is not lost.
- Clients receive or can refetch transfer results.

### 19.7 RBAC

- Staff endpoints according to `UserGuard → TenantGuard → PermissionGuard`.
- Customer endpoints according to `SessionGuard/customer session validation → TenantGuard` and explicit ownership checks.
- Permission matrix distinguishes between pending cancel and processing cancel.
- Chef/Barista cannot receive raw order permissions through Step 2.4.

### 19.8 Event Contract

- `order.created`, `order.status_changed`, `service.requested`, `cart.updated`, `bill.requested`, and `table.transferred` have stable payloads before FE integration.
- `order.confirmed` includes table and station snapshots.
- WebSocket events are considered hints; clients refetch when reconnecting.

---

## 20. Update required documentation before planning implementation

The following items **have been synced in the repo** (2026-04-28); The Order/BFF implementation still needs to connect the endpoint/service according to the specification:

1. `docs/architecture/permission-matrix.md` — the current RBAC matrix (66 permissions after the following phases) must still keep the cancel permission separation of Step 2.4.
2. `libs/constants/src/lib/enum/role.enum.ts` — `ORDER_CANCEL_PENDING` / `ORDER_CANCEL_PROCESSING` (replaced `ORDER_CANCEL`).
3. `apps/user-access/src/seeder/role.json` + `role.spec.ts` + `apps/bff/.../permission.guard.spec.ts` + `tools/verify-permission-matrix.sh` — mapping WAITER pending cancel.
4. `libs/shared/types/src/lib/realtime-events.types.ts` — `OrderConfirmedEvent` enrich, `CartUpdatedEvent`, `BillRequestedEvent`, `TableTransferredEvent`.
5. `libs/shared/types/src/lib/menu.types.ts` + `order.types.ts` — `PreparationStation` / snapshot `station` on order item.
6. Catalog owns station — column `station` + TCP stock semantics belongs to Catalog; current code and `technical-architecture.md` is the validation point.
7. `libs/utils/src/lib/request.util.ts` + `SessionGuard` + `TenantGuard` — key `session:{tenantId}:{sessionId}`, optional `orderCount` idle (C14/C15); `docs/references/auth-system-reference.md` + `technical-architecture.md` updated accordingly.
8. `libs/constants/.../tcp-request-message.ts` — pattern `MENU_ITEM.VALIDATE_ORDERABLE`, `STOCK_DEDUCT_FOR_ORDER`, `STOCK_RELEASE_FOR_ORDER`.

---

## 21. Final standard default

Unless a later approved document supersedes this specification, Step 2.4 uses the following defaults:

1. **DRAFT cannot be persisted into order.** Cart is a draft.
2. **Order submit creates `PENDING`.**
3. **Stock deduction takes place at the confirmation step.**
4. **Catalog owns stock locking.**
5. **Bill is created from the first submission.**
6. **Bill totals include orders pending/processing/ready/served but exclude canceled orders.**
7. **Bill request is explicit and will block ordering.**
8. **Payment execution is delayed.**
9. **Transfer table uses saga-based, not cross-store ACID.**
10. **Session durable in PostgreSQL and cached in Redis.**
11. **Cart optimistic lock uses global cart version.**
12. **Kafka `order.confirmed` is enriched for KDS.**
13. **Minimal BFF WebSocket exists in Step 2.4.**
14. **KDS route taken from `MenuItem.station`.**
15. **Cancel permission is separated by order state.**

---

## 22. Stop

This document summarizes the business flow for Step 2.4 and is kept as a detailed spec; The current phase record is the final deployment state source.

RBAC / shared types / TCP pattern / session cache premise sections have been merged in the repo; This document still does not contain a full implementation plan for Order service.
