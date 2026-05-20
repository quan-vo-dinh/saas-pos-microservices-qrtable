# Step 2.7 — Official FE↔BE Real-Time Specification

> **Phase:** 2B — Kitchen service + WebSocket Gateway
> **Step:** 2.7 — Real-time between Frontend and Backend
> **Date:** 2026-05-07
> **Status:** Finalized after audit Step 2.7 and decided Q1-Q8 of the project Owner.
> **Purpose:** This document is the technical/business contract specification for realtime FE↔BE. This is not a deployment plan and is not decomposed into task code.

---

## 0. Minutes of Decision

| Question | Decision        | Closing content                                                                                                                                                                                                    |
| -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1       | Option C        | Do not deploy `menu.updated`, `events.menu.updated`, `events.menuUpdated`, or `menuUpdated` in Step 2.7. The menu keeps the cache and invalidate mechanism after the current mutation; Do not claim realtime menu. |
| Q2       | As recommended  | POS live orders hold polling for 3s/5s until staff socket auth runs properly; After the quick realtime test passes, it is reduced to backup polling for 10-15 seconds, not turned off completely.                  |
| Q3       | As recommended  | KDS start/done/recall/priority uses strict refetch-after-mutation. Don't use optimistic movement as a source of truth.                                                                                             |
| Q4       | Follow Step 2.6 | Completely remove the order/order/batching feature for KDS/order/prep/ticket. Cart before submission is still increased by `quantity` for the same item/same note in the same session; This is not KDS batching.   |
| Q5       | As recommended  | Realtime KDS must filter all KDS events by `tenantId` and `station` before invalidating.                                                                                                                           |
| Q6       | As recommended  | Customer socket supports forwarding both headers and `auth`, then standardizes to Socket.IO `auth`.                                                                                                                |
| Q7       | As recommended  | Reconnect refetch active domain mounted in app shell; By default, the entire inactive cache is not refetched.                                                                                                      |
| Q8       | Option A        | Verification requires full E2E: PWA -> POS -> KDS -> PWA ready, including disconnect/reconnect.                                                                                                                    |

### 0.1 What Points Does This Document Override?

1. The old wording in the doc phase about the realtime menu is no longer the acceptance criteria of Step 2.7. `menu.updated` is not in the current scope.
2. All previous expressions regarding batching/collection/consolidation of orders are superseded by the No Consolidation Policy of this Step 2.6 and Step 2.7. This policy applies to bookings/orders/prep/tickets, does not prohibit combining cart lines with items before submitting.
3. FE cannot use `join.staff` or `join.session` as the join room mechanism. Room assignment must be inferred by the server.
4. WebSocket event is just an invalidate hint. The new REST snapshot/TanStack Query data is the source of truth for rendering UI after reconnection or missed events.

---

## 1. Document Base and Context7

### 1.1 Facility in Repo

- `docs/specs/business-logic-step-2.6-spec.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/architecture/permission-matrix.md`
- Current code in BFF, Customer PWA, Management App POS/KDS.

### 1.2 Context7 Results Used for Spec

- Socket.IO Client documentation from Context7 (`/websites/socket_io_v4_client-api`) confirms:
  - You can connect namespace using `io(".../namespace", { auth: { token } })`.
  - Event `connect` is fired at the first connection and after successful reconnection.
  - Do not register other listeners inside `connect`, because reconnecting can create duplicate listeners.
  - Use `socket.off(eventName, listener)` to cleanup specific listeners.
  - Manager events have `reconnect`, `reconnect_error`, `reconnect_failed`.
- TanStack Query documentation from Context7 (`/tanstack/query`) confirms:
  - `queryClient.invalidateQueries(...)` defaults to mark invalid and refetch active matching queries.
  - `refetchType` defaults to `active`.
  - `refetchInterval` is backup polling when the query is still an active observer.
  - Stale queries can refetch when network reconnects according to default behavior, but Step 2.7 still requires a separate socket reconnect policy.

---

## 2. Scope and Out of Scope

### 2.1 Within Step 2.7

1. Customer PWA realtime order/cart/bill/table tracking via namespace `/orders`.
2. Management App POS realtime live orders, service requests, bill requests, table transfer, and kitchen-ready hints via namespace `/orders`.
3. Management App KDS realtime invalidation + REST snapshot hybrid for station `KITCHEN` and `BAR`.
4. Socket auth/session contract for staff and customers.
5. Query invalidation matrix using TanStack Query.
6. UX rules for reconnect/offline/degraded state.
7. Backup polling policy after WS works properly.
8. Full E2E for flow PWA -> POS -> KDS -> PWA ready.

### 2.2 Out of Scope Step 2.7

1. Do not implement `events.menuUpdated`, `events.menu.updated`, or `menuUpdated`.
2. Do not add the Catalog realtime bridge backend for the menu.
3. No batching/collecting orders/collecting orders/orders/prep/tickets under any name.
4. Do not hard-code routing food/drink at FE by name/category.
5. Do not create a WebSocket mutation contract for KDS; KDS mutate via REST guarded endpoints.
6. Do not add durable WebSocket replay, Redis Stream replay, or mandatory client-side event log.
7. Do not rewrite the RBAC truth source on the frontend; FE RBAC is still just a navigation/UX guard.

---

## 3. Socket Namespace, Auth, Rooms

### 3.1 Official Namespace

Step 2.7 uses an existing namespace:

```txt
/orders
```

Do not create `/kds` in Step 2.7. KDS uses the same namespace `/orders`, distinguished by server-derived rooms and event filters.

### 3.2 Staff Socket Contract

Management App staff socket must send JWT via Socket.IO auth:

```ts
auth: {
  token: accessToken;
}
```

BFF can still support `Authorization: Bearer <jwt>` as in Step 2.6, but FE Step 2.7 uses `auth.token` as canonical because this is the clear and browser-compatible Socket.IO client pattern.

FE does not send room name. FE does not emit `join.staff`.

Server-derived staff rooms:

| Role    | Room                       |
| ------- | -------------------------- |
| WAITER  | `tenant:{tid}:staff`       |
| CHEF    | `tenant:{tid}:kds:kitchen` |
| BARISTA | `tenant:{tid}:kds:bar`     |
| OWNER   | `tenant:{tid}:management`  |
| MANAGER | `tenant:{tid}:management`  |

Owner/MANAGER can opt-in station via `subscribe.kds`, but this event is only used to request a station subscription that has been validated by the server. CHEF/BARISTA cannot subscribe to the other station.

### 3.3 Customer Socket Contract

During the transition phase of Step 2.7, the BFF must accept both forms:

```ts
auth: {
  (tenantId, sessionId);
}
```

and the legacy form currently supported by BFF:

```txt
x-tenant-id
x-session-id
```

FE Customer PWA must prioritize `auth: { tenantId, sessionId }`. Headers are just a compatibility fallback mechanism during the transition phase.

FE does not emit `join.session`. BFF validate session then join:

```txt
session:{sessionId}:customer
```

If the session expires/closed/invalid, the socket must receive `events.authError` or be disconnected for a recoverable reason. FE does not automatically create new sessions in WebSocket flow.

### 3.4 Listener Life Cycle

1. Listeners are registered once during the lifecycle of the hook/socket instance.
2. Do not register domain listeners inside `connect`.
3. Cleanup must call `socket.off(eventName, listener)` or disconnect the socket instance when unmounting.
4. Reconnect must not increase the number of listeners for the same event.
5. FE must listen at least:
   - `connect`
   - `disconnect`
   - `events.authError`
   - Manager `reconnect`
   - Manager `reconnect_error`
   - Manager `reconnect_failed`

---

## 4. Event Names and Payload Expectations

### 4.1 Official Event Registry for Step 2.7

| Events                      | Status in Step 2.7 | Source of truth after receipt                                                |
| --------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `events.cartUpdated`        | Use                | Customer/POS cart/bill/order snapshots                                       |
| `events.orderCreated`       | Use                | Customer/POS order snapshots                                                 |
| `events.orderStatusChanged` | Use                | Customer/POS order snapshots                                                 |
| `events.serviceRequested`   | Use                | service request snapshots                                                    |
| `events.billRequested`      | Use                | Bill/cart/order/POS service snapshots                                        |
| `events.tableTransferred`   | Use                | Session/POS/table snapshots                                                  |
| `events.kdsQueueChanged`    | Use                | KDS queue snapshot                                                           |
| `events.kitchenItemReady`   | Use                | Customer/POS order snapshots; KDS queue snapshot if event belongs to station |
| `events.kitchenSlaWarning`  | Use                | KDS queue snapshot                                                           |
| `events.menuUpdated`        | Do not use         | Not part of Step 2.7                                                         |
| `events.menu.updated`       | Do not use         | Not part of Step 2.7                                                         |
| `menuUpdated`               | Do not use         | Not part of Step 2.7                                                         |

### 4.2 Payload Expectations For Direct Order/Session Events

Direct events holds the existing type in `libs/shared/types/src/lib/realtime-events.types.ts`.

FE can only rely on the following fields to filter/invalidate:

| Events                      | Required fields FE needs to use                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `events.cartUpdated`        | `tenantId`, `sessionId`, `cartVersion`, `status`, `updatedAt`                                   |
| `events.orderCreated`       | `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, `items`, `totalAmount`, `timestamp` |
| `events.orderStatusChanged` | `tenantId`, `orderId`, `fromStatus`, `toStatus`, `timestamp`                                    |
| `events.serviceRequested`   | `tenantId`, `requestId`, `sessionId`, `tableId`, `tableName`, `type`, `timestamp`               |
| `events.billRequested`      | `tenantId`, `billId`, `sessionId`, `tableId`, `tableName`, `status`, `total`, `requestedAt`     |
| `events.tableTransferred`   | `tenantId`, `sessionId`, `fromTableId`, `toTableId`, `timestamp`                                |

Filtering rules:

1. Customer PWA must ignore events with `tenantId` or `sessionId` that do not match the current QR session.
2. Management App must ignore events with `tenantId` that do not match the current staff profile.
3. FE can lightly patch a visible status chip if the payload has enough data, but must still invalidate the related snapshot.

### 4.3 Payload Expectations For KDS Events

KDS events holds the existing type in `libs/shared/types/src/lib/kds.types.ts`.

#### `events.kdsQueueChanged`

Minimum fields:

```ts
{
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  revision: number;
  reason: string;
  ticketId?: string;
  orderId?: string;
  occurredAt: string;
  correlationId?: string;
}
```

FE action:

- Filter by `tenantId` and `station`.
- Invalidate `kdsKeys.queue(tenantId, station)`.
- Do not synthesize ticket lists from this event.

#### `events.kitchenItemReady`

Minimum fields:

```ts
{
  eventId: string;
  eventType: 'kitchen.item_ready';
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  orderId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  readyItems: Array<{
    orderItemId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    note?: string;
  }>;
  occurredAt: string;
  correlationId?: string;
}
```

FE action:

- Customer PWA: filter by `tenantId` + `sessionId`, invalidate order detail/list and current bill if currently displayed.
- Management POS: filter by `tenantId`, invalidate order list/detail for `orderId`.
- Management KDS: filter by `tenantId` + `station`; Only invalidate the KDS queue if it matches the current station.
- Do not create duplicate toasts when reconnecting/refetching.

#### `events.kitchenSlaWarning`

Minimum fields:

```ts
{
  eventId: string;
  eventType: 'kitchen.sla_warning';
  schemaVersion: 1;
  tenantId: string;
  ticketId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: 'KITCHEN' | 'BAR';
  level: 'WARNING' | 'BREACH';
  waitTimeSeconds: number;
  thresholdSeconds: number;
  occurredAt: string;
  correlationId?: string;
}
```

FE action:

- Only KDS handles: filter by `tenantId` + `station`, then invalidate `kdsKeys.queue(tenantId, station)`.
- Snapshot `warningLevel` is still the source of truth for display.
- `events.kitchenSlaWarning` is just a quick invalidate/alert hint, not a canonical SLA UI state.

---

## 5. Query Invalidation Matrix

TanStack Query invalidation must use default active refetch behavior unless the spec says otherwise.

| Events                      | App / page                   | Query key/domain                                                                                                       | Action                                                                       |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `events.cartUpdated`        | Customer PWA                 | `cartKeys.snapshot(tenantId, sessionId)`, `billKeys.current(tenantId, sessionId)`, `orderKeys.all`                     | Invalidate active queries now.                                               |
| `events.cartUpdated`        | Management POS               | `orderKeys.lists()`, `orderKeys.details()` if POS displays open cart                                                   | Optional; Only do it if the POS displays cart state.                         |
| `events.orderCreated`       | Customer PWA                 | `orderKeys.list(tenantId, sessionId)`, `orderKeys.detail(tenantId, sessionId, orderId)`, cart/bill domain              | Invalidate now; Animation based on snapshot diff after refetch.              |
| `events.orderCreated`       | Management POS               | `orderKeys.lists()`, `orderKeys.details()`, `tableKeys.all`                                                            | Invalidate now; new-order visual entry based on diff of list after refetch.  |
| `events.orderStatusChanged` | Customer PWA                 | `orderKeys.detail(tenantId, sessionId, orderId)`, `orderKeys.list(tenantId, sessionId)`, maybe `billKeys.current(...)` | Invalidate now; Just lightly patch the status chip if needed.                |
| `events.orderStatusChanged` | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`, `tableKeys.all`                                                      | Invalidate active list/detail now.                                           |
| `events.serviceRequested`   | Management POS/service inbox | `serviceRequestKeys.lists()`                                                                                           | Invalidate active service request lists immediately.                         |
| `events.billRequested`      | Customer PWA                 | `billKeys.current(tenantId, sessionId)`, `cartKeys.snapshot(...)`, `orderKeys.all`                                     | Invalidate now.                                                              |
| `events.billRequested`      | Management POS               | `serviceRequestKeys.lists()`, bill/payment domain if mounted, `orderKeys.lists()`                                      | Invalidate for bill-request surfaces.                                        |
| `events.tableTransferred`   | Customer PWA                 | Session-scoped cart/order/bill keys                                                                                    | Reetch snapshots now; table labels taken from snapshot.                      |
| `events.tableTransferred`   | Management POS               | `tableKeys.all`, `orderKeys.lists()`, `serviceRequestKeys.lists()`                                                     | Invalidate now.                                                              |
| `events.kdsQueueChanged`    | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                                                     | Filter tenant/station; invalidate queue.                                     |
| `events.kitchenItemReady`   | Customer PWA                 | `orderKeys.detail(...)`, `orderKeys.list(...)`, maybe `billKeys.current(...)`                                          | Filter tenant/session; invalidate order tracking.                            |
| `events.kitchenItemReady`   | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`                                                                       | Filter tenant; invalidate order snapshots.                                   |
| `events.kitchenItemReady`   | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                                                     | Filter tenant/station; only invalidate station matches.                      |
| `events.kitchenSlaWarning`  | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                                                     | Filter tenant/station; invalidate queue.                                     |
| Menu mutations              | Customer PWA                 | `customerMenuKeys.fullMenu(tenantId)`                                                                                  | No WS. Based on existing cache/staleTime and explicit mutation invalidation. |
| Menu mutations              | Management App               | `menuKeys.all`, `menuKeys.categories()`, `menuKeys.items(categoryId)`, `menuKeys.item(id)`                             | No WS. Based on existing invalid mutation.                                   |

---

## 6. Responsibilities of Frontend Hooks

### 6.1 General Principles

1. Hooks own socket lifecycle, event binding, cleanup, and query invalidation.
2. Hooks do not own domain rendering state other than connection/depletion state.
3. Hooks do not infer backend truth from event payload.
4. Hooks provide enough states for UI indicators: `connected`, `reconnecting`, `degraded`, `authError`.
5. Hooks dedupe noisy notifications according to `eventId` or local mutation `requestId`.

### 6.2 Boundary Of Customer PWA Hook

`useCustomerOrderRealtime()` responsibilities:

- Connect `/orders` to `auth: { tenantId, sessionId }`.
- Support redundant headers only during the transition period if BFF is still needed.
- Remove `join.session`.
- Listen:
  - `events.cartUpdated`
  - `events.orderCreated`
  - `events.orderStatusChanged`
  - `events.billRequested`
  - `events.tableTransferred`
  - `events.kitchenItemReady`
  - `events.authError`
  - socket/manager connection events
- Filter all payloads according to the current `tenantId` and `sessionId`.
- Refetch active order/cart/bill domain after reconnecting.

Customer PWA must not listen to KDS station queue events.

### 6.3 Boundary of Management POS Hook

`useStaffOrderRealtime()` responsibilities:

- Connect `/orders` to `auth: { token: accessToken }`.
- Remove `join.staff`.
- Listen:
  - `events.cartUpdated`
  - `events.orderCreated`
  - `events.orderStatusChanged`
  - `events.serviceRequested`
  - `events.billRequested`
  - `events.tableTransferred`
  - `events.kitchenItemReady`
  - `events.authError`
  - socket/manager connection events
- Filter all payloads according to the current `tenantId`.
- Invalidate POS order/table/service/bill domains according to matrix.
- Keep backup polling according to Section 8.

Management POS does not subscribe to KDS station rooms if it does not render the KDS station view.

### 6.4 Boundary of Management KDS Hooks

`useKdsQueue(station)` responsibilities:

- Fetch REST snapshot from BFF KDS endpoint.
- See `KdsQueueSnapshot` as the source of truth.
- Includes `tenantId`, `station`, `revision`, `serverTime`, and ticket list.

`useKdsRealtime(station)` responsibilities:

- Connect `/orders` to `auth: { token: accessToken }`.
- Listen:
  - `events.kdsQueueChanged`
  - `events.kitchenItemReady`
  - `events.kitchenSlaWarning`
  - `events.authError`
  - socket/manager connection events
- Filter all KDS-related events by `tenantId` and `station`.
- Invalidate `kdsKeys.queue(tenantId, station)` after matching hint.
- When reconnecting, invalidate active KDS queue snapshot.
- Owner/MANAGER station opt-in via `subscribe.kds` is only used when server validate station is requested.

### 6.5 Socket Factory Location

Step 2.7 keeps per-app socket factory/hook boundaries instead of immediately switching to a shared library.

Reason:

- Customer PWA uses session identity.
- Management App uses staff JWT identity.
- KDS needs station filtering and optional station manager subscription.
- Shared lib can be added after both apps have stable auth/error/reconnect semantics.

---

## 7. Reconnection and State Sync

### 7.1 Required Behavior

When initial connect and successful reconnect:

1. BFF re-authenticate the socket.
2. BFF rejoin server-derived rooms.
3. FE invalidate/refetch active domain mounted in app shell.
4. FE keeps the old snapshot during refetch.
5. FE replaces UI state with REST snapshot after successful refetch.

### 7.2 Active Domain Definition

Active domains are queries that have mounted observers in the current shell/page:

- Customer PWA shell: active cart/order/bill/session tracking queries.
- Management POS shell: active order/table/service/bill queries.
- Management KDS page: active station queue query.

By default, `refetchType: all` is not used. Inactive cached queries may remain invalid until the next mount.

### 7.3 Missed Events and Revision

- Socket.IO Redis Adapter does not provide replays.
- Any reconnect, sleep wake tab, VPN/network flap, or recovery after `reconnect_error` must result in a snapshot refetch.
- KDS can read `revision` in queue snapshots and queue hints.
- If FE tracks last KDS revision and detects a gap, must refetch snapshot.
- For Step 2.7, always-refetch-on-hint is enough even if there is no local revision-gap UI yet.

### 7.4 Degraded State

FE should display small realtime status, not block UI when:

- socket disconnected;
- reconnecting too a short grace window;
- `reconnect_error` repeat;
- receive `events.authError`.

`events.authError` cannot create a toast loop. It must switch the UI to a recoverable auth/session state: refresh token, prompt reload, or session expired depending on the app.

---

## 8. Polling Fallback Policy

### 8.1 Management POS

Before staff socket auth migration is verified:

- Keep the current 3s/5s order list polling.
- Keep order detail polling for 4s until terminal statuses.
- Keep service request polling for 3s.

After quick testing by real-time staff, we passed:

- Reduce active POS order/service polling to 10-15 seconds for backup.
- Only keep polling on the active route.
- Do not turn off polling completely in Step 2.7.

### 8.2 Management KDS

Primary path:

- WS hint -> invalidate -> REST snapshot.
- Mutation success -> invalidate -> REST snapshot.
- Reconnect -> invalidate -> REST snapshot.

Fallback:

- Do not use dense polling that always turns on when the socket is stable.
- If the socket is in disconnected/degraded state beyond the reconnection waiting period, KDS can use the active backup mechanism for 10-15 seconds until the reconnection is stable.
- Manual refresh must still exist.

### 8.3 Customer PWA

- Do not add high-frequency polling for order tracking.
- Use WS + REST snapshot invalidation.
- When the socket is degraded, manually refresh and rely on reconnect refetch.
- If testing similar to production shows that customer tracking is stale when mobile sleeps, a slow activation fallback mechanism can be added later, but is not the default in Step 2.7.

### 8.4 Menu

- There is no WS menu event.
- Do not add polling to simulate realtime menu.
- Customer menu keeps the current `customerMenuKeys.fullMenu(tenantId)` cache/staleTime behavior.
- Management menu keeps mutation-driven invalidation for `menuKeys.*`.

---

## 9. UX State Rules

### 9.1 KDS Actions

KDS live actions use strict refetch-after-mutation:

- Start ticket.
- Mark done/ready.
- Recall.
- Set/unset priority.

During mutation:

- Disable or show pending state only for related tickets/actions.
- Keep the previous queue snapshot.
- When success, invalidate `kdsKeys.queue(tenantId, station)`.
- On failure, keep the previous snapshot and show a contextual error.

Do not full optimistic board movement in Step 2.7.

### 9.2 Animation

- POS new-order slide-in must be based on the diff between previous and refetched order list, not on a single WS payload.
- KDS ticket slide-in must be based on diff according to `ticketId` from queue snapshot.
- Status transition effects on the customer timeline can use event hints to be faster, but the snapshot refetch is still the source of truth.

### 9.3 Offline/Reconnecting Indicator

Each app should display a small status, not block the UI:

- Connected.
- Reconnecting.
- Degraded/offline.
- Auth/session error.

This indicator must not block reading of existing snapshots. Mutations can be disabled when offline/auth invalid.

### 9.4 Toast Policy

- Do not toast any invalidation hints.
- Do not repeat item-ready/SLA toasts after reconnect and snapshot refetch.
- If adding toasts, dedupe according to `eventId`; mutation failures dedupe according to `requestId` when available.

---

## 10. POS, KDS, PWA Behavior

### 10.1 Customer PWA

Customers see:

- Cart/bill/order state update after session-scoped WS hints.
- Order timeline update after `events.orderStatusChanged`.
- Item-ready/order-ready refresh after `events.kitchenItemReady`.
- Table label/state refresh after `events.tableTransferred`.

Customer is not seen:

- Staff tenant events outside the current session.
- KDS station queue events.
- Menu realtime claim.

### 10.2 Management POS

POS sees:

- New orders from `events.orderCreated`.
- Status changes from `events.orderStatusChanged`.
- service requests from `events.serviceRequested`.
- Bill requests from `events.billRequested`.
- Table movement from `events.tableTransferred`.
- Kitchen item ready from `events.kitchenItemReady`.

POS must keep backup polling until real-time fast testing passes, then reduce it to 10-15 seconds.

### 10.3 Management KDS

KDS sees:

- Station queue snapshot from BFF REST.
- Queue invalidation hints from `events.kdsQueueChanged`.
- Item-ready and SLA hints only when matching current station.
- Priority/FIFO/recall state from snapshot.

KDS cannot:

- Collect the same dish between multiple tables/tickets.
- Display any item/order total.
- Automatically route dishes by inference based on item name or category in the frontend.
- Mutate KDS via WebSocket.

---

## 11. RBAC, Tenant Isolation, No Routing Hardcode

1. BFF is still the source of truth for protected REST permissions.
2. Frontend route/sidebar RBAC is still only at the UX level.
3. FE sends identity/auth material, not room names.
4. tenant isolation comes from BFF handshake + guarded REST snapshots.
5. Customer sockets never join tenant staff, management, or KDS rooms.
6. CHEF only sees/operates station `KITCHEN`.
7. BARISTA only sees/operates station `BAR`.
8. Owner/MANAGER can view/manipulate both stations and set priority.
9. FE must render KDS according to backend `station` and ticket payload.

---

## 12. No Consolidation Policy for FE

Step 2.7 completely inherits the decision not to collect items from Step 2.6 for KDS/order/prep/ticket.

This policy does not apply to pre-submitted Redis carts. In the cart of a `sessionId`, `ADD_ITEM` is allowed to increment `quantity` on the existing line when overlapping `menuItemId` and the same notes/options; This is shopping cart behavior, not KDS batching.

The following UI/FE concepts must not exist:

- Panel `Batching` as a business feature.
- Collect the same dish between multiple tickets/tables.
- Number of combined trans-single orders.
- Total number of items/orders collected.
- Click/focus on the group of dish names.
- Any KDS decision based on grouping according to `menuItemName`.
- Any DTO/cache/view-model that recreates the collection/order data stream.

Allowed:

- Render ticket items exactly as returned snapshot.
- Sort/filter tickets by station/FIFO/priority/status from backend data.
- Show SLA/watchlist if based on ticket, not based on same-item aggregation.

---

## 13. Menu Refresh Policy

Decision Q1 is Option C.

Step 2.7 does not work:

- `events.menuUpdated`
- `events.menu.updated`
- `menuUpdated`
- backend Catalog-to-WS bridge
- menu realtime listener

Customer menu behavior:

- Use public menu query and current cache/staleTime.
- Refresh according to explicit navigation/remount/window focus based on existing TanStack Query settings.
- Do not display UI text indicating instant menu realtime sync.

Management menu behavior:

- Use existing invalid mutation for categories/items/images.
- No tenant-wide menu WS broadcast.

Verification does not require "menu changes are immediately reflected via WS" for Step 2.7.

---

## 14. Test Scenario

Q8 requires full E2E for realtime order/KDS/customer ready flow.

### 14.1 Full E2E Standard Flow

1. Customer opens a PWA session and connects `/orders` using session auth.
2. Staff opens Management POS and connects `/orders` with staff JWT auth.
3. Chef/Barista opens KDS station and connects `/orders` with staff JWT auth.
4. Customer submits order.
5. POS sees the order appear without waiting for backup polling.
6. Staff confirm order.
7. Kitchen service creates a station ticket and BFF emit `events.kdsQueueChanged`.
8. KDS station refetch queue snapshot and display tickets.
9. Chef/Barista start ticket.
10. Chef/Barista mark done.
11. BFF emit `events.kitchenItemReady` only after Order service readiness update is successful.
12. Customer PWA refetch order tracking and display ready state.
13. POS refetch order/detail and see item/order readiness.

### 14.2 Reconnect Standard Stream

1. Keep PWA/POS/KDS open with connected sockets.
2. Disconnect WS/network for at least 10 seconds.
3. Create or update relevant order/KDS state while disconnected.
4. Reconnect.
5. Socket re-authenticate and rejoin server-derived rooms.
6. FE refetch active domain snapshots.
7. UI converges to current server state without event replay.
8. No duplicate listener effects or duplicate toasts.

### 14.3 RBAC/Room Verification

1. Customer socket does not receive staff/KDS/management events.
2. POS staff cannot self-join arbitrary rooms using `join.staff`.
3. Customer cannot self-join arbitrary session using `join.session`.
4. CHEF cannot subscribe to BAR station.
5. BARISTA cannot subscribe to KITCHEN station.
6. Owner/MANAGER station subscription is successful only after server validation.

### 14.4 verify Do Not Collect Items

1. Create multiple orders with the same `menuItemName` at many different tables.
2. KDS displays separate tickets/items according to the backend snapshot.
3. The UI does not have a "Batching" business flow, a total of the same item, or a flow to collect multiple tables.
4. FE does not compute routing from item name/category.

### 14.5 Backup Polling Verification

1. Before the staff socket quick test passes, POS polling still refreshes orders/service requests.
2. After the staff socket quick test passes, the standby POS interval is reduced to 10-15 seconds and is not disabled.
3. KDS when the socket is stable does not require heavy polling.
4. KDS when socket decline still converges by active or manual refresh backup mechanism.

### 14.6 Verifying the Menu

1. Menu mutations still invalidate existing management menu queries.
2. Customer public menu still follows current cache/staleTime behavior.
3. There is no WS menu event emit, listen, or required.

---

## 15. Acceptance Criteria

1. Customer PWA uses server-validated session socket auth and no longer depends on `join.session`.
2. Management POS uses `auth.token` staff socket auth and no longer depends on `join.staff`.
3. KDS realtime filters all KDS events according to `tenantId` and `station`.
4. Reconnect refetch active domain snapshots and converge after a missed event.
5. POS polling is held until the realtime quick test passes, then reduced to a standby mechanism of 10-15 seconds.
6. KDS actions keep strict refetch-after-mutation.
7. There is no realtime event menu in Step 2.7.
8. No more batching/collecting orders/orders at any FE.
9. FE never hard-codes KDS routing by category/name.
10. Full E2E PWA -> POS -> KDS -> PWA ready flow pass, including disconnect/reconnect.
