# Phase 5 Plan 03 — Integration Boundary Tests

## Goal

Prove behavior that mocks cannot prove: tenant isolation, real persistence filters, Redis semantics, Kafka/outbox delivery assumptions, TCP service boundaries, auth smoke, and concurrent state changes.

## Inputs

- `docs/testing/phase-5/traceability-matrix.md`
- Dev seed scripts under `tools/dev-seed/**`
- Existing integration specs, especially `libs/frontend/utils/src/lib/__tests__/integration/**`
- Current package scripts and CI workflow
- Local infra assumptions from `docs/technical-architecture.md`
- `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md`

## Boundary Groups

| Group                | What to prove                                                                                                          | Stack required                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Catalog isolation    | Tenant A/B data cannot leak through public menu or admin CRUD                                                          | Postgres, BFF/Catalog or API client |
| Stock concurrency    | Two confirmations against stock = 1 produce one success, one structured failure, stock never below 0                   | Postgres, Catalog, Order            |
| Redis semantics      | Cart/session TTL, bill lock, idempotency key, suspend/subscription cache                                               | Redis, Order/SaaS/BFF               |
| Kafka/outbox         | `order.confirmed`, `order.status_changed`, `payment.completed`, `tenant.created` consumers/outbox paths are idempotent | Kafka or direct consumer harness    |
| Payment finalization | Cash/VietQR paid path updates Payment, Order bill, session, and table state idempotently                               | Postgres, Order, Payment, Catalog   |
| Auth/RBAC smoke      | Representative seeded roles can login and receive expected permissions                                                 | Keycloak, User-Access, BFF, Mongo   |
| Webhook routing      | Direct HMAC and Phase 4B `x-secret-key` routes split `QRTBL` and `QRSUB` correctly                                     | BFF, Payment, SaaS                  |
| SePay provider mock  | OAuth token exchange, bank list, bank detail, and webhook upsert contracts without live SePay                          | Local mock SePay, BFF, Payment      |

## Tasks

- [ ] Decide the integration runner style for Phase 5: existing Jest integration specs with readiness checks, compose profile, or a later Testcontainers migration.
- [ ] Document required environment variables and seeded credentials before adding new tests.
- [ ] Keep frontend-utils integration specs gated by default; run them only with `RUN_FRONTEND_UTILS_INTEGRATION=1`, `BFF_URL`, and `KEYCLOAK_URL` against a ready stack.
- [ ] Add or document a local mock SePay provider for OAuth and payment-settings integration tests; do not require Vercel, public tunnels, or live SePay in the default suite.
- [ ] Add readiness checks so stack-dependent tests skip with a precise reason when infra is absent.
- [ ] Implement P0 integration tests one boundary group at a time.
- [ ] Assert final state, not just call counts.
- [ ] Update the traceability matrix with exact integration spec paths and skip conditions.
- [ ] Record any `security-gap`, especially `x-secret-key` value verification if still not implemented.

## P0 Integration Readiness Backlog

These commands are opt-in only. They require a seeded local stack or a dedicated integration harness and do not make any `partial` P0 row covered until the command passes and the traceability matrix is updated with evidence.

### `P0-CAT-TENANT-ISOLATION`

Prerequisites:

- BFF reachable through `BFF_URL`
- Keycloak reachable through `KEYCLOAK_URL`
- Catalog service and database running with tenant A/B menu fixtures
- Auth seed loaded with representative tenant-scoped users
- `RUN_FRONTEND_UTILS_INTEGRATION=1`

```bash
RUN_FRONTEND_UTILS_INTEGRATION=1 BFF_URL=http://localhost:3300/api/v1 KEYCLOAK_URL=http://localhost:8180 pnpm nx test frontend-utils
```

### `P0-RBAC-TENANT-ISOLATION-API`

Prerequisites:

- BFF reachable through `BFF_URL`
- Keycloak, Authorizer, User-Access, and service databases running
- Auth bootstrap users loaded from `tools/auth-bootstrap-users.json`
- Representative OWNER, MANAGER, WAITER, CHEF, BARISTA, and SUPER_ADMIN credentials seeded
- `RUN_FRONTEND_UTILS_INTEGRATION=1`

```bash
RUN_FRONTEND_UTILS_INTEGRATION=1 BFF_URL=http://localhost:3300/api/v1 KEYCLOAK_URL=http://localhost:8180 pnpm nx test frontend-utils
```

```bash
BFF_URL=http://localhost:3300/api/v1 AUTH_BOOTSTRAP_USERS_FILE=tools/auth-bootstrap-users.json bash tools/verify-permission-matrix.sh
```

### `P0-KDS-ORDER-CONFIRMED-DEDUPE`

Prerequisites:

- Redis running and isolated for the test database/index
- Kitchen app test harness can deliver the same `order.confirmed` payload twice through the direct consumer or Kafka test consumer path
- Seeded order payload includes one tenant, one order id, and station-specific items
- `RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1`

Opt-in command, passed on 2026-05-23 against local Redis from `docker-compose.provider.yaml`:

```bash
RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1 pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand
```

### `P0-SAAS-ONBOARDING-SAGA`

Prerequisites:

- PostgreSQL ready for the SaaS database
- For the existing DB harness, Authorizer, User-Access, and Payment remain contract doubles
- For the live Payment slice, PostgreSQL must include both SaaS tables and Payment `tenant_payment_settings`; Payment TCP must be running
- For full live multi-service readiness, Keycloak, Authorizer, User-Access, Payment TCP, and Kafka or outbox verification must be running and seeded
- `RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION=1`
- `RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1`

```bash
NX_SKIP_NX_CACHE=true RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION=1 pnpm nx test saas --testPathPatterns=onboarding-saga-db.integration.spec.ts --runInBand
```

Live Payment TCP slice, passed on 2026-05-23 against local Postgres and Payment TCP:

```bash
NX_SKIP_NX_CACHE=true RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand
```

This proves SaaS onboarding calls the real Payment TCP boundary and creates exactly one Payment-owned `tenant_payment_settings` row, including replay/idempotency of `PAYMENT_SETTINGS.CREATE_EMPTY`. It does not prove live Authorizer/Keycloak or live User-Access yet, so the matrix row remains `partial`.

## Next Code-Test Task After KDS

The first KDS slice has landed as `apps/kitchen/src/app/modules/kitchen/tests/order-confirmed-dedupe.integration.spec.ts`. It uses a real Redis direct-consumer harness to deliver duplicate and reissued `order.confirmed` payloads and assert one ticket per `(tenantId, orderId, station)`.

The next SaaS slice has landed as `apps/saas/src/services/onboarding-saga-live-payment.integration.spec.ts`. It uses real SaaS PostgreSQL plus live Payment TCP/Payment DB while keeping Authorizer and User-Access as contract doubles.

Next integration work should either finish `P0-SAAS-ONBOARDING-SAGA` live Authorizer/Keycloak + User-Access proof, or fix the frontend-utils Keycloak client mismatch before trying to promote `P0-CAT-TENANT-ISOLATION` / `P0-RBAC-TENANT-ISOLATION-API`.

## Output

- Integration specs or a documented integration suite command.
- A seed/reset policy that future sessions can reuse.
- A SePay mock-provider policy and env contract for local integration.
- Updated traceability matrix with stack requirements and skip policy.
- A short list of unresolved infra blockers.

## Verification Commands

Initial commands can stay focused until a dedicated suite exists:

```bash
pnpm nx test frontend-utils
RUN_FRONTEND_UTILS_INTEGRATION=1 BFF_URL=http://localhost:3300/api/v1 KEYCLOAK_URL=http://localhost:8180 pnpm nx test frontend-utils
pnpm nx test catalog
pnpm nx test order
pnpm nx test payment
pnpm nx test saas
bash tools/verify-permission-matrix.sh
```

## Next Session Notes

- If a test fails because the stack is not running, improve readiness/skip messaging before debugging business logic.
- If a test fails because SePay live, Vercel redirect, or tunnel config is absent, move it behind live-smoke opt-in or replace it with the local mock provider.
- Do not hide nondeterminism with long timeouts. Stabilize seed, data reset, and readiness first.
- For live auth checks, verify credentials come from dev seed or documented env; never introduce real secrets into test files.
