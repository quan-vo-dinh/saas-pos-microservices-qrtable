# Hướng Dẫn Kafka Trong QRTable

> **Vai trò:** Tài liệu hỗ trợ (supporting guide), không phải nguồn sự thật chính (canonical source).
> Khi cần trạng thái kiến trúc hiện tại, ưu tiên [`../technical-architecture.md`](../technical-architecture.md), [`../business-logic.md`](../business-logic.md), phase/spec liên quan và code trên `main`.
>
> **Mục tiêu:** Giải thích Kafka vừa đủ để đọc, vận hành và mở rộng những gì QRTable đang dùng. Tài liệu này cố ý không đi sâu thành giáo trình Kafka tổng quát.
>
> **Trạng thái code hiện tại (2026-05-14):** Các bên đọc Kafka (Kafka consumers) đã có trong code gồm `order.confirmed -> Kitchen`, `payment.completed -> Order + BFF realtime bridge`, `kitchen.sla_warning -> BFF realtime bridge`, và `tenant.created -> Catalog`. Notification Service chưa tồn tại trong `apps/*`; các ví dụ Notification là mở rộng tương lai (Phase 4C+/future extension).

---

## Mục Lục

1. [Đọc nhanh](#1-đọc-nhanh)
2. [Kafka giải quyết gì trong QRTable](#2-kafka-giải-quyết-gì-trong-qrtable)
3. [Nguyên tắc lựa chọn Kafka](#3-nguyên-tắc-lựa-chọn-kafka)
4. [Các topic hiện tại](#4-các-topic-hiện-tại)
5. [Các luồng chính](#5-các-luồng-chính)
6. [Lý thuyết vừa đủ](#6-lý-thuyết-vừa-đủ)
7. [Quy tắc thiết kế event](#7-quy-tắc-thiết-kế-event)
8. [Khi không dùng Kafka](#8-khi-không-dùng-kafka)
9. [Hướng dẫn cấu hình, triển khai và conflict Kafka](#9-hướng-dẫn-cấu-hình-triển-khai-và-conflict-kafka)
10. [Đọc code ở đâu](#10-đọc-code-ở-đâu)
11. [Checklist](#11-checklist)

---

## 1. Đọc nhanh

Kafka trong QRTable dùng cho **sự kiện nghiệp vụ (domain event)** đã xảy ra và cần service khác xử lý bất đồng bộ. Kafka không dùng để thay thế mọi lời gọi TCP (TCP call), không dùng để đẩy mọi sự kiện giao diện (UI event), và không dùng để client nhận dữ liệu realtime trực tiếp.

Một câu dễ nhớ:

```txt
Service A ghi dữ liệu của mình xong
  -> ghi sự kiện outbox (outbox event) cùng giao dịch DB (transaction)
  -> tiến trình phát outbox (publisher) gửi Kafka
  -> Service B đọc (consume) và xử lý phần nghiệp vụ của mình
```

### Thuật ngữ tối thiểu

| Thuật ngữ                              | Nghĩa trong QRTable                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Kafka                                  | Hệ thống log sự kiện phân tán. QRTable dùng để truyền sự kiện nghiệp vụ (domain event) giữa service.                    |
| Topic (kênh sự kiện)                   | Tên luồng sự kiện, ví dụ `order.confirmed`, `payment.completed`.                                                        |
| Event / message (sự kiện / thông điệp) | Nội dung JSON (payload) được gửi vào topic.                                                                             |
| Producer (bên phát sự kiện)            | Service ghi event vào Kafka, ví dụ Order Service phát `order.confirmed`.                                                |
| Consumer (bên đọc sự kiện)             | Service đọc event từ Kafka, ví dụ Kitchen đọc `order.confirmed`.                                                        |
| Consumer group (nhóm consumer)         | Tên logic của một nhóm đọc. Mỗi service/role nên có group riêng.                                                        |
| Partition (phân vùng)                  | Đơn vị chia nhỏ topic để giữ thứ tự và mở rộng tải (scale). QRTable dùng `tenantId` làm khóa phân vùng (partition key). |
| Offset (vị trí đã đọc)                 | Dấu mốc Kafka lưu để biết consumer đã đọc tới đâu.                                                                      |
| Outbox (bảng chờ phát event)           | Bảng DB ghi ý định phát Kafka trong cùng transaction nghiệp vụ.                                                         |
| At-least-once (ít nhất một lần)        | Event có thể được giao lặp. Consumer phải xử lý idempotent (không tạo tác dụng phụ trùng).                              |
| BFF Direct (BFF xử lý trực tiếp)       | BFF gọi service qua TCP/HTTP, nhận kết quả rồi phát tín hiệu WebSocket (WebSocket hint) nếu cần. Không đi qua Kafka.    |

---

## 2. Kafka giải quyết gì trong QRTable

QRTable là hệ thống nhiều service độc lập (microservice). Một hành động nghiệp vụ thường có tác dụng phụ (side effect) ở service khác.

Ví dụ: Staff xác nhận order.

- Order Service sở hữu trạng thái đơn hàng.
- Kitchen Service sở hữu phiếu bếp KDS (KDS ticket).
- BFF chỉ gửi tín hiệu realtime (realtime hint) cho frontend tải lại dữ liệu (refetch).

Nếu Order gọi trực tiếp Kitchen trong cùng request, Order bị phụ thuộc vào Kitchen. Nếu Kitchen đang chậm hoặc restart, việc xác nhận order bị ảnh hưởng. Kafka giúp tách hai việc:

```txt
Order xác nhận đơn thành công
  -> phát event order.confirmed
  -> Kitchen đọc event khi sẵn sàng
  -> Kitchen tạo ticket bếp theo logic riêng
```

Kafka phù hợp khi có ít nhất một điều kiện sau:

- Event kích hoạt logic nghiệp vụ (business logic) ở ngữ cảnh nghiệp vụ (bounded context) khác.
- Bên phát (producer) không nên chờ bên đọc (consumer) xử lý xong.
- Một event cần nhiều bên đọc (consumer) độc lập.
- Event sinh từ worker/timer nội bộ, không có HTTP request gốc để trả response.

Kafka không phải mục tiêu tự thân. Nếu BFF đã có đủ dữ liệu sau response TCP để phát tín hiệu realtime (realtime hint), dùng BFF Direct.

---

## 3. Nguyên tắc lựa chọn Kafka

QRTable dùng bộ quy tắc 4P + 2AP để quyết định khi nào dùng Kafka. Đây là phần lý thuyết quan trọng nhất của guide: Kafka không chỉ là công cụ gửi thông điệp (message), mà là quyết định về mức phụ thuộc (coupling), độ tin cậy (reliability), quyền sở hữu nghiệp vụ (ownership), và độ phức tạp vận hành.

### 3.1 Bốn tín hiệu nên dùng Kafka

| Mã  | Nguyên tắc                                                              | Dùng khi nào                                                                                             | Ví dụ trong QRTable                                                                                               |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| P1  | Phản ứng nghiệp vụ khác bounded context (cross-context domain reaction) | Một thay đổi ở service A cần service B chạy logic nghiệp vụ độc lập.                                     | `order.confirmed` làm Kitchen tạo KDS ticket.                                                                     |
| P2  | Tách thời gian xử lý (temporal decoupling)                              | Bên phát (producer) không nên chờ bên đọc (consumer) xử lý xong, hoặc event sinh từ worker/timer nội bộ. | `kitchen.sla_warning` sinh từ SLA worker, BFF chỉ bridge realtime.                                                |
| P3  | Một event, nhiều consumer nghiệp vụ (domain event fan-out)              | Một event cần nhiều bounded context xử lý theo cách riêng.                                               | `payment.completed` được Order xử lý bill/session và BFF bridge realtime; Notification có thể tham gia Phase 4C+. |
| P4  | Chống lệch DB và Kafka (atomicity safeguard / outbox)                   | Event là kết quả của DB write; phải ghi outbox cùng transaction để không mất event sau commit.           | Order/Payment/SaaS ghi outbox trước khi publisher gửi Kafka.                                                      |

P1 là lý do nghiệp vụ mạnh nhất. Nếu chỉ có UI cần cập nhật, chưa đủ để dùng Kafka. P4 là điều kiện an toàn: một khi đã quyết định dùng Kafka cho event sinh từ DB write, phải nghĩ tới outbox.

### 3.2 Hai dấu hiệu không nên dùng Kafka

| Mã  | Anti-pattern                                                                | Tránh vì sao                                                                                        | Ví dụ trong QRTable                                                   |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| AP1 | Dùng Kafka như proxy cho UI (Kafka as UI proxy)                             | Thêm độ trễ, xử lý trùng lặp (duplicate handling) và hạ tầng nhưng không tạo giá trị nghiệp vụ mới. | `cart.updated`, `bill.requested`, `table.transferred`, menu mutation. |
| AP2 | Dùng lời gọi đồng bộ cho việc không cần response (sync for fire-and-forget) | Producer bị kẹt bởi consumer, dễ tạo mức phụ thuộc (coupling) không cần thiết.                      | SLA warning không nên gọi sync sang BFF.                              |

AP1 là lỗi dễ gặp nhất: thấy có "event" là muốn đưa vào Kafka. Trong QRTable, nhiều event chỉ là tín hiệu UI. Nếu BFF đã có response từ TCP/HTTP và chỉ cần WebSocket hint, BFF Direct là đủ.

### 3.3 Câu hỏi quyết định

```txt
1. Event này có cần service khác chạy logic nghiệp vụ không?
   Có  -> Kafka có thể phù hợp (P1).
   Không -> BFF Direct / WebSocket hint / cache invalidation thường đủ (AP1).

2. Producer có cần kết quả xử lý ngay không?
   Có  -> dùng TCP/HTTP command đồng bộ.
   Không -> Kafka có thể phù hợp nếu muốn tách thời gian xử lý (P2).

3. Event này có nhiều consumer độc lập không?
   Có  -> Kafka phù hợp hơn gọi trực tiếp từng consumer (P3).

4. Event sinh ra sau DB write không?
   Có  -> ghi outbox cùng DB transaction rồi publish sau (P4).
```

### 3.4 Kafka đổi lại điều gì

Kafka giúp giảm coupling giữa producer và consumer, cho phép consumer đọc theo tốc độ riêng, hỗ trợ fan-out, và giảm rủi ro mất event khi đi cùng outbox. Nhưng Kafka cũng tạo chi phí: phải quản lý topic, consumer group, duplicate event, schema version, retry, observability và hạ tầng broker.

Vì vậy nguyên tắc của QRTable là: **dùng Kafka cho sự kiện nghiệp vụ liên service (cross-service domain event), không dùng Kafka cho UI hint thuần.**

### 3.5 Kafka, TCP và BFF Direct khác nhau thế nào

| Cách giao tiếp            | Khi dùng                                                                                      | Không nên dùng khi                                                |
| ------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TCP/HTTP command đồng bộ  | Caller cần kết quả ngay để trả response hoặc tiếp tục transaction.                            | Task dài, consumer có thể down, hoặc producer không cần response. |
| Kafka event bất đồng bộ   | Event đã xảy ra, consumer xử lý độc lập, cần tách thời gian hoặc fan-out.                     | Chỉ cần cập nhật UI/cache sau response.                           |
| BFF Direct/WebSocket hint | BFF đã có đủ dữ liệu sau command và chỉ cần báo frontend refetch.                             | Có business logic thật ở service khác.                            |
| Redis Pub/Sub nội bộ      | Cần tín hiệu runtime nhanh giữa service và BFF, có thể mất message nhưng client refetch được. | Cần durability/replay như Kafka.                                  |

---

## 4. Các topic hiện tại

| Topic (kênh sự kiện)  | Producer (bên phát)          | Consumer (bên đọc) hiện tại                            | Nguyên tắc     | Lý do dùng Kafka                                                                                 |
| --------------------- | ---------------------------- | ------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------ |
| `order.confirmed`     | Order Service                | Kitchen Service                                        | P1, P2, P4     | Kitchen tạo phiếu bếp KDS sau khi Order confirm thành công; Order không chờ Kitchen.             |
| `payment.completed`   | Payment Service              | Order Service, BFF realtime bridge                     | P1, P2, P3, P4 | Order hoàn tất bill/session/table; BFF gửi tín hiệu realtime; Notification receipt là Phase 4C+. |
| `kitchen.sla_warning` | Kitchen Service              | BFF realtime bridge                                    | P2             | SLA warning sinh từ worker nội bộ của Kitchen, không có HTTP caller.                             |
| `tenant.created`      | SaaS Service                 | Catalog Service                                        | P1, P3, P4     | Catalog seed default area cho tenant mới; welcome email là Phase 4C+.                            |
| `payment.refunded`    | Contract của Payment Service | Chưa là consumer runtime chính trong `apps/*` hiện tại | P1, P3, P4     | Dành cho refund/audit/notification sau này; giữ như contract, không xem là luồng core đang chạy. |

Các sự kiện giao diện (UI events) như `cart.updated`, `order.status_changed`, `bill.requested`, `table.transferred`, `service.requested` không phải Kafka topic. Chúng là sự kiện realtime (realtime events) qua BFF Direct/WebSocket.

Menu mutation hiện tại cũng không có Kafka/WS `menu.updated`; luồng ghi (write path) chỉ xóa cache/query cũ (invalidate) để client tải lại dữ liệu (refetch).

---

## 5. Các luồng chính

### 5.1 Order confirm -> Kitchen KDS

```txt
Staff xác nhận order
  -> BFF gọi Order TCP
  -> Giao dịch DB của Order (transaction):
       - đổi order sang PROCESSING
       - deduct stock qua Catalog
       - ghi outbox event order.confirmed
  -> Tiến trình phát outbox (outbox publisher) gửi Kafka order.confirmed
  -> Kitchen consumer (bên đọc) đọc event
  -> Kitchen tạo Redis KDS ticket theo station
  -> Kitchen phát Redis Pub/Sub realtime:kds:{tenantId}
  -> BFF emit events.kdsQueueChanged
  -> KDS client refetch snapshot
```

Điểm quan trọng:

- Order Service không biết Kitchen lưu ticket như thế nào.
- Kitchen phải xử lý lặp an toàn (idempotent), vì Kafka có thể giao event lại.
- BFF không emit queue changed trực tiếp từ `order.confirmed`; nếu làm vậy sẽ có tranh chấp thời điểm (race) với Redis KDS write.

### 5.2 Payment completed -> Order + BFF

```txt
Payment nhận tín hiệu đã thanh toán
  -> Giao dịch DB của Payment (transaction):
       - ghi payment PAID
       - ghi outbox event payment.completed
  -> Tiến trình phát outbox (outbox publisher) gửi Kafka payment.completed
  -> Order consumer (bên đọc) mark bill/session/table paid theo cách idempotent
  -> BFF realtime bridge bổ sung session data
  -> BFF emit events.paymentCompleted
```

Điểm quan trọng:

- Payment không trực tiếp sở hữu việc đóng session/table.
- Order vẫn là nơi áp dụng finalization (hoàn tất bill/session).
- BFF chỉ bridge sang tín hiệu realtime (realtime hint); frontend vẫn nên refetch nguồn dữ liệu chính.

### 5.3 Kitchen SLA warning -> BFF

```txt
Kitchen SLA worker phát hiện ticket quá hạn
  -> Kitchen publish Kafka kitchen.sla_warning
  -> BFF realtime bridge consume
  -> BFF emit events.kitchenSlaWarning / queue invalidation hint
```

Điểm quan trọng:

- Event này sinh từ worker nội bộ, không phải từ request của người dùng.
- Kafka giúp BFF nhận warning mà Kitchen không phải gọi trực tiếp BFF.

### 5.4 Tenant created -> Catalog seed

```txt
SaaS onboarding tạo tenant
  -> SaaS transaction ghi tenant/subscription/outbox
  -> Tiến trình phát outbox của SaaS gửi tenant.created
  -> Catalog consumer (bên đọc) tạo default area "Khu vực chung"
```

Điểm quan trọng:

- SaaS không cần biết chi tiết Catalog seed dữ liệu.
- Catalog consumer phải xử lý lặp an toàn (idempotent) để duplicate `tenant.created` không tạo trùng area.

---

## 6. Lý thuyết vừa đủ

### 6.1 Topic, event, payload

Topic (kênh sự kiện) là tên dòng sự kiện. Payload (nội dung event) nên tự đủ thông tin để consumer xử lý mà không cần hỏi lại producer quá nhiều.

Ví dụ `order.confirmed` cần có:

- `eventId`: ID duy nhất để chống xử lý trùng (dedupe).
- `schemaVersion`: phiên bản schema.
- `tenantId`: bắt buộc để tách tenant.
- `orderId`, `sessionId`, `tableId`.
- Items với station snapshot tại thời điểm confirm.

### 6.2 Partition key là `tenantId`

Partition (phân vùng) ảnh hưởng đến thứ tự đọc event. QRTable dùng `tenantId` làm khóa phân vùng (partition key) để các event cùng tenant có xu hướng giữ thứ tự tương đối trong cùng partition.

Không dùng key ngẫu nhiên nếu event cùng tenant cần xử lý theo trình tự. Không dùng key quá hẹp như `orderId` nếu mục tiêu là giữ ordering theo tenant.

### 6.3 Consumer group

Consumer group (nhóm consumer) là danh tính logic của bên đọc. Mỗi vai trò đọc cần group riêng.

Ví dụ:

| Group                                   | Vai trò                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `kitchen-service-group`                 | Kitchen đọc `order.confirmed`.                                          |
| `order-payment-consumer-group`          | Order đọc `payment.completed`.                                          |
| `bff-kafka-bridge`                      | BFF bridge `payment.completed` và `kitchen.sla_warning` sang WebSocket. |
| `catalog-tenant-created-consumer-group` | Catalog seed default area từ `tenant.created`.                          |

Nếu hai service dùng chung group khi không nên dùng chung, một service có thể "ăn mất" message của service còn lại.

### 6.4 At-least-once và idempotency

QRTable chấp nhận kiểu giao event ít nhất một lần (at-least-once delivery). Nghĩa là consumer có thể nhận cùng một event nhiều lần.

Consumer phải xử lý lặp an toàn (idempotent):

- Kitchen không tạo duplicate KDS ticket cho cùng `(tenantId, orderId, station)` hoặc cùng `eventId`.
- Catalog không tạo duplicate default area khi nhận duplicate `tenant.created`.
- Order mark bill paid phải an toàn nếu nhận lại `payment.completed`.

### 6.5 Outbox

Không nên làm:

```txt
1. Ghi DB thành công
2. Gửi Kafka trực tiếp
```

Nếu bước 2 fail, DB đã đổi nhưng event mất. QRTable dùng outbox (bảng chờ phát event):

```txt
1. Trong cùng DB transaction:
     - ghi thay đổi nghiệp vụ
     - ghi outbox row
2. Background publisher đọc outbox row và gửi Kafka
3. Gửi thành công thì mark published
```

Outbox không làm hệ thống "đúng một lần tuyệt đối" (exactly-once) tuyệt đối, nhưng giảm rủi ro ghi hai nơi không đồng bộ (dual-write) và phù hợp với scope hiện tại.

### 6.6 Những phần không cần đi sâu trong guide này

Tài liệu này không giải thích sâu các chủ đề như nhân bản broker (broker replication), replica đang đồng bộ (ISR), đoạn log lưu trữ (log segment), thuật toán chia lại partition (rebalance algorithm), hay giao dịch Kafka đúng một lần (Kafka transaction exactly-once). Chúng quan trọng khi vận hành Kafka production ở quy mô lớn, nhưng không phải phần cần nắm để hiểu QRTable hiện tại.

---

## 7. Quy tắc thiết kế event

### 7.1 Event phải là chuyện đã xảy ra

Tên event nên ở thì quá khứ:

- Đúng: `order.confirmed`, `payment.completed`, `tenant.created`.
- Tránh: `confirm.order`, `create.tenant`.

Event không phải lệnh (command). Command yêu cầu service khác làm việc ngay; event chỉ thông báo rằng một việc đã hoàn tất.

### 7.2 Payload phải có tenant scope

Mọi event liên service (cross-service) phải có `tenantId`. Consumer phải dùng `tenantId` trong truy vấn DB (DB query), Redis key và WebSocket room.

Không được xử lý event bằng ID trần mà thiếu tenant scope.

### 7.3 Payload đủ dùng, không nhồi toàn bộ database

Payload nên đủ cho consumer xử lý nhanh, nhưng không biến Kafka thành bản sao database.

Ví dụ `order.confirmed` nên mang station snapshot và item summary vì Kitchen cần tạo ticket. Nhưng không cần nhồi mọi field nội bộ của Order entity.

### 7.4 Consumer phải kiểm tra schema

Consumer nên bỏ qua hoặc log warning khi:

- Payload không parse được JSON.
- `eventType` không đúng topic.
- Thiếu `tenantId`, `eventId`, hoặc ID nghiệp vụ chính.
- `schemaVersion` không được hỗ trợ.

### 7.5 Không publish trước khi commit DB

Event chỉ được phát khi trạng thái bền vững đã commit. Nếu publish trước commit, consumer có thể đọc event nhưng dữ liệu nguồn chưa tồn tại hoặc bị rollback.

---

## 8. Khi không dùng Kafka

Dùng BFF Direct khi BFF đã có đủ context từ TCP/HTTP response và chỉ cần báo UI refetch.

| Trường hợp                              | Cách xử lý đúng                                                             |
| --------------------------------------- | --------------------------------------------------------------------------- |
| Customer thêm/sửa cart                  | BFF/Order response + tín hiệu realtime nếu cần.                             |
| Staff confirm/cancel/serve order status | BFF Direct cho UI; Kafka chỉ cho `order.confirmed` hậu xử lý Kitchen.       |
| Bill requested                          | BFF Direct/WebSocket hint cho staff.                                        |
| Table transferred                       | Order/Catalog update + tín hiệu realtime từ BFF.                            |
| Service request created/handled         | BFF Direct/WebSocket hint.                                                  |
| Menu mutation                           | Invalidate cache/query; không có contract Kafka/WS `menu.updated` hiện tại. |

Câu hỏi quyết định:

```txt
Side effect này có business logic ở service khác không?
  Có  -> cân nhắc Kafka.
  Không -> BFF Direct hoặc TCP/HTTP bình thường.

Producer có cần chờ kết quả ngay không?
  Có  -> command qua TCP/HTTP.
  Không -> event qua Kafka có thể phù hợp.
```

---

## 9. Hướng dẫn cấu hình, triển khai và conflict Kafka

Phần này giúp đọc được cấu hình Kafka trong repo và hiểu các thông số đủ để vận hành local/dev hoặc thiết kế thêm event mới. QRTable hiện dùng KafkaJS trong service code và Bitnami Kafka chạy KRaft single-node ở local.

### 9.1 Cấu hình local hiện tại

Kafka local nằm trong `docker-compose.provider.yaml`:

```txt
image: bitnamilegacy/kafka
ports:
  9092:9092
  29092:29092
KAFKA_CFG_PROCESS_ROLES=controller,broker
KAFKA_CFG_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://:9093,EXTERNAL://0.0.0.0:29092
KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092,EXTERNAL://localhost:29092
KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true
```

Ý nghĩa các thông số quan trọng:

| Thông số                          | Nghĩa                                                              | QRTable local/dev                              |
| --------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `PROCESS_ROLES=controller,broker` | Chạy Kafka kiểu KRaft, một node vừa làm controller vừa làm broker. | Đủ cho local/dev, không phải production HA.    |
| `LISTENERS`                       | Kafka lắng nghe ở các cổng nội bộ/container/host.                  | Có listener nội bộ `9092` và external `29092`. |
| `ADVERTISED_LISTENERS`            | Địa chỉ Kafka trả cho client để client kết nối lại đúng broker.    | App local dùng `localhost:29092`.              |
| `AUTO_CREATE_TOPICS_ENABLE=true`  | Kafka tự tạo topic khi producer/consumer đụng topic mới.           | Tiện dev; production nên tạo topic rõ ràng.    |
| Volume `/bitnami/kafka`           | Lưu dữ liệu Kafka local.                                           | Giữ log/offset sau restart container.          |

Biến môi trường app:

```txt
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=qrtable-order-service
KAFKA_ORDER_CONFIRMED_TOPIC=order.confirmed
KAFKA_KITCHEN_CLIENT_ID=qrtable-kitchen-service
KAFKA_KITCHEN_CONSUMER_GROUP=kitchen-service-group
KAFKA_BFF_CLIENT_ID=qrtable-bff-bridge
KAFKA_BFF_CONSUMER_GROUP=bff-kafka-bridge
KAFKA_KITCHEN_SLA_WARNING_TOPIC=kitchen.sla_warning
KAFKA_PAYMENT_COMPLETED_TOPIC=payment.completed
KAFKA_PAYMENT_REFUNDED_TOPIC=payment.refunded
KAFKA_PAYMENT_CLIENT_ID=qrtable-payment-service
```

`KAFKA_BROKERS` là danh sách broker client dùng để bootstrap. Nếu chạy app trong container cùng network Docker, giá trị có thể cần là listener nội bộ thay vì `localhost:29092`. Nếu chạy app trực tiếp trên host, `localhost:29092` là đúng với compose hiện tại.

### 9.2 Topic configuration

Theo tài liệu Kafka, topic có thể tạo bằng `kafka-topics.sh` với partitions, replication factor và config:

```bash
kafka-topics.sh --bootstrap-server localhost:29092 \
  --create \
  --topic order.confirmed \
  --partitions 3 \
  --replication-factor 1
```

Trong QRTable local, topic có thể auto-create. Tuy nhiên khi lên staging/production, topic nên được khai báo rõ:

| Config                             | Nghĩa                                                                         | Gợi ý QRTable                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `partitions`                       | Số phân vùng topic. Tăng throughput nhưng mỗi partition chỉ giữ thứ tự riêng. | Bắt đầu nhỏ; tăng khi có tải. Dùng key `tenantId` để giữ ordering tương đối theo tenant.                   |
| `replication.factor`               | Số bản sao của partition trên nhiều broker.                                   | Local single-node = `1`; production nên >= `3` nếu có cluster >= 3 broker.                                 |
| `retention.ms` / `retention.bytes` | Kafka giữ log bao lâu hoặc bao nhiêu dung lượng.                              | Event QRTable hiện không dùng làm audit dài hạn; audit vẫn ở DB. Retention đủ để consumer recover là được. |
| `cleanup.policy`                   | Cách dọn log, thường là `delete` hoặc `compact`.                              | Domain event hiện tại dùng `delete`; không cần compact nếu event không phải latest-state log.              |

Không xem Kafka topic là database lịch sử của QRTable. Nếu cần audit/report, ghi PostgreSQL/audit table ở service sở hữu domain.

### 9.3 Producer configuration

Producer là bên gửi event. Trong QRTable, producer KafkaJS hiện chủ yếu gọi:

```txt
producer.send({
  topic,
  messages: [{ key: tenantId, value: JSON.stringify(payload) }]
})
```

Các khái niệm cần nắm:

| Thông số/khái niệm  | Nghĩa                                             | Cách áp dụng trong QRTable                                                                                    |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Message key         | Kafka dùng key để chọn partition.                 | Dùng `tenantId`/partition key từ outbox để giữ event cùng tenant gần nhau.                                    |
| `acks`              | Producer chờ broker xác nhận đến mức nào.         | KafkaJS default đủ cho local; production nên review `acks=all` và replication/min ISR nếu cần durability cao. |
| Retry               | Producer gửi lại khi broker/network lỗi tạm thời. | Outbox hiện đã có retry ở DB row; không chỉ dựa vào retry client.                                             |
| Idempotent producer | Producer giảm duplicate do retry ở tầng Kafka.    | Hữu ích production, nhưng consumer vẫn phải idempotent vì duplicate vẫn có thể đến từ outbox/retry.           |
| Batch/linger        | Gom message để tăng throughput.                   | Chưa cần tối ưu sâu trong QRTable hiện tại.                                                                   |

Quy tắc quan trọng nhất: producer chỉ gửi event sau khi outbox row đã tồn tại trong DB. Nếu gửi trực tiếp trong request mà không có outbox, rất dễ gặp dual-write problem.

### 9.4 Consumer configuration

Consumer là bên đọc event. Code hiện dùng `fromBeginning: false`, nghĩa là consumer group mới chỉ đọc event mới từ thời điểm subscribe, không đọc lại toàn bộ lịch sử topic.

Các thông số cần hiểu:

| Thông số/khái niệm | Nghĩa                                                                | QRTable                                                            |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `groupId`          | Danh tính nhóm đọc. Kafka chia message giữa các consumer cùng group. | Mỗi vai trò đọc phải có group riêng: Kitchen, Order, BFF, Catalog. |
| Offset             | Vị trí đã đọc của group.                                             | Nếu đổi group ID, consumer có thể đọc như một nhóm mới.            |
| Commit offset      | Ghi lại vị trí đã xử lý.                                             | Nếu handler throw trước commit, message có thể được đọc lại.       |
| `fromBeginning`    | Group mới có đọc từ đầu topic không.                                 | Hiện dùng `false` cho runtime app.                                 |
| Rebalance          | Khi instance consumer join/leave group, Kafka chia lại partition.    | Handler phải không phụ thuộc vào state local khó phục hồi.         |

Không dùng chung group cho hai bounded context khác nhau. Ví dụ Order và BFF đều đọc `payment.completed`, nhưng phải dùng group khác nhau để cả hai đều nhận event.

### 9.5 Local, staging và production

| Môi trường | Cách chạy phù hợp                                                           | Lưu ý                                                    |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| Local/dev  | Single-node KRaft, auto-create topics, PLAINTEXT.                           | Dễ dùng, không đại diện cho production reliability.      |
| Staging    | Tạo topic rõ ràng, tắt auto-create nếu muốn kiểm soát contract.             | Test consumer group, lag, retry, outbox failure.         |
| Production | Multi-broker, replication factor >= 3, monitoring lag, alert broker health. | Cần xem security, ACL, TLS/SASL nếu có dữ liệu nhạy cảm. |

Khi production có nhiều broker, các khái niệm như replication factor, ISR (in-sync replicas), `min.insync.replicas`, ACL và retention trở nên quan trọng hơn. Guide này không đi sâu vận hành Kafka cluster, nhưng đủ để không thiết kế event sai từ code QRTable.

### 9.6 Conflict và failure playbook

| Tình huống                    | Dấu hiệu                                                      | Cách xử lý trong QRTable                                                                                          |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Duplicate event               | Consumer nhận cùng `eventId` hoặc cùng domain id nhiều lần.   | Consumer idempotent: dedupe key, unique constraint, hoặc check trạng thái trước khi ghi.                          |
| Out-of-order event            | Event cùng domain đến không theo thứ tự mong muốn.            | Dùng partition key ổn định (`tenantId`); nếu cần ordering hẹp hơn, cân nhắc key domain nhưng phải hiểu trade-off. |
| Consumer lag                  | UI/side effect đến chậm, offset group tụt xa.                 | Kiểm tra broker, group, handler chậm, downstream TCP/DB. Lag không được làm sai source of truth.                  |
| Poison message                | Một message lỗi parse/schema làm consumer lặp lỗi.            | Validate payload, log warning, bỏ qua event không hợp lệ nếu không thể xử lý; cân nhắc DLQ khi production hóa.    |
| Schema drift                  | Producer thêm/đổi field khiến consumer cũ đọc sai.            | Dùng `schemaVersion`, giữ backward compatibility, không xóa field đang có consumer dùng.                          |
| Publish trước DB commit       | Consumer thấy event nhưng dữ liệu nguồn chưa commit/rollback. | Cấm publish trực tiếp trước commit; dùng outbox.                                                                  |
| Kafka down khi publisher chạy | Outbox rows kẹt `PENDING` hoặc `FAILED`.                      | Publisher retry từ outbox; không mất business state vì DB đã commit.                                              |
| BFF bridge lỗi realtime       | Event đã xử lý nghiệp vụ nhưng UI không nhận hint.            | Frontend vẫn phải refetch/poll được; realtime là hint, không phải source of truth.                                |

### 9.7 Lệnh kiểm tra local

Tên container hiện tại là `kafka_server`.

```bash
# Liệt kê topic
docker exec -it kafka_server kafka-topics.sh --bootstrap-server localhost:9092 --list

# Mô tả topic
docker exec -it kafka_server kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic payment.completed

# Xem consumer groups
docker exec -it kafka_server kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Xem lag của group
docker exec -it kafka_server kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group bff-kafka-bridge
```

Không reset offset hoặc xóa topic nếu chưa chắc môi trường và hậu quả. Với local/dev có thể làm lại dữ liệu, nhưng production phải có kế hoạch rõ ràng.

---

## 10. Đọc code ở đâu

| Nội dung                              | File / thư mục                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Kafka config chung                    | `libs/configuration/src/lib/kafka.config.ts`                                                                                                     |
| Shared event types                    | `libs/shared/types/src/lib/realtime-events.types.ts`, `libs/shared/types/src/lib/payment.types.ts`, `libs/shared/types/src/lib/kds.types.ts`     |
| Order publish `order.confirmed`       | `apps/order/src/app/modules/order/services/order.service.ts`, `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`            |
| Kitchen consume `order.confirmed`     | `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`                                                                      |
| Kitchen publish `kitchen.sla_warning` | `apps/kitchen/src/app/modules/kitchen/services/kitchen-kafka.producer.ts`, `apps/kitchen/src/app/modules/kitchen/services/kitchen-sla.worker.ts` |
| Payment publish `payment.completed`   | `apps/payment/src/app/modules/payment/services/payment-event-builder.ts`                                                                         |
| Order consume `payment.completed`     | `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts`                                                                   |
| BFF Kafka bridge                      | `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`                                                                    |
| SaaS publish `tenant.created`         | `apps/saas/src/repositories/saas-outbox.repository.ts`, `apps/saas/src/services/saas-outbox-publisher.service.ts`                                |
| Catalog consume `tenant.created`      | `apps/catalog/src/app/modules/tenant-events/tenant-created.consumer.ts`                                                                          |

---

## 11. Checklist

Trước khi thêm hoặc sửa Kafka event:

- [ ] Event là sự kiện nghiệp vụ đã xảy ra (domain event), không phải UI hint thuần.
- [ ] Producer ghi outbox cùng transaction với thay đổi DB.
- [ ] Payload có `eventId`, `schemaVersion`, `eventType`, `tenantId`, timestamp và correlation/request id nếu có.
- [ ] Partition key là `tenantId`, trừ khi có lý do rõ ràng khác.
- [ ] Consumer có consumer group riêng theo vai trò.
- [ ] Consumer validate payload và bỏ qua event không hợp lệ.
- [ ] Consumer xử lý lặp an toàn (idempotent) với duplicate event.
- [ ] Topic/group/env được khai báo rõ, không phụ thuộc auto-create ở môi trường nghiêm túc.
- [ ] Đã có kế hoạch xử lý lag, poison message và schema drift nếu event là luồng quan trọng.
- [ ] BFF chỉ bridge sang realtime khi đã đủ dữ liệu và frontend vẫn có đường refetch.
- [ ] Canonical docs/spec được cập nhật nếu event thay đổi business contract.

Khi chỉ cần UI cập nhật:

- [ ] Ưu tiên BFF Direct/WebSocket hint.
- [ ] Không tạo Kafka topic mới chỉ để thay thế response đã có.
- [ ] Không tạo `menu.updated` cho menu mutation hiện tại; invalidate cache/query là đủ.
