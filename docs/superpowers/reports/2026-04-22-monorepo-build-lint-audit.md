# Monorepo — Build & Lint Audit Report

> **Audience:** Owner và agent follow — file tự đủ (không phụ thuộc chat).
> **Date:** 2026-04-22
> **Scope:** Toàn bộ Nx workspace — `lint` (29 projects) + `build` (13 projects có target `build`).
> **Companion (hướng sửa):** [`../plans/2026-04-22-monorepo-sync-fix-plan.md`](../plans/2026-04-22-monorepo-sync-fix-plan.md)
> **Phương pháp:** Chạy lệnh local, thu log; đối chiếu mã nguồn (`menu.types.ts`, `api.ts`, `schema.ts`, `tsconfig.app.json`, `mock-data/categories.ts`).

---

## 0. Executive Summary

| Trục                             | Kết quả                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`nx run-many -t lint --all`**  | ✅ **PASS** (exit 0) — **0 ESLint errors**, nhiều **warnings** trên nhiều project.                                                                                                    |
| **`nx run-many -t build --all`** | ❌ **FAIL** (exit 1) — **11/13** project build **PASS**; **2** project **FAIL**: `customer-pwa`, `management-app`.                                                                    |
| **Bản chất vấn đề**              | Không phải lỗi công cụ: là **drift type / drift contract** giữa `libs/shared/types`, `libs/shared/mock-data`, FE apps, và **cấu hình `tsc -b`** (kéo cả `*.spec.ts` vào build graph). |

---

## 1. Lệnh đã chạy (reproducible)

```bash
cd /path/to/qr-order

# Lint — toàn bộ project có target lint
npx nx run-many -t lint --all --parallel=2 --skip-nx-cache

# Build — toàn bộ project có target build
npx nx run-many -t build --all --parallel=1 --skip-nx-cache
```

**Ghi chú:** Log thô có thể lưu tại `/tmp/nx-lint-all.log` và `/tmp/nx-build-all.log` nếu dùng `tee` khi chạy lại audit.

---

## 2. Lint — Chi tiết

### 2.1 Tổng quan

- **Số project:** 29
- **Exit code:** 0
- **Errors:** 0
- **Warnings:** có (không chặn `nx lint` theo cấu hình hiện tại)

### 2.2 Nhóm cảnh báo lặp (theo rule)

| Rule / chủ đề                              | Vị trí điển hình                                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-explicit-any`       | `libs/schemas`, `libs/interfaces` (TCP client), `libs/utils/request.util.ts`, nhiều `*.spec.ts` (bff, authorizer, user-access, frontend-utils, cloudinary). |
| `@typescript-eslint/no-non-null-assertion` | `error-messages` spec, `user-access` role spec, `catalog` `table.service.ts`, cloudinary validators spec.                                                   |
| `@typescript-eslint/no-unused-vars`        | `cloudinary.validators.ts`, `guards/tenant.guard.ts`, `catalog` menu-item spec.                                                                             |
| `react-hooks/incompatible-library`         | `management-app` — TanStack `useReactTable` vs React Compiler.                                                                                              |
| `@next/next/no-img-element`                | `management-app` — `<img>` thay vì `next/image`.                                                                                                            |
| Unused `eslint-disable`                    | `apps/invoice-e2e` support files.                                                                                                                           |

### 2.3 Cảnh báo runtime khi chạy Nx (không phải ESLint file)

- `MaxListenersExceededWarning` (Node) khi orchestrate nhiều task — theo dõi nếu CI flaky; không map 1-1 sang một file source.

---

## 3. Build — Chi tiết

### 3.1 Danh sách project có `build` (13)

`shared-types`, `shared-constants`, `frontend-utils`, `invoice`, `bff`, `product`, `catalog`, `user-access`, `customer-pwa`, `keycloak-theme`, `management-app`, `authorizer`, `saas`.

### 3.2 Kết quả từng nhóm

| Nhóm               | Project                                                                     | Kết quả                                                                  |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Lib TS compile     | `shared-types`, `shared-constants`, `frontend-utils`                        | ✅                                                                       |
| Nest webpack       | `invoice`, `bff`, `product`, `catalog`, `user-access`, `authorizer`, `saas` | ✅ `webpack compiled successfully`                                       |
| Keycloak theme     | `keycloak-theme`                                                            | ✅ (Vite build theme)                                                    |
| **customer-pwa**   | `pnpm build` = `tsc -b && vite build`                                       | ❌ **`tsc` fail** — nhiều `error TS…`                                    |
| **management-app** | `next build`                                                                | ❌ **TypeScript step fail** — lỗi `Category[]` vs prop `CategoriesTable` |

### 3.3 Thông báo không fail build (informational)

- Một số lib log: _Package type is "module" but "cjs" format is included_ — cấu hình package/bundler, không làm đỏ build trong lần audit này.

---

## 4. Phân tích lỗi build — `customer-pwa`

### 4.1 Nguyên nhân cấu hình: **`tsc -b` typecheck cả file test**

File `apps/customer-pwa/tsconfig.app.json`:

- `"include": ["src"]` → mọi file dưới `src/` gồm `**/__tests__/**/*.spec.ts` đều vào project build.
- `"types": ["vite/client"]` → **không** có global Jest (`describe`, `it`, `expect`, `jest`).

**Hệ quả:** Jest chạy spec có thể PASS; `tsc -b` cho Vite build **FAIL** trên cùng file spec.

**File bị ảnh hưởng (ví dụ từ log build):**

- `src/features/menu/hooks/__tests__/use-menu-query.spec.ts`
- `src/lib/__tests__/api-client.spec.ts`

### 4.2 Drift domain: **Order / Payment vs `libs/shared/types`**

Shared types (Step 2.3) dùng:

- `OrderStatus` — giá trị **UPPERCASE** (`PENDING`, `CANCELED`, …).
- `PaymentMethod` — Phase 2A chỉ **`"CASH"`** (literal union hẹp).

UI PWA vẫn dùng literal **lowercase** / tên trạng thái **cũ** (`"pending"`, `"confirmed"`, `"cancelled"`, `"cash"`, …) → `TS2322`, `TS2820`, `TS2367`, …

**File điển hình:**

- `src/features/order/components/order-status-timeline.tsx`
- `src/features/order/components/order-summary-card.tsx`
- `src/features/payment/components/payment-method-selector.tsx`
- `src/pages/request-payment-page.tsx`

### 4.3 Drift field: **`Order` không còn `paymentStatus`**

Type `Order` từ shared types **không** khớp với UI đọc `paymentStatus` — drift sau khi bill/order model được chuẩn hóa (Phase 2A doc).

**File:** `src/pages/request-payment-page.tsx` (theo log).

### 4.4 Drift route: **`SESSION_VERIFY` không tồn tại trên `API_CONFIG.ENDPOINTS`**

`session.service.ts` gọi `API_CONFIG.ENDPOINTS.SESSION_VERIFY` nhưng `apps/customer-pwa/src/constants/api.ts` **không** khai báo key này → `TS2339`.

### 4.5 Drift shape menu: **`PublicMenuItem` vs `MenuItem`**

`menu-page.tsx` gán / truyền kiểu public API vs kiểu `MenuItem` đầy đủ — `TS2345`, `TS2322` (theo log).

### 4.6 Drift **`Category`**: mock-data vs `@einvoice/types`

`libs/shared/types/src/lib/menu.types.ts` — `Category` **không** có `timeStart` / `timeEnd`.

`libs/shared/mock-data/src/lib/categories.ts` — object có `timeStart` / `timeEnd` nhưng khai báo `Category[]` từ `@einvoice/types` → **`TS2353`** (object literal chỉ được field đã khai báo trên type).

---

## 5. Phân tích lỗi build — `management-app`

### 5.1 Hai định nghĩa `Category` trong một luồng UI

- **`@einvoice/types`:** `Category` không có `timeStart`, `timeEnd` (canonical shared).
- **`apps/management-app/src/features/menu/data/schema.ts`:** Zod `categorySchema` **có** `timeStart`, `timeEnd` → `type Category = z.infer<typeof categorySchema>`.
- **`CategoriesTable`** nhận `data: Category[]` với `Category` import từ **`../data/schema`** (giàu field).

Hook / page truyền `categories` kiểu **`Category` từ `@einvoice/types`** (thiếu field) vào `CategoriesTable` → Next `next build` fail tại `src/features/menu/index.tsx` (prop `data`).

**Đây là conflict SSOT:** cùng tên `Category`, hai semantic khác nhau trong một pipeline render.

---

## 6. Bảng tổng hợp finding (ID để map sang plan)

| ID  | Layer         | Tóm tắt                                                                                      | Severity                          |
| --- | ------------- | -------------------------------------------------------------------------------------------- | --------------------------------- |
| M1  | Config / TS   | PWA `tsconfig.app` include toàn `src` → `tsc -b` typecheck cả `*.spec.ts` thiếu Jest globals | 🔴 Blocker build PWA              |
| M2  | Type / domain | `OrderStatus` / `PaymentMethod` UI lowercase vs shared types UPPERCASE / CASH-only           | 🔴 Blocker build PWA              |
| M3  | Type / domain | UI đọc `paymentStatus` trên `Order` — field không còn trên type                              | 🔴 Blocker build PWA              |
| M4  | API config    | `SESSION_VERIFY` gọi nhưng không có trong `ENDPOINTS`                                        | 🔴 Blocker build PWA              |
| M5  | Type / API    | `PublicMenuItem` vs `MenuItem` trên `menu-page`                                              | 🔴 Blocker build PWA              |
| M6  | SSOT          | `Category` shared type vs mock-data `timeStart`/`timeEnd`                                    | 🔴 Blocker build PWA (+ mock lib) |
| M7  | SSOT          | `Category` `@einvoice/types` vs Zod `Category` management-app (time window)                  | 🔴 Blocker build management-app   |
| M8  | Lint debt     | Warnings `any` / `!` / unused across repo                                                    | 🟡 Không chặn lint exit           |

---

## 7. Phạm vi ngoài audit này

- Không chạy E2E đầy đủ (`invoice-e2e` runtime).
- Không audit security dependency (`pnpm audit`).
- Không profile runtime performance.

---

## 8. Changelog

| Date       | Author         | Change                                                                     |
| ---------- | -------------- | -------------------------------------------------------------------------- |
| 2026-04-22 | Monorepo audit | Khởi tạo báo cáo từ kết quả `nx run-many` lint + build; bảng finding M1–M8 |
