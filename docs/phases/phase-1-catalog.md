# Phase 1 — Catalog + Menu + Table

> **Goal:** Customers scan QR → see menu. Staff manages menus/tables on Dashboard.
> **Estimated:** ~2-3 weeks
> **Status:** ✅ DONE (Steps 1.1–1.6 completed)

> **Convention note (post-Step 2.3, 2026-04-19):** Phase 1 docs also use I-prefix for interface (eg `ICategory`, `IMenuItem`).
> After Step 2.3, convention dropped I-prefix according to shared-types ADR; code and shared types now use domain names directly.
> Phase 1 docs keep historical naming as-is; code and types lib have followed new convention (`Category`, `MenuItem`).

## Prerequisites

- Phase 0 completed — [phase-0-foundation.md](phase-0-foundation.md)
- Catalog service + 2 frontend apps have been initialized
- Auth system works

## Reference

| Documents                 | Related Sections                             |
| ------------------------- | -------------------------------------------- |
| technical-architecture.md | §6.2.4 Catalog service, §11 Caching Strategy |
| business-logic.md         | §2 Menu Management, §3 Table & QR Management |

## Overview

Phase 1 builds the menu and table management system — the foundation for the entire ordering flow. Includes mock UI for both Dashboard (staff) and Customer PWA, Cloudinary image upload, Catalog service backend with CRUD operations, and frontend ↔ backend integration. This phase does not have Kafka — side-effects (cache invalidation, notifications) use the BFF Direct pattern.

## Steps

### Step 1.1 — Study (2-3 days, parallel to Step 1.2) ✅ DONE

**Goal:** Master the necessary patterns from the course.

**Main requirements:**

- Lesson 105-110: New TCP Microservice, Cloudinary upload
- Review lessons 52-67: TypeORM entities, Repository pattern

**verify:** Understand and be ready to apply patterns

### Step 1.2 — Mock UI: Dashboard Menu & Table Management (3-4 days) ✅ DONE

**Goal:** Dashboard interface for Owner/Manager to manage menus and tables — using mock data.

**Main requirements:**

- `/dashboard/menu` — Category list + CRUD form
  - Category form fields: name, time_start, time_end, sort_order
  - Drag-drop reorder for categories
- `/dashboard/menu/items` — MenuItem grid + CRUD form
  - Grid cards: photo, name, price, stock, status
  - Form fields: name, description, price, photo (upload), category dropdown, stock
- `/dashboard/tables` — Area & Table management
  - Area tabs → Table grid (name, capacity, badge status)
  - QR Code generate + export (PDF/photo)
- Shared UI components: menu item display card, category list, table status badge, QR code display, data table — placed in shared UI library

**Note:** Make maximum use of the Shadcn UI ecosystem (DataTable, Form, Dialog, Tabs). Do not recode basic components yourself.

**verify:** All pages render correctly with mock data, responsive on desktop

### Step 1.25 — Auth Frontend & Custom Keycloak UI (2-3 days) ✅ DONE

**Goal:** Navigation Guard for Management App + custom Keycloak login theme.

**Main requirements:**

- Auth Context / Session Provider for Next.js (NextAuth v5 + Keycloak provider)
- Route protection: middleware blocks /dashboard, /pos, /kds if not logged in
- Auto-redirect to Keycloak login when token expires
- Zustand store for UserProfile & Role (hide/show UI controls)
- Custom Keycloak theme with Keycloakify (React + Tailwind + Shadcn UI)

**Important note:** Build Keycloakify project into file `.jar` → deploy to folder `themes/` of current Docker Keycloak.

**verify:** Access `/dashboard` without token → redirect to Keycloak login (custom interface)

### Step 1.3 — Mock UI: Customer PWA Menu (2-3 days) ✅ DONE

**Goal:** Mobile-first menu interface for customers — using mock data.

**Main requirements:**

- QR Landing Page: parse URL params (`?table={id}&token={hmac}`), loading spinner → redirect to menu page
- Menu Page: category tabs, grid menu items (photo, name, price), "Out of stock" badge when stock = 0
- Item detail: tap item → detail bottom sheet (large image, description, select quantity)

**Note:** Priority is given to Shadcn UI mobile components (Sheet, Drawer, Button).

**verify:** Menu displays correctly on mobile viewport with mock data

### Step 1.4 — Shared Types (1 day) ✅ DONE

**Goal:** Extract TypeScript interfaces from mock UI → shared library.

**Main requirements:**

- `libs/shared/types/src/lib/menu.types.ts` and `libs/shared/types/src/lib/table.types.ts`: `Category`, `MenuItem`, `Area`, `RestaurantTable`
- Enums: CategoryStatus, MenuItemStatus, TableStatus
- Request/Response DTOs: ICreateCategoryDto, IMenuResponse, etc.

**Entity fields & Enum values details:**

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

**verify:** Types can be imported from both frontend and backend via path aliases

### Step 1.45 — CloudinaryModule Setup (1-2 days) ✅ DONE

**Goal:** Shared image upload module, tenant-isolated.

> **Architecture Decision:** Module located at `libs/providers/cloudinary/` (path alias: `@common/providers/cloudinary/*`). Choose `libs/providers/` instead of `libs/configuration/` because CloudinaryModule contains business logic (upload, validation, URL generation), not just config. `libs/providers/` is the category for external service integrations.

**Main requirements:**

- CloudinaryModule in `libs/providers/cloudinary/` — config from env
- CloudinaryService: uploadImage, deleteImage, getOptimizedUrl
- Validation: max 5MB, image types only (jpeg, png, webp)
- Transformation: auto format, auto quality, max width 800px
- Auto-generate responsive URLs (thumbnail 200px, medium 400px, large 800px)
- tenant-isolated folder structure:
  - `qrtable/{tenant_id}/menu/` — food photo (Phase 1)
  - `qrtable/{tenant_id}/branding/` — logo, banner (Phase 4B)
  - `qrtable/{tenant_id}/qr-exports/` — QR PDF exports (nice-to-have)

**Note:** Env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET. Add docker-compose.yml.

**verify:** Upload 1 test image → URL returns correctly, image is saved in correct tenant folder, transformations work

### Step 1.5 — Catalog service Backend (5-7 days) ✅ DONE

**Goal:** Complete Catalog service with CRUD for menus and tables, Cloudinary integration, and cache layer.

**Main requirements:**

- TypeORM entities for 4 domain objects: categories, menu_items, areas, tables (schema: technical-architecture.md §6.2.4)
- Multi-tenant isolation: all queries filter by tenant_id
- **Category:** CRUD + sort ordering + time-based visibility logic — category only shows in the time frame `time_start` → `time_end` (for example, "Breakfast" only shows 6:00-11:00)
- **MenuItem:** CRUD + stock management + soft delete constraints
- **MenuItem Image Upload behavioral flow:**
  - When creating/updating MenuItem: if there is a file → upload Cloudinary → save `image_url`
  - When updating photos: upload new photos → delete old photos on Cloudinary → update `image_url`
  - When soft deleting MenuItem: DO NOT delete image (keep audit trail)
- **Area/Table:** CRUD + QR Token (HMAC-SHA256) generate/validate
- **Table State Machine:** Available → Occupied → Billing → Cleaning — business rules for each transition (see business-logic.md §3.C)
- **Redis cache:**
  - `menu:{tenant_id}` → full menu JSON (TTL: 10 min, invalidate on change)
  - `table:{tenant_id}:{table_id}:status` → status string (no expire, explicit update)
- BFF REST endpoints with appropriate guard chain (public menu: SessionGuard → TenantGuard; admin CRUD: UserGuard → TenantGuard → PermissionGuard)
- **BFF Config:** Body parser limit 20MB, Multi memory storage (stream to Cloudinary, not saved to disk)

**TCP Message Patterns:** Register TCP message patterns for Catalog CRUD according to existing convention in `libs/constants`

**BFF REST Endpoints:**

- Public menu query (cached) — SessionGuard → TenantGuard
- Admin category CRUD — UserGuard → TenantGuard → PermissionGuard (CATALOG_CREATE/UPDATE/DELETE)
- Admin menu item CRUD + image upload (multipart/form-data) — UserGuard → TenantGuard → PermissionGuard (CATALOG_CREATE)
- Admin table CRUD — UserGuard → TenantGuard → PermissionGuard (CATALOG_CREATE)
- Public QR token validation — SessionGuard → TenantGuard

**Redis cache keys:**

- Menu: `menu:{tenant_id}` → full menu JSON (TTL 10 min, invalidate on change)
- Table status: `table:{tenant_id}:{table_id}:status` (no expire, explicit update)

**Important note:**

- **Side-effects Pattern (Phase 1):** There is no Kafka in Phase 1 (setup in Phase 2A). Cache invalidation: BFF calls Redis DEL directly after the TCP response. WebSocket is not yet implemented (Phase 2B). DO NOT use Kafka for write/cache invalidation menu or table status UI hints (AP1); Step 2.7 also does not have a `menu.updated` contract.
- **Delete constraints:**
  - Do not delete Category with MenuItem
  - Do not delete MenuItem with active orders
  - Do not delete Tables with active sessions
- TCP message patterns registered in `libs/constants` according to existing convention

**verify:** Postman/Thunder Client tests all endpoints — CRUD + image upload + QR validate

### Step 1.6 — Integrate FE ↔ BE (3-4 days) ✅ DONE

**Goal:** Connect frontend apps to Catalog service via BFF API.

**Main requirements:**

- React Query hooks for: menu query, category CRUD, menu item CRUD, table CRUD, image upload
  - Image upload hook: progress tracking, optimistic update (local preview before upload completed), error handling (file too large, wrong format)
- **Customer PWA:** replace mock data → QR landing token validate via API, menu page real data + loading states + error states
- **Management App:** CRUD operations, image upload with drag-drop or click-to-select, preview before submitting, upload progress indicator
- Optimistic updates + error handling for all mutations

**Verify E2E:**

- Owner creates item → Customer sees it immediately
- Upload photo → display both apps
- Edit price → customer refresh → new price (cache invalidation)

## Acceptance Criteria

- [x] Owner CRUD menu on Dashboard → data appears correctly
- [x] Owner uploads menu item image → image displayed on Dashboard + Customer PWA
- [x] Image upload: validate file type/size → reject if invalid
- [x] Cloudinary storage: images are saved to the correct path `qrtable/{tenant_id}/menu/`
- [x] Customer scans QR → validate → sees menu at correct table, correct tenant
- [x] Redis cache: menu load < 100ms (cache hit)
- [x] Table state machine transitions to correct state
- [x] Multi-tenant: tenant A does not see tenant B's data
- [x] Soft delete: MenuItem has `deleted_at`; Constraint “do not delete if there is an open order” associated with **Order service (Phase 2A)** according to spec Step 1.5 — Catalog ready soft delete and tenant isolation

> **Note:** The above items have been achieved within the scope of Phase 1 implementation; Optional backlog (export QR PDF, etc.) does not block the phase's DONE status.

## Outputs for Phase 2A

- Catalog service works with CRUD endpoints
- Menu data can be queried from Order service (cross-service TCP)
- Table + QR validation ready for ordering flow
- Frontend hooks are ready for reuse
