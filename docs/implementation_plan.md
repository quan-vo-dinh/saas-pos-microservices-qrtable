# 🚀 KẾ HOẠCH TRIỂN KHAI SONG MÃ (DUAL-TRACK IMPLEMENTATION PLAN)

## QRTable SaaS POS — Luận Văn Tốt Nghiệp

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
  Pre-Ph.2     Permission & Seed Extension          —            ~0.5-1 ngày
  Phase 2A     Order Service + Kafka                115-123      ~1.5-2 tuần
  Phase 2B     Kitchen/KDS + WebSocket Gateway      115-123      ~1-1.5 tuần
  Phase 3      Payment (Stripe + Cash)              111-113      ~1-2 tuần
  Phase 4A     Saga + Hardening                     124-129      ~1 tuần
  Phase 4B     SaaS + Tenant Onboarding             124-129      ~1 tuần
  Phase 4C     Notification + Staff Management      —            ~1 tuần
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

> Áp dụng quy tắc phân chia thư mục (Group by Platform) của Nx Monorepo để tránh conflict và rõ ràng responsibility.

```
1. Cross-Platform Shared Libs (Dùng chung FE & BE):
   → libs/shared/types/     (TypeScript interfaces — contract giữa FE ↔ BE)
   → libs/shared/constants/ (Kafka topics, Enums chung)

2. Frontend Shared Libs (Dùng riêng cho App Customer & Management):
   → libs/frontend/ui/      (React components — Design System)
   → libs/frontend/hooks/   (React hooks — data fetching, WS)
   → libs/frontend/utils/   (Pure functions — formatters)

3. Backend Shared Libs (Giữ nguyên cấu trúc phẳng từ khóa học - Không nhét vào folder backend/ để tránh vỡ source lỗi):
   → libs/guards/         (SessionGuard, TenantGuard)
   → libs/middlewares/    (TenantMiddleware)
   → libs/entities/       (TypeORM entities)
   → libs/common/         (Decorators, utilities server-side)

Viết file đầu tiên: libs/shared/types/src/index.ts
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

### Step 0.6A — Auth Completion (Provisioning + Role Mapping)

```
1. Chốt mô hình auth 2 lớp:
   → Keycloak: identity + JWT claims
   → user-access DB: user profile nội bộ + app permissions
2. Chốt strategy provisioning user:
   → pre-provision qua API create user hoặc first-login upsert (dev-friendly)
3. Mapping role Keycloak → role/permission nội bộ:
   → OWNER, MANAGER, WAITER, CHEF, BARISTA
4. Seed role + test users có liên kết đúng userId (sub)
5. Verify:
   → valid token + provisioned user => pass secured endpoints
   → valid token + missing profile => 401 user_not_provisioned
   → sai permission => 403 permission_denied
6. Tham chiếu tài liệu quyết định chi tiết:
   → docs/step-0-6-auth-completion-decision.md
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
- [ ] Shared libs tạo xong theo chuẩn Nx Grouping (shared/types, frontend/ui, frontend/hooks...)
- [ ] Keycloak realm "qrtable" + roles tạo xong
- [ ] Internal actor có token hợp lệ và đã provisioned gọi được secured API
- [ ] Internal actor có token hợp lệ nhưng thiếu profile nội bộ trả 401 rõ nghĩa
- [ ] Role mapping OWNER/MANAGER/WAITER/CHEF/BARISTA pass smoke authorization
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

4. Shared UI Components → libs/frontend/ui/:
   → <MenuItemCard />, <CategoryList />, <TableStatusBadge />
   → <QRCodeView />, <StatusBadge />, <DataTable />
```

### Step 1.25 — 🔐 Tích hợp Auth Frontend & Custom Keycloak UI (2-3 ngày)

> **Mục tiêu:** Xây dựng hệ thống bảo vệ Route (Navigation Guard) cho Management App và đồng bộ giao diện đăng nhập Keycloak với Design System của QRTable.

```
1. Thiết lập Auth Context / Session Provider cho Next.js (Management App):
   → Sử dụng NextAuth.js hoặc Keycloak JS Adapter để quản lý JWT Token trên Frontend.
   → Cấu hình Next.js Middleware chặn các Route /dashboard, /pos, /kds nếu chưa đăng nhập.
   → Tạo logic tự động Redirect về Keycloak Login Page nếu Token hết hạn (401).
   → Cấu hình Zustand store để lưu trữ thông tin UserProfile & Role, phục vụ việc ẩn/hiện các UI control.

2. Custom UI Theme cho Keycloak với Keycloakify:
   → Khởi tạo project Keycloakify dùng React + Tailwind CSS + Shadcn UI.
   → Xây dựng UI Login/Register/Forgot Password theo design system của QRTable (Logo, Typography, Brand Colors).
   → Build dự án thành file .jar và deploy vào thư mục `themes/` của config Docker Keycloak hiện tại.

3. Verify:
   → Vào thử `/dashboard` lúc chưa có token → văng ra trang Login Keycloak giao diện mới.
   → Đăng nhập tài khoản STAFF → chuyển về `/pos` (có truyền bearer token trên header).
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
Từ Mock UI, chiết xuất ra libs/shared/types/catalog.types.ts:

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

### Step 1.45 — ☁️ Setup File Upload Module (Cloudinary) (1-2 ngày)

> Tham khảo khóa học bài 105-110 về Cloudinary upload pattern.

```
1. Cài đặt dependencies:
   → npm install cloudinary multer @nestjs/platform-express
   → Thêm env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
   → Thêm env vars vào docker-compose.yml

2. Tạo CloudinaryModule dùng chung (libs/providers/):
   → CloudinaryProvider: config từ env
   → CloudinaryService:
     + uploadImage(file, tenantId, folder): Promise<{ url, publicId }>
       - Validate: max 5MB, image types only (jpeg, png, webp)
       - Path: uploads/{tenant_id}/{folder}/{uuid}.{ext}
       - Transformation: auto format, quality auto, max width 800px
     + deleteImage(publicId): Promise<void>
     + getOptimizedUrl(publicId, options): string
       - Auto-generate responsive URLs (thumbnail 200px, medium 400px, large 800px)

3. Tenant-isolated storage structure:
   → Folder structure trong Cloudinary:
     qrtable/
       └── {tenant_id}/
           ├── menu/         # Ảnh món ăn (Phase 1)
           ├── branding/     # Logo, banner (Phase 4B)
           └── qr-exports/   # QR PDF exports (nice-to-have)

4. Verify:
   → Upload 1 ảnh test qua module → URL trả về đúng ✅
   → Ảnh được lưu đúng folder tenant ✅
   → Transformation: thumbnail 200px, medium 400px hoạt động ✅
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
   → MenuItem Image Upload:
     + Tích hợp CloudinaryModule vào CatalogModule
     + Khi create/update MenuItem: nếu có file → upload Cloudinary → lưu image_url
     + Khi update ảnh: upload ảnh mới → xóa ảnh cũ → cập nhật image_url
     + Khi soft delete MenuItem: KHÔNG xóa ảnh (giữ cho audit trail)
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
   → POST /api/v1/admin/menu-items/:id/image    (Owner/Manager guard — multipart/form-data)
     + Multer middleware: single file, max 5MB, image types only
     + Upload → Cloudinary → update menu_item.image_url
   → DELETE /api/v1/admin/menu-items/:id/image  (Owner/Manager guard)
   → POST /api/v1/admin/tables                  (Owner/Manager guard)
   → POST /api/v1/tables/:id/validate-qr        (public)

   [BFF Config Note]:
   → Body parser limit: 20MB (đã có trong architecture doc)
   → Multer config: memory storage (stream to Cloudinary, không lưu disk)

7. Side-effects Pattern (Phase 1):
   → Chưa có Kafka ở Phase 1 (setup ở Phase 2A).
   → Cache invalidation: BFF gọi Redis DEL trực tiếp sau TCP response.
   → WebSocket: chưa triển khai ở Phase 1 (Phase 2B).
   → KHÔNG dùng Kafka cho menu.updated, table.status_changed (AP1).

8. Verify Backend chạy độc lập:
   → Postman/Thunder Client test tất cả endpoints ✅
```

### Step 1.6 — 🔗 Tích hợp FE ↔ BE (3-4 ngày)

```
1. libs/frontend/hooks/: tạo React Query hooks:
   → useMenu(tenantId) — GET /menu
   → useCategories() — CRUD hooks
   → useMenuItems() — CRUD hooks
   → useUploadMenuItemImage(itemId) — POST multipart/form-data
     + Progress tracking (upload progress bar)
     + Optimistic update: show local preview trước khi upload xong
     + Error handling: file too large, wrong format
   → useTables() — CRUD hooks

2. Customer PWA → kết nối API thực:
   → Thay mock data bằng useMenu() hook
   → QR Landing: validate token via API
   → Menu page: real data + loading states + error states

3. Management App → kết nối API thực:
   → /dashboard/menu: CRUD operations gọi API
   → /dashboard/menu/items: Image upload UI:
     + Drag-drop hoặc click-to-select image
     + Preview image trước khi submit
     + Upload progress indicator
     + Crop/resize (nice-to-have, Cloudinary xử lý server-side)
   → /dashboard/tables: CRUD + QR generate từ API
   → Optimistic update + error handling

4. Verify end-to-end:
   → Owner tạo category + item trên Dashboard → Customer PWA thấy ngay ✅
   → Owner upload ảnh menu item → ảnh hiển thị trên Dashboard + Customer PWA ✅
   → Cache invalidation: edit giá → customer refresh → thấy giá mới ✅
```

### ✅ Acceptance Criteria Phase 1

- [ ] Owner CRUD menu trên Dashboard → data hiện đúng
- [ ] Owner upload ảnh menu item → ảnh hiển thị trên Dashboard + Customer PWA
- [ ] Image upload: validate file type/size → reject nếu không hợp lệ
- [ ] Cloudinary storage: ảnh lưu đúng path uploads/{tenant_id}/menu/
- [ ] Customer quét QR → validate → thấy menu đúng bàn, đúng tenant
- [ ] Redis cache: menu load < 100ms (cache hit)
- [ ] Table state machine chuyển trạng thái đúng
- [ ] Multi-tenant: tenant A không thấy data tenant B
- [ ] Soft delete: không xóa được MenuItem đang có đơn liên quan

---

## PRE-PHASE 2 — PERMISSION & SEED EXTENSION (~0.5-1 ngày)

> **Mục tiêu:** Mở rộng hệ thống Permission để sẵn sàng cho Phase 2-3-4. Đây là **blocking prerequisite** — không code Phase 2 khi chưa hoàn thành.
>
> **Tham chiếu:** Review finding 3.2 — Permission Enum hiện tại chỉ có SAAS*\*, CATALOG*\_, INVOICE\__, USER*\*, ROLE*_, PRODUCT\_\_. Thiếu hoàn toàn các domain mới.

### Step 2.0 — Mở rộng PERMISSION Enum & Role Seed Data

```
1. Mở rộng PERMISSION enum trong libs/constants/src/lib/enum/role.enum.ts:

   // Order domain
   → ORDER_CREATE, ORDER_CONFIRM, ORDER_CANCEL, ORDER_GET_LIST, ORDER_GET_BY_ID

   // Kitchen domain
   → KITCHEN_GET_QUEUE, KITCHEN_UPDATE_TICKET, KITCHEN_RECALL

   // Payment domain
   → PAYMENT_CREATE, PAYMENT_CONFIRM_CASH, PAYMENT_REFUND, PAYMENT_GET_HISTORY

   // Table management domain
   → TABLE_CREATE, TABLE_UPDATE, TABLE_DELETE, TABLE_TRANSFER, TABLE_UPDATE_STATUS

   // Service request domain
   → SERVICE_REQUEST_CREATE, SERVICE_REQUEST_ACKNOWLEDGE, SERVICE_REQUEST_RESOLVE

2. Cập nhật Role → Permission mapping (role seed data):
   → OWNER: tất cả permissions
   → MANAGER: tất cả trừ SAAS_* (quản lý platform)
   → WAITER: ORDER_CONFIRM, ORDER_GET_*, PAYMENT_CONFIRM_CASH,
             TABLE_TRANSFER, TABLE_UPDATE_STATUS, SERVICE_REQUEST_*,
             CATALOG_GET_*
   → CHEF: KITCHEN_*, CATALOG_GET_*
   → BARISTA: KITCHEN_*, CATALOG_GET_*
   → CUSTOMER: không cần Permission (controlled tại controller level bằng SessionGuard)

3. Re-seed MongoDB roles → verify auth flow vẫn hoạt động:
   → pnpm auth:bootstrap:all (hoặc seed script tương ứng)
   → Test: User có role WAITER → gọi được ORDER_CONFIRM endpoint
   → Test: User có role CHEF → KHÔNG gọi được PAYMENT_* endpoint

4. Document Permission Matrix mới (markdown table) → lưu vào docs/architecture/permission-matrix.md
```

### ✅ Acceptance Criteria Pre-Phase 2

- [ ] PERMISSION enum có đầy đủ 5 domain mới (Order, Kitchen, Payment, Table, ServiceRequest)
- [ ] Role seed data cập nhật đúng mapping cho 5 roles
- [ ] Re-seed thành công, auth flow không bị break
- [ ] Permission Matrix document tồn tại trong docs/architecture/

---

## PHASE 2A — ORDER SERVICE + KAFKA (~1.5-2 tuần)

> **Mục tiêu:** Đặt món → Staff xác nhận → Order state machine + Stock locking + Session/Cart management.
>
> **Lý do tách:** Phase 2 gốc gộp Order + Kitchen + Kafka + WebSocket vào 7-10 ngày cho 1 người là không khả thi. Tách thành 2A (Order core) và 2B (Kitchen + WebSocket) giảm risk và cho phép verify từng phần.

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
libs/shared/types/order.types.ts:

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

### Step 2.4 — ⚙️ Build Backend: Order Service + Kafka Setup (5-7 ngày)

```
1. Docker Compose: thêm Kafka + Zookeeper containers
2. libs/queue/ — Kafka producer/consumer module (từ bài 121)

3. Khởi tạo apps/order/ (tham khảo template invoice/ cho TCP + MongoDB pattern):
   → Áp dụng Pragmatic Layered (Controllers → Services → Repositories)
   → Entities: orders, order_items, bills, service_requests
   → Session Management (Redis): session:{tid}:{sid}, TTL 2h, idle 30min
   → Shared Cart (Redis): cart:{tid}:{sid}, Hash + version field
     + Cart version check (optimistic locking)
     + Broadcast cart changes tới các device khác cùng session
   → Order State Machine: transition validation + actor checks
   → Stock Locking: SELECT ... FOR UPDATE (pessimistic locking)
   → Bill Aggregation: merge orders per session
   → Table Transfer: atomic transaction
   → Service Request entity: service_requests (id, tenant_id, table_id, session_id, type, status, created_at)
     + Types: CALL_STAFF | REQUEST_BILL | GENERAL_HELP
   → Kafka Producer: order.confirmed (P1+P2: route to Kitchen)
   → BFF Direct (AP1): order.created, service.requested → WS emit sau TCP response

4. BFF REST Endpoints (Order):
   → POST /api/v1/orders               (Customer — SessionGuard)
   → PATCH /api/v1/orders/:id/confirm   (Staff — UserGuard + ORDER_CONFIRM permission)
   → PATCH /api/v1/orders/:id/cancel    (Customer: Pending only, Manager: Processing)
   → GET  /api/v1/orders                (Staff — ORDER_GET_LIST permission)
   → GET  /api/v1/orders/:id            (Staff/Customer — ORDER_GET_BY_ID permission)
   → POST /api/v1/cart                  (Customer — SessionGuard)
   → GET  /api/v1/cart                  (Customer — SessionGuard)
   → POST /api/v1/service-requests      (Customer — SessionGuard)
   → PATCH /api/v1/service-requests/:id/acknowledge (Staff — SERVICE_REQUEST_ACKNOWLEDGE)

5. Verify Backend: Postman test tất cả Order endpoints ✅
```

### Step 2.5 — 🔗 Tích hợp FE ↔ BE: Order + Cart (2-3 ngày)

```
1. libs/frontend/hooks/:
   → useCart(sessionId) — Redis cart via API
   → useSubmitOrder() — POST /orders + idempotency key

2. Customer PWA → real API:
   → Cart: API calls thay mock, optimistic updates
   → Order submit: loading → success animation → redirect tracking page
   → Service Request buttons: gọi API thực

3. Management App → real API:
   → /pos/: live order list (polling initially, WebSocket in Phase 2B)
   → Actions: confirm/cancel → API calls

4. Verify:
   → Khách thêm giỏ hàng → submit đơn → Staff thấy đơn mới trên POS ✅
   → Stock lock: 2 khách cùng món cuối → 1 nhận "Hết hàng" ✅
```

### ✅ Acceptance Criteria Phase 2A

- [ ] Order CRUD E2E: tạo → confirm → cancel hoạt động đúng
- [ ] Stock Lock: 2 khách cùng món cuối → 1 nhận "Hết hàng"
- [ ] Shared cart: 2 device cùng bàn = cùng giỏ hàng (version-based)
- [ ] Bill Aggregation: nhiều orders → 1 bill per session
- [ ] Service request: khách nhấn → staff thấy trên POS
- [ ] Kafka producer: order events emit thành công
- [ ] Permission check: WAITER gọi được ORDER_CONFIRM, CHEF không gọi được

---

## PHASE 2B — KITCHEN SERVICE + WEBSOCKET GATEWAY (~1-1.5 tuần)

> **Mục tiêu:** KDS real-time, WebSocket Gateway, Kafka consumer bridge → real-time tracking cho tất cả actors.

### Step 2.6 — ⚙️ Build Backend: Kitchen Service + WebSocket (5-7 ngày)

```
1. Khởi tạo apps/kitchen/ (service thuần Kafka Consumer — pattern mới):
   → Áp dụng Pragmatic Layered Architecture
   → KHÔNG cần PostgreSQL riêng — dùng Redis only cho KDS queue
   → Kafka Consumer: order.confirmed → tạo KDS ticket
   → Redis Sorted Set: kds:{tid}:kitchen / kds:{tid}:bar (FIFO queue)
   → Ticket routing: food items → kitchen queue, drink items → bar queue
   → Batching logic: gom cùng món từ các order khác nhau
   → SLA monitoring: timer per ticket, warning khi quá threshold
   → Priority flagging: Manager/Owner có thể đánh dấu ticket ưu tiên
   → Kafka Producer: kitchen.sla_warning (P2: sinh bởi internal timer)
   → BFF Direct (AP1): kitchen.item_ready → WS emit sau TCP response

2. BFF WebSocket Gateway:
   → Socket.io setup + Redis Adapter (horizontal scaling ready)
   → Connection authentication:
     + Staff: JWT handshake (extract from Authorization header)
     + Customer: Session cookie (x-session-id)
   → Room assignment on connect:
     + WAITER  → tenant:{tid}:staff
     + CHEF    → tenant:{tid}:kds:kitchen
     + BARISTA → tenant:{tid}:kds:bar
     + OWNER/MANAGER → tenant:{tid}:management
     + CUSTOMER → session:{sid}:customer
   → Kafka Consumer bridge: mỗi topic → map tới room(s) tương ứng
   → Reconnection handling + room re-join after disconnect

3. BFF REST Endpoints (Kitchen):
   → GET  /api/v1/kds/queue          (Chef/Barista — KITCHEN_GET_QUEUE)
   → PATCH /api/v1/kds/:id/start     (Chef/Barista — KITCHEN_UPDATE_TICKET)
   → PATCH /api/v1/kds/:id/done      (Chef/Barista — KITCHEN_UPDATE_TICKET)
   → PATCH /api/v1/kds/:id/recall    (Chef/Barista — KITCHEN_RECALL)
   → PATCH /api/v1/kds/:id/priority  (Owner/Manager only)

4. WebSocket broadcast mapping (xem §7.3 + §7.4 trong technical-architecture.md):

   Kafka Consumer Bridge (3 topics — P1/P2/P3):
   → order.confirmed    → tenant:{tid}:kds:kitchen / kds:bar (new KDS ticket)
   → kitchen.sla_warning → tenant:{tid}:management (SLA alert)
   → payment.completed  → session:{sid}:customer (payment done notification)

   BFF Direct Side-Effects (AP1 — sau TCP response):
   → order.created      → tenant:{tid}:staff (new order notification)
   → kitchen.item_ready → tenant:{tid}:staff + session:{sid}:customer
   → menu.updated       → tenant:{tid}:* (menu sync + cache DEL)
   → table.status_changed → tenant:{tid}:staff
   → service.requested  → tenant:{tid}:staff (service bell)

5. Verify: Postman + Socket.io Admin UI + WebSocket tester ✅
```

### Step 2.7 — 🔗 Tích hợp FE ↔ BE: Real-time (2-3 ngày)

```
1. libs/frontend/hooks/ bổ sung:
   → useOrderTracking(sessionId) — WebSocket room subscribe
   → useKDSQueue(station) — WebSocket + REST hybrid
   → useLiveOrders() — WebSocket staff room

2. Customer PWA → WebSocket integration:
   → Order tracking: WebSocket events → update timeline real-time
   → Menu auto-refresh khi nhận menu.updated event

3. Management App → WebSocket integration:
   → /pos/: WebSocket → live order list auto-update (đơn mới slides in)
   → /kds/kitchen + /kds/bar: WebSocket → tickets slide in, status updates real-time
   → Actions (start, done, recall) → API calls → broadcast tới rooms

4. Verify end-to-end:
   → Khách đặt món → Staff thấy ngay → Confirm → KDS thấy ngay → Done → Khách thấy Ready ✅
```

### ✅ Acceptance Criteria Phase 2B

- [ ] KDS FIFO đúng thứ tự + batching gom cùng món
- [ ] KDS routing: food → kitchen queue, drink → bar queue
- [ ] Real-time: order event → WebSocket broadcast < 2 giây
- [ ] Ordering E2E full flow: đặt → confirm → KDS → ready → served — real-time
- [ ] WebSocket rooms: mỗi role chỉ nhận events phù hợp
- [ ] SLA timer: ticket quá threshold → đổi màu warning
- [ ] Reconnection: mất kết nối → auto re-join room → nhận lại pending events

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
Types: libs/shared/types/payment.types.ts
  → IPayment, IPaymentMethod (enum), IRefund, IBillFinal

Backend — Khởi tạo apps/payment/ (tham khảo template invoice/ cho Stripe pattern):
  → Áp dụng Pragmatic Layered (Controllers → Services → Repositories)
  → Entities: payments (rounded_amount, rounding_delta), refunds, audit_payments
  → Stripe: Checkout Session (currency: VND) + Webhook verify
  → Cash Flow: staff confirm → Kafka payment.completed
  → VND Rounding: Math.ceil(amount / 1000) * 1000
  → Refund Flow: Stripe refund API + cash record
  → Emit Kafka: payment.refunded (P1+P3) → Order Svc (adjust revenue), Notification (email)
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

## PHASE 4A — SAGA + HARDENING (~1 tuần)

> **Mục tiêu:** Đảm bảo data consistency qua distributed transactions + hardening edge cases.
>
> **Lý do tách Phase 4:** Phase gốc gộp Saga + SaaS + Notification + Staff Management vào 1-2 tuần là quá tải. Tách thành 4A/4B/4C cho phép focus từng mảng.

### Step 4.1 — 📚 Học Saga (3-4 ngày)

```
Bài 124-129: Distributed transactions, Saga Orchestration, Compensation Flow
```

### Step 4.2 — ⚙️ Saga + Hardening Implementation (4-5 ngày)

```
1. Saga: Order Confirm Orchestration
   → Stock Lock → Create Order → Notify KDS → if fail → compensation rollback
   → Compensation: rollback stock, mark order failed, notify customer

2. Saga: Payment Complete Orchestration
   → Validate billing constraint: check all order items status === 'Ready' || 'Served'
   → Close Session → Update Table Status → Archive Bill → if fail → revert
   → Compensation: reopen session, revert table status

3. Hardening:
   → max_orders_per_session = 20 (configurable per tenant plan)
   → Idempotency: SET NX cho order creation (prevent double-submit)
   → Delete constraints: không xóa được Category có MenuItem, MenuItem có OrderItem active
   → Audit log: bắt buộc ghi log khi Cancel order (actor, reason, timestamp)
   → [SIMPLIFIED] Transactional Outbox (P4):
     + Thêm outbox_events table vào Order Service + Payment Service
     + Ghi event cùng DB transaction khi state change
     + Background cron poll outbox → publish Kafka → mark sent
     + Document: full CDC (Debezium) là post-thesis improvement

4. Verify Saga:
   → Happy path: order confirm → stock locked → KDS notified ✅
   → Compensation: stock lock fail → order rolled back → customer notified ✅
   → Idempotency: double-submit cùng idempotency key → 1 order only ✅
```

### ✅ Acceptance Criteria Phase 4A

- [ ] Saga compensation: stock lock fail → order không tạo, stock rollback
- [ ] Billing validation: chặn thanh toán khi còn món chưa Ready
- [ ] Idempotency: double-submit → 1 order
- [ ] Delete constraints: xóa category có items → bị chặn
- [ ] Audit log ghi nhận mọi cancel action

---

## PHASE 4B — SaaS + TENANT ONBOARDING (~1 tuần)

> **Mục tiêu:** Hoàn thiện SaaS platform: tenant lifecycle, subscription, feature gating, và tenant onboarding flow.
>
> **Tham chiếu:** Review finding 3.3 — Thiếu luồng Tenant Onboarding.

### Step 4.3 — ⚙️ SaaS Service + Tenant Onboarding (4-5 ngày)

```
1. SaaS Service hoàn thiện (apps/saas/):
   → Tenant CRUD (đã có basic) + bổ sung:
     + Slug/Subdomain generation: auto-generate từ tên nhà hàng
     + Slug validation: unique check, reserved words filter
     + Tenant status lifecycle: Active → Suspended → Closed
   → Kafka Producer:
     + tenant.created (P1+P3) → Notification (welcome email) + Catalog (seed default data)
   → tenant.suspended: Redis flag (AP1 — không dùng Kafka)
   → Subscription lifecycle:
     + Plan CRUD (Free, Basic, Premium)
     + Assign plan to tenant + start/end date tracking
     + Auto-suspend cron job: tenant hết hạn subscription → status = Suspended
   → Feature Gating middleware:
     + TenantPlanGuard: kiểm tra tenant plan → max_tables, max_staff, max_orders_per_day
     + Response 402 (Payment Required) khi exceed plan limit
     + Frontend: hiển thị upgrade prompt khi bị chặn

2. Tenant Onboarding Flow (MVP — Admin-assisted):
   → Backend: POST /api/v1/saas/tenants/onboard (SUPER_ADMIN hoặc self-service)
     + Tạo tenant record + generate slug
     + Auto-provision: tạo Keycloak user cho Owner + assign OWNER role

     + Seed default data: 1 default area "Khu vực chung", currency VND
     + Assign Free plan mặc định
   → Verify: Sau onboard → Owner login → Dashboard trống nhưng hoạt động ✅

3. [NICE-TO-HAVE] Self-service Registration Wizard UI:
   → /register/restaurant — Multi-step form:
     Step 1: Thông tin nhà hàng (tên, loại, địa chỉ)
     Step 2: Thông tin Owner (email, password)
     Step 3: Chọn gói dịch vụ
     Step 4: Xác nhận & Tạo
   → Gọi POST /api/v1/saas/tenants/onboard
   → Redirect → Login → Dashboard

   LƯU Ý: Nếu thiếu thời gian, skip wizard UI. Dùng API + Postman demo đủ cho luận văn.
```

### Step 4.4 — 🎨 UI: SaaS Admin Pages + 🔗 Tích hợp (3-4 ngày)

```
1. /dashboard/subscription — Plan selection, usage display (bàn đã dùng/max, staff count)
2. /admin/tenants — Tenant directory (search, suspend, activate) — SUPER_ADMIN only
3. /admin/plans — Pricing plan CRUD — SUPER_ADMIN only
4. Tích hợp API + verify feature gating E2E
```

### ✅ Acceptance Criteria Phase 4B

- [ ] Feature gating: Free plan → max 10 bàn → bàn 11 bị chặn (402)
- [ ] Tenant onboarding API: tạo tenant → Owner login thành công
- [ ] Slug generation: "Phở Hà Nội" → "pho-ha-noi" (unique)
- [ ] Subscription lifecycle: assign plan → track usage → auto-suspend khi hết hạn
- [ ] Admin UI: SUPER_ADMIN quản lý tenants + plans

---

## PHASE 4C — NOTIFICATION + STAFF MANAGEMENT (~1 tuần)

> **Mục tiêu:** Email notifications + Staff management cho Owner/Manager.
>
> **Tham chiếu:** Review finding 3.1 — Thiếu Staff Management hoàn toàn.

### Step 4.5 — ⚙️ Notification Service (2-3 ngày)

```
1. Khởi tạo apps/notification/ (tham khảo template invoice/ cho Kafka consumer):
   → Kafka consumers:
     + tenant.created → Welcome email cho Owner (Nodemailer)
     + payment.completed → Receipt email cho Customer (nếu có email)
     + tenant.suspended → Warning email cho Owner
   → Email templates: HTML templates với tenant branding
   → Audit log: MongoDB collection lưu tất cả notification sent/failed
   → Retry logic: 3 retries với exponential backoff cho failed emails
```

### Step 4.6 — ⚙️ Staff Management Backend (2-3 ngày)

> **Quyết định kiến trúc:** Mở rộng user-access service thay vì tạo service mới. Lý do: giảm complexity, user-access đã có user CRUD infrastructure, và cho 1-person team thì ít service = ít maintenance.

```
1. Mở rộng apps/user-access/ — Staff module:
   → POST   /api/v1/admin/staff/invite    (Owner/Manager — USER_CREATE permission)
     + Input: email, role (WAITER/CHEF/BARISTA)
     + Logic: Gọi Keycloak Admin API → tạo user + assign role
     + Logic: Tạo user profile trong MongoDB (user-access DB)
     + Output: Invitation sent (email with temp password hoặc setup link)
   → GET    /api/v1/admin/staff            (Owner/Manager — USER_GET_ALL)
     + List staff của tenant hiện tại (filter by tenant_id)
   → PATCH  /api/v1/admin/staff/:id/role   (Owner only — ROLE_UPDATE)
     + Thay đổi role staff (VD: WAITER → MANAGER)
     + Cập nhật cả Keycloak realm role + MongoDB permission mapping
   → DELETE /api/v1/admin/staff/:id        (Owner only — USER_DELETE)
     + Soft delete: disable user trong Keycloak + deactivate trong MongoDB
     + KHÔNG hard delete (audit trail)

2. BFF proxy controllers:
   → Forward requests từ Management App → user-access service qua TCP

3. Keycloak Admin API integration:
   → Sử dụng @keycloak/keycloak-admin-client package
   → Service account với realm-management role
   → Operations: createUser, assignRole, removeRole, disableUser
```

### Step 4.7 — 🎨 UI: Staff Management Page (2-3 ngày)

```
1. /dashboard/staff — Staff directory:
   → Bảng: Tên, Email, Role, Trạng thái (Active/Disabled), Ngày tham gia
   → Filter by role
   → Search by name/email

2. Invite Staff Dialog:
   → Form: Email, Role dropdown (WAITER/CHEF/BARISTA/MANAGER)
   → Validation: email unique trong tenant
   → Gửi → Staff nhận email invite → Login lần đầu → Auto-provision

3. Staff Detail / Edit:
   → Thay đổi role
   → Disable/Enable staff account
   → Xem activity log (nice-to-have)

4. Tích hợp API + verify
```

### ✅ Acceptance Criteria Phase 4C

- [ ] Welcome email gửi thành công khi tenant.created
- [ ] Owner invite staff → Staff nhận email → Login thành công với đúng role
- [ ] Owner thay đổi role staff → Permissions cập nhật ngay (cả Keycloak + MongoDB)
- [ ] Owner disable staff → Staff không login được nữa
- [ ] Notification retry: email fail → retry 3 lần → ghi audit log

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

|   Bài   | Nội dung                                    |      Phase      |
| :-----: | ------------------------------------------- | :-------------: |
|  1-104  | Foundation (Nx, TCP, gRPC, Keycloak, Redis) |     ✅ Done     |
| 105-110 | TCP Service mới + Cloudinary upload         |   **Phase 1**   |
|    —    | Permission & Seed Extension                 | **Pre-Phase 2** |
| 115-123 | Kafka + Event-Driven                        | **Phase 2A/2B** |
| 111-113 | Stripe Checkout + Webhook                   |   **Phase 3**   |
| 124-129 | Saga Pattern + Compensation                 |  **Phase 4A**   |
|    —    | SaaS + Tenant Onboarding                    |  **Phase 4B**   |
|    —    | Notification + Staff Management             |  **Phase 4C**   |
| 130-135 | Testing (Unit + Integration + E2E)          |   **Phase 5**   |
| 136-151 | Observability (PLG + Prometheus + Tempo)    |   **Phase 6**   |
| 152-155 | Docker Deploy                               |   **Phase 7**   |

> [!TIP]
> **Critical Path:** Phase 1 → Pre-Phase 2 → Phase 2A → Phase 2B → Phase 3 → Phase 7 (Demo)
> Phase 4A/4B/4C và Phase 6 có thể chạy song song hoặc sau Phase 3 tùy thời gian.
>
> **4 highlight demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing).
