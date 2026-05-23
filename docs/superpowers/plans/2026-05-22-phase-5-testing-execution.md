# Phase 5 Testing Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Phase 5 testing repeatable and safely executable by stabilizing default gates, documenting stack-dependent gates, and preparing E2E expansion without changing product behavior.

**Architecture:** Treat unit/contract tests as the default PR gate, stack-dependent integration as opt-in pre-demo/nightly gates, and Playwright E2E as user-visible demo proof only after integration semantics are stable. Do not add new business behavior to satisfy tests; update the traceability matrix or handoff when behavior is missing, partial, deferred, or blocked.

**Tech Stack:** Nx, Jest, Playwright, NestJS microservices, Next.js management app, React/Vite customer PWA, Keycloak, PostgreSQL, Redis, Kafka, SePay mock/live opt-in.

---

## Current Baseline

- Branch: `codex/phase5-testing-roadmap`.
- User-owned dirty file: `AGENTS.md`; do not edit or revert it.
- Fresh default test command already run on 2026-05-22:

```bash
pnpm exec nx run-many -t test --parallel=3
```

Result: exit code `0`; all 23 projects passed. `frontend-utils` passed with 2 suites run and 6 runtime-dependent integration suites skipped by default.

---

## Safe Stop Lines

- Stop before expanding browser E2E Flow B if default unit/contract gates are red.
- Stop before marking `P0-CAT-TENANT-ISOLATION` or `P0-RBAC-TENANT-ISOLATION-API` as covered unless the opt-in BFF/Keycloak stack command has passed or the matrix clearly records the remaining stack dependency.
- Stop before automating live SePay; all live provider checks stay manual and guarded by `RUN_LIVE_SEPAY=1`.
- Stop before Phase 5 completion while any P0 row is still untriaged.

---

### Task 1: Phase 5 Gate Scripts And Handoff

**Purpose:** Make the current safe testing state reproducible for future sessions and reviewers.

**Files:**

- Modify: `package.json`
- Create: `docs/testing/phase-5/phase-5-handoff.md`
- Modify: `docs/testing/phase-5/05-ci-gates-and-handoff-plan.md`
- Modify: `docs/testing/phase-5/traceability-matrix.md`

- [x] **Step 1: Add package scripts for existing proven E2E surfaces**

Add scripts without changing existing script names:

```json
"e2e:phase3": "playwright test tests/e2e/phase-3-payment.spec.ts",
"e2e:phase4b": "playwright test tests/e2e/phase-5-admin-dashboard-routes.spec.ts",
"e2e:demo": "playwright test tests/e2e/step-2.7-realtime.spec.ts tests/e2e/phase-3-payment.spec.ts tests/e2e/phase-5-suspended-tenant.spec.ts tests/e2e/phase-5-admin-dashboard-routes.spec.ts"
```

- [x] **Step 2: Create Phase 5 handoff document**

Create `docs/testing/phase-5/phase-5-handoff.md` with:

- current traceability counts,
- commands that passed,
- commands intentionally not run,
- stack prerequisites for opt-in integration/E2E,
- remaining P0 partial rows,
- safe stop lines.

- [x] **Step 3: Update CI/handoff plan**

Mark the gate-script and handoff documentation work as current execution scope. Keep Playwright out of PR CI unless the full stack and seed become deterministic.

- [x] **Step 4: Update traceability notes only where the current command state changed**

Do not mark P0 partial rows as covered unless the relevant opt-in stack command passed. It is acceptable to clarify that default `frontend-utils` now skips live integration suites and that opt-in command is still required.

- [x] **Step 5: Verify**

Run:

```bash
pnpm nx test frontend-utils
pnpm exec nx run-many -t test --parallel=3
```

Expected: both exit `0`.

---

### Task 2: E2E Helper Preparation

**Purpose:** Reduce duplication and flake risk before adding Flow B.

**Files:**

- Create: `tests/e2e/helpers/auth.ts`
- Create: `tests/e2e/helpers/qr.ts`
- Create: `tests/e2e/helpers/readiness.ts`
- Modify: `tests/e2e/phase-3-payment.spec.ts`
- Modify: `tests/e2e/phase-5-admin-dashboard-routes.spec.ts`
- Modify: `tests/e2e/phase-5-suspended-tenant.spec.ts`
- Modify: `tests/e2e/step-2.7-realtime.spec.ts`

- [x] **Step 1: Extract shared login, QR token, and readiness helpers**

Preserve existing behavior. Do not introduce `storageState` yet.

- [x] **Step 2: Replace duplicated helper code in existing specs**

Keep selectors and assertions functionally equivalent.

- [x] **Step 3: Verify existing E2E specs compile**

Run:

```bash
pnpm exec playwright test --list
```

Expected: all existing E2E tests are discovered.

- [x] **Step 4: Stop**

Do not implement payment close-session Flow B in this task.

---

### Task 3: P0 Integration Readiness Backlog

**Purpose:** Prepare the next implementation slice without changing behavior.

**Files:**

- Modify: `docs/testing/phase-5/03-integration-boundary-plan.md`
- Modify: `docs/testing/phase-5/traceability-matrix.md`

- [x] **Step 1: Write exact opt-in command blocks for remaining P0 integration rows**

Cover:

- `P0-CAT-TENANT-ISOLATION`
- `P0-RBAC-TENANT-ISOLATION-API`
- `P0-KDS-ORDER-CONFIRMED-DEDUPE`
- `P0-SAAS-ONBOARDING-SAGA`

- [x] **Step 2: Identify the first code-test task after docs**

Expected next code task: KDS duplicate delivery with Redis or direct consumer harness, unless the BFF/Auth stack is already running and seeded.

- [x] **Step 3: Stop**

Do not mark any P0 partial row as covered from documentation alone.

---

### Task 4: KDS Duplicate Delivery Integration

**Purpose:** Convert `P0-KDS-ORDER-CONFIRMED-DEDUPE` from planned readiness into a passing opt-in Redis integration gate.

**Files:**

- Create: `apps/kitchen/src/app/modules/kitchen/tests/order-confirmed-dedupe.integration.spec.ts`
- Modify: `docs/testing/phase-5/03-integration-boundary-plan.md`
- Modify: `docs/testing/phase-5/traceability-matrix.md`
- Modify: `docs/testing/phase-5/phase-5-handoff.md`

- [x] **Step 1: Add opt-in Redis direct-consumer harness**

Use `RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1`, real Redis through `ioredis`, and direct `OrderConfirmedConsumer.handleEvent(...)` delivery. Do not require Kafka for this slice.

- [x] **Step 2: Assert duplicate and reissued delivery semantics**

Deliver the same `order.confirmed` payload twice, then a reissued payload with a new `eventId`, and assert at most one ticket per `(tenantId, orderId, station)` for KITCHEN and BAR.

- [x] **Step 3: Verify**

Run:

```bash
pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand
RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1 pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand
```

Expected: default command skips the opt-in spec; opt-in command passes when Redis is available.

- [x] **Step 4: Update traceability and stop**

Promote only `P0-KDS-ORDER-CONFIRMED-DEDUPE` after the opt-in command passes. Stop before starting the next P0 integration slice.

---

### Task 5: SaaS Onboarding Live Payment Integration

**Purpose:** Advance `P0-SAAS-ONBOARDING-SAGA` from DB-only/contract-double proof to a live Payment TCP boundary proof without requiring the full Auth/User-Access stack.

**Files:**

- Create: `apps/saas/src/services/onboarding-saga-live-payment.integration.spec.ts`
- Modify: `docs/testing/phase-5/03-integration-boundary-plan.md`
- Modify: `docs/testing/phase-5/05-ci-gates-and-handoff-plan.md`
- Modify: `docs/testing/phase-5/traceability-matrix.md`
- Modify: `docs/testing/phase-5/phase-5-handoff.md`

- [x] **Step 1: Add opt-in live Payment harness**

Use `RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1`, real SaaS PostgreSQL tables, live Payment TCP, and Payment DB verification. Keep Authorizer and User-Access as TCP contract doubles for this slice.

- [x] **Step 2: Assert live Payment creation and replay semantics**

Run SaaS onboarding, verify tenant/subscription/outbox persistence, query Payment-owned `tenant_payment_settings` through raw SQL, then replay `PAYMENT_SETTINGS.CREATE_EMPTY` and assert exactly one settings row remains.

- [x] **Step 3: Verify**

Run:

```bash
pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand
NX_SKIP_NX_CACHE=true RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand
```

Expected: default command skips the opt-in spec; opt-in command passes when Postgres and Payment TCP are available. Use `NX_SKIP_NX_CACHE=true` for opt-in evidence so Nx does not reuse the default skipped result.

- [x] **Step 4: Update traceability and stop**

Keep `P0-SAAS-ONBOARDING-SAGA` as `partial`. Live Payment TCP is now covered, but live Authorizer/Keycloak and live User-Access remain gaps.
