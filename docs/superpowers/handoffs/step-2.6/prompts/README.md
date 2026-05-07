# Step 2.6 Batch Agent Prompts

Use these prompts to run Step 2.6 in six sequential batches. Each batch prompt
is designed for a fresh implementation agent with a narrow ownership boundary.

## Execution Order

1. `2026-05-07-step-2.6-batch-1-prompt.md`
2. `2026-05-07-step-2.6-batch-2-prompt.md`
3. `2026-05-07-step-2.6-batch-3-prompt.md`
4. `2026-05-07-step-2.6-batch-4-prompt.md`
5. `2026-05-07-step-2.6-batch-5-prompt.md`
6. `2026-05-07-step-2.6-batch-6-prompt.md`

## Batch Topology

| Batch | Scope                                                                           | Why this split exists                                             |
| ----- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1     | Contracts, permissions, shared KDS types, env, dependencies                     | Creates stable compile-time surface before services use it.       |
| 2     | Kitchen service scaffold, Redis keys, idempotent ticket creation, lifecycle TCP | Biggest stateful core; kept separate from SLA/recovery.           |
| 3     | Kitchen SLA worker, Kafka producer, recovery from Order active orders           | Depends on Kitchen core, but can be tested with mocked Order TCP. |
| 4     | Order Service KDS support commands                                              | Durable source-of-truth sync, isolated from BFF/realtime.         |
| 5     | BFF KDS REST, ready compensation, WebSocket hardening, realtime bridges         | Single BFF boundary batch so auth/rooms/events stay coherent.     |
| 6     | Management App KDS integration and final verification                           | UI wiring plus full-system close-out.                             |

## Handoff Rule

The output of batch `N` is the required input for batch `N + 1`.

Before starting any batch after Batch 1, the agent must read:

- all previous batch final summaries available in the conversation,
- the previous batch handoff file,
- the current batch prompt,
- the current batch handoff file,
- `docs/specs/business-logic-step-2.6-spec.vi.md`,
- `docs/superpowers/plans/2026-05-07-step-2.6-kitchen-websocket.md`.

If the previous batch output is missing, incomplete, or contradicts the current
batch prompt, the agent must stop and ask for clarification before editing code.

## Shared Source Of Truth

- `AGENTS.md`
- `docs/specs/business-logic-step-2.6-spec.vi.md`
- `docs/superpowers/plans/2026-05-07-step-2.6-kitchen-websocket.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-2a-order-kafka.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `libs/configuration/src/lib/kafka.config.ts`
- `libs/configuration/src/lib/tcp.config.ts`
- `libs/providers/redis-client/src/lib/redis-client.service.ts`
- `apps/order/src/app/modules/order/`
- `apps/bff/src/app/modules/realtime/`

## Global Constraints

- Work directly on `main`; do not create a branch.
- Do not commit. The repository owner will review and commit.
- Use Context7/ctx7 for current library docs when changing NestJS, Socket.IO,
  KafkaJS, Redis, or framework-specific API usage.
- Do not implement batching/gộp món under any name. No backend batch keys, batch
  DTO fields, batch events, `prepSignature`, grouped active quantity, or
  cross-order batch totals.
- Canonical Kafka topic is `kitchen.sla_warning`; never use
  `kitchen.sla_warn`.
- BFF must not emit KDS queue events directly from `order.confirmed`. Kitchen
  must write Redis first, then publish internal Redis Pub/Sub for BFF.
- WebSocket events are invalidation hints only. REST/TCP snapshots remain source
  of truth after reconnect.
- Preserve tenant isolation on every Redis key, DB query, TCP request, Kafka
  event, and WebSocket room.
- Preserve protected HTTP guard behavior:
  `UserGuard -> TenantGuard -> PermissionGuard`.
- Kitchen Service is Redis-only for KDS state; do not add a Kitchen database.
- Do not trust client-origin `join.staff` or `join.session` for room assignment.
