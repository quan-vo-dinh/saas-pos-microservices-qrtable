# Bước 2.6 — Đặc tả Nghiệp vụ & Kiến trúc Chính thức

> **Giai đoạn:** 2B — Kitchen Service + WebSocket Gateway  
> **Bước:** 2.6 — KDS Redis-only, SLA Worker, WebSocket Gateway hardening  
> **Date:** 2026-05-07  
> **Trạng thái:** Chốt sau audit `docs/superpowers/audits/step-2.6-audit-report.md`  
> **Mục đích:** Tài liệu này là blueprint kỹ thuật/nghiệp vụ cho bước lập kế hoạch triển khai tiếp theo. Đây **không** phải implementation plan và không phân rã task code.

---

## 0. Biên bản quyết định

| Câu hỏi | Quyết định                            | Nội dung chốt                                                                                                                                                                                                                       |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1      | Theo khuyến nghị audit — **Option B** | Kitchen Service consume `order.confirmed`, ghi Redis xong rồi phát internal Redis Pub/Sub event để BFF WebSocket Gateway emit `events.kdsQueueChanged`. BFF không emit KDS queue hint trực tiếp từ `order.confirmed` để tránh race. |
| Q2      | Theo khuyến nghị audit — **Option A** | SLA dùng Redis Sorted Set `kds:sla:due` + worker nội bộ Kitchen Service. Không dùng request-driven check, không dùng Redis keyspace notification.                                                                                   |
| Q3      | **Bỏ hoàn toàn batching**             | Không có tính năng gộp đơn/gộp món trong hệ thống. Không tạo Redis batch keys, không có batch projection, không có UI/API batch contract. Các acceptance cũ về batching trong phase doc bị thay thế bởi FIFO/priority theo ticket.  |
| Q4      | Theo khuyến nghị audit — **Option A** | Redis-only KDS phải có recovery: rebuild từ Order Service active orders khi Kitchen khởi động hoặc khi phát hiện Redis mất state. Kafka replay là hardening tương lai.                                                              |
| Q5      | Theo khuyến nghị audit — **Option A** | Thêm permission mới `KITCHEN_SET_PRIORITY` cho Owner/Manager-only priority flagging. Không dùng chung `KITCHEN_UPDATE_TICKET` cho thao tác priority.                                                                                |

### 0.1 Tài liệu này override các điểm cũ nào?

1. `docs/phases/phase-2b-kitchen-websocket.md` có yêu cầu "Batching: gom cùng món từ các order khác nhau". Yêu cầu này **bị loại bỏ hoàn toàn** theo quyết định Q3.
2. BFF Kafka bridge trong phase doc nói `order.confirmed → room KDS/staff`. Với quyết định Q1, BFF **không** dùng `order.confirmed` để emit KDS queue trực tiếp. KDS queue event chỉ được emit sau khi Kitchen đã ghi Redis.
3. Tên topic canonical là `kitchen.sla_warning`. Mọi biến thể `kitchen.sla_warn` chỉ là drift tài liệu cũ và không được dùng.

---

## 1. Phạm vi và ngoài phạm vi

### 1.1 Trong phạm vi Step 2.6

1. **Kitchen Service Redis-only**

- Tạo service `kitchen` riêng, sở hữu KDS ticket/queue state trong Redis.
- Consume Kafka topic `order.confirmed`.
- Tách ticket theo `station` từ item snapshot: `KITCHEN` hoặc `BAR`.
- Tạo tối đa một ticket cho mỗi `(tenantId, orderId, station)`.
- Duy trì FIFO/priority queue bằng Redis Sorted Set.
- Hỗ trợ ticket lifecycle: `PENDING → PROCESSING → READY`, recall `READY → PROCESSING`, void/archive.
- Chạy SLA worker nội bộ và produce Kafka `kitchen.sla_warning`.
- Expose TCP commands để BFF gọi qua REST guarded endpoints.
- Không có PostgreSQL/MongoDB riêng cho Kitchen.

2. **WebSocket Gateway hardening**

- Socket.IO Gateway trong BFF xác thực handshake thay vì tin client tự join room.
- Gắn Socket.IO Redis Adapter để scale nhiều BFF instances.
- Assign room theo role/session từ server-side auth context.
- Emit realtime hints từ BFF Direct, Kafka bridge, và Kitchen internal events.
- Reconnect policy: client luôn refetch snapshot sau reconnect.

3. **KDS REST/BFF endpoints**

- Queue snapshot query.
- Start ticket.
- Mark ticket done/ready.
- Recall ticket.
- Set/unset priority.

4. **Integration với Order Service**

- Kitchen ticket creation bắt nguồn từ `order.confirmed`.
- Khi ticket done/ready, customer-visible state vẫn phải được đồng bộ về Order Service.
- Transfer table sau khi có KDS ticket phải patch table snapshot trong active KDS tickets.
- Redis recovery rebuild active KDS state từ Order Service active orders.

5. **RBAC**

- Dùng các permission hiện có:
  - `KITCHEN_GET_QUEUE`
  - `KITCHEN_UPDATE_TICKET`
  - `KITCHEN_RECALL`
- Thêm permission mới:
  - `KITCHEN_SET_PRIORITY`
- CHEF chỉ được thao tác station `KITCHEN`.
- BARISTA chỉ được thao tác station `BAR`.
- OWNER/MANAGER được xem/thao tác cả hai station và priority.

### 1.2 Ngoài phạm vi Step 2.6

1. Không triển khai batching/gộp món/gộp đơn dưới bất kỳ dạng nào.
2. Không thêm Kafka topic mới như `kitchen.ticket_changed`.
3. Không làm Redis Stream replay cho WebSocket packet.
4. Không làm full CDC/Debezium outbox.
5. Không triển khai Payment Service đầy đủ, refund, hoặc receipt.
6. Không thay thế Order Service làm source of truth cho customer-visible order state.
7. Không cho client mutate KDS trực tiếp qua WebSocket.

---

## 2. Bounded Context & Source of Truth

| Context                  | Sở hữu                                                                          | Storage                               | Giao tiếp                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Order Service**        | Order, order item, session, bill, service request, customer-visible order state | PostgreSQL + Redis session/cart cache | TCP từ BFF; Kafka producer `order.confirmed`; BFF Direct events                                           |
| **Catalog Service**      | Menu item, station config, stock, table status                                  | PostgreSQL                            | TCP từ BFF/Order                                                                                          |
| **Kitchen Service**      | KDS ticket, station queue, prep state, priority, recall window, SLA state       | Redis-only                            | Kafka consumer `order.confirmed`; Kafka producer `kitchen.sla_warning`; TCP từ BFF; Redis Pub/Sub tới BFF |
| **BFF Realtime Gateway** | HTTP guard boundary, WebSocket handshake, room assignment, WS delivery          | Stateless + Socket.IO Redis Adapter   | REST/TCP orchestration, Redis Pub/Sub, Kafka bridge                                                       |
| **Auth/User-Access**     | Staff identity, tenant claim, roles, permissions                                | Keycloak + MongoDB roles              | gRPC/TCP via existing guard/auth flow                                                                     |

### 2.1 Nguyên tắc source of truth

1. Order Service là source of truth cho khách hàng thấy order đang ở trạng thái nào.
2. Kitchen Redis là source of truth cho màn KDS thấy ticket đang ở trạng thái prep nào.
3. Catalog là source of truth cho `MenuItem.station` hiện tại, nhưng `order.confirmed` mang station snapshot bất biến cho KDS.
4. WebSocket event chỉ là realtime hint. Snapshot REST/TCP mới là dữ liệu để render chính xác sau reconnect.
5. Mọi key, event, command, query đều phải có `tenantId`.

---

## 3. Kafka Topic Registry cho Step 2.6

### 3.1 Topic `order.confirmed`

| Thuộc tính         | Giá trị                                     |
| ------------------ | ------------------------------------------- |
| Producer           | Order Service outbox publisher              |
| Consumer chính     | Kitchen Service                             |
| Consumer group     | `kitchen-service-group`                     |
| Partition key      | `tenantId`                                  |
| Delivery semantics | At-least-once                               |
| Idempotency        | `eventId` + `(tenantId, orderId, station)`  |
| BFF direct bridge? | Không emit KDS queue trực tiếp từ topic này |

Payload canonical hiện tại:

```ts
type OrderConfirmedEvent = {
  eventId: string;
  eventType: 'order.confirmed';
  schemaVersion: 1;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    note?: string;
    status: 'PROCESSING' | 'READY' | 'SERVED' | 'CANCELED';
    station?: 'KITCHEN' | 'BAR';
    createdAt: string;
    updatedAt: string;
  }>;
  totalAmount: number;
  confirmedAt: string;
  confirmedByUserId: string;
  occurredAt: string;
  correlationId?: string;
};
```

Validation rules:

1. `schemaVersion` phải là `1`.
2. `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, `eventId` bắt buộc có.
3. Mỗi item phải có `station`.
4. Item thiếu `station` bị đưa vào Redis dead-letter key, không tự fallback category trong Step 2.6.
5. Một order có thể tạo:
   - 0 ticket nếu mọi item invalid/canceled.
   - 1 ticket nếu chỉ có một station.
   - 2 ticket nếu có cả `KITCHEN` và `BAR`.

### 3.2 Topic `kitchen.sla_warning`

| Thuộc tính             | Giá trị                                           |
| ---------------------- | ------------------------------------------------- |
| Producer               | Kitchen Service SLA Worker                        |
| Consumer chính         | BFF Kafka bridge                                  |
| Consumer tương lai     | Notification/Analytics                            |
| Consumer group của BFF | `bff-kafka-bridge`                                |
| Partition key          | `tenantId`                                        |
| Delivery semantics     | At-least-once                                     |
| Idempotency            | `eventId` + `(tenantId, ticketId, level, bucket)` |

Payload canonical:

```ts
type KitchenSlaWarningEvent = {
  eventId: string;
  eventType: 'kitchen.sla_warning';
  schemaVersion: 1;
  tenantId: string;
  ticketId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: 'KITCHEN' | 'BAR';
  level: 'WARNING' | 'BREACH';
  waitTimeSeconds: number;
  thresholdSeconds: number;
  occurredAt: string;
  correlationId?: string;
};
```

WS mapping:

- `kitchen.sla_warning` → `events.kitchenSlaWarning`
- Rooms:
  - `tenant:{tenantId}:management`
  - `tenant:{tenantId}:kds:kitchen` nếu station là `KITCHEN`
  - `tenant:{tenantId}:kds:bar` nếu station là `BAR`

### 3.3 Topic `payment.completed`

Step 2.6 chỉ chuẩn bị bridge contract vì topic này thuộc Phase 3.

| Thuộc tính             | Giá trị                               |
| ---------------------- | ------------------------------------- |
| Producer               | Payment Service                       |
| Consumer chính         | Order/Catalog/Notification/BFF bridge |
| Consumer group của BFF | `bff-kafka-bridge`                    |
| Partition key          | `tenantId`                            |

Payload tối thiểu cho BFF bridge:

```ts
type PaymentCompletedEvent = {
  eventId: string;
  eventType: 'payment.completed';
  schemaVersion: 1;
  tenantId: string;
  paymentId: string;
  billId: string;
  sessionId: string;
  tableId: string;
  amount: number;
  method: 'cash' | 'stripe' | 'bank_transfer';
  paidAt: string;
  occurredAt: string;
  correlationId?: string;
};
```

WS mapping:

- `payment.completed` → `events.paymentCompleted`
- Rooms:
  - `session:{sessionId}:customer`
  - `tenant:{tenantId}:staff`

### 3.4 Internal Redis Pub/Sub event từ Kitchen sang BFF

Không thêm Kafka topic cho KDS queue change. Kitchen publish Redis Pub/Sub sau khi Redis write thành công.

Channel:

```txt
realtime:kds:{tenantId}
```

BFF subscribe pattern:

```txt
realtime:kds:*
```

Payload:

```ts
type KdsQueueChangedInternalEvent = {
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  ticketId?: string;
  orderId?: string;
  reason:
    | 'TICKET_CREATED'
    | 'TICKET_STARTED'
    | 'TICKET_READY'
    | 'TICKET_RECALLED'
    | 'TICKET_VOIDED'
    | 'PRIORITY_CHANGED'
    | 'TABLE_SNAPSHOT_PATCHED'
    | 'SNAPSHOT_REBUILT'
    | 'SLA_CHANGED';
  revision: number;
  occurredAt: string;
  correlationId?: string;
};
```

Redis Pub/Sub event là hint không durable. Nếu BFF hoặc client miss event, reconnect/refetch snapshot vẫn phải đúng.

---

## 4. Redis Data Structure — Kitchen Service

### 4.1 Station values

Canonical station values:

```txt
KITCHEN
BAR
```

Station slug dùng cho required phase keys:

```txt
KITCHEN -> kitchen
BAR     -> bar
```

### 4.2 Ticket identity

Một ticket đại diện cho một order ở một station.

```txt
ticketId = {orderId}:{station}
```

Ví dụ:

```txt
0a1b...-order-id:KITCHEN
0a1b...-order-id:BAR
```

`ticketId` là deterministic để chống duplicate khi Kafka retry.

### 4.3 Ticket item identity

Một `orderItemId` map trực tiếp thành một KDS ticket item.

```txt
ticketItemId = {orderItemId}
```

Không tạo ID riêng nếu không cần, vì `orderItemId` đã là identity bền vững từ Order Service.

### 4.4 Core keys

| Key                                                | Type             | TTL / retention                                  | Owner   | Mục đích                                                                 |
| -------------------------------------------------- | ---------------- | ------------------------------------------------ | ------- | ------------------------------------------------------------------------ |
| `kds:{tid}:ticket:{ticketId}`                      | Hash             | Không TTL khi active; set TTL 24-48h sau archive | Kitchen | Aggregate root của KDS ticket.                                           |
| `kds:{tid}:ticket:{ticketId}:items`                | Set              | Cùng retention với ticket                        | Kitchen | Danh sách `ticketItemId`.                                                |
| `kds:{tid}:ticket-item:{ticketItemId}`             | Hash             | Cùng retention với ticket                        | Kitchen | State từng item trong ticket.                                            |
| `kds:{tid}:order:{orderId}:tickets`                | Set              | Cùng retention với ticket                        | Kitchen | Lookup ticket theo order để cancel/transfer/patch.                       |
| `kds:{tid}:kitchen`                                | Sorted Set       | Không TTL                                        | Kitchen | Active queue của station KITCHEN: chứa ticket `PENDING` và `PROCESSING`. |
| `kds:{tid}:bar`                                    | Sorted Set       | Không TTL                                        | Kitchen | Active queue của station BAR: chứa ticket `PENDING` và `PROCESSING`.     |
| `kds:{tid}:station:{station}:READY`                | Sorted Set       | Recall/pickup window                             | Kitchen | Ticket READY còn có thể recall hoặc cần staff visibility.                |
| `kds:{tid}:revision`                               | String counter   | Không TTL                                        | Kitchen | Tenant-level revision.                                                   |
| `kds:{tid}:station:{station}:revision`             | String counter   | Không TTL                                        | Kitchen | Station-level revision.                                                  |
| `kds:{tid}:dedupe:event:{eventId}`                 | String           | 14 ngày                                          | Kitchen | Idempotency theo Kafka event.                                            |
| `kds:{tid}:dedupe:order:{orderId}:{station}`       | String           | 14 ngày                                          | Kitchen | Chống duplicate ticket theo order/station.                               |
| `kds:{tid}:source-event:{eventId}:tickets`         | Set              | 14 ngày                                          | Kitchen | Debug mapping event → ticket IDs.                                        |
| `kds:sla:due`                                      | Sorted Set       | Không TTL                                        | Kitchen | Global due index cho SLA worker.                                         |
| `kds:{tid}:ticket:{ticketId}:sla`                  | Hash             | Cùng retention với ticket                        | Kitchen | SLA state của ticket.                                                    |
| `kds:{tid}:dedupe:sla:{ticketId}:{level}:{bucket}` | String           | 24h                                              | Kitchen | Chống cảnh báo SLA lặp.                                                  |
| `kds:cleanup:due`                                  | Sorted Set       | Không TTL                                        | Kitchen | Ticket đến hạn archive/delete.                                           |
| `kds:{tid}:dead-letter:order-confirmed`            | List hoặc Stream | Cap 1000 records, TTL 7 ngày                     | Kitchen | Lưu payload invalid để debug.                                            |
| `lock:kds:{tid}:ticket:{ticketId}`                 | String           | PX 5-10s                                         | Kitchen | Optional lock cho command phức tạp.                                      |
| `lock:kds:rebuild:{tid}`                           | String           | PX theo timeout rebuild                          | Kitchen | Chống nhiều rebuild cùng tenant.                                         |

### 4.5 Ticket hash fields

```txt
tenantId
ticketId
orderId
sessionId
tableId
tableName
station
status                 # PENDING | PROCESSING | READY | VOIDED | ARCHIVED
priority               # 0 | 1
queueScore
confirmedAt
createdAt
startedAt
readyAt
voidedAt
archivedAt
recallUntil
slaSeconds
slaDueAt
lastWarningLevel       # NONE | WARNING | BREACH
revision
sourceEventId
correlationId
recovered              # 0 | 1
recoveredAt
updatedAt
```

### 4.6 Ticket item hash fields

```txt
tenantId
ticketItemId
ticketId
orderId
orderItemId
menuItemId
menuItemName
quantity
unitPrice
note
station
status                 # PENDING | PROCESSING | READY | CANCELED
createdAt
startedAt
readyAt
revision
```

### 4.7 Queue score

Redis Sorted Set score:

```txt
PRIORITY_BUCKET_FACTOR = 10_000_000_000_000
priorityRank = 0 nếu priority = true
priorityRank = 1 nếu priority = false
queueScore = priorityRank * PRIORITY_BUCKET_FACTOR + confirmedAtEpochMs
```

Ý nghĩa:

- Priority ticket luôn đứng trước normal ticket trong cùng station.
- FIFO vẫn giữ bên trong mỗi priority bucket.
- Khi bật/tắt priority, cập nhật lại `queueScore` trong active queue tương ứng.

### 4.8 Không có batching keys

Các key sau **không được tạo** trong Step 2.6:

```txt
kds:{tid}:station:{station}:batches
kds:{tid}:batch:{...}
kds:{tid}:batch:{...}:items
kds:{tid}:ticket-item:{ticketItemId}:batch
```

Không có `prepSignature`, không có `activeQuantity`, không có group total xuyên order.

KDS UI có thể hiển thị nhiều ticket cùng món, nhưng không được gom chúng thành một batch backend contract.

---

## 5. KDS Ticket Lifecycle

### 5.1 State machine

```txt
Kafka order.confirmed
        |
        v
     PENDING
        |
        | start
        v
   PROCESSING
        |
        | done
        v
      READY
        |
        | recall trong recall window
        v
   PROCESSING

PENDING / PROCESSING / READY -- order cancel / compensation --> VOIDED
READY / VOIDED -- cleanup retention --> ARCHIVED
```

### 5.2 Transition rules

| From                           | To           | Trigger                   | Actor                      | Permission              | Ghi chú                                                            |
| ------------------------------ | ------------ | ------------------------- | -------------------------- | ----------------------- | ------------------------------------------------------------------ |
| none                           | `PENDING`    | Kafka `order.confirmed`   | Kitchen consumer           | Service principal       | Idempotent create.                                                 |
| `PENDING`                      | `PROCESSING` | Start ticket              | CHEF/BARISTA/OWNER/MANAGER | `KITCHEN_UPDATE_TICKET` | Station restriction bắt buộc.                                      |
| `PROCESSING`                   | `READY`      | Done ticket               | CHEF/BARISTA/OWNER/MANAGER | `KITCHEN_UPDATE_TICKET` | Phải sync Order Service trước khi emit customer/staff ready event. |
| `READY`                        | `PROCESSING` | Recall                    | CHEF/BARISTA/OWNER/MANAGER | `KITCHEN_RECALL`        | Chỉ trong recall window.                                           |
| `PENDING`/`PROCESSING`/`READY` | `VOIDED`     | Order cancel/compensation | Order/BFF-driven command   | Theo command gốc        | Remove khỏi active/ready queue.                                    |
| `READY`/`VOIDED`               | `ARCHIVED`   | Cleanup worker            | Kitchen internal           | Service principal       | Xóa khỏi queue, set TTL hoặc delete.                               |

### 5.3 Start ticket

Input command:

```ts
type KdsStartTicketCommand = {
  tenantId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  userId: string;
  requestId: string;
  correlationId?: string;
};
```

Behavior:

1. Validate ticket exists and `tenantId/station` match.
2. Validate ticket status is `PENDING`.
3. Atomically:
   - set ticket `status = PROCESSING`;
   - set `startedAt`;
   - set every ticket item `status = PROCESSING`;
   - increment tenant/station revision;
   - keep member in `kds:{tid}:{stationSlug}` active queue.
4. Publish internal Redis Pub/Sub `kds.queue_changed` reason `TICKET_STARTED`.

Idempotency:

- If same `requestId` repeats after success, return current ticket state.
- If ticket already `PROCESSING`, return success only when same user/request path is idempotent; otherwise return conflict with current state.

### 5.4 Done / ready ticket

Input command:

```ts
type KdsMarkTicketReadyCommand = {
  tenantId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  userId: string;
  requestId: string;
  correlationId?: string;
};
```

Authoritative sequence through BFF:

1. BFF validates JWT + `KITCHEN_UPDATE_TICKET` + station restriction.
2. BFF calls Kitchen TCP `KITCHEN.MARK_READY`.
3. Kitchen atomically transitions Redis ticket `PROCESSING → READY`.
4. BFF calls Order TCP command to mark corresponding order items ready.
5. If Order update succeeds:
   - BFF emits `events.kitchenItemReady` to staff/customer rooms.
   - BFF emits/keeps `events.orderStatusChanged` according to Order response.
6. If Order update fails:
   - BFF calls Kitchen compensation command to recall ticket back to `PROCESSING`.
   - BFF does **not** emit customer ready event.
   - If compensation fails, log critical operational error with `correlationId`.

Kitchen Redis mutation:

- Remove `ticketId` from active queue `kds:{tid}:{stationSlug}`.
- Add `ticketId` to `kds:{tid}:station:{station}:READY` with score `readyAtEpochMs`.
- Set `readyAt`.
- Set `recallUntil = readyAt + recallWindowSeconds`.
- Increment revisions.
- Publish internal event `TICKET_READY`.

### 5.5 Recall ticket

Input command:

```ts
type KdsRecallTicketCommand = {
  tenantId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  userId: string;
  requestId: string;
  reason?: string;
  correlationId?: string;
};
```

Behavior:

1. Validate ticket status is `READY`.
2. Validate `now <= recallUntil`.
3. Atomically:
   - set `status = PROCESSING`;
   - clear `readyAt` or retain as historical field and set `updatedAt`;
   - remove from `READY` sorted set;
   - re-add to active queue `kds:{tid}:{stationSlug}` using original `queueScore`;
   - increment revisions.
4. BFF calls Order Service to revert item/order readiness where business rules allow.
5. Publish internal event `TICKET_RECALLED`.

Recall window default:

```txt
KDS_RECALL_WINDOW_SECONDS = 300
```

### 5.6 Void ticket

Void is not a normal KDS user action. It is triggered by Order cancel or compensation.

Input:

```ts
type KdsVoidTicketsByOrderCommand = {
  tenantId: string;
  orderId: string;
  reason: 'ORDER_CANCELED' | 'STOCK_COMPENSATION' | 'TRANSFER_COMPENSATION';
  correlationId?: string;
};
```

Behavior:

- Lookup `kds:{tid}:order:{orderId}:tickets`.
- For each ticket:
  - set status `VOIDED`;
  - remove from active queue and READY queue;
  - remove SLA due entries where possible;
  - schedule cleanup.
- Publish internal event `TICKET_VOIDED`.

### 5.7 Archive / cleanup

Cleanup worker handles:

- `READY` after recall/pickup window.
- `VOIDED` after debug retention.
- Dangling queue members.

Default retention:

```txt
KDS_READY_RETENTION_SECONDS = 3600
KDS_ARCHIVED_TTL_SECONDS = 86400
```

---

## 6. SLA Worker

### 6.1 SLA policy

Default policy:

```txt
KDS_DEFAULT_SLA_SECONDS = 900          # 15 phút
KDS_BREACH_GRACE_SECONDS = 300         # thêm 5 phút sau WARNING
KDS_SLA_WORKER_INTERVAL_MS = 5000
```

Per-tenant/per-station config có thể được cache ở:

```txt
kds:{tid}:settings
```

Nếu chưa có tenant settings service, Step 2.6 dùng default config từ env.

### 6.2 Due index

Key:

```txt
kds:sla:due
```

Member format:

```txt
{tenantId}|{station}|{ticketId}|{level}
```

Scores:

```txt
WARNING score = confirmedAtEpochMs + slaSeconds * 1000
BREACH score  = confirmedAtEpochMs + (slaSeconds + breachGraceSeconds) * 1000
```

### 6.3 Worker algorithm

1. Mỗi `KDS_SLA_WORKER_INTERVAL_MS`, scan:

```txt
ZRANGEBYSCORE kds:sla:due -inf now LIMIT 0 N
```

2. Claim due member bằng Lua hoặc lock ngắn.
3. Re-read ticket hash.
4. Skip nếu ticket status là `READY`, `VOIDED`, hoặc `ARCHIVED`.
5. Check dedupe:

```txt
kds:{tid}:dedupe:sla:{ticketId}:{level}:{bucket}
```

6. Produce Kafka `kitchen.sla_warning`.
7. Update `lastWarningLevel`.
8. Publish internal Redis Pub/Sub reason `SLA_CHANGED`.

### 6.4 SLA warning levels

| Level     | Điều kiện                                              | UI expectation       | Kafka                         |
| --------- | ------------------------------------------------------ | -------------------- | ----------------------------- |
| `WARNING` | `now >= confirmedAt + slaSeconds`                      | Ticket cảnh báo vàng | Produce `kitchen.sla_warning` |
| `BREACH`  | `now >= confirmedAt + slaSeconds + breachGraceSeconds` | Ticket cảnh báo đỏ   | Produce `kitchen.sla_warning` |

---

## 7. WebSocket Gateway

### 7.1 Namespace

Giữ namespace hiện có:

```txt
/orders
```

Không bắt buộc tạo `/kds` trong Step 2.6. Nếu sau này tách namespace, contract room/event vẫn giữ nguyên.

### 7.2 Socket.IO Redis Adapter

BFF phải dùng custom `IoAdapter` với Socket.IO Redis Adapter để broadcast qua nhiều instance.

Yêu cầu vận hành:

- Dùng Redis pub/sub client riêng cho Socket.IO adapter.
- Register adapter trước khi app listen/gateway hoạt động.
- Nếu bật long-polling, load balancer phải sticky-session; hoặc cấu hình client `transports: ['websocket']`.
- Adapter không cung cấp replay. Reconnect vẫn phải REST snapshot.

### 7.3 Handshake auth — Staff

Client gửi JWT trong một trong các vị trí được hỗ trợ:

```txt
Authorization: Bearer <jwt>
auth.token
```

Gateway phải:

1. Verify JWT qua Authorizer hoặc shared auth verification service tương đương `UserGuard`.
2. Resolve `tenantId` từ claim `tenant_id`.
3. Resolve roles/permissions từ AuthorizeResponse.
4. Reject socket nếu:
   - token invalid;
   - user not provisioned;
   - tenant missing/mismatch;
   - role không có room nào hợp lệ.

### 7.4 Handshake auth — Customer

Client gửi:

```txt
x-session-id
x-tenant-id hoặc tenant context tương đương QR/session flow
```

Gateway phải:

1. Validate session ID tồn tại và thuộc tenant.
2. Không tạo session mới trong WebSocket handshake.
3. Join room `session:{sessionId}:customer` sau khi validation thành công.
4. Nếu session expired/closed, reject socket hoặc emit auth error rồi disconnect.

### 7.5 Room assignment

| Actor    | Room                       |
| -------- | -------------------------- |
| WAITER   | `tenant:{tid}:staff`       |
| CHEF     | `tenant:{tid}:kds:kitchen` |
| BARISTA  | `tenant:{tid}:kds:bar`     |
| OWNER    | `tenant:{tid}:management`  |
| MANAGER  | `tenant:{tid}:management`  |
| CUSTOMER | `session:{sid}:customer`   |

OWNER/MANAGER station subscriptions:

- OWNER/MANAGER may subscribe to `tenant:{tid}:kds:kitchen` and/or `tenant:{tid}:kds:bar`.
- Subscription must be server-validated.
- CHEF/BARISTA cannot subscribe to the other station.

Client-originated `join.staff` and `join.session` are deprecated and must not be trusted after Step 2.6.

### 7.6 WebSocket event names and payloads

#### `events.kdsQueueChanged`

Rooms:

- `tenant:{tid}:kds:kitchen` for KITCHEN.
- `tenant:{tid}:kds:bar` for BAR.
- `tenant:{tid}:management`.

Payload:

```ts
type KdsQueueChangedEvent = {
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  revision: number;
  reason:
    | 'TICKET_CREATED'
    | 'TICKET_STARTED'
    | 'TICKET_READY'
    | 'TICKET_RECALLED'
    | 'TICKET_VOIDED'
    | 'PRIORITY_CHANGED'
    | 'TABLE_SNAPSHOT_PATCHED'
    | 'SNAPSHOT_REBUILT'
    | 'SLA_CHANGED';
  ticketId?: string;
  orderId?: string;
  occurredAt: string;
  correlationId?: string;
};
```

Client action:

- Invalidate/refetch KDS queue snapshot.
- Do not mutate local state as source of truth unless optimistic UI is explicitly guarded by revision.

#### `events.kitchenItemReady`

Rooms:

- `tenant:{tid}:staff`
- `session:{sid}:customer`

Payload:

```ts
type KitchenItemReadyEvent = {
  eventId: string;
  eventType: 'kitchen.item_ready';
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  orderId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  readyItems: Array<{
    orderItemId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    note?: string;
  }>;
  occurredAt: string;
  correlationId?: string;
};
```

Emit condition:

- Chỉ emit sau khi Kitchen ticket/item ready và Order Service readiness update đều thành công.

#### `events.kitchenSlaWarning`

Rooms:

- `tenant:{tid}:management`
- Station KDS room tương ứng.

Payload:

```ts
type KitchenSlaWarningWsEvent = KitchenSlaWarningEvent;
```

#### Existing direct events

Các event Step 2.4 vẫn giữ:

- `events.cartUpdated`
- `events.orderCreated`
- `events.orderStatusChanged`
- `events.serviceRequested`
- `events.billRequested`
- `events.tableTransferred`

---

## 8. BFF REST Contract cho KDS

Tất cả endpoint staff dùng:

```txt
UserGuard -> TenantGuard -> PermissionGuard
```

Global runtime vẫn có `SessionGuard`, nhưng route secured phải bypass session theo pattern hiện tại.

### 8.1 Get KDS queue

```http
GET /api/v1/admin/kds/queue?station=KITCHEN
GET /api/v1/admin/kds/queue?station=BAR
```

Permission:

```txt
KITCHEN_GET_QUEUE
```

Response:

```ts
type KdsQueueSnapshot = {
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  revision: number;
  serverTime: string;
  tickets: KdsTicketDto[];
};
```

Ticket DTO:

```ts
type KdsTicketDto = {
  ticketId: string;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: 'KITCHEN' | 'BAR';
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'VOIDED' | 'ARCHIVED';
  priority: boolean;
  queueScore: number;
  queuePosition: number;
  confirmedAt: string;
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  recallUntil?: string;
  slaSeconds: number;
  slaDueAt: string;
  waitTimeSeconds: number;
  warningLevel: 'NONE' | 'WARNING' | 'BREACH';
  recovered: boolean;
  items: KdsTicketItemDto[];
};
```

Item DTO:

```ts
type KdsTicketItemDto = {
  ticketItemId: string;
  orderItemId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'CANCELED';
};
```

No batching fields are allowed in this response.

### 8.2 Start ticket

```http
POST /api/v1/admin/kds/tickets/:ticketId/start
```

Permission:

```txt
KITCHEN_UPDATE_TICKET
```

Body:

```ts
type StartTicketRequest = {
  requestId: string;
};
```

### 8.3 Mark ticket done

```http
POST /api/v1/admin/kds/tickets/:ticketId/done
```

Permission:

```txt
KITCHEN_UPDATE_TICKET
```

Body:

```ts
type DoneTicketRequest = {
  requestId: string;
};
```

### 8.4 Recall ticket

```http
POST /api/v1/admin/kds/tickets/:ticketId/recall
```

Permission:

```txt
KITCHEN_RECALL
```

Body:

```ts
type RecallTicketRequest = {
  requestId: string;
  reason?: string;
};
```

### 8.5 Set priority

```http
POST /api/v1/admin/kds/tickets/:ticketId/priority
```

Permission:

```txt
KITCHEN_SET_PRIORITY
```

Body:

```ts
type SetTicketPriorityRequest = {
  requestId: string;
  priority: boolean;
};
```

Authorization:

- OWNER/MANAGER only through new permission.
- CHEF/BARISTA must not receive this permission in `role.json`.

---

## 9. TCP Message Contract

### 9.1 New Kitchen TCP message group

Add conceptual message patterns:

```ts
TCP_REQUEST_MESSAGE.KITCHEN = {
  GET_QUEUE: 'kitchen.get_queue',
  START_TICKET: 'kitchen.start_ticket',
  MARK_READY: 'kitchen.mark_ready',
  RECALL_TICKET: 'kitchen.recall_ticket',
  SET_PRIORITY: 'kitchen.set_priority',
  VOID_BY_ORDER: 'kitchen.void_by_order',
  PATCH_TABLE_SNAPSHOT: 'kitchen.patch_table_snapshot',
  REBUILD_TENANT: 'kitchen.rebuild_tenant',
};
```

### 9.2 Kitchen command common context

```ts
type KitchenCommandContext = {
  tenantId: string;
  userId?: string;
  requestId: string;
  processId?: string;
  correlationId?: string;
};
```

### 9.3 Order TCP additions needed by Step 2.6

Kitchen/BFF needs Order Service support for:

```ts
TCP_REQUEST_MESSAGE.ORDER.KDS_ACTIVE_ORDERS_GET = 'order.kds_active_orders_get';
TCP_REQUEST_MESSAGE.ORDER.MARK_ITEMS_READY = 'order.mark_items_ready';
TCP_REQUEST_MESSAGE.ORDER.REVERT_ITEMS_PROCESSING = 'order.revert_items_processing';
```

These are blueprint-level contracts for the later implementation plan.

`KDS_ACTIVE_ORDERS_GET` response should return active order snapshots shaped close to `OrderConfirmedEvent`, so Kitchen can rebuild Redis without querying Catalog.

---

## 10. Recovery / Rebuild

### 10.1 Trigger conditions

Kitchen must support rebuild when:

1. Kitchen starts and detects missing tenant/station revision keys while active orders exist.
2. Admin/dev explicitly triggers rebuild.
3. Health check detects Redis KDS keys are empty/inconsistent.

### 10.2 Rebuild source

Primary rebuild source:

```txt
Order Service active orders
```

Kitchen calls Order TCP:

```txt
order.kds_active_orders_get
```

Input:

```ts
type KdsActiveOrdersGetRequest = {
  tenantId: string;
  station?: 'KITCHEN' | 'BAR';
};
```

Response:

```ts
type KdsActiveOrderSnapshot = {
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  confirmedAt: string;
  confirmedByUserId?: string;
  items: OrderConfirmedEvent['items'];
  correlationId?: string;
};
```

### 10.3 Rebuild behavior

1. Acquire `lock:kds:rebuild:{tenantId}`.
2. Load active Order snapshots.
3. For each snapshot, derive station tickets.
4. Create missing tickets idempotently.
5. Tickets rebuilt from Order use:

```txt
status = PENDING
recovered = 1
recoveredAt = now
sourceEventId = "rebuild:{tenantId}:{orderId}:{station}"
```

6. If Order item status is already `READY`/`SERVED`, do not rebuild it into active KDS.
7. Increment tenant/station revision.
8. Publish internal event `SNAPSHOT_REBUILT`.
9. Release rebuild lock.

### 10.4 Recovery limitation

Redis rebuild from Order cannot perfectly restore whether a chef had already pressed Start before Redis loss. This is acceptable for Step 2.6 because Order is the durable source and KDS is an operational view.

If stronger prep-state recovery is required later, use Kafka replay plus durable KDS audit in a future hardening phase.

---

## 11. Table Transfer Interaction

Step 2.4 transfer table remains BFF Direct and does not add Kafka topic.

After transfer succeeds:

1. BFF receives authoritative `tableTransferred` response from Order/Catalog saga.
2. BFF emits existing `events.tableTransferred`.
3. BFF calls Kitchen TCP:

```txt
kitchen.patch_table_snapshot
```

Input:

```ts
type PatchKdsTableSnapshotCommand = {
  tenantId: string;
  sessionId: string;
  fromTableId: string;
  toTableId: string;
  toTableName: string;
  requestId: string;
  correlationId?: string;
};
```

Kitchen behavior:

- Find active tickets by scanning/maintaining session lookup.
- Patch `tableId/tableName` on ticket hashes.
- Increment revision.
- Publish internal event `TABLE_SNAPSHOT_PATCHED`.

Recommended additional index:

```txt
kds:{tid}:session:{sessionId}:tickets
```

Type:

```txt
Set(ticketId)
```

Retention:

- Same as ticket retention.

---

## 12. RBAC Updates

### 12.1 New permission

Add:

```ts
PERMISSION.KITCHEN_SET_PRIORITY = 'kitchen.set_priority';
```

### 12.2 Role matrix update

| Permission              | SUPER_ADMIN | OWNER | MANAGER | WAITER | CHEF | BARISTA |
| ----------------------- | ----------- | ----- | ------- | ------ | ---- | ------- |
| `kitchen.get_queue`     | yes         | yes   | yes     | no     | yes  | yes     |
| `kitchen.update_ticket` | yes         | yes   | yes     | no     | yes  | yes     |
| `kitchen.recall`        | yes         | yes   | yes     | no     | yes  | yes     |
| `kitchen.set_priority`  | yes         | yes   | yes     | no     | no   | no      |

### 12.3 Station restriction

Permission alone is not enough. Service must also enforce station scope:

| Role        | Station access                                              |
| ----------- | ----------------------------------------------------------- |
| CHEF        | `KITCHEN` only                                              |
| BARISTA     | `BAR` only                                                  |
| OWNER       | `KITCHEN`, `BAR`                                            |
| MANAGER     | `KITCHEN`, `BAR`                                            |
| SUPER_ADMIN | Debug/admin only; tenant rules still need explicit handling |

---

## 13. Idempotency and Race Conditions

### 13.1 Kafka consumer idempotency

Kitchen consumer must treat duplicates as success.

Atomic create script must ensure:

```txt
SET NX kds:{tid}:dedupe:event:{eventId}
SET NX kds:{tid}:dedupe:order:{orderId}:{station}
```

If dedupe keys already exist and ticket exists, handler returns success and commits Kafka offset.

### 13.2 Command idempotency

Every mutating REST command requires `requestId`.

Recommended key:

```txt
kds:{tid}:command:{requestId}
```

Type:

```txt
String or Hash
```

TTL:

```txt
24h
```

Stores:

- command type;
- ticketId;
- result status;
- response snapshot hash or minimal result.

### 13.3 Atomicity

Use Lua script or `WATCH`/`MULTI` for any operation touching multiple keys:

- create ticket from Kafka;
- start ticket;
- mark ready;
- recall;
- priority update;
- void ticket;
- SLA claim;
- cleanup.

No independent `GET` then `SET` sequence is allowed for ticket status transitions.

---

## 14. Reconnection and Snapshot Policy

### 14.1 KDS client reconnect

On socket reconnect:

1. Gateway re-authenticates socket.
2. Gateway rejoins server-derived rooms.
3. Client immediately calls queue snapshot REST.
4. Client replaces local KDS state with snapshot.

### 14.2 Revision policy

Every KDS snapshot includes:

```txt
revision
serverTime
```

Every KDS WS hint includes:

```txt
revision
```

If client observes a revision gap or any reconnect event, it refetches snapshot.

### 14.3 No pending event replay

Step 2.6 does not implement durable WS packet replay.

Allowed:

- reconnect → REST snapshot;
- React Query invalidation;
- optional local UI optimistic state while request is pending.

Not allowed:

- relying on Socket.IO adapter for replay;
- storing mandatory UI events only in memory.

---

## 15. No Batching Policy

This section is intentionally explicit because older docs mention batching.

### 15.1 Removed concepts

The following concepts do not exist in Step 2.6:

- batch queue;
- batch total;
- batch item group;
- prep signature;
- grouped KDS row;
- "same item across tables" aggregation;
- batch Redis key;
- batch WebSocket event;
- batch API endpoint.

### 15.2 Display rule

If three tables order `Pho bo`, KDS shows them as normal tickets/items according to order/station/FIFO/priority. It does not show "Pho bo x3" as a backend-derived group.

### 15.3 Same order duplicate item lines

If the same order contains multiple lines for the same menu item:

- Keep them as their own `orderItemId` lines.
- Do not merge them in Kitchen.
- UI may render them visually adjacent inside the same ticket, but the backend state remains line-based.

---

## 16. Acceptance Criteria — Updated

### 16.1 KDS

- `order.confirmed` creates deterministic station tickets in Redis.
- Same Kafka event retry does not create duplicate tickets.
- FIFO works by `confirmedAt` within normal priority bucket.
- Priority moves ticket before normal tickets and is Owner/Manager-only.
- CHEF cannot access BAR queue; BARISTA cannot access KITCHEN queue.
- Start/Done/Recall mutate Redis atomically and increment revision.
- Done updates Order Service before customer/staff ready notification is emitted.
- Recall is possible only within recall window.
- Transfer table patches active KDS ticket table snapshot.
- Redis rebuild from Order active orders works after empty KDS Redis state.
- No batching behavior exists anywhere in backend contract.

### 16.2 SLA

- SLA worker emits `kitchen.sla_warning` without requiring HTTP traffic.
- Duplicate worker scans do not emit repeated warnings for the same bucket.
- WARNING and BREACH levels map to station room and management room.

### 16.3 WebSocket

- Socket rooms are server-derived from JWT/session.
- Client cannot self-join arbitrary tenant/session/station rooms.
- Socket.IO Redis Adapter supports multi-instance broadcast.
- Reconnect triggers room rejoin and REST snapshot refresh.
- WS event is a hint; REST snapshot is source of truth.

### 16.4 Kafka / topic contract

- Canonical topics:
  - `order.confirmed`
  - `kitchen.sla_warning`
  - `payment.completed`
- No `kitchen.sla_warn`.
- No `kitchen.ticket_changed` in Step 2.6.
- BFF does not emit KDS queue directly from `order.confirmed`.

---

## 17. Verification Scenarios for Future Plan

These are scenario requirements, not implementation tasks.

1. Publish `order.confirmed` with KITCHEN item → Redis ticket appears in `kds:{tid}:kitchen`; KDS room receives `events.kdsQueueChanged`.
2. Publish duplicate `order.confirmed` with same `eventId` → no duplicate ticket.
3. Publish duplicate with different `eventId` but same `(orderId, station)` → no duplicate ticket.
4. Start ticket as CHEF for KITCHEN → success.
5. Start BAR ticket as CHEF → 403/permission or station scope error.
6. Set priority as MANAGER → queue score updates.
7. Set priority as CHEF → forbidden.
8. Done ticket → Kitchen Redis ready + Order item ready + customer/staff WS ready event.
9. Done ticket while Order update fails → Kitchen rollback/compensation and no customer ready event.
10. Recall within window → ticket returns to PROCESSING.
11. Recall after window → conflict.
12. SLA due passes with no requests → Kafka `kitchen.sla_warning` produced.
13. KDS client disconnects before ticket created, reconnects later → queue snapshot contains ticket.
14. Redis KDS keys flushed while Order has active PROCESSING orders → rebuild recreates KDS tickets with `recovered = true`.
15. Multiple same menu items across tables → no batch/group total appears in API or Redis.

---

## 18. Notes for the Next Writing-Plans Step

When turning this spec into an implementation plan, preserve these boundaries:

1. Do not reintroduce batching as "small helper" or UI convenience.
2. Add `KITCHEN_SET_PRIORITY` before exposing priority endpoint.
3. Build WS handshake hardening before relying on KDS rooms.
4. Treat Redis Pub/Sub as hint channel only.
5. Include recovery/rebuild in the first complete Step 2.6 slice, because Redis-only without rebuild is an unsafe operational story.
