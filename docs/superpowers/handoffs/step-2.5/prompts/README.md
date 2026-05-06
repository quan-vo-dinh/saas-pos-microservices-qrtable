# Step 2.5 Batch Agent Prompts

Use these prompts to run Step 2.5 in seven sequential batches. Each batch prompt
is designed for a fresh implementation agent.

## Execution Order

1. `2026-04-30-step-2.5-batch-1-prompt.md`
2. `2026-04-30-step-2.5-batch-2-prompt.md`
3. `2026-04-30-step-2.5-batch-3-prompt.md`
4. `2026-04-30-step-2.5-batch-4-prompt.md`
5. `2026-04-30-step-2.5-batch-5-prompt.md`
6. `2026-05-01-step-2.5-batch-6-prompt.md`
7. `2026-05-03-step-2.5-batch-7-prompt.md`

## Handoff Rule

The output of batch `N` is the required input for batch `N + 1`.

Before starting any batch after Batch 1, the agent must read:

- all previous batch final summaries available in the conversation or handoff
  notes,
- the previous batch handoff file,
- the current batch prompt,
- the current batch handoff file,
- the canonical Step 2.5 design spec and implementation plan.

If the previous batch output is missing, incomplete, or contradicts the current
batch prompt, the agent must stop and ask for clarification before editing code.

## Shared Source Of Truth

- `docs/phases/phase-2a-order-kafka.md`
- `docs/business-logic-step-2.4-spec.vi.md`
- `docs/technical-architecture.md`
- `docs/superpowers/specs/2026-04-30-step-2.5-fe-be-integration-design.md`
- `docs/superpowers/specs/2026-05-01-step-2.5-batch-6-qr-demo-dynamic-tenant-design.md`
- `docs/superpowers/plans/step-2.5-fe-be-integration-plan.md`
- `docs/superpowers/plans/2026-05-01-step-2.5-batch-6-qr-demo-dynamic-tenant-plan.md`
- `docs/superpowers/plans/2026-05-03-step-2.5-batch-7-pos-tables-real-integration-plan.md`
- `docs/superpowers/plans/2026-04-24-step-2.2-mock-ui.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `apps/bff/src/app/modules/order/`
- `apps/bff/src/app/modules/realtime/`
- `apps/customer-pwa/src/mocks/`
- `apps/management-app/src/mocks/`

## Global Constraints

- Work directly on `main`; do not create a branch.
- Do not commit. The repository owner will review and commit.
- Do not implement physical Database-per-Service split.
- Do not add new permissions in Step 2.5.
- Do not implement cash payment confirmation.
- Do not integrate KDS with real backend in Step 2.5.
- Do not create automatic mock fallback for primary PWA/POS order paths.
- WebSocket events are invalidation hints only. REST remains source of truth.
- Preserve tenant isolation and existing BFF guard/permission patterns.
- Batch 6 QR URL uses tenant slug, not internal tenant id.
- Batch 6 implements query-param tenant slug resolution, not production
  subdomain routing.
- Batch 7 integrates `/pos/tables` with real Catalog table APIs and existing POS
  order polling; Bills/payment/KDS/notification history/analytics remain
  deferred.
