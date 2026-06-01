# Phase 4D - Dashboard & Reporting

> **Goal:** Add production-ready dashboard and reporting capabilities for restaurant Owners/Managers and Super Admins, covering revenue, order, table, menu, tenant, subscription, and platform analytics.
> **Estimated:** ~5-7 days
> **Status:** Implemented (MVP)
> **Primary follow-up docs:** [Phase 4D design spec](../superpowers/specs/2026-06-01-phase-4d-dashboard-reporting-design.md) and [Phase 4D implementation plan](../superpowers/plans/2026-06-01-phase-4d-dashboard-reporting.md).
> **Phase 4D.1 addendum:** [Dashboard entitlements & UI polish spec](../superpowers/specs/2026-06-01-phase-4d-dashboard-entitlements-ui-addendum.md) and [implementation plan](../superpowers/plans/2026-06-01-phase-4d-dashboard-entitlements-ui-polish.md).

## Scope Decision

Phase 4D is inserted after Phase 4C Staff Management and before Phase 5-7 finalization. It closes the reporting gap in the Management App:

- tenant Owners/Managers need business visibility for daily operations.
- Super Admins need platform-level analytics for SaaS operation and thesis/demo evidence.
- `/dashboard` and `/admin/analytics` now expose real reporting behavior instead of placeholder screens.

This phase deliberately avoids creating a standalone Analytics service. The MVP reporting read models stay inside the services that already own the source data. BFF remains the guarded HTTP edge and must not contain report business logic.

## Prerequisites

- Phase 4B completed - SaaS onboarding, subscription, tenant lifecycle, payment settings, and admin shell routes exist.
- Phase 4C completed - tenant staff management and Owner/Manager access model exists.
- Payment service owns tenant customer-payment records.
- Order service owns orders, bills, sessions, and order items.
- Catalog service owns menu, table, area, and stock/table state.
- SaaS service owns tenant, plan, subscription, and subscription invoice data.
- BFF applies `UserGuard` -> `TenantGuard` -> `PermissionGuard`.

## Accepted Decisions

| Decision Area     | Final Decision                       | Reason                                                                                                                                |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Functional scope  | MVP Core                             | Covers revenue, order, menu/table, platform revenue, tenant/subscription metrics without building a warehouse.                        |
| Backend ownership | Owner services                       | Payment, Order, Catalog, and SaaS expose read-only report TCP handlers for data they own.                                             |
| New RBAC          | `report.read_own`, `report.read_any` | Reporting deserves explicit permissions instead of borrowing payment/order permissions.                                               |
| Super Admin scope | Platform + audited tenant drilldown  | Super Admin sees SaaS revenue by default and can inspect one tenant's sales reports when support or audit requires it.                |
| Frontend UI       | shadcn dashboard ecosystem           | Use shadcn `Chart`, `Card`, `Table`, `Tabs`, `Select`, `Skeleton`, `Badge`, `Tooltip`, and dashboard block patterns before custom UI. |
| Data pipeline     | Direct aggregate reads for MVP       | No Kafka analytics consumer, no materialized reporting DB, no OLAP engine in Phase 4D.                                                |
| Plan entitlement  | BFF feature guard + locked UI states | Tenant report APIs require active subscription + `analytics_basic`; frontend shows plan/quota and locked upgrade cards.               |

## Final Scope

### Tenant Dashboard For Owner/Manager

Route: `/dashboard`

Required reporting capabilities:

- Revenue overview for selected time range.
- Revenue trend chart grouped by day, week, or month.
- Payment method breakdown: cash vs VietQR/SePay.
- Order volume, average bill value, paid bill count, and unpaid/pending bill count.
- Top selling menu items by quantity and revenue contribution.
- Table status/utilization summary from Catalog-owned table state.
- Recent paid payment activity with safe, tenant-scoped fields.
- Current plan/quota overview and package-aware locked states.
- Loading, empty, error, partial-data, and success states.

Owner and Manager can access the dashboard shell through `report.read_own`. Tenant report API data also requires an active subscription and `analytics_basic`. `FREE` tenants see quota and locked analytics; `BASIC` tenants see basic analytics with advanced widgets locked; `PREMIUM` tenants see the full dashboard. Waiter, Chef, and Barista cannot access dashboard reporting by default.

### Super Admin Analytics

Route: `/admin/analytics`

Required reporting capabilities:

- Platform subscription revenue overview from SaaS-owned invoices.
- Tenant counts by status.
- Active subscription counts by plan/status.
- Subscription invoice status breakdown.
- Platform revenue trend chart grouped by day, week, or month.
- Tenant growth or tenant status trend when data is available.
- Tenant drilldown entry point for audited per-tenant reporting.

Super Admin can access platform reports and tenant drilldown through `report.read_any`.

### Backend Read Models

Each source service exposes read-only report handlers:

| Service | Report Ownership         | Examples                                                                   |
| ------- | ------------------------ | -------------------------------------------------------------------------- |
| Payment | customer payment revenue | paid amount, rounded total, payment method breakdown, recent paid payments |
| Order   | order and bill reporting | order volume, bill status counts, average bill value, top items            |
| Catalog | catalog/table reporting  | table status counts, menu availability, stock availability summary         |
| SaaS    | platform reporting       | tenant counts, subscription revenue, invoice status, plan distribution     |

BFF exposes stable HTTP routes and forwards typed TCP requests. It does not join databases directly and does not import service repositories or entities.

### Out Of Scope

- New standalone Analytics microservice.
- Data warehouse, OLAP cube, Kafka materialized reporting pipeline, or ClickHouse/BigQuery style storage.
- CSV/PDF export.
- Scheduled email reports.
- Forecasting, AI insights, cohort analysis, or anomaly detection.
- Staff performance leaderboard.
- Real-time dashboard sockets. Phase 4D can use polling or React Query refetch.
- Multi-currency accounting. VND remains the reporting currency.

## Final Business Behavior

### Tenant Owner/Manager

Owner and Manager can answer these operational questions from `/dashboard`:

- How much revenue did the restaurant collect in the selected period?
- How much of that revenue came from cash vs VietQR/SePay?
- How many bills were paid, pending payment, or reopened?
- What is the average paid bill value?
- Which menu items are selling best?
- Which tables are currently available, occupied, or otherwise unavailable?
- Are there recent payment records that help reconcile end-of-day operation?

Revenue semantics:

- Sales revenue is based on paid restaurant bills.
- The canonical business total is the bill/payment rounded VND total already produced by existing payment logic.
- Any new derived VND amount must use the existing `roundVnd()` utility from `@qrtable/utils`; prefer already-stored rounded totals when they exist.
- Cash collected and VietQR collected values are shown separately when Payment data supports it.
- Pending bills are not counted as realized sales revenue.
- Cancelled orders are excluded from revenue and top-item reporting.

Time semantics:

- Default timezone is `Asia/Ho_Chi_Minh`.
- Default range is the last 7 calendar days.
- Supported grains are `day`, `week`, and `month`.
- Custom ranges are capped at 90 days for MVP performance.
- Revenue grouping uses payment settlement time (`paidAt`) when available.

### Super Admin

Super Admin can answer these platform questions from `/admin/analytics`:

- How much subscription revenue did the platform collect?
- How many tenants are active, suspended, or closed?
- Which plans are being used?
- How many subscription invoices are paid, pending, cancelled, or overdue according to current SaaS states?
- Is a specific tenant's restaurant revenue healthy enough to support support/audit conversations?

Super Admin tenant drilldown must be explicit. The UI should make the selected tenant visible so the user does not confuse platform subscription revenue with restaurant sales revenue.

### Access Rules

| Actor       | Tenant Dashboard                                            | Admin Analytics | Tenant Drilldown |
| ----------- | ----------------------------------------------------------- | --------------- | ---------------- |
| Super Admin | No tenant shell by default unless acting on selected tenant | Yes             | Yes              |
| Owner       | Yes, own tenant only                                        | No              | No               |
| Manager     | Yes, own tenant only                                        | No              | No               |
| Waiter      | No                                                          | No              | No               |
| Chef        | No                                                          | No              | No               |
| Barista     | No                                                          | No              | No               |

## Final Technical Behavior

### Permissions

Implemented report permissions:

- `REPORT_READ_OWN = 'report.read_own'`
- `REPORT_READ_ANY = 'report.read_any'`

Seed expectations:

- `SUPER_ADMIN`: `report.read_any` and `report.read_own`
- `OWNER`: `report.read_own`
- `MANAGER`: `report.read_own`
- `WAITER`, `CHEF`, `BARISTA`: no report permissions

The canonical matrix is updated in `docs/architecture/permission-matrix.md`.

### BFF HTTP Routes

Tenant report routes:

| Route                            | Permission        | Plan feature      | Target service |
| -------------------------------- | ----------------- | ----------------- | -------------- |
| `GET /dashboard/reports/revenue` | `report.read_own` | `analytics_basic` | Payment        |
| `GET /dashboard/reports/orders`  | `report.read_own` | `analytics_basic` | Order          |
| `GET /dashboard/reports/tables`  | `report.read_own` | `analytics_basic` | Catalog        |

Admin analytics routes:

| Route                                                    | Permission        | Target service |
| -------------------------------------------------------- | ----------------- | -------------- |
| `GET /admin/analytics/platform`                          | `report.read_any` | SaaS           |
| `GET /admin/analytics/tenants/:tenantId/reports/revenue` | `report.read_any` | Payment        |
| `GET /admin/analytics/tenants/:tenantId/reports/orders`  | `report.read_any` | Order          |
| `GET /admin/analytics/tenants/:tenantId/reports/tables`  | `report.read_any` | Catalog        |

BFF validates query shape, applies guards, injects actor context, and forwards TCP payloads. Tenant dashboard report routes use `TenantSubscriptionContextGuard` to resolve current subscription/features through SaaS `SUBSCRIPTION.GET_CURRENT`, then `PlanFeatureGuard` enforces active subscription plus `analytics_basic`. The target services must still enforce tenant filtering on their own data reads.

If date-range normalization is needed in more than one runtime boundary, implement it once as a shared pure helper in the existing shared library layer instead of copy-pasting parsers across BFF and source services.

### TCP Message Additions

Implemented message additions:

- `TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE = 'payment.report_revenue'`
- `TCP_REQUEST_MESSAGE.ORDER.REPORT_ORDERS = 'order.report_orders'`
- `TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES = 'catalog.report_tables'`
- `TCP_REQUEST_MESSAGE.SUBSCRIPTION.REPORT_PLATFORM = 'subscription.report_platform'`

### Frontend Direction

Use the existing Management App shell:

- tenant route: `apps/management-app/src/app/(dashboard)/dashboard/page.tsx`
- Super Admin route: `apps/management-app/src/app/(admin)/admin/analytics/page.tsx`
- shared UI: `@qrtable/ui` and shadcn components from the app's `components.json`

Use shadcn `ChartContainer`, `ChartTooltipContent`, `Card`, `Table`, `Tabs`, `Select`, `Skeleton`, `Badge`, and `Tooltip` patterns. Existing Recharts usage can be wrapped through shadcn chart components instead of introducing another charting stack.

Frontend must not render raw wire enum values. Use existing shared display helpers from `@einvoice/shared-constants` or add new helpers there when a report status needs a label.

## Acceptance Criteria

- [x] `report.read_own` and `report.read_any` exist in constants, seed data, and permission matrix.
- [x] Owner and Manager can open `/dashboard` and see tenant-scoped dashboard behavior according to package entitlements.
- [x] Waiter, Chef, and Barista do not receive report permissions.
- [x] Super Admin can open `/admin/analytics` and see platform SaaS analytics.
- [x] Super Admin can explicitly select a tenant and inspect that tenant's sales/order/table reports.
- [x] BFF report controllers only proxy and validate; they do not perform cross-service database reads.
- [x] Payment, Order, Catalog, and SaaS report handlers only query their own persistence.
- [x] Date range, grain, timezone, and limit validation are covered by focused report tests.
- [x] Empty datasets render useful empty states, not broken charts or `NaN`.
- [x] Revenue values are VND and respect existing rounding semantics.
- [x] Frontend charts use shadcn chart patterns and entitlement-aware dashboard components.
- [x] Tenant report routes require active subscription and `analytics_basic` through `PlanFeatureGuard`.

## Acceptance Evidence

Implementation evidence includes:

- focused backend tests for each report owner service.
- BFF controller tests proving guard metadata, query validation, tenant injection, and TCP forwarding.
- frontend tests for loading, empty, error, and populated states.
- focused frontend entitlement tests proving locked dashboard widgets skip report API calls.
- browser smoke evidence for `/dashboard` and `/admin/analytics` when live fixtures are available.
- command output for the relevant Nx/Jest/Playwright checks.

Suggested verification commands are listed in the implementation plan.

## Phase 4D.1 — Entitlements & UI Polish (2026-06-01)

Implemented on top of the Phase 4D MVP:

- Canonical plan feature codes in `libs/constants/saas.constants.ts` and `libs/shared/constants/saas-wire-types.ts`.
- BFF `@RequiresPlanFeature` + `PlanFeatureGuard` on tenant dashboard report routes (`analytics_basic`).
- `TenantSubscriptionContextGuard` hydrates subscription/features from SaaS `SUBSCRIPTION.GET_CURRENT` before plan checks.
- Management App derives `DashboardEntitlements` from `GET /dashboard/subscription` and skips report API calls when widgets are locked.
- Tenant `/dashboard` shows plan/quota overview, locked upgrade cards (FREE/BASIC), and full analytics for PREMIUM.
- Super Admin `/admin/analytics` remains ungated; tenant drilldown shows selected tenant plan features for audit context.

## Handoff / Deferred Work

Implementation was planned from these detailed artifacts:

- [Phase 4D design spec](../superpowers/specs/2026-06-01-phase-4d-dashboard-reporting-design.md)
- [Phase 4D implementation plan](../superpowers/plans/2026-06-01-phase-4d-dashboard-reporting.md)
- [Phase 4D.1 dashboard entitlements & UI polish spec](../superpowers/specs/2026-06-01-phase-4d-dashboard-entitlements-ui-addendum.md)
- [Phase 4D.1 implementation plan](../superpowers/plans/2026-06-01-phase-4d-dashboard-entitlements-ui-polish.md)

Deferred candidates after MVP:

- scheduled report exports.
- CSV/PDF export.
- real-time revenue/event stream widgets.
- dedicated analytics storage fed by Kafka.
- staff performance analytics.
- forecast/anomaly widgets.
- advanced tenant cohort analytics for Super Admin.
