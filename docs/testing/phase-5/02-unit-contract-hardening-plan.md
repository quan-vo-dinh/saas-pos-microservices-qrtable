# Phase 5 Plan 02 — Unit And Contract Hardening

## Goal

Close fast, deterministic P0/P1 gaps with Jest tests and contract checks before spending time on slower integration or browser flows.

## Inputs

- `docs/testing/phase-5/traceability-matrix.md`
- Existing Jest tests in `apps/**` and `libs/**`
- Nx project configs and Jest configs
- Phase 5 acceptance criteria

## Work Slices

These slices can be assigned in parallel after the traceability matrix has a first P0 draft.

| Slice              | Primary projects/libs                                      | Focus                                                                                   |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Catalog/QR         | `apps/catalog`, `libs/providers/cloudinary`, BFF catalog   | QR token tamper/invalid path, menu/table CRUD policy, delete constraints, upload path   |
| Order/cart/session | `apps/order`, `libs/shared/types`, BFF order               | Transitions, idempotency, cart version, bill request lock, table transfer request IDs   |
| Kitchen/realtime   | `apps/kitchen`, BFF realtime, management/customer hooks    | Duplicate event idempotency, KDS queue scoring, station access, refetch hooks           |
| Payment/refund     | `apps/payment`, BFF payment, order payment consumer        | VND rounding, `QRTBL`, cash/VietQR policy, webhook duplicate/underpaid/after-paid       |
| SaaS 4B            | `apps/saas`, BFF SaaS, payment settings, frontend SaaS     | `QRSUB`, subscription lifecycle, tenant lifecycle, OAuth state, payment settings guards |
| RBAC/architecture  | `apps/user-access`, `libs/constants`, `libs/configuration` | Permission counts, route metadata, Kafka topic defaults, no `menu.updated` contract     |

## Tasks

- [ ] Pick one P0 slice from the traceability matrix.
- [ ] Locate existing tests before creating new ones; extend current spec files where responsibility already exists.
- [ ] Add tests at the lowest sufficient layer: pure service/unit first, BFF/controller contract second, frontend hook/component only for UI behavior.
- [ ] Avoid asserting implementation details that belong to integration tests, such as real database lock behavior or Kafka broker delivery.
- [ ] Add/update traceability rows with the new test file paths.
- [ ] Run focused tests for touched projects.

## Output

- Updated Jest specs in relevant projects.
- Traceability matrix rows moved from `missing` or `partial` to `covered` where appropriate.
- Notes for any P0 rule that cannot be tested at unit/contract level and must move to integration.

## Verification Commands

Use only commands relevant to touched projects, for example:

```bash
pnpm nx test bff
pnpm nx test catalog
pnpm nx test order
pnpm nx test kitchen
pnpm nx test payment
pnpm nx test saas
pnpm nx test user-access
pnpm nx test shared-types
```

## Next Session Notes

- Keep unit tests fast and hermetic. If a test needs Postgres/Redis/Kafka/Keycloak, move it to Plan 03.
- Do not use E2E to verify DTO or enum completeness.
- Prefer existing factories and mock helpers if present; do not introduce a broad testing abstraction unless two or more projects clearly need it.
