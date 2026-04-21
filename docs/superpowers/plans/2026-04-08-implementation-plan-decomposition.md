# Implementation Plan Decomposition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phân rã `docs/implementation_plan.md` (1119 dòng) thành 9 phase files + master index, đồng thời fix audit findings trong architecture/business docs.

**Architecture:** Documentation restructuring — rewrite nội dung theo intent-driven template (WHAT + WHY, không HOW), tạo cross-references giữa các files, đảm bảo standalone readability.

**Tech Stack:** Markdown, Git

**Design Spec:** `docs/superpowers/specs/2026-04-08-implementation-plan-decomposition-design.md`

---

## File Structure

### Files to CREATE:

| File                                         | Purpose                        |
| -------------------------------------------- | ------------------------------ |
| `docs/phases/phase-0-foundation.md`          | Phase 0 plan (✅ DONE)         |
| `docs/phases/phase-1-catalog.md`             | Phase 1 plan (✅ DONE)         |
| `docs/phases/phase-2a-order-kafka.md`        | Pre-Phase 2 + Phase 2A plan    |
| `docs/phases/phase-2b-kitchen-websocket.md`  | Phase 2B plan                  |
| `docs/phases/phase-3-payment.md`             | Phase 3 plan                   |
| `docs/phases/phase-4a-saga-hardening.md`     | Phase 4A plan                  |
| `docs/phases/phase-4b-saas-onboarding.md`    | Phase 4B plan                  |
| `docs/phases/phase-4c-notification-staff.md` | Phase 4C plan                  |
| `docs/phases/phase-5-7-finalization.md`      | Phase 5+6+7 plan               |
| `docs/references/auth-system-reference.md`   | Moved + renamed from step-0-6b |

### Files to MODIFY:

| File                             | Changes                     |
| -------------------------------- | --------------------------- |
| `docs/technical-architecture.md` | Audit fixes #1,2,3,5,7      |
| `docs/business-logic.md`         | Audit fix #6                |
| `docs/implementation_plan.md`    | Full rewrite → master index |

### Files to DELETE:

| File                                                      | Reason                      |
| --------------------------------------------------------- | --------------------------- |
| `docs/step-0-6b-authentication-authorization-chi-tiet.md` | Moved to `docs/references/` |

---

## Task 1: Fix Audit Findings in technical-architecture.md

**Files:**

- Modify: `docs/technical-architecture.md`

- [ ] **Step 1: Fix Finding #1 — Move `bills` from Payment DB to Order DB (§5.1)**

In `docs/technical-architecture.md`, find the database diagram section and move `bills` from Payment to Order:

OLD (around line 414-423):

```
├── DB "qrtable_order"                  ← Order Service
│   ├── orders                           (CÓ tenant_id)
│   ├── order_items                      (CÓ tenant_id)
│   └── service_requests                 (CÓ tenant_id)
│
├── DB "qrtable_payment"               ← Payment Service
│   ├── bills                            (CÓ tenant_id)
│   ├── payments                         (CÓ tenant_id)
│   └── refunds                          (CÓ tenant_id)
```

NEW:

```
├── DB "qrtable_order"                  ← Order Service
│   ├── orders                           (CÓ tenant_id)
│   ├── order_items                      (CÓ tenant_id)
│   ├── bills                            (CÓ tenant_id)
│   └── service_requests                 (CÓ tenant_id)
│
├── DB "qrtable_payment"               ← Payment Service
│   ├── payments                         (CÓ tenant_id)
│   └── refunds                          (CÓ tenant_id)
```

- [ ] **Step 2: Fix Finding #2 — Guard chain naming (§8.2)**

Find the guard chain diagram and update to match actual implementation:

OLD (around line 1037-1043):

```
[RoleGuard]                    ← Phân quyền: "Bạn có role gì?"
  │
  ▼
[SubRoleGuard]  (optional)     ← Chi tiết: "Waiter/Chef/Barista?"
```

NEW:

```
[PermissionGuard]              ← Phân quyền: "Bạn có permission cần thiết?"
```

- [ ] **Step 3: Fix Finding #3 — Notification Kafka subscriptions (§6.2.8)**

Find the Notification Service Kafka subscriptions and fix:

OLD (around line 831-833):

```
Kafka Subscriptions:
  - tenant.created → send welcome email to owner
  - payment.completed → send receipt email (if email provided)
  - order.canceled → log audit trail
```

NEW:

```
Kafka Subscriptions:
  - tenant.created → send welcome email to owner
  - payment.completed → send receipt email (if email provided)
  - payment.refunded → notify owner, log audit trail
```

- [ ] **Step 4: Fix Finding #5 — Cloudinary path (§6.2.4)**

Find the Cloudinary upload path in Catalog Service section and standardize:

OLD (around line 624):

```
    + Upload path: uploads/{tenant_id}/menu/{uuid}.{ext}
```

NEW:

```
    + Upload path: qrtable/{tenant_id}/menu/{uuid}.{ext}
```

- [ ] **Step 5: Fix Finding #7 — Add `deleted_at` to entities (§6.2.4, §6.2.5)**

In Catalog Service entities (§6.2.4), add `deleted_at` to menu_items:

OLD (around line 643):

```
  - menu_items: id, tenant_id, category_id, name, description, price, image_url,
                stock, sort_order, status
```

NEW:

```
  - menu_items: id, tenant_id, category_id, name, description, price, image_url,
                stock, sort_order, status, deleted_at
```

In Order Service entities (§6.2.5), add `deleted_at` to orders:

OLD (around line 675-676):

```
  - orders: id, tenant_id, table_id, session_id, status, total_amount,
            idempotency_key, created_at, updated_at
```

NEW:

```
  - orders: id, tenant_id, table_id, session_id, status, total_amount,
            idempotency_key, created_at, updated_at, deleted_at
```

- [ ] **Step 6: Commit audit fixes**

```bash
git add docs/technical-architecture.md
git commit -m "docs: fix audit findings in technical-architecture (#1 bills ownership, #2 guard naming, #3 notification subs, #5 cloudinary path, #7 deleted_at)"
```

---

## Task 2: Fix Audit Finding in business-logic.md

**Files:**

- Modify: `docs/business-logic.md`

- [ ] **Step 1: Fix Finding #6 — Bank Transfer clarification (§6.A)**

Find the bank transfer section and add clarification note. After the bank transfer payment flow block (around line 390-401), add a note:

```markdown
> **Lưu ý kiến trúc (2026-04):** Thanh toán chuyển khoản được xử lý thông qua Stripe Payment Methods (hỗ trợ PromptPay và các phương thức local), không tích hợp VietQR API riêng biệt. Xem `technical-architecture.md` §6.2.7 — Payment Service.
```

- [ ] **Step 2: Commit**

```bash
git add docs/business-logic.md
git commit -m "docs: clarify bank transfer via Stripe Payment Methods (audit fix #6)"
```

---

## Task 3: Create Directory Structure

**Files:**

- Create directories: `docs/phases/`, `docs/references/`, `docs/architecture/`

- [ ] **Step 1: Create directories**

```bash
mkdir -p docs/phases docs/references docs/architecture
```

- [ ] **Step 2: Verify directories exist**

```bash
ls -la docs/phases docs/references docs/architecture
```

Expected: three empty directories exist.

---

## Task 4: Create phase-0-foundation.md

**Files:**

- Create: `docs/phases/phase-0-foundation.md`
- Source: `docs/implementation_plan.md` lines 35-214

- [ ] **Step 1: Write file**

Create `docs/phases/phase-0-foundation.md` with the following content:

```markdown
# Phase 0 — Chuẩn Bị Nền Tảng & Kiến Trúc

> **Mục tiêu:** Tổ chức codebase, tạo services mới, setup frontend apps, và thiết lập hạ tầng auth.
> **Ước lượng:** ~1 tuần
> **Trạng thái:** ✅ DONE

## Prerequisites

- Codebase khóa học đã hoạt động (services: invoice, product, user-access, bff, authorizer)
- Docker Compose infrastructure (PostgreSQL, MongoDB, Redis, Keycloak) đã chạy

## Tham Chiếu

| Tài liệu                            | Section liên quan                                  |
| ----------------------------------- | -------------------------------------------------- |
| technical-architecture.md           | §4.2 Tổ chức Nx Monorepo, §8 Xác thực & Phân quyền |
| references/auth-system-reference.md | Toàn bộ — chi tiết hệ thống auth đã triển khai     |

## Tổng Quan

Phase 0 giữ nguyên codebase khóa học làm "living templates" và tạo các service QRTable mới bên cạnh. Bao gồm: tổ chức codebase, áp dụng Pragmatic Layered Architecture, phác thảo ERD, khởi tạo 2 frontend apps (Customer PWA + Management App), setup shared libraries theo Nx grouping, thiết lập hạ tầng auth (Keycloak, Guards, Middleware), và dựng layout skeleton cho 2 frontend apps.

## Steps

### Step 0.1 — Đánh dấu & Tổ chức Codebase (ngày 1-2)

**Mục tiêu:** Tổ chức rõ ràng giữa services khóa học (templates) và services QRTable mới.

**Yêu cầu chính:**

- Đánh dấu services khóa học (invoice, product, user-access) với README "TEMPLATE — Do not modify"
- Tạo services QRTable mới: catalog, saas — kế thừa patterns từ templates
- Giữ nguyên services hạ tầng: bff (mở rộng), authorizer (giữ nguyên)

**Verify:** `nx serve bff`, `nx serve catalog`, `nx serve saas` — tất cả khởi động OK

### Step 0.2 — Pragmatic Layered Architecture (ngày 2-3)

**Mục tiêu:** Áp dụng cấu trúc Controller → Service → Repository cho mỗi service QRTable mới.

**Yêu cầu chính:**

- Mỗi service tuân thủ N-Tier: controllers/ → services/ → repositories/ → entities/ → dtos/
- Tận dụng NestJS DI container cho test/mocking
- Không áp dụng Clean Architecture thuần túy — quá cồng kềnh cho scope dự án

**Verify:** Cấu trúc folder đúng chuẩn cho catalog và saas services

### Step 0.3 — ERD Hệ thống Tổng thể (ngày 3)

**Mục tiêu:** Phác thảo ERD tổng thể cho báo cáo luận văn.

**Yêu cầu chính:**

- ERD cover quan hệ chính: Tenant, Category, MenuItem, Table, Order, Bill, Payment
- Bản vẽ mang tính định hướng — schema thực tế sẽ tinh chỉnh theo từng phase

**Verify:** File ERD tồn tại tại `docs/architecture/erd.png`

### Step 0.4 — Khởi tạo 2 Frontend Apps (ngày 3-4)

**Mục tiêu:** 2 frontend apps hoạt động: Customer PWA (React + Vite) và Management App (Next.js).

**Yêu cầu chính:**

- Customer PWA: React + Vite + Tailwind + shadcn/ui + TanStack Query
- Management App: Next.js App Router + shadcn/ui + Zustand + React Hook Form + Zod
- Cả 2 apps đều config trong Nx project.json

**Verify:** `nx serve customer-pwa` → localhost:5173, `nx serve management-app` → localhost:3000

### Step 0.5 — Shared Libraries (ngày 4-5)

**Mục tiêu:** Tổ chức shared libs theo Nx Grouping — tách rõ cross-platform, frontend, backend.

**Yêu cầu chính:**

- Cross-platform: `libs/shared/types/`, `libs/shared/constants/`
- Frontend: `libs/frontend/ui/`, `libs/frontend/hooks/`, `libs/frontend/utils/`
- Backend: giữ nguyên flat structure từ khóa học (`libs/guards/`, `libs/middlewares/`, `libs/entities/`, `libs/common/`)

**Verify:** Import paths hoạt động — `@common/*` cho backend, `@einvoice/*` cho frontend

### Step 0.6 — Setup Hạ tầng Auth (ngày 5-6)

**Mục tiêu:** Hệ thống auth hoàn chỉnh: Keycloak realm, Guards, Middleware.

**Yêu cầu chính:**

- Docker Compose: PostgreSQL, Redis, Keycloak, MongoDB hoạt động
- Keycloak realm "qrtable" với 6 roles: SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA
- Guard chain: UserGuard → SessionGuard → TenantGuard → PermissionGuard
- TenantMiddleware resolve tenant từ header/subdomain
- Auth completion: provisioning strategy, role mapping Keycloak ↔ internal roles

**Tham chiếu chi tiết:** `docs/references/auth-system-reference.md`

**Verify:** BFF → Catalog/SaaS TCP health check OK, secured endpoints reject invalid tokens

### Step 0.7 — Layout Skeleton cho 2 Frontend Apps (ngày 6-7)

**Mục tiêu:** Layout cơ bản cho cả 2 apps với role-based routing.

**Yêu cầu chính:**

- Management App: Sidebar + Top Bar + Content Area, role-based redirect sau login
- Customer PWA: Layout minimal mobile-first
- Shared design tokens (Tailwind config)

**Verify:** Login Keycloak → redirect đúng route theo role

## Acceptance Criteria

- [x] Services khóa học vẫn tồn tại, có README đánh dấu TEMPLATE
- [x] 2 service QRTable mới (catalog, saas) khởi động được
- [x] 2 frontend apps chạy được (customer-pwa, management-app)
- [x] Shared libs tạo xong theo chuẩn Nx Grouping
- [x] Keycloak realm "qrtable" + roles tạo xong
- [x] Guard chain hoạt động (UserGuard → SessionGuard → TenantGuard → PermissionGuard)
- [x] Role mapping pass smoke authorization
- [x] BFF → Catalog + SaaS TCP call thành công

## Outputs cho Phase 1

- Catalog service sẵn sàng nhận business logic
- Frontend apps có layout skeleton, sẵn sàng mock UI
- Auth system hoàn chỉnh, sẵn sàng bảo vệ endpoints
- Shared types library sẵn sàng cho type definitions
```

- [ ] **Step 2: Verify file content**

```bash
wc -l docs/phases/phase-0-foundation.md
```

Expected: ~90-100 lines

- [ ] **Step 3: Commit**

```bash
git add docs/phases/phase-0-foundation.md
git commit -m "docs: create phase-0-foundation.md (decomposed from implementation_plan.md)"
```

---

## Task 5: Create phase-1-catalog.md

**Files:**

- Create: `docs/phases/phase-1-catalog.md`
- Source: `docs/implementation_plan.md` lines 217-465

- [ ] **Step 1: Write file**

Create `docs/phases/phase-1-catalog.md` with the following content:

```markdown
# Phase 1 — Catalog + Menu + Table

> **Mục tiêu:** Khách quét QR → thấy menu. Staff quản lý menu/bàn trên Dashboard.
> **Ước lượng:** ~2-3 tuần
> **Trạng thái:** ✅ DONE (Steps 1.1–1.6) — đồng bộ với `docs/phases/phase-1-catalog.md`

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
- Shared UI components đặt trong `libs/frontend/ui/`

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

**Lưu ý quan trọng:**

- Phase 1 chưa có Kafka — cache invalidation dùng BFF Direct pattern (BFF gọi Redis DEL sau TCP response)
- Delete constraints: không xóa Category có MenuItem, không xóa MenuItem có active orders, không xóa Table có active session
- TCP message patterns: CATALOG.CATEGORY._, CATALOG.MENU_ITEM._, CATALOG.TABLE.\* (đăng ký trong libs/constants)

**Verify:** Postman/Thunder Client test tất cả endpoints — CRUD + image upload + QR validate

### Step 1.6 — Tích hợp FE ↔ BE (3-4 ngày)

**Mục tiêu:** Kết nối frontend apps với Catalog Service qua BFF API.

**Yêu cầu chính:**

- React Query hooks trong `libs/frontend/hooks/`: useMenu, useCategories, useMenuItems, useTables, useUploadMenuItemImage
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
```

- [ ] **Step 2: Verify file content**

```bash
wc -l docs/phases/phase-1-catalog.md
```

Expected: ~120-140 lines

- [ ] **Step 3: Commit**

```bash
git add docs/phases/phase-1-catalog.md
git commit -m "docs: create phase-1-catalog.md (decomposed from implementation_plan.md)"
```

---

## Task 6: Create phase-2a-order-kafka.md

**Files:**

- Create: `docs/phases/phase-2a-order-kafka.md`
- Source: `docs/implementation_plan.md` lines 468-653 (Pre-Phase 2 + Phase 2A)

- [ ] **Step 1: Write file**

Create `docs/phases/phase-2a-order-kafka.md` — full content in file. This is the largest phase file (~150-180 lines) because it merges Pre-Phase 2 (Permission extension) with Phase 2A (Order + Kafka).

Key transformations from original:

- Pre-Phase 2 becomes "Step 2.0" at the top of the file
- Fix Finding #4: remove reference to "template invoice/ cho MongoDB pattern" — Order Service uses PostgreSQL
- Bills entity confirmed as belonging to Order Service (audit fix #1)
- Rewrite all steps to intent-driven format

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-2a-order-kafka.md
git add docs/phases/phase-2a-order-kafka.md
git commit -m "docs: create phase-2a-order-kafka.md (Pre-Phase 2 merged + Phase 2A)"
```

---

## Task 7: Create phase-2b-kitchen-websocket.md

**Files:**

- Create: `docs/phases/phase-2b-kitchen-websocket.md`
- Source: `docs/implementation_plan.md` lines 657-743

- [ ] **Step 1: Write file**

Key content for this file:

- Kitchen Service: Kafka consumer (order.confirmed), Redis Sorted Set for FIFO queue, ticket routing (food → kitchen, drink → bar), batching, SLA monitoring
- WebSocket Gateway: Socket.io + Redis Adapter, connection auth (JWT for staff, session for customer), room assignment per role
- Kafka Consumer Bridge: 3 topics (order.confirmed, kitchen.sla_warning, payment.completed)
- BFF Direct Side-Effects: 5 events (order.created, kitchen.item_ready, menu.updated, table.status_changed, service.requested)
- Kitchen Service has NO database — Redis only

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-2b-kitchen-websocket.md
git add docs/phases/phase-2b-kitchen-websocket.md
git commit -m "docs: create phase-2b-kitchen-websocket.md (decomposed from implementation_plan.md)"
```

---

## Task 8: Create phase-3-payment.md

**Files:**

- Create: `docs/phases/phase-3-payment.md`
- Source: `docs/implementation_plan.md` lines 747-803

- [ ] **Step 1: Write file**

Key content:

- Payment Service receives billId from Order Service (does NOT own bills — audit fix #1)
- Stripe Checkout Session (currency: VND) + Webhook verification
- Cash flow: staff confirm → Kafka payment.completed
- VND Rounding: Math.ceil(amount / 1000) \* 1000
- Refund flow: Stripe refund API + cash record
- Kafka events: payment.completed (P1+P2+P3), payment.refunded (P1+P3)
- Bill finalization: immutable after Paid (enforced by Order Service)

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-3-payment.md
git add docs/phases/phase-3-payment.md
git commit -m "docs: create phase-3-payment.md (decomposed from implementation_plan.md)"
```

---

## Task 9: Create phase-4a-saga-hardening.md

**Files:**

- Create: `docs/phases/phase-4a-saga-hardening.md`
- Source: `docs/implementation_plan.md` lines 806-854

- [ ] **Step 1: Write file**

Key content:

- Order Confirm Saga: Stock Lock → Create Order → Notify KDS → compensation on failure
- Payment Complete Saga: Validate billing → Close Session → Update Table → Archive Bill
- Hardening: max_orders_per_session, Idempotency (SET NX), delete constraints, audit log
- Simplified Transactional Outbox: outbox_events table + cron poll → Kafka → mark sent
- Full CDC (Debezium) is post-thesis scope

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-4a-saga-hardening.md
git add docs/phases/phase-4a-saga-hardening.md
git commit -m "docs: create phase-4a-saga-hardening.md (decomposed from implementation_plan.md)"
```

---

## Task 10: Create phase-4b-saas-onboarding.md

**Files:**

- Create: `docs/phases/phase-4b-saas-onboarding.md`
- Source: `docs/implementation_plan.md` lines 857-920

- [ ] **Step 1: Write file**

Key content:

- SaaS Service completion: Tenant CRUD + slug generation + status lifecycle
- Kafka: tenant.created (P1+P3) → Notification + Catalog seed
- Subscription lifecycle: Plan CRUD, assign plan, auto-suspend on expiry
- Feature Gating: TenantPlanGuard (max_tables, max_staff), 402 response
- Tenant Onboarding Flow (MVP — Admin-assisted): create tenant + provision Owner + seed defaults
- Self-service wizard: nice-to-have, skip if time-constrained

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-4b-saas-onboarding.md
git add docs/phases/phase-4b-saas-onboarding.md
git commit -m "docs: create phase-4b-saas-onboarding.md (decomposed from implementation_plan.md)"
```

---

## Task 11: Create phase-4c-notification-staff.md

**Files:**

- Create: `docs/phases/phase-4c-notification-staff.md`
- Source: `docs/implementation_plan.md` lines 923-999

- [ ] **Step 1: Write file**

Key content — with audit fix #3 applied:

- Notification Service Kafka subscriptions (FIXED): tenant.created, payment.completed, payment.refunded (NOT order.canceled — that's BFF Direct per AP1)
- Email via Nodemailer, HTML templates, retry 3x exponential backoff
- Staff Management: extend user-access service (not new service)
- Keycloak Admin API: createUser, assignRole, removeRole, disableUser
- Staff CRUD: invite, list, change role, disable (soft delete)

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-4c-notification-staff.md
git add docs/phases/phase-4c-notification-staff.md
git commit -m "docs: create phase-4c-notification-staff.md (decomposed, audit fix #3 applied)"
```

---

## Task 12: Create phase-5-7-finalization.md

**Files:**

- Create: `docs/phases/phase-5-7-finalization.md`
- Source: `docs/implementation_plan.md` lines 1002-1096

- [ ] **Step 1: Write file**

This file contains 3 internal sections (Phase 5, 6, 7), each with its own steps and AC. Key content:

**Phase 5 — Testing:** Unit tests (Order State Machine, VND rounding, QR validation), Integration tests (Testcontainers), 3 E2E flows (QR→menu→order, Payment→close, Tenant onboarding), coverage target >60%

**Phase 6 — Observability:** Health checks for all services, PLG Stack (Promtail + Loki + Grafana), Prometheus custom metrics, Tempo + OTel distributed tracing, Grafana dashboards (system + business metrics + per-service)

**Phase 7 — Docker Deploy + Demo:** Multi-stage Dockerfiles, 3 docker-compose files (infra, app, monitoring), seed data (1 tenant, 5 categories, 20 items, 8 tables), demo script 15-20 min

- [ ] **Step 2: Verify & Commit**

```bash
wc -l docs/phases/phase-5-7-finalization.md
git add docs/phases/phase-5-7-finalization.md
git commit -m "docs: create phase-5-7-finalization.md (Phase 5+6+7 merged)"
```

---

## Task 13: Rewrite implementation_plan.md as Master Index

**Files:**

- Modify: `docs/implementation_plan.md` (full rewrite)

- [ ] **Step 1: Rewrite file**

Replace entire content of `docs/implementation_plan.md` with master index (~120-150 lines). Must include:

1. **Header** with project name + frontend/UI principles (condensed from original lines 1-13)
2. **Quyết Định Kiến Trúc Đã Thống Nhất** — table with 6 decisions: Kafka 4P+2AP, Bills → Order Service, Cloudinary, Simplified Outbox, BFF Direct, Template-First
3. **Tổng Quan Lộ Trình** — table with 9 phases: name, estimate, status, link to phase file
4. **Dependency Graph** — ASCII diagram showing critical path + parallel tracks
5. **Mapping Bài Học Khóa Học → Phase** — preserved from original lines 1099-1113
6. **Tài Liệu Liên Quan** — links to technical-architecture.md, business-logic.md, references/auth-system-reference.md
7. **Tiến Độ Tổng Quan** — table for tracking completion dates

Key: master index must NOT duplicate phase content. Only summaries + links.

- [ ] **Step 2: Verify file is concise**

```bash
wc -l docs/implementation_plan.md
```

Expected: 120-150 lines (down from 1119)

- [ ] **Step 3: Commit**

```bash
git add docs/implementation_plan.md
git commit -m "docs: rewrite implementation_plan.md as master index (9 phase files linked)"
```

---

## Task 14: Move and Rename step-0-6b File

**Files:**

- Move: `docs/step-0-6b-authentication-authorization-chi-tiet.md` → `docs/references/auth-system-reference.md`

- [ ] **Step 1: Move file**

```bash
mv docs/step-0-6b-authentication-authorization-chi-tiet.md docs/references/auth-system-reference.md
```

- [ ] **Step 2: Verify**

```bash
ls docs/references/auth-system-reference.md
ls docs/step-0-6b-authentication-authorization-chi-tiet.md 2>/dev/null && echo "ERROR: old file still exists" || echo "OK: old file removed"
```

Expected: file exists at new path, old path returns "OK: old file removed"

- [ ] **Step 3: Commit**

```bash
git add docs/references/auth-system-reference.md
git rm docs/step-0-6b-authentication-authorization-chi-tiet.md
git commit -m "docs: move step-0-6b auth doc to references/auth-system-reference.md"
```

---

## Task 15: Validation

**Files:**

- Read: all phase files, master index, architecture doc

- [ ] **Step 1: V1 — Completeness check**

Count total steps across all phase files. Must equal 27 (original step count):

- Phase 0: 7 steps (0.1-0.7)
- Phase 1: 8 steps (1.1, 1.2, 1.25, 1.3, 1.4, 1.45, 1.5, 1.6)
- Phase 2A: 6 steps (2.0, 2.1, 2.2, 2.3, 2.4, 2.5)
- Phase 2B: 2 steps (2.6, 2.7)
- Phase 3: 4 steps (3.1, 3.2, 3.3/3.4, 3.5)
- Phase 4A: 2 steps (4.1, 4.2)
- Phase 4B: 2 steps (4.3, 4.4)
- Phase 4C: 3 steps (4.5, 4.6, 4.7)
- Phase 5-7: 4 steps (5.1, 6.1, 6.2, 7.1, 7.2) = 5 steps

Total: 7+8+6+2+4+2+2+3+5 = **39 steps** (some original steps were split, e.g., 3.3+3.4)

```bash
grep -c "^### Step" docs/phases/*.md
```

- [ ] **Step 2: V2 — Consistency check**

Verify Kafka topics mentioned in phase files match architecture doc (5 topics only):

```bash
grep -n "order.confirmed\|payment.completed\|payment.refunded\|kitchen.sla_warning\|tenant.created" docs/phases/*.md
```

Verify NO phase file uses these as Kafka topics (they're BFF Direct):

```bash
grep -n "order.created\|menu.updated\|table.status\|kitchen.item_ready\|service.requested\|tenant.suspended" docs/phases/*.md | grep -i "kafka"
```

Expected: no results (these events should only appear in BFF Direct context)

- [ ] **Step 3: V3 — Standalone readability**

Open `docs/phases/phase-3-payment.md` and verify it has:

- Prerequisites section with link to phase-2b
- Tham Chiếu section with links to architecture + business docs
- Tổng Quan section that makes sense without reading other files

- [ ] **Step 4: V4 — Link integrity**

```bash
grep -roh 'phases/[a-z0-9-]*.md\|references/[a-z0-9-]*.md\|technical-architecture.md\|business-logic.md' docs/implementation_plan.md docs/phases/*.md | sort -u | while read f; do
  [ -f "docs/$f" ] && echo "OK: $f" || echo "BROKEN: $f"
done
```

Expected: all links return "OK"

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A docs/
git status
```

If clean, no commit needed. If fixes were made, commit:

```bash
git commit -m "docs: fix validation issues in decomposed plan files"
```
