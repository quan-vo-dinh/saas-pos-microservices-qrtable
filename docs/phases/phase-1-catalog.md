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

- `/dashboard/menu` — Category list + CRUD form (tên, sort order, khung giờ, trạng thái)
- `/dashboard/menu/items` — MenuItem grid cards + CRUD form (tên, mô tả, giá, ảnh upload, category, stock)
- `/dashboard/tables` — Area tabs + Table grid (tên, capacity, status badge) + QR generate/export
- Shared UI components đặt trong `libs/frontend/ui/`:
  - `<MenuItemCard />`, `<CategoryList />`, `<TableStatusBadge />`, `<QRCodeView />`, `<StatusBadge />`, `<DataTable />`

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

**Verify:** Truy cập `/dashboard` không có token → redirect tới Keycloak login (giao diện custom)

### Step 1.3 — Mock UI: Customer PWA Menu (2-3 ngày)

**Mục tiêu:** Giao diện menu mobile-first cho khách hàng — dùng mock data.

**Yêu cầu chính:**

- QR Landing Page: parse URL params (`?table={id}&token={hmac}`)
- Menu Page: category tabs, grid menu items (ảnh, tên, giá), "Hết hàng" badge
- Item detail: bottom sheet (ảnh lớn, mô tả, chọn số lượng)

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

**Yêu cầu chính:**

- CloudinaryModule trong `libs/providers/` — config từ env
- CloudinaryService: uploadImage, deleteImage, getOptimizedUrl
- Validation: max 5MB, image types only (jpeg, png, webp)
- Tenant-isolated storage: `qrtable/{tenant_id}/menu/` (Phase 1), `qrtable/{tenant_id}/branding/` (Phase 4B)
- Auto-generate responsive URLs (thumbnail 200px, medium 400px, large 800px)

**Lưu ý:** Env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. Thêm vào docker-compose.yml.

**Verify:** Upload 1 ảnh test → URL trả về đúng, ảnh lưu đúng tenant folder, transformations hoạt động

### Step 1.5 — Catalog Service Backend (5-7 ngày)

**Mục tiêu:** Catalog Service hoàn chỉnh với CRUD cho menu và tables, tích hợp Cloudinary, và cache layer.

**Yêu cầu chính:**

- TypeORM entities cho 4 domain objects: categories, menu_items, areas, tables (schema: technical-architecture.md §6.2.4)
- Multi-tenant isolation: mọi query filter theo tenant_id
- Category: CRUD + sort ordering + time-based visibility (chỉ hiển thị trong khung giờ)
- MenuItem: CRUD + stock management + soft delete (giữ deleted_at cho audit)
- MenuItem image upload: tích hợp CloudinaryModule, validate file type/size
- Area/Table: CRUD + QR token generation (HMAC-SHA256) + validate
- Table State Machine: Available → Occupied → Billing → Cleaning (xem business-logic.md §3.C)
- Redis cache: `menu:{tenant_id}` → full menu JSON (TTL 10 min, invalidate on change)
- BFF REST endpoints với appropriate guard chain (public menu: SessionGuard, admin CRUD: UserGuard + PermissionGuard)
- BFF Multer middleware: memory storage, stream to Cloudinary (không lưu disk), body limit 20MB

**TCP Message Patterns:**

```
CATALOG.CATEGORY.CREATE, CATALOG.CATEGORY.FIND_ALL, ...
CATALOG.MENU_ITEM.CREATE, CATALOG.MENU.GET_FULL, ...
CATALOG.TABLE.CREATE, CATALOG.TABLE.UPDATE_STATUS, ...
```

**BFF REST Endpoints:**

```
GET  /api/v1/menu?tenant_id=xxx           (public, cached — SessionGuard)
POST /api/v1/admin/categories              (Owner/Manager — UserGuard + CATALOG_CREATE)
POST /api/v1/admin/menu-items              (Owner/Manager — UserGuard + CATALOG_CREATE)
POST /api/v1/admin/menu-items/:id/image    (Owner/Manager — multipart/form-data)
DELETE /api/v1/admin/menu-items/:id/image  (Owner/Manager)
POST /api/v1/admin/tables                  (Owner/Manager — UserGuard + CATALOG_CREATE)
POST /api/v1/tables/:id/validate-qr        (public — SessionGuard)
```

**Redis cache keys:**

- Menu: `menu:{tenant_id}` → full menu JSON (TTL 10 min, invalidate on change)
- Table status: `table:{tenant_id}:{table_id}:status` (no expire, explicit update)

**Lưu ý quan trọng:**

- Phase 1 chưa có Kafka — cache invalidation dùng BFF Direct pattern (BFF gọi Redis DEL sau TCP response)
- KHÔNG dùng Kafka cho menu.updated, table.status_changed (AP1)
- Delete constraints: không xóa Category có MenuItem, không xóa MenuItem có active orders, không xóa Table có active session
- TCP message patterns: CATALOG.CATEGORY._, CATALOG.MENU_ITEM._, CATALOG.TABLE.\* (đăng ký trong libs/constants)

**Verify:** Postman/Thunder Client test tất cả endpoints — CRUD + image upload + QR validate

### Step 1.6 — Tích hợp FE ↔ BE (3-4 ngày)

**Mục tiêu:** Kết nối frontend apps với Catalog Service qua BFF API.

**Yêu cầu chính:**

- React Query hooks trong `libs/frontend/hooks/`: useMenu, useCategories, useMenuItems, useTables, useUploadMenuItemImage
  - `useUploadMenuItemImage(itemId)`: progress tracking, optimistic update (local preview), error handling (file too large, wrong format)
- Customer PWA: thay mock data bằng API calls, QR landing validate token qua API
- Management App: CRUD operations gọi API, image upload với progress indicator + preview
- Optimistic updates + error handling cho tất cả mutations

**Verify:** Owner tạo category + item → Customer PWA thấy ngay. Upload ảnh → hiển thị trên cả 2 apps. Cache invalidation hoạt động.

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
