# Phase 4B — SaaS Onboarding & Subscription

> **Status:** Done
> **Canonical Role:** Final phase record after implementation and audit.
> **Last Updated:** 2026-05-13

## Final Scope

Phase 4B completes the actual SaaS foundation for QRTable: tenant lifecycle, admin-assisted onboarding, pricing plans, subscriptions, subscription_invoices, feature gating, tenant payment settings and two-tier payment architecture.

The final scope includes:

- SaaS tenant lifecycle `ACTIVE` / `SUSPENDED` / `CLOSED`, security slug, extended tenant information, and onboarding performed by `SUPER_ADMIN` via `/admin/tenants/onboard`.
- Admin-managed pricing plans, current subscription per tenant, subscription history, and `subscription_invoices` for Tier 2 tenant -> billing platform. Seed plans may use examples such as `FREE`, `BASIC`, or `PREMIUM`, but runtime UI must read active plans from SaaS and must not synthesize fake plans.
- Two-tier payment architecture:
  - Tier 1 customer -> tenant: bill payment uses prefix `QRTBL`, tenant payment settings, and SePay OAuth2 Connect for the tenant to receive money into their account.
  - Tier 2 tenant -> platform: subscription checkout using VietQR / SePay webhook with prefix `QRSUB`, with manual confirm fallback for `SUPER_ADMIN`.
- UI surfaces: public landing, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, OAuth callback page, and Customer PWA suspend/read-only/payment exception.

## Accepted Decisions

- Onboarding Phase 4B is admin-assisted, not self-service registration wizard. `SUPER_ADMIN` creates tenant, Owner, selected initial subscription and initial payment settings.
- Onboarding runs like a mini-saga in SaaS service; mid-failure must rollback DB-side effects and cleanup orphan Keycloak users. Phase 4B uses a manually entered password for the Owner, while reset link/Required Action belongs to Phase 4C.
- Onboarding must receive an explicit initial plan selected from active pricing plans. The backend must not silently fall back to a hardcoded plan code when the UI or caller omits the plan.
- `TenantStatus` is the main operating state: `ACTIVE` allows operations, `SUSPENDED` switches to read-only with pending bill payment exception, `CLOSED` is the state of closing the tenant and not reactivating in Phase 4B.
- `isActive` only has the old DTO compatibility meaning; New behavior derived from `status`.
- Slug tenant must normalize Vietnamese, unique across the platform and block reserved words in shared constants.
- Auto-suspend runs daily `02:00 Asia/Ho_Chi_Minh` with a grace period of 24h; `max_orders_per_day` is also calculated according to Vietnam timezone.
- Legacy tenant migration backfill `FREE` plan does not expire, maps `isActive=false` to `SUSPENDED`, and sets default `VND` / `vi-VN`.
- New permissions are separated by domains `tenant.*`, `subscription.*`, `plan.*`, `payment_settings.*`; `saas.*` group is legacy/backward compatibility.
- Feature gating uses a hybrid model: BFF/guard blocks early for UX, the service that owns the resource still has backup check/counter to maintain correctness.
- Payment service owns `tenant_payment_settings`; SaaS service does not store OAuth tokens or tenant banking information.
- BFF is HTTP edge and webhook router: tenant-scoped endpoint for Tier 1, platform endpoint for Tier 2, route according to billing reference prefix `QRTBL` / `QRSUB`.
- Suspend must take effect quickly via Redis key `tenant:{tenantId}:suspended`; The current subscription is cached with `subscription:{tenantId}` for the guard to read quickly.
- Suspended tenant can still process the SePay webhook for the created bill, order `PROCESSING` is still completed by the kitchen, and the client receives a warning banner instead of force-disconnect.
- `/admin/*` belongs to `management-app`; Phase 4B does not separate the app admin platform separately. Landing page is static pricing/contact/login page reading public plans.
- Phase 4B does not add notification/email suspension; That part belongs to Phase 4C.

## Final Business Behavior

The tenant is onboarded with a valid slug, Owner, selected initial plan, initial subscription, and row `tenant_payment_settings` in an unconnected state. `ACTIVE` tenant can operate restaurants according to plan limits. `SUSPENDED` tenant is blocked from creating/recording new operations such as placing orders, creating orders, creating tables or exceeding quota; The user can still read the necessary information and the customer can still get paid the bill `PENDING_PAYMENT` that has arisen. `CLOSED` tenant is closed, is blocked from operational access and is the contract end state in this phase.

Pricing plan specifies limits `max_tables`, `max_staff`, `max_orders_per_day` and feature list. Each tenant can only have one `ACTIVE` subscription at a time; New subscriptions can supersede old subscriptions. Subscription invoice is a Tier 2 invoice for the tenant paying the platform, different from the customer's restaurant bill. Pending invoices have a payment QR, which is converted to paid when the webhook matches the amount/reference or when `SUPER_ADMIN` manual confirms after checking.

Two-tier payments are clearly separated:

- Tier 1 customer -> tenant: customer pays restaurant bill with cash/VietQR according to tenant configuration. QR/reference uses `QRTBL`; Payment service processes settlement and reads bank settings from `tenant_payment_settings`.
- Tier 2 tenant -> platform: Owner creates/cancel checkout subscription, Owner/Manager views current package and subscription, pays VietQR platform with reference `QRSUB`; SaaS service processes invoices and activates/renew subscriptions when the webhook is valid.

tenant automatically connects to SePay on `/dashboard/payment-settings`: BFF creates authorization URL, Payment service exchanges OAuth2 code, saves encrypted token, reads list of bank accounts, tenant selects account to receive money, and Payment service configures/saves necessary webhook settings. The browser does not receive client secret, access token, refresh token.

Subscription/plan behavior in Phase 4B uses one active subscription at a time. Checkout subscription creates invoice `QRSUB*`; Valid webhook or manual confirmation of `SUPER_ADMIN` activate/renew package. Pricing plan code is immutable after creation. Plan delete in Phase 4B means deactivate / stop selling, not hard-delete. Multi-bank active, provision, partial subscription refund, promotion/discount and transfer ownership are outside the scope of phase.

## Final Technical Behavior

Service ownership after Phase 4B:

- SaaS service owns `tenants`, `pricing_plans`, `subscriptions`, `subscription_invoices`, outbox SaaS events, tenant lifecycle, subscription activation/expiry, invoice matching, and Redis suspend/current-subscription cache writes.
- Payment service owns `tenant_payment_settings`, SePay OAuth2 client/token storage, tenant bank account selection, Tier 1 bill payment settlement, and tenant payment setting TCP patterns.
- BFF owns HTTP routes, auth/permission guards, `TenantPlanGuard`/tenant lifecycle guards, public plan/landing APIs, SePay webhook routing, OAuth callback routing, and realtime tenant lifecycle emits.
- User-Access owns user profile/tenant-side staff counts; Authorizer owns Keycloak user/role/disable operations; Catalog owns table counts and default tenant seed side effects; Order owns order counters and backup order quota checks.

Redis keys introduced/used by the phase include `tenant:{tenantId}:suspended` for fast blocking and `subscription:{tenantId}` for current subscription cache. Customer PWA lifecycle state is exposed through session/tenant metadata, socket lifecycle events, and client-side banner/disabled controls.

Implemented UI surfaces:

- Public landing `/` in management-app reads public plans and landing info.
- Platform admin: `/admin/tenants`, `/admin/tenants/:id`, `/admin/plans`, `/admin/billing`.
- Tenant dashboard: `/dashboard/subscription`, `/dashboard/payment-settings`, `/dashboard/payment-settings/sepay-callback`.
- Customer PWA: suspended/closed banner, disabled cart/order mutation controls, read-only access where allowed, and payment path preserved for existing pending bills.

## Acceptance Evidence

Implementation and stabilization evidence on 2026-05-13 showed the phase is complete enough to be the final Phase 4B record:

- Backend/static verification passed for SaaS, Payment, BFF and related libraries, including tests for subscription invoices, payment settings, tenant lifecycle guards, webhook routing, Redis suspend behavior, and customer suspended-state behavior.
- Management-app, customer-pwa and BFF test suites passed in the handoff runs; production builds for management-app/customer-pwa and affected Nx builds were reported green, with only pre-existing warnings noted.
- Direct startup smoke for built SaaS and Payment services passed on temporary ports after sourcing environment configuration.
- Browser verification covered SUPER_ADMIN admin routes, OWNER subscription/payment-settings routes, public landing, mobile responsive surfaces, OAuth invalid-state handling, and active Customer PWA QR flow. No blank pages, 401/500 dashboard screens, console crashes, or exposed SePay secrets were observed in those checks.
- Suspended Customer PWA behavior is covered by automated tests and component/guard checks. Real browser verification for a suspended tenant was limited by missing suspended seed route/data in the available local UI.
- Stabilization on 2026-05-26 tightened SUPER_ADMIN plan/onboarding/billing behavior: active plans are loaded from SaaS instead of fake UI defaults, onboarding forwards the Owner temporary password, plan code update is blocked, VND amounts are rounded through the shared utility, `UNDERPAID` subscription invoices can be manually confirmed after audit evidence, and manual confirm uses an app dialog instead of browser confirm.

## Handoff / Deferred Work

- Self-service restaurant registration wizard remains deferred; Phase 4B keeps admin-assisted onboarding plus public landing/contact path.
- Phase 4C owns notification/email flows such as welcome/suspend/expiry messaging and reset-password email improvements.
- Phase 4C should absorb deferred Phase 4B communication flows: welcome email from `tenant.created`, tenant suspended email via direct task/TCP (not Kafka), subscription warning/expired email, and Owner password reset/Required Action handoff.
- Suspended Customer PWA browser verification still needs a reliable suspended seed route or demo fixture so manual route-level smoke can match automated coverage.
- Production SePay setup still requires public BFF/webhook URLs, platform webhook secret, OAuth redirect registration, and live provider-side validation.
- Tenant/platform `x-secret-key` webhook value verification needs production hardening against stored platform/tenant secrets; current documented route shape is correct, but security verification must be rechecked before go-live.
- Existing production databases created before the 2026-05-26 actor-id fix must alter SaaS actor columns from `uuid` to `varchar(64)` before deploying the fixed code: `subscriptions.created_by_user_id`, `subscription_invoices.requested_by_user_id`, and `subscription_invoices.manually_confirmed_by_user_id`.
- Hard-delete, retention cleanup, tenant data erasure policy, transfer ownership, promotions/discounts, webhook replay dashboard, and partial subscription refund/proration are out of scope for Phase 4B.
