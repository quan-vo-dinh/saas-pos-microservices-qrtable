# Phase 5 Plan 01 — Traceability Inventory

## Goal

Create the rule-to-test matrix that decides what Phase 5 must test, what is already covered, and what is a legitimate deferred or implementation gap.

## Inputs

- `docs/phases/phase-5-7-finalization.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/architecture/permission-matrix.md`
- Final phase records: Phase 1, 2A, 2B, 3, 4B
- Existing tests under `apps/**`, `libs/**`, and `tests/e2e/**`

## Tasks

- [ ] Inventory existing tests with `rg --files -g '*.spec.*' -g '*.test.*' -g 'tests/e2e/**'`.
- [ ] Group rules by domain: Catalog/QR, Order/cart/session, Kitchen/realtime, Payment/refund, SaaS 4B, RBAC/auth, architecture invariants.
- [ ] Create `docs/testing/phase-5/traceability-matrix.md` with the columns defined in the Phase 5 doc.
- [ ] Fill `current_test` with concrete file paths for already covered rules.
- [ ] Mark each row as `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, or `deferred-by-phase`.
- [ ] Identify the first P0 batch for unit/contract, integration, and E2E workers.
- [ ] Add a "Top Gaps" section sorted by P0/P1 risk and target layer.

## Output

- `docs/testing/phase-5/traceability-matrix.md`
- A short prioritized backlog inside that matrix:
  - P0 tests to add now
  - P1 tests to add after P0
  - Security gaps
  - Deferred-by-phase items

## Verification

- Every Phase 5 acceptance criterion has at least one matrix row.
- Every P0 row has either a concrete test file or a concrete next action.
- Phase 4A and 4C items are not mixed into Phase 5 acceptance unless already implemented and on the current demo path.

## Next Session Notes

- Do not start by adding tests blindly. Start by updating or reading the matrix.
- If code and docs disagree, classify the mismatch first. Do not change product behavior inside the traceability pass.
- Keep row IDs stable; later plans should reference IDs such as `P0-PAY-WEBHOOK-DUP` or `P0-SAAS-SUSPEND-CUSTOMER`.
