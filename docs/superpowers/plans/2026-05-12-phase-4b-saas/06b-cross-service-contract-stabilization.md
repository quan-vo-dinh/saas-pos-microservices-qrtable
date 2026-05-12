# Phase 4B Cross-Service Contract Stabilization Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` and `superpowers:subagent-driven-development` to implement this plan task-by-task directly on `main`. Steps use checkbox (`- [ ]`) syntax for tracking. Do not create a branch. Commit exactly once after this whole plan file passes verification. Before editing code, read section `0A. Execution Baseline And Dirty Worktree Warning`.

**Goal:** Stabilize the Phase 4B dashboard subscription and payment-settings flows after plan 06 by fixing the real root causes across management-app, BFF guards, SaaS TCP handlers, Payment settings, and cross-service verification.

**Architecture:** BFF remains the HTTP and guard boundary. SaaS Service owns tenant, plan, subscription, and subscription invoice business behavior. Payment Service owns tenant payment settings and SePay OAuth state. This fix adds contract tests before code changes, keeps controllers thin, moves SaaS operational logic into focused services, and adds an executable dashboard smoke gate so this class of cross-service mismatch is caught before plan 07.

**Tech Stack:** Nx 22, NestJS 11 TCP microservices, TypeORM/PostgreSQL, Redis, Next.js 16 management-app, TanStack Query, Jest, shell smoke script with curl, browser-use/manual browser verification.

---

## 0A. Execution Baseline And Dirty Worktree Warning

This plan was written after investigating committed Phase 4B agent work plus an existing dirty working tree that contains provisional debug fixes. Those dirty files are useful evidence, but they are not verified source of truth.

At execution start, run:

```bash
git status --short
git log --oneline -8
```

Expected committed baseline includes these Phase 4B commits:

```txt
850f802 feat: add phase 4b shared contracts and schema
1883fc1 feat: add sepay connect tenant payment settings
728902e feat: implement phase 4b saas lifecycle
2e9b9fb feat: expose phase 4b bff api and guards
61fae9d feat: integrate phase 4b cross-service lifecycle
8f9ed2c feat: add phase 4b management app workflows
d813c44 docs: add phase 4b stabilization fix plan
```

If the working tree is dirty with files like the following, treat them as partial attempts created during debugging, not as completed implementation:

```txt
apps/bff/src/app/guards/user.guard.spec.ts
apps/management-app/src/app/(admin)/admin/plans/page.tsx
apps/management-app/src/app/(admin)/admin/tenants/[id]/page.tsx
apps/management-app/src/app/(admin)/admin/tenants/page.tsx
apps/management-app/src/app/(dashboard)/dashboard/billing/[id]/page.tsx
apps/management-app/src/app/(dashboard)/dashboard/payment-settings/page.tsx
apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx
apps/management-app/src/features/saas/admin-billing/invoices-table.tsx
apps/management-app/src/features/saas/admin-tenants/tenant-detail-tabs.tsx
apps/management-app/src/features/saas/subscription/invoice-status-poller.tsx
apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts
apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts
apps/saas/src/app.module.ts
apps/saas/src/controllers/saas.controller.ts
apps/saas/src/repositories/pricing-plan.repository.ts
apps/saas/src/repositories/subscription-invoice.repository.ts
apps/saas/src/repositories/subscription.repository.ts
apps/saas/src/repositories/tenant.repository.ts
apps/saas/src/services/onboarding-saga.integration.spec.ts
apps/saas/src/services/onboarding-saga.service.ts
apps/saas/src/services/subscription-invoice.service.spec.ts
apps/saas/src/services/subscription-invoice.service.ts
apps/saas/src/services/tenant-lifecycle.service.ts
libs/guards/src/lib/user.guard.ts
apps/saas/src/services/saas-operations.service.ts
```

Execution rules for this dirty state:

- Do not revert these files blindly. The user may want to preserve useful work already done.
- Do not accept them blindly either. Validate every changed file against this plan, tests, build, lint, smoke script, and browser verification.
- If `apps/saas/src/services/saas-operations.service.ts` exists, consider it a provisional broad service. The target architecture is the three focused services in Task 3: `pricing-plan-admin.service.ts`, `tenant-admin.service.ts`, and `subscription-dashboard.service.ts`. Remove `SaasOperationsService` before the final commit unless a code review explicitly justifies keeping it.
- If a task says "create" but the dirty working tree already has equivalent code, review and reshape the existing code rather than duplicating it.
- If a task says "modify" and the file is already modified, inspect the diff first with `git diff -- <file>`, then keep only changes that match this plan and pass verification.
- The final commit must include the stabilization code and verification artifacts, not just the current dirty patch as-is.

If the executor starts from a clean checkout, implement the plan normally from Task 1 onward.

## 0. Why This Fix Plan Exists

The visible failures are on:

- `GET /api/v1/dashboard/subscription`
- `GET /api/v1/dashboard/payment-settings`

The root cause is not isolated to `06-management-app-admin-dashboard.md`. Plan 06 exposed the issue because it was the first plan to call the real BFF routes from browser UI.

### Evidence From Agent Commits

| Commit                                                    | Plan                                        | Finding                                                                                                                                                                                                                                                             | Classification                             |
| --------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `728902e feat: implement phase 4b saas lifecycle`         | `02-saas-service-lifecycle-subscription.md` | SaaS controller only exposed onboarding, suspend, activate, and subscription webhook. It did not expose `TENANT.LIST`, `PLAN.LIST`, `PLAN.LIST_ACTIVE`, `SUBSCRIPTION.GET_CURRENT`, invoice read/cancel/manual-confirm, or admin subscription handlers used by BFF. | Plan 02 detail gap plus implementation gap |
| `1883fc1 feat: add sepay connect tenant payment settings` | `03-payment-service-sepay-connect.md`       | `TenantPaymentSettingsService.get()` required a pre-existing row. Existing tenants or failed onboarding could call `GET /dashboard/payment-settings` before a row existed.                                                                                          | Edge-case gap                              |
| `2e9b9fb feat: expose phase 4b bff api and guards`        | `04-bff-guards-webhooks-api.md`             | BFF controllers forward correct route intent, but tests mock TCP clients only. No test proves downstream SaaS/Payment handlers exist. `UserGuard` reads only handler-level `@Authorization`, while new SaaS dashboard controllers set auth at class level.          | Guard bug plus contract-test gap           |
| `8f9ed2c feat: add phase 4b management app workflows`     | `06-management-app-admin-dashboard.md`      | UI calls real endpoints. Some Phase 4B pages did not gate queries on auth-store readiness. Browser verification was not completed.                                                                                                                                  | Verification gap                           |

### Spec Requirements That Must Be Preserved

From `docs/specs/business-logic-phase-4b-spec.md`:

- Q22: `tenant_payment_settings` belongs to Payment Service.
- Q23: Tier 1 uses real SePay OAuth2 Connect.
- Q24: Tier 2 subscription billing is auto webhook plus manual fallback.
- BFF routes include `/dashboard/subscription/*` and `/dashboard/payment-settings/*`.
- SaaS Service owns `tenants`, `pricing_plans`, `subscriptions`, and `subscription_invoices`.
- Payment Service owns OAuth tokens and tenant bank settings.
- Suspended tenants must still be able to view subscription/billing/payment settings.

### Scope

In scope:

- Fix `AUTH_USER_DATA_NOT_FOUND` caused by class-level `@Authorization`.
- Add regression tests for BFF route metadata and guard chain behavior.
- Add SaaS TCP handlers required by Phase 4B BFF routes.
- Add focused SaaS operational services and repository methods needed by those handlers.
- Make `PAYMENT_SETTINGS.GET` idempotent for tenants without settings rows.
- Fix onboarding saga TCP envelope for `PAYMENT_SETTINGS.CREATE_EMPTY`.
- Gate management-app SaaS queries until auth store has token.
- Add a repeatable dashboard smoke script and a handoff template.

Out of scope:

- New landing page and Customer PWA work from plan 07.
- Full SePay real-money webhook demo.
- Subscription proration, refunds, or multi-bank active routing.
- Rewriting all Phase 4B UI tables to TanStack Table.

---

## 1. File Structure

### Tests First

- Create: `apps/saas/src/controllers/saas.controller.contract.spec.ts`
  - Verifies SaaS controller exposes every TCP pattern that BFF Phase 4B routes call.
- Modify: `apps/bff/src/app/guards/user.guard.spec.ts`
  - Adds class-level `@Authorization` regression coverage.
- Modify: `apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts`
  - Adds missing-row GET behavior.
- Modify: `apps/saas/src/services/onboarding-saga.integration.spec.ts`
  - Locks TCP envelope for Payment settings creation.
- Modify: `apps/saas/src/services/subscription-invoice.service.spec.ts`
  - Locks `periodEndsAt` behavior for paid invoice activation.
- Create: `apps/management-app/src/features/saas/__tests__/dashboard-query-auth-readiness.spec.tsx`
  - Verifies subscription and payment settings pages do not call BFF before auth is hydrated.

### SaaS Service

- Modify: `apps/saas/src/controllers/saas.controller.ts`
  - Add missing `TENANT`, `PLAN`, and `SUBSCRIPTION` message handlers.
- Modify: `apps/saas/src/app.module.ts`
  - Register new focused service providers.
- Create: `apps/saas/src/services/tenant-admin.service.ts`
  - Tenant admin list/detail/update/status/usage/audit read model.
- Create: `apps/saas/src/services/pricing-plan-admin.service.ts`
  - Pricing plan list/create/update/deactivate/public list behavior.
- Create: `apps/saas/src/services/subscription-dashboard.service.ts`
  - Owner dashboard current subscription, history, checkout delegation, invoice detail/cancel/status.
- Modify: `apps/saas/src/services/subscription-invoice.service.ts`
  - Ensure checkout/list/get/cancel/manual-confirm methods exist; ensure webhook uses invoice `periodEndsAt`.
- Modify: `apps/saas/src/services/onboarding-saga.service.ts`
  - Wrap Payment TCP call with `{ data, processId }`.
- Modify: `apps/saas/src/services/tenant-lifecycle.service.ts`
  - Implement `close()`.
- Modify: `apps/saas/src/repositories/tenant.repository.ts`
- Modify: `apps/saas/src/repositories/pricing-plan.repository.ts`
- Modify: `apps/saas/src/repositories/subscription.repository.ts`
- Modify: `apps/saas/src/repositories/subscription-invoice.repository.ts`

### Payment Service

- Modify: `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`
  - Make `get()` create an empty row when missing.

### BFF / Guards

- Modify: `libs/guards/src/lib/user.guard.ts`
  - Read `@Authorization` metadata from handler and class.

### Management App

- Modify:
  - `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx`
  - `apps/management-app/src/app/(dashboard)/dashboard/payment-settings/page.tsx`
  - `apps/management-app/src/app/(dashboard)/dashboard/billing/[id]/page.tsx`
  - `apps/management-app/src/features/saas/subscription/invoice-status-poller.tsx`
  - `apps/management-app/src/app/(admin)/admin/tenants/page.tsx`
  - `apps/management-app/src/app/(admin)/admin/plans/page.tsx`
  - `apps/management-app/src/app/(admin)/admin/tenants/[id]/page.tsx`
  - `apps/management-app/src/features/saas/admin-billing/invoices-table.tsx`
  - `apps/management-app/src/features/saas/admin-tenants/tenant-detail-tabs.tsx`

### Verification Tooling

- Create: `tools/demo/phase-4b-dashboard-smoke.sh`
- Create: `docs/superpowers/handoffs/2026-05-13-phase-4b-stabilization-verification.md`

---

## Task 1: Lock The Cross-Service Contract With Failing Tests

**Files:**

- Create: `apps/saas/src/controllers/saas.controller.contract.spec.ts`
- Modify: `apps/bff/src/app/modules/saas/__tests__/phase-4b-contract.spec.ts`

- [ ] **Step 1: Add SaaS controller message-pattern contract test**

Create `apps/saas/src/controllers/saas.controller.contract.spec.ts`:

```ts
import 'reflect-metadata';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { SaasController } from './saas.controller';

function messagePatterns(controller: { prototype: Record<string, unknown> }): unknown[] {
  const prototype = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .flatMap((name) => {
      const handler = prototype[name];
      return typeof handler === 'function' ? (Reflect.getMetadata(PATTERN_METADATA, handler) ?? []) : [];
    });
}

describe('SaasController Phase 4B TCP contracts', () => {
  it('exposes every SaaS TCP pattern used by Phase 4B BFF routes', () => {
    expect(messagePatterns(SaasController)).toEqual(
      expect.arrayContaining([
        TCP_REQUEST_MESSAGE.TENANT.GET_PLATFORM_STATS,
        TCP_REQUEST_MESSAGE.TENANT.LIST,
        TCP_REQUEST_MESSAGE.TENANT.GET_BY_ID,
        TCP_REQUEST_MESSAGE.TENANT.UPDATE,
        TCP_REQUEST_MESSAGE.TENANT.SUSPEND,
        TCP_REQUEST_MESSAGE.TENANT.ACTIVATE,
        TCP_REQUEST_MESSAGE.TENANT.CLOSE,
        TCP_REQUEST_MESSAGE.TENANT.GET_USAGE,
        TCP_REQUEST_MESSAGE.TENANT.GET_AUDIT,
        TCP_REQUEST_MESSAGE.PLAN.LIST_ACTIVE,
        TCP_REQUEST_MESSAGE.PLAN.LIST,
        TCP_REQUEST_MESSAGE.PLAN.CREATE,
        TCP_REQUEST_MESSAGE.PLAN.UPDATE,
        TCP_REQUEST_MESSAGE.PLAN.DELETE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_HISTORY,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.ASSIGN,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_INVOICES,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.MANUAL_CONFIRM_INVOICE,
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.HANDLE_WEBHOOK,
      ]),
    );
  });
});
```

- [ ] **Step 2: Extend BFF route contract test**

Modify `apps/bff/src/app/modules/saas/__tests__/phase-4b-contract.spec.ts` so it also locks the BFF to downstream TCP pattern map:

```ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

describe('Phase 4B BFF SaaS contracts', () => {
  it('defines unique Phase 4B route constants', () => {
    const routes = Object.values(SAAS_BFF_ROUTES);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('keeps representative public/admin/dashboard/webhook routes stable', () => {
    expect(SAAS_BFF_ROUTES).toMatchObject({
      publicPlans: 'public/plans',
      adminTenants: 'admin/tenants',
      adminTenantOnboard: 'admin/tenants/onboard',
      dashboardSubscription: 'dashboard/subscription',
      dashboardPaymentSettings: 'dashboard/payment-settings',
      tier2Webhook: 'payment/sepay/webhook/platform',
      tier1Webhook: 'payment/sepay/webhook/:tenantSlug',
    });
  });

  it('documents every dashboard route downstream target that must exist in service controllers', () => {
    expect({
      [SAAS_BFF_ROUTES.dashboardSubscription]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
      [SAAS_BFF_ROUTES.dashboardSubscriptionCheckout]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
      [SAAS_BFF_ROUTES.dashboardSubscriptionCancel]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL,
      [SAAS_BFF_ROUTES.dashboardBillingInvoiceById]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      [SAAS_BFF_ROUTES.dashboardBillingInvoiceStatus]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      [SAAS_BFF_ROUTES.dashboardBillingInvoiceCancel]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE,
      [SAAS_BFF_ROUTES.dashboardPaymentSettings]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET,
      [SAAS_BFF_ROUTES.dashboardSepayAuthorizeUrl]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GENERATE_AUTHORIZE_URL,
      [SAAS_BFF_ROUTES.dashboardSepayCallback]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK,
      [SAAS_BFF_ROUTES.dashboardSepaySelectBank]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK,
      [SAAS_BFF_ROUTES.dashboardSepayDisconnect]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.DISCONNECT,
    }).toEqual({
      'dashboard/billing/:id': TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      'dashboard/billing/:id/cancel': TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE,
      'dashboard/billing/:id/status': TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      'dashboard/payment-settings': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET,
      'dashboard/payment-settings/disconnect': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.DISCONNECT,
      'dashboard/payment-settings/sepay/authorize-url': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GENERATE_AUTHORIZE_URL,
      'dashboard/payment-settings/sepay/callback': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK,
      'dashboard/payment-settings/sepay/select-bank': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK,
      'dashboard/subscription': TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
      'dashboard/subscription/cancel': TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL,
      'dashboard/subscription/checkout': TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
    });
  });
});
```

- [ ] **Step 3: Run tests and verify current breakage**

Run:

```bash
pnpm nx test saas --runInBand --testFile=apps/saas/src/controllers/saas.controller.contract.spec.ts
pnpm nx test bff --runInBand --testFile=apps/bff/src/app/modules/saas/__tests__/phase-4b-contract.spec.ts
```

Expected before implementation:

```txt
SaaS contract test fails on missing message patterns when run from clean commit 8f9ed2c.
BFF contract test passes only when route constants still map to the expected downstream TCP messages.
```

If the current working tree already contains a prior debug patch, the SaaS contract test may pass. In that case, keep the test and continue with Task 2 to formalize the implementation quality.

---

## Task 2: Fix Class-Level Authorization In UserGuard

**Files:**

- Modify: `libs/guards/src/lib/user.guard.ts`
- Modify: `apps/bff/src/app/guards/user.guard.spec.ts`

- [ ] **Step 1: Add regression tests**

Add this test to `apps/bff/src/app/guards/user.guard.spec.ts`:

```ts
it('reads class-level authorization metadata for secured controllers', async () => {
  const getAllAndOverride = jest.fn().mockReturnValue({ secured: true });
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const guard = new UserGuard(reflector, {} as never, { get: jest.fn(), set: jest.fn() } as never);

  await expect(guard.canActivate(getContext({ headers: {} }))).rejects.toThrow(BusinessException);

  expect(getAllAndOverride).toHaveBeenCalledWith(MetadataKey.SECURED, ['handler', 'controller']);
});
```

Also adjust `reflectorWithAuth` in the same spec to mock `getAllAndOverride` instead of `get`:

```ts
const reflectorWithAuth = (authOptions: { secured: boolean }) =>
  ({
    getAllAndOverride: jest.fn().mockReturnValue(authOptions),
  }) as unknown as Reflector;
```

- [ ] **Step 2: Run test and verify failure on clean HEAD**

Run:

```bash
pnpm nx test bff --runInBand --testFile=apps/bff/src/app/guards/user.guard.spec.ts
```

Expected before implementation from clean `8f9ed2c`:

```txt
FAIL because UserGuard calls reflector.get(...) and ignores class-level metadata.
```

- [ ] **Step 3: Implement guard fix**

Modify `libs/guards/src/lib/user.guard.ts`:

```ts
canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
  const authOptions = this.reflector.getAllAndOverride<{ secured: boolean }>(MetadataKey.SECURED, [
    context.getHandler(),
    context.getClass(),
  ]);

  const req = context.switchToHttp().getRequest<Record<string, unknown>>();

  if (!authOptions?.secured) {
    return true;
  }

  return this.verifyUserToken(req);
}
```

- [ ] **Step 4: Verify guard fix**

Run:

```bash
pnpm nx test bff --runInBand --testFile=apps/bff/src/app/guards/user.guard.spec.ts --skip-nx-cache
pnpm nx lint bff --skip-nx-cache
```

Expected:

```txt
UserGuard tests pass.
BFF lint exits 0. Existing warnings are acceptable only if they are already present outside the changed lines.
```

---

## Task 3: Implement Focused SaaS Operational Services And Missing TCP Handlers

**Files:**

- Create: `apps/saas/src/services/pricing-plan-admin.service.ts`
- Create: `apps/saas/src/services/tenant-admin.service.ts`
- Create: `apps/saas/src/services/subscription-dashboard.service.ts`
- Modify: `apps/saas/src/controllers/saas.controller.ts`
- Modify: `apps/saas/src/app.module.ts`
- Modify: `apps/saas/src/repositories/pricing-plan.repository.ts`
- Modify: `apps/saas/src/repositories/tenant.repository.ts`
- Modify: `apps/saas/src/repositories/subscription.repository.ts`
- Modify: `apps/saas/src/repositories/subscription-invoice.repository.ts`

Do not keep all new behavior in one large "operations" service if starting from clean HEAD. If a prior debug patch already created `SaasOperationsService`, split it into the three focused services above before final verification.

- [ ] **Step 1: Add repository methods needed by services**

`apps/saas/src/repositories/pricing-plan.repository.ts` must expose:

```ts
list(query: { isActive?: boolean | string; billingPeriod?: string } = {}): Promise<PricingPlan[]> {
  const qb = this.repo.createQueryBuilder('plan');

  if (query.isActive !== undefined && query.isActive !== '') {
    const active = query.isActive === true || query.isActive === 'true';
    qb.andWhere('plan.isActive = :active', { active });
  }

  if (query.billingPeriod) {
    qb.andWhere('plan.billingPeriod = :billingPeriod', { billingPeriod: query.billingPeriod });
  }

  return qb.orderBy('plan.displayOrder', 'ASC').addOrderBy('plan.priceVnd', 'ASC').getMany();
}

createPlan(data: Partial<PricingPlan>): Promise<PricingPlan> {
  return this.repo.save(
    this.repo.create({
      ...data,
      code: data.code ? normalizePlanCode(data.code) : data.code,
      isActive: data.isActive ?? true,
      features: data.features ?? [],
    }),
  );
}

async updatePlan(id: string, patch: Partial<PricingPlan>): Promise<PricingPlan> {
  const update = {
    ...patch,
    code: patch.code ? normalizePlanCode(patch.code) : patch.code,
    updatedAt: new Date(),
  };
  await this.repo.update({ id }, update);
  const updated = await this.repo.findOne({ where: { id } });
  if (!updated) {
    throw new NotFoundException('PLAN_NOT_FOUND');
  }
  return updated;
}

deactivate(id: string): Promise<PricingPlan> {
  return this.updatePlan(id, { isActive: false });
}
```

`apps/saas/src/repositories/tenant.repository.ts` must expose paginated list, profile update, and count by status:

```ts
async list(query: {
  search?: string;
  status?: TenantStatus | string;
  page?: number | string;
  limit?: number | string;
}): Promise<{ items: Tenant[]; page: number; limit: number; total: number }> {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
  const qb = this.repo.createQueryBuilder('tenant');

  if (query.search?.trim()) {
    qb.andWhere('(tenant.name ILIKE :search OR tenant.slug ILIKE :search)', {
      search: `%${query.search.trim()}%`,
    });
  }

  if (query.status) {
    qb.andWhere('tenant.status = :status', { status: query.status });
  }

  const [items, total] = await qb
    .orderBy('tenant.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return { items, page, limit, total };
}

async updateProfile(id: string, patch: Partial<Tenant>): Promise<Tenant> {
  await this.repo.update({ id }, { ...patch, updatedAt: new Date() });
  const updated = await this.findById(id);
  if (!updated) {
    throw new NotFoundException('TENANT_NOT_FOUND');
  }
  return updated;
}

countByStatus(status: TenantStatus): Promise<number> {
  return this.repo.count({ where: { status } });
}
```

`apps/saas/src/repositories/subscription.repository.ts` must expose:

```ts
findById(id: string): Promise<Subscription | null> {
  return this.repo.findOne({ where: { id } });
}

findActiveByTenantIds(tenantIds: string[]): Promise<Subscription[]> {
  if (!tenantIds.length) {
    return Promise.resolve([]);
  }
  return this.repo.find({ where: { tenantId: In(tenantIds), status: SubscriptionStatus.ACTIVE } });
}

async cancelActive(tenantId: string, subscriptionId: string, reason: string): Promise<Subscription> {
  await this.repo.update(
    { id: subscriptionId, tenantId, status: SubscriptionStatus.ACTIVE },
    { status: SubscriptionStatus.CANCELED, canceledAt: new Date(), canceledReason: reason },
  );
  const updated = await this.findById(subscriptionId);
  if (!updated) {
    throw new Error('SUBSCRIPTION_NOT_FOUND_AFTER_CANCEL');
  }
  return updated;
}
```

`apps/saas/src/repositories/subscription-invoice.repository.ts` must expose:

```ts
findById(id: string): Promise<SubscriptionInvoice | null> {
  return this.repo.findOne({ where: { id } });
}

async createInvoice(data: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice> {
  return this.repo.save(this.repo.create(data));
}

async list(query: {
  tenantId?: string;
  status?: string;
  planCode?: string;
  from?: string;
  to?: string;
  page?: number | string;
  limit?: number | string;
}): Promise<{ items: SubscriptionInvoice[]; page: number; limit: number; total: number }> {
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
  const qb = this.repo.createQueryBuilder('invoice');

  if (query.tenantId) qb.andWhere('invoice.tenantId = :tenantId', { tenantId: query.tenantId });
  if (query.status) qb.andWhere('invoice.status = :status', { status: query.status });
  if (query.planCode) qb.andWhere('invoice.planCodeSnapshot = :planCode', { planCode: query.planCode.trim().toUpperCase() });
  if (query.from) qb.andWhere('invoice.createdAt >= :from', { from: new Date(query.from) });
  if (query.to) qb.andWhere('invoice.createdAt <= :to', { to: new Date(query.to) });

  const [items, total] = await qb
    .orderBy('invoice.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return { items, page, limit, total };
}

async updateById(id: string, patch: Partial<SubscriptionInvoice>): Promise<SubscriptionInvoice> {
  await this.repo.update({ id }, { ...patch, updatedAt: new Date() });
  const updated = await this.findById(id);
  if (!updated) {
    throw new NotFoundException('SUBSCRIPTION_INVOICE_NOT_FOUND');
  }
  return updated;
}
```

- [ ] **Step 2: Add pricing plan admin service**

Create `apps/saas/src/services/pricing-plan-admin.service.ts`:

```ts
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Injectable } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';

@Injectable()
export class PricingPlanAdminService {
  constructor(private readonly planRepository: PricingPlanRepository) {}

  async listPublic(): Promise<Record<string, unknown>[]> {
    return (await this.planRepository.listActive()).map((plan) => this.toResponse(plan));
  }

  async list(query: { isActive?: string; billingPeriod?: string } = {}): Promise<Record<string, unknown>[]> {
    return (await this.planRepository.list(query)).map((plan) => this.toResponse(plan));
  }

  async create(input: Partial<PricingPlan>): Promise<Record<string, unknown>> {
    return this.toResponse(await this.planRepository.createPlan(input));
  }

  async update(id: string, input: Partial<PricingPlan>): Promise<Record<string, unknown>> {
    return this.toResponse(await this.planRepository.updatePlan(id, input));
  }

  async deactivate(id: string): Promise<Record<string, unknown>> {
    return this.toResponse(await this.planRepository.deactivate(id));
  }

  private toResponse(plan: PricingPlan): Record<string, unknown> {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? null,
      priceVnd: Number(plan.priceVnd),
      billingPeriod: plan.billingPeriod,
      maxTables: plan.maxTables,
      maxStaff: plan.maxStaff,
      maxOrdersPerDay: plan.maxOrdersPerDay,
      features: plan.features ?? [],
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    };
  }
}
```

- [ ] **Step 3: Add tenant admin service**

Create `apps/saas/src/services/tenant-admin.service.ts`:

```ts
import { normalizePlanCode, TenantStatus } from '@common/constants/saas.constants';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';

@Injectable()
export class TenantAdminService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PricingPlanRepository,
  ) {}

  async getPlatformStats(): Promise<Record<string, unknown>> {
    const [activeTenants, suspendedTenants, closedTenants, plans] = await Promise.all([
      this.tenantRepository.countByStatus(TenantStatus.ACTIVE),
      this.tenantRepository.countByStatus(TenantStatus.SUSPENDED),
      this.tenantRepository.countByStatus(TenantStatus.CLOSED),
      this.planRepository.listActive(),
    ]);

    return {
      tenants: {
        active: activeTenants,
        suspended: suspendedTenants,
        closed: closedTenants,
        total: activeTenants + suspendedTenants + closedTenants,
      },
      activePlans: plans.length,
    };
  }

  async list(query: {
    search?: string;
    status?: string;
    planCode?: string;
    page?: string;
    limit?: string;
  }): Promise<Record<string, unknown>> {
    const result = await this.tenantRepository.list(query);
    const activeSubscriptions = await this.subscriptionRepository.findActiveByTenantIds(
      result.items.map((tenant) => tenant.id),
    );
    const subscriptionByTenant = new Map(
      activeSubscriptions.map((subscription) => [subscription.tenantId, subscription]),
    );
    let items = result.items.map((tenant) => this.toTenantListItem(tenant, subscriptionByTenant.get(tenant.id)));

    if (query.planCode?.trim()) {
      const planCode = normalizePlanCode(query.planCode);
      items = items.filter((item) => item.planCode === planCode);
    }

    return {
      ...result,
      items,
      total: query.planCode?.trim() ? items.length : result.total,
    };
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const tenant = await this.findTenant(id);
    const current = await this.subscriptionRepository.findActiveByTenantId(id);
    return this.toTenantDetail(tenant, current ?? undefined);
  }

  async update(id: string, input: Partial<Tenant>): Promise<Record<string, unknown>> {
    const tenant = await this.tenantRepository.updateProfile(id, input);
    const current = await this.subscriptionRepository.findActiveByTenantId(id);
    return this.toTenantDetail(tenant, current ?? undefined);
  }

  async usage(tenantId: string): Promise<Record<string, unknown>> {
    await this.findTenant(tenantId);
    const current = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    const plan = current ? await this.planRepository.findByCode(current.planCodeSnapshot) : null;
    return {
      tablesUsed: 0,
      tablesMax: plan?.maxTables ?? 0,
      staffUsed: 0,
      staffMax: plan?.maxStaff ?? 0,
      ordersToday: 0,
      ordersMaxPerDay: plan?.maxOrdersPerDay ?? 0,
    };
  }

  async audit(tenantId: string): Promise<Record<string, unknown>[]> {
    const tenant = await this.findTenant(tenantId);
    return [
      {
        id: `${tenant.id}:created`,
        action: 'TENANT_CREATED',
        at: this.toIso(tenant.createdAt),
        detail: `${tenant.name} được tạo trên nền tảng.`,
      },
    ];
  }

  private async findTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
    return tenant;
  }

  private toTenantListItem(tenant: Tenant, subscription?: Subscription): Record<string, unknown> {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      type: tenant.type,
      ownerEmail: null,
      planCode: subscription?.planCodeSnapshot ?? null,
      subscriptionStatus: subscription?.status ?? null,
      expiresAt: subscription?.expiresAt ? this.toIso(subscription.expiresAt) : null,
      createdAt: this.toIso(tenant.createdAt),
    };
  }

  private toTenantDetail(tenant: Tenant, subscription?: Subscription): Record<string, unknown> {
    return {
      ...this.toTenantListItem(tenant, subscription),
      address: tenant.address ?? null,
      ownerId: tenant.ownerId ?? null,
      defaultCurrency: tenant.defaultCurrency ?? 'VND',
      defaultLocale: tenant.defaultLocale ?? 'vi-VN',
      operatingModes: tenant.operatingModes ?? [],
      suspendedAt: tenant.suspendedAt ? this.toIso(tenant.suspendedAt) : null,
      suspendedReason: tenant.suspendedReason ?? null,
      closedAt: tenant.closedAt ? this.toIso(tenant.closedAt) : null,
      closedReason: tenant.closedReason ?? null,
    };
  }

  private toIso(value: Date | string | undefined): string {
    return value instanceof Date ? value.toISOString() : (value ?? '');
  }
}
```

- [ ] **Step 4: Add subscription dashboard service**

Create `apps/saas/src/services/subscription-dashboard.service.ts`:

```ts
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { SubscriptionInvoiceService } from './subscription-invoice.service';
import { SubscriptionService } from './subscription.service';
import { TenantAdminService } from './tenant-admin.service';

@Injectable()
export class SubscriptionDashboardService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly planRepository: PricingPlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionInvoiceService: SubscriptionInvoiceService,
    private readonly tenantAdminService: TenantAdminService,
  ) {}

  async getDashboardSubscription(tenantId: string): Promise<Record<string, unknown>> {
    const tenant = await this.findTenant(tenantId);
    const [current, plans, history, usage] = await Promise.all([
      this.subscriptionRepository.findActiveByTenantId(tenantId),
      this.planRepository.listActive(),
      this.subscriptionRepository.listByTenantId(tenantId),
      this.tenantAdminService.usage(tenantId),
    ]);
    const currentPlan = current ? await this.planRepository.findByCode(current.planCodeSnapshot) : null;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
      },
      current: current ? this.toCurrentSubscription(current, currentPlan ?? undefined) : null,
      usage,
      plans: plans.map((plan) => this.toPlanResponse(plan)),
      history: history.map((subscription) => this.toSubscriptionHistory(subscription)),
    };
  }

  async listSubscriptions(tenantId: string): Promise<Record<string, unknown>[]> {
    await this.findTenant(tenantId);
    return (await this.subscriptionRepository.listByTenantId(tenantId)).map((subscription) =>
      this.toSubscriptionHistory(subscription),
    );
  }

  async assignSubscription(input: {
    tenantId: string;
    planCode: string;
    billingPeriod?: 'MONTHLY' | 'YEARLY';
    createdByUserId?: string | null;
  }): Promise<Record<string, unknown>> {
    await this.findTenant(input.tenantId);
    const now = new Date();
    const subscription = await this.subscriptionService.assignPlan({
      tenantId: input.tenantId,
      planCode: input.planCode,
      source: 'ADMIN_MANUAL',
      startsAt: now,
      expiresAt: this.addBillingPeriod(now, input.billingPeriod ?? 'MONTHLY'),
      createdByUserId: input.createdByUserId ?? null,
    });
    return this.toSubscriptionHistory(subscription as Subscription);
  }

  async cancelSubscription(input: { tenantId: string; reason?: string | null }): Promise<Record<string, unknown>> {
    const current = await this.subscriptionRepository.findActiveByTenantId(input.tenantId);
    if (!current) {
      throw new NotFoundException('ACTIVE_SUBSCRIPTION_NOT_FOUND');
    }
    if (!input.reason?.trim()) {
      throw new BadRequestException('CANCEL_REASON_REQUIRED');
    }
    return this.toSubscriptionHistory(
      await this.subscriptionRepository.cancelActive(input.tenantId, current.id, input.reason.trim()),
    );
  }

  checkoutInvoice(input: {
    tenantId: string;
    planCode: string;
    billingPeriod: 'MONTHLY' | 'YEARLY';
    requestedByUserId: string;
  }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.checkout(input);
  }

  listInvoices(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.list(query);
  }

  getInvoice(input: { tenantId?: string; invoiceId: string; statusOnly?: boolean }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.getInvoice(input);
  }

  cancelInvoice(input: {
    tenantId?: string;
    invoiceId: string;
    reason?: string | null;
  }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.cancelInvoice(input);
  }

  manualConfirmInvoice(input: {
    invoiceId: string;
    confirmedByUserId: string;
    note?: string | null;
  }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.manualConfirm(input);
  }

  private async findTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
    return tenant;
  }

  private toPlanResponse(plan: PricingPlan): Record<string, unknown> {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? null,
      priceVnd: Number(plan.priceVnd),
      billingPeriod: plan.billingPeriod,
      maxTables: plan.maxTables,
      maxStaff: plan.maxStaff,
      maxOrdersPerDay: plan.maxOrdersPerDay,
      features: plan.features ?? [],
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    };
  }

  private toSubscriptionHistory(subscription: Subscription): Record<string, unknown> {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      pricingPlanId: subscription.pricingPlanId,
      planCode: subscription.planCodeSnapshot,
      planCodeSnapshot: subscription.planCodeSnapshot,
      priceVndSnapshot: Number(subscription.priceVndSnapshot),
      status: subscription.status,
      startsAt: this.toIso(subscription.startsAt),
      expiresAt: subscription.expiresAt ? this.toIso(subscription.expiresAt) : null,
      createdAt: this.toIso(subscription.createdAt),
    };
  }

  private toCurrentSubscription(subscription: Subscription, plan?: PricingPlan): Record<string, unknown> {
    return {
      planCode: subscription.planCodeSnapshot,
      planName: plan?.name ?? subscription.planCodeSnapshot,
      status: subscription.status ?? SubscriptionStatus.ACTIVE,
      expiresAt: subscription.expiresAt ? this.toIso(subscription.expiresAt) : null,
      billingPeriod: plan?.billingPeriod ?? 'MONTHLY',
      features: plan?.features ?? [],
      maxTables: plan?.maxTables ?? 0,
      maxStaff: plan?.maxStaff ?? 0,
      maxOrdersPerDay: plan?.maxOrdersPerDay ?? 0,
    };
  }

  private addBillingPeriod(now: Date, billingPeriod: 'MONTHLY' | 'YEARLY'): Date {
    const next = new Date(now);
    if (billingPeriod === 'YEARLY') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private toIso(value: Date | string | undefined): string {
    return value instanceof Date ? value.toISOString() : (value ?? '');
  }
}
```

- [ ] **Step 5: Add missing message handlers to `SaasController`**

Modify `apps/saas/src/controllers/saas.controller.ts` so it exposes all patterns from Task 1. Keep the controller thin:

```ts
@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_PLATFORM_STATS)
async getPlatformStats(): Promise<Response<unknown>> {
  return Response.success(await this.tenantAdminService.getPlatformStats());
}

@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.LIST)
async listTenants(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
  return Response.success(await this.tenantAdminService.list(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_BY_ID)
async getTenantById(@RequestParams() body: { id: string }): Promise<Response<unknown>> {
  return Response.success(await this.tenantAdminService.get(body.id));
}

@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.UPDATE)
async updateTenant(@RequestParams() body: { id: string } & Record<string, unknown>): Promise<Response<unknown>> {
  const { id, ...patch } = body;
  return Response.success(await this.tenantAdminService.update(id, patch));
}

@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.CLOSE)
async close(@RequestParams() body: { id?: string; tenantId?: string; reason?: string | null }): Promise<Response<boolean>> {
  await this.tenantLifecycleService.close({ tenantId: this.tenantId(body), reason: body.reason ?? null });
  return Response.success(true);
}

@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_USAGE)
async getTenantUsage(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
  return Response.success(await this.tenantAdminService.usage(body.tenantId));
}

@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.GET_AUDIT)
async getTenantAudit(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
  return Response.success(await this.tenantAdminService.audit(body.tenantId));
}

@MessagePattern(TCP_REQUEST_MESSAGE.PLAN.LIST_ACTIVE)
async listActivePlans(): Promise<Response<unknown>> {
  return Response.success(await this.pricingPlanAdminService.listPublic());
}

@MessagePattern(TCP_REQUEST_MESSAGE.PLAN.LIST)
async listPlans(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
  return Response.success(await this.pricingPlanAdminService.list(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.PLAN.CREATE)
async createPlan(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
  return Response.success(await this.pricingPlanAdminService.create(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.PLAN.UPDATE)
async updatePlan(@RequestParams() body: { id: string } & Record<string, unknown>): Promise<Response<unknown>> {
  const { id, ...patch } = body;
  return Response.success(await this.pricingPlanAdminService.update(id, patch));
}

@MessagePattern(TCP_REQUEST_MESSAGE.PLAN.DELETE)
async deletePlan(@RequestParams() body: { id: string }): Promise<Response<unknown>> {
  return Response.success(await this.pricingPlanAdminService.deactivate(body.id));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT)
async getCurrentSubscription(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.getDashboardSubscription(body.tenantId));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE)
async checkoutInvoice(@RequestParams() body: CheckoutInvoiceTcpRequest): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.checkoutInvoice(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL)
async cancelSubscription(@RequestParams() body: { tenantId: string; reason?: string | null }): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.cancelSubscription(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_HISTORY)
async listSubscriptionHistory(@RequestParams() body: { tenantId: string }): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.listSubscriptions(body.tenantId));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.ASSIGN)
async assignSubscription(
  @RequestParams() body: { tenantId: string; planCode: string; billingPeriod?: 'MONTHLY' | 'YEARLY'; createdByUserId?: string },
): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.assignSubscription(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.LIST_INVOICES)
async listInvoices(@RequestParams() body: Record<string, unknown>): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.listInvoices(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE)
async getInvoice(@RequestParams() body: { tenantId?: string; invoiceId: string; statusOnly?: boolean }): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.getInvoice(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE)
async cancelInvoice(@RequestParams() body: { tenantId?: string; invoiceId: string; reason?: string | null }): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.cancelInvoice(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.SUBSCRIPTION.MANUAL_CONFIRM_INVOICE)
async manualConfirmInvoice(
  @RequestParams() body: { invoiceId: string; confirmedByUserId: string; note?: string | null },
): Promise<Response<unknown>> {
  return Response.success(await this.subscriptionDashboardService.manualConfirmInvoice(body));
}
```

- [ ] **Step 6: Register services**

Modify `apps/saas/src/app.module.ts` providers:

```ts
PricingPlanAdminService,
TenantAdminService,
SubscriptionDashboardService,
```

If `SaasOperationsService` exists from a prior patch, remove it after splitting its methods into the focused services above.

- [ ] **Step 7: Verify SaaS contracts**

Run:

```bash
pnpm nx test saas --runInBand --skip-nx-cache
pnpm nx build saas --skip-nx-cache
pnpm nx lint saas --skip-nx-cache
```

Expected:

```txt
All SaaS tests pass, including saas.controller.contract.spec.ts.
SaaS build passes without TypeScript errors.
SaaS lint exits 0.
```

---

## Task 4: Fix Subscription Invoice Checkout And Activation Edge Cases

**Files:**

- Modify: `apps/saas/src/services/subscription-invoice.service.ts`
- Modify: `apps/saas/src/services/subscription-invoice.service.spec.ts`
- Modify: `apps/saas/src/repositories/subscription-invoice.repository.ts`

- [ ] **Step 1: Add yearly activation regression test**

Modify `apps/saas/src/services/subscription-invoice.service.spec.ts` so paid webhook uses the invoice period end:

```ts
it('assigns subscription using invoice period end when amount is enough', async () => {
  invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
    id: 'invoice-1',
    billingReference: 'QRSUB123',
    amountVnd: 999000,
    status: SubscriptionInvoiceStatus.PENDING,
    tenantId: 'tenant-1',
    planCodeSnapshot: 'PREMIUM',
    periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
  });
  const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

  await service.handleWebhook({ code: 'QRSUB123', transferAmount: 999000, sepayTransactionId: 'tx-1' });

  expect(subscriptionService.assignPlan).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: 'tenant-1',
      planCode: 'PREMIUM',
      expiresAt: new Date('2027-05-12T00:00:00.000Z'),
    }),
  );
});
```

- [ ] **Step 2: Implement invoice methods**

`SubscriptionInvoiceService` must expose:

- `checkout()`: creates `PENDING` invoice with `QRSUB*` billing reference and QR URL.
- `list()`: paginated admin list.
- `getInvoice()`: tenant-scoped detail or status-only response.
- `cancelInvoice()`: only pending invoices can be canceled.
- `manualConfirm()`: marks invoice paid and calls `SubscriptionService.assignPlan`.
- `handleWebhook()`: marks invoice paid and calls `assignPlan` with `expiresAt: invoice.periodEndsAt`.

The webhook must not call a hard-coded `addOneMonth()` helper.

- [ ] **Step 3: Verify invoice tests**

Run:

```bash
pnpm nx test saas --runInBand --testFile=apps/saas/src/services/subscription-invoice.service.spec.ts --skip-nx-cache
pnpm nx test saas --runInBand --skip-nx-cache
```

Expected:

```txt
Subscription invoice tests pass.
All SaaS tests pass.
```

---

## Task 5: Make Payment Settings GET Backward-Compatible

**Files:**

- Modify: `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`
- Modify: `apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts`

- [ ] **Step 1: Add missing-row GET test**

Add to `apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts`:

```ts
it('creates empty settings when get is called for an existing tenant without settings row', async () => {
  repo.findByTenantId.mockResolvedValue(null);
  repo.createEmpty.mockResolvedValue({
    tenantId: 'tenant-1',
    connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
  });
  const service = new TenantPaymentSettingsService(repo as never);

  const result = await service.get({ tenantId: 'tenant-1' });

  expect(repo.createEmpty).toHaveBeenCalledWith('tenant-1');
  expect(result).toEqual(
    expect.objectContaining({
      tenantId: 'tenant-1',
      connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
    }),
  );
});
```

- [ ] **Step 2: Implement idempotent GET**

Modify `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`:

```ts
async get(params: PaymentSettingsByTenantTcpRequest): Promise<TenantPaymentSettingsTcpResponse> {
  const settings = await this.repository.findByTenantId(params.tenantId);
  return this.toResponse(settings ?? (await this.repository.createEmpty(params.tenantId)));
}
```

- [ ] **Step 3: Verify Payment**

Run:

```bash
pnpm nx test payment --runInBand --testNamePattern="TenantPaymentSettings|tenant payment settings" --skip-nx-cache
pnpm nx build payment --skip-nx-cache
pnpm nx lint payment --skip-nx-cache
```

Expected:

```txt
Payment targeted tests pass.
Payment build passes.
Payment lint exits 0.
```

---

## Task 6: Fix Onboarding Saga TCP Envelope To Payment

**Files:**

- Modify: `apps/saas/src/services/onboarding-saga.service.ts`
- Modify: `apps/saas/src/services/onboarding-saga.integration.spec.ts`

- [ ] **Step 1: Update integration test**

Modify the payment settings expectation:

```ts
expect(paymentClient.send).toHaveBeenCalledWith(
  TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY,
  expect.objectContaining({
    data: { tenantId: 'tenant-1' },
    processId: 'p1',
  }),
);
```

- [ ] **Step 2: Wrap Payment TCP request**

Modify `apps/saas/src/services/onboarding-saga.service.ts`:

```ts
await this.resolveTcp(
  this.paymentClient.send(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY, {
    data: { tenantId: tenant.id },
    processId: params.processId,
  }),
);
```

- [ ] **Step 3: Verify onboarding**

Run:

```bash
pnpm nx test saas --runInBand --testFile=apps/saas/src/services/onboarding-saga.integration.spec.ts --skip-nx-cache
pnpm nx test saas --runInBand --skip-nx-cache
```

Expected:

```txt
Onboarding integration tests pass.
All SaaS tests pass.
```

---

## Task 7: Gate Management-App SaaS Queries On Auth Readiness

**Files:**

- Modify: `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx`
- Modify: `apps/management-app/src/app/(dashboard)/dashboard/payment-settings/page.tsx`
- Modify: `apps/management-app/src/app/(dashboard)/dashboard/billing/[id]/page.tsx`
- Modify: `apps/management-app/src/features/saas/subscription/invoice-status-poller.tsx`
- Modify: `apps/management-app/src/app/(admin)/admin/tenants/page.tsx`
- Modify: `apps/management-app/src/app/(admin)/admin/plans/page.tsx`
- Modify: `apps/management-app/src/app/(admin)/admin/tenants/[id]/page.tsx`
- Modify: `apps/management-app/src/features/saas/admin-billing/invoices-table.tsx`
- Modify: `apps/management-app/src/features/saas/admin-tenants/tenant-detail-tabs.tsx`

- [ ] **Step 1: Confirm shared auth readiness hook exists**

`apps/management-app/src/lib/auth/use-auth-ready.ts` must contain:

```ts
'use client';

import { useAuthStore } from '@/lib/auth/auth-store';

/**
 * BFF calls must wait until AuthSessionHydrator has written the access token
 * into the client store; otherwise requests go out without Authorization and return 401.
 */
export function useAuthReadyForBff(): boolean {
  return useAuthStore((s) => s.hydrated && Boolean(s.accessToken));
}
```

- [ ] **Step 2: Apply query gating to subscription page**

Modify `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx`:

```ts
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';

export default function DashboardSubscriptionPage() {
  const authReady = useAuthReadyForBff();

  const sub = useQuery({
    queryKey: ['dashboard-subscription'],
    queryFn: () => saasApi.getDashboardSubscription(),
    enabled: authReady,
  });
}
```

Keep the rest of the page behavior unchanged.

- [ ] **Step 3: Apply query gating to payment settings page**

Modify `apps/management-app/src/app/(dashboard)/dashboard/payment-settings/page.tsx`:

```ts
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';

export default function DashboardPaymentSettingsPage() {
  const authReady = useAuthReadyForBff();

  const q = useQuery({
    queryKey: ['dashboard-payment-settings'],
    queryFn: () => saasApi.getDashboardPaymentSettings(),
    enabled: authReady,
  });
}
```

- [ ] **Step 4: Apply the same `enabled: authReady` rule to every new Phase 4B SaaS query**

For each file listed in this task, import `useAuthReadyForBff()`, call it once near the top of the component, and add `enabled: authReady` to `useQuery()` calls that hit BFF.

For dynamic invoice status polling, keep the existing business condition:

```ts
enabled: authReady && enabled && Boolean(invoiceId),
```

- [ ] **Step 5: Verify management app**

Run:

```bash
pnpm nx test management-app --runInBand --skip-nx-cache
pnpm nx build management-app --skip-nx-cache
pnpm nx lint management-app --skip-nx-cache
```

Expected:

```txt
Management-app tests pass.
Management-app build passes.
Lint exits 0 or reports only pre-existing warnings unrelated to changed lines.
```

---

## Task 8: Add Dashboard Smoke Script And Runtime Checklist

**Files:**

- Create: `tools/demo/phase-4b-dashboard-smoke.sh`
- Create: `docs/superpowers/handoffs/2026-05-13-phase-4b-stabilization-verification.md`

- [ ] **Step 1: Add smoke script**

Create `tools/demo/phase-4b-dashboard-smoke.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BFF_BASE_URL:?BFF_BASE_URL is required, e.g. http://localhost:3300/api/v1}"
: "${ACCESS_TOKEN:?ACCESS_TOKEN is required}"
: "${TENANT_ID:?TENANT_ID is required}"

curl_json() {
  local path="$1"
  curl -fsS \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "x-tenant-id: ${TENANT_ID}" \
    "${BFF_BASE_URL%/}${path}"
}

echo "Checking dashboard subscription..."
curl_json "/dashboard/subscription" >/tmp/phase4b-dashboard-subscription.json
node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync("/tmp/phase4b-dashboard-subscription.json","utf8")); if (!("data" in x)) { throw new Error("subscription response missing data"); }'

echo "Checking dashboard payment settings..."
curl_json "/dashboard/payment-settings" >/tmp/phase4b-dashboard-payment-settings.json
node -e 'const fs=require("fs"); const x=JSON.parse(fs.readFileSync("/tmp/phase4b-dashboard-payment-settings.json","utf8")); if (!("data" in x)) { throw new Error("payment-settings response missing data"); }'

echo "Phase 4B dashboard smoke passed."
```

- [ ] **Step 2: Make it executable**

Run:

```bash
chmod +x tools/demo/phase-4b-dashboard-smoke.sh
```

- [ ] **Step 3: Add verification handoff template**

Create `docs/superpowers/handoffs/2026-05-13-phase-4b-stabilization-verification.md`:

````md
# Phase 4B Stabilization Verification

## Code State

- Branch: main
- Commit before stabilization:
- Commit after stabilization:

## Services Started

- BFF:
- SaaS:
- Payment:
- Authorizer:
- User-Access:
- Redis/Postgres/Mongo:

## Runtime Smoke

Command:

```bash
BFF_BASE_URL=http://localhost:3300/api/v1 \
ACCESS_TOKEN='<redacted>' \
TENANT_ID='<tenant-id>' \
tools/demo/phase-4b-dashboard-smoke.sh
```

Result:

```txt
Phase 4B dashboard smoke passed.
```

## Browser Verification

- `/dashboard/subscription` loads without 401 or 500:
- `/dashboard/payment-settings` loads without 401 or 500:
- Network tab confirms Authorization header is present:
- Network tab confirms `x-tenant-id` header is present:
- No layout overlap at mobile width:

## Notes

- Do not paste access tokens or SePay secrets into this file.
````

- [ ] **Step 4: Run runtime smoke**

Start or restart these services with current code loaded:

```bash
pnpm nx serve saas
pnpm nx serve payment
pnpm nx serve bff
```

In another terminal, run:

```bash
BFF_BASE_URL=http://localhost:3300/api/v1 \
ACCESS_TOKEN='<real-access-token-from-browser-session>' \
TENANT_ID='<tenant-id-for-owner-or-manager>' \
tools/demo/phase-4b-dashboard-smoke.sh
```

Expected:

```txt
Checking dashboard subscription...
Checking dashboard payment settings...
Phase 4B dashboard smoke passed.
```

---

## Task 9: Browser Verification For The Two Failing Pages

**Files:**

- Update only if browser verification finds a UI-specific issue:
  - `apps/management-app/src/app/(dashboard)/dashboard/subscription/page.tsx`
  - `apps/management-app/src/app/(dashboard)/dashboard/payment-settings/page.tsx`
  - `apps/management-app/src/features/saas/subscription/*`
  - `apps/management-app/src/features/saas/payment-settings/*`

- [ ] **Step 1: Open `/dashboard/subscription`**

Use Browser plugin against the running management-app.

Checklist:

- Page does not fire BFF request before auth store is hydrated.
- `GET /api/v1/dashboard/subscription` returns 200.
- Current plan panel renders.
- Plan comparison renders.
- Checkout button creates invoice or shows a domain error, not `COMMON_INTERNAL_ERROR`.
- Mobile width has no overlapping QR/countdown text.

- [ ] **Step 2: Open `/dashboard/payment-settings`**

Checklist:

- Page does not fire BFF request before auth store is hydrated.
- `GET /api/v1/dashboard/payment-settings` returns 200.
- A tenant without an existing settings row renders `NOT_CONNECTED`.
- Connect SePay button is shown only when permission exists.
- No Client ID or Client Secret is visible in page source or network payload.

- [ ] **Step 3: Update verification handoff**

Fill in `docs/superpowers/handoffs/2026-05-13-phase-4b-stabilization-verification.md` with browser results. Keep tokens and secrets redacted.

---

## Task 10: Final Quality Gates

**Files:**

- All changed files in this plan.

- [ ] **Step 1: Run backend verification**

Run:

```bash
pnpm nx test saas --runInBand --skip-nx-cache
pnpm nx test payment --runInBand --skip-nx-cache
pnpm nx test bff --runInBand --skip-nx-cache
pnpm nx build saas --skip-nx-cache
pnpm nx build payment --skip-nx-cache
pnpm nx build bff --skip-nx-cache
pnpm nx run-many -t lint -p saas,payment,bff --skip-nx-cache
```

Expected:

```txt
SaaS, Payment, and BFF tests pass.
SaaS, Payment, and BFF builds pass.
Lint exits 0 or only reports explicitly documented pre-existing warnings.
```

- [ ] **Step 2: Run frontend verification**

Run:

```bash
pnpm nx test management-app --runInBand --skip-nx-cache
pnpm nx build management-app --skip-nx-cache
pnpm nx lint management-app --skip-nx-cache
```

Expected:

```txt
Management-app tests pass.
Management-app build passes.
Lint exits 0 or only reports explicitly documented pre-existing warnings.
```

- [ ] **Step 3: Run whitespace and contract search**

Run:

```bash
git diff --check
rg -n "SUBSCRIPTION\\.GET_CURRENT|PAYMENT_SETTINGS\\.GET|PLAN\\.LIST_ACTIVE|TENANT\\.LIST|dashboard/subscription|dashboard/payment-settings" apps libs docs/superpowers/plans/2026-05-12-phase-4b-saas
```

Expected:

```txt
git diff --check exits 0.
Search output shows BFF route usage, SaaS/Payment handlers, tests, and this plan.
```

- [ ] **Step 4: Code review pass**

Use `code-review-and-quality` before commit.

Required review focus:

- Controllers remain thin.
- `SaasOperationsService` is not retained as a broad god service unless deliberately justified and under 250 lines.
- No cross-service database writes.
- No secrets in tests, docs, screenshots, or logs.
- Dashboard subscription and payment-settings are covered by test plus runtime smoke.

- [ ] **Step 5: Commit once**

Run:

```bash
git status --short
git add apps/saas apps/payment apps/bff apps/management-app libs/guards tools/demo docs/superpowers/handoffs docs/superpowers/plans/2026-05-12-phase-4b-saas/06b-cross-service-contract-stabilization.md
git commit -m "fix: stabilize phase 4b dashboard contracts"
```

Expected:

```txt
One commit on main containing the stabilization fix and verification artifacts.
```

---

## Acceptance Criteria

- `GET /api/v1/dashboard/subscription` no longer returns `401 AUTH_USER_DATA_NOT_FOUND`.
- `GET /api/v1/dashboard/subscription` no longer returns `500 COMMON_INTERNAL_ERROR` caused by missing SaaS handler.
- `GET /api/v1/dashboard/payment-settings` no longer returns `500 COMMON_INTERNAL_ERROR` caused by missing tenant payment settings row.
- SaaS controller contract test fails if BFF adds a Phase 4B route target without a SaaS handler.
- Payment settings test fails if `get()` stops being idempotent.
- Management-app Phase 4B pages do not send BFF requests before `AuthSessionHydrator` has written the access token.
- Runtime smoke script passes with real token and tenant id.
- Browser verification confirms both pages load and render useful states.

## Execution Order

Run this stabilization plan before continuing `07-landing-customer-pwa-quality-gates.md`.

Do not proceed to landing/customer-pwa final quality gates while `/dashboard/subscription` or `/dashboard/payment-settings` still returns 401 or 500.
