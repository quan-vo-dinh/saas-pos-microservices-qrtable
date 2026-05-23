# Phase 5 Testing Handoff

**Date:** 2026-05-23

## Current Traceability Counts

Traceability matrix state in `docs/testing/phase-5/traceability-matrix.md`:

| Scope              | Count |
| ------------------ | ----: |
| Total P0/P1 rows   |    52 |
| P0 rows            |    29 |
| P1 rows            |    23 |
| Covered            |    38 |
| Partial            |    10 |
| Implementation gap |     1 |
| Deferred by phase  |     3 |

Remaining P0 partial rows:

- `P0-CAT-TENANT-ISOLATION`
- `P0-SAAS-ONBOARDING-SAGA`
- `P0-SAAS-SUSPENDED-CUSTOMER-PWA`
- `P0-RBAC-TENANT-ISOLATION-API`

## Commands Passed

Fresh default baseline from the parent session:

```bash
pnpm exec nx run-many -t test --parallel=3
```

Result: passed for all 23 projects on 2026-05-22.

Fresh commands from this handoff slice:

```bash
pnpm nx test frontend-utils
pnpm exec nx run-many -t test --parallel=3
pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand
RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1 pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand
pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand
NX_SKIP_NX_CACHE=true RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand
```

Results:

- `pnpm nx test frontend-utils`: passed with 2 suites run, 6 runtime-dependent integration suites skipped, 25 tests passed, and 36 tests skipped.
- `pnpm exec nx run-many -t test --parallel=3`: passed for all 23 projects. Nx reused cache for 14 of 23 tasks.
- `pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand`: passed with the opt-in integration spec skipped by default.
- `RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1 pnpm nx test kitchen --testPathPatterns=order-confirmed-dedupe.integration.spec.ts --runInBand`: passed against local Redis from `docker-compose.provider.yaml`.
- `pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand`: passed with the opt-in integration spec skipped by default.
- `NX_SKIP_NX_CACHE=true RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand`: passed against local Postgres and Payment TCP; Nx cache was disabled to avoid reusing the default skipped result.

## Commands Intentionally Not Run

These gates remain manual or pre-demo because they require a deterministic full stack, seed, or live-provider guard:

```bash
RUN_FRONTEND_UTILS_INTEGRATION=1 BFF_URL=http://localhost:3300/api/v1 KEYCLOAK_URL=http://localhost:8180 pnpm nx test frontend-utils
pnpm e2e:phase3
pnpm e2e:phase4b
pnpm e2e:demo
```

Live SePay checks were not run. They remain guarded by `RUN_LIVE_SEPAY=1` plus real provider credentials and public callback URLs.

## Opt-In Stack Prerequisites

Frontend-utils integration:

- BFF running and reachable through `BFF_URL`
- Keycloak running and reachable through `KEYCLOAK_URL`
- Auth seed and tenant fixtures loaded, including representative tenant-isolation and suspended-tenant data
- `RUN_FRONTEND_UTILS_INTEGRATION=1`

KDS Redis duplicate-delivery integration:

- Redis running and reachable through `REDIS_HOST`/`REDIS_PORT`, or local Redis from `docker-compose.provider.yaml`
- `RUN_PHASE5_KDS_DEDUPE_INTEGRATION=1`
- Test cleanup is tenant-scoped to `phase5-kds-dedupe-*` KDS keys and matching global SLA due members

SaaS live Payment onboarding integration:

- PostgreSQL running with SaaS tables and Payment `tenant_payment_settings`
- Payment TCP running and reachable through `TCP_PAYMENT_SERVICE_HOST`/`TCP_PAYMENT_SERVICE_PORT`
- `RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1`
- Use `NX_SKIP_NX_CACHE=true` when collecting opt-in evidence, because the default skipped result can otherwise be reused from Nx cache
- Authorizer and User-Access remain contract doubles in this slice; do not promote the row to `covered` from this proof alone

Browser E2E demo gates:

- BFF, required backend services, management app, and customer PWA running
- Keycloak ready with seeded SUPER_ADMIN, OWNER, MANAGER, and customer/session fixtures
- Dev seed verified with `pnpm dev:verify-seed`
- Browser dependencies installed with `pnpm e2e:install`

Provider checks:

- Local mock SePay for deterministic integration
- Live SePay only with `RUN_LIVE_SEPAY=1`, provider credentials, and public app/API URLs

## Safe Stop Lines

- Stop before expanding browser E2E Flow B if default unit/contract gates are red.
- Stop before marking `P0-CAT-TENANT-ISOLATION` or `P0-RBAC-TENANT-ISOLATION-API` as covered unless the opt-in BFF/Keycloak stack command has passed or the matrix clearly records the remaining stack dependency.
- Stop before marking `P0-SAAS-ONBOARDING-SAGA` as covered until live Authorizer/Keycloak and live User-Access are proven; live Payment TCP alone is not enough.
- Stop before automating live SePay; all live provider checks stay manual and guarded by `RUN_LIVE_SEPAY=1`.
- Stop before Phase 5 completion while any P0 row is still untriaged.

## Handoff Notes

- Root package scripts now expose the proven browser surfaces as `e2e:phase3`, `e2e:phase4b`, and `e2e:demo`.
- Playwright remains out of PR CI until the full stack and seed are deterministic.
- Default PR confidence should come from deterministic Nx unit/contract gates.
- Partial P0 rows remain partial until their opt-in stack commands pass and the matrix is updated with that evidence.
- The CAT/RBAC stack is not ready for promotion yet: frontend-utils token acquisition appears misaligned with the Keycloak `management-app` confidential client seed. Fix that before treating the full CAT/RBAC gate as reliable.
- The safest Phase 5.4 browser start is `P0-SAAS-SUSPENDED-CUSTOMER-PWA` pending-bill payment exception, but only after adding deterministic suspended-tenant session and pending-bill fixture data.
