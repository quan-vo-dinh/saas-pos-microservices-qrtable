# Phân Tích Sử Dụng Redis — Hiện Trạng Triển Khai và Thiết Kế Dự Kiến

> Ngày: 2026-05-14
> Phạm vi: `docs/business-logic.md`, `docs/technical-architecture.md`, `docs/implementation_plan.md`, `docs/phases/*`, các tài liệu/spec Redis, và code hiện tại trong `apps/`, `libs/`, `tools/`.  
> Mục tiêu: làm rõ mọi phần Redis trong hệ thống QRTable theo cách dễ đọc, dễ tra cứu, dễ kiểm chứng cho người Việt.

> **Current status — supporting analysis:** Tài liệu này là reference hỗ trợ. Nguồn canonical cho kiến trúc Redis là [`docs/technical-architecture.md`](./technical-architecture.md) và code hiện tại. Sau Phase 4B, các Redis users đã xác minh gồm BFF, Order, Kitchen/WebSocket, SaaS và Payment. Catalog, Authorizer và User-Access chưa được xác minh là Redis users trực tiếp; Notification hiện deferred/not current.

## 1. Tóm Tắt Nhanh

Redis đã được dùng thật trong hệ thống, nhưng cần tách rõ hai nhóm:

1. **Đã triển khai trong code hiện tại**
   - Hạ tầng: Redis và Redis Insight trong Docker Compose.
   - BFF cache layer: `@nestjs/cache-manager` + `@keyv/redis`.
   - BFF global rate limiting: NestJS Throttler dùng Redis storage.
   - BFF WebSocket scale-out: Socket.io Redis Adapter.
   - BFF KDS fan-out subscriber: `realtime:kds:*`.
   - Cache xác thực JWT của nhân sự: `user-token:{sha256(jwt)}`.
   - Session ẩn danh ở BFF cho customer/guest: `bff-session:{tenantId}:{sessionId}`.
   - Cache public menu: `menu:{tenantId}`.
   - Order Service truy cập Redis trực tiếp qua `ioredis`.
   - Cache active session của Order domain: `session:{tenantId}:{sessionId}`.
   - Shared cart: `cart:{tenantId}:{sessionId}`.
   - Lock chuyển bàn: `transfer:*` và `table-transfer:*`.
   - Counter quota đơn theo ngày: `quota:{tenantId}:orders:{date}`.
   - Kitchen Service Redis-only KDS store: `kds:*`, SLA/dedupe/lock keys.
   - SaaS Service: suspend flag `tenant:{tenantId}:suspended` và current subscription cache `subscription:{tenantId}`.
   - Payment Service: SePay OAuth state cache `oauth_state:{state}`.
   - Script dev reset/verify: flush Redis local và kiểm tra key tenant cũ.

2. **Đã có trong tài liệu hoặc roadmap, nhưng chưa triển khai**
   - Cache trạng thái bàn Catalog: `table:{tenantId}:{tableId}:status`.
   - Redis idempotency key cho order creation / hardening.
   - Redis cache tùy chọn cho Authorizer/JWKS.
   - Rate limit nghiệp vụ theo QR scan / session, ngoài global HTTP throttler hiện tại.

Điểm kiến trúc quan trọng nhất: **Redis ở BFF chủ yếu là cache hoặc edge state**, còn **Redis ở Order Service là active domain state cho session/cart đang diễn ra tại nhà hàng**. PostgreSQL vẫn là source of truth cho session bền vững, orders, bills, service requests và stock.

## 2. Ngữ Nghĩa Redis Đã Đối Chiếu Bằng Context7

Context7 đã được dùng để tra tài liệu Redis hiện hành (`/redis/docs`). Những pattern Redis dùng làm tiêu chí đối chiếu gồm:

- **Cache-aside với TTL:** thử đọc Redis trước; nếu miss thì đọc từ source of truth rồi ghi lại Redis với thời gian hết hạn.
- **Distributed lock:** acquire bằng `SET key uniqueValue NX EX/PX ttl`; release chỉ khi value trong key vẫn thuộc request hiện tại, tốt nhất dùng Lua để check-and-delete atomic.
- **Rate limiting:** tăng counter trong một time window rồi đặt expiry cho key.
- **TTL inspection:** `TTL` trả số giây còn lại, `-1` nếu key không có expiry, `-2` nếu key không tồn tại.

Các ngữ nghĩa này quan trọng vì QRTable dùng Redis cho cả cache ngắn hạn lẫn điều phối nhiều request.

Nguồn Context7:

- `https://github.com/redis/docs/blob/main/AGENT.md`
- `https://github.com/redis/docs/blob/main/content/commands/incr.md`
- `https://github.com/redis/docs/blob/main/content/commands/ttl.md`

## 3. Hạ Tầng Redis và Các Lớp Client

### 3.1 Docker Runtime

Redis được cung cấp trong `docker-compose.provider.yaml`.

Thông tin runtime:

| Thành phần  | Giá trị                                 |
| ----------- | --------------------------------------- |
| Service     | `redis`                                 |
| Image       | `redis`                                 |
| Port        | `6379:6379`                             |
| Healthcheck | `redis-cli ping`                        |
| Volume      | `./docker/docker_data/redis_data:/data` |
| UI đi kèm   | `redis-insight` trên port `5540`        |

Code liên quan:

- `docker-compose.provider.yaml`

### 3.2 Dependencies

Các package liên quan Redis đã có trong `package.json`:

| Package                                   | Vai trò                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `@keyv/redis`                             | Redis store cho Nest CacheModule / cache-manager.                        |
| `@nestjs/cache-manager` + `cache-manager` | Abstraction cache cho BFF và guards.                                     |
| `@nest-lab/throttler-storage-redis`       | Redis storage cho NestJS Throttler.                                      |
| `@nestjs/throttler`                       | Global HTTP rate limiting.                                               |
| `ioredis`                                 | Redis client trực tiếp cho Order, Kitchen, SaaS, Payment và dev scripts. |
| `redis`                                   | Node Redis client cho BFF realtime adapter/subscriber.                   |
| `@socket.io/redis-adapter` + `socket.io`  | WebSocket transport và Redis Adapter cho multi-instance room broadcast.  |

### 3.3 Hai Kiểu Truy Cập Redis

| Kiểu truy cập                  | Đang dùng bởi                        | Code                                         | Vì sao dùng                                                          |
| ------------------------------ | ------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------- |
| CacheManager + Keyv Redis      | BFF, guards                          | `libs/configuration/src/lib/redis.config.ts` | Phù hợp dữ liệu cache đơn giản qua `get/set/del`.                    |
| Direct `ioredis`               | Order, Kitchen, SaaS, Payment, tools | `libs/providers/redis-client/*`              | Cần Hash, lock, `MULTI`, `PEXPIRE`, counter, kiểm tra key trực tiếp. |
| Node Redis / Socket.io adapter | BFF realtime/WebSocket               | `apps/bff/src/app/modules/realtime/*`        | Pub/Sub, Socket.io Redis Adapter và internal KDS fan-out.            |

## 4. Redis Đã Triển Khai Trong Code

### 4.1 Global Cache Provider

BFF import `RedisProvider` global. Provider này đăng ký Nest CacheModule với Redis Keyv store:

```txt
redis://{REDIS_CONFIG.HOST}:{REDIS_CONFIG.PORT}
```

Default configuration:

- `REDIS_HOST`: mặc định `redis`
- `REDIS_PORT`: mặc định `6379`
- `REDIS_TTL`: mặc định `30 * 60000` ms

Nghiệp vụ / cơ chế:

- Cho guards/controllers ở BFF dùng chung cache tốc độ thấp độ trễ.
- Giữ BFF không cần database riêng.
- Cho phép nhiều BFF process cùng chia sẻ cache token/session/menu.

Code liên quan:

- `libs/configuration/src/lib/redis.config.ts`
- `apps/bff/src/app/app.module.ts`

### 4.2 Global HTTP Rate Limiting

BFF import `ThrottlerProvider`, dùng `ThrottlerStorageRedisService`.

Policy hiện tại:

| Thuộc tính    | Giá trị                                      |
| ------------- | -------------------------------------------- |
| TTL window    | `60000` ms                                   |
| Limit         | `100` requests / window                      |
| Error message | `Too many requests, please try again later.` |
| Áp dụng       | Global `ThrottlerGuard`                      |

Nghiệp vụ / cơ chế:

- Bảo vệ toàn bộ HTTP routes ở BFF khỏi burst request chung.
- Đây **chưa phải** policy nghiệp vụ trong `business-logic.md` như `max_scans_per_table = 10 scans per 5 minutes`.
- Key format do thư viện throttler storage quản lý, không phải pattern tài liệu `rl:{endpoint}:{ip/token}`.

Code liên quan:

- `libs/configuration/src/lib/throttler.config.ts`
- `apps/bff/src/app/app.module.ts`

### 4.3 Cache JWT / Permission Của Nhân Sự

`UserGuard` cache kết quả verify thành công từ Authorizer gRPC.

Key:

```txt
user-token:{sha256(jwt)}
```

Value:

- `AuthorizeResponse`
- Bao gồm metadata user và permissions để các guard sau dùng tiếp.

TTL:

- `30 * 60 * 1000` ms
- Tương đương 30 phút.

Flow:

1. Staff/Owner/Admin gửi `Authorization: Bearer {jwt}`.
2. `UserGuard` hash token.
3. Cache hit: attach user data vào request, bỏ qua gRPC verify.
4. Cache miss: gọi Authorizer gRPC `verifyUserToken`.
5. Nếu valid, attach user data và cache 30 phút.
6. `TenantGuard` và `PermissionGuard` tiếp tục guard chain.

Nghiệp vụ / cơ chế:

- Giảm số lần gọi Keycloak/JWKS/user-access.
- Giúp API quản trị/POS phản hồi nhanh hơn khi cùng JWT được dùng liên tục.
- Source of truth vẫn là Keycloak + user-access profile; Redis chỉ cache kết quả.

Lưu ý vận hành:

- Khi user bị thu hồi quyền hoặc logout, nếu chưa có cơ chế invalidate cache thì user có thể còn được accept cho tới khi TTL 30 phút hết hạn.

Code liên quan:

- `libs/guards/src/lib/user.guard.ts`
- `docs/technical-architecture.md` §8.1.1 và §11.1
- `docs/references/auth-system-reference.md`

### 4.4 BFF Anonymous / Customer Edge Session Cache

`SessionGuard` tạo hoặc tái sử dụng session nhẹ ở BFF cho route không secured, trừ khi controller chủ động opt-out.

Key runtime hiện tại:

```txt
bff-session:{tenantId}:{sessionId}
bff-session:{sessionId}              # fallback legacy / thiếu tenant
```

Định dạng session ID:

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

- TTL: 2 giờ.
- Idle timeout: 30 phút.
- Nếu `orderCount > 0`, guard hiện tại vẫn giữ session sống dù idle time vượt 30 phút.

Flow:

1. Nếu route là secured cho staff, `SessionGuard` return sớm.
2. Nếu route skip session minting, `SessionGuard` return sớm.
3. Nếu route skip BFF session guard nhưng bắt buộc có session header, guard kiểm tra `x-session-id` và attach vào request.
4. Nếu request có `x-session-id` / cookie, guard lookup Redis.
5. Nếu session hợp lệ, refresh TTL và `lastActivityAt`.
6. Nếu session thiếu/hết hạn, tạo session mới `sid_...`.
7. `TenantGuard` kiểm tra hoặc backfill `tenantId` vào session cache.

Nghiệp vụ / cơ chế:

- Hỗ trợ customer/guest không cần Keycloak.
- Giúp request anonymous có session và tenant context trước khi vào controller.
- Phù hợp UX quét QR không đăng nhập.

Điểm cần chú ý về naming:

- Nhiều tài liệu còn gọi guard cache là `session:{sessionId}` hoặc `session:{tenantId}:{sessionId}`.
- Code hiện tại dùng prefix `bff-session` qua `SESSION_POLICY.CACHE_PREFIX`.
- Order Service có một cache domain riêng cũng tên `session:{tenantId}:{sessionId}`.

Code liên quan:

- `libs/constants/src/lib/request-context.constant.ts`
- `libs/utils/src/lib/request.util.ts`
- `libs/guards/src/lib/session.guard.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- `apps/bff/src/app/modules/order/controllers/customer-session.controller.ts`

### 4.5 Public Menu Cache

BFF public menu controller triển khai cache-aside.

Key:

```txt
menu:{tenantId}
```

Value:

- Full public menu TCP response từ Catalog.

TTL:

- Code đặt `600` giây, truyền vào CacheManager là `600 * 1000` ms.
- Tương đương 10 phút.

Read flow:

1. Resolve tenant từ request context.
2. Kiểm tra `menu:{tenantId}`.
3. Nếu hit, trả menu từ cache.
4. Nếu miss, gọi Catalog Service TCP `MENU.GET_PUBLIC_MENU`.
5. Cache response.

Invalidation flow:

- Category create/update/reorder/delete gọi `DEL menu:{tenantId}`.
- Menu item create/update/delete/update image/clear image gọi `DEL menu:{tenantId}`.

Nghiệp vụ / cơ chế:

- Menu là dữ liệu read-heavy cho Customer PWA.
- Cache giảm tải Catalog DB/TCP.
- Khi admin đổi menu, cache bị xóa để lần refetch sau lấy dữ liệu mới.

Trạng thái hiện tại:

- Canonical docs hiện đã chốt không có Kafka/WS `menu.updated`.
- Code hiện tại xóa Redis cache; client refetch qua React Query/BFF Direct flow thay vì nhận menu broadcast.

Code liên quan:

- `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`
- `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`
- `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`
- `docs/phases/phase-1-catalog.md`

### 4.6 Redis Client Trực Tiếp Của Order Service

Order Service import `RedisClientModule` và dùng `ioredis` trực tiếp.

Default client:

- Host: `REDIS_HOST` hoặc `redis`
- Port: `REDIS_PORT` hoặc `6379`
- `maxRetriesPerRequest: 3`
- `quit()` khi module destroy.

Nghiệp vụ / cơ chế:

Order Service cần nhiều primitive Redis hơn cache đơn giản:

- Hash cho session/cart.
- Refresh TTL bằng `PEXPIRE`.
- `MULTI` để nhóm write cart.
- `SET ... PX ... NX` cho transfer lock.

Code liên quan:

- `libs/providers/redis-client/src/lib/redis-client.module.ts`
- `libs/providers/redis-client/src/lib/redis-client.service.ts`
- `apps/order/src/app/app.module.ts`
- `apps/order/src/app/modules/order/order.module.ts`

### 4.7 Cache Active Session Của Order Domain

Đây là session cache của Order domain, khác với BFF edge session.

Key:

```txt
session:{tenantId}:{sessionId}
```

Redis type:

- Hash.

Các field code hiện tại ghi:

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

- Nếu session idle hơn 30 phút và `orderCount == 0`, Order Service mark PostgreSQL session là `CLOSED`, xóa Redis session key và xóa cart key.
- Nếu `orderCount > 0`, không tự đóng session chỉ vì idle.

Read flow:

1. Gọi `getActiveSessionOrThrow(tenantId, sessionId)`.
2. Thử đọc Redis hash trước.
3. Nếu Redis payload thiếu, sai format, hoặc wrong type, fallback PostgreSQL.
4. PostgreSQL là source of truth cho trạng thái session active.
5. Nếu PostgreSQL còn active session, rehydrate Redis.
6. Refresh TTL khi access.

Write/update flow:

- Cart mutation cập nhật PostgreSQL `lastActivity` và Redis `lastActivity`.
- Transfer table patch `tableId` và `tableName` trong Redis sau khi update durable state.

Nghiệp vụ / cơ chế:

- Lookup active dining session nhanh.
- PostgreSQL vẫn giữ session bền vững.
- Hỗ trợ nhiều thiết bị customer cùng dùng một table session.

Khác biệt với spec:

- Step 2.4 spec có `currentBillId` và `version` trong payload Redis lý tưởng.
- Code hiện tại chưa cache hai field đó; hiện chỉ cache field cần cho active-session validation, table snapshot, idle logic và transfer.

Code liên quan:

- `apps/order/src/app/modules/order/services/session.service.ts`
- `apps/order/src/app/modules/order/constants/session-policy.ts`
- `docs/specs/business-logic-step-2.4-spec.vi.md` §4 và §19

### 4.8 Shared Cart State

Key:

```txt
cart:{tenantId}:{sessionId}
```

Redis type:

- Hash.

Các field hiện tại:

```txt
tenantId
sessionId
cartVersion
status
updatedAt
items       # JSON string array
```

TTL:

- 2 giờ.
- Gắn với session lifetime và được refresh khi read/write.

Nghiệp vụ / cơ chế:

- Cart là trạng thái `DRAFT` của order.
- Chưa tạo row trong `orders` cho tới khi submit.
- Nhiều customer cùng bàn/session thấy chung một cart.
- `cartVersion` là optimistic concurrency token.
- Bill request khóa cart bằng cách set `status = LOCKED`.
- Staff reopen bill mở khóa cart về `ACTIVE`.
- Submit thành công clear cart bằng mutation `CLEAR`.

Read/write flow:

1. Validate active session qua `SessionService`.
2. `HGETALL cart:{tenantId}:{sessionId}`.
3. Nếu key rỗng, coi là cart active rỗng với version `0`.
4. Mutation kiểm tra:
   - cart chưa bị lock
   - `expectedCartVersion` khớp `cartVersion` hiện tại
   - nếu add item, gọi Catalog TCP để validate item orderable
5. Persist bằng Redis `MULTI`:
   - `HSET` các field cart
   - `PEXPIRE` key
6. Touch session activity.
7. BFF emit `events.cartUpdated` qua Socket.io gateway hiện tại.

Rủi ro triển khai hiện tại:

- Version check đang nằm ở application code sau `HGETALL`, trước Redis write.
- `MULTI` hiện chỉ nhóm `HSET + PEXPIRE`, không assert atomic rằng `cartVersion` vẫn chưa đổi.
- Hai writer đồng thời có thể cùng đọc version cũ, cùng pass validate, rồi writer sau ghi đè writer trước.
- Nếu concurrency cart cần chặt, nên harden bằng Lua CAS, Redis `WATCH`/`MULTI`, hoặc lock ngắn quanh read-modify-write.

Code liên quan:

- `apps/order/src/app/modules/order/services/cart.service.ts`
- `apps/order/src/app/modules/order/services/bill.service.ts`
- `apps/order/src/app/modules/order/services/order.service.ts`
- `docs/specs/business-logic-step-2.4-spec.vi.md` §5 và §19

### 4.9 Lock Chuyển Bàn

Transfer dùng Redis lock trước khi mutate session/order/table state.

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

1. Đọc lock value.
2. Chỉ delete nếu value bằng `requestId` hiện tại.

Nghiệp vụ / cơ chế:

- Chặn nhiều transfer cùng lúc trên cùng session, bàn nguồn, hoặc bàn đích.
- Bảo vệ luồng saga-style trải qua Order PostgreSQL, Catalog PostgreSQL qua TCP, và Redis session metadata.
- Cart key không đổi vì session ID không đổi.
- Redis session hash được patch `tableId` / `tableName` mới.

Rủi ro triển khai hiện tại:

- Release đang dùng hai lệnh riêng `GET` rồi `DEL`.
- Redis lock best practice là release atomic bằng Lua để tránh xóa nhầm lock của request mới nếu lock cũ hết hạn giữa `GET` và `DEL`.

Code liên quan:

- `apps/order/src/app/modules/order/services/transfer.service.ts`
- `apps/order/src/app/modules/order/tests/transfer.service.spec.ts`
- `docs/specs/business-logic-step-2.4-spec.vi.md` §13

### 4.10 Dev Reseed / Verification

Dev tooling dùng Redis trực tiếp qua `ioredis`.

Script đã triển khai:

- `tools/dev-seed/flush-redis.js`
  - Từ chối chạy nếu không có `--yes`.
  - Từ chối Redis host không local.
  - Từ chối `NODE_ENV` không giống môi trường dev.
  - Gọi `flushdb()`.
- `tools/dev-seed/verify/verify-dev-seed.js`
  - Connect Redis.
  - Kiểm tra key legacy `tenant_a` đã không còn.
- `tools/dev-reseed.sh`
  - Chạy Keycloak bootstrap, Redis flush, PostgreSQL seed, Mongo seed, và verify.

Nghiệp vụ / cơ chế:

- Giữ local demo deterministic.
- Tránh cache/session/key tenant cũ làm nhiễu luồng reseed.

Code liên quan:

- `tools/dev-seed/flush-redis.js`
- `tools/dev-seed/verify/verify-dev-seed.js`
- `tools/dev-reseed.sh`

## 5. Redis Đã Có Trong Tài Liệu / Roadmap Nhưng Chưa Có Trong Code

### 5.1 Catalog Table Status Cache

Key theo tài liệu:

```txt
table:{tenantId}:{tableId}:status
```

Hành vi dự kiến:

- Cache trạng thái hiện tại của bàn.
- Không TTL.
- Update explicit khi table state thay đổi.

Trạng thái code:

- Chưa thấy implementation.
- Catalog Service hiện không kết nối Redis.
- BFF hiện chưa set table status cache sau table status change.

Tài liệu liên quan:

- `docs/technical-architecture.md` §6.2.4 và §11.1
- `docs/phases/phase-1-catalog.md`

### 5.2 Kitchen / KDS Redis-Only Store

Phase 2B Kitchen Service hiện dùng Redis làm KDS store chính, không có database riêng cho queue/ticket runtime.

Keys đơn giản trong architecture docs:

```txt
kds:{tenantId}:kitchen
kds:{tenantId}:bar
ticket:{ticketId}
```

Code hiện tại triển khai bộ key chi tiết hơn qua `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`:

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

Nghiệp vụ / cơ chế hiện tại:

- Consume Kafka `order.confirmed`.
- Tách ticket theo `MenuItem.station`.
- Duy trì FIFO/priority queues bằng Redis Sorted Set.
- Track trạng thái bếp ở mức ticket/item.
- Hỗ trợ recall, SLA warning, snapshot revision cho KDS.
- Không hỗ trợ batching/gộp món dưới bất kỳ tên gọi nào.
- Deduplicate khi Kafka replay event hoặc command request lặp.
- Publish internal realtime event lên `realtime:kds:{tenantId}` để BFF fan-out qua WebSocket.

Trạng thái code:

- Có `apps/kitchen`.
- `KdsRedisRepository` write/read `kds:*`, SLA, dedupe, dead-letter và rebuild lock keys.
- `KitchenEventsPublisher` publish `realtime:kds:{tenantId}` bằng Redis Pub/Sub.
- KDS UI/realtime phụ thuộc BFF subscriber + Socket.io path hiện tại.

Tài liệu liên quan:

- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/specs/business-logic-step-2.6-spec.vi.md`
- `docs/architecture/erd_explanation.md`

### 5.3 Socket.io Redis Adapter

Hành vi hiện tại:

- Dùng Redis Pub/Sub qua Socket.io Redis Adapter.
- Đồng bộ room broadcast giữa nhiều BFF/WebSocket instances.
- BFF subscribe `realtime:kds:*` để chuyển KDS internal events thành Socket.io events.

Trạng thái code:

- Gateway là Nest `@WebSocketGateway` với Socket.io rooms.
- Đã hỗ trợ `join.session` và `join.staff`.
- `RedisIoAdapter` connect Redis trong `apps/bff/src/main.ts`.
- `@socket.io/redis-adapter` và `redis` đã có trong `package.json`.

Tài liệu liên quan:

- `docs/technical-architecture.md` §9.3
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/specs/business-logic-step-2.6-spec.vi.md`

### 5.4 Redis Idempotency Keys

Keys theo tài liệu/roadmap:

```txt
idempotency:order-submit:{tenantId}:{sessionId}:{key}
idem:*
```

Vai trò dự kiến:

- Chặn double submit/retry trước khi side effect bị nhân đôi.
- Dùng Redis `SET NX` với TTL làm cổng first-writer-wins nhanh.
- Kết hợp PostgreSQL unique constraint để đảm bảo durable correctness.

Trạng thái code:

- Order submit hiện đã có idempotency bằng PostgreSQL:
  - unique index `(tenantId, sessionId, idempotencyKey)`
  - replay lookup trong `OrderService.submitOrder`
- Chưa thấy Redis idempotency key cho order submit.
- Catalog stock command có nhận `idempotencyKey`, nhưng hiện chưa thấy durable stock idempotency record trong Catalog implementation.

Tài liệu liên quan:

- `docs/technical-architecture.md` §12.2
- `docs/phases/phase-4a-saga-hardening.md`
- `docs/specs/business-logic-step-2.4-spec.vi.md`

### 5.5 Tenant Suspend Redis Flag

Key hiện tại:

```txt
tenant:{tenantId}:suspended
```

Vai trò hiện tại:

- SaaS Service set Redis flag nhanh khi tenant bị suspended.
- SaaS Service clear flag khi tenant được activate/close theo lifecycle.
- BFF `CustomerTenantLifecycleGuard` đọc flag này như edge/fallback signal cho customer/menu routes.
- Guard cho phép các read/join/VietQR pending flows cần thiết, nhưng chặn customer mutations khi tenant suspended.

Trạng thái code:

- `TenantStatusCacheService` dùng `buildTenantSuspendedRedisKey(tenantId)` và ghi `tenant:{tenantId}:suspended`.
- `CustomerTenantLifecycleGuard` đọc key qua CacheManager fallback khi SaaS status unavailable.
- `buildTenantSuspendedRedisKey` nằm trong `libs/constants/src/lib/saas.constants.ts`.

Tài liệu liên quan:

- `docs/phases/phase-4b-saas-onboarding.md`
- `docs/technical-architecture.md` §7.3

### 5.6 SaaS Current Subscription Cache

Key hiện tại:

```txt
subscription:{tenantId}
```

Vai trò hiện tại:

- SaaS Service cache current subscription snapshot để target services có thể check plan/limits nhanh.
- TTL hiện tại là 300 giây.
- Cache bị clear/update theo subscription lifecycle.

Trạng thái code:

- `SubscriptionCacheService` dùng `buildCurrentSubscriptionRedisKey(tenantId)`.
- Key canonical hiện tại là `subscription:{tenantId}`; không dùng legacy tenant-prefixed current-subscription variants.

Tài liệu liên quan:

- `docs/technical-architecture.md` §7.3 và §11.1

### 5.7 Payment OAuth State Cache

Key hiện tại:

```txt
oauth_state:{state}
```

Vai trò hiện tại:

- Payment Service lưu state SePay OAuth 5 phút để bind callback với `tenantId` và `ownerUserId`.
- Callback consume key rồi delete để tránh replay.
- Có in-memory fallback cho isolated tests/dev khi Redis client không được inject.

Trạng thái code:

- `TenantPaymentSettingsService.storeOAuthState` ghi `oauth_state:{state}` với `EX 300`.
- `consumeOAuthState` đọc rồi xóa cùng key.

Tài liệu liên quan:

- `docs/technical-architecture.md` §7.5 và §11.1

### 5.8 Optional Authorizer / JWKS Cache

Architecture docs có nhắc Redis cache tùy chọn cho JWKS public key.

Trạng thái code:

- Chưa thấy Authorizer Service dùng Redis trực tiếp.
- Auth cache đã triển khai hiện nằm ở BFF `UserGuard`, không phải Authorizer.

Tài liệu liên quan:

- `docs/technical-architecture.md` §6.2.2

### 5.9 Business-Specific QR / Abuse Rate Limits

Business docs quy định:

- `max_scans_per_table = 10 scans per 5 minutes`
- `max_orders_per_session = 20 items`

Trạng thái code:

- Global BFF throttler đã có: 100 requests / 60 giây.
- Chưa thấy QR-specific scan counter.
- `max_orders_per_session` đã được tài liệu hardening nhắc tới, nhưng chưa thấy counter Redis/session tương ứng trong code Order hiện tại.

Tài liệu liên quan:

- `docs/business-logic.md`
- `docs/phases/phase-4a-saga-hardening.md`

## 6. Redis Trong Các Luồng Nghiệp Vụ Chính

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

Vai trò Redis:

- Cache hiệu năng cho bước identity/permission verification.
- Không phải source of truth; Keycloak và user-access profile vẫn authoritative.

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

Vai trò Redis:

- Duy trì anonymous HTTP session ở edge.
- Hỗ trợ tenant isolation trước khi request vào controller.

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

Vai trò Redis:

- Cache active session sau khi durable session đã được tạo.
- Tăng tốc các lần validate session/cart/order sau đó.

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

Vai trò Redis:

- Lưu shared cart state.
- Cung cấp optimistic concurrency ở mức cart.
- Giữ draft order ephemeral, gắn TTL với session.

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

Vai trò Redis:

- Là nguồn dữ liệu draft cart tại thời điểm submit.
- Clear sau khi order durable đã được tạo.

Durable truth:

- Order, bill, idempotency hiện do PostgreSQL đảm nhiệm.

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

Vai trò Redis:

- Trạng thái khóa đặt món nằm trong cart hash.

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

Vai trò Redis:

- Điều phối cross-request/cross-instance.
- Patch nhanh metadata hiển thị của active session.

## 7. Bảng Tra Cứu Redis Key

| Key pattern                                             | Type                           | Owner                | TTL         | Trạng thái      | Mục đích                               |
| ------------------------------------------------------- | ------------------------------ | -------------------- | ----------- | --------------- | -------------------------------------- |
| `user-token:{sha256(jwt)}`                              | String/object qua CacheManager | BFF                  | 30m         | Đã triển khai   | Cache kết quả Authorizer verification. |
| `bff-session:{tenantId}:{sessionId}`                    | String/object qua CacheManager | BFF                  | 2h          | Đã triển khai   | Anonymous BFF edge session.            |
| `bff-session:{sessionId}`                               | String/object qua CacheManager | BFF                  | 2h          | Legacy fallback | Lookup/migration session thiếu tenant. |
| `menu:{tenantId}`                                       | String/object qua CacheManager | BFF                  | 10m         | Đã triển khai   | Cache public menu.                     |
| Throttler internal keys                                 | Library-owned                  | BFF                  | 60s         | Đã triển khai   | HTTP rate limiting.                    |
| `session:{tenantId}:{sessionId}`                        | Hash                           | Order Service        | 2h          | Đã triển khai   | Cache active session của Order domain. |
| `cart:{tenantId}:{sessionId}`                           | Hash                           | Order Service        | 2h          | Đã triển khai   | Shared cart draft state.               |
| `transfer:{tenantId}:{sessionId}`                       | String                         | Order Service        | 30s         | Đã triển khai   | Transfer lock cho session.             |
| `table-transfer:{tenantId}:{tableId}`                   | String                         | Order Service        | 30s         | Đã triển khai   | Transfer lock cho bàn nguồn/đích.      |
| `quota:{tenantId}:orders:{date}`                        | String counter                 | Order Service        | 48h         | Đã triển khai   | Daily order quota counter.             |
| `table:{tenantId}:{tableId}:status`                     | String                         | BFF/Catalog boundary | none        | Dự kiến         | Cache nhanh trạng thái bàn.            |
| `kds:{tenantId}:*`                                      | Hash/Set/ZSet/String           | Kitchen              | tùy key     | Đã triển khai   | KDS queue/ticket/SLA state.            |
| `lock:kds:rebuild:{tenantId}`                           | String lock                    | Kitchen              | short TTL   | Đã triển khai   | Rebuild lock cho KDS recovery.         |
| `realtime:kds:{tenantId}`                               | Pub/Sub channel                | Kitchen/BFF          | n/a         | Đã triển khai   | Internal KDS fan-out.                  |
| `socket.io-adapter:*`                                   | Pub/Sub internal               | WebSocket Gateway    | n/a         | Đã triển khai   | Broadcast room đa instance.            |
| `idempotency:order-submit:{tenantId}:{sessionId}:{key}` | String                         | Order Service        | planned TTL | Dự kiến         | Chặn duplicate submit nhanh.           |
| `tenant:{tenantId}:suspended`                           | String/flag                    | SaaS/BFF Guard       | no expire   | Đã triển khai   | Chặn tenant suspended nhanh.           |
| `subscription:{tenantId}`                               | String JSON                    | SaaS Service         | 5m          | Đã triển khai   | Cache current subscription.            |
| `oauth_state:{state}`                                   | String JSON                    | Payment Service      | 5m          | Đã triển khai   | SePay OAuth state one-time consume.    |

## 8. Matrix Theo Service

| Service / app   | Truy cập Redis hiện tại                           | Key đã triển khai                                                                                                 | Key dự kiến                              | Ghi chú                                                                  |
| --------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| BFF             | Có, CacheManager + Throttler storage + Node Redis | `user-token:*`, `bff-session:*`, `menu:*`, throttler keys, `tenant:*:suspended`, Socket adapter, `realtime:kds:*` | `table:*:status`                         | BFF là cache/edge/realtime layer chính.                                  |
| Authorizer      | Chưa thấy direct Redis                            | none                                                                                                              | optional JWKS cache                      | Auth result cache hiện nằm ở BFF.                                        |
| Catalog         | Chưa thấy direct Redis                            | none                                                                                                              | table status cache qua BFF/direct policy | Menu cache do BFF sở hữu, không phải Catalog.                            |
| Order           | Có, direct `ioredis`                              | `session:*`, `cart:*`, `transfer:*`, `table-transfer:*`, `quota:*`                                                | Redis idempotency hardening              | PostgreSQL vẫn là durable source.                                        |
| Kitchen         | Có, direct `ioredis`                              | `kds:*`, `lock:kds:*`, `realtime:kds:*`                                                                           | none currently verified                  | Redis là KDS runtime store hiện tại.                                     |
| SaaS Service    | Có, direct `ioredis`                              | `tenant:{tenantId}:suspended`, `subscription:{tenantId}`                                                          | none currently verified                  | Phase 4B tenant lifecycle/subscription cache.                            |
| Payment Service | Có, direct `ioredis`                              | `oauth_state:{state}`                                                                                             | none currently verified                  | Phase 4B SePay OAuth state.                                              |
| Notification    | Deferred/not current                              | none                                                                                                              | none                                     | Không tính là Redis user hiện tại.                                       |
| Frontends       | Không dùng Redis                                  | none                                                                                                              | none                                     | Dùng React Query, local/session storage, IndexedDB/service worker cache. |
| Dev tools       | Có, direct `ioredis`                              | tất cả key trong DB qua `flushdb`, scan legacy key                                                                | n/a                                      | Reset/verify local-only.                                                 |

## 9. Gaps và Ghi Chú Kiểm Chứng

### 9.1 Drift Giữa Phase Docs và Code

Một số phase docs vẫn ghi Phase 2A / Step 2.4 là chưa bắt đầu, nhưng code hiện tại đã có Order Service session/cart, bills, service requests, transfer locks, BFF Direct WebSocket events và outbox publisher. Khi audit trạng thái thật, nên ưu tiên kiểm chứng bằng code.

### 9.2 Drift Tên Key BFF Session

Tài liệu thường mô tả customer/guest session key là:

```txt
session:{sessionId}
session:{tenantId}:{sessionId}
```

Code BFF guard hiện dùng:

```txt
bff-session:{tenantId}:{sessionId}
```

Order Service lại dùng riêng:

```txt
session:{tenantId}:{sessionId}
```

Điều này có thể hợp lý nếu chủ đích là tách edge session và order-domain session, nhưng docs/comments nên được cập nhật để tránh nhầm.

### 9.3 Cart Version Conflict Chưa Atomic

Cart mutation hiện check `expectedCartVersion` sau `HGETALL`, rồi write bằng `MULTI HSET + PEXPIRE`. Write này không atomic assert rằng `cartVersion` vẫn chưa đổi.

Nếu cần concurrency nghiêm ngặt cho nhiều thiết bị cùng sửa cart, nên harden bằng một trong các cách:

- Lua compare-and-set script.
- Redis `WATCH` + `MULTI`.
- Lock ngắn quanh cart mutation.

### 9.4 Release Transfer Lock Nên Atomic

Code hiện release lock bằng:

```txt
GET key
DEL key if value matches requestId
```

Best practice với Redis lock là release bằng Lua owner-check atomic, để tránh xóa nhầm lock của request mới nếu lock cũ hết hạn và request khác acquire giữa `GET` và `DEL`.

### 9.5 Redis Idempotency Là Roadmap, PostgreSQL Idempotency Là Hiện Tại

Order submit hiện dựa vào PostgreSQL unique index và replay lookup. Redis `SET NX` idempotency đã được tài liệu nhắc như hardening, nhưng chưa triển khai.

### 9.6 Table Status Cache Chỉ Mới Có Trong Tài Liệu

Architecture và Phase 1 docs liệt kê `table:{tenantId}:{tableId}:status`, nhưng chưa thấy implementation.

### 9.7 WebSocket Redis Adapter Đã Có Trong Code

BFF hiện connect `RedisIoAdapter` trong `apps/bff/src/main.ts`, dùng `@socket.io/redis-adapter` để đồng bộ Socket.io room broadcast giữa nhiều instance. KDS internal fan-out cũng dùng Redis Pub/Sub qua `realtime:kds:*`.

### 9.8 Menu Cache Đã Invalidate, Nhưng Chưa Broadcast Menu

Admin category/menu-item write hiện xóa `menu:{tenantId}`. Canonical docs hiện đã chốt không có Kafka/WS `menu.updated`; write path chỉ invalidate cache/query để client refetch.

### 9.9 Tenant Suspend Flag Đã Có Trong Phase 4B

SaaS hiện ghi/xóa `tenant:{tenantId}:suspended`; BFF `CustomerTenantLifecycleGuard` đọc flag này làm fallback/edge signal. Khi thay đổi semantics suspend/activate, cần cập nhật đồng thời SaaS cache writer, BFF guard và `docs/technical-architecture.md`.

### 9.10 QR-Specific Rate Limit Chỉ Mới Có Trong Tài Liệu

Rate limit hiện tại là global BFF throttling. Business rule `max_scans_per_table = 10 scans per 5 minutes` chưa có Redis counter riêng.

## 10. Lệnh Kiểm Chứng Redis

Trong môi trường thật nên dùng `SCAN`. `KEYS` chỉ phù hợp local dev với dataset nhỏ.

Ví dụ local:

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

Kiểm tra TTL:

```bash
redis-cli TTL menu:{tenantId}
redis-cli TTL bff-session:{tenantId}:{sessionId}
redis-cli PTTL cart:{tenantId}:{sessionId}
```

Kiểm tra hash:

```bash
redis-cli HGETALL session:{tenantId}:{sessionId}
redis-cli HGETALL cart:{tenantId}:{sessionId}
```

Kỳ vọng khi chạy local hiện tại:

- Sau khi load public menu: có `menu:{tenantId}` với TTL khoảng 10 phút.
- Sau khi gọi route anonymous ở BFF: có `bff-session:*` với TTL khoảng 2 giờ.
- Sau QR join/order flow: có `session:{tenantId}:{sessionId}` dạng hash.
- Sau cart mutation: có `cart:{tenantId}:{sessionId}` dạng hash với `cartVersion`.
- Trong lúc transfer: lock keys xuất hiện rất ngắn rồi biến mất.
- Sau KDS/order-confirmed flow: có thể có `kds:*`, `lock:kds:*` ngắn hạn và Pub/Sub `realtime:kds:*`.
- Khi tenant bị suspend: có `tenant:{tenantId}:suspended`; khi activate/close thì key được xóa.
- Khi subscription cache được warm: có `subscription:{tenantId}` với TTL khoảng 5 phút.
- Trong SePay OAuth flow: có `oauth_state:{state}` trong tối đa 5 phút và callback sẽ consume/delete key.
- `table:*:status` và Redis idempotency keys không nên xuất hiện cho tới khi các feature roadmap tương ứng được triển khai.

## 11. Tài Liệu và Code Tham Chiếu

Tài liệu chính:

- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/implementation_plan.md`
- `docs/phases/phase-1-catalog.md`
- `docs/phases/phase-2a-order-kafka.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-4a-saga-hardening.md`
- `docs/phases/phase-4b-saas-onboarding.md`
- `docs/specs/business-logic-step-2.4-spec.vi.md`
- `docs/specs/business-logic-step-2.6-spec.vi.md`
- `docs/guides/redis-qrtable.md`

Code chính:

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
