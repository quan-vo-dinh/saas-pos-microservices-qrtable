# Redis Usage Analysis — Current Implementation and Projected Design

> Date: 2026-05-14
> Scope: `docs/business-logic.md`, `docs/technical-architecture.md`, `docs/implementation_plan.md`, `docs/phases/*`, Redis docs/spec, and current code in `apps/`, `libs/`, `tools/`.
> Objective: clarify all Redis parts in the QRTable system in a way that is easy to read, easy to look up, and easy to verify for Vietnamese people.

> **Current status — supporting analysis:** This document is a supporting reference. The canonical source for the Redis architecture is [technical architecture](./technical-architecture.md) and the current code. After Phase 4B, verified Redis users include BFF, Order, Kitchen/WebSocket, SaaS and Payment. Catalog, Authorizer and User-Access have not been verified as direct Redis users; Notification is currently deferred/not current.

## 1. Quick Summary

Redis has been used in the system, but it is necessary to clearly separate two groups:

1. **Implemented in current code**
   - Infrastructure: Redis and Redis Insight in Docker Compose.
   - BFF cache layer: `@nestjs/cache-manager` + `@keyv/redis`.
   - BFF global rate limiting: NestJS Throttle uses Redis storage.
   - BFF WebSocket scale-out: Socket.io Redis Adapter.
   - BFF KDS fan-out subscriber: `realtime:kds:*`.
   - Personnel JWT authentication cache: `user-token:{sha256(jwt)}`.
   - Anonymous session at BFF for customer/guest: `bff-session:{tenantId}:{sessionId}`.
   - Cache public menu: `menu:{tenantId}`.
   - Order service accesses Redis directly via `ioredis`.
   - Cache active session of Order domain: `session:{tenantId}:{sessionId}`.
   - Shared cart: `cart:{tenantId}:{sessionId}`.
   - Table switching lock: `transfer:*` and `table-transfer:*`.
   - Counter single quota by day: `quota:{tenantId}:orders:{date}`.
   - Kitchen service Redis-only KDS store: `kds:*`, SLA/dedupe/lock keys.
   - SaaS service: suspend flag `tenant:{tenantId}:suspended` and current subscription cache `subscription:{tenantId}`.
   - Payment service: SePay OAuth state cache `oauth_state:{state}`.
   - Script dev reset/verify: flush Redis local and check the old tenant key.

2. **Already in the documents or roadmap, but not yet deployed**
   - Table status cache Catalog: `table:{tenantId}:{tableId}:status`.
   - Redis idempotency key for order creation / hardening.
   - Optional Redis cache for Authorizer/JWKS.
   - Rate limit business by QR scan / session, in addition to the current global HTTP throttler.

The most important architectural point: **Redis in BFF is mainly cache or edge state**, while **Redis in Order service is active domain state for the session/cart taking place at the restaurant**. PostgreSQL remains the source of truth for persistent sessions, orders, bills, service requests and stock.

## 2. Redis Semantics Reconciled Using Context7

Context7 was used to look up the current Redis document (`/redis/docs`). Redis patterns used as comparison criteria include:

- **Cache-aside with TTL:** try reading Redis first; If you miss, read from the source of truth and then write back to Redis with the expiration time.
- **Distributed lock:** acquire with `SET key uniqueValue NX EX/PX ttl`; release only if the value in the key still belongs to the current request, it's best to use Lua for atomic check-and-delete.
- **Rate limiting:** increases the counter within a time window and then sets expiry for the key.
- **TTL inspection:** `TTL` returns the remaining seconds, `-1` if the key has no expiry, `-2` if the key does not exist.

These semantics are important because QRTable uses Redis for both short-term caching and coordinating multiple requests.

Source Context7:

- `https://github.com/redis/docs/blob/main/AGENT.md`
- `https://github.com/redis/docs/blob/main/content/commands/incr.md`
- `https://github.com/redis/docs/blob/main/content/commands/ttl.md`

## 3. Redis Infrastructure and Client Layers

### 3.1 Docker Runtime

Redis is provided in `docker-compose.provider.yaml`.

Runtime information:

| Ingredients | Value                                   |
| ----------- | --------------------------------------- |
| service     | `redis`                                 |
| Image       | `redis`                                 |
| Port        | `6379:6379`                             |
| Healthcheck | `redis-cli ping`                        |
| Volume      | `./docker/docker_data/redis_data:/data` |
| Included UI | `redis-insight` on port `5540`          |

Related codes:

- `docker-compose.provider.yaml`

### 3.2 Dependencies

Redis related packages are available in `package.json`:

| Packages                                  | Go there                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `@keyv/redis`                             | Redis store for Nest CacheModule / cache-manager.                        |
| `@nestjs/cache-manager` + `cache-manager` | Abstraction cache for BFF and guards.                                    |
| `@nest-lab/throttler-storage-redis`       | Redis storage for NestJS Throttler.                                      |
| `@nestjs/throttler`                       | Global HTTP rate limiting.                                               |
| `ioredis`                                 | Direct Redis client for Order, Kitchen, SaaS, Payment and dev scripts.   |
| `redis`                                   | Node Redis client for BFF realtime adapter/subscriber.                   |
| `@socket.io/redis-adapter` + `socket.io`  | WebSocket transport and Redis Adapter for multi-instance room broadcast. |

### 3.3 Two Types of Redis Access

| Access type                    | Used by                              | Code                                         | Why use                                                                   |
| ------------------------------ | ------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| CacheManager + Keyv Redis      | BFF, guards                          | `libs/configuration/src/lib/redis.config.ts` | Matches simple cache data via `get/set/del`.                              |
| Direct `ioredis`               | Order, Kitchen, SaaS, Payment, tools | `libs/providers/redis-client/*`              | Needs Hashes, locks, `MULTI`, `PEXPIRE`, counters, and direct key checks. |
| Node Redis / Socket.io adapter | BFF realtime/WebSocket               | `apps/bff/src/app/modules/realtime/*`        | Pub/Sub, Socket.io Redis Adapter and internal KDS fan-out.                |

## 4. Redis Implemented In Code

### 4.1 Global Cache Provider

BFF import `RedisProvider` global. This provider registers the Nest CacheModule with the Redis Keyv store:

```txt
redis://{REDIS_CONFIG.HOST}:{REDIS_CONFIG.PORT}
```

Default configuration:

- `REDIS_HOST`: default `redis`
- `REDIS_PORT`: default `6379`
- `REDIS_TTL`: default `30 * 60000` ms

Operation / mechanism:

- Let guards/controllers in BFF share a low-latency cache.
- Keep BFFs without needing a separate database.
- Allows multiple BFF processes to share token/session/menu cache.

Related codes:

- `libs/configuration/src/lib/redis.config.ts`
- `apps/bff/src/app/app.module.ts`

### 4.2 Global HTTP Rate Limiting

BFF import `ThrottlerProvider`, use `ThrottlerStorageRedisService`.

Current policy:

| Attributes    | Value                                        |
| ------------- | -------------------------------------------- |
| TTL window    | `60000` ms                                   |
| Limit         | `100` requests / window                      |
| Error message | `Too many requests, please try again later.` |
| Apply         | Global `ThrottlerGuard`                      |

Operation / mechanism:

- Protect all HTTP routes in BFF from common burst requests.
- This is **not** a business policy in `business-logic.md` like `max_scans_per_table = 10 scans per 5 minutes`.
- Key format is managed by the throttler storage library, not the `rl:{endpoint}:{ip/token}` document pattern.

Related codes:

- `libs/configuration/src/lib/throttler.config.ts`
- `apps/bff/src/app/app.module.ts`

### 4.3 JWT Cache / Personnel Permission

`UserGuard` caches successful verification results from Authorizer gRPC.

Key:

```txt
user-token:{sha256(jwt)}
```

Value:

- `AuthorizeResponse`
- Includes user metadata and permissions for future guards to use.

TTL:

- `30 * 60 * 1000` ms
- Equivalent to 30 minutes.

Flow:

1. Staff/Owner/Admin sends `Authorization: Bearer {jwt}`.
2. `UserGuard` hash token.
3. Cache hit: attach user data into request, skips gRPC verify.
4. Cache miss: calls Authorizer gRPC `verifyUserToken`.
5. If valid, attach user data and cache for 30 minutes.
6. `TenantGuard` and `PermissionGuard` continue the guard chain.

Operation / mechanism:

- Reduced number of Keycloak/JWKS/user-access calls.
- Makes the admin/POS API respond faster when the same JWT is used repeatedly.
- Source of truth is still Keycloak + user-access profile; Redis only caches the results.

Operating notes:

- When a user's rights are revoked or logged out, if there is no invalidate cache mechanism, the user can still be accepted until the 30-minute TTL expires.

Related codes:

- `libs/guards/src/lib/user.guard.ts`
- `docs/technical-architecture.md` §8.1.1 and §11.1
- `docs/references/auth-system-reference.md`

### 4.4 BFF Anonymous / Customer Edge Session Cache

`SessionGuard` creates or reuses lightweight sessions at BFF for unsecured routes, unless the controller actively opts-out.

Current runtime key:

```txt
bff-session:{tenantId}:{sessionId}
bff-session:{sessionId}              # fallback legacy / missing tenant
```

Session ID format:

```txt
sid_{uuid}
```

Value:

```ts
{
  tenantId?: string;
  createdAt: number;
  lastActivityAt: number;
  orderCount?: number;
}
```

TTL / idle:

- TTL: 2 hours.
- Idle timeout: 30 minutes.
- If `orderCount > 0`, the current guard still keeps the session alive even if idle time exceeds 30 minutes.

Flow:

1. If the route is secured for staff, `SessionGuard` returns early.
2. If the route skips session minting, `SessionGuard` returns early.
3. If the route skips the BFF session guard but requires a session header, the guard checks `x-session-id` and attaches it to the request.
4. If request has `x-session-id` / cookie, guard lookup Redis.
5. If session is valid, refresh TTL and `lastActivityAt`.
6. If session is missing/expired, create new session `sid_...`.
7. `TenantGuard` checks or backfills `tenantId` into the session cache.

Operation / mechanism:

- Customer/guest support without Keycloak.
- Helps anonymous requests have session and tenant context before entering the controller.
- Suitable UX of QR scanning without logging in.

Points to note about naming:

- Many documents also call guard cache `session:{sessionId}` or `session:{tenantId}:{sessionId}`.
- Current code uses prefix `bff-session` through `SESSION_POLICY.CACHE_PREFIX`.
- Order service has a separate cache domain also named `session:{tenantId}:{sessionId}`.

Related codes:

- `libs/constants/src/lib/request-context.constant.ts`
- `libs/utils/src/lib/request.util.ts`
- `libs/guards/src/lib/session.guard.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- `apps/bff/src/app/modules/order/controllers/customer-session.controller.ts`

### 4.5 Public Menu Cache

BFF public menu controller implements cache-aside.

Key:

```txt
menu:{tenantId}
```

Value:

- Full public menu TCP response from Catalog.

TTL:

- Code sets `600` seconds, passed to CacheManager as `600 * 1000` ms.
- Equivalent to 10 minutes.

Read flow:

1. Resolve tenant from request context.
2. Check `menu:{tenantId}`.
3. If hit, return menu from cache.
4. If missed, call Catalog service TCP `MENU.GET_PUBLIC_MENU`.
5. Cache response.

Invalidation flow:

- Category create/update/reorder/delete calls `DEL menu:{tenantId}`.
- Menu item create/update/delete/update image/clear image calls `DEL menu:{tenantId}`.

Operation / mechanism:

- Menu is read-heavy data for Customer PWA.
- Cache offloads Catalog DB/TCP.
- When the admin changes the menu, the cache is cleared so the next refetch can get new data.

Current status:

- Canonical docs are now closed without Kafka/WS `menu.updated`.
- Current code clears Redis cache; client refetch via React Query/BFF Direct flow instead of receiving broadcast menu.

Related codes:

- `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`
- `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`
- `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`
- `docs/phases/phase-1-catalog.md`

### 4.6 Order service Direct Redis Client

Order service imports `RedisClientModule` and uses `ioredis` directly.

Default client:

- Host: `REDIS_HOST` or `redis`
- Port: `REDIS_PORT` or `6379`
- `maxRetriesPerRequest: 3`
- `quit()` when module is destroyed.

Operation / mechanism:

Order service needs more Redis primitives than a simple cache:

- Hash for session/cart.
- Refresh TTL with `PEXPIRE`.
- `MULTI` to group write cart.
- `SET ... PX ... NX` for transfer lock.

Related codes:

- `libs/providers/redis-client/src/lib/redis-client.module.ts`
- `libs/providers/redis-client/src/lib/redis-client.service.ts`
- `apps/order/src/app/app.module.ts`
- `apps/order/src/app/modules/order/order.module.ts`

### 4.7 Cache Active Session Of Order Domain

This is the session cache of the Order domain, different from the BFF edge session.

Key:

```txt
session:{tenantId}:{sessionId}
```

Redis type:

- Hash.

The current field code reads:

```txt
tenantId
sessionId
tableId
tableName
status
startedAt
lastActivity
orderCount
closedAt
```

TTL:

- `SESSION_POLICY.TTL_MS = 2h`

Idle close:

- If the session is idle for more than 30 minutes and `orderCount == 0`, Order service marks the PostgreSQL session as `CLOSED`, delete the Redis session key and delete the cart key.
- If `orderCount > 0`, do not close the session just because it is idle.

Read flow:

1. Call `getActiveSessionOrThrow(tenantId, sessionId)`.
2. Try reading the Redis hash first.
3. If Redis payload is missing, in wrong format, or wrong type, PostgreSQL fallback.
4. PostgreSQL is the source of truth for active session state.
5. If PostgreSQL still has an active session, rehydrate Redis.
6. Refresh TTL when accessing.

Write/update flow:

- Cart mutation updates PostgreSQL `lastActivity` and Redis `lastActivity`.
- Transfer table patch `tableId` and `tableName` in Redis after updating durable state.

Operation / mechanism:

- Lookup active dining session quickly.
- PostgreSQL still keeps sessions persistent.
- Supports multiple customer devices using the same table session.

Differences from spec:

- Step 2.4 spec has `currentBillId` and `version` in the ideal Redis payload.
- The current code does not cache those two fields; Currently only cache fields are needed for active-session validation, table snapshot, idle logic and transfer.

Related codes:

- `apps/order/src/app/modules/order/services/session.service.ts`
- `apps/order/src/app/modules/order/constants/session-policy.ts`
- `docs/specs/business-logic-step-2.4-spec.md` §4 and §19

### 4.8 Shared Cart State

Key:

```txt
cart:{tenantId}:{sessionId}
```

Redis type:

- Hash.

Current fields:

```txt
tenantId
sessionId
cartVersion
status
updatedAt
items       # JSON string array
```

TTL:

- 2 hours.
- Attached to session lifetime and refreshed when read/write.

Operation / mechanism:

- Cart is the `DRAFT` status of the order.
- Do not create rows in `orders` until submitted.
- Many customers at the same table/session see the same cart.
- `cartVersion` is optimistic concurrency token.
- Bill request to lock cart by setting `status = LOCKED`.
- Staff reopen bill to unlock cart to `ACTIVE`.
- Successfully submitted clear cart with mutation `CLEAR`.

Read/write flow:

1. Validate active session via `SessionService`.
2. `HGETALL cart:{tenantId}:{sessionId}`.
3. If the key is empty, consider the active cart empty with version `0`.
4. Mutation check:
   - cart is not locked
   - `expectedCartVersion` matches the current `cartVersion`
   - If adding item, call Catalog TCP to validate orderable item
5. Persist with Redis `MULTI`:
   - `HSET` cart fields
   - `PEXPIRE` key
6. Touch session activity.
7. BFF emit `events.cartUpdated` via the current Socket.io gateway.

Current deployment risks:

- Version check is located in the application code after `HGETALL`, before Redis write.
- `MULTI` now only groups `HSET + PEXPIRE`, does not assert atomically that `cartVersion` remains unchanged.
- Two writers can simultaneously read the old version, have the same validation pass, then the next writer overwrites the previous writer.
- If cart concurrency needs to be tight, you should harden it with Lua CAS, Redis `WATCH`/`MULTI`, or a short lock around read-modify-write.

Related codes:

- `apps/order/src/app/modules/order/services/cart.service.ts`
- `apps/order/src/app/modules/order/services/bill.service.ts`
- `apps/order/src/app/modules/order/services/order.service.ts`
- `docs/specs/business-logic-step-2.4-spec.md` §5 and §19

### 4.9 Table Switch Lock

Transfer uses Redis lock before mutating session/order/table state.

Keys:

```txt
transfer:{tenantId}:{sessionId}
table-transfer:{tenantId}:{fromTableId}
table-transfer:{tenantId}:{toTableId}
```

TTL:

- `30_000` ms.

Acquire:

```txt
SET key requestId PX 30000 NX
```

Release:

1. Read lock value.
2. Only delete if value is equal to the current `requestId`.

Operation / mechanism:

- Block multiple transfers at the same time on the same session, source table, or destination table.
- Protects saga-style streams via Order PostgreSQL, Catalog PostgreSQL over TCP, and Redis session metadata.
- Cart key does not change because session ID does not change.
- Redis session hash is newly patched `tableId` / `tableName`.

Current deployment risks:

- Release is using two separate commands `GET` and `DEL`.
- Redis lock best practice is to release atomically using Lua to avoid accidentally deleting the new request's lock if the old lock expires between `GET` and `DEL`.

Related codes:

- `apps/order/src/app/modules/order/services/transfer.service.ts`
- `apps/order/src/app/modules/order/tests/transfer.service.spec.ts`
- `docs/specs/business-logic-step-2.4-spec.md` §13

### 4.10 Dev Reseed / Verification

Dev tooling uses Redis directly via `ioredis`.

Implemented script:

- `tools/dev-seed/flush-redis.js`
  - Refuse to run without `--yes`.
  - Deny non-local Redis hosts.
  - Reject `NODE_ENV` unlike dev environment.
  - Call `flushdb()`.
- `tools/dev-seed/verify/verify-dev-seed.js`
  - Connect Redis.
  - Check that the legacy key `tenant_a` is gone.
- `tools/dev-reseed.sh`
  - Run Keycloak bootstrap, Redis flush, PostgreSQL seed, Mongo seed, and verify.

Operation / mechanism:

- Keep local demo deterministic.
- Avoid old cache/session/tenant keys interfering with the reseed stream.

Related codes:

- `tools/dev-seed/flush-redis.js`
- `tools/dev-seed/verify/verify-dev-seed.js`
- `tools/dev-reseed.sh`

## 5. Redis Is Already In The Documents / Roadmap But Not In The Code

### 5.1 Catalog Table Status Cache

Key according to documentation:

```txt
table:{tenantId}:{tableId}:status
```

Expected behavior:

- Cache the current state of the table.
- No TTL.
- Update explicitly when table state changes.

Code status:

- No implementation yet.
- Catalog service currently does not connect to Redis.
- BFF has not yet set the table status cache after the table status change.

Related documents:

- `docs/technical-architecture.md` §6.2.4 and §11.1
- `docs/phases/phase-1-catalog.md`

### 5.2 Kitchen / KDS Redis-Only Store

Phase 2B Kitchen service currently uses Redis as the main KDS store, without a separate database for queue/ticket runtime.

Simple keys in the architecture docs:

```txt
kds:{tenantId}:kitchen
kds:{tenantId}:bar
ticket:{ticketId}
```

The current code implements a more detailed set of keys via `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`:

```txt
kds:{tenantId}:ticket:{ticketId}
kds:{tenantId}:ticket:{ticketId}:items
kds:{tenantId}:ticket-item:{ticketItemId}
kds:{tenantId}:{station}
kds:{tenantId}:station:{station}:READY
kds:{tenantId}:order:{orderId}:tickets
kds:{tenantId}:session:{sessionId}:tickets
kds:{tenantId}:dedupe:event:{eventId}
kds:{tenantId}:dedupe:order:{orderId}:{station}
kds:{tenantId}:cmd:{requestId}
kds:sla:due
kds:{tenantId}:ticket:{ticketId}:sla
kds:{tenantId}:dedupe:sla:{ticketId}:{level}:{bucket}
kds:{tenantId}:revision
lock:kds:rebuild:{tenantId}
realtime:kds:{tenantId}
```

Current operations/mechanism:

- Consume Kafka `order.confirmed`.
- Separate tickets by `MenuItem.station`.
- Maintain FIFO/priority queues using Redis Sorted Set.
- Track kitchen status at ticket/item level.
- Support recall, SLA warning, snapshot revision for KDS.
- Does not support batching/combining dishes under any name.
- Deduplicate when Kafka replays an event or repeats a command request.
- Publish internal realtime event to `realtime:kds:{tenantId}` for BFF fan-out via WebSocket.

Code status:

- Yes `apps/kitchen`.
- `KdsRedisRepository` remains the public façade; `KdsTicketStoreRepository`, `KdsSlaStoreRepository` and `KdsRecoveryStoreRepository` own ticket/queue, SLA and recovery Redis operations.
- `KitchenEventsPublisher` publish `realtime:kds:{tenantId}` using Redis Pub/Sub.
- KDS UI/realtime depends on BFF subscriber + current Socket.io path.

Related documents:

- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/specs/business-logic-step-2.6-spec.md`
- `docs/architecture/erd_explanation.md`

### 5.3 Socket.io Redis Adapter

Current behavior:

- Use Redis Pub/Sub via Socket.io Redis Adapter.
- Synchronize room broadcast between multiple BFF/WebSocket instances.
- BFF subscribe to `realtime:kds:*` to convert KDS internal events into Socket.io events.

Code status:

- Gateway is Nest `@WebSocketGateway` with Socket.io rooms.
- `join.session` and `join.staff` are supported.
- `RedisIoAdapter` connect Redis in `apps/bff/src/main.ts`.
- `@socket.io/redis-adapter` and `redis` are already included in `package.json`.

Related documents:

- `docs/technical-architecture.md` §9.3
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/specs/business-logic-step-2.6-spec.md`

### 5.4 Redis Idempotency Keys

Keys according to documentation/roadmap:

```txt
idempotency:order-submit:{tenantId}:{sessionId}:{key}
idem:*
```

Expected role:

- Block double submit/retry before side effects are duplicated.
- Use Redis `SET NX` with TTL as a fast first-writer-wins port.
- Combine PostgreSQL unique constraint to ensure durable correctness.

Code status:

- Order submit now has idempotency using PostgreSQL:
  - unique index `(tenantId, sessionId, idempotencyKey)`
  - replay lookup in `OrderService.submitOrder`
- Haven't seen Redis idempotency key for order submit.
- Catalog stock command accepts `idempotencyKey`, but currently does not see durable stock idempotency record in Catalog implementation.

Related documents:

- `docs/technical-architecture.md` §12.2
- `docs/phases/phase-4a-saga-hardening.md`
- `docs/specs/business-logic-step-2.4-spec.md`

### 5.5 Tenant Suspend Redis Flag

Current keys:

```txt
tenant:{tenantId}:suspended
```

Current role:

- SaaS service sets Redis flag quickly when tenant is suspended.
- SaaS service clear flag when tenant is activated/closed according to lifecycle.
- BFF `CustomerTenantLifecycleGuard` reads this flag as edge/fallback signal for customer/menu routes.
- Guard allows necessary read/join/VietQR pending flows, but blocks customer mutations when tenant suspended.

Code status:

- `TenantStatusCacheService` uses `buildTenantSuspendedRedisKey(tenantId)` and records `tenant:{tenantId}:suspended`.
- `CustomerTenantLifecycleGuard` reads key via CacheManager fallback when SaaS status unavailable.
- `buildTenantSuspendedRedisKey` is in `libs/constants/src/lib/saas.constants.ts`.

Related documents:

- `docs/phases/phase-4b-saas-onboarding.md`
- `docs/technical-architecture.md` §7.3

### 5.6 SaaS Current Subscription Cache

Current keys:

```txt
subscription:{tenantId}
```

Current role:

- SaaS service cache current subscription snapshot so target services can quickly check plans/limits.
- Current TTL is 300 seconds.
- Cache is cleared/updated according to subscription lifecycle.

Code status:

- `SubscriptionCacheService` uses `buildCurrentSubscriptionRedisKey(tenantId)`.
- The current canonical key is `subscription:{tenantId}`; Do not use legacy tenant-prefixed current-subscription variants.

Related documents:

- `docs/technical-architecture.md` §7.3 and §11.1

### 5.7 Payment OAuth State Cache

Current keys:

```txt
oauth_state:{state}
```

Current role:

- Payment service saves SePay OAuth state for 5 minutes to bind callback with `tenantId` and `ownerUserId`.
- Callback consume key then delete to avoid replays.
- There is an in-memory fallback for isolated tests/dev when the Redis client is not injected.

Code status:

- `TenantPaymentSettingsService.storeOAuthState` records `oauth_state:{state}` with `EX 300`.
- `consumeOAuthState` reads and deletes the same key.

Related documents:

- `docs/technical-architecture.md` §7.5 and §11.1

### 5.8 Optional Authorizer / JWKS Cache

The architecture docs mention an optional Redis cache for the JWKS public key.

Code status:

- Haven't seen the Authorizer service use Redis directly.
- Implemented Auth cache now resides in BFF `UserGuard`, not Authorizer.

Related documents:

- `docs/technical-architecture.md` §6.2.2

### 5.9 Business-Specific QR / Abuse Rate Limits

Business docs stipulate:

- `max_scans_per_table = 10 scans per 5 minutes`
- `max_orders_per_session = 20 items`

Code status:

- Global BFF throttler available: 100 requests / 60 seconds.
- Haven't seen the QR-specific scan counter.
- `max_orders_per_session` has been mentioned in the hardening documentation, but the corresponding Redis/session counter has not been found in the current Order code.

Related documents:

- `docs/business-logic.md`
- `docs/phases/phase-4a-saga-hardening.md`

## 6. Redis In Main Business Flows

### 6.1 Staff Login / Secured API Request

```txt
Staff App
  -> BFF HTTP request with JWT
  -> UserGuard
      -> GET user-token:{sha256(jwt)}
      -> hit: attach user data
      -> miss: Authorizer gRPC -> Keycloak/user-access verification -> SET cache 30m
  -> TenantGuard checks tenant claim/header
  -> PermissionGuard checks endpoint permission
  -> Controller
```

Redis Role:

- Cache performance for identity/permission verification step.
- Not a source of truth; Keycloak and user-access profile are still authoritative.

### 6.2 Guest / Customer Edge Session

```txt
Customer PWA
  -> BFF public route
  -> SessionGuard
      -> read x-session-id/cookie
      -> GET bff-session:{tenantId}:{sessionId}
      -> refresh or create sid_...
  -> TenantGuard validates/backfills tenant
  -> Controller
```

Redis Role:

- Maintain anonymous HTTP sessions at the edge.
- Supports tenant isolation before requesting to the controller.

### 6.3 QR Join Table Session

```txt
Customer scans QR
  -> BFF POST /customer/sessions/join
  -> BFF skips anonymous session mint
  -> Order Service SESSION_JOIN
      -> Catalog validates table + QR token
      -> if table available: create PostgreSQL session
      -> rehydrate Redis session:{tenantId}:{sessionId}
      -> Catalog marks table occupied
```

Redis Role:

- Cache active session after durable session has been created.
- Speed ​​up subsequent session/cart/order validations.

### 6.4 Cart Mutation

```txt
Customer updates cart
  -> BFF PATCH /customer/cart
  -> Order Service CART_MUTATE
      -> validate active session from Redis/PG
      -> HGETALL cart:{tenantId}:{sessionId}
      -> compare expectedCartVersion
      -> validate menu item via Catalog TCP when adding
      -> MULTI: HSET cart hash + PEXPIRE
      -> touch Redis/PG session activity
  -> BFF emits events.cartUpdated
```

Redis Role:

- Save shared cart state.
- Provide optimistic concurrency at cart level.
- Keep draft order ephemeral, attach TTL to session.

### 6.5 Submit Order

```txt
Customer submits
  -> active session check
  -> read cart from Redis
  -> PostgreSQL transaction creates order PENDING and bill OPEN if first submit
  -> PostgreSQL idempotency prevents duplicate orders
  -> Redis cart CLEAR mutation
  -> BFF emits cartUpdated + orderCreated
```

Redis Role:

- Is the draft cart data source at the time of submission.
- Clear after durable order has been created.

Durable truth:

- Order, bill, idempotency are now handled by PostgreSQL.

### 6.6 Bill Request / Reopen

Bill request:

```txt
Customer requests bill
  -> ensure active session
  -> ensure cart empty
  -> ensure orders are served/cancelled according to rule
  -> set bill PENDING_PAYMENT
  -> create service request
  -> Redis cart status ACTIVE -> LOCKED
  -> Catalog table status -> BILLING
  -> BFF emits bill/service/cart events
```

Reopen:

```txt
Staff reopens bill
  -> set bill OPEN
  -> Redis cart status LOCKED -> ACTIVE
  -> Catalog table status -> OCCUPIED
  -> BFF emits cartUpdated
```

Redis Role:

- Order lock status is in the cart hash.

### 6.7 Transfer Table

```txt
Staff transfers table
  -> acquire Redis locks:
      transfer:{tenantId}:{sessionId}
      table-transfer:{tenantId}:{fromTableId}
      table-transfer:{tenantId}:{toTableId}
  -> update Order PostgreSQL session/orders/service requests
  -> Catalog TCP updates old/new table status
  -> patch Redis session tableId/tableName
  -> release Redis locks
  -> BFF emits tableTransferred
```

Redis Role:

- Coordinate cross-request/cross-instance.
- Quickly patch display metadata of active session.

## 7. Redis Key Lookup Table

| Key patterns                                            | Type                           | Owner                | TTL              | Status          | Purpose                                     |
| ------------------------------------------------------- | ------------------------------ | -------------------- | ---------------- | --------------- | ------------------------------------------- |
| `user-token:{sha256(jwt)}`                              | String/object via CacheManager | BFF                  | 30m              | Deployed        | Cache Authorizer verification results.      |
| `bff-session:{tenantId}:{sessionId}`                    | String/object qua CacheManager | BFF                  | 2h               | Implemented     | Anonymous BFF edge session.                 |
| `bff-session:{sessionId}`                               | String/object qua CacheManager | BFF                  | 2h               | Legacy fallback | Lookup/migration session missing tenant.    |
| `menu:{tenantId}`                                       | String/object qua CacheManager | BFF                  | 10m              | Implemented     | Cache public menu.                          |
| Throttler internal keys                                 | Library-owned                  | BFF                  | 60s              | Implemented     | HTTP rate limiting.                         |
| `session:{tenantId}:{sessionId}`                        | Hash                           | Order service        | 2h               | Deployed        | Cache active session of Order domain.       |
| `cart:{tenantId}:{sessionId}`                           | Hash                           | Order service        | 2h               | Implemented     | Shared cart draft state.                    |
| `transfer:{tenantId}:{sessionId}`                       | String                         | Order service        | 30s              | Implemented     | Transfer lock for session.                  |
| `table-transfer:{tenantId}:{tableId}`                   | String                         | Order service        | 30s              | Deployed        | Transfer lock for source/destination table. |
| `quota:{tenantId}:orders:{date}`                        | String counter                 | Order service        | 48h              | Implemented     | Daily order quota counter.                  |
| `table:{tenantId}:{tableId}:status`                     | String                         | BFF/Catalog boundary | none             | Expected        | Quickly cache table status.                 |
| `kds:{tenantId}:*`                                      | Hash/Set/ZSet/String           | Kitchen              | depending on key | Deployed        | KDS queue/ticket/SLA state.                 |
| `lock:kds:rebuild:{tenantId}`                           | String lock                    | Kitchen              | short TTL        | Implemented     | Rebuild lock for KDS recovery.              |
| `realtime:kds:{tenantId}`                               | Pub/Sub channel                | Kitchen/BFF          | n/a              | Deployed        | Internal KDS fan-out.                       |
| `socket.io-adapter:*`                                   | Pub/Sub internal               | WebSocket Gateway    | n/a              | Deployed        | Broadcast room with multiple instances.     |
| `idempotency:order-submit:{tenantId}:{sessionId}:{key}` | String                         | Order service        | planned TTL      | Expected        | Block duplicate submission quickly.         |
| `tenant:{tenantId}:suspended`                           | String/flag                    | SaaS/BFF Guard       | no expiration    | Deployed        | Fast block for suspended tenants.           |
| `subscription:{tenantId}`                               | String JSON                    | SaaS service         | 5m               | Implemented     | Cache current subscription.                 |
| `oauth_state:{state}`                                   | String JSON                    | Payment service      | 5m               | Implemented     | SePay OAuth state one-time consume.         |

## 8. Matrix Theo Service

| service / app   | Access Redis now                                  | Key deployed                                                                                                      | Expected key                             | Notes                                                                   |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| BFF             | Yes, CacheManager + Throttle storage + Node Redis | `user-token:*`, `bff-session:*`, `menu:*`, throttler keys, `tenant:*:suspended`, Socket adapter, `realtime:kds:*` | `table:*:status`                         | BFF is the main cache/edge/realtime layer.                              |
| Authorizer      | Haven't seen direct Redis                         | none                                                                                                              | optional JWKS cache                      | Auth result cache is now located in BFF.                                |
| Catalog         | Haven't seen direct Redis                         | none                                                                                                              | table status cache via BFF/direct policy | Menu cache is owned by BFF, not Catalog.                                |
| Order           | Yes, direct `ioredis`                             | `session:*`, `cart:*`, `transfer:*`, `table-transfer:*`, `quota:*`                                                | Redis idempotency hardening              | PostgreSQL is still a durable source.                                   |
| Kitchen         | Yes, direct `ioredis`                             | `kds:*`, `lock:kds:*`, `realtime:kds:*`                                                                           | none currently verified                  | Redis is the current KDS runtime store.                                 |
| SaaS Services   | Yes, direct `ioredis`                             | `tenant:{tenantId}:suspended`, `subscription:{tenantId}`                                                          | none currently verified                  | Phase 4B tenant lifecycle/subscription cache.                           |
| Payment service | Yes, direct `ioredis`                             | `oauth_state:{state}`                                                                                             | none currently verified                  | Phase 4B SePay OAuth state.                                             |
| Notifications   | Deferred/not current                              | none                                                                                                              | none                                     | Does not count as current Redis user.                                   |
| Frontends       | Do not use Redis                                  | none                                                                                                              | none                                     | Use React Query, local/session storage, IndexedDB/service worker cache. |
| Dev tools       | Yes, direct `ioredis`                             | all keys in DB via `flushdb`, scan legacy key                                                                     | n/a                                      | Reset/verify local-only.                                                |

## 9. Gaps and Verification Notes

### 9.1 Drift Between Phase Docs and Code

Some phase docs still say Phase 2A / Step 2.4 has not started yet, but the current code has Order service session/cart, bills, service requests, transfer locks, BFF Direct WebSocket events and outbox publisher. When auditing the real status, priority should be given to verifying with code.

### 9.2 Drift BFF Session Key Name

Documentation often describes the customer/guest session key as:

```txt
session:{sessionId}
session:{tenantId}:{sessionId}
```

BFF guard code currently used:

```txt
bff-session:{tenantId}:{sessionId}
```

Order service is used separately:

```txt
session:{tenantId}:{sessionId}
```

This may make sense if the intention is to separate edge sessions and order-domain sessions, but the docs/comments should be updated to avoid confusion.

### 9.3 Cart Version Conflict Not Atomic yet

Cart mutation now checks `expectedCartVersion` after `HGETALL`, then writes with `MULTI HSET + PEXPIRE`. This write does not atomic assert that `cartVersion` remains unchanged.

If you need strict concurrency for multiple devices in the same cart, you should harden in one of the following ways:

- Lua compare-and-set script.
- Redis `WATCH` + `MULTI`.
- Short lock around cart mutation.

### 9.4 Release Transfer Lock So Atomic

The code to release lock is equal to:

```txt
GET key
DEL key if value matches requestId
```

Best practice with Redis locks is to release using Lua Owner-check atomic, to avoid accidentally deleting the new request's lock if the old lock expires and another request acquires between `GET` and `DEL`.

### 9.5 Redis Idempotency Is Roadmap, PostgreSQL Idempotency Is Current

Order submit currently relies on PostgreSQL unique index and replay lookup. Redis `SET NX` idempotency has been documented as hardening, but not yet implemented.

### 9.6 Table Status Cache Only Available in Documents

Architecture and Phase 1 docs list `table:{tenantId}:{tableId}:status`, but don't see implementation yet.

### 9.7 WebSocket Redis Adapter Already in the Code

BFF currently connects `RedisIoAdapter` in `apps/bff/src/main.ts`, using `@socket.io/redis-adapter` to synchronize Socket.io room broadcast between multiple instances. KDS internal fan-out also uses Redis Pub/Sub via `realtime:kds:*`.

### 9.8 Cache Menu Invalidated, But Menu Broadcast Not Yet

Admin category/menu-item write now removes `menu:{tenantId}`. Canonical docs now peg no Kafka/WS `menu.updated`; write path just invalidate the cache/query for the client to refetch.

### 9.9 tenant Suspend Flag Already In Phase 4B

SaaS now writes/deletes `tenant:{tenantId}:suspended`; BFF `CustomerTenantLifecycleGuard` reads this flag as a fallback/edge signal. When changing suspend/activate semantics, it is necessary to simultaneously update the SaaS cache writer, BFF guard and `docs/technical-architecture.md`.

### 9.10 QR-Specific Rate Limit Only Available in Documents

Rate limit is currently global BFF throttling. Business rule `max_scans_per_table = 10 scans per 5 minutes` does not have its own Redis counter.

## 10. Redis Verification Command

In a real environment, `SCAN` should be used. `KEYS` is only suitable for local dev with small datasets.

Local example:

```bash
redis-cli --scan --pattern 'user-token:*'
redis-cli --scan --pattern 'bff-session:*'
redis-cli --scan --pattern 'menu:*'
redis-cli --scan --pattern 'session:*'
redis-cli --scan --pattern 'cart:*'
redis-cli --scan --pattern 'transfer:*'
redis-cli --scan --pattern 'table-transfer:*'
redis-cli --scan --pattern 'kds:*'
```

Check TTL:

```bash
redis-cli TTL menu:{tenantId}
redis-cli TTL bff-session:{tenantId}:{sessionId}
redis-cli PTTL cart:{tenantId}:{sessionId}
```

Check hash:

```bash
redis-cli HGETALL session:{tenantId}:{sessionId}
redis-cli HGETALL cart:{tenantId}:{sessionId}
```

Current expectations when running locally:

- After loading the public menu: there is `menu:{tenantId}` with a TTL of about 10 minutes.
- After calling the anonymous route at BFF: there is `bff-session:*` with a TTL of about 2 hours.
- After QR join/order flow: there is `session:{tenantId}:{sessionId}` hash form.
- After cart mutation: there is `cart:{tenantId}:{sessionId}` hash form with `cartVersion`.
- During transfer: lock keys appear very briefly and then disappear.
- After KDS/order-confirmed flow: there can be short-term `kds:*`, `lock:kds:*` and Pub/Sub `realtime:kds:*`.
- When the tenant is suspended: there is `tenant:{tenantId}:suspended`; When activated/closed, the key is deleted.
- When the subscription cache is warmed: there is `subscription:{tenantId}` with a TTL of about 5 minutes.
- In SePay OAuth flow: have `oauth_state:{state}` for up to 5 minutes and the callback will consume/delete key.
- `table:*:status` and Redis idempotency keys should not appear until the respective feature roadmaps are implemented.

## 11. Documentation and Reference Code

Main documents:

- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/implementation_plan.md`
- `docs/phases/phase-1-catalog.md`
- `docs/phases/phase-2a-order-kafka.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-4a-saga-hardening.md`
- `docs/phases/phase-4b-saas-onboarding.md`
- `docs/specs/business-logic-step-2.4-spec.md`
- `docs/specs/business-logic-step-2.6-spec.md`
- `docs/guides/redis-qrtable.md`

Main code:

- `docker-compose.provider.yaml`
- `package.json`
- `libs/configuration/src/lib/redis.config.ts`
- `libs/configuration/src/lib/throttler.config.ts`
- `libs/constants/src/lib/request-context.constant.ts`
- `libs/utils/src/lib/request.util.ts`
- `libs/guards/src/lib/user.guard.ts`
- `libs/guards/src/lib/session.guard.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `libs/providers/redis-client/src/lib/redis-client.module.ts`
- `libs/providers/redis-client/src/lib/redis-client.service.ts`
- `apps/bff/src/app/app.module.ts`
- `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`
- `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`
- `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`
- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- `apps/bff/src/app/modules/order/controllers/customer-session.controller.ts`
- `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`
- `apps/order/src/app/app.module.ts`
- `apps/order/src/app/modules/order/order.module.ts`
- `apps/order/src/app/modules/order/constants/session-policy.ts`
- `apps/order/src/app/modules/order/services/session.service.ts`
- `apps/order/src/app/modules/order/services/cart.service.ts`
- `apps/order/src/app/modules/order/services/bill.service.ts`
- `apps/order/src/app/modules/order/services/order.service.ts`
- `apps/order/src/app/modules/order/services/transfer.service.ts`
- `libs/entities/src/lib/order.entity.ts`
- `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`
- `tools/dev-seed/flush-redis.js`
- `tools/dev-seed/verify/verify-dev-seed.js`
- `tools/dev-reseed.sh`
