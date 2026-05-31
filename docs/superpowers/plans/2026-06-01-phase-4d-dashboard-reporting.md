# Phase 4D Dashboard Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 4D dashboard/reporting for tenant Owners/Managers and Super Admins, covering restaurant sales revenue, order/bill metrics, top items, table/catalog summary, platform subscription revenue, tenant/subscription analytics, and tenant drilldown.

**Architecture:** BFF exposes guarded HTTP routes and forwards typed TCP report requests. Payment, Order, Catalog, and SaaS each own report reads for their own persistence. Management App renders dashboards using shadcn chart/dashboard components and React Query. No new Analytics service or cross-service database reads.

**Tech Stack:** Nx monorepo, NestJS 11, TCP microservices, TypeORM, Mongo/Mongoose for user-access seed data, PostgreSQL service databases, Next.js 16, React 19, TanStack Query, shadcn/Radix UI, Recharts through shadcn Chart, Jest, Playwright/browser smoke checks.

---

## Reference Context

- Phase source: `docs/phases/phase-4d-dashboard-reporting.md`
- Design spec: `docs/superpowers/specs/2026-06-01-phase-4d-dashboard-reporting-design.md`
- Business rules: `docs/business-logic.md`
- Architecture rules: `docs/technical-architecture.md`
- RBAC source: `docs/architecture/permission-matrix.md`
- Existing dashboard placeholders:
  - `apps/management-app/src/app/(dashboard)/dashboard/page.tsx`
  - `apps/management-app/src/app/(admin)/admin/analytics/page.tsx`
- Existing frontend route/sidebar constants:
  - `apps/management-app/src/constants/api.ts`
  - `apps/management-app/src/constants/routes.ts`
  - `apps/management-app/src/components/layout/data/sidebar-data.ts`
- Existing service ownership:
  - Payment: `apps/payment/src/app/modules/payment/`
  - Order: `apps/order/src/app/modules/order/`
  - Catalog: `apps/catalog/src/app/modules/`
  - SaaS: `apps/saas/src/`
  - BFF: `apps/bff/src/app/modules/`

## Start-Of-Session Protocol

- [ ] Read `AGENTS.md`.
- [ ] Run CodeGraph first:
  - [ ] `codegraph status .`
  - [ ] `codegraph query dashboard`
  - [ ] `codegraph query analytics`
  - [ ] `codegraph query revenue`
  - [ ] `codegraph query "REPORT_READ"`
- [ ] Read this plan and the design spec before editing.
- [ ] Read the sibling files for every module you touch. Follow local import aliases and test style.
- [ ] Use TDD for backend services and BFF route contracts: write/update focused failing tests before implementation.
- [ ] Use shadcn docs/current component patterns before creating custom chart primitives. If docs are needed, use Context7 or the local `ctx7` CLI as required by `AGENTS.md`.
- [ ] Do not import another service's entity, repository, or module directly.
- [ ] Do not render raw enum wire values in frontend UI.

## File Structure

Shared constants/contracts:

- Modify `libs/constants/src/lib/enum/role.enum.ts`: add `REPORT_READ_OWN` and `REPORT_READ_ANY`.
- Modify `libs/constants/src/lib/enum/tcp-request-message.ts`: add report TCP patterns.
- Modify `apps/user-access/src/seeder/role.json`: seed report permissions.
- Modify `apps/user-access/src/seeder/role.spec.ts`: assert report permission placement.
- Create or modify `libs/interfaces/src/lib/tcp/common/report.interface.ts`: shared report range/grain/series metadata when useful.
- Create a shared pure report-range normalization helper in the existing shared utility/common layer if BFF and source services both need to normalize the same query rules.
- Modify `libs/interfaces/src/lib/tcp/payment/payment-request.interface.ts`: add payment report request.
- Modify `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts`: add payment report response.
- Modify `libs/interfaces/src/lib/tcp/order/order-request.interface.ts`: add order report request.
- Modify `libs/interfaces/src/lib/tcp/order/order-response.interface.ts`: add order report response.
- Modify `libs/interfaces/src/lib/tcp/catalog/table-request.interface.ts` or create `catalog-report-request.interface.ts`: add catalog report request.
- Modify `libs/interfaces/src/lib/tcp/catalog/table-response.interface.ts` or create `catalog-report-response.interface.ts`: add catalog report response.
- Modify `libs/interfaces/src/lib/tcp/saas/saas-request.interface.ts`: add platform report request.
- Modify `libs/interfaces/src/lib/tcp/saas/saas-response.interface.ts`: add platform report response.
- Create `libs/interfaces/src/lib/gateway/report/report-request.dto.ts`: BFF query DTOs.
- Create `libs/interfaces/src/lib/gateway/report/report-response.dto.ts`: gateway report response DTOs or re-exports.
- Create `libs/interfaces/src/lib/gateway/report/index.ts`: gateway report exports.

Payment service:

- Create `apps/payment/src/app/modules/payment/services/payment-report.service.ts`.
- Create `apps/payment/src/app/modules/payment/tests/payment-report.service.spec.ts`.
- Modify `apps/payment/src/app/modules/payment/repositories/payment.repository.ts`: add aggregate report queries.
- Modify `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`: add report message pattern.
- Modify `apps/payment/src/app/modules/payment/payment.module.ts`: register `PaymentReportService`.

Order service:

- Create `apps/order/src/app/modules/order/services/order-report.service.ts`.
- Create `apps/order/src/app/modules/order/tests/order-report.service.spec.ts`.
- Modify `apps/order/src/app/modules/order/repositories/order.repository.ts`: add order count/status aggregate queries.
- Modify `apps/order/src/app/modules/order/repositories/bill.repository.ts`: add bill status/average aggregate queries.
- Modify `apps/order/src/app/modules/order/repositories/order-item.repository.ts`: add top item aggregate query.
- Modify `apps/order/src/app/modules/order/controllers/order.controller.ts`: add report message pattern.
- Modify `apps/order/src/app/modules/order/order.module.ts`: register `OrderReportService`.

Catalog service:

- Create `apps/catalog/src/app/modules/report/catalog-report.service.ts` or place a `table-report.service.ts` beside table service if that matches local structure better.
- Create `apps/catalog/src/app/modules/report/catalog-report.service.spec.ts`.
- Modify table/menu repositories or services only for aggregate read helpers.
- Modify the relevant Catalog controller to add the report message pattern.
- Register the report service in the relevant Catalog module.

SaaS service:

- Create `apps/saas/src/services/platform-report.service.ts`.
- Create `apps/saas/src/services/platform-report.service.spec.ts`.
- Modify `apps/saas/src/repositories/subscription-invoice.repository.ts`: add revenue/invoice aggregates.
- Modify tenant/subscription repositories as needed for counts and plan breakdown.
- Modify `apps/saas/src/controllers/saas.controller.ts`: add platform report message pattern.
- Register `PlatformReportService` in the SaaS module/provider list.

BFF:

- Create `apps/bff/src/app/modules/reporting/reporting.module.ts`.
- Create `apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.ts`.
- Create `apps/bff/src/app/modules/reporting/controllers/admin-analytics.controller.ts`.
- Create `apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.spec.ts`.
- Create `apps/bff/src/app/modules/reporting/controllers/admin-analytics.controller.spec.ts`.
- Modify `apps/bff/src/app/app.module.ts`: import `ReportingModule`.
- Reuse existing TCP client providers from Payment/Order/Catalog/SaaS modules when possible; otherwise define reporting module providers using the same local provider pattern as sibling modules.

Management App:

- Add shadcn chart component if missing:
  - `pnpm dlx shadcn@latest add chart`
- Modify `apps/management-app/src/constants/api.ts`: add report endpoint constants.
- Create `apps/management-app/src/features/reports/types.ts`.
- Create `apps/management-app/src/features/reports/api.ts`.
- Create `apps/management-app/src/features/reports/hooks/use-report-query.ts`.
- Create `apps/management-app/src/features/reports/utils/report-formatters.ts`.
- Create `apps/management-app/src/features/reports/components/report-range-filter.tsx`.
- Create `apps/management-app/src/features/reports/components/report-metric-card.tsx`.
- Create `apps/management-app/src/features/reports/components/report-state.tsx`.
- Create `apps/management-app/src/features/reports/components/revenue-trend-chart.tsx`.
- Create `apps/management-app/src/features/reports/components/payment-method-chart.tsx`.
- Create `apps/management-app/src/features/reports/components/top-items-table.tsx`.
- Create `apps/management-app/src/features/reports/components/table-status-summary.tsx`.
- Create `apps/management-app/src/features/reports/components/recent-payments-table.tsx`.
- Create `apps/management-app/src/features/reports/components/platform-revenue-chart.tsx`.
- Create `apps/management-app/src/features/reports/components/tenant-drilldown-panel.tsx`.
- Create `apps/management-app/src/features/reports/tenant-dashboard-client.tsx`.
- Create `apps/management-app/src/features/reports/admin-analytics-client.tsx`.
- Modify `apps/management-app/src/app/(dashboard)/dashboard/page.tsx`: render tenant dashboard client.
- Modify `apps/management-app/src/app/(admin)/admin/analytics/page.tsx`: render admin analytics client.
- Modify `libs/shared/constants/src/lib/vi-domain-labels.ts` only if report statuses/method labels are missing.
- Modify `libs/shared/constants/src/index.ts` if new label helpers are added.

Docs:

- Modify `docs/architecture/permission-matrix.md`: add report permissions to the matrix.
- Modify `docs/README.md` only if the team wants Phase 4D to appear in the doc map immediately.
- Modify `docs/implementation_plan.md` only if roadmap weights/phases are being tracked as part of this implementation.

## Shared Contracts

### Task 1 - Add RBAC And TCP Contract Baseline

- [ ] Add `PERMISSION.REPORT_READ_OWN = 'report.read_own'`.
- [ ] Add `PERMISSION.REPORT_READ_ANY = 'report.read_any'`.
- [ ] Add the permissions to role seed data:
  - [ ] `SUPER_ADMIN`: both report permissions.
  - [ ] `OWNER`: `report.read_own`.
  - [ ] `MANAGER`: `report.read_own`.
  - [ ] staff roles: no report permissions.
- [ ] Update role seed tests so counts/expectations reflect the two new permissions.
- [ ] Add TCP message constants:
  - [ ] `TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE = 'payment.report_revenue'`
  - [ ] `TCP_REQUEST_MESSAGE.ORDER.REPORT_ORDERS = 'order.report_orders'`
  - [ ] `TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES = 'catalog.report_tables'`
  - [ ] `TCP_REQUEST_MESSAGE.SUBSCRIPTION.REPORT_PLATFORM = 'subscription.report_platform'`
- [ ] Add shared report request/response interfaces according to the design spec.
- [ ] Add gateway query DTO with class-validator decorators:
  - [ ] optional `from`
  - [ ] optional `to`
  - [ ] optional `grain`
  - [ ] optional `timezone`
  - [ ] optional `limit`
- [ ] Implement/centralize query normalization:
  - [ ] default timezone `Asia/Ho_Chi_Minh`.
  - [ ] default range last 7 days.
  - [ ] cap range at 90 days.
  - [ ] cap limit at 20.
- [ ] Avoid duplicate date-range parsers; if more than one boundary needs normalization, extract a shared pure helper instead of copying logic.
- [ ] Update exports for new interface/DTO modules.

Verification:

- [ ] `pnpm exec jest --config apps/user-access/jest.config.cts --runInBand apps/user-access/src/seeder/role.spec.ts`
- [ ] `pnpm exec tsc -p apps/bff/tsconfig.spec.json --noEmit`

## Backend Services

### Task 2 - Payment Revenue Report

Scope:

- `apps/payment/src/app/modules/payment/repositories/payment.repository.ts`
- `apps/payment/src/app/modules/payment/services/payment-report.service.ts`
- `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`
- `apps/payment/src/app/modules/payment/payment.module.ts`
- `apps/payment/src/app/modules/payment/tests/payment-report.service.spec.ts`

Implementation steps:

- [ ] Write tests first for:
  - [ ] empty tenant/range returns zero totals and empty arrays.
  - [ ] only `PaymentStatus.PAID` contributes to revenue.
  - [ ] different tenants do not leak into aggregates.
  - [ ] payment method breakdown separates cash and VietQR/SePay methods.
  - [ ] recent payments are sorted descending by `paidAt`.
- [ ] Add repository aggregate methods:
  - [ ] revenue series grouped by normalized bucket.
  - [ ] summary totals: `grossSalesVnd`, `collectedVnd`, `roundingDeltaVnd`, `paidPaymentCount`.
  - [ ] method breakdown.
  - [ ] recent paid payments with limit.
- [ ] Implement `PaymentReportService.getRevenueReport(request)`.
- [ ] Ensure all amount fields are numbers/integer VND.
- [ ] Do not derive new VND amounts from raw arithmetic unless using `roundVnd()` from `@qrtable/utils`; prefer stored rounded totals.
- [ ] Ensure `generatedAt` is produced server-side.
- [ ] Add controller `@MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE)`.
- [ ] Register the service in the module.

Rules:

- [ ] Do not read Order/Bill tables from Payment service.
- [ ] Use `payment.tenantId` in every repository query.
- [ ] Use existing Payment mapper/status constants where available.
- [ ] Do not return provider raw payload or OAuth/bank secrets.

Verification:

- [ ] `pnpm exec jest --config apps/payment/jest.config.cts --runInBand apps/payment/src/app/modules/payment/tests/payment-report.service.spec.ts`
- [ ] `pnpm exec jest --config apps/payment/jest.config.cts --runInBand`

### Task 3 - Order And Bill Report

Scope:

- `apps/order/src/app/modules/order/repositories/order.repository.ts`
- `apps/order/src/app/modules/order/repositories/bill.repository.ts`
- `apps/order/src/app/modules/order/repositories/order-item.repository.ts`
- `apps/order/src/app/modules/order/services/order-report.service.ts`
- `apps/order/src/app/modules/order/controllers/order.controller.ts`
- `apps/order/src/app/modules/order/order.module.ts`
- `apps/order/src/app/modules/order/tests/order-report.service.spec.ts`

Implementation steps:

- [ ] Write tests first for:
  - [ ] empty range.
  - [ ] tenant isolation.
  - [ ] cancelled orders excluded from top item revenue.
  - [ ] bill status breakdown returns expected statuses.
  - [ ] average paid bill handles zero paid bills without `NaN`.
- [ ] Add repository aggregate methods:
  - [ ] order count series by bucket.
  - [ ] completed/cancelled counts.
  - [ ] bill status breakdown.
  - [ ] paid bill count and average paid bill value.
  - [ ] top items by quantity/revenue.
- [ ] Implement `OrderReportService.getOrderReport(request)`.
- [ ] Add controller `@MessagePattern(TCP_REQUEST_MESSAGE.ORDER.REPORT_ORDERS)`.
- [ ] Register the service in the module.

Rules:

- [ ] Use existing `OrderStatus` and `BillStatus` constants from `@einvoice/types`.
- [ ] Use `roundVnd()` from `@qrtable/utils` for any newly derived item revenue; prefer persisted rounded totals where available.
- [ ] Use tenant-scoped repository queries only.
- [ ] Do not read Payment tables from Order service.
- [ ] Prefer `paidAt` for paid bill metrics where the field exists.

Verification:

- [ ] `pnpm exec jest --config apps/order/jest.config.cts --runInBand apps/order/src/app/modules/order/tests/order-report.service.spec.ts`
- [ ] `pnpm exec jest --config apps/order/jest.config.cts --runInBand`

### Task 4 - Catalog Table/Menu Report

Scope:

- Catalog table/menu repositories or services that own table/menu read queries.
- New catalog report service and tests.
- Relevant Catalog controller/module.

Implementation steps:

- [ ] Read Catalog module structure before choosing placement.
- [ ] Write tests first for:
  - [ ] tenant isolation.
  - [ ] empty tenant returns zero counts.
  - [ ] table status counts.
  - [ ] menu availability/stock counts.
- [ ] Implement table status summary.
- [ ] Implement menu item availability summary.
- [ ] Add controller message pattern `TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES`.
- [ ] Register report service.

Rules:

- [ ] Do not read Order/session tables from Catalog.
- [ ] Return wire status values; frontend maps them to labels.
- [ ] Keep the response small and dashboard-oriented.

Verification:

- [ ] `pnpm exec jest --config apps/catalog/jest.config.cts --runInBand <catalog-report-test-path>`
- [ ] `pnpm exec jest --config apps/catalog/jest.config.cts --runInBand`

### Task 5 - SaaS Platform Report

Scope:

- `apps/saas/src/services/platform-report.service.ts`
- `apps/saas/src/services/platform-report.service.spec.ts`
- `apps/saas/src/repositories/subscription-invoice.repository.ts`
- tenant/subscription repositories used by current SaaS services.
- `apps/saas/src/controllers/saas.controller.ts`

Implementation steps:

- [ ] Write tests first for:
  - [ ] empty range.
  - [ ] platform revenue from paid subscription invoices.
  - [ ] invoice status breakdown.
  - [ ] tenant status breakdown.
  - [ ] plan distribution.
- [ ] Add subscription invoice aggregate methods:
  - [ ] platform revenue summary.
  - [ ] revenue series by paid time.
  - [ ] invoice status totals.
- [ ] Add tenant/subscription aggregate methods for counts/breakdowns.
- [ ] Implement `PlatformReportService.getPlatformReport(request)`.
- [ ] Add controller message pattern `TCP_REQUEST_MESSAGE.SUBSCRIPTION.REPORT_PLATFORM`.
- [ ] Register the service.

Rules:

- [ ] Do not read restaurant Payment/Order/Catalog data from SaaS.
- [ ] Label response fields as `platformRevenueVnd`, not generic `revenue`.
- [ ] Use existing SaaS invoice/tenant/subscription status constants.

Verification:

- [ ] `pnpm exec jest --config apps/saas/jest.config.cts --runInBand apps/saas/src/services/platform-report.service.spec.ts`
- [ ] `pnpm exec jest --config apps/saas/jest.config.cts --runInBand`

## BFF Reporting Module

### Task 6 - Dashboard And Admin Analytics Routes

Scope:

- `apps/bff/src/app/modules/reporting/reporting.module.ts`
- `apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.ts`
- `apps/bff/src/app/modules/reporting/controllers/admin-analytics.controller.ts`
- BFF app module import.
- BFF controller specs.

Implementation steps:

- [ ] Create `ReportingModule`.
- [ ] Wire TCP clients for Payment, Order, Catalog, and SaaS using the same provider pattern as sibling BFF modules.
- [ ] Implement tenant dashboard routes:
  - [ ] `GET /dashboard/reports/revenue`
  - [ ] `GET /dashboard/reports/orders`
  - [ ] `GET /dashboard/reports/tables`
- [ ] Implement admin routes:
  - [ ] `GET /admin/analytics/platform`
  - [ ] `GET /admin/analytics/tenants/:tenantId/reports/revenue`
  - [ ] `GET /admin/analytics/tenants/:tenantId/reports/orders`
  - [ ] `GET /admin/analytics/tenants/:tenantId/reports/tables`
- [ ] Apply `@Permissions([PERMISSION.REPORT_READ_OWN])` to tenant routes.
- [ ] Apply `@Permissions([PERMISSION.REPORT_READ_ANY])` to admin analytics routes.
- [ ] Normalize and validate query DTO before TCP forwarding.
- [ ] For own-tenant routes, use tenant id from request context, not query string.
- [ ] For Super Admin tenant drilldown, use `:tenantId` path param explicitly.

Tests:

- [ ] Dashboard routes use `REPORT_READ_OWN`.
- [ ] Admin routes use `REPORT_READ_ANY`.
- [ ] Own-tenant routes forward `req.tenantId`.
- [ ] Admin drilldown routes forward path tenant id.
- [ ] Invalid date range returns validation error.
- [ ] Correct TCP pattern is used for each route.
- [ ] BFF does not call more services than the route owns.

Verification:

- [ ] `pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.spec.ts apps/bff/src/app/modules/reporting/controllers/admin-analytics.controller.spec.ts`
- [ ] `pnpm exec jest --config apps/bff/jest.config.cts --runInBand`

## Frontend Implementation

### Task 7 - shadcn Chart Baseline And Report API

Scope:

- `apps/management-app/components.json`
- shadcn chart component files added by CLI.
- `apps/management-app/src/constants/api.ts`
- `apps/management-app/src/features/reports/`

Implementation steps:

- [ ] Check whether `chart` component exists under the app's UI component path.
- [ ] If missing, run `pnpm dlx shadcn@latest add chart` from repo root or app context according to existing shadcn setup.
- [ ] Add API constants:
  - [ ] tenant revenue report.
  - [ ] tenant order report.
  - [ ] tenant table report.
  - [ ] platform analytics.
  - [ ] admin tenant drilldown revenue/order/table reports.
- [ ] Create frontend report types matching BFF responses.
- [ ] Create API functions using existing authenticated fetch/client pattern from `features/saas/api.ts` and `features/staff/api.ts`.
- [ ] Create React Query hooks:
  - [ ] `useTenantRevenueReport`
  - [ ] `useTenantOrderReport`
  - [ ] `useTenantTableReport`
  - [ ] `usePlatformAnalyticsReport`
  - [ ] `useAdminTenantReportDrilldown`
- [ ] Ensure query keys include range/grain/tenant id where relevant.
- [ ] Add VND/chart formatters without duplicating existing shared utilities.

Verification:

- [ ] `pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand <new-report-hook-test-path-if-added>`
- [ ] `pnpm exec tsc -p apps/management-app/tsconfig.json --noEmit`

### Task 8 - Tenant Dashboard UI

Scope:

- `apps/management-app/src/app/(dashboard)/dashboard/page.tsx`
- `apps/management-app/src/features/reports/tenant-dashboard-client.tsx`
- tenant report components.

Implementation steps:

- [ ] Replace placeholder `/dashboard` content with tenant dashboard.
- [ ] Create a range/grain filter with default last 7 days/day grain.
- [ ] Render KPI cards:
  - [ ] sales revenue.
  - [ ] collected amount.
  - [ ] paid payments/bills.
  - [ ] average paid value.
- [ ] Render revenue trend chart using shadcn `ChartContainer`.
- [ ] Render payment method breakdown chart.
- [ ] Render top items table.
- [ ] Render order/bill status summary.
- [ ] Render table status summary.
- [ ] Render recent paid payments table.
- [ ] Implement loading state with skeletons.
- [ ] Implement empty state for zero-data range.
- [ ] Implement section-level error state with retry.
- [ ] Ensure staff roles without report permission do not see report-only actions if frontend permission helpers exist.
- [ ] Avoid raw enum labels; use shared label helpers.

Responsive requirements:

- [ ] Desktop: KPI cards in 4-column grid when space allows.
- [ ] Tablet: KPI cards in 2-column grid.
- [ ] Mobile: KPI cards stack, charts remain readable, tables do not clip.

Verification:

- [ ] `pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/reports/<tenant-dashboard-test>.spec.tsx`
- [ ] Browser smoke: open `/dashboard` as an Owner/Manager test account and verify charts are nonblank.

### Task 9 - Super Admin Analytics UI

Scope:

- `apps/management-app/src/app/(admin)/admin/analytics/page.tsx`
- `apps/management-app/src/features/reports/admin-analytics-client.tsx`
- admin/platform report components.

Implementation steps:

- [ ] Replace placeholder `/admin/analytics` content with platform analytics.
- [ ] Create platform range/grain filter.
- [ ] Render KPI cards:
  - [ ] platform revenue.
  - [ ] paid subscription invoices.
  - [ ] active tenants.
  - [ ] suspended tenants.
- [ ] Render platform revenue trend chart.
- [ ] Render tenant status breakdown.
- [ ] Render invoice status breakdown.
- [ ] Render plan distribution.
- [ ] Add explicit tenant drilldown panel:
  - [ ] tenant select/search using existing admin tenant API if available.
  - [ ] selected tenant identity is visible.
  - [ ] drilldown loads selected tenant revenue/order/table reports.
  - [ ] drilldown labels make clear that this is restaurant sales, not platform revenue.
- [ ] Implement loading, empty, error, and partial-data states.
- [ ] Avoid raw enum labels.

Verification:

- [ ] `pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/reports/<admin-analytics-test>.spec.tsx`
- [ ] Browser smoke: open `/admin/analytics` as Super Admin and verify platform charts and drilldown controls are visible.

## Documentation Updates

### Task 10 - Permission Matrix And Roadmap Docs

- [ ] Update `docs/architecture/permission-matrix.md`:
  - [ ] add `report.read_own`.
  - [ ] add `report.read_any`.
  - [ ] update role permission counts.
  - [ ] confirm staff roles remain excluded.
- [ ] If implementation changes the planned route or response contract, update `docs/phases/phase-4d-dashboard-reporting.md`.
- [ ] If the team tracks roadmap percentages, update `docs/implementation_plan.md` to place Phase 4D after Phase 4C and before Phase 5-7.
- [ ] If doc anchors are updated, run `pnpm verify:doc-anchors`.

## Cursor Composer / Sub-Agent Handoff

This section is for a fresh AI coding session coordinating multiple workers. The coordinator should keep this plan open and dispatch work by dependency wave.

### Shared Context For Every Sub-Agent

Paste this context into every sub-agent before task-specific instructions:

```text
You are implementing QRTable Phase 4D Dashboard & Reporting in an Nx monorepo.

Read these files before editing:
- AGENTS.md
- docs/phases/phase-4d-dashboard-reporting.md
- docs/superpowers/specs/2026-06-01-phase-4d-dashboard-reporting-design.md
- docs/superpowers/plans/2026-06-01-phase-4d-dashboard-reporting.md
- docs/technical-architecture.md
- docs/business-logic.md
- docs/architecture/permission-matrix.md

Hard requirements:
- Use CodeGraph first to understand impacted code paths.
- Preserve service boundaries: Payment owns payment reports, Order owns order/bill reports, Catalog owns table/menu availability reports, SaaS owns platform subscription reports.
- BFF is a guarded HTTP proxy and validation edge only.
- Do not create a new Analytics service in Phase 4D.
- Do not import another service's entity/repository directly.
- Add explicit report permissions: report.read_own and report.read_any.
- Owner/Manager may read own tenant reports only.
- Super Admin may read platform analytics and explicit tenant drilldown reports.
- Staff roles must not receive report permissions.
- Use TDD for backend services and BFF route contracts.
- Use shadcn Chart/Card/Table/Tabs/Select/Skeleton/Badge patterns for dashboard UI.
- Do not render raw wire enum labels in Management App UI.
- Keep amounts as integer VND and preserve existing VND rounding semantics.
- Return changed files, test commands run, pass/fail result, and any pre-existing failures.
```

### Dependency Waves

| Wave | Assignment                                   | Can Run In Parallel                                            | Required Before                  |
| ---- | -------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| 1    | Shared RBAC, TCP, gateway contracts          | No                                                             | All service/BFF/frontend work    |
| 2A   | Payment revenue report                       | Yes, after Wave 1                                              | BFF revenue route integration    |
| 2B   | Order/bill report                            | Yes, after Wave 1                                              | BFF order route integration      |
| 2C   | Catalog table/menu report                    | Yes, after Wave 1                                              | BFF table route integration      |
| 2D   | SaaS platform report                         | Yes, after Wave 1                                              | Admin platform route integration |
| 3    | BFF reporting module                         | After Wave 1; can mock service responses while Wave 2 finishes | Frontend live integration        |
| 4A   | Frontend API/hooks and shadcn chart baseline | After Wave 1 and BFF route names                               | UI pages                         |
| 4B   | Tenant dashboard UI                          | After 4A                                                       | Browser smoke                    |
| 4C   | Super Admin analytics UI                     | After 4A                                                       | Browser smoke                    |
| 5    | Docs, verification, and final review         | No                                                             | Completion claim                 |

### Sub-Agent Assignment Prompts

#### Agent A - Shared Contracts And RBAC

```text
Implement Wave 1 from docs/superpowers/plans/2026-06-01-phase-4d-dashboard-reporting.md.

Scope:
- libs/constants/src/lib/enum/role.enum.ts
- libs/constants/src/lib/enum/tcp-request-message.ts
- apps/user-access/src/seeder/role.json
- apps/user-access/src/seeder/role.spec.ts
- libs/interfaces/src/lib/tcp/** report-related request/response interfaces
- libs/interfaces/src/lib/gateway/report/** DTOs and exports
- docs/architecture/permission-matrix.md only if you complete RBAC docs in this wave

Goal:
- Add explicit report permissions and typed report contracts.
- Keep contracts aligned with the Phase 4D design spec.
- Do not add implementation logic in apps beyond seed tests.

Verification:
- pnpm exec jest --config apps/user-access/jest.config.cts --runInBand apps/user-access/src/seeder/role.spec.ts
- pnpm exec tsc -p apps/bff/tsconfig.spec.json --noEmit
```

#### Agent B - Payment Revenue Report

```text
Implement Task 2 after Agent A contracts are merged.

Scope:
- apps/payment/src/app/modules/payment/repositories/payment.repository.ts
- apps/payment/src/app/modules/payment/services/payment-report.service.ts
- apps/payment/src/app/modules/payment/controllers/payment.controller.ts
- apps/payment/src/app/modules/payment/payment.module.ts
- apps/payment/src/app/modules/payment/tests/payment-report.service.spec.ts

Goal:
- Add tenant-scoped paid-payment revenue reporting with revenue series, payment method breakdown, recent payments, and summary metrics.
- Include only PAID payments for realized revenue.
- Never read Order service tables.

Verification:
- pnpm exec jest --config apps/payment/jest.config.cts --runInBand apps/payment/src/app/modules/payment/tests/payment-report.service.spec.ts
- pnpm exec jest --config apps/payment/jest.config.cts --runInBand
```

#### Agent C - Order/Bill Report

```text
Implement Task 3 after Agent A contracts are merged.

Scope:
- apps/order/src/app/modules/order/repositories/order.repository.ts
- apps/order/src/app/modules/order/repositories/bill.repository.ts
- apps/order/src/app/modules/order/repositories/order-item.repository.ts
- apps/order/src/app/modules/order/services/order-report.service.ts
- apps/order/src/app/modules/order/controllers/order.controller.ts
- apps/order/src/app/modules/order/order.module.ts
- apps/order/src/app/modules/order/tests/order-report.service.spec.ts

Goal:
- Add tenant-scoped order/bill reporting with order series, bill status breakdown, paid bill metrics, and top menu items.
- Exclude cancelled orders from top item revenue.
- Never read Payment service tables.

Verification:
- pnpm exec jest --config apps/order/jest.config.cts --runInBand apps/order/src/app/modules/order/tests/order-report.service.spec.ts
- pnpm exec jest --config apps/order/jest.config.cts --runInBand
```

#### Agent D - Catalog Table/Menu Report

```text
Implement Task 4 after Agent A contracts are merged.

Scope:
- Catalog table/menu repository/service files discovered through CodeGraph.
- New catalog report service and focused tests.
- Relevant Catalog controller/module registration.

Goal:
- Add tenant-scoped table status and menu availability summary for dashboards.
- Keep Catalog as the only owner of table/menu availability reporting.

Verification:
- pnpm exec jest --config apps/catalog/jest.config.cts --runInBand <new catalog report spec>
- pnpm exec jest --config apps/catalog/jest.config.cts --runInBand
```

#### Agent E - SaaS Platform Report

```text
Implement Task 5 after Agent A contracts are merged.

Scope:
- apps/saas/src/services/platform-report.service.ts
- apps/saas/src/services/platform-report.service.spec.ts
- apps/saas/src/repositories/subscription-invoice.repository.ts
- tenant/subscription repositories as needed
- apps/saas/src/controllers/saas.controller.ts

Goal:
- Add platform subscription analytics: platform revenue, invoice status breakdown, tenant status breakdown, and plan distribution.
- Do not read restaurant order/payment/catalog data from SaaS.

Verification:
- pnpm exec jest --config apps/saas/jest.config.cts --runInBand apps/saas/src/services/platform-report.service.spec.ts
- pnpm exec jest --config apps/saas/jest.config.cts --runInBand
```

#### Agent F - BFF Reporting Routes

```text
Implement Task 6 after Agent A contracts are merged. You may mock downstream service responses while Agents B-E finish.

Scope:
- apps/bff/src/app/modules/reporting/reporting.module.ts
- apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.ts
- apps/bff/src/app/modules/reporting/controllers/admin-analytics.controller.ts
- apps/bff/src/app/modules/reporting/controllers/*.spec.ts
- apps/bff/src/app/app.module.ts

Goal:
- Expose guarded dashboard/admin report HTTP routes.
- Own-tenant routes use report.read_own and req.tenantId.
- Admin routes use report.read_any and explicit :tenantId for drilldown.
- BFF validates/normalizes query and forwards TCP. No report business logic.

Verification:
- pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.spec.ts apps/bff/src/app/modules/reporting/controllers/admin-analytics.controller.spec.ts
- pnpm exec jest --config apps/bff/jest.config.cts --runInBand
```

#### Agent G - Frontend Reports API And Hooks

```text
Implement Task 7 after route contracts are stable.

Scope:
- apps/management-app/src/constants/api.ts
- apps/management-app/src/features/reports/types.ts
- apps/management-app/src/features/reports/api.ts
- apps/management-app/src/features/reports/hooks/use-report-query.ts
- apps/management-app/src/features/reports/utils/report-formatters.ts
- shadcn chart component files if missing

Goal:
- Add typed frontend access to Phase 4D BFF endpoints.
- Install/use shadcn chart component if it is not already present.
- Match existing Saas/Staff feature API style.

Verification:
- pnpm exec tsc -p apps/management-app/tsconfig.json --noEmit
- pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand
```

#### Agent H - Tenant Dashboard UI

```text
Implement Task 8 after Agent G hooks are merged.

Scope:
- apps/management-app/src/app/(dashboard)/dashboard/page.tsx
- apps/management-app/src/features/reports/tenant-dashboard-client.tsx
- tenant report components under apps/management-app/src/features/reports/components/

Goal:
- Replace placeholder dashboard with Owner/Manager report UI.
- Use shadcn Card/Chart/Table/Skeleton/Badge patterns.
- Handle loading, empty, error, and populated states.
- Keep responsive layout clean on desktop and mobile.

Verification:
- pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand
- Browser smoke /dashboard as Owner or Manager
```

#### Agent I - Super Admin Analytics UI

```text
Implement Task 9 after Agent G hooks are merged.

Scope:
- apps/management-app/src/app/(admin)/admin/analytics/page.tsx
- apps/management-app/src/features/reports/admin-analytics-client.tsx
- admin/platform report components under apps/management-app/src/features/reports/components/

Goal:
- Replace placeholder admin analytics with platform analytics and explicit tenant drilldown.
- Clearly separate platform subscription revenue from selected tenant sales revenue.
- Use shadcn dashboard/chart components and robust states.

Verification:
- pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand
- Browser smoke /admin/analytics as Super Admin
```

#### Agent J - Verification And Docs

```text
Run final Phase 4D verification and doc cleanup after all implementation waves are merged.

Scope:
- docs/architecture/permission-matrix.md
- docs/phases/phase-4d-dashboard-reporting.md if implementation changed decisions/contracts
- docs/implementation_plan.md if roadmap tracking is updated
- focused backend/frontend/e2e test commands

Goal:
- Collect final evidence before completion claim.
- Confirm no service boundary violations and no raw enum UI labels.

Verification:
- pnpm exec jest --config apps/user-access/jest.config.cts --runInBand apps/user-access/src/seeder/role.spec.ts
- pnpm exec jest --config apps/payment/jest.config.cts --runInBand
- pnpm exec jest --config apps/order/jest.config.cts --runInBand
- pnpm exec jest --config apps/catalog/jest.config.cts --runInBand
- pnpm exec jest --config apps/saas/jest.config.cts --runInBand
- pnpm exec jest --config apps/bff/jest.config.cts --runInBand
- pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand
- pnpm verify:doc-anchors if doc anchors changed
```

## Final Verification Checklist

Do not claim Phase 4D complete until these are true:

- [ ] New permissions compile, seed, and docs agree.
- [ ] Owner/Manager routes use `report.read_own`.
- [ ] Super Admin analytics routes use `report.read_any`.
- [ ] Payment report only queries Payment persistence.
- [ ] Order report only queries Order persistence.
- [ ] Catalog report only queries Catalog persistence.
- [ ] SaaS report only queries SaaS persistence.
- [ ] BFF does not aggregate by querying databases directly.
- [ ] Frontend dashboard and admin analytics use real API hooks.
- [ ] Charts use shadcn chart patterns.
- [ ] Empty/error/loading states are present.
- [ ] No raw wire enum is rendered in UI.
- [ ] VND values are formatted consistently.
- [ ] Report range normalization has one shared owner if used in multiple runtime boundaries.
- [ ] Browser smoke checks pass on desktop and mobile widths.
- [ ] Test command output is recorded in the final handoff.

## Known Risks And Guardrails

- Revenue semantics can drift if Payment and Order both calculate money. Keep Payment responsible for realized payment revenue and Order responsible for order/bill lifecycle metrics.
- Super Admin views can accidentally blend platform subscription revenue and restaurant sales revenue. Keep labels explicit.
- Aggregate queries can become slow if range limits are ignored. Enforce the 90-day cap in BFF and source services.
- Date grouping can be wrong if UTC boundaries are mixed with Vietnam business days. Normalize with `Asia/Ho_Chi_Minh` and test bucket boundaries.
- Frontend chart code can break on empty arrays. Every chart component needs a zero/empty state.
- Permission counts in seed tests will change. Update the expected counts intentionally, not by deleting assertions.
