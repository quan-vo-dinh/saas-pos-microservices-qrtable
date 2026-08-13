# Testing Evidence

This directory is the durable map for QRTable test evidence. The current implementation and its automated tests remain the primary authority; use phase records and the canonical business and technical documents to understand the rule being tested.

## Evidence Inventory

- [Traceability matrix](traceability-matrix.md) maps P0/P1 rules to automated evidence, stack requirements, and honest coverage status.
- [Saga validation strategy](saga-validation-strategy.md) defines the claim limits and evidence layers for Order Confirm and SaaS onboarding.

## Test Taxonomy

| Layer            | Purpose                                                                                             | Evidence standard                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             | Prove isolated policy, state-machine, mapper, guard, and error behavior quickly.                    | Assert observable outputs and boundary conditions without external infrastructure.                                                                                                                  |
| Contract         | Prove a service or adapter uses the shared DTO, event, TCP, HTTP, or repository contract correctly. | Verify payload shape, error semantics, tenant context, idempotency, and no forbidden cross-service access.                                                                                          |
| Integration      | Prove a real boundary such as PostgreSQL, Redis, Kafka/outbox, TCP, Keycloak, or a seeded BFF path. | Seed isolated data, opt in explicitly, and assert durable final state rather than only mock calls.                                                                                                  |
| k6               | Measure a named workload under a recorded environment.                                              | Preserve the command, environment, duration, thresholds, and result artifact; performance results are not functional correctness proof.                                                             |
| Distributed saga | Prove a representative cross-service flow and its failure boundaries.                               | Combine unit/contract orchestration tests with opt-in integration of the owning stores and transports; screenshots, logs, DB rows, and outbox rows support but do not replace automated assertions. |

## Evidence Rules

- Keep traceability row IDs stable. Classify a rule as `covered`, `partial`, `implementation-gap`, `security-gap`, or `deferred`; do not call an unrun stack-dependent path green.
- Test at the resource-owner boundary. A BFF guard can improve UX, but it does not replace Catalog, User-Access, Order, Payment, or SaaS enforcement.
- Make tenant identity, server time, idempotency, and final persisted state explicit in tests that cross a service boundary.
- Default automated tests use mocks or local doubles for SePay. They must not depend on a live SePay account, Vercel deployment, or public tunnel. Live provider checks are explicit manual smoke tests with public credentials and runtime.
- A skipped test is acceptable only when its prerequisite and reason are recorded in the matrix. Disable Nx cache when collecting opt-in evidence that would otherwise reuse a skipped result.

## Representative Gates

| Gate                                          | Default | Typical prerequisites                                                                     |
| --------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| Project unit/contract suite                   | Yes     | Node dependencies                                                                         |
| Frontend-utils runtime integration            | No      | Seeded BFF and Keycloak, `RUN_FRONTEND_UTILS_INTEGRATION=1`                               |
| Order, Kitchen, Payment, and SaaS integration | No      | Isolated PostgreSQL/Redis/Kafka or TCP harness, seed/reset policy, explicit `RUN_*` guard |
| Permission smoke                              | No      | BFF, Keycloak, Authorizer, User-Access, and seeded role accounts                          |
| Live SePay smoke                              | No      | `RUN_LIVE_SEPAY=1`, public app/API URL, approved credentials; never commit secrets        |

## Canonical Boundaries

- [Business behavior](../business-logic.md) owns product rules such as VND rounding, tenant lifecycle, order confirmation, and payment behavior.
- [Technical architecture](../technical-architecture.md) owns service/data boundaries, outbox behavior, and the scope of saga claims.
- [Phase 5 record](../phases/phase-5-testing.md) records accepted testing scope and current evidence limits.
- [SePay configuration guide](../guides/sepay-configuration-guide-phase3.md) documents operational webhook and OAuth setup.
