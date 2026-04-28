# Step 1.5 — Catalog Service Backend — Design Spec

> **Date:** 2026-04-11
> **Phase:** Phase 1 — Catalog + Menu + Table
> **Scope:** Backend Catalog Service (entities, services, TCP, BFF endpoints, cache, tests)
> **Status:** Draft → Approved
> **Prerequisite:** Step 1.4 (Shared Types) ✅ DONE, Step 1.45 (CloudinaryModule) ✅ DONE

---

## 1. Problem Statement

Step 1.5 xây dựng Catalog Service Backend hoàn chỉnh — nền tảng cho toàn bộ ordering flow. Bao gồm CRUD cho 4 domain objects (Categories, MenuItems, Areas, Tables), Cloudinary image upload integration, Table State Machine, QR Token security, Redis menu cache tại BFF layer, và public menu endpoint cho customer.

### Current State

- Catalog Service tồn tại với 1 generic entity `Catalog` (name, description, isActive)
- Basic CRUD qua TCP + BFF REST gateway
- CloudinaryModule đã implement tại `libs/providers/cloudinary/`
- Guards chain (UserGuard, SessionGuard, TenantGuard, PermissionGuard) đã hoạt động
- Shared types (ICategory, IMenuItem, IArea, ITable) đã define ở Step 1.4

### Target State

- 4 domain entities trong database riêng `qrtable_catalog`
- Category: CRUD + sort ordering
- MenuItem: CRUD + stock management + soft delete + Cloudinary image upload
- Area/Table: CRUD + QR Token (HMAC-SHA256) generate/validate
- Table State Machine: 5 transitions, all with validation, manual trigger endpoints
- BFF Redis menu cache (centralized cache at BFF layer)
- Public menu endpoint + Admin CRUD endpoints with appropriate guard chains

---

## 2. Architecture Decisions

### 2.1 Clean Break — Replace Generic Entity

**Decision:** Xóa entity `Catalog` cũ (generic), tạo 4 entities mới từ đầu.

**Rationale:** Entity cũ (name, description, isActive) không map tới bất kỳ domain object nào trong Step 1.5. Clean break cho phép thiết kế schema đúng từ đầu, tránh migration debt.

### 2.2 Database-per-Service

**Decision:** Database riêng `qrtable_catalog` cho Catalog Service.

**Rationale:** Theo architecture doc §5.1 "Database-per-Service + Discriminator Column". Env var: `TYPEORM_DATABASE=qrtable_catalog`. Các services khác không truy cập trực tiếp DB của Catalog.

### 2.3 BFF Centralized Cache

**Decision:** BFF quản lý Redis cache tập trung. Catalog Service KHÔNG kết nối Redis.

**Rationale:** Toàn bộ hệ thống hiện tại chỉ có BFF kết nối Redis (sessions, tokens, rate limiting). Giữ nguyên pattern này. Menu cache hit tại BFF tránh TCP call hoàn toàn.

### 2.4 BFF Upload Cloudinary

**Decision:** BFF upload ảnh trực tiếp lên Cloudinary (Cách A). Gửi URL cho Catalog qua TCP.

**Rationale:** Architecture doc §6.2.1: "BFF → Cloudinary: stream image upload". Tránh gửi binary buffer lớn (5MB) qua TCP transport. BFF đã là nơi nhận multipart (Multer).

### 2.5 Table State Machine — Full Implementation + Manual Trigger

**Decision:** Implement đầy đủ 5 transitions với validation, expose admin endpoint cho manual control.

**Rationale:** Validation logic thuộc domain Catalog, không phụ thuộc trigger source. Unit testable 100% ngay Phase 1. Phase 2+ chỉ cần wire triggers vào endpoints đã có. Note cho Phase 2A/2B/3 rằng state machine đã sẵn sàng.

### 2.6 Soft Delete Only (Phase 1)

**Decision:** MenuItem soft delete (set deleted_at). Bỏ qua cross-service check active orders.

**Rationale:** Order Service chưa tồn tại ở Phase 1. Phase 2A sẽ thêm TCP call check active orders trước khi cho phép soft delete.

### 2.7 Category time_start/time_end — REMOVED

**Decision:** Lược bỏ tính năng hiển thị category theo khung giờ.

**Rationale:** Simplify scope cho Phase 1. Nếu cần sau, thêm 2 columns nullable = zero breaking change.

### 2.8 Table Status Cache — DEFERRED

**Decision:** Bỏ `table:{tenant_id}:{table_id}:status` cache cho Phase 1.

**Rationale:** Chưa có WebSocket (Phase 2B), chưa có Order Service check table status (Phase 2A). Table status thay đổi ít thường xuyên, cache hit rate thấp. Để Phase 2B khi có real-time display.

---

## 3. Data Layer — Entity Schema Design

### 3.1 Database: `qrtable_catalog`

```sql
CREATE DATABASE qrtable_catalog;
```

Env var: `TYPEORM_DATABASE=qrtable_catalog`

### 3.2 CategoryEntity

```
Table: categories
├── id: UUID PK (auto-generated)
├── tenant_id: VARCHAR(64) NOT NULL
├── name: VARCHAR(120) NOT NULL
├── sort_order: INTEGER DEFAULT 0
├── status: ENUM('active', 'inactive') DEFAULT 'active'
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Constraints:
  UNIQUE(tenant_id, name)
  INDEX(tenant_id, sort_order)
```

### 3.3 MenuItemEntity

```
Table: menu_items
├── id: UUID PK (auto-generated)
├── tenant_id: VARCHAR(64) NOT NULL
├── category_id: UUID FK → categories(id) NOT NULL
├── name: VARCHAR(255) NOT NULL
├── description: TEXT NULLABLE
├── price: DECIMAL(12,2) NOT NULL
├── image_url: VARCHAR(500) NULLABLE
├── image_public_id: VARCHAR(255) NULLABLE    ← Cloudinary public_id for delete
├── stock: INTEGER DEFAULT 0
├── sort_order: INTEGER DEFAULT 0
├── station: ENUM('KITCHEN', 'BAR') NOT NULL DEFAULT 'KITCHEN'   ← Step 2.4 / Q11-A — KDS routing canonical
├── status: ENUM('available', 'out_of_stock') DEFAULT 'available'
├── deleted_at: TIMESTAMP NULLABLE             ← soft delete
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Constraints:
  INDEX(tenant_id, category_id)
  INDEX(tenant_id, status) WHERE deleted_at IS NULL
```

### 3.4 AreaEntity

```
Table: areas
├── id: UUID PK (auto-generated)
├── tenant_id: VARCHAR(64) NOT NULL
├── name: VARCHAR(120) NOT NULL
├── sort_order: INTEGER DEFAULT 0
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Constraints:
  UNIQUE(tenant_id, name)
  INDEX(tenant_id, sort_order)
```

### 3.5 TableEntity

```
Table: tables
├── id: UUID PK (auto-generated)
├── tenant_id: VARCHAR(64) NOT NULL
├── area_id: UUID FK → areas(id) NOT NULL
├── name: VARCHAR(120) NOT NULL
├── capacity: INTEGER DEFAULT 1
├── status: ENUM('available', 'occupied', 'billing', 'cleaning') DEFAULT 'available'
├── qr_token: VARCHAR(255) NOT NULL
├── session_id: VARCHAR(255) NULLABLE
├── created_at: TIMESTAMP
└── updated_at: TIMESTAMP

Constraints:
  UNIQUE(tenant_id, name)
  UNIQUE(tenant_id, qr_token)
  INDEX(tenant_id, area_id)
  INDEX(tenant_id, status)
```

### 3.6 Relationships

```
Category 1 ←→ N MenuItem (FK: category_id)
Area 1 ←→ N Table (FK: area_id)
```

Delete behavior:

- Category delete → reject if has MenuItems (deleted_at IS NULL)
- Area delete → reject if has Tables
- MenuItem → soft delete (set deleted_at)
- Table delete → reject if session_id NOT NULL OR status != 'available'

### 3.8 Catalog ↔ Order (Step 2.4 — stock & station ownership)

- **Stock:** mọi deduct/release cho lifecycle đơn hàng thực hiện trong **transaction PostgreSQL của Catalog** (pessimistic lock trên `menu_items`), được Order Service gọi qua TCP — xem `docs/business-logic-step-2.4-spec.vi.md` §14.3 và `libs/constants/.../tcp-request-message.ts` (`MENU_ITEM.STOCK_DEDUCT_FOR_ORDER`, `STOCK_RELEASE_FOR_ORDER`, `VALIDATE_ORDERABLE`).
- **Station:** trường `station` trên `menu_items` là nguồn canonical cho `order.confirmed` / KDS; shared type `PreparationStation` trong `libs/shared/types`.

### 3.7 Schema Verification vs Business Logic

All entities verified against business-logic.md §2-§3 and technical-architecture.md §6.2.4:

- CategoryEntity: ✅ Covers §2.A (name, status, sort) — time_start/time_end removed
- MenuItemEntity: ✅ Covers §2.A-B (name, description, price, image, stock, sort, soft delete) + image_public_id gap fix
- AreaEntity: ✅ Covers §3.A (name, sort)
- TableEntity: ✅ Covers §3.A-D (name, capacity, area, status, qr_token, session_id)

Extensibility: TypeORM `synchronize: true` (dev) allows adding nullable/default columns without breaking changes.

---

## 4. Business Logic Layer

### 4.1 Category Service

| Operation   | Logic                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create**  | Validate name not empty + UNIQUE(tenant_id, name) → create → return entity                                                                                          |
| **GetList** | `WHERE tenant_id = ? ORDER BY sort_order ASC`                                                                                                                       |
| **GetById** | `WHERE id = ? AND tenant_id = ?` → 404 if not found                                                                                                                 |
| **Update**  | Partial update (name, status, sort_order). If name change → check unique                                                                                            |
| **Delete**  | Check: `COUNT(menu_items WHERE category_id = ? AND deleted_at IS NULL) > 0` → reject "Cannot delete category with active menu items"                                |
| **Reorder** | Receive FULL ordered array `[{id, sort_order}]` for all categories in tenant → batch update sort_order in transaction. Client must send complete list, not partial. |

### 4.2 Area Service

| Operation   | Logic                                                                                  |
| ----------- | -------------------------------------------------------------------------------------- |
| **Create**  | Validate name + UNIQUE(tenant_id, name)                                                |
| **GetList** | `WHERE tenant_id = ? ORDER BY sort_order ASC`                                          |
| **GetById** | `WHERE id = ? AND tenant_id = ?` → 404 if not found                                    |
| **Update**  | Partial update (name, sort_order)                                                      |
| **Delete**  | Check: `COUNT(tables WHERE area_id = ?) > 0` → reject "Cannot delete area with tables" |
| **Reorder** | Receive FULL ordered array `[{id, sort_order}]` → batch update in transaction          |

### 4.3 MenuItem Service

| Operation       | Logic                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| **Create**      | Validate (name, price > 0, category_id exists in same tenant) → create                                    |
| **GetList**     | `WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY sort_order` (filterable by category_id)              |
| **GetById**     | `WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL` → 404 if not found                                |
| **Update**      | Partial update (name, description, price, stock, sort_order, status, category_id)                         |
| **UpdateImage** | Receive image_url + image_public_id from BFF → update fields                                              |
| **SoftDelete**  | Set `deleted_at = NOW()`. Do NOT delete Cloudinary image (audit trail). Phase 2A adds active order check. |

### 4.4 Table Service

| Operation             | Logic                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Create**            | Validate → auto-generate QR token: `HMAC_SHA256(table_id + tenant_id, QR_TOKEN_SECRET)`        |
| **GetList**           | `WHERE tenant_id = ? ORDER BY area_id, name` (filterable by area_id, status)                   |
| **GetById**           | `WHERE id = ? AND tenant_id = ?` → 404 if not found                                            |
| **Update**            | Partial update (name, capacity, area_id). Name change → check unique                           |
| **Delete**            | Check: `session_id IS NOT NULL OR status != 'available'` → reject "Cannot delete active table" |
| **ValidateQRToken**   | Receive (table_id, token) → recompute HMAC → compare → return table info if valid              |
| **RegenerateQRToken** | Generate new HMAC token → update qr_token (old QR codes invalidated)                           |

### 4.5 Table State Machine

```typescript
const VALID_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  available: [TableStatus.OCCUPIED],
  occupied: [TableStatus.BILLING],
  billing: [TableStatus.OCCUPIED, TableStatus.CLEANING],
  cleaning: [TableStatus.AVAILABLE],
};
```

**UpdateStatus logic:**

1. Validate: `VALID_TRANSITIONS[currentStatus].includes(newStatus)` → else throw BadRequest
2. If `newStatus == AVAILABLE`: clear session_id
3. If `newStatus == OCCUPIED`: optionally accept session_id in payload
4. Update table.status = newStatus

> **Note for Phase 2+:** State machine is fully implemented with all 5 transitions. Future phases (Order, Payment) only need to call TABLE.UPDATE_STATUS with appropriate newStatus. No state machine logic changes needed.

### 4.6 Menu Aggregation Service

**GetPublicMenu:** Aggregated query returning full menu structure:

```typescript
// Query all active categories + their available menu items for a tenant
SELECT categories WHERE tenant_id = ? AND status = 'active' ORDER BY sort_order
→ For each category: SELECT menu_items WHERE category_id = ? AND deleted_at IS NULL AND status = 'available' ORDER BY sort_order

// Return format:
{ categories: [{ ...category, items: MenuItem[] }] }
```

### 4.7 Image Upload Flow

```
1. Client → POST /api/v1/admin/menu-items/:id/image (multipart/form-data)
2. BFF: Multer parse → file buffer in memory
3. BFF: Validate file (size ≤ 5MB, type: jpeg/png/webp)
4. BFF: CloudinaryService.uploadImage(buffer, { tenantId, folder: 'menu' })
5. BFF: If menuItem has existing image_public_id → CloudinaryService.deleteImage(oldPublicId)
6. BFF: TCP → MENU_ITEM.UPDATE_IMAGE({ id, tenantId, imageUrl, imagePublicId })
7. Catalog: Update menu_item.image_url + image_public_id
8. BFF: DEL menu:{tenant_id} (invalidate menu cache)
9. BFF: Return updated menuItem
```

Note: Step 5 requires BFF to first fetch current menuItem (via TCP GET_BY_ID) to get existing image_public_id before uploading new image.

---

## 5. API Layer

### 5.1 TCP Message Patterns

Remove old generic `CATALOG` enum. Add new enums:

```typescript
// libs/constants/src/lib/enum/tcp-request-message.ts

enum CATEGORY {
  CREATE = 'category.create',
  GET_LIST = 'category.get_list',
  GET_BY_ID = 'category.get_by_id',
  UPDATE = 'category.update',
  DELETE = 'category.delete',
  REORDER = 'category.reorder',
}

enum MENU_ITEM {
  CREATE = 'menu_item.create',
  GET_LIST = 'menu_item.get_list',
  GET_BY_ID = 'menu_item.get_by_id',
  UPDATE = 'menu_item.update',
  SOFT_DELETE = 'menu_item.soft_delete',
  UPDATE_IMAGE = 'menu_item.update_image',
}

enum AREA {
  CREATE = 'area.create',
  GET_LIST = 'area.get_list',
  GET_BY_ID = 'area.get_by_id',
  UPDATE = 'area.update',
  DELETE = 'area.delete',
  REORDER = 'area.reorder',
}

enum TABLE {
  CREATE = 'table.create',
  GET_LIST = 'table.get_list',
  GET_BY_ID = 'table.get_by_id',
  UPDATE = 'table.update',
  DELETE = 'table.delete',
  UPDATE_STATUS = 'table.update_status',
  VALIDATE_QR_TOKEN = 'table.validate_qr_token',
  REGENERATE_QR_TOKEN = 'table.regenerate_qr_token',
}

enum MENU {
  GET_PUBLIC_MENU = 'menu.get_public_menu',
}
```

### 5.2 BFF REST Endpoints — Public (No JWT)

Guard chain: SessionGuard → TenantGuard

| Method | Path                       | TCP Pattern               | Description                                |
| ------ | -------------------------- | ------------------------- | ------------------------------------------ |
| GET    | `/api/v1/menu`             | `MENU.GET_PUBLIC_MENU`    | Full menu with categories + items (cached) |
| POST   | `/api/v1/menu/validate-qr` | `TABLE.VALIDATE_QR_TOKEN` | Validate QR token, return table info       |

### 5.3 BFF REST Endpoints — Admin (JWT required)

Guard chain: UserGuard → TenantGuard → PermissionGuard

**Categories:**

| Method | Path                               | TCP Pattern          | Permission     |
| ------ | ---------------------------------- | -------------------- | -------------- |
| POST   | `/api/v1/admin/categories`         | `CATEGORY.CREATE`    | CATALOG_CREATE |
| GET    | `/api/v1/admin/categories`         | `CATEGORY.GET_LIST`  | CATALOG_READ   |
| GET    | `/api/v1/admin/categories/:id`     | `CATEGORY.GET_BY_ID` | CATALOG_READ   |
| PATCH  | `/api/v1/admin/categories/:id`     | `CATEGORY.UPDATE`    | CATALOG_UPDATE |
| DELETE | `/api/v1/admin/categories/:id`     | `CATEGORY.DELETE`    | CATALOG_DELETE |
| PATCH  | `/api/v1/admin/categories/reorder` | `CATEGORY.REORDER`   | CATALOG_UPDATE |

**Menu Items:**

| Method | Path                                 | TCP Pattern             | Permission     |
| ------ | ------------------------------------ | ----------------------- | -------------- |
| POST   | `/api/v1/admin/menu-items`           | `MENU_ITEM.CREATE`      | CATALOG_CREATE |
| GET    | `/api/v1/admin/menu-items`           | `MENU_ITEM.GET_LIST`    | CATALOG_READ   |
| GET    | `/api/v1/admin/menu-items/:id`       | `MENU_ITEM.GET_BY_ID`   | CATALOG_READ   |
| PATCH  | `/api/v1/admin/menu-items/:id`       | `MENU_ITEM.UPDATE`      | CATALOG_UPDATE |
| DELETE | `/api/v1/admin/menu-items/:id`       | `MENU_ITEM.SOFT_DELETE` | CATALOG_DELETE |
| POST   | `/api/v1/admin/menu-items/:id/image` | BFF→Cloudinary→TCP      | CATALOG_UPDATE |

**Areas:**

| Method | Path                          | TCP Pattern      | Permission     |
| ------ | ----------------------------- | ---------------- | -------------- |
| POST   | `/api/v1/admin/areas`         | `AREA.CREATE`    | CATALOG_CREATE |
| GET    | `/api/v1/admin/areas`         | `AREA.GET_LIST`  | CATALOG_READ   |
| GET    | `/api/v1/admin/areas/:id`     | `AREA.GET_BY_ID` | CATALOG_READ   |
| PATCH  | `/api/v1/admin/areas/:id`     | `AREA.UPDATE`    | CATALOG_UPDATE |
| DELETE | `/api/v1/admin/areas/:id`     | `AREA.DELETE`    | CATALOG_DELETE |
| PATCH  | `/api/v1/admin/areas/reorder` | `AREA.REORDER`   | CATALOG_UPDATE |

**Tables:**

| Method | Path                                     | TCP Pattern                 | Permission     |
| ------ | ---------------------------------------- | --------------------------- | -------------- |
| POST   | `/api/v1/admin/tables`                   | `TABLE.CREATE`              | CATALOG_CREATE |
| GET    | `/api/v1/admin/tables`                   | `TABLE.GET_LIST`            | CATALOG_READ   |
| GET    | `/api/v1/admin/tables/:id`               | `TABLE.GET_BY_ID`           | CATALOG_READ   |
| PATCH  | `/api/v1/admin/tables/:id`               | `TABLE.UPDATE`              | CATALOG_UPDATE |
| DELETE | `/api/v1/admin/tables/:id`               | `TABLE.DELETE`              | CATALOG_DELETE |
| PATCH  | `/api/v1/admin/tables/:id/status`        | `TABLE.UPDATE_STATUS`       | CATALOG_UPDATE |
| POST   | `/api/v1/admin/tables/:id/regenerate-qr` | `TABLE.REGENERATE_QR_TOKEN` | CATALOG_UPDATE |

### 5.4 BFF Redis Menu Cache

```
GET /api/v1/menu Flow:
  1. BFF check Redis: GET menu:{tenant_id}
  2. HIT → return cached JSON immediately (< 1ms)
  3. MISS → TCP call MENU.GET_PUBLIC_MENU → Catalog query DB
  4. BFF: SET Redis menu:{tenant_id} with TTL=600s (10 min)
  5. Return JSON

Cache invalidation (after any admin CRUD success):
  → BFF: DEL menu:{tenant_id}

Affected operations:
  - Category CREATE/UPDATE/DELETE/REORDER → DEL menu:{tid}
  - MenuItem CREATE/UPDATE/SOFT_DELETE/UPDATE_IMAGE → DEL menu:{tid}
```

### 5.5 BFF Multer Configuration

```typescript
// BFF main.ts or module-level config
app.useGlobalPipes(new ValidationPipe());
// Body parser limit already at 20MB (architecture §6.2.1)

// Image upload endpoint uses @UseInterceptors(FileInterceptor('image'))
// Multer: memory storage (no disk writes)
// BFF validates file before Cloudinary upload
```

### 5.6 Permission Strategy

Phase 1 reuses existing generic `CATALOG_*` permissions (CATALOG_CREATE, CATALOG_READ, CATALOG_UPDATE, CATALOG_DELETE) for ALL 4 domains (categories, menu items, areas, tables). Fine-grained per-domain permissions (e.g., TABLE_CREATE vs CATEGORY_CREATE) are deferred to Phase 4B (SaaS + RBAC refinement).

### 5.7 QR Token Security

```typescript
// Environment variable
QR_TOKEN_SECRET=<random-secret-string>

// Generate token (on table create/regenerate)
token = HMAC_SHA256(table_id + tenant_id, QR_TOKEN_SECRET)

// Validate token (on QR scan)
expectedToken = HMAC_SHA256(table_id + tenant_id, QR_TOKEN_SECRET)
isValid = crypto.timingSafeEqual(token, expectedToken)
```

---

## 6. Implementation Strategy

### Approach: Domain-first (Feature-by-feature)

Implement each domain completely (entity → repository → service → TCP controller → BFF endpoint → tests) before moving to the next:

```
Phase 1: Infrastructure Setup
  → Database qrtable_catalog
  → Entity definitions (all 4)
  → TCP message patterns
  → BFF module restructure (delete old, create new)

Phase 2: Category (simplest CRUD)
  → Repository → Service → TCP Controller
  → BFF Admin Controller + Endpoints
  → Unit tests

Phase 3: Area (similar to Category)
  → Repository → Service → TCP Controller
  → BFF Admin Controller + Endpoints
  → Unit tests

Phase 4: MenuItem (adds Cloudinary + soft delete)
  → Repository → Service → TCP Controller
  → BFF Admin Controller + Image Upload endpoint
  → BFF Multer + Cloudinary integration
  → Unit tests

Phase 5: Table (adds State Machine + QR Token)
  → Repository → Service (with state machine) → TCP Controller
  → BFF Admin Controller + Status/QR endpoints
  → Unit tests (state machine transitions)

Phase 6: Public Menu + Cache
  → Menu aggregation service in Catalog
  → BFF Public Controller (SessionGuard)
  → BFF Redis cache layer
  → Integration verification

Phase 7: Documentation Updates
  → Update phase-1-catalog.md
  → Update shared types (remove timeStart/timeEnd)
  → Update technical-architecture.md (add image_public_id)
  → Note for Phase 2A+ about state machine readiness
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Catalog Service — Jest)

| Module              | Test Cases | Focus                                                                     |
| ------------------- | ---------- | ------------------------------------------------------------------------- |
| **CategoryService** | 6          | CRUD + unique constraint + delete with items rejection                    |
| **MenuItemService** | 8          | CRUD + image URL update + soft delete + stock → status                    |
| **AreaService**     | 5          | CRUD + unique constraint + delete with tables rejection                   |
| **TableService**    | 10         | CRUD + 5 valid transitions + 3 invalid transitions + QR generate/validate |
| **MenuService**     | 3          | Get public menu aggregate + empty menu + multi-tenant isolation           |
| **Total**           | ~32        |                                                                           |

### 7.2 Mock Strategy

- Mock TypeORM repositories via `getRepositoryToken(Entity)`
- Mock CloudinaryService for image-related tests (BFF level)
- No real DB/TCP/Redis in unit tests

### 7.3 Verification

After implementation:

- `npx nx lint catalog --fix` → no errors
- `npx nx test catalog` → all tests pass
- `npx nx lint bff --fix` → no errors
- `npx nx test bff` → all tests pass (existing + new)

---

## 8. Scope Boundaries

### In Scope (Step 1.5):

- 4 new TypeORM entities in `qrtable_catalog` database
- Category, Area, MenuItem, Table CRUD services + repositories
- Table State Machine (all 5 transitions, manual trigger)
- QR Token HMAC-SHA256 generate/validate
- MenuItem image upload (BFF → Cloudinary → TCP → Catalog)
- BFF REST endpoints (public + admin with guard chains)
- BFF Redis menu cache (cache-aside pattern)
- BFF Multer configuration for image upload
- TCP message patterns in shared constants
- Unit tests (~32 cases)
- Documentation updates

### Out of Scope:

- ~~Category time_start/time_end~~ — REMOVED
- ~~Table status Redis cache~~ — Deferred to Phase 2B
- ~~Cross-service active order check on delete~~ — Deferred to Phase 2A
- ~~QR Code PDF export~~ — Deferred (frontend responsibility)
- ~~WebSocket broadcast~~ — Phase 2B
- ~~Kafka events~~ — Phase 2A
- Frontend integration — Step 1.6

---

## 9. Dependencies & Environment

### New Environment Variables

```env
# Catalog Service database
TYPEORM_DATABASE=qrtable_catalog

# QR Token HMAC secret
QR_TOKEN_SECRET=<random-secret-string>
```

### NPM Dependencies

No new NPM dependencies required. All needed packages already installed:

- `typeorm` + `@nestjs/typeorm` (entities)
- `cloudinary` + `@common/providers/cloudinary` (image upload)
- `@nestjs/cache-manager` + `@keyv/redis` (BFF cache)
- `@nestjs/platform-express` (Multer)
- `crypto` (Node.js built-in for HMAC)

---

## 10. Notes for Future Phases

### Phase 2A (Order + Kafka):

- Table State Machine đã implement đầy đủ 5 transitions. Khi Order Service tạo session, chỉ cần gọi TCP `TABLE.UPDATE_STATUS({ status: 'occupied', sessionId })`.
- MenuItem soft delete cần thêm cross-service check: TCP call Order Service kiểm tra active orders trước khi cho phép delete.

### Phase 2B (Kitchen + WebSocket):

- Table status cache `table:{tid}:{id}:status` sẽ được thêm ở BFF khi WebSocket broadcast cần real-time status.
- Menu cache invalidation sẽ trigger WebSocket broadcast tới customers.

### Phase 3 (Payment):

- Table transition `billing → cleaning` sẽ được triggered bởi Payment Service khi payment completed.
- Table transition `occupied → billing` sẽ được triggered bởi customer request payment.
