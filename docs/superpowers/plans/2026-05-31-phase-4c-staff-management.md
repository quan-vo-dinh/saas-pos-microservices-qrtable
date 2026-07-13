# Phase 4C Staff Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build tenant-scoped staff management for Owner/Manager, covering create, list/detail, Owner-only role change, Owner-only disable, Owner-only re-enable, and a usable `/dashboard/staff` UI.

**Architecture:** BFF exposes guarded `/dashboard/staff` HTTP routes and forwards tenant/actor context to User-Access. User-Access owns Mongo staff profiles, role mapping, tenant staff counts, and staff policy. Authorizer owns Keycloak Admin operations for create identity, replace realm role, and enable/disable identity.

**Tech Stack:** Nx monorepo, NestJS 11, TCP microservices, Keycloak Admin REST, MongoDB/Mongoose, Next.js 16, React 19, TanStack Query, shadcn/Radix UI, Jest.

---

## Reference Context

- Design spec: `docs/superpowers/specs/2026-05-31-phase-4c-staff-management-design.md`
- Phase source: `docs/phases/phase-4c-staff-management.md`
- RBAC source: `docs/architecture/permission-matrix.md`
- Backend guard chain: `docs/technical-architecture.md` section 8
- Existing test baseline:
  - `pnpm exec jest --config apps/user-access/jest.config.cts --runInBand` passes.
  - `pnpm exec jest --config apps/bff/jest.config.cts --runInBand` has one unrelated config-validation failure in `kds-internal-events.subscriber.spec.ts`.
  - `pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand` has one unrelated service-request toast-label failure.

## File Structure

Shared contracts:

- Modify `libs/constants/src/lib/enum/tcp-request-message.ts`: add staff TCP patterns under `USER` and Keycloak staff patterns under `KEYCLOAK`.
- Modify `libs/error-messages/src/lib/error-code.enum.ts`: add stable staff-management error codes.
- Modify `libs/interfaces/src/lib/tcp/user/user.request.interface.ts`: add staff role, actor, list, create, get, role-change, and status request types.
- Modify `libs/interfaces/src/lib/tcp/user/user.response.interface.ts`: add staff profile/list response types.
- Modify `libs/interfaces/src/lib/tcp/authorizer/keycloak.request.interface.ts`: add staff Keycloak create, replace role, and enabled-status request types.
- Modify `libs/interfaces/src/lib/tcp/authorizer/authorizer.response.interface.ts`: add staff Keycloak response types if no existing response can be reused.
- Modify `libs/interfaces/src/lib/gateway/user/user-request.dto.ts`: add BFF dashboard staff DTO classes.
- Modify `libs/interfaces/src/lib/gateway/user/user-response.dto.ts`: add safe staff response DTO classes.

Authorizer:

- Modify `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`: add get/delete realm role mapping helpers.
- Modify `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts`: add create staff, replace managed realm roles, set enabled status.
- Modify `apps/authorizer/src/app/keycloak/controllers/keycloak.controller.ts`: expose new TCP patterns.
- Modify `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts`: test create staff, role replacement, status update.

User-Access:

- Create `apps/user-access/src/app/modules/user/services/staff-management.service.ts`: staff orchestration and policy.
- Create `apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts`: service tests.
- Modify `apps/user-access/src/app/modules/user/repositories/user.repository.ts`: add tenant-scoped staff queries/mutations.
- Modify `apps/user-access/src/app/modules/user/controllers/user.controller.ts`: expose staff TCP patterns.
- Modify `apps/user-access/src/app/modules/user/user.module.ts`: register `StaffManagementService`.

BFF:

- Create `apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.ts`: `/dashboard/staff` routes.
- Create `apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts`: route forwarding and Owner-only policy tests.
- Modify `apps/bff/src/app/modules/user/user.module.ts`: include the new controller.

Management App:

- Create `apps/management-app/src/features/staff/types.ts`: frontend staff contracts.
- Create `apps/management-app/src/features/staff/api.ts`: authenticated BFF calls.
- Create `apps/management-app/src/features/staff/hooks/use-staff-query.ts`: React Query hooks and mutations.
- Create `apps/management-app/src/features/staff/components/staff-filters.tsx`: search/status/role filters.
- Create `apps/management-app/src/features/staff/components/staff-table.tsx`: staff table and actions.
- Create `apps/management-app/src/features/staff/components/create-staff-dialog.tsx`: create form.
- Create `apps/management-app/src/features/staff/components/change-staff-role-dialog.tsx`: Owner-only role-change dialog.
- Create `apps/management-app/src/features/staff/components/staff-status-dialog.tsx`: Owner-only disable/enable dialog.
- Create `apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx`: UI policy tests.
- Modify `apps/management-app/src/app/(dashboard)/dashboard/staff/page.tsx`: replace skeleton.
- Modify `libs/shared/constants/src/lib/vi-domain-labels.ts`: shared staff role/status display labels.
- Modify `libs/shared/constants/src/index.ts`: export staff display helpers.

Docs:

- Modify `docs/phases/phase-4c-staff-management.md` and `.vi.md` only if implementation discovers a policy correction.
- No permission matrix change is planned because this design uses existing `USER_CREATE`, `USER_GET_ALL`, `USER_GET_BY_ID`, `USER_UPDATE`, and `USER_DELETE`.

## Cursor Composer Sub-Agent Handoff

This section is written for a fresh Cursor Composer 2.5 session that coordinates multiple sub-agents. The coordinator should keep this file open and dispatch work by wave. Every sub-agent must read the shared context first, then the task-specific files listed in its assignment.

### Shared Context For Every Sub-Agent

Paste this context into every sub-agent before the task-specific prompt:

```text
You are implementing QRTable Phase 4C Staff Management in an Nx monorepo.

Read these files before editing:
- AGENTS.md
- docs/phases/phase-4c-staff-management.md
- docs/superpowers/specs/2026-05-31-phase-4c-staff-management-design.md
- docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md

Hard requirements:
- Preserve service boundaries: BFF is HTTP edge, User-Access owns Mongo staff profiles, Authorizer owns Keycloak Admin operations.
- Do not use ROLE_UPDATE for staff membership changes. Use USER_UPDATE plus Owner-only actor policy.
- Do not manage OWNER or SUPER_ADMIN through /dashboard/staff.
- Do not expose Keycloak Admin routes or credentials to the browser.
- Do not hard-delete staff profiles.
- Do not use Mongo _id as the browser contract for staff actions; use Keycloak userId stored in User.userId.
- Do not render raw wire enum labels in Management App UI. Use shared display helpers from @einvoice/shared-constants.
- Do not import another service's entity/repository directly.
- Use TDD: write or update focused failing tests first, implement, then run focused tests.
- Keep edits scoped to the files in your assigned task unless a compile error requires a local export/import adjustment.

Return:
- Changed files.
- Test commands run and exact pass/fail result.
- Any pre-existing failure you observed.
- Any open risk that must be reviewed by the coordinator.
```

### Dependency Waves

Use these waves so sub-agents do not step on unfinished contracts:

| Wave | Assignment                                        | Can Run In Parallel                        | Required Before          |
| ---- | ------------------------------------------------- | ------------------------------------------ | ------------------------ |
| 1    | Task 1 Shared Staff Contracts                     | No                                         | All later tasks          |
| 2A   | Task 2 Authorizer Keycloak Staff Operations       | Yes, with 2B after Task 1                  | Integration verification |
| 2B   | Task 3 User-Access Staff Management Service       | Yes, with 2A after Task 1                  | BFF live integration     |
| 3    | Task 4 BFF Dashboard Staff Routes                 | After Task 1; can start while 2A/2B finish | UI live integration      |
| 4A   | Task 5 Management App Staff API And Hooks         | After Task 1 and BFF route contract        | UI page                  |
| 4B   | Task 6 Management App Staff UI                    | After Task 5 API/hooks are merged          | End-to-end smoke         |
| 5    | Task 7 Integration Verification And Documentation | No                                         | Completion claim         |

Recommended Composer flow:

1. Dispatch Wave 1 alone and review exported contract names before continuing.
2. Dispatch Wave 2A and Wave 2B to separate sub-agents. Review that both use the same TCP pattern names and response shapes.
3. Dispatch Wave 3 after contract names are stable. BFF can be completed before User-Access runtime is fully green because controller tests mock TCP.
4. Dispatch Wave 4A, then Wave 4B. Keep shared label helpers in `@einvoice/shared-constants`, not local UI maps.
5. Run Wave 5 in the coordinator session so final evidence is collected in one place.

### Sub-Agent Assignment Prompts

#### Agent A: Shared Contracts

```text
Implement Task 1 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md.

Scope:
- libs/constants/src/lib/enum/tcp-request-message.ts
- libs/error-messages/src/lib/error-code.enum.ts
- libs/interfaces/src/lib/tcp/user/user.request.interface.ts
- libs/interfaces/src/lib/tcp/user/user.response.interface.ts
- libs/interfaces/src/lib/tcp/authorizer/keycloak.request.interface.ts
- libs/interfaces/src/lib/tcp/authorizer/authorizer.response.interface.ts
- libs/interfaces/src/lib/gateway/user/user-request.dto.ts
- libs/interfaces/src/lib/gateway/user/user-response.dto.ts

Goal:
- Add shared Phase 4C staff contracts and DTOs.
- Keep role names typed from ROLE where backend code already uses ROLE.
- Keep browser responses free of password, token data, Keycloak admin metadata, and raw Mongo ObjectId role arrays.

Verification:
- pnpm exec tsc -p apps/user-access/tsconfig.spec.json --noEmit
- Report any downstream missing implementation references separately from contract syntax errors.
```

#### Agent B: Authorizer Keycloak Operations

```text
Implement Task 2 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md after Agent A contracts are merged.

Scope:
- apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts
- apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts
- apps/authorizer/src/app/keycloak/controllers/keycloak.controller.ts
- apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts
- related authorizer interface exports only when compilation requires it

Goal:
- Create a staff Keycloak user with tenant_id, password credential, optional UPDATE_PASSWORD required action, and realm role assignment.
- Replace only managed QRTable staff roles while preserving non-QRTable roles.
- Set enabled status through Keycloak PUT user representation while preserving existing attributes.

Verification:
- pnpm exec jest --config apps/authorizer/jest.config.cts --runInBand apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts
```

#### Agent C: User-Access Staff Management

```text
Implement Task 3 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md after Agent A contracts are merged.

Scope:
- apps/user-access/src/app/modules/user/services/staff-management.service.ts
- apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts
- apps/user-access/src/app/modules/user/repositories/user.repository.ts
- apps/user-access/src/app/modules/user/controllers/user.controller.ts
- apps/user-access/src/app/modules/user/user.module.ts
- libs/schemas/src/lib/user.schema.ts only for disabledReason if repository typing requires it

Goal:
- Enforce Owner/Manager create policy and Owner-only role/status policy.
- Enforce max_staff before Keycloak mutation.
- Create Keycloak identity before Mongo profile and disable the identity if Mongo creation fails.
- List/get staff by tenant and exclude OWNER/SUPER_ADMIN.
- Change role and status as coordinated User-Access plus Authorizer operations with compensation paths from the plan.

Verification:
- pnpm exec jest --config apps/user-access/jest.config.cts --runInBand apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts apps/user-access/src/app/modules/user/services/user.service.spec.ts apps/user-access/src/app/modules/user/services/tenant-user.service.spec.ts
- pnpm exec jest --config apps/user-access/jest.config.cts --runInBand
```

#### Agent D: BFF Dashboard Staff Routes

```text
Implement Task 4 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md after Agent A contracts are merged.

Scope:
- apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.ts
- apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts
- apps/bff/src/app/modules/user/user.module.ts
- gateway user DTO exports only when compilation requires it

Goal:
- Expose guarded /dashboard/staff routes.
- Forward tenantId, requestedByUserId, requestedByRoles, processId, route params, query, and body to User-Access TCP.
- Reject missing tenant context with TENANT_REQUIRED.
- Reject Owner-only role/status actions for non-Owner actors before forwarding.

Verification:
- pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts
- pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts apps/bff/src/app/guards/permission.guard.spec.ts apps/bff/src/app/guards/tenant.guard.spec.ts apps/bff/src/app/guards/user.guard.spec.ts
```

#### Agent E: Management App API, Hooks, And Shared Labels

```text
Implement Task 5 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md after Agent A contracts are merged and Agent D route paths are stable.

Scope:
- apps/management-app/src/features/staff/types.ts
- apps/management-app/src/features/staff/api.ts
- apps/management-app/src/features/staff/hooks/use-staff-query.ts
- apps/management-app/src/features/staff/__tests__/staff-api.spec.ts
- libs/shared/constants/src/lib/vi-domain-labels.ts
- libs/shared/constants/src/index.ts

Goal:
- Add typed frontend staff contracts.
- Add staffApi for /dashboard/staff routes.
- Add React Query hooks and mutation invalidation.
- Add staffRoleVi and staffStatusVi to @einvoice/shared-constants and export them.

Verification:
- pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/staff/__tests__/staff-api.spec.ts
- pnpm exec jest --config libs/shared/constants/jest.config.ts --runInBand libs/shared/constants/src/lib/vi-domain-labels.spec.ts if that Jest config exists in the repo
```

#### Agent F: Management App UI

```text
Implement Task 6 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md after Agent E API/hooks are merged.

Scope:
- apps/management-app/src/features/staff/components/staff-filters.tsx
- apps/management-app/src/features/staff/components/staff-table.tsx
- apps/management-app/src/features/staff/components/create-staff-dialog.tsx
- apps/management-app/src/features/staff/components/change-staff-role-dialog.tsx
- apps/management-app/src/features/staff/components/staff-status-dialog.tsx
- apps/management-app/src/features/staff/staff-page-client.tsx if the route needs a client component
- apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx
- apps/management-app/src/app/(dashboard)/dashboard/staff/page.tsx

Goal:
- Replace the staff skeleton page with a usable staff-management dashboard.
- Owner sees create, role change, disable, and enable controls.
- Manager sees list and create for WAITER/CHEF/BARISTA only.
- Status and role labels come from @einvoice/shared-constants.
- No raw wire enum labels are user-facing.

Verification:
- pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx
```

#### Agent G: Integration Verifier

```text
Implement Task 7 from docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md after Agents A-F are merged.

Scope:
- Verification commands from Task 7.
- docs/phases/phase-4c-staff-management.md
- docs/phases/phase-4c-staff-management.md

Goal:
- Collect focused backend and frontend test evidence.
- Run TypeScript checks where practical.
- Run manual smoke against the local stack if services are available.
- Update phase docs to DONE only when evidence supports it.

Verification:
- pnpm verify:doc-anchors
- pnpm exec prettier --check docs/phases/phase-4c-staff-management.md docs/superpowers/specs/2026-05-31-phase-4c-staff-management-design.md docs/superpowers/plans/2026-05-31-phase-4c-staff-management.md
```

### Acceptance Mapping

| Phase Acceptance Criterion                                                                             | Covered By                                                                                      |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| BFF exposes tenant-scoped staff endpoints guarded by `UserGuard` -> `TenantGuard` -> `PermissionGuard` | Task 4 tests and implementation                                                                 |
| Owner/Manager can create staff without Notification Service or SMTP                                    | Task 2 create staff identity, Task 3 create profile, Task 6 create dialog                       |
| Staff can log in with assigned role after creation/setup                                               | Task 2 realm role assignment, Task 3 role profile mapping, Task 7 manual smoke steps 2-3        |
| Role change updates Keycloak and User-Access consistently or returns retryable error                   | Task 2 replace realm roles, Task 3 role compensation path, Task 7 smoke steps 4-5               |
| Disable staff prevents login and marks profile inactive without hard delete                            | Task 2 set enabled false, Task 3 status mutation, Task 7 smoke steps 6-7                        |
| Re-enable staff restores login after both stores update                                                | Task 2 set enabled true, Task 3 status mutation, Task 7 smoke steps 8-9                         |
| Cross-tenant staff access is blocked                                                                   | Task 3 tenant-scoped repository queries, Task 4 tenant context forwarding, Task 7 backend tests |
| `/dashboard/staff` supports list, search/filter, create, role change, disable/enable by permission     | Task 5 API/hooks, Task 6 UI policy tests                                                        |

### Coordinator Review Gates

Before merging each wave back into the main working tree, the coordinator should check:

- **After Wave 1:** TCP pattern names, DTO names, and response shapes match the design spec exactly.
- **After Wave 2:** Authorizer never accepts browser input directly; User-Access never imports Authorizer internals directly.
- **After Wave 3:** BFF sends actor roles from `MetadataKey.USER_DATA` and does not trust browser-provided actor roles.
- **After Wave 4:** UI has no local duplicate role/status label map and no raw wire enum labels in rendered text.
- **After Wave 5:** All claims in phase docs have command evidence or a manual smoke note with concrete date and result.

### Do-Not-Do Checklist

- Do not use `ROLE_UPDATE` for staff role assignment.
- Do not add Notification Service, SMTP, or email requirements to Phase 4C.
- Do not hard-delete staff.
- Do not allow `MANAGER` to create another `MANAGER`.
- Do not allow `/dashboard/staff` to manage `OWNER` or `SUPER_ADMIN`.
- Do not set `tenantId` from browser body; derive it from BFF tenant metadata.
- Do not expose raw Keycloak admin payloads in BFF responses.
- Do not keep `roles: string[]` ObjectId shape as the staff create contract.
- Do not mark phase docs done until focused tests and manual smoke evidence are collected.

---

### Task 1: Shared Staff Contracts

**Files:**

- Modify: `libs/constants/src/lib/enum/tcp-request-message.ts`
- Modify: `libs/error-messages/src/lib/error-code.enum.ts`
- Modify: `libs/interfaces/src/lib/tcp/user/user.request.interface.ts`
- Modify: `libs/interfaces/src/lib/tcp/user/user.response.interface.ts`
- Modify: `libs/interfaces/src/lib/tcp/authorizer/keycloak.request.interface.ts`
- Modify: `libs/interfaces/src/lib/tcp/authorizer/authorizer.response.interface.ts`
- Modify: `libs/interfaces/src/lib/gateway/user/user-request.dto.ts`
- Modify: `libs/interfaces/src/lib/gateway/user/user-response.dto.ts`

- [ ] **Step 1: Add TCP message constants**

Add these members to `USER` in `libs/constants/src/lib/enum/tcp-request-message.ts`:

```typescript
  STAFF_CREATE = 'user.staff_create',
  STAFF_LIST = 'user.staff_list',
  STAFF_GET = 'user.staff_get',
  STAFF_CHANGE_ROLE = 'user.staff_change_role',
  STAFF_SET_STATUS = 'user.staff_set_status',
```

Add these members to `KEYCLOAK`:

```typescript
  CREATE_STAFF_USER = 'keycloak.create_staff_user',
  REPLACE_REALM_ROLES = 'keycloak.replace_realm_roles',
  SET_USER_ENABLED = 'keycloak.set_user_enabled',
```

- [ ] **Step 2: Add stable error codes**

Add to `ErrorCode` under the user section:

```typescript
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ROLE_NOT_MANAGEABLE = 'USER_ROLE_NOT_MANAGEABLE',
  USER_STATUS_INVALID = 'USER_STATUS_INVALID',
  USER_PROFILE_CREATE_FAILED = 'USER_PROFILE_CREATE_FAILED',
```

- [ ] **Step 3: Add User-Access TCP request contracts**

Append to `libs/interfaces/src/lib/tcp/user/user.request.interface.ts`:

```typescript
import { ROLE } from '@common/constants/enum/role.enum';

export type StaffRoleName = ROLE.MANAGER | ROLE.WAITER | ROLE.CHEF | ROLE.BARISTA;

export interface StaffActorContext {
  requestedByUserId: string;
  requestedByRoles: string[];
}

export interface CreateStaffTcpRequest extends StaffActorContext {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: StaffRoleName;
  password: string;
  requirePasswordUpdate?: boolean;
  processId?: string;
}

export interface ListStaffTcpRequest extends StaffActorContext {
  tenantId: string;
  search?: string;
  roleName?: StaffRoleName;
  status?: 'ACTIVE' | 'DISABLED';
  page?: number;
  limit?: number;
  processId?: string;
}

export interface GetStaffTcpRequest extends StaffActorContext {
  tenantId: string;
  userId: string;
  processId?: string;
}

export interface ChangeStaffRoleTcpRequest extends StaffActorContext {
  tenantId: string;
  userId: string;
  roleName: StaffRoleName;
  processId?: string;
}

export interface SetStaffStatusTcpRequest extends StaffActorContext {
  tenantId: string;
  userId: string;
  enabled: boolean;
  reason: string;
  processId?: string;
}
```

If `ROLE` is already imported in this file after edits, merge imports instead of duplicating them.

- [ ] **Step 4: Add User-Access TCP response contracts**

Append to `libs/interfaces/src/lib/tcp/user/user.response.interface.ts`:

```typescript
import type { StaffRoleName } from './user.request.interface';

export interface StaffProfileTcpResponse {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roleName: StaffRoleName;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffListTcpResponse {
  items: StaffProfileTcpResponse[];
  page: number;
  limit: number;
  total: number;
}
```

- [ ] **Step 5: Add Authorizer TCP contracts**

Append to `libs/interfaces/src/lib/tcp/authorizer/keycloak.request.interface.ts`:

```typescript
export interface CreateStaffKeycloakRequest {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roleNames: string[];
  password: string;
  requirePasswordUpdate?: boolean;
  processId?: string;
}

export interface ReplaceKeycloakRealmRolesRequest {
  userId: string;
  managedRoleNames: string[];
  nextRoleNames: string[];
  processId?: string;
}

export interface SetKeycloakUserEnabledRequest {
  userId: string;
  enabled: boolean;
  reason: string;
  processId?: string;
}
```

Append to `libs/interfaces/src/lib/tcp/authorizer/authorizer.response.interface.ts` if equivalent types do not already exist:

```typescript
export interface CreateStaffKeycloakResponse {
  userId: string;
  email: string;
  enabled: boolean;
  requiredActions: string[];
}

export interface SetKeycloakUserEnabledResponse {
  userId: string;
  enabled: boolean;
}
```

- [ ] **Step 6: Add gateway DTOs**

In `libs/interfaces/src/lib/gateway/user/user-request.dto.ts`, add:

```typescript
import { IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ROLE } from '@common/constants/enum/role.enum';

const STAFF_ROLE_NAMES = [ROLE.MANAGER, ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;

export class CreateStaffRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(ROLE)
  @IsIn(STAFF_ROLE_NAMES)
  roleName: (typeof STAFF_ROLE_NAMES)[number];

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  requirePasswordUpdate?: boolean;
}

export class ListStaffQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ROLE)
  @IsIn(STAFF_ROLE_NAMES)
  roleName?: (typeof STAFF_ROLE_NAMES)[number];

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: 'ACTIVE' | 'DISABLED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ChangeStaffRoleDto {
  @IsEnum(ROLE)
  @IsIn(STAFF_ROLE_NAMES)
  roleName: (typeof STAFF_ROLE_NAMES)[number];
}

export class SetStaffStatusDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
```

When adding these classes, merge the import list with existing decorators in the file and remove unused imports.

- [ ] **Step 7: Add gateway response DTOs**

In `libs/interfaces/src/lib/gateway/user/user-response.dto.ts`, add DTO classes matching `StaffProfileTcpResponse` and `StaffListTcpResponse`. Keep them simple `@ApiProperty()` classes, with no password or ObjectId fields.

- [ ] **Step 8: Verify shared contract compilation**

Run:

```bash
pnpm exec tsc -p apps/user-access/tsconfig.spec.json --noEmit
```

Expected: TypeScript either passes or reports only downstream missing implementation references that are introduced by later tasks. If it reports duplicate imports or invalid DTO decorators in the edited files, fix those before starting Task 2.

---

### Task 2: Authorizer Keycloak Staff Operations

**Files:**

- Modify: `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`
- Modify: `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts`
- Modify: `apps/authorizer/src/app/keycloak/controllers/keycloak.controller.ts`
- Modify: `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts`

- [ ] **Step 1: Write failing tests for staff Keycloak operations**

Add tests to `keycloak-admin.service.spec.ts`:

```typescript
it('creates staff user with tenant attribute, temporary password, and realm role', async () => {
  keycloakHttp.createUserWithToken.mockResolvedValue({
    headers: { location: 'http://keycloak/admin/realms/qr/users/staff-1' },
  });
  keycloakHttp.getRealmRole.mockResolvedValue({ data: { id: 'role-waiter', name: 'WAITER' } });

  const service = new KeycloakAdminService(keycloakHttp as never);
  const result = await service.createStaffUser({
    email: 'waiter@example.com',
    firstName: 'Waiter',
    lastName: 'One',
    tenantId: 'tenant-1',
    roleNames: ['WAITER'],
    password: 'Password123!',
    requirePasswordUpdate: true,
  });

  expect(result).toEqual({
    userId: 'staff-1',
    email: 'waiter@example.com',
    enabled: true,
    requiredActions: ['UPDATE_PASSWORD'],
  });
  expect(keycloakHttp.createUserWithToken).toHaveBeenCalledWith(
    'client-token',
    expect.objectContaining({
      enabled: true,
      requiredActions: ['UPDATE_PASSWORD'],
      attributes: { tenant_id: ['tenant-1'] },
      credentials: [
        {
          type: 'password',
          value: 'Password123!',
          temporary: true,
        },
      ],
    }),
  );
  expect(keycloakHttp.assignRealmRoles).toHaveBeenCalledWith('client-token', 'staff-1', [
    { id: 'role-waiter', name: 'WAITER' },
  ]);
});

it('replaces managed realm roles for a user', async () => {
  keycloakHttp.getUserRealmRoles.mockResolvedValue([
    { id: 'role-waiter', name: 'WAITER' },
    { id: 'offline', name: 'offline_access' },
  ]);
  keycloakHttp.getRealmRole.mockResolvedValue({ data: { id: 'role-chef', name: 'CHEF' } });

  const service = new KeycloakAdminService(keycloakHttp as never);
  await service.replaceRealmRoles({
    userId: 'staff-1',
    managedRoleNames: ['MANAGER', 'WAITER', 'CHEF', 'BARISTA'],
    nextRoleNames: ['CHEF'],
  });

  expect(keycloakHttp.deleteRealmRoles).toHaveBeenCalledWith('client-token', 'staff-1', [
    { id: 'role-waiter', name: 'WAITER' },
  ]);
  expect(keycloakHttp.assignRealmRoles).toHaveBeenCalledWith('client-token', 'staff-1', [
    { id: 'role-chef', name: 'CHEF' },
  ]);
});

it('sets enabled status while preserving existing attributes', async () => {
  keycloakHttp.getUserById.mockResolvedValue({
    id: 'staff-1',
    attributes: { tenant_id: ['tenant-1'] },
  });

  const service = new KeycloakAdminService(keycloakHttp as never);
  await service.setUserEnabled({ userId: 'staff-1', enabled: false, reason: 'left restaurant' });

  expect(keycloakHttp.updateUser).toHaveBeenCalledWith(
    'client-token',
    'staff-1',
    expect.objectContaining({
      enabled: false,
      attributes: {
        tenant_id: ['tenant-1'],
        disabled_reason: ['left restaurant'],
      },
    }),
  );
});
```

- [ ] **Step 2: Run the Authorizer tests and confirm failure**

Run:

```bash
pnpm exec jest --config apps/authorizer/jest.config.cts --runInBand apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts
```

Expected: FAIL because `createStaffUser`, `replaceRealmRoles`, `setUserEnabled`, `getUserRealmRoles`, and `deleteRealmRoles` are not implemented yet.

- [ ] **Step 3: Add Keycloak HTTP helpers**

In `keycloak-http.service.ts`, add:

```typescript
getUserRealmRoles(accessToken: string, userId: string): Promise<Array<Record<string, unknown>>> {
  return this.axiosInstance
    .get(`/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .then(({ data }) => (Array.isArray(data) ? data : []));
}

deleteRealmRoles(accessToken: string, userId: string, roles: Record<string, unknown>[]): Promise<unknown> {
  if (!roles.length) {
    return Promise.resolve(true);
  }
  return this.axiosInstance.delete(`/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: roles,
  });
}
```

- [ ] **Step 4: Add Keycloak admin service methods**

In `keycloak-admin.service.ts`, add `createStaffUser`, `replaceRealmRoles`, and `setUserEnabled`. Reuse `assignRealmRoles`, `throwMappedKeycloakAdminError`, and `PASSWORD_REQUIRED_ACTION`. For `createStaffUser`, use `temporary: request.requirePasswordUpdate !== false`.

Key behavior:

```typescript
const requirePasswordUpdate = request.requirePasswordUpdate !== false;
const requiredActions = requirePasswordUpdate ? [PASSWORD_REQUIRED_ACTION] : [];
```

For `replaceRealmRoles`, delete only roles whose names are in `managedRoleNames`; preserve non-QRTable roles such as `offline_access`.

For `setUserEnabled`, load the current user first, merge existing attributes, add `disabled_reason` when disabling, and remove or overwrite that attribute when enabling with reason `re-enabled`.

- [ ] **Step 5: Expose TCP controller handlers**

In `keycloak.controller.ts`, add handlers:

```typescript
  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_STAFF_USER)
  async createStaffUser(@RequestParams() data: CreateStaffKeycloakRequest) {
    const result = await this.keycloakAdminService.createStaffUser(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.REPLACE_REALM_ROLES)
  async replaceRealmRoles(@RequestParams() data: ReplaceKeycloakRealmRolesRequest) {
    await this.keycloakAdminService.replaceRealmRoles(data);
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.SET_USER_ENABLED)
  async setUserEnabled(@RequestParams() data: SetKeycloakUserEnabledRequest) {
    const result = await this.keycloakAdminService.setUserEnabled(data);
    return Response.success(result);
  }
```

Import the new request types.

- [ ] **Step 6: Run Authorizer focused tests**

Run:

```bash
pnpm exec jest --config apps/authorizer/jest.config.cts --runInBand apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Authorizer slice**

```bash
git add libs/constants/src/lib/enum/tcp-request-message.ts libs/interfaces/src/lib/tcp/authorizer apps/authorizer/src/app/keycloak
git commit -m "feat(authorizer): add staff keycloak admin operations"
```

---

### Task 3: User-Access Staff Management Service

**Files:**

- Create: `apps/user-access/src/app/modules/user/services/staff-management.service.ts`
- Create: `apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts`
- Modify: `apps/user-access/src/app/modules/user/repositories/user.repository.ts`
- Modify: `apps/user-access/src/app/modules/user/controllers/user.controller.ts`
- Modify: `apps/user-access/src/app/modules/user/user.module.ts`

- [ ] **Step 1: Write failing service tests**

Create `staff-management.service.spec.ts` with these cases:

```typescript
describe('StaffManagementService', () => {
  it('allows owner to create manager and calls keycloak before creating profile', async () => {});
  it('allows manager to create waiter but rejects manager creating manager', async () => {});
  it('enforces max_staff before keycloak mutation', async () => {});
  it('disables keycloak user when mongo profile creation fails', async () => {});
  it('lists only staff in current tenant and excludes owner profiles', async () => {});
  it('allows owner to change staff role and compensates mongo role when keycloak replace fails', async () => {});
  it('rejects manager role change', async () => {});
  it('sets staff disabled status through keycloak and mongo profile', async () => {});
  it('sets staff enabled status through keycloak and mongo profile', async () => {});
});
```

Use explicit mocks for `UserRepository`, `authorizerClient`, and `saasClient`. The role policy tests are the critical part of this file.

- [ ] **Step 2: Run failing User-Access tests**

Run:

```bash
pnpm exec jest --config apps/user-access/jest.config.cts --runInBand apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts
```

Expected: FAIL because `StaffManagementService` does not exist.

- [ ] **Step 3: Add repository methods**

Add these public methods to `UserRepository`:

```typescript
async findRoleByName(roleName: ROLE): Promise<Role | null> {
  return this.roleModel.findOne({ name: roleName }).exec();
}

async findTenantStaffByUserId(params: { tenantId: string; userId: string }): Promise<User | null> {
  return this.userModel.findOne({ tenantId: params.tenantId, userId: params.userId }).populate('roles').exec();
}

async createStaffProfile(data: Partial<User>): Promise<User> {
  const created = await this.userModel.create(data);
  return this.getByUserId(created.userId) as Promise<User>;
}

async listTenantStaff(params: {
  tenantId: string;
  manageableRoleIds: ObjectId[];
  roleId?: ObjectId;
  status?: 'ACTIVE' | 'DISABLED';
  search?: string;
  page: number;
  limit: number;
}): Promise<{ items: User[]; total: number }> {
  const query: Record<string, unknown> = {
    tenantId: params.tenantId,
    roles: params.roleId ?? { $in: params.manageableRoleIds },
  };

  if (params.status === 'ACTIVE') query.isActive = true;
  if (params.status === 'DISABLED') query.isActive = false;
  if (params.search?.trim()) {
    const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { email: new RegExp(escaped, 'i') },
      { firstName: new RegExp(escaped, 'i') },
      { lastName: new RegExp(escaped, 'i') },
    ];
  }

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    this.userModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(params.limit).populate('roles').exec(),
    this.userModel.countDocuments(query).exec(),
  ]);
  return { items, total };
}

async setTenantStaffRole(params: { tenantId: string; userId: string; roleId: ObjectId }): Promise<User | null> {
  await this.userModel
    .findOneAndUpdate(
      { tenantId: params.tenantId, userId: params.userId },
      { $set: { roles: [params.roleId] } },
      { new: true },
    )
    .exec();
  return this.findTenantStaffByUserId({ tenantId: params.tenantId, userId: params.userId });
}

async setTenantStaffActiveStatus(params: {
  tenantId: string;
  userId: string;
  isActive: boolean;
  disabledAt: Date | null;
  reason: string;
}): Promise<User | null> {
  await this.userModel
    .findOneAndUpdate(
      { tenantId: params.tenantId, userId: params.userId },
      {
        $set: {
          isActive: params.isActive,
          disabledAt: params.disabledAt,
          disabledReason: params.reason,
        },
      },
      { new: true },
    )
    .exec();
  return this.findTenantStaffByUserId({ tenantId: params.tenantId, userId: params.userId });
}
```

If Mongoose typing complains about `disabledReason`, either add `disabledReason?: string | null` to `User` schema or use a typed update object that includes the additional field. Prefer adding the schema prop:

```typescript
  @Prop({ type: String, default: null })
  disabledReason?: string | null;
```

- [ ] **Step 4: Implement `StaffManagementService`**

Create `staff-management.service.ts`. Include constants:

```typescript
const MANAGEABLE_STAFF_ROLES = [ROLE.MANAGER, ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;
const MANAGER_CREATABLE_ROLES = [ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;
const OWNER_ROLE = ROLE.OWNER;
```

Required methods:

```typescript
createStaff(request: CreateStaffTcpRequest): Promise<StaffProfileTcpResponse>;
listStaff(request: ListStaffTcpRequest): Promise<StaffListTcpResponse>;
getStaff(request: GetStaffTcpRequest): Promise<StaffProfileTcpResponse>;
changeRole(request: ChangeStaffRoleTcpRequest): Promise<StaffProfileTcpResponse>;
setStatus(request: SetStaffStatusTcpRequest): Promise<StaffProfileTcpResponse>;
```

Policy helpers:

```typescript
private isOwner(actorRoles: string[]): boolean {
  return actorRoles.map((role) => role.toUpperCase()).includes(ROLE.OWNER);
}

private isManager(actorRoles: string[]): boolean {
  return actorRoles.map((role) => role.toUpperCase()).includes(ROLE.MANAGER);
}

private assertCanCreate(actorRoles: string[], roleName: ROLE): void {
  if (this.isOwner(actorRoles) && MANAGEABLE_STAFF_ROLES.includes(roleName as never)) return;
  if (this.isManager(actorRoles) && MANAGER_CREATABLE_ROLES.includes(roleName as never)) return;
  throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
}

private assertOwner(actorRoles: string[]): void {
  if (!this.isOwner(actorRoles)) {
    throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
  }
}
```

Mapping helper:

```typescript
private toStaffProfile(user: User): StaffProfileTcpResponse {
  const role = Array.isArray(user.roles) ? (user.roles[0] as unknown as { name?: ROLE }) : undefined;
  const roleName = role?.name;
  if (!roleName || !MANAGEABLE_STAFF_ROLES.includes(roleName as never)) {
    throw new BusinessException(ErrorCode.USER_ROLE_NOT_MANAGEABLE, HttpStatus.BAD_REQUEST);
  }

  const firstName = user.firstName ?? '';
  const lastName = user.lastName ?? '';
  const displayName = `${firstName} ${lastName}`.trim() || user.email;

  return {
    userId: user.userId,
    tenantId: user.tenantId ?? '',
    email: user.email,
    firstName,
    lastName,
    displayName,
    roleName: roleName as StaffRoleName,
    isActive: user.isActive,
    disabledAt: user.disabledAt ? user.disabledAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
```

Use `enforceMaxStaffQuota` before calling Keycloak in `createStaff`.

For create compensation, wrap Mongo profile creation:

```typescript
let createdKeycloakUserId: string | null = null;
try {
  const keycloakUser = await this.createKeycloakStaff(...);
  createdKeycloakUserId = keycloakUser.userId;
  const profile = await this.userRepository.createStaffProfile(...);
  return this.toStaffProfile(profile);
} catch (error) {
  if (createdKeycloakUserId) {
    await this.disableKeycloakUser(createdKeycloakUserId, 'staff_profile_create_failed', request.processId).catch(() => undefined);
  }
  throw error;
}
```

For role change, capture previous role and compensate if Keycloak replace fails after Mongo update, or if Mongo update fails after Keycloak replace. Choose this order:

1. Validate target profile and previous role.
2. Update Mongo role to next role.
3. Replace Keycloak managed realm role.
4. If Keycloak replace fails, restore Mongo role to previous role and rethrow.

For status changes, keep Keycloak as the first mutation because login access must not remain enabled when the application profile says disabled:

1. Load target profile by `{ tenantId, userId }` and validate that its current role is manageable.
2. If `request.enabled === target.isActive`, throw `USER_STATUS_INVALID`.
3. Call Authorizer `KEYCLOAK.SET_USER_ENABLED`.
4. Update Mongo profile through `setTenantStaffActiveStatus`.
5. If the Mongo update fails after Keycloak status was changed, try to restore Keycloak to the previous enabled value with reason `staff_status_profile_update_failed`, then rethrow the original error.

- [ ] **Step 5: Expose User-Access TCP handlers**

In `user.controller.ts`, inject `StaffManagementService` and add:

```typescript
  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_CREATE)
  async createStaff(@RequestParams() data: CreateStaffTcpRequest) {
    const result = await this.staffManagementService.createStaff(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_LIST)
  async listStaff(@RequestParams() data: ListStaffTcpRequest) {
    const result = await this.staffManagementService.listStaff(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_GET)
  async getStaff(@RequestParams() data: GetStaffTcpRequest) {
    const result = await this.staffManagementService.getStaff(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_CHANGE_ROLE)
  async changeStaffRole(@RequestParams() data: ChangeStaffRoleTcpRequest) {
    const result = await this.staffManagementService.changeRole(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS)
  async setStaffStatus(@RequestParams() data: SetStaffStatusTcpRequest) {
    const result = await this.staffManagementService.setStatus(data);
    return Response.success(result);
  }
```

Register `StaffManagementService` in `user.module.ts`.

- [ ] **Step 6: Run User-Access focused tests**

Run:

```bash
pnpm exec jest --config apps/user-access/jest.config.cts --runInBand apps/user-access/src/app/modules/user/services/staff-management.service.spec.ts apps/user-access/src/app/modules/user/services/user.service.spec.ts apps/user-access/src/app/modules/user/services/tenant-user.service.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run all User-Access tests**

Run:

```bash
pnpm exec jest --config apps/user-access/jest.config.cts --runInBand
```

Expected: PASS.

- [ ] **Step 8: Commit User-Access slice**

```bash
git add libs/error-messages/src/lib/error-code.enum.ts libs/interfaces/src/lib/tcp/user apps/user-access/src/app/modules/user libs/schemas/src/lib/user.schema.ts
git commit -m "feat(user-access): add tenant staff management"
```

---

### Task 4: BFF Dashboard Staff Routes

**Files:**

- Create: `apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.ts`
- Create: `apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts`
- Modify: `apps/bff/src/app/modules/user/user.module.ts`

- [ ] **Step 1: Write failing controller tests**

Create `dashboard-staff.controller.spec.ts` with tests:

```typescript
describe('DashboardStaffController', () => {
  it('forwards create staff with tenant and actor context', () => {});
  it('forwards list query with tenant and actor context', () => {});
  it('rejects role change when actor is not owner', () => {});
  it('rejects disable when actor is not owner', () => {});
  it('rejects enable when actor is not owner', () => {});
});
```

Use a mock request shaped like:

```typescript
const ownerRequest = {
  [MetadataKey.TENANT_ID]: 'tenant-1',
  [MetadataKey.USER_DATA]: {
    metadata: {
      userId: 'owner-1',
      user: { roles: [{ name: 'OWNER' }] },
      permissions: [PERMISSION.USER_CREATE, PERMISSION.USER_GET_ALL, PERMISSION.USER_UPDATE, PERMISSION.USER_DELETE],
    },
  },
} as unknown as Request;
```

- [ ] **Step 2: Run failing BFF focused test**

Run:

```bash
pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts
```

Expected: FAIL because the controller does not exist.

- [ ] **Step 3: Implement `DashboardStaffController`**

Create controller:

```typescript
@ApiTags('Dashboard Staff')
@Controller('dashboard/staff')
@Authorization({ secured: true })
export class DashboardStaffController {
  constructor(@Inject(TCP_SERVICES.USER_ACCESS_SERVICE) private readonly userAccessClient: TcpClient) {}

  @Get()
  @Permissions([PERMISSION.USER_GET_ALL])
  list(@Query() query: ListStaffQueryDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_LIST, req, processId, query);
  }

  @Get(':userId')
  @Permissions([PERMISSION.USER_GET_BY_ID])
  get(@Param('userId') userId: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_GET, req, processId, { userId });
  }

  @Post()
  @Permissions([PERMISSION.USER_CREATE])
  create(@Body() body: CreateStaffRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_CREATE, req, processId, body);
  }

  @Patch(':userId/role')
  @Permissions([PERMISSION.USER_UPDATE])
  changeRole(
    @Param('userId') userId: string,
    @Body() body: ChangeStaffRoleDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertOwner(req);
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_CHANGE_ROLE, req, processId, { userId, ...body });
  }

  @Post(':userId/disable')
  @Permissions([PERMISSION.USER_DELETE])
  disable(
    @Param('userId') userId: string,
    @Body() body: SetStaffStatusDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertOwner(req);
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS, req, processId, {
      userId,
      enabled: false,
      reason: body.reason,
    });
  }

  @Post(':userId/enable')
  @Permissions([PERMISSION.USER_UPDATE])
  enable(
    @Param('userId') userId: string,
    @Body() body: SetStaffStatusDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    this.assertOwner(req);
    return this.forward(TCP_REQUEST_MESSAGE.USER.STAFF_SET_STATUS, req, processId, {
      userId,
      enabled: true,
      reason: body.reason,
    });
  }
}
```

Add helper methods:

```typescript
private buildPayload(req: Request, processId: string, data: Record<string, unknown>) {
  const tenantId = req[MetadataKey.TENANT_ID] as string | undefined;
  if (!tenantId) throw new BusinessException(ErrorCode.TENANT_REQUIRED, HttpStatus.FORBIDDEN);
  return {
    tenantId,
    requestedByUserId: this.userId(req),
    requestedByRoles: this.roles(req),
    ...data,
    processId,
  };
}

private roles(req: Request): string[] {
  const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
  const rolesFromUser = userData?.metadata?.user?.roles?.map((role) => role.name).filter(Boolean) ?? [];
  return rolesFromUser.length ? rolesFromUser : [];
}

private assertOwner(req: Request): void {
  if (!this.roles(req).some((role) => role.toUpperCase() === ROLE.OWNER)) {
    throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
  }
}
```

Use the existing SaaS controllers' `ResponseDto` mapping style for `forward`.

- [ ] **Step 4: Register controller**

Add `DashboardStaffController` to `UserModule.controllers`.

- [ ] **Step 5: Run BFF focused tests**

Run:

```bash
pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Run BFF route-related tests**

Run:

```bash
pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts apps/bff/src/app/guards/permission.guard.spec.ts apps/bff/src/app/guards/tenant.guard.spec.ts apps/bff/src/app/guards/user.guard.spec.ts
```

Expected: PASS. Logger output from guard negative-path tests is acceptable.

- [ ] **Step 7: Commit BFF slice**

```bash
git add libs/interfaces/src/lib/gateway/user apps/bff/src/app/modules/user
git commit -m "feat(bff): expose dashboard staff endpoints"
```

---

### Task 5: Management App Staff API And Hooks

**Files:**

- Create: `apps/management-app/src/features/staff/types.ts`
- Create: `apps/management-app/src/features/staff/api.ts`
- Create: `apps/management-app/src/features/staff/hooks/use-staff-query.ts`
- Create: `apps/management-app/src/features/staff/__tests__/staff-api.spec.ts`
- Modify: `libs/shared/constants/src/lib/vi-domain-labels.ts`
- Modify: `libs/shared/constants/src/index.ts`

- [ ] **Step 1: Add frontend types**

Create `types.ts`:

```typescript
import type { AppRole } from '@einvoice/shared-constants';

export type StaffRoleName = Extract<AppRole, 'MANAGER' | 'WAITER' | 'CHEF' | 'BARISTA'>;
export type StaffStatus = 'ACTIVE' | 'DISABLED';

export type StaffProfile = {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roleName: StaffRoleName;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StaffListQuery = {
  search?: string;
  roleName?: StaffRoleName;
  status?: StaffStatus;
  page?: number;
  limit?: number;
};

export type StaffListResponse = {
  items: StaffProfile[];
  page: number;
  limit: number;
  total: number;
};

export type CreateStaffPayload = {
  email: string;
  firstName: string;
  lastName: string;
  roleName: StaffRoleName;
  password: string;
  requirePasswordUpdate?: boolean;
};
```

- [ ] **Step 2: Add shared display labels**

In `libs/shared/constants/src/lib/vi-domain-labels.ts`, add staff role/status label helpers near the other domain label maps:

```typescript
import type { AppRole } from './roles';

export type StaffRoleLabel = Extract<AppRole, 'MANAGER' | 'WAITER' | 'CHEF' | 'BARISTA'>;
export type StaffStatusLabel = 'ACTIVE' | 'DISABLED';

const STAFF_ROLE_VI = {
  MANAGER: 'Quản lý ca',
  WAITER: 'Phục vụ',
  CHEF: 'Bếp',
  BARISTA: 'Quầy bar',
} as const satisfies Record<StaffRoleLabel, string>;

const STAFF_STATUS_VI = {
  ACTIVE: 'Đang hoạt động',
  DISABLED: 'Đã vô hiệu hóa',
} as const satisfies Record<StaffStatusLabel, string>;

export function staffRoleVi(role: StaffRoleLabel | string): string {
  return displayDomainLabel(STAFF_ROLE_VI, role);
}

export function staffStatusVi(status: StaffStatusLabel | string): string {
  return displayDomainLabel(STAFF_STATUS_VI, status);
}
```

Then export `StaffRoleLabel`, `StaffStatusLabel`, `staffRoleVi`, and `staffStatusVi` from `libs/shared/constants/src/index.ts`.

- [ ] **Step 3: Add API client**

Create `api.ts`:

```typescript
'use client';

import { authApiClient, type AuthClientOptions } from '@/lib/api/authenticated-client';
import type { CreateStaffPayload, StaffListQuery, StaffListResponse, StaffProfile, StaffRoleName } from './types';

function toSearchParams(query: StaffListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.roleName) params.set('roleName', query.roleName);
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const value = params.toString();
  return value ? `?${value}` : '';
}

function post(body: unknown): AuthClientOptions {
  return { method: 'POST', body: JSON.stringify(body) };
}

function patch(body: unknown): AuthClientOptions {
  return { method: 'PATCH', body: JSON.stringify(body) };
}

export const staffApi = {
  list: (query: StaffListQuery) => authApiClient<StaffListResponse>(`/dashboard/staff${toSearchParams(query)}`),
  get: (userId: string) => authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}`),
  create: (payload: CreateStaffPayload) => authApiClient<StaffProfile>('/dashboard/staff', post(payload)),
  changeRole: (userId: string, roleName: StaffRoleName) =>
    authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}/role`, patch({ roleName })),
  disable: (userId: string, reason: string) =>
    authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}/disable`, post({ reason })),
  enable: (userId: string, reason: string) =>
    authApiClient<StaffProfile>(`/dashboard/staff/${encodeURIComponent(userId)}/enable`, post({ reason })),
};
```

- [ ] **Step 4: Add React Query hooks**

Create `hooks/use-staff-query.ts`:

```typescript
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '../api';
import type { CreateStaffPayload, StaffListQuery, StaffRoleName } from '../types';

export const staffKeys = {
  all: ['staff'] as const,
  list: (query: StaffListQuery) => [...staffKeys.all, 'list', query] as const,
};

export function useStaffListQuery(query: StaffListQuery) {
  return useQuery({
    queryKey: staffKeys.list(query),
    queryFn: () => staffApi.list(query),
  });
}

export function useCreateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useChangeStaffRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: StaffRoleName }) =>
      staffApi.changeRole(userId, roleName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useSetStaffStatusMutation(enabled: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      enabled ? staffApi.enable(userId, reason) : staffApi.disable(userId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffKeys.all }),
  });
}
```

- [ ] **Step 5: Add API tests**

Create `staff-api.spec.ts` mocking `authApiClient` and assert:

- `list` serializes search, role, status, page, limit.
- `create` sends `POST /dashboard/staff`.
- `changeRole` sends `PATCH /dashboard/staff/:userId/role`.
- `disable` and `enable` send POST status actions.

- [ ] **Step 6: Run focused Management App staff API tests**

Run:

```bash
pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/staff/__tests__/staff-api.spec.ts
```

Expected: PASS.

---

### Task 6: Management App Staff UI

**Files:**

- Create: `apps/management-app/src/features/staff/components/staff-filters.tsx`
- Create: `apps/management-app/src/features/staff/components/staff-table.tsx`
- Create: `apps/management-app/src/features/staff/components/create-staff-dialog.tsx`
- Create: `apps/management-app/src/features/staff/components/change-staff-role-dialog.tsx`
- Create: `apps/management-app/src/features/staff/components/staff-status-dialog.tsx`
- Create: `apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx`
- Modify: `apps/management-app/src/app/(dashboard)/dashboard/staff/page.tsx`

- [ ] **Step 1: Write failing UI policy tests**

Create `staff-page-policy.spec.tsx` with mocked hooks and auth store. Test:

```typescript
it('renders staff rows with mapped role and status labels', async () => {});
it('shows role and status actions for owner', async () => {});
it('hides role and status actions for manager', async () => {});
it('manager create dialog excludes manager role', async () => {});
```

Expected role labels must come from `staffRoleVi` in `@einvoice/shared-constants`, and status labels from `staffStatusVi` in `@einvoice/shared-constants`.

- [ ] **Step 2: Run failing UI tests**

Run:

```bash
pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement filters**

`StaffFilters` props:

```typescript
type StaffFiltersProps = {
  query: StaffListQuery;
  onQueryChange: (query: StaffListQuery) => void;
};
```

Controls:

- Search input for name/email.
- Role select: all, Manager, Waiter, Chef, Barista.
- Status select: all, active, disabled.

Use fixed control widths so filters do not shift layout.

- [ ] **Step 4: Implement create dialog**

`CreateStaffDialog` props:

```typescript
type CreateStaffDialogProps = {
  currentRoles: string[];
};
```

Role options:

```typescript
const ownerCreateRoles: StaffRoleName[] = ['MANAGER', 'WAITER', 'CHEF', 'BARISTA'];
const managerCreateRoles: StaffRoleName[] = ['WAITER', 'CHEF', 'BARISTA'];
```

Fields:

- Email.
- First name.
- Last name.
- Role.
- Initial password.
- `requirePasswordUpdate` checkbox default true.

Copy in the dialog must say that the system does not send email in the current flow. Keep it as direct operational copy, not a marketing explanation.

- [ ] **Step 5: Implement role-change dialog**

Owner-only. It receives target staff and submits `roleName`.

Do not render this dialog trigger for Manager.

- [ ] **Step 6: Implement status dialog**

Owner-only. It receives target staff and action `enable` or `disable`, requires a reason, and submits through `useSetStaffStatusMutation`.

Do not render this dialog trigger for Manager.

- [ ] **Step 7: Implement staff table**

Columns:

- Name.
- Email.
- Role.
- Status.
- Joined date.
- Actions.

Render badges for role/status. Do not show raw `MANAGER`, `WAITER`, `ACTIVE`, or `DISABLED` as user-facing labels.

- [ ] **Step 8: Replace page skeleton**

Update `apps/management-app/src/app/(dashboard)/dashboard/staff/page.tsx` to render a client component. If page-level hook usage is needed, create `apps/management-app/src/features/staff/staff-page-client.tsx` and import it from the route page.

Page state:

```typescript
const [query, setQuery] = useState<StaffListQuery>({ page: 1, limit: 20 });
const { data, isLoading, isError } = useStaffListQuery(query);
```

Use `useAuthStore` to decide Owner vs Manager controls from profile roles.

- [ ] **Step 9: Run focused UI tests**

Run:

```bash
pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/staff/__tests__/staff-page-policy.spec.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit Management App slice**

```bash
git add apps/management-app/src/features/staff 'apps/management-app/src/app/(dashboard)/dashboard/staff/page.tsx'
git commit -m "feat(management): add staff management screen"
```

---

### Task 7: Integration Verification And Documentation

**Files:**

- Modify: `docs/phases/phase-4c-staff-management.md`
- Modify: `docs/phases/phase-4c-staff-management.md` (canonical record)
- Modify if needed: `docs/architecture/permission-matrix.md`
- Modify if needed: `docs/technical-architecture.md`

- [ ] **Step 1: Run focused backend tests**

Run:

```bash
pnpm exec jest --config apps/authorizer/jest.config.cts --runInBand apps/authorizer/src/app/keycloak/services/keycloak-admin.service.spec.ts
pnpm exec jest --config apps/user-access/jest.config.cts --runInBand
pnpm exec jest --config apps/bff/jest.config.cts --runInBand apps/bff/src/app/modules/user/controllers/dashboard-staff.controller.spec.ts apps/bff/src/app/guards/permission.guard.spec.ts apps/bff/src/app/guards/tenant.guard.spec.ts apps/bff/src/app/guards/user.guard.spec.ts
```

Expected:

- Authorizer focused tests pass.
- User-Access tests pass.
- BFF focused tests pass.

- [ ] **Step 2: Run focused frontend tests**

Run:

```bash
pnpm exec jest --config apps/management-app/jest.config.cjs --runInBand apps/management-app/src/features/staff
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript checks where practical**

Run:

```bash
pnpm exec tsc -p apps/user-access/tsconfig.spec.json --noEmit
pnpm exec tsc -p apps/bff/tsconfig.spec.json --noEmit
pnpm exec tsc -p apps/management-app/tsconfig.spec.json --noEmit
```

Expected: PASS or only pre-existing unrelated failures documented in the final implementation notes.

- [ ] **Step 4: Manual live smoke**

Start the local stack according to the current dev workflow, then verify:

1. Owner logs into Management App and opens `/dashboard/staff`.
2. Owner creates a Waiter with an initial password.
3. Waiter logs in and is routed to `/pos`.
4. Owner changes Waiter role to Chef.
5. Chef logs in and is routed to `/kds/kitchen`.
6. Owner disables the user.
7. Disabled user cannot log in.
8. Owner re-enables the user.
9. User can log in again.
10. Manager logs in and can create Waiter/Chef/Barista but not Manager.

- [ ] **Step 5: Update phase doc status and evidence**

When all automated focused tests and manual smoke pass, update `docs/phases/phase-4c-staff-management.md` and `.vi.md`:

- Change phase status from incomplete to done.
- Check completed acceptance criteria.
- Add acceptance evidence commands and manual smoke notes.

Do not update `permission-matrix.md` unless the implementation changes role-permission assignments.

- [ ] **Step 6: Run doc anchor validation if docs changed beyond phase docs**

Run:

```bash
pnpm verify:doc-anchors
```

Expected: PASS.

- [ ] **Step 7: Final commit**

```bash
git add docs/phases/phase-4c-staff-management.md
git commit -m "docs(phase-4c): record staff management completion evidence"
```

---

## Plan Self-Review

- Spec coverage: backend create/list/detail/role/status, UI route, Owner/Manager policy, Keycloak role replacement, tenant isolation, no email dependency, and verification are covered.
- Marker-term scan: no open-ended marker terms or vague implementation tasks are used in implementation steps.
- Type consistency: `StaffRoleName`, `StaffProfileTcpResponse`, and route `userId` consistently mean Keycloak subject, not Mongo `_id`.
- Permission consistency: role change and enable use `USER_UPDATE`; disable uses `USER_DELETE`; global `ROLE_UPDATE` is not used for staff membership.
