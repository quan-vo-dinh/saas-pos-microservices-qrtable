# Phase 5 Plan 05 — CI Gates And Handoff

## Goal

Document and wire the commands that make Phase 5 repeatable: quick PR checks, full unit/contract checks, stack-dependent integration, browser E2E, and pre-demo dry run.

Current execution scope for Task 1 is limited to root gate scripts and the Phase 5 handoff document. Product behavior, CI workflow wiring, and new Playwright coverage are intentionally out of scope for this slice.

## Inputs

- `docs/testing/phase-5/traceability-matrix.md`
- Test commands proven by Plans 02, 03, and 04
- `.github/workflows/ci.yml`
- `package.json`
- `playwright.config.ts`
- `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md`

## Gate Model

| Gate               | Intended frequency               | Required stack                                                 | Failure meaning                                         |
| ------------------ | -------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| PR quick gate      | Every PR/push                    | Node only                                                      | Changed code broke lint/unit/build                      |
| Full unit/contract | Before merging Phase 5           | Node only                                                      | A project-level contract regressed                      |
| Integration gate   | Pre-demo/nightly/manual          | Postgres/Redis/Kafka/Auth as needed                            | Real boundary behavior or seed is broken                |
| Browser E2E smoke  | Pre-demo/manual, later CI        | Full app stack + seed                                          | Demo journey or frontend/backend integration regressed  |
| Provider checks    | Manual opt-in before public demo | `RUN_LIVE_SEPAY=1` + public app/API URL + provider credentials | Real SePay/OAuth/live webhook assumptions not certified |

Playwright remains a manual or pre-demo gate. Do not add it to PR CI until the full app stack, Keycloak seed, service databases, and browser fixtures are deterministic enough to run without local readiness skips.

## Tasks

- [x] Add package scripts for currently proven browser surfaces: `e2e:phase3`, `e2e:phase4b`, and `e2e:demo`.
- [ ] Update CI only for deterministic gates first. Do not add Playwright to PR CI until stack and credentials are deterministic.
- [x] Document stack-dependent commands in `docs/testing/phase-5/phase-5-handoff.md`.
- [ ] Keep real SePay checks out of default PR/local gates; document them as opt-in live smoke guarded by `RUN_LIVE_SEPAY=1`.
- [ ] Document runtime-gated frontend-utils integration tests: default `pnpm nx test frontend-utils` skips live BFF/Keycloak suites; opt in with `RUN_FRONTEND_UTILS_INTEGRATION=1`, `BFF_URL`, and `KEYCLOAK_URL`.
- [ ] Ensure skipped tests print actionable reasons, such as missing BFF health, missing Keycloak credentials, or missing seeded suspended tenant.
- [x] Produce a Phase 5 handoff checklist summarizing current covered, partial, implementation-gap, and deferred rows.
- [x] Run final verification commands and record results.

## Output

- Updated `package.json` scripts if needed.
- Optional `.github/workflows/ci.yml` updates if the team chooses to enforce additional deterministic gates.
- Final handoff note in `docs/testing/phase-5/phase-5-handoff.md`.
- Traceability matrix with no untriaged P0/P1 rows.

## Verification Commands

Use the final command set agreed during implementation, expected to include:

```bash
pnpm exec nx run-many -t lint test build
pnpm exec nx run-many -t test
pnpm exec playwright test tests/e2e
```

Stack-dependent commands must be documented with prerequisites instead of silently treated as universal PR requirements.

Frontend-utils integration tests:

```bash
# Default deterministic gate: runtime-dependent integration suites stay skipped.
pnpm nx test frontend-utils

# Manual/pre-demo stack gate: requires BFF and Keycloak to be running and seeded.
RUN_FRONTEND_UTILS_INTEGRATION=1 BFF_URL=http://localhost:3300/api/v1 KEYCLOAK_URL=http://localhost:8180 pnpm nx test frontend-utils
```

SaaS live Payment integration:

```bash
# Default deterministic gate: opt-in live Payment spec stays skipped.
pnpm nx test saas --testPathPatterns=onboarding-saga-live-payment.integration.spec.ts --runInBand

# Manual/pre-demo DB gate: requires Postgres for SaaS tables.
RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION=1 pnpm exec jest --config apps/saas/jest.config.cts --runInBand apps/saas/src/services/onboarding-saga-db.integration.spec.ts

# Manual/pre-demo stack gate: requires Postgres plus Payment TCP.
RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 pnpm exec jest --config apps/saas/jest.config.cts --runInBand apps/saas/src/services/onboarding-saga-live-payment.integration.spec.ts
```

## Next Session Notes

- Keep PR CI boring and deterministic. Full-stack confidence can be pre-demo/nightly until infra is stable.
- Default CI must use mock SePay or skip provider checks. Live SePay smoke is a separate manual gate with explicit env guards.
- Do not mark Phase 5 complete if any P0 row is untriaged.
- A skipped test is acceptable only when the matrix says why and the command prints why.
- Final handoff should list exact commands run, exact commands skipped, and the reason for every skip.
- Disable Nx cache when collecting opt-in evidence for a spec that is skipped by default; otherwise the skipped default run can be reused.
