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

## Steps

### Step 2.0 — Mở rộng PERMISSION enum và mapping role

**Mục tiêu:** Đảm bảo mọi thao tác order, kitchen/bar, payment (tiền mặt), bàn và service request đều có permission rõ ràng trước khi BFF/Order Service expose endpoint — tránh “lỗ hổng” RBAC khi tích hợp POS/KDS/PWA.

**Yêu cầu chính:**

- Bổ sung enum permission: `ORDER_CREATE`, `ORDER_CONFIRM`, `ORDER_CANCEL`, `ORDER_GET_LIST`, `ORDER_GET_BY_ID`, `KITCHEN_GET_QUEUE`, `KITCHEN_UPDATE_TICKET`, `KITCHEN_RECALL`, `PAYMENT_CREATE`, `PAYMENT_CONFIRM_CASH`, `PAYMENT_REFUND`, `PAYMENT_GET_HISTORY`, `TABLE_CREATE`, `TABLE_UPDATE`, `TABLE_DELETE`, `TABLE_TRANSFER`, `TABLE_UPDATE_STATUS`, `SERVICE_REQUEST_CREATE`, `SERVICE_REQUEST_ACKNOWLEDGE`, `SERVICE_REQUEST_RESOLVE`
- Mapping role → permission: **OWNER** (full trừ các quyền `SAAS_*` nếu có trong hệ thống), **MANAGER** (tương tự OWNER, không gồm `SAAS_*`), **WAITER** (`ORDER_CONFIRM`, `ORDER_GET_*`, `PAYMENT_CONFIRM_CASH`, `TABLE_TRANSFER`, `TABLE_UPDATE_STATUS`, `SERVICE_REQUEST_*`, `CATALOG_GET_*`), **CHEF/BARISTA** (`KITCHEN_*`, `CATALOG_GET_*`), **CUSTOMER** không gán qua matrix này — kiểm soát ở tầng controller bằng `SessionGuard` (table/session scope)
- Chuỗi guard cho endpoint staff: `UserGuard` → `TenantGuard` → `PermissionGuard` (thứ tự bắt buộc theo kiến trúc platform)

**Lưu ý quan trọng:**

- Sau khi đổi enum/mapping phải **re-seed** dữ liệu role trên MongoDB (Authorizer) để JWT/permission check khớp thực tế

**Kịch bản kiểm thử cụ thể:**

- User có role WAITER → gọi được ORDER_CONFIRM endpoint
- User có role CHEF → KHÔNG gọi được PAYMENT\_\* endpoint

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
  - Cart drawer: danh sách items, +/- quantity, note field, tổng tiền
  - Nút "Gửi đơn hàng" (với animation)
  - Order Tracking page: status timeline (Pending → Processing → Ready → Served)
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

### Step 2.3 — Shared types & hợp đồng realtime

**Mục tiêu:** Một nguồn sự thật cho FE/BE về đơn, dòng món, hóa đơn, phiên, giỏ, yêu cầu phục vụ và payload WebSocket — tránh drift khi Order Service và BFF phát sự kiện.

**Yêu cầu chính:**

- Enum `OrderStatus` với nhánh chính: **DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED** và nhánh **CANCELED** (chuyển từ các trạng thái cho phép theo business-logic §8)
- `ServiceRequestType` và các interface domain: `IOrder`, `IOrderItem`, `IBill`, `ISession`, `ICartItem`, `IServiceRequest`
- Định nghĩa tập **WebSocket event types** tương thích với BFF Direct (`order.created`, `service.requested`) và các cập nhật UI cần thiết ở phase này

**Chi tiết field các entity/interface:**

```
IOrder { id, tenantId, tableId, sessionId, status, totalAmount, idempotencyKey, createdAt, updatedAt }
IOrderItem { id, orderId, menuItemId, quantity, price, note, status }
IBill { id, tenantId, sessionId, subtotal, total, status, paymentMethod, roundingAmount }
ISession { tableId, startedAt, status, lastActivity }
ICartItem { menuItemId, qty, note?, price, version }
IServiceRequest { id, tenantId, tableId, sessionId, type, status, createdAt }

OrderStatus { DRAFT, PENDING, PROCESSING, READY, SERVED, COMPLETED, CANCELED }
ServiceRequestType { CALL_STAFF, REQUEST_BILL, GENERAL_HELP }

WebSocket Event Types:
IOrderCreatedEvent { orderId, tableId, items: IOrderItem[] }
IOrderStatusEvent { orderId, status: OrderStatus }
IKDSTicket { ticketId, tableId, items, priority: boolean }
```

**Verify:** Frontend và backend compile/import cùng bộ type; contract event có thể liệt kê trong review (tên event + payload tối thiểu)

### Step 2.4 — Order Service backend, Redis, Kafka, BFF Direct

**Mục tiêu:** Order Service là nguồn sự thật cho đơn, dòng món, **hóa đơn (bill)**, yêu cầu phục vụ; đồng bộ tồn kho với Catalog an toàn khi xác nhận; phát `order.confirmed` cho consumer tương lai; BFF phát realtime tức thì cho UI.

**Yêu cầu chính:**

- Persistence **PostgreSQL** cho toàn bộ aggregate order domain (không dùng Mongo cho entities nghiệp vụ này)
- Vùng dữ liệu: đơn (`orders`), dòng món (`order_items`), **hóa đơn (`bills`) thuộc Order Service** — Payment Service phase sau chỉ tiêu thụ/kết nối thanh toán, không là owner bill
- Phiên khách: Redis key `session:{tenant_id}:{session_id}`, TTL **2 giờ**, **idle 30 phút** (gia hạn/đóng session theo rule nghiệp vụ)
- Giỏ chung: Redis key `cart:{tenant_id}:{session_id}` dạng **Hash** kèm field **version** (optimistic locking khi nhiều tab/thiết bị)
- **Order state machine** khớp §8; mọi chuyển trạng thái có guard nghiệp vụ (ai được phép, từ trạng thái nào)
- **Khóa tồn kho:** pessimistic lock trên PostgreSQL (**SELECT … FOR UPDATE**) trên dòng tồn/menu item liên quan khi confirm — tránh oversell
- **Tổng hợp bill theo session**; **chuyển bàn** thực hiện **atomic** (đơn/session/cart/bàn không lệch trạng thái giữa chừng)
- **Kafka:** chỉ producer topic **`order.confirmed`** trong phase này (đúng registry §7.2)
- **BFF Direct (AP1, không Kafka):** sau tác vụ thành công, emit **`order.created`** và **`service.requested`** → gateway WebSocket tới client
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
- Customer PWA: thay mock bằng API + session hợp lệ
- Management POS: **polling** danh sách đơn/live view (WebSocket có thể bật dần nếu gateway đã sẵn)

**Verify:** Khách đặt từ PWA → POS thấy đơn; bếp/bar cập nhật từ KDS mock hoặc UI tối thiểu nếu đã nối API; không lộ dữ liệu cross-tenant

## Acceptance Criteria

- [ ] Enum permission Step 2.0 đầy đủ; role seed MongoDB khớp mapping OWNER / MANAGER / WAITER / CHEF / BARISTA
- [ ] Endpoint staff đi qua `UserGuard` → `TenantGuard` → `PermissionGuard`; CUSTOMER bọc `SessionGuard` đúng scope
- [ ] `OrderStatus` và chuyển trạng thái khớp §8 (kể cả nhánh CANCELED)
- [ ] Redis: `session:{tid}:{sid}` TTL 2h, idle 30 phút; `cart:{tid}:{sid}` Hash có version, cập nhật không ghi đè lẫn nhau khi conflict
- [ ] Bill thuộc Order Service (PostgreSQL), không nằm Payment Service
- [ ] Kafka: có message hợp lệ trên topic duy nhất **`order.confirmed`**
- [ ] BFF Direct: **`order.created`** và **`service.requested`** dẫn tới emit WebSocket cho client
- [ ] Xác nhận đơn dùng pessimistic lock tồn kho; stress đơn giản không oversell
- [ ] Chuyển bàn atomic; không orphan order/cart
- [ ] Customer PWA và POS dùng API thật; multi-tenant cô lập

## Outputs cho Phase tiếp theo

- Order domain ổn định trên PostgreSQL; bill sẵn sàng cho Payment / Invoice nối tiếp
- Consumer Kafka (ví dụ Inventory, Notification, analytics) có thể subscribe `order.confirmed`
- Bộ permission và guard sẵn cho phase thanh toán điện tử, split bill, và mở rộng KDS realtime
- Shared types và hooks tái sử dụng cho phase tích hợp payment gateway và hoàn thiện offline POS
