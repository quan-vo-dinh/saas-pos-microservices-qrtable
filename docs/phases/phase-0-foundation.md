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
  - `invoice/` → TCP + MongoDB + Repository
  - `product/` → TCP + PostgreSQL + TypeORM
  - `user-access/` → TCP + Keycloak integration
- Tạo services QRTable mới: catalog, saas — kế thừa patterns từ templates
- Giữ nguyên services hạ tầng: bff (mở rộng), authorizer (giữ nguyên)

**Verify:** `nx serve bff`, `nx serve catalog`, `nx serve saas` — tất cả khởi động OK

### Step 0.2 — Pragmatic Layered Architecture (ngày 2-3)

**Mục tiêu:** Áp dụng cấu trúc Controller → Service → Repository cho mỗi service QRTable mới.

**Yêu cầu chính:**

- Mỗi service tuân thủ N-Tier: controllers/ → services/ → repositories/ → entities/ → dtos/
- Tận dụng NestJS DI container cho test/mocking
- Không áp dụng Clean Architecture thuần túy — quá cồng kềnh cho scope dự án

**Cấu trúc folder mẫu (catalog service):**

```
apps/catalog/src/
├── catalog.module.ts
├── controllers/catalog.controller.ts
├── services/catalog.service.ts
├── repositories/catalog.repository.ts
├── entities/catalog.entity.ts
└── dtos/create-catalog.dto.ts
```

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
  - Key dependencies: tailwindcss, shadcn-ui, lucide-react, @tanstack/react-query, socket.io-client
- Management App: Next.js App Router + shadcn/ui + Zustand + React Hook Form + Zod
  - Key dependencies: shadcn-ui, lucide-react, @tanstack/react-query, zustand, react-hook-form, zod, socket.io-client
- Cả 2 apps đều config trong Nx project.json

**Verify:** `nx serve customer-pwa` → localhost:5173, `nx serve management-app` → localhost:3000

### Step 0.5 — Shared Libraries (ngày 4-5)

**Mục tiêu:** Tổ chức shared libs theo Nx Grouping — tách rõ cross-platform, frontend, backend.

**Yêu cầu chính:**

- Cross-platform: `libs/shared/types/`, `libs/shared/constants/`
  - First shared types file: `libs/shared/types/src/index.ts` → `export type { ITenant, IUser, IRole }`
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

#### Step 0.6A — Auth Completion Details

- **2-layer auth model:** Keycloak quản lý identity (login/token) + user-access DB quản lý internal profile (roles, tenant mapping)
- **Provisioning strategy:** Pre-provision (Owner tạo staff trước) vs First-login upsert (user login lần đầu → tự tạo profile)
- **Tham chiếu chi tiết:** `docs/references/auth-system-reference.md`

**Verify:** BFF → Catalog/SaaS TCP health check OK, secured endpoints reject invalid tokens

### Step 0.7 — Layout Skeleton cho 2 Frontend Apps (ngày 6-7)

**Mục tiêu:** Layout cơ bản cho cả 2 apps với role-based routing.

**Yêu cầu chính:**

- Management App: Sidebar + Top Bar + Content Area, role-based redirect sau login
  - Placeholder route groups: `/dashboard`, `/pos`, `/kds`, `/admin`
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
- [x] Đã có bản vẽ ERD tổng thể (docs/architecture/erd.png)
- [x] Internal actor có token hợp lệ nhưng thiếu profile nội bộ trả 401 (user_not_provisioned)
- [x] Management App: login → redirect đúng role route

## Outputs cho Phase 1

- Catalog service sẵn sàng nhận business logic
- Frontend apps có layout skeleton, sẵn sàng mock UI
- Auth system hoàn chỉnh, sẵn sàng bảo vệ endpoints
- Shared types library sẵn sàng cho type definitions
