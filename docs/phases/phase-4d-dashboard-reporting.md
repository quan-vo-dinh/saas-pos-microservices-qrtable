# Phase 4D — Dashboard & Reporting

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Tenant owner/manager dashboard read models, Super Admin analytics, dashboard/report route boundaries, and plan-feature entitlements.
- Management App dashboard presentation of tenant operational/business information and platform-level analysis.

## Accepted Decisions

- Dashboard data is read-oriented and tenant-scoped; it does not create a cross-service shared database.
- Tenant reporting is guarded by subscription feature `analytics_basic`; Super Admin analytics remains an administration capability.
- UI uses shared SaaS wire types/labels and entitlement state rather than raw status values.
- The accepted scope is dashboard/reporting behavior, not a general analytics warehouse.

## Final Business Behavior

- Owners/Managers can view the tenant dashboard allowed by their plan, including locked upgrade states where entitlement is absent.
- Super Admin can view platform analytics and tenant drilldown within the administration boundary.

## Final Technical Behavior

- BFF routes combine owned service read contracts under existing guards; tenant subscription context is hydrated before feature checks.
- Management App derives dashboard entitlements from the subscription endpoint and avoids locked report requests.
- The accepted read-model routes, permissions, TCP additions, and frontend feature components are documented in the retained design artifacts.

## Acceptance Evidence

- Tenant and Super Admin dashboard routes, subscription/feature guards, read-model contracts, Management App dashboard components, and focused tests exist.
- The implemented Phase 4D.1 entitlement behavior verifies plan/quota display, locked FREE/BASIC cards, PREMIUM analytics access, and ungated Super Admin analytics.

## Deferred Work

- Scheduled exports, CSV/PDF export, realtime analytics streams, analytics storage, staff-performance analytics, forecasting, anomaly detection, and cohort analysis are deferred.
