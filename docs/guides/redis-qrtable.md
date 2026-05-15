# Hướng Dẫn Redis Trong QRTable

> **Vai trò:** Tài liệu hỗ trợ (supporting guide), không phải nguồn sự thật chính (canonical source).
> Hiện trạng Redis đã triển khai được theo dõi ở [`../redis-usage-analysis.md`](../redis-usage-analysis.md), [`../technical-architecture.md`](../technical-architecture.md), và code trên `main`.
>
> **Mục tiêu:** Giải thích Redis vừa đủ để đọc code, gỡ lỗi local (debug local), và mở rộng đúng phạm vi QRTable. Tài liệu này không còn là giáo trình Redis tổng quát.
>
> **Ghi chú triển khai hiện tại (2026-05-14):** QRTable dùng Redis cho bộ nhớ đệm (cache), trạng thái tạm thời (temporary state), khóa phân tán (lock), bộ đếm hạn mức (quota counter), trạng thái runtime của KDS, Socket.io adapter, Redis Pub/Sub nội bộ, flag tenant suspended, subscription cache và SePay OAuth state. Order cart/session dùng Redis Hash `cart:{tenantId}:{sessionId}` / `session:{tenantId}:{sessionId}` với `cartVersion` check trong code; Lua script là phương án tăng cứng (hardening option), không phải implementation hiện tại.

---

## Mục Lục

1. [Đọc nhanh](#1-đọc-nhanh)
2. [Redis đang dùng ở đâu](#2-redis-đang-dùng-ở-đâu)
3. [Nguyên tắc lựa chọn Redis](#3-nguyên-tắc-lựa-chọn-redis)
4. [Danh sách key hiện tại](#4-danh-sách-key-hiện-tại)
5. [Lý thuyết vừa đủ](#5-lý-thuyết-vừa-đủ)
6. [Các luồng chính](#6-các-luồng-chính)
7. [Quy tắc triển khai](#7-quy-tắc-triển-khai)
8. [Hướng dẫn cấu hình, triển khai và conflict Redis](#8-hướng-dẫn-cấu-hình-triển-khai-và-conflict-redis)
9. [Gỡ lỗi local](#9-gỡ-lỗi-local)
10. [Đọc code ở đâu](#10-đọc-code-ở-đâu)
11. [Checklist](#11-checklist)

---

## 1. Đọc nhanh

Redis trong QRTable là nơi lưu dữ liệu nhanh, ngắn hạn hoặc có thể dựng lại. PostgreSQL vẫn là nguồn sự thật bền vững (source of truth) cho tenant, menu, order, bill, payment và các dữ liệu cần audit.

Một câu dễ nhớ:

```txt
PostgreSQL giữ sự thật bền vững.
Redis giữ trạng thái nhanh, tạm thời, hoặc trạng thái runtime cần phản hồi rất nhanh.
```

### Thuật ngữ tối thiểu

| Thuật ngữ                                       | Nghĩa trong QRTable                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Redis                                           | Kho dữ liệu trong RAM (in-memory data store), dùng cho cache/state nhanh.                                        |
| Key (khóa)                                      | Tên truy cập dữ liệu, ví dụ `cart:{tenantId}:{sessionId}`.                                                       |
| Value (giá trị)                                 | Nội dung lưu trong key. Có thể là string, hash, set, sorted set.                                                 |
| TTL / Time To Live (thời gian sống)             | Thời gian key còn tồn tại trước khi Redis tự xóa.                                                                |
| Cache (bộ nhớ đệm)                              | Bản sao nhanh của dữ liệu nguồn, ví dụ menu public.                                                              |
| Hash (bảng field-value)                         | Kiểu dữ liệu Redis lưu nhiều field trong một key; QRTable dùng cho cart/session.                                 |
| String (chuỗi)                                  | Kiểu dữ liệu đơn giản; dùng cho flag, OAuth state, counter.                                                      |
| Sorted Set / ZSet (tập có điểm sắp xếp)         | Dùng khi cần queue theo điểm/thời gian, ví dụ SLA due trong KDS.                                                 |
| Pub/Sub (phát/nhận nội bộ)                      | Redis channel để service phát tín hiệu nhanh trong runtime.                                                      |
| Distributed lock (khóa phân tán)                | Key tạm thời để tránh hai process cùng xử lý một việc.                                                           |
| Pipeline / MULTI (gom lệnh / transaction Redis) | Gửi nhiều lệnh Redis cùng lúc; `MULTI` giúp một nhóm lệnh chạy liền nhau.                                        |
| Lua script (script Lua)                         | Cách chạy logic nguyên tử (atomic) trong Redis; hiện chỉ xem là phương án tăng cứng (hardening option) cho cart. |

---

## 2. Redis đang dùng ở đâu

| Service   | Vai trò Redis hiện tại                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BFF       | Cache JWT verification, anonymous customer session, public menu, throttling, Socket.io Redis adapter, KDS internal fan-out, đọc tenant suspend flag qua cache layer. |
| Order     | Active session cache, shared cart, transfer locks, daily order quota counter.                                                                                        |
| Kitchen   | Runtime store của KDS, ticket queues, SLA due set, dedupe keys, internal `realtime:kds:*` Pub/Sub.                                                                   |
| SaaS      | Tenant suspend flag và current subscription cache.                                                                                                                   |
| Payment   | SePay OAuth state cache để chống CSRF và bind tenant/user trong callback.                                                                                            |
| Dev tools | Flush/verify Redis local khi reset dữ liệu dev.                                                                                                                      |

Redis chưa phải nơi lưu bền vững cho:

- Menu canonical.
- Order/bill/payment canonical.
- Tenant/subscription canonical.
- Audit/history dài hạn.

---

## 3. Nguyên tắc lựa chọn Redis

Redis không chỉ là "database nhanh hơn". Redis là lựa chọn kiến trúc cho dữ liệu cần phản hồi nhanh, có thể hết hạn, có thể dựng lại, hoặc cần chia sẻ giữa nhiều process. Nếu dữ liệu không thể mất, cần audit, cần transaction quan hệ, hoặc cần query phức tạp, PostgreSQL vẫn là lựa chọn chính.

### 3.1 Khi nên dùng Redis

| Tín hiệu                   | Ý nghĩa                                                           | Ví dụ trong QRTable                                                        |
| -------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cần đọc/ghi rất nhanh      | Request cần phản hồi nhanh và dữ liệu có shape nhỏ/gọn.           | Public menu cache `menu:{tenantId}`, JWT verification cache.               |
| Dữ liệu có vòng đời ngắn   | Dữ liệu chỉ hợp lệ trong vài phút/giờ và nên tự hết hạn bằng TTL. | BFF session, Order session/cart, OAuth state.                              |
| Có thể dựng lại khi mất    | Redis restart hoặc key hết hạn không làm mất sự thật bền vững.    | Order session cache rehydrate từ PostgreSQL; KDS rebuild từ active orders. |
| Cần phối hợp nhiều process | Nhiều instance cần cùng nhìn thấy lock/counter/state.             | Transfer table lock, quota counter, Socket.io Redis Adapter.               |
| Cần runtime projection     | Dữ liệu phục vụ vận hành realtime, tối ưu cho màn hình hiện tại.  | KDS queue/ticket state trong Redis.                                        |
| Chỉ cần tín hiệu nhanh     | Message có thể mất, client vẫn refetch được snapshot.             | `realtime:kds:{tenantId}` Pub/Sub từ Kitchen sang BFF.                     |

### 3.2 Khi không nên dùng Redis

| Tín hiệu                                          | Lý do                                                                       | Lựa chọn đúng hơn                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Cần lưu bền vững, audit, báo cáo                  | Redis có thể mất key do TTL/restart/flush; không phù hợp làm lịch sử chính. | PostgreSQL.                                                                   |
| Cần ràng buộc quan hệ phức tạp                    | Redis không thay thế foreign key, unique constraint, transaction SQL.       | PostgreSQL.                                                                   |
| Cần đọc lại event bền vững (durable event replay) | Redis Pub/Sub không lưu message cho consumer đọc lại.                       | Kafka/outbox.                                                                 |
| Chỉ một process cần cache nhỏ                     | Redis có thể là overkill nếu không cần chia sẻ giữa instance.               | In-memory cache có TTL, nếu chấp nhận mất khi restart.                        |
| Dữ liệu nhạy cảm dài hạn                          | Redis không phải kho secret/token dài hạn.                                  | DB có encryption/secret store; Redis chỉ dùng state ngắn hạn như OAuth state. |
| Không có invalidation rõ ràng                     | Cache dễ stale và gây hiểu sai nghiệp vụ.                                   | Đọc trực tiếp source service/DB cho tới khi có contract invalidation.         |

### 3.3 Câu hỏi quyết định

```txt
1. Dữ liệu này có phải nguồn sự thật bền vững không?
   Có  -> PostgreSQL hoặc service owner DB.
   Không -> xét Redis.

2. Nếu Redis mất key, hệ thống có rebuild/refetch được không?
   Có  -> Redis phù hợp.
   Không -> không lưu duy nhất ở Redis.

3. Dữ liệu có cần tự hết hạn không?
   Có  -> Redis + TTL phù hợp.

4. Có nhiều instance/service cần nhìn cùng state nhanh không?
   Có  -> Redis phù hợp hơn in-memory cache.

5. Đây là event cần replay/durable delivery không?
   Có  -> Kafka/outbox, không dùng Redis Pub/Sub.
```

### 3.4 Redis khác PostgreSQL, Kafka và bộ nhớ local thế nào

| Công cụ                     | Dùng tốt cho                                                                                                       | Không dùng cho                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| PostgreSQL                  | Source of truth, transaction, quan hệ dữ liệu, audit/report.                                                       | Dữ liệu realtime ngắn hạn cần update rất nhanh từng request.                |
| Redis                       | Cache, state có TTL, lock, counter, queue/projection runtime, tín hiệu Pub/Sub (Pub/Sub hint).                     | Lịch sử bền vững (durable history), replay event, quan hệ dữ liệu phức tạp. |
| Kafka                       | Sự kiện nghiệp vụ bền vững (durable domain event), fan-out, consumer replay, xử lý bất đồng bộ (async processing). | Cache nhanh, lock, session/cart state, Pub/Sub hint không cần durable.      |
| Bộ nhớ local (local memory) | Cache rất nhỏ, chỉ cần trong một process, không quan trọng khi restart.                                            | Multi-instance consistency, session chung, lock/counter shared.             |

### 3.5 Mapping theo nhóm Redis trong QRTable

| Nhóm                            | Redis giữ gì                                                                         | Source of truth / fallback                                         | Cảnh báo                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Cache-aside                     | `menu:{tenantId}`, JWT verify result, subscription snapshot.                         | Catalog/Authorizer/SaaS hoặc DB owner.                             | Phải có TTL/invalidation; cache stale phải được chấp nhận trong giới hạn. |
| Runtime state                   | `cart:{tenantId}:{sessionId}`, `session:{tenantId}:{sessionId}`, `kds:{tenantId}:*`. | Order DB cho session/order; KDS có rebuild từ Order active orders. | Redis mất state phải có đường refetch/rebuild.                            |
| Coordination                    | Transfer locks, quota counters, KDS rebuild lock.                                    | DB/service command là nơi quyết định nghiệp vụ cuối.               | Lock phải có TTL và release an toàn.                                      |
| Tín hiệu Pub/Sub (Pub/Sub hint) | `realtime:kds:{tenantId}`, Socket.io Redis Adapter.                                  | REST snapshot và trạng thái của service owner.                     | Message có thể mất; client phải refetch.                                  |
| Security short-lived state      | `oauth_state:{state}`.                                                               | OAuth flow + callback validation.                                  | TTL ngắn, one-time consume, không lưu token dài hạn.                      |
| Edge enforcement                | `tenant:{tenantId}:suspended`.                                                       | SaaS tenant status trong DB.                                       | Guard policy phải rõ khi Redis/SaaS unavailable.                          |

### 3.6 Chi phí khi chọn Redis

Redis làm hệ thống nhanh hơn nhưng thêm trách nhiệm:

- Phải đặt tên key nhất quán và luôn scope theo `tenantId`.
- Phải định nghĩa TTL hoặc lý do không có TTL.
- Phải xử lý cache miss, wrong type, stale cache và Redis unavailable.
- Phải biết service nào là owner của key.
- Phải có test cho conflict/duplicate/expired key nếu flow quan trọng.

---

## 4. Danh sách key hiện tại

| Key pattern                                             | Owner                | Type                 | TTL         | Trạng thái      | Mục đích                                                                            |
| ------------------------------------------------------- | -------------------- | -------------------- | ----------- | --------------- | ----------------------------------------------------------------------------------- |
| `user-token:{sha256(jwt)}`                              | BFF                  | Cache object/string  | 30m         | Đã triển khai   | Cache kết quả Authorizer verification.                                              |
| `bff-session:{tenantId}:{sessionId}`                    | BFF                  | Cache object/string  | 2h          | Đã triển khai   | Anonymous customer session ở edge.                                                  |
| `bff-session:{sessionId}`                               | BFF                  | Cache object/string  | 2h          | Legacy fallback | Hỗ trợ lookup session thiếu tenant.                                                 |
| `menu:{tenantId}`                                       | BFF                  | Cache object/string  | 10m         | Đã triển khai   | Cache public menu cho Customer PWA.                                                 |
| Throttler internal keys                                 | BFF                  | Library-owned        | 60s         | Đã triển khai   | Global HTTP rate limiting.                                                          |
| `socket.io-adapter:*`                                   | BFF                  | Pub/Sub internal     | n/a         | Đã triển khai   | Scale WebSocket nhiều instance.                                                     |
| `session:{tenantId}:{sessionId}`                        | Order                | Hash                 | 2h          | Đã triển khai   | Active session cache của Order domain.                                              |
| `cart:{tenantId}:{sessionId}`                           | Order                | Hash                 | 2h          | Đã triển khai   | Shared cart draft state.                                                            |
| `transfer:{tenantId}:{sessionId}`                       | Order                | String lock          | 30s         | Đã triển khai   | Lock chuyển bàn theo session.                                                       |
| `table-transfer:{tenantId}:{tableId}`                   | Order                | String lock          | 30s         | Đã triển khai   | Lock bàn nguồn/đích khi chuyển bàn.                                                 |
| `quota:{tenantId}:orders:{date}`                        | Order                | String counter       | 48h         | Đã triển khai   | Daily order quota counter.                                                          |
| `kds:{tenantId}:*`                                      | Kitchen              | Hash/Set/ZSet/String | Tùy key     | Đã triển khai   | KDS ticket, queue, SLA, dedupe.                                                     |
| `lock:kds:rebuild:{tenantId}`                           | Kitchen              | String lock          | Short TTL   | Đã triển khai   | Rebuild lock cho KDS recovery.                                                      |
| `realtime:kds:{tenantId}`                               | Kitchen/BFF          | Pub/Sub channel      | n/a         | Đã triển khai   | Internal KDS fan-out.                                                               |
| `tenant:{tenantId}:suspended`                           | SaaS/BFF guard       | String flag          | No expire   | Đã triển khai   | Chặn tenant suspended nhanh ở edge.                                                 |
| `subscription:{tenantId}`                               | SaaS                 | String JSON          | 5m          | Đã triển khai   | Cache current subscription.                                                         |
| `oauth_state:{state}`                                   | Payment              | String JSON          | 5m          | Đã triển khai   | SePay OAuth state one-time consume.                                                 |
| `table:{tenantId}:{tableId}:status`                     | BFF/Catalog boundary | String               | n/a         | Dự kiến         | Cache trạng thái bàn nếu cần tối ưu.                                                |
| `idempotency:order-submit:{tenantId}:{sessionId}:{key}` | Order                | String               | Planned TTL | Dự kiến         | Tăng cứng duplicate submit ở Redis; hiện order submit dựa PostgreSQL unique/replay. |

Nếu key không có trong bảng này, đừng mặc định xem nó là triển khai hiện tại (current implementation). Kiểm tra code hoặc [`../redis-usage-analysis.md`](../redis-usage-analysis.md) trước.

---

## 5. Lý thuyết vừa đủ

### 5.1 Redis primitives trong guide này

Guide này chỉ giải thích những primitive (khả năng cơ bản) Redis đang dùng hoặc có thể cần rất gần trong QRTable:

- `String`: flag, OAuth state, counter.
- `Hash`: cart/session snapshot nhỏ.
- `Sorted Set`: queue theo điểm/thời gian, ví dụ SLA due.
- `Pub/Sub`: tín hiệu runtime không durable.
- `SET NX PX`: lock ngắn hạn.
- `MULTI/EXEC`: nhóm lệnh Redis cần chạy liền nhau.

### 5.2 Quy tắc đặt tên key

Quy tắc QRTable:

```txt
{domain}:{tenantId}:{resourceId}
```

Ví dụ:

```txt
cart:{tenantId}:{sessionId}
session:{tenantId}:{sessionId}
tenant:{tenantId}:suspended
subscription:{tenantId}
kds:{tenantId}:ticket:{ticketId}
```

Luôn đưa `tenantId` vào key khi dữ liệu thuộc tenant. Không dùng key global cho dữ liệu tenant.

### 5.3 TTL

TTL (thời gian sống) giúp Redis tự dọn dữ liệu tạm.

Dữ liệu nên có TTL:

- Customer/BFF session tạm.
- Cart/session active.
- Transfer lock.
- OAuth state.
- Quota counter theo ngày.
- Cache menu/subscription.

Dữ liệu có thể không có TTL khi đó là flag runtime cần giữ tới khi service xóa rõ ràng, ví dụ `tenant:{tenantId}:suspended`.

### 5.4 Hash

Hash (bảng field-value) phù hợp khi một key có nhiều field nhỏ.

Order cart hiện lưu kiểu:

```txt
cart:{tenantId}:{sessionId}
  tenantId
  sessionId
  cartVersion
  status
  updatedAt
  items
```

Lý do:

- Đọc/ghi một key theo session.
- Dễ refresh TTL.
- `cartVersion` giúp phát hiện conflict (xung đột phiên bản).

### 5.5 String

String (chuỗi) dùng cho dữ liệu đơn giản:

```txt
tenant:{tenantId}:suspended = "1"
oauth_state:{state} = JSON string
quota:{tenantId}:orders:{date} = number string
```

### 5.6 Sorted Set

Sorted Set / ZSet (tập có điểm sắp xếp) dùng khi cần sắp theo điểm hoặc thời gian.

Kitchen dùng cho hàng đợi SLA tới hạn (SLA due queue), nơi điểm số (score) thường là timestamp. Worker scan các item tới hạn để phát `kitchen.sla_warning`.

### 5.7 Pub/Sub

Pub/Sub (phát/nhận nội bộ) là tín hiệu runtime nhanh, không bền vững như Kafka.

QRTable dùng:

```txt
Kitchen ghi Redis KDS
  -> publish realtime:kds:{tenantId}
  -> BFF subscriber nhận
  -> BFF emit WebSocket hint
```

Nếu BFF đang down đúng lúc publish, message Pub/Sub có thể mất. Vì vậy frontend phải refetch snapshot, không dựa Pub/Sub như nguồn sự thật (source of truth).

### 5.8 Lock

Distributed lock (khóa phân tán) dùng để tránh hai request cùng xử lý một tài nguyên.

Pattern đủ dùng:

```txt
SET lockKey lockValue NX PX ttlMs
```

Khi release, chỉ xóa lock nếu `lockValue` vẫn là của mình. Lua script có thể dùng để kiểm tra và xóa nguyên tử (check-and-delete atomic).

QRTable dùng lock cho chuyển bàn và KDS rebuild. Không nên lock quá lâu; lock phải có TTL.

### 5.9 Pipeline, MULTI và Lua

| Cơ chế                         | Khi dùng                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline (gom lệnh)            | Gửi nhiều lệnh độc lập để giảm lượt đi-về mạng (round trip).                                                                                        |
| MULTI/EXEC (transaction Redis) | Nhóm lệnh cần chạy liền nhau. Order cart hiện dùng multi `hset` + `pexpire`.                                                                        |
| Lua script (script Lua)        | Khi cần đọc-kiểm tra-ghi nguyên tử (read-check-write atomic) phức tạp. Hiện không bắt buộc cho cart, chỉ là phương án tăng cứng (hardening option). |

Không thêm Lua nếu kiểm tra ở tầng ứng dụng (app-level check) + tests đã đủ cho rủi ro hiện tại. Lua làm logic khó đọc và khó debug hơn.

---

## 6. Các luồng chính

### 6.1 Customer session và cart

```txt
Customer quét QR
  -> BFF/Order resolve active session
  -> Order cache session:{tenantId}:{sessionId}
  -> Customer mutate cart
  -> Order đọc cart:{tenantId}:{sessionId}
  -> check cartVersion
  -> ghi cart hash + refresh TTL
  -> BFF emit cart/order realtime hint nếu cần
```

Điểm quan trọng:

- `cartVersion` là khóa lạc quan (optimistic locking) ở tầng ứng dụng.
- Nếu client gửi `expectedCartVersion` cũ, Order trả conflict.
- Redis cart là draft state; order/bill sau khi submit/confirm vẫn nằm ở PostgreSQL.

### 6.2 Public menu cache

```txt
Customer mở menu
  -> BFF thử đọc menu:{tenantId}
  -> cache miss (không có cache) thì gọi Catalog
  -> BFF ghi menu:{tenantId} TTL 10m

Admin đổi menu/category/menu item
  -> BFF/Catalog write path thành công
  -> DEL menu:{tenantId}
  -> client refetch lần sau lấy dữ liệu mới
```

Không có Kafka/WS `menu.updated` contract hiện tại.

### 6.3 KDS runtime

```txt
Kitchen consume order.confirmed
  -> tạo KDS ticket trong Redis kds:{tenantId}:*
  -> ghi dedupe key để chống duplicate Kafka event
  -> publish realtime:kds:{tenantId}
  -> BFF emit events.kdsQueueChanged
  -> KDS client refetch queue snapshot
```

KDS state ở Redis là runtime state phục vụ bếp/bar. Consumer phải chống duplicate vì Kafka có kiểu giao ít nhất một lần (at-least-once delivery).

### 6.4 Payment completed và cleanup

```txt
Payment completed
  -> Order mark bill/session/table paid
  -> Order cleanup active Redis session/cart keys khi session đóng
```

Redis không phải nơi quyết định bill paid. PostgreSQL + Order finalization là nguồn chính.

### 6.5 Tenant suspend và subscription cache

```txt
SaaS suspend tenant
  -> SET tenant:{tenantId}:suspended = "1"
  -> BFF guard đọc flag để chặn nhanh customer mutation

SaaS activate/close tenant
  -> DEL tenant:{tenantId}:suspended

Subscription change
  -> update DB
  -> set/delete subscription:{tenantId}
```

Flag Redis là cơ chế chặn nhanh ở rìa (edge enforcement). Khi Redis/SaaS không sẵn sàng, guard policy phải rõ fail-open/fail-closed theo loại request.

### 6.6 SePay OAuth state

```txt
Owner starts SePay OAuth
  -> Payment tạo random state
  -> SET oauth_state:{state} JSON EX 300
  -> redirect sang SePay

SePay callback
  -> Payment đọc oauth_state:{state}
  -> validate tenant/user/CSRF
  -> consume/delete state
```

OAuth state phải TTL ngắn và chỉ dùng một lần.

---

## 7. Quy tắc triển khai

### 7.1 Redis key phải có owner rõ ràng

Mỗi key pattern phải có service owner. Service khác không tự ý ghi key nếu không có contract.

Ví dụ:

- `menu:{tenantId}` do BFF cache layer sở hữu.
- `cart:{tenantId}:{sessionId}` do Order sở hữu.
- `kds:{tenantId}:*` do Kitchen sở hữu.
- `tenant:{tenantId}:suspended` do SaaS ghi, BFF đọc.

### 7.2 Luôn handle cache miss

Redis key có thể không tồn tại vì:

- TTL hết hạn.
- Redis restart.
- Dev reset.
- Key bị cleanup.

Code đọc Redis phải có fallback hợp lý: đọc PostgreSQL, gọi service owner, hoặc trả lỗi rõ ràng nếu state bắt buộc không thể dựng lại.

### 7.3 Không dùng `KEYS` trong code production

`KEYS pattern` có thể block Redis nếu dữ liệu lớn. Dùng `SCAN` khi cần duyệt key.

Trong local debug nhỏ có thể dùng `KEYS`, nhưng không đưa vào service runtime.

### 7.4 Lock phải có TTL và owner value

Lock đúng cần:

- Key rõ tài nguyên bị lock.
- Value unique, ví dụ request id/UUID.
- TTL ngắn.
- Release an toàn, không xóa lock của request khác.

### 7.5 Không biến Redis thành database thứ hai

Nếu dữ liệu cần join, audit, report, hoặc giữ lâu dài, đưa vào PostgreSQL. Redis chỉ giữ bản nhanh/tạm hoặc projection runtime.

### 7.6 Thay đổi Redis contract phải cập nhật docs

Khi thêm key mới hoặc đổi owner/TTL:

- Cập nhật [`../redis-usage-analysis.md`](../redis-usage-analysis.md).
- Cập nhật [`../technical-architecture.md`](../technical-architecture.md) nếu ảnh hưởng kiến trúc.
- Cập nhật phase/spec nếu là business contract.

---

## 8. Hướng dẫn cấu hình, triển khai và conflict Redis

Phần này giúp hiểu Redis đang chạy thế nào trong QRTable, vì sao các thông số cấu hình ảnh hưởng đến code, và cách xử lý các conflict thường gặp khi dùng Redis làm cache/state runtime.

### 8.1 Cấu hình local hiện tại

Redis local nằm trong `docker-compose.provider.yaml`:

```txt
redis:
  image: redis
  ports:
    - "6379:6379"
  healthcheck:
    redis-cli ping
  volumes:
    - ./docker/docker_data/redis_data:/data
```

Ý nghĩa:

| Thông số                     | Nghĩa                                          | QRTable local/dev                                        |
| ---------------------------- | ---------------------------------------------- | -------------------------------------------------------- |
| `image: redis`               | Dùng image Redis mặc định.                     | Chưa pin version rõ trong compose hiện tại.              |
| `6379:6379`                  | Map port Redis ra host.                        | App local dùng `localhost:6379`.                         |
| Volume `/data`               | Nơi Redis có thể lưu file persistence nếu bật. | Có mount volume, nhưng compose chưa cấu hình rõ RDB/AOF. |
| Healthcheck `redis-cli ping` | Kiểm tra Redis trả `PONG`.                     | Dùng để Docker biết service sẵn sàng.                    |
| Không password/TLS           | Redis local mở đơn giản.                       | Chỉ phù hợp local/dev, không public.                     |

Biến môi trường app:

```txt
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=1800000
```

Trong `RedisConfiguration`, `REDIS_TTL` là TTL mặc định cho `CacheModule`/Keyv, đơn vị là millisecond theo cách code hiện tại dùng. Một số service dùng ioredis trực tiếp và set TTL riêng bằng `EX` seconds, ví dụ `subscription:{tenantId}` TTL 300 giây.

### 8.2 Redis client trong code

QRTable có hai kiểu dùng Redis:

| Kiểu dùng                     | Code                                                          | Khi nào dùng                                                                   |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Nest CacheModule + Keyv Redis | `libs/configuration/src/lib/redis.config.ts`                  | Cache ở BFF/guard/controller, TTL mặc định.                                    |
| ioredis client trực tiếp      | `libs/providers/redis-client/src/lib/redis-client.service.ts` | Service cần lệnh Redis cụ thể như `set EX`, `del`, Pub/Sub, lock, KDS runtime. |

Điểm cần nhớ:

- `CacheModule` phù hợp cache đơn giản.
- ioredis phù hợp khi cần Redis primitive rõ ràng.
- Không trộn owner tùy tiện: key do service nào sở hữu thì service đó quyết định format/TTL/invalidation.

### 8.3 Persistence: RDB, AOF và ý nghĩa với QRTable

Redis là in-memory store, nhưng có thể bật persistence:

| Cơ chế                 | Nghĩa                               | Khi nào quan tâm                                                           |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| RDB snapshot           | Redis ghi snapshot định kỳ ra disk. | Khôi phục tương đối sau restart, có thể mất dữ liệu sau snapshot gần nhất. |
| AOF / Append Only File | Redis ghi log lệnh write.           | Bền hơn RDB cho write gần đây, nhưng cần quản lý file và hiệu năng.        |
| RDB + AOF              | Kết hợp snapshot và log write.      | Production Redis cần cân nhắc nếu dữ liệu Redis khó rebuild.               |

QRTable hiện thiết kế Redis theo hướng **có thể mất và dựng lại được**, ngoại trừ một số runtime state cần quy trình rebuild/cleanup rõ. Vì vậy không được dựa vào Redis persistence như nguồn sự thật nghiệp vụ. PostgreSQL/service owner vẫn là nguồn chính.

### 8.4 Maxmemory và eviction policy

Redis có thể bị giới hạn bộ nhớ bằng `maxmemory`. Khi đạt giới hạn, Redis dùng `maxmemory-policy` để quyết định có xóa key hay trả lỗi.

Các policy hay gặp:

| Policy           | Nghĩa ngắn                                         | Cảnh báo với QRTable                                          |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `noeviction`     | Không tự xóa key; lệnh ghi mới có thể lỗi khi đầy. | An toàn hơn cho state quan trọng, nhưng phải monitor memory.  |
| `allkeys-lru`    | Xóa key ít dùng gần đây trong toàn bộ keyspace.    | Tốt cho pure cache, nguy hiểm nếu có lock/session quan trọng. |
| `volatile-lru`   | Chỉ xóa key có TTL theo LRU.                       | Phù hợp hơn nếu key không TTL là flag cần giữ.                |
| `allkeys-random` | Xóa ngẫu nhiên key bất kỳ.                         | Khó dự đoán, không nên nếu có nhiều loại key quan trọng.      |

Với QRTable, vì Redis chứa cả cache, session, lock, KDS runtime và tenant suspend flag, không nên chọn eviction policy như thể mọi key đều chỉ là cache. Nếu production đặt `maxmemory`, cần phân loại key và có monitoring memory.

### 8.5 Standalone, Sentinel, Cluster

| Kiểu triển khai | Dùng khi nào                                                             | Ghi chú                                                        |
| --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Standalone      | Local/dev, demo, tải nhỏ.                                                | Compose hiện tại đang là standalone.                           |
| Sentinel        | Cần failover cho Redis primary/replica nhưng vẫn giữ API gần standalone. | Phù hợp khi muốn HA vừa phải.                                  |
| Cluster         | Cần shard dữ liệu trên nhiều node.                                       | Phức tạp hơn; multi-key operation bị ràng buộc theo hash slot. |

QRTable hiện chưa thiết kế theo Redis Cluster. Nếu sau này dùng Cluster, các operation multi-key như lock nhiều key, cart/session multi-key hoặc Lua nhiều key phải kiểm tra lại hash slot. Khi cần multi-key atomic trong Cluster, key có thể phải dùng hash tag như `cart:{tenantId}:...` để cùng slot, nhưng đây là thay đổi kiến trúc cần spec riêng.

### 8.6 TTL, cache miss và stale cache

TTL không chỉ để dọn bộ nhớ; TTL là một phần contract.

| Tình huống               | Ví dụ                               | Cách xử lý                                                     |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------- |
| TTL quá ngắn             | Menu cache miss liên tục.           | Tăng TTL hoặc tối ưu source query, nhưng vẫn giữ invalidation. |
| TTL quá dài              | Menu/subscription cache stale.      | Giảm TTL hoặc invalidate khi write thành công.                 |
| Key hết hạn giữa request | Cart/session/OAuth state không còn. | Trả lỗi rõ ràng hoặc refetch/rebuild từ source owner.          |
| Cache stale sau write    | User thấy dữ liệu cũ.               | Xóa key/invalidate trong write path.                           |

Với dữ liệu bảo mật ngắn hạn như `oauth_state:{state}`, TTL ngắn là bắt buộc. Với cache như `subscription:{tenantId}`, TTL 5 phút là trade-off giữa tốc độ và độ mới.

### 8.7 Conflict và failure playbook

| Tình huống              | Dấu hiệu                                            | Cách xử lý trong QRTable                                                             |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Cart version conflict   | Client gửi `expectedCartVersion` cũ.                | Trả conflict, client refetch cart mới; không ghi đè im lặng.                         |
| Lock expired giữa chừng | Request A giữ lock quá lâu, request B lấy lock mới. | Operation trong lock phải ngắn; release phải kiểm tra owner value.                   |
| Cache stampede          | Nhiều request cùng miss và gọi source service/DB.   | Dùng TTL hợp lý, request coalescing/lock nhẹ nếu endpoint nóng.                      |
| Pub/Sub message lost    | BFF down đúng lúc Kitchen publish hint.             | Frontend refetch snapshot; Pub/Sub không là nguồn sự thật.                           |
| Wrong type              | Code `HGETALL` vào key string hoặc ngược lại.       | Prefix/type phải rõ; debug bằng `TYPE key`; không tái dùng prefix cho type khác.     |
| Key collision           | Hai service dùng cùng key pattern khác nghĩa.       | Key phải có owner và domain prefix; cập nhật key inventory khi thêm key.             |
| Redis unavailable       | Guard/cache/lock không đọc được Redis.              | Có policy theo nghiệp vụ: cache miss fallback, mutation nhạy cảm có thể fail-closed. |
| Eviction ngoài ý muốn   | Key biến mất dù chưa hết TTL.                       | Kiểm tra `maxmemory-policy`, memory usage, và phân loại key quan trọng.              |
| Flush nhầm môi trường   | Mất session/cache/runtime state.                    | Script flush hiện chặn non-development và non-local; không chạy thủ công bừa bãi.    |

### 8.8 Lệnh cấu hình/quan sát nên biết

```bash
# Xem memory và policy
INFO memory
CONFIG GET maxmemory
CONFIG GET maxmemory-policy

# Xem persistence
CONFIG GET save
CONFIG GET appendonly
INFO persistence

# Xem client đang kết nối
CLIENT LIST
```

Các lệnh `CONFIG SET`, `FLUSHDB`, `FLUSHALL` chỉ dùng khi hiểu rõ môi trường. Nếu cần đổi production Redis config, nên đi qua IaC/deployment config thay vì thao tác tay trong `redis-cli`.

---

## 9. Gỡ lỗi local

### 9.1 Kết nối Redis CLI

```bash
docker exec -it redis redis-cli
```

Nếu container name khác, xem bằng:

```bash
docker ps
```

### 9.2 Lệnh kiểm tra an toàn

```bash
# Xem type của key
TYPE cart:tenant-1:session-1

# Xem TTL còn lại
TTL cart:tenant-1:session-1

# Đọc hash
HGETALL cart:tenant-1:session-1

# Đọc string
GET tenant:tenant-1:suspended

# Scan key theo pattern
SCAN 0 MATCH "cart:tenant-1:*" COUNT 100
```

### 9.3 Khi thấy dữ liệu lạ

Kiểm tra theo thứ tự:

1. Key có đúng tenantId không?
2. Key owner là service nào?
3. TTL có đúng kỳ vọng không?
4. Type có khớp docs không?
5. Có legacy fallback không, ví dụ `bff-session:{sessionId}`?
6. Code có đang dùng wrong key prefix không?

### 9.4 Lệnh nguy hiểm

Không chạy các lệnh này nếu chưa chắc môi trường:

```bash
KEYS *
FLUSHDB
FLUSHALL
MONITOR
```

`MONITOR` hữu ích khi debug local, nhưng có overhead lớn. `FLUSHDB`/`FLUSHALL` chỉ dùng trong dev reset có chủ đích.

---

## 10. Đọc code ở đâu

| Nội dung                               | File / thư mục                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Redis config chung                     | `libs/configuration/src/lib/redis.config.ts`                                                                    |
| ioredis provider                       | `libs/providers/redis-client/src/lib/redis-client.service.ts`                                                   |
| BFF cache/session/guard Redis          | `apps/bff/src/app/app.module.ts`, `libs/guards/src/lib/user.guard.ts`, `libs/guards/src/lib/session.guard.ts`   |
| BFF menu cache                         | `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`                                               |
| Socket.io Redis adapter                | `apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.ts`                                                |
| KDS Redis runtime                      | `apps/kitchen/src/app/modules/kitchen/**`                                                                       |
| Order session/cart/locks/quota         | `apps/order/src/app/modules/order/**`                                                                           |
| SaaS tenant suspend/subscription cache | `apps/saas/src/services/tenant-status-cache.service.ts`, `apps/saas/src/services/subscription-cache.service.ts` |
| Payment OAuth state                    | `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`                              |
| Dev flush guard                        | `tools/dev-seed/flush-redis.js`                                                                                 |

---

## 11. Checklist

Khi thêm Redis key mới:

- [ ] Có service owner rõ ràng.
- [ ] Key có `tenantId` nếu dữ liệu thuộc tenant.
- [ ] Type được chọn đúng: String, Hash, Set, ZSet hoặc Pub/Sub.
- [ ] TTL rõ ràng, hoặc giải thích vì sao không TTL.
- [ ] Có fallback khi key miss.
- [ ] Đã nghĩ tới eviction/stale cache nếu key là cache nóng.
- [ ] Không lưu dữ liệu cần audit/durable chỉ trong Redis.
- [ ] Có test cho conflict/duplicate/expired key nếu luồng quan trọng.
- [ ] Docs key inventory được cập nhật.

Khi dùng Redis cho cache:

- [ ] Source of truth vẫn là DB/service owner.
- [ ] Invalidation path rõ ràng.
- [ ] Cache miss không làm hỏng nghiệp vụ.
- [ ] Không emit realtime event chỉ vì cache bị xóa nếu client có thể refetch.

Khi dùng Redis cho lock:

- [ ] Lock value unique.
- [ ] Lock có TTL.
- [ ] Release không xóa nhầm lock của request khác.
- [ ] Operation bên trong lock đủ ngắn.
- [ ] Đã có hành vi rõ khi không lấy được lock hoặc Redis unavailable.

Khi dùng Redis cho realtime:

- [ ] Pub/Sub chỉ là hint, không là nguồn sự thật.
- [ ] Client có đường refetch snapshot.
- [ ] Message mất không làm sai trạng thái bền vững.
