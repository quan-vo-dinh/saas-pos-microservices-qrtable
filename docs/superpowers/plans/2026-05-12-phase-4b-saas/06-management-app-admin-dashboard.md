# Phase 4B Management App Admin and Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`, `superpowers:subagent-driven-development`, `frontend-patterns`, `frontend-design`, `shadcn-component-discovery`, `shadcn-component-review`, and `browser-use:browser` before executing this plan directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification.

**Goal:** Build the management-app Phase 4B operational UI for SUPER_ADMIN and tenant OWNER/MANAGER: tenant administration, plan management, subscription checkout, billing history, and SePay payment settings.

**Architecture:** management-app remains a Next.js frontend that talks only to BFF HTTP APIs. Server-side route protection and session loading follow existing app conventions. Feature state is fetched from BFF and never reconstructed from client-side role names alone. UI components use existing shadcn/ui primitives and local app layout conventions, with compact SaaS/admin ergonomics rather than marketing composition.

**Tech Stack:** Next.js App Router, React client/server components as currently used in management-app, shadcn/ui components, existing route constants, existing auth/session utilities, browser-use verification for desktop/mobile flows, TypeScript.

---

## Inputs and Constraints

- Source of truth: `docs/specs/business-logic-phase-4b-spec.md` §13.
- Execute after BFF endpoints in `04-bff-guards-webhooks-api.md` are available or mocked.
- Q16 is landing static; landing implementation belongs in `07-landing-customer-pwa-quality-gates.md`.
- Q23 is real SePay OAuth2 Connect. `/dashboard/payment-settings/sepay-callback` must be implemented as a real callback page using the Vercel redirect URI.
- Q24 includes manual fallback; SUPER_ADMIN billing UI must include manual confirm for pending invoices.
- Do not build nested card layouts. Use full-width page sections and simple cards only for repeated records, modal bodies, and table row detail panels.
- Do not hardcode permissions in UI as the only protection. UI hides unavailable actions for ergonomics, BFF enforces authorization.

## Current Code Touchpoints

Inspect these files before editing:

```bash
rg --files apps/management-app/src/app | sort
sed -n '1,220p' apps/management-app/src/routes.ts
sed -n '1,260p' apps/management-app/src/components/layout/sidebar-data.ts
rg -n "fetch\\(|axios|ky|apiClient|useQuery|SWR|tanstack" apps/management-app/src
rg -n "components/ui/(table|dialog|sheet|tabs|badge|button)" apps/management-app/src
```

Expected learning:

- Placeholder pages already exist for `/admin/tenants`, `/admin/plans`, and `/dashboard/subscription`.
- `routes.ts` already contains several Phase 4B route constants.
- Sidebar role/permission filtering exists and must be extended, not replaced.

## Task 1: Add Frontend API Client Types for Phase 4B

**Files:**

- Create: `apps/management-app/src/features/saas/types.ts`
- Create: `apps/management-app/src/features/saas/api.ts`
- Create: `apps/management-app/src/features/saas/formatters.ts`
- Create: `apps/management-app/src/features/saas/permissions.ts`

- [ ] **Step 1: Define UI types**

Create `types.ts`:

```typescript
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELED';
export type InvoiceStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELED';
export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type PaymentConnectionStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'TOKEN_EXPIRED' | 'REVOKED' | 'ERROR';

export interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceVnd: number;
  billingPeriod: BillingPeriod;
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  type: string;
  ownerEmail: string | null;
  planCode: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface TenantDetail extends TenantListItem {
  address: string | null;
  ownerId: string | null;
  defaultCurrency: string;
  defaultLocale: string;
  operatingModes: string[];
  suspendedAt: string | null;
  suspendedReason: string | null;
  closedAt: string | null;
  closedReason: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  tenantId: string;
  planCodeSnapshot: string;
  amountVnd: number;
  billingPeriod: BillingPeriod;
  billingReference: string;
  status: InvoiceStatus;
  qrUrl: string | null;
  qrExpiresAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentSettings {
  cashEnabled: boolean;
  vietqrEnabled: boolean;
  connectionStatus: PaymentConnectionStatus;
  vietqrBankName: string | null;
  vietqrBankShortName: string | null;
  vietqrAccountNumber: string | null;
  vietqrAccountHolder: string | null;
  lastError: string | null;
}
```

- [ ] **Step 2: Implement API functions**

`api.ts` must wrap existing fetch/client utility. If there is no shared utility, create a small internal wrapper:

```typescript
async function bffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BFF_BASE_URL}/api/v1/${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}
```

Prefer the existing project wrapper when present.

API functions:

```typescript
export const saasApi = {
  listAdminTenants: (query: AdminTenantQuery) =>
    bffFetch<Paginated<TenantListItem>>(`admin/tenants?${toSearchParams(query)}`),
  onboardTenant: (payload: OnboardTenantPayload) => bffFetch<TenantDetail>('admin/tenants/onboard', post(payload)),
  getTenant: (id: string) => bffFetch<TenantDetail>(`admin/tenants/${id}`),
  updateTenantStatus: (id: string, payload: UpdateTenantStatusPayload) =>
    bffFetch<TenantDetail>(`admin/tenants/${id}/status`, patch(payload)),
  listPlansAdmin: () => bffFetch<PricingPlan[]>('admin/plans'),
  createPlan: (payload: CreatePlanPayload) => bffFetch<PricingPlan>('admin/plans', post(payload)),
  updatePlan: (id: string, payload: UpdatePlanPayload) => bffFetch<PricingPlan>(`admin/plans/${id}`, patch(payload)),
  deletePlan: (id: string) => bffFetch<void>(`admin/plans/${id}`, { method: 'DELETE' }),
  listAdminInvoices: (query: AdminInvoiceQuery) =>
    bffFetch<Paginated<SubscriptionInvoice>>(`admin/billing/invoices?${toSearchParams(query)}`),
  manualConfirmInvoice: (id: string, payload: ManualConfirmPayload) =>
    bffFetch<SubscriptionInvoice>(`admin/billing/invoices/${id}/manual-confirm`, post(payload)),
  getDashboardSubscription: () => bffFetch<DashboardSubscription>('dashboard/subscription'),
  checkoutSubscription: (payload: CheckoutSubscriptionPayload) =>
    bffFetch<SubscriptionInvoice>('dashboard/subscription/checkout', post(payload)),
  getDashboardPaymentSettings: () => bffFetch<PaymentSettings>('dashboard/payment-settings'),
  getSepayAuthorizeUrl: () => bffFetch<{ authorizeUrl: string }>('dashboard/payment-settings/sepay-authorize-url'),
  handleSepayCallback: (query: { code: string; state: string }) =>
    bffFetch<SepayCallbackResult>(`dashboard/payment-settings/sepay-callback?${toSearchParams(query)}`),
  selectSepayBank: (payload: SelectSepayBankPayload) =>
    bffFetch<PaymentSettings>('dashboard/payment-settings/select-bank', post(payload)),
  disconnectSepay: () => bffFetch<PaymentSettings>('dashboard/payment-settings/disconnect', post({})),
};
```

- [ ] **Step 3: Add formatters**

`formatters.ts`:

```typescript
export function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value: string | null): string {
  if (!value) return 'Không giới hạn';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

export function formatQuota(value: number): string {
  return value === -1 ? 'Không giới hạn' : value.toLocaleString('vi-VN');
}
```

- [ ] **Step 4: Add permission helpers**

`permissions.ts`:

```typescript
export const phase4bPermissions = {
  tenantListAll: 'tenant.list_all',
  tenantOnboard: 'tenant.onboard',
  tenantSuspend: 'tenant.suspend',
  tenantActivate: 'tenant.activate',
  tenantClose: 'tenant.close',
  planRead: 'plan.read',
  planCreate: 'plan.create',
  planUpdate: 'plan.update',
  planDelete: 'plan.delete',
  subscriptionReadOwn: 'subscription.read_own',
  subscriptionCheckout: 'subscription.checkout',
  paymentSettingsReadOwn: 'payment_settings.read_own',
  paymentSettingsUpdateOwn: 'payment_settings.update_own',
} as const;

export function hasPermission(permissions: string[] | undefined, permission: string): boolean {
  return Boolean(permissions?.includes(permission));
}
```

- [ ] **Step 5: Type-check frontend foundation**

Run:

```bash
pnpm nx typecheck management-app
```

Expected:

```txt
Typecheck passes or the project reports no configured typecheck target; if no target exists, run pnpm nx lint management-app.
```

## Task 2: Implement SUPER_ADMIN Tenant Directory

**Files:**

- Modify: `apps/management-app/src/app/(admin)/admin/tenants/page.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-filters.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenants-table.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/onboard-tenant-dialog.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-status-badge.tsx`

- [ ] **Step 1: Build tenant filters**

Controls:

- Search input.
- Status segmented control: `All`, `Active`, `Suspended`, `Closed`.
- Plan select: `All`, `FREE`, `BASIC`, `PREMIUM`, plus plans returned by API.
- Page size select.

Use URL query params for filter state:

```txt
/admin/tenants?search=pho&status=ACTIVE&planCode=BASIC&page=1&limit=20
```

- [ ] **Step 2: Build tenants table**

Columns:

- Tenant name + slug.
- Status badge.
- Owner email.
- Plan.
- Subscription expiry.
- Created date.
- Row actions: View detail, Suspend/Activate according to current status.

Table behavior:

- Empty state: “Chưa có tenant phù hợp.”
- Loading state: skeleton rows with stable height.
- Error state: inline alert with retry button.
- Pagination: previous/next buttons and current page indicator.

- [ ] **Step 3: Build onboard tenant dialog**

Fields:

- Restaurant name.
- Restaurant type.
- Address.
- Initial plan.
- Owner first name.
- Owner last name.
- Owner email.
- Operating modes multi-select with default `INSTANT_ORDER` and `DIGITAL_MENU`.

Submit behavior:

- Disable submit while request is in flight.
- On success, close dialog, refresh table, show created tenant in list.
- On duplicate owner email, show field-level message.
- Do not show temporary password if backend chooses password reset flow.

- [ ] **Step 4: Implement page composition**

Page layout:

- Header row: title “Tenants”, compact summary counters, “Onboard tenant” button.
- Filters row below header.
- Full-width table below filters.

Avoid a marketing hero. This is an operational admin page.

- [ ] **Step 5: Browser verify tenant directory**

Start app and open in Browser plugin:

```bash
pnpm nx serve management-app
```

Use `browser-use:browser` to verify:

- Desktop: `/admin/tenants` renders table without horizontal overflow at 1440x900.
- Mobile width: filters stack cleanly at 390x844.
- Onboard dialog fields fit; submit button text does not overflow.
- Keyboard tab order reaches filters, table actions, dialog controls.

## Task 3: Implement Tenant Detail Page

**Files:**

- Create: `apps/management-app/src/app/(admin)/admin/tenants/[id]/page.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-detail-header.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-overview-tab.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-subscriptions-tab.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-usage-tab.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-audit-tab.tsx`
- Create: `apps/management-app/src/features/saas/admin-tenants/tenant-status-actions.tsx`

- [ ] **Step 1: Build detail header**

Header content:

- Tenant name and slug.
- Status badge.
- Current plan badge.
- Owner email.
- Action buttons:
  - Suspend when `ACTIVE`.
  - Activate when `SUSPENDED`.
  - Close when not `CLOSED`.

Close action must use a destructive confirmation dialog with:

- Tenant name typed into confirm input.
- Reason textarea.
- Submit disabled until typed name matches.

- [ ] **Step 2: Build tabs**

Tabs:

- Overview: tenant metadata and owner info.
- Subscription History: list subscriptions and assign plan action.
- Usage: tables/staff/orders quota progress.
- Audit: lifecycle events.
- Billing: link to filtered `/admin/billing?tenantId={id}`.

Use shadcn `Tabs`, `Badge`, `Table`, `Dialog`, and `Progress`.

- [ ] **Step 3: Implement assign plan action**

Fields:

- Plan select.
- Billing period.
- Effective date read-only: now.

Warnings:

- If assigning plan while current plan is active, show “Gói hiện tại sẽ chuyển sang SUPERSEDED.”
- If tenant is suspended, show “Kích hoạt gói mới sẽ mở lại tenant.”

Submit calls:

```txt
POST /admin/tenants/:id/subscriptions
```

- [ ] **Step 4: Add detail page loading/error states**

Required states:

- Loading skeleton for header and tabs.
- Not found state with link back to tenant list.
- Error state with retry.

- [ ] **Step 5: Browser verify tenant detail**

Use Browser plugin:

- `/admin/tenants/{id}` tabs switch without layout jumps.
- Destructive close dialog is visually distinct and requires typed tenant name.
- Usage progress bars are readable in light and dark mode if dark mode exists.

## Task 4: Implement Plan Management

**Files:**

- Modify: `apps/management-app/src/app/(admin)/admin/plans/page.tsx`
- Create: `apps/management-app/src/features/saas/admin-plans/plans-table.tsx`
- Create: `apps/management-app/src/features/saas/admin-plans/plan-form-dialog.tsx`
- Create: `apps/management-app/src/features/saas/admin-plans/plan-feature-picker.tsx`

- [ ] **Step 1: Build plans table**

Columns:

- Display order.
- Code.
- Name.
- Price.
- Billing period.
- Tables quota.
- Staff quota.
- Orders/day quota.
- Active state.
- Actions: Edit, Deactivate.

Do not allow hard-delete for plans with historical subscriptions. UI label should be “Deactivate” unless backend confirms hard delete is allowed.

- [ ] **Step 2: Build plan form**

Fields:

- Code.
- Name.
- Description.
- Price VND.
- Billing period.
- maxTables.
- maxStaff.
- maxOrdersPerDay.
- Feature flags.
- Active toggle.
- Display order.

Validation:

- Code uppercase, 2-40 chars.
- Price >= 0.
- Quotas accept `-1` for unlimited.
- Feature flags from curated list:
  - `basic_pos`
  - `analytics_basic`
  - `analytics_advanced`
  - `priority_support`

- [ ] **Step 3: Add visual quota summary**

In the form, show a compact preview:

```txt
BASIC · 299.000 ₫ / tháng · 50 bàn · 20 nhân sự · 1.000 đơn/ngày
```

- [ ] **Step 4: Browser verify plan page**

Use Browser plugin:

- `/admin/plans` renders without nested cards.
- Plan dialog fits at 390px mobile width.
- Long feature labels wrap without overflowing.

## Task 5: Implement Admin Billing Page

**Files:**

- Create: `apps/management-app/src/app/(admin)/admin/billing/page.tsx`
- Create: `apps/management-app/src/features/saas/admin-billing/invoices-table.tsx`
- Create: `apps/management-app/src/features/saas/admin-billing/manual-confirm-dialog.tsx`
- Create: `apps/management-app/src/features/saas/admin-billing/invoice-status-badge.tsx`

- [ ] **Step 1: Build invoice filters**

Filters:

- Status.
- Tenant search/tenantId.
- Date from/to.
- Plan code.

- [ ] **Step 2: Build invoice table**

Columns:

- Billing reference.
- Tenant.
- Plan.
- Amount.
- Status.
- QR expires at.
- Paid at.
- Created at.
- Actions.

Pending invoice actions:

- View QR.
- Manual confirm.
- Cancel if API allows admin cancel.

- [ ] **Step 3: Build manual confirm dialog**

Dialog content:

- Invoice reference.
- Tenant.
- Amount.
- Warning that this bypasses automatic SePay matching.
- Note textarea.
- Confirm button requires checkbox “Tôi đã đối soát giao dịch ngân hàng.”

API:

```txt
POST /admin/billing/invoices/:id/manual-confirm
```

- [ ] **Step 4: Browser verify admin billing**

Use Browser plugin:

- Pending invoice manual confirm flow is discoverable but clearly high-trust/admin-only.
- Table remains scannable with 20 rows.
- Amount/date columns align consistently.

## Task 6: Implement Dashboard Subscription and Billing UI

**Files:**

- Modify: `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx`
- Create: `apps/management-app/src/app/(dashboard)/dashboard/billing/[id]/page.tsx`
- Create: `apps/management-app/src/features/saas/subscription/current-plan-panel.tsx`
- Create: `apps/management-app/src/features/saas/subscription/plan-compare-table.tsx`
- Create: `apps/management-app/src/features/saas/subscription/checkout-qr-dialog.tsx`
- Create: `apps/management-app/src/features/saas/subscription/invoice-status-poller.tsx`

- [ ] **Step 1: Build current subscription panel**

Display:

- Current plan.
- Status.
- Expires at.
- Quota usage:
  - Tables used / max.
  - Staff used / max.
  - Orders today / max.
- Suspended banner when tenant status is suspended with CTA to pay invoice or choose plan.

- [ ] **Step 2: Build plan comparison**

Use a dense comparison table, not a marketing card grid:

Columns:

- Plan.
- Price.
- Tables.
- Staff.
- Orders/day.
- Features.
- Action.

Action:

- Current plan: disabled “Đang dùng”.
- Upgrade/renew: “Thanh toán”.
- Free plan: “Liên hệ admin” if downgrade is not self-service in Phase 4B.

- [ ] **Step 3: Implement checkout QR dialog**

Flow:

1. Owner clicks “Thanh toán”.
2. UI calls `POST /dashboard/subscription/checkout`.
3. Dialog shows QR image/url, amount, reference `QRSUB*`, expiry countdown.
4. Poll `GET /dashboard/billing/invoices/:id/status` every 5 seconds while pending.
5. On `PAID`, close dialog and refresh subscription.
6. On `EXPIRED`, show expired state and button to create a new invoice.

Do not require page refresh for paid state.

- [ ] **Step 4: Build invoice detail page**

`/dashboard/billing/[id]` displays:

- Invoice reference.
- Status.
- Plan and period.
- Amount.
- QR if pending.
- Paid details if paid.
- Cancel pending invoice action.

- [ ] **Step 5: Browser verify dashboard subscription**

Use Browser plugin:

- QR dialog remains usable at mobile width.
- Countdown text does not overlap QR image.
- Polling stops after paid/expired.
- Suspended tenant banner is visible above normal content.

## Task 7: Implement Dashboard Payment Settings and SePay Callback

**Files:**

- Create: `apps/management-app/src/app/(dashboard)/dashboard/payment-settings/page.tsx`
- Create: `apps/management-app/src/app/(dashboard)/dashboard/payment-settings/sepay-callback/page.tsx`
- Create: `apps/management-app/src/features/saas/payment-settings/payment-settings-summary.tsx`
- Create: `apps/management-app/src/features/saas/payment-settings/sepay-connect-button.tsx`
- Create: `apps/management-app/src/features/saas/payment-settings/sepay-bank-picker.tsx`
- Create: `apps/management-app/src/features/saas/payment-settings/disconnect-sepay-dialog.tsx`

- [ ] **Step 1: Build payment settings summary page**

Display:

- Cash enabled.
- VietQR enabled.
- Connection status.
- Selected bank.
- Account number masked except last 4 digits.
- Account holder.
- Last error when status is `ERROR`.

Actions:

- Connect SePay when not connected.
- Change bank when connected.
- Disconnect with confirmation.

- [ ] **Step 2: Implement Connect SePay button**

Click behavior:

```typescript
const { authorizeUrl } = await saasApi.getSepayAuthorizeUrl();
window.location.href = authorizeUrl;
```

Do not embed Client ID or Client Secret in frontend code.

- [ ] **Step 3: Implement callback page**

Page logic:

1. Read `code` and `state` from URL search params.
2. If missing, show error state and link back to `/dashboard/payment-settings`.
3. Call `GET /dashboard/payment-settings/sepay-callback?code=...&state=...`.
4. If backend returns bank accounts, show bank picker.
5. If backend returns already selected bank, show success state and link back.

Callback page must match redirect URI path:

```txt
https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback
```

- [ ] **Step 4: Implement bank picker**

Bank account card fields:

- Bank short name.
- Bank name.
- Masked account number.
- Account holder.

Submit:

```txt
POST /dashboard/payment-settings/select-bank
```

On success:

- Show connection success.
- Navigate back to `/dashboard/payment-settings`.

- [ ] **Step 5: Implement disconnect dialog**

Dialog requires typed confirmation:

```txt
NGAT KET NOI
```

On submit:

```txt
POST /dashboard/payment-settings/disconnect
```

UI after success:

- `connectionStatus = NOT_CONNECTED`.
- VietQR disabled.
- Selected bank removed from display.

- [ ] **Step 6: Browser verify OAuth UI**

Use Browser plugin:

- `/dashboard/payment-settings` shows no secrets.
- Connect button navigates to the authorize URL returned by mocked BFF.
- Callback page handles missing query params.
- Callback page handles bank picker result.
- Disconnect dialog does not allow accidental disconnect.

## Task 8: Update Sidebar and Route Constants

**Files:**

- Modify: `apps/management-app/src/routes.ts`
- Modify: `apps/management-app/src/components/layout/sidebar-data.ts`
- Modify if present: `apps/management-app/src/lib/role-routing.ts`

- [ ] **Step 1: Add routes**

Add:

```typescript
export const ROUTES = {
  // existing entries
  ADMIN_BILLING: '/admin/billing',
  DASHBOARD_BILLING_INVOICE: (id: string) => `/dashboard/billing/${id}`,
  DASHBOARD_PAYMENT_SETTINGS: '/dashboard/payment-settings',
  DASHBOARD_SEPAY_CALLBACK: '/dashboard/payment-settings/sepay-callback',
};
```

Adapt to the existing `ROUTES` style.

- [ ] **Step 2: Add sidebar entries**

SUPER_ADMIN:

- Tenants → `/admin/tenants` → `tenant.list_all`
- Plans → `/admin/plans` → `plan.read`
- Billing → `/admin/billing` → `subscription.list_any`

OWNER/MANAGER dashboard:

- Subscription → `/dashboard/subscription` → `subscription.read_own`
- Payment settings → `/dashboard/payment-settings` → `payment_settings.read_own`

Use existing icon library; prefer lucide icons if the app already uses them:

- `Building2`
- `Package`
- `Receipt`
- `CreditCard`
- `Landmark`

- [ ] **Step 3: Verify role filtering**

Run a unit test or static check against sidebar config:

```bash
rg -n "tenant.list_all|plan.read|subscription.read_own|payment_settings.read_own" apps/management-app/src
```

Expected:

```txt
All new navigation entries include permission gates.
```

## Task 9: Frontend Quality Review and Browser Pass

- [ ] **Step 1: Run automated checks**

Run:

```bash
pnpm nx lint management-app
pnpm nx typecheck management-app
git diff --check -- apps/management-app
```

Expected:

```txt
Lint/typecheck pass or only known unrelated issues are listed in the handoff.
No whitespace errors.
```

- [ ] **Step 2: Browser-use desktop pass**

With local dev server running, use Browser plugin to visit:

```txt
/admin/tenants
/admin/tenants/{id}
/admin/plans
/admin/billing
/dashboard/subscription
/dashboard/payment-settings
/dashboard/payment-settings/sepay-callback?code=test&state=test
```

Verify:

- No blank pages.
- No overlapping text.
- Tables remain horizontally manageable.
- Dialogs are keyboard reachable.
- Buttons with destructive actions are visually differentiated.

- [ ] **Step 3: Browser-use mobile pass**

Set viewport to 390x844 and verify:

```txt
/admin/tenants
/dashboard/subscription
/dashboard/payment-settings
```

Verify:

- Filter controls wrap cleanly.
- QR dialog remains visible without overflow.
- Payment settings account fields do not reveal full account number.

- [ ] **Step 4: Design review against shadcn patterns**

Review:

- Components use existing shadcn tokens/classes.
- Cards are not nested inside cards.
- Buttons use icons for repeated tool actions.
- Page headers are compact and operational.
- Tables have stable row heights.
- Long Vietnamese strings wrap without overflow.

## Final Verification

Run:

```bash
pnpm nx lint management-app
pnpm nx typecheck management-app
git diff --check -- apps/management-app
```

Then perform Browser plugin verification for the listed desktop/mobile routes.

Expected:

```txt
management-app lint/typecheck pass.
All Phase 4B admin/dashboard pages render in desktop and mobile browser checks without layout overlap.
```

Commit once for this plan file after all verification commands pass:

```bash
git add apps/management-app
git commit -m "feat: add phase 4b management app workflows"
```
