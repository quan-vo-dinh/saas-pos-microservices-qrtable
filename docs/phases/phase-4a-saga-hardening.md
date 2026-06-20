# Phase 4A — Saga + Hardening (Order / Payment)

> **Tiếng Việt:** [phase-4a-saga-hardening.vi.md](phase-4a-saga-hardening.vi.md)

> **Goal:** Standardize a representative Saga slice for the thesis: POS order confirmation plus the existing SaaS tenant onboarding mini-saga. Deeper operational hardening such as durable Saga state, retry workers, CDC/Debezium, full payment saga, and stock ledger is outside the main scope.
> **Estimated:** ~1 week
> **Status:** ✅ Representative slice implemented — Order now has `OrderConfirmSagaService` with stock release compensation; SaaS onboarding mini-saga remains from Phase 4B. Full Phase 4A hardening remains future work.

## Prerequisites

- Phase 3 completed — [phase-3-payment.md](phase-3-payment.md) (payment flow, billing/session is stable as the foundation for payment and validation saga)
- Phase 2A/2B: Order, Kafka, KDS/realtime available — order confirmation saga based on inventory key, order creation, kitchen notification
- Phase 4B has completed an onboarding mini-saga in SaaS service — if Phase 4A is reopened, the hardening must consider it as an existing flow to standardize/retry/observe, not redesign from scratch.

## Reference

| Documents                 | Related Sections                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| technical-architecture.md | §12 Distributed Transactions (distributed transaction processing / saga & consistency assurance) |
| business-logic.md         | §4.B Ordering rules (order order/confirmation conditions, line-item status)                      |
| business-logic.md         | §6.B Payment rules (payment conditions, session closure, invoice)                                |

## Overview

Within the thesis scope, Phase 4A focuses on two representative workflows rather than claiming every production hardening item. The POS core workflow is **Order Confirm Saga**: Order orchestrates, Catalog owns a versioned stock reservation and stock deduction/release, Order commits `PROCESSING`, the returned reservation version, and the `order.confirmed` outbox together, and Kitchen reacts after commit. If Catalog acknowledged a deduction but Order cannot commit, Order releases that exact reservation version as compensation. The platform workflow is the existing **SaaS Onboarding Mini-Saga** from Phase 4B: SaaS orchestrates tenant, Owner, profile, subscription, payment settings, and rollback.

Payment is documented as settlement baseline with outbox + retry/idempotency, **not** as a full Payment Complete Saga. `max_orders_per_session`, Redis SET NX for order creation, durable Saga state, dedicated cancellation audit table, and CDC/Debezium are recorded as future hardening unless code implements them.

## Steps

### Step 4.1 — Study Saga (3–4 days)

**Goal:** Have a general foundation of theory and vocabulary (orchestration/choreography, compensation, idempotency) before plugging in Order/Payment — reducing design mistakes from the start.

**Main requirements (WHAT + WHY):**

- Complete lessons **124–129** in the course roadmap (saga, distributed transactions, failure modes).
- **Why:** The confirm order and complete payment flows are multi-step and cross-cutting; Without the saga framework, it is easy to depend on the "happy path" and difficult to reason about timeout/retry.

**verify:** Can be described in words: commit point, retry point, required compensation point, and why idempotency is indispensable at the HTTP edge.

### Step 4.2 — Deployment & hardening (4–5 days)

**Goal:** Saga and operational policy are reflected in system behavior (not just documents), in sync with ordering/payment business rules.

#### Order Confirm Saga

**WHAT:** Business chain: validate order/bill → Catalog deducts stock → Order confirms rows and records outbox → Kitchen receives `order.confirmed` after commit.

**Saga Steps (Order Confirm):**

| Step | Action                                                                                        | Service        | Compensation (reverse)                                                             |
| ---- | --------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| 1    | Lock `PENDING` order, validate `OPEN` bill, load order items                                  | Order          | None — no external side effect yet                                                 |
| 2    | Ensure a versioned reservation with `confirm-order:{orderId}` and deduct stock                | Catalog        | Release the returned version with `confirm-order-compensation:{orderId}:{version}` |
| 3    | Update order/items → `PROCESSING`, store reservation version, insert `order.confirmed` outbox | Order          | If this fails after step 2, call the versioned Catalog release                     |
| 4    | Publish Kafka `order.confirmed` for Kitchen tickets                                           | Outbox/Kitchen | Not part of stock compensation; consumer must be idempotent                        |

The business commit point is a successful Order DB commit containing `PROCESSING` order/items, `stock_reservation_version`, and the `order.confirmed` outbox.

**WHY:** Make sure there are no "created" orders when inventory runs out, and don't let inventory be held permanently if the next step fails.

**Implemented stock idempotency and compensation:** Catalog persists one tenant/order `stock_reservations` row with the immutable payload hash, current state, stored result, and monotonically increasing version in the same local transaction as stock mutation. Replaying an active deduct returns the stored result without another deduction. A matching release restores stock once; an older release is `STALE` and cannot affect a newer reservation. `OrderConfirmSagaService` stores the acknowledged version and calls Catalog `releaseForOrder` if an error happens after Catalog deduct succeeds but before Order commit completes.

If Catalog commits but its deduct response is lost, Order remains `PENDING` and does not guess that the mutation succeeded. A caller retry sends the same key and payload; Catalog replays the active reservation, and Order can then commit with the returned version. This is retry-driven recovery, not autonomous recovery: there is no Saga execution table or background recovery worker in Order.

#### Payment Settlement Baseline (not a full Payment Complete Saga)

**WHAT:** Payment records settlement, audit, and `payment.completed` outbox; Order owns bill/session finalization through TCP fast path and Kafka retry path.

**WHY:** Payment does not own bill/session/table state; finalization stays in Order to preserve service boundaries.

**Current limit:** This is an outbox + retry/idempotency baseline, not a full saga with compensation for reopening sessions or reverting table status across every failure mode.

#### Shared Hardening

| Topics                   | WHAT                                                                                                                                | WHY                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `max_orders_per_session` | Future hardening; current runtime enforces tenant-plan daily quota (`max_orders_per_day`)                                           | Avoid claiming behavior not present in code                             |
| Idempotency              | Order submit uses idempotency key with PostgreSQL unique/replay; Redis SET NX is future hardening if needed                         | Double-submit/retry does not create duplicate orders                    |
| Delete constraints       | Do not delete **Category** and **MenuItem**; do not delete **MenuItem** while **OrderItem** is active (status IN PROCESSING, READY) | Preserves single reference and history; Avoid orphans and false reports |
| Audit cancel             | **REQUIRED** log when Cancel order — **actor** (who), **reason** (why), **timestamp** (when)                                        | Serving investigation, control and operational responsibility           |

#### SaaS Onboarding Mini-Saga (available from Phase 4B)

**WHAT:** The existing tenant onboarding sequence includes creating the default tenant/subscription, creating the Owner via Authorizer/User-Access, initializing `tenant_payment_settings`, outboxing `tenant.created`, and rollback/cleanup when the mid-step fails.

**WHY:** This multi-service flow is enough evidence for a platform saga in the current scope: it has an orchestrator, participants, `tenant.created` outbox, and compensation that disables the owner, removes initial subscription/cache, and deletes the tenant on failure.

**Current limit:** Whole-flow onboarding idempotency key, Saga execution state, and dedicated compensation observability are not implemented yet.

**Boundary:** Do not turn onboarding into a self-service registration wizard; That decision remains deferred/post-thesis under Phase 4B.

#### Simplified Transactional Outbox

**WHAT:** Table `outbox_events` (or equivalent) in **Order** and **Payment**; record event **with transaction** with business change; poll background job/cron → publish Kafka → mark sent.

**Data flow:** When state change occurs → record event to outbox table **with DB transaction** with business update → background cron poll outbox periodically → publish event to Kafka → mark outbox record as "sent". Make sure the event is not lost when the service crashes midway (between committing DB and publishing Kafka).

**WHY:** If you only publish Kafka after committing, a crash in the middle may cause the event to be lost; outbox attaches "occurred" to "persisted" before the broker received it.

**Scope beyond phase:** **Full CDC with Debezium** — noted as **post-thesis** (higher operational/infra complexity; this phase accepts simple outbox poll).

**verify (overall suggestion):** Scenario failure is described in the Acceptance Criteria; outbox does not leave the error "DB committed but no outbox record" for committed events.

## Acceptance Criteria

- **Order Confirm Saga:** `OrderConfirmSagaService` orchestrates confirm; if Catalog deduct succeeds but Order commit/outbox fails, Order calls Catalog release stock.
- **Catalog reservation replay:** the same tenant/order/key/payload returns the stored active reservation without deducting stock twice; a different key or payload is rejected.
- **Versioned release:** duplicate release restores stock once, reconfirm after compensation increments the version, and a stale release cannot affect the newer reservation.
- **Order commit point:** `PROCESSING`, order items, `stock_reservation_version`, and `order.confirmed` outbox commit together.
- **Replay:** An already `PROCESSING` order returns current state without deducting stock again or creating a new outbox row.
- **Catalog error:** If Catalog rejects before a successful deduct, Order does not move to `PROCESSING` and does not compensate.
- **Payment:** Claim only settlement + outbox + retry/idempotency baseline, not a full Payment Complete Saga.
- **Onboarding mini-saga:** Keep the Phase 4B mini-saga and document remaining hardening limits.

## Verification And Thesis Evidence

The thesis evidence for Phase 4A is intentionally scoped as a representative Saga slice, not full operational saga hardening.

- **Order Confirm Saga:** use `order-confirm-saga.service.spec.ts`, `catalog-stock-gateway.service.spec.ts`, and `stock-reservation.service.spec.ts` for deterministic orchestration and state transitions. Use `order-confirm-stock-idempotency.integration.spec.ts` for real PostgreSQL plus Catalog TCP duplicate/lost-response/version evidence, and `order-stock-concurrency.integration.spec.ts` for two-order contention.
- **SaaS Onboarding Mini-Saga:** use SaaS onboarding unit/mocked integration tests, `onboarding-saga-db.integration.spec.ts` for real PostgreSQL success/rollback, and `onboarding-saga-live-payment.integration.spec.ts` for the live Payment TCP boundary.
- **Thesis artifacts:** UI screenshots, terminal output, DB/outbox snapshots, and logs can illustrate the flows, but the acceptance argument should reference the test layers above.
- **Limit:** the Catalog reservation row is durable stock domain state, not durable Order Saga execution state. Do not claim autonomous recovery without a caller retry, exactly-once delivery, retry workers, CDC/Debezium, stock ledger, or full live Keycloak/User-Access onboarding validation.

See `docs/testing/phase-5/saga-validation-strategy.md` for the detailed validation plan.

## Outputs

- `OrderConfirmSagaService` and tests for stock compensation in Order Confirm.
- Documentation describes two representative sagas: Order Confirm and SaaS Onboarding.
- Payment, idempotency, delete constraints, session limit, and CDC/Debezium are documented at their actual implementation level or as future hardening.
- Roadmap clearly states durable Saga state, retry worker, stock ledger, and full CDC as hardening beyond the main scope.
