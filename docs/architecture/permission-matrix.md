# Permission Matrix — QRTable

> **Status:** ✅ Active · §6 cập nhật 2026-05-07 (`kitchen.set_priority` + ma trận 53 dòng) · §9 cập nhật 2026-04-26
> **Version:** 1.5
> **Single source of truth** cho role-permission mapping. Mọi thay đổi `PERMISSION` enum, `role.json`, hoặc test cases PHẢI được phản ánh ở đây trước.

## 1. Mục đích & Nguyên tắc

File này là **canonical reference** cho RBAC trong QRTable. Quy trình thay đổi permission:

1. Cập nhật bảng matrix tại §6 (proposal)
2. Code change: `PERMISSION` enum → `role.json` → tests
3. Re-seed MongoDB
4. Verify qua 3 lớp (Layer 1/2/3 — xem §8.4)

**Nguyên tắc thiết kế:**

- Roles là **global** (không per-tenant override). Multi-tenant role customization thuộc backlog Phase 4B.
- Permissions follow format `domain.action_snake_case` (e.g., `catalog.get_by_id`, `service_request.create`).
- CUSTOMER không có entry trong `role.json` — kiểm soát qua `SessionGuard` (xem §7).
- SUPER_ADMIN bypass `TenantGuard`, nhận **tất cả** permissions cross-tenant.

## 2. Glossary

| Term                        | Definition                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Role**                    | Vai trò người dùng (e.g., OWNER). Lưu trong Keycloak realm + MongoDB `role` collection.           |
| **Permission**              | Capability cụ thể (e.g., `catalog.create`). Lưu trong MongoDB `role.permissions[]`.               |
| **Domain**                  | Nhóm permissions theo feature area (e.g., `CATALOG`, `ORDER`).                                    |
| **JWT-claim role**          | Role trong Keycloak access token, claim `realm_access.roles[]`.                                   |
| **DB-permission**           | Permission trong MongoDB `role` collection — nguồn cho `PermissionGuard`.                         |
| **Role mapping validation** | Logic ở `Authorizer` đảm bảo Keycloak roles ∩ DB roles ≠ ∅ (xem `auth-system-reference.md` §8.3). |

## 3. Roles Catalog

6 roles + 1 special actor (CUSTOMER):

| Role                 | Scope                   | Description                                                                  | Tenant binding                                      |
| -------------------- | ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| **SUPER_ADMIN**      | Cross-tenant (platform) | Platform administrator (manage tenants, subscriptions)                       | `tenant_id="platform"` claim, bypass TenantGuard    |
| **OWNER**            | Single-tenant           | Restaurant owner — full operational + HR (incl. user delete)                 | Bound to `tenant_id` claim                          |
| **MANAGER**          | Single-tenant           | Operational manager — same as OWNER except `user.delete` (HR action)         | Bound to `tenant_id` claim                          |
| **WAITER**           | Single-tenant           | Floor service — confirm order, cash payment, table transfer, service request | Bound to `tenant_id` claim                          |
| **CHEF**             | Single-tenant           | Kitchen staff — manage food tickets in KDS                                   | Bound to `tenant_id` claim                          |
| **BARISTA**          | Single-tenant           | Bar staff — manage drink tickets in KDS                                      | Bound to `tenant_id` claim                          |
| **CUSTOMER** (actor) | Session-scoped          | Anonymous diner — session via QR scan, no role.json entry                    | Tenant from QR token (HMAC) + session lock in Redis |

## 4. Permission Catalog (53 values)

Tất cả permissions in format `domain.action_snake_case`:

### Existing (31 values)

| Enum                | Value               | Description                                              |
| ------------------- | ------------------- | -------------------------------------------------------- |
| `SAAS_CREATE`       | `saas.create`       | Create new tenant (SaaS provisioning)                    |
| `SAAS_GET_BY_ID`    | `saas.get_by_id`    | Get tenant detail                                        |
| `SAAS_GET_LIST`     | `saas.get_list`     | List all tenants                                         |
| `SAAS_UPDATE`       | `saas.update`       | Update tenant config                                     |
| `SAAS_DELETE`       | `saas.delete`       | Delete/suspend tenant                                    |
| `CATALOG_CREATE`    | `catalog.create`    | Create category/menu item                                |
| `CATALOG_GET_BY_ID` | `catalog.get_by_id` | Get single catalog entity                                |
| `CATALOG_GET_LIST`  | `catalog.get_list`  | List catalog entities                                    |
| `CATALOG_UPDATE`    | `catalog.update`    | Update catalog entity                                    |
| `CATALOG_DELETE`    | `catalog.delete`    | Delete catalog entity                                    |
| `INVOICE_CREATE`    | `invoice.create`    | Create invoice (legacy template, no QRTable use yet)     |
| `INVOICE_GET_BY_ID` | `invoice.get_by_id` | Get invoice detail                                       |
| `INVOICE_GET_ALL`   | `invoice.get_all`   | List invoices                                            |
| `INVOICE_UPDATE`    | `invoice.update`    | Update invoice (legacy)                                  |
| `INVOICE_DELETE`    | `invoice.delete`    | Delete invoice (legacy)                                  |
| `INVOICE_SEND`      | `invoice.send`      | Send invoice to customer (legacy)                        |
| `USER_CREATE`       | `user.create`       | Create staff user                                        |
| `USER_GET_BY_ID`    | `user.get_by_id`    | Get user detail                                          |
| `USER_GET_ALL`      | `user.get_all`      | List users                                               |
| `USER_UPDATE`       | `user.update`       | Update user profile                                      |
| `USER_DELETE`       | `user.delete`       | Delete user (HR action — OWNER only)                     |
| `ROLE_CREATE`       | `role.create`       | Create role (RBAC self-service — SUPER_ADMIN only)       |
| `ROLE_GET_BY_ID`    | `role.get_by_id`    | Get role detail                                          |
| `ROLE_GET_ALL`      | `role.get_all`      | List roles                                               |
| `ROLE_UPDATE`       | `role.update`       | Update role permissions                                  |
| `ROLE_DELETE`       | `role.delete`       | Delete role                                              |
| `PRODUCT_CREATE`    | `product.create`    | Legacy template (course material) — kept for SUPER_ADMIN |
| `PRODUCT_GET_BY_ID` | `product.get_by_id` | Legacy                                                   |
| `PRODUCT_GET_ALL`   | `product.get_all`   | Legacy                                                   |
| `PRODUCT_UPDATE`    | `product.update`    | Legacy                                                   |
| `PRODUCT_DELETE`    | `product.delete`    | Legacy                                                   |

### NEW in Step 2.x (22 values — Step 2.4 thay `order.cancel` bằng hai quyền, Step 2.6 thêm priority KDS)

| Enum                          | Value                         | Description                                                     |
| ----------------------------- | ----------------------------- | --------------------------------------------------------------- |
| `ORDER_CREATE`                | `order.create`                | Customer creates order (via SessionGuard at endpoint level)     |
| `ORDER_CONFIRM`               | `order.confirm`               | Staff confirms pending order → triggers Kafka `order.confirmed` |
| `ORDER_CANCEL_PENDING`        | `order.cancel_pending`        | Staff reject / cancel đơn `PENDING` (WAITER, MANAGER, OWNER)    |
| `ORDER_CANCEL_PROCESSING`     | `order.cancel_processing`     | Manager/Owner cancel đơn đã confirm (`PROCESSING`+) + lý do     |
| `ORDER_GET_LIST`              | `order.get_list`              | List orders (POS view)                                          |
| `ORDER_GET_BY_ID`             | `order.get_by_id`             | Get order detail                                                |
| `KITCHEN_GET_QUEUE`           | `kitchen.get_queue`           | Get KDS queue (food/drink tickets)                              |
| `KITCHEN_UPDATE_TICKET`       | `kitchen.update_ticket`       | Update ticket status (Pending → Processing → Ready)             |
| `KITCHEN_RECALL`              | `kitchen.recall`              | Recall completed ticket (mistake handling)                      |
| `KITCHEN_SET_PRIORITY`        | `kitchen.set_priority`        | Set/unset KDS ticket priority; OWNER/MANAGER/SUPER_ADMIN only   |
| `PAYMENT_CREATE`              | `payment.create`              | Initiate payment (e.g., SePay VietQR QR creation)               |
| `PAYMENT_CONFIRM_CASH`        | `payment.confirm_cash`        | Staff confirms cash received                                    |
| `PAYMENT_REFUND`              | `payment.refund`              | Refund payment (Manager override)                               |
| `PAYMENT_GET_HISTORY`         | `payment.get_history`         | View payment history (Waiter needs for "last bill" queries)     |
| `TABLE_CREATE`                | `table.create`                | Create table layout entry                                       |
| `TABLE_UPDATE`                | `table.update`                | Update table config (capacity, area)                            |
| `TABLE_DELETE`                | `table.delete`                | Delete table                                                    |
| `TABLE_TRANSFER`              | `table.transfer`              | Transfer order/session between tables                           |
| `TABLE_UPDATE_STATUS`         | `table.update_status`         | Mark table Available → Occupied → Billing → Cleaning            |
| `SERVICE_REQUEST_CREATE`      | `service_request.create`      | Customer/Staff create service request                           |
| `SERVICE_REQUEST_ACKNOWLEDGE` | `service_request.acknowledge` | Staff acknowledges request                                      |
| `SERVICE_REQUEST_RESOLVE`     | `service_request.resolve`     | Staff marks request resolved                                    |

## 5. Removed in Step 2.0

| Item                                   | Reason                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `ROLE.ADMINISTRATOR = 'administrator'` | Legacy template role; 0 references in codebase                                       |
| `ROLE.ACCOUNTANT = 'accountant'`       | Legacy template role; 1 reference in `user.repository.ts:84` (fallback) — also fixed |

## 6. Canonical Permission Matrix (6 × 53)

Legend: ✅ = granted; (blank) = not granted.

| #         | Permission                    | SUPER_ADMIN | OWNER  | MANAGER | WAITER | CHEF  | BARISTA |
| --------- | ----------------------------- | :---------: | :----: | :-----: | :----: | :---: | :-----: |
| 1         | `saas.create`                 |     ✅      |        |         |        |       |         |
| 2         | `saas.get_by_id`              |     ✅      |        |         |        |       |         |
| 3         | `saas.get_list`               |     ✅      |        |         |        |       |         |
| 4         | `saas.update`                 |     ✅      |        |         |        |       |         |
| 5         | `saas.delete`                 |     ✅      |        |         |        |       |         |
| 6         | `catalog.create`              |     ✅      |   ✅   |   ✅    |        |       |         |
| 7         | `catalog.get_by_id`           |     ✅      |   ✅   |   ✅    |   ✅   |  ✅   |   ✅    |
| 8         | `catalog.get_list`            |     ✅      |   ✅   |   ✅    |   ✅   |  ✅   |   ✅    |
| 9         | `catalog.update`              |     ✅      |   ✅   |   ✅    |        |       |         |
| 10        | `catalog.delete`              |     ✅      |   ✅   |   ✅    |        |       |         |
| 11        | `invoice.create`              |     ✅      |        |         |        |       |         |
| 12        | `invoice.get_by_id`           |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 13        | `invoice.get_all`             |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 14        | `invoice.update`              |     ✅      |        |         |        |       |         |
| 15        | `invoice.delete`              |     ✅      |        |         |        |       |         |
| 16        | `invoice.send`                |     ✅      |        |         |        |       |         |
| 17        | `user.create`                 |     ✅      |   ✅   |   ✅    |        |       |         |
| 18        | `user.get_by_id`              |     ✅      |   ✅   |   ✅    |        |       |         |
| 19        | `user.get_all`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 20        | `user.update`                 |     ✅      |   ✅   |   ✅    |        |       |         |
| 21        | `user.delete`                 |     ✅      |   ✅   |         |        |       |         |
| 22        | `role.create`                 |     ✅      |        |         |        |       |         |
| 23        | `role.get_by_id`              |     ✅      |        |         |        |       |         |
| 24        | `role.get_all`                |     ✅      |        |         |        |       |         |
| 25        | `role.update`                 |     ✅      |        |         |        |       |         |
| 26        | `role.delete`                 |     ✅      |        |         |        |       |         |
| 27        | `product.create`              |     ✅      |        |         |        |       |         |
| 28        | `product.get_by_id`           |     ✅      |        |         |        |       |         |
| 29        | `product.get_all`             |     ✅      |        |         |        |       |         |
| 30        | `product.update`              |     ✅      |        |         |        |       |         |
| 31        | `product.delete`              |     ✅      |        |         |        |       |         |
| 32        | `order.create`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 33        | `order.confirm`               |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 34        | `order.cancel_pending`        |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 35        | `order.cancel_processing`     |     ✅      |   ✅   |   ✅    |        |       |         |
| 36        | `order.get_list`              |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 37        | `order.get_by_id`             |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 38        | `kitchen.get_queue`           |     ✅      |   ✅   |   ✅    |        |  ✅   |   ✅    |
| 39        | `kitchen.update_ticket`       |     ✅      |   ✅   |   ✅    |        |  ✅   |   ✅    |
| 40        | `kitchen.recall`              |     ✅      |   ✅   |   ✅    |        |  ✅   |   ✅    |
| 41        | `kitchen.set_priority`        |     ✅      |   ✅   |   ✅    |        |       |         |
| 42        | `payment.create`              |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 43        | `payment.confirm_cash`        |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 44        | `payment.refund`              |     ✅      |   ✅   |   ✅    |        |       |         |
| 45        | `payment.get_history`         |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 46        | `table.create`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 47        | `table.update`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 48        | `table.delete`                |     ✅      |   ✅   |   ✅    |        |       |         |
| 49        | `table.transfer`              |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 50        | `table.update_status`         |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 51        | `service_request.create`      |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 52        | `service_request.acknowledge` |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| 53        | `service_request.resolve`     |     ✅      |   ✅   |   ✅    |   ✅   |       |         |
| **Total** |                               |   **47**    | **32** | **31**  | **13** | **5** |  **5**  |

### Pragmatic decisions explained (Why)

- **OWNER + MANAGER có FULL `ORDER_*` (trừ không áp dụng), `KITCHEN_*`, `PAYMENT_*`, `TABLE_*`, `SERVICE_REQUEST_*`:** quản lý vận hành cần permissions toàn diện; cancel tách `order.cancel_pending` / `order.cancel_processing` (Step 2.4). Bỏ SAAS*\* (platform admin), ROLE*\_ (RBAC self-service không có UI), PRODUCT\_\_ (legacy template).
- **OWNER + MANAGER chỉ có `invoice.get_by_id`, `invoice.get_all`:** Bills thuộc Order Service per Phase 2A spec; INVOICE\_\* là legacy template không có endpoint thật trong QRTable.
- **MANAGER không có `user.delete`:** Manager là operational role; xóa user là HR action thuộc Owner.
- **WAITER có `payment.get_history`:** Waiter ở quầy POS cần đọc lịch sử bill khi customer hỏi.
- **CHEF/BARISTA chỉ có CATALOG*GET + KITCHEN*\*:** không cần xem orders raw, chỉ làm tickets từ KDS view (Kitchen Service consumes Kafka `order.confirmed` và route ticket xuống bếp/bar).

### 6.1 Step 2.4 — Cancel theo trạng thái đơn (đã triển khai trong `libs/constants` + `role.json`)

Đã thay `order.cancel` bằng **`order.cancel_pending`** (WAITER + MANAGER + OWNER) và **`order.cancel_processing`** (MANAGER + OWNER). Customer self-cancel pending vẫn qua `SessionGuard`, không dùng các permission này.

### 6.2 Step 2.6 — Priority thao tác KDS

Thêm **`kitchen.set_priority`** cho thao tác set/unset priority trên KDS ticket. Quyền này chỉ cấp cho SUPER_ADMIN, OWNER, và MANAGER; CHEF/BARISTA vẫn xử lý ticket theo station nhưng không được thay đổi priority.

## 7. CUSTOMER Actor (No DB Role)

CUSTOMER không có entry trong `role.json`. Permissions hardcoded ở controller-level qua `SessionGuard` + ownership check. Reference cho future implementer (Step 2.4):

| Action                   | Endpoint pattern                         | Guard chain                  | Notes                                                                      |
| ------------------------ | ---------------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Submit order             | `POST /api/v1/customer/orders`           | `SessionGuard → TenantGuard` | Validates session, no `@Permissions` decorator                             |
| Cancel own pending order | `DELETE /api/v1/customer/orders/:id`     | `SessionGuard → TenantGuard` | + check `order.sessionId === req.sessionId` + `order.status === 'PENDING'` |
| Submit service request   | `POST /api/v1/customer/service-requests` | `SessionGuard → TenantGuard` |                                                                            |
| View own order status    | `GET /api/v1/customer/orders/:id`        | `SessionGuard → TenantGuard` | + ownership check                                                          |
| Add/update cart          | `POST/PATCH /api/v1/customer/cart`       | `SessionGuard → TenantGuard` | Cart in Redis: `cart:{tenant_id}:{session_id}`                             |

## 8. Operational Procedures

### 8.1 Add a new permission

1. Update bảng matrix tại §6 (đề xuất + rationale)
2. Add enum value tại `libs/constants/src/lib/enum/role.enum.ts`
3. Update `apps/user-access/src/seeder/role.json` cho mỗi role được cấp quyền
4. Update Layer 2 test `apps/user-access/src/seeder/role.spec.ts` (`EXPECTED_MATRIX`)
5. Update Layer 1 test `apps/bff/src/app/guards/permission.guard.spec.ts` (thêm scenarios)
6. Update Layer 3 script `tools/verify-permission-matrix.sh` (thêm assertions)
7. Re-seed: `node tools/seed.js apps/user-access/src/seeder prune`
8. Verify all 3 layers PASS

### 8.2 Re-seed MongoDB

```bash
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder prune
```

**Why `prune` is safe:** `_id` cố định trong `role.json` → re-insert đúng `_id` → `user.roles` references không bị orphan.

### 8.3 Cache invalidation gotcha

`UserGuard` cache `AuthorizeResponse` trong Redis với key `user-token:{sha256(token)}` TTL **30 phút**. Sau khi seed permissions mới:

| Scenario                          | Action                                                   |
| --------------------------------- | -------------------------------------------------------- |
| Dev/test cần permissions mới ngay | **Re-login** (token mới → cache key mới)                 |
| Cần test mà không muốn re-login   | `docker exec qrtable-provider-redis-1 redis-cli FLUSHDB` |
| Production scenario               | Wait 30 min hoặc chấp nhận stale cache                   |

### 8.4 Verification (3 Layers)

| Layer                                     | What                                                        | Run command                              | Speed |
| ----------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- | ----- |
| **Layer 1** — PermissionGuard unit tests  | Verify guard mechanics + matrix invariants per role         | `npx nx test bff`                        | < 5s  |
| **Layer 2** — role.json schema validation | Anti-drift firewall: role.json must match `EXPECTED_MATRIX` | `npx nx test user-access`                | < 1s  |
| **Layer 3** — Integration verification    | E2E: Keycloak login → BFF /me → DB → permissions            | `bash tools/verify-permission-matrix.sh` | ~30s  |

Layer 3 prerequisites:

- Stack chạy: `pnpm dev:bff-auth` (BFF + Authorizer)
- DB seeded (Step 8 đã chạy)

## 9. Frontend navigation (Management App) vs API enforcement

> **Status (Phase 2.x — hai tầng FE vs BFF):** Step **2.2** mock POS/KDS/PWA đã triển khai; §9 vẫn mô tả **điều hướng theo role** + **API theo permission** cho đến khi có work map từng nút UI ↔ `permissions[]` (tech debt, thường sau Step 2.5).

**Hai tầng tách bạch:**

| Tầng                           | Trách nhiệm                                                                                                                                                                                       | Nguồn sự thật                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **BFF / microservices**        | Mỗi HTTP endpoint được bảo vệ bởi `UserGuard` → `TenantGuard` → `PermissionGuard`; kiểm tra **permission** (chuỗi `domain.action`, xem §4–§6).                                                    | §6 matrix + `role.json` + `@Permissions` trên controller                                                           |
| **`management-app` (Next.js)** | **Điều hướng & sidebar theo role** (JWT session `realm_access` / profile): user chỉ thấy **nhóm tab / prefix route** tương ứng khu vực họ được vào; middleware redirect nếu URL không thuộc role. | `apps/management-app/src/lib/auth/role-routing.ts` + `components/layout/data/sidebar-data.ts` (lọc theo cùng rule) |

**Nguyên tắc:**

- **FE không thay thế BFF:** Ẩn menu chỉ là UX; gọi API sai quyền vẫn phải nhận **403** từ BFF.
- **Đồng bộ nghĩa là:** mỗi **vùng route** (`/dashboard`, `/pos`, `/kds/...`, `/admin`) phải **không** cho phép role nào thấy tab mà **toàn bộ** API cần cho tab đó nằm ngoài permission của role đó (tránh “vào được nhưng toàn 403”). Khi siết permission chi tiết hơn trong cùng một trang, cần bổ sung **ẩn/disable nút** hoặc xử lý 403 ở UI.
- **TODO (tech debt):** tùy chọn map **mục menu / hành động** ↔ `permissions[]` từ session (tinh chỉnh theo matrix từng dòng) — thường sau khi Step 2.5 nối API ổn định; xem `AGENTS.md` (Frontend RBAC).

**Cross-reference:** Kiến trúc tổng thể & monorepo: `docs/technical-architecture.md` §4.2.1, §8.1.2 · Blueprint UI: `docs/ui-blueprint-step-2.2.md` §0.
