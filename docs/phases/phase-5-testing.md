# Phase 5 — Testing

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Risk-based unit, contract, integration, traceability, permission-matrix, and saga-validation evidence for implemented QRTable behavior.
- Repeatable local gates and explicit classification of covered, partial, implementation-gap, security-gap, and deferred behavior.

## Accepted Decisions

- Traceability against business rules and contracts is the primary acceptance measure; coverage is supporting evidence, not the product goal.
- Realtime tests assert REST snapshot reconciliation after hints/reconnects, not client-side domain reconstruction from packets.
- Live SePay/OAuth checks require explicit public credentials/runtime and are not default automated gates.

## Final Business Behavior

- Accepted ordering, kitchen, payment, SaaS, staff, dashboard, tenant-isolation, permission, and suspension behavior has evidence at the appropriate test boundary.
- Representative Order Confirm and SaaS onboarding saga claims are limited to the verified slices and their documented gaps.

## Final Technical Behavior

- The Phase 5 traceability matrix maps P0/P1 rules to tests and deferred/gap status.
- Unit/contract, integration, frontend-utils, and permission smoke suites use documented stack/skip rules so unavailable runtime dependencies are not reported as false green evidence.
- CI-oriented commands support focused and full gates; tests retain shared type/contract and service-boundary ownership.

## Acceptance Evidence

- `docs/testing/README.md`, `docs/testing/traceability-matrix.md`, and `docs/testing/saga-validation-strategy.md` contain the durable taxonomy, rule-to-test evidence, and representative Saga validation strategy.
- Recorded gates include the full `nx run-many -t test --parallel=3` suite, frontend-utils deterministic/runtime-aware suite, and seeded integration/permission smoke.
- The matrix records the remaining evidence limits rather than claiming unrun public-provider scenarios as passed.

## Deferred Work

- Full durable Phase 4A hardening tests, notification/email, long-offline queueing, and live provider certification remain deferred.
