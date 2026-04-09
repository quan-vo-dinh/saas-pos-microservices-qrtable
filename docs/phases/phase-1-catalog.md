# Phase 1 — Catalog + Menu + Table

> **Mục tiêu:** Khách quét QR → thấy menu. Staff quản lý menu/bàn trên Dashboard.
> **Ước lượng:** ~2-3 tuần
> **Trạng thái:** 🔶 IN PROGRESS (Step 1.4 DONE — next: Step 1.45)

## Prerequisites

- Phase 0 hoàn thành — [phase-0-foundation.md](phase-0-foundation.md)
- Catalog service + 2 frontend apps đã khởi tạo
- Auth system hoạt động

## Tham Chiếu

| Tài liệu                  | Section liên quan                            |
| ------------------------- | -------------------------------------------- |
| technical-architecture.md | §6.2.4 Catalog Service, §11 Caching Strategy |
| business-logic.md         | §2 Quản lý Thực đơn, §3 Quản lý Bàn & QR     |

## Tổng Quan

Phase 1 xây dựng hệ thống quản lý menu và bàn — nền tảng cho toàn bộ ordering flow. Bao gồm mock UI cho cả Dashboard (staff) và Customer PWA, Cloudinary image upload, Catalog Service backend với CRUD operations, và tích hợp frontend ↔ backend. Phase này chưa có Kafka — side-effects (cache invalidation, notifications) dùng BFF Direct pattern.

## Steps

### Step 1.1 — Học (2-3 ngày, song song với Step 1.2)

**Mục tiêu:** Nắm vững patterns cần thiết từ khóa học.

**Yêu cầu chính:**

- Bài 105-110: TCP Microservice mới, Cloudinary upload
- Ôn lại bài 52-67: TypeORM entities, Repository pattern

**Verify:** Hiểu và sẵn sàng áp dụng patterns

### Step 1.2 — Mock UI: Dashboard Menu & Table Management (3-4 ngày)

**Mục tiêu:** Giao diện Dashboard cho Owner/Manager quản lý menu và bàn — dùng mock data.

**Yêu cầu chính:**

- `/dashboard/menu` — Category list + CRUD form
  - Category form fields: tên, time_start, time_end, sort_order
  - Drag-drop reorder cho categories
- `/dashboard/menu/items` — MenuItem grid + CRUD form
  - Grid cards: ảnh, tên, giá, stock, trạng thái
  - Form fields: tên, mô tả, giá, ảnh (upload), category dropdown, stock
- `/dashboard/tables` — Area & Table management
  - Area tabs → Table grid (tên, capacity, trạng thái badge)
  - QR Code generate + export (PDF/ảnh)
- Shared UI components: card hiển thị menu item, danh sách category, badge trạng thái bàn, hiển thị QR code, data table — đặt trong shared UI library

**Lưu ý:** Sử dụng tối đa Shadcn UI ecosystem (DataTable, Form, Dialog, Tabs). Không tự code lại components cơ bản.

**Verify:** Tất cả trang render đúng với mock data, responsive trên desktop

### Step 1.25 — Auth Frontend & Custom Keycloak UI (2-3 ngày)

**Mục tiêu:** Navigation Guard cho Management App + custom Keycloak login theme.

**Yêu cầu chính:**

- Auth Context / Session Provider cho Next.js (NextAuth v5 + Keycloak provider)
- Route protection: middleware chặn /dashboard, /pos, /kds nếu chưa login
- Auto-redirect về Keycloak login khi token hết hạn
- Zustand store cho UserProfile & Role (ẩn/hiện UI controls)
- Custom Keycloak theme với Keycloakify (React + Tailwind + Shadcn UI)

**Lưu ý quan trọng:** Build Keycloakify project thành file `.jar` → deploy vào thư mục `themes/` của Docker Keycloak hiện tại.

**Verify:** Truy cập `/dashboard` không có token → redirect tới Keycloak login (giao diện custom)

### Step 1.3 — Mock UI: Customer PWA Menu (2-3 ngày)

**Mục tiêu:** Giao diện menu mobile-first cho khách hàng — dùng mock data.

**Yêu cầu chính:**

- QR Landing Page: parse URL params (`?table={id}&token={hmac}`), loading spinner → redirect to menu page
- Menu Page: category tabs, grid menu items (ảnh, tên, giá), "Hết hàng" badge khi stock = 0
- Item detail: tap item → detail bottom sheet (ảnh lớn, mô tả, chọn số lượng)

**Lưu ý:** Ưu tiên Shadcn UI mobile components (Sheet, Drawer, Button).

**Verify:** Menu hiển thị đúng trên mobile viewport với mock data

### Step 1.4 — Shared Types (1 ngày) ✅ DONE

**Mục tiêu:** Chiết xuất TypeScript interfaces từ mock UI → shared library.

**Yêu cầu chính:**

- `libs/shared/types/catalog.types.ts`: ICategory, IMenuItem, IArea, ITable
- Enums: CategoryStatus, MenuItemStatus, TableStatus
- Request/Response DTOs: ICreateCategoryDto, IMenuResponse, etc.

**Entity fields & Enum values chi tiết:**

```
CategoryStatus { ACTIVE = 'active', INACTIVE = 'inactive' }
MenuItemStatus { AVAILABLE = 'available', OUT_OF_STOCK = 'out_of_stock' }
TableStatus { AVAILABLE, OCCUPIED, BILLING, CLEANING }

ICategory { id, tenantId, name, sortOrder, timeStart?, timeEnd?, status, createdAt }
IMenuItem { id, tenantId, categoryId, name, description?, price, imageUrl?, stock, sortOrder, status, createdAt }
IArea { id, tenantId, name, sortOrder }
ITable { id, tenantId, areaId, name, capacity, status, qrToken, sessionId? }

ICreateCategoryDto { name, timeStart?, timeEnd? }
ICreateMenuItemDto { categoryId, name, price, ... }
IMenuResponse { categories: (ICategory & { items: IMenuItem[] })[] }
```

**Verify:** Types import được từ cả frontend và backend qua path aliases

### Step 1.45 — CloudinaryModule Setup (1-2 ngày)

**Mục tiêu:** Module upload ảnh dùng chung, tenant-isolated.

> **Architecture Decision:** Module đặt tại `libs/providers/cloudinary/` (path alias: `@common/providers/cloudinary/*`). Chọn `libs/providers/` thay vì `libs/configuration/` vì CloudinaryModule chứa business logic (upload, validation, URL generation), không chỉ config. `libs/providers/` là category cho external service integrations — sau này Stripe (Phase 3), SMTP (Phase 4C) sẽ follow cùng pattern. Chi tiết: [design spec](../superpowers/specs/2026-04-09-cloudinary-module-setup-design.md).

**Yêu cầu chính:**

- CloudinaryModule trong `libs/providers/cloudinary/` — config từ env
- CloudinaryService: uploadImage, deleteImage, getOptimizedUrl
- Validation: max 5MB, image types only (jpeg, png, webp)
- Transformation: auto format, quality auto, max width 800px
- Auto-generate responsive URLs (thumbnail 200px, medium 400px, large 800px)
- Tenant-isolated folder structure:
  - `qrtable/{tenant_id}/menu/` — ảnh món ăn (Phase 1)
  - `qrtable/{tenant_id}/branding/` — logo, banner (Phase 4B)
  - `qrtable/{tenant_id}/qr-exports/` — QR PDF exports (nice-to-have)

**Lưu ý:** Env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. Thêm vào docker-compose.yml.

**Verify:** Upload 1 ảnh test → URL trả về đúng, ảnh lưu đúng tenant folder, transformations hoạt động

### Step 1.5 — Catalog Service Backend (5-7 ngày)

**Mục tiêu:** Catalog Service hoàn chỉnh với CRUD cho menu và tables, tích hợp Cloudinary, và cache layer.

**Yêu cầu chính:**

- TypeORM entities cho 4 domain objects: categories, menu_items, areas, tables (schema: technical-architecture.md §6.2.4)
- Multi-tenant isolation: mọi query filter theo tenant_id
- **Category:** CRUD + sort ordering + time-based visibility logic — category chỉ hiển thị trong khung giờ `time_start` → `time_end` (ví dụ: "Bữa sáng" chỉ show 6:00-11:00)
- **MenuItem:** CRUD + stock management + soft delete constraints
- **MenuItem Image Upload behavioral flow:**
  - Khi create/update MenuItem: nếu có file → upload Cloudinary → lưu `image_url`
  - Khi update ảnh: upload ảnh mới → xóa ảnh cũ trên Cloudinary → cập nhật `image_url`
  - Khi soft delete MenuItem: KHÔNG xóa ảnh (giữ cho audit trail)
- **Area/Table:** CRUD + QR Token (HMAC-SHA256) generate/validate
- **Table State Machine:** Available → Occupied → Billing → Cleaning — business rules cho mỗi transition (xem business-logic.md §3.C)
- **Redis cache:**
  - `menu:{tenant_id}` → full menu JSON (TTL: 10 min, invalidate on change)
  - `table:{tenant_id}:{table_id}:status` → status string (no expire, explicit update)
- BFF REST endpoints với appropriate guard chain (public menu: SessionGuard → TenantGuard; admin CRUD: UserGuard → TenantGuard → PermissionGuard)
- **BFF Config:** Body parser limit 20MB, Multer memory storage (stream to Cloudinary, không lưu disk)

**TCP Message Patterns:** Đăng ký TCP message patterns cho Catalog CRUD theo convention hiện có trong `libs/constants`

**BFF REST Endpoints:**

- Public menu query (cached) — SessionGuard → TenantGuard
- Admin category CRUD — UserGuard → TenantGuard → PermissionGuard (CATALOG_CREATE/UPDATE/DELETE)
- Admin menu item CRUD + image upload (multipart/form-data) — UserGuard → TenantGuard → PermissionGuard (CATALOG_CREATE)
- Admin table CRUD — UserGuard → TenantGuard → PermissionGuard (CATALOG_CREATE)
- Public QR token validation — SessionGuard → TenantGuard

**Redis cache keys:**

- Menu: `menu:{tenant_id}` → full menu JSON (TTL 10 min, invalidate on change)
- Table status: `table:{tenant_id}:{table_id}:status` (no expire, explicit update)

**Lưu ý quan trọng:**

- **Side-effects Pattern (Phase 1):** Chưa có Kafka ở Phase 1 (setup ở Phase 2A). Cache invalidation: BFF gọi Redis DEL trực tiếp sau TCP response. WebSocket chưa triển khai (Phase 2B). KHÔNG dùng Kafka cho menu.updated, table.status_changed (AP1)
- **Delete constraints:**
  - Không xóa Category có MenuItem
  - Không xóa MenuItem có active orders
  - Không xóa Table có active session
- TCP message patterns đăng ký trong `libs/constants` theo convention hiện có

**Verify:** Postman/Thunder Client test tất cả endpoints — CRUD + image upload + QR validate

### Step 1.6 — Tích hợp FE ↔ BE (3-4 ngày)

**Mục tiêu:** Kết nối frontend apps với Catalog Service qua BFF API.

**Yêu cầu chính:**

- React Query hooks cho: menu query, category CRUD, menu item CRUD, table CRUD, image upload
  - Image upload hook: progress tracking, optimistic update (local preview trước khi upload xong), error handling (file too large, wrong format)
- **Customer PWA:** thay mock data → QR landing validate token qua API, menu page real data + loading states + error states
- **Management App:** CRUD operations, image upload với drag-drop hoặc click-to-select, preview trước submit, upload progress indicator
- Optimistic updates + error handling cho tất cả mutations

**Verify E2E:**

- Owner tạo item → Customer thấy ngay
- Upload ảnh → hiển thị cả 2 apps
- Edit giá → customer refresh → giá mới (cache invalidation)

## Acceptance Criteria

- [ ] Owner CRUD menu trên Dashboard → data hiện đúng
- [ ] Owner upload ảnh menu item → ảnh hiển thị trên Dashboard + Customer PWA
- [ ] Image upload: validate file type/size → reject nếu không hợp lệ
- [ ] Cloudinary storage: ảnh lưu đúng path `qrtable/{tenant_id}/menu/`
- [ ] Customer quét QR → validate → thấy menu đúng bàn, đúng tenant
- [ ] Redis cache: menu load < 100ms (cache hit)
- [ ] Table state machine chuyển trạng thái đúng
- [ ] Multi-tenant: tenant A không thấy data tenant B
- [ ] Soft delete: MenuItem có deleted_at, không xóa MenuItem đang có đơn liên quan

## Outputs cho Phase 2A

- Catalog Service hoạt động với CRUD endpoints
- Menu data có thể query từ Order Service (cross-service TCP)
- Table + QR validation sẵn sàng cho ordering flow
- Frontend hooks sẵn sàng tái sử dụng
