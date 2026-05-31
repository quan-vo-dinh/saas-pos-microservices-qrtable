# Phase 4C — Staff Management

> **Tiếng Việt:** [phase-4c-staff-management.vi.md](phase-4c-staff-management.vi.md)

> **Goal:** Enable Owner/Manager to manage POS staff in the tenant: create/invite staff, assign roles, change roles, and disable accounts through the existing User-Access/Authorizer boundary. This phase deliberately removes the former Step 4.5 Notification Service from the implementation scope.
> **Estimated:** ~3-5 days
> **Status:** ⬜ TODO

## Scope Decision

Step 4.5 Notification Service is removed from the current project scope. The current codebase has no `apps/notification`, no `qrtable_notification` database, no SMTP/provider configuration, and no runtime consumer for email delivery. Phase 4C therefore focuses only on staff management.

Email delivery, receipt emails, welcome/suspend/expiry emails, reset-password emails, notification audit logs, and a standalone Notification service are kept as future extension candidates. They must not be counted as Phase 4C acceptance criteria, Phase 5 testing blockers, or thesis implementation evidence unless they are reintroduced in code later.

## Prerequisites

- Phase 4B completed — [phase-4b-saas-onboarding.md](phase-4b-saas-onboarding.md).
- User-Access owns user profile, role mapping, and tenant-side staff counts.
- Authorizer owns Keycloak user/role/disable operations.
- BFF remains the HTTP edge and applies `UserGuard` → `TenantGuard` → `PermissionGuard`.

## Reference

| Documents                 | Related Sections                                  |
| ------------------------- | ------------------------------------------------- |
| technical-architecture.md | §6.2.8 User-Access, §8 Authentication/RBAC        |
| business-logic.md         | §9 Permissions                                    |
| permission-matrix.md      | Canonical RBAC seed and staff-related permissions |

## Overview

Phase 4C closes the tenant staff management gap without introducing a new microservice. The source of truth stays split by existing ownership: Authorizer handles identity in Keycloak; User-Access handles application profile, tenant binding, role/permission mapping, and staff count; BFF exposes safe tenant-scoped routes to the management UI.

Because Notification Service has been removed, staff onboarding must not depend on email. The demo-friendly flow is: Owner/Manager creates a staff account, assigns a role, and provides an initial password or setup instruction outside the system. A later email/provider integration can wrap this flow without changing the staff ownership boundary.

## Scope Note

### Notification Service in the old plan

**Status:** No longer an implementation step in Phase 4C.

**Reason:**

- No runtime service, database, SMTP provider, or email templates exist in the current repository.
- The main demo flow already works without transactional email: QR ordering, KDS, payment, SaaS onboarding, and tenant lifecycle are not blocked by Notification Service.
- Implementing a reliable email service would add provider configuration, retry policy, audit storage, failure handling, and testing cost that does not improve the core defense/demo path enough for the current timeline.

**Documentation rule:**

- Internal/project docs may explicitly say Step 4.5 was removed or left out of the current scope.
- Official thesis submission docs should present email/Notification as outside the thesis scope or as future work, not as an unfinished promised phase.

## Steps

### Step 4C.1 — Staff Management Backend (2-3 days)

**Goal:** Owner/Manager manages tenant staff through existing services, without exposing Keycloak admin operations directly to the client.

**Scope & reason:**

- **Staff Management Endpoints:**
  - Create/invite staff — Owner/Manager, `USER_CREATE`.
  - List staff by tenant — Owner/Manager, `USER_GET_ALL`.
  - Change staff role — Owner only, `ROLE_UPDATE`.
  - Disable staff account — Owner only, `USER_DELETE`.

- **Create staff flow:** Owner/Manager enters email, display name, role, and initial password/setup mode → BFF validates permission and tenant context → Authorizer creates Keycloak user and assigns role → User-Access creates MongoDB profile bound to the tenant → response returns safe staff profile data. Do not depend on email delivery.

- **Role change flow:** Update Keycloak role and MongoDB profile/permission mapping as one coordinated operation. If one side fails, return a clear error and keep the profile in a state that can be retried or reconciled.

- **Disable staff flow:** Disable user in Keycloak and deactivate profile in MongoDB. Do not hard-delete staff because order/payment/audit history may still reference the staff user.

- **Tenant isolation:** Staff queries and mutations must always be tenant-scoped. Non-`SUPER_ADMIN` actors cannot manage staff in another tenant.

- **BFF proxy controllers:** Use `UserGuard` → `TenantGuard` → `PermissionGuard`; never expose Keycloak admin credentials or Authorizer internal routes to the browser.

**verify:** Create staff → staff can log in with correct role; role change updates identity and application profile; disabled staff cannot log in; cross-tenant access and low-role access return clear 403/404 style errors.

### Step 4C.2 — Staff Management UI (1-2 days)

**Goal:** Management dashboard has a usable tenant staff screen for daily operations.

**Scope & reason:**

- Route **`/dashboard/staff`**: staff directory table, create staff dialog, role/status actions, and disabled-state handling.
- **Staff table:** Name, email, role, status, joined date.
- **Filters/search:** Filter by role/status and search by name/email.
- **Create staff dialog:** Email, name, role, and initial password/setup mode. The UI must make clear that email delivery is not part of the current system flow.
- **Role/status actions:** Owner-only controls for role change and disable/enable; Manager can list and create only if permission allows.

**verify:** Owner/Manager sees only current-tenant staff; role and status actions match backend permissions; low roles do not see or cannot call Owner-only actions; UI renders no raw wire enum labels.

## Acceptance Criteria

- [ ] BFF exposes tenant-scoped staff endpoints guarded by `UserGuard` → `TenantGuard` → `PermissionGuard`.
- [ ] Owner/Manager can create staff without depending on Notification Service or SMTP.
- [ ] Staff can log in with the assigned role after creation/setup.
- [ ] Role change updates both Keycloak and User-Access profile consistently or returns a retryable error.
- [ ] Disable staff prevents login and marks the application profile inactive without hard delete.
- [ ] Cross-tenant staff access is blocked.
- [ ] `/dashboard/staff` supports list, search/filter, create staff, role change, and disable/enable according to permissions.

## Outputs for the next Phase

- User-Access becomes the tenant-scoped staff management edge.
- Authorizer remains the identity/Keycloak boundary.
- BFF exposes a stable staff-management API surface for Management App.
- Notification/email stays an optional future extension and is not required for Phase 5-7 testing or the main thesis demo.
