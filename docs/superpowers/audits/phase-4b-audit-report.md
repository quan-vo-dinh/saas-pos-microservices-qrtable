# Báo Cáo Audit Kiến Trúc — Phase 4B (SaaS Onboarding & Subscription)

> **Phạm vi:** Phase 4B — SaaS Service + Tenant lifecycle + Subscription/Plan + Onboarding + Feature Gating + Admin UI.
> **Vai trò người audit:** Senior Backend Architect & Distributed Systems Expert (NestJS, Kafka, Redis, Socket.io, Microservices).
> **Trạng thái:** 🟡 Bản nháp Giai đoạn 1 — chờ duyệt câu hỏi chốt hạ trước khi viết spec chính thức (Giai đoạn 2 → `docs/specs/business-logic-phase-4b-spec.md`).
> **Ngày:** 2026-05-10.

---

## 1. Nguồn đã đối chiếu

### 1.1 Tài liệu thiết kế

- `docs/phases/phase-4b-saas-onboarding.md` — phase đang phân tích.
- `docs/phases/phase-4a-saga-hardening.md` — chưa triển khai, chạy song song hoặc sau Phase 3.
- `docs/phases/phase-4c-notification-staff.md` — chưa triển khai, **bắt buộc sau Phase 4B**.
- `docs/phases/phase-3-payment.md` — đã triển khai 70% (đã có Payment Service + outbox + Kafka `payment.completed` / `payment.refunded`).
- `docs/business-logic.md` §1 (Onboarding), §9 (Permissions), §B (Tenant Status), §D (Tenant Isolation).
- `docs/technical-architecture.md` §5 (Multi-tenancy), §6.2.3 (SaaS Service), §7.2-7.4 (Kafka 4P+2AP), §8 (Auth + Guard chain), §11.2 (Redis Access Policy).
- `docs/architecture/permission-matrix.md` (canonical 6 × 53).
- `docs/architecture/erd.dbml` + `erd_explanation.md` — định nghĩa baseline ERD cho `tenants`, `pricing_plans`, `subscriptions`.
- `docs/implementation_plan.md` — quyết định kiến trúc chốt (Kafka topics, BFF Direct, outbox pattern).
- `docs/superpowers/plans/2026-05-08-phase-3-payment-implementation-plan.md` — pattern triển khai outbox đã chứng minh ổn định (sẽ tái sử dụng cho `tenant.created`).

### 1.2 Quét code hiện tại (state-of-the-world)

- `apps/saas/` — **rất tối giản**: chỉ có Tenant CRUD (`name`, `slug`, `isActive: boolean`).
- `libs/entities/src/lib/tenant.entity.ts` — chỉ 4 cột: `id`, `name`, `slug`, `isActive`.
- `apps/saas/src/services/saas.service.ts` — slugify rất sơ khai (regex `[^a-z0-9_\s-]` → KHÔNG hỗ trợ Unicode tiếng Việt; "Phở Hà Nội" sẽ ra `ph-h-n-i` thay vì `pho-ha-noi`).
- `libs/constants/src/lib/enum/tcp-request-message.ts::SAAS` — chỉ có `CREATE/GET_BY_ID/GET_BY_SLUG/GET_LIST/UPDATE/DELETE/HEALTH`.
- `libs/constants/src/lib/enum/role.enum.ts::PERMISSION` — chỉ có `SAAS_CREATE/GET_BY_ID/GET_LIST/UPDATE/DELETE`. **Không có** `SUBSCRIPTION_*`, `PLAN_*`, `TENANT_SUSPEND`, `TENANT_ACTIVATE`.
- `apps/bff/src/app/modules/saas/` — đã có `SaasController` (REST `/saas`), `CurrentTenantController` (`/admin/tenant/current`), `PublicTenantController` (`/public/tenants/:slug`). **Chưa có** `/admin/tenants` quản lý cross-tenant; chưa có `/admin/plans`; chưa có `/dashboard/subscription`.
- `apps/management-app/src/app/(admin)/admin/{tenants,plans}/page.tsx` — **chỉ là FeaturePlaceholder** (mỗi file 11 dòng).
- `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx` — **placeholder**.
- `libs/schemas/src/lib/user.schema.ts` — User MongoDB schema **KHÔNG có `tenantId`** field. Đây là gap nghiêm trọng cho Phase 4B/4C (xem §3.4).
- `libs/guards/src/lib/tenant.guard.ts` — đã có TenantGuard verify `tenant_id` từ JWT claim. **Không** có check tenant status (Active/Suspended) — luôn cho qua nếu khớp tenant.
- `apps/saas/src/main.ts` — SaaS service chỉ kết nối TCP, **không có Kafka producer**, **không có Redis client**, **không có Schedule module**.
- `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts::createUser` — đã hỗ trợ truyền `tenantId` vào Keycloak attributes; chưa có `assignRole` (gán role sau khi create) và chưa có `disableUser` / `setPassword` / `sendEmailActions`.
- **Không có** `@nestjs/schedule` trong `package.json` → cron auto-suspend cần thêm dependency.
- **Không có** thư viện slugify Unicode-aware (sample `slugify`, `@sindresorhus/slugify`) → cần thêm.
- **Không có** `Authorizer` cache-bust API (UserGuard cache `user-token:{sha256(jwt)}` 30 phút, Phase 4B suspend không có cách invalidate ngay).

### 1.3 Quy ước đã áp dụng tại codebase

- **Database-per-Service** + discriminator column `tenant_id` (§5 architecture).
- **Guard chain BFF:** `UserGuard → TenantGuard → PermissionGuard` (sẽ thêm `TenantPlanGuard` ở Phase 4B).
- **Kafka 4P+2AP:** chỉ 5 topics chính (đã có `order.confirmed`, `payment.completed`, `payment.refunded`, `kitchen.sla_warning`); Phase 4B sẽ thêm `tenant.created`.
- **BFF Direct Pattern (AP1):** UI side-effects qua TCP response, không qua Kafka.
- **Redis Access Policy (§11.2):** SaaS hiện **không** trong tier nào — Phase 4B yêu cầu thêm Redis cho cờ suspend; phải cập nhật policy.
- **Simplified Outbox Pattern:** Order/Payment đã chứng minh; SaaS sẽ tái sử dụng cho `tenant.created`.

---

## 2. Tóm Tắt Audit (Executive Summary)

Phase 4B là phase **đặt nền móng SaaS thực sự** — cho đến hiện tại, hệ thống vận hành đa tenant chỉ qua `tenant_id` claim trong JWT + `Tenant.isActive: boolean`, không có lifecycle, không có subscription, không có gating. Điều này nghĩa là:

> **Phase 4B không phải "thêm tính năng" — đây là phase đưa hệ thống từ "giả lập multi-tenant" sang "SaaS có thể vận hành thực".**

Đánh giá tổng quan:

- **Nghiệp vụ:** Phase doc rõ ý định nhưng **thiếu nhiều quyết định cụ thể** (xem §6 — câu hỏi chốt hạ): policy reserved slug, policy renew/upgrade subscription, hành vi đối với active session khi suspend, time-zone cho cron, delete vs close, owner credentials handoff, feature gating granularity.
- **Kiến trúc:** Pattern outbox + BFF Direct đã chứng minh trong Phase 3 — **kế thừa được toàn bộ**. Rủi ro lớn nhất là **Authorizer JWT cache 30 phút** khiến suspend không có hiệu lực ngay nếu không có cơ chế invalidate.
- **Schema:** Code hiện tại lệch xa ERD planning. Cần migration lớn cho `tenants` (status enum, owner_id, currency, locale, operating_modes), tạo mới `pricing_plans`, `subscriptions`. Phải làm cùng commit để không vỡ migration.
- **Phụ thuộc chéo:** Phase 4B phải làm trước hoặc song song Phase 4A (saga), nhưng Phase 4C (Notification + Staff) **phụ thuộc** Phase 4B (cần `tenant.created` Kafka contract + tenant_id trên User schema).

---

## 3. Phát Hiện Rủi Ro / Mâu Thuẫn / Conflict (Discrepancy Inventory)

### 3.1 Schema lệch tài liệu

| #   | Conflict                                                                                                                                                                                                                                                                                              | Mức độ     | Ghi chú                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| C1  | `Tenant` entity (code) chỉ có `name/slug/isActive`. ERD + technical-architecture §6.2.3 yêu cầu thêm: `status (enum: ACTIVE/SUSPENDED/CLOSED)`, `default_currency`, `default_locale`, `operating_modes[]`, `owner_id`, `address`, `type` (cafe/restaurant/pub).                                       | **Cao**    | Yêu cầu migration; cần đồng bộ ERD ↔ entity ↔ DTO.          |
| C2  | `Tenant.isActive: boolean` **trùng nghĩa** với `status: ACTIVE/SUSPENDED/CLOSED`. Sau Phase 4B, một trong hai phải bị deprecate (đề xuất: giữ `status`, drop `isActive` hoặc derive `isActive = status === ACTIVE`).                                                                                  | **Cao**    | Quyết định API contract; ảnh hưởng `PublicTenantMetadataDto`. |
| C3  | Bảng `pricing_plans` và `subscriptions` **chưa tồn tại trong code** dù ERD đã thiết kế. Phase 4B phải bootstrap từ đầu.                                                                                                                                                                               | **Cao**    | Cần seeder cho 3 plans mặc định (Free/Basic/Premium).         |
| C4  | `User` schema (MongoDB `qrtable_auth`) **không có `tenantId`** field. User được liên kết tenant chỉ qua **Keycloak custom claim** (`tenant_id` attribute), không có ở application profile layer. Phase 4C (Staff Mgmt) yêu cầu list staff theo tenant — sẽ KHÔNG hoạt động nếu không thêm `tenantId`. | **Cao**    | Migration MongoDB + sửa `UserService.upsertByIdentity`.       |
| C5  | ERD dùng `payment_method = stripe` nhưng Phase 3 đã chuyển sang `VIETQR` (SePay). ERD cần update.                                                                                                                                                                                                     | Trung bình | Đã ghi nhận ở phase-3 audit, vẫn cần đồng bộ.                 |
| C6  | `TenantTcpResponse = Tenant` trong `libs/interfaces/src/lib/tcp/saas/saas-response.interface.ts` lộ toàn bộ entity (kể cả audit fields). Sau khi mở rộng `Tenant` sẽ lộ `subscription_id`, `owner_id` → vi phạm dictum "Response DTO phải tách entity".                                               | Trung bình | Cần tách `TenantSummaryTcpResponse` (admin) vs `Public...`.   |

### 3.2 Logic / hành vi không khớp

| #   | Conflict                                                                                                                                                                                                                                                                                                                             | Mức độ     | Ghi chú                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------- |
| C7  | Phase 4B nói: **"slug generation: Phở Hà Nội → pho-ha-noi"**. Code hiện tại `makeSlug()` là `value.toLowerCase().replace(/[^a-z0-9_\s-]/g, '').replace(/\s+/g, '-')` → "Phở Hà Nội" sẽ ra **"ph-h-n-i"** (mất hết dấu tiếng Việt). Cần Unicode normalization (NFD + strip diacritics).                                               | **Cao**    | Acceptance criteria không pass nếu giữ logic cũ.                                |
| C8  | Phase 4B nói "**reserved words** (admin, api, www, app, ...)". Code hiện tại không có check này. Cần const list + slug regex validator.                                                                                                                                                                                              | Trung bình | Phải định nghĩa list rõ ràng (xem Q4).                                          |
| C9  | Phase 4B yêu cầu `Active → Suspended → Active → Closed`. Code chỉ có `isActive: boolean` → không thể phân biệt "đã đóng vĩnh viễn" vs "tạm khóa". Cần state machine + transition guards.                                                                                                                                             | **Cao**    | Closed ≠ Suspended (Closed không thể activate lại).                             |
| C10 | Phase 4B nói "**suspend → block operations qua Redis flag**", nhưng existing `TenantGuard` (`libs/guards/src/lib/tenant.guard.ts`) **không** check Redis flag — chỉ verify `tenant_id` claim. Phải thêm guard mới hoặc mở rộng `TenantGuard`.                                                                                        | **Cao**    | Quyết định: extend `TenantGuard` hay tạo `TenantStatusGuard`.                   |
| C11 | Phase 4B yêu cầu **402 Payment Required** khi vượt limit. Code hiện tại không có error code 402 trong `ErrorCode` enum. Cần thêm `TENANT_PLAN_LIMIT_EXCEEDED` + `BusinessException` mapping HTTP 402.                                                                                                                                | Trung bình | NestJS không có sẵn `PaymentRequiredException` — cần custom.                    |
| C12 | Phase 4B yêu cầu **Authorizer cache invalidation** ngầm (không nói rõ): JWT cache `user-token:{sha256(token)}` TTL 30 phút (xem `permission-matrix.md` §8.3) → suspend tenant **không có hiệu lực ngay** trong worst case 30 phút. Cần cơ chế cache-bust hoặc pattern `tenant:{id}:suspended` Redis flag được check ở mọi guard.     | **Cao**    | Đề xuất: dùng Redis flag short-circuit trước cache token.                       |
| C13 | Phase 4B nói "**WAITER cancel → suspend khiến staff tại quán không bán được nữa**" nhưng KHÔNG nói gì về: (a) Active session đang dở dở dang khi suspend (khách đã quét QR, đã đặt món, chưa thanh toán) (b) Bill `PENDING_PAYMENT` đang chờ chuyển khoản SePay (c) WebSocket connection của staff/customer hiện tại                 | **Cao**    | Cần policy "graceful suspend" hoặc "hard suspend" (xem Q9).                     |
| C14 | Phase 4B "auto-suspend cron daily" — không nói rõ: (a) Time-zone (UTC vs Asia/Ho_Chi_Minh) (b) Grace period (suspend ngay khi `expires_at < now()` hay sau X ngày) (c) Behavior khi cron fail (retry, alert)                                                                                                                         | Trung bình | Quyết định ở Q5.                                                                |
| C15 | Phase 4B "**Onboarding API tạo tenant + Owner Keycloak + seed default + assign Free plan**" — đây là **distributed transaction xuyên 4 boundary** (SaaS PG + Keycloak + Catalog PG + User-Access Mongo). Phase 4A (saga) chưa hoàn thành → có thể không có infra saga sẵn sàng. Cần quyết định: chờ Phase 4A hay tự build mini-saga. | **Cao**    | Xem Q7. Nếu fail giữa chừng (KC tạo user OK, DB tạo tenant fail) → orphan user. |
| C16 | Phase 4B `tenant.created` Kafka topic — **chưa có Kafka producer trong SaaS service** (`apps/saas/src/main.ts` chỉ có TCP). Phải thêm KafkaJS + outbox table + cron publisher (theo pattern Order/Payment).                                                                                                                          | Trung bình | Tăng phạm vi ~1 ngày dev.                                                       |
| C17 | Phase 4B "tenant.suspended **không** Kafka, dùng Redis flag" — nhưng Phase 4C `notification-staff.md` Step 4.5 gợi ý "warning email cho Owner khi suspend" → cần channel để notify SaaS → Notification. Không có Kafka topic, vậy cách nào? Phase 4C bảo "SaaS Service trực tiếp hoặc cron job" — chưa rõ.                           | Trung bình | Quyết định ở Q11.                                                               |
| C18 | Phase 4B "Tenant Onboarding MVP admin-assisted" yêu cầu **SUPER_ADMIN** call `POST /admin/tenants` + provide owner email/password. Nhưng business-logic.md §1 mô tả **chủ quán tự đăng ký** (self-service registration). Phase doc nói self-service là "nice-to-have" nhưng không phân biệt rõ luồng auth khác nhau giữa 2 actor.    | Trung bình | Self-service yêu cầu OTP/email verification trước khi tạo tenant — scope sau.   |
| C19 | Phase 4B Step 4.4 admin UI mention `/admin/plans` cho SUPER_ADMIN; không nói đến **migration/seed Free plan mặc định**. Free plan phải có sẵn ngay sau migration để onboarding đầu tiên hoạt động. Cần `apps/saas/src/seeder/pricing-plans.json`.                                                                                    | Nhỏ        | Pattern giống `apps/user-access/src/seeder/role.json`.                          |

### 3.3 Permission matrix gap

| #   | Conflict                                                                                                                                                                                                                                                                                                                             | Mức độ     | Ghi chú                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------- |
| C20 | Permission matrix hiện tại có `SAAS_CREATE/GET/UPDATE/DELETE` (5 quyền). Phase 4B cần phân biệt: - `tenant.suspend` (SUPER_ADMIN) — admin hành chính - `tenant.activate` (SUPER_ADMIN) - `tenant.close` (SUPER_ADMIN, irreversible) - `tenant.onboard` (SUPER_ADMIN) — admin-assisted onboarding - `tenant.read_own` (OWNER/MANAGER) | **Cao**    | Gộp `saas.`_ hay tách `tenant.`_/`subscription.`_/`plan._`? Xem Q3. |
| C21 | OWNER/MANAGER cần xem subscription của tenant mình. Hiện không có permission `subscription.get_own` hay tương tự. Mặc nhiên SUPER_ADMIN-only sẽ chặn UI `/dashboard/subscription`.                                                                                                                                                   | Trung bình | Tách permission theo phạm vi (own vs cross-tenant).                 |
| C22 | `BFF/admin/tenant/current` controller dùng `PERMISSION.CATALOG_GET_LIST` — semantic mismatch (đọc tenant metadata không phải catalog). Tại sao? Có thể do tránh thêm permission. Phase 4B nên sửa thành `tenant.read_own` hoặc `subscription.get_own`.                                                                               | Nhỏ        | Refactor thuần khi có permission mới.                               |
| C23 | Self-service registration (nice-to-have) là **public endpoint** — không có user role nào. Phải design như SePay webhook (no `@Permissions`, có rate limit + CAPTCHA + email verification).                                                                                                                                           | Trung bình | Nếu chốt làm self-service, cần thêm guard custom.                   |

### 3.4 Cross-cutting (FE / Notification / Real-time)

| #   | Conflict                                                                                                                                                                                                                                                                                                                              | Mức độ     | Ghi chú                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| C24 | Phase 4B yêu cầu UI `/admin/tenants` + `/admin/plans` + `/dashboard/subscription`. FE codebase đã có 3 file route này nhưng đều là `<FeaturePlaceholder/>`. Cần xác định range FE work (TanStack Query hooks, forms, RBAC sidebar lọc).                                                                                               | Trung bình | Hợp tác với frontend-specialist agent.                     |
| C25 | Customer PWA: khi tenant bị suspend, customer đã quét QR vào bàn → vẫn còn `session_id` valid trong Redis → SessionGuard hiện không check tenant status → customer vẫn xem menu/đặt món được. Cần thêm tenant suspend check vào SessionGuard.                                                                                         | **Cao**    | Bug bảo mật tiềm ẩn nếu chỉ block ở UserGuard.             |
| C26 | WebSocket: khách đã connected vào `session:{sid}:customer` room — khi suspend, không có cơ chế disconnect chủ động. Phase 4B không nói cách nào notify FE (banner "cửa hàng tạm khóa") cho session active.                                                                                                                            | Trung bình | Đề xuất: BFF emit WS `tenant.suspended` → FE force logout. |
| C27 | Phase 4B `tenant.created → Catalog seed "1 area Khu vực chung"`. Catalog hiện tại không có Kafka consumer cho `tenant.created`. Phase 4C cũng đợi event này cho Notification welcome email. Phải tạo cùng lúc 2 consumer (Catalog seeder + Notification welcome). Phase 4B owns producer, phải coordinate consumer interfaces với 4C. | Trung bình | Contract test giữa producer/consumer.                      |
| C28 | Bill ownership đã chuyển sang Order Service (Phase 3). Khi tenant đóng (Closed), data orders/bills lịch sử nên giữ (audit) hay xóa (GDPR)? Phase 4B không nói. Mặc định: **giữ với soft-delete** (đồng nhất pattern hiện tại).                                                                                                        | Nhỏ        | Liên quan compliance.                                      |
| C29 | Phase 4B nói feature gating `max_orders_per_day` — nhưng "per day" cần counter (Redis incr với daily key, ví dụ `tenant:{id}:orders:2026-05-10`). Time-zone của "ngày" phải khớp `Tenant.default_locale` hay UTC? Phase doc không nói.                                                                                                | Trung bình | Khác `max_orders_per_session` đã có ở Phase 4A.            |

---

## 4. Làm Rõ Logic Nghiệp Vụ (Deep Dive)

### 4.1 Tenant Lifecycle (State Machine)

Chuẩn hóa state machine — bám doc nhưng làm chặt edge case:

```
                          ┌────────────────────┐
                          │     [draft]        │  (chỉ tồn tại trong onboarding TX,
                          │ optional intermediate│   không persist nếu fail giữa chừng)
                          └─────────┬──────────┘
                                    │ onboarding success
                                    ▼
       ┌──────────────────────► [ACTIVE]  ◄──────────────────────┐
       │                            │                             │
       │ activate                   │ suspend                     │
       │ (admin or renew)           │ (admin or expired)          │
       │                            ▼                             │
       │                       [SUSPENDED]                        │
       │                            │                             │
       │                            │ close (admin, irreversible) │
       │                            ▼                             │
       │                         [CLOSED] ◄──────────────────────┘
       │                            │
       │                            │ no transition out (terminal)
       └────────────────────────────┘
```

**Quy tắc:**

- `ACTIVE → SUSPENDED`: trigger bởi (a) cron hết hạn subscription, (b) admin manual, (c) policy violation (tương lai).
- `SUSPENDED → ACTIVE`: trigger bởi (a) renew subscription, (b) admin manual unblock.
- `* → CLOSED`: chỉ admin, **irreversible**, không thể activate lại. Tài nguyên Keycloak (user OWNER) bị disable, dữ liệu giữ lại 90 ngày (policy tùy chọn — Q12) rồi mới hard-delete.
- `CLOSED →` : không có transition.

**Side-effects mỗi transition:**

| Transition         | Side-effect (sync, atomic)                                                                                                                   | Side-effect (async, eventual)                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Onboard → ACTIVE   | (1) Create tenant row, (2) KC create user, (3) MongoDB user upsert, (4) Catalog seed area, (5) Assign Free plan, (6) Outbox `tenant.created` | Notification welcome email (Phase 4C); Catalog optional seed extra (categories)      |
| ACTIVE → SUSPENDED | Set `tenant.status=SUSPENDED`, set Redis flag `tenant:{id}:suspended=1`                                                                      | (Optional) Notification "tenant suspended" email; (Optional) WS broadcast disconnect |
| SUSPENDED → ACTIVE | Set status, DEL Redis flag                                                                                                                   | (Optional) Notification renew confirmation                                           |
| → CLOSED           | Set status, set Redis flag, KC disable Owner user                                                                                            | Schedule data retention cleanup cron (T+90 days)                                     |

### 4.2 Subscription / Plan Domain

**Pricing Plan (platform-level, không có `tenant_id`):**

| Field                | Type               | Mô tả                                                |
| -------------------- | ------------------ | ---------------------------------------------------- |
| `id`                 | UUID               | PK                                                   |
| `code`               | varchar(40) UNIQUE | `FREE`, `BASIC`, `PREMIUM`                           |
| `name`               | varchar(80)        | Hiển thị: "Miễn phí", "Cơ bản", "Cao cấp"            |
| `price_vnd`          | bigint             | Giá tháng (0 cho Free)                               |
| `max_tables`         | int                | -1 = unlimited                                       |
| `max_staff`          | int                | -1 = unlimited                                       |
| `max_orders_per_day` | int                | -1 = unlimited                                       |
| `features_json`      | jsonb              | Tag features (`analytics`, `multi_branch`, ...)      |
| `is_active`          | boolean            | Hide deprecated plans without breaking subscriptions |
| `display_order`      | int                | UI sort                                              |

**Subscription:**

| Field                | Type                 | Mô tả                                                                         |
| -------------------- | -------------------- | ----------------------------------------------------------------------------- |
| `id`                 | UUID PK              |                                                                               |
| `tenant_id`          | UUID NOT NULL        | FK logical → tenants                                                          |
| `pricing_plan_id`    | UUID NOT NULL        | FK → pricing_plans                                                            |
| `starts_at`          | timestamptz NOT NULL |                                                                               |
| `expires_at`         | timestamptz NOT NULL | NULL nếu trial vô hạn (đặc biệt Free plan có expires_at = NULL)               |
| `status`             | enum                 | `ACTIVE`, `EXPIRED`, `SUPERSEDED` (khi user upgrade qua plan mới), `CANCELED` |
| `created_by_user_id` | UUID                 | Admin nào assign                                                              |
| `created_at`         | timestamptz          |                                                                               |
| `updated_at`         | timestamptz          |                                                                               |

**Đặc tả quan trọng:**

- **Mỗi tenant chỉ có MỘT subscription `ACTIVE` tại một thời điểm.** UNIQUE partial index `(tenant_id) WHERE status='ACTIVE'`.
- Khi assign plan mới: cũ → `SUPERSEDED`, mới → `ACTIVE`. Audit chain bằng `superseded_by_subscription_id` (optional).
- Khi cron detect `expires_at < now()` && `status=ACTIVE` → set `EXPIRED` + trigger `ACTIVE → SUSPENDED` cho tenant.
- Free plan: `expires_at = NULL` → KHÔNG bị cron auto-suspend (ngoại trừ admin manual).

### 4.3 Onboarding Flow (Admin-Assisted, MVP)

```
SUPER_ADMIN gọi POST /api/v1/admin/tenants/onboard
Body: { name, ownerEmail, ownerPassword?, ownerFirstName, ownerLastName, planCode? = "FREE" }

Pipeline (mini-saga in SaaS service):

  Step 1: Validate input
    - name: required, length 2-120
    - ownerEmail: valid email format
    - planCode: must exist in pricing_plans + is_active

  Step 2: Generate slug
    - Unicode normalize → strip diacritics → lowercase → kebab-case
    - Check reserved words list
    - Check uniqueness; if collision → append random suffix (-1, -2, ..., or 4-char hex)

  Step 3: BEGIN DB transaction (qrtable_saas)
    Step 3a: INSERT tenant (status=ACTIVE, owner_id=null tạm)
    Step 3b: INSERT subscription (plan=FREE, starts_at=now, expires_at=null)
    Step 3c: INSERT outbox_events (topic=tenant.created, payload incl ownerEmail)

  Step 4: Call Authorizer TCP → Keycloak Admin API:
    - createUser({ email, password|generated, firstName, lastName, tenantId, role=OWNER })
    - assignRealmRole(userId, "OWNER")
    - Return userId

  Step 5: Update tenant.owner_id = userId
  Step 6: Call User-Access TCP → upsert user profile { userId, email, tenantId, role=OWNER }
  Step 7: COMMIT DB transaction (qrtable_saas)
  Step 8: Return { tenant, owner, subscription, temporaryPassword? }

Cron outbox publisher → Kafka publishes `tenant.created`
  → Catalog consumer: seed default area "Khu vực chung"
  → Notification consumer (Phase 4C): send welcome email

Compensation if failure:
  - Step 4 fail: rollback DB → return 502
  - Step 5/6 fail: KC user created nhưng DB chưa link → mark for cleanup
    (cron daily quét KC user mà MongoDB profile không tồn tại → disable + log)
```

**Lý do mini-saga thay vì full Saga + Compensation framework:**

- Phase 4A (saga framework chính thức) chưa xong; không nên block Phase 4B chờ.
- 4 bước là biên giới đủ nhỏ; outbox + try/catch + cleanup cron đã đủ pragmatic cho thesis.
- Nếu Phase 4A xong trước, có thể refactor thành saga formal sau.

### 4.4 Feature Gating Strategy

**Hai layer gating:**

| Layer                          | Mục đích                                               | Trigger                                         |
| ------------------------------ | ------------------------------------------------------ | ----------------------------------------------- |
| **L1 — Quota check tại biên**  | "Bàn thứ 11 bị chặn" — chặn write op khi đã chạm limit | Trước khi INSERT (BFF guard hoặc service guard) |
| **L2 — Feature flag tại biên** | "Plan này không có analytics module"                   | Route-level guard (BFF)                         |

**L1 Implementation options (xem Q6):**

- **A. BFF `TenantPlanGuard` (đề xuất chính):** Guard ở BFF gọi `Saas.getCurrentSubscription` (TCP, có Redis cache 5 phút) → check counter từ target service (ví dụ `Catalog.countTables(tenantId)` qua TCP).
- **B. Decentralized (target service tự check):** Catalog Service tự check `getCurrentSubscription` mỗi lần create table. Trade-off: gateway service `saas` thành dependency runtime của mọi write service → coupling cao.
- **C. Hybrid:** L1 check tại BFF guard cho UX nhanh, target service backup check cho integrity. Đề xuất nếu thời gian cho phép.

**Counter sources:**

- `max_tables`: COUNT query từ Catalog DB (TCP `catalog.count_tables`).
- `max_staff`: COUNT từ User-Access (TCP `user.count_by_tenant`).
- `max_orders_per_day`: Redis counter `quota:{tenant_id}:orders:{YYYY-MM-DD}` với TTL 48h. Increment trong Order Service tại submit. **Time-zone:** dùng `Tenant.default_locale` để compute date boundary; mặc định Asia/Ho_Chi_Minh nếu locale bắt đầu `vi`.

**Response format khi vượt:**

```json
HTTP 402 Payment Required
{
  "data": null,
  "statusCode": 402,
  "message": "TENANT_PLAN_LIMIT_EXCEEDED",
  "details": {
    "limit_type": "max_tables",
    "limit_value": 10,
    "current": 10,
    "plan_code": "FREE",
    "upgrade_url": "/dashboard/subscription"
  },
  "duration": "12ms",
  "processID": "..."
}
```

### 4.5 Suspend Mechanism (Hot-path Block)

**Layered defense:**

1. **Cờ Redis (fast path, low TTL):** `tenant:{tenant_id}:suspended` = `1` với no expire. Set khi suspend, DEL khi activate. Check trong **mọi guard** trước khi pass qua PermissionGuard.
2. **DB source of truth:** `tenants.status = SUSPENDED`. Là nguồn duy nhất khi rebuild Redis (cron warmup hoặc khi miss).
3. **Authorizer cache invalidation:** Khi suspend → SaaS publish event nội bộ (TCP hoặc Redis Pub/Sub) → Authorizer DEL tất cả `user-token:` key có `tenant_id = X`. Khó tìm key theo tenant → đề xuất: TTL ngắn hơn cho cache (5 phút) **HOẶC** thêm secondary index `tenant-tokens:{tenant_id} → SET<sha256(token)>`.
4. **WebSocket force-disconnect:** BFF emit `tenant.suspended` lên rooms `tenant:{id}:` và `session:{sid}:customer` → FE handler force logout / redirect tới landing page "Tạm khóa".

**Trade-off:**

| Approach                        | Pros                       | Cons                                                     |
| ------------------------------- | -------------------------- | -------------------------------------------------------- |
| Redis flag + Guard check        | Fast, simple               | Mỗi request +1 Redis hop                                 |
| Cache TTL ngắn (5 min)          | Không cần xóa key chủ động | Window 5 phút vẫn còn truy cập được                      |
| Secondary index `tenant-tokens` | Invalidate ngay            | Tăng phức tạp (phải maintain index khi login/cache miss) |

**Đề xuất:** Combo (1) + (4) cho Phase 4B. Bonus (3) khi cần tighten security sau.

### 4.6 Slug Generation (Detailed Algorithm)

```typescript
function generateSlug(rawName: string): string {
  // 1. Unicode NFD decomposition (separate base + combining marks)
  let s = rawName.normalize('NFD');
  // 2. Strip diacritics (Mn = Combining marks)
  s = s.replace(/[\u0300-\u036f]/g, '');
  // 3. Vietnamese-specific: đ/Đ → d
  s = s.replace(/[đĐ]/g, 'd');
  // 4. Lowercase
  s = s.toLowerCase();
  // 5. Strip non-alphanumeric (keep space and hyphen)
  s = s.replace(/[^a-z0-9\s-]/g, '');
  // 6. Collapse whitespace → hyphen
  s = s.trim().replace(/\s+/g, '-');
  // 7. Collapse multiple hyphens
  s = s.replace(/-{2,}/g, '-');
  // 8. Trim leading/trailing hyphens
  s = s.replace(/^-+|-+$/g, '');
  // 9. Length cap
  return s.slice(0, 80);
}

// Examples:
generateSlug('Phở Hà Nội'); // → "pho-ha-noi"
generateSlug('Cà-phê Highlands'); // → "ca-phe-highlands"
generateSlug('Đông Đô F&B'); // → "dong-do-fb"
generateSlug('ADMIN'); // → "admin" (collision with reserved!)
```

**Reserved words list (đề xuất ban đầu — xem Q4):**

```
admin, api, www, app, dashboard, public, static, assets, media, cdn, mail, smtp,
auth, login, signup, register, oauth, sso, health, metrics, status, debug,
help, support, docs, blog, system, root, sudo, owner, manager, staff,
qrtable, qr-table, qr_table, demo, test, staging, production
```

**Collision strategy:**

- First attempt: pure slug.
- Collision → append `-{counter}` (max 99).
- Vẫn collision → append `-{4-char-hex random}`.
- Vẫn collision (xác suất cực thấp) → throw `SAAS_SLUG_GENERATION_FAILED`.

### 4.7 `tenant.created` Kafka Contract

```typescript
type TenantCreatedEvent = {
  eventId: string; // UUID
  eventType: 'tenant.created';
  occurredAt: string; // ISO 8601 UTC
  tenantId: string;
  slug: string;
  name: string;
  type: 'CAFE' | 'RESTAURANT' | 'PUB' | 'OTHER';
  ownerUserId: string;
  ownerEmail: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  planCode: string;
  defaultCurrency: 'VND';
  defaultLocale: string;
  /** correlationId từ HTTP request gốc */
  correlationId: string;
};
```

**Consumers (định nghĩa contract trước, Phase 4B owns producer):**

- **Catalog Service:** seed `1 area "Khu vực chung"` cho tenant. Consumer group `catalog-tenant-created-consumer-group`.
- **Notification Service (Phase 4C):** send welcome email tới `ownerEmail`. Consumer group `notification-tenant-created-consumer-group`.

**Outbox table trong SaaS DB:** giống schema Order/Payment outbox (`outbox_events` table).

---

## 5. Phương Án Kiến Trúc & Công Nghệ Đề Xuất

### 5.1 Stack thêm cho Phase 4B

| Concern                | Đề xuất                                                               | Lý do                                                                             |
| ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Cron scheduler         | `@nestjs/schedule` (^4 hoặc ^5 latest)                                | Standard NestJS, ít phức tạp; chạy single-instance OK cho thesis.                 |
| Slug Unicode           | `slugify` (npm package) hoặc tự viết (xem §4.6)                       | `slugify` nhỏ gọn, hỗ trợ tiếng Việt. Hoặc tự code 30 dòng — kiểm soát hoàn toàn. |
| Kafka producer in SaaS | Tái sử dụng pattern `OutboxPublisherService` từ Order/Payment         | Đã chứng minh, không vẽ lại bánh xe.                                              |
| Redis client in SaaS   | Module `RedisProvider` đã có trong `libs/providers/`                  | Cần update Redis Access Policy (§11.2) để thêm SaaS Tier 5.                       |
| Cache subscription     | `@nestjs/cache-manager` với key `tenant:{id}:subscription` TTL 5 phút | Giảm tải TCP `Saas.getCurrentSubscription`.                                       |

### 5.2 Service responsibility (đề xuất)

| Service                                                          | Thêm responsibility Phase 4B                                                                                                                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SaaS**                                                         | Tenant CRUD + status machine, Subscription CRUD, Plan CRUD, Slug generator + reserved check, Cron auto-suspend, Onboarding orchestrator (mini-saga), Outbox `tenant.created`                                |
| **Authorizer**                                                   | Mở rộng `KeycloakHttpService`: `assignRealmRole`, `disableUser`, `getUserById`, `setTemporaryPassword`                                                                                                      |
| **User-Access**                                                  | Thêm `tenantId` vào `User` schema; method `upsertByIdentity` cập nhật tenantId; method `countByTenant` cho L1 gating max_staff                                                                              |
| **Catalog**                                                      | Add Kafka consumer `tenant.created` → seed area "Khu vực chung"; Add TCP `catalog.count_tables` cho L1 gating                                                                                               |
| **Order**                                                        | Thêm Redis counter logic `max_orders_per_day`; bump counter trong submit                                                                                                                                    |
| **BFF**                                                          | Thêm `TenantPlanGuard` (composable với existing `PermissionGuard`); thêm `TenantStatusGuard` check Redis suspend flag; thêm controllers `/admin/tenants/onboard`, `/admin/plans`, `/dashboard/subscription` |
| **Notification** (Phase 4C, nhưng SaaS phải coordinate contract) | Document consumer contract `tenant.created` để Phase 4C implement                                                                                                                                           |

### 5.3 Migration sequence (an toàn)

Bắt buộc theo thứ tự:

1. **Migration 1 (qrtable_saas):** Add columns `status` (enum), `default_currency`, `default_locale`, `operating_modes` (text[]), `owner_id`, `address`, `type`. Backfill `status = isActive ? 'ACTIVE' : 'SUSPENDED'`. Keep `is_active` column với computed default cho backward-compat.
2. **Migration 2 (qrtable_saas):** Create `pricing_plans`, `subscriptions` tables. Seed 3 default plans. For each existing tenant: insert subscription with planCode=`FREE` + expires_at=NULL.
3. **Migration 3 (qrtable_saas):** Create `outbox_events` table (clone schema from Order's).
4. **Migration 4 (qrtable_auth Mongo):** Add `tenantId` field to User. Backfill từ Keycloak `attributes.tenant_id` hoặc batch script.
5. **Code release 1:** Backend SaaS service mới (without cron); BFF guards mới; Frontend admin UI placeholders.
6. **Code release 2:** Cron auto-suspend; Catalog Kafka consumer.
7. **Code release 3:** FE complete (admin/tenants, /admin/plans, /dashboard/subscription real API).

### 5.4 Tham khảo SaaS pattern

- **Stripe Billing model** (subscription + plan + usage): pattern "Active Subscription per Customer" đã cải biên cho thesis.
- **Auth0 Tenant model:** mỗi tenant = isolated namespace; tham khảo cho slug + custom domain (post-thesis).
- **AWS Organizations:** root account vs member accounts → analog SUPER_ADMIN vs OWNER trong QRTable.

---

## 6. Câu Hỏi Chốt Hạ (Decision Questions)

> Mỗi câu kèm **khuyến nghị của tôi** + **trade-off** để bạn cân nhắc nhanh.

### Q1. Quan hệ giữa `Tenant.isActive` (cũ) và `Tenant.status` (mới)?

**Lựa chọn:**

| Option | Mô tả                                                                                                     | Pros                                    | Cons                                       |
| ------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------ |
| A      | Drop `isActive`, chỉ giữ `status`                                                                         | Single source of truth                  | Breaking change — phải update mọi consumer |
| B      | Giữ cả 2, `isActive = (status === 'ACTIVE')` derived (computed in mapper)                                 | Backward-compat                         | Field trùng lặp, có thể lệch khi bug       |
| C      | Giữ `isActive` cho `Public`/`Current` DTO (boolean đơn giản cho FE customer), thêm `status` cho admin DTO | UX customer đơn giản, admin có chi tiết | 2 mapping lớp                              |

**Khuyến nghị: C.** Customer PWA chỉ cần biết "open/closed" (boolean → check `isActive`); admin/dashboard cần phân biệt 3 state (`status`). Mapper xử lý derive trong DTO layer.

---

### Q2. Hành vi khi tenant `SUSPENDED` đối với customer đang có session?

**Lựa chọn:**

| Option | Mô tả                                                                                                                          | Pros                          | Cons                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------------------------------------------------- |
| A      | **Hard cut:** SessionGuard reject 403 ngay; FE customer hiển thị "Cửa hàng tạm khóa, vui lòng liên hệ"                         | Bảo vệ tài chính tuyệt đối    | UX đột ngột; bill `PENDING_PAYMENT` chưa thanh toán bị treo |
| B      | **Read-only:** customer xem được cart/order đã đặt nhưng không submit thêm; cho phép thanh toán bills `PENDING_PAYMENT` đã tạo | UX mềm; staff có thể tất toán | Phức tạp guard logic; cần whitelist endpoints               |
| C      | **Grace period:** sau suspend cho phép thêm 30 phút "đóng cửa nhẹ" rồi mới hard cut                                            | Cân bằng                      | Cần cron + TTL Redis flag                                   |

**Khuyến nghị: B.** Tenant suspend thường do hết hạn subscription (lỗi business, không phải fraud). Cho phép tất toán bills đang dở giảm khiếu nại; chặn write mới (submit order, create bill mới). Implement bằng `TenantStatusGuard` với whitelist permissions: `payment.confirm_cash`, `payment.create` (refund), `order.get_`.

---

### Q3. Cấu trúc PERMISSION cho Phase 4B?

**Lựa chọn:**

| Option | Mô tả                                                                                                             | Pros                        | Cons                                   |
| ------ | ----------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------- |
| A      | Mở rộng namespace `saas.`: thêm `saas.suspend`, `saas.activate`, `saas.close`, `saas.onboard`, `saas.read_own`    | Ít domain mới; quen pattern | Tên dài, khó scan                      |
| B      | Tách 3 domain: `tenant.`_ (lifecycle), `subscription.`_, `plan.*`. Drop `saas.*` legacy hoặc deprecate            | Domain-driven, sạch         | Migration permission matrix nhiều dòng |
| C      | Hybrid: giữ `saas.*` cho admin CRUD, thêm `tenant.suspend/activate/close`, `subscription.read_own`, `plan.manage` | Vừa phải                    | Hơi không nhất quán                    |

**Khuyến nghị: B.** Phase 4B là cơ hội tốt để clean (legacy `saas.` chỉ có 5 quyền và đều SUPER_ADMIN-only). Migration:

```
saas.create     → tenant.create
saas.get_by_id  → tenant.read (or tenant.read_any cross-tenant)
saas.get_list   → tenant.list_all
saas.update     → tenant.update
saas.delete     → tenant.close
NEW: tenant.suspend, tenant.activate, tenant.onboard
NEW: subscription.assign, subscription.read_own (OWNER/MANAGER), subscription.list (admin)
NEW: plan.create, plan.read, plan.update, plan.delete
```

Phase 4B tăng từ 53 → ~64 permissions. Effort: 1-2 ngày update matrix + tests.

---

### Q4. Reserved slug list — ai duyệt + có configurable không?

**Lựa chọn:**

| Option | Mô tả                                                                                 | Pros                         | Cons                            |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| A      | Hardcoded const trong `libs/constants/src/lib/saas.constants.ts` (~40 keywords)       | Đơn giản, không cần admin UI | Phải code-deploy để update      |
| B      | DB table `reserved_slugs` (admin có thể thêm/xóa qua /admin/plans hoặc /admin/system) | Linh hoạt                    | Thêm 1 entity nữa cho thesis    |
| C      | Cấu hình env (comma-separated)                                                        | Trung bình                   | Khó manage list 40 từ trong env |

**Khuyến nghị: A.** Cho thesis MVP, hardcoded const đủ. Sau này nếu cần tự service, expand sang B. Const list trong Phase 4B PR chính thức (xem §4.6).

---

### Q5. Cron auto-suspend — schedule, time-zone, grace period?

**Lựa chọn:**

| Option | Mô tả                                                                                                       | Pros                            | Cons                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| A      | Cron daily 02:00 UTC, no grace, suspend ngay khi `expires_at < now()`                                       | Đơn giản, chuẩn xác             | Khách giờ Vietnam có thể bị suspend giữa rush dinner |
| B      | Cron daily 02:00 Asia/Ho_Chi_Minh (= 19:00 UTC trước đó), grace 24h (suspend khi `expires_at + 1d < now()`) | Friendly UX cho khách Việt      | 1 ngày "free" sau hết hạn                            |
| C      | Cron mỗi 15 phút với grace 0; gửi notification 3 ngày trước hết hạn (Phase 4C)                              | Phản ứng nhanh + cảnh báo trước | Cron load cao; Notification phụ thuộc Phase 4C       |

**Khuyến nghị: B + welcome notification của Phase 4C.** Grace 24h đủ thân thiện với chủ quán, không quá rộng. Time-zone Vietnam là target market chính. Cron `0 2 `\* \* với env `TZ=Asia/Ho_Chi_Minh`.

---

### Q6. Feature gating — chỗ nào enforce L1 (quota check)?

**Lựa chọn:**

| Option | Mô tả                                                                                           | Pros                   | Cons                                                     |
| ------ | ----------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| A      | **BFF `TenantPlanGuard` only** — gọi target service đếm trước, reject 402 trước khi forward TCP | Single point, UX nhanh | Race condition (counter có thể stale tới target service) |
| B      | **Target service only** (Catalog tự check khi create table, Order tự check khi submit)          | Strict integrity       | Mỗi service phải có TCP client tới SaaS                  |
| C      | **Hybrid:** BFF check optimistic (UX), target service check pessimistic trong TX (correctness)  | Cân bằng               | 2 nơi maintain logic                                     |

**Khuyến nghị: C.** Phase 4B baseline triển khai A + thêm optimistic test "trong TX" ở target service ở Phase 4A (hoặc TODO). Lý do: thesis demo cần UX nhanh + vẫn an toàn ở edge case (bàn thứ 11 khi đang đếm 10).

---

### Q7. Onboarding distributed transaction — chờ Phase 4A saga hay tự build mini-saga?

**Lựa chọn:**

| Option | Mô tả                                                                                                 | Pros                 | Cons                                       |
| ------ | ----------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------ |
| A      | Block Phase 4B đến khi Phase 4A xong, dùng saga formal                                                | Reuse infrastructure | Phase 4B bị delay; coupling phase          |
| B      | Mini-saga ngay trong SaasService với try/catch + cleanup cron (orphan KC users)                       | Phase 4B độc lập     | Code chỉ phục vụ một use case              |
| C      | Outbox + best-effort: Step 1-3 ghi DB + outbox; Step 4 (KC + assign role) làm sau qua outbox consumer | Atomic DB            | Onboarding response không đồng bộ — UX chờ |

**Khuyến nghị: B.** Mini-saga in-process với 4 steps + cleanup cron quét orphan KC users mỗi đêm. Khi Phase 4A xong, refactor thành saga formal (lift-and-shift). Trong scope thesis, đây là acceptable trade-off.

---

### Q8. Self-service registration wizard — scope Phase 4B hay defer?

**Lựa chọn:**

| Option | Mô tả                                                                                                      | Pros                                                | Cons                                          |
| ------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| A      | Defer hoàn toàn (admin-assisted only trong Phase 4B); self-service là Phase 5+ hoặc post-thesis            | Reduce scope; focus admin pattern                   | Demo thesis không có "đăng ký ngay" highlight |
| B      | Implement self-service nhưng GATED bởi feature flag `SELF_SERVICE_REGISTRATION_ENABLED=false` mặc định off | Có code nhưng không expose; demo chọn lúc trình bày | Tăng complexity 30%                           |
| C      | Implement đầy đủ (form 4 bước + email verification + CAPTCHA)                                              | Demo đẹp                                            | Tăng scope ~3-4 ngày; cần SMTP                |

**Khuyến nghị: A.** Phase doc đã ghi rõ "nice-to-have". Thesis demo chỉ cần luồng admin-assisted (SUPER_ADMIN onboard tenant) — đủ chứng minh kiến trúc multi-tenant. Self-service yêu cầu thêm SMTP (Phase 4C dependency) + CAPTCHA + email verification — ưu tiên thấp hơn các phase 5-7.

---

### Q9. Hành vi đối với active sessions/bills khi `SUSPENDED` (chi tiết hơn Q2)?

**Sub-questions:**

- Q9a: Bill `PENDING_PAYMENT` đang chờ SePay webhook — webhook đến khi tenant suspended thì sao?
  - **Khuyến nghị:** **Vẫn process** (idempotency: webhook xác nhận transaction đã xảy ra real). Set bill PAID, đóng session bình thường. Audit log `WEBHOOK_AFTER_SUSPEND`.
- Q9b: Order `PROCESSING` ở bếp khi suspend?
  - **Khuyến nghị:** Cho phép kitchen finish (`Processing → Ready → Served`); chỉ chặn create/confirm mới.
- Q9c: WebSocket connection của staff/customer hiện tại?
  - **Khuyến nghị:** BFF emit `tenant.suspended` qua WS rooms `tenant:{id}:`; FE handle: hiển thị banner cảnh báo, không force disconnect (tránh staff đang nhập đơn bị mất state).

---

### Q10. UI route structure cho admin — `/admin/tenants` thuộc Management App hay tách app riêng?

**Lựa chọn:**

| Option | Mô tả                                                                                                | Pros                        | Cons                                                              |
| ------ | ---------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| A      | Trong Management App, route `/admin/` chỉ accessible bởi SUPER_ADMIN (đã có cấu trúc `app/(admin)/`) | Đã có placeholder, tiếp tục | SUPER_ADMIN dùng chung app với tenant users → có thể nhầm context |
| B      | Tách app `admin-portal` riêng (subdomain `admin.qrtable.io`)                                         | Tách biệt rõ                | Tăng deploy 1 app + redo auth flow                                |

**Khuyến nghị: A.** Đã có cấu trúc `app/(admin)/admin/{tenants,plans}/page.tsx`. Middleware Next.js đã filter theo role. Tách app sau (post-thesis) khi traffic SUPER_ADMIN tăng.

---

### Q11. Suspend notification channel — Kafka, Direct TCP, hay không có?

**Lựa chọn:**

| Option | Mô tả                                                                                                      | Pros               | Cons                                                |
| ------ | ---------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------- |
| A      | Không notification (Phase 4B chỉ block, Phase 4C handle email sau)                                         | Phase 4B đơn giản  | Owner không biết vì sao bị suspend                  |
| B      | SaaS Service trực tiếp gọi Notification TCP (sync) khi suspend                                             | Atomic             | Tight coupling; vi phạm 4P P3 (không cross-context) |
| C      | Thêm Kafka topic `tenant.suspended` (vi phạm Phase 4B doc nói không Kafka)                                 | Domain event chuẩn | Chỉnh tài liệu                                      |
| D      | SaaS có TCP `notification.send_email` (giống pattern SaaS calls Authorizer) → "task" model thay vì "event" | Pragmatic          | Coupling vừa                                        |

**Khuyến nghị: A cho Phase 4B baseline; D nâng cấp khi Phase 4C ready.** Phase 4B doc đã rõ "tenant.suspended không Kafka". Phase 4C sẽ thêm `Notification.sendTenantSuspendedEmail` TCP endpoint, gọi bởi SaaS sau khi suspend transaction commit. Đề xuất "task model" thay "event model" cho non-domain notifications.

---

### Q12. Data retention khi `CLOSED` — giữ bao lâu? Hard delete?

**Lựa chọn:**

| Option | Mô tả                                                          | Pros             | Cons                                    |
| ------ | -------------------------------------------------------------- | ---------------- | --------------------------------------- |
| A      | Soft-delete forever (không xóa physical), block read trong API | Audit hoàn hảo   | Storage tăng vô hạn                     |
| B      | Soft-delete 90 ngày + cron hard-delete sau                     | Cân bằng         | Implement cron mới                      |
| C      | Defer (Phase 5+)                                               | Phase 4B nhỏ hơn | "Closed" hơi rỗng nghĩa nếu chỉ là flag |

**Khuyến nghị: C cho Phase 4B; B cho Phase 5+ (Compliance).** Trong scope thesis, `CLOSED` chỉ cần là transition không reversible + KC disable owner. Hard-delete cron là improvement post-thesis.

---

### Q13. Counter `max_orders_per_day` — Redis key time-zone?

**Lựa chọn:**

| Option | Mô tả                                                                | Pros         | Cons                                              |
| ------ | -------------------------------------------------------------------- | ------------ | ------------------------------------------------- |
| A      | UTC date: `quota:{tenant_id}:orders:2026-05-10` (UTC midnight reset) | Đơn giản     | Reset lúc 7 AM giờ Vietnam — confusing            |
| B      | Tenant locale date: parse `default_locale` → IANA TZ → format date   | UX chính xác | Phức tạp; cần TZ library (Luxon hoặc date-fns-tz) |
| C      | Hardcoded `Asia/Ho_Chi_Minh` cho mọi tenant (Việt Nam-only platform) | Pragmatic    | Không scale ra international                      |

**Khuyến nghị: C.** Phase doc + business doc đều xác nhận target market Việt Nam. Dùng `Asia/Ho_Chi_Minh` hardcoded; nếu sau này international hóa, refactor sang B.

---

### Q14. Migration legacy tenants (đang `isActive=true/false` chuyển sang `status`)?

**Sub-questions:**

- Q14a: Tenants hiện tại có Subscription không? (Không) → backfill với plan `FREE` vô hạn.
- Q14b: Tenants đang `isActive=false` → `status=SUSPENDED` hay `CLOSED`?
  - **Khuyến nghị:** `SUSPENDED` (an toàn, có thể khôi phục).
- Q14c: Có cần `default_currency='VND'`, `default_locale='vi-VN'` cho tất cả?
  - **Khuyến nghị:** Có. Backfill default trong migration.

---

### Q15. Tenant Onboarding API: trả về password tạm thời hay yêu cầu Owner đổi password lần đầu login?

**Lựa chọn:**

| Option | Mô tả                                                                                        | Pros                     | Cons                                            |
| ------ | -------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------- |
| A      | SUPER_ADMIN nhập password trong request → trả về tenant info (no password in response)       | Admin chủ động kiểm soát | Admin phải tự communicate password tới owner    |
| B      | System tự generate strong random password → trả về 1-time trong response (HTTPS, masked log) | UX admin nhanh           | Password truyền qua HTTP — risk nếu không HTTPS |
| C      | KC `Required Action: UPDATE_PASSWORD` + email reset link (cần SMTP — Phase 4C)               | Production-grade         | Phụ thuộc Phase 4C SMTP                         |

**Khuyến nghị: A cho Phase 4B; nâng cấp C khi Phase 4C ready.** Trong scope Phase 4B (no SMTP yet), accept admin nhập password thủ công. Phase 4C sẽ thay bằng email verification link.

---

## 7. Coverage Matrix — Đảm Bảo Không Bỏ Sót

| Khía cạnh                          | Phase 4B doc | Audit này                      | Spec sẽ cover |
| ---------------------------------- | ------------ | ------------------------------ | ------------- |
| Tenant CRUD                        | ✅           | ✅ + status enum               | ✅            |
| Slug generation Vietnamese         | ✅           | ✅ algorithm chi tiết          | ✅            |
| Reserved words                     | ✅           | ✅ list cụ thể                 | ✅            |
| Lifecycle Active/Suspended/Closed  | ✅           | ✅ state machine + transitions | ✅            |
| Auto-suspend cron                  | ✅           | ✅ TZ + grace + retry          | ✅            |
| Subscription model                 | ✅           | ✅ field-level spec            | ✅            |
| Plan CRUD                          | ✅           | ✅ + seeder                    | ✅            |
| Feature gating L1                  | ✅           | ✅ guard + Redis counter       | ✅            |
| 402 Response format                | ✅           | ✅ JSON shape                  | ✅            |
| Onboarding mini-saga               | ✅           | ✅ 8 steps + compensation      | ✅            |
| Kafka `tenant.created`             | ✅           | ✅ payload contract            | ✅            |
| Suspend Redis flag                 | ✅           | ✅ key naming + TTL            | ✅            |
| Authorizer cache invalidation      | ❌           | ✅ trade-off discussion        | ✅            |
| Active session khi suspend         | ❌           | ✅ Q2/Q9                       | ✅            |
| Bill `PENDING_PAYMENT` khi suspend | ❌           | ✅ Q9a                         | ✅            |
| WebSocket disconnect               | ❌           | ✅ Q9c                         | ✅            |
| User schema tenantId               | ❌           | ✅ C4                          | ✅            |
| Payment method ERD legacy          | ❌           | ✅ C5                          | ✅            |
| Self-service wizard                | nice-to-have | ✅ defer (Q8)                  | ❌ defer      |
| Permission matrix mở rộng          | partial      | ✅ migration plan (Q3)         | ✅            |
| FE Admin UI                        | ✅           | ✅ scope clarification         | ✅            |
| FE Subscription dashboard          | ✅           | ✅ list of fields              | ✅            |
| Migration ordering                 | ❌           | ✅ §5.3                        | ✅            |
| Data retention CLOSED              | ❌           | ✅ Q12 (defer)                 | ✅            |
| Time-zone counters                 | ❌           | ✅ Q13                         | ✅            |
| Owner password handoff             | ❌           | ✅ Q15                         | ✅            |
| Suspend notification channel       | partial      | ✅ Q11                         | ✅            |

---

## 8. Phụ Thuộc & Sequencing với Phase Khác

### 8.1 Bắt buộc trước Phase 4B

- ✅ Phase 0, 1, 2A, 2B (đã xong / sắp xong theo `implementation_plan.md`).
- ✅ Phase 3 (đã 70%) — bills/payments domain ổn định để L1 gating tham chiếu.

### 8.2 Phase 4B sẽ block / unblock cái gì?

- **Block Phase 4C (Notification + Staff Mgmt):** Phase 4C cần `tenant.created` Kafka contract + `User.tenantId` field. Phase 4B PHẢI hoàn thành 2 deliverable này trước khi 4C có thể bắt đầu.
- **Không block Phase 4A:** 4A và 4B độc lập (saga formal có thể đến sau, mini-saga của 4B đủ pragmatic).
- **Block thesis demo "highlight onboarding":** Demo "tạo nhà hàng mới sạch sẽ trong 30 giây" yêu cầu Phase 4B + 4C cùng xong (welcome email là phần ấn tượng).

### 8.3 Recommended sequencing

```
Phase 3 (90% → 100%)         ←── đang làm
       │
       ├─► Phase 4A (saga + outbox cứng)   ←── parallel, ưu tiên thấp hơn
       │
       └─► Phase 4B (SaaS onboarding) ─────────┐
              │                                 │
              ▼                                 │
           Phase 4C (Notification + Staff)     │
              │                                 │
              ▼                                 ▼
                          Phase 5-7 (Test + Observability + Deploy)
```

---

## 9. Risk Register (Tổng Hợp + Mitigation)

| #   | Risk                                                                             | Likelihood | Impact | Mitigation                                                             |
| --- | -------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------- |
| R1  | Migration tenant entity vỡ dữ liệu seed dev                                      | Medium     | High   | Migration sequence §5.3; backfill defaults; smoke test trước khi merge |
| R2  | Authorizer JWT cache 30 phút làm suspend không có hiệu lực ngay                  | High       | High   | Redis flag check ở guard (§4.5)                                        |
| R3  | Onboarding saga fail giữa chừng → orphan Keycloak user                           | Medium     | Medium | Cleanup cron daily quét KC users không có MongoDB profile              |
| R4  | Slug "Phở" → "ph" do code cũ không Unicode                                       | High       | High   | Slug algorithm §4.6 + acceptance test với 5 case Vietnamese            |
| R5  | Customer PWA vẫn đặt món được khi tenant suspended (SessionGuard không check)    | High       | High   | Mở rộng SessionGuard check Redis flag (Q2 Option B)                    |
| R6  | Tenant Kafka producer + outbox phức tạp hóa SaaS service                         | Low        | Medium | Tái sử dụng pattern Order/Payment; minimal new code                    |
| R7  | Free plan với `max_tables=10` không đủ cho demo (cần seed >10 bàn để show)       | Medium     | Low    | Seeder tạo 1 demo tenant với plan PREMIUM `max_tables=100`             |
| R8  | Cron auto-suspend chạy duplicate trong môi trường multi-instance (nếu scale BFF) | Low        | Low    | Single-instance cron + DB SELECT FOR UPDATE; hoặc Redis lock           |
| R9  | Hard-delete tenant vô tình xóa cross-service data (Catalog/Order/Payment)        | Low        | High   | Phase 4B chỉ làm soft-close; hard-delete defer Phase 5+                |
| R10 | Permission matrix conflict với existing tests (53 → 64 quyền)                    | Medium     | Medium | Update Layer 1 + Layer 2 + Layer 3 tests đồng bộ trong cùng PR         |

---

## 10. Acceptance Criteria Bổ Sung (Đề Xuất)

Ngoài AC trong phase doc, audit này đề xuất thêm:

- **Slug Vietnamese:** "Phở Hà Nội" → "pho-ha-noi", "Đông Đô F&B" → "dong-do-fb"; 5 unit test case.
- **Reserved word block:** Cố gắng tạo tenant slug "admin" → 400 với error code `SAAS_SLUG_RESERVED`.
- **Status guard:** Suspend tenant → next request bất kỳ (không phải SUPER_ADMIN, không phải payment confirm) → 403 với `TENANT_SUSPENDED`.
- **Customer suspend:** Sau khi suspend, customer vẫn có session active → reload menu → 403; bill `PENDING_PAYMENT` cũ vẫn thanh toán được.
- **Cron acceptance:** Set tenant subscription `expires_at` quá khứ → chạy cron manual → tenant `SUSPENDED` + Redis flag set.
- **Onboarding rollback:** Mock Keycloak fail ở step 4 → DB transaction rollback → không có tenant orphan.
- `**tenant.created` event: Onboard tenant → Kafka topic `tenant.created` có message với payload đúng schema (eventId, ownerEmail, ...).
- **L1 gating concurrent:** 2 admins đồng thời tạo bàn thứ 10 và 11 trong tenant Free → 1 thành công, 1 nhận 402.
- **Plan upgrade:** Tenant Free đầy 10 bàn → admin upgrade Premium → có thể tạo bàn thứ 11 ngay (Redis cache invalidate).
- **Time-zone counter:** `max_orders_per_day=100`, đặt 99 đơn lúc 23:59 Asia/Ho_Chi_Minh → đơn 100 ở 00:01 → vẫn limit của ngày mới (counter reset đúng).

---

## 11. Đề Xuất Phạm Vi Spec (Giai Đoạn 2)

Sau khi bạn duyệt câu hỏi chốt hạ, spec `docs/specs/business-logic-phase-4b-spec.md` sẽ chứa:

1. **Domain model:** Tenant entity (full fields), PricingPlan, Subscription, OutboxEvent (SaaS-local).
2. **State machine:** Diagram + transition table với guards + side-effects.
3. **API contract:** Tất cả TCP messages, REST endpoints (BFF), Kafka topic payloads.
4. **Permission matrix update:** Bảng 6 roles × ~64 permissions với migration script.
5. **Onboarding mini-saga:** Sequence diagram + step-by-step compensation.
6. **Feature gating:** Guard logic + counter sources + 402 response format + L1/L2 split.
7. **Suspend mechanism:** Redis flag schema + guard chain + WebSocket disconnect.
8. **Slug algorithm:** Pseudocode + test fixtures.
9. **Reserved words list:** Final list + governance.
10. **Cron design:** Schedule + TZ + retry + idempotency.
11. **Migration plan:** SQL ordering, backfill scripts, rollback strategy.
12. **Coordination contract với Phase 4A và Phase 4C:** event schemas, dependency expectations.
13. **Test plan:** Unit + integration + E2E acceptance.
14. **Rollout plan:** Feature flags (nếu chọn Q8 option B), canary checklist.

---

## 12. Tóm Tắt Decision Required (Quick Checklist)

Để tiếp tục Giai đoạn 2, cần bạn confirm:

| #   | Câu hỏi                             | Khuyến nghị                                        |
| --- | ----------------------------------- | -------------------------------------------------- |
| Q1  | `isActive` vs `status`              | C (giữ cả 2 với mapper)                            |
| Q2  | Suspend behavior với active session | B (read-only + payment allowed)                    |
| Q3  | Permission namespace                | B (tenant._ / subscription._ / plan.)              |
| Q4  | Reserved slug source                | A (hardcoded const)                                |
| Q5  | Cron schedule                       | B (02:00 Asia/Ho_Chi_Minh, grace 24h)              |
| Q6  | Feature gating layer                | C (BFF guard + service backup)                     |
| Q7  | Onboarding TX                       | B (mini-saga in-process)                           |
| Q8  | Self-service wizard                 | A (defer post-thesis)                              |
| Q9  | Webhook/Order/WS khi suspend        | a-Process / b-Allow finish / c-WS banner           |
| Q10 | Admin app structure                 | A (giữ trong management-app)                       |
| Q11 | Suspend notification channel        | A→D (defer Notification, dùng TCP sau)             |
| Q12 | Data retention CLOSED               | C (defer)                                          |
| Q13 | Counter time-zone                   | C (hardcoded Asia/Ho_Chi_Minh)                     |
| Q14 | Legacy tenant migration             | (a) Free plan vô hạn, (b) SUSPENDED, (c) VND/vi-VN |
| Q15 | Owner password handoff              | A→C (admin-typed, upgrade khi Phase 4C SMTP)       |

---

---

## 13. Frontend Pages & UX Specification (Bổ Sung Sau Round 1)

> **Lý do bổ sung:** Round 1 audit chỉ liệt kê tên route ở §3.4, §4 — chưa cover đủ logic UX, fields, components, business flows. Section này lấp gap.

### 13.1 Bản đồ FE đầy đủ — Phase 4B impact

**Hiện trạng trong codebase (đã verify):**

| Route                           | App            | State hiện tại                      | Phase 4B target                                               |
| ------------------------------- | -------------- | ----------------------------------- | ------------------------------------------------------------- |
| `/` (root)                      | management-app | Redirect → `/login`                 | Cần landing page hoặc giữ redirect (xem Q16)                  |
| `/login`                        | management-app | ✅ đã có (Phase 0 Keycloak)         | Không đổi                                                     |
| `/auth/callback`                | management-app | ✅ đã có                            | Không đổi                                                     |
| `/dashboard`                    | management-app | Skeleton                            | Phase 4B: thêm widget "Plan hiện tại / Hạn dùng / Quota"      |
| `/dashboard/subscription`       | management-app | **Placeholder 11 dòng**             | **Phase 4B build full**                                       |
| `/dashboard/staff`              | management-app | Phase 4C target (đã có placeholder) | Phase 4B chỉ ảnh hưởng quota `max_staff`                      |
| `/dashboard/menu/tables/orders` | management-app | ✅ Phase 1 + 2A + 2B                | Phase 4B: nhận 402 từ BFF + UX upgrade prompt                 |
| `/dashboard/payment-settings`   | management-app | **CHƯA TỒN TẠI**                    | **Phase 4B mới (xem §14 — bank settings cho tenant)**         |
| `/dashboard/billing`            | management-app | **CHƯA TỒN TẠI**                    | **Phase 4B mới (Owner thanh toán subscription cho platform)** |
| `/admin`                        | management-app | **Placeholder**                     | **Phase 4B build dashboard SUPER_ADMIN**                      |
| `/admin/tenants`                | management-app | **Placeholder 11 dòng**             | **Phase 4B build full**                                       |
| `/admin/tenants/[id]`           | management-app | **CHƯA TỒN TẠI**                    | **Phase 4B mới — chi tiết tenant**                            |
| `/admin/plans`                  | management-app | **Placeholder 11 dòng**             | **Phase 4B build full**                                       |
| `/admin/billing`                | management-app | **CHƯA TỒN TẠI**                    | **Phase 4B mới — đối soát subscription payments**             |
| `/admin/analytics`              | management-app | Placeholder                         | Phase 4B optional (read-only platform metrics)                |
| `/register/restaurant`          | management-app | **CHƯA TỒN TẠI**                    | **Defer (Q8 = A) hoặc landing nếu chốt self-service**         |
| Customer PWA (`(slug)/...`)     | customer-pwa   | ✅ Phase 1-3                        | Phase 4B: thêm UI "Cửa hàng tạm khóa" khi suspend             |

### 13.2 `/admin` (SUPER_ADMIN) — Page-by-Page Spec

#### 13.2.1 `/admin` — Platform Overview Dashboard

**Mục tiêu UX:** SUPER_ADMIN nhìn-1-cái-thấy-toàn-cảnh platform, biết ngay có vấn đề gì cần xử lý không.

**Layout (3 column hero + grid widgets):**

```
┌─────────────────────────────────────────────────────────────┐
│ Platform Overview                              [Date Range] │
├─────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│ │Total       │ │Active      │ │Suspended   │ │Closed    │ │
│ │Tenants: 42 │ │Tenants: 38 │ │ Tenants: 3 │ │Tenants: 1│ │
│ └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│                                                             │
│ ┌─────────────────────────────────┐ ┌────────────────────┐ │
│ │ Tenants by Plan                  │ │ Recent Onboards    │ │
│ │ Free: 30  Basic: 8  Premium: 4  │ │ • Phở Hà Nội  2h   │ │
│ │ [bar chart]                      │ │ • The Coffee 1d    │ │
│ └─────────────────────────────────┘ └────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────┐ ┌────────────────────┐ │
│ │ Subscription Expiring Soon (7d)  │ │ MRR (Demo only)    │ │
│ │ 3 tenants — list                 │ │ X,XXX,XXX VND/mo   │ │
│ └─────────────────────────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Data sources (BFF endpoints mới):**

- `GET /admin/platform/stats` → `{ totalTenants, activeTenants, suspendedTenants, closedTenants, tenantsByPlan: { FREE: n, ... }, expiringSoon: TenantSummary[], mrr: bigint }`.

**Permissions:** `tenant.list_all` (SUPER_ADMIN).

**Logic nghiệp vụ:**

- "Expiring Soon" = subscriptions có `expires_at` trong vòng 7 ngày tới + `status=ACTIVE` + planCode != FREE.
- MRR = Σ(plan.price_vnd cho mọi `ACTIVE` subscription). Nếu Free, đóng góp 0.

#### 13.2.2 `/admin/tenants` — Tenant Directory

**Mục tiêu UX:** Tìm + lọc + thao tác hành chính trên tenant list (suspend, activate, view detail).

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Tenants                              [+ Onboard New Tenant]    │
├─────────────────────────────────────────────────────────────────┤
│ Search [____________]  Status [All ▾] Plan [All ▾] [Reset]    │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Slug       Name         Status     Plan    Expires   ⋮  │   │
│ ├──────────────────────────────────────────────────────────┤   │
│ │ pho-ha-noi Phở Hà Nội   🟢 Active  FREE    —        ⋮  │   │
│ │ tch        The Coffee   🟢 Active  PREMIUM 2026-12  ⋮  │   │
│ │ x-bar      X Bar        🟡 Suspended BASIC 2026-04  ⋮  │   │
│ │ ...                                                      │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                              [< 1 2 3 ... 8 >] │
└─────────────────────────────────────────────────────────────────┘
```

**Row actions (⋮ menu):**

- View Detail → `/admin/tenants/[id]`
- Suspend / Activate (toggle theo status) — confirm dialog có ô input "lý do" (audit)
- Assign / Change Plan → modal chọn plan + expires_at picker
- Close (irreversible) — confirm dialog với 2-step (typeyaml slug để xác nhận)
- Impersonate (debug mode, post-thesis) — hoặc Phase 5+

**Onboard New Tenant Modal:**

```
┌──────────────────────────────────────┐
│ Onboard New Restaurant Tenant        │
├──────────────────────────────────────┤
│ Restaurant Name * [_________________]│
│ Type: ◯ Cafe ◯ Restaurant ◯ Pub  │
│ Address          [_________________]│
│                                      │
│ ─── Owner ─────                     │
│ Email *          [_________________]│
│ First Name       [_________________]│
│ Last Name        [_________________]│
│ Initial Password * [______________] │
│ ◯ Auto-generate strong password    │
│                                      │
│ ─── Plan ─────                      │
│ Plan      [Free ▾]                  │
│ Expires   [Date picker — disabled if Free]│
│                                      │
│ [Cancel]                  [Onboard] │
└──────────────────────────────────────┘
```

**Data sources:**

- `GET /admin/tenants?search=&status=&planCode=&page=1&limit=20` → `{ data: TenantSummary[], total, page, limit }`.
- `POST /admin/tenants/onboard` (mini-saga, xem §4.3 audit chính).
- `PATCH /admin/tenants/:id/status` body `{ status: 'SUSPENDED'|'ACTIVE'|'CLOSED', reason }`.
- `PATCH /admin/tenants/:id/subscription` body `{ planCode, expiresAt }`.

**Permissions:** `tenant.list_all`, `tenant.onboard`, `tenant.suspend`, `tenant.activate`, `tenant.close`, `subscription.assign`.

**Edge cases UX:**

- Slug collision khi onboard → BE trả 409 với suggestion alternative (`pho-ha-noi-2`); FE hiển thị inline.
- Suspend tenant đang có active sessions → confirm dialog cảnh báo "X bàn đang có khách, X bill đang chờ thanh toán — confirm?".
- Close tenant chưa có Closed → confirm 2-step.

#### 13.2.3 `/admin/tenants/[id]` — Tenant Detail

**Tabs (shadcn Tabs):**

- **Overview:** thông tin chung (name, slug, address, owner, created_at, status, current plan).
- **Subscription History:** bảng lịch sử subscriptions (plan changes, renewals, expirations) + audit ai assign khi nào.
- **Usage:** widget số bàn / staff / orders ngày hôm nay vs limit của plan; biểu đồ daily orders 30 ngày.
- **Audit Log:** bảng tenant lifecycle events (onboarded, suspended, activated, plan changed) — read-only.
- **Billing (Phase 4B Q19-Q21):** lịch sử subscription payments của tenant này (nếu chốt làm L2 billing — xem §14).
- **Owner Actions:** reset password, disable owner login, transfer ownership (Phase 4C).

**Data sources:**

- `GET /admin/tenants/:id` → full tenant detail + current subscription
- `GET /admin/tenants/:id/subscriptions` → history
- `GET /admin/tenants/:id/usage` → real-time counters
- `GET /admin/tenants/:id/audit` → lifecycle events

**Permissions:** `tenant.read_any` (tách với `tenant.list_all` để phân biệt list-summary vs detail).

#### 13.2.4 `/admin/plans` — Pricing Plan Management

**Mục tiêu UX:** SUPER_ADMIN tạo / sửa / xóa plans (Free / Basic / Premium hoặc thêm).

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Pricing Plans                            [+ Create Plan]    │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐   │
│ │ FREE                                  [Edit] [Delete]│   │
│ │ Miễn phí — 0 VND/tháng                               │   │
│ │ Limits: 10 bàn · 5 staff · 100 orders/ngày          │   │
│ │ Features: basic_pos                                   │   │
│ │ Active: ✅  Display order: 1  Tenants subscribed: 30│   │
│ └──────────────────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ BASIC                                 [Edit] [Delete]│   │
│ │ Cơ bản — 299,000 VND/tháng                          │   │
│ │ Limits: 50 bàn · 20 staff · 1000 orders/ngày        │   │
│ │ Features: basic_pos, analytics_basic                  │   │
│ └──────────────────────────────────────────────────────┘   │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

**Create / Edit Plan Modal:**

- Code (uppercase, immutable sau create)
- Display Name (Tiếng Việt)
- Price VND (integer)
- Limits: max_tables, max_staff, max_orders_per_day (-1 = unlimited)
- Features (multi-select tags từ const list: `basic_pos`, `analytics_basic`, `analytics_advanced`, `multi_branch`, `priority_support`, ...)
- Active toggle
- Display Order (int)

**Edge cases:**

- Delete plan đang có subscriptions ACTIVE → BE return 409 conflict; FE hiển thị "X tenants đang dùng plan này. Vô hiệu hóa thay vì xóa?"
- Không thể giảm limit của plan dưới mức max usage hiện tại của bất kỳ tenant đang subscribe (BE check hoặc cho phép + cảnh báo).

**Permissions:** `plan.create`, `plan.read`, `plan.update`, `plan.delete`.

#### 13.2.5 `/admin/billing` — Subscription Reconciliation (Mới — phụ thuộc Q19)

Chỉ tạo nếu chốt L2 (xem §14). Bảng lịch sử thanh toán subscription, filter theo tenant / status / date.

### 13.3 `/dashboard` (Owner / Manager) — Page-by-Page Spec

#### 13.3.1 `/dashboard` — Update widget plan

Thêm widget "Plan & Quota":

```
┌─────────────────────────────────────┐
│ Gói hiện tại: PREMIUM               │
│ Hết hạn: 2026-12-31  (còn 235 ngày)│
│                                     │
│ Bàn:           24 / 50              │
│ Nhân viên:     8 / 20               │
│ Đơn hôm nay:   142 / 1000           │
│                                     │
│ [Quản lý gói] [Nâng cấp]           │
└─────────────────────────────────────┘
```

#### 13.3.2 `/dashboard/subscription` — Subscription Detail

**Mục tiêu UX:** Owner/Manager xem chi tiết gói + invoice history + nâng cấp.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Subscription                                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─── Gói hiện tại ───────────────────────┐                 │
│ │ PREMIUM — 999,000 VND/tháng             │                 │
│ │ Bắt đầu: 2026-01-01                     │                 │
│ │ Hết hạn: 2026-12-31  (còn 235 ngày)    │                 │
│ │ Trạng thái: 🟢 Đang hoạt động           │                 │
│ │ [Gia hạn] [Chuyển gói] [Hủy]           │                 │
│ └─────────────────────────────────────────┘                 │
│                                                              │
│ ┌─── So sánh gói ───────────────────────┐                  │
│ │ FREE      BASIC      PREMIUM (Hiện tại)│                  │
│ │ 0 VND     299k VND   999k VND          │                  │
│ │ 10 bàn    50 bàn     500 bàn           │                  │
│ │ 5 staff   20 staff   100 staff         │                  │
│ │ 100 đơn/d 1000 đơn/d 10k đơn/d         │                  │
│ │ [Chọn]    [Chọn]     [Đang dùng]      │                  │
│ └────────────────────────────────────────┘                  │
│                                                              │
│ ┌─── Lịch sử thanh toán ────────────────┐                  │
│ │ 2026-01-01  PREMIUM  999,000  ✅ Paid │                  │
│ │ 2025-01-01  BASIC    299,000  ✅ Paid │                  │
│ └────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**Logic nghiệp vụ:**

- "Gia hạn": mở `/dashboard/billing` với plan hiện tại + 1 năm.
- "Chuyển gói": chọn plan khác → check upgrade vs downgrade → mở `/dashboard/billing` với plan mới.
  - Upgrade (lên gói cao hơn): instant, prorated billing (post-thesis) hoặc effective ngay (thesis).
  - Downgrade (xuống gói thấp hơn): khi vượt limit của gói thấp → cảnh báo "Bạn đang có 24 bàn, gói FREE chỉ cho phép 10. Vui lòng giảm bớt trước khi downgrade".
- "Hủy": confirm 2-step → set subscription `CANCELED` + `expires_at = end of current billing cycle`. Tenant tiếp tục dùng đến hết kỳ.

**Data sources:**

- `GET /dashboard/subscription` → current + history
- `POST /dashboard/subscription/checkout` body `{ planCode }` → trả về billing reference (xem §14)
- `POST /dashboard/subscription/cancel`

**Permissions:** `subscription.read_own` (OWNER + MANAGER), `subscription.checkout` (OWNER only — quyết định tài chính).

#### 13.3.3 `/dashboard/payment-settings` — Tenant Bank Account (MỚI)

**Lý do tồn tại:** Hiện tại Phase 3 dùng env var single bank account cho mọi tenant — vi phạm SaaS isolation. Phase 4B phải cho mỗi tenant tự cấu hình tài khoản nhận tiền (xem §14 chi tiết).

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Cài đặt thanh toán                                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─── Tài khoản nhận tiền VietQR ─────────────────────────┐ │
│ │ Tên ngân hàng *  [Vietcombank ▾]                       │ │
│ │ Số tài khoản *   [9332770502_______________]           │ │
│ │ Tên chủ TK *     [NGUYEN VAN A ____________] (in hoa)  │ │
│ │                                                          │ │
│ │ ⓘ SePay sub-account ID (tự động liên kết): sub_xyz    │ │
│ │ Trạng thái webhook: 🟢 Verified  [Test webhook]        │ │
│ │                                                          │ │
│ │ [Cancel]                              [Save & Verify]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─── Tùy chọn thanh toán ────────────────────────────────┐ │
│ │ ☑ Nhận tiền mặt                                        │ │
│ │ ☑ Nhận VietQR (chuyển khoản)                           │ │
│ │ ☐ Nhận Momo (sắp có)                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Permissions:** `payment_settings.read_own`, `payment_settings.update_own` (OWNER only — vì là tài chính nhạy cảm).

**Logic nghiệp vụ + edge cases:** xem §14.

#### 13.3.4 `/dashboard/billing` — Pay Subscription (MỚI — phụ thuộc Q20)

Owner thanh toán gói subscription cho platform. Detailed flow + options xem §14.4.

### 13.4 Customer PWA — Suspend Behavior

Khi tenant `SUSPENDED` (Q2 = B đề xuất read-only):

```
┌─────────────────────────────────────────┐
│ ⚠ Cửa hàng tạm dừng nhận đơn mới       │
│                                         │
│ Bạn vẫn có thể xem đơn hiện tại và      │
│ thanh toán. Liên hệ nhân viên nếu cần.  │
└─────────────────────────────────────────┘
```

- Banner sticky top trên mọi page customer-pwa khi tenant suspended (data từ `Tenant.status` resolve qua `GET /public/tenants/:slug`).
- Disable nút "Thêm vào giỏ" + "Đặt món".
- Vẫn hiển thị bill `PENDING_PAYMENT` + cho phép thanh toán (Q9a = Process).
- WebSocket connection: nhận event `tenant.suspended` → auto-reload page banner (Q9c = banner, không force disconnect).

### 13.5 Landing & Self-Service (Q16)

**Hiện trạng:** `/` của management-app redirect → `/login`. Không có public landing page.

**3 lựa chọn (Q16):**

| Option | Mô tả                                                                                                              | Pros                 | Cons                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------------------------------------- |
| A      | Giữ redirect → `/login`, không có public landing                                                                   | Thesis MVP, ít scope | Demo "đăng ký nhà hàng" không có entrypoint |
| B      | Static landing đơn giản (1 page giới thiệu, pricing table, nút "Đăng ký" → `/login` mock onboarding-by-admin)      | Demo đẹp hơn         | +1 ngày dev FE                              |
| C      | Full marketing site + self-service wizard `/register/restaurant` (defer per Q8 nhưng landing vẫn có CTA "Liên hệ") | Production-ready     | +3-4 ngày + cần SMTP                        |

**Khuyến nghị: B.** Static landing với pricing table (đọc từ `GET /public/plans`) + CTA "Liên hệ admin" (mailto:) hoặc "Đăng nhập" → `/login`. Self-service form (`/register/restaurant`) defer per Q8.

### 13.6 Sidebar & Role-Based Navigation Update

Sidebar `apps/management-app/src/components/layout/data/sidebar-data.ts` cần update:

| Role                | Tab thêm Phase 4B                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| OWNER               | "Subscription" (`/dashboard/subscription`), "Cài đặt thanh toán" (`/dashboard/payment-settings`), "Thanh toán gói" (`/dashboard/billing`) |
| MANAGER             | "Subscription" (read-only — không có nút checkout)                                                                                        |
| WAITER/CHEF/BARISTA | (không thay đổi)                                                                                                                          |
| SUPER_ADMIN         | "Tenants" (`/admin/tenants`), "Plans" (`/admin/plans`), "Billing" (`/admin/billing`) — bổ sung vào nav admin                              |

**RBAC visibility:** filter nav items qua `permissions[]` từ session (đã có pattern, chỉ cần map mới).

---

## 14. Two-Tier Payment Architecture (LỖ HỔNG KIẾN TRÚC LỚN — Bạn Phát Hiện Đúng)

> **Verify code reality (đã grep):** `apps/payment/src/configuration/index.ts` line 33-46 + `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts` line 178-182 — confirmed: Phase 3 đọc bank account từ `process.env['PAYMENT_SEPAY_QR_ACCOUNT']` + `PAYMENT_SEPAY_QR_BANK` (PLATFORM-LEVEL env vars). **Tất cả tenant cùng nhận tiền vào MỘT tài khoản.** Đây không phải SaaS thực sự.
>
> **Verify gap:** Không có phase nào (4A / 4B / 4C / 5-7) đề cập per-tenant bank account hay tenant-to-platform billing. Đây là **omission thực sự**.

### 14.1 Định Nghĩa Hai Tầng

```
┌─────────────────────────────────────────────────────────────┐
│ TIER 1 — Customer pays Restaurant (Customer-to-Tenant)      │
│                                                              │
│ Diner ── VietQR ──► Tenant's Bank Account                   │
│ Diner ── Cash ────► Tenant's Cash Drawer                    │
│                                                              │
│ State: Phase 3 ĐÃ XONG nhưng dùng PLATFORM bank — SAI       │
│ Fix: Mỗi tenant tự configure bank account trong              │
│       /dashboard/payment-settings → routing per-tenant       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TIER 2 — Tenant pays Platform (Tenant-to-Platform)          │
│                                                              │
│ Tenant Owner ── VietQR / Bank Transfer ──► Platform Account │
│                                                              │
│ State: HOÀN TOÀN CHƯA CÓ — không phase nào đề cập            │
│ Fix: Phase 4B mới (đề xuất manual + audit trail)            │
└─────────────────────────────────────────────────────────────┘
```

**Hai tầng dùng KHÁC bank account, KHÁC actor, KHÁC purpose, KHÁC reconciliation.**

### 14.2 Tier 1 — Per-Tenant Customer Payment (Phase 3 Refactor)

#### Vấn đề hiện tại (Phase 3 codebase)

```typescript
// apps/payment/src/app/modules/payment/services/payment-settlement.service.ts:178
const { QR_ACCOUNT, QR_BANK } = CONFIGURATION.SEPAY_CONFIG; // ← env var, không tenant-aware
```

→ Tenant `pho-ha-noi` và `the-coffee` cùng generate QR với bank `Vietcombank acc 9332770502`. Tiền của khách `the-coffee` chảy vào TK của `pho-ha-noi`!

#### Đề xuất kiến trúc

**Option A — Per-Tenant Bank Settings + SePay Multi-Account (RECOMMENDED):**

1. Tạo entity mới `tenant_payment_settings` trong `qrtable_payment` DB:

```sql
 CREATE TABLE tenant_payment_settings (
   id UUID PRIMARY KEY,
   tenant_id UUID UNIQUE NOT NULL,
   vietqr_enabled BOOLEAN DEFAULT true,
   vietqr_bank_name VARCHAR(80),       -- 'Vietcombank', 'MBBank', ...
   vietqr_account_number VARCHAR(64),
   vietqr_account_holder VARCHAR(120),
   sepay_subaccount_id VARCHAR(120),   -- SePay sub-account để route webhook
   cash_enabled BOOLEAN DEFAULT true,
   verified_at TIMESTAMPTZ,            -- sau khi test webhook thành công
   created_at TIMESTAMPTZ DEFAULT now(),
   updated_at TIMESTAMPTZ DEFAULT now()
 );
```

1. SePay dashboard config: nhiều bank accounts; mỗi account có một `subAccount` ID. Webhook payload field `subAccount` được dùng để route về tenant.
2. Refactor `payment-settlement.service.ts`:

```typescript
const settings = await this.tenantPaymentSettingsRepo.findByTenantId(tenantId);
if (!settings || !settings.vietqr_enabled || !settings.vietqr_account_number) {
  throw new BusinessException(ErrorCode.PAYMENT_VIETQR_NOT_CONFIGURED, HttpStatus.PRECONDITION_FAILED);
}
return { account: settings.vietqr_account_number, bank: settings.vietqr_bank_name };
```

1. Webhook routing:

```typescript
// payment.handle_sepay_webhook
const tenantSettings = await this.tenantPaymentSettingsRepo.findBySepaySubAccount(payload.subAccount);
if (!tenantSettings) {
  // Fallback: match by accountNumber
  tenantSettings = await this.tenantPaymentSettingsRepo.findByAccountNumber(payload.accountNumber);
}
const tenantId = tenantSettings.tenant_id;
// Continue with billReference matching scoped to tenantId
```

**Option B — Hardcoded Single Account + Internal Ledger (NOT RECOMMENDED):**

- Platform giữ một bank account, internal ledger track "tenant X owe Y" → settle thủ công cuối tháng. Đây là model "PayPal-like aggregator" — vi phạm UX kỳ vọng của chủ quán + risk pháp lý ở Việt Nam.

**Option C — Defer per-tenant (Thesis Demo Compromise):**

- Giữ env var, demo chỉ với 1 tenant; ghi nhận debt là post-thesis. Giảm scope đáng kể nhưng demo không thực sự multi-tenant ở Tier 1.

#### Migration impact

| Step | Action                                                                        | Owner                 |
| ---- | ----------------------------------------------------------------------------- | --------------------- |
| 1    | Create `tenant_payment_settings` migration trong `qrtable_payment`            | Phase 4B              |
| 2    | Backfill: insert row cho mỗi existing tenant với env var values               | Phase 4B migration    |
| 3    | Refactor `PaymentSettlementService` đọc từ DB thay vì env                     | Phase 4B              |
| 4    | UI `/dashboard/payment-settings` (CRUD bank settings)                         | Phase 4B FE           |
| 5    | Webhook routing: tách logic match tenant từ `subAccount` hoặc `accountNumber` | Phase 4B              |
| 6    | Test webhook ("Test webhook" button trong UI gọi SePay sandbox)               | Phase 4B nice-to-have |
| 7    | Deprecate env vars `PAYMENT_SEPAY_QR_` (vẫn giữ làm fallback cho dev)         | Phase 4B              |

**Effort estimate:** +3-4 ngày dev backend + 1-2 ngày FE settings page.

### 14.3 Tier 2 — Tenant Pays Platform for Subscription (Mới)

#### Pattern lựa chọn

**Option A — Manual Bank Transfer + Admin Confirmation (RECOMMENDED cho thesis):**

```
1. Owner ở /dashboard/subscription chọn plan PREMIUM, click "Thanh toán"
2. → /dashboard/billing/[checkoutId]:
   - Hiển thị: Số tiền 999,000 VND
   - QR VietQR generate cho PLATFORM bank account (env hoặc admin config)
   - Nội dung CK: "QRSUB" + 8 ký tự đầu của subscriptionCheckoutId
   - Trạng thái: 🟡 Chờ chuyển khoản
3. Owner mở app ngân hàng, chuyển khoản
4. SePay webhook đến platform bank account (KHÁC tenant bank!)
5. Platform Payment Service nhận webhook → match QRSUB code → resolve subscription_checkout_id
6. Auto-activate subscription: tenant.subscription updated, status → ACTIVE, expires_at extended
7. Owner thấy /dashboard/subscription update real-time / polling
```

**Option B — Admin-Only Manual Assignment (đơn giản nhất):**

```
1. Owner liên hệ qua kênh ngoài (email/Zalo) muốn upgrade
2. Owner chuyển khoản tay
3. SUPER_ADMIN xác nhận đã nhận tiền
4. SUPER_ADMIN vào /admin/tenants/:id → Assign Plan → set planCode + expires_at
5. Lưu audit "manually assigned by admin X, payment ref Y"
```

**Option C — Auto Webhook + Admin Override (HYBRID — đề xuất):**

- Default flow: Option A (auto)
- Fallback: SUPER_ADMIN có thể manual assign trong `/admin/tenants/:id` (Option B path) cho trường hợp Owner thanh toán lệch / sai mã.

#### Domain model bổ sung

```sql
CREATE TABLE subscription_invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  subscription_id UUID,              -- nullable: trước khi assign plan
  plan_code VARCHAR(40) NOT NULL,
  amount_vnd BIGINT NOT NULL,
  billing_reference VARCHAR(32) UNIQUE NOT NULL,  -- "QRSUB" + 8 chars
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',  -- PENDING|PAID|EXPIRED|CANCELED
  sepay_transaction_id INT,
  sepay_account_number VARCHAR(64),  -- platform's account
  paid_amount_vnd BIGINT,
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,            -- TTL cho QR (e.g. 24h)
  requested_by_user_id UUID NOT NULL,  -- Owner
  manually_confirmed_by_user_id UUID,  -- SUPER_ADMIN nếu manual
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Webhook routing decision

**Critical question (Q21):** Khi SePay webhook đến BFF với `subAccount=null`, làm sao biết là Tier 1 (customer pays restaurant) hay Tier 2 (tenant pays platform)?

**Đề xuất:**

- **Naming convention trong `code`/content:**
  - Tier 1: `QRTBL` + 8 chars (đã có)
  - Tier 2: `QRSUB` + 8 chars (mới)
- BFF sniff prefix → route TCP message khác nhau:
  - `QRTBL` → `payment.handle_sepay_webhook` (tenant settlement, hiện tại)
  - `QRSUB`\* → `subscription.handle_sepay_webhook` (mới, SaaS service xử lý)
- Account routing: tenant accounts (Tier 1) phải có `subAccount` non-null trong SePay; platform account (Tier 2) là default account.

#### Service ownership

| Concern                            | Service                                             |
| ---------------------------------- | --------------------------------------------------- |
| `tenant_payment_settings` CRUD     | Payment Service (extension)                         |
| Tier 1 webhook routing             | Payment Service (refactor)                          |
| `subscription_invoices` CRUD       | **SaaS Service** (new domain)                       |
| Tier 2 webhook routing             | **SaaS Service** (new TCP handler)                  |
| QR generation cho subscription     | SaaS Service (giống Payment Service Tier 1 pattern) |
| Auto-activate subscription on PAID | SaaS Service (in-process logic + outbox)            |

**Lý do:** Subscription là SaaS domain, không nên đẩy vào Payment Service (vi phạm bounded context). SaaS service học pattern từ Payment Service (reuse `PaymentReferenceService`, outbox).

### 14.4 `/dashboard/billing` — Owner Subscription Checkout (Spec FE)

```
┌─────────────────────────────────────────────────────────────┐
│ Thanh toán gói PREMIUM                                      │
├─────────────────────────────────────────────────────────────┤
│ Tóm tắt:                                                    │
│ • Gói: PREMIUM                                              │
│ • Giá: 999,000 VND/tháng                                    │
│ • Hiệu lực từ: 2026-05-10                                   │
│ • Hiệu lực đến: 2027-05-10                                  │
│                                                              │
│ ┌─── Quét QR để chuyển khoản ────────────────────────────┐ │
│ │                                                          │ │
│ │           [VietQR Image — qr.sepay.vn]                  │ │
│ │                                                          │ │
│ │ Ngân hàng nhận: Vietcombank                             │ │
│ │ Số TK:          0010000000355  (QRTable Platform)       │ │
│ │ Số tiền:        999,000 VND                             │ │
│ │ Nội dung CK:    QRSUBA1B2C3D4 (BẮT BUỘC nhập đúng)     │ │
│ │                                                          │ │
│ │ Trạng thái:     🟡 Chờ chuyển khoản                     │ │
│ │ Hết hạn QR:     còn 23h 45m                             │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ⓘ Sau khi chuyển khoản, hệ thống tự động kích hoạt gói    │
│   trong vòng 5 phút. Nếu lỗi, vui lòng liên hệ admin.      │
│                                                              │
│ [Hủy]              [Đã chuyển — Liên hệ admin xác nhận]    │
└─────────────────────────────────────────────────────────────┘
```

**Polling:** UI poll `GET /dashboard/billing/:checkoutId/status` mỗi 5s. Khi status `PAID` → redirect `/dashboard/subscription` với toast success.

**WebSocket alternative:** BFF emit `subscription.activated` → tenant management room → FE update real-time.

### 14.5 Risk Register (Bổ sung từ §14)

| #   | Risk                                                                                 | Likelihood | Impact       | Mitigation                                                                    |
| --- | ------------------------------------------------------------------------------------ | ---------- | ------------ | ----------------------------------------------------------------------------- |
| R11 | Phase 3 codebase đang share single bank account → demo multi-tenant không trung thực | High       | **Critical** | Phase 4B PHẢI refactor (§14.2), không defer được nếu demo SaaS                |
| R12 | Tier 1 + Tier 2 webhook collision (cùng SePay account)                               | Medium     | High         | Naming convention `QRTBL`_ vs `QRSUB`_; SePay sub-accounts                    |
| R13 | Owner chuyển khoản sai nội dung → subscription không activate                        | High       | Medium       | UI cảnh báo "BẮT BUỘC nhập đúng mã"; SUPER_ADMIN manual assign fallback       |
| R14 | Tenant đổi bank account giữa chừng → bills `PENDING_PAYMENT` cũ vẫn ref bank cũ      | Low        | Medium       | Bills lưu `bank_snapshot` tại lúc tạo QR; mới chỉ áp cho QR mới               |
| R15 | Tenant cancel subscription → expires_at giữ → khi đến hạn auto-suspend               | Medium     | Low          | Notification trước 7 ngày (Phase 4C)                                          |
| R16 | Platform bank account leak qua FE → spam fake transactions                           | Low        | Low          | Account công khai (đằng nào cũng visible trên QR); idempotency webhook bảo vệ |

### 14.6 Câu hỏi mới (Q16-Q22)

#### Q16. Landing page strategy

| Option | Mô tả                                                | Pros                 | Cons                                        |
| ------ | ---------------------------------------------------- | -------------------- | ------------------------------------------- |
| A      | Giữ redirect → `/login`                              | Thesis MVP, ít scope | Demo "đăng ký nhà hàng" không có entrypoint |
| B      | Static landing với pricing table + CTA login/contact | Demo đẹp hơn         | +1 ngày FE                                  |
| C      | Full marketing + self-service wizard                 | Production-ready     | +3-4 ngày + cần SMTP                        |

**Khuyến nghị: B.**

#### Q17. Per-tenant bank account architecture (Tier 1 fix)

| Option | Mô tả                                                                             | Pros                | Cons                                     |
| ------ | --------------------------------------------------------------------------------- | ------------------- | ---------------------------------------- |
| A      | `tenant_payment_settings` table + SePay sub-accounts + webhook routing per-tenant | True SaaS isolation | +3-4 ngày backend + 1-2 ngày FE          |
| B      | Internal ledger pattern (platform single account, settle thủ công)                | Backend đơn giản    | UX kỳ lạ với chủ quán; legal risk VN     |
| C      | Defer (giữ env var, demo single-tenant)                                           | Phase 4B nhỏ hơn    | Demo không thực sự multi-tenant ở Tier 1 |

**Khuyến nghị: A** nếu thesis muốn highlight true SaaS; **C** nếu muốn defer Tier 1 fix sang Phase 5+ và document là known limitation.

#### Q18. SePay sub-account vs single account routing

| Option | Mô tả                                                                                                     | Pros                                               | Cons                                            |
| ------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| A      | Mỗi tenant có riêng SePay sub-account (config trong SePay dashboard manually)                             | Routing rõ ràng qua `subAccount`                   | SUPER_ADMIN phải config thủ công cho mỗi tenant |
| B      | Single SePay account, routing qua `accountNumber` (= bank account của tenant đã đăng ký)                  | Self-service hoàn toàn                             | Phải đảm bảo mỗi tenant có bank account khác    |
| C      | Hybrid: default single account, sub-account cho premium tenants                                           | Linh hoạt                                          | Logic phức tạp                                  |
| D      | Hardcoded bank prefix scheme (e.g. `QRTBL` + tenantSlug + bill 8 chars) cho mọi tenant cùng SePay account | Đơn giản nhất nhưng tiền vào platform → cần payout | Vi phạm UX expected                             |

**Khuyến nghị: A** cho thesis (manual config 3-5 tenant demo OK); **B** cho production scale.

#### Q19. Tier 2 — Subscription billing flow

| Option | Mô tả                                                                              | Pros                                            | Cons                                           |
| ------ | ---------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| A      | Manual bank transfer + Owner confirms ("Tôi đã chuyển") → SUPER_ADMIN approves     | Đơn giản, no webhook integration                | UX chậm, có lag vài giờ                        |
| B      | VietQR auto-webhook (giống Tier 1) → auto-activate                                 | UX tốt, demo được "thanh toán → kích hoạt ngay" | Cần webhook routing logic + `QRSUB` prefix     |
| C      | Hybrid: B mặc định, A là fallback khi webhook fail                                 | Robust                                          | Phức tạp hơn                                   |
| D      | Defer hoàn toàn: thesis chỉ demo Free plan + admin manual assign cho Basic/Premium | Phase 4B nhỏ nhất                               | Không demo được luồng "tenant pays" end-to-end |

**Khuyến nghị: C** nếu có thời gian; **D** nếu ưu tiên scope (demo "manual upgrade by admin" đủ kể chuyện multi-tier billing).

#### Q20. `/dashboard/billing` page — phạm vi

| Option | Mô tả                                                                                                 | Pros             | Cons              |
| ------ | ----------------------------------------------------------------------------------------------------- | ---------------- | ----------------- |
| A      | Build full với QR display + polling (đi cùng Q19=B/C)                                                 | UX hoàn chỉnh    | +2-3 ngày FE      |
| B      | Skip page, chỉ hiển thị thông tin "Liên hệ admin để upgrade" trên `/dashboard/subscription` (Q19=A/D) | Phase 4B nhỏ hơn | Demo kém ấn tượng |
| C      | Half-build: page có instruction + QR static + nút "Tôi đã chuyển" (Q19=A)                             | Mid-effort       | Vẫn không tự động |

**Khuyến nghị:** Theo Q19. Q19=B/C → Q20=A; Q19=D → Q20=B.

#### Q21. Webhook prefix routing (`QRTBL`_ vs `QRSUB`_)

Đây là follow-up technical decision của Q19:

- Nếu Q19 chọn B/C → CONFIRM dùng `QRSUB` prefix cho Tier 2.
- Audit naming: `QRTBL` (tenant bill), `QRSUB` (subscription). Còn thêm gì không? (Tương lai: `QRRFD` cho refund từ platform?)

**Khuyến nghị:** Confirm 2 prefix `QRTBL` + `QRSUB`. Document trong constants `BILL_REF_PREFIXES = ['QRTBL', 'QRSUB']`.

#### Q22. Payment settings entity location

| Option | Mô tả                                                                       | Pros                                                 | Cons                                                             |
| ------ | --------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| A      | `tenant_payment_settings` trong `qrtable_payment` DB (Payment Service owns) | Bounded context: Payment chịu trách nhiệm thanh toán | Cross-service: SaaS phải TCP gọi Payment khi tạo onboarding flow |
| B      | `payment_settings` JSONB column trên `tenants` table (`qrtable_saas`)       | Đơn giản, không cross-service                        | Vi phạm "Payment owns payment data"                              |
| C      | Tách service mới `tenant-config-service`                                    | Strict DDD                                           | Quá over-engineering cho thesis                                  |

**Khuyến nghị: A.** Payment Service đã có entities `payments`, `refunds`, `audit_payments` — thêm `tenant_payment_settings` là natural fit. SaaS Service chỉ cần TCP `payment.create_settings_for_tenant` trong onboarding saga (step bổ sung).

---

## 15. Cập Nhật Coverage Matrix (sau §13 + §14)

| Khía cạnh                                | Phase doc | Audit này (Round 1+2) | Spec sẽ cover |
| ---------------------------------------- | --------- | --------------------- | ------------- |
| (Tất cả mục §7 cũ)                       | —         | ✅                    | ✅            |
| **Landing page**                         | ❌        | ✅ Q16                | tùy Q16       |
| `**/admin/`\* page-by-page UX            | partial   | ✅ §13.2              | ✅            |
| `**/dashboard/subscription` UX detail    | partial   | ✅ §13.3.2            | ✅            |
| `**/dashboard/payment-settings`          | ❌        | ✅ §13.3.3 + §14.2    | ✅            |
| `**/dashboard/billing` (Tier 2 pay)      | ❌        | ✅ §13.3.4 + §14.4    | tùy Q19/Q20   |
| **Tier 1 per-tenant bank account**       | ❌        | ✅ §14.2 (Q17)        | tùy Q17       |
| **Tier 2 platform billing**              | ❌        | ✅ §14.3 (Q19)        | tùy Q19       |
| **Webhook prefix routing (QRTBL/QRSUB)** | ❌        | ✅ §14.3 (Q21)        | tùy Q19/Q21   |
| **Sidebar / nav update**                 | ❌        | ✅ §13.6              | ✅            |
| **Customer PWA suspend banner**          | ❌        | ✅ §13.4              | ✅            |
| **Subscription invoice entity**          | ❌        | ✅ §14.3              | tùy Q19       |
| **Migration Phase 3 → tenant payment**   | ❌        | ✅ §14.2 step list    | tùy Q17       |

---

## 16. Cập Nhật Risk Register (sau §14)

Toàn bộ R11-R16 đã add vào §14.5. Risk lớn nhất:

> **R11 — Phase 3 codebase share single bank account.** Đây là risk **Critical** với Impact cao vì **demo thesis "SaaS multi-tenant"** sẽ bị giảm credibility nếu để như vậy. Cần quyết định Q17 sớm — nếu A thì bắt buộc phải refactor Phase 3 trong scope Phase 4B.

---

## 17. Cập Nhật Quick Decision Checklist

Tổng kết Q1-Q22 (15 cũ + 7 mới):

| #       | Câu hỏi                                  | Khuyến nghị                                          |
| ------- | ---------------------------------------- | ---------------------------------------------------- |
| Q1      | `isActive` vs `status`                   | C (giữ cả 2 với mapper)                              |
| Q2      | Suspend behavior với active session      | B (read-only + payment allowed)                      |
| Q3      | Permission namespace                     | B (tenant._ / subscription._ / plan.)                |
| Q4      | Reserved slug source                     | A (hardcoded const)                                  |
| Q5      | Cron schedule                            | B (02:00 Asia/Ho_Chi_Minh, grace 24h)                |
| Q6      | Feature gating layer                     | C (BFF guard + service backup)                       |
| Q7      | Onboarding TX                            | B (mini-saga in-process)                             |
| Q8      | Self-service wizard                      | A (defer post-thesis)                                |
| Q9      | Webhook/Order/WS khi suspend             | a-Process / b-Allow finish / c-WS banner             |
| Q10     | Admin app structure                      | A (giữ trong management-app)                         |
| Q11     | Suspend notification channel             | A→D (defer Notification, dùng TCP sau)               |
| Q12     | Data retention CLOSED                    | C (defer)                                            |
| Q13     | Counter time-zone                        | C (hardcoded Asia/Ho_Chi_Minh)                       |
| Q14     | Legacy tenant migration                  | (a) Free plan vô hạn, (b) SUSPENDED, (c) VND/vi-VN   |
| Q15     | Owner password handoff                   | A→C (admin-typed, upgrade khi Phase 4C SMTP)         |
| **Q16** | **Landing page**                         | **B (static landing với pricing)**                   |
| **Q17** | **Per-tenant bank account (Tier 1 fix)** | **A nếu demo SaaS thực sự; C nếu defer**             |
| **Q18** | **SePay sub-account routing**            | **A cho thesis; B cho production scale**             |
| **Q19** | **Tier 2 subscription billing flow**     | **C (hybrid auto + manual fallback) hoặc D (defer)** |
| **Q20** | `**/dashboard/billing` page scope        | **Theo Q19**                                         |
| **Q21** | **Webhook prefix QRTBL vs QRSUB**        | **Confirm 2 prefix khi Q19=B/C**                     |
| **Q22** | **Payment settings entity location**     | **A (Payment Service owns)**                         |

---

---

## 18. SePay Capability Matrix (Round 3 — Verified qua Context7)

> **Lý do bổ sung:** Round 2 audit Q18 dựa trên giả định "SePay phải config thủ công trong dashboard" — sai. Đã verify với SePay developer docs (`developer.sepay.vn`) qua Context7. Round 3 chỉnh lại Q18 + thêm Q23–Q25.

### 18.1 SePay Có / Không

| Capability                                                                 | Có sẵn?                  | Chi tiết                                                                                               |
| -------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| **OAuth2 authorization flow**                                              | ✅                       | `GET /oauth/authorize` + `POST /oauth/token` (giống Stripe Connect)                                    |
| **OAuth2 scopes:** `bank-account:read`, `transaction:read`, `profile`      | ✅                       | Cho phép third-party app (QRTable) đọc bank list + transactions của tenant với consent                 |
| **List bank accounts via API**                                             | ✅                       | `GET /api/v1/bank-accounts` (v1 OAuth2) hoặc `GET /v2/bank-accounts` (v2 API token)                    |
| **Get bank account detail**                                                | ✅                       | `GET /v2/bank-accounts/{uuid}`                                                                         |
| **List sub-accounts (Virtual Accounts)**                                   | ✅                       | `GET /api/v1/bank-accounts/{id}/sub-accounts` + `GET /v2/bank-accounts/{uuid}/va`                      |
| **Create Virtual Account programmatically**                                | ✅ (BIDV/Sacombank only) | `POST /v2/bank-accounts/{ba_xid}/orders` — auto-generate VA cho mỗi order. Phải là BIDV hoặc Sacombank |
| **Programmatic webhook upsert**                                            | ✅                       | `POST /v1/webhook` upsert webhook URL + auth_type + secret_key + allow_events                          |
| **Webhook authentication**                                                 | ✅                       | `X-Secret-Key` header (đã verify trong Phase 3)                                                        |
| **List transactions via API**                                              | ✅                       | `GET /api/v1/transactions?bank_account_id=&from_date=&to_date=&amount_in=&reference_number=`           |
| **Programmatically link/add bank account của tenant vào platform's SePay** | ❌                       | KHÔNG có API public. Phải đăng nhập SePay dashboard và link manual (SMS forwarding hoặc API banking).  |
| **Unlimited bank accounts per SePay account**                              | ✅                       | FAQ confirms: "SePay không giới hạn số lượng tài khoản ngân hàng"                                      |
| **Sandbox environment**                                                    | ✅                       | `bankhub-api-sandbox.sepay.vn` cho dev                                                                 |

### 18.2 SePay Pricing (Verified — sepay.vn/bang-gia.html)

| Plan      | Giá           | Transactions/tháng | Bank support | API access             | Phù hợp thesis demo |
| --------- | ------------- | ------------------ | ------------ | ---------------------- | ------------------- |
| **FREE**  | **0đ**        | **50 tx**          | 10 banks     | **Full (incl OAuth2)** | ✅ **Quá đủ**       |
| Startup   | 120,000đ/mo   | 180 → 986k tx      | 10 banks     | Full                   | Production scale    |
| Pinnacle  | 1,430,000đ/mo | 2,300 → 986k tx    | 30 banks     | Full                   | Enterprise          |
| **eShop** | 50k–199k/mo   | Unlimited tx       | 9 banks      | **No API**             | KHÔNG dùng (no API) |

**FAQ Insights quan trọng:**

- "Tính năng có giới hạn theo gói không?" → "Hiện tại, tất cả các gói đều dùng được tất cả tính năng" → **Free plan có full OAuth2 + Webhook API**.
- "Tôi được thêm bao nhiêu tài khoản ngân hàng?" → "SePay không giới hạn số lượng tài khoản ngân hàng".
- "API Banking" — direct API integration với BIDV, MB, VietinBank, ACB, OCB, KienLongBank, MSB. Banks khác qua SMS Banking (cần SIM physical).

### 18.3 Cost Analysis cho Thesis Demo

| Component                                | Cost   | Note                                                  |
| ---------------------------------------- | ------ | ----------------------------------------------------- |
| Platform owner SePay account (Tier 2)    | 0đ     | FREE plan, 50 tx/month                                |
| Platform owner bank account (cho Tier 2) | 0đ     | Có sẵn (cá nhân hoặc business)                        |
| Mỗi demo tenant SePay account (Tier 1)   | 0đ     | FREE plan, 50 tx/month per tenant                     |
| Mỗi demo tenant bank account             | 0đ     | Tenant tự chuẩn bị (cá nhân hoặc business)            |
| Total cho 3 demo tenants                 | **0đ** | 4 SePay free accounts × 50 tx = 200 tx capacity total |
| Sandbox testing                          | 0đ     | Không tính vào quota production                       |

**Conclusion:** Thesis demo full-stack SaaS (1 platform + 3 tenants với cả Tier 1 + Tier 2 thanh toán tự động) **chi phí 0đ trong vòng 50 tx/month/account**.

### 18.4 Constraints / Limitations

- **Bank account phải có sẵn ở ngân hàng:** Bạn không thể "tạo bank account" qua SePay API. Tenant phải có sẵn TK ngân hàng (cá nhân hay doanh nghiệp).
- **Liên kết bank account vào SePay phải manual:** Tenant phải đăng nhập SePay dashboard → "Add bank account" → chọn bank → input credentials hoặc cấu hình SMS forwarding. **Không có API tự động cho bước này.**
- **Webhook delivery SLA:** SePay claim < 30s từ khi giao dịch ngân hàng → webhook đến. Trong thực tế thường 5-15s.
- **VA creation chỉ cho BIDV/Sacombank:** Nếu chọn Virtual Account model thì bị giới hạn 2 banks này.

---

## 19. Recommended SaaS Architecture (Combined Tier 1 + Tier 2)

> Dựa trên §18 (SePay capabilities), dưới đây là kiến trúc đề xuất **để đạt mục tiêu "100% tự động" mà bạn nêu** — và **hoàn toàn khả thi với thesis demo**.

### 19.1 Tier 2 — Subscription Billing (Tenant → Platform)

**Setup (1 lần, do bạn — platform owner):**

1. Đăng ký SePay account (FREE) cho platform.
2. Link 1 bank account (cá nhân hoặc business) vào SePay platform account qua dashboard.
3. Trong SePay dashboard, config webhook URL: `https://qrtable.io/api/v1/payment/sepay/webhook/platform` với `X-Secret-Key`.
4. Lưu env vars trong QRTable:

```
 SEPAY_PLATFORM_WEBHOOK_SECRET=...
 SEPAY_PLATFORM_QR_ACCOUNT=xxxxxxxxx
 SEPAY_PLATFORM_QR_BANK=Vietcombank
```

**Runtime flow (mỗi lần Owner mua/gia hạn gói):**

```
Owner ở /dashboard/subscription chọn gói PREMIUM, click "Thanh toán"
  ↓
SaaS Service tạo subscription_invoices row với:
  - billing_reference = "QRSUB" + 8 chars
  - amount_vnd = plan.price_vnd
  - status = PENDING
  - expires_at = +24h
  ↓
Generate QR URL: https://qr.sepay.vn/img?acc={PLATFORM_ACC}&bank={PLATFORM_BANK}&amount={price}&des=QRSUBxxxxxxxx
  ↓
Owner thấy QR ở /dashboard/billing/[invoiceId], scan, chuyển khoản
  ↓
Bank platform nhận tiền → SePay detect → POST /api/v1/payment/sepay/webhook/platform
  Body: { code: "QRSUBxxxxxxxx", transferAmount: 999000, ... }
  ↓
BFF verify X-Secret-Key (= SEPAY_PLATFORM_WEBHOOK_SECRET)
  ↓
BFF route theo prefix:
  - "QRSUB*" → SaaS Service TCP saas.handle_subscription_webhook
  - "QRTBL*" → Payment Service TCP payment.handle_sepay_webhook (Tier 1)
  ↓
SaaS Service:
  - Match billing_reference
  - Verify amount >= invoice.amount_vnd
  - subscription_invoices.status = PAID
  - tenant.current_subscription = new active subscription (plan + expires_at)
  - Outbox event "subscription.activated"
  ↓
BFF emit WS subscription.activated → /dashboard/subscription auto-refresh → Owner thấy "Plan kích hoạt"
```

**Đây là 100% tự động.** Owner chuyển khoản xong, plan kích hoạt trong vòng < 30 giây.

### 19.2 Tier 1 — Customer Pays Tenant (Mô hình OAuth2 Connect — recommended)

**Setup ban đầu (1 lần, do bạn — platform owner):**

1. Đăng ký QRTable làm OAuth2 client với SePay (qua liên hệ SePay support hoặc developer portal).
2. Lưu env vars:

```
 SEPAY_OAUTH_CLIENT_ID=qrtable_xxx
 SEPAY_OAUTH_CLIENT_SECRET=...
 SEPAY_OAUTH_REDIRECT_URI=https://app.qrtable.io/dashboard/payment-settings/sepay-callback
```

**Runtime onboarding flow (mỗi tenant — 100% tự động):**

```
Tenant đăng nhập QRTable → /dashboard/payment-settings
  ↓
Click "Kết nối SePay"
  ↓
QRTable redirect tới:
  https://my.sepay.vn/oauth/authorize?
    response_type=code
    &client_id=qrtable_xxx
    &redirect_uri=https://app.qrtable.io/dashboard/payment-settings/sepay-callback
    &scope=bank-account:read transaction:read profile
    &state={CSRF_random + tenant_id encoded}
  ↓
Tenant đăng nhập SePay account của họ (đã đăng ký riêng FREE)
Tenant chọn "Cho phép QRTable đọc danh sách tài khoản + giao dịch"
  ↓
SePay redirect về QRTable callback với code=AUTHORIZATION_CODE&state=...
  ↓
QRTable backend:
  - Verify state (CSRF protection)
  - POST https://my.sepay.vn/oauth/token với grant_type=authorization_code
  - Nhận về { access_token, refresh_token, expires_in }
  - Encrypt + lưu vào tenant_payment_settings:
      sepay_access_token (encrypted), sepay_refresh_token (encrypted), sepay_token_expires_at
  ↓
QRTable backend gọi GET /api/v1/bank-accounts với Bearer access_token
  → Nhận về list bank accounts của tenant (có thể nhiều)
  ↓
QRTable hiển thị danh sách → Tenant chọn 1 bank account để nhận tiền customer
  ↓
QRTable backend:
  - Lưu sepay_bank_account_id vào tenant_payment_settings
  - Setup webhook trong SePay account của tenant qua API:
      POST {tenant_sepay_base}/v1/webhook
      Body: {
        webhook_url: "https://app.qrtable.io/api/v1/payment/sepay/webhook/{tenantSlug}",
        auth_type: "SECRET_KEY",
        secret_key: generateRandom(32),  // unique per tenant
        active: 1,
        allow_events: ["*"]
      }
    Response: { secret_key: "tenant_specific_secret" }
  - Lưu webhook_secret_key vào tenant_payment_settings (encrypted)
  ↓
DONE. Tenant payment_settings.verified_at = now(). UI hiển thị "🟢 Connected".
```

**Runtime customer payment (100% tự động):**

```
Customer ở table T-05 nhấn "Thanh toán" → request bill → bill PENDING_PAYMENT
  ↓
Staff chọn tab "VietQR" trên POS
  ↓
Payment Service:
  - Get tenant_payment_settings(tenantId) → { sepay_bank_account_id, ... }
  - Optional: gọi GET /v2/bank-accounts/{uuid} để lấy account_number, bank_short_name (cache 1h)
  - Generate QR URL: https://qr.sepay.vn/img?acc={tenant_bank}&bank={tenant_bank_name}&amount={rounded}&des=QRTBLxxxxxxxx
  ↓
Customer scan QR, chuyển khoản từ app NH cá nhân
  ↓
Tiền vào TK ngân hàng của TENANT
  ↓
SePay (account của tenant) detect → POST đến tenant-specific webhook URL:
  https://app.qrtable.io/api/v1/payment/sepay/webhook/{tenantSlug}
  Body: { code: "QRTBLxxxxxxxx", accountNumber: "...", transferAmount: 128000, ... }
  Headers: X-Secret-Key: tenant_specific_secret (đã setup khi onboarding)
  ↓
BFF route:
  - Extract tenantSlug từ URL param
  - Resolve tenant_id từ slug
  - Get tenant_payment_settings(tenant_id).webhook_secret_key
  - Verify X-Secret-Key match
  - Forward TCP payment.handle_sepay_webhook với tenantId context
  ↓
Payment Service:
  - Match billReference QRTBLxxxxxxxx scoped to tenantId
  - Mark payment PAID (Phase 3 logic giữ nguyên)
  - Outbox payment.completed
  ↓
WS notify → POS + Customer thấy "Đã thanh toán"
```

**Đây là 100% tự động cho cả luồng tenant onboard SePay + luồng customer pay.**

### 19.3 So Sánh 3 Architecture Options (Final)

| Tiêu chí                            | **Option α — OAuth2 Connect (RECOMMENDED)**        | Option β — Platform-managed manual link                           | Option γ — Virtual Account (VA)                   |
| ----------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| **Tự động hoá onboarding**          | ✅ 100% (OAuth2 flow)                              | ❌ SUPER_ADMIN phải link bank vào SePay platform 1 lần per tenant | ✅ API auto-create VA                             |
| **Tenant cần SePay account riêng?** | ✅ Có (FREE 50 tx)                                 | ❌ Không (dùng platform's)                                        | ❌ Không                                          |
| **Money flow**                      | Tiền → tenant's bank trực tiếp                     | Tiền → tenant's bank (nhưng platform's SePay đọc SMS)             | Tiền → platform's bank → cần payout               |
| **Legal status (VN)**               | Sạch — tenant nhận tiền trực tiếp                  | Sạch — tenant nhận tiền trực tiếp                                 | Marketplace — platform giữ tiền (cần MIC license) |
| **Cost demo thesis**                | 0đ (4 SePay FREE accounts: 1 platform + 3 tenants) | 0đ (1 SePay FREE account chung)                                   | 0đ (BIDV/Sacombank required)                      |
| **SUPER_ADMIN intervention**        | 0 (tenant tự làm)                                  | 1 lần per tenant (link bank)                                      | 0                                                 |
| **Bank coverage**                   | 10 banks (FREE) hoặc 30 (Pinnacle)                 | Same                                                              | BIDV / Sacombank only                             |
| **Demo "Stripe Connect"-like UX**   | ✅ rất ấn tượng                                    | Không có flow đẹp                                                 | Không có flow connect                             |
| **Implementation effort**           | ~5-6 ngày dev                                      | ~3 ngày dev                                                       | ~4-5 ngày dev                                     |
| **Production scaling**              | Excellent — tenant tự manage                       | Khó — SUPER_ADMIN bottleneck                                      | Cần payout flow + accounting                      |

**Khuyến nghị MẠNH cho thesis: Option α (OAuth2 Connect)** vì:

1. Đáp ứng 100% mục tiêu của bạn ("hoàn toàn tự động").
2. Demo thuyết phục — kể được câu chuyện "Stripe Connect-like cho thị trường VN".
3. Cost 0đ.
4. Architecture cleaner hơn 2 options còn lại.

### 19.4 Migration Impact (chi tiết hơn §14.2)

| Step | Action                                                                                                                                                                                                            | Owner          | Effort         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 1    | Đăng ký QRTable làm OAuth2 client với SePay (manual contact SePay support)                                                                                                                                        | Platform owner | 1 ngày liên hệ |
| 2    | Migration `qrtable_payment`: tạo `tenant_payment_settings` table (incl `sepay_access_token`, `sepay_refresh_token`, `sepay_token_expires_at`, `sepay_bank_account_uuid`, `webhook_secret_key`, encrypted columns) | Phase 4B       | 0.5 ngày       |
| 3    | Backend OAuth2 callback handler: `/dashboard/payment-settings/sepay-callback` exchange code→token                                                                                                                 | Phase 4B       | 1 ngày         |
| 4    | Backend SePay client: encrypt token storage + auto-refresh (`POST /oauth/token` với refresh_token khi expired)                                                                                                    | Phase 4B       | 1 ngày         |
| 5    | Backend service: list bank accounts (`GET /api/v1/bank-accounts`) + cache 1h                                                                                                                                      | Phase 4B       | 0.5 ngày       |
| 6    | Backend service: setup webhook tự động (`POST /v1/webhook`) khi tenant chọn bank                                                                                                                                  | Phase 4B       | 0.5 ngày       |
| 7    | Refactor `PaymentSettlementService` đọc bank info từ `tenant_payment_settings` thay vì env vars                                                                                                                   | Phase 4B       | 0.5 ngày       |
| 8    | BFF webhook routing: per-tenant URL `/payment/sepay/webhook/{tenantSlug}` + per-tenant secret verify                                                                                                              | Phase 4B       | 0.5 ngày       |
| 9    | UI `/dashboard/payment-settings`: "Kết nối SePay" button + callback handler + bank picker + status                                                                                                                | Phase 4B FE    | 1.5 ngày       |
| 10   | Tier 2 webhook handler (SaaS Service): `subscription.handle_subscription_webhook` + `QRSUB` prefix routing                                                                                                        | Phase 4B       | 1 ngày         |
| 11   | UI `/dashboard/billing/[invoiceId]`: QR display + polling + auto-redirect khi PAID                                                                                                                                | Phase 4B FE    | 1 ngày         |
| 12   | Migration script: backfill `tenant_payment_settings` từ existing env vars (single demo tenant nếu cần)                                                                                                            | Phase 4B       | 0.5 ngày       |
| 13   | Documentation: setup guide cho tenant kết nối SePay (FAQ, troubleshooting)                                                                                                                                        | Phase 4B       | 0.5 ngày       |

**Total effort estimate cho Tier 1 (OAuth2) + Tier 2 (Webhook auto):** ~10-11 ngày dev (1.5-2 tuần) — bổ sung lên Phase 4B.

**Phase 4B mới (gồm cả Tier 1 + Tier 2 OAuth2):** ~2.5-3 tuần thay vì 1 tuần ban đầu.

---

## 20. Câu Hỏi Mới (Q23–Q25) — Replace Q18

### Q23. Tier 1 architecture (THAY THẾ Q18 cũ)

| Option | Mô tả                                                                                                             | Pros                                        | Cons                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| **α**  | **OAuth2 Connect:** Tenant tự đăng ký SePay account, OAuth flow trong QRTable, tự động setup webhook (xem §19.2). | 100% auto, true SaaS, "Stripe Connect-like" | Tenant phải có SePay account (FREE OK)         |
| β      | Platform-managed: 1 SePay account chung, SUPER_ADMIN link bank của tenant manual qua dashboard.                   | Tenant không cần SePay                      | SUPER_ADMIN bottleneck mỗi onboard             |
| γ      | Virtual Account: 1 platform bank (BIDV/Sacombank), API auto-create VA per tenant. Money → platform → payout.      | 100% auto, no per-tenant SePay              | Marketplace model, legal headache, payout flow |
| δ      | Defer (Phase 5+): giữ env var single bank, 1 tenant only.                                                         | Phase 4B nhỏ                                | Demo không thực sự multi-tenant ở Tier 1       |

**Khuyến nghị: α** (đáp ứng mục tiêu "100% tự động" của bạn, cost 0đ thesis, và demo ấn tượng nhất).

### Q24. Tier 2 architecture (THAY THẾ một phần Q19 cũ)

| Option | Mô tả                                                                                                                             | Pros                                         | Cons                                                 |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| **A**  | **Auto VietQR + webhook → auto-activate:** Owner click "Thanh toán", QR generate → chuyển khoản → webhook → activate (xem §19.1). | 100% auto, < 30s từ chuyển khoản → kích hoạt | Cần webhook routing (đã giải quyết với QRSUB prefix) |
| B      | Manual: Owner chuyển khoản, SUPER_ADMIN approve và assign plan trong `/admin/tenants/:id`.                                        | Đơn giản nhất                                | UX chậm, SUPER_ADMIN bottleneck                      |
| C      | Hybrid: A mặc định, B fallback khi webhook fail (admin override).                                                                 | Robust                                       | Slightly more code                                   |

**Khuyến nghị: C** (A as primary, B as fallback for edge cases).

### Q25. SePay OAuth2 client registration (CONFIRMED qua Round 3.5)

**Bối cảnh — Verified (docs.sepay.vn/oauth2/dang-ky-ung-dung.html):**

> SePay docs chính thức ghi: _"Lưu ý: **Hiện tại bạn chưa thể tự tạo ứng dụng được. Bạn phải liên hệ SePay** để được hỗ trợ phê duyệt và tạo ứng dụng ở tài khoản của bạn."_
>
> Sau khi được approve, ứng dụng xuất hiện trong **"Tài khoản → Ứng dụng OAuth"** trong dashboard tenant của bạn để bạn tự quản lý (chỉnh sửa redirect URI, scopes, xóa).

**Cập nhật scopes (verified, đầy đủ hơn Round 3 §18.1):**

| Scope               | Quyền                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `bank-account:read` | Xem danh sách tài khoản, số dư, chi tiết từng tài khoản                                    |
| `transaction:read`  | Xem lịch sử giao dịch, chi tiết giao dịch, đếm số lượng                                    |
| `**webhook:read`    | **Xem danh sách webhook, chi tiết từng webhook** (mới phát hiện)                           |
| `**webhook:write`   | **Tạo mới + cập nhật webhook** (mới phát hiện — confirm Q23 α auto webhook setup feasible) |
| `**webhook:delete`  | **Xóa webhook** (mới phát hiện)                                                            |
| `profile`           | Xem thông tin cá nhân người dùng                                                           |
| `**company`         | **Xem thông tin chi tiết về công ty** (mới phát hiện)                                      |

**Ý nghĩa cho Q23 α:** Có scope `webhook:write` → flow §19.2 step "Setup webhook tự động (`POST /v1/webhook`)" hoàn toàn khả thi qua API, **không cần can thiệp manual**.

**Lựa chọn cho Q25:**

| Option | Mô tả                                                                                                                                                                                                                                    | Pros                                                   | Cons                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **A**  | **Liên hệ SePay ngay (TUẦN NÀY).** Email/chat fb.me/sepay.vn hoặc tel: 02873.059.589 — request OAuth2 app cho thesis demo + scopes `bank-account:read`, `transaction:read`, `webhook:read`, `webhook:write`, `webhook:delete`, `profile` | Nếu được approve → có credentials thật demo end-to-end | Phụ thuộc thời gian phản hồi SePay (1-7 ngày)       |
| B      | Implement code OAuth2 song song, mock OAuth2 server local cho dev (ví dụ `oauth2-mock-server` npm package); credentials thật chỉ cần khi demo.                                                                                           | Phase 4B không bị block                                | Risk: thesis defense ngày đó SePay vẫn chưa approve |
| C      | Downgrade Q23 sang β / γ / δ → không cần OAuth2 → không cần liên hệ.                                                                                                                                                                     | Đơn giản, không phụ thuộc bên thứ ba                   | Mất "100% auto" + mất demo highlight                |
| D      | Hybrid A+B: liên hệ A song song với code mock B. Nếu A approve trước thesis → demo Path 3 đầy đủ; nếu A delay → demo với mock OAuth + giả lập SePay sandbox locally.                                                                     | Chống risk tối đa                                      | Phải maintain 2 paths code (mock + real)            |

**Khuyến nghị: D (Hybrid).** Cụ thể:

1. **Ngay hôm nay:** Soạn email/inbox FB tới SePay support với nội dung:
   > _"Tôi đang triển khai project [QRTable] làm luận án tốt nghiệp ngành Khoa học Máy tính. Project mô phỏng nền tảng SaaS cho ngành F&B Việt Nam, trong đó tích hợp SePay làm provider thanh toán cho cả 2 luồng: (1) tenant chuyển khoản subscription cho platform; (2) khách hàng cuối chuyển khoản cho từng nhà hàng (qua OAuth2 Connect, mỗi tenant authorize app của tôi truy cập SePay account của họ). Tôi xin được đăng ký 1 OAuth2 application trên SePay với các scopes: bank-account:read, transaction:read, webhook:read, webhook:write, webhook:delete, profile. Mục đích academic, không thương mại. Redirect URI: [https://app.qrtable.io/dashboard/payment-settings/sepay-callback](https://app.qrtable.io/dashboard/payment-settings/sepay-callback) (hoặc localhost cho dev)."_

- Channels: Email [support@sepay.vn](mailto:support@sepay.vn) / inbox fb.me/sepay.vn / tel: 02873.059.589.

1. **Trong khi chờ:** Implement Phase 4B với mock OAuth2 server local. Dùng `oauth2-mock-server` npm package hoặc tự stub. Code production-ready với env vars `SEPAY_OAUTH_BASE_URL` (default `https://my.sepay.vn`, có thể switch `http://localhost:9999` cho dev).
2. **Có 2 outcomes:**

- **A approve** (xác suất ~70%): demo thesis với SePay thật. Switch env vars → real production.
- **A reject hoặc delay** (xác suất ~30%): demo thesis với mock OAuth + production-ready code. Document trong slide thesis: "OAuth2 với SePay đang chờ approve; mock OAuth được dùng cho demo, code đã production-ready cho cutover khi approve". Đây vẫn là acceptable cho luận án vì kiến trúc đã đúng.

---

## 21. Cập Nhật Quick Decision Checklist (Round 3)

Tổng kết Q1–Q25 (15 cũ + 7 round 2 + 3 round 3):

| #       | Câu hỏi                                                  | Khuyến nghị                                                                                           |
| ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Q1      | `isActive` vs `status`                                   | C (giữ cả 2 với mapper)                                                                               |
| Q2      | Suspend behavior với active session                      | B (read-only + payment allowed)                                                                       |
| Q3      | Permission namespace                                     | B (tenant._ / subscription._ / plan.)                                                                 |
| Q4      | Reserved slug source                                     | A (hardcoded const)                                                                                   |
| Q5      | Cron schedule                                            | B (02:00 Asia/Ho_Chi_Minh, grace 24h)                                                                 |
| Q6      | Feature gating layer                                     | C (BFF guard + service backup)                                                                        |
| Q7      | Onboarding TX                                            | B (mini-saga in-process)                                                                              |
| Q8      | Self-service registration wizard                         | A (defer post-thesis) **HOẶC C nếu chốt full SaaS auto** (xem §22 below)                              |
| Q9      | Webhook/Order/WS khi suspend                             | a-Process / b-Allow finish / c-WS banner                                                              |
| Q10     | Admin app structure                                      | A (giữ trong management-app)                                                                          |
| Q11     | Suspend notification channel                             | A→D (defer Notification, dùng TCP sau)                                                                |
| Q12     | Data retention CLOSED                                    | C (defer)                                                                                             |
| Q13     | Counter time-zone                                        | C (hardcoded Asia/Ho_Chi_Minh)                                                                        |
| Q14     | Legacy tenant migration                                  | (a) Free plan vô hạn, (b) SUSPENDED, (c) VND/vi-VN                                                    |
| Q15     | Owner password handoff                                   | A→C (admin-typed, upgrade khi Phase 4C SMTP)                                                          |
| Q16     | Landing page                                             | B (static landing với pricing) **HOẶC C nếu Q8=C**                                                    |
| Q17     | (DEPRECATED — replaced by Q23)                           | Xem Q23                                                                                               |
| ~~Q18~~ | ~~SePay sub-account routing~~                            | **REPLACED bởi Q23** (giả định cũ sai)                                                                |
| Q19     | Tier 2 subscription billing flow                         | **REPLACED bởi Q24** (chi tiết hơn)                                                                   |
| Q20     | `/dashboard/billing` page scope                          | A (build full nếu Q24=A/C)                                                                            |
| Q21     | Webhook prefix QRTBL vs QRSUB                            | Confirm 2 prefix                                                                                      |
| Q22     | Payment settings entity location                         | A (Payment Service owns)                                                                              |
| **Q23** | **Tier 1 architecture (OAuth2 Connect vs alternatives)** | **α (OAuth2 Connect — 100% auto, demo ấn tượng nhất)**                                                |
| **Q24** | **Tier 2 billing flow**                                  | **C (auto webhook + manual fallback)**                                                                |
| **Q25** | **SePay OAuth2 client registration**                     | **D (Hybrid: liên hệ SePay support TUẦN NÀY + mock OAuth2 local song song)** — verified docs.sepay.vn |

---

## 22. Phase Scope Decision Tree (Final)

Tùy theo bạn chốt Q23 + Q24, scope Phase 4B sẽ khác nhau:

### Path 1 — "Pragmatic Demo" (Q23=δ, Q24=B)

- Effort: ~1-1.5 tuần (giống phase doc gốc)
- Demo: SaaS lifecycle + onboarding admin-assisted + 1 tenant Tier 1 demo (env var)
- Trade-off: Document Tier 1 multi-tenant + Tier 2 auto là "Phase 5+ post-thesis"

### Path 2 — "Mid Ground" (Q23=β, Q24=C)

- Effort: ~2 tuần
- Demo: Multi-tenant Tier 1 (manual link), Tier 2 auto webhook
- Trade-off: SUPER_ADMIN can thiệp manual mỗi tenant onboard ở Tier 1

### Path 3 — "Full SaaS Vision" (Q23=α, Q24=C, Q8=C, Q16=C, Q25=D) ⭐ RECOMMENDED

- Effort: ~3-3.5 tuần
- Demo:
  - Public landing page với pricing
  - Self-service registration wizard
  - Tenant tự kết nối SePay (OAuth2 — mock hoặc real tùy SePay approve)
  - Tenant tự thanh toán subscription (auto VietQR webhook)
  - Customer thanh toán → tiền vào tenant's bank
  - Hoàn toàn KHÔNG cần SUPER_ADMIN intervention sau setup ban đầu
- Trade-off: Phase 4B chiếm 40% timeline còn lại của thesis + dependency vào SePay support response time
- Reward: Demo "production-grade SaaS" — highlight điểm mạnh nhất của thesis

---

## 23. Cập Nhật Risk Register (Round 3.5 — sau khi verify SePay docs)

Bổ sung 2 risks mới do constraint thực tế của SePay OAuth2 registration:

| #   | Risk                                                                                                  | Likelihood | Impact | Mitigation                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| R17 | SePay từ chối approve OAuth2 app cho thesis demo (vì ưu tiên businesses thật)                         | Medium     | High   | Q25=D Hybrid: viết email professional, mention thesis academic; nếu reject → fallback Q23=β hoặc mock OAuth |
| R18 | SePay approve nhưng delay > 2 tuần → block Phase 4B end-to-end demo                                   | Medium     | Medium | Q25=D Hybrid: dev với mock OAuth2 server local song song; switch env vars khi credentials có                |
| R19 | SePay approve cho dev/staging nhưng không cho production redirect URI                                 | Low        | Low    | Đăng ký 2 redirect URIs từ đầu (dev + prod); nếu chỉ approve dev → demo thesis dùng dev URI                 |
| R20 | Code OAuth2 dependency trên SePay-specific endpoints (`my.sepay.vn/oauth/authorize`) → vendor lock-in | Low        | Low    | Abstract qua interface `OAuth2Provider`; SePay là 1 implementation; có thể swap sang Casso, BankHub sau     |

---

## Hết Báo Cáo (Round 3.5 — Verified)

> **Verification trail:**
>
> - Round 1: Phase docs review.
> - Round 2: FE pages + Two-tier payment gap discovery.
> - Round 3: Context7 SePay developer docs → confirm OAuth2 + scopes + pricing 0đ.
> - **Round 3.5 (current):** docs.sepay.vn verify → confirm OAuth2 app registration **không self-service**, phải liên hệ SePay support; thêm 3 scopes mới (`webhook:read/write/delete`, `company`); thêm risks R17-R20.
>
> **Hành động tiếp theo:**
>
> 1. **Hôm nay (independent của decision Path):** Soạn email/inbox SePay support theo template ở Q25 D.1. Lý do: response time SePay không chắc chắn, làm sớm tốt hơn.
> 2. **Bạn confirm Path (1 / 2 / 3 ở §22) + answers cho remaining Q1–Q25.** Path 3 là recommended để đạt mục tiêu "SaaS chuẩn 100% tự động".
> 3. Sau khi confirm, tôi viết spec chính thức `docs/specs/business-logic-phase-4b-spec.md` với độ chi tiết đủ làm input cho `writing-plans`.
