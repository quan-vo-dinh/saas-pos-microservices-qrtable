# Step 2.7 FE↔BE Real-time Audit Report

> Scope: Business Logic / Architecture Analysis only. This report intentionally does not include an implementation plan.
>
> Reading basis: `docs/phases/phase-2b-kitchen-websocket.md`, `docs/specs/business-logic-step-2.6-spec.vi.md`, `docs/superpowers/plans/2026-05-07-step-2.6-kitchen-websocket.md`, `docs/architecture/permission-matrix.md`, and targeted code discovery under `apps/` and `libs/`.
>
> Important distinction: Step 2.6 appears to be actively in progress in the working tree. "Code currently has" below means the current local files at audit time, not a completed/merged Step 2.6 baseline.

## 1. Current State

### 1.1 Context7 documentation findings used in this audit

- Socket.IO Client docs from Context7 (`/websites/socket_io_v4_client-api`) confirm:
  - `io(".../namespace", { auth: { token } })` is the documented client pattern for namespace connection plus auth data.
  - `connect` fires on both initial connection and successful reconnection.
  - Manager-level reconnection events such as `reconnect`, `reconnect_attempt`, and `reconnect_error` are listened through `socket.io.on(...)`.
  - `socket.off(eventName, listener)` removes listeners.
  - Docs explicitly warn not to register other event handlers inside `connect`, because `connect` also fires after reconnect and can duplicate listeners.
- TanStack Query docs from Context7 (`/tanstack/query`) confirm:
  - `queryClient.invalidateQueries(...)` marks matching queries invalid and, by default, refetches active matching queries in the background.
  - `refetchType` can be `active`, `inactive`, `all`, or `none`; default is `active`.
  - `refetchInterval` keeps polling on a fixed timer while a query has an active observer, independent of `staleTime`.

### 1.2 Backend realtime contract currently in code

- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
  - Namespace is `/orders`.
  - `handleConnection()` now delegates handshake validation to `RealtimeAuthService` and joins only server-derived rooms.
  - Legacy `join.session` and `join.staff` still exist, but only emit `events.authError`; they no longer join client-supplied rooms.
  - `subscribe.kds` exists only for OWNER/MANAGER/SUPER_ADMIN station opt-in.
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
  - Staff token is read from `socket.handshake.auth.token` or `Authorization: Bearer`.
  - Staff rooms are derived from JWT roles: `tenant:{tid}:staff`, KDS station rooms for CHEF/BARISTA, and `tenant:{tid}:management` for SUPER_ADMIN/OWNER/MANAGER.
  - Customer connection currently requires `x-tenant-id` and `x-session-id` in handshake headers and validates session cache before joining `session:{sid}:customer`.
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - Emits direct Step 2.4 events: `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.billRequested`, `events.tableTransferred`.
  - Emits Step 2.6 KDS events: `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`.
- `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts`
  - Subscribes Redis pattern `realtime:kds:*` and forwards `kds.queue_changed` payloads to `events.kdsQueueChanged`.
- `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`
  - Consumes only `kitchen.sla_warning` and forwards to `events.kitchenSlaWarning`.
  - It does not currently bridge `order.confirmed` to customer tracking or future `payment.completed`.
- `apps/bff/src/main.ts`
  - Registers `RedisIoAdapter` before `app.listen`, matching Step 2.6 intended Redis Adapter direction.
- `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`
  - KDS REST endpoints exist for queue snapshot, start, done, recall, and priority.
  - `done` calls Kitchen first, then Order `MARK_ITEMS_READY`, then emits `events.kitchenItemReady` only after Order succeeds.
- `libs/shared/types/src/lib/kds.types.ts`
  - Canonical KDS types exist for `KdsQueueSnapshot`, `KdsQueueChangedEvent`, `KitchenItemReadyEvent`, and `KitchenSlaWarningEvent`.

### 1.3 Frontend realtime currently in code

- Customer PWA:
  - `apps/customer-pwa/src/components/layout/mobile-shell.tsx` mounts `useCustomerOrderRealtime()`.
  - `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts` creates a Socket.IO client directly inside the hook.
  - It connects to `/orders`, but sends no `auth` payload and no handshake tenant/session data.
  - On `connect`, it emits legacy `join.session`, which current BFF now rejects.
  - It listens for `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.billRequested`, and `events.tableTransferred`.
  - It does not listen for `events.kitchenItemReady`, `events.menuUpdated`, `events.menu.updated`, `disconnect`, `reconnect`, `reconnect_error`, or `events.authError`.
- Management App POS:
  - `apps/management-app/src/components/pos/pos-app-shell.tsx` mounts `useStaffOrderRealtime()`.
  - `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts` creates a Socket.IO client directly inside the hook.
  - It connects to `/orders`, but does not pass `auth.token`, `Authorization`, or `x-tenant-id`.
  - On `connect`, it emits legacy `join.staff`, which current BFF now rejects.
  - It listens for `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, and `events.tableTransferred`.
  - It does not listen for `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`, menu events, reconnect events, or auth errors.
- Management App KDS:
  - `apps/management-app/src/app/(kds)/kds/kitchen/page.tsx` and `/bar/page.tsx` render `KdsBoard`.
  - `apps/management-app/src/components/kds/kds-board.tsx` uses `useMockStore` and `useFakeRealtime`; it does not call BFF KDS REST and does not use Socket.IO invalidation.
  - `apps/management-app/src/components/kds/kds-batching-panel.tsx` groups active tickets by `menuItemName`, displays "Batching", and shows aggregate quantity/table counts. This is mock UI, but it conflicts with the Step 2.6 no-batching policy if carried forward.

### 1.4 Query / polling currently in code

- Management orders:
  - `apps/management-app/src/features/order/hooks/use-order-query.ts`
  - Order list polls every 3s for pending/unfiltered lists and 5s otherwise.
  - Order detail polls every 4s until terminal statuses.
- Management service requests:
  - `apps/management-app/src/features/service-requests/hooks/use-service-request-query.ts`
  - Service request list polls every 3s.
- Customer order domain:
  - `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
  - No polling; relies on query invalidation and mutations.
- Customer menu:
  - `apps/customer-pwa/src/features/menu/hooks/use-menu-query.ts`
  - Public menu key is `customerMenuKeys.fullMenu(tenantId)`, `staleTime = 5 minutes`, no realtime listener.
- Management menu:
  - `apps/management-app/src/features/menu/hooks/use-menu-query.ts`
  - Keys are `menuKeys.categories()`, `menuKeys.items(categoryId)`, and `menuKeys.item(id)`, no realtime listener.

### 1.5 Mock / fake realtime still present

- `apps/management-app/src/mocks/use-fake-realtime.ts`
  - Synthesizes `OrderCreatedEvent`, `ServiceRequestedEvent`, and `OrderStatusChangedEvent` on timers.
- `apps/customer-pwa/src/mocks/use-fake-realtime.ts`
  - Synthesizes order status changes and local `MenuItemStockChangedEvent`.
  - The file explicitly says it is local-only for mock stock pushes and not aligned with BFF Direct WebSocket.
- `apps/management-app/src/components/kds/kds-board.tsx`
  - Calls `useFakeRealtime()` and reads all KDS state from `useMockStore`.
- `apps/management-app/src/components/kds/kds-batching-panel.tsx`
  - Contains mock batching aggregation that must not become Step 2.7 behavior.

## 2. Realtime Event Contract Audit

Legend:

- A = Backend currently emits in code.
- B = Step 2.6 spec/plan says it should emit.
- C = Phase doc says it, but contract is not fully settled.
- D = FE currently mocks/fakes/infers it.
- E = No meaningful trace found.

| Event                                        | Classification | Evidence / notes                                                                                                                                                                                                                                                                                          |
| -------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events.cartUpdated`                         | A, B           | BFF emits in `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`; controllers call it in customer/staff order flows. Step 2.6 lists it as an existing direct event. Customer PWA listens; Management POS does not listen directly.                                                    |
| `events.orderCreated`                        | A, B, D        | BFF emits in `RealtimeEventsService`; customer submit flow calls it. Customer PWA and Management POS listen. Management fake realtime also synthesizes order-created behavior in `apps/management-app/src/mocks/use-fake-realtime.ts`.                                                                    |
| `events.orderStatusChanged`                  | A, B, D        | BFF emits in order controller flows and KDS done sync path. Customer PWA and Management POS listen. Both PWA and Management mock realtime synthesize status movement.                                                                                                                                     |
| `events.serviceRequested`                    | A, B, D        | BFF emits in service request paths. Management POS listens. Management fake realtime synthesizes service requests.                                                                                                                                                                                        |
| `events.billRequested`                       | A, B           | BFF emits; Customer PWA listens. Management POS has bill mock screens but no WS listener for this event.                                                                                                                                                                                                  |
| `events.tableTransferred`                    | A, B           | BFF emits after staff transfer flow. Customer PWA and Management POS listen and invalidate broad session/POS state.                                                                                                                                                                                       |
| `events.kdsQueueChanged`                     | A, B, D        | Step 2.6 spec says Kitchen internal Redis Pub/Sub `kds.queue_changed` becomes WS `events.kdsQueueChanged`. Code has `KdsInternalEventsSubscriber` and `RealtimeEventsService.emitKdsQueueChanged`. Management KDS still uses mock store/fake realtime instead of this event.                              |
| `events.kitchenItemReady`                    | A, B, D        | Step 2.6 spec says emit only after Kitchen ready and Order readiness update both succeed. Code does this in `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`. FE does not listen directly; mock realtime infers ready via `events.orderStatusChanged`-like local state.               |
| `events.kitchenSlaWarning`                   | A, B, D        | Step 2.6 spec maps Kafka `kitchen.sla_warning` to WS `events.kitchenSlaWarning`. Code has Kafka bridge and WS emitter. FE does not listen; KDS mock derives SLA warning from local timers/snapshot-like ticket data.                                                                                      |
| `events.menuUpdated` / `events.menu.updated` | C, D, E        | Phase doc says `menu.updated` should broadcast tenant-wide. Step 2.6 §7.6 does not include a canonical menu event in the event names table. Code search found no backend emitter, no shared type, and no FE listener. PWA mock has local `MenuItemStockChangedEvent`, but that is not a backend contract. |

## 3. Conflict & Blind Spots

### 3.1 FE join flow conflicts with hardened BFF handshake

- Step 2.6 intended contract and current BFF code now make room assignment server-managed.
- Current FE still emits `join.session` and `join.staff` after `connect`.
- In current BFF gateway, those legacy messages only return `events.authError`; they do not join rooms.
- Result: Customer PWA and Management POS realtime hooks will connect but not be subscribed to any useful room once the hardened gateway is running.

### 3.2 FE does not send Socket.IO auth/session handshake data

- Context7 confirms Socket.IO Client supports the `auth` option for namespace connection.
- BFF supports staff token via `socket.handshake.auth.token`.
- Management App already stores `accessToken` and `tenantId` in `apps/management-app/src/lib/auth/auth-store.ts`, but `useStaffOrderRealtime()` does not read or pass `accessToken`.
- Customer PWA has `sessionId` and `tenantId` in `SessionProvider`, but `useCustomerOrderRealtime()` does not pass them during handshake.
- BFF customer auth currently reads `x-tenant-id` and `x-session-id` headers; Step 2.7 should decide whether browser FE sends session data through `auth`, headers, or both.

### 3.3 Listener lifecycle is acceptable per instance, but reconnect handling is incomplete

- Both FE hooks create a new socket per mounted hook and disconnect it on cleanup, so React remount duplicate listeners are mostly contained.
- They do not call `socket.off(...)` for named listeners, but because the whole socket is disconnected, duplicate handler risk is low for the current shape.
- Context7 warning still matters: event handlers should not be registered inside `connect`. Current code only emits legacy join inside `connect`, so it avoids duplicate handler registration, but it also lacks reconnect snapshot refetch.
- No FE hook listens to `socket.io.on('reconnect')`, `socket.io.on('reconnect_error')`, `disconnect`, or `events.authError`.

### 3.4 Step 2.6 says WS events are hints; current FE sometimes treats events as broad invalidation, but KDS has no snapshot hook

- Customer and staff hooks invalidate React Query state on direct events, which matches the "hint, not source of truth" principle.
- KDS is still mock-only and has no `useKdsQueue` / `useKdsRealtime` hook in code.
- Step 2.6 KDS snapshot includes `revision` and `serverTime`, but FE has no revision-gap logic yet.

### 3.5 KDS mock UI conflicts with no-batching policy

- Step 2.6 spec bans batch queue, batch item group, grouped KDS row, and same-item aggregation.
- `apps/management-app/src/components/kds/kds-batching-panel.tsx` aggregates tickets by `menuItemName`, shows quantity and table count, and labels the panel "Batching".
- Even if it is mock UI, it is a blind spot for Step 2.7 because it can silently preserve a user-facing batching concept.

### 3.6 FE routing/RBAC is coarse and does not replace API or WS authorization

- `docs/architecture/permission-matrix.md` says BFF is source of truth with `UserGuard -> TenantGuard -> PermissionGuard`.
- Management route/sidebar RBAC is role-prefix UX only.
- `apps/management-app/src/lib/auth/role-routing.ts` routes CHEF to `/kds/kitchen`, BARISTA to `/kds/bar`, and OWNER/MANAGER to dashboard with KDS access.
- BFF station access is stricter in `apps/bff/src/app/modules/kitchen/services/kds-station-access.service.ts`, which is correct. FE must not infer station permission as a security boundary.

### 3.7 `menu.updated` is ambiguous

- Phase doc says `menu.updated` should broadcast all tenant rooms.
- Step 2.6 spec event table does not finalize `events.menuUpdated` or `events.menu.updated`.
- Code has no backend emitter/listener/type for either spelling.
- Existing event naming convention in code is Socket.IO event name `events.camelCase` with payload `eventType` as domain dot-case for newer KDS events. Final spec should explicitly choose this mapping if menu refresh is in Step 2.7.

### 3.8 BFF Kafka bridge coverage is narrower than the phase doc

- Phase doc says the Kafka bridge handles `order.confirmed -> session:{sid}:customer`, `kitchen.sla_warning -> management`, and future `payment.completed -> customer`.
- Current code only consumes `kitchen.sla_warning`.
- This may be acceptable while Step 2.6 is still in progress, but Step 2.7 should not assume `order.confirmed` Kafka fan-out exists unless verified.

### 3.9 Realtime infrastructure can become a boot-time hard dependency

- `apps/bff/src/main.ts` awaits Redis adapter connection before listening.
- `RealtimeKafkaBridgeService.onModuleInit()` awaits Kafka consumer connection/run.
- That matches the intended realtime platform, but there is no documented degraded mode if Redis/Kafka are unavailable. FE must still handle disconnected/reconnecting states gracefully.

## 4. Proposed FE Realtime Architecture

### 4.1 Socket client / factory placement

Recommended shape for Step 2.7 spec:

- Keep a small per-app socket factory first, not a shared Nx lib yet.
  - Customer PWA and Management App have different auth/session sources.
  - Shared code can be limited to event constants/types once the contract stabilizes.
- Customer PWA factory:
  - Connects to `${BFF_ORIGIN}/orders`.
  - Sends tenant/session identity at handshake using the final agreed contract.
  - Handles `connect`, `disconnect`, `events.authError`, and manager-level reconnect events.
- Management App factory:
  - Connects to `${BFF_ORIGIN}/orders`.
  - Sends staff token via `auth.token` and tenant context as agreed.
  - Supports `subscribe.kds` only for OWNER/MANAGER/SUPER_ADMIN station opt-in.
- Hook boundaries:
  - `useCustomerOrderRealtime`: customer session/order/cart/bill/menu invalidation.
  - `useStaffOrderRealtime`: POS live order, service request, table/bill invalidation.
  - `useKdsRealtime`: station queue invalidation and reconnect snapshot refetch.
  - Do not create multiple sockets for unrelated widgets on the same app shell unless the lifecycle is intentionally scoped.

### 4.2 Event-to-query invalidation matrix

| Event                                         | App / page                                                 | Query key or domain                                                                | Action                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `events.cartUpdated`                          | Customer PWA cart/menu/order shell                         | `cartKeys.snapshot(tenantId, sessionId)`, `billKeys.current(...)`, `orderKeys.all` | Immediate invalidate active queries. Cache update may be safe only for cart snapshot if payload remains complete.                          |
| `events.orderCreated`                         | Customer PWA order tracking                                | `orderKeys.list(...)`, `orderKeys.detail(..., orderId)`, cart/bill scope           | Immediate invalidate. Detail may be fetched directly if route needs it.                                                                    |
| `events.orderCreated`                         | Management POS `/pos`                                      | `orderKeys.lists()`, `orderKeys.details()`, `tableKeys.all`                        | Immediate invalidate. UI "slides in" should be derived from snapshot diff, not event payload alone. Keep polling fallback initially.       |
| `events.orderStatusChanged`                   | Customer order tracking                                    | `orderKeys.detail(...)`, `orderKeys.list(...)`, maybe `billKeys.current(...)`      | Immediate invalidate. Lightweight cache patch is allowed only for visible status chip while refetch is pending.                            |
| `events.orderStatusChanged`                   | Management POS                                             | `orderKeys.lists()`, `orderKeys.detail(orderId)`, `tableKeys.all`                  | Immediate invalidate. Do not trust event as full order source.                                                                             |
| `events.serviceRequested`                     | Management service inbox / POS side panels                 | `serviceRequestKeys.lists()`                                                       | Immediate invalidate. Polling fallback can be slowed after WS is reliable.                                                                 |
| `events.billRequested`                        | Customer current bill / cart lock                          | `billKeys.current(...)`, `cartKeys.snapshot(...)`, `orderKeys.all`                 | Immediate invalidate.                                                                                                                      |
| `events.billRequested`                        | Management POS bills/payment surfaces if real query exists | Bill/current-payment domain query keys                                             | Keep as proposed future mapping; do not fake if no real query exists.                                                                      |
| `events.tableTransferred`                     | Customer PWA                                               | session-scoped order/cart/bill keys                                                | Immediate invalidate; snapshot is source of truth for table labels.                                                                        |
| `events.tableTransferred`                     | Management POS/table map                                   | `orderKeys.lists()`, `serviceRequestKeys.lists()`, `tableKeys.all`                 | Immediate invalidate.                                                                                                                      |
| `events.kdsQueueChanged`                      | Management KDS station page                                | Proposed `kdsQueueKeys.queue(station)`                                             | Required snapshot refetch. Debounce 250-500ms for bursts. Use `revision` gap to force refetch.                                             |
| `events.kitchenItemReady`                     | Customer order tracking                                    | `orderKeys.detail(...)`, `orderKeys.list(...)`, maybe `billKeys.current(...)`      | Immediate invalidate. Toast only once per `eventId`.                                                                                       |
| `events.kitchenItemReady`                     | Management POS                                             | `orderKeys.lists()`, `orderKeys.detail(orderId)`                                   | Immediate invalidate. KDS queue should already refresh from `events.kdsQueueChanged`; do not locally mark KDS state ready from this event. |
| `events.kitchenSlaWarning`                    | Management KDS / management overview                       | `kdsQueueKeys.queue(station)`                                                      | Refetch snapshot, optionally show deduped alert from payload. Snapshot `warningLevel` remains source of truth.                             |
| `events.menuUpdated` or `events.menu.updated` | Customer public menu                                       | `customerMenuKeys.fullMenu(tenantId)`                                              | If event is implemented, invalidate active menu query immediately. Do not mutate menu cache from a partial event.                          |
| `events.menuUpdated` or `events.menu.updated` | Management menu admin                                      | `menuKeys.all`                                                                     | If event is implemented, invalidate menu categories/items/detail keys. Local mutation invalidations stay for same-tab writes.              |

### 4.3 Reconnection and state sync policy

Recommended spec position:

- Any reconnect after a disconnect, tab sleep, VPN flap, or background wake must trigger snapshot refetch for the active app domain.
- Because Socket.IO `connect` fires after reconnect, the socket layer can set "connected" state there, but manager-level `socket.io.on('reconnect')` is clearer for reconnect-specific refetch.
- Do not rely on Socket.IO Redis Adapter replay; Step 2.6 explicitly says no durable WS packet replay.
- Use event `revision` only to detect KDS gaps; on gap, refetch KDS snapshot.
- Keep reconnect UI state separate from data:
  - connected: normal.
  - disconnected/reconnecting: show small non-blocking indicator.
  - auth error: show session/auth recovery state and stop silent retries if the server rejected credentials.
- On reconnect:
  - Customer order route: refetch order detail/list, current cart, current bill.
  - Customer menu route: refetch menu only if menu event support is finalized or if the route is active and stale.
  - Staff POS: refetch orders, current selected order, tables, service requests, and bill/payment query if mounted.
  - KDS: refetch current station queue snapshot and replace local queue state.

### 4.4 Polling fallback policy

- Keep polling while Step 2.6/2.7 contracts are still being integrated.
- Do not disable polling for a domain until both backend event emission and FE handshake/listener behavior are verified.
- Suggested transitional stance:
  - POS order list: keep existing 3s/5s until WS auth is fixed; then reduce to 10-15s or active route only.
  - POS order detail: keep 4s while detail panel is open; later reduce or rely on event invalidation plus reconnect refetch.
  - Service requests: keep 3s until `events.serviceRequested` is verified; then reduce to 10-15s.
  - KDS queue: when real query is added, use WS invalidation plus 10-15s active fallback until KDS Redis Pub/Sub path is proven.
  - Customer PWA order tracking: no polling required if socket auth/reconnect snapshot is reliable; consider a slow fallback only for visible active order tracking if restaurant ops need it.
  - Menu: do not add polling just to cover `menu.updated`; either implement backend event or keep current `staleTime` and mutation-driven invalidation.

### 4.5 RBAC / room / tenant isolation

- Server must decide rooms.
- FE must not send trusted `tenantId`, `sessionId`, or station room as a room name.
- `subscribe.kds` is acceptable only as a request for management station visibility; server validates OWNER/MANAGER/SUPER_ADMIN.
- CHEF and BARISTA should receive only their station room by server-derived role.
- OWNER/MANAGER get management room and may opt into station rooms.
- Customer sockets must only join `session:{sid}:customer` after session validation and must never receive `tenant:{tid}:staff`, KDS, or management rooms.
- Management route/sidebar role routing is necessary UX, but API/WS authorization must remain the source of truth.

### 4.6 UX state rules

- KDS start/done/recall/priority should treat REST snapshot as source of truth.
- Optimistic UI should be limited to disabled buttons, pending spinners, and local affordances while mutation is in flight.
- Done must be strict: if Order readiness sync fails, backend compensates recall and FE must refetch rather than assume ready.
- API failure:
  - keep previous snapshot;
  - show one contextual error;
  - refetch active snapshot after failure if state may have changed server-side.
- Offline/reconnecting:
  - show a small indicator;
  - do not spam toasts on every reconnect attempt;
  - dedupe operation/event toasts by `eventId`, `revision`, or mutation `requestId`.
- KDS "slides in" animation should be based on snapshot diff by `ticketId`, not on WS event payload alone.
- SLA warning visual state should come from snapshot `warningLevel`; WS warning is a fast invalidation/alert hint.

### 4.7 Menu updated policy

- Backend currently has no finalized menu WS event.
- If Step 2.7 includes menu refresh, final spec should map:
  - domain event / payload `eventType`: `menu.updated`;
  - Socket.IO event name: likely `events.menuUpdated`, consistent with existing `events.camelCase` naming.
- If backend event is deferred, FE can expose future-ready listener shape in spec, but should not claim real-time menu refresh is complete.

### 4.8 No batching / no routing hardcode

- FE must not batch, group, or aggregate KDS tickets into a backend-like batch concept.
- FE must not route food/drink by category/name.
- KDS station display must use backend `station` and ticket data.
- Existing `KdsBatchingPanel` must not remain as Step 2.7 real KDS behavior under any name that implies grouping same items across tables.

## 5. Open Questions

### Q1. Should `menu.updated` be implemented in Step 2.7 or deferred?

- Option A: Implement a real backend-to-FE menu event now.
  - Trade-off: Meets Step 2.7 phase wording, but requires Catalog/BFF event source work outside current FE hooks.
  - Recommended if the backend team can expose it during Step 2.7.
- Option B: Defer real menu WS and write only a future-ready FE contract.
  - Trade-off: Avoids pretending an absent backend event exists, but Step 2.7 cannot claim "menu reflect instantly".
  - Recommended if Step 2.6 is still unstable.
- Option C: Use a local mutation-only invalidation policy for Management and current 5-minute `staleTime` for PWA.
  - Trade-off: Lowest risk, but not real-time.

Recommendation: Option A only if backend emitter is explicitly in scope; otherwise Option B with a clear "deferred backend event" note.

### Q2. Should POS live orders keep polling fallback, and at what interval?

- Option A: Keep current 3s/5s polling.
  - Trade-off: Safest during integration, but keeps unnecessary load after WS is working.
- Option B: Reduce to 10-15s active-route fallback after WS auth/listeners pass smoke.
  - Trade-off: Good balance between missed-event recovery and backend load.
- Option C: Disable polling once WS is connected.
  - Trade-off: Best load reduction, highest stale UI risk on missed events.

Recommendation: Option B after the hardened handshake is working; keep Option A until then.

### Q3. Should KDS actions be optimistic or strict refetch-after-mutation?

- Option A: Strict refetch after every KDS mutation.
  - Trade-off: Most consistent with Step 2.6 snapshot source of truth; less instant-feeling.
- Option B: Full optimistic movement between columns with rollback.
  - Trade-off: Snappier, but risky for done/recall because backend may compensate or reject.
- Option C: Hybrid: pending visual only for done/recall/priority, optional optimistic "start" affordance.
  - Trade-off: Keeps the common start action responsive without lying about readiness.

Recommendation: Option C, with "done" always strict because it depends on Kitchen + Order success.

### Q4. Should socket client be shared factory per app or a shared Nx lib?

- Option A: Per-app factory (`customer-pwa` and `management-app`) with shared event type imports.
  - Trade-off: Some duplication, but auth/session differences stay clear.
- Option B: Shared Nx realtime client lib.
  - Trade-off: Cleaner long term, but premature while handshake contract is still changing.
- Option C: One hook per domain without a factory.
  - Trade-off: Fastest locally, but duplicates connection rules and reconnect behavior.

Recommendation: Option A for Step 2.7; extract a shared lib only after the contract settles.

### Q5. On reconnect, should FE refetch current route/query or whole active domain?

- Option A: Current route only.
  - Trade-off: Minimal refetch, but background mounted panels can stay stale.
- Option B: Whole active domain for the mounted app shell.
  - Trade-off: More requests, but matches realtime user expectations and TanStack active-query behavior.
- Option C: Active and inactive domain queries.
  - Trade-off: Strongest cache freshness, but can create unnecessary load.

Recommendation: Option B; use TanStack invalidation defaults for active queries and avoid `refetchType: all` unless a route explicitly needs it.

### Q6. Is real Playwright E2E required, or are unit/integration + manual smoke enough?

- Option A: Full Playwright E2E for the whole customer -> POS -> KDS -> customer-ready flow.
  - Trade-off: Best regression coverage, highest setup cost.
- Option B: Unit/integration tests plus manual smoke.
  - Trade-off: Faster, but misses browser socket lifecycle and tab sleep/reconnect problems.
- Option C: Hybrid: one thin Playwright golden path plus hook/unit tests and manual Redis/Kafka smoke.
  - Trade-off: Practical coverage without trying to automate every restaurant workflow.

Recommendation: Option C, especially for disconnect 10s -> reconnect -> snapshot refetch.

### Q7. Should customer socket identity be sent through headers, `auth`, or both?

- Option A: Keep `x-tenant-id` and `x-session-id` headers only.
  - Trade-off: Matches current BFF code, but browser Socket.IO header behavior needs careful verification.
- Option B: Use Socket.IO `auth: { tenantId, sessionId }` only.
  - Trade-off: Aligns with Context7-confirmed `auth` option, but requires BFF customer auth update.
- Option C: Support both during transition, then settle on one canonical form.
  - Trade-off: Slightly broader server parsing, smoother migration.

Recommendation: Option C for Step 2.7, with final spec naming the canonical long-term form.
