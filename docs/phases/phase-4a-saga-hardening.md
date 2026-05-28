# Phase 4A — Saga + Hardening (Order / Payment)

> **Tiếng Việt:** [phase-4a-saga-hardening.vi.md](phase-4a-saga-hardening.vi.md)

> **Goal:** Standardize multi-step transactions for order confirmation and payment completion — with clear compensation, limits and idempotency against double-submission, data deletion constraints, and order cancellation audits; put a simple transactional outbox in Order/Payment so that Kafka doesn't lose events when the DB commit is successful.
> **Estimated:** ~1 week
> **Status:** ⏸ Deferred — not yet implemented/closed as a separate phase after Phase 3; Some local hardening occurred in Phase 3/4B but does not count as completing Phase 4A.

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

Phase 4A increases the reliability of the POS core flow: every multi-step "action chain" (inventory → order → notification; check billing → close session → update table → store bill) is modeled as a saga with compensation — so that when a step fails, the system is not left in a half-baked state but has a controlled retreat. After Phase 4B, this phase must also identify onboarding tenant/Owner/payment settings as a mini-saga existing in the SaaS service: scope 4A is harden retry/observability/compensation if necessary, without changing the closed business ownership. At the same time, the phase fixed operational policies (session limit, idempotency, delete constraints, audit cancellation) and a minimalist outbox layer to synchronize "DB recorded" with "Kafka published", avoiding event loss. Full CDC (Debezium) is recognized as a post-thesis direction — not within the scope of this phase.

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

**WHAT:** Business chain: lock/hold appropriate inventory → create/record order → KDS notification (or equivalent kitchen channel).

**Saga Steps (Order Confirm):**

| Step | Action                                   | Service | Compensation (reverse)       |
| ---- | ---------------------------------------- | ------- | ---------------------------- |
| 1    | Validate & Lock Stock                    | Catalog | Release locked stock         |
| 2    | Update Order → Processing                | Order   | Mark order failed / rollback |
| 3    | Route to KDS via Kafka `order.confirmed` | Kitchen | Notify customer of failure   |

Compensation is performed in reverse order: Step 3 → Step 2 → Step 1.

**WHY:** Make sure there are no "created" orders when inventory runs out, and don't let inventory be held permanently if the next step fails.

**Compensation (intent):** Undo the locked portion; Mark failed orders/operations according to business rules; Notify the guest (or appropriate channel) when the stream is not complete — so staff/guests don't expect the order to have entered the kitchen.

#### Payment Complete Saga

**WHAT:** Business chain: **validate billing** — the entire line-item must be in a state that allows payment according to the rule (eg Ready/Served as §6.B) → close session → update table status → archive bill (store invoice/session according to policy).

**Saga Steps (Payment Complete):**

| Step | Action                                   | Service | Compensation (reverse)                   |
| ---- | ---------------------------------------- | ------- | ---------------------------------------- |
| 1    | Validate billing: all items Ready/Served | Order   | —                                        |
| 2    | Close Session                            | Order   | Reopen session                           |
| 3    | Update Table → Cleaning                  | Catalog | Revert table status                      |
| 4    | Archive Bill                             | Order   | Unarchive bill, revert to previous state |

Compensation is performed in reverse order: Step 4 → Step 3 → Step 2 → Step 1.

**WHY:** Payment is only allowed when the operation is "qualifiedly served"; Avoid paying on applications that are not ready and avoid discussions/sessions that differ from actual payment.

**Compensation (intent):** Reopen session if closed but the following step fails; revert updates the table to a consistent state before the error step — so as not to permanently lock the table or record incorrect occupancy.

#### Hardening chung

| Topics                   | WHAT                                                                                                                                | WHY                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `max_orders_per_session` | Limit the maximum number of orders per session (default 20), **configurable according to tenant plan** — anti-spam/virtual orders   | Prevent ordering abuse/spam and keep POS operations stable                |
| Idempotency              | Redis SET NX for order creation — same idempotency key for first win only, prevent double-submit                                    | Double-submit (double tap, retry client) does not create duplicate orders |
| Delete constraints       | Do not delete **Category** and **MenuItem**; do not delete **MenuItem** while **OrderItem** is active (status IN PROCESSING, READY) | Preserves single reference and history; Avoid orphans and false reports   |
| Audit cancel             | **REQUIRED** log when Cancel order — **actor** (who), **reason** (why), **timestamp** (when)                                        | Serving investigation, control and operational responsibility             |

#### SaaS Onboarding Mini-Saga (available from Phase 4B)

**WHAT:** The existing tenant onboarding sequence includes creating the default tenant/subscription, creating the Owner via Authorizer/User-Access, initializing `tenant_payment_settings`, outboxing `tenant.created`, and rollback/cleanup when the mid-step fails.

**WHY:** This is a multi-service business flow arising after spec Phase 4B. If Phase 4A is deployed after Phase 4B, it must harden this flow with Order/Payment: idempotency key for onboarding requests, compensation with clear audit, retry/cleanup orphan Keycloak user with metrics/log, and not lose outbox events after DB commit.

**Boundary:** Do not turn onboarding into a self-service registration wizard; That decision remains deferred/post-thesis under Phase 4B.

#### Simplified Transactional Outbox

**WHAT:** Table `outbox_events` (or equivalent) in **Order** and **Payment**; record event **with transaction** with business change; poll background job/cron → publish Kafka → mark sent.

**Data flow:** When state change occurs → record event to outbox table **with DB transaction** with business update → background cron poll outbox periodically → publish event to Kafka → mark outbox record as "sent". Make sure the event is not lost when the service crashes midway (between committing DB and publishing Kafka).

**WHY:** If you only publish Kafka after committing, a crash in the middle may cause the event to be lost; outbox attaches "occurred" to "persisted" before the broker received it.

**Scope beyond phase:** **Full CDC with Debezium** — noted as **post-thesis** (higher operational/infra complexity; this phase accepts simple outbox poll).

**verify (overall suggestion):** Scenario failure is described in the Acceptance Criteria; outbox does not leave the error "DB committed but no outbox record" for committed events.

## Acceptance Criteria

- **Saga compensation (order):** When locking/preserving fails → **does not** create a valid order; inventory and the system status is not in the state of "there are orders but not enough goods".
- **Billing validation (payment):** Billing is **blocked** when there are still line-items that have not met the Ready/Served condition (according to rule §6.B / agreed business configuration).
- **Idempotency:** Submit the same idempotency key (double-submit) → **one** corresponding action/action, do not duplicate the side-effect.
- **Delete constraints:** Cannot delete Category but MenuItem; MenuItem cannot be deleted but OrderItem is active — API/DB returns clear error.
- **Audit cancel:** All cancellation operations have an audit record with **actor, reason, timestamp** enough for later lookup.
- **Onboarding mini-saga hardening:** If Phase 4A reopens after Phase 4B, onboarding the tenant has clear idempotency/compensation/audit/observability and does not change the admin-assisted onboarding decision.

## Outputs

- The **Order Confirm Saga** and **Payment Complete Saga** flows are described by behavior with compensation, matching technical-architecture §12 and business-logic §4.B / §6.B.
- Policy `**max_orders_per_session`\*\* (default 20, configurable by tenant) applies consistently across the order/confirm flow.
- Idempotency and delete constraints are **invariant** in integration/API tests or equivalent QA checklists.
- Simple outbox on Order + Payment: event recorded with transaction, worker/cron pushes Kafka and marked sent.
- Roadmap clearly states: **Debezium / full CDC** — after thesis.
