# Phase 4C — Notification Service + Staff Management

> **Tiếng Việt:** [phase-4c-notification-staff.vi.md](phase-4c-notification-staff.vi.md)

> **Goal:** Standardized domain event-driven transactional and operational (email) communication and enable Owner/Manager to manage POS personnel in the tenant — invite, assign roles, disable — with synchronization between IdP and application profile, reducing risk of incorrect role access and increasing post-incident auditability.
> **Estimated:** ~1 week
> **Status:** ⬜ TODO

## Prerequisites

- Phase 4B completed — [phase-4b-saas-onboarding.md](phase-4b-saas-onboarding.md) (SaaS service and tenant context ready for multi-tenant invite/branding)
- Kafka topics and tenant/payment related event contracts have been agreed with upstream producers (do not use `order.canceled` for this message stream — handled in a separate audit direction)

## Reference

| Documents                 | Related Sections                        |
| ------------------------- | --------------------------------------- |
| technical-architecture.md | §6.2.8 Notification, §6.2.9 User-Access |
| business-logic.md         | §9 Permissions                          |

## Overview

Phase 4C adds two axes: **asynchronous notifications** and **staff management**. Email notifications help tenants and guests receive timely confirmations (welcome, receipts, suspend/expiry alerts) without blocking the main HTTP flow; Limited dispatch and retry recording reduces operational data loss and supports investigations. Manage staff in **user-access** (extend instead of separating services) because the source of truth and authorization needs a clear boundary — BFF only proxies and applies guard chain — avoid fragmentation of user/role creation logic between multiple services. UI `/dashboard/staff` completes the operational lifecycle: invite → log in to the correct role → adjust or disable as needed.

## Steps

### Step 4.5 — Notification service (2-3 days)

**Goal:** Respond to Kafka-defined events with transactional/verifiable emails, with archive traces, and retry policies — so tenants and owners can feel secure about receipts and onboarding.

**Scope & reason:**

- **Consumer Kafka** for 2 events (correct registry §7.2): `tenant.created` → welcome/onboarding email; `payment.completed` → receipt email for Customer if there is an email. **Do not** map `order.canceled` to notifications.
- **tenant lifecycle tasks from Phase 4B:** `tenant.suspended` does not go through Kafka — uses Redis flag for quick blocking — so the suspend email to Owner goes through direct task/TCP from SaaS service or cron job. Phase 4C also receives subscription warning/expired email and Owner reset-password/Keycloak Required Action handoff after SMTP is ready.
- **Email templates:** HTML templates with **tenant branding** (logo, restaurant name, brand colors) — consistent branding and reducing confusion with generic emails.
- **Retry logic:** Maximum **3 retries** with **exponential backoff** for failed emails — balance between temporary resiliency (email infrastructure) and not keeping load on consumers indefinitely.
- **Audit log:** MongoDB collection `notification_logs` (or equivalent) stores **all sent/failed notifications** — used for troubleshooting, post-send lookup, CS support and "what was sent, when, to whom" compliance.

**verify:** Sample event on staging → correct email type and correct tenant branding; audit record exists; Downstream error scenario → number of attempts and final state reflects policy.

### Step 4.6 — Staff Management Backend (2-3 days)

**Goal:** Owner/Manager manages tenant employee list from an extended service (**user-access**, no new microservices created) — reducing deployment complexity and one place responsible for IdP + profile synchronization.

**Scope & reason:**

- **Staff Management Endpoints:**
  - Invite staff — Owner/Manager, USER_CREATE permission
  - List staff by tenant — Owner/Manager, USER_GET_ALL
  - Change staff role — Owner only, ROLE_UPDATE
  - Disable staff (soft delete) — Owner only, USER_DELETE

- **Invite flow (behavioral):** Owner enters email + role → Keycloak Admin API creates user + assign appropriate role → creates user profile in MongoDB (tenant link) → sends invitation email (temp password or setup link) → Staff receives email → Login for the first time → Auto-provision profile if necessary.

- **Role change (behavioral):** Update **BOTH** Keycloak realm role **+** MongoDB permission mapping **at the same time** — ensuring consistency between identity provider and application layer. Avoid role mismatch between login and business logic.

- **Disable staff (soft delete, behavioral):** Disable user in Keycloak (cannot login) + deactivate in MongoDB. **NO hard delete** — keep audit trail and activity history. Disabled staff cannot log in, but historical data can still be looked up.

- **tenant isolation:** Staff invited belongs to the same tenant — tenant isolation enforced via `tenant_id` filter on all queries. Cannot view/manage other tenant's staff.

- **BFF proxy controllers** — unify `UserGuard` → `TenantGuard` → `PermissionGuard` and do not expose Keycloak admin to the client.
- Uses **Keycloak Admin API** (official library client) — reduces manual errors compared to pure REST and fits within existing auth architecture.
- **Keycloak Admin API operations:** `createUser`, `assignRole`, `removeRole`, `disableUser`

**verify:** Invite end-to-end → user logs in with correct role; role change → both systems reflect; disable → can no longer log in; Permission violations return clear errors.

### Step 4.7 — Staff Management UI (2-3 days)

**Goal:** Admin dashboard has a full staff screen for daily operations — reducing reliance on Keycloak Admin Console for tenant-scoped operations.

**Scope & reason:**

- Route **`/dashboard/staff`**: list table, invitation dialog (email + role), details/edit screen (change role, enable/disable activity) — a unified UX flow with backend 4.6.

- **Staff directory table:** Display columns: Name, Email, Role, Status (Active/Disabled), Join date.
  - **Filter** by role (dropdown or tabs).
  - **Search** by name/email (text input, debounce).

- **Invite Staff Dialog:**
  - Form: Email + Role dropdown (WAITER/CHEF/BARISTA/MANAGER).
  - Validation: unique email in tenant (check before sending invitation).
  - Flow after sending: Staff receives email → Login for the first time → Auto-provision → Appears in the list.

- **Staff Detail / Edit:**
  - Change roles
  - Disable/Enable staff account
  - View activity log (nice-to-have)

**verify:** Owner/Manager sees correct tenant data; invite/role/disable operations respond consistently with the API; Low roles do not see Owner-only actions.

## Acceptance Criteria

- [ ] Welcome email is triggered when event `tenant.created` occurs
- [ ] Email suspend/expiry is triggered from SaaS task/TCP/cron, no Kafka dependency `tenant.suspended`
- [ ] Owner onboarding has a password reset/setup email or Keycloak Required Action when SMTP is ready
- [ ] Owner invites staff → staff can log in with the correct assigned role
- [ ] Change role to simultaneously update Keycloak and MongoDB
- [ ] Disable staff → cannot log in
- [ ] Notification: retry up to 3 times (exponential backoff) and have traces in audit log (`notification_logs`)

## Outputs for the next Phase

- Notification service is an extension point for other email events (SLA alerts, marketing opt-in) without touching the main sync path
- User-access is a tenant-scoped human resource management edge, ready to add additional policies (for example, number of staff slots according to SaaS package) if required by the following phase.
- UI staff reuses the table + dialog + RBAC pattern for other admin screens
- Quick lookup table: topics `tenant.created`, `payment.completed`; collection audit notification; staff management endpoints via BFF
