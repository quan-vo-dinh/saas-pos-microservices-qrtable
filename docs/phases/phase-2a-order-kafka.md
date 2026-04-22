# Phase 2A — Permissions + Order + Kafka

> **Mục tiêu:** Mở rộng RBAC cho toàn bộ luồng đặt món, bếp/bar, thanh toán (tiền mặt), bàn và yêu cầu phục vụ; triển khai Order Service (PostgreSQL) với giỏ hàng/session Redis, state machine đơn hàng, khóa tồn kho, hóa đơn theo phiên; đưa Kafka vào vòng đời với topic `order.confirmed`, đồng thời giữ realtime UI qua BFF Direct (`order.created`, `service.requested`).
> **Ước lượng:** ~2–2,5 tuần (gồm Pre-Phase 2 khoảng 0,5–1 ngày)
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Phase 1 hoàn thành — [phase-1-catalog.md](phase-1-catalog.md)
- Catalog Service endpoints ổn định (menu, bàn, QR) để làm nền cho đặt món và kiểm tra tồn kho

## Tham Chiếu

| Tài liệu                  | Section liên quan                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| technical-architecture.md | §6.2.5 Order Service, §7.2 Kafka Topic Registry, §7.3 BFF Direct Side-Effects, §7.4 Async Messaging (4P+2AP), §12 Xử lý giao dịch phân tán |
| business-logic.md         | §4 Luồng đặt món tại bàn, §8 State machine vòng đời đơn hàng                                                                               |

## Tổng Quan

Phase 2A gộp việc bổ sung quyền chi tiết (Pre-Phase 2) với việc dựng nghiệp vụ đơn hàng và đưa Kafka vào kiến trúc. Hóa đơn (bill) thuộc Order Service — không giao cho Payment Service ở phase này. Chỉ một topic Kafka được phát sinh: `order.confirmed`; các sự kiện cần độ trễ thấp cho UI dùng BFF Direct (AP1) `order.created` và `service.requested` kèm phát WebSocket. Session và giỏ dùng Redis với quy ước key và TTL/idle rõ ràng; tồn kho menu item được bảo vệ bằng khóa bi quan trên PostgreSQL khi xác nhận đơn.

### Step progress (sync với triển khai thực tế)

| Step | Mục tiêu ngắn                              | Trạng thái     |
| ---- | ------------------------------------------ | -------------- |
| 2.0  | PERMISSION enum + role seed + matrix       | ✅ Done        |
| 2.1  | Kafka foundation (khóa học)                | 🟢 Course      |
| 2.2  | Mock UI Cart / POS / KDS                   | ⬜ Not Started |
| 2.3  | Shared types + hợp đồng realtime           | ✅ Done        |
| 2.4  | Order Service + Redis + Kafka + BFF Direct | ⬜ Not Started |
| 2.5  | Tích hợp FE ↔ BE                          | ⬜ Not Started |

## Steps

### Step 2.0 — Mở rộng PERMISSION enum và mapping role

**Mục tiêu:** Đảm bảo mọi thao tác order, kitchen/bar, payment (tiền mặt), bàn và service request đều có permission rõ ràng trước khi BFF/Order Service expose endpoint — tránh “lỗ hổng” RBAC khi tích hợp POS/KDS/PWA.

**Yêu cầu chính:**

- Bổ sung enum permission: `ORDER_CREATE`, `ORDER_CONFIRM`, `ORDER_CANCEL`, `ORDER_GET_LIST`, `ORDER_GET_BY_ID`, `KITCHEN_GET_QUEUE`, `KITCHEN_UPDATE_TICKET`, `KITCHEN_RECALL`, `PAYMENT_CREATE`, `PAYMENT_CONFIRM_CASH`, `PAYMENT_REFUND`, `PAYMENT_GET_HISTORY`, `TABLE_CREATE`, `TABLE_UPDATE`, `TABLE_DELETE`, `TABLE_TRANSFER`, `TABLE_UPDATE_STATUS`, `SERVICE_REQUEST_CREATE`, `SERVICE_REQUEST_ACKNOWLEDGE`, `SERVICE_REQUEST_RESOLVE`
- Mapping role → permission: **OWNER** (full trừ các quyền `SAAS_*`, `ROLE_*`, `PRODUCT_*`), **MANAGER** (tương tự OWNER, không gồm `USER_DELETE`), **WAITER** (`ORDER_CONFIRM`, `ORDER_GET_*`, `PAYMENT_CONFIRM_CASH`, `PAYMENT_GET_HISTORY`, `TABLE_TRANSFER`, `TABLE_UPDATE_STATUS`, `SERVICE_REQUEST_*`, `CATALOG_GET_*`, `INVOICE_GET_*`), **CHEF/BARISTA** (`KITCHEN_*`, `CATALOG_GET_*`), **CUSTOMER** không gán qua matrix này — kiểm soát ở tầng controller bằng `SessionGuard` (table/session scope). Canonical matrix: [`docs/architecture/permission-matrix.md`](../architecture/permission-matrix.md).
- Chuỗi guard cho endpoint staff: `UserGuard` → `TenantGuard` → `PermissionGuard` (thứ tự bắt buộc theo kiến trúc platform)

**Lưu ý quan trọng:**

- Sau khi đổi enum/mapping phải **re-seed** dữ liệu role trên MongoDB (Authorizer) để JWT/permission check khớp thực tế

**Kịch bản kiểm thử cụ thể:**

- User có role WAITER → gọi được ORDER_CONFIRM endpoint
- User có role CHEF → KHÔNG gọi được PAYMENT endpoint

**Deliverable:** Document Permission Matrix → `docs/architecture/permission-matrix.md`

**Verify:** Đăng nhập từng role → chỉ thấy/gọi được hành vi đúng permission; CUSTOMER chỉ thao tác qua session hợp lệ

### Step 2.1 — Nền tảng Kafka (học tập)

**Mục tiêu:** Hiểu producer/consumer, partition, delivery semantics và cách topic registry khớp với quyết định 4P+2AP — để triển khai `order.confirmed` đúng vai trò (hậu xử lý cross-service), không lạm dụng Kafka cho mọi sự kiện UI.

**Yêu cầu chính:**

- Hoàn thành bài học 115–123 (Kafka trong lộ trình khóa học)

**Verify:** Có thể giải thích vì sao `order.confirmed` lên Kafka còn `order.created` / `service.requested` đi BFF Direct

### Step 2.2 — Mock UI: Cart, POS, KDS

**Mục tiêu:** Cố định UX và luồng màn hình trước khi gắn API — giảm rework khi state machine và realtime bật.

**Yêu cầu chính:**

- **Customer PWA — Cart & Ordering:**
  - Nút "Thêm vào giỏ" trên MenuItemCard
  - Cart drawer: danh sách items, +/- quantity, note field per item, tổng tiền
  - Nút "Gửi đơn hàng" (với animation)
  - Order Tracking page: status timeline (PENDING → PROCESSING → READY → SERVED)
  - Service Request buttons: "Gọi nhân viên", "Yêu cầu thanh toán", "Hỗ trợ"
- **Staff POS (`/pos/`):**
  - Live Orders cards: bàn, items, tổng tiền, thời gian
  - Buttons: "Xác nhận", "Từ chối" trên mỗi đơn
  - Table Map: grid bàn với color-coded status
  - Real-time: đơn mới slides in (animation)
- **KDS (`/kds/kitchen` + `/kds/bar`):**
  - Column-based Kanban: Chờ | Đang làm | Hoàn thành
  - Mỗi ticket: số bàn, tên món, số lượng, ghi chú, timer
  - Buttons: "Bắt đầu", "Xong", "Thu hồi (Recall)"
  - SLA timer: đổi màu khi quá threshold (vàng → đỏ)
  - Batching: gom cùng món highlight

→ Tất cả dùng mock data + fake WebSocket (setTimeout simulate events).

**Lưu ý quan trọng:** Mock phải phản ánh các trạng thái sẽ map sang `OrderStatus` và hàng đợi bếp — không chỉ layout tĩnh

**Verify:** Demo được luồng khách đặt → staff thấy đơn → bếp/bar thấy ticket trên mock

> **Status:** ⬜ Not Started — Step 2.2 chưa được triển khai. Thứ tự thực hiện thực tế: Step 2.0 → 2.3 → (**2.2 pending**) → 2.4 → 2.5. Spec/plan canonical sẽ được tạo mới khi bắt đầu, dựa trên shared types đã khóa từ Step 2.3.

### Step 2.3 — Shared types & hợp đồng realtime

**Mục tiêu:** Một nguồn sự thật cho FE/BE về đơn, dòng món, hóa đơn, phiên, giỏ, yêu cầu phục vụ và payload WebSocket — tránh drift khi Order Service và BFF phát sự kiện.

**Yêu cầu chính:**

- Enum `OrderStatus` với nhánh chính: **DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED** và nhánh **CANCELED** (chuyển từ các trạng thái cho phép theo business-logic §8)
- `ServiceRequestType` và các type domain (drop I-prefix per Step 2.3 ADR): `Order`, `OrderItem`, `Bill`, `Session`, `CartItem`, `ServiceRequest`
- 4 status enums bổ sung: `OrderItemStatus`, `BillStatus`, `SessionStatus`, `ServiceRequestStatus` + `PaymentMethod` (CASH only Phase 2A)
- 3 transition matrices (`ALLOWED_ORDER_TRANSITIONS`, `ALLOWED_BILL_TRANSITIONS`, `ALLOWED_SERVICE_REQUEST_TRANSITIONS`) làm shared FE+BE state machine
- Định nghĩa tập **WebSocket event types** tương thích với BFF Direct (`order.created` → `OrderCreatedEvent`, `service.requested` → `ServiceRequestedEvent`, `OrderStatusChangedEvent`) + **Kafka payload type** (`OrderConfirmedEvent` cho topic `order.confirmed`) + data shape `KDSTicket` cho UI render

**Chi tiết field các entity/type:**

```
Order { id, tenantId, tableId, tableName, sessionId, items: OrderItem[], status, totalAmount, idempotencyKey,
        notes?, confirmedAt?, confirmedByUserId?, cancelledAt?, cancelledByUserId?, cancelReason?, createdAt, updatedAt }
OrderItem { id, orderId, menuItemId, menuItemName, quantity, unitPrice, note?, status, createdAt, updatedAt }
Bill { id, tenantId, sessionId, orderIds[], subtotal, total, roundingAmount, paymentMethod?, status, closedAt?, paidAt?, createdAt, updatedAt }
Session { id, tenantId, tableId, tableName, status, startedAt, lastActivity, closedAt?, orderCount }
CartItem { menuItemId, menuItemName, quantity, unitPrice, note?, version }
ServiceRequest { id, tenantId, tableId, sessionId, type, status, note?, acknowledgedAt?, acknowledgedByUserId?, resolvedAt?, createdAt, updatedAt }

Enums:
OrderStatus { DRAFT, PENDING, PROCESSING, READY, SERVED, COMPLETED, CANCELED }
OrderItemStatus { PROCESSING, READY, SERVED, CANCELED }
BillStatus { OPEN, PENDING_PAYMENT, PAID }
SessionStatus { ACTIVE, CLOSED }
ServiceRequestType { CALL_STAFF, REQUEST_BILL, GENERAL_HELP }
ServiceRequestStatus { PENDING, ACKNOWLEDGED, RESOLVED }
PaymentMethod { CASH }    // Phase 3 sẽ thêm CARD, MOMO, ZALOPAY, BANK_TRANSFER

Realtime/Event Types:
OrderCreatedEvent       { tenantId, orderId, tableId, tableName, sessionId, items, totalAmount, timestamp }       // BFF Direct
OrderStatusChangedEvent { tenantId, orderId, fromStatus, toStatus, changedByUserId?, timestamp }                  // BFF Direct
ServiceRequestedEvent   { tenantId, requestId, tableId, tableName, sessionId, type, note?, timestamp }            // BFF Direct
OrderConfirmedEvent     { tenantId, orderId, sessionId, items, totalAmount, confirmedAt, confirmedByUserId }      // Kafka order.confirmed
KDSTicket               { ticketId, tenantId, orderId, tableId, tableName, items, priority, createdAt, slaSeconds }  // Data shape

State Machine Matrices (encoded trong types lib, shared FE+BE):
ALLOWED_ORDER_TRANSITIONS, ALLOWED_BILL_TRANSITIONS, ALLOWED_SERVICE_REQUEST_TRANSITIONS
```

> **ADR — Const-object pattern thay vì TS `enum`:** Tất cả 7 enums (`OrderStatus`, `OrderItemStatus`, `BillStatus`, `SessionStatus`, `ServiceRequestType`, `ServiceRequestStatus`, `PaymentMethod`) triển khai bằng `const object + type alias` (`export const X = { ... } as const; export type X = typeof X[keyof typeof X]`) — KHÔNG phải TS `enum`. Lý do: `erasableSyntaxOnly` trong `customer-pwa` tsconfig không chấp nhận TS `enum` (sinh runtime code). `class-validator` `@IsEnum(OrderStatus)` vẫn hoạt động với const-object từ v0.14+. Chi tiết: xem header comment trong `libs/shared/types/src/lib/order.types.ts`.

**Verify:** Frontend và backend compile/import cùng bộ type; transition matrices import được; contract event có thể liệt kê trong review (tên event + payload tối thiểu)

> **Spec & Plan reference:** [Step 2.3 spec](../superpowers/specs/2026-04-19-step-2.3-shared-types-design.md) · [Step 2.3 plan](../superpowers/plans/2026-04-19-step-2.3-shared-types.md)

> **Status:** ✅ Done (2026-04-19, commit `5089d41`) — shared types + transition matrices + realtime/Kafka contract types trong `libs/shared/types/`.

### Step 2.4 — Order Service backend, Redis, Kafka, BFF Direct

**Mục tiêu:** Order Service là nguồn sự thật cho đơn, dòng món, **hóa đơn (bill)**, yêu cầu phục vụ; đồng bộ tồn kho với Catalog an toàn khi xác nhận; phát `order.confirmed` cho consumer tương lai; BFF phát realtime tức thì cho UI.

**Yêu cầu chính:**

- Persistence **PostgreSQL** cho toàn bộ aggregate order domain (không dùng Mongo cho entities nghiệp vụ này)
- Vùng dữ liệu: đơn (`orders`), dòng món (`order_items`), **hóa đơn (`bills`) thuộc Order Service** — Payment Service phase sau chỉ tiêu thụ/kết nối thanh toán, không là owner bill
- Phiên khách: Redis key `session:{tenant_id}:{session_id}`, TTL **2 giờ**, **idle 30 phút**. Rule auto-close: nếu `last_activity` > 30 phút VÀ `order_count == 0` → tự đóng session; nếu đã có đơn (`order_count > 0`) thì chỉ gia hạn idle timer, không tự đóng
- Giỏ chung: Redis key `cart:{tenant_id}:{session_id}` dạng **Hash** kèm field **version** (optimistic locking). Khi update cart: kiểm tra version match trước khi ghi — nếu conflict → trả lỗi để client retry với dữ liệu mới nhất. Broadcast cart changes tới các device khác cùng session qua WebSocket
- **Order state machine** khớp §8; mọi chuyển trạng thái có guard nghiệp vụ — validation rules per transition: ai được phép trigger transition nào (Customer chỉ cancel từ PENDING; Manager/Owner có thể cancel từ PROCESSING; chỉ Staff Waiter/Manager mới confirm được)
- **Khóa tồn kho:** pessimistic lock trên PostgreSQL (**SELECT … FOR UPDATE**) trên dòng tồn/menu item liên quan khi confirm. Flow: nếu `stock >= requested` → deduct stock + create order_item + COMMIT; nếu không đủ → ROLLBACK → trả "Món đã hết" cho client — tránh oversell
- **Tổng hợp bill theo session:** merge nhiều orders thành 1 bill per session; **chuyển bàn** thực hiện **atomic**: validate bàn đích status == Available → BEGIN → cập nhật orders, sessions, cart, bàn cũ → Available, bàn mới → Occupied → COMMIT → notify KDS về sự thay đổi
- **Service request:** entity lưu trạng thái phục vụ — type: `CALL_STAFF` | `REQUEST_BILL` | `GENERAL_HELP`; status flow: `PENDING` → `ACKNOWLEDGED` → `RESOLVED`
- **Kafka:** chỉ producer topic `**order.confirmed`\*\* trong phase này (đúng registry §7.2)
- **BFF Direct (AP1, không Kafka):** sau tác vụ thành công, emit `**order.created`** và `**service.requested\*\*` → gateway WebSocket tới client
- Môi trường dev: broker Kafka + Zookeeper chạy cùng stack container với các service khác
- Module client Kafka dùng chung (producer config, error handling, observability cơ bản)

**Lưu ý quan trọng:**

- Mọi query/command Order Service **lọc `tenant_id`**; TCP/BFF payload mang tenant context nhất quán
- Idempotency và biên saga với Catalog/Payment giai đoạn sau — tham chiếu §12 khi thiết kế bước bù trừ

**BFF REST Endpoints:**

- Order submit — Customer, SessionGuard
- Order confirm — Staff, UserGuard + ORDER_CONFIRM
- Order cancel — Customer (Pending only) hoặc Manager (Processing)
- Order list/detail query — Staff ORDER_GET_LIST / Staff+Customer ORDER_GET_BY_ID
- Cart CRUD — Customer, SessionGuard
- Service request submit — Customer, SessionGuard
- Service request acknowledge — Staff, SERVICE_REQUEST_ACKNOWLEDGE

**Verify:** Confirm đơn → tồn giảm đúng, không double-sell dưới concurrency; `order.confirmed` xuất hiện trên topic; UI nhận WS từ `order.created` / `service.requested`; chuyển bàn không mất cart/order

### Step 2.5 — Tích hợp FE ↔ BE

**Mục tiêu:** Customer PWA và Management POS dùng API thật; realtime hoặc polling phù hợp từng app — hoàn tất vòng lặp demo nội bộ.

**Yêu cầu chính:**

- Hooks cho cart management và order submission (với idempotency key), session, service request, POS list
- Customer PWA: thay mock bằng API + session hợp lệ; optimistic updates cho cart. Order submit: loading → success animation → redirect tới tracking page. Service Request buttons gọi API thực
- Management POS: **polling** danh sách đơn/live view (WebSocket chuyển sang ở Phase 2B). Actions: confirm/cancel → API calls cập nhật trạng thái đơn

**Verify:** Khách thêm giỏ hàng → submit đơn → Staff thấy đơn mới trên POS. Stock lock: 2 khách cùng đặt món cuối → 1 nhận "Hết hàng". Không lộ dữ liệu cross-tenant

## Acceptance Criteria

- Enum permission Step 2.0 đầy đủ; role seed MongoDB khớp mapping OWNER / MANAGER / WAITER / CHEF / BARISTA
- Endpoint staff đi qua `UserGuard` → `TenantGuard` → `PermissionGuard`; CUSTOMER bọc `SessionGuard` đúng scope
- `OrderStatus` và chuyển trạng thái khớp §8 (kể cả nhánh CANCELED)
- Redis: `session:{tid}:{sid}` TTL 2h, idle 30 phút; `cart:{tid}:{sid}` Hash có version, cập nhật không ghi đè lẫn nhau khi conflict
- Bill thuộc Order Service (PostgreSQL), không nằm Payment Service
- Kafka: có message hợp lệ trên topic duy nhất `**order.confirmed`\*\*
- BFF Direct: `**order.created**` và `**service.requested**` dẫn tới emit WebSocket cho client
- Xác nhận đơn dùng pessimistic lock tồn kho; stress đơn giản không oversell
- Chuyển bàn atomic; không orphan order/cart
- Customer PWA và POS dùng API thật; multi-tenant cô lập

## Outputs cho Phase tiếp theo

- Order domain ổn định trên PostgreSQL; bill sẵn sàng cho Payment / Invoice nối tiếp
- Consumer Kafka (ví dụ Inventory, Notification, analytics) có thể subscribe `order.confirmed`
- Bộ permission và guard sẵn cho phase thanh toán điện tử, split bill, và mở rộng KDS realtime
- Shared types và hooks tái sử dụng cho phase tích hợp payment gateway và hoàn thiện offline POS
