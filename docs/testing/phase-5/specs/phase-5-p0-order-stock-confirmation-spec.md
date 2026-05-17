# Phase 5 P0 — Order Stock Confirmation Spec

> **Status:** Canonical mini-spec for Phase 5 before Step 5.3.
> **Rule ID:** `P0-ORD-STATE-STOCK`.
> **Scope:** Staff order confirmation, Catalog stock deduction, and `order.confirmed` outbox creation.

---

## 1. Problem

Phase 5 inventory found mocked coverage for order confirmation and Catalog stock errors, but the P0 money rule also depends on race-safe stock ownership. The system must not let two staff confirmations consume the same final item, and tests must distinguish fast unit-contract coverage from true PostgreSQL/Catalog TCP integration.

---

## 2. Decision

1. Customer order submit creates a `PENDING` order and does not deduct menu stock.
2. Staff confirmation is the only path that deducts restaurant menu stock for an order.
3. Order Service owns the order state transition:
   - Lock the order row.
   - Require `PENDING` before a first confirmation.
   - Load the open bill containing the order.
   - Call Catalog `MENU_ITEM.STOCK_DEDUCT_FOR_ORDER` before persisting `PROCESSING`.
   - Persist the order and order items as `PROCESSING`.
   - Persist one `order.confirmed` outbox event.
4. Catalog Service owns stock mutation:
   - Aggregate duplicate menu item lines before mutation.
   - Lock each menu item once using deterministic id ordering.
   - Use a PostgreSQL transaction and `pessimistic_write` row lock for stock rows.
   - Reject insufficient stock with `CATALOG_STOCK_INSUFFICIENT`.
   - Never allow stock to go negative.
5. A Catalog stock error must stop confirmation before Order persists the state transition or outbox.
6. Replaying confirmation for an already `PROCESSING` order must not deduct stock again or create another outbox event.

---

## 3. Concurrency Contract

For the canonical race case:

- Initial stock: `menuItem.stock = 1`.
- Two confirmations attempt to consume quantity `1` for the same tenant and menu item.
- Expected result:
  - exactly one confirmation succeeds;
  - exactly one confirmation receives structured `CATALOG_STOCK_INSUFFICIENT`;
  - final stock is `0`;
  - final stock is never negative;
  - only the successful order reaches `PROCESSING` and emits `order.confirmed`.

---

## 4. Test Contract

Required fast unit-contract tests:

- Order confirmation calls Catalog stock deduct with `confirm-order:{orderId}` idempotency key.
- Successful confirmation moves order to `PROCESSING` and persists one `order.confirmed` outbox event.
- Processing replay does not call Catalog stock deduct and does not persist another outbox event.
- Catalog stock deduction aggregates duplicate lines and locks sorted unique menu item ids.
- Catalog repository uses `pessimistic_write` and stable `menuItem.id ASC` ordering for stock locks.
- Catalog stock=1 concurrent deduction simulation has one success, one `CATALOG_STOCK_INSUFFICIENT`, and final stock `0`.
- Catalog stock error from TCP prevents Order persistence.

Required Step 5.3 external-stack integration:

- Use PostgreSQL and the Catalog TCP boundary or a production-equivalent outbox harness.
- Seed an isolated tenant, one category, one menu item with `stock=1`, two pending orders, and one open bill path.
- Execute two confirmations concurrently.
- Assert final Order rows, Catalog stock row, and outbox rows, not only mock call counts.

---

## 5. Out of Scope

- Payment settlement and table cleaning after bill payment.
- Kitchen station ticket generation after Kafka consumption.
- Menu item deletion while active orders exist.

---

## 6. Acceptance Criteria

- Step 5.2 can count the unit-contract portion as hardened when the fast tests above pass.
- `P0-ORD-STATE-STOCK` should remain `partial` until the Step 5.3 external-stack integration proves the concurrency contract against PostgreSQL/Catalog TCP or an equivalent harness.
