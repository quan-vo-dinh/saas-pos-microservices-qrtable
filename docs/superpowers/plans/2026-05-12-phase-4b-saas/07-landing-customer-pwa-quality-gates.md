# Phase 4B Landing, Customer PWA, and Quality Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`, `superpowers:subagent-driven-development`, `ui-ux-pro-max`, `frontend-design`, `frontend-patterns`, `browser-use:browser`, and `code-review-and-quality` before executing this plan directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification.

**Goal:** Build the Phase 4B public landing page, customer-pwa suspended-state behavior, and final quality gates that prove the SaaS onboarding/subscription/payment flows are production-shaped for thesis demo.

**Architecture:** The public landing page is static/pricing-led and reads public plan data from BFF. It does not perform self-service onboarding in Phase 4B. Customer PWA blocks ordering when tenant is suspended or closed while still showing a clear suspended banner. Quality gates verify backend contracts, frontend UX, SePay real OAuth2 callback readiness, and maintainability before implementation is considered complete.

**Tech Stack:** Next.js management-app landing route, customer-pwa React/Next.js route conventions, existing Socket.io/realtime integration, shadcn/ui when available, ui-ux-pro-max design workflow, Browser plugin for visual verification, Nx lint/test commands.

---

## Inputs and Constraints

- Source of truth: `docs/specs/business-logic-phase-4b-spec.md`.
- Q16 is `B`: static landing/pricing/contact page, not tenant self-service registration.
- Q16 note is mandatory: landing page must apply `ui-ux-pro-max`.
- Q23/Q25 are resolved for real SePay OAuth2. Landing must not expose OAuth credentials.
- Customer PWA must not allow order submission for suspended/closed tenants.
- Do not create a generic marketing-only hero that hides the real product. First viewport must make QRTable POS/SaaS offering clear and show pricing/onboarding path nearby.
- Do not add decorative gradient-orb backgrounds or nested card-heavy layouts.

## Current Code Touchpoints

Inspect:

```bash
sed -n '1,220p' apps/management-app/src/app/page.tsx
rg --files apps/customer-pwa/src | sort
rg -n "SessionGuard|socket|tenant|submitOrder|cart|checkout|order" apps/customer-pwa/src apps/bff/src libs/guards/src
rg -n "tenant\\.suspended|tenant\\.activated|tenant\\.closed|socket\\.on" apps
```

Expected learning:

- management-app root `/` is the public landing entry.
- customer-pwa currently focuses on menu/order flow and does not yet display tenant lifecycle state.
- Server-side enforcement must exist in BFF/guards/services; PWA suspended banner is UX plus defense in depth.

## Task 1: Run ui-ux-pro-max Landing Design Discovery

**Files:**

- No code edits in this task.
- Generated notes may be written to: `docs/superpowers/reports/phase-4b-landing-ui-ux-notes.md`

- [ ] **Step 1: Read ui-ux-pro-max skill**

Run:

```bash
npx openskills read ui-ux-pro-max
```

If the Codex session already loaded `/Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/.agents/skills/ui-ux-pro-max/SKILL.md`, read the local file instead:

```bash
sed -n '1,220p' .agents/skills/ui-ux-pro-max/SKILL.md
```

- [ ] **Step 2: Run the skill search command required by spec**

Run from repo root:

```bash
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "SaaS POS multi-tenant Vietnamese F&B" --design-system --persist -p "QRTable" --page "landing"
```

Expected:

```txt
The command returns design-system guidance, page structure recommendations, or writes persisted notes under the skill's output location.
```

If the script is unavailable, manually read the skill guidance and write the chosen design direction to `docs/superpowers/reports/phase-4b-landing-ui-ux-notes.md`.

- [ ] **Step 3: Lock landing design direction**

Write a concise note with:

- Product type: SaaS POS for Vietnamese F&B.
- Audience: restaurant owners/operators evaluating QR ordering and payment automation.
- Visual tone: clean operational SaaS, trustworthy payment/restaurant context, not playful illustration-first.
- Primary CTA: “Liên hệ triển khai” or “Xem gói”.
- Secondary CTA: “Đăng nhập quản trị”.
- First viewport: product name, concrete value proposition, pricing hint, and visible next section.

Do not include secret SePay credentials or internal tunnel details in this note.

## Task 2: Build Static Landing Page

**Files:**

- Modify: `apps/management-app/src/app/page.tsx`
- Create: `apps/management-app/src/features/landing/landing-api.ts`
- Create: `apps/management-app/src/features/landing/hero-section.tsx`
- Create: `apps/management-app/src/features/landing/pricing-section.tsx`
- Create: `apps/management-app/src/features/landing/workflow-section.tsx`
- Create: `apps/management-app/src/features/landing/payment-section.tsx`
- Create: `apps/management-app/src/features/landing/contact-section.tsx`

- [ ] **Step 1: Add public landing API**

`landing-api.ts`:

```typescript
import type { PricingPlan } from '@/features/saas/types';

export async function getPublicPlans(): Promise<PricingPlan[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BFF_BASE_URL;
  const response = await fetch(`${baseUrl}/api/v1/public/plans`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    return [];
  }
  return response.json();
}
```

Fallback behavior:

- If BFF is unavailable during static build/demo, render default FREE/BASIC/PREMIUM pricing from spec.
- Do not block page rendering on network failure.

- [ ] **Step 2: Build hero section**

Hero content:

- H1 must be `QRTable`.
- Supporting copy explains: multi-tenant QR ordering, POS workflow, subscription, and automated VietQR payment setup for restaurants.
- Primary action scrolls to pricing.
- Secondary action links to existing login/dashboard route.

Visual requirement:

- Use a real/product-like interface preview or generated bitmap asset if an existing screenshot asset is not available.
- Do not use SVG-only abstract illustration as the primary visual.
- Keep next section visible on desktop and mobile first viewport.

Suggested structure:

```tsx
<section className="min-h-[calc(100vh-72px)]">
  <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-[1fr_0.9fr]">
    <div>
      <h1>QRTable</h1>
      <p>...</p>
      <div>CTA buttons</div>
    </div>
    <ProductPreview />
  </div>
</section>
```

If the project lacks landing imagery, create a CSS/HTML product preview showing:

- Tenant dashboard sidebar.
- Subscription panel.
- Payment settings connected state.
- QR order card.

This preview is acceptable because it shows actual product state rather than abstract decoration.

- [ ] **Step 3: Build pricing section**

Pricing content:

- FREE, BASIC, PREMIUM from public API.
- Show price VND/month.
- Show limits:
  - Tables.
  - Staff.
  - Orders/day.
- Show features.
- CTA: “Liên hệ triển khai” for all plans in Phase 4B because self-service registration is out of scope.

Layout:

- Desktop: 3-column pricing cards.
- Mobile: stacked cards.
- Card radius <= 8px unless existing design system uses different radius.
- Most emphasized plan: BASIC.

- [ ] **Step 4: Build workflow section**

Explain flow without dense paragraphs:

1. SUPER_ADMIN onboard tenant.
2. Tenant owner logs in and chooses/renews subscription.
3. Tenant connects SePay account through OAuth2.
4. Restaurant receives customer payments directly to its bank account.

Use short labels and icons. Do not mention implementation internals such as Redis, Kafka, tunnel, or Client Secret.

- [ ] **Step 5: Build payment trust section**

Content:

- Two payment layers:
  - Restaurant subscription payment to platform.
  - Customer bill payment to restaurant.
- SePay OAuth2 Connect allows each restaurant to authorize its own SePay account.
- VietQR transfer references separate bill payment and subscription payment flows.

Do not claim official partnership unless the project has explicit permission. Use neutral copy:

```txt
Tích hợp qua luồng OAuth2/API của SePay.
```

- [ ] **Step 6: Build contact section**

Include:

- Contact email.
- “Đăng nhập quản trị” link.
- Thesis/demo note kept professional:

```txt
Phiên bản demo học thuật cho nền tảng SaaS F&B tại Việt Nam.
```

- [ ] **Step 7: Browser verify landing**

Run:

```bash
pnpm nx serve management-app
```

Use Browser plugin:

- Open `/`.
- Desktop 1440x900:
  - H1 `QRTable` visible in first viewport.
  - Pricing hint or next section top visible without scrolling past an empty hero.
  - Product preview is not blank.
- Mobile 390x844:
  - H1, supporting copy, CTA buttons fit without overlap.
  - No horizontal scroll.
  - Pricing cards stack cleanly.

## Task 3: Add Customer PWA Tenant Suspended State

**Files:**

- Create: `apps/customer-pwa/src/features/tenant/tenant-status-banner.tsx`
- Create: `apps/customer-pwa/src/features/tenant/use-tenant-status.ts`
- Modify relevant customer-pwa layout/page files that render menu/order/cart flow
- Modify if present: `apps/customer-pwa/src/features/order/submit-order.ts`
- Modify if present: `apps/customer-pwa/src/features/cart/cart-submit-button.tsx`

- [ ] **Step 1: Add tenant status hook**

Hook behavior:

- Reads tenant status from existing tenant/session bootstrap payload when available.
- Subscribes to Socket.io events:
  - `tenant.suspended`
  - `tenant.activated`
  - `tenant.closed`
- Exposes:

```typescript
export interface TenantStatusState {
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  reason: string | null;
  canOrder: boolean;
}
```

Rules:

```typescript
canOrder = status === 'ACTIVE';
```

- [ ] **Step 2: Build suspended banner**

Banner text:

- SUSPENDED:
  - Title: “Cửa hàng đang tạm khóa”
  - Body: “Nhà hàng hiện chưa nhận đơn qua QRTable. Vui lòng liên hệ nhân viên tại quầy.”
- CLOSED:
  - Title: “Cửa hàng không còn hoạt động trên QRTable”
  - Body: “Vui lòng liên hệ nhân viên tại quầy.”

Design:

- Fixed near top of ordering UI, below tenant header.
- High contrast but not alarm-heavy.
- Does not cover menu items or cart controls.

- [ ] **Step 3: Disable ordering actions**

When `canOrder=false`:

- Disable add-to-cart buttons.
- Disable submit order button.
- Disable payment method selection.
- Keep menu visible for browsing only.
- Show clear inline message in cart panel.

Do not remove the cart abruptly if the tenant becomes suspended while customer is browsing. Preserve cart state but block submit.

- [ ] **Step 4: Handle live socket updates**

Behavior:

- On `tenant.suspended`, set status suspended and show banner immediately.
- On `tenant.closed`, set status closed and show banner immediately.
- On `tenant.activated`, remove banner and re-enable controls.

If the project has a global toast system, show a toast for status changes. The banner remains the source of truth.

- [ ] **Step 5: Add frontend tests**

Test cases:

- Suspended tenant renders banner.
- Closed tenant renders banner.
- Active tenant hides banner.
- Submit button disabled when suspended.
- Socket `tenant.activated` re-enables submit.

Run:

```bash
pnpm nx test customer-pwa --runInBand --testNamePattern="tenant status|suspended"
```

Expected:

```txt
PASS customer-pwa tenant suspended-state tests.
```

## Task 4: Harden Backend Customer Session Guard for Suspended Tenants

**Files:**

- Modify: `libs/guards/src/lib/session.guard.ts`
- Create: `libs/guards/src/lib/session.guard.spec.ts` or extend existing spec
- Modify if needed: BFF/customer route controller that initializes customer sessions

- [ ] **Step 1: Add suspended tenant check**

After tenant is resolved in `SessionGuard`, check:

- `tenant.status === 'ACTIVE'` for order submission routes.
- For browse/menu routes, allow request but attach `tenant.status` so customer-pwa can render banner.

If `SessionGuard` cannot distinguish route purpose, use route metadata:

```typescript
export const ALLOW_SUSPENDED_TENANT_BROWSE = 'allowSuspendedTenantBrowse';
```

Ordering endpoints must not set this metadata.

- [ ] **Step 2: Add Redis fast path**

If `SessionGuard` has access to Redis:

```typescript
const suspended = await redis.get(`tenant:${tenant.id}:suspended`);
if (suspended === '1' && isOrderMutationRoute(request)) {
  throw new ForbiddenException('TENANT_SUSPENDED');
}
```

Fallback:

- If Redis is unavailable, rely on tenant status from SaaS lookup.
- Do not fail open for order mutation routes when both Redis and SaaS lookup fail; return `503 TENANT_STATUS_UNAVAILABLE`.

- [ ] **Step 3: Add tests**

Test cases:

- Browse route allowed for suspended tenant and attaches status.
- Order mutation blocked for suspended tenant.
- Closed tenant blocked for all customer-pwa session routes.
- Redis unavailable plus SaaS status available still works.
- Redis unavailable plus SaaS status unavailable returns service unavailable for order mutation.

Run:

```bash
pnpm nx test guards --runInBand --testNamePattern="SessionGuard"
```

Expected:

```txt
PASS suspended tenant SessionGuard tests.
```

## Task 5: Add Realtime Tenant Lifecycle Events to BFF/Socket Layer

**Files:**

- Modify Socket.io gateway file in BFF or realtime service after locating it:

```bash
rg -n "WebSocketGateway|SocketGateway|Server\\(|tenant\\.room|join" apps libs
```

- Create or modify tests for tenant lifecycle event emission.

- [ ] **Step 1: Locate existing gateway ownership**

Use:

```bash
rg -n "WebSocketGateway|@SubscribeMessage|socket\\.join|server\\.to" apps libs
```

Determine whether BFF, Order, or another service owns Socket.io emission for management/customer rooms.

- [ ] **Step 2: Add event names**

Use constants:

```typescript
export const TENANT_LIFECYCLE_SOCKET_EVENTS = {
  SUSPENDED: 'tenant.suspended',
  ACTIVATED: 'tenant.activated',
  CLOSED: 'tenant.closed',
} as const;
```

- [ ] **Step 3: Emit lifecycle events**

When SaaS Service publishes outbox/Kafka event:

- `tenant.suspended`
- `tenant.activated`
- `tenant.closed`

Realtime owner consumes or receives TCP call and emits to:

```txt
tenant:{tenantId}
tenant-slug:{tenantSlug}
```

Payload:

```typescript
{
  tenantId: string;
  tenantSlug: string;
  status: 'SUSPENDED' | 'ACTIVE' | 'CLOSED';
  reason: string | null;
  occurredAt: string;
}
```

- [ ] **Step 4: Add tests**

Test:

- Emits to tenant id room.
- Emits to tenant slug room for customer-pwa.
- Does not include sensitive subscription invoice/payment data.

Run:

```bash
pnpm nx test bff --runInBand --testNamePattern="tenant lifecycle socket"
```

Expected:

```txt
PASS tenant lifecycle socket tests.
```

## Task 6: End-to-End Demo Readiness Script

**Files:**

- Create: `tools/demo/phase-4b-demo-checklist.md`
- Create if scripts directory exists: `tools/demo/phase-4b-smoke.sh`

- [ ] **Step 1: Write manual demo checklist**

Checklist sections:

1. Platform setup:
   - `SEPAY_OAUTH_CLIENT_ID` set.
   - `SEPAY_OAUTH_CLIENT_SECRET` set.
   - `SEPAY_OAUTH_REDIRECT_URI=https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback`.
   - `PAYMENT_SECRETS_ENCRYPTION_KEY` set to 32-byte hex.
   - Platform SePay Tier 2 webhook secret set.
2. SUPER_ADMIN:
   - Create tenant.
   - Assign/verify initial plan.
   - View tenant detail.
3. Tenant owner:
   - Login.
   - View subscription.
   - Checkout subscription QR.
   - Connect SePay.
   - Select bank.
4. Customer:
   - Open QR menu.
   - Submit order.
   - Pay bill via Tier 1 VietQR.
5. Suspension:
   - Expire or manually suspend tenant.
   - Customer PWA shows suspended banner.
   - Dashboard still allows billing recovery.

- [ ] **Step 2: Add smoke script**

`tools/demo/phase-4b-smoke.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BFF_BASE_URL:?BFF_BASE_URL is required}"

curl -fsS "$BFF_BASE_URL/api/v1/public/plans" >/dev/null
curl -fsS "$BFF_BASE_URL/api/v1/public/landing-info" >/dev/null

echo "Phase 4B public endpoints are reachable."
```

Make executable:

```bash
chmod +x tools/demo/phase-4b-smoke.sh
```

- [ ] **Step 3: Run smoke script**

Run:

```bash
BFF_BASE_URL=http://localhost:3000 tools/demo/phase-4b-smoke.sh
```

Expected:

```txt
Phase 4B public endpoints are reachable.
```

## Task 7: Whole-Feature Quality Gate

- [ ] **Step 1: Run backend tests**

Run:

```bash
pnpm nx run-many -t test --projects=constants,entities,interfaces,saas,payment,bff,guards,authorizer,user-access,catalog,order --runInBand
```

Expected:

```txt
All Phase 4B backend-related tests pass.
```

- [ ] **Step 2: Run frontend tests**

Run:

```bash
pnpm nx run-many -t test --projects=management-app,customer-pwa --runInBand
```

Expected:

```txt
Frontend tests pass or the handoff lists project targets that do not exist and the replacement lint/typecheck commands used.
```

- [ ] **Step 3: Run lint/typecheck**

Run:

```bash
pnpm nx run-many -t lint --projects=saas,payment,bff,guards,authorizer,user-access,catalog,order,management-app,customer-pwa
pnpm nx run-many -t typecheck --projects=management-app,customer-pwa
```

Expected:

```txt
Lint/typecheck pass or only pre-existing unrelated issues are documented with file paths.
```

- [ ] **Step 4: Run affected build**

Run:

```bash
pnpm nx affected -t build
```

Expected:

```txt
Affected builds complete.
```

- [ ] **Step 5: Run contract scan**

Run:

```bash
rg -n "tenantId.*body|body.*tenantId|SEPAY_OAUTH_CLIENT_SECRET|PAYMENT_SECRETS_ENCRYPTION_KEY" apps libs
rg -n "QRTBL|QRSUB|tenant\\.suspended|payment_settings\\.update_own|subscription\\.checkout" apps libs docs
```

Expected:

```txt
No dashboard/customer route trusts tenantId from request body.
No frontend file contains secret env var names except documentation or server-only config.
QRTBL/QRSUB routing and permission strings appear in intended backend/docs locations.
```

- [ ] **Step 6: Browser-use full visual pass**

Use Browser plugin on local or deployed management-app:

Desktop 1440x900:

```txt
/
/admin/tenants
/admin/plans
/admin/billing
/dashboard/subscription
/dashboard/payment-settings
```

Mobile 390x844:

```txt
/
/dashboard/subscription
/dashboard/payment-settings
customer-pwa menu route for an active tenant
customer-pwa menu route for a suspended tenant
```

Verify:

- No blank screens.
- No overlapping text.
- No horizontal page scroll.
- Landing first viewport identifies QRTable and shows product/pricing context.
- QR dialog is readable.
- Suspended banner does not hide cart/menu controls.

- [ ] **Step 7: Code review checklist**

Perform review across five axes:

1. **Correctness:** Tenant lifecycle and subscription state transitions match spec.
2. **Security:** Secrets stay server-side, OAuth state validated, webhook secret enforced, tenantId not trusted from body.
3. **Maintainability:** Service ownership clear, controllers thin, no duplicated business logic in BFF/frontend.
4. **Scalability:** Redis keys have TTL where needed, outbox publishing uses batching/locking, quota counters are atomic.
5. **User experience:** Admin pages are scannable, landing is polished, PWA suspended state is clear.

Record findings in implementation handoff or fix them before marking Phase 4B complete.

## Task 8: Final Handoff Document

**Files:**

- Create: `docs/superpowers/handoffs/phase-4b-implementation-handoff.md`

- [ ] **Step 1: Write handoff summary**

Include:

- Implemented releases.
- Environment variables added.
- Migration scripts run.
- Tests run with pass/fail output.
- Browser verification routes and viewport results.
- Known limitations:
  - Self-service tenant registration wizard remains out of scope for Phase 4B.
  - SePay real webhook testing depends on publicly reachable BFF endpoint.
  - OAuth mock is only for automated tests/local isolation.

- [ ] **Step 2: Add demo credentials checklist without secrets**

Document which credentials are needed without writing values:

```txt
SEPAY_OAUTH_CLIENT_ID
SEPAY_OAUTH_CLIENT_SECRET
SEPAY_OAUTH_REDIRECT_URI
SEPAY_PLATFORM_QR_ACCOUNT
SEPAY_PLATFORM_QR_BANK
SEPAY_PLATFORM_WEBHOOK_SECRET
PAYMENT_SECRETS_ENCRYPTION_KEY
```

- [ ] **Step 3: Link plan files and spec**

Add links:

- `docs/specs/business-logic-phase-4b-spec.md`
- `docs/superpowers/audits/phase-4b-audit-report.md`
- All files under `docs/superpowers/plans/2026-05-12-phase-4b-saas/`

## Final Verification

Run:

```bash
pnpm nx run-many -t lint --projects=saas,payment,bff,guards,authorizer,user-access,catalog,order,management-app,customer-pwa
pnpm nx affected -t build
git diff --check
```

Complete the Browser plugin desktop/mobile pass listed in Task 7.

Expected:

```txt
Lint/build checks complete.
Browser pass confirms landing, management-app, and customer-pwa Phase 4B screens are usable with no layout overlap.
Implementation handoff exists and contains commands actually run.
```

Commit once for this plan file after all verification commands pass:

```bash
git add apps/management-app apps/customer-pwa libs/guards tools/demo docs/superpowers/handoffs
git commit -m "feat: complete phase 4b frontend and quality gates"
```
