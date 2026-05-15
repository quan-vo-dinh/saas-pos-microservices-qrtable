# Phase 5 Plan 04 — Playwright E2E Demo Flows

## Goal

Build a small, deterministic Playwright suite that proves the demo-critical user journeys without duplicating unit or integration assertions.

## Inputs

- `tests/e2e/step-2.7-realtime.spec.ts`
- `tests/e2e/phase-3-payment.spec.ts`
- `playwright.config.ts`
- `package.json` E2E scripts
- Dev seed data and credentials
- `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md`
- `webapp-testing` guidance: use reconnaissance-then-action and server helpers as black boxes when needed

## E2E Philosophy

- Test user-visible outcomes, not internal Kafka/Redis packets.
- Prefer role/text selectors and stable `data-testid` when role/text is not enough.
- Avoid fixed sleeps except for interactions that intentionally require hold duration; prefer URL, response, and visible-state waits.
- Keep flows serial when they share seed state.
- Treat WebSocket events as hints; assert final snapshots after refetch/reload/reconnect.
- Do not automate real SePay login in default E2E. Payment-settings OAuth uses a mock provider or a seeded callback path; live SePay is separate manual smoke.

## Required Flows

| Flow | Spec target                              | User outcome to prove                                                                                                             |
| ---- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A    | Existing `step-2.7-realtime.spec.ts`     | QR -> menu -> cart -> order -> POS confirm -> KDS -> served; customer sees served after reconnect/reload                          |
| B    | New/expanded payment E2E                 | Request bill -> cash or VietQR settlement -> bill immutable -> session closed -> table cleaning                                   |
| C    | New SaaS onboarding E2E                  | SUPER_ADMIN onboards tenant -> Owner login -> subscription/payment settings visible -> tenant resource usable                     |
| D    | New suspended tenant E2E                 | Suspended tenant remains readable, blocks new cart/order mutation, preserves pending bill payment path                            |
| E    | New admin/dashboard smoke or route group | Public landing, admin tenants/plans/billing, owner subscription/payment settings, OAuth invalid-state and mock callback not blank |

## Tasks

- [ ] Inventory current E2E selectors and fragile waits.
- [ ] Create or update shared helpers for Keycloak login, QR landing URL generation, seed constants, and route readiness.
- [ ] Add `e2e:phase3`, `e2e:phase4b`, and `e2e:demo` package scripts if the suite expands.
- [ ] Implement Flow B after integration proves payment finalization semantics.
- [ ] Implement Flow C and D after suspended/onboarding seed fixtures are available.
- [ ] For payment-settings OAuth, seed a valid OAuth state and complete the callback with a fake code against the mock SePay provider; do not depend on the registered Vercel redirect URI.
- [ ] Keep screenshots/traces on failure enabled; do not commit generated report artifacts.
- [ ] Update traceability rows with E2E spec paths and required env vars.

## Output

- Updated or new Playwright specs under `tests/e2e/`.
- Optional shared E2E helpers if duplication appears across specs.
- Package scripts for selected E2E runs.
- A documented fixture/seed requirement for each browser flow.

## Verification Commands

```bash
pnpm e2e:step2.7
pnpm exec playwright test tests/e2e/phase-3-payment.spec.ts
pnpm exec playwright test tests/e2e
```

## Next Session Notes

- Before writing a browser test, start the app or confirm it is running, then inspect the rendered page after `networkidle`.
- For SePay OAuth UI, test QRTable's callback and bank-selection behavior with mock provider data; do not cross into live provider login in the default suite.
- If using helper scripts from `webapp-testing`, run `scripts/with_server.py --help` before using it.
- If a selector is hard to target, prefer adding a stable accessible name or `data-testid` in the app over using CSS structure.
- Do not make E2E assert internal event payloads; use UI state and API-visible snapshots.
