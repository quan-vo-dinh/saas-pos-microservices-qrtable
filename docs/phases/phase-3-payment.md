# Phase 3 — Payment

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Cash and SePay/VietQR payment flows, bill settlement, payment records, webhook processing, receipt-facing responses, and payment-completed side effects.
- Tenant/platform payment-reference separation and payment outbox publication.

## Accepted Decisions

- Payment owns payment records and settlement processing; Order remains authoritative for bill/order state and is updated through its contract.
- SePay handling distinguishes tenant payment references (`QRTBL`) from platform subscription references (`QRSUB`).
- Webhooks are validated/idempotent and cannot treat an untrusted callback as a new payment command.
- Money uses server-side VND rounding; clients do not determine settlement timestamps or final state.

## Final Business Behavior

- Staff can record cash settlement or initiate supported QR payment; a valid completed payment settles the bill and drives the accepted order/session/table effects.
- Payment status is queryable without exposing secrets, and duplicate callbacks do not duplicate settlement.

## Final Technical Behavior

- Payment persists its own PostgreSQL data, uses typed TCP/Kafka contracts, and emits durable payment completion through the shared topic/outbox pattern.
- BFF exposes guarded staff/customer routes and webhook endpoints with the documented route separation.
- Frontends refetch bill/order/payment snapshots after payment realtime hints.

## Acceptance Evidence

- Payment entities, repositories, services, webhook handling, BFF routes, shared contracts, frontend payment surfaces, and focused tests are present.
- Existing acceptance evidence covers cash, QR callback/idempotency, order/bill completion side effects, and the tenant/platform reference boundary.

## Deferred Work

- Live-provider production certification, public callback smoke evidence, refunds beyond accepted flows, and broader financial operations are deferred.
