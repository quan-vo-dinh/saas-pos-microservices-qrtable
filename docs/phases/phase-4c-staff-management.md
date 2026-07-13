# Phase 4C — Staff Management

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Tenant-scoped staff listing, creation/provisioning, role assignment, activation/deactivation, and management UI operations.
- The integration boundary across User-Access, BFF, and Management App.

## Accepted Decisions

- User-Access owns staff profiles, tenant membership, and roles; BFF is the guarded edge; Management App is the staff-management client.
- Staff operations are tenant-scoped and permission-protected; a request cannot assign or manage staff across tenants.
- Keycloak identity and User-Access profile provisioning remain distinct responsibilities.
- Notification/email is excluded from the accepted Staff Management scope.

## Final Business Behavior

- Authorized tenant administrators can view and manage their staff membership and roles within their tenant.
- Inactive or unauthorized staff cannot use management capabilities beyond their valid access boundary.

## Final Technical Behavior

- User-Access exposes the owning staff/profile contracts and persistence; BFF applies authentication, tenant, and permission guards before proxying commands.
- Management App consumes BFF staff APIs and reflects server-side role/status results using the shared display conventions.
- Tests cover the User-Access contract, BFF authorization/transport edge, and Management App staff flows.

## Acceptance Evidence

- User Access owns the staff service and focused tests: [StaffManagementService](../../apps/user-access/src/app/modules/user/services/staff-management.service.ts) and [staff-management.service.spec.ts](../../apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts).
- BFF enforces the tenant/actor transport boundary through [DashboardStaffController](../../apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.ts) and [dashboard-staff.controller.spec.ts](../../apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts).
- Management App provides the staff-management client in [StaffPageClient](../../apps/management-app/src/features/staff/staff-page-client.tsx), with policy evidence in [staff-page-policy.spec.tsx](../../apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx).

## Deferred Work

- Advanced HRM, scheduling, payroll, attendance, onboarding communications, and notification/email workflows are deferred.
