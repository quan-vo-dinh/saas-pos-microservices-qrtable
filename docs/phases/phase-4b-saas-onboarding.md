# Phase 4B — SaaS Onboarding & Subscription

> **Status:** Done
> **Canonical Role:** Final phase record after implementation and audit.
> **Last Updated:** 2026-05-13

## Final Scope

Phase 4B hoàn thành nền tảng SaaS thực tế cho QRTable: tenant lifecycle, admin-assisted onboarding, pricing plans, subscriptions, subscription_invoices, feature gating, tenant payment settings và kiến trúc thanh toán two-tier.

Phạm vi cuối cùng gồm:

- SaaS tenant lifecycle `ACTIVE` / `SUSPENDED` / `CLOSED`, slug an toàn, thông tin tenant mở rộng, và onboarding do `SUPER_ADMIN` thực hiện qua `/admin/tenants/onboard`.
- Pricing plans `FREE` / `BASIC` / `PREMIUM`, subscription hiện hành mỗi tenant, subscription history, và `subscription_invoices` cho Tier 2 tenant -> platform billing.
- Two-tier payment architecture:
  - Tier 1 customer -> tenant: bill payment dùng prefix `QRTBL`, tenant payment settings, và SePay OAuth2 Connect để tenant nhận tiền vào tài khoản của mình.
  - Tier 2 tenant -> platform: subscription checkout dùng VietQR / SePay webhook với prefix `QRSUB`, kèm manual confirm fallback cho `SUPER_ADMIN`.
- UI surfaces: public landing, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, OAuth callback page, và Customer PWA suspend/read-only/payment exception.

## Accepted Decisions

- Onboarding Phase 4B là admin-assisted, không phải self-service registration wizard. `SUPER_ADMIN` tạo tenant, Owner, subscription mặc định và payment settings ban đầu.
- `TenantStatus` là trạng thái vận hành chính: `ACTIVE` cho phép thao tác, `SUSPENDED` chuyển sang read-only có ngoại lệ thanh toán bill đang chờ, `CLOSED` là trạng thái đóng tenant và không activate lại trong Phase 4B.
- `isActive` chỉ còn ý nghĩa tương thích DTO cũ; hành vi mới derive từ `status`.
- Permission mới được tách theo domain `tenant.*`, `subscription.*`, `plan.*`, `payment_settings.*`; nhóm `saas.*` là legacy/backward compatibility.
- Feature gating dùng mô hình hybrid: BFF/guard chặn sớm cho UX, service sở hữu resource vẫn có backup check/counter để giữ correctness.
- Payment Service sở hữu `tenant_payment_settings`; SaaS Service không lưu OAuth token hay thông tin ngân hàng tenant.
- BFF là HTTP edge và webhook router: endpoint tenant-scoped cho Tier 1, platform endpoint cho Tier 2, route theo billing reference prefix `QRTBL` / `QRSUB`.
- Suspend phải có hiệu lực nhanh qua Redis key `tenant:{tenantId}:suspended`; subscription hiện hành được cache bằng `subscription:{tenantId}` để guard đọc nhanh.
- Phase 4B không thêm notification/email suspend; phần đó thuộc Phase 4C.

## Final Business Behavior

Tenant được onboard với slug hợp lệ, Owner, plan mặc định, subscription ban đầu và row `tenant_payment_settings` ở trạng thái chưa kết nối. `ACTIVE` tenant có thể vận hành nhà hàng theo giới hạn gói. `SUSPENDED` tenant bị chặn các thao tác tạo mới/ghi mới cần vận hành như đặt món, tạo order, tạo bàn hoặc vượt quota; người dùng vẫn có thể đọc thông tin cần thiết và customer vẫn được thanh toán bill `PENDING_PAYMENT` đã phát sinh. `CLOSED` tenant bị đóng, bị chặn truy cập vận hành và là trạng thái kết thúc hợp đồng trong phase này.

Pricing plan quy định giới hạn `max_tables`, `max_staff`, `max_orders_per_day` và danh sách feature. Mỗi tenant chỉ có một subscription `ACTIVE` tại một thời điểm; subscription mới có thể supersede subscription cũ. Subscription invoice là hóa đơn Tier 2 cho tenant trả tiền platform, khác với bill nhà hàng của customer. Invoice pending có QR thanh toán, được chuyển sang paid khi webhook khớp số tiền/reference hoặc khi `SUPER_ADMIN` manual confirm sau đối soát.

Thanh toán hai tầng được tách rõ:

- Tier 1 customer -> tenant: customer thanh toán bill nhà hàng bằng cash/VietQR theo cấu hình tenant. QR/reference dùng `QRTBL`; Payment Service xử lý settlement và đọc bank settings từ `tenant_payment_settings`.
- Tier 2 tenant -> platform: Owner tạo/cancel checkout subscription, Owner/Manager xem gói và subscription hiện hành, thanh toán platform VietQR với reference `QRSUB`; SaaS Service xử lý invoice và kích hoạt/renew subscription khi webhook hợp lệ.

Tenant tự kết nối SePay trên `/dashboard/payment-settings`: BFF tạo authorize URL, Payment Service trao đổi OAuth2 code, lưu token đã mã hóa, đọc danh sách bank accounts, tenant chọn tài khoản nhận tiền, và Payment Service cấu hình/lưu webhook settings cần thiết. Trình duyệt không nhận client secret, access token, refresh token.

## Final Technical Behavior

Service ownership sau Phase 4B:

- SaaS Service owns `tenants`, `pricing_plans`, `subscriptions`, `subscription_invoices`, outbox SaaS events, tenant lifecycle, subscription activation/expiry, invoice matching, và Redis suspend/current-subscription cache writes.
- Payment Service owns `tenant_payment_settings`, SePay OAuth2 client/token storage, tenant bank account selection, Tier 1 bill payment settlement, và tenant payment setting TCP patterns.
- BFF owns HTTP routes, auth/permission guards, `TenantPlanGuard`/tenant lifecycle guards, public plan/landing APIs, SePay webhook routing, OAuth callback routing, và realtime tenant lifecycle emits.
- User-Access owns user profile/tenant-side staff counts; Authorizer owns Keycloak user/role/disable operations; Catalog owns table counts và default tenant seed side effects; Order owns order counters và backup order quota checks.

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

## Handoff / Deferred Work

- Self-service restaurant registration wizard remains deferred; Phase 4B keeps admin-assisted onboarding plus public landing/contact path.
- Phase 4C owns notification/email flows such as welcome/suspend/expiry messaging and reset-password email improvements.
- Suspended Customer PWA browser verification still needs a reliable suspended seed route or demo fixture so manual route-level smoke can match automated coverage.
- Production SePay setup still requires public BFF/webhook URLs, platform webhook secret, OAuth redirect registration, and live provider-side validation.
- Hard-delete, retention cleanup, tenant data erasure policy, transfer ownership, promotions/discounts, webhook replay dashboard, and partial subscription refund/proration are out of scope for Phase 4B.
