# 🚀 KẾ HOẠCH TRIỂN KHAI SONG MÃ (DUAL-TRACK IMPLEMENTATION PLAN)

## QRTable SaaS POS — Luận Văn Tốt Nghiệp

> **Nguyên tắc thực thi (GOLDEN RULE):** Trước khi thực hiện BẤT KỲ tác vụ nào (Frontend, Backend, DB, UI Design...), Agent bắt buộc phải kiểm tra xem trong `.agent/skills/` hoặc các Rule hiện có đã định nghĩa chuẩn mực/nguyên tắc cho tác vụ đó chưa. Nếu có, **BẮT BUỘC** phải tuân thủ và áp dụng các nguyên tắc đó (VD: Clean Code, Architecture, Clean UI...).
>
> **Quy trình: Mỗi Phase tuân thủ dòng chảy tuyến tính UI-First:** > `📚 Học → 🎨 Mock UI → 📝 Shared Types → ⚙️ Backend → 🔗 Tích hợp → ✅ Verify`
>
> **Mục tiêu Kiến trúc & Tư duy:**
>
> - `clean-code` — SRP, DRY, KISS, YAGNI, Guard Clauses, max 20 dòng/hàm
> - `architecture` — Trade-off analysis, ADR documentation, pattern selection
> - `api-patterns` — REST conventions, response format chuẩn hóa
> - `database-design` — Schema design, indexing, TypeORM best practices
> - `testing-patterns` — Test pyramid, AAA pattern
>
> **Nguyên tắc Frontend & UI/UX:** Áp dụng các skills từ `.agent/skills/`:
>
> - `frontend-design` — Tuân thủ các nguyên tắc thiết kế UI/UX hiện đại
> - `nextjs-react-expert` — Tối ưu hiệu năng React/Next.js, Server/Client components, SSR/CSR
> - `tailwind-patterns` — CSS-first, design tokens, utility classes chuẩn
> - **Hệ sinh thái Shadcn UI (QUAN TRỌNG):** Bám sát và tận dụng tối đa Shadcn UI cùng các thư viện vệ tinh của nó (Lucide icons, React Hook Form, Zod, Radix UI primitives, Recharts/Shadcn Charts). KHÔNG tự code lại các UI components cơ bản nếu Shadcn đã hỗ trợ.

---

## TỔNG QUAN LỘ TRÌNH

```
  PHASE        NỘI DUNG                            BÀI HỌC      ƯỚC LƯỢNG
  ─────        ────────                            ───────      ─────────
  Phase 0      Refactor Codebase gốc               ✅ 1-104      ~1 tuần
  Phase 1      Catalog + Menu + Table               105-110      ~2-3 tuần
  Phase 2      Ordering + KDS (Kafka)               115-123      ~2-3 tuần
  Phase 3      Payment (Stripe + Cash)              111-113      ~1-2 tuần
  Phase 4      Saga + SaaS + Edge Cases             124-129      ~1-2 tuần
  Phase 5      Testing Strategy                     130-135      ~1-2 tuần
  Phase 6      Observability Stack                  136-151      ~1-2 tuần
  Phase 7      Docker Deploy + Demo                 152-155      ~1 tuần
```

---

## PHASE 0 — CHUẨN BỊ NỀN TẢNG & KIẾN TRÚC (~1 tuần)

> **Mục tiêu:** Giữ nguyên codebase khóa học làm template tham khảo. Tạo các service QRTable mới bên cạnh, kế thừa patterns và cải tiến kiến trúc.

### Chiến lược "Template-First"

```
Các service khóa học (invoice, product, user-access) KHÔNG XÓA.
Chúng được giữ lại như "living templates" — bản mẫu đã hoạt động
cho TCP setup, TypeORM config, Guard patterns, Repository patterns.

Khi tạo service QRTable mới (catalog, order, payment...):
  1. Tham khảo template service tương ứng
  2. Copy pattern/structure cần thiết
  3. Cải tiến: áp dụng Pragmatic Layered Architecture + .agent skills
  4. KHÔNG sửa đổi service gốc — giữ nguyên để so sánh/học hỏi
```

### Step 0.1 — Đánh dấu & Tổ chức Codebase (ngày 1-2)

```
1. Đánh dấu services khóa học (KHÔNG xóa):
   → apps/invoice/          📚 TEMPLATE — TCP Service + MongoDB + Repository
   → apps/invoice-e2e/      📚 TEMPLATE — E2E testing pattern
   → apps/product/          📚 TEMPLATE — TCP Service + PostgreSQL + TypeORM
   → apps/user-access/      📚 TEMPLATE — TCP Service + Keycloak integration
   → Thêm README.md vào mỗi folder: "⚠️ COURSE TEMPLATE — Do not modify"

2. Tạo services QRTable MỚI (bên cạnh templates):
   → nx generate @nx/nest:app catalog    # Tham khảo product/ template
   → nx generate @nx/nest:app saas       # Tham khảo user-access/ template
   → Copy TCP config pattern từ template → cải tiến
   → Copy TypeORM provider pattern → cải tiến

3. Giữ nguyên services hạ tầng đang dùng:
   → apps/bff/              ✅ GIỮ + MỞ RỘNG (thêm controllers mới)
   → apps/authorizer/       ✅ GIỮ NGUYÊN (Keycloak gRPC đã hoàn chỉnh)

4. Verify: nx serve bff, nx serve catalog, nx serve saas — đều OK ✅
```

### Step 0.2 — Áp dụng Pragmatic Layered Architecture cho services mới (ngày 2-3)

> Áp dụng `.agent/skills/clean-code` (KISS, YAGNI) + `.agent/skills/architecture`

```
Mỗi service QRTable mới tuân thủ cấu trúc Pragmatic Layered (N-Tier) thay vì Clean Architecture cồng kềnh:

apps/catalog/src/
├── catalog.module.ts            # Root module
├── controllers/                 # Presentation Layer (TCP/Kafka Handlers)
│   └── catalog.controller.ts    # Parse requests, gọi Services
├── services/                    # Business Logic Layer
│   └── catalog.service.ts       # Xử lý logic, gọi Repositories
├── repositories/                # Data/Infrastructure Layer
│   └── catalog.repository.ts    # TypeORM calls (thừa kế Repository)
├── entities/                    # TypeORM Entities
│   └── catalog.entity.ts
└── dtos/                        # Data Transfer Objects
    └── create-catalog.dto.ts

Lợi ích của mô hình này cho Monorepo 8 services:
  - Nhanh chóng (Velocity): Copy pattern dễ dàng từ template khóa học.
  - Đủ linh hoạt: NestJS DI container đã sẵn sàng cho test/mocking.
  - Chống Boilerplate: Không cần hàng tá file interfaces/mappers như Clean Arch thuần túy.
```

### Step 0.3 — Phác thảo ERD Hệ thống Tổng thể (ngày 3)

> Phục vụ làm báo cáo Luận văn và tạo cái nhìn tổng quan ban đầu.

```
1. Vẽ sơ đồ ERD tổng thể (Draw.io / dbdiagram.io) cho 8 services.
   → Focus vào quan hệ chính: Tenant, Category, MenuItem, Table, Order, Bill, Payment.
2. Lưu ý: Bản vẽ này mang tính định hướng. Schema thực tế (TypeORM) sẽ được tinh chỉnh (Iterative) dựa theo UI Mocks ở các Phase tiếp theo.
3. Xuất file ảnh sơ đồ vào thư mục `docs/architecture/erd.png`.
```

### Step 0.4 — Khởi tạo 2 Frontend Apps (ngày 3-4)

```
1. Tạo apps/customer-pwa/:
   → npx create-vite@latest apps/customer-pwa --template react-ts
   → Config Nx project.json
   → Install: tailwindcss, shadcn-ui, lucide-react, react-query, socket.io-client
   → Verify: nx serve customer-pwa → localhost:5173 ✅

2. Tạo apps/management-app/:
   → npx create-next-app@latest apps/management-app --ts --app --tailwind --src-dir
   → Config Nx project.json
   → Install: shadcn-ui, lucide-react, react-query, zustand, react-hook-form, zod, socket.io-client
   → Verify: nx serve management-app → localhost:3000 ✅
```

### Step 0.5 — Khởi tạo Shared Libraries (ngày 4-5)

```
Frontend shared libs:
  1. libs/shared-types/  → Nx lib (TypeScript only — contract giữa FE ↔ BE)
  2. libs/shared-ui/     → Nx lib (React components — Design System)
  3. libs/shared-hooks/  → Nx lib (React hooks — data fetching, WS)
  4. libs/shared-utils/  → Nx lib (pure functions — formatters, validators)

Backend shared libs (giữ + mở rộng từ khóa học):
  5. libs/guards/         → Thêm SessionGuard, TenantGuard
  6. libs/middlewares/    → Thêm TenantMiddleware (extract tenant từ subdomain)
  7. libs/constants/      → Thêm Kafka topics, enums QRTable
  8. libs/entities/       → Thêm TypeORM entities mới (giữ entities cũ cho reference)

Viết file đầu tiên: libs/shared-types/src/index.ts
   → export type { ITenant, IUser, IRole }
```

### Step 0.6 — Setup Hạ tầng Auth (ngày 5-6)

```
1. Update docker-compose.provider.yaml — đảm bảo PG, Redis, Keycloak, Mongo ok
2. Tạo Keycloak Realm "qrtable" + Client + Roles (OWNER, MANAGER, WAITER, CHEF, BARISTA)
3. Implement SessionGuard (Customer anonymous auth — tham khảo UserGuard template)
4. Implement TenantGuard (inject tenant_id tự động)
5. Implement TenantMiddleware (extract tenant từ subdomain/header)
6. Verify: BFF → Catalog TCP health check ✅, BFF → SaaS TCP health check ✅
```

### Step 0.7 — Dựng Layout Skeleton cho 2 Frontend Apps (ngày 6-7)

> Áp dụng `.agent/skills/frontend-design` cho Design System

```
1. Management App:
   → Layout chung: Sidebar + Top Bar + Content Area
   → Design System: color tokens, typography, spacing (Tailwind config)
   → Next.js middleware.ts — role-based redirect sau login
   → Placeholder pages cho mỗi route group (/dashboard, /pos, /kds, /admin)

2. Customer PWA:
   → Layout minimal: header + content (mobile-first)
   → Shared Design tokens (import từ same Tailwind config)

3. Verify: login Keycloak → redirect đúng route theo role ✅
```

### ✅ Acceptance Criteria Phase 0

- [ ] Services khóa học (invoice, product, user-access) vẫn tồn tại, có README đánh dấu TEMPLATE
- [ ] 2 service QRTable mới (catalog, saas) khởi động được, áp dụng Pragmatic Layered Architecture
- [ ] 2 frontend apps chạy được (customer-pwa:5173, management-app:3000)
- [ ] Shared libs tạo xong (shared-types, shared-ui, shared-hooks, shared-utils)
- [ ] Keycloak realm "qrtable" + roles tạo xong
- [ ] Đã có bản vẽ ERD tổng thể (docs/architecture/erd.png)
- [ ] Management App: login → redirect đúng role route
- [ ] BFF → Catalog + SaaS TCP call thành công

---

## PHASE 1 — CATALOG + MENU + TABLE (~2-3 tuần)

> **Mục tiêu:** Khách quét QR → thấy menu → Staff quản lý menu/bàn trên Dashboard.

### Step 1.1 — 📚 Học (2-3 ngày, song song với Step 1.2)

```
Bài 105-110: Khởi tạo TCP Microservice mới, Puppeteer, Cloudinary upload
→ Áp dụng: pattern khởi tạo service (so sánh với template product/), upload ảnh menu items
Ôn lại bài 52-67: TypeORM entities, Repository pattern
→ Áp dụng: tạo entities Catalog theo Pragmatic Layered (KISS, YAGNI)
```

### Step 1.2 — 🎨 Mock UI: Dashboard Menu & Table Management (3-4 ngày)

> **Nhắc nhở Frontend & Agent:** Đọc kỹ `.agent/skills/frontend-design`, `.agent/skills/nextjs-react-expert`, `.agent/skills/tailwind-patterns`. Tái sử dụng tối đa component từ **Shadcn UI** thay vì viết CSS riêng.

```
1. /dashboard/menu — Category list + Create/Edit form:
   → Bảng categories (tên, sort order, thời gian hiển thị, trạng thái)
   → Form: tên, time_start, time_end, sort_order
   → Drag-drop reorder

2. /dashboard/menu/items — MenuItem list + Create/Edit form:
   → Grid cards: ảnh, tên, giá, stock, trạng thái
   → Form: tên, mô tả, giá, ảnh (upload), category dropdown, stock

3. /dashboard/tables — Area & Table management:
   → Area tabs → Table grid (tên, capacity, trạng thái badge)
   → Create/Edit Area form, Create/Edit Table form
   → QR Code generate + export (PDF/ảnh)

4. Shared UI Components → libs/shared-ui/:
   → <MenuItemCard />, <CategoryList />, <TableStatusBadge />
   → <QRCodeView />, <StatusBadge />, <DataTable />
```

### Step 1.3 — 🎨 Mock UI: Customer PWA Menu (2-3 ngày)

> **Nhắc nhở Frontend & Agent:** Customer PWA cũng ưu tiên hệ sinh thái Shadcn UI (các mobile sheet, drawer, button, avatar) và Tailwind MỚI cho giao diện app-like.

```
1. QR Landing Page:
   → URL parse: ?table={id}&token={hmac}
   → Loading spinner → redirect to menu page

2. Menu Page (mobile-first):
   → Category tabs/filter ở trên
   → Grid menu items: ảnh, tên, mô tả, giá
   → "Hết hàng" badge khi stock = 0
   → Tap item → detail bottom sheet (ảnh lớn, mô tả, chọn SL)

→ Dùng mock data hardcoded. Chưa gọi API.
```

### Step 1.4 — 📝 Chiết xuất Shared Types (1 ngày)

```
Từ Mock UI, chiết xuất ra libs/shared-types/catalog.types.ts:

export enum CategoryStatus { ACTIVE = 'active', INACTIVE = 'inactive' }
export enum MenuItemStatus { AVAILABLE = 'available', OUT_OF_STOCK = 'out_of_stock' }
export enum TableStatus { AVAILABLE, OCCUPIED, BILLING, CLEANING }

export interface ICategory {
  id: string; tenantId: string; name: string;
  sortOrder: number; timeStart?: string; timeEnd?: string;
  status: CategoryStatus; createdAt: Date;
}

export interface IMenuItem {
  id: string; tenantId: string; categoryId: string;
  name: string; description?: string; price: number;
  imageUrl?: string; stock: number; sortOrder: number;
  status: MenuItemStatus; createdAt: Date;
}

export interface IArea { id: string; tenantId: string; name: string; sortOrder: number; }

export interface ITable {
  id: string; tenantId: string; areaId: string;
  name: string; capacity: number; status: TableStatus;
  qrToken: string; sessionId?: string;
}

// Request/Response DTOs
export interface ICreateCategoryDto { name: string; timeStart?: string; timeEnd?: string; }
export interface ICreateMenuItemDto { categoryId: string; name: string; price: number; ... }
export interface IMenuResponse { categories: (ICategory & { items: IMenuItem[] })[] }
// ... etc.
```

### Step 1.5 — ⚙️ Build Backend: Catalog Service (5-7 ngày)

```
1. TypeORM Entities (PostgreSQL):
   → categories, menu_items, areas, tables — dùng types từ Step 1.4

2. Repository Layer:
   → CategoryRepository, MenuItemRepository, AreaRepository, TableRepository
   → Tất cả có TenantScope (auto-filter tenant_id)

3. Service Logic:
   → Category CRUD + sort ordering + time-based visibility
   → MenuItem CRUD + stock management + soft delete constraints
   → Area/Table CRUD + QR Token (HMAC-SHA256) generate/validate
   → Table State Machine logic (Available → Occupied → Billing → Cleaning)

4. TCP Message Patterns:
   → CATALOG.CATEGORY.CREATE, CATALOG.CATEGORY.FIND_ALL, ...
   → CATALOG.MENU_ITEM.CREATE, CATALOG.MENU.GET_FULL, ...
   → CATALOG.TABLE.CREATE, CATALOG.TABLE.UPDATE_STATUS, ...

5. Redis Cache:
   → menu:{tenant_id} → full menu JSON (TTL: 10 min)
   → table:{tenant_id}:{table_id}:status → status string

6. BFF REST Controllers:
   → GET  /api/v1/menu?tenant_id=xxx           (public, cached)
   → POST /api/v1/admin/categories              (Owner/Manager guard)
   → POST /api/v1/admin/menu-items              (Owner/Manager guard)
   → POST /api/v1/admin/tables                  (Owner/Manager guard)
   → POST /api/v1/tables/:id/validate-qr        (public)

7. Verify Backend chạy độc lập:
   → Postman/Thunder Client test tất cả endpoints ✅
```

### Step 1.6 — 🔗 Tích hợp FE ↔ BE (3-4 ngày)

```
1. libs/shared-hooks/: tạo React Query hooks:
   → useMenu(tenantId) — GET /menu
   → useCategories() — CRUD hooks
   → useMenuItems() — CRUD hooks
   → useTables() — CRUD hooks

2. Customer PWA → kết nối API thực:
   → Thay mock data bằng useMenu() hook
   → QR Landing: validate token via API
   → Menu page: real data + loading states + error states

3. Management App → kết nối API thực:
   → /dashboard/menu: CRUD operations gọi API
   → /dashboard/tables: CRUD + QR generate từ API
   → Optimistic update + error handling

4. Verify end-to-end:
   → Owner tạo category + item trên Dashboard → Customer PWA thấy ngay ✅
   → Cache invalidation: edit giá → customer refresh → thấy giá mới ✅
```

### ✅ Acceptance Criteria Phase 1

- [ ] Owner CRUD menu trên Dashboard → data hiện đúng
- [ ] Customer quét QR → validate → thấy menu đúng bàn, đúng tenant
- [ ] Redis cache: menu load < 100ms (cache hit)
- [ ] Table state machine chuyển trạng thái đúng
- [ ] Multi-tenant: tenant A không thấy data tenant B
- [ ] Soft delete: không xóa được MenuItem đang có đơn liên quan

---

## PHASE 2 — ORDERING + KDS (~2-3 tuần)

> **Mục tiêu:** Đặt món → Staff xác nhận → Bếp nhận đơn → Real-time tracking.

### Step 2.1 — 📚 Học Kafka (3-4 ngày, song song với Step 2.2)

```
Bài 115-123: Kafka fundamentals, NestJS Kafka Transporter,
             Kafka Consumer/Producer, Dynamic Module, Event-Driven
→ CỰC KỲ QUAN TRỌNG — không code Backend Phase 2 khi chưa xong phần này
```

### Step 2.2 — 🎨 Mock UI: Customer Ordering + Staff POS + KDS (4-5 ngày)

> **Nhắc nhở Frontend & Agent:** Đảm bảo sử dụng toàn bộ hệ sinh thái của Shadcn (Form, Radix primitives, Toast) và quản lý state hợp lý (Zustand) để UI không bị chặn khi load real-time.

```
1. Customer PWA — Cart & Ordering:
   → Nút "Thêm vào giỏ" trên MenuItemCard
   → Cart drawer: danh sách items, +/- quantity, note field, tổng tiền
   → Nút "Gửi đơn hàng" (với animation)
   → Order Tracking page: status timeline (Pending → Processing → Ready → Served)
   → Service Request buttons: "Gọi nhân viên", "Yêu cầu thanh toán", "Hỗ trợ"

2. Management App — /pos/ (Staff POS):
   → /pos/ — Live Orders list: card mỗi đơn (bàn, items, tổng, thời gian)
   → Buttons: "Xác nhận", "Từ chối" trên mỗi đơn
   → /pos/tables — Table Map: grid bàn với color-coded status
   → Real-time: đơn mới slides in (animation)

3. Management App — /kds/kitchen + /kds/bar:
   → Column-based Kanban: Chờ | Đang làm | Hoàn thành
   → Mỗi ticket: số bàn, tên món, số lượng, ghi chú, timer
   → Buttons: "Bắt đầu", "Xong", "Thu hồi (Recall)"
   → SLA timer: đổi màu khi quá threshold (vàng → đỏ)
   → Batching: gom cùng món highlight

→ Tất cả dùng mock data + fake WebSocket (setTimeout simulate events).
```

### Step 2.3 — 📝 Chiết xuất Shared Types (1 ngày)

```
libs/shared-types/order.types.ts:

export enum OrderStatus { DRAFT, PENDING, PROCESSING, READY, SERVED, COMPLETED, CANCELED }
export enum ServiceRequestType { CALL_STAFF, REQUEST_BILL, GENERAL_HELP }

export interface IOrder {
  id: string; tenantId: string; tableId: string; sessionId: string;
  status: OrderStatus; totalAmount: number; idempotencyKey: string;
  createdAt: Date; updatedAt: Date;
}
export interface IOrderItem { ... }
export interface IBill { ... subtotal, total, roundingAmount ... }
export interface ISession { tableId: string; startedAt: Date; status: string; lastActivity: Date; }
export interface ICartItem { menuItemId: string; qty: number; note?: string; price: number; version: number; }
export interface IServiceRequest { ... type: ServiceRequestType; status: ... }

// WebSocket event types
export interface IOrderCreatedEvent { orderId: string; tableId: string; items: IOrderItem[]; }
export interface IOrderStatusEvent { orderId: string; status: OrderStatus; }
export interface IKDSTicket { ticketId: string; tableId: string; items: ...; priority: boolean; }
```

### Step 2.4 — ⚙️ Build Backend: Order + Kitchen Services + Kafka (7-10 ngày)

```
1. Docker Compose: thêm Kafka + Zookeeper containers
2. libs/queue/ — Kafka producer/consumer module (từ bài 121)

3. Khởi tạo apps/order/ (tham khảo template invoice/ cho TCP + MongoDB pattern):
   → Áp dụng Pragmatic Layered (Controllers → Services → Repositories)
   → Entities: orders, order_items, bills, service_requests
   → Session Management (Redis): session:{tid}:{sid}, TTL 2h, idle 30min
   → Shared Cart (Redis): cart:{tid}:{sid}, Hash + version field
   → Order State Machine: transition validation + actor checks
   → Stock Locking: SELECT ... FOR UPDATE
   → Bill Aggregation: merge orders per session
   → Table Transfer: atomic transaction
   → Kafka Producer: order.created, order.confirmed, service.requested

4. Khởi tạo apps/kitchen/ (service thuần Kafka Consumer — pattern mới):
   → Áp dụng Pragmatic Layered Architecture
   → Kafka Consumer: order.confirmed → tạo KDS ticket
   → Redis Sorted Set: kds:{tid}:kitchen / kds:{tid}:bar (FIFO queue)
   → Ticket routing: food → kitchen, drink → bar
   → Batching logic + SLA monitoring + Priority flagging
   → Kafka Producer: kitchen.item_ready

5. BFF WebSocket Gateway:
   → Socket.io setup + Redis Adapter (scaling)
   → Rooms: tenant:{tid}:staff, session:{sid}:customer, tenant:{tid}:kds:*
   → Kafka Consumer → WebSocket bridge (broadcast events to rooms)

6. BFF REST Endpoints:
   → POST /api/v1/orders          (Customer — SessionGuard)
   → PATCH /api/v1/orders/:id/confirm  (Staff — UserGuard)
   → GET  /api/v1/kds/queue       (Chef — UserGuard)
   → POST /api/v1/service-requests (Customer)

7. Verify Backend: Postman + WebSocket tester (Postman WS) ✅
```

### Step 2.5 — 🔗 Tích hợp FE ↔ BE (3-4 ngày)

```
1. libs/shared-hooks/:
   → useCart(sessionId) — Redis cart via API
   → useSubmitOrder() — POST /orders + idempotency key
   → useOrderTracking(sessionId) — WebSocket room subscribe
   → useKDSQueue(station) — WebSocket + REST hybrid
   → useLiveOrders() — WebSocket staff room

2. Customer PWA → real API + WebSocket:
   → Cart: API calls thay mock, optimistic updates
   → Order submit: loading → success animation → redirect tracking
   → Order tracking: WebSocket events → update timeline real-time

3. Management App → real API + WebSocket:
   → /pos/: WebSocket → live order list auto-update
   → /kds/: WebSocket → tickets slide in, status updates real-time
   → Actions (confirm, done, recall) → API calls → broadcast

4. Verify end-to-end:
   → Khách đặt món → Staff thấy ngay → Confirm → KDS thấy ngay → Done → Khách thấy Ready ✅
```

### ✅ Acceptance Criteria Phase 2

- [ ] Ordering E2E: đặt → confirm → KDS → ready → served — real-time
- [ ] Stock Lock: 2 khách cùng món cuối → 1 nhận "Hết hàng"
- [ ] KDS FIFO đúng thứ tự + batching gom cùng món
- [ ] Shared cart: 2 device cùng bàn = cùng giỏ hàng
- [ ] Service request: khách nhấn → staff nhận thông báo real-time

---

## PHASE 3 — PAYMENT (~1-2 tuần)

> **Mục tiêu:** Cash + Stripe payment, VND rounding, bill finalization.

### Step 3.1 — 📚 Học Stripe (2-3 ngày, song song với Step 3.2)

```
Bài 111-113: Stripe Checkout Session, Stripe Webhook processing
→ Áp dụng trực tiếp cho Payment Service
```

### Step 3.2 — 🎨 Mock UI: Payment Screens (2-3 ngày)

```
1. Customer PWA — nút "Yêu cầu thanh toán" → confirmation dialog
2. /pos/payment — Staff POS Payment:
   → Bill summary (items, subtotal, VND rounding, total)
   → Tab: "Tiền mặt" | "Stripe"
   → Cash: Input tiền nhận → auto tính tiền thừa → Confirm button
   → Stripe: hiển thị trạng thái (pending → paid)
3. /dashboard/orders — Bill history + Refund button
```

### Step 3.3 — 📝 Shared Types + Step 3.4 — ⚙️ Backend (5-7 ngày)

```
Types: libs/shared-types/payment.types.ts
  → IPayment, IPaymentMethod (enum), IRefund, IBillFinal

Backend — Khởi tạo apps/payment/ (tham khảo template invoice/ cho Stripe pattern):
  → Áp dụng Pragmatic Layered (Controllers → Services → Repositories)
  → Entities: payments (rounded_amount, rounding_delta), refunds, audit_payments
  → Stripe: Checkout Session (currency: VND) + Webhook verify
  → Cash Flow: staff confirm → Kafka payment.completed
  → VND Rounding: Math.ceil(amount / 1000) * 1000
  → Refund Flow: Stripe refund API + cash record
  → Bill Finalization: immutable after Paid
  → BFF: POST /payment/checkout, POST /payment/cash-confirm, POST /payment/stripe/webhook
```

### Step 3.5 — 🔗 Tích hợp + Verify (2-3 ngày)

```
→ Customer nhấn "Thanh toán" → table Billing → Staff thấy trên POS
→ Cash: confirm → bill lock → table Cleaning ✅
→ Stripe: redirect → pay → webhook → auto-confirm ✅
→ Refund: Owner → Dashboard → refund → audit log ✅
```

### ✅ Acceptance Criteria Phase 3

- [ ] Cash + Stripe E2E hoạt động
- [ ] VND rounding đúng (127.500đ → 128.000đ)
- [ ] Bill immutable sau Paid
- [ ] Refund flow hoạt động (cả Stripe và Cash)

---

## PHASE 4 — SAGA + SaaS + EDGE CASES (~1-2 tuần)

### Step 4.1 — 📚 Học Saga (3-4 ngày)

```
Bài 124-129: Distributed transactions, Saga Orchestration, Compensation Flow
```

### Step 4.2 — ⚙️ Build (song song — không cần Mock UI mới)

```
1. Saga: Order Confirm Orchestration
   → Stock Lock → Create Order → Notify KDS → if fail → compensation rollback

2. Saga: Payment Complete Orchestration
   → Close Session → Update Table → Archive Bill → if fail → revert

3. SaaS Service hoàn thiện (apps/saas/):
   → Tenant CRUD, Subscription lifecycle, Feature gating middleware
   → max_tables, max_staff theo plan

4. Notification Service — Khởi tạo apps/notification/ (tham khảo template invoice/ cho Kafka consumer + email pattern):
   → Kafka consumer → Nodemailer email (welcome, receipt)

5. Hardening:
   → max_orders_per_session = 20, idempotency SET NX, delete constraints
```

### Step 4.3 — 🎨 UI: SaaS Admin Pages + 🔗 Tích hợp (3-4 ngày)

```
1. /dashboard/subscription — plan selection, usage display
2. /admin/tenants — tenant directory (search, suspend, activate)
3. /admin/plans — pricing plan CRUD
4. Tích hợp API + verify feature gating E2E
```

### ✅ Acceptance Criteria Phase 4

- [ ] Saga compensation: stock lock fail → order không tạo
- [ ] Feature gating: Lite plan → max 10 bàn → bàn 11 bị chặn
- [ ] Idempotency: double-submit → 1 order
- [ ] Welcome email khi tenant.created

---

## PHASE 5 — TESTING STRATEGY (~1-2 tuần)

### Step 5.1 — 📚 Học + ⚙️ Viết Test (xen kẽ)

```
Bài 130-135: Testing strategy, Jest, Testcontainers, E2E

1. Unit Tests (Jest + mocks):
   → Order State Machine transitions
   → VND rounding logic
   → HMAC-SHA256 QR token validation
   → Table State Machine

2. Integration Tests (Jest + Testcontainers):
   → Catalog CRUD + multi-tenant isolation (PostgreSQL container)
   → Order creation + stock locking

3. E2E Tests (Supertest):
   → Flow 1: QR scan → menu → order → confirm
   → Flow 2: Payment cash → close session
   → Flow 3: Tenant onboarding

4. Verify: nx run-many --target=test --all → PASS ✅
```

### ✅ Acceptance Criteria Phase 5

- [ ] Unit test coverage > 60% (Order + Payment services)
- [ ] Integration test cho multi-tenant isolation
- [ ] 3 E2E flows pass

---

## PHASE 6 — OBSERVABILITY STACK (~1-2 tuần)

### Step 6.1 — 📚 Học + ⚙️ Setup (xen kẽ, theo đúng thứ tự bài giảng)

```
Bài 136-138: Health Check → implement cho tất cả 8 services
Bài 139-144: PLG Stack → Docker Compose Promtail + Loki + Grafana → Pino logger → push logs
Bài 145-146: Prometheus → custom metrics → Grafana dashboard
Bài 147-151: Tempo + OTel → auto-instrumentation → context propagation TCP/Kafka
```

### Step 6.2 — 🎨 Grafana Dashboards (2-3 ngày)

```
1. System Overview: container status, CPU, memory
2. Business Metrics: orders/min, revenue, KDS avg wait time
3. Per-Service: request rate, error rate, P95 latency
4. Alerting: service down, error > 5%, KDS SLA breach
```

### ✅ Acceptance Criteria Phase 6

- [ ] Grafana `localhost:3001` hoạt động
- [ ] Loki: `{app="order"}` ra logs
- [ ] Tempo: trace 1 order xuyên BFF → Order → Kitchen
- [ ] Prometheus metrics hiển thị real-time
- [ ] Alert firing khi tắt 1 service

---

## PHASE 7 — DOCKER DEPLOY + DEMO (~1 tuần)

### Step 7.1 — 📚 Bài 152-155 + ⚙️ Dockerfile per service

```
1. Multi-stage Dockerfile cho mỗi service (builder → runner)
2. docker-compose.app.yaml: 8 backend + 2 frontend
3. docker-compose.infra.yaml: PG, Redis, Mongo, Keycloak, Kafka
4. docker-compose.monitoring.yaml: Grafana, Loki, Promtail, Prometheus, Tempo
5. Seed data: 1 tenant demo, 5 categories, 20 items, 8 tables (Nx task)
```

### Step 7.2 — 🎬 Chuẩn bị Demo (2-3 ngày)

```
1. Viết demo script (kịch bản 15-20 phút bảo vệ luận văn)
2. Chạy thử full stack: docker compose up → E2E scenario
3. Highlights demo:
   → QR scan → menu → đặt món (Tab 1: Customer)
   → Staff confirm → KDS (Tab 2: Management App)
   → Payment → bill close (Tab 2)
   → Grafana trace (Tab 3: Monitoring)
4. Backup plan: seed data script chạy nhanh nếu cần reset
```

### ✅ Acceptance Criteria Phase 7

- [ ] `docker compose up` → TOÀN BỘ hệ thống hoạt động
- [ ] Demo scenario chạy mượt end-to-end
- [ ] Grafana trace hiển thị full request path
- [ ] Seed data sẵn sàng cho demo day

---

## MAPPING TỔNG: KHÓA HỌC → PHASE

|   Bài   | Nội dung                                    |    Phase    |
| :-----: | ------------------------------------------- | :---------: |
|  1-104  | Foundation (Nx, TCP, gRPC, Keycloak, Redis) |   ✅ Done   |
| 105-110 | TCP Service mới + Cloudinary upload         | **Phase 1** |
| 111-113 | Stripe Checkout + Webhook                   | **Phase 3** |
| 115-123 | Kafka + Event-Driven                        | **Phase 2** |
| 124-129 | Saga Pattern + Compensation                 | **Phase 4** |
| 130-135 | Testing (Unit + Integration + E2E)          | **Phase 5** |
| 136-151 | Observability (PLG + Prometheus + Tempo)    | **Phase 6** |
| 152-155 | Docker Deploy                               | **Phase 7** |

> [!TIP] > **4 highlight demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing).
