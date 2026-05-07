# Phân tích Backend Step 2.6 - Order Kafka, KDS và WebSocket Gateway

> Phạm vi: chỉ phân tích nghiệp vụ và kiến trúc cho Phase 2A/2B Step 2.6. Tài liệu này là bản tiếng Việt dành cho người đọc Việt Nam, dùng làm nguồn tham chiếu trước khi triển khai Kitchen Service, Kafka bridge, Redis KDS state và WebSocket gateway đã harden.

## 1. Executive Summary

Step 2.6 đưa Kitchen Display System (KDS) và realtime cấp production vào luồng Order hiện tại. Ranh giới sở hữu nghiệp vụ cần giữ rõ: Order Service là nguồn sự thật cho order/session/bill trong PostgreSQL; Catalog Service sở hữu menu, bàn và tồn kho; Kitchen Service sở hữu trạng thái KDS ticket/queue phái sinh trong Redis; BFF chỉ điều phối API và định tuyến WebSocket, không sở hữu domain state bền vững.

Event trung tâm là `order.confirmed`. Event này được Order Service phát sau khi nhân viên xác nhận đơn thành công, Catalog đã trừ stock, và order đã được lưu ở trạng thái `PROCESSING`. Kitchen Service consume Kafka event này một cách idempotent, tách item theo `MenuItem.station`, tạo KDS ticket theo từng station trong Redis, duy trì thứ tự queue/SLA timer, rồi phát realtime hint qua WebSocket gateway. Vì vậy KDS state là operational view được dẫn xuất, không phải nguồn sự thật cho trạng thái order khách hàng nhìn thấy.

Kafka dùng cho domain event bất đồng bộ giữa các bounded context. BFF Direct WebSocket event dùng cho UI cache invalidation hoặc realtime hint được emit ngay sau khi một REST/TCP command có thẩm quyền chạy thành công. Ranh giới này rất quan trọng: `order.confirmed` và `kitchen.sla_warning` thuộc Kafka; các event như `events.orderStatusChanged`, `events.cartUpdated`, `events.kitchenItemReady` là side effect trực tiếp từ BFF.

Hiện trạng codebase chưa đáp ứng Step 2.6. Chưa có `apps/kitchen`, Kafka config hiện chỉ expose `order.confirmed`, WebSocket join event trong BFF vẫn do client tự gửi room/tenant, và package `@socket.io/redis-adapter` chưa được cài. Các Socket.IO event hiện tại có thể dùng làm invalidation hint, nhưng chưa đủ an toàn cho trust boundary giữa staff/customer và không có replay sau reconnect.

Context7 đã được dùng để kiểm tra hướng dẫn hiện tại của NestJS về Kafka và WebSocket/Socket.IO Redis adapter. Tài liệu NestJS xác nhận Kafka consumer nên cấu hình rõ `clientId`, danh sách broker và `consumer.groupId`; còn Socket.IO multi-instance cần custom Redis adapter được đăng ký bằng `app.useWebSocketAdapter(...)`. Redis adapter chỉ đảm bảo broadcast giữa nhiều instance; nó không làm event bền vững và không replay packet bị miss.

Trong session Codex này không có MCP database hoặc Keycloak resource được cấu hình. Để tránh suy đoán, các check live local đã được thực hiện thay thế. PostgreSQL schema, Keycloak realm roles/client mappers và Mongo role-permission mappings đã được kiểm tra trên localhost. Các check này xác nhận Keycloak có claim `tenant_id` và `sub_role`, Mongo role có `kitchen.get_queue`, `kitchen.update_ticket`, `kitchen.recall` cho OWNER/MANAGER/CHEF/BARISTA, và schema quan hệ hiện tại có bảng Order/Catalog nhưng chưa có persistence riêng cho Kitchen.

## 2. Domain Model & Ownership

### Bounded Context

| Bounded Context | Sở hữu                                                                                                | Persistence                               | Giao tiếp ra ngoài                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| Order           | Vòng đời order, order item, customer session, bill, service request, side effect của transfer command | PostgreSQL + Redis cache cho session/cart | REST/TCP qua BFF; produce Kafka `order.confirmed`; emit BFF Direct realtime hint |
| Catalog         | Danh tính menu item, giá/tên/trạng thái bán, preparation station, table status, stock                 | PostgreSQL                                | TCP từ Order/BFF; BFF Direct realtime hint cho menu/table changes                |
| Kitchen         | KDS ticket, station queue, ticket/item prep state, priority, recall window, SLA warning state         | Redis only trong Step 2.6                 | Consume Kafka; publish Kafka `kitchen.sla_warning`; command API qua BFF          |
| BFF Realtime    | Socket authentication, room assignment, WebSocket delivery, Kafka-to-WebSocket bridge                 | Không có domain persistence               | REST/TCP orchestration; Socket.IO rooms; Kafka bridge consumer                   |
| Auth/RBAC       | Staff identity, tenant claim, role, permission                                                        | Keycloak + Mongo role-permission store    | Guard và handshake validation                                                    |

### Aggregate Root

| Aggregate Root   | Context         | Ghi chú                                                                                                                                                                              |
| ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Order`          | Order Service   | Nguồn sự thật cho trạng thái order khách hàng nhìn thấy. Chứa entity `OrderItem`. State flow hiện có: `PENDING -> PROCESSING -> READY -> SERVED -> COMPLETED`, kèm các nhánh cancel. |
| `Session`        | Order Service   | Customer dining session bền vững. Redis session chỉ là active cache.                                                                                                                 |
| `Bill`           | Order Service   | Nguồn sự thật cho bill request/payment readiness. Payment completion là tích hợp Phase 3.                                                                                            |
| `ServiceRequest` | Order Service   | Nguồn sự thật cho waiter/service workflow.                                                                                                                                           |
| `KdsTicket`      | Kitchen Service | Redis aggregate được dẫn xuất từ `order.confirmed`. Identity khuyến nghị: deterministic `(tenantId, orderId, station)` hoặc `ticketId` ổn định được lưu mapping với order.           |

### Entity

| Entity          | Aggregate     | Owner           | Ghi chú                                                                                                                                |
| --------------- | ------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `OrderItem`     | `Order`       | Order Service   | Shared type hiện có item status `PROCESSING`, `READY`, `SERVED`, `CANCELED`; chưa có item-level `PENDING`.                             |
| `KdsTicketItem` | `KdsTicket`   | Kitchen Service | Entity khuyến nghị cho trạng thái prep từng item, quantity, note, modifier và recall theo item.                                        |
| `KdsBatch`      | Ngoài phạm vi | N/A             | Superseded bởi quyết định Step 2.6 cuối: không batching/gộp món dưới bất kỳ tên gọi nào.                                               |
| `MenuItem`      | Catalog       | Catalog Service | Nguồn sự thật cho station hiện tại. `order.confirmed` mang station snapshot để KDS không bị thay đổi ngược khi menu config đổi sau đó. |
| `Table`         | Catalog       | Catalog Service | Nguồn sự thật cho table status. Order/KDS chỉ giữ snapshot.                                                                            |

### Value Object

| Value Object         | Mục đích                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `TenantScopedId`     | Mọi key/query/event phải có `tenantId`; không bao giờ tin ID cross-tenant đứng một mình.                         |
| `PreparationStation` | Giá trị canonical: `KITCHEN`, `BAR`. Catalog sở hữu dưới dạng menu configuration; được snapshot vào order event. |
| `PrepSignature`      | Ngoài phạm vi. Không tạo batching key, grouped quantity, hoặc cross-order prep signature trong Step 2.6.         |
| `QueueScore`         | Score trong Redis sorted set. Khuyến nghị gồm priority bucket + `confirmedAt`/sequence.                          |
| `SlaPolicy`          | Threshold theo tenant/station và warning level.                                                                  |
| `Revision`           | Redis counter tăng đơn điệu theo tenant, dùng cho snapshot invalidation và optimistic UI refresh.                |
| `EventId`            | Idempotency key cho Kafka event.                                                                                 |
| `CorrelationId`      | Trace propagation qua REST/TCP/Kafka/WS.                                                                         |

### Source of Truth

| Dữ liệu                        | Source of Truth                              | Consumer / Copy                                     |
| ------------------------------ | -------------------------------------------- | --------------------------------------------------- |
| Trạng thái order khách hàng    | Order Service PostgreSQL                     | Customer PWA, Management App, KDS read hint         |
| Trạng thái prep của KDS ticket | Kitchen Service Redis                        | KDS UI, management room, waiter/customer hint       |
| Station hiện tại của menu item | Catalog Service PostgreSQL                   | Snapshot vào `order.confirmed`                      |
| Stock                          | Catalog Service PostgreSQL                   | Trừ stock khi staff confirm trước `order.confirmed` |
| Customer session               | Order Service PostgreSQL                     | Redis active cache, Customer PWA                    |
| Cart                           | Order Redis cache                            | Customer PWA/Management App qua BFF                 |
| Staff identity/tenant/role     | Keycloak token + Mongo permissions           | BFF guards, WebSocket handshake                     |
| WebSocket room membership      | BFF process memory + Socket.IO Redis adapter | Ephemeral; rebuild khi reconnect                    |

## 3. Event & Message Contract

### Kafka Domain Event

| Topic                 | Vai trò trong Step 2.6                                                                                                          | Producer                       | Consumer Group(s)                                                            | Partition Key | Yêu cầu ordering                                                                                    | Idempotency                                               | Schema                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `order.confirmed`     | Trigger chính để tạo KDS ticket; BFF bridge optional chỉ dùng cho customer/session tracking, không dùng để invalidate queue KDS | Order Service outbox publisher | `kitchen-service-group`, optional `bff-kafka-bridge`                         | `tenantId`    | Cần ordering theo tenant cho stream order-confirmed; Kafka chỉ guarantee order trong cùng partition | `eventId`; fallback `(tenantId, orderId)`                 | `eventId: string`, `eventType: "order.confirmed"`, `schemaVersion: "1.0"`, `tenantId: string`, `orderId: string`, `sessionId: string`, `tableId: string`, `tableName: string`, `items: OrderConfirmedItem[]`, `totalAmount: number`, `confirmedAt: string`, `confirmedByUserId: string`, `occurredAt: string`, `correlationId?: string` |
| `kitchen.sla_warning` | Alert management/station room khi ticket vượt threshold                                                                         | Kitchen Service                | `bff-kafka-bridge`, future Notification                                      | `tenantId`    | Ordering theo tenant hữu ích nhưng không critical về tài chính                                      | `eventId`; fallback `(tenantId, ticketId, level, bucket)` | Khuyến nghị: `eventId: string`, `eventType: "kitchen.sla_warning"`, `schemaVersion: "1.0"`, `tenantId: string`, `ticketId: string`, `orderId: string`, `station: "KITCHEN" \| "BAR"`, `level: "WARNING" \| "BREACH"`, `waitTimeSeconds: number`, `thresholdSeconds: number`, `occurredAt: string`, `correlationId?: string`             |
| `payment.completed`   | Future bridge tới customer/session room và sync Order/Catalog/Notification                                                      | Payment Service                | `payment-order-sync-group`, `notification-service-group`, `bff-kafka-bridge` | `tenantId`    | Cần theo tenant/bill                                                                                | `eventId`; fallback `(tenantId, paymentId)`               | Minimum khuyến nghị: `eventId`, `tenantId`, `paymentId`, `billId`, `sessionId`, `tableId`, `amount`, `method`, `paidAt`, `occurredAt`, `correlationId`                                                                                                                                                                                  |
| `payment.refunded`    | Topic trong registry, không critical cho KDS Step 2.6                                                                           | Payment Service                | Order, Notification                                                          | `tenantId`    | Theo tenant/payment                                                                                 | `eventId`; fallback `(tenantId, refundId)`                | Contract Phase 3 trong tương lai                                                                                                                                                                                                                                                                                                        |
| `tenant.created`      | Topic trong registry, không critical cho KDS Step 2.6                                                                           | SaaS Service                   | Catalog, Notification                                                        | `tenantId`    | Theo tenant                                                                                         | `eventId`; fallback `tenantId`                            | Contract bootstrap SaaS trong tương lai                                                                                                                                                                                                                                                                                                 |

`OrderConfirmedItem` đã có trong shared/code: `orderItemId: string`, `menuItemId: string`, `name: string`, `quantity: number`, `note?: string`, `unitPrice: number`, `station?: PreparationStation`.

### Ranh giới Kafka vs BFF Direct

| Event                                             | Phân loại                | Lý do                                                                                                              |
| ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `order.confirmed`                                 | Kafka async domain event | Tích hợp cross-context từ Order sang Kitchen sau khi order state và stock deduction đã durable.                    |
| `kitchen.sla_warning`                             | Kafka async domain event | Được Kitchen timer logic produce; BFF bridge và future notification/analytics consume mà không coupling trực tiếp. |
| `payment.completed`                               | Kafka async domain event | Payment là bounded context riêng; Order/BFF/customer view phản ứng bất đồng bộ.                                    |
| `events.orderCreated`                             | BFF Direct side effect   | Emit sau khi BFF nhận response thành công từ Order TCP; chỉ là UI invalidation/hint.                               |
| `events.orderStatusChanged`                       | BFF Direct side effect   | Emit sau response của Order command có thẩm quyền.                                                                 |
| `events.cartUpdated`                              | BFF Direct side effect   | Cart mutation chạy đồng bộ qua BFF/Order Redis; WS chỉ báo client refetch.                                         |
| `events.serviceRequested`                         | BFF Direct side effect   | Order Service persist service request; BFF notify staff/session rooms.                                             |
| `events.billRequested`                            | BFF Direct side effect   | Order Service persist bill request; BFF notify staff/session rooms.                                                |
| `events.tableTransferred`                         | BFF Direct side effect   | Transfer saga đồng bộ qua Order/Catalog; BFF emit sau success.                                                     |
| `events.kitchenItemReady`                         | BFF Direct side effect   | Khuyến nghị emit sau khi BFF orchestrate Kitchen `done` cộng với Order item/order update.                          |
| `events.menuUpdated`, `events.tableStatusChanged` | BFF Direct side effect   | State thuộc Catalog; UI invalidation sau authoritative Catalog command.                                            |

### WebSocket Event

Namespace nên giữ `/orders` trừ khi quyết định rõ sẽ tách `/kds`. Code hiện tại dùng `/orders`; Step 2.6 có thể harden namespace này trước.

| Event Name                  | Direction        | Room(s)                                                                                  | Payload Schema                                                                                                                  | Điều kiện emit                                                           |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `events.cartUpdated`        | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                                | Existing `CartUpdatedEvent`: `tenantId`, `sessionId`, `tableId`, `itemCount`, `cartVersion`, `occurredAt`, `correlationId?`     | Cart mutation thành công.                                                |
| `events.orderCreated`       | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                                | Existing `OrderCreatedEvent`                                                                                                    | Customer submit order và Order Service persist `PENDING`.                |
| `events.orderStatusChanged` | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                                | Existing `OrderStatusChangedEvent`                                                                                              | Staff confirm/cancel/serve/complete command thành công.                  |
| `events.serviceRequested`   | Server -> client | `tenant:{tenantId}:staff`, optional session room                                         | Existing `ServiceRequestedEvent`                                                                                                | Customer/staff service request command thành công.                       |
| `events.billRequested`      | Server -> client | `tenant:{tenantId}:staff`, `session:{sessionId}:customer`                                | Existing `BillRequestedEvent`                                                                                                   | Bill request command thành công.                                         |
| `events.tableTransferred`   | Server -> client | `tenant:{tenantId}:staff`, old/new session room nếu cần                                  | Existing `TableTransferredEvent`                                                                                                | Transfer saga thành công.                                                |
| `events.kdsQueueChanged`    | Server -> client | `tenant:{tenantId}:kds:kitchen` hoặc `tenant:{tenantId}:kds:bar`; management subscribers | Khuyến nghị: `tenantId`, `station`, `revision`, `ticketId?`, `orderId?`, `reason`, `occurredAt`, `correlationId?`               | Kitchen create/update/recall/void ticket. Client refetch queue snapshot. |
| `events.kdsTicketUpdated`   | Server -> client | Station KDS room; management subscribers                                                 | Khuyến nghị: `tenantId`, `station`, `ticketId`, `status`, `revision`, `occurredAt`, `correlationId?`                            | Ticket state transition thành công.                                      |
| `events.kitchenItemReady`   | Server -> client | `tenant:{tenantId}:staff`, `session:{sessionId}:customer`                                | Khuyến nghị: `tenantId`, `sessionId`, `tableId`, `orderId`, `ticketId`, `station`, `readyItems`, `occurredAt`, `correlationId?` | Ticket/item chuyển READY và Order Service update thành công.             |
| `events.kitchenSlaWarning`  | Server -> client | `tenant:{tenantId}:management`, station room                                             | Kafka `kitchen.sla_warning` map sang WS payload                                                                                 | BFF Kafka bridge consume warning.                                        |
| `events.paymentCompleted`   | Server -> client | `session:{sessionId}:customer`, `tenant:{tenantId}:staff`                                | Future payment payload                                                                                                          | BFF bridge consume `payment.completed`.                                  |

Client-originated room join phải được thay bằng authenticated handshake và server-side room assignment.

| Event / Action  | Direction        | Quyết định                                                                                                                                                 |
| --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `join.staff`    | Client -> server | Chỉ là implementation hiện tại. Không tin trong Step 2.6 vì client tự gửi `tenantId`. Thay bằng JWT handshake và server-derived rooms.                     |
| `join.session`  | Client -> server | Chỉ là implementation hiện tại. Thay bằng customer session handshake được validate qua Order Session source of truth.                                      |
| `subscribe.kds` | Client -> server | Optional event khuyến nghị để OWNER/MANAGER subscribe `KITCHEN` hoặc `BAR` sau permission validation. CHEF/BARISTA nên được auto-join đúng station của họ. |
| KDS mutation    | Client -> server | Nên là REST command qua BFF, không phải WebSocket mutation event. Cách này giữ guard, auditability và idempotency.                                         |

## 4. State Machine

### State Machine của KDS Ticket

```text
                      consume order.confirmed
                               |
                               v
                         +-----------+
                         |  PENDING  |
                         +-----------+
                           |       |
                   start   |       | cancel/void từ Order
                           v       v
                      +------------+        terminal
                      | PROCESSING | ----> +--------+
                      +------------+       | VOIDED |
                           |               +--------+
                      done |
                           v
                         +-------+
                         | READY |
                         +-------+
                           |   |
 recall trong thời gian cho phép |   | cleanup sau retention / served
                           v   v
                      +------------+        terminal
                      | PROCESSING |      +----------+
                      +------------+      | ARCHIVED |
                                          +----------+
```

### Transition hợp lệ

| From                           | To           | Trigger                   | Actor                            | Authorization                                  | Ghi chú                                                                         |
| ------------------------------ | ------------ | ------------------------- | -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| none                           | `PENDING`    | Kafka `order.confirmed`   | Kitchen consumer                 | Service principal                              | Chỉ create idempotent.                                                          |
| `PENDING`                      | `PROCESSING` | Start ticket              | CHEF/BARISTA/OWNER/MANAGER       | `kitchen.update_ticket`; giới hạn theo station | Phải dùng Redis compare-and-set.                                                |
| `PROCESSING`                   | `READY`      | Done ticket/items         | CHEF/BARISTA/OWNER/MANAGER       | `kitchen.update_ticket`; giới hạn theo station | Phải đồng bộ với Order Service để customer-visible state có thể tiến tới READY. |
| `READY`                        | `PROCESSING` | Recall                    | CHEF/BARISTA/OWNER/MANAGER       | `kitchen.recall`; giới hạn theo station        | Chỉ cho phép trong recall window.                                               |
| `PENDING`/`PROCESSING`/`READY` | `VOIDED`     | Order cancel/compensation | BFF/Order-driven service command | Order command authorization                    | Terminal cho active queue.                                                      |
| `READY`/`VOIDED`               | `ARCHIVED`   | Retention cleanup         | Kitchen internal worker          | Service principal                              | Xóa khỏi active queue sau retention.                                            |

`READY`, `VOIDED`, và `ARCHIVED` là terminal trong prep flow bình thường. `READY` chỉ rollback được trong một recall window đã cấu hình.

### Happy Path

1. Customer submit cart qua BFF. Order Service tạo order `PENDING` và bill/session linkage, sau đó BFF emit `events.orderCreated`.
2. Staff confirm order. Order Service lock order, gọi Catalog trừ stock, update order và order item sang `PROCESSING`, ghi outbox row, rồi trả success cho BFF.
3. Outbox publisher gửi Kafka `order.confirmed` với key `tenantId`.
4. Kitchen Service consume event trong `kitchen-service-group`, check dedupe key, tách item theo `station`, tạo một ticket cho mỗi station, lưu ticket/item hash, add ticket ID vào station queue sorted set, schedule SLA due entry, tăng tenant revision, rồi emit `events.kdsQueueChanged`.
5. CHEF/BARISTA mở KDS. WebSocket handshake join station room; REST queue snapshot load từ Kitchen Redis.
6. Staff nhấn Start. BFF authorize và gửi Kitchen command. Kitchen atomically transition `PENDING -> PROCESSING`, tăng revision và emit queue change hint.
7. Staff nhấn Done. BFF authorize và orchestrate Kitchen `PROCESSING -> READY`, rồi gọi Order Service để update readiness của item/order. Sau khi authoritative success, BFF emit `events.kitchenItemReady` và/hoặc `events.orderStatusChanged`.
8. Waiter serve order. Order Service transition `READY -> SERVED`; BFF emit order status realtime hint hiện có.

### Unhappy Path và Edge Case

| Scenario                            | Behavior bắt buộc                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Duplicate `order.confirmed`         | Kitchen phải ignore bằng `kds:{tenantId}:dedupe:event:{eventId}` và/hoặc `kds:{tenantId}:dedupe:order:{orderId}`.                                                                                            |
| Kafka consumer lag                  | Order vẫn authoritative ở `PROCESSING`; KDS queue có thể trễ. Cần monitor lag và có refresh/rebuild path.                                                                                                    |
| Kafka rebalancing                   | Handler phải idempotent vì message có thể bị process lại sau rebalance hoặc crash trước commit.                                                                                                              |
| Redis restart/flush                 | Active KDS state có thể mất nếu không rebuild. Xem recovery strategy ở section 5.                                                                                                                            |
| Hai chef cùng nhấn Done             | Redis CAS/Lua transition với expected revision cho một lệnh thành công, lệnh còn lại nhận conflict/current state.                                                                                            |
| Done race với Cancel                | Order cancellation là authoritative. BFF phải coordinate: nếu Order đã canceled thì Kitchen ticket thành `VOIDED`; nếu Kitchen done thắng trước, transition rule của Order quyết định state khách hàng thấy. |
| Transfer table sau khi đã có ticket | Transfer saga phải patch table snapshot trong active KDS ticket sau khi Order/Catalog transfer success.                                                                                                      |
| Client disconnect/reconnect         | Socket event chỉ là hint. Client phải refetch queue/order snapshot khi reconnect bằng revision.                                                                                                              |
| SLA worker duplicate warning        | Dùng due-set claiming và warning dedupe key theo `ticketId + level + bucket`.                                                                                                                                |

## 5. Data Structure Strategy

### Redis - Kitchen Service

| Key Pattern                                             | Data Type             | TTL / Retention                                                          | Owner   | Lý do                                                                                                                                                                                               |
| ------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kds:{tenantId}:ticket:{ticketId}`                      | Hash                  | Active tới `READY/VOIDED + retention`; khuyến nghị 24-48h để audit/debug | Kitchen | Ticket aggregate root: `tenantId`, `ticketId`, `orderId`, `sessionId`, `tableId`, `tableName`, `station`, `status`, `priority`, `confirmedAt`, `startedAt`, `readyAt`, `revision`, `correlationId`. |
| `kds:{tenantId}:ticket:{ticketId}:items`                | Set                   | Giống ticket                                                             | Kitchen | Danh sách item ID trong ticket.                                                                                                                                                                     |
| `kds:{tenantId}:ticket-item:{ticketItemId}`             | Hash                  | Giống ticket                                                             | Kitchen | Per-item state, menu snapshot, quantity, note, modifier, status.                                                                                                                                    |
| `kds:{tenantId}:station:{station}:PENDING`              | Sorted Set            | Key không TTL; member bị remove khi state đổi                            | Kitchen | Active pending queue theo priority/confirmed time.                                                                                                                                                  |
| `kds:{tenantId}:station:{station}:PROCESSING`           | Sorted Set            | Key không TTL; member bị remove khi state đổi                            | Kitchen | Active prep queue.                                                                                                                                                                                  |
| `kds:{tenantId}:station:{station}:READY`                | Sorted Set            | Member giữ trong recall/pickup window                                    | Kitchen | Ready ticket để recall và staff pickup visibility.                                                                                                                                                  |
| `kds:{tenantId}:order:{orderId}:tickets`                | Set                   | Giống ticket retention                                                   | Kitchen | Lookup nhanh khi order cancel/transfer/patch command.                                                                                                                                               |
| `kds:{tenantId}:dedupe:event:{eventId}`                 | String                | 7-14 ngày                                                                | Kitchen | Idempotency cho Kafka event.                                                                                                                                                                        |
| `kds:{tenantId}:dedupe:order:{orderId}`                 | String                | 7-14 ngày                                                                | Kitchen | Bảo vệ thêm chống tạo ticket duplicate.                                                                                                                                                             |
| `kds:sla:due`                                           | Sorted Set            | Persistent operational key                                               | Kitchen | Global due index. Score là due timestamp; member nên chứa tenant/ticket/station.                                                                                                                    |
| `kds:{tenantId}:ticket:{ticketId}:sla`                  | Hash                  | Giống ticket                                                             | Kitchen | SLA state: threshold, dueAt, warningLevel, lastWarningAt.                                                                                                                                           |
| `kds:{tenantId}:dedupe:sla:{ticketId}:{level}:{bucket}` | String                | 1-24h tùy warning policy                                                 | Kitchen | Chặn alert lặp lại cho cùng threshold bucket.                                                                                                                                                       |
| `kds:{tenantId}:revision`                               | String counter        | Không TTL                                                                | Kitchen | Monotonic snapshot revision cho WS invalidation.                                                                                                                                                    |
| `kds:{tenantId}:settings`                               | Hash hoặc String JSON | TTL 5-15 phút                                                            | Kitchen | Cache tenant SLA/station policy. Source phải là durable config service/table.                                                                                                                       |
| `lock:kds:{tenantId}:ticket:{ticketId}`                 | String                | PX ngắn, ví dụ 5-10s                                                     | Kitchen | Optional command lock quanh multi-key transition. Lua CAS vẫn được ưu tiên.                                                                                                                         |

Redis eviction policy ở production không được evict active KDS key khi thiếu memory. Nên dùng Redis database/instance riêng hoặc keyspace `noeviction` cho operational KDS state. Nếu buộc dùng chung Redis, active KDS key cần memory monitoring và TTL thận trọng.

### PostgreSQL

| Dữ liệu          | Table(s)                | Hiện trạng                                                                      | Index / ghi chú khuyến nghị                                                                                                                       |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orders           | `orders`, `order_items` | Đã có và tenant-scoped. Live DB có order idempotency và order-item order index. | Add/query-check `orders(tenant_id, status, created_at)` và `orders(tenant_id, table_id, created_at)` cho active order rebuild và staff dashboard. |
| Sessions         | `sessions`              | Đã có. Redis là active cache; PostgreSQL là durable source.                     | Live index hiện cover `(tenant_id, table_id, status)`.                                                                                            |
| Bills            | `bills`                 | Đã có.                                                                          | Add/query-check `bills(tenant_id, status, created_at)` trước khi có payment/dashboard load.                                                       |
| Service requests | `service_requests`      | Đã có.                                                                          | Add/query-check `service_requests(tenant_id, table_id, status)` và `service_requests(tenant_id, created_at)`.                                     |
| Outbox           | `outbox_events`         | Đã có. Live DB có index `(status, created_at)`.                                 | Publisher hiện gửi JSON với key `partitionKey`. Nên harden producer acks/idempotence.                                                             |
| Menu items       | `menu_items`            | Đã có column `station`.                                                         | Catalog vẫn là source of truth cho station hiện tại; event snapshot là immutable cho KDS.                                                         |
| Tables           | `tables`                | Đã có. Live DB có index tenant/status và unique tenant/name/qr-token.           | KDS giữ table snapshot; table transfer phải patch active ticket.                                                                                  |
| KDS tickets      | none                    | Có chủ ý trong Step 2.6.                                                        | Redis-only bắt buộc có explicit rebuild strategy.                                                                                                 |

### In-Memory / Ephemeral State

| Dữ liệu                    | Vị trí                                                      | Rule                                                        |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Socket connection identity | `socket.data` trong BFF gateway instance                    | Chỉ derive từ JWT/session handshake; rebuild khi reconnect. |
| Socket room membership     | Socket.IO process memory + Redis adapter broadcast metadata | Không durable; không bao giờ là source of truth.            |
| SLA worker tick state      | Kitchen process                                             | Phải recover được từ Redis due set.                         |
| Kafka consumer assignment  | Kafka client runtime                                        | Không phải domain state; rebalance có thể replay message.   |

### Redis Restart / Flush Strategy

Kitchen Service không có PostgreSQL table trong Step 2.6, nên mất Redis là rủi ro vận hành thật. Recovery khuyến nghị:

1. Restart bình thường: Redis data còn; Kitchen resume due-set worker và Kafka consumer group.
2. Consumer crash trước commit: Kafka replay; dedupe key giúp xử lý an toàn.
3. Redis flush trong khi Kafka offset đã commit: Kitchen không thể recover active ticket chỉ từ Redis. Cần thêm explicit rebuild path trước production:
   - Query Order Service lấy active `PROCESSING`/`READY` orders theo tenant và recent time window, rồi rebuild deterministic KDS ticket từ order item snapshot; hoặc
   - Reset offset của `kitchen-service-group` về một retention window an toàn và replay `order.confirmed`.
4. Client reconnect sau bất kỳ restart nào: không tin WebSocket event history; client phải refetch REST snapshot và so sánh revision.

## 6. Authorization Matrix

Live Mongo role-permission check xác nhận OWNER, MANAGER, CHEF và BARISTA hiện có `kitchen.get_queue`, `kitchen.update_ticket`, `kitchen.recall`; WAITER không có.

| Operation                                                | OWNER                | MANAGER              | WAITER               | CHEF              | BARISTA           | CUSTOMER        | Permission / Guard                                                                                             |
| -------------------------------------------------------- | -------------------- | -------------------- | -------------------- | ----------------- | ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| Staff WebSocket handshake                                | Yes                  | Yes                  | Yes                  | Yes               | Yes               | No              | JWT qua Keycloak/Authorizer; server derive `tenantId`, role, permissions.                                      |
| Customer WebSocket handshake                             | No                   | No                   | No                   | No                | No                | Yes             | Session validation qua Order session source; tenant/session scoped.                                            |
| Subscribe staff room `tenant:{tenantId}:staff`           | Yes                  | Yes                  | Yes                  | Yes               | Yes               | No              | Tự động sau staff handshake.                                                                                   |
| Subscribe management room `tenant:{tenantId}:management` | Yes                  | Yes                  | No                   | No                | No                | No              | Role check.                                                                                                    |
| Subscribe KDS kitchen room                               | Yes                  | Yes                  | No                   | Yes               | No                | No              | `kitchen.get_queue`; station restriction.                                                                      |
| Subscribe KDS bar room                                   | Yes                  | Yes                  | No                   | No                | Yes               | No              | `kitchen.get_queue`; station restriction.                                                                      |
| `GET /admin/kitchen/queue?station=KITCHEN`               | Yes                  | Yes                  | No                   | Yes               | No                | No              | `kitchen.get_queue`; tenant guard.                                                                             |
| `GET /admin/kitchen/queue?station=BAR`                   | Yes                  | Yes                  | No                   | No                | Yes               | No              | `kitchen.get_queue`; tenant guard.                                                                             |
| Start KDS ticket                                         | Yes                  | Yes                  | No                   | Station only      | Station only      | No              | `kitchen.update_ticket`; Redis CAS.                                                                            |
| Done KDS ticket                                          | Yes                  | Yes                  | No                   | Station only      | Station only      | No              | `kitchen.update_ticket`; phải sync Order Service.                                                              |
| Recall KDS ticket                                        | Yes                  | Yes                  | No                   | Station only      | Station only      | No              | `kitchen.recall`; trong recall window.                                                                         |
| Set KDS priority                                         | Yes                  | Yes                  | No                   | No mặc định       | No mặc định       | No              | Khuyến nghị permission mới `kitchen.set_priority`; nếu chưa có thì role-restrict bằng `kitchen.update_ticket`. |
| View customer order/session updates                      | Staff view gián tiếp | Staff view gián tiếp | Staff view gián tiếp | KDS view giới hạn | KDS view giới hạn | Chỉ own session | Boundary giữa staff JWT và customer session.                                                                   |
| BFF Kafka bridge emit                                    | Service              | Service              | Service              | Service           | Service           | Service         | Không có user actor; payload tenant-scoped.                                                                    |

### Trust Boundary

Staff app và Customer PWA phải dùng hai WebSocket authentication path khác nhau:

| Client               | Credential                                  | Validation                                                                                                                    | Room Assignment                                                                                 |
| -------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Staff Management App | Keycloak JWT                                | BFF/Authorizer validate token, extract `sub`, `tenant_id`, `sub_role`, permissions. Không tin `tenantId` client gửi.          | Server join staff/role/station rooms dựa trên claim đã verify và Mongo permissions.             |
| Customer PWA         | Session identifier kèm tenant/table context | BFF validate active session qua Order session cache/PostgreSQL. Xem `sessionId` như bearer capability scoped cho một session. | Server chỉ join `session:{sessionId}:customer`; không bao giờ join tenant-wide staff/KDS rooms. |

HTTP protected staff endpoint phải giữ guard order bắt buộc: `UserGuard -> TenantGuard -> PermissionGuard`. Customer endpoint tiếp tục dùng session guard, không dùng Keycloak guard.

## 7. SLA & Timer Logic

### Vòng đời Timer

| Thời điểm                            | Action                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Ticket được tạo từ `order.confirmed` | Tính `slaDueAt = confirmedAt + thresholdSeconds`, lưu ticket SLA hash, add member vào `kds:sla:due`.                       |
| Ticket bắt đầu processing            | Không reset SLA chờ của customer theo mặc định. Có thể record `startedAt` cho analytics.                                   |
| Ticket done/ready                    | Remove hoặc mark inactive trong `kds:sla:due`; warning state đóng lại.                                                     |
| Ticket bị recall                     | Mở lại SLA tracking. Default khuyến nghị: đặt một recall grace due time ngắn từ `recalledAt`, không dùng lại due time gốc. |
| Ticket voided/archived               | Remove khỏi due index và expire ticket keys theo retention policy.                                                         |

### Threshold Configuration

Docs hiện chưa định nghĩa durable tenant settings table cho SLA threshold. KDS mock lưu station settings ở localStorage, không thể là backend source of truth.

Quyết định khuyến nghị:

| Setting                           | Source                                                                                 | Cache                                         |
| --------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| Default kitchen warning threshold | Durable tenant operational settings thuộc SaaS hoặc Order/Kitchen configuration module | `kds:{tenantId}:settings` Redis TTL 5-15 phút |
| Station-specific threshold        | Cùng durable source, keyed theo tenant và station                                      | Cùng cache                                    |
| Step 2.6 fallback                 | Static default, ví dụ 15 phút, document rõ và cho tenant override sau                  | Cache optional                                |

### SLA Breach Flow

1. Kitchen SLA worker poll `kds:sla:due` mỗi 10-30 giây.
2. Worker claim due member bằng Lua/lock để tránh duplicate khi multi-instance.
3. Worker đọc ticket và verify ticket vẫn là `PENDING` hoặc `PROCESSING`.
4. Worker check warning dedupe key cho `ticketId + level + bucket`.
5. Worker publish Kafka `kitchen.sla_warning` với key `tenantId`.
6. BFF Kafka bridge consume warning và emit `events.kitchenSlaWarning` tới `tenant:{tenantId}:management` và optional station room.
7. KDS/management client refetch queue snapshot hoặc highlight ticket bị ảnh hưởng.

Nếu Kitchen Service restart, timer không được chỉ sống trong process memory. Due sorted set là nguồn timer recoverable. Nếu chính Redis bị mất, ticket và due entry phải rebuild từ Kafka replay hoặc Order Service active-order snapshot.

## 8. Scaling & Concurrency Risks

### WebSocket Multi-Instance

Socket.IO Redis Adapter đảm bảo broadcast giữa nhiều instance: nếu user connect vào BFF instance B và event được emit từ instance A, Redis Pub/Sub giúp B deliver event. Nó không đảm bảo durable replay, ordered recovery sau disconnect, authentication hoặc domain state consistency.

Behavior bắt buộc cho Step 2.6:

| Concern                     | Decision                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Multi-instance broadcast    | Dùng `@socket.io/redis-adapter` với NestJS `RedisIoAdapter`.                                                |
| Missed event khi disconnect | Xem WS là invalidation hint; refetch REST snapshot khi reconnect.                                           |
| Client-authenticated rooms  | Assign room ở server sau handshake validation.                                                              |
| Replayable event history    | Redis adapter không cung cấp. Chỉ dùng Redis Streams nếu product thật sự cần replay ngoài snapshot refresh. |

### Kafka Consumer Scaling

`tenantId` nên tiếp tục là Kafka partition key cho `order.confirmed` và `kitchen.sla_warning`. Điều này cho ordering theo tenant miễn là mọi event của một tenant map vào cùng partition. Trong cùng consumer group, mỗi partition chỉ được process bởi một instance tại một thời điểm, nên khả năng scale của Kitchen bị giới hạn bởi số partition. Một tenant quá nóng vẫn có thể overload một partition; scale cross-tenant sẽ tốt hơn scale trong cùng một tenant.

Consumer rules:

| Rule                                                                     | Lý do                                                            |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Dùng group ID rõ ràng như `kitchen-service-group` và `bff-kafka-bridge`. | Các service riêng cần consume độc lập.                           |
| Handler phải idempotent trước khi commit offset.                         | At-least-once delivery và rebalance replay là bình thường.       |
| Monitor consumer lag theo topic/partition/group.                         | Lag ảnh hưởng trực tiếp tới độ tươi của KDS.                     |
| Tránh partition key cross-tenant cho KDS event.                          | Multi-tenant isolation và per-tenant ordering phụ thuộc vào key. |

### Race Condition

| Risk                                       | Mitigation                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Hai staff update cùng ticket               | Redis Lua compare-and-set trên `status` và `revision`; trả current state khi conflict.           |
| `done` vs `recall`                         | Yêu cầu expected state và revision; recall chỉ từ `READY` trong recall window.                   |
| `done` vs Order cancellation               | BFF phải orchestrate theo Order source of truth. Kitchen không được tự quyết final order status. |
| Duplicate Kafka messages                   | Dedupe bằng `eventId` và `(tenantId, orderId)`.                                                  |
| SLA worker duplicate publishing            | Due-set claim cộng với warning dedupe key.                                                       |
| Client join room tenant khác               | Không bao giờ nhận room identifier từ client payload nếu chưa validate claim/session.            |
| Redis flush                                | Explicit rebuild/replay path; client snapshot sau reconnect.                                     |
| Transfer table khi KDS ticket active       | Sau transfer saga success, patch Kitchen ticket table snapshot qua service command.              |
| Priority change làm reorder queue khó đoán | Queue score nên tách priority và FIFO time; giữ stable order trong cùng priority.                |

## 9. Open Questions & Recommended Decisions

### Check đã hoàn tất trước khi chốt

| Check                   | Kết quả                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Context7 NestJS docs    | Đã verify pattern hiện tại cho NestJS Kafka client/consumer configuration và Socket.IO Redis adapter registration.                             |
| MCP database resources  | Không có MCP resources/templates được cấu hình trong session này.                                                                              |
| MCP Keycloak resources  | Không có MCP resources/templates được cấu hình trong session này.                                                                              |
| Local PostgreSQL schema | Đã verify các bảng Order/Catalog, indexes, `menu_items.station`, và không có Kitchen table.                                                    |
| Local Keycloak realm    | Đã verify roles `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`, `SUPER_ADMIN`; `management-app` có protocol mapper `tenant_id` và `sub_role`. |
| Local Mongo RBAC        | Đã verify kitchen permissions cho OWNER/MANAGER/CHEF/BARISTA và WAITER không có kitchen permissions.                                           |

### Gap, Conflict và Decision

| Issue                                   | Evidence hiện tại                                                                                                        | Recommended Decision                                                                                                                                                | Trade-off                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Độ chi tiết KDS state                   | Spec Step 2.6 cuối loại bỏ batching; shared `KDSTicket` chỉ là view type Phase 2A.                                       | Model `KdsTicket` là aggregate và `KdsTicketItem` là entity. Một ticket cho mỗi `(orderId, station)`, có item-level state bên trong.                                | Redis phức tạp hơn một chút, nhưng hỗ trợ partial readiness, recall và future analytics. |
| Topic SLA warning                       | Architecture docs từng dùng một biến thể rút gọn không canonical. Kafka guide liệt kê `kitchen.sla_warning`.             | Chuẩn hóa Kafka topic là `kitchen.sla_warning`; WS event là `events.kitchenSlaWarning`.                                                                             | Cần dọn các reference cũ.                                                                |
| Shorthand `table.status_chg`            | Technical architecture có shorthand không đồng bộ với naming `events.*`.                                                 | Dùng tên BFF Direct rõ ràng: `events.tableStatusChanged`.                                                                                                           | Dài hơn nhưng ít mơ hồ.                                                                  |
| WebSocket room joins                    | BFF hiện cho `join.staff` và `join.session` với ID client tự gửi.                                                        | Thay bằng handshake auth và server-side room assignment. Chỉ giữ event cũ làm migration shim nếu cần.                                                               | Cần cập nhật frontend, nhưng đóng lỗ hổng spoof tenant/session.                          |
| Owner/Manager KDS rooms                 | Phase doc nói OWNER/MANAGER join management room; frontend routing cho phép KDS screens.                                 | OWNER/MANAGER được subscribe station KDS rooms bằng `subscribe.kds` sau permission check.                                                                           | Gateway logic giàu hơn một chút; khớp admin UX.                                          |
| Priority permission                     | Permission matrix chưa có priority permission riêng.                                                                     | Thêm `kitchen.set_priority` nếu priority là operation thật; nếu chưa thêm, restrict priority cho OWNER/MANAGER dưới `kitchen.update_ticket`.                        | Permission mới cần migration; role-only nhanh hơn nhưng kém chính xác.                   |
| Kitchen done -> Order READY sync        | Kitchen Redis-only không thể là source of truth cho customer order state.                                                | BFF orchestrate Kitchen command và Order Service item/order readiness command; chỉ emit WS cho customer/staff sau Order success.                                    | BFF coupling nhiều hơn, nhưng giữ Order là source of truth.                              |
| Recall semantics                        | Docs có nhắc recall nhưng chưa định nghĩa window hoặc ảnh hưởng Order-state.                                             | Recall chỉ từ KDS `READY` trong configurable window. Nó reopen KDS prep state; rollback Order status cần explicit Order contract nếu state customer đã thấy bị đổi. | Tránh rollback customer-facing ngầm nếu contract chưa rõ.                                |
| SLA threshold source                    | Mock UI localStorage không phải backend source; live DB chưa có settings table.                                          | Dùng static Step 2.6 default cộng với Redis cache shape; thêm durable tenant operational settings trước production customization.                                   | Static default nhanh; tenant configurability chờ schema/API.                             |
| Redis-only KDS recovery                 | Phase doc nói Kitchen không có DB.                                                                                       | Thêm rebuild path từ Order active orders hoặc Kafka replay/reset offsets.                                                                                           | Có thêm operational tooling; nếu không, Redis flush làm mất active kitchen state.        |
| Socket.IO Redis adapter expectations    | Redis adapter chỉ broadcast.                                                                                             | Dùng snapshot-on-reconnect; không hứa pending event replay.                                                                                                         | Đơn giản và đáng tin hơn; client phải discipline invalidation/refetch.                   |
| Kafka config coverage                   | Code hiện chỉ expose `order.confirmed`.                                                                                  | Khi implement, thêm config entries cho `kitchen.sla_warning`, `payment.completed` và consumer groups.                                                               | Config surface nhiều hơn, nhưng contract explicit.                                       |
| Chưa có Kitchen TCP namespace           | Constants hiện chưa có `KITCHEN` TCP messages.                                                                           | Thêm Kitchen command namespace cho queue/start/done/recall/priority khi implement.                                                                                  | Giữ pattern BFF guard/orchestration nhất quán.                                           |
| Transfer/cancel sau khi tạo KDS         | Code transfer/cancel của Order hiện chưa patch Kitchen.                                                                  | Sau authoritative Order/Catalog success, BFF/Order command Kitchen patch table snapshot hoặc void tickets.                                                          | Thêm cross-service side effect; tránh KDS hiển thị stale.                                |
| Conflict text stock deduction trong ERD | ERD explanation nói trừ stock khi customer submit; Step 2.4 spec/code trừ khi staff confirm.                             | Xem staff confirm là điểm trừ stock canonical. Update stale ERD docs sau.                                                                                           | Khớp transaction đã implement và business decision.                                      |
| Catalog stock idempotency               | Step 2.4 spec yêu cầu idempotent stock deduction; code Catalog hiện lock row nhưng chưa thấy durable idempotency record. | Theo dõi như hardening item riêng; Step 2.6 chỉ dựa vào `order.confirmed` sau confirm thành công, không gọi stock trực tiếp.                                        | Không block KDS, nhưng quan trọng cho retry correctness.                                 |
| DB query indexes                        | Live DB thiếu vài index hữu ích cho dashboard/rebuild.                                                                   | Thêm index cho active orders, service requests và bills trước tải cao Step 2.6/2.7.                                                                                 | Thêm migration; tránh dashboard/rebuild chậm theo tenant.                                |

### Câu hỏi cần confirm trước implementation

1. Khi KDS `done`, có mark toàn bộ station ticket ready một lần không, hay staff cần mark từng item trong ticket?
2. Nếu item/order đã được báo ready cho customer, recall có cần hiển thị cho customer không, hay chỉ là staff/KDS-only?
3. SLA threshold mặc định cho demo là bao nhiêu theo từng station, và tenant-level customization có bắt buộc trong Step 2.6 không hay defer được?
4. Priority editing chỉ dành cho OWNER/MANAGER, hay CHEF/BARISTA cũng được reprioritize queue của station mình?
5. Với Redis flush recovery, nên chọn explicit Order snapshot rebuild command hay operational procedure reset/replay Kafka offset?
6. BFF nên giữ namespace `/orders` cho toàn bộ realtime event, hay tách thêm `/kds` trong Step 2.6?
7. Product có cần durable replay cho missed WebSocket event không, hay snapshot-on-reconnect là behavior được chấp nhận?
