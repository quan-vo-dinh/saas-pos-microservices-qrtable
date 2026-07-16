# Saga Validation Strategy For Thesis Evidence

> Purpose: define how QRTable proves the Saga pattern in a thesis-safe way without claiming full production-grade saga hardening.
> Last updated: 2026-06-20.

## Scope

QRTable uses Saga in two representative workflows:

1. **Order Confirm Saga** in POS runtime.
   `OrderConfirmSagaService` orchestrates Order, Catalog stock, Order DB commit, and `order.confirmed` outbox. Catalog stock release is the compensation when Catalog deduct succeeded but Order commit/outbox failed.
2. **SaaS Onboarding Mini-Saga** in platform provisioning.
   `OnboardingSagaService` orchestrates tenant, owner identity, User-Access profile, initial subscription, Payment settings, and `tenant.created` outbox. Compensation disables the owner user and removes partially created SaaS state.

These two flows are the thesis evidence for applying Saga. Durable saga state tables, retry workers, CDC/Debezium, stock ledger, and deep compensation diagnostics are future hardening, not current thesis claims.

## Evidence Model

Saga evidence is collected in layers. No single layer is enough by itself:

| Layer                 | What it proves                                                                                                   | What it cannot prove alone                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Unit/contract tests   | The orchestrator sequence, replay, error branching, idempotency keys, compensation calls, and TCP command shape. | Real DB/Redis/TCP behavior or multi-service wiring.               |
| Integration tests     | Real persistence, transaction boundaries, outbox rows, Redis behavior, and selected live TCP boundaries.         | Full browser journey or every external provider/identity service. |
| Fault-injection tests | The compensation path when a downstream or commit step fails after an external side effect.                      | Production recovery without durable saga state.                   |
| UI/demo evidence      | The visible happy path for reviewers: POS confirm, KDS ticket, Super Admin onboarding, Owner settings.           | Compensation correctness or race-condition safety.                |
| Log/DB evidence       | Runtime artifacts such as outbox rows, stock state, tenant/payment settings rows, and error logs.                | User journey completeness.                                        |

The thesis should present Saga validation as **multi-layer verification**: unit/contract for logic, integration for real boundaries, selective fault injection for compensation, and demo artifacts for visible product behavior.

## Order Confirm Saga Evidence

| Evidence item                   | Current proof                                                                                                                                                                                      | Thesis claim level                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Orchestrator exists             | `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`                                                                                                                          | Implemented                                |
| Catalog reservation state       | `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts` and its focused spec cover applied, replayed, stale, conflict, legacy, and reconfirm transitions.                   | Automated unit/state-machine               |
| Success path                    | `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts` checks stock deduct, returned-version persistence, `PROCESSING`, item update, and outbox.                              | Automated unit/contract                    |
| Replay and transport paths      | The Saga spec checks already-`PROCESSING`, active Catalog replay, and ambiguous transport failure without speculative compensation.                                                                | Automated unit/contract                    |
| Compensation path               | The Saga spec checks versioned release inside the transaction callback, commit-time fallback, compensation logging, and original-error preservation.                                               | Automated fault-injection at service layer |
| TCP command shape and timeout   | `catalog-stock-gateway.service.spec.ts` checks deduct/release envelopes, structural validation, business errors, and the bounded first-response timeout.                                           | Automated contract                         |
| Lost-response and version proof | `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts` uses real PostgreSQL and Catalog TCP for duplicate deduct, lost response/retry, and v2/stale release. | Opt-in integration/fault injection         |
| Stock contention                | `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts` validates one success, one insufficient-stock failure, stock zero, and one outbox.                            | Opt-in integration                         |

Recommended thesis wording:

> The Order Confirm Saga has automated unit/contract evidence for orchestration and versioned compensation. Catalog persists the reservation key, payload hash, result, state, and version in the same transaction as the stock mutation. Opt-in PostgreSQL plus Catalog TCP tests prove duplicate deduct, a discarded successful response followed by retry, compensation followed by reconfirm, stale release protection, and concurrent stock contention. Recovery from an ambiguous response still requires a caller retry; no autonomous Saga recovery worker or exactly-once delivery is claimed.

Useful commands:

```bash
pnpm nx test order --testPathPatterns=order-confirm-saga.service.spec.ts --runInBand
pnpm nx test order --testPathPatterns=catalog-stock-gateway.service.spec.ts --runInBand
RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-stock-concurrency.integration.spec.ts --runInBand
RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-confirm-stock-idempotency.integration.spec.ts --runInBand
```

Recommended demo artifacts:

- POS screenshot before/after staff confirms a `PENDING` order.
- KDS screenshot showing tickets created after `order.confirmed`.
- DB snapshot or query result showing Order `PROCESSING` and `outbox_events` containing `order.confirmed`.
- Optional log snippet showing Catalog deduct command key `confirm-order:{orderId}`.

## SaaS Onboarding Mini-Saga Evidence

| Evidence item             | Current proof                                                                                                                                                           | Thesis claim level          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Orchestrator exists       | `apps/saas/src/services/onboarding-saga.service.ts`                                                                                                                     | Implemented                 |
| Unit compensation rules   | `apps/saas/src/services/onboarding-saga.service.spec.ts` and mocked integration specs.                                                                                  | Automated unit/contract     |
| Real SaaS DB success path | `apps/saas/src/services/onboarding-saga-db.integration.spec.ts` verifies tenant, initial subscription, payment-settings TCP contract call, and `tenant.created` outbox. | Opt-in DB integration       |
| Real SaaS DB compensation | `onboarding-saga-db.integration.spec.ts` verifies rollback before and after subscription assignment.                                                                    | Opt-in DB integration       |
| Live Payment TCP boundary | `apps/saas/src/services/onboarding-saga-live-payment.integration.spec.ts` verifies that live Payment TCP creates exactly one `tenant_payment_settings` row.             | Opt-in live TCP integration |
| Identity/profile boundary | Authorizer/Keycloak and User-Access are still represented by contract doubles in these opt-in slices.                                                                   | Partial live-stack proof    |

Fresh verification on 2026-05-31 used UUID-valid owner fixtures because `tenants.owner_id` is a PostgreSQL `uuid` column. The previous non-UUID owner test data was a fixture bug, not a production saga bug.

Useful commands:

```bash
pnpm nx test saas --runInBand --skip-nx-cache

RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION=1 \
  pnpm exec jest --config apps/saas/jest.config.cts --runInBand \
  apps/saas/src/services/onboarding-saga-db.integration.spec.ts

# In another terminal, start Payment TCP first when collecting live Payment evidence.
pnpm nx serve payment --skip-nx-cache

RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 \
  pnpm exec jest --config apps/saas/jest.config.cts --runInBand \
  apps/saas/src/services/onboarding-saga-live-payment.integration.spec.ts
```

Recommended demo artifacts:

- Super Admin onboarding screenshot.
- Owner dashboard or payment settings screenshot after onboarding.
- DB snapshot showing tenant, initial subscription, `tenant_payment_settings`, and `tenant.created` outbox.
- Terminal output for the opt-in SaaS DB integration and live Payment TCP integration.

Recommended thesis wording:

> The SaaS Onboarding Mini-Saga has DB integration evidence for successful provisioning and rollback, and live TCP evidence for Payment settings creation. The identity/profile services remain contract-doubled in the current automated proof, so the thesis should call this a partial live-stack proof rather than full end-to-end live validation.

## Claim Policy For The Thesis

Safe claims:

- QRTable applies Saga to two representative workflows: Order confirmation and SaaS onboarding.
- Both Saga flows use orchestration, not choreography.
- Both flows define a business commit point and compensation actions.
- Order Confirm Saga has service-level compensation fault injection plus opt-in PostgreSQL/Catalog TCP evidence for duplicate deduct, lost-response retry, versioned reconfirm, stale release, and contention.
- SaaS Onboarding Mini-Saga has opt-in PostgreSQL integration for rollback and live Payment TCP evidence.

Claims to avoid:

- "The system has production-grade Saga hardening."
- "Every distributed transaction in QRTable is implemented as Saga."
- "Payment complete is a full Saga."
- "The onboarding flow is fully live end-to-end across Keycloak, User-Access, Payment, Kafka, and UI."
- "Exactly-once delivery is guaranteed."
- "An abandoned reservation is recovered automatically without a caller retry."

## Evidence Checklist Before Final Thesis Submission

- [ ] Run and save output for the Order Confirm Saga unit/contract tests.
- [ ] Run and save output for the Order/Catalog stock integration if the local stack is ready.
- [ ] Run and save output for the Order Confirm lost-response/version integration.
- [ ] Run and save output for the SaaS onboarding PostgreSQL integration.
- [ ] Run and save output for the SaaS live Payment TCP integration.
- [ ] Capture UI happy path for POS confirm and SaaS onboarding.
- [ ] Capture DB evidence for `order.confirmed` outbox and `tenant.created` outbox.
- [ ] Record remaining limitations as future hardening, not as failed thesis scope.
