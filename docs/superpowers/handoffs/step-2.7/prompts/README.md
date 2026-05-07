# Step 2.7 Batch Agent Prompts

Use these prompts to run Step 2.7 in five sequential batches. This is the
balanced split for the step: fewer batches than task-by-task execution, but each
agent still owns one clear boundary and avoids mixing BFF, Customer PWA, POS,
KDS, and E2E concerns.

## Execution Order

1. `2026-05-07-step-2.7-batch-1-prompt.md`
2. `2026-05-07-step-2.7-batch-2-prompt.md`
3. `2026-05-07-step-2.7-batch-3-prompt.md`
4. `2026-05-07-step-2.7-batch-4-prompt.md`
5. `2026-05-07-step-2.7-batch-5-prompt.md`

## Batch Topology

| Batch | Scope                                                       | Why this split exists                                                                 |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1     | BFF realtime auth contract                                  | Locks server-owned room assignment before any frontend socket migration.              |
| 2     | Customer PWA realtime hook and Customer PWA status UI       | Isolates session-auth frontend behavior from staff JWT behavior.                      |
| 3     | Management POS realtime, polling fallback, POS status UI    | Keeps POS order/service/table/bill invalidation separate from KDS station logic.      |
| 4     | Management KDS realtime, KDS status UI, no-batching removal | Keeps station filtering and no-batching enforcement together.                         |
| 5     | Playwright E2E harness and final verification               | Verifies all previous batches without mixing verification setup into feature batches. |

## Handoff Rule

The output of batch `N` is the required input for batch `N + 1`.

Before starting any batch after Batch 1, the agent must read:

- all previous batch final summaries available in the conversation,
- the previous batch handoff file,
- the current batch prompt,
- the current batch handoff file,
- `docs/specs/business-logic-step-2.7-spec.vi.md`,
- `docs/superpowers/plans/2026-05-07-step-2.7-fe-be-realtime.md`.

If the previous batch output is missing, incomplete, or contradicts the current
batch prompt, the agent must stop and ask for clarification before editing code.

## Shared Source Of Truth

- `AGENTS.md`
- `docs/specs/business-logic-step-2.7-spec.vi.md`
- `docs/superpowers/plans/2026-05-07-step-2.7-fe-be-realtime.md`
- `docs/superpowers/audits/step-2.7-realtime-audit-report.md`
- `docs/superpowers/audits/step-2.7-realtime-audit-report.vi.md`
- `docs/specs/business-logic-step-2.6-spec.vi.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/architecture/permission-matrix.md`
- `apps/bff/src/app/modules/realtime/`
- `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts`
- `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts`
- `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts`

## Global Constraints

- Work directly on `main`; do not create a branch.
- Do not commit. The repository owner will review and commit.
- Use Context7/ctx7 for current library docs when changing Socket.IO Client,
  TanStack Query, Playwright, React/Next.js, or framework-specific API usage.
- Namespace remains `/orders`; do not introduce `/kds`.
- WebSocket events are invalidation hints only. REST snapshots remain source of
  truth after reconnect.
- Do not trust client-origin `join.staff` or `join.session` for room assignment.
- Frontend sends identity/auth material only; server derives rooms.
- Preserve tenant/session/station filtering on every event handler.
- Do not implement `events.menuUpdated`, `events.menu.updated`, or `menuUpdated`
  in Step 2.7.
- Do not implement batching/gộp món/gom đơn under any name.
- Do not hard-code KDS routing by category/name in the frontend.
- Keep KDS actions strict refetch-after-mutation.
- Keep POS polling as a fallback; reduce to 15s only after realtime hook fixes.
- Ignore commit snippets in the implementation plan. Report changed files and
  verification results instead.
