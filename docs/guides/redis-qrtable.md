# Tài Liệu Redis & ioredis — NestJS Microservices

> **Mục tiêu:** Hiểu Redis từ nền tảng đến nâng cao, áp dụng trực tiếp vào dự án NestJS microservices với `ioredis` — bao gồm cart, session cache, distributed lock, atomic operations, và các pattern thực tế.
>
> **Vai trò canonical:** Đây là supporting guide / tutorial. Hiện trạng Redis đã triển khai được theo dõi ở [`../redis-usage-analysis.md`](../redis-usage-analysis.md), [`../technical-architecture.md`](../technical-architecture.md), và code trên `main`.
>
> **Current implementation note (2026-05-14):** Order cart/session hiện dùng Redis Hash `cart:{tenantId}:{sessionId}` với `cartVersion` check ở `CartService`, không dùng Lua script cho mutation cart. Các pattern Lua/lock trong tài liệu này là reference hardening cho tình huống cần atomic read-check-write mạnh hơn. Phase 4B cũng đã dùng Redis keys `tenant:{tenantId}:suspended`, `subscription:{tenantId}`, và `oauth_state:{state}`.

---

## Mục lục

1. [Redis là gì & tại sao dùng](#1-redis-là-gì--tại-sao-dùng)
2. [Cách Redis hoạt động bên trong](#2-cách-redis-hoạt-động-bên-trong)
3. [Data Types — Kiểu dữ liệu](#3-data-types--kiểu-dữ-liệu)
4. [Key Design & Naming Conventions](#4-key-design--naming-conventions)
5. [TTL & Expiration](#5-ttl--expiration)
6. [ioredis — Thư viện Node.js](#6-ioredis--thư-viện-nodejs)
7. [Pipeline & Batching](#7-pipeline--batching)
8. [Transactions — MULTI/EXEC](#8-transactions--multiexec)
9. [Lua Scripting — Atomic Operations](#9-lua-scripting--atomic-operations)
10. [Distributed Lock — Redlock Pattern](#10-distributed-lock--redlock-pattern)
11. [Optimistic Locking — Version Conflict](#11-optimistic-locking--version-conflict)
12. [Cart Service Pattern — Reference Variant](#12-cart-service-pattern--reference-variant)
13. [Session Caching Pattern](#13-session-caching-pattern)
14. [Pub/Sub](#14-pubsub)
15. [NestJS Integration](#15-nestjs-integration)
16. [Redis CLI — Debug & Inspect](#16-redis-cli--debug--inspect)
17. [Lỗi thường gặp & Cách xử lý](#17-lỗi-thường-gặp--cách-xử-lý)

---

## 1. Redis là gì & tại sao dùng

### Định nghĩa

**Redis** (Remote Dictionary Server) là một **in-memory data store** mã nguồn mở. Dữ liệu được lưu trực tiếp trên RAM, không phải đĩa cứng, nên tốc độ đọc/ghi cực nhanh (< 1ms).

Redis không chỉ là cache — nó là một **data structure server** có thể lưu String, Hash, List, Set, Sorted Set, Stream, và nhiều hơn nữa.

### Redis vs Database truyền thống

| Tiêu chí     | Redis                             | PostgreSQL                |
| ------------ | --------------------------------- | ------------------------- |
| Nơi lưu      | RAM (có thể persist ra đĩa)       | Đĩa cứng                  |
| Tốc độ đọc   | ~100k ops/giây                    | ~1k–10k ops/giây          |
| Kiểu dữ liệu | Đa dạng (String, Hash, List, ...) | Row/Column                |
| Phù hợp      | Cache, session, real-time, queue  | Dữ liệu bền vững, quan hệ |
| Durability   | Tuỳ cấu hình                      | Luôn bền vững             |

### Tại sao dùng trong microservices?

- **Cart**: Cần đọc/ghi nhanh từ nhiều request đồng thời → Redis Hash
- **Session cache**: Tránh query PostgreSQL mỗi request → Redis String/Hash
- **Distributed lock**: Đảm bảo chỉ 1 process xử lý tại một thời điểm → `SET NX PX`
- **Optimistic locking**: Cart version conflict detection → current code check `cartVersion`; Lua/WATCH là hardening option
- **Rate limiting**: Đếm request theo thời gian → `INCR` + `EXPIRE`
- **Pub/Sub**: Broadcast event giữa service instances → `PUBLISH`/`SUBSCRIBE`

---

## 2. Cách Redis hoạt động bên trong

### Single-threaded Event Loop

Redis xử lý tất cả lệnh trên **một thread duy nhất** (single-threaded). Điều này có nghĩa là:

- **Không có race condition** ở cấp lệnh đơn — mỗi lệnh được thực thi hoàn toàn trước khi lệnh tiếp theo bắt đầu.
- Lệnh nào cũng là **atomic** về mặt single-command.
- Nhưng **chuỗi lệnh** (multi-command sequence) **không** atomic nếu không dùng `MULTI/EXEC` hoặc Lua script.

```
Client A: SET cart:s1  ← bắt đầu
Client B: GET cart:s1  ← phải đợi A xong
Client A: ... xong
Client B: ... bắt đầu chạy
```

### Persistence Modes

Redis có thể persist dữ liệu ra đĩa theo hai cách:

**RDB (Redis Database Snapshot):**

- Tạo snapshot toàn bộ data tại một thời điểm.
- Ghi ra file `dump.rdb`.
- Nhanh khi restore, nhưng có thể mất data giữa 2 snapshot.

**AOF (Append-Only File):**

- Ghi log từng lệnh ghi vào file.
- An toàn hơn nhưng file lớn hơn và restore chậm hơn.
- Thường dùng `appendfsync everysec` để cân bằng.

**Trong môi trường dev/microservices dự án này:** thường dùng Redis không có persistence (chỉ in-memory) vì cart/session là temporary data. Nếu Redis khởi động lại, cart sẽ trống — đây là behavior được chấp nhận.

### Memory Management

Khi RAM đầy, Redis áp dụng **eviction policy**:

| Policy           | Ý nghĩa                                    |
| ---------------- | ------------------------------------------ |
| `noeviction`     | Báo lỗi khi đầy (mặc định)                 |
| `allkeys-lru`    | Xoá key ít dùng nhất (Least Recently Used) |
| `volatile-lru`   | Chỉ xoá key có TTL, theo LRU               |
| `allkeys-random` | Xoá ngẫu nhiên                             |

```bash
# Cấu hình trong redis.conf hoặc Docker env
maxmemory 256mb
maxmemory-policy allkeys-lru
```

---

## 3. Data Types — Kiểu dữ liệu

### 3.1 String

Kiểu cơ bản nhất. Lưu text, số, JSON serialized, hoặc binary.

**Giá trị tối đa:** 512 MB mỗi key.

```bash
# Cú pháp cơ bản
SET key value
GET key
DEL key

# Với TTL (Time To Live) — seconds
SET key value EX 3600       # Hết hạn sau 3600 giây (1 giờ)
SET key value PX 60000      # Hết hạn sau 60000 milliseconds (1 phút)

# SET chỉ khi key CHƯA tồn tại (NX = Not eXists)
SET key value NX             # Trả về OK nếu thành công, nil nếu key đã tồn tại

# SET chỉ khi key ĐÃ tồn tại (XX = eXists)
SET key value XX

# Kết hợp NX + PX — dùng cho distributed lock
SET lock:resource "owner-id" NX PX 5000

# Tăng/giảm số nguyên — ATOMIC
INCR counter             # counter += 1
INCRBY counter 5         # counter += 5
DECR counter             # counter -= 1
DECRBY counter 3         # counter -= 3

# Append chuỗi
APPEND key " world"

# Lấy độ dài
STRLEN key

# Lấy/set nhiều key cùng lúc
MSET key1 val1 key2 val2
MGET key1 key2
```

**Dùng trong dự án:**

- `session:{tenantId}:{sessionId}` → lưu JSON serialized của `SessionEntity` (cache)
- `lock:{tenantId}:{sessionId}:cart` → distributed lock cho cart
- `idempotency:{tenantId}:{idempotencyKey}` → lưu kết quả để deduplicate

---

### 3.2 Hash

Lưu **map của field → value** trong một key duy nhất. Tương tự một row trong database nhưng cực nhanh.

**Giới hạn:** Lên đến 4 tỷ field mỗi Hash.

```bash
# Ghi một field
HSET key field value
HSET user:1 name "Alice" age "30" role "admin"

# Đọc một field
HGET key field
HGET user:1 name                   # "Alice"

# Đọc nhiều field
HMGET key field1 field2
HMGET user:1 name age              # ["Alice", "30"]

# Đọc toàn bộ fields và values
HGETALL key
HGETALL user:1                     # ["name", "Alice", "age", "30", "role", "admin"]

# Lấy tất cả field names
HKEYS key
HKEYS user:1                       # ["name", "age", "role"]

# Lấy tất cả values
HVALS key
HVALS user:1                       # ["Alice", "30", "admin"]

# Xoá một field
HDEL key field
HDEL user:1 role

# Kiểm tra field tồn tại
HEXISTS key field
HEXISTS user:1 name                # 1 (true) hoặc 0 (false)

# Đếm số field
HLEN key
HLEN user:1                        # 2 (sau khi xoá role)

# Tăng số nguyên trong field
HINCRBY key field increment
HINCRBY stats:tenant1 orderCount 1

# Ghi nhiều field cùng lúc
HMSET key field1 val1 field2 val2  # Deprecated, dùng HSET nhiều arg thay thế
HSET key field1 val1 field2 val2   # Từ Redis 4.0+: HSET chấp nhận nhiều field-value
```

**Khi nào dùng Hash thay vì String + JSON?**

| Tình huống             | Hash                     | String + JSON                                  |
| ---------------------- | ------------------------ | ---------------------------------------------- |
| Cần cập nhật 1 field   | ✅ `HSET key field val`  | ❌ Phải GET → parse → modify → stringify → SET |
| Cần đọc 1-2 field      | ✅ `HMGET`               | ❌ GET rồi parse toàn bộ                       |
| Cần đọc toàn bộ object | ⚠️ `HGETALL` (cần parse) | ✅ `GET` rồi `JSON.parse`                      |
| Dữ liệu lồng nhau sâu  | ❌ Không hỗ trợ nested   | ✅ JSON hỗ trợ                                 |

**Dùng trong dự án:**

- `cart:{tenantId}:{sessionId}` → lưu từng field là từng `cartLine` (JSON per field) + `_meta` field cho cartVersion

---

### 3.3 List

Danh sách các phần tử theo thứ tự. Cho phép **push/pop từ cả hai đầu** (double-ended queue — deque).

**Giới hạn:** Lên đến 4 tỷ phần tử.

```bash
# Push vào đầu (Left Push)
LPUSH key element1 element2
LPUSH queue "task3" "task4"        # queue = [task4, task3, ...]

# Push vào cuối (Right Push)
RPUSH key element1 element2
RPUSH queue "task1" "task2"        # queue = [..., task1, task2]

# Pop từ đầu (Left Pop)
LPOP key                           # Lấy và xoá phần tử đầu tiên
LPOP key 3                         # Lấy và xoá 3 phần tử đầu (Redis 6.2+)

# Pop từ cuối (Right Pop)
RPOP key

# Blocking pop — chờ cho đến khi có phần tử (dùng cho queue/worker)
BLPOP key1 key2 timeout            # timeout=0 là chờ mãi mãi
BRPOP key timeout

# Đọc một khoảng (không xoá)
LRANGE key start stop
LRANGE queue 0 -1                  # Lấy tất cả phần tử (-1 là cuối)
LRANGE queue 0 9                   # Lấy 10 phần tử đầu

# Đọc theo index
LINDEX key index
LINDEX queue 0                     # Phần tử đầu tiên
LINDEX queue -1                    # Phần tử cuối cùng

# Ghi theo index
LSET key index value

# Độ dài list
LLEN key

# Trim (giữ lại một khoảng, xoá phần còn lại)
LTRIM key start stop
LTRIM logs 0 999                   # Chỉ giữ 1000 phần tử gần nhất
```

**Pattern — Message Queue đơn giản:**

```
Producer:  RPUSH jobs "{task: 'sendEmail', ...}"
Consumer:  BLPOP jobs 0   ← chờ và lấy job
```

**Dùng trong dự án (tiềm năng):**

- `outbox:{tenantId}` → queue event chờ publish lên Kafka
- `audit:{tenantId}:{orderId}` → log các thay đổi trạng thái order

---

### 3.4 Set

Tập hợp các phần tử **không trùng lặp**, **không có thứ tự**.

```bash
# Thêm phần tử
SADD key member1 member2 member3
SADD online_users "user1" "user2"

# Xoá phần tử
SREM key member
SREM online_users "user1"

# Kiểm tra tồn tại
SISMEMBER key member
SISMEMBER online_users "user2"     # 1 hoặc 0

# Lấy tất cả thành viên
SMEMBERS key

# Đếm số thành viên
SCARD key

# Lấy ngẫu nhiên (không xoá)
SRANDMEMBER key count

# Pop ngẫu nhiên (xoá)
SPOP key count

# Phép toán tập hợp
SUNION key1 key2               # Hợp
SINTER key1 key2               # Giao
SDIFF key1 key2                # Hiệu

# Phép toán và lưu kết quả
SUNIONSTORE dest key1 key2
SINTERSTORE dest key1 key2
```

**Dùng trong dự án (tiềm năng):**

- `active_sessions:{tenantId}` → tập hợp sessionId đang active
- `processed_idempotency:{tenantId}` → tập hợp các idempotencyKey đã xử lý

---

### 3.5 Sorted Set (ZSet)

Tập hợp không trùng lặp, mỗi phần tử kèm theo một **score** (số thực). Phần tử được **sắp xếp tự động theo score**.

```bash
# Thêm phần tử với score
ZADD key score member
ZADD leaderboard 1500 "Alice" 2000 "Bob" 800 "Carol"

# Đọc theo rank (thứ hạng) — thứ tự tăng dần
ZRANGE key start stop [WITHSCORES]
ZRANGE leaderboard 0 -1 WITHSCORES   # Từ thấp đến cao

# Đọc theo rank — thứ tự giảm dần
ZREVRANGE key start stop [WITHSCORES]
ZREVRANGE leaderboard 0 2 WITHSCORES  # Top 3

# Lấy rank của một member
ZRANK key member                   # Rank tính từ thấp nhất (0-indexed)
ZREVRANK key member                # Rank tính từ cao nhất

# Lấy score
ZSCORE key member
ZSCORE leaderboard "Bob"           # 2000

# Tăng score
ZINCRBY key increment member
ZINCRBY leaderboard 100 "Alice"    # score của Alice thành 1600

# Xoá member
ZREM key member

# Đọc theo khoảng score
ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
ZRANGEBYSCORE leaderboard 1000 2000 WITHSCORES

# Đếm số member theo khoảng score
ZCOUNT key min max
ZCOUNT leaderboard 1000 2000

# Đếm tổng
ZCARD key
```

**Dùng trong dự án (tiềm năng):**

- Rate limiting: `ZADD rate:{userId} {timestamp} {requestId}` + `ZREMRANGEBYSCORE` theo sliding window
- Xếp hạng order theo thời gian: score = timestamp

---

### 3.6 Stream (Redis Streams)

Cấu trúc dữ liệu dạng **append-only log**, tương tự Kafka nhưng nhẹ hơn. Hỗ trợ consumer groups.

> Nâng cao — dự án này dùng Kafka cho event streaming, Redis Stream có thể dùng cho lightweight queue nội bộ.

```bash
# Thêm entry (Redis tự tạo ID dạng timestamp-sequence)
XADD stream * field1 value1 field2 value2
XADD orders * orderId "order-1" status "PENDING"

# Đọc từ một vị trí
XREAD COUNT 10 STREAMS stream 0    # Đọc 10 entry từ đầu
XREAD COUNT 10 STREAMS stream $    # Chỉ đọc entry mới

# Độ dài
XLEN stream

# Đọc khoảng
XRANGE stream - +                  # Tất cả
XRANGE stream - + COUNT 10         # 10 entry đầu tiên
```

---

## 4. Key Design & Naming Conventions

### Quy tắc đặt tên key

Key trong Redis là **binary-safe string** — có thể chứa bất kỳ byte nào, kể cả binary. Tuy nhiên trong thực tế, mọi người dùng chuỗi có nghĩa với dấu `:` làm separator.

**Pattern chuẩn:**

```
{domain}:{tenantId}:{resource}:{id}
```

**Ví dụ từ dự án:**

```
cart:{tenantId}:{sessionId}                  # Cart của session trong tenant
lock:cart:{tenantId}:{sessionId}             # Distributed lock cho cart mutation
session:cache:{tenantId}:{sessionId}         # Cache của SessionEntity
idempotency:{tenantId}:{idempotencyKey}      # Deduplicate submitted order
lock:transfer:{tenantId}:{sessionId}         # Lock cho table transfer saga
```

### Rules quan trọng

1. **Không dùng key quá dài** — Key là memory overhead. Nếu cần identifier dài, dùng hash của nó.
2. **Không dùng key quá ngắn** — `u:1000` tiết kiệm vài byte nhưng khó debug. Ưu tiên `user:1000`.
3. **Nhất quán về separator** — Chỉ dùng `:` không dùng `/` hoặc `.`.
4. **Tránh whitespace trong key** — Gây khó khăn khi debug bằng CLI.
5. **Namespace theo service** — Nếu nhiều service dùng chung Redis instance: `order:cart:...` thay vì chỉ `cart:...`

### Scan key theo pattern (production-safe)

`KEYS pattern` sẽ **block Redis** vì duyệt toàn bộ keyspace — **TUYỆT ĐỐI KHÔNG DÙNG trong production** khi có nhiều key.

Thay vào đó dùng `SCAN`:

```bash
# SCAN cursor [MATCH pattern] [COUNT hint]
SCAN 0 MATCH cart:tenant1:* COUNT 100
# Redis trả về [cursor_tiếp_theo, [keys...]]
# Khi cursor trả về = 0 nghĩa là đã scan xong
```

```typescript
// ioredis: scan tất cả key theo pattern
async function scanKeys(redis: Redis, pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}
```

---

## 5. TTL & Expiration

### Các lệnh TTL

```bash
# Đặt TTL khi SET
SET key value EX 3600          # Hết hạn sau 3600 giây
SET key value PX 3600000       # Hết hạn sau 3600000 ms
SET key value EXAT 1700000000  # Hết hạn tại Unix timestamp (seconds)
SET key value PXAT 1700000000000  # Hết hạn tại Unix timestamp (ms)

# Đặt TTL cho key đã tồn tại
EXPIRE key seconds             # Đặt TTL tính bằng giây
PEXPIRE key milliseconds       # Đặt TTL tính bằng ms
EXPIREAT key timestamp         # Đặt hết hạn theo Unix timestamp (giây)
PEXPIREAT key timestamp        # Đặt hết hạn theo Unix timestamp (ms)

# Xem TTL còn lại
TTL key                        # Trả về giây, -1 = không có TTL, -2 = key không tồn tại
PTTL key                       # Trả về ms

# Xoá TTL (làm cho key tồn tại mãi mãi)
PERSIST key

# Kiểm tra key có tồn tại không
EXISTS key                     # 1 hoặc 0
EXISTS key1 key2 key3          # Trả về số key tồn tại
```

### Khi nào dùng TTL?

| Use case              | TTL gợi ý      | Lý do                                    |
| --------------------- | -------------- | ---------------------------------------- |
| Cart (active session) | 2–4 giờ        | Tự động dọn khi session hết              |
| Session cache         | 30–60 phút     | Phải re-validate sau thời gian nhất định |
| Distributed lock      | 3–10 giây      | Prevent deadlock nếu holder crash        |
| Idempotency key       | 24 giờ         | Đủ thời gian để client retry             |
| Rate limit counter    | 1 phút / 1 giờ | Sliding/fixed window                     |

### Hành vi khi key expire

Khi một key hết TTL, Redis sử dụng **lazy expiration + active expiration**:

- **Lazy**: Khi có request đọc key đó, Redis kiểm tra TTL → nếu expired thì xoá và trả về `nil`.
- **Active**: Redis định kỳ scan một mẫu ngẫu nhiên các key có TTL và xoá những cái đã expired.

**Lưu ý quan trọng:** Nếu một key expire mà không có ai đọc, nó sẽ vẫn chiếm memory cho đến khi active scan dọn nó.

---

## 6. ioredis — Thư viện Node.js

### Giới thiệu

`ioredis` là thư viện Redis client cho Node.js, được viết bằng TypeScript. Có nhiều tính năng hơn `redis` (thư viện official) như:

- Pipeline tự động
- Cluster support
- Sentinel support
- Lua script caching
- Promise-based API
- TypeScript-native

### Cài đặt

```bash
pnpm add ioredis
```

### Khởi tạo connection

```typescript
import Redis from 'ioredis';

// Cách 1: Cấu hình object
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'secret', // Nếu có auth
  db: 0, // Database index (0-15, mặc định 0)
  maxRetriesPerRequest: 3, // Retry tối đa 3 lần trước khi throw error
  enableReadyCheck: true, // Kiểm tra Redis có sẵn sàng nhận lệnh không
  lazyConnect: false, // Kết nối ngay khi khởi tạo
  connectTimeout: 10000, // Timeout kết nối (ms)
  commandTimeout: 5000, // Timeout mỗi lệnh (ms)
  keepAlive: 30000, // TCP keepalive interval (ms)
  retryStrategy(times) {
    // Hàm tính delay giữa các lần retry
    const delay = Math.min(times * 100, 2000); // Tối đa 2s
    return delay;
  },
});

// Cách 2: Connection string
const redis = new Redis('redis://:password@localhost:6379/0');
// hoặc
const redis = new Redis('rediss://...'); // TLS

// Đóng connection đúng cách
await redis.quit(); // Gửi QUIT command, chờ server phản hồi
redis.disconnect(); // Ngắt ngay lập tức (không gửi QUIT)
```

### Events của ioredis

```typescript
redis.on('connect', () => console.log('Đang kết nối...'));
redis.on('ready', () => console.log('Redis sẵn sàng'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('close', () => console.log('Kết nối đóng'));
redis.on('reconnecting', () => console.log('Đang reconnect...'));
redis.on('end', () => console.log('Kết nối kết thúc hẳn'));
```

### Các lệnh cơ bản với ioredis API

Tất cả lệnh Redis đều được map thành method của ioredis client (lowercase):

```typescript
// String
await redis.set('key', 'value');
await redis.set('key', 'value', 'EX', 3600); // Với TTL
await redis.set('key', 'value', 'NX'); // Chỉ khi chưa tồn tại
await redis.set('key', 'value', 'NX', 'PX', 5000); // NX + TTL ms
const value = await redis.get('key'); // string | null
await redis.del('key');
await redis.del('key1', 'key2', 'key3'); // Xoá nhiều key

const count = await redis.incr('counter'); // number
await redis.incrby('counter', 5);
await redis.expire('key', 3600);
const ttl = await redis.ttl('key'); // -1 | -2 | seconds
const exists = await redis.exists('key'); // 0 | 1

// Hash
await redis.hset('user:1', 'name', 'Alice');
await redis.hset('user:1', { name: 'Alice', age: '30' }); // ioredis hỗ trợ object
const name = await redis.hget('user:1', 'name'); // string | null
const all = await redis.hgetall('user:1'); // Record<string, string> | null
await redis.hdel('user:1', 'age');
const exists2 = await redis.hexists('user:1', 'name'); // 0 | 1

// List
await redis.rpush('queue', 'item1', 'item2');
await redis.lpush('queue', 'item0');
const item = await redis.lpop('queue'); // string | null
const items = await redis.lrange('queue', 0, -1); // string[]
const len = await redis.llen('queue');

// Set
await redis.sadd('tags', 'redis', 'nodejs', 'typescript');
await redis.srem('tags', 'nodejs');
const isMember = await redis.sismember('tags', 'redis'); // 0 | 1
const members = await redis.smembers('tags'); // string[]
const count2 = await redis.scard('tags');

// Sorted Set
await redis.zadd('board', 1500, 'Alice', 2000, 'Bob');
const score = await redis.zscore('board', 'Bob'); // string | null
const rank = await redis.zrevrank('board', 'Bob'); // number | null
const top3 = await redis.zrevrange('board', 0, 2, 'WITHSCORES'); // string[]
```

### Type của giá trị trả về

Điều quan trọng khi làm việc với ioredis là hiểu rõ **Redis luôn trả về string**, không tự động parse số hay object:

```typescript
await redis.set('count', 42);
const raw = await redis.get('count'); // raw = "42" (string, không phải number!)
const num = parseInt(raw ?? '0', 10); // Cần parse thủ công

await redis.set('obj', JSON.stringify({ id: 1, name: 'Alice' }));
const rawObj = await redis.get('obj');
const obj = rawObj ? JSON.parse(rawObj) : null; // Cần parse thủ công
```

**Best practice — tạo helper wrapper:**

```typescript
// Helper để set/get JSON
async function setJson<T>(redis: Redis, key: string, value: T, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, serialized, 'EX', ttlSeconds);
  } else {
    await redis.set(key, serialized);
  }
}

async function getJson<T>(redis: Redis, key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}
```

---

## 7. Pipeline & Batching

### Vấn đề: Round-trip latency

Mỗi lệnh Redis cần một round-trip qua network:

```
Client → [SET key1] → Redis → [OK] → Client   (1 round-trip)
Client → [SET key2] → Redis → [OK] → Client   (1 round-trip)
Client → [GET key3] → Redis → [val] → Client  (1 round-trip)
```

Nếu gửi 100 lệnh tuần tự với latency 1ms/lệnh = **100ms tổng cộng** — rất chậm!

### Giải pháp: Pipeline

Pipeline gom nhiều lệnh vào **một TCP packet** gửi cùng lúc, Redis xử lý tuần tự và trả về tất cả kết quả trong **một response**:

```
Client → [SET k1, SET k2, GET k3] → Redis → [OK, OK, val] → Client  (1 round-trip)
```

```typescript
// ioredis Pipeline
const pipeline = redis.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2', 'EX', 3600);
pipeline.hset('user:1', 'name', 'Alice');
pipeline.incr('counter');
pipeline.get('key1');

// Thực thi tất cả cùng lúc
const results = await pipeline.exec();
// results: Array<[Error | null, unknown]>
// Mỗi phần tử là [error, result] của từng lệnh theo thứ tự

if (results) {
  for (const [err, result] of results) {
    if (err) console.error('Pipeline command error:', err);
    else console.log('Result:', result);
  }
}
```

**Lưu ý quan trọng về Pipeline:**

- Pipeline **KHÔNG phải transaction** — các lệnh được gửi theo batch nhưng không atomic. Nếu một lệnh fail, các lệnh khác vẫn thực thi.
- Pipeline tăng throughput nhưng không đảm bảo tính nhất quán.

### Chainable pipeline syntax

```typescript
const [err, results] = (await redis.pipeline().set('key1', 'val1').set('key2', 'val2').get('key1').exec()) ?? [
  null,
  [],
];
```

---

## 8. Transactions — MULTI/EXEC

### Khái niệm

`MULTI/EXEC` là **transaction** trong Redis — đảm bảo một nhóm lệnh được thực thi **tuần tự, không bị gián đoạn** bởi client khác.

```bash
MULTI          # Bắt đầu transaction (server queue commands)
SET key1 val1  # Lệnh được queue, KHÔNG thực thi ngay
INCR counter
GET key2
EXEC           # Thực thi tất cả lệnh trong queue cùng lúc

# Hoặc huỷ
DISCARD        # Huỷ toàn bộ transaction
```

```typescript
// ioredis MULTI/EXEC — dùng multi()
const results = await redis.multi().set('key1', 'val1').incr('counter').get('key2').exec();
```

### Tại sao MULTI/EXEC không đủ cho mọi trường hợp?

Giả sử logic: "Đọc giá trị → kiểm tra → ghi nếu điều kiện đúng":

```
Client A: GET cart_version   → "5"
                                         ← Client B: SET cart_version "6"  (ghi đè!)
Client A: MULTI
Client A: SET cart_version "6" nếu version == 5  ← ĐÃ BỊ LỖI THỜI!
Client A: EXEC
```

Vấn đề: Giữa GET và MULTI/EXEC, client khác có thể thay đổi dữ liệu. Đây là **race condition**.

### Giải pháp: WATCH

`WATCH` theo dõi key — nếu key bị thay đổi trước khi EXEC, toàn bộ transaction bị **abort** (EXEC trả về `null`):

```typescript
async function incrementWithWatch(redis: Redis, key: string): Promise<boolean> {
  // Retry loop vì WATCH có thể fail
  for (let attempt = 0; attempt < 3; attempt++) {
    await redis.watch(key);

    const currentValue = await redis.get(key);
    const newValue = parseInt(currentValue ?? '0', 10) + 1;

    const result = await redis.multi().set(key, newValue).exec();

    if (result !== null) {
      // Thành công — không ai thay đổi key trong lúc chúng ta watch
      return true;
    }
    // result === null nghĩa là WATCH thất bại, retry
  }
  return false; // Tất cả attempts đều fail
}
```

**Hạn chế của WATCH:** Trong hệ thống có nhiều client cạnh tranh, tỷ lệ retry cao. Với các thao tác cần atomic phức tạp hơn → dùng **Lua script**.

---

## 9. Lua Scripting — Atomic Operations

### Tại sao dùng Lua?

Redis thực thi Lua script **hoàn toàn atomic** — toàn bộ script chạy trên single thread, không client nào có thể xen vào giữa chừng. Đây là cách **duy nhất đáng tin cậy** để thực hiện các thao tác đọc-kiểm tra-ghi (Read-Check-Write) atomic trong Redis.

**Lua script trong Redis là alternative tốt hơn WATCH trong nhiều trường hợp:**

- Không cần retry loop
- Không có race condition
- Logic phức tạp có thể được đóng gói

### Cú pháp cơ bản

```lua
-- Trong Lua script Redis:
-- KEYS[1], KEYS[2], ... là tham số key (truyền từ ngoài vào)
-- ARGV[1], ARGV[2], ... là tham số value (truyền từ ngoài vào)

-- Gọi Redis command từ Lua
redis.call('SET', KEYS[1], ARGV[1])
local val = redis.call('GET', KEYS[1])

-- redis.call() sẽ THROW ERROR nếu command fail
-- redis.pcall() sẽ CATCH ERROR và trả về error object

-- Trả về giá trị
return val

-- Kiểm tra nil
if val == false then   -- Redis trả về false cho nil trong Lua
  return 0
end

-- Chuyển đổi type
local num = tonumber(val)   -- string → number
local str = tostring(num)   -- number → string
```

### Chạy Lua script với ioredis

```typescript
// Cách 1: eval — chạy thẳng script string
const result = await redis.eval(
  `
  local current = redis.call('GET', KEYS[1])
  if current == false then
    redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
    return 1
  end
  return 0
  `,
  1, // Số lượng KEYS
  'mykey', // KEYS[1]
  'myvalue', // ARGV[1]
  '3600', // ARGV[2]
);
```

```typescript
// Cách 2: defineCommand — đăng ký command tùy chỉnh (khuyến nghị)
const redis = new Redis();

redis.defineCommand('setIfNotExists', {
  numberOfKeys: 1,
  lua: `
    local current = redis.call('GET', KEYS[1])
    if current == false then
      redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
      return 1
    end
    return 0
  `,
});

// Gọi như một method bình thường
const result = await (redis as any).setIfNotExists('mykey', 'myvalue', '3600');
```

```typescript
// Cách 3: evalsha — cache script trên server (hiệu quả nhất khi gọi nhiều lần)
const sha = await redis.script(
  'LOAD',
  `
  return redis.call('GET', KEYS[1])
`,
);
const result = await redis.evalsha(sha, 1, 'mykey');
```

### Reference hardening: Cart Version Check & Update (Optimistic Lock)

Đây là pattern hardening cho cart mutation có cạnh tranh cao. Code hiện tại đã check `cartVersion` trong Order `CartService`; Lua script dưới đây là thiết kế tham khảo nếu cần atomic read-check-write hoàn toàn trong Redis.

```typescript
const CART_MUTATE_SCRIPT = `
  -- KEYS[1] = cartKey (e.g. "cart:tenant1:sess1")
  -- ARGV[1] = expectedCartVersion (string number)
  -- ARGV[2] = cartMetaJson (JSON string của toàn bộ cart sau mutation)
  -- ARGV[3] = ttlSeconds

  local cartKey = KEYS[1]
  local expectedVersion = tonumber(ARGV[1])
  local newCartJson = ARGV[2]
  local ttl = tonumber(ARGV[3])

  -- Đọc meta field chứa cartVersion hiện tại
  local currentVersionStr = redis.call('HGET', cartKey, '_version')
  local currentVersion = tonumber(currentVersionStr) or 0

  -- Kiểm tra version
  if currentVersion ~= expectedVersion then
    -- Trả về current snapshot để client biết version hiện tại
    local snapshot = redis.call('GET', cartKey .. ':snapshot')
    return {-1, snapshot or ''}  -- -1 = conflict
  end

  -- Tăng version
  local newVersion = currentVersion + 1

  -- Cập nhật cart
  redis.call('SET', cartKey .. ':snapshot', newCartJson, 'EX', ttl)
  redis.call('HSET', cartKey, '_version', tostring(newVersion))
  redis.call('EXPIRE', cartKey, ttl)

  return {newVersion, newCartJson}  -- Thành công
`;
```

### Ví dụ thực tế: Acquire Distributed Lock

```typescript
const ACQUIRE_LOCK_SCRIPT = `
  -- KEYS[1] = lockKey
  -- ARGV[1] = lockValue (unique identifier của owner)
  -- ARGV[2] = ttlMs

  local lockKey = KEYS[1]
  local lockValue = ARGV[1]
  local ttlMs = tonumber(ARGV[2])

  -- SET NX PX là atomic, nhưng đây là ví dụ Lua để mở rộng thêm logic
  local existing = redis.call('GET', lockKey)
  if existing == false then
    redis.call('SET', lockKey, lockValue, 'PX', ttlMs)
    return 1  -- Thành công acquire
  end
  return 0  -- Đã bị lock bởi người khác
`;

const RELEASE_LOCK_SCRIPT = `
  -- QUAN TRỌNG: Chỉ release lock nếu mình là owner
  -- Không dùng GET rồi DEL riêng lẻ vì có race condition!

  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  else
    return 0
  end
`;
```

### Giới hạn của Lua script

- **Không được dùng blocking command** (BLPOP, BRPOP...) trong Lua.
- **Không có I/O** — không thể gọi HTTP, file, database trong Lua.
- **Không có sleep/delay**.
- Script chạy quá lâu sẽ bị kill bởi `lua-time-limit` (mặc định 5 giây).
- **Tất cả key phải được khai báo qua KEYS[]** để Redis Cluster biết key nằm ở shard nào.

---

## 10. Distributed Lock — Redlock Pattern

### Vấn đề cần giải quyết

Trong microservices, nhiều instance có thể xử lý cùng một resource đồng thời:

```
Instance A: Đọc cart → Đang xử lý mutation...
Instance B: Đọc cart → Đang xử lý mutation...  ← Race condition!
Instance A: Ghi cart v2
Instance B: Ghi cart v2  ← Ghi đè mất mutation của A!
```

Giải pháp: **Distributed Lock** — chỉ cho phép một instance giữ "quyền xử lý" tại một thời điểm.

### Pattern đơn giản: SET NX PX

```typescript
// Acquire lock
const lockKey = `lock:cart:${tenantId}:${sessionId}`;
const lockValue = `${instanceId}:${Date.now()}:${Math.random()}`; // Unique
const ttlMs = 5000; // 5 giây — phải đủ để xử lý xong

const acquired = await redis.set(lockKey, lockValue, 'NX', 'PX', ttlMs);
if (acquired === null) {
  throw new Error('Cart is being processed by another request');
}

try {
  // Xử lý cart mutation ở đây...
  await doCartMutation();
} finally {
  // QUAN TRỌNG: Release lock — phải dùng Lua để atomic check-and-delete
  await redis.eval(
    `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end`,
    1,
    lockKey,
    lockValue,
  );
}
```

**Tại sao lockValue phải unique?**

Tránh trường hợp:

1. Process A acquire lock với TTL 5s
2. Process A xử lý chậm, lock expire sau 5s
3. Process B acquire cùng lock
4. Process A xong, gọi DEL lock → **xoá lock của B!** ← Bug nguy hiểm

Dùng unique lockValue + Lua check trước khi DEL giải quyết vấn đề này.

### Lock class tái sử dụng

```typescript
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

export class RedisLock {
  private readonly RELEASE_SCRIPT = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    else
      return 0
    end
  `;

  constructor(private readonly redis: Redis) {}

  /**
   * Thử acquire lock. Trả về lockValue nếu thành công, null nếu thất bại.
   */
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const lockValue = randomUUID();
    const result = await this.redis.set(key, lockValue, 'NX', 'PX', ttlMs);
    return result === 'OK' ? lockValue : null;
  }

  /**
   * Release lock. Chỉ release nếu lockValue khớp (mình là owner).
   */
  async release(key: string, lockValue: string): Promise<boolean> {
    const result = await this.redis.eval(this.RELEASE_SCRIPT, 1, key, lockValue);
    return result === 1;
  }

  /**
   * Thực thi function với lock. Tự động acquire và release.
   */
  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>, retries = 3, retryDelayMs = 100): Promise<T> {
    for (let i = 0; i < retries; i++) {
      const lockValue = await this.acquire(key, ttlMs);

      if (lockValue) {
        try {
          return await fn();
        } finally {
          await this.release(key, lockValue);
        }
      }

      if (i < retries - 1) {
        // Chờ trước khi retry — exponential backoff
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (i + 1)));
      }
    }
    throw new Error(`Failed to acquire lock for key: ${key} after ${retries} attempts`);
  }
}
```

### Sử dụng trong Cart Service

```typescript
// Trong CartService
async mutateCart(params: CartMutateParams): Promise<CartSnapshot> {
  const lockKey = `lock:cart:${params.tenantId}:${params.sessionId}`;

  return this.redisLock.withLock(lockKey, 5000, async () => {
    // Toàn bộ logic mutation chạy dưới lock
    const cart = await this.getCart(params.tenantId, params.sessionId);

    if (cart.cartVersion !== params.expectedCartVersion) {
      throw new CartVersionConflictError(cart);
    }

    const updatedCart = applyMutation(cart, params);
    await this.saveCart(updatedCart);
    return updatedCart;
  });
}
```

---

## 11. Optimistic Locking — Version Conflict

### Khái niệm

**Optimistic Locking** là chiến lược giả định rằng xung đột hiếm xảy ra — thay vì lock ngay từ đầu (pessimistic), ta:

1. Đọc data và ghi nhớ **version hiện tại**
2. Thực hiện thay đổi ở application layer
3. Khi ghi lại, **kiểm tra version vẫn còn khớp** → nếu không, báo conflict

```
Client A: đọc cart (version=5) → hiển thị cho user
Client B: thêm item → cart version=6
Client A: user thêm item → gửi mutation với expectedVersion=5
          → Server kiểm tra: currentVersion(6) ≠ expectedVersion(5)
          → Trả về 409 CART_VERSION_CONFLICT + snapshot hiện tại
Client A: nhận conflict → refresh lại cart version=6 → user thêm lại item
```

### Tại sao cần Optimistic Locking cho Cart?

Trong hệ thống QR Table:

- Một session có thể được nhiều thiết bị của nhóm khách hàng truy cập đồng thời.
- Mỗi thiết bị có thể thêm/sửa/xoá món cùng lúc.
- Optimistic locking đảm bảo không có mutation nào bị "ghi đè ngầm" — luôn báo conflict rõ ràng.

### Hardening option: Lua script atomic

```typescript
// Script kiểm tra version và update nếu version khớp
export const CART_MUTATE_SCRIPT = `
  local cartKey = KEYS[1]
  local lockKey = KEYS[2]
  local expectedVersion = tonumber(ARGV[1])
  local newSnapshotJson = ARGV[2]
  local newVersion = tonumber(ARGV[3])
  local ttl = tonumber(ARGV[4])

  -- Đọc version hiện tại
  local currentVersionStr = redis.call('HGET', cartKey .. ':meta', 'version')
  local currentVersion = tonumber(currentVersionStr) or 0

  -- Kiểm tra version conflict
  if currentVersion ~= expectedVersion then
    local snapshot = redis.call('GET', cartKey .. ':snapshot')
    return {0, currentVersion, snapshot or '{}'}
    -- 0 = conflict, trả về version hiện tại và snapshot để client sync
  end

  -- Ghi snapshot mới
  redis.call('SET', cartKey .. ':snapshot', newSnapshotJson, 'EX', ttl)

  -- Cập nhật meta (version, updatedAt)
  redis.call('HSET', cartKey .. ':meta', 'version', newVersion)
  redis.call('EXPIRE', cartKey .. ':meta', ttl)

  return {1, newVersion, newSnapshotJson}
  -- 1 = thành công, version mới, snapshot mới
`;
```

```typescript
// Sử dụng trong CartService
async mutateCart(
  tenantId: string,
  sessionId: string,
  expectedCartVersion: number,
  mutation: CartMutation
): Promise<CartSnapshot> {
  const cartKey = `cart:${tenantId}:${sessionId}`;
  const ttl = 4 * 60 * 60; // 4 giờ

  // Lấy cart hiện tại để áp dụng mutation
  const currentSnapshot = await this.getCartSnapshot(tenantId, sessionId);
  const updatedSnapshot = applyMutation(currentSnapshot, mutation);
  const newVersion = expectedCartVersion + 1;

  const result = await this.redis.eval(
    CART_MUTATE_SCRIPT,
    2,                                     // Số KEYS
    cartKey,                               // KEYS[1]
    `lock:cart:${tenantId}:${sessionId}`,  // KEYS[2]
    String(expectedCartVersion),           // ARGV[1]
    JSON.stringify(updatedSnapshot),       // ARGV[2]
    String(newVersion),                    // ARGV[3]
    String(ttl)                            // ARGV[4]
  ) as [number, number, string];

  const [success, returnedVersion, snapshotJson] = result;

  if (success === 0) {
    // Version conflict — trả về snapshot hiện tại để client sync
    const currentCart = JSON.parse(snapshotJson) as CartSnapshot;
    throw new CartVersionConflictException(returnedVersion, currentCart);
  }

  return JSON.parse(snapshotJson) as CartSnapshot;
}
```

---

## 12. Cart Service Pattern — Reference Variant

> **Current-code note:** Key inventory hiện tại dùng `cart:{tenantId}:{sessionId}` làm Redis Hash trong Order `CartService`. Thiết kế tách `snapshot`/`meta` dưới đây là reference variant cho hardening hoặc refactor tương lai, không phải shape bắt buộc của code hiện tại.

### Cấu trúc dữ liệu Cart trong Redis

```
cart:{tenantId}:{sessionId}:snapshot   → String (JSON của CartSnapshot)
cart:{tenantId}:{sessionId}:meta       → Hash { version, status, updatedAt }
lock:cart:{tenantId}:{sessionId}       → String (lockValue khi đang bị lock)
```

**Tại sao tách snapshot và meta?**

- `meta` dùng Hash để có thể đọc chỉ `version` mà không phải deserialize toàn bộ snapshot.
- `snapshot` dùng String (JSON) để dễ serialize/deserialize toàn bộ.

### CartSnapshot type

```typescript
export type CartLine = {
  cartLineId: string; // UUID của line này
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  station?: 'KITCHEN' | 'BAR';
  lineVersion: number; // Version của line (để track changes)
};

export type CartSnapshot = {
  tenantId: string;
  sessionId: string;
  cartVersion: number;
  status: 'ACTIVE' | 'LOCKED';
  updatedAt: string; // ISO string
  items: CartLine[];
};
```

### Full CartService implementation

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/providers/redis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import type { CartSnapshot, CartLine } from '@einvoice/types';

@Injectable()
export class CartService {
  private readonly redis: Redis;
  private readonly CART_TTL_SECONDS = 4 * 60 * 60; // 4 giờ

  // Script atomic để check version và mutate
  private readonly MUTATE_SCRIPT = `
    local snapshotKey = KEYS[1]
    local metaKey = KEYS[2]
    local expectedVersion = tonumber(ARGV[1])
    local newSnapshotJson = ARGV[2]
    local newVersion = tonumber(ARGV[3])
    local ttl = tonumber(ARGV[4])
    local updatedAt = ARGV[5]

    local currentVersionStr = redis.call('HGET', metaKey, 'version')
    local currentVersion = tonumber(currentVersionStr) or 0

    if currentVersion ~= expectedVersion then
      local snapshot = redis.call('GET', snapshotKey)
      return {0, currentVersion, snapshot or '{}'}
    end

    redis.call('SET', snapshotKey, newSnapshotJson, 'EX', ttl)
    redis.call('HSET', metaKey, 'version', newVersion, 'updatedAt', updatedAt)
    redis.call('EXPIRE', metaKey, ttl)
    return {1, newVersion, newSnapshotJson}
  `;

  constructor(redisService: RedisService) {
    this.redis = redisService.getClient();
  }

  private snapshotKey(tenantId: string, sessionId: string): string {
    return `cart:${tenantId}:${sessionId}:snapshot`;
  }

  private metaKey(tenantId: string, sessionId: string): string {
    return `cart:${tenantId}:${sessionId}:meta`;
  }

  /** Lấy cart snapshot hiện tại. Trả về empty cart nếu chưa có. */
  async getCart(tenantId: string, sessionId: string): Promise<CartSnapshot> {
    const raw = await this.redis.get(this.snapshotKey(tenantId, sessionId));
    if (!raw) {
      return {
        tenantId,
        sessionId,
        cartVersion: 0,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        items: [],
      };
    }
    return JSON.parse(raw) as CartSnapshot;
  }

  /** Thêm item hoặc tăng quantity nếu đã có */
  async addItem(
    tenantId: string,
    sessionId: string,
    expectedCartVersion: number,
    item: {
      menuItemId: string;
      menuItemName: string;
      unitPrice: number;
      quantity: number;
      note?: string;
      station?: string;
    },
  ): Promise<CartSnapshot> {
    const current = await this.getCart(tenantId, sessionId);

    // Kiểm tra version trước khi apply mutation (để detect conflict nhanh)
    if (current.cartVersion !== expectedCartVersion) {
      throw this.createConflictError(current);
    }

    // Tìm line đã có cùng menuItemId
    const existingLine = current.items.find((l) => l.menuItemId === item.menuItemId);
    let updatedItems: CartLine[];

    if (existingLine) {
      updatedItems = current.items.map((l) =>
        l.menuItemId === item.menuItemId
          ? { ...l, quantity: l.quantity + item.quantity, lineVersion: l.lineVersion + 1 }
          : l,
      );
    } else {
      const newLine: CartLine = {
        cartLineId: uuidv4(),
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        note: item.note,
        station: item.station as any,
        lineVersion: 1,
      };
      updatedItems = [...current.items, newLine];
    }

    const newSnapshot: CartSnapshot = {
      ...current,
      cartVersion: expectedCartVersion + 1,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
    };

    return this.atomicUpdate(tenantId, sessionId, expectedCartVersion, newSnapshot);
  }

  /** Xoá một line khỏi cart */
  async removeLine(
    tenantId: string,
    sessionId: string,
    expectedCartVersion: number,
    cartLineId: string,
  ): Promise<CartSnapshot> {
    const current = await this.getCart(tenantId, sessionId);
    if (current.cartVersion !== expectedCartVersion) {
      throw this.createConflictError(current);
    }

    const updatedItems = current.items.filter((l) => l.cartLineId !== cartLineId);
    const newSnapshot: CartSnapshot = {
      ...current,
      cartVersion: expectedCartVersion + 1,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
    };

    return this.atomicUpdate(tenantId, sessionId, expectedCartVersion, newSnapshot);
  }

  /** Clear toàn bộ cart (khi submit order xong) */
  async clearCart(tenantId: string, sessionId: string, expectedCartVersion: number): Promise<CartSnapshot> {
    const current = await this.getCart(tenantId, sessionId);
    if (current.cartVersion !== expectedCartVersion) {
      throw this.createConflictError(current);
    }

    const newSnapshot: CartSnapshot = {
      ...current,
      cartVersion: expectedCartVersion + 1,
      updatedAt: new Date().toISOString(),
      items: [],
    };

    return this.atomicUpdate(tenantId, sessionId, expectedCartVersion, newSnapshot);
  }

  /** Lock cart khi bill được request — không cho phép thêm items nữa */
  async lockCart(tenantId: string, sessionId: string): Promise<void> {
    const current = await this.getCart(tenantId, sessionId);
    const newSnapshot: CartSnapshot = {
      ...current,
      status: 'LOCKED',
      updatedAt: new Date().toISOString(),
    };
    // Lock không cần version check — đây là admin action
    await this.redis.set(
      this.snapshotKey(tenantId, sessionId),
      JSON.stringify(newSnapshot),
      'EX',
      this.CART_TTL_SECONDS,
    );
  }

  /** Xoá hoàn toàn cart key (khi session kết thúc) */
  async deleteCart(tenantId: string, sessionId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(this.snapshotKey(tenantId, sessionId));
    pipeline.del(this.metaKey(tenantId, sessionId));
    await pipeline.exec();
  }

  /** Atomic update với version check */
  private async atomicUpdate(
    tenantId: string,
    sessionId: string,
    expectedCartVersion: number,
    newSnapshot: CartSnapshot,
  ): Promise<CartSnapshot> {
    const result = (await this.redis.eval(
      this.MUTATE_SCRIPT,
      2,
      this.snapshotKey(tenantId, sessionId),
      this.metaKey(tenantId, sessionId),
      String(expectedCartVersion),
      JSON.stringify(newSnapshot),
      String(newSnapshot.cartVersion),
      String(this.CART_TTL_SECONDS),
      newSnapshot.updatedAt,
    )) as [number, number, string];

    const [success, currentVersion, snapshotJson] = result;

    if (success === 0) {
      const latestCart = JSON.parse(snapshotJson) as CartSnapshot;
      throw this.createConflictError(latestCart);
    }

    return JSON.parse(snapshotJson) as CartSnapshot;
  }

  private createConflictError(currentCart: CartSnapshot) {
    // Throw business exception với snapshot hiện tại để client có thể sync
    return Object.assign(new Error('CART_VERSION_CONFLICT'), {
      code: 'CART_VERSION_CONFLICT',
      currentCart,
    });
  }
}
```

---

## 13. Session Caching Pattern

### Vấn đề

Mỗi request từ customer cần biết session nào đang active trên bàn nào của tenant nào. Nếu mỗi lần query PostgreSQL, hệ thống sẽ chậm và tốn DB connection.

### Giải pháp: Cache-aside Pattern

```
Request đến → kiểm tra Redis cache
  → Có: trả về từ cache (nhanh)
  → Không có: query PostgreSQL → lưu vào Redis → trả về
```

```typescript
@Injectable()
export class SessionService {
  private readonly CACHE_TTL = 30 * 60; // 30 phút

  constructor(
    private readonly redis: Redis,
    private readonly sessionRepository: SessionRepository,
  ) {}

  private cacheKey(tenantId: string, sessionId: string): string {
    return `session:cache:${tenantId}:${sessionId}`;
  }

  async getSession(tenantId: string, sessionId: string): Promise<SessionEntity | null> {
    // 1. Thử lấy từ cache
    const cached = await this.redis.get(this.cacheKey(tenantId, sessionId));
    if (cached) {
      return JSON.parse(cached) as SessionEntity;
    }

    // 2. Cache miss → query DB
    const session = await this.sessionRepository.findOne({ tenantId, sessionId });
    if (!session) return null;

    // 3. Lưu vào cache
    await this.redis.set(this.cacheKey(tenantId, sessionId), JSON.stringify(session), 'EX', this.CACHE_TTL);

    return session;
  }

  /** Khi session thay đổi (e.g. transfer table), invalidate cache */
  async invalidateCache(tenantId: string, sessionId: string): Promise<void> {
    await this.redis.del(this.cacheKey(tenantId, sessionId));
  }

  /** Cập nhật cache sau khi update session */
  async updateCache(session: SessionEntity): Promise<void> {
    await this.redis.set(this.cacheKey(session.tenantId, session.id), JSON.stringify(session), 'EX', this.CACHE_TTL);
  }
}
```

### Cache Stampede — Vấn đề khi cache expire đồng loạt

Khi nhiều request đến cùng lúc và cache vừa expire:

```
Request 1: cache miss → bắt đầu query DB...
Request 2: cache miss → bắt đầu query DB...  (chưa ai set lại cache)
Request 3: cache miss → bắt đầu query DB...
→ N query DB đồng thời (thundering herd)
```

**Giải pháp: Soft TTL + Lock**

```typescript
async getSessionWithSoftExpiry(tenantId: string, sessionId: string): Promise<SessionEntity | null> {
  const key = this.cacheKey(tenantId, sessionId);
  const lockKey = `lock:session:refresh:${tenantId}:${sessionId}`;

  const cached = await this.redis.get(key);
  if (cached) return JSON.parse(cached) as SessionEntity;

  // Cache miss: try to acquire refresh lock
  const lockAcquired = await this.redis.set(lockKey, '1', 'NX', 'PX', 5000);

  if (!lockAcquired) {
    // Ai đó đang refresh, chờ một chút rồi thử lại
    await new Promise(r => setTimeout(r, 100));
    const retry = await this.redis.get(key);
    if (retry) return JSON.parse(retry) as SessionEntity;
  }

  try {
    const session = await this.sessionRepository.findOne({ tenantId, sessionId });
    if (session) {
      await this.redis.set(key, JSON.stringify(session), 'EX', this.CACHE_TTL);
    }
    return session;
  } finally {
    await this.redis.del(lockKey);
  }
}
```

---

## 14. Pub/Sub

### Khái niệm

Redis Pub/Sub cho phép **broadcast message** từ publisher đến tất cả subscriber đang lắng nghe trên cùng một channel.

**Đặc điểm quan trọng:**

- Messages **không được lưu trữ** — nếu subscriber offline khi message được gửi, nó sẽ mất message đó.
- Không có delivery guarantee → phù hợp cho real-time notification, không phù hợp cho critical events (dùng Kafka thay thế).

```bash
# Terminal 1 — Subscriber
SUBSCRIBE channel1 channel2
# Lắng nghe messages

# Terminal 2 — Publisher
PUBLISH channel1 "hello world"
# Terminal 1 nhận: 1) "message" 2) "channel1" 3) "hello world"
```

### ioredis — Pub/Sub

```typescript
import Redis from 'ioredis';

// QUAN TRỌNG: Phải dùng connection riêng cho subscriber
// Khi một connection đang SUBSCRIBE, nó không thể dùng cho lệnh thường
const publisher = new Redis({ host: 'localhost', port: 6379 });
const subscriber = new Redis({ host: 'localhost', port: 6379 });

// Subscribe
await subscriber.subscribe('cart.updated', 'order.confirmed');

subscriber.on('message', (channel, message) => {
  console.log(`[${channel}]:`, JSON.parse(message));
});

// Pattern subscribe (wildcard)
await subscriber.psubscribe('cart.*');
subscriber.on('pmessage', (pattern, channel, message) => {
  console.log(`Pattern: ${pattern}, Channel: ${channel}`);
});

// Publish
await publisher.publish(
  'cart.updated',
  JSON.stringify({
    tenantId: 'tenant1',
    sessionId: 'sess1',
    cartVersion: 5,
  }),
);

// Unsubscribe
await subscriber.unsubscribe('cart.updated');
await subscriber.punsubscribe('cart.*');
```

### Trong dự án này

Pub/Sub của Redis chủ yếu dùng cho **Socket.IO Redis Adapter** (deferred trong Step 2.4 nhưng cần hiểu):

```
[Order Service] → redis.publish('socket.io#tenant1#...', event)
[BFF Instance 1] ← nhận event → emit đến connected client
[BFF Instance 2] ← nhận event → emit đến connected client
```

Khi chưa có Redis Adapter (Step 2.4), BFF emit trực tiếp từ TCP response — không dùng Pub/Sub.

---

## 15. NestJS Integration

### RedisModule — Global Provider

```typescript
// libs/providers/redis/src/lib/redis.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const options: RedisOptions = {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: Number(process.env['REDIS_PORT'] || 6379),
      password: process.env['REDIS_PASSWORD'] || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    this.client = new Redis(options);

    this.client.on('connect', () => this.logger.log('Redis connecting...'));
    this.client.on('ready', () => this.logger.log('Redis ready'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting...'));
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection...');
    await this.client.quit();
  }
}
```

```typescript
// libs/providers/redis/src/lib/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Global: inject vào bất kỳ module nào mà không cần import lại
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

### Inject RedisService vào service

```typescript
// apps/order/src/app/modules/order/services/cart.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/providers/redis';
import Redis from 'ioredis';

@Injectable()
export class CartService {
  private readonly redis: Redis;

  constructor(private readonly redisService: RedisService) {
    this.redis = redisService.getClient();
  }

  // ...methods
}
```

### Đăng ký RedisModule trong AppModule

```typescript
// apps/order/src/app/app.module.ts
import { Module } from '@nestjs/common';
import { RedisModule } from '@common/providers/redis';

@Module({
  imports: [
    RedisModule, // @Global() nên chỉ cần import một lần ở root
    OrderModule,
  ],
})
export class AppModule {}
```

### Health check cho Redis

```typescript
// Trong health check module
import { Injectable } from '@nestjs/common';
import { RedisService } from '@common/providers/redis';

@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly redisService: RedisService) {}

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redisService.getClient().ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
```

---

## 16. Redis CLI — Debug & Inspect

### Kết nối vào Redis CLI

```bash
# Trong Docker
docker exec -it <redis_container_name> redis-cli

# Kết nối remote
redis-cli -h localhost -p 6379

# Với password
redis-cli -h localhost -p 6379 -a yourpassword

# Kết nối và chạy command một lần
redis-cli GET mykey
redis-cli -n 1 GET mykey   # Database 1
```

### Các lệnh debug hữu ích

```bash
# Xem tất cả key (KHÔNG dùng trong production)
KEYS *
KEYS cart:*
KEYS cart:tenant1:*

# Production-safe scan
SCAN 0 MATCH cart:* COUNT 100

# Xem loại của key
TYPE cart:tenant1:sess1:snapshot   # string
TYPE cart:tenant1:sess1:meta       # hash

# Xem TTL
TTL cart:tenant1:sess1:snapshot    # giây còn lại
PTTL cart:tenant1:sess1:snapshot   # ms còn lại

# Monitor tất cả commands real-time (NGUY HIỂM trong production vì overhead lớn)
MONITOR

# Xem thông tin server
INFO
INFO memory
INFO keyspace    # Thống kê số key theo database
INFO clients     # Số connection hiện tại

# Flush toàn bộ database hiện tại (NGUY HIỂM)
FLUSHDB

# Flush tất cả database (RẤT NGUY HIỂM)
FLUSHALL

# Debug một key cụ thể
DEBUG OBJECT mykey   # Encoding, serialized length, ...

# Xem memory của một key
MEMORY USAGE mykey   # Bytes

# Xem encoding nội tại
OBJECT ENCODING mykey
```

### Theo dõi một key trong terminal

```bash
# Lặp lại mỗi giây
watch -n 1 'redis-cli GET cart:tenant1:sess1:snapshot | python3 -m json.tool'

# Theo dõi TTL
watch -n 1 'redis-cli TTL cart:tenant1:sess1:snapshot'
```

### Slow log — Tìm lệnh chậm

```bash
# Cấu hình: log lệnh > 1ms
CONFIG SET slowlog-log-slower-than 1000   # microseconds

# Xem 10 lệnh chậm nhất
SLOWLOG GET 10

# Reset slow log
SLOWLOG RESET
```

---

## 17. Lỗi thường gặp & Cách xử lý

### ECONNREFUSED

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Nguyên nhân:** Redis chưa chạy hoặc sai host/port.

**Cách xử lý:**

```bash
# Kiểm tra Redis có chạy không
docker ps | grep redis
redis-cli ping   # Phải trả về PONG

# Kiểm tra env
echo $REDIS_HOST
echo $REDIS_PORT
```

---

### WRONGTYPE Operation

```
ReplyError: WRONGTYPE Operation against a key holding the wrong kind of value
```

**Nguyên nhân:** Dùng lệnh của một type lên key của type khác (vd: dùng `HGET` lên key đang là String).

```typescript
// Sai: key là String nhưng dùng HGET
await redis.set('user:1', 'Alice');
await redis.hget('user:1', 'name'); // WRONGTYPE error!

// Đúng: dùng đúng type
await redis.get('user:1');
```

**Debug:** Dùng `TYPE key` để xem loại thực sự.

---

### Race Condition khi không dùng atomic operation

```typescript
// SAI — không atomic
const current = await redis.get('counter'); // "5"
const next = parseInt(current!) + 1; // 6
// ... người khác cũng đọc "5" và tính được 6...
await redis.set('counter', next); // Cả hai đều set "6" thay vì "7"

// ĐÚNG — atomic
const next = await redis.incr('counter'); // Atomic, guaranteed correct
```

---

### Quên TTL → Memory leak

```typescript
// SAI — không có TTL
await redis.set('lock:resource', lockValue); // Sẽ tồn tại mãi mãi!

// ĐÚNG — luôn có TTL cho lock
await redis.set('lock:resource', lockValue, 'NX', 'PX', 5000);
```

---

### Không release lock khi có exception

```typescript
// SAI — exception có thể khiến lock không được release
const lockValue = await acquireLock(lockKey);
await doSomething(); // Nếu throw exception...
await releaseLock(lockKey, lockValue); // Không bao giờ chạy!

// ĐÚNG — luôn dùng try/finally
const lockValue = await acquireLock(lockKey);
try {
  await doSomething();
} finally {
  await releaseLock(lockKey, lockValue); // Luôn chạy dù có exception
}
```

---

### Dùng JSON.parse mà không kiểm tra null

```typescript
// SAI — crash khi key không tồn tại
const raw = await redis.get('cart:tenant1:sess1:snapshot');
const cart = JSON.parse(raw); // TypeError: Cannot read null!

// ĐÚNG
const raw = await redis.get('cart:tenant1:sess1:snapshot');
const cart = raw ? JSON.parse(raw) : null;
// hoặc
if (!raw) return defaultValue;
const cart = JSON.parse(raw);
```

---

### Blocking operation trong connection đang SUBSCRIBE

```typescript
// SAI — dùng chung connection cho sub và command thường
const redis = new Redis();
await redis.subscribe('channel');

// Không thể dùng GET/SET/... trên connection đang subscribe!
await redis.get('key'); // Error hoặc timeout!

// ĐÚNG — tách connection
const subscriber = new Redis();
const redis = new Redis(); // Connection riêng cho commands thường

await subscriber.subscribe('channel');
subscriber.on('message', handler);

await redis.get('key'); // OK, connection riêng
```

---

### Dùng KEYS trong production

```bash
# SAI — KEYS block Redis, nguy hiểm khi có hàng triệu key
KEYS cart:*

# ĐÚNG — SCAN không block
SCAN 0 MATCH cart:* COUNT 100
```

```typescript
// ĐÚNG trong code
async function findCartKeys(redis: Redis, tenantId: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = '0';
  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', `cart:${tenantId}:*`, 'COUNT', 100);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}
```

---

## Tổng kết: Checklist khi làm việc với Redis

**Khi thiết kế key:**

- [ ] Có namespace đủ rõ ràng không? (`cart:{tenantId}:{sessionId}`)
- [ ] Có TTL chưa? (Tất cả temporary data phải có TTL)
- [ ] Key có quá dài không? (> 200 bytes là dấu hiệu vấn đề)

**Khi ghi/đọc data:**

- [ ] Luôn handle `null` khi `redis.get()` (key có thể không tồn tại)
- [ ] Luôn `JSON.parse` sau khi `GET`, `JSON.stringify` trước khi `SET`
- [ ] Dùng Pipeline khi cần thực hiện nhiều lệnh độc lập cùng lúc

**Khi cần atomic operation:**

- [ ] Single command (SET, INCR, ...): tự atomic — không cần thêm gì
- [ ] Read-check-write có nguy cơ cạnh tranh cao: ưu tiên Lua script/WATCH/lock; nếu dùng app-level check như current `CartService` thì phải có conflict response và tests rõ ràng
- [ ] Nhóm lệnh cần atomic + không có logic phức tạp: dùng MULTI/EXEC
- [ ] Cần lock: dùng `SET NX PX` + Lua release

**Khi dùng Distributed Lock:**

- [ ] lockValue phải unique (UUID)
- [ ] Luôn có TTL hợp lý (đủ cho operation nhưng không quá dài)
- [ ] Luôn dùng `try/finally` để release lock
- [ ] Release bằng Lua script (check owner trước khi DEL)

**Khi debug:**

- [ ] Dùng `TYPE key` để xác nhận type
- [ ] Dùng `TTL key` để xem còn bao lâu
- [ ] Dùng `SCAN` thay vì `KEYS` trong production
- [ ] Dùng `MONITOR` để xem lệnh real-time (chỉ trong dev)
