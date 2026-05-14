# Bước 2.4 — Đặc tả Luồng nghiệp vụ cuối cùng

> **Giai đoạn:** 2A — Phân quyền + Đơn hàng + Kafka  
> **Bước:** 2.4 — Backend Order Service, Redis, Kafka, BFF trực tiếp  
> **Date:** 2026-04-27  
> **Trạng thái:** Chốt từ các quyết định rà soát Q1–Q12  
> **Mục đích:** Tài liệu này lưu đặc tả nghiệp vụ đã chốt cho Step 2.4. Đây không phải implementation plan; trạng thái triển khai cuối cùng xem [`docs/phases/phase-2a-order-kafka.md`](../phases/phase-2a-order-kafka.md).

---

## 0. Biên bản quyết định

Đặc tả này chốt các quyết định rà soát Q1–Q12 như sau:

| Câu hỏi | Lựa chọn | Quyết định                                                                                                                                                                                             |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1      | **B**    | Catalog Service sở hữu locking/deduction stock thông qua transactional TCP commands. Order Service không được mutate trực tiếp stock menu item do Catalog sở hữu.                                      |
| Q2      | **B**    | Stock được deduct khi staff confirm order: `PENDING → PROCESSING`. Hành động submit của customer chỉ validate availability snapshot.                                                                   |
| Q3      | **B**    | Bill được tạo ở lần submit order đầu tiên trong session. Bill bắt đầu ở trạng thái `OPEN` và aggregate tất cả order không bị canceled trong session.                                                   |
| Q4      | **C**    | Thêm explicit bill request command. `REQUEST_BILL` service request là side effect cho notification, không phải business command duy nhất.                                                              |
| Q5      | **B**    | Transfer table dùng saga-style consistency với transfer lock và compensation giữa Order, Catalog và Redis. Từ góc nhìn user/client là atomic, nhưng không phải một ACID transaction xuyên kho dữ liệu. |
| Q6      | **B**    | Session được persist trong PostgreSQL của Order Service, Redis dùng làm active/session-cache layer.                                                                                                    |
| Q7      | **C**    | Tách quyền cancel theo state: pending cancel và processing cancel. Cần cập nhật RBAC trước hoặc trong quá trình implementation planning Step 2.4.                                                      |
| Q8      | **B**    | Mở rộng `OrderConfirmedEvent` với table snapshot, event metadata và station route/item metadata.                                                                                                       |
| Q9      | **A**    | Thêm shared cart realtime contract: `CartUpdatedEvent` và conflict semantics.                                                                                                                          |
| Q10     | **A**    | Triển khai minimal BFF WebSocket gateway ngay cho direct events Step 2.4/2.5. Phase 2B sẽ harden/scale bằng Redis Adapter và Kafka bridge.                                                             |
| Q11     | **A**    | Thêm `station` vào Catalog `MenuItem` làm nguồn canonical cho KDS routing.                                                                                                                             |
| Q12     | **A**    | Step 2.4 dừng ở bill `PENDING_PAYMENT`; chưa có cash payment confirmation. Payment execution để lại cho Phase 3.                                                                                       |

---

## 1. Phạm vi và ngoài phạm vi

### 1.1 Trong phạm vi

Step 2.4 định nghĩa luồng nghiệp vụ backend cho:

1. **Vòng đời phiên khách hàng**

- Session được persist trong Order PostgreSQL.
- Redis active cache để customer truy cập nhanh và lưu idle/TTL metadata.
- Validate session ownership theo phạm vi QR/table.

2. **Giỏ hàng dùng chung**

- Redis cart theo session.
- Global cart version cho optimistic locking.
- Broadcast cart update tới tất cả thiết bị trong session.

3. **Gửi đơn hàng**

- Customer submit cart để tạo order ở trạng thái `PENDING`.
- Cart được clear sau khi submit thành công.
- Không deduct stock tại thời điểm submit.
- Lần submit đầu tiên tạo session bill nếu chưa có.
- BFF emit `order.created` tới staff room.

4. **Xác nhận đơn hàng**

- Staff confirm `PENDING → PROCESSING`.
- Order Service gọi transactional stock deduct command của Catalog Service.
- Thành công thì order sang `PROCESSING` và `order.confirmed` được publish lên Kafka.
- Event payload đủ self-contained cho KDS routing.

5. **Hủy đơn hàng**

- Customer có thể cancel order `PENDING` của chính mình.
- Staff có pending-cancel permission có thể cancel/reject order `PENDING`.
- Manager/Owner có processing-cancel permission có thể cancel order `PROCESSING` kèm reason.
- Tổng bill không bao gồm canceled orders.

6. **Tổng hợp hóa đơn**

- Một bill cho mỗi active session.
- Được tạo ở lần submit order đầu tiên.
- Aggregate tất cả order chưa bị cancel trong session.
- `OPEN → PENDING_PAYMENT` trong Step 2.4.
- `PAID` dành cho Phase 3.

7. **Yêu cầu gọi hóa đơn tường minh**

- Customer gọi bill-request command.
- Backend validate payment preconditions.
- Bill chuyển `OPEN → PENDING_PAYMENT`.
- Ordering/cart bị lock.
- Table chuyển sang `billing` qua table-status command của Catalog.
- Tạo `REQUEST_BILL` service request như side effect cho notification/audit.

8. **Yêu cầu phục vụ**

- Customer tạo request `CALL_STAFF`, `GENERAL_HELP` và `REQUEST_BILL` (side effect bill-request).
- Staff acknowledge và resolve service requests.
- BFF emit `service.requested` tới staff room.

9. **Chuyển bàn**

- Staff chuyển active session cùng open orders/bill/cart từ bàn này sang bàn khác.
- Dùng transfer lock và saga/compensation.
- Cập nhật Order DB, Redis session/cart metadata và Catalog table statuses.
- Emit realtime transfer/status event.

10. **Cổng BFF WebSocket tối thiểu**

- Hỗ trợ direct events cho Step 2.4/2.5.
- Phase 2B mở rộng khả năng scale/hardening cho gateway.

11. **Metadata station của Catalog**

- `MenuItem.station` là trường canonical cho KDS routing: `KITCHEN` hoặc `BAR`.

### 1.2 Ngoài phạm vi

Step 2.4 **không** triển khai hoặc chốt hành vi cuối cùng cho:

1. Xác nhận thanh toán tiền mặt.
2. Thanh toán SePay/VietQR, Cash hoặc payment gateway đầy đủ; Phase 3 chốt phạm vi Payment Service.
3. Refunds.
4. Split bill.
5. Tích hợp Payment Service đầy đủ.
6. Mở rộng đầy đủ WebSocket Gateway Redis Adapter.
7. Triển khai consumer của Kitchen Service.
8. KDS ticket persistence ngoài contract `order.confirmed`.
9. Hoàn thiện saga (hardening) đầy đủ và outbox/CDC hoàn chỉnh ngoài hướng tiếp cận tối thiểu đã chọn.
10. Ghi hàng đợi offline trong ứng dụng customer/POS. Step 2.4 chỉ định nghĩa ngữ nghĩa backend tương thích idempotency.

---

## 2. Quyền sở hữu miền chuẩn

### 2.1 Quyền sở hữu theo service

| Khái niệm miền                            | Nguồn dữ liệu chuẩn | Nơi lưu trữ                           | Ghi chú                                                                                      |
| ----------------------------------------- | ------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Menu item name/price/status/stock/station | Catalog Service     | Catalog PostgreSQL                    | Catalog sở hữu stock locking và deduct/release.                                              |
| Table/area/QR token/table status          | Catalog Service     | Catalog PostgreSQL                    | Order Service phải gọi Catalog khi đổi table status.                                         |
| Customer session                          | Order Service       | Order PostgreSQL + Redis active cache | PostgreSQL là durable source; Redis là active/session cache.                                 |
| Cart                                      | Order Service       | Redis                                 | Ephemeral nhưng business-critical trong active session. Snapshot nằm trong events/responses. |
| Order/order items                         | Order Service       | Order PostgreSQL                      | DB orders bắt đầu ở `PENDING`; `DRAFT` chỉ thuộc cart/UI.                                    |
| Bill                                      | Order Service       | Order PostgreSQL                      | Một active bill cho mỗi session; payment completion để lại Phase 3.                          |
| Service request                           | Order Service       | Order PostgreSQL                      | Notification side effects được emit bởi BFF.                                                 |
| Kafka `order.confirmed`                   | Order Service       | Kafka via simplified outbox           | Payload self-contained cho Kitchen hiện tại; Notification/Analytics là consumer future.      |
| WebSocket UI events                       | BFF                 | Runtime                               | BFF phát trực tiếp sau TCP response thành công.                                              |

### 2.2 Quy tắc ranh giới nghiêm ngặt

1. Order Service không được update trực tiếp stock hoặc table status do Catalog sở hữu.
2. Order Service lưu denormalized snapshots cho hiển thị và historical audit:

- `tableName`
- `menuItemName`
- `unitPrice`
- `station`

3. Denormalized snapshots không chuyển quyền sở hữu dữ liệu. Catalog vẫn là source of truth cho trạng thái menu/table hiện tại.
4. Mọi command và query phải có `tenantId`, đồng thời scope toàn bộ database/Redis keys theo tenant.
5. Customer commands phải validate session ownership bên cạnh tenant.

---

## 3. Máy trạng thái chuẩn

### 3.1 Máy trạng thái đơn hàng

Giá trị canonical dùng chung:

```txt
DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED
                ↘ CANCELED
```

Diễn giải trong Step 2.4:

| Trạng thái   | Có lưu DB không?                                | Ý nghĩa                                                                                                                       |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `DRAFT`      | No                                              | Trạng thái chỉ thuộc cart/UI trước submit. Chưa có DB order row.                                                              |
| `PENDING`    | Yes                                             | Customer đã submit order; đang chờ staff confirm. Stock chưa bị deduct.                                                       |
| `PROCESSING` | Yes                                             | Staff đã confirm; Catalog đã deduct stock; order được route qua Kafka tới Kitchen/KDS.                                        |
| `READY`      | Yes                                             | Kitchen đánh dấu hoàn thành. Step 2.4 giữ state và validation tương thích; Phase 2B triển khai đầy đủ transition UI/consumer. |
| `SERVED`     | Yes                                             | Staff đã phục vụ món/bàn. Step 2.4 giữ tương thích state; các phase sau triển khai full serving workflow.                     |
| `COMPLETED`  | Yes, but Phase 3 payment completion drives this | Payment hoàn tất và bill đã thanh toán.                                                                                       |
| `CANCELED`   | Yes                                             | Trạng thái hủy kết thúc.                                                                                                      |

### 3.2 Chuyển trạng thái đơn hàng được phép trong Step 2.4

| Chuyển trạng thái       | Tác nhân      | Quyền / guard                                    | Hành vi trong Step 2.4                                                 |
| ----------------------- | ------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Cart/DRAFT → `PENDING`  | Customer      | `SessionGuard → TenantGuard` + session ownership | Tạo order và order items từ cart snapshot.                             |
| `PENDING → PROCESSING`  | Staff         | `ORDER_CONFIRM`                                  | Deduct stock qua Catalog, confirm order, emit Kafka.                   |
| `PENDING → CANCELED`    | Customer      | `SessionGuard → TenantGuard` + own session       | Hủy pending order của chính mình.                                      |
| `PENDING → CANCELED`    | Staff         | New pending-cancel permission                    | Reject/cancel pending order. Không cần restore stock.                  |
| `PROCESSING → CANCELED` | Manager/Owner | New processing-cancel permission + reason        | Hủy sau xác nhận; release/restore stock qua Catalog theo stock policy. |

Các transition `PROCESSING → READY`, `READY → SERVED`, `SERVED → COMPLETED` vẫn tương thích shared types nhưng chủ yếu hoàn thiện ở Phase 2B/3. Step 2.4 không được cản các phase sau dùng những transition này.

### 3.3 Máy trạng thái hóa đơn

Giá trị canonical:

```txt
OPEN → PENDING_PAYMENT → PAID
          ↘ OPEN  (staff reopen before payment)
```

Diễn giải trong Step 2.4:

| Trạng thái        | Ý nghĩa trong Step 2.4                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| `OPEN`            | Session có ít nhất một submitted order và vẫn nhận order mới.              |
| `PENDING_PAYMENT` | Customer đã request payment; ordering bị khóa; table ở trạng thái billing. |
| `PAID`            | Dành cho Phase 3 sau khi Payment Service confirm payment.                  |

### 3.4 Máy trạng thái yêu cầu phục vụ

```txt
PENDING → ACKNOWLEDGED → RESOLVED
```

| Chuyển trạng thái         | Tác nhân | Quyền / guard                                 |
| ------------------------- | -------- | --------------------------------------------- |
| Create request            | Customer | `SessionGuard → TenantGuard` + active session |
| `PENDING → ACKNOWLEDGED`  | Staff    | `SERVICE_REQUEST_ACKNOWLEDGE`                 |
| `ACKNOWLEDGED → RESOLVED` | Staff    | `SERVICE_REQUEST_RESOLVE`                     |

### 3.5 Tương tác với máy trạng thái bàn

Các table statuses canonical dùng chữ thường:

```txt
available → occupied → billing → cleaning → available
```

Step 2.4 dùng Catalog Service commands để đổi table statuses:

| Tác nhân kích hoạt                 | Chuyển trạng thái bàn                           | Bên sở hữu                                           |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| QR/session bắt đầu ở bàn available | `available → occupied`                          | Catalog command, khởi tạo từ BFF/Order session flow  |
| Customer request bill              | `occupied → billing`                            | Catalog command, khởi tạo từ Order bill request flow |
| Transfer table                     | old table → `available`; new table → `occupied` | Catalog command với saga semantics                   |

Payment completion và `billing → cleaning` thuộc Phase 3.

---

## 4. Vòng đời phiên

### 4.1 Mô hình lưu trữ phiên

Do chọn Q6-B, sessions là durable entities trong Order domain.

#### Bản ghi phiên trong PostgreSQL

Một session record tối thiểu nên có:

| Trường            | Mục đích                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| `id`              | Session ID.                                                                |
| `tenant_id`       | Tenant isolation.                                                          |
| `table_id`        | Bàn hiện tại.                                                              |
| `table_name`      | Denormalized snapshot để hiển thị.                                         |
| `status`          | `ACTIVE` hoặc `CLOSED`.                                                    |
| `started_at`      | Server UTC timestamp.                                                      |
| `last_activity`   | Server UTC timestamp, cập nhật khi customer/staff thao tác session.        |
| `closed_at`       | Thiết lập khi session đóng.                                                |
| `order_count`     | Denormalized active order count phục vụ quyết định idle/session.           |
| `current_bill_id` | Con trỏ trực tiếp tới session bill sau khi tạo; null trước lần submit đầu. |
| `version`         | Optimistic version cho transfer/session metadata updates.                  |

#### Khóa phiên đang hoạt động trong Redis

Khóa bộ nhớ đệm đang hoạt động chuẩn:

```txt
session:{tenantId}:{sessionId}
```

Payload tối thiểu:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "tableId": "...",
  "tableName": "...",
  "status": "ACTIVE",
  "startedAt": "ISO-8601",
  "lastActivity": "ISO-8601",
  "orderCount": 0,
  "currentBillId": null,
  "version": 1
}
```

TTL: **2 giờ**.  
Quy tắc nhàn rỗi: **30 phút**.

### 4.2 Quy tắc xử lý idle

1. Nếu `lastActivity > 30 phút` và `orderCount == 0`:

- Đóng session.
- Xóa cart key.
- Đánh dấu table là available nếu bàn đó chỉ bị chiếm bởi empty session này.

2. Nếu `lastActivity > 30 phút` và `orderCount > 0`:

- **Không** auto-close session.
- Giữ session active hoặc refresh active cache từ PostgreSQL.
- Customer phải refetch/rejoin màn active session, nhưng orders/bill vẫn nguyên vẹn.

3. Redis expiry không phải source of truth cho việc đóng session. PostgreSQL session status mới là authoritative.
4. Nếu thiếu Redis key nhưng PostgreSQL session vẫn active, backend rehydrate Redis sau khi validate tenant/table/session ownership.

### 4.3 Quy tắc tạo/tham gia phiên

Khi customer quét QR hoặc vào table flow:

1. Validate QR token qua quy trình validate table/QR thuộc Catalog.
2. Resolve `tenantId`, `tableId`, `tableName` và current table status.
3. Nếu table là `available`:

- Tạo Order session mới trong PostgreSQL.
- Cache session vào Redis.
- Yêu cầu Catalog đánh dấu table `occupied`.

4. Nếu table là `occupied`:

- Join active session hiện tại của bàn nếu billing chưa active.
- Trả cùng session ID hoặc bind client vào session hiện có theo BFF/session cookie policy.

5. Nếu table là `billing`:

- Từ chối ordering/join cho các thao tác mutation.
- Chỉ cho phép read-only bill/tracking view nếu session ownership hợp lệ.

6. Nếu table là `cleaning`:

- Từ chối ordering và hiển thị “Bàn đang dọn dẹp”.

### 4.4 Quy tắc quyền sở hữu của khách hàng

Cho mọi lệnh của khách hàng:

1. Request phải có session ID hợp lệ.
2. Session phải tồn tại trong PostgreSQL và ở trạng thái `ACTIVE`, trừ endpoint chỉ đọc tracking/bill view.
3. Session tenant phải khớp request tenant.
4. Target order/bill/service request/cart phải cùng session.
5. Nếu table status là `billing`, cart mutation và order submit bị từ chối.

---

## 5. Luồng nghiệp vụ giỏ hàng dùng chung

### 5.1 Lưu trữ giỏ hàng

Khóa Redis chuẩn:

```txt
cart:{tenantId}:{sessionId}
```

Cart có phạm vi session và là dữ liệu ephemeral. Cart chưa là DB order cho tới khi submit.

Ảnh chụp giỏ hàng tối thiểu:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "cartVersion": 7,
  "status": "ACTIVE",
  "updatedAt": "ISO-8601",
  "items": [
    {
      "cartLineId": "...",
      "menuItemId": "...",
      "menuItemName": "...",
      "quantity": 2,
      "unitPrice": 45000,
      "note": "ít cay",
      "station": "KITCHEN",
      "lineVersion": 3
    }
  ]
}
```

### 5.2 Định danh dòng giỏ hàng

`cartLineId` là bắt buộc vì cùng một menu item có thể xuất hiện nhiều lần với note khác nhau.

Ví dụ:

```txt
Line A: Phở bò x1, note = "không hành"
Line B: Phở bò x1, note = "thêm hành"
```

Các dòng này không được ghi đè lẫn nhau.

### 5.3 Phiên bản giỏ hàng

Step 2.4 dùng **global cart version** làm optimistic lock canonical.

Quy tắc:

1. Mỗi cart mutation request phải có `expectedCartVersion`.
2. Backend so sánh atomically giữa `expectedCartVersion` và Redis `cartVersion`.
3. Nếu bằng nhau:

- Áp dụng mutation.
- Tăng `cartVersion` thêm 1.
- Refresh cart/session TTL.
- Broadcast `cart.updated` tới room `session:{sessionId}:customer`.

4. Nếu khác:

- Từ chối với conflict.
- Trả latest cart snapshot.
- Không áp dụng mutation.

`lineVersion` theo từng dòng được phép để phục vụ display/debug, nhưng thẩm quyền conflict vẫn thuộc global `cartVersion`.

### 5.4 Phản hồi xung đột giỏ hàng

Ngữ nghĩa phản hồi xung đột:

```txt
HTTP status or wrapped app code: 409 CART_VERSION_CONFLICT
Recoverable: true
Payload: latest cart snapshot
Hành vi phía client: thay giỏ cục bộ bằng bản mới nhất, hiển thị “Người cùng bàn vừa đổi giỏ — đã đồng bộ”, cho phép người dùng thử lại
```

Step 2.4 không cho phép hành vi last-write-wins.

### 5.5 Các thao tác thay đổi giỏ hàng

Các thao tác hỗ trợ:

| Thao tác     | Quy tắc                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add item     | Validate menu item tồn tại, cùng tenant, status là available, table không ở trạng thái billing. Snapshot name/price/station hiện tại.                             |
| Set quantity | Quantity phải dương. Quantity = 0 nên biểu diễn bằng thao tác remove.                                                                                             |
| Update note  | Note phải bị giới hạn độ dài. Update note sẽ mutate cart line hiện có theo `cartLineId`; tạo cùng menu item với note khác dùng Add item và sinh `cartLineId` mới. |
| Remove line  | Remove theo `cartLineId`.                                                                                                                                         |
| Clear cart   | Chỉ delete/empty cart khi cart chưa bị lock.                                                                                                                      |

### 5.6 Khóa khi gửi giỏ hàng

Khi customer submit order:

1. Backend đọc cart snapshot theo cách atomic.
2. Nếu cart trống thì reject.
3. Nếu bill/table đang billing thì reject.
4. Tạo order từ snapshot.
5. Clear cart sau khi tạo order thành công.
6. Broadcast cart cập nhật với cart rỗng và version đã tăng.

Cart không bị khóa vĩnh viễn sau một lần submit order. Customer vẫn có thể thêm món sau submit khi bill là `OPEN` và table chưa ở trạng thái billing.

---

## 6. Luồng gửi đơn hàng

### 6.1 Ý nghĩa nghiệp vụ

Customer submit chuyển cart hiện tại thành một `PENDING` order đã được persist.

Hành động này **không** deduct stock.  
Hành động này **không** gửi order tới KDS.  
Hành động này có notify cho staff/POS rằng có order mới đang chờ xác nhận.

### 6.2 Điều kiện tiên quyết

1. Session tồn tại và đang active.
2. Session tenant khớp request tenant.
3. Table không ở trạng thái `billing` hoặc `cleaning`.
4. Cart tồn tại và có ít nhất một item.
5. Cart version khớp `expectedCartVersion` hoặc submit dùng latest server snapshot.
6. Mọi menu item vẫn tồn tại trong Catalog và đang `available`.
7. Submitted total chỉ được tính server-side.
8. Idempotency key phải có và unique cho `(tenantId, sessionId, idempotencyKey)`.

### 6.3 Các bước submit

1. BFF nhận customer submit request.
2. BFF validate session/tenant rồi forward command sang Order Service.
3. Order Service load active session từ PostgreSQL/Redis.
4. Order Service đọc cart snapshot từ Redis.
5. Order Service validate menu item availability qua Catalog.
6. Order Service mở Order DB transaction.
7. Nếu session chưa có bill:

- Tạo bill với `status = OPEN`.

8. Tạo order:

- `status = PENDING`
- `tenantId`, `sessionId`, `tableId`, `tableName`
- `idempotencyKey`
- `totalAmount` do server tính từ snapshots.

9. Tạo order items với denormalized snapshots:

- `menuItemName`
- `unitPrice`
- `station`
- `note`
- item status ban đầu tương thích flow pending/processing của order.

10. Append order vào bill aggregate.
11. Tăng `orderCount` của session.
12. Commit transaction.
13. Clear Redis cart và broadcast `cart.updated`.
14. Trả order và bill summary cho BFF.
15. BFF emit `order.created` tới staff room.

### 6.4 Tính lặp an toàn (Idempotency)

Order submit bắt buộc có idempotency key.

Quy tắc:

1. Phạm vi unique key: `(tenantId, sessionId, idempotencyKey)`.
2. Nếu cùng key được gửi lại sau khi thành công:

- Trả response order gốc.
- Không tạo order mới.

3. Nếu cùng key đang in-flight:

- Trả retryable/in-progress response hoặc chờ theo implementation decision.

4. Nếu cùng key bị tái sử dụng với cart payload khác:

- Trả idempotency conflict.

### 6.5 Các trường hợp gửi đơn thất bại

| Lỗi                       | Kết quả                                                |
| ------------------------- | ------------------------------------------------------ |
| Empty cart                | Reject, không ghi DB.                                  |
| Cart version conflict     | Reject kèm latest cart snapshot.                       |
| Item unavailable          | Reject kèm chi tiết item; cart giữ nguyên để user sửa. |
| Price changed             | Server trả latest price; client phải confirm/resubmit. |
| Session inactive          | Reject và yêu cầu quét lại/nhờ staff hỗ trợ.           |
| Table billing             | Reject ordering và hiển thị billing lock message.      |
| Duplicate idempotency key | Trả response gốc hoặc conflict nếu payload khác.       |

---

## 7. Xác nhận đơn hàng và trừ tồn kho

### 7.1 Ý nghĩa nghiệp vụ

Staff confirmation chuyển submitted order thành order đang được kitchen xử lý.

Đây là thời điểm stock bị deduct và Kafka `order.confirmed` được phát sinh.

### 7.2 Điều kiện tiên quyết

1. Tác nhân là staff/owner/manager đã xác thực và có `ORDER_CONFIRM`.
2. Order tồn tại trong cùng tenant.
3. Order status là `PENDING`.
4. Session active hoặc ít nhất chưa closed/paid.
5. Bill là `OPEN`.
6. Table không ở `billing`.
7. Mọi item vẫn tồn tại và có thể deduct stock trong Catalog.

### 7.3 Hợp đồng trừ tồn kho với Catalog

Do chọn Q1-B, Order Service gọi Catalog Service để deduct stock.

Ngữ nghĩa lệnh Catalog:

```txt
catalog.stock.deduct_for_order
```

Yêu cầu tối thiểu:

```json
{
  "tenantId": "...",
  "orderId": "...",
  "idempotencyKey": "confirm-order:{orderId}",
  "items": [
    {
      "menuItemId": "...",
      "quantity": 2
    }
  ]
}
```

Phản hồi thành công tối thiểu:

```json
{
  "success": true,
  "deductions": [
    {
      "menuItemId": "...",
      "deductedQuantity": 2,
      "remainingStock": 8,
      "status": "available"
    }
  ]
}
```

Phản hồi thất bại tối thiểu:

```json
{
  "success": false,
  "reason": "INSUFFICIENT_STOCK",
  "items": [
    {
      "menuItemId": "...",
      "menuItemName": "Phở bò",
      "requested": 2,
      "available": 1
    }
  ]
}
```

Quy tắc nội bộ của Catalog:

1. Sort item IDs theo thứ tự xác định trước khi lock để giảm deadlock.
2. Lock các `menu_items` rows liên quan bằng `SELECT ... FOR UPDATE` trong Catalog DB transaction.
3. Validate tenant và availability.
4. Deduct stock nếu tất cả items đạt.
5. Lưu idempotency record theo `orderId`/`idempotencyKey` để confirm retry không bị double-deduct.
6. Commit và trả remaining stock.

### 7.4 Các bước confirm

1. BFF nhận staff confirm request.
2. Guard chain: `UserGuard → TenantGuard → PermissionGuard(ORDER_CONFIRM)`.
3. BFF gửi confirm command tới Order Service.
4. Order Service lock order row trong Order DB transaction.
5. Validate status `PENDING`.
6. Gọi Catalog stock deduct command với idempotency key.
7. Nếu Catalog trả insufficient stock:

- Rollback local transaction.
- Trả “Món đã hết” kèm item details.
- Order giữ `PENDING` trừ khi business sau này chọn auto-reject.

8. Nếu Catalog thành công:

- Cập nhật order status sang `PROCESSING`.
- Set `confirmedAt`, `confirmedByUserId`.
- Set order item statuses sang `PROCESSING`.
- Recompute bill totals nếu cần.
- Tạo outbox/event record hoặc chuẩn bị publish theo quyết định reliability.

9. Commit local transaction.
10. Publish Kafka `order.confirmed` một cách đáng tin cậy.
11. Trả confirmed order response cho BFF.
12. BFF emit `order.status_changed` tới staff và customer rooms.

### 7.5 Thử lại xác nhận và idempotency

Nếu confirm request được retry:

| Trạng thái hiện tại                             | Hành vi                                          |
| ----------------------------------------------- | ------------------------------------------------ |
| `PENDING` và chưa có deduct thành công trước đó | Thử confirm bình thường.                         |
| `PROCESSING` và cùng actor/request correlation  | Trả existing confirmed order; không deduct lại.  |
| `PROCESSING` và request khác                    | Trả idempotent success hoặc “already confirmed”. |
| `CANCELED`                                      | Reject invalid transition.                       |

Catalog deduct command phải idempotent theo order ID hoặc confirm idempotency key.

### 7.6 Lock timeout / deadlock

Nếu Catalog stock lock timeout:

1. Không update Order status.
2. Trả lỗi có thể thử lại:

- `STOCK_LOCK_TIMEOUT`
- `recoverable = true`

3. POS có thể hiển thị “Đang có người xác nhận món này, thử lại”.

Nếu Order DB row lock timeout:

1. Trả retryable conflict.
2. Không gọi Catalog nếu chưa acquire được order lock.

---

## 8. Hợp đồng sự kiện Kafka `order.confirmed`

### 8.1 Mục đích sự kiện

`order.confirmed` là một cross-context domain event.

Các consumers gồm:

- Kitchen Service — tạo KDS tickets.
- Notification Service — thông báo cho staff/customer ở các bước sau.
- Analytics — reporting trong tương lai.

Event phải đủ self-contained để Kitchen tạo initial tickets mà không cần query đồng bộ sang Order Service để lấy table name hoặc station routes.

### 8.2 Payload mở rộng

Payload chuẩn cho Step 2.4:

```json
{
  "eventId": "uuid",
  "eventType": "order.confirmed",
  "schemaVersion": 1,
  "tenantId": "tenant-id",
  "orderId": "order-id",
  "sessionId": "session-id",
  "tableId": "table-id",
  "tableName": "Bàn 05",
  "items": [
    {
      "id": "order-item-id",
      "orderId": "order-id",
      "menuItemId": "menu-item-id",
      "menuItemName": "Phở bò",
      "quantity": 2,
      "unitPrice": 65000,
      "note": "ít hành",
      "status": "PROCESSING",
      "station": "KITCHEN"
    }
  ],
  "totalAmount": 130000,
  "confirmedAt": "ISO-8601",
  "confirmedByUserId": "keycloak-sub",
  "occurredAt": "ISO-8601",
  "correlationId": "process-id-or-request-id"
}
```

### 8.3 Partition key

Kafka partition key:

```txt
tenantId
```

Lý do:

- Giữ thứ tự theo phạm vi tenant.
- Phù hợp nguyên tắc tenant isolation trong Kafka guide.

### 8.4 Độ tin cậy sự kiện

Reliability tối thiểu chấp nhận cho Step 2.4:

1. Không publish trước DB commit.
2. Ưu tiên simplified outbox nếu phạm vi triển khai cho phép:

- Ghi outbox row trong cùng Order DB transaction với confirm.
- Background publisher gửi sang Kafka.
- Đánh dấu outbox row đã published.

3. Nếu tạm thời dùng direct publish sau commit:

- Tài liệu hóa thành technical debt.
- Log lỗi với đủ dữ liệu để replay.
- Cung cấp đường sửa/retry thủ công trong admin/dev scripts về sau.

### 8.5 Yêu cầu idempotency cho consumer

Consumers phải coi `eventId` và/hoặc `(tenantId, orderId)` là idempotency key.

Kitchen không được tạo duplicate KDS tickets nếu cùng event `order.confirmed` được giao nhiều hơn một lần.

---

## 9. Tổng hợp hóa đơn

### 9.1 Tạo hóa đơn

Bill được tạo khi order đầu tiên trong session submit thành công.

Quy tắc:

1. Một active bill cho mỗi active session.
2. Bill bắt đầu với `status = OPEN`.
3. Bill chứa submitted order ID.
4. Tổng bill do server tính từ các order chưa bị cancel.

### 9.2 Tính tổng hóa đơn

Trong Step 2.4:

```txt
subtotal = sum(orderItem.unitPrice * orderItem.quantity) for all non-canceled orders/items in the bill
total = subtotal + roundingAmount
```

Hành vi làm tròn:

- Step 2.3 có `roundingAmount`.
- Business/Phase 3 có đề cập làm tròn VND.
- Step 2.4 lưu `roundingAmount = 0`; Payment Phase sẽ chốt logic làm tròn thanh toán.

Giá trị mặc định khuyến nghị cho Step 2.4:

```txt
roundingAmount = 0
total = subtotal
```

Phase 3 có thể áp dụng làm tròn cho cash/payment.

### 9.3 Quy tắc tính order vào bill

| Order state  | Included in bill total?       | Included in `orderIds` audit list? |
| ------------ | ----------------------------- | ---------------------------------- |
| `PENDING`    | Có, như running bill tạm thời | Có                                 |
| `PROCESSING` | Có                            | Có                                 |
| `READY`      | Có                            | Có                                 |
| `SERVED`     | Có                            | Có                                 |
| `COMPLETED`  | Có                            | Có                                 |
| `CANCELED`   | Không                         | Có hoặc giữ lại qua order history  |

Lý do:

- POS/table map cần hiển thị running total ngay sau submit.
- Canceled orders vẫn cần audit được nhưng không tính tiền.

### 9.4 Trigger để bill recalculation

Recompute bill totals khi:

1. Order được submit.
2. Order bị cancel.
3. Order item bị cancel hoặc điều chỉnh bởi authorized manager flow.
4. Áp dụng payment rounding ở Phase 3.

### 9.5 Trường hợp biên khi đơn đầu tiên bị hủy

Nếu order đầu tiên tạo bill rồi bị cancel trước khi có order khác:

- Bill vẫn là `OPEN` với tổng `0`.
- Session vẫn active nếu chưa bị idle-close.
- Order tương lai trong cùng session tái sử dụng cùng bill.

Không thêm trạng thái bill `VOID` trong Step 2.4.

---

## 10. Luồng yêu cầu gọi hóa đơn tường minh

### 10.1 Ý nghĩa nghiệp vụ

Bill request là ý định rõ ràng của customer muốn dừng gọi món và thanh toán.

Do chọn Q4-C, đây không chỉ là service request. Đây là business command có service-request notification làm side effect.

### 10.2 Điều kiện tiên quyết

1. Customer session đang active.
2. Session có bill ở trạng thái `OPEN`.
3. Bill total lớn hơn hoặc bằng 0 và có ít nhất một non-canceled order để thanh toán bình thường.
4. Table là `occupied`.
5. Cart phải rỗng. Nếu cart có item chưa submit, reject bill request và yêu cầu customer submit hoặc clear cart trước.
6. Payment readiness condition đã thỏa.

### 10.3 Điều kiện sẵn sàng thanh toán

Trong Step 2.4, chọn quy tắc canonical:

```txt
Customer can request bill only when all non-canceled orders are at least SERVED.
```

Lý do:

- Business docs đề cập cả `Ready` lẫn “chặn thanh toán khi món chưa xong”.
- Thanh toán tại nhà hàng thường diễn ra sau khi món đã phục vụ, không chỉ sau khi nấu xong.
- Nếu demo cần flow nhanh hơn, UI có thể mô phỏng served state.

Phương án thay thế chỉ dùng khi có override rõ ràng sau này:

```txt
all non-canceled orders are READY or SERVED
```

### 10.4 Các bước bill request

1. Customer gọi explicit bill request endpoint/command.
2. Backend validate active session và bill ownership.
3. Backend validate cart rỗng hoặc yêu cầu customer submit/clear cart.
4. Backend validate mọi non-canceled orders đã sẵn sàng thanh toán.
5. Backend chuyển bill:

- `OPEN → PENDING_PAYMENT`
- set `closedAt` là timestamp khi bill sang `PENDING_PAYMENT`.

6. Backend lock ordering cho session.
7. Backend yêu cầu Catalog Service set table status:

- `occupied → billing`

8. Backend tạo một `ServiceRequest`:

- `type = REQUEST_BILL`
- `status = PENDING`

9. Backend cập nhật Redis session/cart state:

- cart status locked
- session bill status summary

10. BFF emit:

- `service.requested` tới staff room
- `bill.requested` tới staff và customer rooms
- `cart.updated` để thể hiện cart locked/empty nếu cần.

### 10.5 Reopen trước khi thanh toán

Nếu customer/staff hủy payment request trước khi thanh toán hoàn tất:

1. Staff được ủy quyền có thể chuyển bill `PENDING_PAYMENT → OPEN`.
2. Catalog table status quay `billing → occupied`.
3. Ordering/cart được unlock.
4. `REQUEST_BILL` service request hiện có nên được resolve hoặc đánh dấu không active theo quy tắc service request audit.

Hành vi reopen này được cho phép bởi `ALLOWED_BILL_TRANSITIONS` hiện hữu.

---

## 11. Luồng nghiệp vụ yêu cầu phục vụ

### 11.1 Loại yêu cầu

| Loại           | Ý nghĩa                                              | Tác dụng phụ nghiệp vụ                                                           |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `CALL_STAFF`   | Customer gọi staff tới bàn.                          | Tạo request và notify staff.                                                     |
| `GENERAL_HELP` | Customer yêu cầu hỗ trợ chung.                       | Tạo request và notify staff.                                                     |
| `REQUEST_BILL` | Notification/audit sinh ra từ explicit bill request. | Nên được tạo bởi bill-request command, không là standalone payment lock command. |

### 11.2 Gửi yêu cầu phục vụ độc lập

Với `CALL_STAFF` và `GENERAL_HELP`:

1. Validate active session.
2. Tạo service request ở trạng thái `PENDING`.
3. Trả request response cho BFF.
4. BFF emit `service.requested` tới `tenant:{tenantId}:staff`.

### 11.3 Tạo REQUEST_BILL

`POST service-requests` trực tiếp với type `REQUEST_BILL` nên:

- bị từ chối với thông điệp “Use bill request endpoint”, hoặc
- được route nội bộ sang explicit bill request command.

Khuyến nghị: route sang explicit bill request command để tránh duplicate UI behavior.

### 11.4 Xác nhận đã nhận / Hoàn tất xử lý

Acknowledge:

1. Staff có `SERVICE_REQUEST_ACKNOWLEDGE`.
2. Request ở trạng thái `PENDING`.
3. Set `ACKNOWLEDGED`, `acknowledgedAt`, `acknowledgedByUserId`.

Resolve:

1. Staff có `SERVICE_REQUEST_RESOLVE`.
2. Request ở trạng thái `ACKNOWLEDGED`.
3. Set `RESOLVED`, `resolvedAt`.

---

## 12. Hủy đơn hàng

### 12.1 Mô hình phân quyền

Do chọn Q7-C, Step 2.4 yêu cầu tách quyền:

| Quyền mới                 | Mục đích                             | Vai trò đề xuất        |
| ------------------------- | ------------------------------------ | ---------------------- |
| `order.cancel_pending`    | Cancel/reject order `PENDING`        | OWNER, MANAGER, WAITER |
| `order.cancel_processing` | Cancel order `PROCESSING` kèm reason | OWNER, MANAGER         |

`order.cancel` hiện có có thể deprecated, giữ làm alias cho manager-level cancel, hoặc map trong quá trình migration. Implementation plan cuối cần cập nhật `permission-matrix.md`, constants, role seed và tests tương ứng.

### 12.2 Customer cancel pending

Customer chỉ được cancel pending order của chính mình.

Điều kiện tiên quyết:

1. Session sở hữu order.
2. Order status là `PENDING`.
3. Order chưa được confirm.

Tác động:

1. Set order `CANCELED`.
2. Set `cancelledAt`.
3. `cancelledByUserId` là null/guest marker.
4. `cancelReason` từ customer được nhận nếu có; nếu không thì lưu `CUSTOMER_REQUESTED`.
5. Recompute bill total, loại order này ra.
6. Không cần restore stock vì stock chưa bị deduct.
7. BFF emit `order.status_changed` tới staff và customer rooms.

### 12.3 Nhân viên từ chối đơn chờ xác nhận

Staff có pending-cancel permission có thể reject/cancel pending order.

Effects:

1. Set order `CANCELED`.
2. Lưu staff actor ID.
3. Lưu cancel reason nếu có hoặc nếu policy bắt buộc.
4. Recompute bill.
5. Notify customer qua `order.status_changed`.

### 12.4 Quản lý hủy đơn đang xử lý

Manager/Owner có processing-cancel permission có thể cancel processing order.

Preconditions:

1. Order status là `PROCESSING`.
2. Bắt buộc có cancel reason.
3. Tác nhân là Manager/Owner hoặc có processing-cancel permission rõ ràng.

Effects:

1. Set order `CANCELED`.
2. Lưu `cancelledAt`, `cancelledByUserId`, `cancelReason`.
3. Recompute bill, loại order này ra.
4. Gọi Catalog stock release/restore command nếu business stock policy cho phép restore prepared stock.
5. Notify KDS/clients qua status event.

### 12.5 Chính sách hoàn trả tồn kho

Mặc định cho Step 2.4:

| Order state    | Restore Catalog stock?             | Reason                                                  |
| -------------- | ---------------------------------- | ------------------------------------------------------- |
| `PENDING`      | No                                 | Stock chưa bị deduct.                                   |
| `PROCESSING`   | Yes by default, but audit-required | Mô hình tồn kho đơn giản không tính ingredient wastage. |
| `READY/SERVED` | Không trong Step 2.4               | Cần manager adjustment/refund policy.                   |

Ingredient wastage/no-restore policy nằm ngoài Step 2.4 và không được override hành vi restore mặc định của Step 2.4.

---

## 13. Luồng chuyển bàn

### 13.1 Ý nghĩa nghiệp vụ

Transfer table chuyển active dining session từ bàn cũ sang bàn mới.

Phải bảo toàn:

- session ID,
- cart,
- orders,
- bill,
- service requests,
- customer tracking continuity.

Cart key vẫn là `cart:{tenantId}:{sessionId}` vì session không đổi.

### 13.2 Điều kiện tiên quyết

1. Tác nhân có `TABLE_TRANSFER`.
2. Bàn cũ thuộc tenant.
3. Bàn mới thuộc tenant.
4. Bàn mới có status `available`.
5. Session active và đang gắn với bàn cũ.
6. Bill không ở trạng thái `PAID`.
7. Không có transfer khác đang chạy cho cùng session, old table, hoặc new table.

### 13.3 Transfer lock

Acquire transfer lock trước mọi mutation:

```txt
transfer:{tenantId}:{sessionId}
```

Additional locks:

```txt
table-transfer:{tenantId}:{oldTableId}
table-transfer:{tenantId}:{newTableId}
```

Quy tắc:

1. Lock dùng `SET NX` với TTL ngắn.
2. Nếu lock tồn tại, reject bằng retryable conflict.
3. Lock được release sau thành công/thất bại.
4. Expired locks phải recover được bằng cách kiểm tra DB state.

### 13.4 Các bước saga

Thứ tự khuyến nghị:

1. Acquire transfer lock.
2. Validate state của Order session và bill.
3. Yêu cầu Catalog reserve/mark destination table cho transfer nếu được hỗ trợ.
4. Update Order DB transaction:

- session `tableId/tableName`, tăng version,
- table snapshot của tất cả open/non-terminal orders,
- bill/table snapshot nếu có lưu,
- service request table snapshot nếu đang active.

5. Yêu cầu Catalog update table statuses:

- old table → `available`,
- new table → `occupied`.

6. Update Redis session payload với bàn mới.
7. Cart key giữ nguyên, nhưng cart snapshot metadata nên cập nhật table nếu có lưu.
8. Emit realtime transfer/table status event.
9. Release transfer lock.

### 13.5 Bù trừ

| Điểm lỗi                                           | Cơ chế bù trừ                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Catalog destination reservation thất bại           | Abort; không mutate Order.                                                              |
| Order DB update thất bại sau Catalog reservation   | Release Catalog reservation / revert destination table.                                 |
| Catalog final table update lỗi sau Order DB update | Revert Order DB nếu còn an toàn, hoặc đánh dấu transfer cần recovery và cảnh báo staff. |
| Redis update lỗi sau DB/Catalog thành công         | Rehydrate Redis từ PostgreSQL ở request kế tiếp; emit warning log.                      |
| WS emit lỗi                                        | Không rollback business transaction; clients refetch/poll.                              |

### 13.6 QR của khách hàng sau khi chuyển bàn

Sau transfer:

- Thiết bị customer hiện có trong session tiếp tục dùng cùng session ID.
- UI nên hiển thị bàn mới qua session/table transfer event hoặc refetch.
- Lượt quét mới tại bàn cũ không được join transferred session.
- Lượt quét mới tại bàn mới sẽ join transferred session nếu bàn đang occupied bởi session đó và không ở billing.

---

## 14. Thay đổi Catalog bắt buộc theo luồng nghiệp vụ

### 14.1 Station của MenuItem

Do chọn Q11-A, Catalog `MenuItem` cần trường station canonical.

Giá trị cho phép:

```txt
KITCHEN
BAR
```

Mục đích:

- `KITCHEN`: trạm chế biến món ăn.
- `BAR`: trạm đồ uống/quầy bar.

Quy tắc:

1. Mọi menu item có thể order phải có station.
2. Public menu responses chỉ cần include station nếu frontend cần; nếu không Order Service có thể lấy qua internal Catalog command.
3. Order item snapshot lưu station tại thời điểm submit.
4. `order.confirmed` include station cho từng item.

### 14.2 Trạng thái khả dụng của Catalog và tồn kho

Catalog expose đồng thời:

- display status: `available` / `out_of_stock`,
- numeric stock.

Quy tắc nghiệp vụ:

1. Customer chỉ add/submit được item `available`.
2. Staff confirm có thể fail nếu numeric stock không đủ.
3. Sau deduct làm stock về `0`, Catalog nên mark/expose item out of stock theo Catalog policy.
4. BFF/clients nên nhận menu stock update qua cơ chế cập nhật menu hiện có/tương lai.

### 14.3 Các lệnh tồn kho của Catalog

Các lệnh nội bộ bắt buộc:

| Lệnh                            | Mục đích                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| `stock.deduct_for_order`        | Deduct stock khi confirm order.                                 |
| `stock.release_for_order`       | Restore stock khi cancel processing nếu policy cho phép.        |
| `menu_items.validate_orderable` | Validate current item status/price/station tại lúc submit cart. |

Tên TCP message chính xác có thể chốt ở giai đoạn lập kế hoạch triển khai, nhưng các năng lực nghiệp vụ này là bắt buộc.

---

## 15. Hợp đồng WebSocket / Realtime

### 15.1 Phạm vi Cổng BFF tối thiểu

Do chọn Q10-A, Step 2.4 bao gồm minimal BFF WebSocket gateway đủ dùng cho tích hợp FE Step 2.5.

Phase 2B sẽ thêm:

- Redis Adapter,
- Kafka bridge consumers,
- KDS-specific rooms và scaling,
- SLA warning bridge.

### 15.2 Nhóm nhận tin (Room)

Các room tối thiểu:

| Room                           | Thành viên                                     |
| ------------------------------ | ---------------------------------------------- |
| `tenant:{tenantId}:staff`      | Owner/Manager/Waiter POS clients của tenant.   |
| `session:{sessionId}:customer` | Customer devices cùng chia sẻ table session.   |
| `tenant:{tenantId}:management` | Manager/Owner clients cho manager-only alerts. |

KDS rooms dành cho Phase 2B, dùng naming:

```txt
tenant:{tenantId}:kds:kitchen
tenant:{tenantId}:kds:bar
```

### 15.3 Sự kiện WebSocket

#### `order.created`

Room:

```txt
tenant:{tenantId}:staff
```

Payload:

```json
{
  "tenantId": "...",
  "orderId": "...",
  "tableId": "...",
  "tableName": "...",
  "sessionId": "...",
  "items": [],
  "totalAmount": 0,
  "timestamp": "ISO-8601"
}
```

Nguồn: BFF direct sau TCP response submit order thành công.

#### `order.status_changed`

Các room:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload theo `OrderStatusChangedEvent` hiện có:

```json
{
  "tenantId": "...",
  "orderId": "...",
  "fromStatus": "PENDING",
  "toStatus": "PROCESSING",
  "changedByUserId": "...",
  "timestamp": "ISO-8601"
}
```

#### `service.requested`

Room:

```txt
tenant:{tenantId}:staff
```

Payload theo `ServiceRequestedEvent`.

#### `cart.updated`

Room:

```txt
session:{sessionId}:customer
```

Payload:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "cartVersion": 8,
  "status": "ACTIVE",
  "items": [],
  "updatedAt": "ISO-8601",
  "changedBySessionClientId": "session-client-id-or-null"
}
```

#### `bill.requested`

Rooms:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload:

```json
{
  "tenantId": "...",
  "billId": "...",
  "sessionId": "...",
  "tableId": "...",
  "tableName": "...",
  "status": "PENDING_PAYMENT",
  "total": 130000,
  "requestedAt": "ISO-8601"
}
```

Nguồn: BFF direct sau explicit bill request command thành công.

#### `table.transferred`

Rooms:

```txt
tenant:{tenantId}:staff
session:{sessionId}:customer
```

Payload:

```json
{
  "tenantId": "...",
  "sessionId": "...",
  "fromTableId": "...",
  "fromTableName": "Bàn 03",
  "toTableId": "...",
  "toTableName": "Bàn 08",
  "transferredByUserId": "...",
  "timestamp": "ISO-8601"
}
```

### 15.4 Mô hình độ tin cậy WebSocket

Các sự kiện WebSocket là tín hiệu gợi ý (hints), không phải nguồn dữ liệu chuẩn.

Quy tắc:

1. Clients phải refetch khi reconnect.
2. POS có thể poll live orders cho tới khi WS bridge được harden ở Phase 2B.
3. WS emit lỗi không làm rollback business transaction.
4. Event payloads nên có đủ IDs để client refetch.

---

## 16. Danh mục Endpoint / Command

Mục này liệt kê các năng lực nghiệp vụ cần cho Step 2.4. Đường dẫn chính xác sẽ chốt ở giai đoạn lập kế hoạch triển khai.

### 16.1 Lệnh của khách hàng

| Năng lực                    | Guard                              | Hành vi bắt buộc                                                |
| --------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Get/join session            | Session/customer QR guard + tenant | Tạo hoặc join active table session.                             |
| Get cart                    | Session + tenant                   | Trả cart snapshot/version.                                      |
| Mutate cart                 | Session + tenant                   | Optimistic lock, broadcast cart update.                         |
| Submit order                | Session + tenant                   | Tạo order `PENDING`, tạo bill nếu cần, clear cart.              |
| Cancel own pending order    | Session + tenant                   | Chỉ session của chính mình, chỉ trạng thái `PENDING`.           |
| Get own order detail/status | Session + tenant                   | Chỉ session của chính mình.                                     |
| Create service request      | Session + tenant                   | `CALL_STAFF`/`GENERAL_HELP`; bill type route sang bill request. |
| Request bill                | Session + tenant                   | Explicit bill request command.                                  |
| Get current bill            | Session + tenant                   | Chỉ bill của session hiện tại.                                  |

### 16.2 Lệnh của nhân viên

| Năng lực                    | Guard/quyền                                                                      | Hành vi bắt buộc                                              |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| List orders                 | `ORDER_GET_LIST`                                                                 | Tenant-scoped POS list.                                       |
| Get order detail            | `ORDER_GET_BY_ID`                                                                | Tenant-scoped.                                                |
| Confirm order               | `ORDER_CONFIRM`                                                                  | Deduct stock qua Catalog; `PENDING → PROCESSING`; emit Kafka. |
| Cancel pending order        | `ORDER_CANCEL_PENDING`                                                           | Staff reject pending.                                         |
| Cancel processing order     | `ORDER_CANCEL_PROCESSING`                                                        | Manager/Owner + reason.                                       |
| Acknowledge service request | `SERVICE_REQUEST_ACKNOWLEDGE`                                                    | `PENDING → ACKNOWLEDGED`.                                     |
| Resolve service request     | `SERVICE_REQUEST_RESOLVE`                                                        | `ACKNOWLEDGED → RESOLVED`.                                    |
| Transfer table              | `TABLE_TRANSFER`                                                                 | Saga transfer.                                                |
| Reopen bill before payment  | `TABLE_UPDATE_STATUS` + bill ownership trong cùng tenant; OWNER, MANAGER, WAITER | `PENDING_PAYMENT → OPEN`.                                     |
| Get bill/list pending bills | Existing/future bill/payment read permission                                     | Cần cho POS Bills view.                                       |

### 16.3 Yêu cầu cập nhật quyền

Do chọn Q7-C, Step 2.4 yêu cầu cập nhật RBAC docs/code trước khi triển khai endpoint:

```txt
ORDER_CANCEL_PENDING
ORDER_CANCEL_PROCESSING
```

Khuyến nghị mapping:

| Role     | Pending cancel                               | Processing cancel |
| -------- | -------------------------------------------- | ----------------- |
| OWNER    | Yes                                          | Yes               |
| MANAGER  | Yes                                          | Yes               |
| WAITER   | Yes                                          | No                |
| CHEF     | No                                           | No                |
| BARISTA  | No                                           | No                |
| CUSTOMER | Session-scoped own pending only, not DB role | No                |

---

## 17. Nhất quán dữ liệu và khôi phục

### 17.1 Tenant isolation

Mọi persistent query phải có `tenant_id`.

Mọi Redis key phải có tenant ID, trừ legacy/global guard keys đã được migrate hoặc cô lập rõ ràng.

Các khóa chuẩn:

```txt
session:{tenantId}:{sessionId}
cart:{tenantId}:{sessionId}
transfer:{tenantId}:{sessionId}
idempotency:order-submit:{tenantId}:{sessionId}:{key}
```

### 17.2 Thời gian máy chủ

Mọi timestamp phải được sinh server-side theo UTC.

Client timestamps không bao giờ là authoritative.

### 17.3 Nguyên tắc khôi phục theo saga

Với các thao tác multi-service:

1. Lưu đủ local state để biết operation đang ở phase nào.
2. Làm downstream commands theo hướng idempotent.
3. Ưu tiên compensation hơn là giả định có cross-service ACID.
4. Hiển thị trạng thái cần recovery lên staff/admin logs.

Các thao tác cần saga/recovery:

- order confirm với Catalog stock deduct,
- processing cancel với stock release,
- transfer table,
- bill request table status update.

### 17.4 Tóm tắt idempotency

| Lệnh                  | Khóa idempotency                                |
| --------------------- | ----------------------------------------------- |
| Submit order          | FE-generated key scoped theo tenant/session.    |
| Confirm order         | `confirm-order:{orderId}` hoặc request key.     |
| Catalog stock deduct  | Cùng confirm/order key.                         |
| Catalog stock release | `release-order:{orderId}:{cancelEventId}`.      |
| Bill request          | `request-bill:{sessionId}:{billId}`.            |
| Transfer table        | `transfer:{sessionId}:{from}:{to}:{requestId}`. |

---

## 18. Ngữ nghĩa lỗi

### 18.1 Nhóm lỗi nghiệp vụ

| Mã lỗi                     | Ý nghĩa                                        | Có thể phục hồi? | Hành vi phía client                                         |
| -------------------------- | ---------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| `CART_VERSION_CONFLICT`    | Cart thay đổi so với client snapshot.          | Yes              | Replace cart bằng latest snapshot rồi retry.                |
| `ITEM_UNAVAILABLE`         | Menu item không còn order được.                | Yes              | Remove/disable item.                                        |
| `PRICE_CHANGED`            | Giá thay đổi so với cart snapshot.             | Yes              | Hiển thị giá mới nhất và yêu cầu user xác nhận.             |
| `INSUFFICIENT_STOCK`       | Confirm thất bại do thiếu stock.               | Yes              | Staff/customer chọn món thay thế hoặc cancel pending order. |
| `STOCK_LOCK_TIMEOUT`       | Timeout khi lock stock đồng thời.              | Yes              | Retry confirm.                                              |
| `INVALID_ORDER_TRANSITION` | State transition không hợp lệ.                 | Usually no       | Refetch state.                                              |
| `BILL_NOT_READY`           | Customer request payment quá sớm.              | Yes              | Cho biết order/item nào chưa served.                        |
| `TABLE_NOT_AVAILABLE`      | Destination table cho transfer không sẵn sàng. | Yes              | Chọn bàn khác.                                              |
| `TRANSFER_IN_PROGRESS`     | Đang có transfer khác chạy.                    | Yes              | Retry sau một khoảng ngắn.                                  |
| `SESSION_CLOSED`           | Session không còn active.                      | No for mutation  | Quét lại QR hoặc nhờ staff.                                 |
| `TENANT_MISMATCH`          | Sai khác tenant/session xuyên miền.            | No               | Security error.                                             |

### 18.2 Cơ chế bọc phản hồi

HTTP responses vẫn dùng cấu trúc wrap của `ExceptionInterceptor`:

```json
{
  "data": {},
  "message": "...",
  "statusCode": 200,
  "duration": "12ms",
  "processID": "..."
}
```

Business errors vẫn cần chứa machine-readable error details có cấu trúc bên trong wrapped error response theo error conventions hiện có.

---

## 19. Tiêu chí chấp nhận cho luồng nghiệp vụ

Step 2.4 được coi là hoàn tất về nghiệp vụ khi toàn bộ tiêu chí bên dưới được thỏa ở mức khái niệm và có thể kiểm chứng bằng test/luồng chạy tay trong lúc triển khai.

### 19.1 Session và Cart

- Session được persist trong Order PostgreSQL và cache trong Redis với key `session:{tenantId}:{sessionId}`.
- Redis idle expiration không đóng session khi `orderCount > 0`.
- Cart key là `cart:{tenantId}:{sessionId}`.
- Cart mutation yêu cầu global `cartVersion` khớp.
- Cart conflict trả latest snapshot.
- Cart updates emit `cart.updated` tới session customer room.

### 19.2 Gửi đơn hàng

- Customer submit tạo order `PENDING`.
- Không deduct stock khi submit.
- Lần submit đầu tạo bill `OPEN`.
- Cart được clear sau submit thành công.
- Submit trùng với cùng idempotency key không tạo duplicate order.
- BFF emit `order.created`.

### 19.3 Xác nhận đơn hàng

- Staff confirm yêu cầu `ORDER_CONFIRM`.
- Confirm gọi transactional stock deduct command của Catalog.
- Concurrent confirms ở stock cuối cùng không được oversell.
- Thiếu stock giữ order ở `PENDING` và trả item details.
- Confirm thành công chuyển order sang `PROCESSING`.
- Confirm thành công phát enriched `order.confirmed` event.
- BFF emit `order.status_changed`.

### 19.4 Yêu cầu gọi hóa đơn

- Bill tồn tại sau submit đầu tiên.
- Customer bill request dùng explicit command.
- Bill request chuyển `OPEN → PENDING_PAYMENT`.
- Ordering/cart bị lock.
- Table status đổi sang `billing` qua Catalog command.
- `REQUEST_BILL` service request được tạo như notification/audit side effect.
- Step 2.4 chưa triển khai cash/payment confirmation.

### 19.5 Cancellation

- Customer chỉ cancel được order `PENDING` của chính mình.
- Waiter/staff có thể cancel/reject order `PENDING` với pending-cancel permission.
- Manager/Owner có thể cancel order `PROCESSING` với processing-cancel permission và reason.
- Bill total loại canceled orders.
- Processing cancel gọi Catalog stock release theo stock policy của Step 2.4.

### 19.6 Chuyển bàn

- Transfer yêu cầu `TABLE_TRANSFER`.
- Destination table phải là `available`.
- Transfer dùng lock để ngăn concurrent transfer/double-booking.
- Session/orders/bill/service requests phản ánh bàn mới.
- Bàn cũ thành `available`; bàn mới thành `occupied` qua Catalog.
- Redis active session được update hoặc có thể rehydrate.
- Cart/order không bị mất.
- Clients nhận được hoặc có thể refetch kết quả transfer.

### 19.7 RBAC

- Staff endpoints theo `UserGuard → TenantGuard → PermissionGuard`.
- Customer endpoints theo `SessionGuard/customer session validation → TenantGuard` và explicit ownership checks.
- Permission matrix có phân biệt pending cancel và processing cancel.
- Chef/Barista không được nhận raw order permissions thông qua Step 2.4.

### 19.8 Hợp đồng sự kiện

- `order.created`, `order.status_changed`, `service.requested`, `cart.updated`, `bill.requested`, và `table.transferred` có payload ổn định trước FE integration.
- `order.confirmed` bao gồm table và station snapshots.
- WebSocket events được coi là hints; clients refetch khi reconnect.

---

## 20. Cập nhật tài liệu bắt buộc trước khi lập kế hoạch triển khai

Các mục sau **đã được đồng bộ trong repo** (2026-04-28); phần triển khai Order/BFF vẫn cần nối endpoint/service theo đặc tả:

1. `docs/architecture/permission-matrix.md` — ma trận RBAC hiện tại (66 quyền sau các phase sau) vẫn phải giữ cancel tách quyền của Step 2.4.
2. `libs/constants/src/lib/enum/role.enum.ts` — `ORDER_CANCEL_PENDING` / `ORDER_CANCEL_PROCESSING` (đã thay `ORDER_CANCEL`).
3. `apps/user-access/src/seeder/role.json` + `role.spec.ts` + `apps/bff/.../permission.guard.spec.ts` + `tools/verify-permission-matrix.sh` — mapping WAITER pending cancel.
4. `libs/shared/types/src/lib/realtime-events.types.ts` — `OrderConfirmedEvent` enrich, `CartUpdatedEvent`, `BillRequestedEvent`, `TableTransferredEvent`.
5. `libs/shared/types/src/lib/menu.types.ts` + `order.types.ts` — `PreparationStation` / snapshot `station` trên order item.
6. Catalog sở hữu station — cột `station` + ngữ nghĩa TCP stock thuộc Catalog; code hiện tại và `technical-architecture.md` là điểm kiểm chứng.
7. `libs/utils/src/lib/request.util.ts` + `SessionGuard` + `TenantGuard` — key `session:{tenantId}:{sessionId}`, optional `orderCount` idle (C14/C15); `docs/references/auth-system-reference.md` + `technical-architecture.md` đã cập nhật tương ứng.
8. `libs/constants/.../tcp-request-message.ts` — pattern `MENU_ITEM.VALIDATE_ORDERABLE`, `STOCK_DEDUCT_FOR_ORDER`, `STOCK_RELEASE_FOR_ORDER`.

---

## 21. Mặc định chuẩn cuối cùng

Trừ khi có tài liệu được phê duyệt sau này thay thế đặc tả này, Step 2.4 dùng các mặc định sau:

1. **DRAFT không được persist thành order.** Cart chính là draft.
2. **Order submit tạo `PENDING`.**
3. **Stock deduct diễn ra ở bước confirm.**
4. **Catalog sở hữu stock locking.**
5. **Bill được tạo từ lần submit đầu tiên.**
6. **Bill totals bao gồm orders pending/processing/ready/served nhưng loại canceled orders.**
7. **Bill request là explicit và sẽ khóa ordering.**
8. **Payment execution được trì hoãn.**
9. **Transfer table dùng saga-based, không phải cross-store ACID.**
10. **Session durable trong PostgreSQL và được cache ở Redis.**
11. **Cart optimistic lock dùng global cart version.**
12. **Kafka `order.confirmed` được enrich cho KDS.**
13. **Minimal BFF WebSocket tồn tại trong Step 2.4.**
14. **KDS route lấy từ `MenuItem.station`.**
15. **Cancel permission được tách theo order state.**

---

## 22. Điểm dừng

Tài liệu này chốt luồng nghiệp vụ cho Step 2.4 và được giữ như spec chi tiết; phase record hiện tại là nguồn trạng thái triển khai cuối cùng.

Các phần tiền đề RBAC / shared types / TCP pattern / session cache đã được merge trong repo; tài liệu này vẫn không chứa kế hoạch triển khai đầy đủ cho Order Service.
