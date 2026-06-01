# Phase 4D.1 Dashboard Entitlements & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan. Use `clean-code-ts`, `frontend-design`, `frontend-patterns`, `shadcn`, `shadcn-component-discovery`, `shadcn-component-review`, and `verification-before-completion`.

**Goal:** Add package-based dashboard entitlement gating and polish the Phase 4D dashboard UI into a product-grade SaaS reporting experience.

**Architecture:** Keep Phase 4D report data ownership unchanged. BFF owns HTTP policy enforcement for tenant dashboard report routes. Source services continue to own only their data reads. Management App renders plan-aware dashboard states with shadcn dashboard/chart/card/table patterns.

**Tech Stack:** Nx monorepo, NestJS BFF guards/decorators, SaaS subscription data, Next.js 16, React 19, TanStack Query, shadcn/Radix UI, Recharts through shadcn Chart, lucide-react icons, Jest, browser smoke checks.

---

## Reference Context

- Base Phase 4D record: `docs/phases/phase-4d-dashboard-reporting.md`
- Base Phase 4D spec: `docs/superpowers/specs/2026-06-01-phase-4d-dashboard-reporting-design.md`
- Base Phase 4D plan: `docs/superpowers/plans/2026-06-01-phase-4d-dashboard-reporting.md`
- Addendum spec: `docs/superpowers/specs/2026-06-01-phase-4d-dashboard-entitlements-ui-addendum.md`
- SaaS package source: `docs/specs/business-logic-phase-4b-spec.md` §5.2
- UI display rule: `docs/guides/frontend-domain-display.md`
- Existing report UI:
  - `apps/management-app/src/features/reports/tenant-dashboard-client.tsx`
  - `apps/management-app/src/features/reports/admin-analytics-client.tsx`
  - `apps/management-app/src/features/reports/components/`
- Existing subscription UI/data:
  - `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx`
  - `apps/management-app/src/features/saas/subscription/current-plan-panel.tsx`
  - `apps/management-app/src/features/saas/api.ts`
- Existing guard:
  - `libs/guards/src/lib/tenant-plan.guard.ts`

## Start Protocol

- [ ] Read `AGENTS.md`.
- [ ] Run CodeGraph first:
  - [ ] `codegraph status .`
  - [ ] `codegraph query "TenantPlanGuard analytics_basic analytics_advanced report dashboard subscription features"`
  - [ ] `codegraph query "features reports tenant-dashboard-client admin-analytics-client"`
- [ ] Read this plan and the addendum spec.
- [ ] Use Context7 or `ctx7` for current shadcn/ui docs before implementing dashboard UI patterns.
- [ ] Search shadcn registry before building custom layout/chart primitives:
  - [ ] `pnpm dlx shadcn@latest search @shadcn -q dashboard`
  - [ ] `pnpm dlx shadcn@latest search @shadcn -q chart`
- [ ] Do not rewrite Phase 4D report aggregation services unless tests prove a bug.
- [ ] Check dirty worktree before editing; do not overwrite unrelated user/agent changes.

## Wave 1 - Canonical Plan Feature Codes

### Task 1.1 - Backend Feature Constants

Scope:

- `libs/constants/src/lib/saas.constants.ts`

Steps:

- [ ] Add canonical plan feature codes:
  - [ ] `basic_pos`
  - [ ] `analytics_basic`
  - [ ] `analytics_advanced`
  - [ ] `priority_support`
- [ ] Export a type such as `PlanFeatureCode`.
- [ ] Prefer `as const` objects over string unions duplicated by hand.
- [ ] Do not remove existing feature labels.

### Task 1.2 - Frontend Shared Feature Mirror

Scope:

- `libs/shared/constants/src/lib/saas-wire-types.ts`
- `libs/shared/constants/src/lib/saas-wire-types.spec.ts`
- `libs/shared/constants/src/index.ts`
- `libs/shared/constants/src/lib/vi-domain-labels.ts`
- `libs/shared/constants/src/lib/vi-domain-labels.spec.ts`

Steps:

- [ ] Add `SAAS_PLAN_FEATURE` and `SaasPlanFeature`.
- [ ] Update test to compare frontend feature values with backend `PLAN_FEATURE_CODES`.
- [ ] Ensure `planFeatureVi()` covers every current feature code.
- [ ] Export the feature code constant/type from the shared constants barrel.

### Task 1.3 - Remove Local Feature Code Source

Scope:

- `apps/management-app/src/features/saas/admin-plans/plan-feature-picker.tsx`

Steps:

- [ ] Replace local `PLAN_FEATURE_WIRE_CODES` with shared feature code import.
- [ ] Keep UI labels through `planFeatureVi(code)`.
- [ ] Preserve existing picker behavior.

Verification:

- [ ] `pnpm exec jest --config libs/shared/constants/jest.config.ts --runInBand` if this project has a direct library Jest config.
- [ ] Otherwise run the relevant shared constants spec through the repo's existing Jest command.
- [ ] `pnpm exec tsc -p apps/management-app/tsconfig.json --noEmit`

## Wave 2 - BFF Plan Feature Entitlement Guard

### Task 2.1 - Decorator And Guard

Scope:

- `libs/decorators/src/lib/` or existing decorator package path
- `libs/guards/src/lib/tenant-plan.guard.ts` or new `plan-feature.guard.ts`
- `libs/guards/src/lib/*.spec.ts`
- `libs/error-messages/src/lib/error-code.enum.ts`
- `libs/error-messages/src/lib/error-messages.vi.ts`
- `libs/error-messages/src/lib/error-messages.en.ts`

Steps:

- [ ] Add `@RequiresPlanFeature(featureCode)` decorator.
- [ ] Add feature-aware guard behavior.
- [ ] Keep active-subscription behavior intact.
- [ ] Guard should allow routes with no required feature.
- [ ] Guard should fail closed when current subscription/feature context cannot be resolved.
- [ ] Return safe error details:
  - [ ] required feature
  - [ ] current plan code if known
  - [ ] upgrade URL `/dashboard/subscription`
- [ ] Do not expose Redis internals or raw stack traces.

Important design choice:

- If BFF already hydrates subscription context into request, use it.
- If not, create a small BFF-local resolver that calls SaaS `SUBSCRIPTION.GET_CURRENT` and caches only current plan code/features/status.
- Do not call Payment, Order, Catalog, or report services for entitlement decisions.

### Task 2.2 - Gate Tenant Report Routes

Scope:

- `apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.ts`
- `apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.spec.ts`

Steps:

- [ ] Add `@RequiresPlanFeature('analytics_basic')` to:
  - [ ] `GET /dashboard/reports/revenue`
  - [ ] `GET /dashboard/reports/orders`
  - [ ] `GET /dashboard/reports/tables`
- [ ] Keep `@Permissions([PERMISSION.REPORT_READ_OWN])`.
- [ ] Do not gate Super Admin analytics routes by tenant features.
- [ ] Add tests proving missing feature blocks before TCP forwarding.
- [ ] Add tests proving present feature forwards to the correct TCP pattern.

Optional later split:

- If the product owner wants strict advanced API protection immediately, split advanced-only fields/routes. Otherwise, enforce advanced gating in frontend for this addendum and keep backend route-level `analytics_basic`.

Verification:

- [ ] `pnpm exec jest --config libs/guards/jest.config.ts --runInBand` if available.
- [ ] `pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/reporting/controllers/dashboard-report.controller.spec.ts`
- [ ] `pnpm exec jest --config apps/bff/jest.config.cts --runInBand`

## Wave 3 - Frontend Entitlement Data Layer

Scope:

- `apps/management-app/src/features/reports/types.ts`
- `apps/management-app/src/features/reports/hooks/use-report-query.ts`
- `apps/management-app/src/features/reports/api.ts`
- `apps/management-app/src/features/reports/utils/`
- existing SaaS API/types if needed

Steps:

- [ ] Reuse existing subscription dashboard API to get current plan/features/usage.
- [ ] Add `DashboardEntitlements` derived type/helper:
  - [ ] `currentPlanCode`
  - [ ] `features`
  - [ ] `hasBasicAnalytics`
  - [ ] `hasAdvancedAnalytics`
  - [ ] `canUseExtendedRange`
  - [ ] `upgradeUrl`
- [ ] Ensure report hooks can be disabled with `enabled: false` when a widget is locked.
- [ ] Do not call blocked report APIs for FREE tenants.
- [ ] Parse missing-feature API error into a user-friendly locked/upgrade state.

Verification:

- [ ] Add focused tests for entitlement helper.
- [ ] Add hook/component tests proving locked state skips report API calls.
- [ ] `pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/reports`

## Wave 4 - Tenant Dashboard UI Polish

Scope:

- `apps/management-app/src/features/reports/tenant-dashboard-client.tsx`
- `apps/management-app/src/features/reports/components/`
- optional local assets under `apps/management-app/public/brands/` only if approved/available

### Task 4.1 - Plan-Aware Dashboard Header

- [ ] Add `dashboard-plan-overview-card.tsx`.
- [ ] Show current plan code/name, subscription status, quota bars, and upgrade CTA.
- [ ] Use `planFeatureVi()` for feature labels.
- [ ] Use `Badge`, `Card`, `CardAction`, `Button`, and lucide icons.

### Task 4.2 - Upgrade/Locked States

- [ ] Add `dashboard-feature-lock-card.tsx`.
- [ ] It should show:
  - [ ] required feature label
  - [ ] recommended plan (`BASIC` or `PREMIUM`)
  - [ ] upgrade CTA
  - [ ] lock/crown/sparkles icon
- [ ] Locked cards should occupy the same layout region as unlocked widgets.
- [ ] Avoid hiding whole sections without explanation.

### Task 4.3 - Metric Cards

- [ ] Replace or extend `ReportMetricCard` with `insight-metric-card.tsx`.
- [ ] Follow shadcn dashboard card style:
  - [ ] icon
  - [ ] `CardAction`
  - [ ] `Badge`
  - [ ] optional trend/footer text
  - [ ] tabular number styling
- [ ] Use semantic tokens only.

### Task 4.4 - Charts

- [ ] Upgrade revenue trend chart to area or interactive chart pattern.
- [ ] Upgrade payment method chart to donut chart with center label and legend.
- [ ] Keep shadcn `ChartContainer` and `ChartTooltipContent`.
- [ ] Ensure empty data produces a polished empty state.

### Task 4.5 - Advanced Insights

- [ ] Add `advanced-insights-section.tsx`.
- [ ] PREMIUM renders:
  - [ ] top selling items
  - [ ] payment method breakdown
  - [ ] recent payment reconciliation if available
- [ ] BASIC/FREE renders locked Premium cards.

Verification:

- [ ] `pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/reports`
- [ ] Browser smoke `/dashboard` for FREE, BASIC, PREMIUM states if fixtures/accounts exist.
- [ ] Browser smoke at 375px, 768px, 1280px.

## Wave 5 - Super Admin Analytics UI Context

Scope:

- `apps/management-app/src/features/reports/admin-analytics-client.tsx`
- `apps/management-app/src/features/reports/components/tenant-drilldown-panel.tsx`

Steps:

- [ ] Do not gate platform analytics by tenant package.
- [ ] Add selected tenant plan/feature context to drilldown panel if tenant list/detail API provides it.
- [ ] If tenant list does not include features, add a small drilldown detail fetch using existing SaaS API.
- [ ] Show whether the selected tenant would see analytics as locked/unlocked in its own dashboard.
- [ ] Keep Super Admin drilldown report access operational.
- [ ] Add platform metric cards with icons/action badges.

Verification:

- [ ] Super Admin platform analytics renders regardless of selected tenant package.
- [ ] Tenant drilldown visually displays selected tenant and plan context.
- [ ] No raw feature codes are shown.

## Wave 6 - Design And Component Review

Run this review after UI implementation:

- [ ] shadcn component review:
  - [ ] composition uses `CardHeader`, `CardContent`, `CardAction`, `CardFooter` where appropriate.
  - [ ] semantic colors only.
  - [ ] `gap-*` layout instead of margin soup.
  - [ ] mobile-first responsive classes.
  - [ ] no hardcoded neutral/gray/slate color utilities in report components unless existing design system requires it.
- [ ] frontend-design review:
  - [ ] dashboard first viewport tells the owner current plan + business health.
  - [ ] locked cards explain value without dark patterns.
  - [ ] upgrade CTA is clear but not deceptive.
  - [ ] dashboard remains dense/scannable for operational use.
- [ ] accessibility:
  - [ ] icon-only controls have labels/tooltips.
  - [ ] color is not the only indicator of locked/unlocked state.
  - [ ] touch targets are comfortable on mobile.

Optional audit:

- [ ] `python .agent/skills/frontend-design/scripts/ux_audit.py apps/management-app`

## Wave 7 - Docs And Verification

Docs:

- [ ] Update `docs/phases/phase-4d-dashboard-reporting.md` if implementation changes addendum decisions.
- [ ] Update `docs/guides/frontend-domain-display.md` if new feature-code display rules are added.
- [ ] Update `docs/architecture/permission-matrix.md` only if report permissions change. Entitlement features are not RBAC permissions.

Final verification:

- [ ] shared constants tests for plan feature code alignment.
- [ ] BFF reporting controller tests.
- [ ] Management App report tests.
- [ ] `pnpm verify:doc-anchors` if doc anchors changed.
- [ ] Browser smoke `/dashboard`.
- [ ] Browser smoke `/admin/analytics`.

## Sub-Agent Handoff

Use these assignments if coordinating in Cursor Composer:

### Agent A - Feature Constants

Implement Wave 1. Keep feature codes canonical and remove the local picker feature-code source.

Return:

- changed files
- tests run
- whether shared frontend feature codes match backend constants

### Agent B - BFF Entitlement Guard

Implement Wave 2. Add feature decorator/guard and gate tenant dashboard report routes.

Return:

- changed files
- route guard behavior
- tests proving missing feature blocks before TCP forwarding

### Agent C - Frontend Entitlement Data

Implement Wave 3. Derive dashboard entitlements from current subscription data and disable locked report queries.

Return:

- changed files
- helper/hook tests
- proof locked widgets skip report API calls

### Agent D - Tenant Dashboard UI Polish

Implement Wave 4 using shadcn dashboard/card/chart patterns.

Return:

- changed files
- screenshots or browser smoke notes if available
- responsive risks

### Agent E - Admin Analytics Polish

Implement Wave 5. Add plan context to tenant drilldown but do not gate Super Admin access.

Return:

- changed files
- tests/smoke result
- confirmation Super Admin route remains ungated by tenant plan

### Agent F - Final Review

Run Wave 6 and Wave 7. Focus on shadcn review, frontend design quality, verification output, and docs consistency.

Return:

- final test matrix
- remaining risks
- changed docs

## Completion Criteria

- [ ] FREE tenant: dashboard shell + quota + locked analytics.
- [ ] BASIC tenant: basic analytics + locked advanced insights.
- [ ] PREMIUM tenant: full analytics dashboard.
- [ ] Super Admin: platform analytics and tenant drilldown remain available.
- [ ] Report API calls are skipped for locked widgets.
- [ ] BFF enforces at least `analytics_basic` for tenant report routes.
- [ ] UI uses shadcn chart/card/table patterns and lucide icons.
- [ ] No raw plan feature code appears in user-facing UI.
- [ ] No source report service owns package entitlement logic.
- [ ] Tests and browser smoke evidence are captured.
