# Step 2.7 FE<->BE Real-time Audit Report

> Scope: Business Logic / Architecture Analysis only. This refresh does not include an implementation plan.
>
> Refresh date: 2026-05-07. Input assumption from project owner: all 6 Step 2.6 batches have been implemented.
>
> Reading basis: `docs/phases/phase-2b-kitchen-websocket.md`, `docs/specs/business-logic-step-2.6-spec.vi.md`, `docs/superpowers/plans/2026-05-07-step-2.6-kitchen-websocket.md`, `docs/architecture/permission-matrix.md`, and targeted code discovery under `apps/` and `libs/`.

## 1. Current State

### 1.1 Context7 documentation findings used in this refresh

- Socket.IO Client docs from Context7 (`/websites/socket_io_v4_client-api`) confirm:
  - `io(".../namespace", { auth: { token } })` is the documented client pattern for connecting to a namespace with auth data.
  - `connect` fires on initial connection and after successful reconnection.
  - Event handlers should not be registered inside `connect`, because reconnect can duplicate them.
  - `socket.off(eventName, listener)` removes listeners.
- TanStack Query docs from Context7 (`/tanstack/query`) confirm:
  - `queryClient.invalidateQueries(...)` marks matching queries invalid and refetches active matching queries by default.
  - `refetchType` defaults to `active`.
  - `refetchInterval` is an active-observer polling fallback independent of staleness.

### 1.2 Backend realtime contract currently in code

- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
  - Namespace is `/orders`.
  - `handleConnection()` delegates handshake validation to `RealtimeAuthService` and joins only server-derived rooms.
  - Legacy `join.session` and `join.staff` still exist only as compatibility handlers that emit `events.authError`; they do not join client-supplied rooms.
  - `subscribe.kds` is available only for SUPER_ADMIN/OWNER/MANAGER station opt-in.
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
  - Staff token is read from `socket.handshake.auth.token` or `Authorization: Bearer`.
  - Staff rooms are derived from JWT roles: `tenant:{tid}:staff`, KDS station rooms for CHEF/BARISTA, and `tenant:{tid}:management` for SUPER_ADMIN/OWNER/MANAGER.
  - Customer sockets currently require `x-tenant-id` and `x-session-id` in handshake headers; the service validates the session cache before joining `session:{sid}:customer`.
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - Emits direct Step 2.4 events: `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.billRequested`, `events.tableTransferred`.
  - Emits Step 2.6 KDS events: `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`.
- `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts`
  - Subscribes Redis pattern `realtime:kds:*` and forwards `kds.queue_changed` payloads to `events.kdsQueueChanged`.
- `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`
  - Consumes `kitchen.sla_warning` and forwards it to `events.kitchenSlaWarning`.
  - It still does not bridge `order.confirmed` to customer tracking or future `payment.completed`.
- `apps/bff/src/main.ts`
  - Registers `RedisIoAdapter` before `app.listen`, matching the Step 2.6 Redis Adapter contract.
- `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`
  - KDS REST endpoints exist for queue snapshot, start, done, recall, and priority.
  - `done` calls Kitchen first, then Order `MARK_ITEMS_READY`, then emits `events.kitchenItemReady` only after Order succeeds.
- `libs/shared/types/src/lib/kds.types.ts`
  - Canonical KDS types exist for `KdsQueueSnapshot`, `KdsQueueChangedEvent`, `KitchenItemReadyEvent`, and `KitchenSlaWarningEvent`.

### 1.3 Frontend realtime currently in code

- Customer PWA:
  - `apps/customer-pwa/src/components/layout/mobile-shell.tsx` mounts `useCustomerOrderRealtime()`.
  - `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts` creates a Socket.IO client directly inside the hook.
  - It connects to `/orders`, but sends no `auth` payload and no tenant/session handshake data.
  - On `connect`, it emits legacy `join.session`, which current BFF now rejects.
  - It listens for `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.billRequested`, and `events.tableTransferred`.
  - It does not listen for `events.kitchenItemReady`, menu events, disconnect/reconnect events, or `events.authError`.
- Management App POS:
  - `apps/management-app/src/components/pos/pos-app-shell.tsx` mounts `useStaffOrderRealtime()`.
  - `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts` creates a Socket.IO client directly inside the hook.
  - It connects to `/orders`, but does not pass `auth.token`, `Authorization`, or `x-tenant-id`.
  - On `connect`, it emits legacy `join.staff`, which current BFF now rejects.
  - It listens for `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, and `events.tableTransferred`.
  - It does not listen for `events.kitchenItemReady`, menu events, disconnect/reconnect events, or `events.authError`.
- Management App KDS:
  - `apps/management-app/src/components/kds/kds-board.tsx` now has real KDS mode behind `NEXT_PUBLIC_KDS_MOCK !== '1'`.
  - Real mode uses `useKdsQueue(station)` for BFF REST snapshot and `useKdsRealtime(station)` for Socket.IO invalidation.
  - `apps/management-app/src/features/kds/services/kds.service.ts` calls BFF KDS REST endpoints for queue/start/done/recall/priority.
  - `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts` sends staff token via Socket.IO `auth.token`, listens to KDS events, and invalidates `kdsKeys.queue(tenantId, station)`.
  - KDS mutations in `KdsBoard` are strict refetch-after-mutation: start/done/recall invalidate the queue on success; failures show toast errors.
  - Mock mode still exists through `useFakeRealtime(enabled)`, `useMockStore`, and `NEXT_PUBLIC_KDS_MOCK`.

### 1.4 Query / polling currently in code

- Management orders:
  - `apps/management-app/src/features/order/hooks/use-order-query.ts`
  - Order list polls every 3s for pending/unfiltered lists and 5s otherwise.
  - Order detail polls every 4s until terminal statuses.
- Management service requests:
  - `apps/management-app/src/features/service-requests/hooks/use-service-request-query.ts`
  - Service request list polls every 3s.
- Management KDS:
  - `apps/management-app/src/features/kds/hooks/use-kds-queue.ts`
  - KDS query key is `kdsKeys.queue(tenantId, station)`.
  - `staleTime` is `0`; there is no `refetchInterval` fallback.
  - `useKdsRealtime()` invalidates on `connect`, `events.kdsQueueChanged`, `events.kitchenItemReady`, and `events.kitchenSlaWarning`.
- Customer order domain:
  - `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
  - No polling; relies on mutations and realtime invalidation.
- Customer menu:
  - `apps/customer-pwa/src/features/menu/hooks/use-menu-query.ts`
  - Public menu key is `customerMenuKeys.fullMenu(tenantId)`, `staleTime = 5 minutes`, no realtime listener.
- Management menu:
  - `apps/management-app/src/features/menu/hooks/use-menu-query.ts`
  - Keys are `menuKeys.categories()`, `menuKeys.items(categoryId)`, and `menuKeys.item(id)`, no realtime listener.

### 1.5 Mock / fake realtime still present

- `apps/management-app/src/mocks/use-fake-realtime.ts`
  - Now accepts `enabled = true`; KDS live mode passes `false`.
  - Still synthesizes order/service/status events when mock mode is enabled.
- `apps/customer-pwa/src/mocks/use-fake-realtime.ts`
  - Still synthesizes order status changes and local `MenuItemStockChangedEvent`.
  - The file explicitly says local menu stock pushes are not aligned with BFF Direct WebSocket.
- `apps/management-app/src/components/kds/kds-batching-panel.tsx`
  - Still aggregates tickets by `menuItemName`, labels the panel "Batching", and is rendered in both mock and live KDS paths because `KdsBoard` passes live `tickets={kdsTickets}`.
  - This is the largest remaining mismatch with the Step 2.6 no-batching policy.

## 2. Realtime Event Contract Audit

Legend:

- A = Backend currently emits in code.
- B = Step 2.6 spec/plan says it should emit.
- C = Phase doc says it, but contract is not fully settled.
- D = FE currently mocks/fakes/infers it.
- F = FE has a real listener/invalidation path.
- E = No meaningful trace found.

| Event                                        | Classification | Evidence / notes                                                                                                                                                                                                                        |
| -------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events.cartUpdated`                         | A, B, F        | BFF emits in `RealtimeEventsService`; customer/staff order controllers call it. Customer PWA listens and invalidates cart/bill/order queries. Management POS does not listen directly.                                                  |
| `events.orderCreated`                        | A, B, D, F     | BFF emits in customer submit flow. Customer PWA and Management POS listen. Management mock realtime still synthesizes order-created behavior when mock mode is enabled.                                                                 |
| `events.orderStatusChanged`                  | A, B, D, F     | BFF emits in order controller flows and KDS done sync path. Customer PWA and Management POS listen. PWA and Management mock realtime still synthesize status movement in mock paths.                                                    |
| `events.serviceRequested`                    | A, B, D, F     | BFF emits in service request paths. Management POS listens. Management mock realtime still synthesizes service requests.                                                                                                                |
| `events.billRequested`                       | A, B, F        | BFF emits; Customer PWA listens. Management POS bill surfaces still do not have a WS listener for this event.                                                                                                                           |
| `events.tableTransferred`                    | A, B, F        | BFF emits after staff transfer flow. Customer PWA and Management POS listen and invalidate broad session/POS state.                                                                                                                     |
| `events.kdsQueueChanged`                     | A, B, D, F     | Kitchen Redis Pub/Sub -> BFF -> WS exists. Management KDS real hook listens and invalidates `kdsKeys.queue(...)`. Mock mode still derives local KDS changes when enabled.                                                               |
| `events.kitchenItemReady`                    | A, B, D, F     | BFF emits only after Kitchen ready and Order readiness update succeed. Management KDS real hook listens and invalidates KDS queue, but Customer PWA and Management POS do not listen directly. Mock status flows still infer readiness. |
| `events.kitchenSlaWarning`                   | A, B, D, F     | Kafka `kitchen.sla_warning` -> BFF Kafka bridge -> WS exists. Management KDS real hook listens and invalidates KDS queue. KDS UI still computes local SLA watch in `KdsBatchingPanel`.                                                  |
| `events.menuUpdated` / `events.menu.updated` | C, D, E        | Phase doc mentions `menu.updated`, but code search found no backend emitter, no shared type, and no FE listener. PWA mock local `MenuItemStockChangedEvent` is not a backend contract.                                                  |

## 3. Conflict & Blind Spots

### 3.1 Customer PWA and Management POS still conflict with hardened BFF handshake

- BFF room assignment is server-managed.
- Customer PWA still emits `join.session` after `connect`.
- Management POS still emits `join.staff` after `connect`.
- Current BFF gateway rejects both legacy join events with `events.authError`.
- Result: POS and PWA sockets can connect but will not join useful rooms under the hardened gateway.

### 3.2 KDS realtime handshake is ahead of POS/PWA, but still incomplete

- `useKdsRealtime()` correctly passes staff token through `auth.token`, matching Context7 Socket.IO Client docs and current BFF auth code.
- It does not send `x-tenant-id`; current BFF can derive tenant from JWT, so this is acceptable if all staff JWTs include `tenant_id`.
- It does not listen for `events.authError`, `disconnect`, `reconnect_error`, or manager-level `socket.io.on('reconnect')`.
- It invalidates on `connect`, which covers initial connect and reconnect per Socket.IO docs, but it does not expose reconnect UI state.

### 3.3 KDS event filters are too broad for multi-station / management-room traffic

- `useKdsRealtime()` filters `events.kdsQueueChanged` by `tenantId`, but not by `station`.
- It does not filter `events.kitchenItemReady` or `events.kitchenSlaWarning` by tenant or station.
- Because BFF emits KDS queue changes to `tenant:{tid}:management`, OWNER/MANAGER KDS pages may receive both KITCHEN and BAR queue-change hints and invalidate the current station unnecessarily.
- Because every staff socket also joins `tenant:{tid}:staff`, KDS sockets may receive staff-wide `events.kitchenItemReady` and invalidate even when the event is not for the current station.
- This is not a data isolation bug if REST snapshots remain guarded, but it is noisy and can cause avoidable refetches.

### 3.4 KDS live path still renders a batching UI

- Step 2.6 explicitly forbids batching/gathering same menu items across tables.
- `KdsBatchingPanel` aggregates active tickets by `menuItemName`, displays totals and table counts, and is rendered with live REST data.
- This is now more than a mock-only concern; it is a Step 2.7 acceptance risk.

### 3.5 KDS snapshot behavior is implemented, but revision policy is not

- `useKdsQueue()` fetches REST snapshots and `useKdsRealtime()` invalidates that snapshot.
- `KdsQueueChangedEvent` includes `revision`, and `KdsQueueSnapshot` includes `revision` and `serverTime`.
- FE does not track last revision or detect revision gaps.
- Current behavior is safe because every event invalidates the snapshot, but the final spec should state whether revision-gap detection is required or whether "always refetch on hint" is sufficient for Step 2.7.

### 3.6 KDS action UX is strict refetch-after-mutation

- `KdsBoard` uses mutations for start/done/recall and invalidates queue on success.
- There is no full optimistic queue movement in live mode.
- This matches the safer Step 2.6 principle that REST snapshot is source of truth, especially for `done`, which depends on Kitchen + Order success.
- Remaining UX gap: pending buttons/drag state are not clearly specified in the audit/spec yet.

### 3.7 `menu.updated` remains ambiguous and unimplemented

- Phase doc mentions menu realtime refresh.
- Step 2.6 event table does not finalize a menu WS event.
- BFF catalog controllers currently invalidate cache keys such as `menu:{tenantId}` but do not emit a realtime event.
- No FE menu hook listens for menu events.

### 3.8 BFF Kafka bridge remains narrower than phase wording

- Phase doc mentions `order.confirmed -> session:{sid}:customer`, `kitchen.sla_warning -> management`, and future `payment.completed`.
- Current BFF bridge consumes only `kitchen.sla_warning`.
- Step 2.7 should treat customer order tracking as BFF Direct + REST snapshot invalidation unless another bridge is explicitly added later.

### 3.9 Polling reduction should be domain-specific

- KDS live mode currently has no polling fallback.
- POS orders and service requests still poll aggressively.
- Customer PWA has no polling and currently cannot join the hardened socket room.
- Reducing polling before POS/PWA handshakes are fixed would increase stale UI risk.

## 4. Proposed FE Realtime Architecture Refresh

### 4.1 Socket client / factory placement

Recommended Step 2.7 spec direction:

- Keep per-app socket factories/hooks for Step 2.7:
  - Customer PWA and Management App have different credential sources.
  - Management KDS already has a domain hook; POS can be aligned with the same auth pattern.
- Management App:
  - Reuse the KDS handshake pattern (`auth.token`) for `useStaffOrderRealtime()`.
  - Stop using `join.staff`.
  - Add common handling for `events.authError`, disconnect/reconnect state, and manager-level reconnect events.
- Customer PWA:
  - Stop using `join.session`.
  - Decide whether customer identity is canonical via Socket.IO `auth: { tenantId, sessionId }`, headers, or transitionally both.
  - BFF currently supports headers, not `auth` for customer session.
- KDS:
  - Keep `useKdsQueue()` and `useKdsRealtime()` as the real station boundary.
  - Add station/tenant filtering before invalidating.
  - Decide whether KDS needs a slow active polling fallback.

### 4.2 Event-to-query invalidation matrix

| Event                                        | App / page                   | Query key or domain                                                                | Current code                                                                     | Recommended Step 2.7 action                                                                        |
| -------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `events.cartUpdated`                         | Customer PWA                 | `cartKeys.snapshot(tenantId, sessionId)`, `billKeys.current(...)`, `orderKeys.all` | Listener exists, but socket join is broken under hardened BFF.                   | Fix handshake, then immediate invalidate active queries.                                           |
| `events.orderCreated`                        | Customer PWA                 | `orderKeys.list(...)`, `orderKeys.detail(..., orderId)`, cart/bill scope           | Listener exists, but socket join is broken.                                      | Fix handshake; detail/list invalidation remains correct.                                           |
| `events.orderCreated`                        | Management POS               | `orderKeys.lists()`, `orderKeys.details()`, `tableKeys.all`                        | Listener exists, but socket join is broken. Polling still covers it.             | Fix staff auth handshake; keep polling fallback initially.                                         |
| `events.orderStatusChanged`                  | Customer PWA                 | `orderKeys.detail(...)`, `orderKeys.list(...)`, maybe `billKeys.current(...)`      | Listener exists, but socket join is broken.                                      | Fix handshake; invalidate snapshot, optional lightweight visible status patch only.                |
| `events.orderStatusChanged`                  | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`, `tableKeys.all`                  | Listener exists, but socket join is broken. Polling still covers it.             | Fix staff auth handshake; invalidate active queries.                                               |
| `events.serviceRequested`                    | Management POS/service inbox | `serviceRequestKeys.lists()`                                                       | Listener exists, but socket join is broken. Separate query still polls every 3s. | Fix staff auth handshake; reduce polling only after WS smoke passes.                               |
| `events.billRequested`                       | Customer PWA                 | `billKeys.current(...)`, `cartKeys.snapshot(...)`, `orderKeys.all`                 | Listener exists, but socket join is broken.                                      | Fix handshake; immediate invalidate.                                                               |
| `events.tableTransferred`                    | Customer PWA                 | session-scoped order/cart/bill keys                                                | Listener exists, but socket join is broken.                                      | Fix handshake; snapshot remains source of truth for table labels.                                  |
| `events.tableTransferred`                    | Management POS/table map     | `orderKeys.lists()`, `serviceRequestKeys.lists()`, `tableKeys.all`                 | Listener exists, but socket join is broken.                                      | Fix handshake; immediate invalidate.                                                               |
| `events.kdsQueueChanged`                     | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                 | Real listener exists and invalidates queue.                                      | Keep REST snapshot refetch; add station filter and optional debounce.                              |
| `events.kitchenItemReady`                    | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                 | Real listener exists but ignores event tenant/station.                           | Filter event before invalidating, or remove listener if `events.kdsQueueChanged` is sufficient.    |
| `events.kitchenItemReady`                    | Customer PWA                 | `orderKeys.detail(...)`, `orderKeys.list(...)`                                     | No listener. Customer may still get `events.orderStatusChanged`.                 | Add listener if item-level ready UX is required; otherwise rely on order status event and refetch. |
| `events.kitchenItemReady`                    | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`                                   | No listener.                                                                     | Add listener only if POS needs item-ready freshness beyond `events.orderStatusChanged`.            |
| `events.kitchenSlaWarning`                   | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                 | Real listener exists but does not filter.                                        | Filter by tenant/station; snapshot `warningLevel` remains source of truth.                         |
| `events.menuUpdated` / `events.menu.updated` | Customer menu                | `customerMenuKeys.fullMenu(tenantId)`                                              | No backend/FE event.                                                             | Keep as open question; do not claim menu realtime until backend emitter exists.                    |
| `events.menuUpdated` / `events.menu.updated` | Management menu admin        | `menuKeys.all`                                                                     | No backend/FE event.                                                             | Same as above.                                                                                     |

### 4.3 Reconnection and state sync policy

Recommended spec position:

- Reconnect must trigger snapshot refetch for the active domain.
- For KDS, the current `connect` listener already invalidates after reconnect because Socket.IO fires `connect` again after reconnect.
- Still add explicit manager-level reconnect/error handling in final spec for UI state:
  - `socket.io.on('reconnect')`: refetch active domain.
  - `socket.io.on('reconnect_error')`: mark degraded, avoid toast spam.
  - `socket.on('disconnect')`: show small non-blocking indicator.
  - `events.authError`: stop silent retry and show auth/session recovery.
- Do not rely on Socket.IO Redis Adapter replay; Step 2.6 has no durable WS replay.
- Use REST snapshots as source of truth:
  - Customer: order/cart/bill snapshots.
  - POS: orders/tables/service-request snapshots.
  - KDS: station queue snapshot.

### 4.4 Polling fallback policy

- POS orders: keep existing 3s/5s until `useStaffOrderRealtime()` is migrated to server-managed auth; then reduce to 10-15s active-route fallback.
- Service requests: keep 3s until `events.serviceRequested` smoke passes with the hardened staff socket; then reduce to 10-15s.
- KDS queue: current live mode has no polling fallback. Decide whether to add 10-15s active fallback for the first production-like phase.
- Customer PWA: no polling today. Do not add high-frequency polling; fix socket handshake first and consider a slow active tracking fallback only if needed.
- Menu: do not add polling just to simulate `menu.updated`; implement the backend event or leave current cache/staleTime behavior.

### 4.5 RBAC / room / tenant isolation

- Server-derived room assignment is now implemented in BFF and should remain source of truth.
- FE route/sidebar RBAC remains UX only.
- CHEF/BARISTA station access is enforced again at BFF REST through `KdsStationAccessService`.
- OWNER/MANAGER receive management room and can request station room via `subscribe.kds`.
- Customer sockets must never join tenant/staff/KDS/management rooms.
- Step 2.7 FE should only send identity/auth material, not room names.

### 4.6 UX state rules

- KDS live actions should remain strict refetch-after-mutation for done/recall/priority.
- Start can remain strict as implemented; optional pending affordance is fine, but not full optimistic source-of-truth movement.
- On API failure, keep previous snapshot, show one contextual error, and allow manual retry.
- KDS ticket slide-in animation should be based on snapshot diff by `ticketId`, not WS payload alone.
- SLA warning state should come from snapshot `warningLevel`; WS warning is a fast invalidation/alert hint.
- Deduplicate toasts by `eventId` or mutation `requestId` if item-ready/SLA toasts are introduced.

### 4.7 No batching / no routing hardcode

- FE must not batch, group, or aggregate KDS tickets as a workflow concept.
- FE must not infer KITCHEN/BAR routing from item name/category.
- KDS display must use backend `station` and ticket data.
- Current `KdsBatchingPanel` must be removed, renamed/reworked into non-grouping SLA/watchlist behavior, or gated to mock-only before Step 2.7 can be considered aligned.

## 5. Open Questions

### Q1. Should `menu.updated` be implemented in Step 2.7 or deferred?

- Option A: Implement backend menu event now.
  - Trade-off: Meets phase wording, but requires Catalog/BFF event work.
- Option B: Defer backend event and document a future-ready FE hook contract.
  - Trade-off: Honest about current code, but Step 2.7 cannot claim instant menu refresh.
- Option C: Keep current cache/mutation-only behavior.
  - Trade-off: Lowest risk, not realtime.

Recommendation: Option B unless backend Catalog event emission is explicitly in scope now.

### Q2. Should POS live orders keep polling fallback?

- Option A: Keep current 3s/5s until staff socket auth is fixed.
- Option B: Reduce to 10-15s after realtime smoke passes.
- Option C: Disable polling when socket connects.

Recommendation: Option A now, then Option B after `useStaffOrderRealtime()` migrates off `join.staff`.

### Q3. Is current KDS strict refetch-after-mutation policy accepted?

- Option A: Accept current strict policy for start/done/recall/priority.
- Option B: Add optimistic start only.
- Option C: Full optimistic board movement.

Recommendation: Option A for Step 2.7; revisit optimistic start later.

### Q4. Should KDS keep `KdsBatchingPanel` in live mode?

- Option A: Remove it from live mode.
- Option B: Rework it into a non-grouping SLA/watchlist panel.
- Option C: Keep it only under `NEXT_PUBLIC_KDS_MOCK=1`.

Recommendation: Option B if the right rail is useful; otherwise Option C. Do not keep same-item aggregation in live mode.

### Q5. Should KDS realtime filter by station before invalidating?

- Option A: Filter every KDS event by tenant and station.
- Option B: Keep broad invalidation because REST snapshot is guarded.
- Option C: Filter only `events.kdsQueueChanged`; keep broad invalidation for SLA/ready.

Recommendation: Option A. It reduces noise and matches station-room semantics.

### Q6. What should customer socket handshake use?

- Option A: Browser Socket.IO extra headers (`x-tenant-id`, `x-session-id`) only.
- Option B: Socket.IO `auth: { tenantId, sessionId }` only.
- Option C: Support both in BFF during transition, then standardize on `auth`.

Recommendation: Option C, because BFF currently supports headers while Context7-confirmed client auth is the cleanest long-term browser pattern.

### Q7. On reconnect, refetch current route or whole active domain?

- Option A: Current route only.
- Option B: Active domain mounted in the app shell.
- Option C: Active and inactive cached domain queries.

Recommendation: Option B; use TanStack Query default active refetch behavior and avoid `refetchType: all` unless explicitly needed.

### Q8. Is Playwright E2E required?

- Option A: Full E2E across PWA -> POS -> KDS -> PWA ready.
- Option B: Unit/integration tests plus manual smoke.
- Option C: One thin Playwright golden path plus hook/unit tests and manual Redis/Kafka smoke.

Recommendation: Option C, especially for disconnect 10s -> reconnect -> snapshot refetch.
