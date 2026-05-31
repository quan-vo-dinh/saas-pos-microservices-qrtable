# Phase 4D Dashboard Reporting Design Spec

> **Phase:** Phase 4D - Dashboard & Reporting
> **Date:** 2026-06-01
> **Status:** Planned design spec
> **Purpose:** Define the business behavior, service ownership, API contracts, RBAC, frontend UX, and acceptance criteria for dashboard/reporting work. This is a specification, not the step-by-step implementation plan. Implementation must follow [the Phase 4D plan](../plans/2026-06-01-phase-4d-dashboard-reporting.md).

## 0. Record Of Decision

| Area             | Decision                             | Notes                                                                                                                                 |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Functional scope | MVP Core                             | Build practical dashboards for thesis/demo and real operations: revenue, order, payment, table/menu, platform subscription analytics. |
| Backend boundary | Source-owner services                | Payment, Order, Catalog, and SaaS expose their own read-only report handlers. No new Analytics service.                               |
| BFF role         | HTTP edge only                       | BFF validates, guards, injects request context, and forwards TCP. It does not query another service database.                         |
| Permissions      | New report permissions               | Add `report.read_own` and `report.read_any` to avoid overloading payment/order permissions.                                           |
| Super Admin      | Platform + explicit tenant drilldown | Default view is SaaS/platform analytics. Tenant sales reports require selecting a tenant.                                             |
| Chart/UI stack   | shadcn dashboard ecosystem           | Use shadcn `Chart` with Recharts under the hood, plus Card/Table/Tabs/Select/Skeleton/Badge patterns.                                 |
| Timezone         | `Asia/Ho_Chi_Minh`                   | Default for all report grouping in MVP.                                                                                               |
| Range cap        | 90 days                              | Keeps aggregate reads safe without adding a reporting warehouse.                                                                      |
| Currency         | VND integer amounts                  | Amounts remain integer VND and follow existing rounding behavior.                                                                     |

## 1. Current Codebase Context

The repository already has the relevant domain sources:

- Payment service owns customer payment state, including payment method, payment status, rounded total, paid amount, and `paidAt`.
- Order service owns orders, bills, sessions, order items, bill status, order status, and table/session references.
- Catalog service owns menu items, areas, tables, QR token state, table status, and stock changes.
- SaaS service owns tenants, plans, subscriptions, and subscription invoices.
- Management App already has shell routes for `/dashboard` and `/admin/analytics`, but both are placeholder-level for reporting.
- `components.json` is configured for shadcn/Radix UI with Tailwind CSS v4. Recharts is already available in the frontend dependency stack.

Phase 4D must extend this existing architecture instead of introducing a parallel reporting stack.

## 2. Goals And Non-Goals

### Goals

- Give Owner/Manager a useful restaurant dashboard for daily business monitoring.
- Give Super Admin a useful platform analytics page for SaaS health and subscription revenue.
- Keep tenant data isolated even for reporting reads.
- Keep report contracts typed and stable for frontend use.
- Use shadcn dashboard/chart patterns instead of building custom visual primitives from scratch.
- Support loading, empty, error, and partial-data states.
- Provide implementation guidance strong enough for a fresh AI session to execute.

### Non-Goals

- No data warehouse, OLAP service, analytics database, Kafka reporting consumer, or materialized reporting tables in MVP.
- No CSV/PDF export in Phase 4D.
- No scheduled email reports.
- No real-time dashboard socket stream.
- No staff performance ranking.
- No forecast, cohort, anomaly, or AI insight feature.
- No cross-tenant restaurant revenue rollup in the default Super Admin page. Super Admin restaurant-sales access is tenant-by-tenant drilldown.

## 3. Actors And Permissions

### Permission Constants

Add two permissions in `libs/constants/src/lib/enum/role.enum.ts`:

```ts
REPORT_READ_OWN = 'report.read_own';
REPORT_READ_ANY = 'report.read_any';
```

### Seed Matrix

| Role          | Permissions                          |
| ------------- | ------------------------------------ |
| `SUPER_ADMIN` | `report.read_any`, `report.read_own` |
| `OWNER`       | `report.read_own`                    |
| `MANAGER`     | `report.read_own`                    |
| `WAITER`      | none                                 |
| `CHEF`        | none                                 |
| `BARISTA`     | none                                 |

Implementation must update `apps/user-access/src/seeder/role.json`, `apps/user-access/src/seeder/role.spec.ts`, and `docs/architecture/permission-matrix.md`.

### Access Behavior

- Owner/Manager can only read reports for the current tenant resolved by `TenantGuard`.
- Super Admin can read platform analytics.
- Super Admin can read a selected tenant's reports only through explicit tenant drilldown routes.
- Staff roles without report permissions must receive a guarded denial from BFF before report TCP calls are made.

## 4. Reporting Terminology

Use precise names in UI, DTOs, and docs:

| Term               | Meaning                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sales revenue      | Restaurant customer revenue from paid bills/payments. Owned by Payment/Order data.                                                                                  |
| Platform revenue   | SaaS subscription revenue collected from tenant subscription invoices. Owned by SaaS data.                                                                          |
| Paid bill          | Bill with `BillStatus.PAID`.                                                                                                                                        |
| Pending bill       | Bill awaiting payment, usually `BillStatus.PENDING_PAYMENT`.                                                                                                        |
| Paid payment       | Payment with existing Phase 3 settled state, currently `PaymentStatus.PAID`.                                                                                        |
| Gross sales VND    | Sum of rounded paid bill/payment totals before future refunds/discount features.                                                                                    |
| Collected VND      | Sum of actual collected payment amount when Payment data stores it.                                                                                                 |
| Rounding delta VND | Difference between raw total and rounded total already captured by Payment.                                                                                         |
| Top item revenue   | Revenue from eligible paid/completed order items; prefer stored rounded totals, or use `roundVnd()` from `@qrtable/utils` if deriving from quantity and unit price. |

Do not mix platform subscription revenue and restaurant sales revenue in one chart without an explicit label.

## 5. Query Contract

All report endpoints use the same query model unless a route documents an exception.

```ts
type ReportGrain = 'day' | 'week' | 'month';

interface ReportRangeQuery {
  from?: string; // ISO date or datetime. Defaults to start of last 7 days in timezone.
  to?: string; // ISO date or datetime. Defaults to now in timezone.
  grain?: ReportGrain; // Defaults to day.
  timezone?: string; // Defaults to Asia/Ho_Chi_Minh.
  limit?: number; // Optional for ranked lists. Default 10, max 20.
}
```

Validation rules:

- `timezone` defaults to `Asia/Ho_Chi_Minh`.
- `grain` must be `day`, `week`, or `month`.
- `from` and `to` must parse as dates.
- `to` must be greater than or equal to `from`.
- maximum range is 90 days.
- `limit` defaults to 10 and is capped at 20.
- services should receive normalized UTC boundaries plus the original timezone/grain for grouping metadata.
- If normalization logic is reused by BFF and more than one source service, place it in an existing shared pure utility layer instead of duplicating it locally.

Response conventions:

- all amount fields are integer VND.
- all time-series buckets are sorted ascending.
- every response includes `range`, `timezone`, `grain`, and `generatedAt`.
- empty datasets return zero totals and empty arrays, not `null`.
- services must not return raw database entities.

## 6. BFF HTTP API

### Tenant Dashboard Routes

Base route group: `/dashboard/reports`

| Method | Route                        | Permission        | Description                                               |
| ------ | ---------------------------- | ----------------- | --------------------------------------------------------- |
| `GET`  | `/dashboard/reports/revenue` | `report.read_own` | Tenant sales revenue, payment breakdown, recent payments. |
| `GET`  | `/dashboard/reports/orders`  | `report.read_own` | Order/bill KPIs, status breakdown, top items.             |
| `GET`  | `/dashboard/reports/tables`  | `report.read_own` | Table status and catalog availability summary.            |

BFF behavior:

- apply `UserGuard`, `TenantGuard`, and `PermissionGuard`.
- build tenant-scoped TCP request from `req.tenantId`.
- forward only validated report query fields.
- return typed response without changing business totals.

### Super Admin Routes

Base route group: `/admin/analytics`

| Method | Route                                                | Permission        | Description                                |
| ------ | ---------------------------------------------------- | ----------------- | ------------------------------------------ |
| `GET`  | `/admin/analytics/platform`                          | `report.read_any` | Platform/SaaS analytics from SaaS service. |
| `GET`  | `/admin/analytics/tenants/:tenantId/reports/revenue` | `report.read_any` | Selected tenant sales revenue drilldown.   |
| `GET`  | `/admin/analytics/tenants/:tenantId/reports/orders`  | `report.read_any` | Selected tenant order/bill drilldown.      |
| `GET`  | `/admin/analytics/tenants/:tenantId/reports/tables`  | `report.read_any` | Selected tenant table/catalog drilldown.   |

BFF behavior:

- apply Super Admin/admin guard chain already used by `/admin/*`.
- require explicit `tenantId` path param for tenant drilldown.
- never infer tenant drilldown from a browser-selected global state.
- include actor id and permission context in the TCP request if current patterns support it.

## 7. TCP Contracts

Recommended additions in `libs/constants/src/lib/enum/tcp-request-message.ts`:

```ts
PAYMENT.REPORT_REVENUE = 'payment.report_revenue';
ORDER.REPORT_ORDERS = 'order.report_orders';
CATALOG.REPORT_TABLES = 'catalog.report_tables';
SUBSCRIPTION.REPORT_PLATFORM = 'subscription.report_platform';
```

Place request/response interfaces beside existing domain TCP interfaces:

- `libs/interfaces/src/lib/tcp/payment/payment-request.interface.ts`
- `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts`
- `libs/interfaces/src/lib/tcp/order/order-request.interface.ts`
- `libs/interfaces/src/lib/tcp/order/order-response.interface.ts`
- `libs/interfaces/src/lib/tcp/catalog/table-request.interface.ts` or a small catalog report interface if the existing file becomes too crowded.
- `libs/interfaces/src/lib/tcp/saas/saas-request.interface.ts`
- `libs/interfaces/src/lib/tcp/saas/saas-response.interface.ts`

### Shared Report Types

If two or more domains need identical range metadata, place the shared type in a TCP common interface, not in an app folder.

```ts
export interface ReportRange {
  from: string;
  to: string;
}

export interface ReportRequestMeta {
  timezone: string;
  grain: 'day' | 'week' | 'month';
  range: ReportRange;
}

export interface ReportSeriesPoint {
  bucket: string;
  label: string;
  value: number;
}
```

### Payment Report Response

Payment owns customer payment revenue.

```ts
export interface PaymentRevenueReportRequest {
  tenantId: string;
  timezone: string;
  grain: 'day' | 'week' | 'month';
  from: string;
  to: string;
  limit: number;
}

export interface PaymentRevenueReportResponse {
  range: ReportRange;
  timezone: string;
  grain: 'day' | 'week' | 'month';
  generatedAt: string;
  summary: {
    grossSalesVnd: number;
    collectedVnd: number;
    roundingDeltaVnd: number;
    paidPaymentCount: number;
    averagePaidPaymentVnd: number;
  };
  revenueSeries: Array<{
    bucket: string;
    label: string;
    grossSalesVnd: number;
    collectedVnd: number;
    paymentCount: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    grossSalesVnd: number;
    collectedVnd: number;
    paymentCount: number;
  }>;
  recentPayments: Array<{
    paymentId: string;
    billId: string;
    billReference: string;
    method: string;
    status: string;
    grossSalesVnd: number;
    collectedVnd: number;
    paidAt: string;
  }>;
}
```

Payment query rules:

- include only `PaymentStatus.PAID` for realized revenue.
- group by `paidAt`.
- tenant filter is mandatory.
- do not read Order/Bill tables from Payment service.
- expose bill ids/references only when already stored in Payment.

### Order Report Response

Order owns order/bill lifecycle and order item details.

```ts
export interface OrderReportRequest {
  tenantId: string;
  timezone: string;
  grain: 'day' | 'week' | 'month';
  from: string;
  to: string;
  limit: number;
}

export interface OrderReportResponse {
  range: ReportRange;
  timezone: string;
  grain: 'day' | 'week' | 'month';
  generatedAt: string;
  summary: {
    orderCount: number;
    completedOrderCount: number;
    cancelledOrderCount: number;
    paidBillCount: number;
    pendingBillCount: number;
    averagePaidBillVnd: number;
  };
  orderSeries: Array<{
    bucket: string;
    label: string;
    orderCount: number;
    paidBillCount: number;
    completedOrderCount: number;
  }>;
  billStatusBreakdown: Array<{
    status: string;
    count: number;
    totalVnd: number;
  }>;
  topItems: Array<{
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    revenueVnd: number;
  }>;
}
```

Order query rules:

- order volume uses `createdAt` unless a more precise status timestamp exists.
- paid bill metrics use `paidAt` or `closedAt` according to current Bill fields; prefer `paidAt` for paid revenue-related summaries.
- cancelled orders do not count toward top item revenue.
- tenant filter is mandatory.
- do not read Payment tables from Order service.

### Catalog/Table Report Response

Catalog owns table/menu availability and stock state.

```ts
export interface CatalogTableReportRequest {
  tenantId: string;
}

export interface CatalogTableReportResponse {
  generatedAt: string;
  summary: {
    totalTables: number;
    availableTables: number;
    occupiedTables: number;
    unavailableTables: number;
    totalMenuItems: number;
    activeMenuItems: number;
    outOfStockItems: number;
  };
  tableStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  menuAvailabilityBreakdown: Array<{
    status: string;
    count: number;
  }>;
}
```

Catalog query rules:

- tenant filter is mandatory.
- table status labels remain wire values in API and are mapped to Vietnamese labels in frontend shared display helpers.
- no order/session lookup from Catalog service.

### SaaS Platform Report Response

SaaS owns subscription/platform analytics.

```ts
export interface PlatformReportRequest {
  timezone: string;
  grain: 'day' | 'week' | 'month';
  from: string;
  to: string;
  limit: number;
}

export interface PlatformReportResponse {
  range: ReportRange;
  timezone: string;
  grain: 'day' | 'week' | 'month';
  generatedAt: string;
  summary: {
    platformRevenueVnd: number;
    paidInvoiceCount: number;
    pendingInvoiceCount: number;
    activeTenantCount: number;
    suspendedTenantCount: number;
    closedTenantCount: number;
  };
  revenueSeries: Array<{
    bucket: string;
    label: string;
    platformRevenueVnd: number;
    paidInvoiceCount: number;
  }>;
  tenantStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  invoiceStatusBreakdown: Array<{
    status: string;
    count: number;
    totalVnd: number;
  }>;
  planBreakdown: Array<{
    planCode: string;
    planName: string;
    tenantCount: number;
    activeSubscriptionCount: number;
  }>;
}
```

SaaS query rules:

- platform revenue uses paid subscription invoices.
- group revenue by invoice `paidAt` when available.
- do not read restaurant payment/order data from SaaS.
- tenant drilldown restaurant reports go through BFF to Payment/Order/Catalog, not through SaaS.

## 8. Frontend UX Specification

### Component Stack

Use these components/patterns first:

- shadcn `Chart` for chart container, tooltip, legend/config, and responsive chart wrapping.
- `Card` for KPI cards and repeated dashboard sections.
- `Table` or existing data-table patterns for top items/recent payments.
- `Tabs` for switching report sections if the first viewport becomes crowded.
- `Select` or segmented controls for range/grain.
- `Skeleton` for loading.
- `Badge` for status/method labels.
- `Tooltip` for metric explanation.
- `Alert` or existing error state component for errors.

Do not introduce a second charting library. Recharts can remain because shadcn charts use it.

### Tenant Dashboard Layout

Route: `apps/management-app/src/app/(dashboard)/dashboard/page.tsx`

Recommended first viewport:

1. Page title and compact date range controls.
2. KPI cards:
   - Sales revenue
   - Collected amount
   - Paid bills/payments
   - Average paid bill/payment
3. Revenue trend chart.
4. Payment method breakdown chart.
5. Lower sections:
   - top selling items table.
   - bill/order status summary.
   - table status summary.
   - recent paid payments table.

Responsive behavior:

- Desktop: 4 KPI cards, 2-column chart grid, tables below.
- Tablet: 2 KPI columns, charts stack as needed.
- Mobile: 1 KPI column, charts stay readable, tables become horizontally scrollable or compact cards.

### Super Admin Analytics Layout

Route: `apps/management-app/src/app/(admin)/admin/analytics/page.tsx`

Recommended first viewport:

1. Page title and platform date range controls.
2. KPI cards:
   - Platform revenue
   - Paid subscription invoices
   - Active tenants
   - Suspended tenants
3. Platform revenue trend chart.
4. Tenant status and invoice status charts.
5. Plan distribution table/chart.
6. Tenant drilldown panel:
   - tenant search/select.
   - explicit note that drilldown shows restaurant sales for the selected tenant.
   - drilldown cards/charts reuse tenant report components where possible.

### Frontend Data Layer

Create a feature boundary under:

- `apps/management-app/src/features/reports/`

Recommended files:

- `types.ts` - browser-facing report types.
- `api.ts` - authenticated HTTP calls to BFF.
- `hooks/use-report-query.ts` - React Query hooks.
- `utils/report-formatters.ts` - VND and chart label formatting.
- `components/report-range-filter.tsx`
- `components/report-metric-card.tsx`
- `components/report-state.tsx`
- `components/revenue-trend-chart.tsx`
- `components/payment-method-chart.tsx`
- `components/top-items-table.tsx`
- `components/table-status-summary.tsx`
- `components/platform-revenue-chart.tsx`
- `components/tenant-drilldown-panel.tsx`

Keep feature code local until another app needs it. Promote only truly reusable primitives to `libs/frontend/ui`.

### Display Rules

- Format VND with existing frontend utilities when available; do not hand-roll multiple VND formatters.
- Raw enum values must not be shown directly.
- Add missing display helpers to `libs/shared/constants/src/lib/vi-domain-labels.ts` when a status appears in UI.
- Use Vietnamese labels in Management App where existing domain UI already does so.
- Use clear chart legends: "Sales revenue" vs "Platform revenue".
- Show `0 VND` and empty states for no data; never show `NaN`, `undefined`, or broken chart axes.

## 9. Security And Tenant Isolation

Backend requirements:

- All tenant report queries require a tenant id.
- Owner/Manager tenant id comes from trusted request context, not query params.
- Super Admin tenant drilldown must use explicit path param and `report.read_any`.
- Services must apply tenant filters in repository queries.
- No service imports another service's entity or repository.
- No report endpoint should expose customer session tokens, payment provider raw payloads, bank tokens, OAuth tokens, or Keycloak metadata.
- BFF should not return stack traces or internal TCP details on report errors.

Frontend requirements:

- Staff without report permissions should not see dashboard report controls.
- Route guards/middleware must block unauthorized navigation, but backend authorization remains required.
- Admin tenant drilldown UI must make selected tenant identity visible.

## 10. Error And Empty-State Behavior

| Situation                  | API Behavior                                                          | UI Behavior                                                |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| No data in range           | `200` with zero totals and empty arrays                               | Empty state with explanation and no broken chart           |
| Invalid range              | `400` validation error                                                | Inline filter error/toast                                  |
| Range over 90 days         | `400` validation error                                                | Prompt user to shorten range                               |
| Unauthorized role          | `403`                                                                 | Access denied / redirect according to existing app pattern |
| Missing tenant context     | `400` or `403` according to existing guard pattern                    | Access denied or tenant-required state                     |
| Source service unavailable | BFF propagates safe service error                                     | Section-level error with retry, not whole app crash        |
| Partial widget failure     | If implemented as independent queries, only failed widget shows error | Other successful widgets remain visible                    |

## 11. Testing Requirements

Backend:

- permission seed tests include the two report permissions.
- BFF controller tests verify route path, permission metadata, query validation, tenant injection, and TCP pattern forwarding.
- Payment report service tests cover empty range, paid-only filtering, method breakdown, and tenant isolation.
- Order report service tests cover status breakdown, cancelled exclusion, top-item aggregation, and tenant isolation.
- Catalog report service tests cover table/menu status summaries and tenant isolation.
- SaaS report service tests cover subscription revenue, invoice status, tenant status, and empty range.

Frontend:

- report hooks call correct endpoints and preserve query keys.
- tenant dashboard renders loading, empty, error, and populated states.
- admin analytics renders platform data and tenant drilldown states.
- chart components handle zero/empty data without runtime errors.
- enum labels use shared display helpers.
- desktop and mobile browser smoke checks verify layout, no overlap, and nonblank charts.

E2E/smoke:

- Owner can access `/dashboard`.
- Manager can access `/dashboard`.
- Waiter/Chef/Barista cannot access report endpoints.
- Super Admin can access `/admin/analytics`.
- Super Admin can select a tenant for drilldown.

## 12. Acceptance Checklist

- [ ] Phase 4D permissions are defined, seeded, and documented.
- [ ] Tenant dashboard routes return real tenant-scoped data.
- [ ] Admin analytics route returns platform data from SaaS service.
- [ ] Tenant drilldown routes require `report.read_any`.
- [ ] No service boundary violation exists.
- [ ] All report responses use stable typed contracts and integer VND amounts.
- [ ] Frontend uses shadcn chart/dashboard patterns.
- [ ] Empty/error/loading states are implemented.
- [ ] Desktop and mobile dashboard layouts are verified.
- [ ] Relevant backend, frontend, and e2e tests are run and recorded.

## 13. Future Extensions

- Kafka-fed reporting read model.
- Export to CSV/PDF.
- Scheduled owner report emails.
- Real-time sales widgets.
- Staff performance and shift analytics.
- Forecasting/anomaly detection.
- Platform tenant cohort and retention analytics.
