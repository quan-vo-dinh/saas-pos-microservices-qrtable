# Phase 2A — Permissions + Order + Kafka

> **Mục tiêu:** Mở rộng RBAC cho toàn bộ luồng đặt món, bếp/bar, bill/request payment (đến `PENDING_PAYMENT`; **xác nhận tiền mặt → Phase 3**), bàn và yêu cầu phục vụ; triển khai Order Service (PostgreSQL) với giỏ hàng/session Redis + session durable, state machine đơn hàng, **tồn kho qua Catalog TCP** khi confirm, hóa đơn theo phiên; đưa Kafka vào vòng đời với topic `order.confirmed`, đồng thời giữ realtime UI qua BFF Direct (minimal WS Step 2.4 — xem `docs/business-logic-step-2.4-spec.vi.md`).
> **Ước lượng:** ~2–2,5 tuần (gồm Pre-Phase 2 khoảng 0,5–1 ngày)
> **Trạng thái:** 🟡 Đang triển khai — **2.0 ✅ · 2.1 🟢 (khóa học) · 2.2 ✅ · 2.3 ✅** · **2.4 ⬜ (tiếp theo)** · 2.5 ⬜

## Prerequisites

- Phase 1 hoàn thành — [phase-1-catalog.md](phase-1-catalog.md)
- Catalog Service endpoints ổn định (menu, bàn, QR) để làm nền cho đặt món và kiểm tra tồn kho

## Tham Chiếu

| Tài liệu                           | Section liên quan                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| technical-architecture.md          | §6.2.5 Order Service, §7.2 Kafka Topic Registry, §7.3 BFF Direct Side-Effects, §7.4 Async Messaging (4P+2AP), §12 Xử lý giao dịch phân tán |
| business-logic.md                  | §4 Luồng đặt món tại bàn, §8 State machine vòng đời đơn hàng                                                                               |
| business-logic-step-2.4-spec.vi.md | Đặc tả đã chốt Q1–Q12 (ownership stock, deduct timing, bill, transfer saga, RBAC cancel, events, scope payment)                            |

## Tổng Quan

Phase 2A gộp việc bổ sung quyền chi tiết (Pre-Phase 2) với việc dựng nghiệp vụ đơn hàng và đưa Kafka vào kiến trúc. Hóa đơn (bill) thuộc Order Service — không giao cho Payment Service ở phase này. Chỉ một topic Kafka được phát sinh: `order.confirmed`; các sự kiện cần độ trễ thấp cho UI dùng BFF Direct (AP1). Session **durable trong PostgreSQL (Order)** + Redis cache; giỏ Redis với **cart version** và broadcast; **Catalog Service** sở hữu `menu_items` và thực hiện deduct/stock lock qua **lệnh TCP transactional** khi staff confirm — không khóa trực tiếp bảng Catalog từ Order DB (đặc tả Step 2.4).

### Step progress (sync với triển khai thực tế)

| Step | Mục tiêu ngắn                              | Trạng thái     |
| ---- | ------------------------------------------ | -------------- |
| 2.0  | PERMISSION enum + role seed + matrix       | ✅ Done        |
| 2.1  | Kafka foundation (khóa học)                | 🟢 Course      |
| 2.2  | Mock UI Cart / POS / KDS                   | ✅ Done        |
| 2.3  | Shared types + hợp đồng realtime           | ✅ Done        |
| 2.4  | Order Service + Redis + Kafka + BFF Direct | ⬜ Not Started |
| 2.5  | Tích hợp FE ↔ BE                          | ⬜ Not Started |

## Steps

### Step 2.0 — Mở rộng PERMISSION enum và mapping role

**Mục tiêu:** Đảm bảo mọi thao tác order, kitchen/bar, payment (tiền mặt), bàn và service request đều có permission rõ ràng trước khi BFF/Order Service expose endpoint — tránh “lỗ hổng” RBAC khi tích hợp POS/KDS/PWA.

**Yêu cầu chính:**

- Bổ sung enum permission: `ORDER_CREATE`, `ORDER_CONFIRM`, `ORDER_CANCEL_PENDING`, `ORDER_CANCEL_PROCESSING`, `ORDER_GET_LIST`, `ORDER_GET_BY_ID`, `KITCHEN_GET_QUEUE`, `KITCHEN_UPDATE_TICKET`, `KITCHEN_RECALL`, `PAYMENT_CREATE`, `PAYMENT_CONFIRM_CASH`, `PAYMENT_REFUND`, `PAYMENT_GET_HISTORY`, `TABLE_CREATE`, `TABLE_UPDATE`, `TABLE_DELETE`, `TABLE_TRANSFER`, `TABLE_UPDATE_STATUS`, `SERVICE_REQUEST_CREATE`, `SERVICE_REQUEST_ACKNOWLEDGE`, `SERVICE_REQUEST_RESOLVE`
- Mapping role → permission: **OWNER** (full trừ các quyền `SAAS_`_, `ROLE_`_, `PRODUCT_*`), **MANAGER** (tương tự OWNER, không gồm `USER_DELETE`), **WAITER** (`ORDER_CONFIRM`, `ORDER_GET_`_, `PAYMENT_CONFIRM_CASH`, `PAYMENT_GET_HISTORY`, `TABLE_TRANSFER`, `TABLE_UPDATE_STATUS`, `SERVICE*REQUEST*_`, `CATALOG*GET*_`, `INVOICE*GET*_`), **CHEF/BARISTA** (`KITCHEN*`*, `CATALOG_GET*`*), **CUSTOMER** không gán qua matrix này — kiểm soát ở tầng controller bằng `SessionGuard`(table/session scope). Canonical matrix:`[docs/architecture/permission-matrix.md](../architecture/permission-matrix.md)`.
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

**Phân quyền UI (Phase 2.x):** Mock POS/KDS trên `management-app` tuân **điều hướng theo role** (middleware + sidebar). Kiểm tra quyền thật trên API vẫn là **permission** ở BFF — mô tả hai tầng: `[docs/architecture/permission-matrix.md](../architecture/permission-matrix.md)` §9. Blueprint chi tiết: `[docs/ui-blueprint-step-2.2.md](../ui-blueprint-step-2.2.md)`.

**Verify:** Demo được luồng khách đặt → staff thấy đơn → bếp/bar thấy ticket trên mock

> **Status:** ✅ Done (đóng 2026-04-26) — mock UI bám `[docs/ui-blueprint-step-2.2.md](../ui-blueprint-step-2.2.md)`, dữ liệu & fake realtime tách trong `apps/customer-pwa/src/mocks/` và `apps/management-app/src/mocks/` (`use-fake-realtime`, Zustand + seed). Types hiển thị lấy từ `libs/shared/types` (Step 2.3). **Thứ tự thực tế đã làm:** 2.0 → 2.3 → 2.2 → **2.4** → 2.5. Kế hoạch triển khai: `[docs/superpowers/plans/2026-04-24-step-2.2-mock-ui.md](../superpowers/plans/2026-04-24-step-2.2-mock-ui.md)` · tổng kết handoff: `[docs/superpowers/handoffs/2026-04-25-step-2.2-batch-5-handoff.md](../superpowers/handoffs/2026-04-25-step-2.2-batch-5-handoff.md)`.

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

**Canonical business spec:** [`docs/business-logic-step-2.4-spec.vi.md`](../business-logic-step-2.4-spec.vi.md) (quyết định Q1–Q12). Phần dưới là **tóm tắt triển khai** cùng hướng với đặc tả.

**Prerequisites (đã đáp ứng):** Step 2.3 và Step 2.2 như trên.

**Mục tiêu:** Order Service là source of truth cho đơn, dòng món, bill, service request; Catalog là source of truth cho stock và trạng thái bàn; Redis cho cart và cache session hoạt động; Kafka `order.confirmed` sau confirm; BFF Direct + WebSocket tối thiểu cho realtime Step 2.4/2.5.

**Yêu cầu chính:**

- Persistence **PostgreSQL** Order DB: `orders`, `order_items`, `bills`, `service_requests`, **`sessions` (durable)** — không Mongo cho các entity này
- Submit order: persist từ **`PENDING`**; **`DRAFT`** chỉ cart/UI — không tạo row order cho draft
- Session: PostgreSQL là **chuẩn**; Redis `session:{tenant_id}:{session_id}` TTL **2h**, idle **30 phút**; đóng khi idle **và** `order_count == 0`; có đơn thì **không** auto-close khi idle
- Cart: `cart:{tenant_id}:{session_id}`, Hash + **`cartVersion` toàn cục** + line ids; conflict → 409 + snapshot; **`CartUpdatedEvent`** (contract Step 2.4); WS không thay REST làm source of truth sau reconnect
- **Stock:** submit chỉ **snapshot availability**; **deduct khi staff confirm** (`PENDING → PROCESSING`) qua **Catalog TCP** (transactional commands); Order **không** `UPDATE menu_items`
- **Bill:** tạo lần **submit order đầu tiên** trong session; `BillStatus` `OPEN → PENDING_PAYMENT` trong Step 2.4; **`PAID` / xác nhận tiền mặt → Phase 3**. Bill request: **explicit command** + khóa đặt món; `REQUEST_BILL` có thể là side effect thông báo
- **Chuyển bàn:** **saga + transfer lock + compensation** giữa Order, Catalog, Redis — không một ACID transaction xuyên mọi store; sau thành công emit realtime (BFF Direct), **không** thêm Kafka topic rename bàn
- **Kafka:** chỉ producer `order.confirmed` (registry §7.2); payload **enriched** (`tableId`, station, metadata — Q8); publish qua **simplified outbox** (`implementation_plan.md`)
- **BFF Direct:** tối thiểu `order.created`, `order.status_changed`, `service.requested`, `cart.updated`, `table.transferred` (+ gateway Step 2.4); Phase 2B harden WS scale
- **RBAC:** tách **`order.cancel_pending`** / **`order.cancel_processing`** (permission-matrix §6.1); customer self-cancel pending qua SessionGuard

**BFF REST (mở rộng so với checklist tối thiểu — đồng bộ mock Step 2.2):**

- Order submit / confirm / cancel · Cart CRUD · Service request CRUD + acknowledge **resolve**
- Bill get / explicit bill-request · Transfer table · Staff order list/detail · Endpoint hỗ trợ KDS/serve status (theo blueprint)

**Verify:** Confirm → tồn Catalog giảm đúng; không oversell dưới concurrency; `order.confirmed` trên topic; WS/lỗi cart như đặc tả; transfer không orphan session/cart; bill dừng đúng ranh giới Phase 3 cho cash

### Step 2.5 — Tích hợp FE ↔ BE

**Mục tiêu:** Customer PWA và Management POS dùng API thật; realtime hoặc polling phù hợp từng app — hoàn tất vòng lặp demo nội bộ.

**Yêu cầu chính:**

- Hooks cho cart management và order submission (với idempotency key), session, service request, POS list
- Customer PWA: thay mock bằng API + session hợp lệ; optimistic updates cho cart. Order submit: loading → success animation → redirect tới tracking page. Service Request buttons gọi API thực
- Management POS: **polling** danh sách đơn/live view (WebSocket chuyển sang ở Phase 2B). Actions: confirm/cancel → API calls cập nhật trạng thái đơn

**Verify:** Khách thêm giỏ hàng → submit đơn → Staff thấy đơn mới trên POS. Stock: hai luồng confirm tranh món cuối → một luồng nhận lỗi tồn từ Catalog khi confirm. Không lộ dữ liệu cross-tenant

## Acceptance Criteria

- Enum permission Step 2.0 đầy đủ; role seed MongoDB khớp mapping OWNER / MANAGER / WAITER / CHEF / BARISTA
- Endpoint staff đi qua `UserGuard` → `TenantGuard` → `PermissionGuard`; CUSTOMER bọc `SessionGuard` đúng scope
- `OrderStatus` và chuyển trạng thái khớp §8 (kể cả nhánh CANCELED)
- Redis session cache + PostgreSQL sessions đồng bộ semantics Step 2.4; cart version + conflict
- Bill Order DB; Payment Service không owner bill
- Kafka: `order.confirmed` + outbox; payload đủ KDS routing
- BFF Direct: các direct events theo §7.3 và đặc tả Step 2.4 (bao gồm cart / status / transfer)
- Confirm → deduct trong Catalog; stress không oversell
- Chuyển bàn saga nhất quán từ góc nhìn UX; không yêu cầu ACID một DB duy nhất
- Customer PWA và POS dùng API thật; multi-tenant cô lập

## Outputs cho Phase tiếp theo

- Order domain ổn định trên PostgreSQL; bill sẵn sàng cho Payment / Invoice nối tiếp
- Consumer Kafka (ví dụ Inventory, Notification, analytics) có thể subscribe `order.confirmed`
- Bộ permission và guard sẵn cho phase thanh toán điện tử, split bill, và mở rộng KDS realtime
- Shared types và hooks tái sử dụng cho phase tích hợp payment gateway và hoàn thiện offline POS
