# Step 2.5 FE-BE Integration Implementation Plan

> Date: 2026-04-30  
> Scope: Phase 2A Step 2.5 — Customer PWA + Management POS use real Step 2.4
> BFF/Order APIs  
> Status: Ready for implementation  
> Design spec:
> `docs/superpowers/specs/2026-04-30-step-2.5-fe-be-integration-design.md`

## Goal

Replace the Step 2.2 mock ordering paths with real BFF APIs while preserving the
existing Customer PWA and Management POS UX.

Target demo loop:

```txt
Customer joins table session
→ adds/updates Redis cart
→ submits order
→ POS sees pending order from real API polling
→ staff confirms/cancels
→ customer tracking and POS refresh from REST plus optional WS hints
```

## Non-Negotiable Contracts

- Customer order/cart/service/bill calls must send `x-tenant-id` and
  `x-session-id`.
- Staff calls must use the existing management auth client:
  `Authorization: Bearer <token>` + `x-tenant-id`.
- BFF response shape is wrapped; frontend services must unwrap `data`.
- WebSocket `/orders` events are invalidation hints only. REST remains source of
  truth.
- No automatic mock fallback on primary Step 2.5 order/POS paths.
- KDS remains mock in Step 2.5.
- Do not add commits per task. The repository owner will review and commit.

## Key Decisions Locked

- Add a small staff service-request list endpoint in Step 2.5:
  `GET /admin/service-requests?status=&limit=&offset=`.
- Reuse `SERVICE_REQUEST_ACKNOWLEDGE` as the minimum permission for viewing the
  service-request inbox because the current permission enum has no read/list
  permission. Do not add a new permission in this step.
- Customer PWA persists the joined Order session in `localStorage` and sends it
  through `x-session-id`.
- Keep mock files in the repository for KDS/reference/dev demos, but remove them
  from primary PWA/POS order flows.

## Step 2.2 Mock UI Mapping

This mapping comes from
`docs/superpowers/plans/2026-04-24-step-2.2-mock-ui.md` and prevents Step 2.5
agents from replacing the wrong surfaces.

| Step 2.2 mock surface                     | Step 2.5 action                                                                                                  | Reason                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Customer PWA session timer/presence shell | Keep UX shell, replace mock session source with real `POST /customer/sessions/join` + persisted `x-session-id`.  | Backend Step 2.4 has real durable session + session guard.                       |
| Customer PWA menu item card/dialog        | Keep UI components; replace add-to-cart action with real `PATCH /customer/cart`.                                 | Catalog/menu data can stay on existing real menu flow; cart is now Redis-backed. |
| Customer PWA cart drawer/cart pill        | Replace Zustand cart source with real `GET/PATCH/DELETE /customer/cart` query and mutations.                     | Cart version conflict handling must use backend `cartVersion`.                   |
| Customer PWA submit animation             | Keep loading/success animation; replace mock submit payload with `{ expectedCartVersion, idempotencyKey }`.      | Step 2.4 submit persists order from Redis cart, not from client item arrays.     |
| Customer PWA order tracking               | Keep timeline/stepper; replace fake lifecycle ticks with real `GET /customer/orders/:id` plus WS invalidation.   | REST is canonical; BFF Direct events are hints.                                  |
| Customer PWA service request drawer       | Keep drawer and three request types; call real `POST /customer/service-requests`.                                | Backend already supports customer service request creation.                      |
| Customer PWA bill-lock/request-payment UI | Wire bill request/current bill only; do not implement cash confirmation.                                         | Step 2.4 ends at `PENDING_PAYMENT`; cash payment is Phase 3.                     |
| Management POS live orders table/detail   | Replace Zustand live orders with `GET /admin/orders` and `GET /admin/orders/:id` polling.                        | Step 2.5 requires POS live view from real API.                                   |
| Management POS confirm/cancel dialog      | Keep UI; call real confirm/cancel endpoints and invalidate queries.                                              | Backend Step 2.4 owns state machine and stock deduction on confirm.              |
| Management POS service request inbox      | Replace mock list with new `GET /admin/service-requests`; wire existing ack/resolve endpoints.                   | List endpoint is the only backend gap required for demo loop.                    |
| Management POS table transfer dialog      | Wire to `POST /admin/tables/transfer` only when the UI has required session/table IDs; otherwise keep disabled.  | Avoid inventing missing session context.                                         |
| Management POS cash bill panel            | Keep as mock or out of primary integration path.                                                                 | Real cash confirmation/payment belongs to Phase 3, not Step 2.5.                 |
| Management POS KPI/charts/notifications   | Keep derived/mock-friendly UI unless backed by existing real query data; do not create analytics endpoints.      | Not required by Step 2.5 backend contract.                                       |
| KDS kitchen/bar board, DnD, SLA, batching | Keep mock. Do not integrate with real backend in Step 2.5.                                                       | Phase doc defers KDS/backend hardening to Phase 2B.                              |
| Step 2.2 fake realtime hooks              | Remove from primary PWA/POS order paths; replace with Socket.IO hooks that only invalidate/refetch REST queries. | Step 2.4 BFF Direct emits minimal UI hints, not authoritative state replacement. |

## Task 1: Backend Service-Request List Contract

**Files**

- `libs/constants/src/lib/enum/tcp-request-message.ts`
- `libs/interfaces/src/lib/tcp/order/order-request.interface.ts`
- `libs/interfaces/src/lib/tcp/order/order-response.interface.ts`
- `apps/order/src/app/modules/order/repositories/service-request.repository.ts`
- `apps/order/src/app/modules/order/services/service-request.service.ts`
- `apps/order/src/app/modules/order/controllers/order.controller.ts`
- `apps/order/src/app/modules/order/tests/service-request.service.spec.ts`
- `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`

**Steps**

1. Add `TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_GET_LIST`.
2. Add `ListServiceRequestsTcpRequest` with:
   - `tenantId: string`
   - `status?: string`
   - `limit?: number`
   - `offset?: number`
3. Add a response alias such as `ServiceRequestListTcpResponse =
ServiceRequest[]`.
4. Add repository method that filters by `tenant_id` first, then optional status,
   with stable ordering by newest first.
5. Add service method `list(dto)` that clamps unsafe pagination values and maps
   entities to shared DTOs.
6. Add Order TCP handler for `SERVICE_REQUEST_GET_LIST`.
7. Add BFF route:
   `GET /admin/service-requests?status=&limit=&offset=`.
8. Protect BFF route with:
   - `@Authorization({ secured: true })`
   - `@Permissions([PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE])`
9. Return the same `ResponseDto<ServiceRequestListTcpResponse>` style used by
   `GET /admin/orders`.

**Tests**

- Repository/service unit test proves tenant filtering is always applied.
- Service test covers status filter and default pagination.
- BFF controller test or focused mock test proves the route sends
  `SERVICE_REQUEST_GET_LIST` and requires `SERVICE_REQUEST_ACKNOWLEDGE`.

**Verify**

```bash
npx nx test order
npx nx test bff
```

## Task 2: Customer PWA API Client + Session Foundation

**Files**

- `apps/customer-pwa/src/constants/api.ts`
- `apps/customer-pwa/src/lib/api-client.ts`
- `apps/customer-pwa/src/features/session/context/session-provider.tsx`
- `apps/customer-pwa/src/features/landing/services/session.service.ts`
- `apps/customer-pwa/src/features/landing/hooks/use-verify-qr.ts`
- `apps/customer-pwa/src/features/session/types.ts` if a local type file exists

**Steps**

1. Replace stale customer order endpoint constants with the real Step 2.4 routes:
   - `/customer/sessions/join`
   - `/customer/cart`
   - `/customer/orders`
   - `/customer/orders/:id`
   - `/customer/service-requests`
   - `/customer/bill/request`
   - `/customer/bill/current`
2. Extend `customerApi` to accept the active `sessionId` and set
   `x-session-id` when present.
3. Keep `x-tenant-id` behavior unchanged.
4. Persist joined session metadata to `localStorage`:
   - `tenantId`
   - `tableId`
   - `tableName`
   - `sessionId`
   - `startedAt` or `lastActivity` when available
5. On app load, hydrate the session context from `localStorage`.
6. Replace any mock auto-start behavior with real `POST /customer/sessions/join`
   from QR/table context.
7. On join failure, keep the current user-facing error state; do not silently
   fall back to mock session.

**Tests**

- API client unit test confirms `x-session-id` is included after session join.
- Session context test confirms localStorage hydrate/clear behavior.

**Verify**

```bash
npx nx test customer-pwa
```

## Task 3: Customer PWA Cart Query + Optimistic Mutations

**Files**

- `apps/customer-pwa/src/features/order/services/order.service.ts`
- `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- `apps/customer-pwa/src/pages/menu-page.tsx`
- `apps/customer-pwa/src/pages/cart/cart-drawer.tsx`
- `apps/customer-pwa/src/components/menu/cart-pill.tsx`
- `apps/customer-pwa/src/mocks/store.ts` only if exports need to stop being
  imported by primary order UI

**Steps**

1. Rewrite order service cart methods around real backend payloads:
   - `getCart()`
   - `mutateCart({ expectedCartVersion, operation, ... })`
   - `clearCart(expectedCartVersion)`
2. Treat returned `CartSnapshot` as the source of truth.
3. Build query keys with tenant/session scope:
   - `['customer-cart', tenantId, sessionId]`
   - `['customer-order', tenantId, sessionId, orderId]`
4. Implement optimistic cart updates for add/update/remove/clear.
5. On `CART_VERSION_CONFLICT` or HTTP 409, rollback and refetch the cart.
6. Update menu item add buttons to call the cart mutation instead of Zustand mock
   cart actions.
7. Update cart drawer quantity/note/remove/clear actions to use server cart
   mutations.
8. Update cart pill count/total to read from cart query data.
9. Disable ordering controls when cart status indicates bill requested or session
   closed.

**Tests**

- Hook test for optimistic add success.
- Hook test for 409 rollback/refetch.
- Component smoke test for cart drawer rendering a real `CartSnapshot`.

**Verify**

```bash
npx nx test customer-pwa
```

## Task 4: Customer PWA Submit Order, Tracking, Service, Bill

**Files**

- `apps/customer-pwa/src/features/order/services/order.service.ts`
- `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- `apps/customer-pwa/src/pages/cart/cart-drawer.tsx`
- `apps/customer-pwa/src/pages/order-tracking-page.tsx`
- `apps/customer-pwa/src/pages/service-request-drawer.tsx`
- Any existing bill/payment/request page used by the Step 2.2 flow

**Steps**

1. Implement `submitOrder({ expectedCartVersion, idempotencyKey, notes? })`.
2. Generate a client idempotency key per submit click and prevent duplicate
   in-flight submits.
3. Preserve loading and success animation, then route to tracking page using the
   real `order.id`.
4. Implement `getOrder(orderId)` and wire tracking page to real order detail.
5. Implement customer cancel for pending order through
   `DELETE /customer/orders/:id`.
6. Implement `createServiceRequest({ type, note? })` from service-request drawer.
7. Implement `requestBill()` and `getCurrentBill()`.
8. When bill request succeeds, invalidate cart and current bill queries.
9. Remove primary imports from `apps/customer-pwa/src/mocks/use-fake-realtime.ts`
   for order/cart/service/bill paths.

**Tests**

- Submit mutation sends `expectedCartVersion` and idempotency key only, not item
  arrays.
- Tracking page handles loading, not found/error, and real status timeline.
- Service request drawer calls the real API and invalidates/refetches relevant
  state.

**Verify**

```bash
npx nx test customer-pwa
```

## Task 5: Customer PWA WebSocket Invalidation

**Files**

- `apps/customer-pwa/src/features/order/hooks/` for a focused realtime hook
- `apps/customer-pwa/src/pages/menu-page.tsx`
- `apps/customer-pwa/src/pages/order-tracking-page.tsx`
- Existing app provider/root if socket lifecycle belongs there

**Steps**

1. Add a small hook that connects to BFF Socket.IO namespace `/orders` when a
   valid `sessionId` exists.
2. Emit `join.session` with `{ sessionId }`.
3. Listen for:
   - `events.cartUpdated`
   - `events.orderCreated`
   - `events.orderStatusChanged`
   - `events.billRequested`
   - `events.tableTransferred`
4. Invalidate/refetch only matching tenant/session/order queries.
5. Keep polling/manual refetch paths working when socket is disconnected.
6. Do not mutate UI state directly from the event payload except for lightweight
   toast text if already supported.

**Tests**

- Hook test or mocked socket test proves a matching event invalidates the right
  React Query key.
- Non-matching session/tenant event is ignored.

**Verify**

```bash
npx nx test customer-pwa
```

## Task 6: Management App Order API + Query Layer

**Files**

- `apps/management-app/src/constants/api.ts`
- `apps/management-app/src/lib/api/authenticated-client.ts` if response unwrapping
  helper is missing
- `apps/management-app/src/features/order/services/order.service.ts`
- `apps/management-app/src/features/order/hooks/use-order-query.ts`
- Optional local types under `apps/management-app/src/features/order/`

**Steps**

1. Add admin endpoint constants:
   - `GET /admin/orders`
   - `GET /admin/orders/:id`
   - `POST /admin/orders/:id/confirm`
   - `POST /admin/orders/:id/cancel-pending`
   - `POST /admin/orders/:id/cancel-processing`
   - `POST /admin/tables/transfer`
   - `POST /admin/bills/:sessionId/reopen`
2. Add order service methods using `authApiClient`.
3. Add React Query hooks:
   - order list with `status`, `tableId`, `limit`, `offset`
   - order detail
   - confirm
   - cancel pending
   - cancel processing
   - table transfer
4. Use polling for order list/detail. Start with a modest interval such as 3-5s.
5. Invalidate order list/detail after every mutation.
6. Preserve existing error toast conventions.

**Tests**

- Service tests verify route, method, query params, and body for confirm/cancel.
- Hook tests verify mutation invalidates list/detail keys.

**Verify**

```bash
npx nx test management-app
```

## Task 7: Management POS Orders UI Integration

**Files**

- `apps/management-app/src/components/pos/live-orders-table.tsx`
- `apps/management-app/src/components/pos/order-detail-panel.tsx`
- `apps/management-app/src/components/pos/cancel-order-dialog.tsx`
- Any POS page/container that currently wires mock order state
- `apps/management-app/src/mocks/store.ts` only if imports need removal from POS
  primary order paths

**Steps**

1. Replace mock order list source with `useOrdersQuery`.
2. Preserve existing filters and map them to API query params.
3. Replace selected mock order lookup with real detail query where needed.
4. Wire confirm button to real confirm mutation.
5. Wire cancel dialog:
   - `PENDING` orders use `cancel-pending`
   - `PROCESSING` or later cancelable states use `cancel-processing` with reason
6. Disable action buttons while mutations are pending.
7. Show API errors without changing order state optimistically.
8. Keep table map sourced from current real Catalog table APIs where already
   available.
9. Remove primary POS order imports from fake realtime/mock store.

**Tests**

- POS list renders real order rows from hook data.
- Confirm button calls mutation and disables during pending state.
- Cancel dialog chooses the correct endpoint by status.

**Verify**

```bash
npx nx test management-app
```

## Task 8: Management Service Requests + Transfer

**Files**

- `apps/management-app/src/constants/api.ts`
- `apps/management-app/src/features/service-requests/services/service-request.service.ts`
- `apps/management-app/src/features/service-requests/hooks/use-service-request-query.ts`
- `apps/management-app/src/components/pos/service-request-table.tsx`
- `apps/management-app/src/components/pos/service-request-detail-panel.tsx`
- `apps/management-app/src/components/pos/transfer-table-dialog.tsx`

**Steps**

1. Add service-request endpoint constants:
   - `GET /admin/service-requests`
   - `POST /admin/service-requests/:id/acknowledge`
   - `POST /admin/service-requests/:id/resolve`
2. Add service methods and React Query hooks.
3. Replace service-request mock table data with real API polling.
4. Wire acknowledge and resolve buttons to real mutations.
5. Invalidate service-request list after ack/resolve.
6. Wire transfer dialog to `POST /admin/tables/transfer` only when the UI has:
   - `sessionId`
   - `fromTableId`
   - `toTableId`
   - optional `requestId`
7. If those fields are absent, keep the control disabled with existing UI
   language rather than inventing missing data.

**Tests**

- Service-request table renders API data.
- Ack/resolve buttons call correct endpoints and invalidate list.
- Transfer mutation sends the exact backend payload.

**Verify**

```bash
npx nx test management-app
```

## Task 9: Management POS WebSocket Hints

**Files**

- `apps/management-app/src/features/order/hooks/` or POS container
- Existing app/provider root if socket lifecycle belongs there

**Steps**

1. Add a focused staff realtime hook that connects to `/orders` when tenant is
   available.
2. Emit `join.staff` with `{ tenantId }`.
3. Listen for:
   - `events.orderCreated`
   - `events.orderStatusChanged`
   - `events.serviceRequested`
   - `events.tableTransferred`
4. Invalidate order, service-request, and table queries as appropriate.
5. Keep polling as the functional fallback.
6. Do not route KDS through this hook in Step 2.5.

**Tests**

- Mock socket event invalidates order list.
- Service-request event invalidates service-request list.

**Verify**

```bash
npx nx test management-app
```

## Task 10: End-to-End Demo Verification

**Prerequisites**

- PostgreSQL, Redis, Kafka, BFF, Order, Catalog, and Authorizer are running.
- Role/permission seed includes Step 2A permissions.
- Catalog has at least one tenant, table QR/session path, and available menu
  item stock.

**Commands**

Use the repository's existing commands first:

```bash
npx nx serve order
npx nx serve bff
npx nx serve customer-pwa
npx nx serve management-app
```

If the repository has aggregate scripts for these apps, prefer those scripts
instead of inventing new commands.

**Manual Scenario**

1. Open Customer PWA from a valid table QR context.
2. Join session and verify `x-session-id` is present on cart/order requests.
3. Add item to cart, update quantity/note, clear or remove one line.
4. Submit order and land on tracking page.
5. Open Management POS with a staff account that has order permissions.
6. Verify the order appears in live orders by polling.
7. Confirm the order and verify customer tracking refetches to the new status.
8. Create a customer service request and verify POS inbox shows it.
9. Acknowledge and resolve the request.
10. Request bill from customer and verify ordering controls lock where the cart
    or bill status requires it.
11. Test the stock race scenario from Phase 2A: two pending orders compete for
    the last stock; one confirm succeeds and the other receives the Catalog stock
    error.
12. Verify another tenant cannot see the order or service request.

**Automated Verification**

```bash
npx nx test order
npx nx test bff
npx nx test customer-pwa
npx nx test management-app
npx nx lint customer-pwa
npx nx lint management-app
```

## Completion Criteria

- Customer PWA primary order path no longer depends on `apps/customer-pwa/src/mocks`
  for cart/order/service/bill behavior.
- Management POS primary order/service-request path no longer depends on
  `apps/management-app/src/mocks`.
- Staff service-request inbox has a real BFF route and tenant-safe Order TCP
  backing.
- Cart conflict handling uses backend `cartVersion`.
- Submit order payload matches Step 2.4:
  `{ expectedCartVersion, idempotencyKey, notes? }`.
- POS confirm/cancel calls real BFF endpoints and invalidates REST queries.
- WS integration only invalidates/refetches; polling remains sufficient.
- KDS mock remains untouched except for avoiding accidental coupling to POS real
  order flow.
