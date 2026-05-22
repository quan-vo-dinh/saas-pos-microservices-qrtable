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
