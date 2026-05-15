# Hướng Dẫn WebSocket Và Socket.IO Trong QRTable

> **Vai trò:** Tài liệu hỗ trợ (supporting guide), không phải nguồn sự thật chính (canonical source).
> Khi cần trạng thái kiến trúc hiện tại, ưu tiên [`../technical-architecture.md`](../technical-architecture.md), [`../phases/phase-2b-kitchen-websocket.md`](../phases/phase-2b-kitchen-websocket.md), [`../specs/business-logic-step-2.7-spec.vi.md`](../specs/business-logic-step-2.7-spec.vi.md), [`./codebase-reading-map.vi.md`](./codebase-reading-map.vi.md), và code trên `main`.
>
> **Mục tiêu:** Giải thích WebSocket và Socket.IO vừa đủ để đọc code realtime, gỡ lỗi local, triển khai đúng trong QRTable, và tránh nhầm WebSocket thành nguồn dữ liệu chính. Tài liệu này có lý thuyết nền tảng, nhưng không đi xa thành giáo trình realtime tổng quát.
>
> **Trạng thái code hiện tại (2026-05-14):** QRTable dùng Socket.IO `4.8.3` qua NestJS BFF Gateway namespace `/orders`. BFF tự gán rooms theo staff JWT hoặc customer session, frontend nhận event như gợi ý làm mới dữ liệu (invalidation hint), sau đó TanStack Query refetch REST snapshot. BFF dùng Socket.IO Redis Adapter để hỗ trợ fan-out khi chạy nhiều instance, nhưng không có durable replay (phát lại bền vững) cho client đã mất kết nối.

---

## Mục Lục

1. [Đọc nhanh](#1-đọc-nhanh)
2. [Realtime đang dùng ở đâu](#2-realtime-đang-dùng-ở-đâu)
3. [Nguyên tắc lựa chọn WebSocket/Socket.IO](#3-nguyên-tắc-lựa-chọn-websocketsocketio)
4. [Lý thuyết vừa đủ](#4-lý-thuyết-vừa-đủ)
5. [Kiến trúc realtime hiện tại](#5-kiến-trúc-realtime-hiện-tại)
6. [Namespace, auth và rooms](#6-namespace-auth-và-rooms)
7. [Event registry và cách dùng payload](#7-event-registry-và-cách-dùng-payload)
8. [Frontend realtime rules](#8-frontend-realtime-rules)
9. [Hướng dẫn cấu hình, triển khai và conflict](#9-hướng-dẫn-cấu-hình-triển-khai-và-conflict)
10. [Gỡ lỗi local](#10-gỡ-lỗi-local)
11. [Khi không dùng WebSocket](#11-khi-không-dùng-websocket)
12. [Đọc code ở đâu](#12-đọc-code-ở-đâu)
13. [Checklist](#13-checklist)

---

## 1. Đọc nhanh

Realtime trong QRTable là lớp giúp giao diện biết "đã có gì đó thay đổi, hãy tải lại snapshot đúng nhất". WebSocket/Socket.IO không thay thế REST API, không thay thế Kafka, và không tự đảm bảo dữ liệu không mất như một hàng đợi bền vững.

Một câu dễ nhớ:

```txt
WebSocket báo có thay đổi.
REST/TanStack Query đọc lại dữ liệu đúng.
Kafka/Redis xử lý fan-out nội bộ tùy loại sự kiện.
```

### Luồng tổng quát

```txt
Backend state thay đổi thành công
  -> BFF nhận kết quả sau TCP/Kafka/Redis internal event
  -> BFF emit Socket.IO event vào room phù hợp
  -> Frontend nhận event
  -> Frontend kiểm tra tenant/session/station
  -> Frontend invalidate TanStack Query
  -> Frontend refetch REST snapshot
  -> UI render từ snapshot mới
```

### Thuật ngữ tối thiểu

| Thuật ngữ                                     | Nghĩa trong QRTable                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Realtime (thời gian thực)                     | Cơ chế giúp UI phản ứng gần như ngay khi trạng thái backend thay đổi.                                                     |
| WebSocket (kết nối hai chiều lâu dài)         | Giao thức giữ kết nối mở để client và server gửi message qua lại.                                                         |
| Socket.IO                                     | Thư viện realtime chạy trên WebSocket/HTTP polling, có reconnect, rooms, namespace, acknowledgements và adapters.         |
| HTTP polling (hỏi định kỳ)                    | Client gọi REST API lặp lại theo chu kỳ, ví dụ 3 giây/lần.                                                                |
| Long-polling (polling giữ request lâu hơn)    | Transport dự phòng của Socket.IO khi WebSocket chưa/không dùng được.                                                      |
| Namespace (không gian socket)                 | Đường realtime tách logic, QRTable dùng namespace `/orders`.                                                              |
| Room (phòng nhận event)                       | Nhóm socket để server emit đúng người nhận, ví dụ `tenant:{tid}:staff`.                                                   |
| Event (sự kiện realtime)                      | Tên message như `events.orderCreated`, `events.kdsQueueChanged`.                                                          |
| Payload (dữ liệu kèm event)                   | JSON đi kèm event. QRTable dùng payload chủ yếu để filter và chọn query cần refetch.                                      |
| Invalidation hint (gợi ý làm mới)             | Tín hiệu rằng dữ liệu có thể đã đổi, frontend cần invalidate/refetch query.                                               |
| Snapshot (ảnh chụp trạng thái hiện tại)       | Dữ liệu REST trả về, được xem là bản đúng để render UI.                                                                   |
| Reconnect (kết nối lại)                       | Socket.IO tự thử nối lại khi mạng đứt. QRTable refetch snapshot sau reconnect thành công.                                 |
| Acknowledgement / ack (xác nhận nhận message) | Cơ chế callback của Socket.IO để xác nhận một message được xử lý ở đầu kia. QRTable không dùng ack làm bảo đảm nghiệp vụ. |
| Adapter (bộ nối mở rộng server)               | Lớp giúp nhiều Socket.IO server phối hợp. QRTable dùng Redis Adapter cho fan-out giữa BFF instances.                      |
| Sticky session (định tuyến dính phiên)        | Load balancer gửi các HTTP polling request của cùng một Socket.IO session về cùng instance.                               |
| Durable replay (phát lại bền vững)            | Cơ chế lưu event để client đọc lại sau khi mất kết nối. QRTable chưa triển khai durable replay cho WebSocket.             |
| Source of truth (nguồn sự thật)               | Nơi dữ liệu được xem là đúng nhất. Với UI, nguồn sự thật là REST snapshot từ service owner, không phải Socket.IO event.   |
| Tenant isolation (cô lập dữ liệu tenant)      | Bảo đảm socket/event chỉ vào đúng tenant, đúng session, đúng station.                                                     |
| Server-derived room (room do server suy ra)   | Client không gửi room name; BFF suy ra room từ JWT/session đã verify.                                                     |
| Fan-out (phát tới nhiều người nhận)           | Một sự kiện backend được phân phối tới nhiều socket/room phù hợp.                                                         |
| Backpressure (áp lực tải ngược)               | Khi server/client nhận nhiều event hơn khả năng xử lý. QRTable giảm rủi ro bằng cách gửi hint nhỏ và refetch snapshot.    |
| Graceful degradation (suy giảm có kiểm soát)  | Khi realtime lỗi, UI vẫn dùng polling/refetch thủ công thay vì chặn thao tác chính.                                       |

---

## 2. Realtime đang dùng ở đâu

| Khu vực          | Cách dùng realtime hiện tại                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BFF              | Sở hữu Socket.IO Gateway namespace `/orders`, auth handshake, room assignment, Redis Adapter, event fan-out.                                                     |
| Customer PWA     | Connect bằng `auth: { tenantId, sessionId, tenantSlug? }`, nhận order/cart/bill/payment/tenant lifecycle hints và refetch snapshot theo session.                 |
| Management POS   | Connect bằng `auth: { token: accessToken }`, nhận order/service/bill/table/payment/kitchen-ready hints và refetch danh sách đang hiển thị.                       |
| Management KDS   | Connect bằng staff JWT, lọc event theo `tenantId` và `station`, refetch `KdsQueueSnapshot` sau KDS hints.                                                        |
| Kitchen Service  | Không nói chuyện trực tiếp với browser. Kitchen ghi Redis KDS state, publish Redis Pub/Sub nội bộ `realtime:kds:*`; BFF subscriber chuyển thành Socket.IO event. |
| Order Service    | Sở hữu order/cart/bill/service request. BFF emit realtime sau khi TCP response từ Order thành công.                                                              |
| Payment Service  | Phát Kafka `payment.completed`; BFF Kafka bridge enrich bằng session snapshot từ Order rồi emit `events.paymentCompleted`.                                       |
| SaaS Service/BFF | Admin đổi lifecycle tenant, BFF emit `tenant.suspended`, `tenant.activated`, `tenant.closed` cho customer sockets theo tenant.                                   |

Các dependency liên quan trong `package.json`:

| Package                      | Vai trò                                                |
| ---------------------------- | ------------------------------------------------------ |
| `socket.io`                  | Socket.IO server runtime.                              |
| `socket.io-client`           | Client runtime trong Customer PWA và Management App.   |
| `@nestjs/websockets`         | Decorator và abstraction WebSocket Gateway của NestJS. |
| `@nestjs/platform-socket.io` | Adapter NestJS để chạy Socket.IO.                      |
| `@socket.io/redis-adapter`   | Fan-out Socket.IO giữa nhiều BFF instances qua Redis.  |
| `redis`                      | Redis client dùng cho Redis Adapter và Pub/Sub.        |

---

## 3. Nguyên tắc lựa chọn WebSocket/Socket.IO

Socket.IO phù hợp khi giao diện cần biết nhanh rằng dữ liệu đã đổi, nhưng correctness vẫn đến từ API đọc dữ liệu. Trong QRTable, đây là quyết định về trải nghiệm vận hành, không phải quyết định lưu trữ dữ liệu.

### 3.1 Khi nên dùng Socket.IO

| Tín hiệu                                | Ý nghĩa                                                                   | Ví dụ trong QRTable                                                              |
| --------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| UI cần phản ứng nhanh                   | Người dùng cần thấy thay đổi gần ngay lập tức.                            | POS thấy đơn mới, KDS thấy queue đổi, PWA thấy order ready.                      |
| Backend đã commit trạng thái            | Event chỉ phát sau khi service owner xử lý thành công.                    | BFF emit `events.orderCreated` sau TCP submit order thành công.                  |
| Payload nhỏ, chỉ cần báo "có thay đổi"  | Không cần push toàn bộ domain state.                                      | KDS nhận `events.kdsQueueChanged` rồi refetch queue snapshot.                    |
| Nhiều client trong cùng tenant cần biết | Cần gửi cùng tín hiệu cho nhóm staff/customer.                            | `tenant:{tid}:staff`, `tenant:{tid}:management`, `tenant:{tid}:customers`.       |
| Có fallback khi event bị miss           | Mất event không làm sai dữ liệu vì client sẽ refetch khi reconnect/focus. | Customer PWA invalidate session scope khi connect/reconnect/visibility change.   |
| Logic command vẫn đi qua HTTP/TCP       | WebSocket chỉ là channel thông báo, không là API mutation chính.          | KDS start/done/recall/priority dùng REST guarded endpoints, không mutate qua WS. |

### 3.2 Khi không nên dùng Socket.IO

| Tín hiệu                                           | Lý do                                                                      | Lựa chọn đúng hơn                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Cần lưu event bền vững, đọc lại sau nhiều phút/giờ | Socket.IO event mặc định không phải log bền vững.                          | Kafka/outbox, PostgreSQL audit, hoặc Redis Streams nếu thiết kế mới. |
| Event kích hoạt nghiệp vụ cross-service            | Đây là domain event, không phải UI hint.                                   | Kafka.                                                               |
| Client cần lấy dữ liệu đầy đủ và đúng              | Payload realtime có thể thiếu hoặc cũ.                                     | REST snapshot qua BFF.                                               |
| Command cần permission, validation, transaction    | WebSocket mutation dễ làm lệch guard/DTO/logging nếu không thiết kế riêng. | REST/TCP command hiện tại.                                           |
| Chỉ cần cập nhật chậm và tải thấp                  | Polling đơn giản hơn và dễ vận hành hơn.                                   | HTTP polling với interval hợp lý.                                    |
| Message cần exactly-once (đúng một lần tuyệt đối)  | Socket.IO không cung cấp exactly-once nghiệp vụ.                           | Idempotent service command, outbox, transaction, dedupe key.         |

### 3.3 Chọn công nghệ nào cho loại thay đổi nào

| Nhu cầu                                           | Công cụ nên dùng                            | Ghi chú trong QRTable                                                                   |
| ------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Đọc trạng thái hiện tại để render UI              | REST API + TanStack Query                   | Nguồn sự thật cho Customer PWA, POS, KDS.                                               |
| Báo UI rằng trạng thái vừa đổi                    | Socket.IO                                   | Chỉ invalidate/refetch, không render domain state trực tiếp từ event.                   |
| Dự phòng khi realtime lỗi                         | HTTP polling                                | POS/KDS/payment có thể giữ polling fallback theo spec từng phase.                       |
| Phản ứng nghiệp vụ giữa service                   | Kafka                                       | `order.confirmed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.        |
| Fan-out nội bộ nhanh, có thể mất, snapshot tự sửa | Redis Pub/Sub                               | Kitchen publish `realtime:kds:*`, BFF convert thành `events.kdsQueueChanged`.           |
| Đồng bộ Socket.IO giữa nhiều BFF instances        | Socket.IO Redis Adapter                     | Fan-out rooms giữa instances, không cung cấp durable replay.                            |
| Một chiều server-to-browser đơn giản              | SSE (Server-Sent Events, sự kiện một chiều) | QRTable hiện không dùng SSE vì cần Socket.IO rooms, auth, reconnect và event namespace. |

### 3.4 Quy tắc ngắn của QRTable

```txt
Nếu là dữ liệu để render: REST.
Nếu là tín hiệu UI gần realtime: Socket.IO.
Nếu là domain event giữa services: Kafka.
Nếu là runtime state/cache/fan-out nội bộ: Redis.
```

---

## 4. Lý thuyết vừa đủ

### 4.1 HTTP polling

HTTP polling là cách đơn giản nhất: client gọi API theo chu kỳ.

```txt
Mỗi 3 giây:
  GET /admin/orders
  GET /admin/kds/queue?station=KITCHEN
```

Ưu điểm:

- Dễ hiểu, dễ debug bằng DevTools/curl.
- Ít rủi ro mất đồng bộ vì mỗi lần gọi là lấy snapshot mới.
- Phù hợp với dữ liệu không cần cập nhật ngay lập tức.

Nhược điểm:

- Tốn request khi không có gì thay đổi.
- Cảm giác chậm nếu interval dài.
- Nếu interval quá ngắn, backend và database chịu tải không cần thiết.

Trong QRTable, polling vẫn là fallback hợp lý cho POS/payment/KDS trong các giai đoạn cần ổn định correctness.

### 4.2 WebSocket thuần

WebSocket là giao thức giữ một kết nối lâu dài giữa browser và server. Sau khi handshake thành công, hai bên có thể gửi message qua lại mà không cần mở request HTTP mới cho từng message.

Ưu điểm:

- Độ trễ thấp.
- Hai chiều, server có thể push cho client.
- Phù hợp với bảng điều khiển live, chat, game, collaboration, trạng thái vận hành.

Nhược điểm:

- Cần quản lý reconnect, auth, room/subscription, cleanup listener.
- Khi deploy nhiều instance cần quan tâm load balancer/proxy.
- Không tự có rooms, namespace, fallback, adapter hay ack tiện dụng.

QRTable không dùng WebSocket thuần trực tiếp, mà dùng Socket.IO để có sẵn các tiện ích cần cho ứng dụng web thực tế.

### 4.3 Socket.IO không phải WebSocket thuần

Socket.IO là thư viện realtime chạy trên Engine.IO. Nó có thể dùng WebSocket, nhưng cũng có thể dùng HTTP long-polling làm transport dự phòng.

Theo tài liệu Socket.IO v4 được đối chiếu qua Context7 và docs chính thức, Socket.IO bổ sung các khả năng chính so với WebSocket thuần:

- Fallback sang HTTP long-polling khi WebSocket chưa/không khả dụng.
- Tự reconnect khi mất kết nối.
- Acknowledgements (xác nhận callback) cho từng message nếu caller dùng.
- Broadcast và rooms để gửi tới nhóm socket.
- Namespaces để tách domain realtime.
- Adapters để nhiều server instances cùng emit tới đúng rooms.
- Connection recovery (khôi phục kết nối ngắn hạn) nếu được cấu hình riêng.

Điểm quan trọng: QRTable hiện **không** dựa vào connection recovery hay durable replay để đảm bảo dữ liệu. Vì vậy mọi reconnect/missed event đều phải quy về refetch snapshot.

### 4.4 Namespace

Namespace là một không gian realtime riêng trên cùng server.

QRTable dùng:

```txt
/orders
```

Frontend tạo URL namespace bằng cách lấy origin của BFF:

```ts
const url = new URL(API_CONFIG.DEFAULT_BFF_URL);
const socketUrl = `${url.origin}/orders`;
```

Ví dụ:

```txt
REST base:   http://localhost:3300/api/v1
Socket URL:  http://localhost:3300/orders
```

Không tạo `/kds` riêng trong giai đoạn hiện tại. KDS dùng cùng namespace `/orders`, sau đó phân quyền bằng rooms và event filters.

### 4.5 Room

Room là nhóm socket trên server. Client không cần biết mình đang ở room nào. Server dùng room để emit chính xác:

```txt
server.to("tenant:t1:staff").emit("events.orderCreated", payload)
```

Trong QRTable, room phải được suy ra từ dữ liệu đã verify:

- Staff: từ JWT Keycloak/Authorizer.
- Customer: từ tenant/session Redis cache.
- KDS station: từ role hoặc request `subscribe.kds` đã kiểm tra.

Không tin room name do client gửi.

### 4.6 Acknowledgement

Acknowledgement (ack) là callback để bên gửi biết bên nhận đã xử lý event.

Ví dụ khái niệm:

```ts
socket.emit('some.event', payload, (response) => {
  // response từ bên nhận
});
```

QRTable hiện không dùng ack làm điều kiện correctness. Lý do:

- Một browser ack không chứng minh mọi browser đã cập nhật.
- Ack không thay thế database transaction.
- Ack không giải quyết client offline/missed event.
- Với UI hint, refetch snapshot đáng tin hơn ack.

Nếu sau này cần command qua WebSocket, phải có thiết kế riêng về auth, idempotency, timeout, audit và fallback. Không tự ý biến event hiện tại thành mutation command.

### 4.7 Delivery semantics

Delivery semantics là mức bảo đảm giao message.

| Khái niệm                             | Nghĩa ngắn                                                      | QRTable xử lý thế nào                        |
| ------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| At-most-once (tối đa một lần)         | Message có thể mất, nhưng không giao lặp do cùng một phát.      | Chấp nhận với UI hint, vì reconnect refetch. |
| At-least-once (ít nhất một lần)       | Message có thể giao lặp, consumer phải idempotent.              | Kafka consumers dùng hướng này.              |
| Exactly-once (đúng một lần tuyệt đối) | Khó đạt trong hệ phân tán, thường là illusion ở tầng nghiệp vụ. | Không claim cho WebSocket.                   |
| Durable replay (phát lại bền vững)    | Client/consumer đọc lại message sau khi offline.                | Không có ở WebSocket hiện tại.               |

Socket.IO giúp reconnect và buffer một số packet trong những tình huống nhất định, nhưng QRTable không được thiết kế để tin rằng mọi client luôn nhận đủ mọi event.

Quy tắc của QRTable:

```txt
Event có thể mất.
Event có thể đến trễ.
Event có thể trùng tác dụng.
REST snapshot phải tự sửa UI về đúng trạng thái.
```

### 4.8 Adapter và Redis Adapter

Mặc định, Socket.IO server dùng in-memory adapter. Nếu BFF chỉ chạy một instance, emit room nằm trong bộ nhớ process là đủ.

Khi chạy nhiều BFF instances:

```txt
Client A -> BFF instance 1
Client B -> BFF instance 2

BFF instance 1 emit room tenant:t1:staff
  -> Redis Adapter publish nội bộ
  -> BFF instance 2 cũng emit tới socket đang nối vào instance 2
```

Redis Adapter giải quyết fan-out giữa instances. Nó không lưu event bền vững cho client đã disconnect.

---

## 5. Kiến trúc realtime hiện tại

### 5.1 BFF là realtime edge

BFF là điểm giao tiếp realtime duy nhất với browser.

```txt
Customer PWA / Management App
  <-> Socket.IO namespace /orders
  <-> BFF OrderEventsGateway
```

Các service khác không emit trực tiếp ra browser:

- Order Service trả TCP response cho BFF.
- Kitchen Service publish Redis Pub/Sub nội bộ sau khi ghi Redis KDS state.
- Payment Service publish Kafka, BFF bridge enrich rồi emit.
- SaaS status change được BFF admin controller emit sau khi cập nhật thành công.

### 5.2 Luồng BFF Direct sau TCP success

```txt
Frontend gọi REST command
  -> BFF controller
  -> TCP tới service owner
  -> service owner ghi dữ liệu và trả event payload
  -> BFF emit Socket.IO event
  -> Frontend nhận hint và refetch REST query
```

Ví dụ:

```txt
Customer submit order
  -> POST /customer/orders
  -> BFF gọi Order Service
  -> Order tạo order/cart/bill state
  -> BFF emit events.orderCreated + events.cartUpdated
  -> POS và PWA invalidate queries
```

Ưu điểm:

- Không dùng Kafka để proxy UI.
- Event chỉ phát sau khi command thành công.
- BFF có đủ context để gửi đúng room.

### 5.3 Luồng KDS qua Redis Pub/Sub nội bộ

```txt
Order confirmed
  -> Order Service publish Kafka order.confirmed
  -> Kitchen consume, ghi Redis KDS ticket/queue/revision
  -> Kitchen publish Redis Pub/Sub realtime:kds:{tenantId}
  -> BFF KdsInternalEventsSubscriber nhận message
  -> BFF emit events.kdsQueueChanged vào station/management rooms
  -> KDS frontend filter tenant/station và refetch queue snapshot
```

Điểm quan trọng: BFF không emit KDS queue hint trực tiếp từ Kafka `order.confirmed`, vì lúc đó Kitchen có thể chưa ghi xong Redis queue. Hint phải phát sau khi state KDS đã tồn tại.

### 5.4 Luồng Payment qua Kafka bridge

```txt
Payment completed
  -> Payment Service update payment
  -> Payment outbox publish Kafka payment.completed
  -> BFF RealtimeKafkaBridge consume
  -> BFF hỏi Order Service để lấy sessionId của bill
  -> BFF emit events.paymentCompleted
  -> PWA/POS invalidate payment/order/bill queries
```

Realtime payment là hint. Polling/payment history vẫn phải đọc nguồn chuẩn từ REST.

### 5.5 Luồng tenant lifecycle

```txt
Admin đổi trạng thái tenant
  -> BFF admin tenant controller gọi SaaS Service
  -> cập nhật tenant status thành công
  -> BFF emit tenant.suspended / tenant.activated / tenant.closed
  -> Customer PWA patch tenant lifecycle trong session context
```

Room nhận:

- `tenant:{tenantId}:customers`
- `tenant-slug:{tenantSlug}:customers` nếu có slug.

---

## 6. Namespace, auth và rooms

### 6.1 Namespace chính thức

```txt
/orders
```

Gateway hiện tại:

```ts
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/orders' })
export class OrderEventsGateway implements OnGatewayConnection {}
```

Ghi chú:

- `origin: '*'` phù hợp dev/demo, nhưng production nên giới hạn origin.
- Namespace `/orders` không có prefix `/api/v1`.
- REST URL có thể là `http://localhost:3300/api/v1`, nhưng socket namespace là `http://localhost:3300/orders`.

### 6.2 Staff auth

Management App gửi JWT qua Socket.IO auth:

```ts
io('http://localhost:3300/orders', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  timeout: 10_000,
});
```

BFF cũng hỗ trợ fallback `Authorization: Bearer <token>` trong handshake headers, nhưng code frontend hiện ưu tiên `auth.token`.

BFF verify token qua Authorizer gRPC boundary, cache kết quả token trong Redis, rồi suy ra:

- `tenantId`
- realm roles như `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`

### 6.3 Customer auth

Customer PWA gửi session identity:

```ts
io('http://localhost:3300/orders', {
  auth: {
    tenantId,
    sessionId,
    tenantSlug,
  },
  autoConnect: true,
  reconnection: true,
  timeout: 10_000,
});
```

BFF vẫn hỗ trợ header fallback:

```txt
x-tenant-id
x-session-id
```

Nhưng hướng canonical là Socket.IO `auth`.

BFF chỉ accept customer socket nếu session tồn tại trong Redis cache theo tenant/session. Nếu session không hợp lệ, BFF emit `events.authError` rồi disconnect.

### 6.4 Room assignment

Server tự join rooms trong `handleConnection`.

| Actor/role                    | Rooms chính                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Customer session              | `session:{sessionId}:customer`, `tenant:{tenantId}:customers`, optional `tenant-slug:{tenantSlug}:customers` |
| WAITER                        | `tenant:{tenantId}:staff`                                                                                    |
| CHEF                          | `tenant:{tenantId}:staff`, `tenant:{tenantId}:kds:kitchen`                                                   |
| BARISTA                       | `tenant:{tenantId}:staff`, `tenant:{tenantId}:kds:bar`                                                       |
| OWNER/MANAGER                 | `tenant:{tenantId}:staff`, `tenant:{tenantId}:management`                                                    |
| SUPER_ADMIN có tenant context | `tenant:{tenantId}:staff`, `tenant:{tenantId}:management`                                                    |
| OWNER/MANAGER opt-in KDS      | `tenant:{tenantId}:kds:kitchen` hoặc `tenant:{tenantId}:kds:bar` qua `subscribe.kds`                         |

### 6.5 Legacy join events

Hai event cũ không còn là cách join room hợp lệ:

```txt
join.session
join.staff
```

Gateway hiện tại phản hồi `events.authError` với thông điệp room assignment do server quản lý. Đây là guard quan trọng để tránh client tự chọn room.

### 6.6 `subscribe.kds`

`subscribe.kds` chỉ dùng cho OWNER/MANAGER cần xem station KDS cụ thể.

Payload:

```ts
{
  station: 'KITCHEN' | 'BAR';
}
```

Quy tắc:

- Socket phải đã có `tenantId`.
- Role phải là `SUPER_ADMIN`, `OWNER`, hoặc `MANAGER`.
- CHEF/BARISTA không được dùng `subscribe.kds` để vào station còn lại.
- Client vẫn phải filter event theo `tenantId` và `station`.

---

## 7. Event registry và cách dùng payload

### 7.1 Nguyên tắc payload

Payload realtime trong QRTable dùng để:

- Kiểm tra event có thuộc tenant/session/station hiện tại không.
- Biết query/domain nào cần invalidate.
- Hiển thị trạng thái kết nối hoặc thông báo nhẹ nếu cần.

Payload không nên dùng để:

- Thay thế REST snapshot.
- Bỏ qua guard/permission.
- Suy diễn business state cuối cùng nếu snapshot chưa refetch.
- Lưu lại thành lịch sử nghiệp vụ.

### 7.2 Events order/session/bill

| Event                       | Nguồn phát chính                        | Rooms chính                                     | Frontend action                            |
| --------------------------- | --------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| `events.cartUpdated`        | BFF sau Order TCP                       | `session:{sid}:customer`, `tenant:{tid}:staff`  | Invalidate cart/bill/order domain.         |
| `events.orderCreated`       | BFF sau submit order                    | `session:{sid}:customer`, `tenant:{tid}:staff`  | Invalidate order list/detail, table state. |
| `events.orderStatusChanged` | BFF sau status change                   | `tenant:{tid}:staff`, optional customer session | Invalidate order/table domain.             |
| `events.serviceRequested`   | BFF sau service request                 | `session:{sid}:customer`, `tenant:{tid}:staff`  | Invalidate service requests.               |
| `events.billRequested`      | BFF sau bill request                    | `session:{sid}:customer`, `tenant:{tid}:staff`  | Invalidate bill/cart/order/service domain. |
| `events.tableTransferred`   | BFF sau transfer saga                   | `session:{sid}:customer`, `tenant:{tid}:staff`  | Invalidate session/order/table domain.     |
| `events.paymentCompleted`   | Kafka `payment.completed` -> BFF bridge | `session:{sid}:customer`, `tenant:{tid}:staff`  | Invalidate payment/order/bill domain.      |

### 7.3 Events KDS

| Event                      | Nguồn phát chính                          | Rooms chính                                               | Frontend action                                            |
| -------------------------- | ----------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| `events.kdsQueueChanged`   | Kitchen Redis Pub/Sub -> BFF              | `tenant:{tid}:kds:kitchen/bar`, `tenant:{tid}:management` | Filter tenant/station, invalidate queue.                   |
| `events.kitchenItemReady`  | BFF Kitchen controller sau Order sync     | `tenant:{tid}:staff`, `session:{sid}:customer`            | POS/PWA invalidate order; KDS invalidate nếu station khớp. |
| `events.kitchenSlaWarning` | Kafka `kitchen.sla_warning` -> BFF bridge | Station room, `tenant:{tid}:management`                   | Filter tenant/station, invalidate queue.                   |

KDS payload có `eventId`, `eventType`, `schemaVersion`, `tenantId`, `station`, `revision`, `occurredAt` tùy loại. Nếu FE track revision và phát hiện gap, refetch snapshot.

### 7.4 Events tenant lifecycle

| Event              | Nguồn phát chính            | Rooms chính                                              | Frontend action                                   |
| ------------------ | --------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `tenant.suspended` | BFF admin tenant controller | `tenant:{tid}:customers`, `tenant-slug:{slug}:customers` | Patch tenant status, chặn luồng customer nếu cần. |
| `tenant.activated` | BFF admin tenant controller | `tenant:{tid}:customers`, `tenant-slug:{slug}:customers` | Patch tenant status active.                       |
| `tenant.closed`    | BFF admin tenant controller | `tenant:{tid}:customers`, `tenant-slug:{slug}:customers` | Patch tenant status closed.                       |

### 7.5 Event không tồn tại trong scope hiện tại

Không claim các event sau nếu chưa có thiết kế mới:

```txt
events.menuUpdated
events.menu.updated
menuUpdated
payment.refunded WebSocket bridge
generic notification stream
```

Menu hiện vẫn dùng cache/REST invalidation, không có realtime menu event trong scope Step 2.7.

---

## 8. Frontend realtime rules

### 8.1 Hook sở hữu socket lifecycle

Các hook hiện tại:

- `useCustomerOrderRealtime()`
- `useStaffOrderRealtime()`
- `useKdsRealtime(station)`

Mỗi hook chịu trách nhiệm:

- Tạo socket instance khi đủ auth/session.
- Đăng ký listeners.
- Cập nhật trạng thái kết nối nhỏ cho UI.
- Filter payload theo tenant/session/station.
- Invalidate TanStack Query.
- Cleanup bằng `socket.off(...)` và `socket.disconnect()` khi unmount.

Không đăng ký domain listeners bên trong `connect`, vì reconnect có thể làm duplicate listeners.

### 8.2 Customer PWA

Customer PWA filter theo:

```txt
tenantId
sessionId
```

Các domain được invalidate:

- Cart snapshot.
- Current bill.
- Order list/detail.
- Tenant lifecycle context.

Customer PWA không listen KDS station queue events.

### 8.3 Management POS

Management POS filter theo:

```txt
tenantId
```

Các domain được invalidate:

- Order list/detail.
- Table state.
- Service request list.
- Bill/payment state.

POS không subscribe KDS station room nếu không render màn KDS.

### 8.4 Management KDS

KDS filter theo:

```txt
tenantId
station
```

KDS phải xem `KdsQueueSnapshot` từ REST là nguồn sự thật. Event chỉ gọi:

```ts
queryClient.invalidateQueries({ queryKey: kdsKeys.queue(tenantId, station) });
```

Sau reconnect, KDS refetch station snapshot đang mounted.

### 8.5 Trạng thái kết nối

Các status đang được hook expose:

```txt
idle
connected
reconnecting
degraded
auth-error
```

Ý nghĩa:

| Status         | Nghĩa                                                               |
| -------------- | ------------------------------------------------------------------- |
| `idle`         | Chưa đủ điều kiện connect hoặc hook disabled.                       |
| `connected`    | Socket đang nối thành công.                                         |
| `reconnecting` | Socket.IO đang thử reconnect.                                       |
| `degraded`     | Realtime đang suy giảm; UI vẫn dùng snapshot/polling/refetch.       |
| `auth-error`   | Server từ chối socket do token/session không hợp lệ hoặc forbidden. |

`auth-error` không nên tạo toast loop. Nó nên dẫn người dùng tới reload/refresh token/session expired UX tùy app.

---

## 9. Hướng dẫn cấu hình, triển khai và conflict

### 9.1 Cấu hình dependency

Backend cần:

```txt
@nestjs/websockets
@nestjs/platform-socket.io
socket.io
@socket.io/redis-adapter
redis
```

Frontend cần:

```txt
socket.io-client
```

Các version hiện tại nằm trong root `package.json`.

### 9.2 Cấu hình BFF gateway

File chính:

```txt
apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts
```

Cấu hình hiện tại:

```ts
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/orders' })
```

Khi hardening production:

- Giới hạn `cors.origin` theo domain Management App và Customer PWA.
- Đảm bảo reverse proxy hỗ trợ WebSocket upgrade.
- Đảm bảo base URL public của BFF trỏ cùng origin mà frontend dùng để connect.
- Không thêm namespace mới nếu chỉ cần phân quyền bằng rooms.

### 9.3 Cấu hình Redis Adapter

File chính:

```txt
apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.ts
apps/bff/src/main.ts
```

BFF hiện tạo Redis adapter lúc startup:

```txt
REDIS_HOST=localhost
REDIS_PORT=6379
```

Luồng startup:

```txt
NestFactory.create(AppModule)
  -> RedisIoAdapter.connectToRedis(redis://host:port)
  -> app.useWebSocketAdapter(redisIoAdapter)
  -> app.listen(PORT)
```

Nếu Redis không chạy, BFF có thể không khởi động được đúng realtime path. Với local dev, luôn kiểm tra Redis trước khi debug Socket.IO.

### 9.4 Cấu hình frontend URL

Management App:

```txt
NEXT_PUBLIC_BFF_URL=http://localhost:3300/api/v1
```

Customer PWA:

```txt
VITE_BFF_URL=http://localhost:3300/api/v1
```

Hook sẽ lấy `origin` và nối namespace:

```txt
http://localhost:3300/api/v1 -> http://localhost:3300/orders
```

Lỗi thường gặp:

| Cấu hình sai                               | Hiện tượng                                    | Cách sửa                                      |
| ------------------------------------------ | --------------------------------------------- | --------------------------------------------- |
| Dùng socket URL có `/api/v1/orders`        | Connect 404 hoặc namespace không tồn tại.     | Dùng origin BFF + `/orders`.                  |
| Frontend trỏ sai BFF origin                | REST chạy một host, socket connect host khác. | Đồng bộ `NEXT_PUBLIC_BFF_URL`/`VITE_BFF_URL`. |
| HTTPS frontend gọi HTTP socket qua browser | Mixed content hoặc connect fail.              | Dùng HTTPS BFF/tunnel cùng scheme.            |
| Tunnel/proxy đổi host nhưng env chưa đổi   | REST/socket lỗi CORS hoặc không connect.      | Cập nhật env public và restart frontend.      |

### 9.5 Reverse proxy và WebSocket upgrade

Nếu BFF chạy sau Nginx/ingress, proxy phải hỗ trợ WebSocket upgrade:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Nếu dùng nhiều BFF instances và vẫn cho phép HTTP long-polling, cần sticky session. Socket.IO docs cảnh báo nếu không sticky, client có thể gặp HTTP 400 `Session ID unknown` vì các polling request của cùng session bị route sang instance khác.

Hai hướng triển khai:

| Hướng                                            | Khi dùng                               | Lưu ý                                                         |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------- |
| Giữ polling fallback + sticky session            | Muốn tương thích mạng/proxy tốt hơn.   | Load balancer phải dính phiên theo IP/cookie/consistent hash. |
| Chỉ dùng WebSocket transport sau khi đã kiểm thử | Muốn tránh yêu cầu sticky cho polling. | Có thể kém tương thích hơn ở vài môi trường chặn WebSocket.   |

QRTable hiện staff/KDS hook khai báo:

```ts
transports: ['websocket', 'polling'];
```

Customer hook để default transport behavior của Socket.IO client. Khi deploy production, cần test cả hai app qua cùng proxy thật.

### 9.6 CORS và credentials

Gateway hiện mở:

```ts
cors: {
  origin: '*';
}
```

Production nên chuyển sang allowlist:

```txt
https://management.example.com
https://customer.example.com
```

Nếu sau này dùng cookie credentials cho socket, không thể dùng `origin: '*'` kèm credentials. Hiện QRTable truyền token/session qua `auth`, nên không dựa vào cookie Socket.IO credentials.

### 9.7 Conflict thường gặp

| Conflict                                   | Dấu hiệu                                                     | Cách xử lý                                                                      |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Redis down                                 | BFF startup lỗi hoặc realtime multi-instance không fan-out.  | Kiểm tra `REDIS_HOST`, `REDIS_PORT`, container Redis.                           |
| Socket connect được nhưng không nhận event | Client vào sai room hoặc server emit room khác.              | Kiểm tra auth handshake, role, session cache, room trong `RealtimeAuthService`. |
| Nhận event nhưng UI không đổi              | Query key invalidate sai hoặc snapshot không refetch active. | Kiểm tra hook, TanStack Query key, Network REST request sau event.              |
| Nhận event tenant/station khác             | FE thiếu filter hoặc server emit nhầm room.                  | Filter bắt buộc theo tenant/session/station; rà `RealtimeEventsService`.        |
| Reconnect xong UI cũ                       | Hook không invalidate khi reconnect/focus/visibility.        | Refetch active domain sau connect/reconnect/tab visible.                        |
| Duplicate listeners                        | Event handler bị gọi nhiều lần sau reconnect/mount lại.      | Không đăng ký listener trong `connect`; cleanup `socket.off`.                   |
| `events.authError`                         | Token/session thiếu, expired, forbidden station.             | Kiểm tra `auth.token`, `tenantId/sessionId`, session Redis, role.               |
| HTTP 400 `Session ID unknown` khi scale    | Long-polling request bị route sai instance.                  | Bật sticky session hoặc cân nhắc WebSocket-only sau test.                       |
| Event phát trước khi state sẵn sàng        | UI refetch nhưng chưa thấy dữ liệu mới.                      | Chỉ emit sau TCP success hoặc sau Kitchen ghi Redis xong.                       |
| Dùng Kafka để phát mọi UI event            | Hệ thống phức tạp, delay, race, consumer không cần thiết.    | Dùng BFF Direct nếu BFF đã có kết quả command.                                  |

### 9.8 Quy tắc đặt tên event mới

Nếu thêm event mới, cần chốt spec trước:

1. Event thuộc domain nào?
2. Source of truth ở service nào?
3. Event phát sau commit nào?
4. Room nào nhận?
5. Payload tối thiểu để filter/invalidate là gì?
6. FE refetch query key nào?
7. Có fallback polling/reconnect không?
8. Có cần Kafka/outbox thay vì WebSocket không?

Tên event hiện có dùng style:

```txt
events.orderCreated
events.kdsQueueChanged
tenant.suspended
```

Không tự thêm nhiều biến thể tên cho cùng một nghĩa.

---

## 10. Gỡ lỗi local

### 10.1 Checklist nhanh

1. BFF có chạy ở `http://localhost:3300/api/v1` không?
2. Redis có chạy ở `localhost:6379` không?
3. Frontend env có đúng BFF URL không?
4. Socket URL thực tế có phải `http://localhost:3300/orders` không?
5. Staff có access token không?
6. Customer có `tenantId` và `sessionId` đã join session thành công không?
7. BFF log có `WS rejected` hoặc auth error không?
8. Network tab có request `socket.io` không?
9. Sau event, REST query có refetch không?
10. Payload có đúng `tenantId`, `sessionId`, `station` không?

### 10.2 Debug từ browser DevTools

Trong tab Network:

- Lọc `socket.io`.
- Kiểm tra namespace `/orders`.
- Kiểm tra transport là `websocket` hoặc `polling`.
- Nếu reconnect liên tục, xem response/status.
- Nếu event đến nhưng UI không đổi, kiểm tra REST request ngay sau event.

Trong console, không nên tự emit `join.staff` hoặc `join.session`, vì gateway hiện reject legacy join.

### 10.3 Debug backend

Các điểm cần xem:

```txt
apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts
apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts
apps/bff/src/app/modules/realtime/services/realtime-events.service.ts
apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts
apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts
```

Nếu socket bị từ chối:

- Staff: kiểm tra JWT, Authorizer, tenant claim hoặc `x-tenant-id` fallback.
- Customer: kiểm tra session Redis key còn tồn tại.
- KDS: kiểm tra role và `station`.

Nếu event không phát:

- Kiểm tra controller có gọi `RealtimeEventsService` sau TCP success không.
- Kiểm tra Kafka bridge có consume topic đúng không.
- Kiểm tra Kitchen có publish `realtime:kds:*` sau khi ghi Redis không.

### 10.4 Debug Redis Adapter

Redis Adapter cần hai client:

- publisher client.
- subscriber client.

Nếu multi-instance không nhận chéo:

1. Kiểm tra tất cả BFF instances dùng cùng Redis.
2. Kiểm tra Redis không bị network partition.
3. Kiểm tra room emit xảy ra ở instance nào.
4. Kiểm tra client nhận đang connect vào instance khác.
5. Kiểm tra proxy/sticky session nếu polling còn bật.

### 10.5 Debug KDS realtime

KDS đúng khi:

```txt
Kitchen ghi Redis ticket/queue/revision
  -> Kitchen publish realtime:kds:{tenantId}
  -> BFF subscriber nhận KdsQueueChangedEvent
  -> BFF emit events.kdsQueueChanged vào station room
  -> useKdsRealtime filter tenant/station
  -> invalidate kdsKeys.queue(tenantId, station)
  -> REST GET /admin/kds/queue?station=...
```

Nếu thiếu bước nào, không sửa bằng cách cho frontend tự đoán queue state. Sửa đúng source tương ứng.

### 10.6 Debug payment completed realtime

Payment completed hint đúng khi:

```txt
Payment publish payment.completed
  -> BFF Kafka bridge consume
  -> BFF gọi Order BILL_GET_PAYMENT_SNAPSHOT
  -> lấy sessionId
  -> emit events.paymentCompleted
  -> PWA/POS invalidate bill/payment/order
```

Nếu không có `sessionId`, BFF bridge sẽ không emit và log warning. Khi đó UI vẫn phải đúng nhờ polling/refetch payment state.

---

## 11. Khi không dùng WebSocket

### 11.1 Không dùng WebSocket cho command nghiệp vụ hiện tại

Không dùng WebSocket để:

- Submit order.
- Confirm/cancel order.
- Start/done/recall KDS ticket.
- Transfer table.
- Confirm cash payment.
- Change tenant status.

Các command này cần guard, DTO validation, service owner transaction, audit và idempotency. Chúng đang đi qua REST BFF -> TCP service.

### 11.2 Không dùng WebSocket thay Kafka

Nếu một service cần phản ứng nghiệp vụ sau khi service khác commit, dùng Kafka/outbox.

Ví dụ đúng:

```txt
Order confirmed -> Kafka order.confirmed -> Kitchen creates KDS tickets
```

Ví dụ không nên:

```txt
Order confirmed -> WebSocket event -> Kitchen somehow listens from browser channel
```

WebSocket là edge UI, không là message bus backend.

### 11.3 Không dùng WebSocket thay Redis

Nếu cần runtime state nhanh cho KDS queue, lock, cache hoặc quota, dùng Redis. Socket.IO event chỉ thông báo rằng state đó đổi.

Ví dụ:

```txt
KDS queue state: Redis
KDS queue changed hint: Socket.IO
```

### 11.4 Không dùng WebSocket để che lỗi source of truth

Nếu REST snapshot trả sai, đừng sửa bằng cách patch UI từ payload realtime. Phải sửa service owner hoặc query contract.

Payload realtime chỉ được patch nhẹ UI nếu:

- Không ảnh hưởng correctness.
- Snapshot refetch vẫn chạy.
- Có filter tenant/session/station đầy đủ.

---

## 12. Đọc code ở đâu

### 12.1 Backend BFF realtime

| File                                                                           | Nội dung cần đọc                                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `apps/bff/src/main.ts`                                                         | Đăng ký `RedisIoAdapter` cho WebSocket.                                       |
| `apps/bff/src/app/modules/realtime/realtime.module.ts`                         | Module wiring: gateway, auth, events, Kafka bridge, Redis subscriber.         |
| `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`           | Namespace `/orders`, connection auth, legacy join rejection, `subscribe.kds`. |
| `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`          | Staff/customer handshake, token/session verification, server-derived rooms.   |
| `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`        | Mapping event -> room -> event name.                                          |
| `apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.ts`               | Socket.IO Redis Adapter setup.                                                |
| `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts` | Redis Pub/Sub `realtime:kds:*` -> KDS WebSocket hints.                        |
| `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`  | Kafka `kitchen.sla_warning` và `payment.completed` bridge.                    |

### 12.2 Backend emit call sites

| File                                                                      | Events liên quan                             |
| ------------------------------------------------------------------------- | -------------------------------------------- |
| `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts` | Cart, order created/status, service, bill.   |
| `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`    | Staff order status, service, cart, transfer. |
| `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`      | Kitchen item ready, order status sync.       |
| `apps/bff/src/app/modules/saas/controllers/admin-tenants.controller.ts`   | Tenant lifecycle events.                     |

### 12.3 Frontend hooks

| File                                                                        | Nội dung cần đọc                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts` | Customer session socket, tenant lifecycle, query invalidation. |
| `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts`  | Staff POS socket, order/service/bill/payment invalidation.     |
| `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts`            | KDS station socket, station filter, `subscribe.kds`.           |

### 12.4 Shared types và specs

| File                                                 | Nội dung cần đọc                                     |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `libs/shared/types/src/lib/realtime-events.types.ts` | Direct order/session/payment realtime payloads.      |
| `libs/shared/types/src/lib/kds.types.ts`             | KDS queue, item ready, SLA warning contracts.        |
| `docs/specs/business-logic-step-2.7-spec.vi.md`      | Contract realtime FE/BE chính thức.                  |
| `docs/phases/phase-2b-kitchen-websocket.md`          | Phase record sau triển khai/audit.                   |
| `docs/guides/redis-qrtable.md`                       | Redis KDS state, Pub/Sub, Socket.IO adapter context. |
| `docs/guides/kafka-qrtable.md`                       | Domain event vs UI hint boundary.                    |

---

## 13. Checklist

### Khi thêm event realtime mới

- [ ] Đã xác định source of truth là service nào.
- [ ] Event chỉ phát sau khi trạng thái backend đã commit hoặc snapshot đã sẵn sàng.
- [ ] Đã chọn đúng channel: REST, Socket.IO, Kafka, Redis Pub/Sub hay polling.
- [ ] Room nhận event được server suy ra, không lấy room name từ client.
- [ ] Payload có đủ `tenantId` và field filter cần thiết.
- [ ] Frontend filter tenant/session/station trước khi invalidate.
- [ ] Frontend refetch REST snapshot, không render state quan trọng chỉ từ payload.
- [ ] Reconnect/focus/tab wake đều dẫn tới refetch active domain cần thiết.
- [ ] Cleanup listener đầy đủ bằng `socket.off`.
- [ ] Multi-instance path đã xét Redis Adapter và sticky session nếu còn polling.

### Khi debug bug realtime

- [ ] Xác định bug nằm ở command, event emit, room, client listener, query invalidation hay REST snapshot.
- [ ] Kiểm tra BFF log `WS rejected` hoặc Kafka/Redis bridge warning.
- [ ] Kiểm tra Network tab có socket connect đúng `/orders`.
- [ ] Kiểm tra event payload đúng tenant/session/station.
- [ ] Kiểm tra REST refetch sau event.
- [ ] Nếu snapshot đúng nhưng UI sai, debug frontend render/cache.
- [ ] Nếu snapshot sai, debug service owner thay vì patch bằng WebSocket payload.

### Khi deploy production

- [ ] BFF public origin đúng cho cả REST và Socket.IO.
- [ ] Proxy hỗ trợ WebSocket upgrade.
- [ ] CORS gateway giới hạn theo domain thật.
- [ ] Redis Adapter nối cùng Redis cho mọi BFF instances.
- [ ] Nếu còn polling fallback và chạy nhiều instances, load balancer có sticky session.
- [ ] Reconnect/degraded UX đã kiểm thử với mất mạng, refresh tab, sleep/wake.
- [ ] Không claim durable replay nếu chưa thiết kế và test rõ ràng.
