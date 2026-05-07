# Bước 2.6 — Kiểm tra kiến trúc và các edge case

> **Phase:** 2B — Kitchen Service + WebSocket Gateway  
> **Ngày:** 2026-05-05  
> **Phạm vi:** chỉ audit logic nghiệp vụ và kiến trúc. Đây **không** phải kế hoạch triển khai.  
> **Cổng dừng (gate):** sau báo cáo này, tạm dừng và chờ quyết định trước khi viết `docs/specs/business-logic-step-2.6-spec.vi.md`.

Tài liệu này dành cho developer Việt Nam: giữ nguyên tên file, topic Kafka, key Redis, và thuật ngữ kỹ thuật phổ biến bằng tiếng Anh khi cần tra cứu code.

---

## 0. Nguồn đã đối chiếu

**Tài liệu chính:**

- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-2a-order-kafka.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/implementation_plan.md`
- `docs/business-logic-step-2.4-spec.vi.md`
- `docs/superpowers/specs/2026-04-28-step-2.4-architecture-decisions.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- Các handoff Step 2.4 và 2.5 trong `docs/superpowers/handoffs/`

**Quét codebase:**

- Phiên Codex này không cấu hình MCP codebase (`list_mcp_resources` / `list_mcp_resource_templates` trống), thực tế code được rà bằng `rg`, `sed`, `ls`.
- Một số file liên quan đã xem qua gồm:
  - `apps/order/src/app/modules/order/services/order.service.ts`
  - `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`
  - `apps/order/src/app/modules/order/order-confirmed-payload.ts`
  - `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
  - `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - `libs/shared/types/src/lib/realtime-events.types.ts`
  - `libs/configuration/src/lib/kafka.config.ts`
  - `libs/providers/redis-client/src/lib/redis-client.service.ts`
  - `libs/guards/src/lib/*.ts`
  - `apps/user-access/src/seeder/role.json`

**Context7 (NestJS):**

- Chạy `npx ctx7@latest library NestJS ...`, chọn `/nestjs/docs.nestjs.com`.
- Chạy `npx ctx7@latest docs /nestjs/docs.nestjs.com ...`.
- Điểm chính: ví dụ Kafka của NestJS cần khai báo rõ `client.clientId`, `client.brokers`, `consumer.groupId`; Socket.IO nhiều instance cần `IoAdapter` tùy chỉnh dùng `@socket.io/redis-adapter`, đăng ký **trước** khi gateway dùng. Adapter chỉ chia sẻ gói Socket.IO giữa các instance; **không** phải replay bền vững.

---

## 1. Tóm tắt điều hành

Step 2.6 **khả thi**, nhưng spec hiện **lẫn ba mô hình thời điểm** khác nhau:

1. Kitchen Service consume `order.confirmed`, ghi trạng thái KDS vào Redis, client KDS đọc hàng đợi hiện tại.
2. Draft cũ cho phép BFF consume trực tiếp `order.confirmed` và đẩy sự kiện WebSocket vào phòng KDS/staff.
3. BFF chỉ phát WebSocket phụ thuộc phản hồi lệnh TCP có thẩm quyền.

Ba mô hình có thể cùng tồn tại, nhưng **thứ tự thao tác** phải được ghi rõ. Điểm mù **nguy hiểm nhất**: nếu BFF phát `order.confirmed` tới KDS **trước** khi Kitchen ghi Redis, client reconnect/refetch có thể nhận gợi ý “ticket mới” rồi load snapshot hàng đợi **rỗng hoặc cũ**.

Điểm mù thứ hai: **ranh giới tin cậy WebSocket**. Code WebSocket BFF hiện chấp nhận `join.staff` với `tenantId` do client gửi và `join.session` với `sessionId` do client gửi. Điều đó chấp nhận được cho realtime hints tối thiểu Step 2.4/2.5, nhưng **không** chấp nhận được cho phòng KDS theo role ở Step 2.6.

Điểm mù thứ ba: **độ bền chỉ dựa Redis**. Kitchen Service cố ý **không** có PostgreSQL; thiết kế key Redis phải gồm retention, dọn dẹp, idempotency, versioning, và **chiến lược rebuild** sau khi Redis restart/flush. “Chỉ Redis” không được hiểu là “trạng thái có thể biến mất im lặng trong lúc demo”.

**Hướng khuyến nghị cho spec cuối:**

- Coi message WebSocket là **gợi ý invalidate**, không bao giờ là nguồn sự thật (source of truth).
- Mọi client KDS/POS/khách khi connect/reconnect phải gọi **REST snapshot** kèm **revision** phía server.
- Kitchen **sở hữu** ghi Redis KDS và expose snapshot hàng đợi có thẩm quyền.
- BFF **sở hữu** xác thực socket và giao phòng (room delivery).
- Thao tác đổi trạng thái KDS nên là lệnh REST/TCP qua guard BFF, **không** phải lệnh WebSocket do client tự gửi.
- Batching/gộp món đã bị superseded bởi decision record Step 2.6 cuối và không được implement dưới bất kỳ tên gọi nào.

---

## 2. Thực tế codebase hiện tại

### Đã có và hỗ trợ Step 2.6

| Lĩnh vực                  | Thực tế hiện tại                                                                                                                                                                     | Vì sao có ích                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Outbox order              | `OutboxPublisherService` poll `outbox_events` mỗi 2s, publish bằng KafkaJS.                                                                                                          | Step 2.6 consume `order.confirmed` mà không cần dual-write trong luồng confirm.     |
| Payload `order.confirmed` | `buildOrderConfirmedKafkaPayload()` có `eventId`, `eventType`, `schemaVersion`, `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, station món, timestamp, `correlationId`. | Đủ để tạo ticket KDS cơ bản mà không phải query Order/Catalog cho routing đơn giản. |
| Station catalog           | `MenuItem.station` có; `VALIDATE_ORDERABLE` trả snapshot station.                                                                                                                    | Khớp quyết định Q11 Step 2.4 và routing chuẩn Step 2.6.                             |
| Redis client              | `libs/providers/redis-client` dùng `ioredis`; Order đã dùng hash/transaction cho cart/session.                                                                                       | Kitchen có thể tái sử dụng hoặc mở rộng cho hash, sorted set, Lua, lock.            |
| Hằng RBAC                 | `KITCHEN_GET_QUEUE`, `KITCHEN_UPDATE_TICKET`, `KITCHEN_RECALL` có; seed role gán cho OWNER/MANAGER/CHEF/BARISTA.                                                                     | Sẵn quyền cho queue/update/recall.                                                  |
| WS tối thiểu              | BFF có gateway Socket.IO `/orders` và service event trực tiếp (cart/order/service/bill/chuyển bàn).                                                                                  | Có điểm bắt đầu nhưng phải **cứng hóa** trước Step 2.6.                             |

### Chưa có

| Phần thiếu              | Bằng chứng                                                                                              | Tác động                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Service `apps/kitchen`  | `ls apps` không có `kitchen`.                                                                           | Chưa có consumer Kafka, owner Redis KDS, API lệnh KDS.                                                     |
| Cấu hình consumer Kafka | `kafka.config.ts` chỉ expose `ORDER_CONFIRMED_TOPIC`; chưa có consumer group hay topic khác.            | Step 2.6 cần `kitchen-service-group`, nhóm bridge BFF, `kitchen.sla_warning`, sau này `payment.completed`. |
| Redis adapter Socket.IO | `package.json` có `socket.io` nhưng không có `@socket.io/redis-adapter`. Chưa có `IoAdapter` tùy chỉnh. | Scale ngang gateway BFF chưa sẵn sàng.                                                                     |
| WS handshake xác thực   | `join.staff` tin `tenantId`; `join.session` tin `sessionId`.                                            | Có thể join phòng cross-tenant nếu lộ ngoài dev/test.                                                      |
| REST KDS                | TCP constants chưa có nhóm `KITCHEN`; BFF chưa có controller `/kds`.                                    | Endpoint query/start/done/recall/priority vẫn cần quyết định contract.                                     |
| FE KDS thật             | Handoff Step 2.5 giữ mock KDS / hoãn.                                                                   | UI chưa verify semantics hàng đợi thật.                                                                    |

---

## 3. Xung đột và điểm mù

### C01 — Thứ tự: Kafka bridge BFF vs ghi Redis Kitchen

Draft Step 2.6 cũ nói BFF Kafka Consumer Bridge map `order.confirmed` sang phòng KDS/staff. Quyết định cuối supersede điều đó: BFF không emit thay đổi queue KDS trực tiếp từ `order.confirmed`. Kitchen consume `order.confirmed`, ghi Redis ticket trước, rồi publish internal invalidation hint. Nếu BFF và Kitchen tự phát từ cùng Kafka event, hai consumer group khác nhau **không** đảm bảo thứ tự gói.

**Rủi ro:**

- BFF phát `events.kdsQueueChanged`.
- Client KDS refetch ngay.
- Kitchen **chưa** ghi Redis.
- UI thiếu ticket mới cho đến khi có event khác hoặc tới chu kỳ poll.

Đây là vấn đề **đúng đắn dữ liệu**, không chỉ UX. Spec cuối phải quyết định WS hint `order.confirmed` phát **trước hay sau** mutation Redis của Kitchen.

### C02 — Join WebSocket hiện do client điều khiển

Gateway hiện tại:

- `join.staff` vào `tenant:${body.tenantId}:staff`.
- `join.session` vào `session:${body.sessionId}:customer`.

Không có xác thực JWT phía server, không tra session, không kiểm nhất quán tenant, không hạn chế role/station trong gateway. Mâu thuẫn với gán phòng Step 2.6 và mô hình auth toàn cục.

**Bắt buộc cho Step 2.6:**

- Handshake socket staff phải xác thực JWT cùng ranh giới tin cậy với `UserGuard` hoặc dịch vụ auth dùng chung.
- Handshake khách phải xác thực session ID và ràng buộc tenant.
- Phòng phải **do server suy ra** từ token/session, không từ body client.
- CHEF chỉ vào `tenant:{tid}:kds:kitchen`; BARISTA chỉ `tenant:{tid}:kds:bar`.
- OWNER/MANAGER cần quy tắc rõ cho phòng quản lý và (tuỳ chọn) subscription theo trạm.

### C03 — Redis adapter Socket.IO không replay

Context7: Socket.IO đa instance NestJS cần `IoAdapter` + Redis pub/sub. Giải pháp này chỉ **broadcast xuyên instance**, không phải giao hàng bền vững.

**Rủi ro:**

- Client mất kết nối trong lúc `events.kdsQueueChanged` sẽ **không** nhận lại gói đó.
- Reconnect và phòng lại **chưa đủ**.

**Chính sách cần có:**

- Reconnect: client fetch REST snapshot từ Kitchen/Order.
- Payload WS mang `revision` để phát hiện state local cũ.
- Không màn hình nào phụ thuộc “pending events” lưu trong Socket.IO.

### C04 — Registry topic và lệch tên

Doc từng dùng cả tên canonical và một biến thể rút gọn không canonical. Chuẩn trong `technical-architecture.md` và Step 2.6 là `kitchen.sla_warning`.

Code hiện chỉ có `KAFKA_ORDER_CONFIRMED_TOPIC=order.confirmed`.

**Cần:**

- Chuẩn hóa `kitchen.sla_warning`.
- Thêm hằng cấu hình cho `kitchen.sla_warning` và `payment.completed` trước công việc bridge BFF.
- Không thêm topic Kafka nếu chưa được phê duyệt rõ.

### C05 — Đánh dấu priority chưa có permission riêng

Step 2.6: Owner/Manager đánh dấu ưu tiên. Permission có sẵn:

- `kitchen.get_queue`
- `kitchen.update_ticket`
- `kitchen.recall`

Nhưng CHEF/BARISTA cũng có `kitchen.update_ticket`. Nếu priority là “update chung”, đầu bếp/bar có thể **vô tình** có quyền đổi priority.

**Phương án:**

- Thêm `KITCHEN_SET_PRIORITY`.
- Giữ `KITCHEN_UPDATE_TICKET` nhưng **chỉ** OWNER/MANAGER cho phần priority (check role).
- Hoặc cho phép CHEF/BARISTA set ưu tiên cục bộ theo trạm một cách **có chủ đích**.

Cần quyết định vì ảnh hưởng permission matrix và UX.

### C06 — KDS chỉ Redis cần ngữ nghĩa phục hồi

Kitchen theo thiết kế không có DB. Redis là trạng thái vận hành KDS chính, nhưng Redis có thể restart, flush, evict, mất volatile tùy triển khai.

**Điểm mù:**

- Doc nói chỉ Redis nhưng **chưa định nghĩa rebuild**.
- Nếu Redis trống trong khi Order còn đơn `PROCESSING`, hàng đợi Kitchen **sai**.

**Tối thiểu cần:**

- Chính sách Redis production: tránh evict key KDS đang active.
- Đường phục hồi: rebuild ticket active từ Order, hoặc replay Kafka trong retention rồi đối chiếu.
- Health/readiness phải fail hoặc degrade nếu Kitchen không tin tưởng trạng thái KDS sau khởi động.

### C07 — Superseded: Không batching dưới bất kỳ tên gọi nào

Các ghi chú audit cũ từng bàn về quy tắc batching/gộp món. Quyết định Step 2.6 cuối loại bỏ batching hoàn toàn.

**Bắt buộc:**

- Không tạo backend batch key, batch DTO field, batch event, `prepSignature`, grouped active quantity, hoặc cross-order batch total.
- Giữ một KDS ticket cho mỗi `(tenantId, orderId, station)` với trạng thái prep ở mức item.
- Nếu UI cần visual grouping sau này, đó phải là quyết định tương lai riêng và không thay đổi contract backend Step 2.6.

**Khuyến nghị:** loại batching khỏi phạm vi implementation Step 2.6.

### C08 — Mutation nguyên tử vẫn bắt buộc dù không có batch projection

Tạo ticket, chuyển trạng thái, cập nhật queue index, lên lịch SLA, và tăng revision vẫn chạm nhiều Redis key. Các mutation này phải nguyên tử dù không implement batch projection.

**Ví dụ:**

- Duplicate `order.confirmed` tạo cùng station ticket đồng thời.
- Đầu bếp mark done trong lúc worker SLA đang quét.
- Recall hoặc cleanup race với cập nhật queue/index của ticket.

**Cần:**

- Lua hoặc `WATCH`/`MULTI` kèm check revision cho mutation KDS nhiều key.
- Ưu tiên Lua cho chuyển trạng thái vì nhiều key phải nhất quán.

### C09 — Done/Ready phải đồng bộ Order Service

Nghiệp vụ: trạng thái KDS phải khớp những gì khách thấy. Redis Kitchen có thể READY nhưng **Order Service** mới là chủ trạng thái đơn/món cho khách.

**Rủi ro:**

- Kitchen báo READY.
- Cập nhật Order thất bại.
- Khách vẫn thấy PROCESSING.

**Cần:**

- Đường lệnh Done trên BFF nên orchestrate: (1) authorize; (2) chuyển ticket/item Kitchen READY với idempotency key; (3) cập nhật Order qua Order Service; (4) chỉ sau thành công có thẩm quyền mới emit `kitchen.item_ready` / `order.status_changed`.
- Hoặc đảo: Order gọi Kitchen — nhưng **một** service phải sở hữu orchestration và quy tắc bù trừ.

### C10 — Recall cần giữ READY

Step 2.6: Done loại ticket khỏi màn KDS; Recall đưa lại Processing. Nếu xóa READY ngay, **không recall được**.

**Cần:**

- Ticket READY phải còn trong Redis trong **cửa sổ recall**.
- Dùng sorted set `kds:{tid}:station:{station}:READY` hoặc tương đương.
- Dọn sau cửa sổ recall/pickup, không xóa ngay lúc Done.

### C11 — Chuyển bàn sau khi đã có ticket KDS

Transfer Step 2.4 là BFF Direct và **không** thêm topic Kafka. Ticket KDS có `tableId/tableName` denormalized.

**Rủi ro:**

- Nhân viên chuyển session sau khi order đã confirm.
- POS/khách thấy bàn mới.
- KDS vẫn hiện bàn cũ.

**Cần:**

- Spec cuối định nghĩa cách `table.transferred` **patch** ticket Redis KDS đang active.
- Vì không có Kafka topic chuyển bàn, có thể BFF gọi lệnh Kitchen sau transfer thành công, hoặc Kitchen expose `patchTableSnapshotBySession`.

### C12 — Phòng khách chưa gắn tenant

Contract phòng: `session:{sid}:customer`. Chấp nhận được **chỉ khi** session ID khó đoán toàn cục và mọi handshake **xác thực** ràng buộc tenant/session. Yếu hơn so với `tenant:{tid}:session:{sid}:customer` về quan sát và cách ly.

Step 2.6 có thể giữ tên phòng nhưng **bắt buộc** handshake validation và không cho client tự join phòng session tùy ý.

### C13 — Outbox publisher có thể gửi trùng message Kafka

Publisher gửi Kafka rồi mới đánh dấu row published. Nếu Kafka thành công nhưng `markPublished` lỗi, sẽ retry cùng row và publish **duplicate** `order.confirmed` cùng payload/eventId.

Đây là hành vi **at-least-once** bình thường. Kitchen phải dedupe theo `eventId` và nên dedupe theo danh tính ticket xác định `(tenantId, orderId, station)`.

### C14 — Kích hoạt SLA không được phụ thuộc HTTP request

Step 2.6 hỏi `kitchen.sla_warning` kích hoạt thế nào nếu không có request — phải là worker nền/timer trong Kitchen hoặc scheduler hàng đợi bên ngoài.

Kiểm tra theo request **không hợp lệ** vì lúc yên tĩnh mới là lúc cảnh báo SLA bị trễ quan trọng.

### C15 — BFF Direct vs Kafka trùng sự kiện trạng thái khách

Step 2.4 đã emit `order.status_changed` sau staff confirm. Step 2.6: bridge Kafka map cả `order.confirmed`.

**Rủi ro:**

- Khách/POS nhận cả `events.orderStatusChanged` và hint từ `order.confirmed` cho cùng một chuyển trạng thái.

**Cần:**

- Spec tránh dùng Kafka làm proxy UI cho status đã phát trực tiếp từ BFF.
- BFF không được emit thay đổi queue KDS trực tiếp từ `order.confirmed`; Kitchen phải ghi Redis trước rồi publish internal invalidation hint để BFF phát tới KDS rooms.

---

## 4. Bản nháp cấu trúc dữ liệu Redis

Bản nháp giữ tên hàng đợi theo phase doc, bổ sung index cho thao tác không race, SLA, snapshot reconnect, cleanup. Batching/gộp món nằm ngoài phạm vi Step 2.6.

### 4.1 Quy ước đặt tên

Dùng station **chữ hoa** trong payload và key:

- `KITCHEN`
- `BAR`

Alias tương thích tên phase:

- `kds:{tenantId}:kitchen` — hàng hiển thị active cho KITCHEN.
- `kds:{tenantId}:bar` — hàng active cho BAR.

Key nội bộ rõ namespace trạm:

- `kds:{tenantId}:station:{station}:PENDING`
- `kds:{tenantId}:station:{station}:PROCESSING`
- `kds:{tenantId}:station:{station}:READY`

### 4.2 Định danh ticket

Khuyến nghị:

```txt
ticketId = kds_{tenantIdHash}_{orderId}_{station}
```

hoặc ID nội bộ xác định:

```txt
{orderId}:{station}
```

Lý do:

- Retry Kafka xử lý idempotent.
- Một order có hai ticket: một KITCHEN, một BAR.
- Chỉ `orderId` là không đủ khi tách trạm thật.

### 4.3 Điểm số hàng đợi (queue score)

Sorted set: score nhỏ hơn ra trước. Khuyến nghị:

```txt
PRIORITY_BUCKET_FACTOR = 10_000_000_000_000
priorityRank = 0 cho ưu tiên, 1 cho thường
queueScore = priorityRank * PRIORITY_BUCKET_FACTOR + confirmedAtEpochMs
```

Tính chất:

- Ticket ưu tiên luôn trước ticket thường.
- FIFO trong từng bucket ưu tiên.
- Giá trị nằm trong độ chính xác double Redis cho epoch hiện tại.

Nếu muốn “nhảy ưu tiên chỉ trong trạm/ngày”, chọn trong câu hỏi mở.

### 4.4 Key cốt lõi

| Key                                      | Kiểu           | TTL / retention                                  | Mục đích                               |
| ---------------------------------------- | -------------- | ------------------------------------------------ | -------------------------------------- |
| `kds:{tid}:ticket:{ticketId}`            | Hash           | Không TTL khi active; hết hạn 24–48h sau archive | Aggregate root ticket.                 |
| `kds:{tid}:ticket:{ticketId}:items`      | Set            | Giống ticket                                     | ID món trong ticket.                   |
| `kds:{tid}:ticket-item:{ticketItemId}`   | Hash           | Giống ticket                                     | Trạng thái prep và snapshot từng món.  |
| `kds:{tid}:order:{orderId}:tickets`      | Set            | Giống ticket                                     | Tra nhanh cancel/transfer/patch order. |
| `kds:{tid}:station:{station}:PENDING`    | Sorted Set     | Không TTL key; xóa member khi chuyển trạng thái  | Hàng chờ.                              |
| `kds:{tid}:station:{station}:PROCESSING` | Sorted Set     | Tương tự                                         | Đang làm.                              |
| `kds:{tid}:station:{station}:READY`      | Sorted Set     | Giữ cho recall/pickup                            | Ticket READY.                          |
| `kds:{tid}:kitchen`                      | Sorted Set     | Không TTL                                        | View tương thích KITCHEN.              |
| `kds:{tid}:bar`                          | Sorted Set     | Không TTL                                        | View tương thích BAR.                  |
| `kds:{tid}:revision`                     | String counter | Không TTL                                        | Revision hàng đợi monotonic.           |
| `kds:{tid}:station:{station}:revision`   | String counter | Không TTL                                        | (Tuỳ chọn) revision theo trạm.         |

Trường hash ticket gợi ý: `tenantId`, `ticketId`, `orderId`, `sessionId`, `tableId`, `tableName`, `station`, `status` (PENDING \| PROCESSING \| READY \| VOIDED \| ARCHIVED), `priority`, `queueScore`, `confirmedAt`, `createdAt`, `startedAt`, `readyAt`, `voidedAt`, `archivedAt`, `recallUntil`, `slaSeconds`, `slaDueAt`, `lastWarningLevel`, `revision`, `sourceEventId`, `correlationId`, `updatedAt`.

Trường hash ticket-item gợi ý: `tenantId`, `ticketItemId`, `ticketId`, `orderId`, `orderItemId`, `menuItemId`, `menuItemName`, `quantity`, `unitPrice`, `note`, `normalizedNote`, `modifierHash`, `station`, `status`, `createdAt`, `startedAt`, `readyAt`, `revision`.

### 4.5 Không có key batching

Step 2.6 không được tạo cấu trúc dữ liệu batching/gộp món dưới bất kỳ tên gọi nào.

Không thêm:

- station batch index,
- hash `kds:{tid}:batch:*`,
- counter grouped active quantity,
- field `prepSignature`,
- key tra ngược từ ticket item sang batch summary,
- batch DTO field hoặc batch WebSocket event.

Ticket/item là trạng thái prep KDS có thẩm quyền duy nhất. Queue snapshot expose thứ tự ticket FIFO/priority, không expose tổng prep gộp cross-order.

### 4.6 Idempotency và dedupe Kafka

| Key                                          | Kiểu   | TTL                                 | Mục đích                                       |
| -------------------------------------------- | ------ | ----------------------------------- | ---------------------------------------------- |
| `kds:{tid}:dedupe:event:{eventId}`           | String | 7–14 ngày hoặc retention Kafka + dư | Idempotency xử lý sự kiện.                     |
| `kds:{tid}:dedupe:order:{orderId}:{station}` | String | 7–14 ngày                           | Chặn ticket trạm trùng kể cả khi eventId khác. |
| `kds:{tid}:source-event:{eventId}:tickets`   | Set    | Giống dedupe                        | Map debug event → ticket.                      |

Quy tắc consumer:

1. Validate schema/version và tenant.
2. Suy nhóm trạm.
3. Mỗi trạm suy `ticketId` xác định.
4. Chạy script Redis nguyên tử: `SET NX` dedupe event; `SET NX` dedupe order+station; tạo ticket/items/hàng/SLA; tăng revision.
5. Commit offset Kafka **sau** khi mutation Redis thành công.

Nếu dedupe event đã tồn tại và mapping ticket khớp → success và commit offset.

### 4.7 Key SLA

| Key                                                | Kiểu       | TTL / retention | Mục đích                                       |
| -------------------------------------------------- | ---------- | --------------- | ---------------------------------------------- |
| `kds:sla:due`                                      | Sorted Set | Không TTL       | Index due toàn cục, score = timestamp đến hạn. |
| `kds:{tid}:ticket:{ticketId}:sla`                  | Hash       | Giống ticket    | Chính sách SLA và trạng thái cảnh báo.         |
| `kds:{tid}:dedupe:sla:{ticketId}:{level}:{bucket}` | String     | 1–24h           | Tránh cảnh báo trùng.                          |
| `lock:kds:sla:{ticketId}`                          | String     | PX 5–10s        | Lock claim (tuỳ chọn).                         |

Member `kds:sla:due` gợi ý: `{tenantId}|{station}|{ticketId}|{level}`.

Worker: poll `ZRANGEBYSCORE`, claim bằng Lua/lock ngắn, đọc lại ticket, bỏ qua nếu READY/VOIDED/ARCHIVED, emit `kitchen.sla_warning` một lần mỗi bucket, cập nhật hash SLA và lên lịch mức tiếp.

### 4.8 Cleanup và retention

| Key                                 | Kiểu                        | TTL / retention | Mục đích                          |
| ----------------------------------- | --------------------------- | --------------- | --------------------------------- |
| `kds:cleanup:due`                   | Sorted Set                  | Không TTL       | Ticket/item sẵn sàng archive/xóa. |
| `kds:{tid}:ticket:{ticketId}:audit` | Stream hoặc List (tuỳ chọn) | 24–48h          | Vết debug ngắn.                   |

Quy tắc: không gán TTL trực tiếp lên hash ticket đang trong sorted set active; khi terminal thì gỡ khỏi hàng trước, sau đó xóa hoặc TTL 24–48h; cleanup phải gỡ member treo ở hàng trạm.

---

## 5. Phát sự kiện và idempotency

### 5.1 Hợp đồng consumer `order.confirmed`

Kitchen coi Kafka **at-least-once**:

- Message trùng là bình thường.
- Xử lý có thể crash sau ghi Redis nhưng trước commit offset.
- Rebalance có thể giao lại message.

Bất biến cần giữ:

- Một `(tenantId, orderId, station)` tạo **tối đa một** ticket KDS active.
- Xử lý lại cùng event là **thành công**, không phải lỗi.
- Các trạm khác nhau cùng order tạo độc lập nhưng nên cùng `correlationId`.

### 5.2 Consumer group

Kitchen:

```txt
kitchen-service-group
```

Bridge BFF (nhóm riêng):

```txt
bff-kafka-bridge
```

Xem câu hỏi mở Q1: BFF consume `order.confirmed` trực tiếp có thể **đua** với ghi Redis Kitchen.

### 5.3 Ngữ nghĩa producer

Outbox Order hiện **đủ** cho baseline Step 2.6: chuyển DB + outbox cùng transaction; publisher gửi sau; duplicate publish có thể xảy ra và downstream phải xử lý.

Cứng hóa sau (không chặn business logic spec): producer acks/idempotent, claim outbox nếu nhiều instance, dead-letter cho row `FAILED`.

---

## 6. Reconnect WebSocket và đồng bộ trạng thái

WebSocket là **kênh gợi ý**. API snapshot là **nguồn sự thật**.

### 6.1 Staff / KDS reconnect

1. Client reconnect `/orders` hoặc namespace `/kds` tương lai.
2. Handshake mang JWT.
3. Gateway xác thực JWT, suy ra `tenantId`, role, permission, quyền truy cập trạm.
4. Gateway join phòng do server quyết định: WAITER → `tenant:{tid}:staff`; CHEF → `tenant:{tid}:kds:kitchen`; BARISTA → `tenant:{tid}:kds:bar`; OWNER/MANAGER → `tenant:{tid}:management` và (tuỳ chọn) phòng trạm.
5. Client **ngay lập tức** gọi REST, ví dụ `GET /api/v1/admin/kds/queue?station=KITCHEN`.
6. Snapshot có: `tenantId`, `station`, `revision`, `tickets`, `serverTime`.
7. WS sau này mang `revision`.
8. Thấy lệch revision hoặc sự kiện reconnect → refetch snapshot.

### 6.2 Khách reconnect

1. Reconnect với session ID và ngữ cảnh tenant từ luồng session hiện có.
2. Gateway validate session qua nguồn BFF/Order.
3. Join `session:{sid}:customer`.
4. Refetch trạng thái theo dõi đơn qua REST.
5. WS chỉ kích hoạt invalidate/refetch (ví dụ React Query).

### 6.3 Chính sách “pending events”

Không xây replay pending trong Socket.IO cho Step 2.6 — phức tạp và vẫn cần xử lý xung đột.

Dùng: REST snapshot sau reconnect; revision trên mọi sự kiện hàng KDS; Redis Stream audit là tuỳ chọn sau, không bắt buộc cho đúng UI.

---

## 7. Câu hỏi mở cần phê duyệt

### Q1 — Ai phát hint WebSocket “queue changed” sau `order.confirmed`?

**A — BFF consume `order.confirmed` và phát hint KDS**

- Ưu: khớp đọc đơn giản Step 2.6 “Kafka Consumer Bridge”; bridge sở hữu map Kafka→WS.
- Nhược: đua với Kitchen ghi Redis; client refetch trước khi ticket tồn tại; cần retry/backoff snapshot.

**B — Kitchen ghi Redis xong, báo BFF qua Redis Pub/Sub / sự kiện nội bộ**

- Ưu: hint sau khi trạng thái KDS có thẩm quyền; không thêm topic Kafka; khớp “Kitchen sở hữu Redis; BFF sở hữu WS”.
- Nhược: coupling BFF–Kitchen qua Pub/Sub; Pub không bền nhưng chấp nhận được nếu WS chỉ là hint.

**C — Thêm topic `kitchen.ticket_changed`**

- Ưu: sự kiện bền xuyên service sau thay đổi Kitchen; thứ tự sự kiện cho bridge gọn.
- Nhược: mở rộng registry vượt 5 topic đã duyệt; nhiều hạ tầng và contract.

**Khuyến nghị:** **B** cho Step 2.6 — tránh race rõ nhất mà không nở topic Kafka.

### Q2 — Kích hoạt cảnh báo SLA?

**A — Sorted set due + worker Kitchen**

- Ưu: ít phụ thuộc; đủ cho SLA KDS; không cần traffic HTTP; idempotent với claim/dedupe.
- Nhược: Lua/claim cẩn thận khi Kitchen nhiều instance; cần observability worker.

**B — BullMQ delayed jobs**

- Ưu: semantics job trên Redis; retry/delay/dashboard quen.
- Nhược: thêm abstraction và phụ thuộc; vẫn cần idempotency và cleanup.

**C — Redis keyspace notifications**

- Ưu: ý tưởng đơn giản.
- Nhược: cấu hình server; không phải hàng đợi bền; dễ miss sau restart; khó test xác định.

**Khuyến nghị:** **A**. Tránh keyspace cho SLA nghiệp vụ quan trọng.

### Q3 — Quy tắc batching?

Quyết định: **Không batching dưới bất kỳ tên gọi nào**.

Step 2.6 không implement persistent batch index, derived batch projection, `prepSignature`, grouped active quantity, batch DTO field, hoặc batch event. KDS queue snapshot vẫn là snapshot ticket/item theo thứ tự FIFO/priority.

Lý do:

- Tránh semantics prep gộp cross-order mâu thuẫn với note/modifier của item.
- Tránh race counter batch trong Redis.
- Giữ Kitchen Service đồng bộ với spec Step 2.6 cuối và contract Batch 1.

### Q4 — Phục hồi KDS chỉ Redis sau restart/flush?

**A — Rebuild từ Order Service (đơn active PROCESSING/chưa serve)**

- Ưu: nguồn bền; phản ánh cancel/transfer hiện tại.
- Nhược: cần contract query Kitchen→Order; trạng thái prep chi tiết có thể gần đúng nếu Order chưa có readiness từng món.

**B — Replay Kafka `order.confirmed` trong retention + đối chiếu Order**

- Ưu: giữ kiến trúc event-driven; rebuild từ snapshot gốc.
- Nhược: công cụ offset/replay; vẫn phải reconcile với Order.

**C — Chấp nhận mất mát chỉ dev/staging**

- Ưu: nhanh cho demo luận văn nếu infra ổn.
- Nhược: không an toàn vận hành; flush Redis làm KDS sai trong khi Order còn đơn active.

**Khuyến nghị:** **A** cho baseline spec; **B** là cứng hóa sau.

### Q5 — Ủy quyền priority?

**A — Thêm `KITCHEN_SET_PRIORITY`**

- Ưu: ma trận RBAC rõ; rule Owner/Manager-only minh bạch.
- Nhược: enum, seed, test, doc.

**B — Dùng `KITCHEN_UPDATE_TICKET` + check role**

- Ưu: không thêm permission.
- Nhược: logic theo role làm mờ ma trận; khó audit/test đồng nhất.

**C — Cho CHEF/BARISTA ưu tiên trong trạm**

- Ưu: thực tế bếp; giảm nút thắt quản lý.
- Nhược: lệch wording Step 2.6 “Owner/Manager”; bếp có thể đổi thứ tự nghiệp vụ không qua quản lý.

**Khuyến nghị:** **A** nếu priority là tính năng user-facing trong Step 2.6; không thì hoãn đánh dấu priority.

---

## 8. Cần quyết định trước spec cuối

Vui lòng chốt:

1. Q1: Nguồn WS hint sau `order.confirmed`.
2. Q2: Cơ chế kích hoạt SLA.
3. Q3: Ngữ nghĩa batching.
4. Q4: Kỳ vọng phục hồi Redis cho Step 2.6.
5. Q5: Ủy quyền priority.

Sau khi có câu trả lời, spec cuối có thể khóa:

- topic và payload Kafka chính xác;
- key Redis và kỳ vọng Lua/nguyên tử;
- ranh giới REST/TCP BFF/Kitchen;
- handshake socket và quy tắc gán phòng;
- chính sách snapshot khi reconnect.

---

## 9. Cổng dừng

Audit này **cố ý dừng tại đây**. File tiếp theo `docs/specs/business-logic-step-2.6-spec.vi.md` **không** nên viết cho đến khi các câu hỏi mở trên được trả lời.
