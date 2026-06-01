# Phase 4D.1 Dashboard Entitlements & UI Polish Addendum

> **Phase:** Phase 4D.1 - Dashboard Plan Entitlements & UI Polish
> **Date:** 2026-06-01
> **Status:** Planned addendum after Phase 4D base reporting implementation
> **Purpose:** Extend the completed Phase 4D reporting dashboard with package/plan feature gating and a more polished product-grade dashboard UI. This addendum does not replace the Phase 4D base spec or implementation plan.

## 0. Context

Phase 4D base reporting has implemented the core report surface:

- Tenant dashboard: `/dashboard`
- Super Admin analytics: `/admin/analytics`
- BFF report routes under `/dashboard/reports/*` and `/admin/analytics/*`
- Payment, Order, Catalog, and SaaS report ownership
- shadcn chart/cards/table components in `apps/management-app/src/features/reports/`

This addendum handles two missing product layers:

1. **Plan/package entitlements:** Whether a tenant's current pricing plan unlocks specific dashboard/reporting capabilities.
2. **Dashboard UI polish:** Upgrading the current functional dashboard into a more complete SaaS dashboard experience inspired by shadcn dashboard blocks and chart patterns.

## 1. Record Of Decision

| Area                   | Decision                                       | Reason                                                                                                          |
| ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Dashboard shell        | Always visible to Owner/Manager                | Owners should see plan/quota/upgrade context even when analytics is locked.                                     |
| Basic reports          | Require `analytics_basic`                      | Creates a clear upgrade path from `FREE` to `BASIC`.                                                            |
| Advanced reports       | Require `analytics_advanced`                   | Keeps high-value reconciliation/product insights in `PREMIUM`.                                                  |
| Super Admin analytics  | Not plan-gated                                 | Platform analytics is an operator feature, not a tenant package feature.                                        |
| Tenant drilldown       | Not blocked by tenant plan for Super Admin     | Super Admin support/audit access must remain operational. Show the tenant plan context instead.                 |
| Feature enforcement    | BFF guard/decorator first                      | BFF is already the HTTP policy edge; source report services stay focused on data ownership.                     |
| Source report services | No entitlement logic                           | Payment/Order/Catalog/SaaS report services should not know product package rules.                               |
| UI locked states       | Show locked cards instead of hiding everything | Better UX, clearer upgrade motivation, less confusing than blank dashboards.                                    |
| Third-party logos      | Use local approved assets or lucide fallback   | Avoid hotlinking and licensing ambiguity.                                                                       |
| shadcn direction       | Compose existing dashboard primitives          | Use shadcn `Card`, `CardAction`, `Badge`, `Chart`, `Table`, `Tabs`, `Select`, `Skeleton`, and `Alert` patterns. |

## 2. Current Code Observations

Confirmed by current code and docs:

- `PricingPlan` stores `maxTables`, `maxStaff`, `maxOrdersPerDay`, and `features`.
- Existing default Phase 4B package shape:

| Plan      | Price              | Quotas                                        | Features                                                                 |
| --------- | ------------------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| `FREE`    | `0`                | `10` tables, `5` staff, `100` orders/day      | `basic_pos`                                                              |
| `BASIC`   | `299000` VND/month | `50` tables, `20` staff, `1000` orders/day    | `basic_pos`, `analytics_basic`                                           |
| `PREMIUM` | `999000` VND/month | `500` tables, `100` staff, `10000` orders/day | `basic_pos`, `analytics_basic`, `analytics_advanced`, `priority_support` |

- `TenantPlanGuard` currently checks only subscription `ACTIVE` state.
- Plan feature labels exist in `planFeatureVi()`.
- Plan feature picker currently stores local feature code list in Management App.
- Subscription dashboard already displays quota usage bars for tables, staff, and today's orders.
- Phase 4D report UI already uses shadcn chart/card/table pieces, but remains visually sparse.

## 3. Canonical Feature Model

### Required Feature Codes

Use these feature codes as the canonical dashboard entitlement set:

| Code                 | Label              | Meaning                                                                |
| -------------------- | ------------------ | ---------------------------------------------------------------------- |
| `basic_pos`          | POS core           | Core QR/POS operations.                                                |
| `analytics_basic`    | Basic reporting    | Revenue summary, order/table summary, basic revenue trend.             |
| `analytics_advanced` | Advanced analytics | Top items, payment method breakdown, reconciliation, extended filters. |
| `priority_support`   | Priority support   | Support differentiator for Premium.                                    |

Additional codes already labeled by the project can remain future-facing:

- `kds`
- `multi_branch`
- `vietqr`
- `staff_roles`

Do not gate existing core demo flows with those future-facing codes in Phase 4D.1 unless the product owner explicitly confirms a package split for them.

### Canonicalization Rule

Feature code definitions must not live only inside a React component.

Recommended implementation:

- Backend source of truth: `libs/constants/src/lib/saas.constants.ts`
  - add `PLAN_FEATURE_CODES`
  - add `PlanFeatureCode` type
  - add `PLAN_FEATURE_GROUPS` or helper functions if needed
- Frontend wire mirror: `libs/shared/constants/src/lib/saas-wire-types.ts`
  - add `SAAS_PLAN_FEATURE`
  - add `SaasPlanFeature` type
  - update `saas-wire-types.spec.ts` to match backend values
- Labels: `libs/shared/constants/src/lib/vi-domain-labels.ts`
  - keep using `planFeatureVi(code)`

Management App components should import the shared feature code list instead of defining local feature arrays.

## 4. Entitlement Matrix

| Dashboard Capability          | Required User Permission                              | Required Tenant Feature | FREE    | BASIC             | PREMIUM |
| ----------------------------- | ----------------------------------------------------- | ----------------------- | ------- | ----------------- | ------- |
| Dashboard shell               | `report.read_own`                                     | none                    | visible | visible           | visible |
| Current plan and quota widget | `subscription.read_own` or dashboard subscription API | none                    | visible | visible           | visible |
| Table/staff/order quota bars  | subscription dashboard data                           | none                    | visible | visible           | visible |
| Revenue KPI cards             | `report.read_own`                                     | `analytics_basic`       | locked  | visible           | visible |
| Basic revenue trend chart     | `report.read_own`                                     | `analytics_basic`       | locked  | visible           | visible |
| Order/bill status summary     | `report.read_own`                                     | `analytics_basic`       | locked  | visible           | visible |
| Catalog/table summary         | `report.read_own`                                     | `analytics_basic`       | locked  | visible           | visible |
| Top selling items             | `report.read_own`                                     | `analytics_advanced`    | locked  | locked            | visible |
| Payment method breakdown      | `report.read_own`                                     | `analytics_advanced`    | locked  | locked            | visible |
| Recent payment reconciliation | `report.read_own`                                     | `analytics_advanced`    | locked  | locked            | visible |
| Extended range up to 90 days  | `report.read_own`                                     | `analytics_advanced`    | locked  | limited           | visible |
| Week/month grain              | `report.read_own`                                     | `analytics_advanced`    | locked  | locked or limited | visible |

Recommended default:

- `BASIC` gets last-7-days daily-grain basic analytics.
- `PREMIUM` gets advanced widgets and full Phase 4D range/grain behavior.

## 5. Backend Entitlement Behavior

### BFF Policy Edge

Tenant report routes should check:

1. User authorization:
   - `report.read_own`
2. Tenant/subscription state:
   - current subscription exists and is `ACTIVE`
3. Feature entitlement:
   - route/widget capability feature code exists in current plan `features`

Recommended route gating:

| Route                            | Required Feature                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /dashboard/reports/revenue` | `analytics_basic`                                                                                         |
| `GET /dashboard/reports/orders`  | `analytics_basic` for summary, `analytics_advanced` for top-items if route supports field filtering later |
| `GET /dashboard/reports/tables`  | `analytics_basic`                                                                                         |

If the existing API response does not split basic and advanced fields, BFF can initially gate the entire route by `analytics_basic` and let frontend hide advanced widgets. A later route split can expose `/dashboard/reports/orders/top-items` behind `analytics_advanced`.

### Error Contract

When a tenant lacks a required feature, return a safe `403` error:

```ts
type MissingPlanFeatureDetails = {
  requiredFeature: 'analytics_basic' | 'analytics_advanced';
  currentPlanCode: string | null;
  upgradeUrl: '/dashboard/subscription';
};
```

The response must not leak internal subscription cache details or stack traces.

### Guard/Decorator Shape

Recommended additions:

- `@RequiresPlanFeature(featureCode)` decorator in `libs/decorators` or existing guard/decorator package.
- `PlanFeatureGuard` in `libs/guards` or extend `TenantPlanGuard` if the local style prefers one guard.
- Guard should read current subscription feature list from trusted request context or a shared BFF subscription resolver.

Do not call Payment/Order/Catalog/SaaS report services to decide entitlements. Entitlement is a product/package policy, not a data aggregation concern.

### Subscription Context Source

Preferred order:

1. Use existing subscription cache key `subscription:{tenantId}` if BFF already has a safe way to hydrate it into request context.
2. Otherwise, BFF calls SaaS TCP `SUBSCRIPTION.GET_CURRENT` through a small local resolver with short caching.
3. Keep fallback behavior explicit: if entitlement cannot be resolved, fail closed for tenant reporting and show upgrade/contact support message.

## 6. Frontend Entitlement Behavior

### Dashboard Shell

`/dashboard` should always render:

- page header with restaurant/tenant context when available.
- current plan badge.
- quota/usage compact strip: tables, staff, orders today.
- upgrade CTA to `/dashboard/subscription`.
- locked analytics widgets when tenant lacks required feature.

### Basic Analytics State

If tenant has `analytics_basic`:

- call tenant revenue/order/table report hooks.
- render KPI cards.
- render basic revenue trend.
- render order/bill status summary.
- render table/catalog summary.

If tenant lacks `analytics_basic`:

- do not call report APIs that will be blocked.
- render `LockedAnalyticsCard` explaining Basic package unlock.
- still show plan/quota widgets and upgrade CTA.

### Advanced Analytics State

If tenant has `analytics_advanced`:

- render payment method breakdown.
- render top selling items.
- render recent payment reconciliation if the base API exposes it.
- allow extended filters.

If tenant lacks `analytics_advanced`:

- do not call extra advanced API hooks when they are split.
- render locked Premium cards in the same layout area.
- avoid making the dashboard feel broken or empty.

### Super Admin UI

`/admin/analytics`:

- remains available with `report.read_any`.
- shows platform analytics without tenant package gating.
- tenant drilldown should display selected tenant plan code and features.
- tenant drilldown should not block support/audit access by tenant package, but it should visually indicate when the tenant itself would not have access.

## 7. UI Polish Direction

### Design Intent

Move from "functional report page" to "operator cockpit":

- dense but readable.
- icons make scan paths faster.
- package/lock states are visually explicit.
- plan context is part of the dashboard, not hidden on another page.
- charts look intentional and consistent with shadcn dashboard blocks.

### shadcn Patterns To Reuse

Use official/component-registry patterns before custom UI:

- `@shadcn/dashboard-01` as layout inspiration.
- `@shadcn/chart-area-interactive` or area chart patterns for revenue trend.
- `@shadcn/chart-pie-donut` or donut patterns for payment method breakdown.
- shadcn `CardAction` with `Badge` and lucide trend icons for KPI cards.
- shadcn data table pattern for top items/recent payments when sorting/filtering is useful.
- shadcn `Empty` component if installed; otherwise keep the current local `ReportEmptyState` style but make it visually aligned.

### Component Inventory

Recommended new/changed report components:

- `dashboard-plan-overview-card.tsx`
  - current plan, status, quota usage, upgrade CTA.
- `dashboard-feature-lock-card.tsx`
  - locked widget state with required plan and feature label.
- `dashboard-integration-strip.tsx`
  - SePay/VietQR, subscription, payment settings, Keycloak identity status if data is already available.
- `insight-metric-card.tsx`
  - replaces or extends `ReportMetricCard`; includes icon, `CardAction`, trend badge, and footer note.
- `revenue-area-chart.tsx`
  - polished revenue chart with area/gradient or interactive range pattern using semantic chart colors.
- `payment-method-donut-chart.tsx`
  - donut chart with center label and legend.
- `advanced-insights-section.tsx`
  - top items, payment method, recent reconciliation, and locked Premium placeholders.
- `report-feature-gate.tsx`
  - frontend wrapper that decides render real content vs locked state.

Keep components small and composable. Do not turn `tenant-dashboard-client.tsx` into a large all-in-one file.

### Icon And Logo Policy

Use `lucide-react` for first-party dashboard semantics:

- revenue: `Wallet`, `Banknote`, `TrendingUp`
- orders/bills: `ReceiptText`, `ClipboardList`
- menu/items: `Utensils`, `Soup`
- tables: `Table2`
- staff/quota: `Users`
- locked plans: `LockKeyhole`, `Crown`, `Sparkles`
- payments: `QrCode`, `CreditCard`
- platform: `Building2`, `ChartNoAxesCombined`

Third-party logo policy:

- Use local SVG/PNG assets only.
- Do not hotlink remote logo images.
- If no approved asset exists, use a lucide fallback with clear text label.
- For SePay/Keycloak/Grafana/Prometheus logos, add assets under a clear local path only after verifying usage rights or using official brand resources.

## 8. Data And API Requirements

Frontend needs current subscription/plan features on `/dashboard`.

Preferred data source:

- reuse `saasApi.getDashboardSubscription()` or the existing `/dashboard/subscription` data.

Required frontend derived state:

```ts
type DashboardEntitlements = {
  currentPlanCode: string | null;
  features: string[];
  hasBasicAnalytics: boolean;
  hasAdvancedAnalytics: boolean;
  canUseExtendedRange: boolean;
  upgradeUrl: '/dashboard/subscription';
};
```

Backend should eventually enforce the same policy so UI is not the only protection.

## 9. Testing Requirements

Backend:

- feature constants are canonical and tested against frontend mirror.
- plan feature guard allows `analytics_basic` when present.
- plan feature guard denies missing feature with safe details.
- dashboard report routes require both RBAC and required plan feature.
- Super Admin analytics routes are not tenant-plan gated.

Frontend:

- FREE tenant sees dashboard shell, plan/quota, and locked analytics cards.
- BASIC tenant sees basic metrics/charts and locked advanced insights.
- PREMIUM tenant sees full dashboard.
- Report API hooks are not called for locked widgets.
- Super Admin analytics still renders platform view.
- No raw feature codes appear in UI; `planFeatureVi()` maps all feature labels.
- Dashboard components use semantic shadcn tokens, not hardcoded color utilities.

Browser/design verification:

- `/dashboard` at 375px, 768px, 1280px.
- `/admin/analytics` at 375px, 768px, 1280px.
- charts are nonblank for populated data.
- locked cards are readable and do not collapse layout.
- no clipped text or overlapping controls.

## 10. Out Of Scope

- Creating a new Analytics service.
- Reworking Payment/Order/Catalog/SaaS report aggregation logic.
- Changing plan pricing amounts unless product owner asks.
- Gating core POS ordering, KDS, VietQR, or staff management beyond existing quota enforcement.
- Adding external icon/logo packages unless needed and approved.
- Building a full theme redesign for the whole Management App.

## 11. Acceptance Criteria

- [ ] Plan feature codes are canonical, shared, and tested.
- [ ] Dashboard entitlement policy is documented and enforced in BFF for tenant report routes.
- [ ] Dashboard shell remains visible for all Owner/Manager users with `report.read_own`.
- [ ] FREE tenant gets locked analytics and upgrade CTA, not a broken dashboard.
- [ ] BASIC tenant gets basic analytics and locked advanced widgets.
- [ ] PREMIUM tenant gets the full dashboard.
- [ ] Super Admin platform analytics remains available and ungated by tenant packages.
- [ ] UI uses shadcn dashboard/card/chart/table patterns with lucide icons.
- [ ] Third-party logos are local/approved assets or lucide fallback.
- [ ] Frontend tests prove locked widgets do not call blocked APIs.
- [ ] Browser smoke checks pass for desktop and mobile.
