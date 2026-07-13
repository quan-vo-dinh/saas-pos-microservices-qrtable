# QRTable Codebase Reading Map

> Guide to reading the QRTable codebase in accordance with the project's current architecture.
>
> **Last verified:** 2026-05-27, cross-referenced with the current source code after session recovery and domain-label stabilization.
>
> **Canonical role:** This document serves as the codebase reading map. In case of conflicts, prioritize current code/tests, `docs/README.md`, phase records, and accepted specs.

## Objectives

This document helps you read QRTable systematically, preventing you from getting lost in the Nx monorepo, multiple NestJS microservices, two frontend apps, and shared libraries.

After reading this guide, you should be able to answer:

- Which service owns which state in QRTable.
- How a request flows from the UI through BFF, TCP/gRPC, database, Redis, Kafka, and WebSocket.
- Which files to read first, which ones to read later, and which folders can be temporarily bypassed.
- Where the current implementation differs from old specs/roadmaps.
- How to explain the project using architectural theory rather than just describing the code during interviews.

## How to Read This Repo

Do not read folders in alphabetical order. Since QRTable is a multi-tenant, event-driven system, the correct approach is to read by **business flow** and **state ownership**.

Every time you open a file, ask yourself these 5 questions:

1. Which layer does this file belong to: UI, BFF orchestration, domain service, repository, shared contract, or infrastructure?
2. Does this file own state, or does it only read/forward/transform state?
3. If an error occurs, should it be blocked at a guard, controller, service, or repository?
4. If the flow needs to invoke another service, does it call sync TCP/gRPC or publish an async Kafka event?
5. If the frontend receives a WebSocket event, is that event the source of truth or just an invalidation hint?

**How to explain in interviews:**

> I do not analyze microservices by opening each service individually from the beginning. Instead, I start from the boundaries: UI route -> BFF controller -> TCP message -> service owner -> repository/state -> event/realtime. This helps me trace the ownership and consistency boundaries of each flow.

## Current Code Snapshot

| Layer             | Current reality                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo          | Nx workspace, deployable apps reside in `apps/`, shared code resides in `libs/`.                                                                 |
| Backend edge      | `apps/bff`: HTTP API gateway, guard chain, middleware, WebSocket gateway, TCP clients.                                                           |
| Backend services  | `catalog`, `order`, `kitchen`, `payment`, `saas`, `authorizer`, `user-access`.                                                                   |
| Frontend          | `apps/management-app` is a Next.js app; `apps/customer-pwa` is a React/Vite PWA; `apps/keycloak-theme` is the Keycloak theme.                    |
| Current aliases   | Backend uses `@common/*`; frontend/shared uses `@einvoice/*`. Refer to the current `tsconfig.base.json` when tracing code.                       |
| State stores      | PostgreSQL/TypeORM for main services; Mongo/Mongoose for user-access; Redis for session/cart/KDS/cache/rate-limit; Kafka for async side-effects. |
| Generated folders | Skip `.next`, `dist`, `node_modules`, and coverage/build outputs when reading the code.                                                          |

## Overall Architecture Map

```mermaid
flowchart TB
  subgraph CLIENTS["Clients"]
    PWA["Customer PWA"]
    MGMT["Management App"]
    KCTheme["Keycloak Theme"]
  end

  subgraph EDGE["Edge / BFF"]
    BFF["apps/bff\nHTTP + WebSocket + TCP clients"]
    Guards["Global guards\nUser -> Session -> Tenant -> TenantLifecycle -> Permission -> Throttler"]
    Realtime["Socket.IO namespace /orders\nRedis adapter"]
  end

  subgraph SERVICES["Microservices"]
    Authorizer["Authorizer\nKeycloak verify/admin"]
    UserAccess["User Access\nMongo users/roles"]
    SaaS["SaaS\nTenant/subscription/plan"]
    Catalog["Catalog\nMenu/table/QR/stock"]
    Order["Order\nSession/cart/order/bill"]
    Kitchen["Kitchen\nKDS Redis queue"]
    Payment["Payment\nCash/VietQR/SePay/history"]
  end

  subgraph STATE["State & Infra"]
    Pg["PostgreSQL"]
    Mongo["MongoDB"]
    Redis["Redis"]
    Kafka["Kafka"]
    Keycloak["Keycloak"]
  end

  PWA --> BFF
  MGMT --> BFF
  KCTheme --> Keycloak

  BFF --> Guards
  BFF --> Realtime
  BFF -- "TCP" --> Catalog
  BFF -- "TCP" --> Order
  BFF -- "TCP" --> Kitchen
  BFF -- "TCP" --> Payment
  BFF -- "TCP" --> SaaS
  BFF -- "gRPC/TCP" --> Authorizer
  BFF -- "gRPC/TCP" --> UserAccess

  Authorizer --> Keycloak
  Authorizer --> UserAccess
  UserAccess --> Mongo
  SaaS --> Pg
  Catalog --> Pg
  Order --> Pg
  Payment --> Pg
  Kitchen --> Redis

  Order -- "stock check/deduct/release" --> Catalog
  Payment -- "bill snapshot / mark paid" --> Order
  SaaS -- "create owner" --> Authorizer
  SaaS -- "upsert owner profile" --> UserAccess
  SaaS -- "create empty payment settings" --> Payment

  Order -- "order.confirmed / order.status_changed" --> Kafka
  Payment -- "payment.completed" --> Kafka
  SaaS -- "tenant.created" --> Kafka
  Kitchen -- "kitchen.sla_warning" --> Kafka
  Kafka --> Kitchen
  Kafka --> Catalog
  Kafka --> BFF
  BFF --> PWA
  BFF --> MGMT
```

## App Ownership

| App                   | Current role                                                                 | When to read                                               |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `apps/bff`            | API gateway, guard chain, HTTP controllers, WebSocket gateway, TCP clients.  | First thing to read in the backend.                        |
| `apps/catalog`        | Area, table, QR token, category, menu item, public menu, stock.              | Read before Order submit/confirm.                          |
| `apps/order`          | Session, cart, order, bill, service request, table transfer, outbox.         | Business core; read after grasping BFF + Catalog.          |
| `apps/kitchen`        | KDS queue on Redis, consumes `order.confirmed`, SLA, recovery.               | Read after Order confirm.                                  |
| `apps/payment`        | Payment record, cash, VietQR, SePay webhook, audit, payment outbox.          | Read after Bill flow.                                      |
| `apps/saas`           | Tenant, onboarding saga, plan, subscription, invoice, lifecycle cache.       | Read after grasping Order/Payment and tenant guard.        |
| `apps/authorizer`     | Keycloak login/verify/admin, gRPC verify token.                              | Read when working on auth/RBAC.                            |
| `apps/user-access`    | User profile, staff, role, tenant user data on MongoDB.                      | Read along with Authorizer/SaaS onboarding.                |
| `apps/customer-pwa`   | Customer scans QR, joins session, views menu, cart, order tracking, payment. | Read after customer backend flow.                          |
| `apps/management-app` | Admin/dashboard/POS/KDS/SaaS UI.                                             | Read after BFF admin endpoints.                            |
| `apps/keycloak-theme` | Custom Keycloak theme interfaces.                                            | Read when customized auth UX/branding is needed, not core. |

## Source Of Truth Priority

Read in this order of priority:

1. Current code and tests.
2. `docs/README.md`, canonical business/technical docs, and accepted phase records.
3. `docs/testing/README.md` and the traceability matrix if tracing test coverage.
4. Legacy guides in `docs/guides/*`.
5. README boilerplate, generated output, build folders.

Important note: `AGENTS.md` describes target standards of the project. In the current code, import aliases are still `@common/*` and `@einvoice/*`, not yet fully transitioned to `@qrtable/*`.

## Round 0: Read Maps Before Code

Read these files to acquire context:

| File                                              | What to understand                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `docs/README.md`                                  | Which docs are canonical, which ones are reference-only.            |
| `docs/implementation_plan.md`                     | Which phases are completed, which ones are deferred.                |
| `docs/technical-architecture.md`                  | Microservices, database per service, Redis, Kafka, WebSocket rooms. |
| `docs/business-logic.md`                          | State machine, business rules, business edge cases.                 |
| `docs/architecture/permission-matrix.md`          | Roles and permissions before reading admin, POS, and KDS.           |
| `docs/testing/README.md`                          | Taxonomy, gate policy, and how to read evidence.                    |
| `docs/testing/traceability-matrix.md`             | Mapping requirements to unit/integration/E2E tests and status.      |
| `docs/guides/react-nextjs-qrtable.md`             | Read when tracing frontend React/Next.js.                           |
| `docs/guides/kafka-qrtable.md`                    | Read when extending event-driven flows.                             |
| `docs/guides/redis-qrtable.md`                    | Read when looking into Redis keys/sessions/carts/KDS.               |
| `docs/guides/websocket-socketio-qrtable.md`       | Read when tracing realtime features.                                |
| `docs/guides/keycloak-qrtable.md`                 | Read when tracing auth/Keycloak flows.                              |
| `docs/guides/sepay-configuration-guide-phase3.md` | Read when tracing VietQR/SePay configuration.                       |
| `docs/guides/frontend-domain-display.md`          | Wire enum → UI label mappings; `vi-domain-labels`, SaaS badges.     |

Then read phase records in chronological order:

1. `docs/phases/phase-0-foundation.md`
2. `docs/phases/phase-1-catalog.md`
3. `docs/phases/phase-2a-order-kafka.md`
4. `docs/phases/phase-2b-kitchen-websocket.md`
5. `docs/phases/phase-3-payment.md`
6. `docs/phases/phase-4a-saga-hardening.md`
7. `docs/phases/phase-4b-saas-onboarding.md`
8. `docs/phases/phase-5-testing.md`, `docs/phases/phase-6-observability.md`, and `docs/phases/phase-7-deployment.md`

## Round 1: Nx Workspace and Aliases

Read:

- `package.json`
- `nx.json`
- `tsconfig.base.json`
- `apps/*/project.json`
- `libs/*/project.json`

Helpful commands to run:

```bash
npx nx show projects
npx nx graph
```

Key takeaways:

- Which project is a deployable app, and which is a library.
- Which `package.json` script runs which domain slice: `dev:bff-order`, `dev:bff-payment`, `dev:bff-auth`.
- How `tsconfig.base.json` maps aliases to directories.
- Current backend imports `@common/constants/*`, `@common/interfaces/*`, `@common/entities/*`, etc.
- Current frontend/shared imports `@einvoice/types`, `@einvoice/frontend-ui`, `@einvoice/frontend-hooks`, etc.

**Theory to know:**

An Nx monorepo groups multiple deployable apps and shared libraries under a single repository. The key goal is not "everyone sharing all code", but rather **dependency boundary enforcement**: apps should depend on contracts/shared libs, and should not import internal modules of other services directly.

**How to explain in interviews:**

> QRTable uses Nx to manage NestJS services and frontend apps in a single repository, bringing benefits like shared contracts, consistent tooling, and affected tests/builds. However, service boundaries are still enforced via TCP/Kafka contracts. We do not import the repository or entity of other services directly to create business logic shortcuts.

## Round 2: Backend Boundary First

Analyze BFF before diving into service internals.

### BFF Entry Points

Read:

- `apps/bff/src/main.ts`
- `apps/bff/src/app/app.module.ts`
- `apps/bff/src/app/modules/*/controllers/*.ts`
- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`

Key takeaways:

- `main.ts` configures `rawBody` parsing, the Redis Socket.IO adapter, global route prefixing, `ValidationPipe`, CORS, and Swagger.
- `app.module.ts` registers global middleware, interceptors, and the guard chain.
- BFF controllers map HTTP routes to `TCP_REQUEST_MESSAGE` patterns.
- BFF performs orchestration at the edge boundary, but does not own domain state.

### Middleware, Guards, Interceptors

| Order | File                                                         | Role                                                                                            |
| ----- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1     | `libs/middlewares/src/lib/logger.middleware.ts`              | Request logging.                                                                                |
| 2     | `libs/middlewares/src/lib/tenant.middleware.ts`              | Resolves and injects tenant context from the incoming request.                                  |
| 3     | `libs/guards/src/lib/user.guard.ts`                          | Verifies JWTs via the Authorizer and caches user metadata with `user-token:{sha256}`.           |
| 4     | `libs/guards/src/lib/session.guard.ts`                       | Handles customer session headers, cache validation, and metadata skips.                         |
| 5     | `libs/guards/src/lib/tenant.guard.ts`                        | Resolves tenant context from middleware, headers, claims, or session; bypasses for Super Admin. |
| 6     | `apps/bff/src/app/guards/customer-tenant-lifecycle.guard.ts` | Blocks customer/menu requests if a tenant is suspended/closed; read this specific path.         |
| 7     | `libs/guards/src/lib/permission.guard.ts`                    | Evaluates `@Permissions` metadata.                                                              |
| 8     | `@nestjs/throttler` `ThrottlerGuard`                         | Edge rate limiting.                                                                             |
| 9     | `libs/interceptors/src/lib/exception.interceptor.ts`         | Normalizes backend exception shapes.                                                            |

**Theory to know:**

The guard chain resolves cross-cutting concerns: authentication, session validation, tenant isolation, authorization, and rate limiting. Controllers should not parse tokens, check roles, or resolve tenants using local business logic.

**How to explain in interviews:**

> I positioned the BFF as an edge boundary to centralize HTTP concerns: request validation, authentication, tenant context resolution, permission evaluation, and response normalization. Domain microservices behind the BFF receive clean, pre-validated payloads via TCP, meaning they are detached from the Express request/response context.

## Round 3: Read by Domain Flow

### Flow 1: QR, Tenant, Table Session, Public Menu

Read in order:

| Layer       | Files                                                                             |
| ----------- | --------------------------------------------------------------------------------- |
| Customer UI | [landing-page.tsx](../../apps/customer-pwa/src/pages/landing-page.tsx)            |
| Customer UI | `apps/customer-pwa/src/features/landing/services/session.service.ts`              |
| Customer UI | `apps/customer-pwa/src/features/landing/services/tenant.service.ts`               |
| Customer UI | `apps/customer-pwa/src/features/session/context/session-provider.tsx`             |
| Customer UI | `apps/customer-pwa/src/features/menu/hooks/use-menu-query.ts`                     |
| Customer UI | [api-client.ts](../../apps/customer-pwa/src/lib/api-client.ts)                    |
| BFF         | `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`                 |
| BFF         | `apps/bff/src/app/modules/order/controllers/customer-session.controller.ts`       |
| Catalog     | `apps/catalog/src/app/modules/table/controllers/table.controller.ts`              |
| Catalog     | `apps/catalog/src/app/modules/table/services/table.service.ts`                    |
| Catalog     | `apps/catalog/src/app/modules/menu/services/menu.service.ts`                      |
| Order       | `apps/order/src/app/modules/order/services/order.service.ts` method `joinSession` |
| Order       | `apps/order/src/app/modules/order/services/session.service.ts`                    |

Sequence of events:

```mermaid
sequenceDiagram
  autonumber
  actor Customer
  participant PWA as Customer PWA
  participant BFF as BFF
  participant SaaS as SaaS service
  participant Catalog as Catalog service
  participant CatalogDB as Catalog DB
  participant Order as Order service
  participant OrderDB as Order DB

  Customer->>PWA: Open QR/tenant landing
  PWA->>BFF: Resolve tenant metadata
  BFF->>SaaS: TCP SAAS.GET_BY_SLUG or SAAS.GET_BY_ID
  SaaS-->>BFF: Tenant snapshot
  BFF-->>PWA: Tenant public metadata

  PWA->>BFF: POST /menu/validate-qr
  BFF->>Catalog: TCP TABLE.VALIDATE_QR_TOKEN
  Catalog->>CatalogDB: Check QR token, tenantId, table status
  CatalogDB-->>Catalog: Table snapshot
  Catalog-->>BFF: Valid table snapshot
  BFF-->>PWA: QR/table validation result

  PWA->>BFF: POST /customer/sessions/join
  BFF->>Order: TCP ORDER.SESSION_JOIN
  Order->>Catalog: TCP TABLE.VALIDATE_QR_TOKEN
  Catalog->>CatalogDB: Re-validate QR/table ownership
  Catalog-->>Order: Table snapshot

  alt Table is BILLING or CLEANING
    Order-->>BFF: Reject with business error
    BFF-->>PWA: 409 conflict
  else Table is OCCUPIED with stale/closed empty session
    Order->>OrderDB: Validate empty session has no orders or bill
    Order->>Catalog: TCP TABLE.UPDATE_STATUS AVAILABLE with matching sessionId
    Order->>OrderDB: Create Session ACTIVE
    Order->>Catalog: TCP TABLE.UPDATE_STATUS OCCUPIED with new sessionId
    Order-->>BFF: New SessionTcpResponse
    BFF-->>PWA: New session
  else Table is OCCUPIED with active session
    Order->>OrderDB: Find active session by table.sessionId
    Order->>OrderDB: Touch session activity
    Order-->>BFF: Existing SessionTcpResponse
    BFF-->>PWA: Reuse session
  else Table is available
    Order->>OrderDB: Create Session ACTIVE
    Order->>Catalog: TCP TABLE.UPDATE_STATUS OCCUPIED with sessionId
    Catalog->>CatalogDB: Update table status and sessionId
    Catalog-->>Order: Updated table
    Order-->>BFF: New SessionTcpResponse
    BFF-->>PWA: New session
  end

  PWA->>BFF: GET /menu
  BFF->>Catalog: TCP MENU.GET_PUBLIC_MENU
  Catalog->>CatalogDB: Load categories and menu items
  Catalog-->>BFF: Public menu
  BFF-->>PWA: Menu response
```

1. Customer opens QR/tenant landing in the PWA.
2. PWA resolves tenant metadata and validates the QR code via BFF.
3. BFF sends `ORDER.SESSION_JOIN` TCP message via `POST /customer/sessions/join`.
4. Order Service invokes Catalog `TABLE.VALIDATE_QR_TOKEN` to confirm table/QR ownership.
5. If the table status is `BILLING` or `CLEANING`, Order rejects the join.
6. If the table is `OCCUPIED` but the bound session is empty and stale/closed, Order releases the binding for that `sessionId` and creates a fresh session.
7. If the table is `OCCUPIED` with a valid active session, Order retrieves the existing session and touches its activity.
8. If the table is `AVAILABLE`, Order creates a new `Session` and tells Catalog to update the table status to `OCCUPIED`.
9. PWA stores the session context, and the menu is fetched via `GET /menu`.

**Theory to know:**

- A QR token is not an authentication token for a user; it is an entry token for a table within a tenant.
- A session represents the "current dining session" of a customer at a table, not a user login account.
- Table status belongs to the Catalog domain, but the session belongs to the Order domain; joining a session requires synchronous communication between Order and Catalog.
- The tenant lifecycle guard blocks customer access if a tenant is suspended/closed.

**How to explain in interviews:**

> Customers don't log in with user accounts. Instead, they scan a QR code to join a table session. QR/table validation logic belongs to Catalog, while the dining session belongs to Order. When joining, Order validates the QR code via Catalog, creates or reuse a session, and updates the table status. This clearly decouples table inventory from order sessions.

### Flow 2: Cart, Submit Order, Idempotency, Quota

Read in order:

| Layer       | Files                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Customer UI | `apps/customer-pwa/src/features/order/services/order.service.ts`                        |
| Customer UI | `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`                         |
| Customer UI | `apps/customer-pwa/src/lib/idempotency.ts`                                              |
| BFF         | `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`               |
| Order       | `apps/order/src/app/modules/order/controllers/order.controller.ts`                      |
| Order       | `apps/order/src/app/modules/order/services/cart.service.ts`                             |
| Order       | `apps/order/src/app/modules/order/services/order-submit.service.ts`                     |
| Order       | `apps/order/src/app/modules/order/services/order-quota.service.ts`                      |
| Order       | `apps/order/src/app/modules/order/services/bill.service.ts`                             |
| Order       | `apps/order/src/app/modules/order/utils/recalculate-bill-totals.ts`                     |
| Tests       | `apps/order/src/app/modules/order/tests/order-submit-cart.integration.spec.ts`          |
| Tests       | `apps/order/src/app/modules/order/tests/order-payment-finalization.integration.spec.ts` |

Sequence of events:

```mermaid
sequenceDiagram
  autonumber
  actor Customer
  participant PWA as Customer PWA
  participant BFF as BFF
  participant Order as Order service
  participant Redis as Redis cart/quota
  participant Catalog as Catalog service
  participant SaaS as SaaS service
  participant OrderDB as Order DB
  participant Realtime as BFF realtime

  Customer->>PWA: Add/update/remove item
  PWA->>BFF: PATCH /customer/cart with expectedCartVersion
  BFF->>Order: TCP ORDER.CART_MUTATE
  Order->>OrderDB: Validate active session
  Order->>Redis: Load cart snapshot
  Order->>Catalog: TCP MENU_ITEM.VALIDATE_ORDERABLE
  Catalog-->>Order: Orderable item snapshot
  Order->>Redis: WATCH cart key, write next cartVersion
  Order-->>BFF: CartTcpResponse
  BFF->>Realtime: emit events.cartUpdated
  BFF-->>PWA: Updated cart snapshot

  Customer->>PWA: Submit order
  PWA->>BFF: POST /customer/orders with idempotencyKey and expectedCartVersion
  BFF->>Order: TCP ORDER.SUBMIT
  Order->>OrderDB: Check active session
  Order->>OrderDB: Find order by idempotencyKey

  alt Existing idempotent order
    Order->>Redis: Load current cart snapshot
    Order->>OrderDB: Load order items and bill
    Order-->>BFF: Replay SubmitOrderTcpResponse
  else New order
    Order->>Redis: Load cart snapshot and compare cartVersion
    Order->>SaaS: TCP SUBSCRIPTION.GET_CURRENT
    SaaS-->>Order: Plan and maxOrdersPerDay
    Order->>Redis: INCR daily order quota
    Order->>OrderDB: Transaction lock Session
    Order->>OrderDB: Create PENDING Order, Bill, OrderItems
    Order->>OrderDB: Recalculate bill totals
    Order->>OrderDB: Increment session.orderCount
    Order->>Redis: Clear cart with expectedCartVersion
    Order-->>BFF: SubmitOrderTcpResponse with cartUpdated and orderCreated
  end

  BFF->>Realtime: emit events.cartUpdated
  BFF->>Realtime: emit events.orderCreated
  BFF-->>PWA: Order, bill and cart snapshot
```

1. Customer mutates cart through `GET/PATCH/DELETE /customer/cart`.
2. Cart Service persists cart snapshots scoped to tenant/session and tracks cart version.
3. Order is submitted via `POST /customer/orders` with `idempotencyKey` and `expectedCartVersion`.
4. `OrderSubmitService` validates active session, performs idempotency check/replay, checks cart version, and rejects empty carts.
5. For new orders, it reserves daily order quota via SaaS.
6. A database transaction locks the session, creates the `Order` in `PENDING` status, creates/reuses an open `Bill`, creates `OrderItem` rows, recalculates the bill, increments `session.orderCount`, and clears the cart.
7. Response returns the order, bill, cart snapshot, and events to let BFF trigger UI updates.

**Theory to know:**

- An idempotency key handles double submit/retry issues: resending the same action will not duplicate the order.
- `expectedCartVersion` enforces optimistic concurrency control: if the client submits based on an out-of-date cart state, the server rejects it.
- Bills belong to the Order domain because they aggregate order/session totals; Payment Service only manages final payment records.
- Quota reservations must rollback if the transaction fails to avoid deducting quotas incorrectly.

**How to explain in interviews:**

> Submitting an order is a write operation prone to double clicks and network retries. I resolved this using idempotency keys and cart versions. Cart versions protect users from submitting stale cart states, while idempotency keys prevent duplicate orders on the backend. Order and bill rows are created within a single transaction; if quota was reserved but the transaction fails, the quota is rolled back.

### Flow 3: Staff POS, Confirm Order, Stock, Order State Machine

Read in order:

| Layer         | Files                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Management UI | `apps/management-app/src/app/(pos)/pos/page.tsx`                                     |
| Management UI | `apps/management-app/src/components/pos/*`                                           |
| Management UI | `apps/management-app/src/features/order/services/order.service.ts`                   |
| Management UI | `apps/management-app/src/features/order/hooks/use-order-query.ts`                    |
| BFF           | `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`               |
| Order         | `apps/order/src/app/modules/order/services/order.service.ts` facade                  |
| Order         | `apps/order/src/app/modules/order/services/session.service.ts`                       |
| Order         | `apps/order/src/app/modules/order/services/order-state-transition.service.ts`        |
| Order         | `apps/order/src/app/modules/order/services/order-kds-event.service.ts`               |
| Order         | `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`              |
| Catalog       | `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`               |
| Catalog       | `apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts`        |
| Tests         | `apps/order/src/app/modules/order/tests/order-state-transition.service.spec.ts`      |
| Tests         | `apps/order/src/app/modules/order/tests/session.service.spec.ts`                     |
| Tests         | `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts` |

Sequence of events:

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant Mgmt as Management App POS
  participant BFF as BFF
  participant Order as Order service
  participant OrderDB as Order DB
  participant Catalog as Catalog service
  participant CatalogDB as Catalog DB
  participant Kafka as Kafka
  participant Kitchen as Kitchen service
  participant Realtime as BFF realtime

  Staff->>Mgmt: Click confirm pending order
  Mgmt->>BFF: POST /admin/orders/:id/confirm
  BFF->>BFF: UserGuard, TenantGuard, PermissionGuard
  BFF->>Order: TCP ORDER.CONFIRM
  Order->>OrderDB: Transaction lock Order
  Order->>OrderDB: Load OrderItems and open Bill

  alt Order is not PENDING
    Order-->>BFF: ORDER_INVALID_STATE
    BFF-->>Mgmt: 409 conflict
  else Order is PENDING
    Order->>Catalog: TCP MENU_ITEM.STOCK_DEDUCT_FOR_ORDER
    Catalog->>CatalogDB: Lock menu items and deduct stock
    Catalog-->>Order: Stock mutation result
    Order->>OrderDB: Set order PROCESSING
    Order->>OrderDB: Save OutboxEvent order.confirmed
    Order-->>BFF: OrderActionTcpResponse with orderStatusChanged
    BFF->>Realtime: emit events.orderStatusChanged
    BFF-->>Mgmt: Confirmed order
  end

  Order->>Kafka: OutboxPublisher publishes order.confirmed
  Kafka-->>Kitchen: order.confirmed event
  Kitchen->>Kitchen: Deduplicate event and create KDS tickets
```

1. Staff monitors pending/live orders in the POS.
2. Staff confirms the order via `POST /admin/orders/:id/confirm`.
3. BFF forwards the `ORDER.CONFIRM` TCP message.
4. `OrderStateTransitionService.confirmOrder` locks the order and verifies status is `PENDING`.
5. Order invokes Catalog `MENU_ITEM.STOCK_DEDUCT_FOR_ORDER` with idempotency key `confirm-order:{orderId}`.
6. If Catalog stock deduction succeeds, Order sets status to `PROCESSING` and writes the `order.confirmed` outbox event.
7. Outbox publisher pushes the event to Kafka; Kitchen consumes it to generate KDS tickets.
8. Canceling a processing order releases stock back via Catalog and publishes `order.status_changed`.

**Theory to know:**

- Stock belongs to the Catalog domain, not Order, because Catalog owns menu item inventory records.
- The Order state machine manages transitions: `PENDING -> PROCESSING -> READY -> SERVED` or cancellation paths.
- Confirming an order requires a synchronous stock mutation call because the staff needs immediate feedback if items are out of stock.
- The transactional outbox pattern guarantees that side-effect events are published after the DB transaction commits successfully, preventing dual-write issues.

**How to explain in interviews:**

> I don't deduct stock when a customer submits an order, because the order can still be rejected by staff. Stock is deducted only when staff confirms the order. Catalog acts as the source of truth for stock; Order simply makes an idempotent TCP stock deduction call. Once the order transitions to PROCESSING, Order persists the `order.confirmed` outbox event to be consumed by Kitchen asynchronously.

### Flow 4: KDS Queue, Ticket Lifecycle, Recovery, SLA

Read in order:

| Layer         | Files                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- |
| Management UI | `apps/management-app/src/app/(kds)/kds/kitchen/page.tsx`                                |
| Management UI | `apps/management-app/src/app/(kds)/kds/bar/page.tsx`                                    |
| Management UI | `apps/management-app/src/features/kds/services/kds.service.ts`                          |
| Management UI | `apps/management-app/src/features/kds/hooks/use-kds-queue.ts`                           |
| Management UI | `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts`                        |
| BFF           | `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`                    |
| BFF           | `apps/bff/src/app/modules/kitchen/services/kds-station-access.service.ts`               |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/controllers/kitchen.controller.ts`                |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`             |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/services/kds-ticket.service.ts`                   |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/services/kitchen-events.publisher.ts`             |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/services/kitchen-recovery.service.ts`             |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/services/kitchen-sla.worker.ts`                   |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts` facade      |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`      |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/repositories/kds-sla-store.repository.ts`         |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/repositories/kds-recovery-store.repository.ts`    |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`                                |
| Kitchen       | `apps/kitchen/src/app/modules/kitchen/utils/kds-score.ts`                               |
| Tests         | `apps/kitchen/src/app/modules/kitchen/tests/order-confirmed-dedupe.integration.spec.ts` |

Sequence of events:

Sequence for generating KDS tickets from `order.confirmed`:

```mermaid
sequenceDiagram
  autonumber
  participant Kafka as Kafka
  participant Consumer as Kitchen OrderConfirmedConsumer
  participant Repo as KdsRedisRepository
  participant TicketStore as KdsTicketStore
  participant SlaStore as KdsSlaStore
  participant Redis as Redis
  participant Pub as KitchenEventsPublisher
  participant BFFSub as BFF KDS subscriber
  participant Realtime as BFF realtime
  participant KDSUI as Management KDS UI

  Kafka-->>Consumer: order.confirmed
  Consumer->>Consumer: Parse and validate schemaVersion/eventType
  Consumer->>Repo: createTicketsFromConfirmedOrder(event)
  Repo->>Redis: Check dedupe/recovery keys
  Repo->>TicketStore: Create station tickets
  TicketStore->>Redis: Save ticket data and queue sorted set
  Repo->>SlaStore: Register SLA markers
  SlaStore->>Redis: Save SLA tracking keys
  Repo-->>Consumer: kds.queue_changed events
  Consumer->>Pub: publishMany(events)
  Pub->>Redis: PUBLISH realtime:kds tenant channel
  Redis-->>BFFSub: Pub/sub message
  BFFSub->>Realtime: emitKdsQueueChanged
  Realtime-->>KDSUI: events.kdsQueueChanged
```

Sequence for KDS ticket operations:

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant KDSUI as Management KDS UI
  participant BFF as BFF KitchenController
  participant Kitchen as Kitchen service
  participant Redis as Redis KDS state
  participant Order as Order service
  participant OrderDB as Order DB
  participant Realtime as BFF realtime

  Staff->>KDSUI: Click start ticket
  KDSUI->>BFF: POST /admin/kds/tickets/:ticketId/start
  BFF->>BFF: Permission and station access check
  BFF->>Kitchen: TCP KITCHEN.START_TICKET
  Kitchen->>Redis: Mark ticket PROCESSING and publish queue_changed
  Kitchen-->>BFF: KdsMutationTcpResponse
  BFF-->>KDSUI: Ticket started

  Staff->>KDSUI: Click done
  KDSUI->>BFF: POST /admin/kds/tickets/:ticketId/done
  BFF->>Kitchen: TCP KITCHEN.MARK_READY
  Kitchen->>Redis: Mark ticket READY and publish queue_changed
  Kitchen-->>BFF: Ready ticket with orderItemIds
  BFF->>Order: TCP ORDER.MARK_ITEMS_READY
  Order->>OrderDB: Mark order items READY and maybe order READY

  alt Order update succeeds
    Order-->>BFF: kitchenItemReady and optional orderStatusChanged
    BFF->>Realtime: emit events.kitchenItemReady
    opt Order status changed
      BFF->>Realtime: emit events.orderStatusChanged
    end
    BFF-->>KDSUI: Done accepted
  else Order update fails
    BFF->>Kitchen: TCP KITCHEN.RECALL_TICKET with compensation requestId
    Kitchen->>Redis: Recall ticket back to queue
    Kitchen-->>BFF: Compensation result
    BFF-->>KDSUI: Error from Order path
  end
```

1. Kitchen consumes `order.confirmed` from Kafka.
2. `order-confirmed.consumer.ts` deduplicates events and routes tickets by preparation station.
3. `KdsTicketService` manipulates KDS queue states via Redis repository facade.
4. `kds-ticket-store.repository.ts` stores ticket structures and manages Redis Sorted Sets.
5. `kds-sla-store.repository.ts` monitors SLA deadlines and schedules warnings.
6. `kds-recovery-store.repository.ts` tracks deduplication recovery data.
7. Staff interacts with KDS endpoints: `GET /admin/kds/queue`, `start`, `done`, `recall`, `priority`.
8. When marked `done`, BFF calls Kitchen `MARK_READY` TCP pattern, then updates Order `MARK_ITEMS_READY`.
9. If the Order DB update fails, BFF sends `RECALL_TICKET` to Kitchen to compensate the queue state.
10. Realtime pushes KDS state hints to POS, KDS, and PWA screens via BFF.

**Theory to know:**

- Kitchen does not have a separate SQL database; the KDS queue is an operational state backed by Redis.
- Redis Sorted Sets are ideal for KDS queues because score weights represent ticket timestamps, priority values, and SLA indicators.
- Deduplicating Kafka events prevents consumers from creating duplicate tickets when Kafka retries delivery.
- Marking a ticket done is a cross-service transaction: Kitchen sets ticket status, and Order marks order items. Since there is no distributed transactional boundary, a compensation step is needed.

**How to explain in interviews:**

> KDS is an operational queue, so I used Redis instead of a relational database. Kitchen consumes the `order.confirmed` event to generate tickets, applying deduplication to prevent double-processing. When the chef completes a ticket, the BFF orchestrates Kitchen and Order services. If Order fails to update item statuses, BFF triggers a compensation call to Kitchen to roll back the ticket state.

### Flow 5: Bill, Payment, VietQR/SePay, Refund

Read in order:

| Layer         | Files                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Customer UI   | `apps/customer-pwa/src/features/payment/services/payment.service.ts`                            |
| Customer UI   | `apps/customer-pwa/src/pages/request-payment-page.tsx`                                          |
| Management UI | `apps/management-app/src/features/payment/services/payment.service.ts`                          |
| Management UI | `apps/management-app/src/features/payment/hooks/use-payment.ts`                                 |
| Management UI | `apps/management-app/src/features/payment/components/bill-settlement-panel.tsx`                 |
| BFF           | `apps/bff/src/app/modules/payment/controllers/payment.controller.ts`                            |
| BFF           | `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts` customer bill APIs    |
| Order         | `apps/order/src/app/modules/order/services/bill.service.ts`                                     |
| Order         | `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts`                  |
| Payment       | `apps/payment/src/app/modules/payment/services/payment.service.ts` facade                       |
| Payment       | `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`                   |
| Payment       | `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts`                        |
| Payment       | `apps/payment/src/app/modules/payment/services/payment.service.ts`                              |
| Payment       | `apps/payment/src/app/modules/payment/services/payment-order.gateway.ts`                        |
| Payment       | `apps/payment/src/app/modules/payment/services/payment-reference.service.ts`                    |
| Payment       | `apps/payment/src/app/modules/payment/services/payment-outbox-publisher.service.ts`             |
| Tests         | `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts` |

Cash flow diagram:

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant Mgmt as Management App POS
  participant BFF as BFF PaymentController
  participant Payment as Payment service
  participant PaymentDB as Payment DB
  participant Order as Order service
  participant OrderDB as Order DB
  participant Kafka as Kafka
  participant BFFBridge as BFF Kafka bridge
  participant Realtime as BFF realtime

  Staff->>Mgmt: Confirm cash payment
  Mgmt->>BFF: POST /payment/cash/confirm
  BFF->>Payment: TCP PAYMENT.CONFIRM_CASH
  Payment->>Order: TCP ORDER.BILL_GET_PAYMENT_SNAPSHOT
  Order->>OrderDB: Load bill/session totals
  Order-->>Payment: Bill payment snapshot
  Payment->>Payment: Validate VND rounding and amountReceived
  Payment->>PaymentDB: Transaction lock/create Payment
  Payment->>PaymentDB: Save audit rows and payment.completed outbox
  Payment-->>BFF: PaymentTcpResponse
  BFF-->>Mgmt: Cash confirmed

  Payment->>Order: TCP ORDER.BILL_MARK_PAID
  Order->>OrderDB: Mark bill/session/table flow paid/closed
  Payment->>Kafka: PaymentOutboxPublisher publishes payment.completed
  Kafka-->>Order: payment.completed consumer retry-safety path
  Order->>OrderDB: markPaid idempotently if needed
  Kafka-->>BFFBridge: payment.completed
  BFFBridge->>Order: TCP ORDER.BILL_GET_PAYMENT_SNAPSHOT
  Order-->>BFFBridge: sessionId for bill
  BFFBridge->>Realtime: emit events.paymentCompleted
```

1. Staff or customer initiates payment, Order Service moves the bill state to `PENDING_PAYMENT`.
2. Staff confirms cash receipt via `POST /payment/cash/confirm`.
3. Payment Service requests the bill payment snapshot from Order.
4. Payment validates VND rounding logic and checks `amountReceived`.
5. Payment writes the payment record, saves audit logs, and pushes `payment.completed` to the outbox.
6. Payment calls Order `BILL_MARK_PAID` TCP message to close the bill, dining session, and free the table.
7. Order Service maintains `PaymentEventsConsumerService` to consume the Kafka event as an asynchronous retry-safety mechanism; the `markPaid` logic is written idempotently.

VietQR/SePay flow diagram:

```mermaid
sequenceDiagram
  autonumber
  actor Customer
  participant PWA as Customer PWA
  participant BFF as BFF
  participant Payment as Payment service
  participant PaymentDB as Payment DB
  participant Order as Order service
  participant OrderDB as Order DB
  participant SePay as SePay webhook
  participant Kafka as Kafka
  participant BFFBridge as BFF Kafka bridge
  participant Realtime as BFF realtime

  Customer->>PWA: Request VietQR payment
  PWA->>BFF: POST /customer/payment/vietqr/create-qr
  BFF->>Order: TCP ORDER.BILL_GET_CURRENT
  Order->>OrderDB: Verify current bill belongs to session
  Order-->>BFF: Current bill PENDING_PAYMENT
  BFF->>Payment: TCP PAYMENT.CREATE_VIETQR
  Payment->>Order: TCP ORDER.BILL_GET_PAYMENT_SNAPSHOT
  Order-->>Payment: Bill totals and status
  Payment->>PaymentDB: Create or reuse PENDING payment
  Payment->>Payment: Build billReference and QR URL
  Payment-->>BFF: QR presentation
  BFF-->>PWA: QR URL and payment info

  SePay->>BFF: POST /api/v1/payment/sepay/webhook/{tenantSlug} (Tier 1) or /platform (Tier 2 QRSUB)
  BFF->>BFF: SepayWebhookSecretGuard
  BFF->>Payment: TCP PAYMENT.HANDLE_SEPAY_WEBHOOK
  Payment->>Payment: Extract billReference and verify tenant secret if tenant route
  Payment->>PaymentDB: Lock payment by billReference

  alt Duplicate, after-paid, unmatched or underpaid
    Payment->>PaymentDB: Write audit only when payment matched
    Payment-->>BFF: success without mark paid
  else Valid incoming transfer
    Payment->>PaymentDB: Mark payment PAID and audit
    Payment->>PaymentDB: Save payment.completed outbox
    Payment->>Order: TCP ORDER.BILL_MARK_PAID
    Order->>OrderDB: Mark bill paid idempotently
    Payment-->>BFF: success
  end

  Payment->>Kafka: PaymentOutboxPublisher publishes payment.completed
  Kafka-->>Order: payment.completed consumer retry-safety path
  Kafka-->>BFFBridge: payment.completed
  BFFBridge->>Order: TCP ORDER.BILL_GET_PAYMENT_SNAPSHOT
  Order-->>BFFBridge: sessionId for bill
  BFFBridge->>Realtime: emit events.paymentCompleted
```

1. UI hits `POST /payment/vietqr/create-qr` or the customer PWA route through BFF.
2. Payment creates a pending payment structure, computes the bill reference, and generates the QR presentation parameters.
3. SePay webhook alerts the BFF: Tier 1 at `/api/v1/payment/sepay/webhook/:tenantSlug`, Tier 2 at `/webhook/platform`, or the legacy webhook at `/payment/sepay/webhook`.
4. `SepayWebhookService` validates the tenant webhook secret (if using tenant-specific routes), extracts the bill reference, locks the payment record, and prevents double-processing or underpayment.
5. On a valid transfer match, it updates payment to `PAID`, audits it, writes to the outbox, and fires a TCP call to Order Service to close the bill.
6. Order handles the transition idempotently if the event is delivered via the async broker path.
7. BFF Kafka bridge consumes `payment.completed`, queries the session ID from Order, and emits WebSocket notices to clients.

**Theory to know:**

- Order Service is the source of truth for bill states and dining sessions; Payment Service is the source of truth for payment ledgers and audit records.
- Payment does not compute bill totals; it acquires a read snapshot from Order and validates the VND rounding.
- Webhook processing must be idempotent because payment providers may retry webhooks multiple times.
- Audit logs for payment entries track external money movements for reconciliation.

**How to explain in interviews:**

> I decoupled bills from payments: bills belong to the Order domain because they represent dining session totals, while payments belong to the Payment domain because they handle bank interactions and auditing. Payment does not calculate bill totals; it queries a snapshot from Order, validates the VND rounding, records the receipt, and notifies Order. The webhook is processed idempotently to handle provider retries safely.

### Flow 6: SaaS Onboarding, Subscription, Tenant Lifecycle

Read in order:

| Layer         | Files                                                                           |
| ------------- | ------------------------------------------------------------------------------- |
| Management UI | `apps/management-app/src/features/saas/api.ts`                                  |
| Management UI | `apps/management-app/src/features/saas/README.md` (labels vs badges)            |
| Management UI | `apps/management-app/src/features/saas/components/badges/*`                     |
| Management UI | `libs/shared/constants/src/lib/vi-domain-labels.ts`                             |
| Management UI | `apps/management-app/src/features/saas/admin-tenants/onboard-tenant-dialog.tsx` |
| Management UI | `apps/management-app/src/features/saas/subscription/*`                          |
| Management UI | `apps/management-app/src/features/saas/payment-settings/*`                      |
| Customer PWA  | Customer PWA pages using `*Vi()` from `@einvoice/shared-constants`              |
| BFF           | `apps/bff/src/app/modules/saas/controllers/*.ts`                                |
| BFF           | `apps/bff/src/app/modules/saas/saas-bff-routes.ts`                              |
| SaaS          | `apps/saas/src/controllers/saas.controller.ts`                                  |
| SaaS          | `apps/saas/src/services/onboarding-saga.service.ts`                             |
| SaaS          | `apps/saas/src/services/tenant-admin.service.ts`                                |
| SaaS          | `apps/saas/src/services/tenant-lifecycle.service.ts`                            |
| SaaS          | `apps/saas/src/services/tenant-status-cache.service.ts`                         |
| SaaS          | `apps/saas/src/services/tenant-suspend-cron.service.ts`                         |
| SaaS          | `apps/saas/src/services/subscription.service.ts`                                |
| SaaS          | `apps/saas/src/services/subscription-invoice.service.ts`                        |
| SaaS          | `apps/saas/src/services/subscription-dashboard.service.ts`                      |
| SaaS          | `apps/saas/src/services/pricing-plan-admin.service.ts`                          |
| SaaS          | `apps/saas/src/services/saas-outbox-publisher.service.ts`                       |
| Shared        | `libs/constants/src/lib/saas.constants.ts`                                      |
| Shared        | `libs/entities/src/lib/tenant.entity.ts`                                        |
| Shared        | `libs/entities/src/lib/subscription.entity.ts`                                  |
| Shared        | `libs/entities/src/lib/subscription-invoice.entity.ts`                          |
| Shared        | `libs/entities/src/lib/pricing-plan.entity.ts`                                  |

Path note: `apps/saas` places its files directly under `src/controllers`, `src/services`, and `src/repositories`, rather than nesting inside `src/app/modules`.

Onboarding sequence diagram:

```mermaid
sequenceDiagram
  autonumber
  actor Admin
  participant Mgmt as Management App Admin
  participant BFF as BFF SaaS controllers
  participant SaaS as SaaS service
  participant SaaSDB as SaaS DB
  participant Authorizer as Authorizer/Keycloak
  participant UserAccess as User Access
  participant Payment as Payment service
  participant Kafka as Kafka
  participant Catalog as Catalog service

  Admin->>Mgmt: Submit onboard tenant form
  Mgmt->>BFF: Admin tenant onboarding request
  BFF->>BFF: User, Tenant, Permission guards
  BFF->>SaaS: TCP TENANT.ONBOARD
  SaaS->>SaaS: SlugService.generateUnique
  SaaS->>SaaSDB: Create Tenant ACTIVE
  SaaS->>Authorizer: TCP KEYCLOAK.CREATE_TENANT_OWNER
  Authorizer-->>SaaS: ownerUserId
  SaaS->>UserAccess: TCP USER.UPSERT_WITH_TENANT
  UserAccess-->>SaaS: Owner profile upserted
  SaaS->>SaaSDB: Assign initial subscription plan snapshot
  SaaS->>Payment: TCP PAYMENT_SETTINGS.CREATE_EMPTY
  Payment-->>SaaS: Empty payment settings created
  SaaS->>SaaSDB: Create saas outbox tenant.created
  SaaS-->>BFF: Tenant and ownerUserId
  BFF-->>Mgmt: Onboarding success

  SaaS->>Kafka: SaasOutboxPublisher publishes tenant.created
  Kafka-->>Catalog: TenantCreatedConsumer
  Catalog->>Catalog: Seed default area for tenant

  alt Keycloak/UserAccess/Payment/subscription step fails
    SaaS->>Authorizer: TCP KEYCLOAK.DISABLE_USER if owner was created
    SaaS->>SaaSDB: Compensate initial subscription if assigned
    SaaS->>SaaSDB: Delete tenant
    SaaS-->>BFF: TENANT_ONBOARDING_FAILED
  end
```

1. Admin triggers tenant onboarding from the Management App.
2. BFF SaaS controller forwards the request via TCP message `TENANT.ONBOARD`.
3. `OnboardingSagaService` manages tenant creation, Owner provisioning on Authorizer/Keycloak, Owner profile synchronization on User Access, empty payment settings setups on Payment, subscription plans setups, and logs outbox events.
4. If a critical step fails, the saga triggers compensating actions to clean up partially created user/tenant records.

Tenant lifecycle sequence diagram:

```mermaid
sequenceDiagram
  autonumber
  actor AdminOrCron as Admin or Suspend Cron
  participant BFF as BFF SaaS controllers
  participant SaaS as SaaS service
  participant SaaSDB as SaaS DB
  participant Redis as Redis tenant status cache
  participant Customer as Customer PWA
  participant Guard as CustomerTenantLifecycleGuard

  AdminOrCron->>BFF: Suspend, activate or close tenant
  BFF->>SaaS: TCP TENANT.SUSPEND / ACTIVATE / CLOSE
  SaaS->>SaaSDB: Assert tenant exists
  SaaS->>SaaSDB: Update tenant status fields

  alt SUSPEND or CLOSE
    SaaS->>Redis: SET tenant suspended flag
  else ACTIVATE
    SaaS->>Redis: DEL tenant suspended flag
  end

  SaaS-->>BFF: Lifecycle mutation success

  Customer->>BFF: Customer/menu request
  BFF->>Guard: Run lifecycle guard for /customer or /menu path
  Guard->>Redis: Read suspended flag
  Guard->>SaaS: TCP SAAS.GET_BY_ID for current status

  alt Tenant CLOSED
    Guard-->>Customer: 403 TENANT_CLOSED
  else Tenant SUSPENDED and write request
    Guard-->>Customer: 403 TENANT_SUSPENDED
  else Tenant ACTIVE or allowed read/join/payment path
    Guard-->>BFF: Allow request to continue
```

1. Tenants are assigned a status: active, suspended, or closed.
2. `TenantLifecycleService` modifies tenant status attributes.
3. `TenantStatusCacheService` updates the status flag in Redis.
4. `CustomerTenantLifecycleGuard` on BFF references Redis to block PWA customer order/menu flows.
5. `TenantSuspendCronService` automatically suspends tenants if subscriptions expire beyond the grace period.

**Theory to know:**

- SaaS Service manages platform-level tenant lifecycles, separating administrative state from restaurant operations.
- Tenant onboarding is modeled as a saga because it crosses multiple boundaries: Keycloak, User Access, Payment, and Subscription.
- Subscriptions store snapshots of selected pricing plans to ensure invoices and historical data remain stable even if plans are edited.
- Tenant lifecycles are treated as authorization/business gates rather than just cosmetic UI values.

**How to explain in interviews:**

> Tenant onboarding is a distributed workflow, so I implemented it as a saga without distributed transactions. SaaS creates the tenant, owner credentials, user profile, payment settings, and subscription; if a step fails, it compensates by rolling back changes. Tenant statuses are cached in Redis to let the BFF guard quickly block customer flows when a tenant is suspended or closed.

### Flow 7: Auth, Keycloak, User Access, RBAC

Read in order:

| Layer          | Files                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| Management App | `apps/management-app/src/auth.ts`                                              |
| Management App | `apps/management-app/src/middleware.ts`                                        |
| Management App | `apps/management-app/src/lib/auth/*`                                           |
| BFF            | `libs/guards/src/lib/user.guard.ts`                                            |
| BFF            | `libs/guards/src/lib/permission.guard.ts`                                      |
| BFF            | `libs/guards/src/lib/tenant.guard.ts`                                          |
| Authorizer     | `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` |
| Authorizer     | `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`            |
| Authorizer     | `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts`          |
| User Access    | `apps/user-access/src/app/modules/user/services/user.service.ts`               |
| User Access    | `apps/user-access/src/app/modules/user/services/tenant-user.service.ts`        |
| User Access    | `apps/user-access/src/app/modules/user/services/staff-quota.enforcer.ts`       |
| Shared         | `libs/constants/src/lib/enum/role.enum.ts`                                     |
| Docs           | `docs/architecture/permission-matrix.md`                                       |

Flow diagram:

```mermaid
sequenceDiagram
  autonumber
  actor Staff
  participant Mgmt as Management App
  participant Keycloak as Keycloak
  participant BFF as BFF
  participant UserGuard as UserGuard
  participant Authorizer as Authorizer service
  participant UserAccess as User Access
  participant TenantGuard as TenantGuard
  participant PermissionGuard as PermissionGuard
  participant Domain as Domain service

  Staff->>Mgmt: Login
  Mgmt->>Keycloak: OIDC/NextAuth login flow
  Keycloak-->>Mgmt: Access token/session
  Mgmt->>BFF: API request with Bearer token and tenant context
  BFF->>UserGuard: Global guard step 1
  UserGuard->>Authorizer: gRPC/TCP verify user token
  Authorizer->>Keycloak: Verify token/JWKS or admin lookup
  Authorizer->>UserAccess: Load app profile/roles if needed
  Authorizer-->>UserGuard: User metadata and roles
  UserGuard-->>BFF: Attach USER_DATA
  BFF->>TenantGuard: Global guard step 2
  TenantGuard->>TenantGuard: Resolve tenant from header/claims/session
  TenantGuard-->>BFF: Attach TENANT_ID
  BFF->>PermissionGuard: Global guard step 3
  PermissionGuard->>PermissionGuard: Match @Permissions metadata

  alt Missing permission or invalid tenant
    PermissionGuard-->>Mgmt: 403 forbidden
  else Authorized
    BFF->>Domain: TCP request with tenantId/userId/processId
    Domain-->>BFF: Domain response
    BFF-->>Mgmt: HTTP response
  end
```

1. Staff/owner/admin logs in via Keycloak/NextAuth.
2. Management App requests BFF endpoints with a Bearer token.
3. `UserGuard` validates the token via Authorizer and caches the result.
4. `TenantGuard` extracts and resolves the tenant ID from the token claims, session, or headers.
5. `PermissionGuard` checks if the user possesses the permissions required by the route decorators.
6. Domain services receive pre-resolved tenant and user IDs inside TCP payloads, bypassing HTTP layer dependencies.

**Theory to know:**

- Keycloak acts as the Identity Provider; User Access Service stores application-level profile information and tenant-specific staff records.
- Authentication answers "who are you"; authorization/permissions answer "what are you allowed to do".
- Tenant isolation context must be resolved at the API Gateway level to ensure database queries are filtered correctly.

**How to explain in interviews:**

> I separated authentication from application authorization. Keycloak manages logins and token issuance, Authorizer handles validation, and User Access maintains tenant-specific profile records. The BFF guard chain attaches user and tenant context to incoming requests before routing them to domain services, ensuring they are independent of Express HTTP details.

### Flow 8: Realtime and Client Cache

Read in order:

| Layer       | Files                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| BFF         | `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`           |
| BFF         | `apps/bff/src/app/modules/realtime/realtime.module.ts`                         |
| BFF         | `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`          |
| BFF         | `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`        |
| BFF         | `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`  |
| BFF         | `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts` |
| BFF         | `apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.ts`               |
| Shared      | `libs/constants/src/lib/ws-room.constants.ts`                                  |
| Shared      | `libs/shared/types/src/lib/realtime-events.types.ts`                           |
| Customer UI | `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts`    |
| Customer UI | `apps/customer-pwa/src/components/realtime/realtime-status-pill.tsx`           |
| Staff UI    | `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts`     |
| KDS UI      | `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts`               |
| Tests       | `apps/bff/src/app/modules/realtime/tests/architecture-contracts.spec.ts`       |

Sequence of events:

```mermaid
sequenceDiagram
  autonumber
  participant Client as Customer or Staff UI
  participant Gateway as OrderEventsGateway
  participant Auth as RealtimeAuthService
  participant Rooms as WsRoom builders
  participant Domain as Domain controllers/events
  participant Kafka as Kafka
  participant RedisPubSub as Redis pub/sub
  participant Bridge as Realtime bridges/subscribers
  participant Realtime as RealtimeEventsService

  Client->>Gateway: Connect Socket.IO namespace /orders
  Gateway->>Auth: resolveConnectionRooms(socket)
  Auth->>Auth: Read handshake auth, token/session/tenant/station
  Auth->>Rooms: Build customer/staff/management/kds rooms
  Rooms-->>Auth: Room names
  Auth-->>Gateway: Allowed rooms
  Gateway->>Gateway: socket.join(room)
  Gateway-->>Client: Connected

  alt Client sends legacy join.session or join.staff
    Client->>Gateway: join.session / join.staff
    Gateway-->>Client: events.authError, room assignment is server-managed
  end

  Domain->>Realtime: emitCartUpdated/orderCreated/orderStatusChanged/etc.
  Realtime->>Rooms: Resolve target rooms
  Realtime-->>Client: Socket event as invalidation hint

  Kafka-->>Bridge: kitchen.sla_warning or payment.completed
  Bridge->>Realtime: emitKitchenSlaWarning or emitPaymentCompleted
  Realtime-->>Client: Socket event

  RedisPubSub-->>Bridge: realtime:kds:* kds.queue_changed
  Bridge->>Realtime: emitKdsQueueChanged
  Realtime-->>Client: events.kdsQueueChanged
```

1. Clients connect to the Socket.IO namespace `/orders`.
2. `RealtimeAuthService` parses connection parameters to resolve room names.
3. Room assignments are managed by the server; legacy client messages like `join.session` or `join.staff` are rejected with error messages.
4. Bounded context updates (Order, Payment, Kitchen) are mapped to targets and emitted via BFF.
5. The client uses the WebSocket payload as a hint to trigger a TanStack Query invalidate/refetch.
6. `subscribe.kds` is an exception that accepts client parameters, but BFF still checks tenant/role boundaries before joining the station room.

**Theory to know:**

- WebSocket payloads should not contain canonical business state.
- The source of truth for state remains HTTP/TCP query endpoints back to the owning microservice.
- The Redis Socket.IO adapter distributes room emissions across multiple BFF instances horizontally.
- Room names must be created using the `WsRoom` builder to avoid hardcoded inconsistencies.

**How to explain in interviews:**

> Realtime events in QRTable function as query invalidation hints. When order, payment, or KDS events occur, BFF pushes a WebSocket event to let the client refetch data. I avoided placing business state inside WebSocket payloads because the database and domain services remain the source of truth.

### Deep Dive: Realtime, Kafka, Redis Reading Strategy

Trace these three parts by **data signals** rather than analyzing each tool in isolation. A single business event often flows through Kafka, Redis, and WebSockets, with each layer serving a specific purpose:

| Layer     | Role in QRTable                                       | What it is NOT                                   |
| --------- | ----------------------------------------------------- | ------------------------------------------------ |
| Kafka     | Durable async event log between service owners.       | Not a channel to push data directly to browsers. |
| Redis     | Short-term operational state, cache, queues, pub-sub. | Not a replacement for PostgreSQL audit ledgers.  |
| WebSocket | Push invalidation hints to client rooms via BFF.      | Not the source of truth for business states.     |

#### Track A: Order Confirm -> Kitchen KDS

Read in order:

1. `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts` — HTTP actions and immediate WebSocket emissions for POS UI.
2. `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts` — handles transaction boundary, stock deduct requests, and outbox logs.
3. `apps/order/src/app/modules/order/services/outbox-publisher.service.ts` — publishes `order.confirmed` to Kafka post-commit.
4. `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts` — consumes, validates, and deduplicates the message.
5. `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts` — facade managing ticket, SLA, and recovery stores on Redis.
6. `apps/kitchen/src/app/modules/kitchen/services/kitchen-events.publisher.ts` — publishes `realtime:kds:{tenantId}` to Redis pub/sub.
7. `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts` — subscribes to Redis pub/sub and invokes the realtime service.
8. `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts` — translates events and broadcasts to the target `WsRoom`.
9. `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts` — KDS UI hook intercepts hints and triggers a query refetch.

When reading this track, ask: which events require durability, which states are simply transient queues, and does the client treat payload data as canonical state?

#### Track B: Payment Completed -> UI Realtime

Read in order:

1. `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts` or `sepay-webhook.service.ts` — writes payment record and outbox event `payment.completed`.
2. `apps/payment/src/app/modules/payment/repositories/payment-outbox.repository.ts` — manages transaction outbox logging.
3. `apps/payment/src/app/modules/payment/services/payment-outbox-publisher.service.ts` — publishes to Kafka.
4. `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts` — async consumer handles order/session closure idempotently.
5. `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts` — consumes Kafka `payment.completed`, resolves session info, and routes to WebSocket service.
6. `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts` — broadcasts `events.paymentCompleted` to customer and staff rooms.
7. Customer/staff payment hooks — refetches bill/payment states from HTTP API endpoints.

Do not view the BFF bridge as the owner of payment state. It simply translates Kafka messages into UI invalidation signals.

#### Track C: Room, Key, Topic Contracts

Read contracts first:

| Contract                 | File                                                                     | Key Question to Answer                                     |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| WebSocket rooms          | `libs/constants/src/lib/ws-room.constants.ts`                            | Which tenant, session, or KDS station room gets the event? |
| Realtime event payloads  | `libs/shared/types/src/lib/realtime-events.types.ts`                     | Is the payload data a hint or canonical state?             |
| Redis key builders       | `libs/constants/src/lib/redis-key.constants.ts`                          | Are keys scoped correctly to tenant/session boundaries?    |
| KDS Redis key/score      | `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`, `kds-score.ts` | How are queues sorted by time, priority, and SLA?          |
| Kafka config/topic names | `libs/configuration/src/lib/kafka.config.ts`                             | Which topics are active, and which consumers are bound?    |
| TCP messages             | `libs/constants/src/lib/enum/tcp-request-message.ts`                     | What sync boundaries must occur before async events?       |

Rule of thumb: If you spot hardcoded rooms, keys, or topics, trace them back to shared constants. If a WebSocket payload contains large data structures, find the underlying API query hook.

## Round 4: Shared Libs and Contracts

Review shared libraries after understanding domain flows to see how contracts are reused across services.

| Lib path                      | Current role                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `libs/configuration`          | Centralized config, TCP service tokens, Redis/throttler configurations.             |
| `libs/constants`              | TCP message patterns, role/permission enums, RedisKey, WsRoom, SaaS constants.      |
| `libs/interfaces`             | Gateway DTOs, TCP request/response contracts, gRPC proto specifications.            |
| `libs/entities`               | TypeORM database entities shared across backend services.                           |
| `libs/schemas`                | Mongoose database schemas used by user-access.                                      |
| `libs/guards`                 | Edge security guards (User, Tenant, Session).                                       |
| `libs/middlewares`            | Logger and tenant injection middlewares.                                            |
| `libs/interceptors`           | Exception mapping and TCP connection logging interceptors.                          |
| `libs/decorators`             | Custom decorators (Permissions, CurrentUser, ProcessId).                            |
| `libs/error-messages`         | BusinessException framework, ErrorCode enums, and database error mapping utilities. |
| `libs/providers/redis-client` | Centrally configured Redis clients.                                                 |
| `libs/providers/cloudinary`   | Cloudinary media upload integration.                                                |
| `libs/utils`                  | Shared utilities, request helpers, and VND rounding helpers.                        |
| `libs/shared/types`           | Frontend-backend types exposed via `@einvoice/types`.                               |
| `libs/shared/constants`       | UI constants; `vi-domain-labels.ts` maps wire enums to Vietnamese labels.           |
| `libs/frontend/ui`            | Shared Tailwind/Shadcn components.                                                  |
| `libs/frontend/hooks`         | Shared React hooks (WebSocket, React Query wrappers).                               |
| `libs/frontend/utils`         | Formatting helpers (VND currency format, dates).                                    |
| `libs/shared/mock-data`       | Shared mock data files for testing and storybook.                                   |

**Read closely:**

- `libs/constants/src/lib/enum/tcp-request-message.ts`
- `libs/constants/src/lib/redis-key.constants.ts`
- `libs/constants/src/lib/ws-room.constants.ts`
- `libs/constants/src/lib/saas.constants.ts`
- `libs/interfaces/src/lib/tcp/*`
- `libs/interfaces/src/lib/gateway/*`
- `libs/entities/src/lib/*.entity.ts`
- `libs/error-messages/src/lib/error-code.enum.ts`

**Theory to know:**

Shared libraries should not be used as dumping grounds for any shared code. They should house cross-cutting concerns: contract boundaries, DTO interfaces, global constants, and core utilities. Keep business logic encapsulated within its owning service.

**How to explain in interviews:**

> Shared libraries stabilize the interfaces between apps and services, including TCP message contracts, entities, and validation models. I avoid placing domain logic inside shared libs to maintain microservice boundaries.

## Round 5: Frontend Surfaces

### Customer PWA Reading Order

Read in order:

1. `apps/customer-pwa/src/main.tsx`
2. `apps/customer-pwa/src/App.tsx`
3. `apps/customer-pwa/src/constants/routes.ts`
4. `apps/customer-pwa/src/lib/api-client.ts`
5. `apps/customer-pwa/src/features/session/context/session-provider.tsx`
6. `apps/customer-pwa/src/pages/landing-page.tsx`
7. `apps/customer-pwa/src/features/landing/*`
8. `apps/customer-pwa/src/pages/menu-page.tsx`
9. `apps/customer-pwa/src/features/menu/*`
10. `apps/customer-pwa/src/features/order/*`
11. `apps/customer-pwa/src/features/payment/*`
12. `apps/customer-pwa/src/features/tenant/*`

Key takeaways:

- The PWA follows a mobile-first customer journey.
- Session contexts and request headers are used instead of traditional user logins.
- React Query hooks act as the layer interfacing with server states.
- WebSocket hooks provide realtime invalidation triggers.

### Management App Reading Order

Read in order:

1. `apps/management-app/src/app/layout.tsx`
2. `apps/management-app/src/app/providers.tsx`
3. `apps/management-app/src/auth.ts`
4. `apps/management-app/src/middleware.ts`
5. `apps/management-app/src/components/layout/data/sidebar-data.ts`
6. `apps/management-app/src/lib/api/authenticated-client.ts`
7. `apps/management-app/src/app/(dashboard)/*`
8. `apps/management-app/src/app/(pos)/*`
9. `apps/management-app/src/app/(kds)/*`
10. `apps/management-app/src/app/(admin)/*`
11. `apps/management-app/src/features/menu/*`
12. `apps/management-app/src/features/tables/*`
13. `apps/management-app/src/features/order/*`
14. `apps/management-app/src/features/payment/*`
15. `apps/management-app/src/features/kds/*`
16. `apps/management-app/src/features/saas/*`
17. `apps/management-app/src/features/service-requests/*`
18. `apps/management-app/src/features/tenant/*`

Key takeaways:

- Next.js route groups organize workspaces: admin, dashboard, POS, and KDS.
- `features/*/services` encapsulate API calls.
- `features/*/hooks` manage server mutations and real-time triggers.
- `components/pos/*` and `components/kds/*` implement high-frequency staff UI workflows.

**Theory to know:**

Separating local UI state from server state is a frontend best practice. Server state should be managed via TanStack Query and service layers, avoiding hardcoded endpoints inside layout files.

**How to explain in interviews:**

> The frontends follow a structure of route -> feature service -> query hook -> component. Management App uses route groups to isolate admin/dashboard/POS/KDS views, while Customer PWA focuses on session-based, anonymous flows. I treat WebSocket events as invalidation triggers, and do not let them bypass query API sources of truth.

## Round 6: Tests and Traceability

Analyze test structures by business flow, rather than looking at all tests at once.

| Flow            | Target Tests to Read                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Cart/order      | `apps/order/src/app/modules/order/tests/order-submit-cart.integration.spec.ts`                   |
| Stock/confirm   | `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts`             |
| Payment/bill    | `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts`  |
| KDS dedupe      | `apps/kitchen/src/app/modules/kitchen/tests/order-confirmed-dedupe.integration.spec.ts`          |
| Realtime        | `apps/bff/src/app/modules/realtime/tests/*`                                                      |
| BFF controllers | `apps/bff/src/app/modules/**/**/*.spec.ts`                                                       |
| Frontend hooks  | `apps/customer-pwa/src/features/**/*.spec.tsx`, `apps/management-app/src/features/**/*.spec.tsx` |
| E2E             | `tests/e2e/*.spec.ts` and the scripts defined in `package.json`                                  |

Read also:

- `docs/testing/README.md`
- `docs/testing/traceability-matrix.md`
- `docs/testing/saga-validation-strategy.md` when a flow touches consistency or compensation

Key commands to run:

```bash
pnpm nx test order
pnpm nx test kitchen
pnpm nx test payment
pnpm nx test bff
pnpm e2e:demo
```

**Theory to know:**

Microservice testing should protect boundary contracts: state transitions, idempotency guarantees, API schema validation, consumer deduplication, compensation flows, and external integration behavior, rather than only focusing on happy-path controller testing.

## File Landmarks

| Concept to Understand     | Target File to Open                                                             |
| ------------------------- | ------------------------------------------------------------------------------- |
| BFF bootstrap             | `apps/bff/src/main.ts`                                                          |
| BFF guard chain           | `apps/bff/src/app/app.module.ts`                                                |
| TCP message patterns      | `libs/constants/src/lib/enum/tcp-request-message.ts`                            |
| Kafka topic configuration | `libs/configuration/src/lib/kafka.config.ts`                                    |
| Redis keys                | `libs/constants/src/lib/redis-key.constants.ts` and Kitchen `utils/kds-keys.ts` |
| WebSocket rooms           | `libs/constants/src/lib/ws-room.constants.ts`                                   |
| Realtime event payloads   | `libs/shared/types/src/lib/realtime-events.types.ts`                            |
| BFF realtime registration | `apps/bff/src/app/modules/realtime/realtime.module.ts`                          |
| BFF KDS Redis subscriber  | `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts`  |
| Error hierarchy           | `libs/error-messages/src/lib/business.exception.ts`, `error-code.enum.ts`       |
| Order facade              | `apps/order/src/app/modules/order/services/order.service.ts`                    |
| Order submit logic        | `apps/order/src/app/modules/order/services/order-submit.service.ts`             |
| Order state machine       | `apps/order/src/app/modules/order/services/order-state-transition.service.ts`   |
| Order bill management     | `apps/order/src/app/modules/order/services/bill.service.ts`                     |
| Order outbox publishing   | `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`         |
| Kitchen ticket logic      | `apps/kitchen/src/app/modules/kitchen/services/kds-ticket.service.ts`           |
| Kitchen Redis repository  | `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts`     |
| Kitchen realtime publish  | `apps/kitchen/src/app/modules/kitchen/services/kitchen-events.publisher.ts`     |
| Payment settlement        | `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`   |
| SePay webhook parsing     | `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts`        |
| SaaS onboarding saga      | `apps/saas/src/services/onboarding-saga.service.ts`                             |
| Tenant lifecycle rules    | `apps/saas/src/services/tenant-lifecycle.service.ts`                            |
| Authorizer token checks   | `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`             |
| User profile management   | `apps/user-access/src/app/modules/user/services/user.service.ts`                |
| Customer PWA client       | `apps/customer-pwa/src/lib/api-client.ts`                                       |
| Management app client     | `apps/management-app/src/lib/api/authenticated-client.ts`                       |
| Management sidebar map    | `apps/management-app/src/components/layout/data/sidebar-data.ts`                |

## Command Cheat Sheet

```bash
# Workspace analysis
npx nx show projects
npx nx graph

# Search directories quickly
rg --files apps/order/src/app/modules/order
rg --files apps/kitchen/src/app/modules/kitchen
rg --files apps/management-app/src/features

# Trace route decorators and message patterns
rg "@(Get|Post|Patch|Delete|Controller)\\(" apps/bff/src/app/modules -n
rg "@MessagePattern" apps/order apps/kitchen apps/payment apps/catalog apps/saas -n

# Trace contracts
rg "TCP_REQUEST_MESSAGE\\.ORDER" apps libs -n
rg "WsRoom" apps libs -n
rg "RedisKey" apps libs -n
rg "KAFKA_CONFIG|ORDER_CONFIRMED_TOPIC|PAYMENT_COMPLETED_TOPIC|KITCHEN_SLA_WARNING_TOPIC|TENANT_CREATED_TOPIC" apps libs -n
rg "realtime:kds|KdsInternalEventsSubscriber|KitchenEventsPublisher" apps libs -n
rg "events\\.(orderCreated|orderStatusChanged|kdsQueueChanged|paymentCompleted)" apps libs -n

# Run focused code slices
pnpm dev:bff-order
pnpm dev:bff-payment
pnpm dev:bff-auth

# Validate documentation format
pnpm exec prettier --check docs/guides/codebase-reading-map.md
```

## Common Mistakes When Reading the Codebase

| Mistake                                                 | Correction                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Analyzing `apps/order` before BFF and Catalog.          | Start with the BFF routes and TCP message types, then inspect Order internals.                         |
| Assuming Payment Service owns Bills.                    | Order Service owns Bills; Payment Service manages Payments/Auditing/Refunds.                           |
| Assuming Kitchen Service owns an SQL database.          | Kitchen Service is currently a Redis-backed KDS queue.                                                 |
| Looking for SaaS modules under `src/app/modules`.       | SaaS files are placed directly under `apps/saas/src/controllers`, `services`, and `repositories`.      |
| Treating WebSocket payloads as the state source.        | WebSockets provide realtime invalidation; API queries back to owning services are the source of truth. |
| Hardcoding topics, rooms, or keys in application logic. | Use constant builders: `TCP_REQUEST_MESSAGE`, `RedisKey`, `WsRoom`, SaaS constants.                    |
| Getting confused by target documentation aliases.       | Check `tsconfig.base.json`: current aliases are `@common/*` and `@einvoice/*`.                         |
| Analyzing generated build folders.                      | Ignore `.next`, `dist`, and `node_modules`; analyze code under `src`.                                  |
| Treating BFF as the home of business logic.             | BFF coordinates boundaries; domain state rules belong to service owners.                               |
| Bypassing test files.                                   | Tests document application expectations and verify state behaviors.                                    |

## Recommended Study Plan

### Step 1: Map the Boundaries

1. Read `docs/README.md`, `technical-architecture.md`, and `business-logic.md`.
2. Open `package.json`, `tsconfig.base.json`, and `nx.json`.
3. Review `apps/bff/src/app/app.module.ts` to trace the guard chain.
4. Examine `libs/constants/src/lib/enum/tcp-request-message.ts` to map internal message boundaries.

Target: Understand which services interact and identify request flow paths.

### Step 2: Trace a Customer Order End-to-End

1. Trace PWA landing pages, dining sessions, and menu retrievals.
2. Trace BFF session management and order submission endpoints.
3. Trace Catalog table validations and menu details.
4. Trace Order cart operations, order submissions, and bill generation.
5. Trace staff confirmation, Catalog stock updates, Order outbox events, and Kitchen KDS queue updates.
6. Trace bill settlements, Payment service updates, Order mark-paid updates, and client notifications.

Target: Trace a dining session from the initial QR scan to final bill payment.

### Step 3: Platform Administration

1. Trace Authentication, Keycloak interactions, and User Access profiles.
2. Trace Permission matrices and BFF guard validations.
3. Trace SaaS onboarding sagas, subscriptions, and tenant lifecycles.
4. Trace Management App pages: Admin, Dashboard, POS, and KDS.
5. Trace Phase 5 testing strategies and traceability matrices.

Target: Understand the SaaS POS platform model, going beyond order-taking details.

## Interview-Ready Questions

Answer these questions to test your understanding:

1. Why does QRTable use a BFF instead of letting the frontend invoke microservices directly?
2. Why does Order invoke Catalog via TCP to deduct stock instead of importing Catalog's repository?
3. Why doesn't submitting an order deduct stock immediately?
4. How does an idempotency key differ from a cart version optimistic concurrency check?
5. Why does Kitchen use a Redis queue instead of an SQL database?
6. If KDS marks a ticket as ready in Kitchen but the update fails in Order, what happens?
7. Why does the Bill belong to Order while the payment ledger belongs to Payment?
8. How does the SePay webhook handler manage duplicate or underpaid transfers?
9. At which layer does a suspended tenant block customer actions?
10. Should WebSocket events in QRTable be treated as the source of truth or as invalidation hints?

If you can answer these 10 questions using flow and ownership principles, your codebase understanding is interview-ready.

## Summary

Read the QRTable codebase in this order: **BFF boundary -> domain flow -> service owner -> shared contract -> frontend surface -> tests**.

Boundary overview:

```text
Customer/Staff UI
  -> BFF controller + guard chain
  -> TCP/gRPC contract
  -> Service owner
  -> Repository/state store
  -> Kafka/Redis/WebSocket side effects
  -> Frontend query invalidation/refetch
```

Apply this data flow model to analyze new features. When encountering new files, identify their boundary roles and state ownership first before analyzing local logic.
