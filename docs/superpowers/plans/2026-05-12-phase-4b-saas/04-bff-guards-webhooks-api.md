# Phase 4B BFF Guards, Webhooks, and API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`, `superpowers:subagent-driven-development`, `nestjs-patterns`, `microservices-patterns`, and `code-review-and-quality` before executing this plan directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification.

**Goal:** Expose the Phase 4B HTTP surface through BFF with correct guard ordering, tenant isolation, SePay webhook routing, and stable DTO contracts for management-app and customer-pwa.

**Architecture:** BFF remains an orchestration layer. It owns HTTP concerns, request validation, authentication/authorization guards, public route shape, and forwarding to internal TCP services. SaaS Service owns tenant/subscription business rules. Payment Service owns tenant payment settings and Tier 1 SePay Connect. BFF webhook routes route Tier 1 and Tier 2 payloads to the correct service without parsing business logic beyond secret validation and path-level dispatch.

**Tech Stack:** NestJS controllers/modules/guards, class-validator DTOs, existing TCP client pattern, existing `ResponseInterceptor`/exception conventions, Jest unit tests, Supertest e2e-style controller tests when available.

---

## Inputs and Constraints

- Source of truth: `docs/specs/business-logic-phase-4b-spec.md`.
- Q23 is locked to OAuth2 Connect with real SePay credentials. BFF must implement real authorize URL and callback endpoints; mock OAuth is only used by automated tests/local isolation.
- Q24 is locked to Tier 2 auto webhook plus manual fallback.
- Q25 is locked to `E (Resolved)`: SePay Client ID and Client Secret already exist. Treat real OAuth2 as the primary path.
- Preserve current guard order for protected business APIs: `UserGuard -> TenantGuard -> PermissionGuard`.
- Add status/plan guards only after tenant resolution so they can read `request.tenant`.
- Webhook routes must not depend on browser session cookies or Keycloak tokens.

## Current Code Touchpoints

Inspect these files before editing:

```bash
sed -n '1,220p' apps/bff/src/app/modules/saas/controllers/saas.controller.ts
sed -n '1,220p' apps/bff/src/app/modules/saas/controllers/current-tenant.controller.ts
sed -n '1,220p' apps/bff/src/app/modules/saas/saas.module.ts
sed -n '1,240p' libs/guards/src/lib/user.guard.ts
sed -n '1,240p' libs/guards/src/lib/tenant.guard.ts
sed -n '1,220p' libs/guards/src/lib/session.guard.ts
sed -n '1,220p' libs/guards/src/lib/permission.guard.ts
```

Expected learning:

- Existing SaaS controller uses legacy `/saas` routes and `PERMISSION.SAAS_*`.
- `CurrentTenantController` currently uses a catalog permission for tenant current lookup; Phase 4B replaces this with tenant/subscription-specific permissions.
- `TenantGuard` resolves tenant but does not enforce `SUSPENDED` or `CLOSED`.
- `SessionGuard` protects customer-pwa sessions but does not block suspended tenants.

## Task 1: Add BFF DTOs and API Route Constants

**Files:**

- Create: `apps/bff/src/app/modules/saas/dtos/admin-tenant.dto.ts`
- Create: `apps/bff/src/app/modules/saas/dtos/admin-plan.dto.ts`
- Create: `apps/bff/src/app/modules/saas/dtos/subscription.dto.ts`
- Create: `apps/bff/src/app/modules/saas/dtos/payment-settings.dto.ts`
- Create: `apps/bff/src/app/modules/saas/dtos/webhook.dto.ts`
- Create: `apps/bff/src/app/modules/saas/saas-bff-routes.ts`

- [ ] **Step 1: Define route constants**

Create `saas-bff-routes.ts`:

```typescript
export const SAAS_BFF_ROUTES = {
  publicPlans: 'public/plans',
  publicLandingInfo: 'public/landing-info',
  adminPlatformStats: 'admin/platform/stats',
  adminTenants: 'admin/tenants',
  adminTenantById: 'admin/tenants/:id',
  adminTenantStatus: 'admin/tenants/:id/status',
  adminTenantSubscriptions: 'admin/tenants/:id/subscriptions',
  adminTenantUsage: 'admin/tenants/:id/usage',
  adminTenantAudit: 'admin/tenants/:id/audit',
  adminPlans: 'admin/plans',
  adminPlanById: 'admin/plans/:id',
  adminBillingInvoices: 'admin/billing/invoices',
  adminBillingInvoiceManualConfirm: 'admin/billing/invoices/:id/manual-confirm',
  dashboardSubscription: 'dashboard/subscription',
  dashboardSubscriptionCheckout: 'dashboard/subscription/checkout',
  dashboardSubscriptionCancel: 'dashboard/subscription/cancel',
  dashboardBillingInvoiceById: 'dashboard/billing/invoices/:id',
  dashboardBillingInvoiceStatus: 'dashboard/billing/invoices/:id/status',
  dashboardBillingInvoiceCancel: 'dashboard/billing/invoices/:id/cancel',
  dashboardPaymentSettings: 'dashboard/payment-settings',
  dashboardSepayAuthorizeUrl: 'dashboard/payment-settings/sepay-authorize-url',
  dashboardSepayCallback: 'dashboard/payment-settings/sepay-callback',
  dashboardSepaySelectBank: 'dashboard/payment-settings/select-bank',
  dashboardSepayDisconnect: 'dashboard/payment-settings/disconnect',
  tier2Webhook: 'payment/sepay/webhook/platform',
  tier1Webhook: 'payment/sepay/webhook/:tenantSlug',
} as const;
```

- [ ] **Step 2: Define admin tenant DTOs**

Create `admin-tenant.dto.ts`:

```typescript
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export enum TenantStatusActionDtoValue {
  SUSPEND = 'SUSPEND',
  ACTIVATE = 'ACTIVATE',
  CLOSE = 'CLOSE',
}

export class AdminListTenantsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

  @IsOptional()
  @IsString()
  planCode?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class OnboardTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  tenantName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tenantType?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @MaxLength(40)
  initialPlanCode!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  ownerFirstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  ownerLastName!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operatingModes?: string[];
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatusActionDtoValue)
  action!: TenantStatusActionDtoValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AssignTenantSubscriptionDto {
  @IsString()
  @MaxLength(40)
  planCode!: string;

  @IsOptional()
  @IsString()
  billingPeriod?: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  source?: 'ADMIN_ASSIGN' | 'INVOICE_PAID';
}
```

- [ ] **Step 3: Define plan/subscription/payment DTOs**

`admin-plan.dto.ts` must include `CreatePlanDto`, `UpdatePlanDto`, and `ListPlansQueryDto` with validation for:

- `code`: string, 2-40 chars, uppercase transformation in service side.
- `name`: string, 2-80 chars.
- `description`: optional string.
- `priceVnd`: integer >= 0.
- `billingPeriod`: `MONTHLY | YEARLY`.
- `maxTables`, `maxStaff`, `maxOrdersPerDay`: integer, `-1` allowed for unlimited.
- `features`: array of string feature flags.
- `isActive`: optional boolean.
- `displayOrder`: optional integer.

`subscription.dto.ts` must include:

```typescript
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckoutSubscriptionDto {
  @IsString()
  @MaxLength(40)
  planCode!: string;

  @IsIn(['MONTHLY', 'YEARLY'])
  billingPeriod!: 'MONTHLY' | 'YEARLY';
}

export class CancelSubscriptionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ManualConfirmSubscriptionInvoiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

`payment-settings.dto.ts` must include:

```typescript
export class SelectSepayBankAccountDto {
  @IsString()
  bankAccountUuid!: string;

  @IsString()
  accountNumber!: string;

  @IsString()
  accountHolder!: string;

  @IsString()
  bankName!: string;

  @IsOptional()
  @IsString()
  bankShortName?: string;

  @IsOptional()
  @IsString()
  bankBin?: string;
}
```

`webhook.dto.ts` must expose raw-friendly DTO fields without requiring exact SePay names in controller tests:

```typescript
export type SepayWebhookPayloadDto = Record<string, unknown>;
```

- [ ] **Step 4: Compile DTO files**

Run:

```bash
pnpm nx lint bff
```

Expected:

```txt
Lint passes or reports only existing unrelated warnings.
```

## Task 2: Add Tenant Status Guard and Tenant Plan Guard

**Files:**

- Create: `libs/guards/src/lib/tenant-status.guard.ts`
- Create: `libs/guards/src/lib/tenant-plan.guard.ts`
- Modify: `libs/guards/src/index.ts`
- Create: `libs/guards/src/lib/tenant-status.guard.spec.ts`
- Create: `libs/guards/src/lib/tenant-plan.guard.spec.ts`

- [ ] **Step 1: Implement tenant status guard**

Create `TenantStatusGuard`:

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class TenantStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }

    if (tenant.status === 'CLOSED') {
      throw new ForbiddenException('TENANT_CLOSED');
    }

    if (tenant.status === 'SUSPENDED') {
      const routePath = request.route?.path ?? '';
      const method = request.method;
      const allowedWhileSuspended =
        method === 'GET' &&
        (routePath.includes('/dashboard/subscription') ||
          routePath.includes('/dashboard/billing') ||
          routePath.includes('/dashboard/payment-settings'));

      if (!allowedWhileSuspended) {
        throw new ForbiddenException('TENANT_SUSPENDED');
      }
    }

    return true;
  }
}
```

Refinement allowed during implementation: if BFF route path is unavailable in tests, add `@SetMetadata('allowSuspendedTenant', true)` plus reflector support. Keep the policy identical:

- Suspended tenant can view subscription/billing/payment settings.
- Suspended tenant cannot mutate catalog/order/table/staff except billing recovery actions.
- Closed tenant cannot access tenant-scoped dashboard routes.

- [ ] **Step 2: Implement tenant plan guard**

Create `TenantPlanGuard` as a lightweight feature/quota precheck guard:

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class TenantPlanGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const subscription = request.subscription;
    if (!subscription) {
      return true;
    }
    return subscription.status === 'ACTIVE';
  }
}
```

The initial guard is intentionally narrow. Fine-grained quota enforcement for table count and order count lives in service-level checks in `05-cross-service-integrations-quotas.md`.

- [ ] **Step 3: Add guard tests**

`tenant-status.guard.spec.ts` cases:

```typescript
describe('TenantStatusGuard', () => {
  it('allows active tenant');
  it('blocks closed tenant with TENANT_CLOSED');
  it('blocks suspended tenant on mutating dashboard route');
  it('allows suspended tenant to read dashboard subscription route');
});
```

`tenant-plan.guard.spec.ts` cases:

```typescript
describe('TenantPlanGuard', () => {
  it('allows request when subscription is not attached yet');
  it('allows active subscription');
  it('blocks non-active subscription');
});
```

- [ ] **Step 4: Export guards**

Update `libs/guards/src/index.ts`:

```typescript
export * from './lib/tenant-status.guard';
export * from './lib/tenant-plan.guard';
```

- [ ] **Step 5: Verify guards**

Run:

```bash
pnpm nx test guards --runInBand
```

Expected:

```txt
PASS libs/guards/src/lib/tenant-status.guard.spec.ts
PASS libs/guards/src/lib/tenant-plan.guard.spec.ts
```

## Task 3: Add Public and Admin SaaS Controllers

**Files:**

- Create: `apps/bff/src/app/modules/saas/controllers/public-saas.controller.ts`
- Create: `apps/bff/src/app/modules/saas/controllers/admin-tenants.controller.ts`
- Create: `apps/bff/src/app/modules/saas/controllers/admin-plans.controller.ts`
- Create: `apps/bff/src/app/modules/saas/controllers/admin-billing.controller.ts`
- Modify: `apps/bff/src/app/modules/saas/saas.module.ts`
- Keep: `apps/bff/src/app/modules/saas/controllers/saas.controller.ts` for backward compatibility during the release

- [ ] **Step 1: Implement public controller**

Controller shape:

```typescript
@Controller()
export class PublicSaasController {
  constructor(@Inject(SAAS_SERVICE) private readonly saasClient: ClientProxy) {}

  @Get(SAAS_BFF_ROUTES.publicPlans)
  listPublicPlans() {
    return this.saasClient.send(TCP_REQUEST_MESSAGE.PLAN.LIST_PUBLIC, {});
  }

  @Get(SAAS_BFF_ROUTES.publicLandingInfo)
  getLandingInfo() {
    return {
      productName: 'QRTable',
      market: 'Vietnamese F&B SaaS POS',
      contactEmail: process.env.PLATFORM_CONTACT_EMAIL ?? 'support@qrtable.local',
    };
  }
}
```

Do not read secret env vars in `getLandingInfo`.

- [ ] **Step 2: Implement admin tenants controller**

Guard chain:

```typescript
@UseGuards(UserGuard, PermissionGuard)
```

Routes and TCP messages:

| Route                                   | Permission                         | TCP message                                            |
| --------------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `GET /admin/platform/stats`             | `PERMISSION.TENANT_LIST_ALL`       | `TENANT.GET_PLATFORM_STATS`                            |
| `GET /admin/tenants`                    | `PERMISSION.TENANT_LIST_ALL`       | `TENANT.LIST`                                          |
| `POST /admin/tenants/onboard`           | `PERMISSION.TENANT_ONBOARD`        | `TENANT.ONBOARD`                                       |
| `GET /admin/tenants/:id`                | `PERMISSION.TENANT_READ_ANY`       | `TENANT.GET_BY_ID`                                     |
| `PATCH /admin/tenants/:id`              | `PERMISSION.TENANT_UPDATE`         | `TENANT.UPDATE`                                        |
| `PATCH /admin/tenants/:id/status`       | action-specific                    | `TENANT.SUSPEND`, `TENANT.ACTIVATE`, or `TENANT.CLOSE` |
| `GET /admin/tenants/:id/subscriptions`  | `PERMISSION.SUBSCRIPTION_LIST_ANY` | `SUBSCRIPTION.LIST_BY_TENANT`                          |
| `POST /admin/tenants/:id/subscriptions` | `PERMISSION.SUBSCRIPTION_ASSIGN`   | `SUBSCRIPTION.ASSIGN`                                  |
| `GET /admin/tenants/:id/usage`          | `PERMISSION.TENANT_READ_ANY`       | `TENANT.GET_USAGE`                                     |
| `GET /admin/tenants/:id/audit`          | `PERMISSION.TENANT_READ_ANY`       | `TENANT.GET_AUDIT`                                     |

Status route rule:

```typescript
const requiredPermissionByAction = {
  SUSPEND: PERMISSION.TENANT_SUSPEND,
  ACTIVATE: PERMISSION.TENANT_ACTIVATE,
  CLOSE: PERMISSION.TENANT_CLOSE,
} as const;
```

If the existing `PermissionGuard` cannot select permission dynamically based on body, split the status route into three explicit endpoints:

- `POST /admin/tenants/:id/suspend`
- `POST /admin/tenants/:id/activate`
- `POST /admin/tenants/:id/close`

Prefer explicit endpoints if dynamic metadata would complicate the guard.

- [ ] **Step 3: Implement admin plans controller**

Guard chain:

```typescript
@UseGuards(UserGuard, PermissionGuard)
```

Routes:

- `GET /admin/plans` → `PLAN.LIST_ADMIN`, `PERMISSION.PLAN_READ`.
- `POST /admin/plans` → `PLAN.CREATE`, `PERMISSION.PLAN_CREATE`.
- `PATCH /admin/plans/:id` → `PLAN.UPDATE`, `PERMISSION.PLAN_UPDATE`.
- `DELETE /admin/plans/:id` → `PLAN.DELETE`, `PERMISSION.PLAN_DELETE`.

Delete semantics:

- BFF endpoint is `DELETE`.
- SaaS Service must soft-deactivate plans with historical subscriptions, not hard-delete rows used by invoices/subscriptions.

- [ ] **Step 4: Implement admin billing controller**

Routes:

- `GET /admin/billing/invoices` → `SUBSCRIPTION_INVOICE.LIST_ADMIN`, `PERMISSION.SUBSCRIPTION_LIST_ANY`.
- `POST /admin/billing/invoices/:id/manual-confirm` → `SUBSCRIPTION_INVOICE.MANUAL_CONFIRM`, `PERMISSION.SUBSCRIPTION_ASSIGN`.

Manual confirm payload forwarded to SaaS Service:

```typescript
{
  invoiceId: params.id,
  confirmedByUserId: req.user.userId,
  note: body.note ?? null,
}
```

- [ ] **Step 5: Register controllers**

Update `saas.module.ts`:

```typescript
controllers: [
  SaasController,
  CurrentTenantController,
  PublicSaasController,
  AdminTenantsController,
  AdminPlansController,
  AdminBillingController,
  DashboardSubscriptionController,
  DashboardPaymentSettingsController,
  SepayWebhookController,
];
```

Add only controllers that already exist at that point in this plan. TypeScript compile must pass after each task.

- [ ] **Step 6: Add controller tests**

Create tests that mock `ClientProxy.send` and assert:

- Public routes call SaaS client without auth guards.
- Admin tenant onboarding forwards `createdByUserId`.
- Admin manual confirm forwards `confirmedByUserId`.
- Admin routes attach the correct permission metadata.

Run:

```bash
pnpm nx test bff --runInBand --testNamePattern="Admin|Public"
```

Expected:

```txt
PASS apps/bff/src/app/modules/saas/controllers/public-saas.controller.spec.ts
PASS apps/bff/src/app/modules/saas/controllers/admin-tenants.controller.spec.ts
PASS apps/bff/src/app/modules/saas/controllers/admin-plans.controller.spec.ts
PASS apps/bff/src/app/modules/saas/controllers/admin-billing.controller.spec.ts
```

## Task 4: Add Dashboard Subscription and Payment Settings Controllers

**Files:**

- Create: `apps/bff/src/app/modules/saas/controllers/dashboard-subscription.controller.ts`
- Create: `apps/bff/src/app/modules/saas/controllers/dashboard-payment-settings.controller.ts`
- Modify: `apps/bff/src/app/modules/saas/saas.module.ts`

- [ ] **Step 1: Implement dashboard subscription controller**

Guard chain:

```typescript
@UseGuards(UserGuard, TenantGuard, TenantStatusGuard, PermissionGuard)
```

Routes:

| Route                                         | Permission              | TCP target                                  |
| --------------------------------------------- | ----------------------- | ------------------------------------------- |
| `GET /dashboard/subscription`                 | `SUBSCRIPTION_READ_OWN` | SaaS `SUBSCRIPTION.GET_CURRENT`             |
| `POST /dashboard/subscription/checkout`       | `SUBSCRIPTION_CHECKOUT` | SaaS `SUBSCRIPTION_INVOICE.CREATE_CHECKOUT` |
| `POST /dashboard/subscription/cancel`         | `SUBSCRIPTION_CHECKOUT` | SaaS `SUBSCRIPTION.CANCEL`                  |
| `GET /dashboard/billing/invoices/:id`         | `SUBSCRIPTION_READ_OWN` | SaaS `SUBSCRIPTION_INVOICE.GET_BY_ID`       |
| `GET /dashboard/billing/invoices/:id/status`  | `SUBSCRIPTION_READ_OWN` | SaaS `SUBSCRIPTION_INVOICE.GET_STATUS`      |
| `POST /dashboard/billing/invoices/:id/cancel` | `SUBSCRIPTION_CHECKOUT` | SaaS `SUBSCRIPTION_INVOICE.CANCEL`          |

Payload invariant:

```typescript
{
  tenantId: req.tenant.id,
  requestedByUserId: req.user.userId,
  ...body,
}
```

Never trust a `tenantId` coming from body/query for dashboard routes.

- [ ] **Step 2: Implement payment settings controller**

Guard chain:

```typescript
@UseGuards(UserGuard, TenantGuard, TenantStatusGuard, PermissionGuard)
```

Routes:

| Route                                                 | Permission                          | TCP target                                         |
| ----------------------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| `GET /dashboard/payment-settings`                     | `PAYMENT_SETTINGS_READ_OWN`         | Payment `PAYMENT_SETTINGS.GET`                     |
| `GET /dashboard/payment-settings/sepay-authorize-url` | `PAYMENT_SETTINGS_UPDATE_OWN`       | Payment `PAYMENT_SETTINGS.GET_SEPAY_AUTHORIZE_URL` |
| `GET /dashboard/payment-settings/sepay-callback`      | state validation by Payment Service | Payment `PAYMENT_SETTINGS.HANDLE_SEPAY_CALLBACK`   |
| `POST /dashboard/payment-settings/select-bank`        | `PAYMENT_SETTINGS_UPDATE_OWN`       | Payment `PAYMENT_SETTINGS.SELECT_SEPAY_BANK`       |
| `POST /dashboard/payment-settings/disconnect`         | `PAYMENT_SETTINGS_UPDATE_OWN`       | Payment `PAYMENT_SETTINGS.DISCONNECT_SEPAY`        |

Callback route policy:

- It receives `code` and `state` from SePay after browser redirect.
- It must not require `TenantGuard`, because the redirect may not carry the app session reliably across browser/device contexts.
- It sends `code`, `state`, `requestIp`, and `userAgent` to Payment Service.
- Payment Service validates `oauth_state:{state}` and returns a safe callback result.

Callback controller shape:

```typescript
@Get(SAAS_BFF_ROUTES.dashboardSepayCallback)
handleSepayCallback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request) {
  return this.paymentClient.send(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_SEPAY_CALLBACK, {
    code,
    state,
    requestIp: req.ip,
    userAgent: req.headers['user-agent'] ?? null,
  });
}
```

- [ ] **Step 3: Add dashboard controller tests**

Assert:

- Dashboard routes never forward tenantId from body.
- Checkout forwards `tenantId` from `req.tenant`.
- OAuth callback route does not use `TenantGuard`.
- Payment settings routes use Payment TCP client, not SaaS TCP client.

Run:

```bash
pnpm nx test bff --runInBand --testNamePattern="Dashboard"
```

Expected:

```txt
PASS apps/bff/src/app/modules/saas/controllers/dashboard-subscription.controller.spec.ts
PASS apps/bff/src/app/modules/saas/controllers/dashboard-payment-settings.controller.spec.ts
```

## Task 5: Add SePay Webhook Controller

**Files:**

- Create: `apps/bff/src/app/modules/saas/controllers/sepay-webhook.controller.ts`
- Create: `apps/bff/src/app/modules/saas/controllers/sepay-webhook.controller.spec.ts`
- Modify: `apps/bff/src/app/modules/saas/saas.module.ts`

- [ ] **Step 1: Implement webhook route split**

Controller routes:

```typescript
@Post(SAAS_BFF_ROUTES.tier2Webhook)
handlePlatformWebhook(@Headers('x-secret-key') secret: string, @Body() payload: SepayWebhookPayloadDto) {
  return this.saasClient.send(TCP_REQUEST_MESSAGE.SUBSCRIPTION_INVOICE.HANDLE_SEPAY_WEBHOOK, {
    secret,
    payload,
    processId: randomUUID(),
  });
}

@Post(SAAS_BFF_ROUTES.tier1Webhook)
handleTenantWebhook(
  @Param('tenantSlug') tenantSlug: string,
  @Headers('x-secret-key') secret: string,
  @Body() payload: SepayWebhookPayloadDto,
) {
  return this.paymentClient.send(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK, {
    tenantSlug,
    secret,
    payload,
    processId: randomUUID(),
  });
}
```

Rules:

- Tier 2 `/payment/sepay/webhook/platform` routes to SaaS Service.
- Tier 1 `/payment/sepay/webhook/:tenantSlug` routes to Payment Service.
- Do not add `UserGuard`, `TenantGuard`, or `PermissionGuard`.
- Do not log full webhook payload because it can contain transaction metadata.
- Include `processId` for traceability.

- [ ] **Step 2: Validate secret header presence at BFF**

If `x-secret-key` is missing, return `401` before TCP call:

```typescript
if (!secret) {
  throw new UnauthorizedException('SEPAY_SECRET_REQUIRED');
}
```

Secret equality is checked inside SaaS/Payment services because each service owns its secret source:

- Tier 2: platform secret env.
- Tier 1: tenant encrypted webhook secret.

- [ ] **Step 3: Add webhook tests**

Test cases:

- Platform webhook forwards to SaaS with `SUBSCRIPTION_INVOICE.HANDLE_SEPAY_WEBHOOK`.
- Tenant webhook forwards to Payment with `PAYMENT.HANDLE_SEPAY_WEBHOOK`.
- Missing secret returns `UnauthorizedException`.
- Tenant webhook includes `tenantSlug`.
- Platform webhook never includes `tenantSlug`.

Run:

```bash
pnpm nx test bff --runInBand --testNamePattern="SepayWebhook"
```

Expected:

```txt
PASS apps/bff/src/app/modules/saas/controllers/sepay-webhook.controller.spec.ts
```

## Task 6: Wire Module Clients and Preserve Backward Compatibility

**Files:**

- Modify: `apps/bff/src/app/modules/saas/saas.module.ts`
- Modify if needed: `apps/bff/src/app/modules/saas/controllers/saas.controller.ts`
- Modify if needed: `apps/bff/src/app/modules/saas/controllers/current-tenant.controller.ts`

- [ ] **Step 1: Register Payment client in SaaS module**

If the current `SaasModule` only registers SaaS TCP client, add Payment TCP client:

```typescript
ClientsModule.registerAsync([
  {
    name: SAAS_SERVICE,
    useFactory: () => ({
      transport: Transport.TCP,
      options: {
        host: process.env.SAAS_SERVICE_HOST,
        port: Number(process.env.SAAS_SERVICE_PORT),
      },
    }),
  },
  {
    name: PAYMENT_SERVICE,
    useFactory: () => ({
      transport: Transport.TCP,
      options: {
        host: process.env.PAYMENT_SERVICE_HOST,
        port: Number(process.env.PAYMENT_SERVICE_PORT),
      },
    }),
  },
]);
```

Use the existing project token names if `SAAS_SERVICE` or `PAYMENT_SERVICE` already exists in constants.

- [ ] **Step 2: Keep legacy `/saas` routes working**

Do not delete `SaasController` in this release. If old permission names are removed from roles, map old metadata to the new tenant permissions:

| Old permission  | New permission                                                                   |
| --------------- | -------------------------------------------------------------------------------- |
| `SAAS_GET_LIST` | `TENANT_LIST_ALL`                                                                |
| `SAAS_CREATE`   | `TENANT_ONBOARD` for onboarding, `TENANT_UPDATE` for raw create only if retained |
| `SAAS_UPDATE`   | `TENANT_UPDATE`                                                                  |
| `SAAS_DELETE`   | `TENANT_CLOSE`                                                                   |

If a legacy route conflicts with new business rules, return `410 Gone` with a clear message instead of preserving unsafe behavior. Preferred unsafe route to deprecate:

```txt
DELETE /saas/:id
```

Replacement:

```txt
PATCH /admin/tenants/:id/status { "action": "CLOSE" }
```

- [ ] **Step 3: Fix current tenant permission**

Change `CurrentTenantController` from catalog permission to tenant read permission:

```typescript
@SetMetadata('permission', PERMISSION.TENANT_READ_OWN)
```

Payload must include current subscription summary if SaaS Service exposes it:

```typescript
{
  tenant,
  subscription,
}
```

If management-app currently expects only tenant object, keep backward-compatible fields:

```typescript
{
  ...tenant,
  subscription,
}
```

- [ ] **Step 4: Run BFF smoke tests**

Run:

```bash
pnpm nx test bff --runInBand
pnpm nx lint bff
```

Expected:

```txt
All BFF unit tests pass.
Lint passes or reports only pre-existing unrelated issues documented in the execution handoff.
```

## Task 7: Add Request/Response Contract Snapshots

**Files:**

- Create: `apps/bff/src/app/modules/saas/__tests__/phase-4b-contract.spec.ts`

- [ ] **Step 1: Add snapshot-like assertions without brittle timestamps**

Test representative response shape for:

- `GET /public/plans`.
- `GET /admin/tenants`.
- `POST /admin/tenants/onboard`.
- `GET /dashboard/subscription`.
- `GET /dashboard/payment-settings`.
- `POST /payment/sepay/webhook/platform`.
- `POST /payment/sepay/webhook/:tenantSlug`.

Use object shape assertions:

```typescript
expect(result).toMatchObject({
  success: true,
  data: expect.any(Object),
});
```

Avoid snapshots containing full UUID/timestamp values.

- [ ] **Step 2: Verify route uniqueness**

Run:

```bash
rg -n "@(Get|Post|Patch|Delete)\\(" apps/bff/src/app/modules/saas/controllers
```

Expected:

```txt
Each Phase 4B route appears exactly once, except legacy /saas routes intentionally retained in saas.controller.ts.
```

## Final Verification

Run:

```bash
pnpm nx test guards --runInBand
pnpm nx test bff --runInBand
pnpm nx lint guards
pnpm nx lint bff
git diff --check -- apps/bff libs/guards
```

Expected:

```txt
TenantStatusGuard and TenantPlanGuard tests pass.
BFF SaaS controller tests pass.
No whitespace errors in changed BFF/guard files.
```

Commit once for this plan file after all verification commands pass:

```bash
git add apps/bff/src/app/modules/saas libs/guards
git commit -m "feat: expose phase 4b bff api and guards"
```
