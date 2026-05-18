# Phase 5 Step 5.1 Traceability Matrix

**Scope:** P0 and P1 rules only. This inventory maps canonical rules from `docs/business-logic.md`, `docs/technical-architecture.md`, completed phase records (1, 2A, 2B, 3, 4B), and `docs/architecture/permission-matrix.md` to existing tests. It does not add or require new business behavior.

**Phase context:** Phases 0, 1, 2A, 2B, 3, and 4B are complete. Phase 4A is deferred. Phase 4C is not started.

---

## Status definitions

- **`covered`** — Existing tests protect the target layer for this rule.
- **`partial`** — Existing tests cover part of the rule; a stronger layer, fixture, live stack proof, or edge case is still needed.
- **`missing`** — Behavior appears implemented or is the current contract, but no adequate test was found.
- **`implementation-gap`** — Canonical docs describe a rule that is not clearly implemented; do not add tests until behavior is built or the spec changes.
- **`security-gap`** — Security hardening is insufficient for production or demo-public exposure; current tests may only cover route shape or presence.
- **`deferred-by-phase`** — Rule belongs to Phase 4A, Phase 4C, or explicit post-thesis or future hardening scope.

---

## Inventory notes

- Fast tests are mostly Jest or Nx specs under `apps/**` and `libs/**`.
- Browser E2E today is limited to `tests/e2e/step-2.7-realtime.spec.ts` and `tests/e2e/phase-3-payment.spec.ts`.
- **Stack-dependent** items need PostgreSQL, Redis, Kafka, Keycloak, frontend dev servers, or provider credentials when noted.
- **No test file found** means the inventory did not locate an adequate spec for that rule; it does not mean the rule is unimportant.

**How test locations are written:** Paths are given as bullets under each rule so they wrap in the editor. The first path segment is the app or library root; deeper paths follow in the same bullet where helpful.

---

## Catalog and QR

### `P0-CAT-TENANT-ISOLATION` — `partial` (P0, tenant-isolation)

**Requirement:** Catalog, admin, and public menu reads and writes must be tenant-scoped; tenant A must not see tenant B data.

**Sources:** `business-logic` (1.B, 2.B); `technical-architecture` (5, 6.2.4); `phase-1-catalog` Step 1.5.

**Tests:** Catalog category and menu-item service specs; frontend tenant isolation integration under `libs/frontend/utils` integration tests.

**Target layer:** integration. **Stack:** BFF, Catalog, auth seed.

**Notes:** Unit or service coverage exists and a stack-dependent integration file exists; Phase 5 should make readiness and seed policy explicit before treating this as a reliable gate.

---

### `P0-CAT-QR-TOKEN` — `covered` (P0, security)

**Requirement:** QR or table token must be opaque, tenant- and table-scoped, reject malformed or mismatched tokens, and feed customer session creation.

**Sources:** `business-logic` (3.B); `technical-architecture` (8.1); `phase-1-catalog` Step 1.5.

**Tests:** Catalog table service spec; management-app QR URL unit tests; Step 2.7 realtime E2E (seeded QR token on dev stack).

**Target layer:** unit-contract. **Stack:** optional browser dev stack.

**Notes:** Table service covers generation, validation, and malformed tokens; Step 2.7 E2E exercises a seeded QR token.

---

### `P1-CAT-QR-RATE-LIMIT` — `implementation-gap` (P1, security)

**Requirement:** QR scan and order spam limits should cap excessive scans or orders per session.

**Sources:** `business-logic` (3.B); `technical-architecture` (11.1).

**Tests:** Throttler configuration only (`libs/configuration` throttler config); no focused spec for table-scoped limits.

**Target layer:** unit-contract. **Stack:** Redis if exercising BFF throttler storage.

**Notes:** BFF exposes a global Throttler provider; no table-scoped `max_scans_per_table` or `max_orders_per_session` behavior or test was found. Treat as product and security hardening outside this traceability pass.

---

### `P0-CAT-PUBLIC-MENU` — `covered` (P0, tenant-isolation)

**Requirement:** Public menu must expose only active categories and available, non-deleted items for the current tenant.

**Sources:** `business-logic` (2.B); `phase-1-catalog` Step 1.5.

**Tests:** Catalog menu service spec; public menu integration under `libs/frontend/utils`; customer PWA `use-menu-query` hook spec.

**Target layer:** integration. **Stack:** BFF, Catalog, seeded menu.

**Notes:** Service and integration tests cover available-only filtering and related cache behavior.

---

### `P1-CAT-DELETE-CONSTRAINTS` — `partial` (P1, state-machine)

**Requirement:** Categories with menu items and active or occupied tables must not be deleted; menu items tied to open orders need an Order-owned constraint.

**Sources:** `business-logic` (2.B, 3.D); `phase-1-catalog` Step 1.5.

**Tests:** Catalog category, table, and menu-item service specs.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** Category and table constraints are covered. Menu item deletion while orders are active is not clearly implemented in Catalog or Order; treat that slice as an implementation gap before writing tests.

---

### `P1-CAT-CLOUDINARY-TENANT-PATH` — `covered` (P1, security)

**Requirement:** Upload validation must enforce image type, size, safe filenames, and tenant-isolated Cloudinary folder paths.

**Sources:** `business-logic` (9.D); `technical-architecture` (5.2); `phase-1-catalog` Step 1.45.

**Tests:** Cloudinary provider and validator specs under `libs/providers/cloudinary`; upload client spec under `libs/frontend/utils`.

**Target layer:** unit-contract. **Stack:** none.

---

### `P1-CAT-NO-MENU-KAFKA` — `covered` (P1, architecture)

**Requirement:** Menu changes should use cache or query invalidation; no Kafka or WebSocket `menu.updated` contract is in current scope.

**Sources:** `business-logic` (2.B); `technical-architecture` (7.2, 11.3); `phase-1-catalog` Step 1.5; `phase-2b-kitchen-websocket` handoff.

**Tests:** BFF Phase 5 architecture contracts static spec.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** Static architecture test asserts no `menu.updated`, `events.menuUpdated`, `events.menu.updated`, `menuUpdated`, `MENU_UPDATED`, or `MenuUpdated` contract is exported or used. Do not add realtime menu behavior in Phase 5.

---

### `P1-CAT-TABLE-PLAN-QUOTA` — `covered` (P1, tenant-isolation)

**Requirement:** Table creation must respect subscription `max_tables` quota.

**Sources:** `business-logic` (3.D); `phase-4b-saas-onboarding` final business behavior.

**Tests:** Catalog table service spec covers owner-service enforcement for `max_tables`, unlimited `-1`, missing/unavailable quota source fail-closed, and stable `TENANT_PLAN_LIMIT_EXCEEDED` details.

**Target layer:** unit-contract. **Stack:** mocked SaaS TCP.

**Notes:** Catalog now enforces quota before table persistence by calling SaaS `SUBSCRIPTION.GET_CURRENT` and counting owner-service tables. BFF edge feedback remains optional; owner boundary is the acceptance gate.

---

## Order, cart, and session

### `P0-ORD-SESSION-JOIN` — `partial` (P0, state-machine)

**Requirement:** Customer QR join creates a durable active session for an AVAILABLE table, rejoins an OCCUPIED active session, and rejects session starts for BILLING and CLEANING.

**Sources:** `business-logic` (3.C, 4.A); `phase-2a-order-kafka` final scope.

**Tests:** Order and session service specs; Step 2.7 realtime E2E.

**Target layer:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP, PWA or BFF for E2E.

**Notes:** Unit and browser journey exist; add a real boundary integration for Catalog QR or table status plus Order session semantics in Redis and PostgreSQL.

---

### `P0-ORD-CART-VERSION-LOCK` — `covered` (P0, state-machine)

**Requirement:** Shared cart uses Redis `cartVersion`, rejects stale mutations, locks while bill is `PENDING_PAYMENT`, and refetches server snapshot.

**Sources:** `business-logic` (4.A, 6.A); `technical-architecture` (11, 12.2); `phase-2a-order-kafka` accepted decisions.

**Tests:** Order cart service spec; customer PWA order and realtime hook specs; opt-in DB/Redis integration `apps/order/src/app/modules/order/tests/order-submit-cart.integration.spec.ts`.

**Target layer:** integration. **Stack:** Redis; BFF or PWA optional.

**Notes:** Unit and hook coverage is strong. Step 5.3 DB/Redis integration now proves concurrent mutations with the same expected `cartVersion` produce one success, one `CART_VERSION_CONFLICT`, and a stable final server snapshot. Redis cart writes use compare-and-set via `WATCH`/`MULTI`. Run with `RUN_PHASE5_ORDER_SUBMIT_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-submit-cart.integration.spec.ts --runInBand` after PostgreSQL and Redis are ready.

---

### `P0-ORD-SUBMIT-IDEMPOTENCY` — `covered` (P0, state-machine)

**Requirement:** Submit order creates `PENDING` once, clears cart once, uses `idempotencyKey`, and must not persist a `DRAFT` database order row.

**Sources:** `business-logic` (4.B, 12.2); `phase-2a-order-kafka` accepted decisions.

**Tests:** Order service spec; customer PWA order query hook spec; shared types transition tests; opt-in DB/Redis integration `apps/order/src/app/modules/order/tests/order-submit-cart.integration.spec.ts`.

**Target layer:** integration. **Stack:** PostgreSQL, Redis.

**Notes:** Step 5.3 DB/Redis integration proves duplicate submit with the same `idempotencyKey` creates one `PENDING` order, clears the cart once, and never persists `DRAFT`. It also proves concurrent submit with different idempotency keys but the same stale `cartVersion` rolls back before a second order is persisted. Run with `RUN_PHASE5_ORDER_SUBMIT_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-submit-cart.integration.spec.ts --runInBand` after PostgreSQL and Redis are ready.

---

### `P0-ORD-STATE-STOCK` — `covered` (P0, money)

**Requirement:** Staff confirm moves `PENDING` to `PROCESSING`, deducts stock through a Catalog TCP transaction, emits `order.confirmed`, and rolls back on stock errors.

**Sources:** `business-logic` (4.B, 8.B); `technical-architecture` (12.1); `phase-2a-order-kafka` accepted decisions; `phase-5-p0-order-stock-confirmation-spec`.

**Tests:** Order service spec; Catalog menu-item service spec; Catalog menu-item repository spec; order-confirmed payload spec in Order app; opt-in external-stack spec `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts`.

**Target layer:** integration. **Stack:** PostgreSQL, Catalog TCP, Kafka or outbox harness.

**Notes:** Step 5.2 unit-contract coverage proves stock deduct call shape, `PROCESSING` transition, outbox persistence, replay no-rededuct, Catalog sorted unique lock contract, and a stock=1 concurrent deduction simulation. Step 5.3A-1 external-stack coverage passed with PostgreSQL plus live Order and Catalog TCP using `RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-stock-concurrency.integration.spec.ts --runInBand`; Order now preserves live TCP business error payloads such as `CATALOG_STOCK_INSUFFICIENT`.

---

### `P0-ORD-CANCEL-POLICY` — `covered` (P0, rbac)

**Requirement:** Customer may cancel only their own `PENDING` orders; staff may cancel pending; Owner or Manager may cancel processing with a reason and stock release.

**Sources:** `business-logic` (4.B, 8.B, 9.E); `permission-matrix` (6 through 8); `phase-2a-order-kafka` accepted decisions.

**Tests:** Order service spec; BFF permission guard spec; management-app live orders table component spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-ORD-BILL-REQUEST` — `partial` (P0, money)

**Requirement:** Bill request requires an empty cart and all active orders served; bill moves `OPEN` to `PENDING_PAYMENT`, locks cart, table moves to billing.

**Sources:** `business-logic` (3.C, 6.A); `phase-2a-order-kafka` accepted decisions.

**Tests:** Bill and service-request specs in Order; customer PWA order query hook spec.

**Target layer:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP.

**Notes:** Service tests cover rules; boundary proof for cart lock plus Catalog table billing state remains an integration target.

---

### `P0-ORD-PAYMENT-FINALIZATION` — `partial` (P0, money)

**Requirement:** `BILL_MARK_PAID` is idempotent, marks bill `PAID`, closes active session, deletes Redis session and cart keys, moves table `BILLING` to `CLEANING`.

**Sources:** `business-logic` (3.C, 6.A); `phase-3-payment` accepted decisions.

**Tests:** Bill and session service specs; payment events consumer spec in Order.

**Target layer:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP, payment event harness.

**Notes:** Unit coverage exists; full Payment to Order to Catalog final-state integration or E2E for close-session is still missing.

---

### `P1-ORD-SERVICE-REQUESTS` — `covered` (P1, demo)

**Requirement:** Customer service requests are session- and tenant-scoped; staff acknowledge and resolve with correct transitions.

**Sources:** `business-logic` (4.A); `phase-2a-order-kafka` final business behavior.

**Tests:** Order service-request service spec; BFF staff order controller spec; management-app service-requests feature specs.

**Target layer:** unit-contract. **Stack:** none.

---

### `P1-ORD-TABLE-TRANSFER` — `partial` (P1, state-machine)

**Requirement:** Table transfer uses saga-style consistency: Redis lock, Order database and session update, Catalog status update, Redis metadata patch, realtime hint.

**Sources:** `business-logic` (3.D); `technical-architecture` (12.1); `phase-2a-order-kafka` accepted decisions.

**Tests:** Order transfer service spec; management-app transfer request id spec; transfer table dialog component spec.

**Target layer:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP.

**Notes:** Unit tests cover locks and request identifiers; add integration for final session and table state and compensation.

---

## Kitchen (KDS) and realtime

### `P0-KDS-ORDER-CONFIRMED-DEDUPE` — `partial` (P0, realtime)

**Requirement:** `order.confirmed` creates at most one Redis ticket per `(tenantId, orderId, station)` and deduplicates duplicate Kafka events.

**Sources:** `business-logic` (5); `technical-architecture` (7.2); `phase-2b-kitchen-websocket` accepted decisions.

**Tests:** Kitchen order-confirmed consumer spec; KDS ticket service spec.

**Target layer:** integration. **Stack:** Kafka or direct consumer harness, Redis.

**Notes:** Unit consumer tests cover dedupe and dead-letter; add real Redis or Kafka duplicate-delivery coverage for at-least-once behavior.

---

### `P0-KDS-STATION-ACCESS` — `covered` (P0, rbac)

**Requirement:** CHEF sees kitchen, BARISTA sees bar, Owner or Manager may access both, WAITER must not join KDS station rooms by default.

**Sources:** `permission-matrix` (6); `phase-2b-kitchen-websocket` accepted decisions.

**Tests:** BFF KDS station access service spec; kitchen controller spec; realtime auth service spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P1-KDS-FIFO-PRIORITY-SLA` — `covered` (P1, realtime)

**Requirement:** KDS queue is FIFO with priority override; SLA worker emits deduped `kitchen.sla_warning`; no batching or grouped-prep contract.

**Sources:** `business-logic` (5.B); `phase-2b-kitchen-websocket` final business behavior.

**Tests:** Kitchen KDS score, ticket service, and SLA worker specs; management-app KDS board policy spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P1-KDS-REFETCH-HINT` — `covered` (P1, realtime)

**Requirement:** WebSocket and KDS events are hints only; KDS, PWA, and POS must invalidate or refetch REST snapshots after events, reconnect, missed events, or tab wake.

**Sources:** `business-logic` (5.B); `technical-architecture` (9); `phase-2b-kitchen-websocket` accepted decisions.

**Tests:** Management-app KDS and staff order realtime hook specs; customer PWA order realtime hook spec; Step 2.7 E2E.

**Target layer:** browser-e2e. **Stack:** frontend dev servers, BFF, Keycloak, seeded users.

**Notes:** Hook tests cover refetch and invalidation; Step 2.7 E2E checks customer served state across reconnect and reload on the dev stack.

---

### `P1-KDS-REDIS-ONLY-RECOVERY` — `covered` (P1, architecture)

**Requirement:** Kitchen owns Redis KDS state only, can rebuild missing tickets from active Order snapshots, and must not introduce persistent database KDS state.

**Sources:** `technical-architecture` (5.1, 11.2); `phase-2b-kitchen-websocket` final technical behavior.

**Tests:** Kitchen KDS keys, recovery service, and ticket service specs.

**Target layer:** unit-contract. **Stack:** none.

---

## Payment and billing

### `P0-PAY-ROUNDING-VND` — `covered` (P0, money)

**Requirement:** Bill and payment totals follow VND rounding-to-thousand policy with `rawTotal`, `roundedTotal`, and `roundingDelta`.

**Sources:** `business-logic` (6.B); `technical-architecture` (6.2.7, 10.1); `phase-3-payment` accepted decisions.

**Tests:** VND rounding policy spec; Order bill roll-up and bill snapshot specs; Payment service spec; Payment refund service spec; customer PWA request-payment page spec.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** Canonical helper now applies `Math.ceil(rawTotal / 1000) * 1000`, rejects negative/non-integer raw totals, and stores `rawTotal`, `roundedTotal`, and `roundingDelta` on the Order-owned bill snapshot. Payment validates snapshot consistency, persists Order snapshot totals, uses `roundedTotal` for VietQR/cash/webhook comparisons, and falls back to `paidAmount ?? roundedTotal` for full refund amount.

---

### `P0-PAY-QRTBL-REFERENCE` — `covered` (P0, money)

**Requirement:** Restaurant bill VietQR references use a stable `QRTBL` prefix, collision fallback, and extraction from SePay code or content.

**Sources:** `business-logic` (6.A); `technical-architecture` (10.1); `phase-3-payment` accepted decisions.

**Tests:** Payment reference service spec; SaaS constants spec; customer PWA request-payment page spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-PAY-CASH-VIETQR-SETTLEMENT` — `covered` (P0, money)

**Requirement:** Cash requires `amountReceived >= roundedTotal`; VietQR creation reuses pending payment and uses tenant payment settings instead of platform fallback.

**Sources:** `business-logic` (6.A); `phase-3-payment` final business behavior.

**Tests:** Payment service spec; management-app bill settlement panel spec; BFF customer order controller spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-PAY-WEBHOOK-UNDERPAID` — `covered` (P0, money)

**Requirement:** Underpaid SePay transfer keeps payment pending and records `SEPAY_WEBHOOK_UNDERPAID`; it must not finalize the bill.

**Sources:** `business-logic` (6.A); `phase-3-payment` accepted decisions.

**Tests:** Payment service spec (settlement paths).

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-PAY-WEBHOOK-DUP-AFTER-PAID` — `covered` (P0, money)

**Requirement:** Duplicate SePay transaction identifiers and webhook delivery after terminal payment must not double-settle or call Order again; they must be audited.

**Sources:** `business-logic` (6.A); `technical-architecture` (12.2); `phase-3-payment` accepted decisions.

**Tests:** Payment service spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-PAY-COMPLETED-ORDER-BRIDGE` — `covered` (P0, money)

**Requirement:** Payment completion writes payment and outbox and synchronizes to Order via `BILL_MARK_PAID`; BFF realtime bridge only hints UI refetch.

**Sources:** `technical-architecture` (7.2, 9.2, 10.1); `phase-3-payment` final technical behavior.

**Tests:** Payment service spec; Order payment events consumer spec; BFF realtime Kafka bridge spec; customer PWA order realtime hook spec; opt-in external-stack harness `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts`.

**Target layer:** integration. **Stack:** Payment database, Order database, Catalog database, Order TCP, Catalog TCP, Redis for Order session close.

**Notes:** Unit and bridge tests exist, and the opt-in harness passed against the local external stack with live Order and Catalog TCP using `RUN_PHASE5_PAY_COMPLETED_ORDER_BRIDGE=1 pnpm nx test payment --testPathPatterns=payment-completed-order-bridge.integration.spec.ts --runInBand`. The harness proves one final database state across Payment, Order, and Catalog with idempotent replay.

---

### `P0-PAY-REFUND-FULL-ONLY` — `covered` (P0, money)

**Requirement:** Refunds are manual full refunds only, one active or confirmed refund at a time, and do not reopen bills.

**Sources:** `business-logic` (6.B); `phase-3-payment` accepted decisions.

**Tests:** Payment refund service spec; management-app orders refund section spec; Phase 3 payment E2E.

**Target layer:** unit-contract. **Stack:** optional browser dev stack.

---

### `P1-PAY-DIRECT-HMAC-WEBHOOK` — `covered` (P1, security)

**Requirement:** Direct Phase 3 SePay webhook route must verify raw-body HMAC and timestamp and return the provider-required raw success response.

**Sources:** `business-logic` (6.A); `phase-3-payment` final technical behavior.

**Tests:** BFF payment controller spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-PAY-X-SECRET-VALUE` — `covered` (P0, security)

**Requirement:** Phase 4B tenant and platform `x-secret-key` webhooks must validate the value against the stored tenant or platform secret before production or demo-public exposure.

**Sources:** `business-logic` (6.A); `phase-4b-saas-onboarding` handoff; `docs/specs/business-logic-phase-4b-spec.md` webhook note.

**Tests:** BFF SePay webhook controller spec (SaaS module); Payment service settlement spec; SaaS subscription invoice service spec; TCP logging interceptor redaction spec.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** BFF rejects missing `x-secret-key` and forwards route context without returning the raw secret; TCP logging redacts secret-like fields before serializing params. Payment tenant webhook verification resolves `tenantSlug` server-side, decrypts the stored tenant payment-settings webhook secret, compares it with the supplied header, rejects invalid/unconfigured/mismatched secrets before payment/outbox/Order mutation, and keeps `QRSUB` payloads isolated from tenant settlement. SaaS platform webhook verification compares `x-secret-key` with `SEPAY_PLATFORM_WEBHOOK_SECRET`, rejects invalid/unconfigured secrets before invoice/subscription mutation, and keeps `QRTBL` payloads isolated from platform invoice handling. Tests use unit mocks only and do not call live SePay.

---

### `P1-PAY-BROWSER-CLOSE-SESSION` — `partial` (P1, demo)

**Requirement:** Browser E2E should prove payment close-session: bill immutable, session closed, table moves to Cleaning after cash or VietQR.

**Sources:** `phase-5-7-finalization` Step 5.4; `phase-3-payment` acceptance evidence.

**Tests:** `tests/e2e/phase-3-payment.spec.ts` only.

**Target layer:** browser-e2e. **Stack:** PWA, management-app, BFF, Payment, Order, Catalog, Keycloak, seeded paid and pending bills.

**Notes:** Current Playwright coverage is smoke for screens, tabs, and refund visibility; add a deterministic close-session journey once seed or fixture is stable.

---

## SaaS, onboarding, and tenant lifecycle

### `P0-SAAS-ONBOARDING-SAGA` — `partial` (P0, tenant-isolation)

**Requirement:** SUPER_ADMIN onboarding creates tenant, owner, profile, default subscription, payment settings, and `tenant.created`; failures roll back the database and clean up orphan Keycloak users.

**Sources:** `business-logic` (1.A); `phase-4b-saas-onboarding` accepted decisions.

**Tests:** SaaS onboarding saga unit and integration specs; Authorizer Keycloak admin service spec; User-Access tenant user service spec.

**Target layer:** integration. **Stack:** SaaS database, Authorizer and Keycloak, User-Access, Payment TCP, Kafka or outbox.

**Notes:** Mocked integration covers orchestration and compensation; add real service boundary or seed integration when a stack harness is ready.

---

### `P0-SAAS-TENANT-LIFECYCLE` — `covered` (P0, tenant-isolation)

**Requirement:** Tenant status is `ACTIVE`, `SUSPENDED`, or `CLOSED`; suspended is read-only with a payment exception; closed blocks operational access.

**Sources:** `business-logic` (1.B); `phase-4b-saas-onboarding` accepted decisions.

**Tests:** SaaS tenant lifecycle and SaaS service specs; tenant status guard; BFF customer tenant lifecycle guard spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-SAAS-SUSPENDED-CUSTOMER-PWA` — `partial` (P0, demo)

**Requirement:** For a suspended tenant, customer PWA stays readable, disables new order and cart mutations, keeps the pending bill payment path, and shows a banner.

**Sources:** `business-logic` (1.B); `phase-4b-saas-onboarding` final business behavior.

**Tests:** BFF customer tenant lifecycle guard; customer PWA tenant status hook and banner specs; customer PWA request payment spec; customer order realtime hook spec; optional Playwright smoke `tests/e2e/phase-5-suspended-tenant.spec.ts`.

**Target layer:** browser-e2e. **Stack:** PWA, BFF, seeded suspended tenant and session.

**Notes:** Unit/component coverage exists, dev seed includes the `pho-viet-suspended` fixture, and the local browser smoke passed with `pnpm e2e:phase5:suspended` against seeded BFF plus `customer-pwa`. Keep status `partial` because pending-bill payment exception is still covered at component and BFF guard level only; full browser pending-bill payment remains a later Flow B/B+D combination.

---

### `P0-SAAS-SUBSCRIPTION-INVOICE-QRSUB` — `covered` (P0, money)

**Requirement:** Tenant subscription invoice uses `QRSUB`; underpaid does not activate; sufficient payment marks paid and assigns plan; duplicate webhook does not double-assign.

**Sources:** `business-logic` (1.A, 6.A); `phase-4b-saas-onboarding` final business behavior.

**Tests:** SaaS subscription invoice service spec; Phase 4B entity shape spec; SaaS constants spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-SAAS-ONE-ACTIVE-SUBSCRIPTION` — `covered` (P0, tenant-isolation)

**Requirement:** Each tenant has one active subscription; assigning a new plan supersedes the previous active one and refreshes quota summary cache.

**Sources:** `business-logic` (1.A); `phase-4b-saas-onboarding` final business behavior.

**Tests:** SaaS subscription and tenant status cache service specs; tenant plan guard spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P1-SAAS-AUTO-SUSPEND` — `covered` (P1, tenant-isolation)

**Requirement:** Auto-suspend runs daily at `02:00 Asia/Ho_Chi_Minh` and suspends subscriptions expired beyond a 24-hour grace window.

**Sources:** `business-logic` (1.A); `phase-4b-saas-onboarding` accepted decisions.

**Tests:** SaaS tenant suspend cron service spec.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-SAAS-FEATURE-GATING-QUOTAS` — `covered` (P0, tenant-isolation)

**Requirement:** `max_tables`, `max_staff`, and `max_orders_per_day` must be enforced by guard or edge logic plus resource-owner backup checks.

**Sources:** `business-logic` (1.A); `technical-architecture` (15.1); `phase-4b-saas-onboarding` accepted decisions.

**Tests:** Catalog table service spec; User-Access user and tenant-user service specs; Order service and order quota service specs; BusinessException and interceptor specs for quota error `details` propagation; SaaS Phase 4B entity shape spec.

**Target layer:** unit-contract. **Stack:** mocked SaaS TCP and Redis-like quota counter.

**Notes:** Owner-service enforcement now covers `max_tables`, `max_staff`, and `max_orders_per_day`; missing/inactive/unavailable quota source fails closed; `-1` is unlimited; disabled users do not count toward staff quota; order quota uses an atomic Redis reservation with release on rejected or failed creation and skips idempotency replay. BFF edge checks remain optional fast-feedback coverage.

---

### `P1-SAAS-OAUTH-STATE-SECRETS` — `partial` (P1, security)

**Requirement:** SePay OAuth uses short-lived `oauth_state:{state}`, callback consumes state, and the browser must never see client secret or access or refresh tokens.

**Sources:** `business-logic` (1.A); `technical-architecture` (11.2); `phase-4b-saas-onboarding` final business behavior.

**Tests:** Payment SePay OAuth client and payment secrets service specs; BFF dashboard payment settings controller spec.

**Target layer:** unit-contract. **Stack:** Redis for OAuth state; local mock SePay only if exercising provider exchange.

**Notes:** Tests cover authorize URL, secret encryption, and BFF callback forwarding; add service-level tests for Redis state TTL, consume, and replay rejection. Provider-facing tests must follow `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md`; live SePay is manual opt-in only.

---

### `P1-SAAS-PAYMENT-SETTINGS` — `covered` (P1, security)

**Requirement:** Payment Service owns tenant payment settings, creates an empty row idempotently, stores selected bank and webhook settings, and encrypts tokens.

**Sources:** `business-logic` (1.A); `phase-4b-saas-onboarding` final technical behavior.

**Tests:** Tenant payment settings and payment secrets service specs; BFF dashboard payment settings controller spec.

**Target layer:** unit-contract. **Stack:** none for unit; local mock SePay for integration around bank list or webhook upsert.

**Notes:** Do not require real SePay, Vercel redirect URI, or a public tunnel for default tests. Use `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md` for payment-settings integration and E2E coverage.

---

### `P1-SAAS-ADMIN-DASHBOARD-ROUTES` — `covered` (P1, demo)

**Requirement:** Public landing, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, and OAuth invalid-state must not blank, 401, or 500 with seeded roles.

**Sources:** `phase-4b-saas-onboarding` UI surfaces; `phase-5-7-finalization` Step 5.4.

**Tests:** BFF Phase 4B contract spec; SaaS controller specs; management-app dashboard query auth readiness spec; Playwright route smoke `tests/e2e/phase-5-admin-dashboard-routes.spec.ts`.

**Target layer:** browser-e2e. **Stack:** management-app, BFF, Keycloak, seeded SUPER_ADMIN, OWNER, and MANAGER.

**Notes:** Dedicated Phase 4B Playwright route smoke covers public landing, SUPER_ADMIN admin routes, OWNER dashboard routes, and OAuth invalid-state with explicit local readiness skips. The seeded local stack passed `pnpm e2e:phase5:admin-routes` with all seven tests passing after frontend and Keycloak warm-up.

---

## RBAC, guards, and architecture invariants

### `P0-RBAC-GUARD-CHAIN` — `covered` (P0, rbac)

**Requirement:** Protected APIs enforce `UserGuard` then `TenantGuard` then `PermissionGuard`; customer APIs use session and lifecycle guards, not role seed.

**Sources:** `business-logic` (9.C); `technical-architecture` (8.2); `permission-matrix` (10).

**Tests:** BFF user, tenant, permission, session, and customer tenant lifecycle guard specs.

**Target layer:** unit-contract. **Stack:** none.

---

### `P0-RBAC-PERMISSION-MATRIX-COUNTS` — `covered` (P0, rbac)

**Requirement:** Canonical RBAC seed has six roles and sixty-six permissions with role counts `SUPER_ADMIN=66`, `OWNER=38`, `MANAGER=35`, `WAITER=15`, `CHEF=6`, `BARISTA=6`; live login smoke should verify representative permissions.

**Sources:** `permission-matrix` (4, 6, 9.3).

**Tests:** User-Access role seeder spec; BFF permission guard spec; repository script `tools/verify-permission-matrix.sh` using `tools/auth-bootstrap-users.json` as the deterministic credential source and asserting exact role permission counts.

**Target layer:** integration. **Stack:** Keycloak, BFF, Authorizer, seeded MongoDB credentials.

**Notes:** Static seed and guard coverage exists. The live smoke script reads deterministic credentials from the bootstrap user catalog, checks `/authorizer/me` role identity, and asserts exact permission counts. The seeded local auth stack passed `BFF_URL=http://localhost:3300/api/v1 AUTH_BOOTSTRAP_USERS_FILE=tools/auth-bootstrap-users.json bash tools/verify-permission-matrix.sh` with all six roles verified.

---

### `P0-RBAC-TENANT-ISOLATION-API` — `partial` (P0, tenant-isolation)

**Requirement:** Non-SUPER_ADMIN actors must not override tenant scope from client input; SUPER_ADMIN cross-tenant access must be explicit and controlled.

**Sources:** `business-logic` (9.D); `technical-architecture` (5.2); `permission-matrix` (10).

**Tests:** BFF tenant guard spec; management-app authenticated client spec; frontend tenant isolation integration under `libs/frontend/utils`.

**Target layer:** integration. **Stack:** BFF, auth seed, service databases.

**Notes:** Guard and client tests exist; stack integration needs readiness and seed policy and broader representative endpoints.

---

### `P1-ARCH-KAFKA-5-TOPIC-REGISTRY` — `covered` (P1, architecture)

**Requirement:** Kafka topic registry is exactly the current domain topics: `order.confirmed`, `payment.completed`, `payment.refunded`, `kitchen.sla_warning`, `tenant.created`; no UI-only Kafka topics.

**Sources:** `technical-architecture` (7.2, 7.4); `phase-5-7-finalization` architecture anchors.

**Tests:** BFF Phase 5 architecture contracts static spec; shared types enum completeness spec for event payload types; SaaS constants spec for `tenant.created` and prefix constants.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** Static configuration test locks the exact five-topic registry and default environment topic names.

---

### `P1-ARCH-REDIS-ACCESS-POLICY` — `covered` (P1, architecture)

**Requirement:** Redis access is limited to BFF, Order, Kitchen, WebSocket adapter, SaaS, and Payment OAuth state; Catalog, Authorizer, and User-Access must not add direct Redis use.

**Sources:** `technical-architecture` (11.2); `phase-5-7-finalization` architecture anchors.

**Tests:** BFF Phase 5 architecture contracts static spec; Order cart service spec; Kitchen KDS keys spec; SaaS tenant status cache service spec (allowed users only).

**Target layer:** unit-contract. **Stack:** none.

**Notes:** Static architecture test scans production source imports/providers for unauthorized direct Redis access.

---

### `P1-ARCH-BFF-DIRECT-NOT-KAFKA` — `partial` (P1, architecture)

**Requirement:** UI side effects use BFF Direct or Redis internal hints after the source service commits; Kafka is not a UI proxy.

**Sources:** `technical-architecture` (7.3, 7.4); `phase-2a-order-kafka` and `phase-2b-kitchen-websocket` accepted decisions.

**Tests:** BFF realtime events, KDS internal events subscriber, and realtime Kafka bridge specs; customer PWA order realtime hook spec.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** Event and hook tests exist; add a static no-Kafka-for-UI contract test tied to the topic registry, especially for menu or order UI-only events.

---

### `P1-ARCH-TCP-PATTERN-COVERAGE` — `partial` (P1, architecture)

**Requirement:** BFF route constants and service TCP message patterns stay aligned for SaaS, payment, order, and kitchen critical surfaces.

**Sources:** `technical-architecture` (6, 7.1); `phase-4b-saas-onboarding` final technical behavior.

**Tests:** SaaS controller contract spec; BFF Phase 4B contract spec; TCP configuration spec; BFF order and kitchen controller specs.

**Target layer:** unit-contract. **Stack:** none.

**Notes:** SaaS and BFF routes are explicitly covered; a broader all-service TCP pattern registry remains uneven.

---

## Deferred and out of scope

### `P1-OFFLINE-QUEUE-FULL` — `deferred-by-phase` (P1, demo)

**Requirement:** Full IndexedDB offline action queue, background sync, conflict resolver, and long network loss auto-sync for POS, KDS, and customer.

**Sources:** `business-logic` (7); `technical-architecture` (16); `phase-5-7-finalization` out of scope.

**Tests:** Customer PWA and management-app realtime status pill specs only.

**Target layer:** deferred. **Stack:** frontend or offline browser harness.

**Notes:** Current code covers degraded and reconnecting UI, not a full offline queue. Phase 5 documentation excludes full offline queue; track as future hardening.

---

### `P1-PHASE4A-SAGA-HARDENING` — `deferred-by-phase` (P1, architecture)

**Requirement:** Durable CDC or Debezium, full transactional outbox hardening, deep saga observability, and replay dashboards.

**Sources:** `technical-architecture` (12); `phase-5-7-finalization` prerequisites and out of scope.

**Tests:** none.

**Target layer:** deferred. **Stack:** Kafka, PostgreSQL, observability stack.

**Notes:** Phase 4A is deferred; do not fail Phase 5 Step 5.1 on missing tests. Track when Phase 4A resumes.

---

### `P1-PHASE4C-NOTIFICATIONS` — `deferred-by-phase` (P1, demo)

**Requirement:** Email receipts; welcome, suspend, and expiry emails; reset-password email; notification logs and service runtime.

**Sources:** `phase-4b-saas-onboarding` handoff; `phase-3-payment` handoff; `technical-architecture` (6.2.9).

**Tests:** none.

**Target layer:** deferred. **Stack:** SMTP or provider, or Notification service.

**Notes:** Phase 4C has not started; do not add tests or product behavior in Phase 5; keep on Phase 4C backlog.

---

## Top gaps for next steps

Ordered by urgency; each line is **priority**, **rule id**, **status**, and **next action**.

1. **P0** — `P0-SAAS-SUSPENDED-CUSTOMER-PWA` — `partial` — Extend the browser smoke with a seeded pending-bill payment exception path after Flow B/B+D data is stable.
2. **P0** — `P0-ORD-BILL-REQUEST` — `partial` — Add integration for empty cart, all orders served, cart lock, and table billing transition.
3. **P0** — `P0-ORD-PAYMENT-FINALIZATION` — `partial` — Add integration for exactly-once bill finalization, cart/session lock, and table Cleaning transition.
4. **P0** — `P0-ORD-SESSION-JOIN` — `partial` — Add a real boundary integration for Catalog QR/table status plus Order session semantics in Redis and PostgreSQL.
5. **P0** — `P0-SAAS-ONBOARDING-SAGA` — `partial` — Add cross-service integration for onboarding success and current compensation behavior.

---

## First P0 batch candidates

1. **Integration:** `P0-ORD-BILL-REQUEST`, `P0-ORD-PAYMENT-FINALIZATION`, `P0-ORD-SESSION-JOIN`, `P0-SAAS-ONBOARDING-SAGA`.
2. **Browser E2E:** Extend `P0-SAAS-SUSPENDED-CUSTOMER-PWA` with pending-bill payment, then payment close-session coverage from `P1-PAY-BROWSER-CLOSE-SESSION` if promoted for demo risk.
3. **Optional fast feedback:** BFF quota edge checks for `P0-SAAS-FEATURE-GATING-QUOTAS` if the UI needs pre-forward upgrade prompts.

---

## Acceptance check for Step 5.1

- Every required Phase 5 anchor has at least one entry: Catalog and QR, Order and cart and session, Kitchen and realtime, Payment and refund, SaaS 4B, RBAC and auth, and architecture invariants.
- Every P0 entry either names concrete test locations in prose (app or lib plus spec purpose) or states a concrete `notes` or next action when tests are absent.
- Phase 4A and Phase 4C items are explicitly marked `deferred-by-phase`.
- This document does not include test implementation steps or code.
