# Phase 4B — SaaS Architecture & Business Specification Onboarding + Subscription + Payment Two-Tier

> **Phase:** Phase 4B — SaaS service expansion + tenant lifecycle + Subscription/Plan + Onboarding + Feature Gating + Two-tier Payment (Tier 1 Customer→tenant via OAuth2 SePay Connect, Tier 2 tenant→Platform via VietQR auto-webhook) + Admin/Dashboard UI.
> **Date:** 2026-05-11.
> **Status:** ✅ **Finalized** after Phase 4B audit rounds and Q1–Q25 decisions of the project Owner.
> **Purpose:** This document is the **finalized architecture + business standard** for Phase 4B. Not implementation plan, not task code decomposition. Final deployment status see [Phase 4B record](../phases/phase-4b-saas-onboarding.md).

> **Operational source of truth (2026-05-27):** For **current routes, env vars, setup steps, UI labels and usage counters**, prefer [phase-4b-saas-onboarding.md](../phases/phase-4b-saas-onboarding.md), [sepay-configuration-guide-phase3.md](../guides/sepay-configuration-guide-phase3.md), and [frontend-domain-display.md](../guides/frontend-domain-display.md) over older sections in this spec if they disagree with code on `main`.

---

## 0. Record of Decision (Locked)

| Q                  | Decision           | Closing content                                                                                                                                                                                         |
| ------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1                 | C                  | Keep both `isActive: boolean` (public DTO) + `status: TenantStatus` (admin DTO). Mapper derive `isActive = (status === 'ACTIVE')`.                                                                      |
| Q2                 | B                  | tenant `SUSPENDED` → **read-only mode**: customer can view cart/order already placed, no further submission; authorize payment of bills `PENDING_PAYMENT`; Staff does not create new tables/orders.     |
| Q3                 | B                  | Separate 3 new domain permissions: `tenant.*` (lifecycle), `subscription.*`, `plan.*`. Deprecate `saas.*` legacy (migration script).                                                                    |
| Q4                 | A                  | Reserved slug words = hardcoded const in `libs/constants/src/lib/saas.constants.ts` (~40 keywords — §7.2).                                                                                              |
| Q5                 | B                  | Cron auto-suspend runs daily at `02:00 Asia/Ho_Chi_Minh`, grace period **24h** (suspend at `expires_at + 1 day < now()`).                                                                               |
| Q6                 | C                  | Hybrid feature gating: BFF `TenantPlanGuard` check optimism (UX), target service backup check in TX (correctness).                                                                                      |
| Q7                 | B                  | Onboarding = mini-saga in-process (in SaaS service). Compensation: rollback DB + cleanup cron scan orphan Keycloak users.                                                                               |
| Q8                 | A                  | Self-service registration wizard **defer post-thesis**. Phase 4B only does admin-assisted onboarding via `/admin/tenants/onboard`.                                                                      |
| Q9                 | a + b + c          | (a) SePay webhook until suspended → **still in process** (idempotent + audit `WEBHOOK_AFTER_SUSPEND`). (b) Order `PROCESSING` → kitchen finish to `Served`. (c) WS warning banner, no force disconnect. |
| Q10                | A                  | `/admin/*` belongs to `apps/management-app` (filtered through middleware role check). Do not separate apps.                                                                                             |
| Q11                | Scope reduced      | Phase 4B does not add a notification channel for suspend. Former Phase 4C Notification work is removed from the current implementation scope.                                                           |
| Q12                | C                  | Data retention after `CLOSED` = defer. Phase 4B only soft-flag + disable Keycloak Owner. Hard-delete cron is post-thesis.                                                                               |
| Q13                | C                  | Counter `max_orders_per_day` time-zone = hardcoded `Asia/Ho_Chi_Minh` (target market VN).                                                                                                               |
| Q14                | defaults           | Legacy tenants migrate: (a) backfill `Free` plan with `expires_at = NULL`; (b) `isActive=false` → `status='SUSPENDED'`; (c) `default_currency='VND'`, `default_locale='vi-VN'`.                         |
| Q15                | Current scope      | Phase 4B: SUPER_ADMIN enters password manually when onboard. Keycloak `Required Action: UPDATE_PASSWORD` + email reset link is outside the current implementation scope.                                |
| Q16                | B                  | Landing page = static with pricing table (read from `GET /public/plans`) + CTA "Log in" + "Contact admin" (mailto). **REQUIRED to apply skill `ui-ux-pro-max` when deploying.**                         |
| Q17, Q18, Q19, Q20 | **N/A** (replaced) | Round 2 questions are based on false assumptions. Replaced by Q23 + Q24 after verifying SePay capabilities.                                                                                             |
| Q21                | Confirm            | Two webhook prefixes: `QRTBL*` (Tier 1, bill payment, goes to tenant's bank) and `QRSUB*` (Tier 2, subscription invoice, goes to platform's bank). Document in `BILL_REF_PREFIXES`.                     |
| Q22                | A                  | `tenant_payment_settings` entity belongs to Payment service (`qrtable_payment` DB). SaaS calls TCP `payment.tenant_settings.*` when needed.                                                             |
| Q23                | α (OAuth2 Connect) | Tier 1 = OAuth2 Connect. tenant self-registers SePay account → OAuth flow in QRTable → QRTable saves access_token + auto setup webhook via API (`POST /v1/webhook`).                                    |
| Q24                | C                  | Tier 2 = Auto VietQR webhook + manual fallback. SUPER_ADMIN can manually assign plan in `/admin/tenants/:id` for edge case.                                                                             |
| Q25                | E (Resolved)       | **OAuth2 client available** from SePay support (Client ID + Client Secret obtained). Deploy real OAuth2 flow using real env vars; mock OAuth2 server local only serves automated tests/local isolation. |

### 0.1 What Points Does This Document Override?

1. **tenant entity (`libs/entities/src/lib/tenant.entity.ts`):** expands from 4 columns → 11+ columns. `isActive` is kept as a derived field (Q1=C).
2. **Permission matrix:** 65 permissions in the current code (Q3=B), including `tenant.*`, `subscription.*`, `plan.*`, `payment_settings.*`; keep `saas.*` legacy/backward compatibility.
3. **Payment service (Phase 3):** **refactor** reads bank info from `tenant_payment_settings` (Q22=A) instead of env var `PAYMENT_SEPAY_QR_*` (still keeping env as fallback dev).
4. **BFF webhook routing:** from single endpoint `/payment/sepay/webhook` (Phase 3) → 2 endpoints + prefix-based routing (Q21):
   - `/payment/sepay/webhook/platform` for Tier 2 (`QRSUB*`)
   - `/payment/sepay/webhook/:tenantSlug` for Tier 1 (`QRTBL*`)
5. **TenantGuard (`libs/guards/src/lib/tenant.guard.ts`):** extends Redis check flag `tenant:{id}:suspended` before passing through PermissionGuard.
6. **Customer PWA SessionGuard:** added check tenant status. Block submit order when `SUSPENDED`, allow read + payment.
7. **Phase 4B not implemented:**
   - Self-service registration wizard (Q8=A defer).
   - Hard-delete CLOSED tenant data (Q12=C defer).
   - Notification email when suspending (removed from current project scope).
   - Internationalization (Q13 hardcoded VN).
   - Partial subscription refund (post-thesis).

### 0.2 Path Chosen = "Path 2.5"

Hybrid between Path 2 and Path 3 in audit §22:

- **Onboarding admin-assisted** (Path 2): SUPER_ADMIN creates tenant via `/admin/tenants` modal. There is no self-service wizard.
- **After onboarding: 100% automated** (Path 3):
  - tenant automatically logs in → automatically connects to SePay (OAuth2) → automatically configures the bank → automatically receives customer money.
  - Tenants self-pay subscriptions via VietQR auto-webhook → self-activate plan < 30 seconds.
- **Result:** Demo "production-grade SaaS" without building the entire 4-step wizard. Trade-off cost-benefit optimal for thesis.

---

## 1. Documentation and Verification

### 1.1 Facility in Repo

- `docs/phases/phase-4b-saas-onboarding.md` — final phase record.
- `docs/business-logic.md` §1 (Onboarding), §9 (Permissions), §B (tenant Status), §D (tenant Isolation).
- `docs/technical-architecture.md` §5 (Multi-tenancy), §6.2.3 (SaaS service), §7.2-7.4 (Kafka 4P+2AP), §8 (Auth), §11.2 (Redis Access Policy).
- `docs/architecture/permission-matrix.md` (canonical 6 roles × 65 permissions).
- `docs/architecture/erd.dbml` + `erd_explanation.md`.
- `docs/specs/business-logic-phase-3-spec.md` — pattern reference for spec format.
- `docs/phases/phase-3-payment.md` — Payment/outbox pattern implemented.
- Current code: `tenant`, `SaasService`, `PaymentSettlementService`, `OutboxEventEntity` (Order), `PaymentOutboxEventEntity`, `KeycloakHttpService`, `User` (Mongo schema), `TenantGuard`, `SessionGuard`.

### 1.2 Verification from Context7 + Live Docs (SePay)

| Capability                                                                                                               | Verified | Source                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| OAuth2 Authorization Code flow (`/oauth/authorize` + `/oauth/token`)                                                     | ✅       | `developer.sepay.vn/vi/sepay-oauth2/luong-xac-thuc`                                                         |
| Scopes: `bank-account:read`, `transaction:read`, `webhook:read`, `webhook:write`, `webhook:delete`, `profile`, `company` | ✅       | `docs.sepay.vn/oauth2/`                                                                                     |
| Self-service OAuth2 app registration                                                                                     | ❌       | `docs.sepay.vn/oauth2/dang-ky-ung-dung.html` — must contact support                                         |
| `GET /api/v1/bank-accounts` (list bank accounts of tenant)                                                               | ✅       | `developer.sepay.vn/vi/sepay-oauth2/tai-khoan-ngan-hang`                                                    |
| `POST /v1/webhook` (programmatic webhook upsert)                                                                         | ✅       | `developer.sepay.vn/vi/bankhub/api/api-webhook/cap-nhat-webhook`                                            |
| Webhook authentication                                                                                                   | ✅       | Phase 3 direct route currently uses HMAC; Phase 4B tenant/platform routes uses `x-secret-key` separate path |
| Pricing FREE 50tx/month + full API access                                                                                | ✅       | `sepay.vn/bang-gia.html`                                                                                    |
| Unlimited bank accounts per SePay account                                                                                | ✅       | FAQ `sepay.vn/bang-gia.html`                                                                                |

**Cost analysis for thesis demo:** 0 VND (1 SePay free platform + N SePay free tenants, each 50 tx/month).

### 1.3 OAuth2 Credentials Issued (Q25=E)

- ✅ **Client ID + Client Secret from SePay support already obtained** (xem `.env` config — Q23 + Q25 resolved).
- **Redirect URI registered:** `https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback`.
- Local dev/backend webhook: use tunnel (ngrok/cloudflared or equivalent) to expose backend and configure `PUBLIC_API_BASE_URL`; redirect URI can add `http://localhost:3001/dashboard/payment-settings/sepay-callback` for dev if SePay allows it.
- Mock OAuth2 local is no longer a strategic fallback for thesis demo; Only used for automated tests or dev isolation when you don't want to call real SePay.

---

## 2. Scope and Out of Scope

### 2.1 Within Phase 4B

#### 2.1.1 Backend

1. **SaaS service extension (`apps/saas`):**

- tenant CRUD with lifecycle (`ACTIVE` / `SUSPENDED` / `CLOSED`).
  - Slug generation Vietnamese-aware + reserved words check.
  - Subscription CRUD + Plan CRUD.
  - Onboarding mini-saga in-process (orchestrate Authorizer + User-Access + Catalog + DB).
  - Cron daily auto-suspend `02:00 Asia/Ho_Chi_Minh` (grace 24h).
  - Subscription invoice generation + auto-activate via webhook.
- Outbox pattern for `tenant.created` Kafka.

2. **Payment service refactor (`apps/payment`):**

- Add entity `tenant_payment_settings` (per-tenant bank info + SePay OAuth tokens).
- Refactor `PaymentSettlementService` to read bank from DB instead of env var.
  - OAuth2 client logic (token storage, auto-refresh, bank list, webhook setup).
  - Webhook routing: prefix `QRTBL*` → Tier 1 bill payment; prefix `QRSUB*` → forward TCP to SaaS service.

3. **Authorizer service extended (`apps/authorizer`):**

- Add Keycloak Admin operations: `assignRealmRole`, `removeRealmRole`, `disableUser`, `getUserById`.

4. **User-Access service extended (`apps/user-access`):**

- Add `tenantId` field to `User` Mongo schema + index + auto-set when `upsertByIdentity`.
- Add TCP `user.count_by_tenant` for L1 gating (`max_staff`).

5. **Extended service catalog (`apps/catalog`):**

- Kafka consumer `tenant.created` → seed default area "General area".
- Add TCP `catalog.count_tables` for L1 gating (`max_tables`).

6. **Extended service order (`apps/order`):**
   - Redis counter `quota:{tenantId}:orders:{YYYY-MM-DD-HCM}` (TZ Asia/Ho_Chi_Minh).

- L2 backup check in submit order TX.

7. **BFF (`apps/bff`):**

- New routes: `/admin/tenants/*`, `/admin/plans/*`, `/admin/billing/*`, `/dashboard/subscription/*`, `/dashboard/billing/*`, `/dashboard/payment-settings/*`, `/public/plans`, `/public/landing-info`.
  - SePay OAuth callback handler.
  - Per-tenant webhook routing `/payment/sepay/webhook/:tenantSlug`.
- Platform webhook `/payment/sepay/webhook/platform` for Tier 2.
- new `TenantPlanGuard` (composable with `PermissionGuard`).
- `TenantStatusGuard` new (check Redis suspend flag).
- Migration `TenantGuard` to integrate status check.
  - WebSocket event `tenant.suspended` → broadcast tenant rooms.

#### 2.1.2 Frontend (management-app + customer-pwa)

1. **Landing page (`/` of management-app):**

- Static with hero + pricing table (read `GET /public/plans`) + CTA.
- **REQUIRED to apply skill `ui-ux-pro-max`** with product type = SaaS + tone = professional + modern (see §13.1).

2. **Admin pages (SUPER_ADMIN):**
   - `/admin` — Platform Overview Dashboard (widgets: tenant counts, expiring soon, MRR).

- `/admin/tenants` — Directory with filter + onboard modal + row actions (suspend/activate/close/assign plan).
  - `/admin/tenants/[id]` — Detail tabs (Overview / Subscription History / Usage / Audit / Billing).
  - `/admin/plans` — CRUD pricing plans.
  - `/admin/billing` — Subscription invoices reconciliation.

3. **Dashboard pages (Owner + MANAGER):**

- `/dashboard` — Add widget "Plan & Quota".
  - `/dashboard/subscription` — Plan detail, compare, history, checkout button.
  - `/dashboard/billing/[invoiceId]` — VietQR display + polling auto-redirect.
  - `/dashboard/payment-settings` — SePay Connect button + bank picker + verify status.
  - `/dashboard/payment-settings/sepay-callback` — OAuth2 callback handler.

4. **Customer PWA:**

- Banner "Store temporarily locked" when tenant `SUSPENDED`.
- Disable "Add to cart", "Order" buttons.
- Still allowed to view bills + pay bills `PENDING_PAYMENT` created.

5. **Sidebar nav update:**

- Owner: add `Subscription`, `Payment settings`, `Pay plan`.
- MANAGER: add `Subscription` (read-only).
- SUPER_ADMIN: add `Tenants`, `Plans`, `Billing`.

#### 2.1.3 Infrastructure

1. Add npm deps: `@nestjs/schedule` (cron) + `slugify` (or write your own §7.1).
2. SaaS service connect Redis (suspend flag, subscription cache).
3. SaaS service connect Kafka (producer for `tenant.created`).
4. SQL migrations theo §14.

### 2.2 Out of Scope Phase 4B

1. **Self-service registration wizard** (Q8=A) — defer post-thesis.
2. **Hard-delete CLOSED tenant data** (Q12=C) — defer.
3. **Notification emails** for lifecycle (welcome / suspended / expired) — outside the current implementation scope.
4. **Internationalization** — hardcoded `Asia/Ho_Chi_Minh` + `vi-VN`.
5. **Partial subscription refund / proration on upgrade-downgrade** — post-thesis.
6. **Multi-bank support per tenant** (Phase 4B = 1 SePay account → 1 active bank account per tenant; can switch, but not multi-active).
7. **tenant transfer ownership** between users — post-thesis.
8. **Subscription discount codes / promotions** — post-thesis.
9. **Webhook replay dashboard** — post-thesis.
10. **Audit dashboard for compliance** — post-thesis.

---

## 3. service Boundary and Ownership

### 3.1 Ownership Matrix

| Concern                                 | service                                               | Why                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenants` table                         | **SaaS service** (`qrtable_saas`)                     | tenant is aggregate root of SaaS domain.                                                                                                     |
| `pricing_plans` table                   | **SaaS service**                                      | Platform-level entity, has no tenant_id.                                                                                                     |
| `subscriptions` table                   | **SaaS service**                                      | Subscription = relation tenant ↔ Plan.                                                                                                      |
| `subscription_invoices` table           | **SaaS service**                                      | Tier 2 Invoice (tenant pays platform); belongs to the SaaS domain. **Different** from Payment service (only Owner of Tier 1 customer bills). |
| `saas_outbox_events` table              | **SaaS service**                                      | Local outbox for `tenant.created` + `subscription.activated`.                                                                                |
| `tenant_payment_settings` table         | **Payment service** (`qrtable_payment`)               | Bank info + OAuth tokens is payment-domain data (Q22=A).                                                                                     |
| Payment QR generation for Tier 1        | **Payment service**                                   | There are already patterns; Just refactor reading from DB instead of env.                                                                    |
| Payment QR generation for Tier 2        | **SaaS service**                                      | Subscription invoice ≠ bill; SaaS reuse `PaymentReferenceService` pattern from Payment.                                                      |
| SePay OAuth2 callback handling          | **Payment service** (token exchange + storage)        | OAuth flow ends with bank account selection → write to Payment DB.                                                                           |
| Webhook routing                         | **BFF** (prefix-based + tenant slug routing)          | Single entrypoint; routes to the correct TCP service.                                                                                        |
| Tier 1 webhook handler                  | **Payment service** (keeps the pattern Phase 3)       | Match `QRTBL*` → settle bill.                                                                                                                |
| Tier 2 webhook handler                  | **SaaS service** (new)                                | Match `QRSUB*` → activate subscription.                                                                                                      |
| User profile (`users` Mongo collection) | **User-Access service**                               | Already exists; add `tenantId` field.                                                                                                        |
| Keycloak user CRUD                      | **Authorizer service**                                | Already have; extend.                                                                                                                        |
| tenant suspend Redis flag               | **SaaS service** writes; **BFF guards** read.         | SaaS is source of truth.                                                                                                                     |
| Feature gating logic                    | **BFF `TenantPlanGuard`** + **target service backup** | Q6=C hybrid.                                                                                                                                 |
| Counter `max_orders_per_day`            | **Order service** (Redis incr)                        | Order is where order is born.                                                                                                                |
| Counter `max_tables`, `max_staff`       | **Catalog / User-Access** (DB COUNT)                  | Source service owns the count.                                                                                                               |
| Sidebar nav filtering                   | **management-app** (FE)                               | Existing pattern, extended.                                                                                                                  |

### 3.2 Communication Matrix (Phase 4B Additions)

| From            | To               | Protocol                            | Use case                                                                                      |
| --------------- | ---------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| BFF             | SaaS service     | TCP                                 | Onboard tenant, list tenants, lifecycle commands, plan/subscription CRUD, get invoice status. |
| BFF             | Payment service  | TCP                                 | tenant_payment_settings CRUD, OAuth2 callback exchange, list SePay bank accounts.             |
| BFF             | Authorizer       | TCP (existing gRPC for auth verify) | Keycloak admin operations (createUser + assignRole + disableUser).                            |
| BFF             | User-Access      | TCP                                 | Upsert user profile with tenantId, count staff.                                               |
| SaaS service    | Authorizer       | TCP                                 | Onboarding saga step: create Keycloak user.                                                   |
| SaaS service    | User-Access      | TCP                                 | Onboarding saga step: upsert profile.                                                         |
| SaaS service    | Payment service  | TCP                                 | Onboarding saga step: init empty `tenant_payment_settings` row.                               |
| SaaS service    | Catalog service  | Kafka (`tenant.created` topic)      | Seed default area (async — outside HTTP TX).                                                  |
| SaaS service    | Redis            | Direct                              | Suspend flag set/unset, subscription cache invalidate.                                        |
| Payment service | SePay API        | HTTPS                               | OAuth token exchange + refresh + bank list + webhook upsert.                                  |
| SaaS service    | SePay (via BFF)  | (via BFF webhook URL)               | Tier 2 webhook reception (BFF → TCP `saas.handle_subscription_webhook`).                      |
| Order service   | Redis            | Direct (existing)                   | Counter `quota:*` per-day.                                                                    |
| BFF             | Redis            | Direct (existing)                   | Read suspend flag, subscription cache (5min TTL).                                             |
| Cron Worker     | SaaS service     | In-process (`@nestjs/schedule`)     | Daily auto-suspend.                                                                           |
| Authorizer Cron | Keycloak + Mongo | Direct                              | Orphan KC user cleanup (compensation for onboarding saga failure).                            |

### 3.3 Database Topology (Updated)

```
PostgreSQL Instance
├── qrtable_saas
│   ├── tenants                    (extended: 11+ columns)
│   ├── pricing_plans              (new)
│   ├── subscriptions              (new)
│   ├── subscription_invoices      (new — Tier 2)
│   └── outbox_events              (new — for tenant.created + subscription.activated)
├── qrtable_catalog                (no schema change)
├── qrtable_order                  (no schema change; Redis counters added)
└── qrtable_payment
    ├── payments                   (existing)
    ├── refunds                    (existing)
    ├── audit_payments             (existing)
    ├── outbox_events              (existing)
    └── tenant_payment_settings    (NEW — per-tenant bank + OAuth tokens)

MongoDB
└── qrtable_auth
    ├── users                      (MIGRATION: add tenantId field + index)
    └── roles                      (no change)

Redis (Phase 4B additions)
- tenant:{id}:suspended       → "1" (no expire, explicit DEL when activate)
- subscription:{tenantId}     → cached current subscription JSON (TTL 5min)
- quota:{tenantId}:orders:{YYYY-MM-DD-HCM} → counter (TTL 48h)
- oauth_state:{state}         → tenantId + CSRF data (TTL 5min)
```

---

## 4. State Machines

### 4.1 Tenant Lifecycle

```
                     onboarding
                     success
        (no state) ────────────► [ACTIVE] ──── suspend ────► [SUSPENDED]
                                    ▲                            │
                                    │                            │
                                    └──── activate ──────────────┘
                                    │                            │
                                    └────── close ──────────────►[CLOSED] (terminal)
```

#### Transitions

| From      | To        | Trigger                                                             | Actor                 | Side-effects (sync, atomic in TX)                                                                                                                                         | Side-effects (async, post-commit)                                                  |
| --------- | --------- | ------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| (initial) | ACTIVE    | Onboarding mini-saga success (§7.3)                                 | SUPER_ADMIN           | Insert `tenants` row, `subscriptions` row (Free plan, expires_at=NULL), `tenant_payment_settings` row (empty), `outbox_events` row (tenant.created).                      | Catalog consumer seed area. SaaS clears `tenant:{id}:suspended` flag (idempotent). |
| ACTIVE    | SUSPENDED | (a) Cron expiry, (b) Admin manual, (c) Policy violation (future).   | Cron / SUPER_ADMIN    | Update `tenant.status='SUSPENDED'`, `tenant.suspended_at=now()`, `tenant.suspended_reason=<reason>`. SET Redis `tenant:{id}:suspended=1`.                                 | BFF emit WS `tenant.suspended` → tenant rooms (banner display).                    |
| SUSPENDED | ACTIVE    | (a) Renew subscription (Tier 2 webhook), (b) Admin manual override. | Webhook / SUPER_ADMIN | Update `tenant.status='ACTIVE'`, `tenant.suspended_at=NULL`. DEL Redis `tenant:{id}:suspended`. Update subscription `expires_at`.                                         | BFF emit WS `tenant.activated`.                                                    |
| ACTIVE    | CLOSED    | Admin manual (irreversible).                                        | SUPER_ADMIN           | Update `tenant.status='CLOSED'`, `tenant.closed_at=now()`, `tenant.closed_reason`. SET Redis `tenant:{id}:suspended=1` (defensive). TCP Authorizer disable Owner KC user. | BFF emit WS `tenant.closed`. (Hard-delete cron is post-thesis Q12=C.)              |
| SUSPENDED | CLOSED    | Admin manual.                                                       | SUPER_ADMIN           | Same as ACTIVE → CLOSED.                                                                                                                                                  | Same.                                                                              |
| CLOSED    | (any)     | **Not allowed** — terminal state.                                   | —                     | Return 409 Conflict.                                                                                                                                                      | —                                                                                  |

#### Guards/Invariants

- `tenants.status` is the single source of truth. `tenants.is_active` is derived: `(status === 'ACTIVE')`.
- Cannot suspend `CLOSED` tenant.
- Cannot activate `CLOSED` tenant.
- Cannot close a tenant with **active session + open bills** (returns 409 with detail; admin must wait for bills settle or force-close with explicit confirmation — Phase 4B: just block).

### 4.2 Subscription Lifecycle

```
        assign / renew                  expire (cron + grace 24h)
   ────► [ACTIVE] ──────────────► [EXPIRED]
            │                          │
            │ supersede (upgrade)      │ admin manual reactivate
            ▼                          ▼
        [SUPERSEDED]              (new subscription ACTIVE)
            │
            │
            ▼
       (terminal — historical only)

         ┌────────────────────────────┐
         │ cancel (user requests)     │
         └────────────────────────────┘
                  │
                  ▼
              [CANCELED]
        (terminal — until current period ends)
```

#### Transition Rules

| From      | To         | Trigger                                                                                   | Actor        | Side-effects                                                                                                                          |
| --------- | ---------- | ----------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| (initial) | ACTIVE     | Onboarding (Free plan, expires_at=NULL) or admin assign plan or Tier 2 webhook activate.  | SaaS service | Insert row. If supersede: set old `SUPERSEDED`. Update `tenant.subscription_summary` cache.                                           |
| ACTIVE    | EXPIRED    | Cron daily detect `expires_at + 24h < now() AND status='ACTIVE' AND plan_code != 'FREE'`. | Cron         | Update row `status='EXPIRED'`. Trigger tenant transition `ACTIVE → SUSPENDED`. Email notification is outside current scope.           |
| ACTIVE    | SUPERSEDED | New subscription `ACTIVE` already insert (upgrade scenario).                              | SaaS service | Set `status='SUPERSEDED'`, `superseded_by_subscription_id=<new_id>`.                                                                  |
| ACTIVE    | CANCELED   | User clicks "Cancel" on `/dashboard/subscription`.                                        | Owner        | Set `status='CANCELED'`, `canceled_at=now()`, `canceled_reason`. tenant continues to use `expires_at`; then cron handle like EXPIRED. |
| EXPIRED   | (—)        | Terminal for subscription row. Admin can create new `ACTIVE` subscription.                | —            | —                                                                                                                                     |

#### Invariants

- **At a time, each tenant has only ONE subscription with `status='ACTIVE'`.** UNIQUE partial index `(tenant_id) WHERE status='ACTIVE'`.
- Free plan: `expires_at=NULL`, **no** cron auto-suspend.
- When inserting a new subscription with a different plan: existing ACTIVE → SUPERSEDED (transaction atomic).

### 4.3 SubscriptionInvoice Lifecycle (Tier 2)

```
   create
(Owner clicks "Payment")
        │
        ▼
   [PENDING]    ←── expire (24h TTL — cron)
        │  ┌──────────────────► [EXPIRED]
        │  │ (terminal)
        │  │
        ▼  ▼
[PAID] (terminal — enable subscription)
        │
│ (admin only — refund not available in Phase 4B)
        ▼
   [CANCELED] (terminal)
```

| From    | To       | Trigger                                                 | Actor               | Side-effects                                                                                    |
| ------- | -------- | ------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| (init)  | PENDING  | Owner click "Pay" on `/dashboard/subscription`          | Owner               | Insert row, generate QR URL, `expires_at = now() + 24h`.                                        |
| PENDING | PAID     | Tier 2 webhook match `QRSUB*` prefix + amount valid.    | SePay webhook       | Set `paid_at`, `sepay_transaction_id`, `paid_amount`. Trigger subscription create/renew (§9.2). |
| PENDING | EXPIRED  | Cron detect `expires_at < now() AND status='PENDING'`.  | Cron (every 1h)     | Set `status='EXPIRED'`. Subscription **does not** activate.                                     |
| PENDING | CANCELED | SUPER_ADMIN manual override or Owner click "Cancel QR". | SUPER_ADMIN / Owner | Set `status='CANCELED'`.                                                                        |

---

## 5. Official Data Schema

### 5.1 Table `tenants` (Extended)

> **Migration strategy:** Add columns + backfill defaults. Keep `is_active` column for backward-compat (becomes derived/computed via mapper).

```sql
-- BEFORE Phase 4B (current state):
-- tenants(id, name, slug, is_active, created_at, updated_at)

-- AFTER Phase 4B:
CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(120) NOT NULL,
  slug              VARCHAR(120) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | SUSPENDED | CLOSED
  type              VARCHAR(30) NOT NULL DEFAULT 'RESTAURANT',  -- CAFE | RESTAURANT | PUB | OTHER
  address           TEXT,
  owner_id          UUID,  -- FK logical → users.userId in Mongo (no DB FK)
  default_currency  VARCHAR(10) NOT NULL DEFAULT 'VND',
  default_locale    VARCHAR(20) NOT NULL DEFAULT 'vi-VN',
  operating_modes   TEXT[] NOT NULL DEFAULT ARRAY['INSTANT_ORDER','DIGITAL_MENU'],
  suspended_at      TIMESTAMPTZ,
  suspended_reason  TEXT,
  closed_at         TIMESTAMPTZ,
  closed_reason     TEXT,
  is_active         BOOLEAN GENERATED ALWAYS AS (status = 'ACTIVE') STORED,  -- derived (Q1=C)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_tenants_slug ON tenants(slug);
CREATE INDEX ix_tenants_status_created_at ON tenants(status, created_at);
CREATE INDEX ix_tenants_owner_id ON tenants(owner_id);
```

**Notes:**

- `status` is discriminator main. `is_active` is **generated column** (Postgres 12+) — read-only, auto-sync.
- `owner_id` references Keycloak `sub` (UUID string format in Keycloak ↔ stored as UUID here).
- `operating_modes` default both modes.
- `suspended_*` and `closed_*` fields for audit trail.

### 5.2 Table `pricing_plans`

```sql
CREATE TABLE pricing_plans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 VARCHAR(40) NOT NULL,    -- 'FREE', 'BASIC', 'PREMIUM'
name VARCHAR(80) NOT NULL, -- 'Free', 'Basic', 'Premium'
  description          TEXT,
  price_vnd            BIGINT NOT NULL DEFAULT 0,
  billing_period       VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',  -- MONTHLY | YEARLY
  max_tables           INTEGER NOT NULL DEFAULT 10,             -- -1 = unlimited
  max_staff            INTEGER NOT NULL DEFAULT 5,
  max_orders_per_day   INTEGER NOT NULL DEFAULT 100,
  features             JSONB NOT NULL DEFAULT '[]'::jsonb,      -- ['basic_pos', 'analytics_basic', ...]
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  display_order        INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_pricing_plans_code ON pricing_plans(code);
CREATE INDEX ix_pricing_plans_active_order ON pricing_plans(is_active, display_order);
```

#### Default seed (Q14)

| code      | name    | price_vnd | max_tables | max_staff | max_orders_per_day | features                                                                     |
| --------- | ------- | --------- | ---------- | --------- | ------------------ | ---------------------------------------------------------------------------- |
| `FREE`    | Free    | 0         | 10         | 5         | 100                | `["basic_pos"]`                                                              |
| `BASIC`   | Basic   | 299000    | 50         | 20        | 1000               | `["basic_pos", "analytics_basic"]`                                           |
| `PREMIUM` | Premium | 999000    | 500        | 100       | 10000              | `["basic_pos", "analytics_basic", "analytics_advanced", "priority_support"]` |

### 5.3 Table `subscriptions`

```sql
CREATE TABLE subscriptions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL,                       -- FK logical → tenants.id
  pricing_plan_id             UUID NOT NULL REFERENCES pricing_plans(id),
  plan_code_snapshot          VARCHAR(40) NOT NULL,                -- snapshot at assign time
  price_vnd_snapshot          BIGINT NOT NULL,                     -- snapshot
  status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | EXPIRED | SUPERSEDED | CANCELED
  starts_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                  TIMESTAMPTZ,                          -- NULL = unlimited (Free)
  superseded_by_subscription_id UUID,                                -- self-FK
  canceled_at                 TIMESTAMPTZ,
  canceled_reason             TEXT,
  expired_at                  TIMESTAMPTZ,
  source                      VARCHAR(30) NOT NULL DEFAULT 'ADMIN_ASSIGN',  -- ADMIN_ASSIGN | INVOICE_PAID | INITIAL_ONBOARDING
  source_invoice_id           UUID,  -- FK logical → subscription_invoices.id when source=INVOICE_PAID
  created_by_user_id          UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE INDEX ix_subscriptions_expires_at ON subscriptions(expires_at) WHERE status = 'ACTIVE';
-- CRITICAL: Only ONE active subscription per tenant
CREATE UNIQUE INDEX uq_subscriptions_active_per_tenant
  ON subscriptions(tenant_id) WHERE status = 'ACTIVE';
```

### 5.4 Table `subscription_invoices` (Tier 2)

```sql
CREATE TABLE subscription_invoices (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       UUID NOT NULL,
  pricing_plan_id                 UUID NOT NULL REFERENCES pricing_plans(id),
  plan_code_snapshot              VARCHAR(40) NOT NULL,
  amount_vnd                      BIGINT NOT NULL,
  billing_period                  VARCHAR(20) NOT NULL,    -- MONTHLY | YEARLY
  period_starts_at                TIMESTAMPTZ NOT NULL,    -- if PAID, subscription starts here
  period_ends_at                  TIMESTAMPTZ NOT NULL,    -- subscription expires here
  billing_reference               VARCHAR(32) NOT NULL,    -- "QRSUB" + 8 chars
  status                          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | PAID | EXPIRED | CANCELED
  qr_url                          TEXT,
  qr_expires_at                   TIMESTAMPTZ NOT NULL,    -- = created_at + 24h
  paid_at                         TIMESTAMPTZ,
  paid_amount_vnd                 BIGINT,                  -- actual transferred (≥ amount_vnd)
  sepay_transaction_id            BIGINT,
  sepay_reference_code            VARCHAR(120),
  sepay_account_number            VARCHAR(64),
  sepay_gateway                   VARCHAR(80),
  sepay_transfer_content          TEXT,
  sepay_transaction_date          TIMESTAMPTZ,
  manually_confirmed_by_user_id   UUID,                    -- non-null if SUPER_ADMIN fallback
  manually_confirmed_at           TIMESTAMPTZ,
  requested_by_user_id            UUID NOT NULL,           -- OWNER who initiated
  expired_at                      TIMESTAMPTZ,
  canceled_at                     TIMESTAMPTZ,
  canceled_reason                 TEXT,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_subscription_invoices_billing_ref ON subscription_invoices(billing_reference);
CREATE UNIQUE INDEX uq_subscription_invoices_sepay_tx ON subscription_invoices(sepay_transaction_id) WHERE sepay_transaction_id IS NOT NULL;
CREATE INDEX ix_subscription_invoices_tenant_status ON subscription_invoices(tenant_id, status, created_at);
CREATE INDEX ix_subscription_invoices_qr_expires_at ON subscription_invoices(qr_expires_at) WHERE status = 'PENDING';
```

### 5.5 Table `saas_outbox_events` (Outbox Pattern)

```sql
CREATE TABLE outbox_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  topic             VARCHAR(120) NOT NULL,
  event_type        VARCHAR(120) NOT NULL,
  aggregate_id      UUID NOT NULL,
  partition_key     VARCHAR(128) NOT NULL,
  payload           JSONB NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  published_at      TIMESTAMPTZ,
  attempt_count     INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_outbox_status_created ON outbox_events(status, created_at);
```

Same schema as Payment/Order existing outboxes.

### 5.6 Table `tenant_payment_settings` (Payment service)

```sql
CREATE TABLE tenant_payment_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   VARCHAR(64) NOT NULL,
  -- Cash settings
  cash_enabled                BOOLEAN NOT NULL DEFAULT TRUE,
  -- VietQR settings
  vietqr_enabled              BOOLEAN NOT NULL DEFAULT FALSE,
  vietqr_bank_name            VARCHAR(80),                       -- e.g. 'Vietcombank'
  vietqr_bank_short_name      VARCHAR(20),                       -- e.g. 'VCB'
  vietqr_bank_bin             VARCHAR(20),                       -- e.g. '970436'
  vietqr_account_number       VARCHAR(64),
  vietqr_account_holder       VARCHAR(120),                      -- uppercase
  -- SePay OAuth2 connection
  sepay_user_id               BIGINT,                            -- SePay's user id
  sepay_company_id            BIGINT,                            -- if applicable
  sepay_bank_account_uuid     VARCHAR(64),                       -- the chosen bank account from SePay
  sepay_access_token_encrypted TEXT,                             -- AES-256-GCM encrypted
  sepay_refresh_token_encrypted TEXT,
  sepay_token_expires_at      TIMESTAMPTZ,
  sepay_token_scopes          TEXT[],                            -- granted scopes snapshot
  -- Webhook
  sepay_webhook_id            VARCHAR(120),                      -- SePay's webhook resource id
  webhook_secret_encrypted    TEXT,                              -- AES-256-GCM
  webhook_verified_at         TIMESTAMPTZ,                       -- after first successful test
  -- Status
  connection_status           VARCHAR(20) NOT NULL DEFAULT 'NOT_CONNECTED',
                              -- NOT_CONNECTED | CONNECTED | TOKEN_EXPIRED | REVOKED | ERROR
  last_error                  TEXT,
  last_error_at               TIMESTAMPTZ,
  -- Audit
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_tenant_payment_settings_tenant ON tenant_payment_settings(tenant_id);
CREATE INDEX ix_tenant_payment_settings_account_number ON tenant_payment_settings(vietqr_account_number) WHERE vietqr_account_number IS NOT NULL;
CREATE INDEX ix_tenant_payment_settings_sepay_token_expires ON tenant_payment_settings(sepay_token_expires_at) WHERE connection_status = 'CONNECTED';
```

#### Encryption notes

- AES-256-GCM with key from env `PAYMENT_SECRETS_ENCRYPTION_KEY` (32 hex bytes). Rotation key post-thesis strategy.
- `nonce` per-encryption stored prepended to ciphertext (24 bytes nonce + ciphertext + tag).
- Decrypt in-process only, no log decrypted tokens.

### 5.7 MongoDB: `users` Collection Migration

```typescript
// Before:
type User = {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  userId: string; // = Keycloak sub
  roles: ObjectId[];
};

// After Phase 4B:
type User = {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  userId: string;
  tenantId?: string; // NEW — null for SUPER_ADMIN (platform role)
  isActive: boolean; // NEW — for soft-disable
  disabledAt?: Date; // NEW
  roles: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};
```

**Migration script:**

1. Add `tenantId` field, default NULL.
2. Add index `{ tenantId: 1 }` and `{ tenantId: 1, isActive: 1 }`.
3. Backfill from Keycloak: for each existing user, fetch KC `attributes.tenant_id` → set `User.tenantId`.
4. SUPER_ADMIN users → `tenantId = NULL`.

---

## 6. API/TCP/Kafka Contract

### 6.1 BFF HTTP Endpoints (New)

#### 6.1.1 Public (no auth)

| Method | Path                                        | Description                                                           | Auth                              |
| ------ | ------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| GET    | `/api/v1/public/plans`                      | List active pricing plans (for landing page).                         | None                              |
| GET    | `/api/v1/public/landing-info`               | Platform info: hero copy, contact email, feature highlights (static). | None                              |
| POST   | `/api/v1/payment/sepay/webhook/platform`    | Tier 2 webhook (subscription invoices).                               | `x-secret-key` path               |
| POST   | `/api/v1/payment/sepay/webhook/:tenantSlug` | Tier 1 webhook (bill payments per-tenant).                            | tenant-scoped `x-secret-key` path |

> **Implementation verification note (2026-05-14):** Current BFF tenant/platform webhook controllers enforce presence of `x-secret-key` and pass it downstream. Before production, value verification must be hardened against the platform/tenant stored secret, or the spec must be explicitly amended.

#### 6.1.2 SUPER_ADMIN (auth + role gated)

| Method | Path                                                               | Description                               | Permission                                            |
| ------ | ------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------- |
| GET    | `/api/v1/admin/platform/stats`                                     | Platform overview (counts, MRR).          | `tenant.list_all`                                     |
| GET    | `/api/v1/admin/tenants?search=&status=&planCode=&page=&limit=`     | List tenants.                             | `tenant.list_all`                                     |
| POST   | `/api/v1/admin/tenants/onboard`                                    | Mini-saga onboarding.                     | `tenant.onboard`                                      |
| GET    | `/api/v1/admin/tenants/:id`                                        | Tenant detail.                            | `tenant.read_any`                                     |
| PATCH  | `/api/v1/admin/tenants/:id`                                        | Update tenant info (name, type, address). | `tenant.update`                                       |
| PATCH  | `/api/v1/admin/tenants/:id/status`                                 | Suspend/Activate/Close.                   | `tenant.suspend` / `tenant.activate` / `tenant.close` |
| GET    | `/api/v1/admin/tenants/:id/subscriptions`                          | Subscription history.                     | `subscription.list_any`                               |
| POST   | `/api/v1/admin/tenants/:id/subscriptions`                          | Assign new subscription manually.         | `subscription.assign`                                 |
| GET    | `/api/v1/admin/tenants/:id/usage`                                  | Real-time quota usage.                    | `tenant.read_any`                                     |
| GET    | `/api/v1/admin/tenants/:id/audit`                                  | Lifecycle events.                         | `tenant.read_any`                                     |
| GET    | `/api/v1/admin/plans`                                              | List all plans.                           | `plan.read`                                           |
| POST   | `/api/v1/admin/plans`                                              | Create plan.                              | `plan.create`                                         |
| PATCH  | `/api/v1/admin/plans/:id`                                          | Update plan.                              | `plan.update`                                         |
| DELETE | `/api/v1/admin/plans/:id`                                          | Delete plan.                              | `plan.delete`                                         |
| GET    | `/api/v1/admin/billing/invoices?status=&tenantId=&from=&to=&page=` | List subscription invoices.               | `subscription.list_any`                               |
| POST   | `/api/v1/admin/billing/invoices/:id/manual-confirm`                | Manual confirm (fallback Q24=C).          | `subscription.assign`                                 |

#### 6.1.3 OWNER / MANAGER (auth + tenant-scoped)

| Method | Path                                                             | Description                                                    | Permission                                 |
| ------ | ---------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| GET    | `/api/v1/dashboard/subscription`                                 | Current subscription + history.                                | `subscription.read_own`                    |
| POST   | `/api/v1/dashboard/subscription/checkout`                        | Create subscription invoice → returns QR.                      | `subscription.checkout` (OWNER only)       |
| POST   | `/api/v1/dashboard/subscription/cancel`                          | Cancel subscription.                                           | `subscription.checkout`                    |
| GET    | `/api/v1/dashboard/billing/invoices/:id`                         | Invoice detail (with QR).                                      | `subscription.read_own`                    |
| GET    | `/api/v1/dashboard/billing/invoices/:id/status`                  | Lightweight polling.                                           | `subscription.read_own`                    |
| POST   | `/api/v1/dashboard/billing/invoices/:id/cancel`                  | Cancel pending invoice.                                        | `subscription.checkout`                    |
| GET    | `/api/v1/dashboard/payment-settings`                             | Get current bank settings + connection status.                 | `payment_settings.read_own`                |
| GET    | `/api/v1/dashboard/payment-settings/sepay-authorize-url`         | Generate OAuth2 authorize URL with state.                      | `payment_settings.update_own` (OWNER only) |
| GET    | `/api/v1/dashboard/payment-settings/sepay-callback?code=&state=` | OAuth2 callback → exchange code → list banks.                  | None (validates state)                     |
| POST   | `/api/v1/dashboard/payment-settings/select-bank`                 | Choose bank account from list, finalize setup, create webhook. | `payment_settings.update_own`              |
| POST   | `/api/v1/dashboard/payment-settings/disconnect`                  | Revoke SePay tokens, delete webhook.                           | `payment_settings.update_own`              |
| POST   | `/api/v1/dashboard/payment-settings/test-webhook`                | Trigger test webhook from SePay (optional, nice-to-have).      | `payment_settings.update_own`              |

### 6.2 TCP Messages (New)

Additions to `libs/constants/src/lib/enum/tcp-request-message.ts`:

```typescript
enum TENANT {
  ONBOARD = 'tenant.onboard',
  CREATE = 'tenant.create',
  UPDATE = 'tenant.update',
  SUSPEND = 'tenant.suspend',
  ACTIVATE = 'tenant.activate',
  CLOSE = 'tenant.close',
  GET_BY_ID = 'tenant.get_by_id',
  GET_BY_SLUG = 'tenant.get_by_slug',
  LIST = 'tenant.list',
  GET_USAGE = 'tenant.get_usage',
  GET_AUDIT = 'tenant.get_audit',
  GET_PLATFORM_STATS = 'tenant.get_platform_stats',
}

enum SUBSCRIPTION {
  ASSIGN = 'subscription.assign',
  CHECKOUT_INVOICE = 'subscription.checkout_invoice',
  CANCEL = 'subscription.cancel',
  GET_CURRENT = 'subscription.get_current',
  LIST_HISTORY = 'subscription.list_history',
  LIST_INVOICES = 'subscription.list_invoices',
  GET_INVOICE = 'subscription.get_invoice',
  CANCEL_INVOICE = 'subscription.cancel_invoice',
  MANUAL_CONFIRM_INVOICE = 'subscription.manual_confirm_invoice',
  HANDLE_WEBHOOK = 'subscription.handle_webhook', // Tier 2
}

enum PLAN {
  CREATE = 'plan.create',
  UPDATE = 'plan.update',
  DELETE = 'plan.delete',
  GET_BY_ID = 'plan.get_by_id',
  GET_BY_CODE = 'plan.get_by_code',
  LIST = 'plan.list',
  LIST_ACTIVE = 'plan.list_active',
}

enum PAYMENT_SETTINGS {
  GET = 'payment.settings_get',
  CREATE_EMPTY = 'payment.settings_create_empty', // called by SaaS during onboarding
  GENERATE_AUTHORIZE_URL = 'payment.settings_generate_authorize_url',
  HANDLE_OAUTH_CALLBACK = 'payment.settings_handle_oauth_callback',
  LIST_SEPAY_BANKS = 'payment.settings_list_sepay_banks',
  SELECT_BANK = 'payment.settings_select_bank',
  DISCONNECT = 'payment.settings_disconnect',
  REFRESH_TOKEN_IF_NEEDED = 'payment.settings_refresh_token_if_needed',
}

// Extend AUTHORIZER:
enum KEYCLOAK {
  // existing CREATE_USER ...
  ASSIGN_REALM_ROLE = 'keycloak.assign_realm_role',
  REMOVE_REALM_ROLE = 'keycloak.remove_realm_role',
  DISABLE_USER = 'keycloak.disable_user',
  GET_USER = 'keycloak.get_user',
}

// Extend USER:
enum USER {
  // existing ...
  UPSERT_WITH_TENANT = 'user.upsert_with_tenant',
  COUNT_BY_TENANT = 'user.count_by_tenant',
  DISABLE = 'user.disable',
}

// Extend CATALOG:
enum CATALOG {
  // existing ...
  COUNT_TABLES = 'catalog.count_tables',
  SEED_DEFAULT_AREA = 'catalog.seed_default_area', // optional explicit TCP fallback
}
```

#### TCP Request/Response interfaces (key ones)

```typescript
// libs/interfaces/src/lib/tcp/tenant/

export type OnboardTenantTcpRequest = {
  name: string;
  type: 'CAFE' | 'RESTAURANT' | 'PUB' | 'OTHER';
  address?: string;
  ownerEmail: string;
  ownerPassword: string; // admin-typed, plaintext over TCP (TLS in prod)
  ownerFirstName: string;
  ownerLastName: string;
  planCode?: string; // default 'FREE'
  createdByUserId: string; // SUPER_ADMIN userId
  processId?: string;
};

export type OnboardTenantTcpResponse = {
  tenant: TenantDetailDto;
  subscription: SubscriptionDto;
  owner: { userId: string; email: string };
  paymentSettingsInitialized: boolean;
};

export type CheckoutInvoiceTcpRequest = {
  tenantId: string;
  planCode: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  requestedByUserId: string;
  processId?: string;
};

export type CheckoutInvoiceTcpResponse = {
  invoiceId: string;
  qrUrl: string;
  amountVnd: number;
  billingReference: string;
  qrExpiresAt: string;
  periodStartsAt: string;
  periodEndsAt: string;
};

export type HandleSubscriptionWebhookTcpRequest = {
  payload: SepayWebhookPayload; // same structure as Phase 3
  processId?: string;
};

export type HandleSubscriptionWebhookTcpResponse = {
  matched: boolean;
  invoiceId?: string;
  status?: 'PAID' | 'IGNORED_UNDERPAID' | 'IGNORED_DUPLICATE' | 'NO_MATCH';
};

// libs/interfaces/src/lib/tcp/payment-settings/

export type GeneratePaymentAuthorizeUrlTcpRequest = {
  tenantId: string;
  ownerUserId: string; // Owner who initiates
  csrfState: string; // server-generated CSRF token (also stored in Redis 5min)
  processId?: string;
};

export type GeneratePaymentAuthorizeUrlTcpResponse = {
  authorizeUrl: string; // full URL to my.sepay.vn/oauth/authorize?...
};

export type HandlePaymentOAuthCallbackTcpRequest = {
  tenantId: string;
  code: string;
  state: string; // CSRF check
  processId?: string;
};

export type HandlePaymentOAuthCallbackTcpResponse = {
  banks: SepayBankAccountDto[]; // list bank accounts to choose
  tokenExpiresAt: string;
};

export type SelectBankTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  sepayBankAccountUuid: string;
  webhookUrl: string; // computed: {PUBLIC_API_BASE_URL}/api/v1/payment/sepay/webhook/{slug}
  processId?: string;
};

export type SelectBankTcpResponse = {
  status: 'CONNECTED';
  bankShortName: string;
  accountNumber: string; // masked or full
  webhookCreated: boolean;
};
```

### 6.3 Kafka Topics (Phase 4B Additions)

Update `libs/configuration/src/lib/kafka.config.ts`:

```typescript
@IsString() @IsNotEmpty()
TENANT_CREATED_TOPIC: string = 'tenant.created';

@IsString() @IsNotEmpty()
SUBSCRIPTION_ACTIVATED_TOPIC: string = 'subscription.activated';  // future extension only

@IsString() @IsNotEmpty()
SUBSCRIPTION_EXPIRED_TOPIC: string = 'subscription.expired';      // future extension only

@IsString() @IsNotEmpty()
SAAS_CLIENT_ID: string = 'qrtable-saas-service';
```

#### Topic: `tenant.created`

```typescript
type TenantCreatedEvent = {
  eventId: string; // UUID
  eventType: 'tenant.created';
  occurredAt: string; // ISO 8601
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
  correlationId: string;
};
```

**Consumers:**

- `Catalog service`: seed default area "General area" (group `catalog-tenant-created-consumer-group`).
- No Notification/email consumer exists in the current scope. If added later, it must be documented as a separate future extension.

#### Topic: `subscription.activated`

```typescript
type SubscriptionActivatedEvent = {
  eventId: string;
  eventType: 'subscription.activated';
  occurredAt: string;
  tenantId: string;
  subscriptionId: string;
  planCode: string;
  startsAt: string;
  expiresAt: string | null;
  source: 'INITIAL_ONBOARDING' | 'INVOICE_PAID' | 'ADMIN_ASSIGN';
  invoiceId?: string;
  correlationId: string;
};
```

#### Topic: `subscription.expired`

```typescript
type SubscriptionExpiredEvent = {
  eventId: string;
  eventType: 'subscription.expired';
  occurredAt: string;
  tenantId: string;
  subscriptionId: string;
  planCode: string;
  expiredAt: string; // = expires_at + grace
  correlationId: string;
};
```

---

## 7. Core Algorithms

### 7.1 Slug Generation (Unicode-aware Vietnamese)

```typescript
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'www',
  'app',
  'dashboard',
  'public',
  'static',
  'assets',
  'media',
  'cdn',
  'mail',
  'smtp',
  'auth',
  'login',
  'signup',
  'register',
  'oauth',
  'sso',
  'health',
  'metrics',
  'status',
  'debug',
  'help',
  'support',
  'docs',
  'blog',
  'system',
  'root',
  'sudo',
  'owner',
  'manager',
  'staff',
  'qrtable',
  'qr-table',
  'qr_table',
  'demo',
  'test',
  'staging',
  'production',
  'pos',
  'kds',
  'kitchen',
  'bar',
  'waiter',
  'chef',
  'barista',
]);

function generateSlug(rawName: string): string {
  if (!rawName) throw new BusinessException(ErrorCode.SAAS_TENANT_NAME_REQUIRED, 400);
  let s = rawName.normalize('NFD'); // 1. decomp
  s = s.replace(/[\u0300-\u036f]/g, ''); // 2. strip marks
  s = s.replace(/[\u0111\u0110]/g, 'd'); // 3. Vietnamese-specific
  s = s.toLowerCase(); // 4. lowercase
  s = s.replace(/[^a-z0-9\s-]/g, ''); // 5. strip non-alphanum
  s = s.trim().replace(/\s+/g, '-').replace(/-{2,}/g, '-'); // 6-7. collapse
  s = s.replace(/^-+|-+$/g, ''); // 8. trim hyphens
  s = s.slice(0, 80); // 9. length cap
  if (!s) throw new BusinessException(ErrorCode.SAAS_SLUG_EMPTY_AFTER_NORMALIZE, 400);
  return s;
}

async function findUniqueSlug(rawName: string, repo: TenantRepository): Promise<string> {
  const base = generateSlug(rawName);
  if (RESERVED_SLUGS.has(base)) {
    throw new BusinessException(ErrorCode.SAAS_SLUG_RESERVED, 400, { slug: base });
  }
  // Try base, then base-1, base-2, ..., base-99, then random hex
  if (!(await repo.existsBySlug(base))) return base;
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    if (!(await repo.existsBySlug(candidate))) return candidate;
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const random = randomHex(4); // 4 chars
    const candidate = `${base}-${random}`;
    if (!(await repo.existsBySlug(candidate))) return candidate;
  }
  throw new BusinessException(ErrorCode.SAAS_SLUG_GENERATION_FAILED, 500);
}
```

**Test cases:**

| Input                    | Expected output                          |
| ------------------------ | ---------------------------------------- |
| `"Pho Hanoi"`            | `"pho-ha-noi"`                           |
| `"Highlands Coffee"`     | `"ca-phe-highlands"`                     |
| `"Dong Do F&B"`          | `"dong-do-fb"`                           |
| `"  ABC  "`              | `"abc"`                                  |
| `"admin"`                | throws `SAAS_SLUG_RESERVED`              |
| `""`                     | throws `SAAS_TENANT_NAME_REQUIRED`       |
| `"!!!"`                  | throws `SAAS_SLUG_EMPTY_AFTER_NORMALIZE` |
| `"Pho Hanoi"` (2nd time) | `"pho-ha-noi-1"`                         |

### 7.2 Reserved Words (canonical const)

Location: `libs/constants/src/lib/saas.constants.ts` (new file). Same list as §7.1 RESERVED_SLUGS.

### 7.3 Onboarding Mini-Saga

```typescript
async function onboardTenant(dto: OnboardTenantTcpRequest): Promise<OnboardTenantTcpResponse> {
  const slug = await findUniqueSlug(dto.name, tenantRepo);
  const plan = await planRepo.findByCodeActive(dto.planCode ?? 'FREE');
  if (!plan) throw new BusinessException(ErrorCode.SAAS_PLAN_NOT_FOUND, 404);

  // STEP A: Create Keycloak user FIRST (outside DB TX, with cleanup-on-fail)
  let keycloakUserId: string;
  try {
    keycloakUserId = await authorizerClient.send(KEYCLOAK.CREATE_USER, {
      email: dto.ownerEmail,
      password: dto.ownerPassword,
      firstName: dto.ownerFirstName,
      lastName: dto.ownerLastName,
      tenantId: 'pending', // placeholder; will be updated next
    });
  } catch (e) {
    throw new BusinessException(ErrorCode.SAAS_ONBOARDING_KC_FAILED, 502, { detail: e.message });
  }

  try {
    await authorizerClient.send(KEYCLOAK.ASSIGN_REALM_ROLE, { userId: keycloakUserId, roleName: 'OWNER' });
  } catch (e) {
    // Cleanup
    await authorizerClient.send(KEYCLOAK.DISABLE_USER, { userId: keycloakUserId }).catch(() => {});
    throw new BusinessException(ErrorCode.SAAS_ONBOARDING_KC_ROLE_FAILED, 502, { detail: e.message });
  }

  // STEP B: DB transaction
  let onboardResult: OnboardTenantTcpResponse;
  try {
    onboardResult = await dataSource.transaction(async (manager) => {
      // B1. Insert tenant
      const tenant = manager.create(TenantEntity, {
        name: dto.name.trim(),
        slug,
        type: dto.type,
        address: dto.address,
        ownerId: keycloakUserId,
        status: 'ACTIVE',
        defaultCurrency: 'VND',
        defaultLocale: 'vi-VN',
        operatingModes: ['INSTANT_ORDER', 'DIGITAL_MENU'],
      });
      await manager.save(TenantEntity, tenant);

      // B2. Insert subscription
      const subscription = manager.create(SubscriptionEntity, {
        tenantId: tenant.id,
        pricingPlanId: plan.id,
        planCodeSnapshot: plan.code,
        priceVndSnapshot: plan.priceVnd,
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt: plan.code === 'FREE' ? null : addMonths(new Date(), 1),
        source: 'INITIAL_ONBOARDING',
        createdByUserId: dto.createdByUserId,
      });
      await manager.save(SubscriptionEntity, subscription);

      // B3. Outbox: tenant.created
      const outboxEvent = manager.create(OutboxEventEntity, {
        tenantId: tenant.id,
        topic: 'tenant.created',
        eventType: 'tenant.created',
        aggregateId: tenant.id,
        partitionKey: tenant.id,
        payload: buildTenantCreatedPayload(tenant, plan, dto, keycloakUserId),
        status: 'PENDING',
      });
      await manager.save(OutboxEventEntity, outboxEvent);

      // B4. Outbox: subscription.activated
      const subActivatedEvent = manager.create(OutboxEventEntity, {
        tenantId: tenant.id,
        topic: 'subscription.activated',
        eventType: 'subscription.activated',
        aggregateId: subscription.id,
        partitionKey: tenant.id,
        payload: buildSubscriptionActivatedPayload(subscription, 'INITIAL_ONBOARDING'),
        status: 'PENDING',
      });
      await manager.save(OutboxEventEntity, subActivatedEvent);

      return { tenant, subscription };
    });
  } catch (e) {
    // Compensate KC user
    await authorizerClient.send(KEYCLOAK.DISABLE_USER, { userId: keycloakUserId }).catch(() => {});
    throw new BusinessException(ErrorCode.SAAS_ONBOARDING_DB_FAILED, 500, { detail: e.message });
  }

  // STEP C: Post-commit TCP calls (idempotent; orphan-cleanup cron handles failures)
  try {
    await userAccessClient.send(USER.UPSERT_WITH_TENANT, {
      userId: keycloakUserId,
      email: dto.ownerEmail,
      firstName: dto.ownerFirstName,
      lastName: dto.ownerLastName,
      tenantId: onboardResult.tenant.id,
      roleNames: ['OWNER'],
    });
  } catch (e) {
    logger.warn('user-access upsert failed (cleanup cron will retry)', { error: e });
  }

  try {
    await paymentClient.send(PAYMENT_SETTINGS.CREATE_EMPTY, {
      tenantId: onboardResult.tenant.id,
    });
  } catch (e) {
    logger.warn('payment settings create empty failed (cleanup cron will retry)', { error: e });
  }

  // Also: update Keycloak attribute tenant_id (now that we have it)
  try {
    await authorizerClient.send(KEYCLOAK.UPDATE_USER_TENANT_ATTR, {
      userId: keycloakUserId,
      tenantId: onboardResult.tenant.id,
    });
  } catch (e) {
    logger.warn('keycloak tenant_id attribute update failed (cleanup cron will retry)', { error: e });
  }

  return {
    tenant: toTenantDetailDto(onboardResult.tenant),
    subscription: toSubscriptionDto(onboardResult.subscription),
    owner: { userId: keycloakUserId, email: dto.ownerEmail },
    paymentSettingsInitialized: true,
  };
}
```

**Orphan Cleanup Cron (daily, separate worker):**

```typescript
// Find Keycloak users with `attributes.tenant_id` not matching any tenant row, OR missing
// matching User mongoDB profile. Disable + log.
```

### 7.4 Feature Gating Logic (Hybrid Q6=C)

#### L1 — BFF `TenantPlanGuard` (Optimistic, UX)

```typescript
@Injectable()
export class TenantPlanGuard implements CanActivate {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private saasClient: TcpClient,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private catalogClient: TcpClient,
    @Inject(TCP_SERVICES.USER_ACCESS_SERVICE) private userAccessClient: TcpClient,
    @Inject(TCP_SERVICES.ORDER_SERVICE) private orderClient: TcpClient,
    private reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.get<'max_tables' | 'max_staff' | 'max_orders_per_day'>(
      'plan_limit',
      ctx.getHandler(),
    );
    if (!limitType) return true;     // no limit specified → pass

    const req = ctx.switchToHttp().getRequest();
    const tenantId = req[MetadataKey.TENANT_ID];

    const subscription = await this.getCurrentSubscriptionCached(tenantId);
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new BusinessException(ErrorCode.TENANT_NO_ACTIVE_SUBSCRIPTION, 402);
    }

    const limit = subscription.plan[limitType];     // -1 = unlimited
    if (limit === -1) return true;

    const current = await this.getCurrentUsage(tenantId, limitType);
    if (current >= limit) {
      throw new TenantPlanLimitExceededException({
        limitType, limit, current,
        planCode: subscription.planCode,
        upgradeUrl: '/dashboard/subscription',
      });
    }
    return true;
  }

  private getCurrentUsage(tenantId: string, type: string): Promise<number> {
    // tcp call to the right service
    switch (type) {
      case 'max_tables': return this.tcpCount(this.catalogClient, CATALOG.COUNT_TABLES, { tenantId });
      case 'max_staff':  return this.tcpCount(this.userAccessClient, USER.COUNT_BY_TENANT, { tenantId });
      case 'max_orders_per_day': return this.tcpRedisCount('quota:' + tenantId + ':orders:' + todayHCM());
      ...
    }
  }
}
```

**Usage:**

```typescript
@Post('/admin/tables')
@Authorization({ secured: true })
@Permissions([PERMISSION.TABLE_CREATE])
@PlanLimit('max_tables')
createTable(@Body() dto, ...) { ... }
```

#### L2 — Target Service Backup (Pessimistic, in TX)

```typescript
// inside CatalogService.createTable, AFTER L1 passes:
await this.dataSource.transaction(async (manager) => {
  const currentCount = await manager
    .createQueryBuilder(TableEntity, 't')
    .where('t.tenant_id = :tenantId', { tenantId })
    .setLock('pessimistic_write')      // not strictly required if count-then-insert with constraint
    .getCount();

  const subscription = await this.saasClient.getCurrentSubscription(tenantId);   // also cached
  if (subscription.plan.maxTables !== -1 && currentCount >= subscription.plan.maxTables) {
    throw new TenantPlanLimitExceededException({...});
  }
  // proceed with insert
});
```

**Why both:** L1 gives fast UX (no extra TX overhead in most cases); L2 catches concurrent inserts where 2 requests both pass L1 but one would exceed.

### 7.5 Subscription Cache Strategy

```
Key: subscription:{tenantId}
TTL: 5 minutes
Invalidation triggers:
- subscription.assign / subscription.checkout_invoice paid
- tenant.status changed (suspend invalidates so guards see latest)
- plan.update on subscription's plan
```

### 7.6 VND Rounding (Reuse Phase 3)

Same `Math.ceil(amount / 1000) * 1000` applies for subscription_invoices.amount_vnd. Pricing plans price_vnd already stored as integer rounded to thousand.

### 7.7 Webhook Routing Logic

```typescript
// BFF webhook controller
@Post('sepay/webhook/platform')
async platformWebhook(@Headers('x-secret-key') secret, @Body() payload) {
  if (secret !== process.env.SEPAY_PLATFORM_WEBHOOK_SECRET) throw new UnauthorizedException();
  const billRef = extractBillReference(payload);     // QRSUB* expected
  if (!billRef?.startsWith('QRSUB')) {
    logger.warn('platform webhook with non-QRSUB ref', { billRef });
    return { success: true };                        // SePay expects 200 always
  }
  await this.saasClient.send(SUBSCRIPTION.HANDLE_WEBHOOK, { payload });
  return { success: true };
}

@Post('sepay/webhook/:tenantSlug')
async tenantWebhook(@Param('tenantSlug') slug, @Headers('x-secret-key') secret, @Body() payload) {
  const tenant = await this.saasClient.send(TENANT.GET_BY_SLUG, { slug });
  if (!tenant) throw new NotFoundException();

  const settings = await this.paymentClient.send(PAYMENT_SETTINGS.GET, { tenantId: tenant.id });
  if (!settings.webhookSecretEncrypted) throw new UnauthorizedException();
  const expected = decrypt(settings.webhookSecretEncrypted);
  if (secret !== expected) throw new UnauthorizedException();

  const billRef = extractBillReference(payload);     // QRTBL* expected
  if (!billRef?.startsWith('QRTBL')) {
    logger.warn('tenant webhook with non-QRTBL ref', { slug, billRef });
    return { success: true };
  }
  await this.paymentClient.send(PAYMENT.HANDLE_SEPAY_WEBHOOK, { payload, tenantId: tenant.id });
  return { success: true };
}
```

**Note (Q9a):** If `tenant.status === 'SUSPENDED'`, **still process** bill webhook (audit `WEBHOOK_AFTER_SUSPEND`). Don't reject — money already arrived.

---

## 8. SePay OAuth2 Integration (Tier 1)

### 8.1 Flow Overview

```
Owner clicks "Connect SePay" on /dashboard/payment-settings
   │
   ▼
BFF GET /api/v1/dashboard/payment-settings/sepay-authorize-url
   → Payment Service: generate csrfState (random 32 chars)
                       store in Redis: oauth_state:{state} = { tenantId, ownerUserId, expiresAt }, TTL 5min
                       build URL: https://my.sepay.vn/oauth/authorize?
                         response_type=code
                         &client_id=$SEPAY_OAUTH_CLIENT_ID
                         &redirect_uri=$SEPAY_OAUTH_REDIRECT_URI
                         &scope=bank-account:read transaction:read webhook:read webhook:write webhook:delete profile
                         &state={state}
   → Return { authorizeUrl }
   │
   ▼
Owner browser redirect to my.sepay.vn → log in → authorize
   │
   ▼
SePay redirect to $SEPAY_OAUTH_REDIRECT_URI?code={authCode}&state={state}
   = https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback?code=...&state=...
   │
   ▼
Next.js page reads code+state, posts to BFF GET /api/v1/dashboard/payment-settings/sepay-callback?code=&state=
   → Payment Service: verify state in Redis (DEL after verify)
                       extract tenantId from state record
                       POST https://my.sepay.vn/oauth/token with grant_type=authorization_code, code, redirect_uri, client_id, client_secret
                       receive { access_token, refresh_token, expires_in }
                       encrypt and store in tenant_payment_settings (status=CONNECTED, but bank not yet chosen)
                       call SePay GET /api/v1/bank-accounts with access_token
                       return { banks: [...] }
   │
   ▼
Next.js page shows bank picker UI
Owner selects bank
   │
   ▼
POST /api/v1/dashboard/payment-settings/select-bank with sepayBankAccountUuid
   → Payment Service:
       fetch bank detail (account_number, bank_short_name) via GET /v2/bank-accounts/{uuid}
       call SePay POST /api/v1/webhooks (or /v1/webhook) with access_token:
         body: {
           webhook_url: "{PUBLIC_API_BASE_URL}/api/v1/payment/sepay/webhook/{tenant.slug}",
           auth_type: "SECRET_KEY",
           secret_key: <generate 32-char random>,
           active: 1,
           allow_events: ["*"]
         }
       receive { webhook_id, secret_key }
       store webhook_id + encrypted secret in tenant_payment_settings
       set tenant_payment_settings.connection_status = CONNECTED, verified_at = now()
   → Return { status: "CONNECTED", bankShortName, accountNumber (masked) }
   │
   ▼
UI shows "🟢 Connected. Ready to receive payments."
```

### 8.2 Token Refresh Logic

```typescript
// Called before every SePay API call from Payment Service
async function refreshTokenIfNeeded(tenantId: string): Promise<string> {
  const settings = await tenantPaymentSettingsRepo.findByTenantId(tenantId);
  if (!settings.sepayAccessTokenEncrypted) throw new BusinessException(...);

  const expiresAt = settings.sepayTokenExpiresAt;
  if (expiresAt > new Date(Date.now() + 60_000)) {
    return decrypt(settings.sepayAccessTokenEncrypted);    // still valid for ≥1 min
  }

  // Refresh
  const refreshToken = decrypt(settings.sepayRefreshTokenEncrypted);
  const response = await axios.post('https://my.sepay.vn/oauth/token', new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.SEPAY_OAUTH_CLIENT_ID,
    client_secret: process.env.SEPAY_OAUTH_CLIENT_SECRET,
  }));

  const { access_token, refresh_token, expires_in } = response.data;
  await tenantPaymentSettingsRepo.update(settings.id, {
    sepayAccessTokenEncrypted: encrypt(access_token),
    sepayRefreshTokenEncrypted: encrypt(refresh_token),
    sepayTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
  });
  return access_token;
}
```

### 8.3 Disconnect Flow

```typescript
async function disconnect(tenantId: string, ownerUserId: string): Promise<void> {
  const settings = await ... .findByTenantId(tenantId);
  if (settings.connectionStatus !== 'CONNECTED') return;   // no-op idempotent

  const accessToken = await refreshTokenIfNeeded(tenantId);

  // Delete webhook
  if (settings.sepayWebhookId) {
    try {
      await axios.delete(`https://my.sepay.vn/api/v1/webhooks/${settings.sepayWebhookId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (e) {
      logger.warn('webhook delete failed (non-fatal)', { error: e });
    }
  }

  // Optionally revoke token via SePay (if supported; otherwise just forget)
  await tenantPaymentSettingsRepo.update(settings.id, {
    connectionStatus: 'NOT_CONNECTED',
    sepayAccessTokenEncrypted: null,
    sepayRefreshTokenEncrypted: null,
    sepayTokenExpiresAt: null,
    sepayBankAccountUuid: null,
    sepayWebhookId: null,
    webhookSecretEncrypted: null,
    vietqrEnabled: false,
    vietqrBankName: null,
    vietqrAccountNumber: null,
    vietqrAccountHolder: null,
  });
}
```

### 8.4 Env Vars

```yaml
SEPAY_OAUTH_CLIENT_ID: <from SePay support>
SEPAY_OAUTH_CLIENT_SECRET: <from SePay support>
SEPAY_OAUTH_REDIRECT_URI: https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback
SEPAY_OAUTH_BASE_URL: https://my.sepay.vn # for mock dev: http://localhost:9999
PUBLIC_API_BASE_URL: https://<backend-public-tunnel-or-api-domain>
SEPAY_PLATFORM_WEBHOOK_SECRET: <random for Tier 2>
SEPAY_PLATFORM_QR_ACCOUNT: <platform bank account>
SEPAY_PLATFORM_QR_BANK: Vietcombank
PAYMENT_SECRETS_ENCRYPTION_KEY: <64-hex char = 32 bytes AES-256>
```

---

## 9. Subscription Billing (Tier 2)

### 9.1 Checkout Flow

```
1. Owner on /dashboard/subscription → click "Pay" (choose PREMIUM plan)
2. POST /api/v1/dashboard/subscription/checkout body: { planCode: 'PREMIUM', billingPeriod: 'MONTHLY' }
3. BFF → SaaS Service TCP subscription.checkout_invoice
4. SaaS Service:
   a. Validate planCode exists, is_active
   b. Compute periodStartsAt = now(), periodEndsAt = +1 month
   c. Generate billingReference = "QRSUB" + uppercased first 8 chars of invoice id (post-insert)
      Tricky: must INSERT first to get id, then UPDATE with billing_reference using id-derived prefix.
      Alternative: UUID v7 + take 8 chars of UUID, set on insert.
   d. Build QR URL with platform's bank:
      https://qr.sepay.vn/img?acc={SEPAY_PLATFORM_QR_ACCOUNT}&bank={SEPAY_PLATFORM_QR_BANK}&amount={amountVnd}&des={billingReference}
   e. Insert subscription_invoices with status=PENDING, qrUrl, qrExpiresAt = +24h
   f. Return invoiceId + qrUrl + billingReference + amountVnd
5. UI redirects to /dashboard/billing/[invoiceId]
6. UI polls GET /api/v1/dashboard/billing/invoices/:id/status every 5s
7. Owner scans QR, transfers from their bank app
8. Money arrives at platform bank → SePay detects → POSTs to
   /api/v1/payment/sepay/webhook/platform with the Phase 4B `x-secret-key` path
9. BFF enforces webhook auth presence/value per production hardening, extracts code, matches "QRSUB*" → TCP saas.handle_webhook
10. SaaS Service:
    a. Extract billingReference from code or content
    b. SELECT invoice WHERE billing_reference = ? FOR UPDATE
    c. If invoice.status != PENDING → idempotent return matched=true status=IGNORED_DUPLICATE
    d. If invoice.expiredAt < now() → status=IGNORED_EXPIRED, also set invoice.status=EXPIRED
    e. If transferAmount < amountVnd → IGNORED_UNDERPAID + audit
    f. Update invoice: status=PAID, paid_at, paid_amount, sepay_*
    g. Trigger subscription change:
       - Find current ACTIVE subscription for this tenant
       - If exists with different planCode → set old SUPERSEDED, insert new ACTIVE
       - If exists with same planCode → extend expires_at by 1 month (renewal)
       - If none → insert new ACTIVE
    h. Outbox: subscription.activated
    i. If tenant.status was SUSPENDED → set ACTIVE, DEL Redis flag
11. WS emit subscription.activated to /dashboard/subscription room
12. UI polling detects PAID status → redirect to /dashboard/subscription with toast success
```

### 9.2 Plan Change Logic

```typescript
async function applyPaidInvoice(
  invoice: SubscriptionInvoiceEntity,
  manager: EntityManager,
): Promise<SubscriptionEntity> {
  const tenant = await manager.findOne(TenantEntity, { where: { id: invoice.tenantId } });
  const plan = await manager.findOne(PricingPlanEntity, { where: { id: invoice.pricingPlanId } });

  const currentActive = await manager.findOne(SubscriptionEntity, {
    where: { tenantId: invoice.tenantId, status: 'ACTIVE' },
  });

  let newSub: SubscriptionEntity;

  if (currentActive && currentActive.pricingPlanId === plan.id) {
    // Renewal: extend
    const newExpiresAt =
      currentActive.expiresAt && currentActive.expiresAt > new Date()
        ? addMonths(currentActive.expiresAt, 1) // stack onto remaining
        : addMonths(new Date(), 1);
    currentActive.expiresAt = newExpiresAt;
    await manager.save(SubscriptionEntity, currentActive);
    newSub = currentActive;
  } else {
    // Upgrade or new
    if (currentActive) {
      currentActive.status = 'SUPERSEDED';
      currentActive.supersededAt = new Date();
      // Will set supersededBySubscriptionId after we know new id
      await manager.save(SubscriptionEntity, currentActive);
    }
    newSub = manager.create(SubscriptionEntity, {
      tenantId: invoice.tenantId,
      pricingPlanId: plan.id,
      planCodeSnapshot: plan.code,
      priceVndSnapshot: plan.priceVnd,
      status: 'ACTIVE',
      startsAt: invoice.periodStartsAt,
      expiresAt: invoice.periodEndsAt,
      source: 'INVOICE_PAID',
      sourceInvoiceId: invoice.id,
      createdByUserId: invoice.requestedByUserId,
    });
    await manager.save(SubscriptionEntity, newSub);
    if (currentActive) {
      currentActive.supersededBySubscriptionId = newSub.id;
      await manager.save(SubscriptionEntity, currentActive);
    }
  }

  // Reactivate tenant if was suspended
  if (tenant.status === 'SUSPENDED') {
    tenant.status = 'ACTIVE';
    tenant.suspendedAt = null;
    tenant.suspendedReason = null;
    await manager.save(TenantEntity, tenant);
    await redis.del(`tenant:${tenant.id}:suspended`);
  }

  // Invalidate subscription cache
  await redis.del(`subscription:${tenant.id}`);

  // Outbox event
  await manager.save(OutboxEventEntity, {
    tenantId: tenant.id,
    topic: 'subscription.activated',
    aggregateId: newSub.id,
    partitionKey: tenant.id,
    payload: buildSubscriptionActivatedPayload(newSub, 'INVOICE_PAID', invoice.id),
    status: 'PENDING',
  });

  return newSub;
}
```

### 9.3 Manual Confirm Fallback (Q24=C)

```typescript
// SUPER_ADMIN at /admin/billing/invoices/:id with action "Manual confirm"
async function manualConfirmInvoice(invoiceId: string, adminUserId: string, manager: EntityManager): Promise<void> {
  const invoice = await manager.findOne(SubscriptionInvoiceEntity, { where: { id: invoiceId, status: 'PENDING' } });
  if (!invoice) throw new BusinessException(ErrorCode.INVOICE_NOT_PENDING, 409);

  invoice.status = 'PAID';
  invoice.paidAt = new Date();
  invoice.paidAmountVnd = invoice.amountVnd;
  invoice.manuallyConfirmedByUserId = adminUserId;
  invoice.manuallyConfirmedAt = new Date();
  await manager.save(SubscriptionInvoiceEntity, invoice);

  await applyPaidInvoice(invoice, manager); // same as auto path
}
```

---

## 10. Cron Auto-Suspend

### 10.1 Schedule

```typescript
@Injectable()
export class SubscriptionExpiryCron {
  private readonly logger = new Logger(SubscriptionExpiryCron.name);

  @Cron('0 0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })   // 02:00 ICT daily
  async checkExpirations(): Promise<void> {
    this.logger.log('Starting subscription expiry check');
    const graceDays = 1;
    const cutoff = new Date(Date.now() - graceDays * 24 * 3600 * 1000);
    // Find subscriptions: status=ACTIVE, expires_at IS NOT NULL, expires_at < cutoff
    const expired = await this.subscriptionRepo.findExpiringBefore(cutoff);
    for (const sub of expired) {
      try {
        await this.expireSubscription(sub);
      } catch (e) {
        this.logger.error(`Failed to expire subscription ${sub.id}`, e);
      }
    }
  }

  @Cron('0 0 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })   // every hour
  async expirePendingInvoices(): Promise<void> {
    // Find invoices PENDING with qrExpiresAt < now() → set EXPIRED
    ...
  }

  private async expireSubscription(sub: SubscriptionEntity): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      sub.status = 'EXPIRED';
      sub.expiredAt = new Date();
      await manager.save(SubscriptionEntity, sub);

      const tenant = await manager.findOne(TenantEntity, { where: { id: sub.tenantId } });
      if (tenant.status === 'ACTIVE') {
        tenant.status = 'SUSPENDED';
        tenant.suspendedAt = new Date();
        tenant.suspendedReason = 'SUBSCRIPTION_EXPIRED';
        await manager.save(TenantEntity, tenant);
        await this.redis.set(`tenant:${tenant.id}:suspended`, '1');
        await this.redis.del(`subscription:${tenant.id}`);
      }

      await manager.save(OutboxEventEntity, {
        tenantId: tenant.id,
        topic: 'subscription.expired',
        eventType: 'subscription.expired',
        aggregateId: sub.id,
        partitionKey: tenant.id,
        payload: buildSubscriptionExpiredPayload(sub),
      });
    });

    this.wsGateway.emitToRoom(`tenant:${sub.tenantId}:management`, 'tenant.suspended', {
      reason: 'SUBSCRIPTION_EXPIRED',
      subscriptionId: sub.id,
    });
  }
}
```

### 10.2 Multi-instance Protection

If multiple SaaS service instances run, only one should execute cron. Options:

- **Single-instance:** Phase 4B baseline. Document constraint in deployment.
- **Distributed lock (Redis SET NX):** `cron_lock:subscription_expiry:{YYYYMMDD}` → only first acquirer runs. Recommended for production.

Phase 4B implementation includes Redis SET NX guard.

---

## 11. Suspend Mechanism (Implementation Details)

### 11.1 Redis Flag

- Key: `tenant:{tenantId}:suspended`
- Value: `"1"` (presence-based)
- TTL: none (explicit DEL when activate)
- Set when: tenant status → SUSPENDED or CLOSED
- DEL when: tenant status → ACTIVE

### 11.2 Guard Chain Update

Add to `libs/guards/src/lib/tenant.guard.ts`:

```typescript
async canActivate(ctx: ExecutionContext): Promise<boolean> {
  // ... existing tenant_id resolution ...

  if (isSuperAdmin) return true;     // bypass

  // Check tenant suspended flag
  const suspended = await this.cacheManager.get<string>(`tenant:${tenantId}:suspended`);
  if (suspended) {
    // Q2=B: allow specific permissions even when suspended
    const requiredPerms = this.reflector.getAllAndOverride<string[]>('permissions', [ctx.getHandler(), ctx.getClass()]) ?? [];
    const allowedDuringSuspension = new Set([
      'payment.confirm_cash', 'payment.create', 'payment.refund', 'payment.get_history',
      'order.get_list', 'order.get_by_id',
      'subscription.read_own', 'subscription.checkout',          // can pay invoice to reactivate
      'payment_settings.read_own', 'payment_settings.update_own',
      'catalog.get_by_id', 'catalog.get_list',
    ]);
    const allAllowed = requiredPerms.every(p => allowedDuringSuspension.has(p));
    if (!allAllowed) {
      throw new BusinessException(ErrorCode.TENANT_SUSPENDED, 403, { tenantId });
    }
  }
  // ... continue ...
}
```

### 11.3 SessionGuard Update (Customer PWA)

```typescript
async canActivate(ctx): Promise<boolean> {
  // ... existing session validation ...

  // Check tenant suspended
  const suspended = await this.cacheManager.get<string>(`tenant:${tenantId}:suspended`);
  if (suspended) {
    // Allow read endpoints + payment-related; block submit/mutation
    const path = req.path;
    const allowReadPaths = [
      /^\/api\/v1\/customer\/menu/,
      /^\/api\/v1\/customer\/orders\/[^/]+$/,           // GET own order
      /^\/api\/v1\/customer\/bills\/[^/]+$/,            // GET bill
      /^\/api\/v1\/customer\/bills\/[^/]+\/payment-request$/,  // request payment OK
    ];
    const isAllowed = req.method === 'GET' || allowReadPaths.some(re => re.test(path));
    if (!isAllowed) {
      throw new BusinessException(ErrorCode.TENANT_SUSPENDED_CUSTOMER, 403);
    }
  }
  return true;
}
```

### 11.4 WebSocket Disconnect Strategy (Q9c)

```typescript
// SaaS Service emits TCP event after status change → BFF
// BFF WebSocket Gateway:
this.server.to(`tenant:${tenantId}:management`).emit('tenant.suspended', { reason });
this.server.to(`tenant:${tenantId}:staff`).emit('tenant.suspended', { reason });
this.server.to(`tenant:${tenantId}:kds:*`).emit('tenant.suspended', { reason });
// For active customer sessions:
this.server.to(`tenant:${tenantId}:customers`).emit('tenant.suspended', { reason });
// FE handles: show banner, no force disconnect
```

---

## 12. Permission Matrix Migration

### 12.1 New Permissions (Phase 4B)

| Domain               | Permission                      | SUPER_ADMIN | OWNER | MANAGER | WAITER | CHEF | BARISTA |
| -------------------- | ------------------------------- | :---------: | :---: | :-----: | :----: | :--: | :-----: |
| **tenant**           | `tenant.onboard`                |     ✅      |       |         |        |      |         |
| **tenant**           | `tenant.list_all`               |     ✅      |       |         |        |      |         |
| **tenant**           | `tenant.read_any`               |     ✅      |       |         |        |      |         |
| **tenant**           | `tenant.read_own`               |     ✅      |  ✅   |   ✅    |        |      |         |
| **tenant**           | `tenant.update`                 |     ✅      |       |         |        |      |         |
| **tenant**           | `tenant.suspend`                |     ✅      |       |         |        |      |         |
| **tenant**           | `tenant.activate`               |     ✅      |       |         |        |      |         |
| **tenant**           | `tenant.close`                  |     ✅      |       |         |        |      |         |
| **subscription**     | `subscription.assign`           |     ✅      |       |         |        |      |         |
| **subscription**     | `subscription.list_any`         |     ✅      |       |         |        |      |         |
| **subscription**     | `subscription.list_history_any` |     ✅      |       |         |        |      |         |
| **subscription**     | `subscription.read_own`         |     ✅      |  ✅   |   ✅    |        |      |         |
| **subscription**     | `subscription.checkout`         |     ✅      |  ✅   |         |        |      |         |
| **plan**             | `plan.create`                   |     ✅      |       |         |        |      |         |
| **plan**             | `plan.read`                     |     ✅      |  ✅   |   ✅    |   ✅   |  ✅  |   ✅    |
| **plan**             | `plan.update`                   |     ✅      |       |         |        |      |         |
| **plan**             | `plan.delete`                   |     ✅      |       |         |        |      |         |
| **payment_settings** | `payment_settings.read_own`     |     ✅      |  ✅   |   ✅    |        |      |         |
| **payment_settings** | `payment_settings.update_own`   |     ✅      |  ✅   |         |        |      |         |

**Total new:** 19 permissions.

### 12.2 Deprecation

Legacy `saas.*` (5 entries) → mapped to new `tenant.*` namespace; keep legacy enum for 1 phase backward-compat, mark `@deprecated`, remove in Phase 5+:

| Legacy           | New               |
| ---------------- | ----------------- |
| `saas.create`    | `tenant.onboard`  |
| `saas.get_by_id` | `tenant.read_any` |
| `saas.get_list`  | `tenant.list_all` |
| `saas.update`    | `tenant.update`   |
| `saas.delete`    | `tenant.close`    |

### 12.3 Updated Totals

Current code-verified totals on 2026-05-31:

| Role        | Phase 3 Baseline | Phase 4B Total | Delta                                                                    |
| ----------- | ---------------- | -------------- | ------------------------------------------------------------------------ |
| SUPER_ADMIN | 47               | **65**         | +18                                                                      |
| OWNER       | 32               | **37**         | Net +5 after Phase 4B SaaS/payment-settings additions and scope cleanup. |
| MANAGER     | 31               | **34**         | Net +3 after Phase 4B SaaS/payment-settings additions and scope cleanup. |
| WAITER      | 14               | **15**         | +1 (`plan.read`)                                                         |
| CHEF        | 5                | **6**          | +1 (`plan.read`)                                                         |
| BARISTA     | 5                | **6**          | +1 (`plan.read`)                                                         |

> **Note:** `plan.read` is granted to all so any role can see plan info (FE displays plan name in widgets); only SUPER_ADMIN can mutate.

### 12.4 Update files

- `libs/constants/src/lib/enum/role.enum.ts` — add new enum values.
- `apps/user-access/src/seeder/role.json` — add to each role.
- `apps/user-access/src/seeder/role.spec.ts` — update `EXPECTED_MATRIX`.
- `apps/bff/src/app/guards/permission.guard.spec.ts` — add scenarios.
- `tools/verify-permission-matrix.sh` — extend.
- `docs/architecture/permission-matrix.md` — update §4, §6 to 6 × 65 matrix.

---

## 13. Frontend UX Contract

### 13.1 Landing Page (`/`) — apply `ui-ux-pro-max` SKILL

**MANDATORY:** When implementing this page, invoke the skill workflow:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py \
  "SaaS POS multi-tenant Vietnamese F&B restaurant subscription billing platform" \
  --design-system --persist -p "QRTable" --page "landing"
```

This generates `design-system/MASTER.md` + `design-system/pages/landing.md` to drive the implementation. Then read both before writing any landing page code.

**Functional requirements (regardless of design system):**

```
/ (Public)
├─ Hero Section
│ ├─ H1: "QRTable — QR ordering SaaS platform for Vietnam's F&B industry"
│  ├─ Subhead: 1-2 line value prop
│ ├─ CTA primary: "Log in" → /login
│ ├─ CTA secondary: "Request consultation" → mailto:support@qrtable.io
│  └─ Hero visual (mockup or illustration)
├─ Features Section (3-4 highlights)
│ ├─ "Order via QR" (icon + caption)
│  ├─ "POS / KDS realtime"
│ ├─ "Automatic SePay VietQR payment"
│  └─ "Multi-tenant + Subscription model"
├─ Pricing Section
│  └─ 3 plan cards: FREE / BASIC / PREMIUM (from GET /public/plans)
│     ├─ Plan name, price/month, feature bullets, max_tables/staff/orders
│ └─ CTA: "Sign up for contact" → mailto
├─ Architecture Highlights (optional, thesis demo flex)
│  └─ Brief mention: Microservices, Kafka, Redis, OAuth2 Connect
└─ Footer: contact, social, copyright
```

**Data sources:** `GET /api/v1/public/plans`, `GET /api/v1/public/landing-info`. No auth.

**Constraints (from skill):**

- `ui-ux-pro-max` Quick Reference §1-5 mandatory: accessibility, touch, performance, style consistency, mobile-first.
- Color palette + typography must be from skill recommendation (run `--design-system` to get it).
- Charts/data viz: pricing table uses bullet list, no charts on landing.
- Responsive: 375 / 768 / 1024 / 1440 breakpoints.

### 13.2 `/admin/*` Pages (Detailed in §13.2 audit Round 2)

Functional + data contracts:

#### 13.2.1 `/admin` (Platform Overview)

- **Data:** `GET /api/v1/admin/platform/stats`
- **Widgets:** Total/Active/Suspended/Closed tenant counts; Tenants by plan (Recharts bar); Expiring soon (list); MRR (single number).
- **Skip ui-ux-pro-max for now** (Q16 only requires it for landing). Reuse shadcn defaults (already adopted in codebase).

#### 13.2.2 `/admin/tenants`

- **Table:** TanStack Table with sort, filter, pagination.
- **Filter:** search input (debounce 300ms), status dropdown, plan dropdown, reset.
- **Row actions menu:** View / Suspend / Activate / Close / Assign Plan.
- **Onboard modal (shadcn Dialog):** Form fields per §6.2 OnboardTenantTcpRequest. Validation: email format, password ≥ 8 chars, name 2-120 chars. Submit → POST → success → reload table + toast.
- **Confirm dialogs:** Suspend (reason text), Close (type slug to confirm), Cancel subscription (reason).
- **Edge cases:** Slug collision → show inline error from BE with suggestion.

#### 13.2.3 `/admin/tenants/[id]`

- **Tabs (shadcn Tabs):** Overview / Subscription History / Usage / Audit / Billing.
- **Overview:** name, slug, type, address, status badge, owner, dates, current plan card.
- **Subscription History:** table sorted by created_at desc.
- **Usage:** real-time bars showing current/max for tables/staff/orders. Poll every 30s.
- **Audit Log:** read-only timeline.
- **Billing Tab:** list `subscription_invoices` for this tenant.

#### 13.2.4 `/admin/plans`

- **List view:** cards per plan with all attributes + edit/delete.
- **Create/Edit dialog:** form with all plan fields, features as multi-select.
- **Delete safety:** check `GET /api/v1/admin/plans/:id/usage` → if has ACTIVE subscriptions → 409 with detail; show "Disable instead?" suggestion.

#### 13.2.5 `/admin/billing`

- **Table of subscription_invoices** with filter (status, tenant, date range).
- **Row click → detail drawer** showing invoice + sepay transaction info.
- **Action:** "Manual confirm" button for PENDING invoices (Q24=C fallback).

### 13.3 `/dashboard/*` Pages

#### 13.3.1 `/dashboard` (Owner/Manager Home)

- **Existing dashboard** + new "Plan & Quota" widget.
- **Widget data:** `GET /api/v1/dashboard/subscription` returns current plan plus usage resolved by SaaS from owning services: Catalog table count, User-Access staff count, and Order today's count using the Ho Chi Minh day boundary.
- **UI:** Card with plan name, expiry, 3 progress bars (tables/staff/orders today).
- **CTA:** "Manage packages" → /dashboard/subscription; "Upgrade" if not PREMIUM.

#### 13.3.2 `/dashboard/subscription`

- **Layout per audit §13.3.2.**
- **Current subscription card** with status badge + countdown.
- **Plan comparison cards** (FREE/BASIC/PREMIUM). Current plan highlighted. "Select" buttons.
- **Payment history table.**
- **Logic:**
- Click "Select" on plan → check if upgrade vs downgrade vs renewal.
  - Renewal (same plan): POST checkout → /dashboard/billing/[id].
  - Upgrade: POST checkout → /dashboard/billing/[id].
- Downgrade with usage > new limit: show warning dialog "You currently have X tables, FREE package only allows Y. Please reduce before downgrading." Block.
- Click "Cancel": confirm 2-step → POST cancel.

#### 13.3.3 `/dashboard/billing/[invoiceId]`

- **Layout per audit §14.4.**
- **QR display:** large image from `invoice.qrUrl` (200×200+).
- **Transfer instructions:** bank name, account number, amount, content/code.
- **Status badge** with auto-refresh.
- **Countdown timer:** "QR expires after X hours Y minutes" (computed from `qr_expires_at`).
- **Polling:** GET `/dashboard/billing/invoices/:id/status` every 5s. When status becomes PAID → toast success + redirect to /dashboard/subscription after 2s.
- **WebSocket alternative:** subscribe to `subscription.activated` event in `tenant:{tid}:management` room → faster than polling.
- **Cancel button:** POST cancel → status CANCELED → back to subscription page.

#### 13.3.4 `/dashboard/payment-settings`

- **Initial state (NOT_CONNECTED):**
  ```
  ┌────────────────────────────────────────────────────┐
  │ Connect SePay to receive VietQR payments │
  │                                                     │
  │ You need a SePay account (free 50 tx/month).    │
  │ Register at: https://my.sepay.vn/dang-ky │
  │                                                     │
  │ [Connect my SePay account] │
  │                                                     │
  │ Or temporarily only accept cash: │
  │ [☑ Cash payment allowed] │
  └────────────────────────────────────────────────────┘
  ```
- **Click "Connect SePay account":** GET `/dashboard/payment-settings/sepay-authorize-url` → redirect to returned URL.
- **After OAuth callback** (Next.js page `/dashboard/payment-settings/sepay-callback`):
  - Reads code+state from URL.
  - Calls GET `/api/v1/dashboard/payment-settings/sepay-callback?code=&state=` → returns bank list.
  - Render bank picker:
    `Select the receiving bank account:
    ◯ Vietcombank 9332770502 — NGUYEN VAN A (5,000,000 VND)
    ◯ MBBank      1234567890 — NGUYEN VAN A (1,200,000 VND)
[Cancel] [Select]
   `
  - On select → POST `/dashboard/payment-settings/select-bank`.
- **Connected state:**
  ```
  ┌────────────────────────────────────────────────────┐
  │ ✅ SePay connected │
  │                                                     │
  │ Bank: Vietcombank │
  │ Account number: 9332770502 (•••• 0502) │
  │ Account Owner: NGUYEN VAN A │
  │ Webhook:      🟢 Active                            │
  │ Verified:     2026-05-11 11:30                     │
  │                                                     │
  │ Payment options: │
  │ [☑] Get cash │
  │ [☑] Receive VietQR │
  │                                                     │
  │ [Test webhook] [Disconnect] │
  └────────────────────────────────────────────────────┘
  ```
- **Disconnect:** confirm dialog → POST disconnect.

#### 13.3.5 `/dashboard/payment-settings/sepay-callback` (Next.js Page)

Server-side handle: read query params, call BFF, render bank picker. Edge cases:

- `state` does not match Redis → "Link is invalid or expired" + retry button.
- SePay return `error=access_denied` → "You declined authorization. You can try again at any time."
- SePay return other error → show error.

### 13.4 Customer PWA Suspend Behavior

- **Detect:** SessionGuard checks Redis flag (§11.3). For backward compat in case Redis miss, also check tenant.status via `GET /public/tenants/:slug` (Cached 1 min in FE).
- **Banner (sticky top):**
  ```
  ⚠ The store temporarily stops accepting new orders.
  You can view current orders and payments. Contact staff if needed.
  ```
- **Disabled actions:** "Add to cart", "Order" buttons disabled with tooltip.
- **Allowed actions:** View menu, view cart (read-only), view order status, request payment for existing bills, complete payment.
- **WS event handler:** Listen for `tenant.suspended` → display banner; for `tenant.activated` → remove banner + reload menu (in case stock/prices changed).

### 13.5 Sidebar Navigation Update

`apps/management-app/src/components/layout/data/sidebar-data.ts`:

```typescript
const NAV_ITEMS = {
  OWNER: [
    ...existing,
    { label: 'Subscription', href: '/dashboard/subscription', icon: 'CreditCard', permission: 'subscription.read_own' },
    {
      label: 'Payment settings',
      href: '/dashboard/payment-settings',
      icon: 'Landmark',
      permission: 'payment_settings.read_own',
    },
  ],
  MANAGER: [
    ...existing,
    { label: 'Subscription', href: '/dashboard/subscription', icon: 'CreditCard', permission: 'subscription.read_own' },
    {
      label: 'Payment settings',
      href: '/dashboard/payment-settings',
      icon: 'Landmark',
      permission: 'payment_settings.read_own',
    },
    // MANAGER can read payment settings but cannot connect/disconnect/update SePay.
  ],
  SUPER_ADMIN: [
    ...existing,
    { label: 'Tenants', href: '/admin/tenants', icon: 'Building2', permission: 'tenant.list_all' },
    { label: 'Plans', href: '/admin/plans', icon: 'Package', permission: 'plan.read' },
    { label: 'Billing', href: '/admin/billing', icon: 'Receipt', permission: 'subscription.list_any' },
  ],
};
```

Filter logic uses session permissions (existing pattern in `role-routing.ts`).

---

## 14. Migration Plan (Ordered)

### 14.1 SQL Migrations

#### Migration 1: `qrtable_saas` schema changes

```sql
-- 001_extend_tenants.sql
ALTER TABLE tenants
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN type VARCHAR(30) NOT NULL DEFAULT 'RESTAURANT',
  ADD COLUMN address TEXT,
  ADD COLUMN owner_id UUID,
  ADD COLUMN default_currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  ADD COLUMN default_locale VARCHAR(20) NOT NULL DEFAULT 'vi-VN',
  ADD COLUMN operating_modes TEXT[] NOT NULL DEFAULT ARRAY['INSTANT_ORDER','DIGITAL_MENU'],
  ADD COLUMN suspended_at TIMESTAMPTZ,
  ADD COLUMN suspended_reason TEXT,
  ADD COLUMN closed_at TIMESTAMPTZ,
  ADD COLUMN closed_reason TEXT;

-- Backfill: existing rows with isActive=false → SUSPENDED
UPDATE tenants SET status = 'SUSPENDED' WHERE is_active = FALSE;

-- Drop is_active and recreate as generated column
ALTER TABLE tenants DROP COLUMN is_active;
ALTER TABLE tenants ADD COLUMN is_active BOOLEAN GENERATED ALWAYS AS (status = 'ACTIVE') STORED;

CREATE INDEX ix_tenants_status_created_at ON tenants(status, created_at);
CREATE INDEX ix_tenants_owner_id ON tenants(owner_id) WHERE owner_id IS NOT NULL;
```

#### Migration 2: Create pricing_plans + subscriptions

```sql
-- 002_create_plans_subscriptions.sql
-- (see §5.2, §5.3)

-- Seed default plans
INSERT INTO pricing_plans (code, name, price_vnd, max_tables, max_staff, max_orders_per_day, features, display_order)
VALUES
('FREE', 'Free', 0, 10, 5, 100, '["basic_pos"]', 1),
('BASIC', 'Basic', 299000, 50, 20, 1000, '["basic_pos","analytics_basic"]', 2),
('PREMIUM', 'Premium', 999000, 500, 100, 10000, '["basic_pos","analytics_basic","analytics_advanced","priority_support"]', 3);

-- Backfill: every existing tenant gets FREE subscription
INSERT INTO subscriptions (tenant_id, pricing_plan_id, plan_code_snapshot, price_vnd_snapshot, status, starts_at, expires_at, source)
SELECT t.id, p.id, p.code, p.price_vnd, 'ACTIVE', t.created_at, NULL, 'INITIAL_ONBOARDING'
FROM tenants t
CROSS JOIN pricing_plans p
WHERE p.code = 'FREE';
```

#### Migration 3: Create subscription_invoices

```sql
-- 003_create_subscription_invoices.sql
-- (see §5.4)
```

#### Migration 4: Create saas outbox_events

```sql
-- 004_create_saas_outbox.sql
-- (see §5.5)
```

#### Migration 5: `qrtable_payment` — tenant_payment_settings

```sql
-- 005_create_tenant_payment_settings.sql
-- (see §5.6)

-- Backfill: every existing tenant gets empty payment settings
INSERT INTO tenant_payment_settings (tenant_id, cash_enabled, vietqr_enabled, connection_status)
SELECT id, TRUE, FALSE, 'NOT_CONNECTED' FROM tenants;
```

#### Migration 6: MongoDB `users` add tenantId

```javascript
// 006_migrate_users_tenantid.js
db.users.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: null, isActive: true } });
db.users.createIndex({ tenantId: 1 });
db.users.createIndex({ tenantId: 1, isActive: 1 });

// Backfill from Keycloak (script in tools/migrate-users-tenantid.ts):
// For each user with userId, fetch KC user by id, read attributes.tenant_id, update Mongo.
```

### 14.2 Code Release Sequence

1. **Release 1: Backend foundation** (no FE changes)

- SaaS service extended (tenant entity, Plan, Subscription, Outbox).
  - Payment service: `tenant_payment_settings` entity + SePay OAuth client (basic, no UI).
  - Authorizer ext.
  - User-Access ext (tenantId field).
  - Catalog ext (count + Kafka consumer for tenant.created).
  - Order ext (Redis counter).
  - BFF guards (TenantStatusGuard, TenantPlanGuard).
  - Permission matrix update.
  - Run all migrations 001-006.

2. **Release 2: Admin UI** (FE only, backend ready)
   - `/admin` overview.
   - `/admin/tenants` directory + Onboard modal.
   - `/admin/tenants/[id]` detail.
   - `/admin/plans` CRUD.
   - `/admin/billing` (basic list).
   - Sidebar update for SUPER_ADMIN.

3. **Release 3: Tier 1 (OAuth Connect)**
   - `/dashboard/payment-settings` UI.
   - SePay callback handler.
   - Tier 1 webhook routing refactor in BFF (per-tenant slug URL).
   - Refactor PaymentSettlementService.

4. **Release 4: Tier 2 (Subscription billing)**
   - `/dashboard/subscription` UI (compare + checkout button).
   - `/dashboard/billing/[invoiceId]` UI.
   - Tier 2 webhook handler.
   - Subscription auto-activate logic.

5. **Release 5: Customer PWA suspend + Landing page**
   - Customer PWA banner + disable actions.
   - Landing page (with ui-ux-pro-max).
   - Dashboard widget "Plan & Quota".

6. **Release 6: Cron + polish**
   - Cron auto-suspend (daily 02:00 ICT).
   - Cron expire pending invoices (hourly).
   - Orphan KC user cleanup cron.

---

## 15. Coordination with Phase 4A and Phase 4C

### 15.1 Phase 4A (Saga + Hardening)

- **Can run in parallel** with Phase 4B. No hard dependency.
- Phase 4B's onboarding mini-saga uses similar Outbox pattern, mature in Phase 3 already.
- If Phase 4A finishes first → refactor mini-saga to use saga framework (lift-and-shift).

### 15.2 Phase 4C (Staff Management)

- **Phase 4C HARD depends on Phase 4B:**
  - `User.tenantId` field (Phase 4B migration) → Phase 4C list-staff-by-tenant query.

- **Removed from current scope:**
  - Notification Service runtime.
  - `Notification.send_tenant_suspended`.
  - `Notification.send_subscription_warning`.
  - Welcome/suspend/expiry/reset-password email delivery.

- **Phase 4B documents tenant/user prerequisites; Phase 4C implements staff-management behavior through User-Access, Authorizer and BFF.**

### 15.3 Phase 5+ (Future)

- **Self-service registration wizard** (Q8 deferred).
- **Stripe / VNPAY add as alternative gateways.**
- **Tenant data hard-delete cron** (Q12 deferred).
- **Internationalization** (Q13 hardcoded VN).
- **Partial subscription refund / proration.**
- **Tenant ownership transfer flow.**

---

## 16. Acceptance Criteria

### 16.1 Backend

- [ ] Slug generation: `"Pho Hanoi"` → `"pho-ha-noi"`, `"admin"` → 400 `SAAS_SLUG_RESERVED`.
- [ ] Onboarding API: `POST /admin/tenants/onboard` with valid input → tenant + subscription + KC user + empty payment_settings created atomically. Owner can log in immediately with provided password.
- [ ] Onboarding compensation: mock Authorizer fail mid-saga → no orphan tenant row; KC user disabled.
- [ ] Plan limit: tenant FREE, attempt to create 11th table → HTTP 402 `TENANT_PLAN_LIMIT_EXCEEDED` with details `{ limitType: 'max_tables', limit: 10, current: 10, upgradeUrl: '/dashboard/subscription' }`.
- [ ] Plan upgrade: tenant FREE → admin assigns PREMIUM → can create 11th table immediately (cache invalidated).
- [ ] Suspend: tenant `ACTIVE → SUSPENDED` → next staff request 403 `TENANT_SUSPENDED` (unless permission in allow-list).
- [ ] Suspended tenant: customer can complete bill `PENDING_PAYMENT` but cannot submit new order.
- [ ] Activate: tenant `SUSPENDED → ACTIVE` → Redis flag removed, WS event emitted.
- [ ] Cron auto-suspend: subscription `expires_at + 24h < now()` → status `EXPIRED`, tenant `SUSPENDED`, Redis flag set, outbox event.
- [ ] Cron multi-instance safety: distributed lock prevents double execution.
- [ ] Tier 1 OAuth flow: Owner connects → bank list shown → selects → webhook auto-created in SePay → status `CONNECTED`.
- [ ] Tier 1 webhook: customer pays → tenant-scoped webhook URL hit → bill PAID → money in tenant's bank (verified manually).
- [ ] Tier 2 checkout: Owner clicks "Pay for PREMIUM" → invoice + QR returned → polling status.
- [ ] Tier 2 webhook: Owner transfers correct amount → invoice PAID → subscription auto-created → tenant `SUSPENDED → ACTIVE` (if was suspended).
- [ ] Underpaid Tier 2: amount < invoice.amount_vnd → invoice remains PENDING + audit, subscription NOT activated.
- [ ] Duplicate Tier 2 webhook (same SePay tx_id): idempotent, no double-activate.
- [ ] `tenant.created` Kafka event published from outbox after onboarding commit.
- [ ] Catalog consumer: receives `tenant.created` → seeds "General area" area.
- [ ] Token refresh: SePay token expires → auto-refresh on next call → API succeeds.
- [ ] Disconnect: SePay webhook deleted from SePay side; settings reset to NOT_CONNECTED.

### 16.2 Frontend

- [ ] Landing page (`/`) loads, displays 3 plans from `GET /public/plans`, no auth required.
- [ ] Landing page applies `ui-ux-pro-max` skill recommendations (verified via design-system/MASTER.md + design-system/pages/landing.md).
- [ ] Landing page mobile-responsive at 375 / 768 / 1024 / 1440.
- [ ] `/admin/tenants`: SUPER_ADMIN sees list, can onboard new tenant via modal.
- [ ] `/admin/tenants/:id`: 5 tabs work; Usage tab shows real-time numbers.
- [ ] `/admin/plans`: CRUD works; delete with active subs → 409 message with action.
- [ ] `/dashboard/subscription`: Owner sees current plan + 3 plan cards + history.
- [ ] `/dashboard/subscription`: click Premium "Select" → invoice + QR rendered.
- [ ] `/dashboard/billing/:id`: QR displays, polling, status → PAID → toast + redirect.
- [ ] `/dashboard/payment-settings`: full OAuth flow works end-to-end with real SePay credentials.
- [ ] Customer PWA: when tenant suspended, banner displayed, submit blocked, payment allowed.
- [ ] Sidebar nav: items conditionally visible per role permissions.

### 16.3 Cross-cutting

- [ ] Permission matrix Level 1/2/3 tests all PASS.
- [ ] All Phase 3 tests still PASS (no regression).
- [ ] Migration scripts idempotent (running twice doesn't break).
- [ ] Mock OAuth2 server enables CI/CD testing without hitting SePay.

---

## 17. Test Matrix (Minimum)

### 17.1 Unit Tests

| Module                                        | Test scope                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `SlugService.generateSlug`                    | 10+ Vietnamese name cases, reserved words, collision suffix.                     |
| `PaymentReferenceService` (existing + extend) | `createSubscriptionBillingReference` (QRSUB prefix).                             |
| `TenantPlanGuard` unit                        | Limit -1 (unlimited), limit 0, equal, exceeded, no subscription, suspended.      |
| `TenantStatusGuard` (in TenantGuard)          | Allowed/disallowed permission during suspended.                                  |
| `SubscriptionService.applyPaidInvoice`        | Renewal extends, upgrade supersedes, downgrade rejected if exceeds limit.        |
| `OAuthTokenStore.refreshIfNeeded`             | Token still valid (no refresh), token expired (refresh succeeds), refresh fails. |
| `WebhookRouting` prefix logic                 | QRTBL → Tier 1, QRSUB → Tier 2, unknown prefix → 200 + log.                      |

### 17.2 Integration Tests

| Scenario                                                            | Services involved                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| Onboarding mini-saga happy path                                     | BFF + SaaS + Authorizer + User-Access + Catalog (Kafka) |
| Onboarding KC failure → rollback                                    | BFF + SaaS + Authorizer (mock fail)                     |
| Cron expiry → tenant suspended                                      | SaaS + Redis + WS                                       |
| OAuth callback exchange → bank list → select bank → webhook created | BFF + Payment + Mock SePay server                       |
| Tier 1 customer pays → webhook → bill PAID                          | Mock SePay → BFF → Payment + Order                      |
| Tier 2 owner pays → webhook → subscription active                   | Mock SePay → BFF → SaaS                                 |
| Plan limit exceeded → 402                                           | BFF guard + Catalog                                     |

### 17.3 E2E Demo Scenarios

| Scenario                                                                                                                                                                                               | Roles involved                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| **1. Onboarding** SUPER_ADMIN logs in → /admin/tenants → onboard "Pho Hanoi" → Owner receives credentials → Owner logs in → sees dashboard.                                                            | SUPER_ADMIN, Owner               |
| **2. Connect SePay** Owner → /dashboard/payment-settings → click Connect → OAuth flow → pick bank → status Connected.                                                                                  | Owner, SePay sandbox             |
| **3. Customer pays restaurant** Customer scans QR at table → adds menu items → requests bill → scans payment QR → transfers via bank app → bill PAID.                                                  | CUSTOMER                         |
| **4. Owner upgrades plan** Owner sees usage approaching limit → /dashboard/subscription → select PREMIUM → /dashboard/billing/[id] → scans QR → transfers → page auto-redirects → plan PREMIUM active. | Owner                            |
| **5. Subscription expires** (test via setting expires_at in past + manual cron trigger) → tenant SUSPENDED → Owner can't create order → renews plan → SUSPENDED → ACTIVE.                              | Owner (impacts STAFF + CUSTOMER) |
| **6. Manual confirm fallback** Owner transfers but webhook fails → SUPER_ADMIN sees invoice PENDING → clicks Manual Confirm → plan activated.                                                          | SUPER_ADMIN, Owner               |

---

## 18. Historical Implementation Scope

During Phase 4B implementation, this spec provided decision scope for the implementation plan:

- **Domain model** (§5) — table-level schema, indexes, encryption notes.
- **State machines** (§4) — explicit transitions, side-effects, invariants.
- **API contracts** (§6) — REST + TCP + Kafka with payload examples.
- **Algorithms** (§7-9) — pseudocode for slug, mini-saga, OAuth flow, subscription apply.
- **Permission matrix** (§12) — 19 new permissions with role assignment.
- **Migration sequence** (§14) — ordered SQL/Mongo migrations + code releases.
- **AC** (§16) + **Test matrix** (§17) — concrete verification criteria.
- **Skill requirements** (§13.1) — `ui-ux-pro-max` mandatory for landing.
- **Risks & mitigations** — refer to audit §9 + §16 + §23 (R1-R20).

The Implementation plan was then organized into several small batches/releases and Phase 4B is now closed according to the final phase record.

---

## End of Phase 4B Specification

> **Total estimated effort:** ~2.5-3 weeks (3 dev-days × 5-6 releases). Critical path: backend foundation → Tier 1 OAuth → Tier 2 billing.
>
> **Highest-risk items:**
>
> - SePay OAuth2 first-time integration (Q25=E — credentials already present; remaining risk is real testing with Vercel redirect URI + SePay callback/webhook).
> - Migration MongoDB tenantId backfill (legacy data accuracy).
> - Customer PWA suspend banner edge cases (existing WS connection state).
>
> **Current status:** Phase 4B has already been implemented; see the final phase record at [Phase 4B record](../phases/phase-4b-saas-onboarding.md).
