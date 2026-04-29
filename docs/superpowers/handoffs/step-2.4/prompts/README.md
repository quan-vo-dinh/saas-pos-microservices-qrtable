# Step 2.4 Batch Agent Prompts

Use these prompts to run Step 2.4 in small sequential batches. Each batch prompt
is designed for a fresh implementation agent.

## Execution Order

1. `2026-04-29-step-2.4-batch-1-prompt.md`
2. `2026-04-29-step-2.4-batch-2-prompt.md`
3. `2026-04-29-step-2.4-batch-3-prompt.md`
4. `2026-04-29-step-2.4-batch-4-prompt.md`
5. `2026-04-29-step-2.4-batch-5-prompt.md`
6. `2026-04-29-step-2.4-batch-6-prompt.md`
7. `2026-04-29-step-2.4-batch-7-prompt.md`

## Handoff Rule

The output of batch `N` is the required input for batch `N + 1`.

Before starting any batch after Batch 1, the agent must read:

- all previous batch final summaries available in the conversation or handoff
  notes,
- the previous batch handoff file,
- the current batch prompt,
- the current batch handoff file,
- the canonical Step 2.4 plan and architecture decision note.

If the previous batch output is missing, incomplete, or contradicts the current
batch prompt, the agent must stop and ask for clarification before editing code.

## Shared Source Of Truth

- `docs/business-logic-step-2.4-spec.vi.md`
- `docs/phases/phase-2a-order-kafka.md`
- `docs/superpowers/specs/2026-04-28-step-2.4-architecture-decisions.md`
- `docs/superpowers/plans/step-2.4-implementation-plan.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`

## Global Constraints

- Work directly on `main`; do not create a branch.
- Do not commit. The repository owner will review and commit.
- Do not implement physical Database-per-Service split in Step 2.4.
- Do not implement BFF Kafka consumer bridge in Step 2.4.
- Do not replace existing Redis cache-manager config.
- Preserve tenant isolation on every DB query.
- Follow backend module convention:
  `apps/<service>/src/app/modules/<bounded-context-or-resource>/{controllers,services,repositories,tests}`.
- Use one bounded-context `OrderModule` for Order Service.
- Use entity class names `Order`, `OrderItem`, `Session`, `Bill`,
  `ServiceRequest`, `OutboxEvent`.
