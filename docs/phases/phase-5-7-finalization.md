# Phase 5–7 — Finalization: Testing, Observation & Demo Deployment

> **Tiếng Việt:** [phase-5-7-finalization.vi.md](phase-5-7-finalization.vi.md)

> **Goal:** Lock down the quality of the QRTable SaaS POS system with multi-tier automated testing, make the distributed system **observable** (service health, log, metrics, trace), and package **deploy + sample data + demo script** for end-to-end reproducible thesis and review — reduce business regression risk (single, cash, multi-tenant, kitchen) and demonstrate the QR → kitchen → payment flow to the board.
> **Estimated:** ~3–5 weeks (total Phase 5 + 6 + 7)
> **Status:** ⬜ TODO

## Prerequisites

- Completed core phases closed on critical/demo path: **0, 1, 2A, 2B, 3**, SaaS part completed at **4B**, and the representative **4A Order Confirm Saga** slice has been implemented. Full Phase 4A operational hardening and Phase 4C Staff Management have not started; they do not block Phase 5-7 unless the demo requires durable saga-state/CDC/retry-worker hardening or staff management. Notification/email is outside the current implementation scope.

## Reference

| Documents                                   | Related Sections                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| technical-architecture.md                   | §13 Observability — log/metric/trace principles and role in microservices                                                                                           |
| technical-architecture.md                   | §14 Deployment — deploy, compose, environment                                                                                                                       |
| business-logic.md                           | Complete — automated testing to **validate** the described business rules (state machine, money, tokens, tenant isolation), does not replace business documentation |
| testing/phase-5/saga-validation-strategy.md | Focused thesis evidence strategy for Order Confirm Saga and SaaS Onboarding Mini-Saga                                                                               |

## Overview

These three areas are combined into one document because of the same "completion gate" before handover: **Testing** ensures correct behavior according to the business-logic and chosen architecture; **Observability** ensures that when the system runs many processes and message buses, it can still answer _where is the error, who is affected, whether the business meets the SLA_; **Docker + Demo** ensures reviewers and colleagues can repeat the same scenario regardless of personal dev machine. Suggested order: prioritize parallel test platform with minimum observability settings (health/log), then complete dashboard/alert and finally package compose + seed + protection script.

---

## Phase 5 — Testing (~1–2 weeks)

**Why:** After Phase 4B, the system is no longer just a single QR ordering demo but is a multi-tenant SaaS POS with Order, Kitchen, Payment, SaaS lifecycle, subscription gating, tenant payment settings and many realtime/cache channels. Single/desk state machine, money, QR/session, Redis/Kafka/WebSocket and tenant isolation are the **one time errors are money errors, data leaks or broken demos**. Phase 5 must lock down implemented behaviors with targeted testing, not chasing pretty coverage numbers.

### Review after Phase 4A/4B

Points that need to be adjusted compared to the old Phase 5 version:

- **Old prerequisite "Phase 0-4 completed" is no longer true.** Current status is Phase 0, 1, 2A, 2B, 3 and **4B** completed; **4A has a representative Saga slice**, **4C Staff Management TODO**. Test Phase 5 must verify existing behaviors, including Order Confirm Saga, and only record gaps for full saga-hardening or staff management if they are deferred scope.
- **Phase 4A is no longer fully deferred.** `OrderConfirmSagaService` and `CatalogStockGatewayService` are current code contracts. Phase 5 must test confirm replay, Catalog stock error handling, and release-stock compensation; durable Saga state, retry workers, stock ledger and CDC/Debezium remain future hardening.
- **Old scope lacks Phase 4B.** Needs to add tenant lifecycle `ACTIVE/SUSPENDED/CLOSED`, subscription/pricing plan, feature gating, tenant payment settings, two-tier payment references `QRTBL`/`QRSUB`, admin-assisted onboarding and Customer PWA suspended/read-only behavior.
- **The old scope called E2E as Supertest did not match the repo.** Currently E2E browser uses Playwright in `tests/e2e`; Supertest is more suitable if e2e API for BFF/Nest is added later. Phase 5 should clearly separate `API integration/contract` and `browser E2E`.
- **The old scope does not yet reflect the snapshot + realtime hint architecture.** WebSocket/Kafka/Redis events are not a source of truth for the UI; tests must verify that clients refetch REST snapshots after hint/reconnect, not assert that the UI builds state from the packet.
- **Old scope is not enough for Redis/Kafka boundaries.** Need to test idempotency/outbox baseline, KDS Redis-only queue, OAuth state cache, suspended/subscription cache, Kafka topic registry 4P+2AP and "no menu.updated" to avoid architectural regression.
- **The old scope did not have a CI/gate strategy.** The repo currently has many Jest tests and some Playwright smoke; Phase 5 needs to standardize quick commands for PR, full commands for pre-demo/nightly, seed fixture and clear skip policy for tests that need real stacks.
- **The old scope did not distinguish between test gap, implementation gap and deferred scope.** Phase 5 must not silently change product behavior to "let the test pass"; Any rule without a code must be classified as `missing`, `implementation-gap`, `security-gap` or `deferred-by-phase`.

### Testing strategy

Main principle:

- **Risk-based, contract-first:** Prioritize at-risk behavior, tenant isolation, state transition, auth/RBAC, realtime consistency and demo path.
- **Test correct floor:** Unit locks invariant/policy; integration lock DB/Redis/TCP/Kafka boundary; E2E browser locks user journey. Don't duplicate the same assertion at every layer.
- **Current-code first:** When the old docs phase deviate from `business-logic.md`, `technical-architecture.md` or current tests/code, test according to the latest canonical/implemented behavior.
- **Snapshot is the source of truth:** Realtime events are just hints to invalidate/refetch; E2E must not depend on the packet payload as state canonical.
- **Explicit Deferred:** Do not count missing tests for full Phase 4A hardening or unimplemented Phase 4C Staff Management as a Phase 5 error. Missing tests for the implemented Order Confirm Saga are not deferred; they are normal Phase 5 test work. Notification/email tests are outside the current scope unless the service is reintroduced.
- **Saga evidence is multi-layered:** For the two representative Saga flows, combine unit/contract tests, opt-in integration tests, deterministic fault injection where available, UI demo artifacts, and DB/outbox/log evidence. The detailed thesis strategy lives in `docs/testing/phase-5/saga-validation-strategy.md`.

### Canonical Scope After Phase 4A/4B

Phase 5 canonicalizes testing for **deployed or finalized behavior as current contract**. If a discrepancy between docs and code is detected, apply the truth source order in `docs/README.md`: current code/tests -> accepted specs -> final phase records -> overview docs. The review results not only in adding tests, but also in accurately classifying the status of each rule.

| Scope type           | How to handle in Phase 5                                                                                                 | Specific examples                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `covered`            | Keep the existing test, attached to the traceability matrix                                                              | Shared transition tests, BFF guards, Payment duplicate webhooks, SaaS subscription invoice tests                                               |
| `partial`            | Adding tests at the lowest level is enough to prove the rule                                                             | Payment UI smoke exists but has not proven full close-session; permission unit is there but live Keycloak smoke is not good                    |
| `missing`            | Add a test if the behavior is already in the code and belongs to Phase 0/1/2A/2B/3/4A representative slice/4B            | Order Confirm Saga integration gap; Catalog QR invalid token/rate limit; table/menu delete constraints; suspended tenant browser route fixture |
| `implementation-gap` | Do not edit behavior in Phase 5; Specifies that a separate phase/PR is needed if the canonical rule does not have a code | Offline queue IndexedDB, full staff invite UI, production webhook replay dashboard                                                             |
| `security-gap`       | Test current contract if any, and mark blocker before real go-live/demo if hardening is missing                          | Phase 4B tenant/platform `x-secret-key` route now needs value verification with saved secret, not just presence check                          |
| `deferred-by-phase`  | Phase 5 failures are not included; kept in the full Phase 4A hardening/4C Staff Management backlog or post-thesis        | Durable Saga state, retry worker, stock ledger, CDC/Debezium, full staff invite UI, production webhook replay dashboard                        |

### Priority Bands

| Band | Rule select test                                                                                                       | Required in Phase 5                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P0   | Errors cause loss of money, expose cross-tenant data, break the state machine, bypass auth/RBAC or break the main demo | There must be a specific test or gap clearly stated before Phase 5 is considered passed           |
| P1   | The error causes incorrect operational UX, loss of realtime hints, stale cache, lack of visibility for staff/Owner     | Has unit/contract or integration smoke depending on blast radius                                  |
| P2   | UI smoke, route not blank, small regression, docs/tooling                                                              | Can be included in the pre-demo smoke or manual checklist if automation costs more than the risks |

### Test Matrix Objectives

| Risk area               | Unit / contract                                                                                                                        | Integration                                                                                                                                    | Browser E2E / smoke                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| tenant isolation + RBAC | Permission matrix, guards, route permission metadata, role seed counts                                                                 | tenant-scoped queries not return data cross-tenant; SUPER_ADMIN exception controlled                                                           | Owner/MANAGER/WAITER/CHEF/BARISTA route visibility and 403/redirect main                                      |
| Catalog + QR/table/menu | QR HMAC/token helpers, slug/table route constants, upload validators, delete constraints, plan table quota                             | Catalog tenant isolation; QR validate/join; menu/table CRUD filter tenant; Cloudinary path validation                                          | Customer QR landing/menu load; Owner can manage minimum category/item/table without leaking cross-tenant data |
| QR session + cart       | QR/token helpers, cart version conflict, session status policy                                                                         | Redis cart/session TTL, idempotency key, request bill lock                                                                                     | Customer scan QR, join session, cart mutation, submit, reload/reconnect                                       |
| Order + table state     | Shared transition matrices, cancel policy, transfer request id, bill request policy; Order Confirm Saga replay/compensation unit tests | Order confirm Saga with Catalog stock deduct, Order commit/outbox, and release-stock compensation; table transfer consistency; bill aggregates | QR -> order -> POS confirm -> KDS -> served                                                                   |
| Kitchen + realtime      | KDS queue scoring, station access, SLA worker, gateway room derivation                                                                 | Kafka `order.confirmed` -> Kitchen Redis ticket -> BFF `kds.queue_changed` hint                                                                | KDS station flow, reconnect/refetch snapshot, waiter sees ready/served                                        |
| Payment settlement      | VND rounding, payment reference, cash/VIETQR policy, webhook duplicate/underpaid/after-paid                                            | Payment transaction + Order `BILL_MARK_PAID`; outbox `payment.completed`; payment history tenant scope                                         | POS cash/VietQR panels, Customer payment screen, Dashboard payment history read-only                          |
| SaaS Phase 4B           | Slug, onboarding saga, tenant lifecycle, subscription invoice, payment settings, OAuth state, feature gating                           | SaaS onboarding cross-service compensation; Redis suspend/subscription cache; `QRSUB` invoice matching                                         | Public landing, SUPER_ADMIN tenant/plan/billing, Owner subscription/payment settings, suspended Customer PWA  |
| Architecture invariants | Kafka topic registry, Redis access policy, no `menu.updated`, BFF route constants, TCP pattern exposure                                | Allowed Redis/Kafka access checks; topic/env defaults match canonical 5-topic registry                                                         | Browser checks observe final UI snapshots and refetch behavior, not hidden event internals                    |

### Steps

#### Step 5.1 — Inventory + Traceability Matrix (1-2 days)

**Goal:** Know exactly which business rules have been tested, which layers are tested, and which gaps are valid because full Phase 4A hardening/Phase 4C Staff Management has not been done yet.

**Scope:**

- Create a traceability table from `business-logic.md`, `technical-architecture.md`, `docs/phases/phase-2a-order-kafka.md`, `phase-2b-kitchen-websocket.md`, `phase-3-payment.md`, `phase-4a-saga-hardening.md`, `phase-4b-saas-onboarding.md` to existing tests.
- Assign each rule to one of six states: `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, `deferred-by-phase`.
- Mark the test that needs a real stack: PostgreSQL/Redis/Kafka/Keycloak/frontend servers.
- Confirm current baseline: many Jest tests already exist for BFF, management-app, customer-pwa, saas, order, payment, catalog, kitchen; E2E top-level is currently limited Playwright smoke/journey.

**Minimum format of traceability matrix:**

| Column                 | Meaning                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `rule_id`              | Stable IDs, for example `P0-PAY-WEBHOOK-DUP`, `P0-SaaS-SUSPEND-CUSTOMER`, `P1-KDS-REFETCH`           |
| `source`               | Source file/section: business logic, architecture, phase record, accepted spec                       |
| `business_rule`        | Rule needs to be protected by testing or gap record                                                  |
| `risk`                 | `money`, `tenant-isolation`, `rbac`, `state-machine`, `realtime`, `demo`, `security`, `architecture` |
| `priority`             | `P0`, `P1`, `P2`                                                                                     |
| `current_test`         | Existing test file or `none`                                                                         |
| `target_layer`         | `unit-contract`, `integration`, `browser-e2e`, `manual-provider`, `deferred`                         |
| `status`               | `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, `deferred-by-phase`           |
| `notes_or_next_action` | Reasons for classification and specific next steps                                                   |

**Anchor must be in the matrix:**

- Phase 1/Catalog: QR/token, public menu, CRUD tenant isolation, table status/delete constraints, Cloudinary validation/path.
- Phase 2A: session/cart/idempotency, order/bill/service request transitions, stock deduct on confirm, table transfer.
- Phase 2B: KDS Redis queue, duplicate `order.confirmed`, station access, snapshot-refetch after realtime hint.
- Phase 3: VND rounding, `QRTBL`, cash/VietQR settlement, webhook duplicate/underpaid/after-paid, payment history read-only, payment completion -> Order finalization.
- Phase 4A: `OrderConfirmSagaService`, Catalog stock gateway contract, confirm replay, Catalog stock error, release-stock compensation after Order commit/outbox failure, and SaaS onboarding mini-saga as the second representative saga-style flow.
- Phase 4B: tenant lifecycle, subscription/plan, `QRSUB`, OAuth state, payment settings, feature gating, suspended/closed customer behavior.
- Architecture: Kafka 5-topic registry, Redis access policy, no `menu.updated`, BFF Direct vs Kafka boundaries, permission matrix counts.

**verify:** You can look at the table and answer "which test is this rule protected by" or "why hasn't it been tested in Phase 5?"

#### Step 5.2 — Unit + Contract Hardening (2-3 days)

**Goal:** Lock down pure invariants and fast, stable service/UI contracts in PR.

**Priority scope:**

- **Order/Bill/Table:** valid/invalid transitions, `DRAFT` does not persist DB row, `PENDING -> PROCESSING -> READY -> SERVED -> COMPLETED`, bill `OPEN -> PENDING_PAYMENT -> PAID`, table `AVAILABLE/OCCUPIED/BILLING/CLEANING`, cancel pending/processing policy.
- **Catalog/QR/Menu/Table:** QR token tamper/invalid path, menu visibility contract, delete constraints, table status transition helpers, table quota guard inputs, upload validator/tenant folder contract.
- **Payment:** VND rounding edge cases, `QRTBL` reference generation/collision fallback, cash `amountReceived >= roundedTotal`, VIETQR pending reuse, underpaid/duplicate/after-paid webhook, Dashboard payment history read-only.
- **SaaS Phase 4B:** slug/reserved collision, tenant status semantics, feature quotas (`max_tables`, `max_staff`, `max_orders_per_day`), `QRSUB` invoice matching, one active subscription, OAuth state/token secrecy, payment settings permissions.
- **BFF/auth:** `UserGuard -> TenantGuard -> PermissionGuard`, customer lifecycle guard, tenant plan/status guards, route permission metadata for SaaS/payment/order/kitchen surfaces.
- **Frontend components/hooks:** disabled controls for suspended tenant, payment exception for pending bills, POS/KDS realtime refetch hooks, dashboard auth readiness, role-based navigation.
- **Static architecture tests:** route constants unique, TCP message patterns exposed, permission enum/seed/matrix counts, Kafka topics restricted to registry, no accidental `menu.updated` event contract.

**RBAC note:** `permission-matrix.md` now has static-verified 65 permissions and role seed counts, but live smoke also depends on seed/credentials for `SUPER_ADMIN` and `MANAGER`. Phase 5 must record this state as `partial` until the live seeded login smoke or equivalent API-level auth integration is stable.

**verify:** `pnpm nx affected -t test` or project-specific `pnpm nx test <project>` pass for touched projects; coverage report is used as an additional signal, not as a substitute for traceability.

#### Step 5.3 — Integration Tests for Real Boundary (3-5 days)

**Goal:** Prove what the mock cannot prove: tenant isolation, transaction/locking, Redis semantics, Kafka/outbox, TCP contract and cache invalidation.

**Priority scope:**

- **Catalog tenant isolation:** tenant A/B has its own category/menu/table; public menu and admin CRUD always filter tenant; request missing tenant was rejected.
- **Concurrent stock locking:** Two confirmations at the same time for item stock = 1 means only one order will be successful; The remaining order receives a structural error; stock is not negative.
- **Order Confirm Saga:** `OrderConfirmSagaService` locks and validates order/bill/items, calls Catalog deduct with `confirm-order:{orderId}`, writes `PROCESSING` + `order.confirmed` outbox, replays already-`PROCESSING` orders, does not compensate Catalog business errors before deduct success, and releases stock with `confirm-order-compensation:{orderId}` when Order commit/outbox fails after deduct.
- **Order/session/cart Redis:** Cart version conflict, cart lock when bill `PENDING_PAYMENT`, session cache TTL, idempotency key to prevent duplicate submission.
- **KDS path:** `order.confirmed` -> Kitchen Redis ticket by station -> internal `kds.queue_changed`; duplicate Kafka event does not create duplicate tickets.
- **Payment finalization:** Cash/VietQR PAID records payment + audit + outbox; Order `BILL_MARK_PAID` idempotent; transfer table `BILLING -> CLEANING`; duplicate webhook does not double-settle.
- **SaaS lifecycle:** Onboarding creates tenant/Owner/subscription/payment settings/outbox; After failure, the Owner will have the same compensation as the current code; suspend/activate write/delete Redis flag; subscription cache TTL correct policy.
- **Webhook routing:** Direct Phase 3 HMAC route and Phase 4B tenant/platform `x-secret-key` route do not mix contracts; `QRTBL` goes to Payment, `QRSUB` goes to SaaS invoice.

**Test harness contract:**

| Topics           | Phase 5 Rules                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data reset       | Integration tests must have seed/reset idempotent; Do not use personal data or status left on dev machines                                                                 |
| External stack   | Tests requiring PostgreSQL/Redis/Kafka/Keycloak must have a clear readiness check and skip with an explanatory message, or run in the official compose/test profile        |
| Skip policy      | Skip is only valid for real providers or unenabled stacks; Do not skip silently in PR gate for unit/contract                                                               |
| Auth credentials | Seed credentials used in Playwright and integration must be in the dev seed or env documented, not the actual hardcode secret                                              |
| Determinism      | Tests using timestamp/server time can be controlled or asserted by interval; does not depend on running time except for intentional rules like timezone `Asia/Ho_Chi_Minh` |
| Concurrency      | Stock/idempotency/payment duplicate tests must assert final state in the DB/service response, not just assert mock call count                                              |
| External SePay   | Automated Phase 5 defaults to using unit mock or mock SePay provider locally; Does not require Vercel redirect, public tunnel, or SePay live                               |

**Security gap required to be recorded:** Phase 4B tenant/platform `x-secret-key` webhook route split is the current contract; value verification with stored tenant/platform secret is hardening before production. If there is no implementation, Phase 5 must write `security-gap` instead of considering route-presence testing as sufficient.

**SePay local/mock policy:** OAuth/payment settings/webhooks tests must comply with `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md`. Local devs can use `localhost` for Keycloak/BFF/frontend; Automated testing does not depend on registered Vercel URI redirects or tunnels. Live SePay is just a smoke check manual/opt-in before the public demo.

**verify:** Integration suite has a clear seed/reset, regardless of personal data on the dev machine. If using local compose instead of Testcontainers, document the standard command and skip policy.

#### Step 5.4 — Browser E2E For Demo Path (3-4 days)

**Goal:** Have real user-like end-to-end proof for the most important flows before Phase 6/7 demo.

**Required Playwright range:**

- **Flow A — QR ordering realtime:** Customer landing by QR -> menu -> cart -> submit -> WAITER confirmation -> CHEF/BARISTA KDS processing -> WAITER served -> Customer tracking updated after reconnect/reload.
- **Flow B — Payment close session:** Customer/staff request bill -> POS cash or VietQR route -> payment paid -> immutable bill -> session close -> table to `Cleaning`.
- **Flow C — SaaS onboarding:** SUPER_ADMIN onboard tenant -> Owner login -> Owner view subscription/payment settings -> create or view minimum tenant-scoped resource.
- **Flow D — Suspended tenant:** tenant suspended -> Customer PWA can still read the necessary menu/status, does not create new order/cart mutations, but the pending bill payment route still works.
- **Flow E — Admin/dashboard smoke:** Public landing, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, OAuth invalid-state page not blank/401/500 with correct role seed.

**SePay/OAuth in E2E:** Flow payment settings do not automate real SePay login. Test the default seed OAuth state to be valid, use fake code, exchange via mock SePay provider, display mock bank, select mock bank, and verify saved settings. Invalid-state can redirect directly to the callback page with the false state to assert the error UI. Live provider login/webhook is actually separated into manual checklist.

**Current E2E status needs to be reflected in the matrix:**

| Existing file                             | Proving                                                                              | Remaining Gap                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/step-2.7-realtime.spec.ts`     | QR -> cart -> order -> POS confirm -> KDS -> served, reconnect/reload snapshot       | Close-session and SaaS/suspended tenant payments not yet covered                                                      |
| `tests/e2e/phase-3-payment.spec.ts`       | Payment screen/POS tab/dashboard payment history smoke when dev stack/auth available | Full payment finalization, webhook settlement, bill immutable, session close/table cleaning end-to-end not yet proven |
| There is no dedicated Phase 4B Playwright | —                                                                                    | tenant onboarding, admin billing, Owner subscription/payment settings, suspended tenant browser fixture               |

**verify:** E2E runs serially with idempotent seed fixture. The test does not examine Kafka/Redis internal details; test checks the final UI and snapshot after refetch.

#### Step 5.5 — CI, Coverage and Running Rules (1-2 days)

**Goal:** Test suite fast enough for PR but still has a reliable full-stack path for pre-demo/nightly.

**Recommended quality gates:**

| Gate                    | Command                                                                                                                                          | Purpose                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Current CI baseline     | `pnpm exec nx run-many -t lint test build`                                                                                                       | The command is available in GitHub Actions; Phase 5 must not make this baseline flaky  |
| PR quick gate           | `pnpm exec nx affected -t lint test build`                                                                                                       | Catch common errors on code changes, optimize the time when CI is adjusted to affected |
| Full unit/contract      | `pnpm exec nx run-many -t test`                                                                                                                  | Run all Jest/Nx test projects                                                          |
| Focused domain gate     | `pnpm nx test bff`, `pnpm nx test catalog`, `pnpm nx test order`, `pnpm nx test kitchen`, `pnpm nx test payment`, `pnpm nx test saas`            | Quickly run bounded contexts P0/P1 while harden testing                                |
| Integration gate        | `pnpm nx test frontend-utils`, `pnpm nx test saas`, `pnpm nx test payment`, `pnpm nx test order` or specialized compose/test suite when isolated | Run DB/Redis/Kafka boundary tests; Need clear readiness/seed policy                    |
| Browser E2E smoke       | `pnpm e2e:step2.7` and `pnpm exec playwright test tests/e2e/phase-3-payment.spec.ts`                                                             | Run existing smokes on dev stack                                                       |
| Browser E2E full target | `pnpm exec playwright test tests/e2e`                                                                                                            | Run the demo journey after having a standardized seed/dev stack                        |
| Pre-demo dry run        | `pnpm dev:reseed -- --yes` + app/backend serve scripts + Playwright selected flows                                                               | Confirm real stack before Phase 7                                                      |

**CI/documentation updates required by Phase 5:**

- If you keep the current CI, Phase 5 must clearly state that Playwright/integration is a pre-demo or nightly/manual gate, not a PR gate.
- If you include Playwright in CI, you must add a service stack or use a preview/dev stack with stable seeds; Do not enable E2E in CI when credentials/Keycloak is not deterministic.
- Runtime-dependent frontend-utils integration suites are skipped by default. Enable them only with `RUN_FRONTEND_UTILS_INTEGRATION=1` plus `BFF_URL` and `KEYCLOAK_URL` pointing at a ready local/test stack.
- Add explicit package scripts for new E2Es, for example `e2e:phase3`, `e2e:phase4b`, or a `e2e:demo` script that runs selected flows in order.
- Coverage report is a secondary artifact; The new traceability matrix is ​​the main acceptance.

**Coverage policy:**

- Use coverage to detect empty areas, not as the only target.
- Minimum Phase 5 threshold: **Order + Payment >= 60%** on unit/contract like the old roadmap, but P0 rules in traceability must be tested even though coverage has been achieved.
- SaaS Phase 4B, BFF guards, Catalog, Kitchen need to achieve coverage according to rule P0/P1 in the matrix; Don't set the same machine percentage threshold for every project because blast radius and test type are different.

### Outside of current Phase 5 scope

- **No test pass required for full Phase 4A operational hardening** such as durable Saga state, retry workers, stock ledger, full CDC/Debezium or new audit framework if not yet implemented. Phase 5 must still test the implemented Order Confirm Saga and the existing local outbox/idempotency/compensation baseline.
- **Does not require notification/email** such as email receipt, welcome/suspend email, reset-password email or notification logs because Notification Service is outside the current scope. Phase 4C staff management is also not a Phase 5 blocker until implemented.
- **Does not require full offline queue** such as IndexedDB action queue, auto-sync POS/KDS/customer when long-term network outage, or full conflict resolver if current code is not implemented. Phase 5 only tests existing reconnect/refetch/snapshot behavior.
- **Does not replace live provider certification.** SePay/OAuth/webhook provider does require its own manual/live validation when it has a public BFF URL and a valid credential; Automated Phase 5 only locks the internal contract and route behavior using the mock/local provider. Do not use a temporary Vercel domain or local tunnel as the default pass condition.
- **Do not add new business behavior just for testing.** If the test detects that the docs require a behavior that does not exist, write it as `implementation gap` or `deferred scope`, do not silently change the product contract.

### Acceptance Criteria — Phase 5

- [ ] There is a traceability matrix for P0/P1 rules in `business-logic.md`, `technical-architecture.md`, Phase 1/2A/2B/3/4A/4B and permission matrix, with status `covered/partial/missing/implementation-gap/security-gap/deferred-by-phase`.
- [ ] **Unit/contract:** Order + Payment achieves at least **60%** coverage according to tools in monorepo and all P0 invariants about state/money/idempotency/webhook have specific tests.
- [ ] **Catalog/QR:** There are tests for QR token/invalid token, public menu tenant isolation, CRUD tenant filter, table/menu delete constraints and upload validation/path if the behavior already exists.
- [ ] **SaaS Phase 4B:** There are tests for onboarding, tenant lifecycle, subscription/plan, payment settings/OAuth state, `QRSUB` invoice matching, feature gating and suspended/closed customer behavior.
- [ ] **SePay testing policy:** Default automated tests using SePay mocks or unit mocks; All live SePay checks have `RUN_LIVE_SEPAY=1`, a valid public URL, a clear skip reason, and are not in the default PR gate.
- [ ] **Integration:** Has at least the scenarios tenant isolation, Order Confirm Saga stock deduct/replay/compensation, concurrent stock locking, payment finalization, Redis suspend/subscription cache, live/auth permission representative smoke and webhook route split `QRTBL`/`QRSUB`.
- [ ] **Security gap visibility:** Phase 4B `x-secret-key` route value verification is tested if implemented; if not, recorded as `security-gap` blocker before go-live/demo public.
- [ ] **E2E Playwright:** QR ordering realtime, payment close session, tenant onboarding and suspended tenant pass flows are stable on the standardized seed/dev stack, or marked `missing` with additional fixture/credential.
- [ ] **CI/gates:** Current CI baseline, PR quick gate, full unit/contract gate, integration gate and browser E2E command documented; Tests that depend on the local stack have a transparent skip policy instead of failing randomly.
- [ ] **Deferred clarity:** Full Phase 4A hardening and unimplemented Phase 4C Staff Management behaviors are clearly marked as valid deferred/test gaps, while the implemented Order Confirm Saga remains part of Phase 5 acceptance. Notification/email remains outside current scope.
- [ ] **Saga thesis evidence:** Order Confirm Saga and SaaS Onboarding Mini-Saga have recorded commands, artifact expectations, and claim limits in `docs/testing/phase-5/saga-validation-strategy.md`.

---

## Phase 6 — Observability (~1–2 weeks)

**Why:** The system has BFF, many microservices, Kafka and WebSocket; Without health + log + metric + trace, **fix time** and **demo reliability** plummet, and it is difficult to demonstrate a "single over many hops" flow.

### Steps

#### Step 6.1 — Learning + Setting up an observation platform (lessons 136–151)

**Goal:** Every service has minimal signaling for operation and debugging — and traces can be **circuited** across internal hops.

**Course-to-lesson mapping:**

| Article | Content                                           |
| ------- | ------------------------------------------------- |
| 136–138 | Health Check                                      |
| 139–144 | PLG Stack (Promtail + Loki + Grafana + Pino) ​​   |
| 145–146 | Prometheus + custom metrics                       |
| 147–151 | Tempo + OTel (auto-instrumentation + propagation) |

**Scope (WHAT):**

- **Health check** across the entire service — as this is a prerequisite for orchestrator, alert and demo "system alive".
- **Stack PLG** (Promtail + Loki + Grafana) with **structured logger** (Pino) ​​— because centralized log helps trace `app`/tenant/request without SSHing each container.
- **Prometheus + custom metrics + dashboard** — because need to see **load, errors, latency** in real time, not just "with logs".
- **Tempo + OpenTelemetry (auto-instrumentation)** and **context propagation** over **TCP/Kafka** — because an order can go BFF → Order → Kitchen; If you don't connect the trace, you can't prove dispersion.

**verify:** From a representative request, you can answer: where is the log, what metrics are involved, what services does the trace id go through.

#### Step 6.2 — Grafana Dashboards (2–3 days)

**Goal:** Transform raw data into **operational and business stories** — for demos and incident prevention.

**Scope (WHAT):**

- **System Overview** — overall health and load.
- **Business Metrics** — e.g. units/minute, revenue (according to agreed definition), average KDS waiting time — because the board and Owner care about **business**, not just CPU.
- **Per-service** — request rate, error rate, P95 — for quickly locating a congested or failing service.
- **Alerting** — for example, service down, error rate > 5%, KDS SLA violation — because proactive signals are needed, not just viewing the dashboard after the incident.

**verify:** Can point to the dashboard and explain the meaning of each main panel in < 5 minutes.

### Acceptance Criteria — Phase 6

- [ ] **Grafana** is accessible at **`localhost:3001`** with the stack running locally.
- [ ] **Loki:** `{app="order"}` query (or equivalent standardized label) **see log** corresponding to real traffic or script generating load.
- [ ] **Tempo:** **A trace of an order** (or a representative order flow) passing through **BFF → Order → Kitchen** — proving context propagation has matched the architecture.
- [ ] **Prometheus:** Metric displays **real-time** (refreshing dashboard shows changes based on system behavior).
- [ ] **Alert:** When **intentionally stopping** a critical service, there is an **alert triggered** according to the defined rule — because this AC confirms the "detect → signal" loop is active.

---

## Phase 7 — Docker Deploy + Demo (~1 week)

**Why:** Theses and reviews need **a command (or a clear compose string)** to get to the full stack; seed and demo script reduce the risk of "it can run on my computer".

### Steps

#### Step 7.1 — Dockerfiles & Compose & Seed (lessons 152–155)

**Goal:** Run images that are **small, consistent, reproducible**; separate infra/app/monitoring so new users enable the correct layer they need.

**Scope (WHAT):**

- **Multi-stage** per service (builder → runner) — let the artifact run separately from the build toolchain, suitable for deployment and thesis artifact.
- **docker-compose.app.yaml** — **8 backend + 2 frontend** (according to the final architecture).
- **docker-compose.infra.yaml** — data plane: **PG, Redis, Mongo, Keycloak, Kafka** (according to technical-architecture).
- **docker-compose.monitoring.yaml** — observe (match Phase 6).
- **Seed:** **1 tenant, 5 categories, 20 items, 8 tables** — enough for multi-table demo, in-depth menu, no time-consuming manual input.

**verify:** `docker compose up` (or equivalent command set noted in README phase) builds full stack; seed runs idempotent or has a clear reset strategy.

#### Step 7.2 — Demo prep (2–3 days)

**Target:** **15–20 minutes** protection runs smoothly, independent of ad-hoc — because of fixed council time and high stress.

**Scope (WHAT):**

- **Demo script** (15–20 minute script for thesis defense):
  - **Tab 1 (Customer):** QR scan → menu displayed → select item + add cart → submit order.
  - **Tab 2 (Management):** Staff confirms order → KDS displays ticket → Chef/Barista processes → Payment (cash or VietQR/SePay) → bill close.
  - **Tab 3 (Monitoring):** Grafana trace throughout — only traces IDs from BFF → Order → Kitchen → Payment, distributed proof.
- **Full stack dry run** at least once end-to-end before the protection date — because the compose/network/error was detected earlier than the slide.
- **Backup plan:** Seed data script runs quickly if reset is needed between drills — bringing the system to a clean state in < 2 minutes.

**verify:** A person who hasn't been involved in coding can follow the script and get the same observable results (UI + trace).

### Acceptance Criteria — Phase 7

- [ ] **`docker compose up`** (according to implementation documentation) → **full system working** (login/QR/main thread not broken).
- [ ] **E2E demo script** runs **smoothly** within the specified time frame — no "waiting for luck" steps.
- [ ] **Grafana trace** shows **full path** (BFF → related services → kitchen) for a typical demo interaction.
- [ ] **Seed data** is ready according to the stated scale — not manually before G.

---

## Outputs (chung)

- The **test** (unit + integration + E2E) anchors on `business-logic.md` and contracts between services — as reusable assets after the thesis.
- **observation** platform (health, log, metrics, trace, dashboard, alert) **runs locally** and documents Grafana/Prometheus port — reduces debugging time and increases demo reliability.
- **Deployment Artifact** (Dockerfile multi-stage, layered composition, seed, demo script) — allows re-establishing the QRTable POS system in a standard environment without depending on personal computer configuration.

**Document status:** roadmap/spec canonicalized; Phase 5-7 itself still **TODO** according to the phase state.

## Note the Roadmap

- **Critical Path:** Phase 0 → 1 → 2A → 2B → 3 → 5-7 (Demo)
- **Parallel Track:** Phase 4B completed; Phase 4A representative Saga slice implemented while full hardening remains future work; Phase 4C Staff Management has not yet started and depends on Phase 4B. Former Step 4.5 Notification Service is removed from current scope.
- **4 most impressive demo highlights:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing)
