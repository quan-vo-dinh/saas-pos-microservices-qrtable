# Phase 4A — Saga & Hardening

## Status

IMPLEMENTED + VERIFIED only for the representative/accepted Order Confirm Saga and SaaS onboarding mini-saga. This record does not claim complete operational saga hardening.

## Final Scope

- Order Confirm Saga: stock deduction before the confirmed processing transition, replay protection, and release-stock compensation on eligible failure/cancellation paths.
- SaaS onboarding mini-saga: tenant provisioning coordination with Authorizer/User-Access compensation boundaries.
- Baseline idempotency and outbox behavior supporting the accepted flows.

## Accepted Decisions

- Saga coordination remains service-owned and uses existing TCP/Kafka contracts; no service reads another service database.
- The accepted Order Confirm path is compensating, not a distributed ACID transaction.
- The mini-saga proves onboarding coordination but is not a general durable workflow engine.
- Baseline outbox/idempotency is sufficient for accepted thesis behavior; it is not a claim of CDC-grade delivery.

## Final Business Behavior

- A staff confirmation either reserves/deducts the required stock and advances the order, or fails without leaving an accepted partial order state.
- A qualifying processing-order cancellation releases stock according to the Catalog policy.
- Onboarding either establishes the accepted tenant access baseline or applies the defined local compensation path when a dependent step fails.

## Final Technical Behavior

- `OrderConfirmSagaService` coordinates Order and Catalog contracts with replay/error/compensation handling.
- SaaS onboarding coordinates its own dependencies through contracts and its outbox/compensation baseline.
- Tests and traceability distinguish the representative implemented slices from unimplemented infrastructure hardening.

## Acceptance Evidence

- Order saga services, Catalog stock gateway/commands, compensation tests, and Phase 5 saga-validation evidence demonstrate confirm replay, stock failure handling, and release behavior.
- SaaS onboarding contracts/tests and the onboarding validation strategy document the accepted mini-saga evidence and its claim boundary.

## Deferred Work

- Chaos testing, durable saga state, retry workers, operational automation, stock ledger, CDC/Debezium, and advanced hardening are deferred.
- Payment Complete Saga and broad cross-service recovery orchestration are not accepted Phase 4A scope.
