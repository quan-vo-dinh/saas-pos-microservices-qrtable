# Monorepo — Đồng bộ TypeScript & Build (Fix Plan)

> **Audience:** Owner review + agent execute theo task.
> **Companion (bối cảnh + evidence):** `[../reports/2026-04-22-monorepo-build-lint-audit.md](../reports/2026-04-22-monorepo-build-lint-audit.md)`
> **Mục tiêu:** Một **chuỗi contract thống nhất** (shared types ↔ mock-data ↔ PWA ↔ management-app ↔ API constants) + **build xanh** cho `customer-pwa` và `management-app`.
> **Nguyên tắc:** Mỗi PR nhỏ; mỗi bước có verify; **chốt SSOT một lần** trước khi sửa UI lan man.

---

## Tham chiếu canonical (đọc trước khi execute)

Các tài liệu dưới đây là **SSOT** cho contract và bước phase; mọi thay đổi trong plan này phải **không mâu thuẫn** với chúng. Đường dẫn gốc: `docs/`.

| Tài liệu                                                                                                              | Vì sao liên quan plan này                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[phases/phase-2a-order-kafka.md](../../phases/phase-2a-order-kafka.md)`                                              | Step progress 2.0–2.5; **Bill** thuộc Order Service; `PaymentMethod` **CASH** Phase 2A; `OrderStatus` / timeline; Step **2.2** mock UI vs **2.4** backend. |
| `[superpowers/specs/2026-04-19-step-2.3-shared-types-design.md](../specs/2026-04-19-step-2.3-shared-types-design.md)` | Shape `Order`, `Bill`, `PublicMenuItem`, transition matrices; ghi chú **const-object** vs snippet `enum` trong spec.                                       |
| `[business-logic.md](../../business-logic.md)` §8                                                                     | State machine (Title Case trong doc ↔ **UPPERCASE** trong code); nhánh `CANCELED`.                                                                        |
| `[phases/phase-1-catalog.md](../../phases/phase-1-catalog.md)` Step 1.2                                               | Dashboard category form: `**time_start` / `time_end`** — cơ sở nghiệp vụ cho **D1\*\* (đồng bộ với `Category` trong `@einvoice/types`).                    |
| `[architecture/permission-matrix.md](../../architecture/permission-matrix.md)`                                        | RBAC; không đổi matrix trong scope plan này — chỉ tham chiếu nếu Task 4 đụng route staff sau này.                                                          |
| `[AGENTS.md](../../../AGENTS.md)`                                                                                     | Guard chain BFF; pattern multi-tenant (khi chỉnh API client / session).                                                                                    |

**Ghi nhận quyết định D1 / D2:** sau khi owner chốt, **bắt buộc** thêm một hàng vào [§5 Changelog](#5-changelog) của **chính file plan này** (ngày + D1a/D1b + D2a/D2b + tên người chốt). Khuyến nghị thêm một dòng tóm tắt vào `docs/implementation_plan.md` nếu đang dùng làm running log dự án.

---

## 0. Decision Gate — PHẢI chốt trước khi code (owner)

### D1 — `Category` có `timeStart` / `timeEnd` hay không?

> **Neo nghiệp vụ:** Phase 1 đã mô tả category có khung giờ trên dashboard — xem [phase-1-catalog.md](../../phases/phase-1-catalog.md) mục **Step 1.2** (~dòng 41: `time_start`, `time_end`). Nếu product vẫn coi đây là requirement, **D1a** khớp tài liệu; nếu đã bỏ hẳn khung giờ khỏi roadmap, chọn **D1b** và cập nhật lại phase-1 / copy UI cho khỏi lệch (PR riêng hoặc cùng PR có mô tả rõ).

| Option                                                                | Khi chọn                                | Hành động repo                                                                                                                              |
| --------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1a — Có** (khuyến nghị nếu Catalog/BFF đã hoặc sẽ trả time window) | Bán theo khung giờ là requirement thật  | Thêm `timeStart: string                                                                                                                     | null`, `timeEnd: string | null`vào`libs/shared/types/src/lib/menu.types.ts`→`Category`. Đồng bộ DTO backend + BFF + seed. **Giữ** Zod schema management-app tương thích. Sửa `mock-data/categories.ts` — sau D1a object **hợp lệ**, không còn TS2353. |
| **D1b — Không** (Phase hiện tại không dùng)                           | UI time window là thử nghiệm / lội thời | Xóa `timeStart`/`timeEnd` khỏi Zod `categorySchema` + columns table + API mapping; **rút** mock-data về đúng field của `Category` hiện tại. |

**Không được** vừa D1a vừa D1b trong cùng một PR — sẽ conflict merge.

### D2 — `SESSION_VERIFY` là endpoint thật hay dead code?

> **Neo kỹ thuật:** Đối chiếu route thật trên BFF (customer/session/QR) với `technical-architecture.md` / controller BFF — không đoán tên path; chọn D2a **chỉ khi** route đã tồn tại trong code.

| Option                           | Hành động                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| **D2a — Endpoint tồn tại**       | Thêm vào `API_CONFIG.ENDPOINTS` đúng path BFF (đối chiếu router BFF + OpenAPI nếu có).              |
| **D2b — Đã merge vào flow khác** | Sửa `session.service.ts` gọi route đã có (`VALIDATE_QR` hoặc tên mới); xóa symbol `SESSION_VERIFY`. |

---

## 1. Map finding → task

| Finding (audit) | Task dưới đây            |
| --------------- | ------------------------ |
| M1              | Task 1                   |
| M6              | Task 2 (phụ thuộc D1)    |
| M7              | Task 3 (phụ thuộc D1)    |
| M2, M3, M5      | Task 4                   |
| M4              | Task 5 (phụ thuộc D2)    |
| Lint M8         | Task 6 (optional, batch) |

---

## 2. Thứ tự thực hiện đề xuất (dependency-aware)

```
D1 (owner) → D2 (owner)
    ↓
Task 1 (PWA tsconfig — tách spec khỏi build)   ← có thể làm song song với D1/D2 chuẩn bị
    ↓
Task 2 (mock-data + types Category theo D1)
    ↓
Task 3 (management-app Category pipeline theo D1)
    ↓
Task 4 (PWA Order/Payment/Menu-page migrate types)
    ↓
Task 5 (SESSION_VERIFY theo D2)
    ↓
Task 6 (lint warnings — theo batch, không chặn build)
```

---

## Task 1 — Tách `*.spec.ts` khỏi graph `tsc -b` của `customer-pwa` (M1)

**Goal:** `pnpm --dir apps/customer-pwa build` không còn typecheck Jest spec bằng `tsconfig.app`.

**Hướng A (ưu tiên — ít đụng Jest config):**

1. Tạo `apps/customer-pwa/tsconfig.spec.json` (hoặc dùng file đã có nếu có) chỉ dùng cho test — `types` gồm `jest` / `@types/jest` theo convention repo.
2. Sửa `tsconfig.app.json`:

- Thêm `"exclude": ["**/*.spec.ts", "**/*.test.ts", "**/__tests__/**"]`
- Hoặc thu hẹp `"include"` chỉ các thư mục runtime (ví dụ `src/pages`, `src/features`, `src/lib` nhưng exclude test) — **cẩn thận** không bỏ sót entry.

**Verify:**

```bash
pnpm --dir apps/customer-pwa exec tsc -b --pretty false 2>&1 | head -40
pnpm --dir apps/customer-pwa build
```

**DoD:** Không còn lỗi `Cannot find name 'describe'` / `jest` trên file spec trong bước `tsc` của build.

---

## Task 2 — Đồng bộ `Category` + `mock-data` (M6, phụ thuộc D1)

**Nếu D1a (thêm field vào shared type):**

1. Sửa `libs/shared/types/src/lib/menu.types.ts` — thêm `timeStart`, `timeEnd` nullable string.
2. Export barrel nếu cần (`index.ts` đã re-export `menu.types`).
3. Chạy `npx nx test mock-data` + `npx nx lint mock-data`.
4. Grep `Category` trong repo — cập nhật chỗ parse JSON từ API nếu thiếu field (default `null`).

**Nếu D1b (bỏ field khỏi mock + UI):**

1. Sửa `libs/shared/mock-data/src/lib/categories.ts` — bỏ `timeStart`/`timeEnd` khỏi literals.
2. Không đổi `menu.types.ts` `Category`.

**Verify:**

```bash
npx nx run-many -t lint,test -p mock-data,shared-types --skip-nx-cache
```

---

## Task 3 — `management-app`: một luồng `Category` (M7, phụ thuộc D1)

**Goal:** `src/features/menu/index.tsx` truyền vào `CategoriesTable` đúng kiểu mà columns/table kỳ vọng.

**Sau D1a:**

- Hook/API có thể trả `@einvoice/types` `Category` **đã có** `timeStart`/`timeEnd` → assign trực tiếp **hoặc** map 1:1.
- Nếu API chưa trả: map `null` cho hai field khi build row (adapter layer), **không** nhân đôi type tên `Category` trong hook.

**Sau D1b:**

- Đổi `CategoriesTable` + `categories-columns` nhận `Category` từ `@einvoice/types` (import một nguồn); xóa field time khỏi Zod nếu không dùng.

**Verify:**

```bash
NODE_ENV=production pnpm --dir apps/management-app build
```

**DoD:** Next.js “Running TypeScript” pass; không còn lỗi tại `menu/index.tsx:54`.

---

## Task 4 — `customer-pwa`: migrate UI theo shared types (M2, M3, M5)

**Phạm vi vs Phase 2A Step 2.2:** Task 4 chỉ nhằm **khớp TypeScript + contract** (`@einvoice/types`, build xanh) cho các màn order/payment/menu **đã tồn tại**. Đây **không** thay thế deliverable Step **2.2** trong [phase-2a-order-kafka.md](../../phases/phase-2a-order-kafka.md) (mock Cart drawer đầy đủ, POS `/pos/`, KDS `/kds/*`, fake WebSocket, animation). Sau Task 4 vẫn có thể **⬜ Not Started** đối với Step 2.2 cho đến khi có spec/plan mock UI mới.

### 4.1 Order status (M2)

- Thay mọi literal `"pending"` … bằng `OrderStatus.PENDING` (import value object từ `@einvoice/types`) **hoặc** string literal đúng union (`'PENDING'`).
- Chuẩn hóa `**CANCELED`\*\* (một L) theo code — không dùng `"cancelled"`.
- Bảng timeline / summary: `Record<OrderStatus, …>` phải có **đủ key** theo union hiện tại — gồm `**DRAFT`**, `**COMPLETED**`, `**CANCELED**` nếu component cover toàn vòng đời (xem [phase-2a-order-kafka.md](../../phases/phase-2a-order-kafka.md) mục **Step 2.3\*\* và `libs/shared/types/src/lib/order.types.ts`).
- **ADR:** `OrderStatus` trong lib là **const-object + type alias**, không phải TS `enum` (`erasableSyntaxOnly` trên PWA) — `OrderStatus.PENDING` vẫn dùng được như constant; chi tiết: header `order.types.ts` và block ADR trong phase doc Step 2.3.

### 4.2 Payment (M2, M3)

- `PaymentMethod`: chỉ expose `CASH` trong UI Phase 2A; ẩn/disable `card`, `momo`, … **hoặc** comment block “Phase 3” không đưa vào type union cho đến khi backend mở — khớp [phase-2a](../../phases/phase-2a-order-kafka.md) + `Bill` / `PaymentMethod` trong spec Step 2.3.
- Xóa đọc `order.paymentStatus`; lấy trạng thanh toán từ `**Bill`** / `BillStatus` / endpoint mới khi Order Service + BFF đã có (**Step 2.4+** theo phase doc). Nếu chưa có API: tạm dùng optional chaining + type local `OrderView` **không\*\* mở rộng `@einvoice/types` `Order` — tránh “fake field” trên domain type.

### 4.3 Menu page (M5)

- Ưu tiên dùng / mở rộng type `**PublicMenuItem`\*\* đã có trong `@einvoice/types` (spec Step 2.3); nếu cần alias cục bộ thì `Pick<MenuItem, '…'>` hoặc file `types/public-menu.ts` — một nguồn với public menu API.
- Component chỉ nhận `PublicMenuItem` nơi API public; chỗ cần `MenuItem` đầy đủ thì map sau khi có dữ liệu đủ field.

**Verify:**

```bash
pnpm --dir apps/customer-pwa build
npx nx test customer-pwa --skip-nx-cache
```

---

## Task 5 — API constants session (M4, phụ thuộc D2)

- Nếu D2a: thêm `SESSION_VERIFY: '/…'` vào `apps/customer-pwa/src/constants/api.ts` khớp BFF.
- Nếu D2b: sửa `session.service.ts` + xóa mọi import/reference `SESSION_VERIFY`.

**Verify:** `pnpm --dir apps/customer-pwa exec tsc -b` không còn `TS2339` tại `session.service.ts`.

---

## Task 6 — Lint warnings (M8, optional)

Chạy theo batch theo rule, **sau** build xanh:

```bash
npx nx run-many -t lint --all --parallel=2
```

- Ưu tiên: `no-unused-vars` dễ fix; `any` trong spec có thể hoãn hoặc thay `unknown` + narrow.

---

## 3. Definition of Done (toàn monorepo cho scope này)

1. `npx nx run-many -t build --all` → **exit 0**.
2. `npx nx run-many -t lint --all` → **exit 0** (warnings có thể còn nếu team chấp nhận; ghi rõ trong CHANGELOG nếu giữ).
3. `npx nx run-many -t test --all` → **exit 0** (đã xanh trước đó; chạy lại sau mỗi nhóm task).
4. **Ghi nhận D1/D2:** một hàng trong [§5 Changelog](#5-changelog) của file plan này (bắt buộc) + tùy chọn một dòng trong `docs/implementation_plan.md` — tránh drift lần sau.

---

## 4. Rủi ro & rollback

| Rủi ro                                           | Giảm thiểu                                                |
| ------------------------------------------------ | --------------------------------------------------------- |
| Thêm field `Category` làm API cũ không trả field | Default `null` ở adapter BFF/FE; backend optional column. |
| Thu hẹp `tsconfig` include quá tay               | CI chạy `tsc -b` + `vite build` ngay Task 1.              |
| PR lớn                                           | Giữ đúng thứ tự Task 1 → 5; Task 6 tách PR riêng.         |

Rollback: `git revert` theo PR từng task.

---

## 5. Changelog

| Date       | Author    | Change                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-22 | Planning  | Khởi tạo plan đồng bộ build/lint; Decision D1/D2; Task 1–6 + DoD                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-23 | Doc sync  | Thêm **Tham chiếu canonical**; neo D1/D2 vào phase-1 / BFF; làm rõ Task 4 vs Step 2.2; ADR const-object + đủ key `OrderStatus`; DoD ghi Changelog plan; `BillStatus` trong Task 4.2                                                                                                                                                                                                                                    |
| 2026-04-22 | Execution | **D1a** — `timeStart`/`timeEnd` trên `Category` (`menu.types.ts`). **D2b** — xóa `features/session/services/session.service.ts` (dead code `SESSION_VERIFY`); QR verify dùng `landing/services` + `VALIDATE_QR`. Task 1: `tsconfig.app.json` exclude spec. Task 2–3: mock-data + management-app build xanh. Task 4–5: PWA order/payment/menu `PublicMenuItem` + `OrderStatus`/`PaymentMethod`; Task 6 chưa batch lint. |
