# Phase 4B Shared Contracts And Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` and `superpowers:subagent-driven-development` to implement this plan task-by-task directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish stable contracts and persisted data structures for Phase 4B before service logic and UI are built.

**Architecture:** Shared libs define enums, DTOs, TCP request/response types, and entities; deployable services consume them without duplicating domain strings. This release does not change runtime behavior except backward-compatible schema/entity additions.

**Tech Stack:** Nx shared libs, TypeScript, TypeORM entities, Mongoose schemas, Jest, existing `@common/*` path aliases.

---

## 0. File Structure

- Modify `libs/constants/src/lib/enum/role.enum.ts`
  - Add Phase 4B permission enum values while keeping legacy `SAAS_*`.
- Create `libs/constants/src/lib/saas.constants.ts`
  - Reserved slugs, plan codes, tenant/subscription/invoice statuses, Redis key helpers, webhook prefixes.
- Modify `libs/constants/src/lib/enum/tcp-request-message.ts`
  - Add `TENANT`, `SUBSCRIPTION`, `PLAN`, `PAYMENT_SETTINGS`, and extend `KEYCLOAK`, `USER`, `CATALOG`, `PAYMENT`.
- Modify `libs/entities/src/lib/tenant.entity.ts`
  - Extend tenant aggregate fields from spec §5.1.
- Create `libs/entities/src/lib/pricing-plan.entity.ts`
- Create `libs/entities/src/lib/subscription.entity.ts`
- Create `libs/entities/src/lib/subscription-invoice.entity.ts`
- Create `libs/entities/src/lib/saas-outbox-event.entity.ts`
- Create `apps/payment/src/app/modules/payment/entities/tenant-payment-settings.entity.ts`
- Modify `libs/schemas/src/lib/user.schema.ts`
  - Add `tenantId`, `isActive`, `disabledAt` and indexes.
- Modify `libs/interfaces/src/lib/tcp/saas/saas-request.interface.ts`
- Modify `libs/interfaces/src/lib/tcp/saas/saas-response.interface.ts`
- Create `libs/interfaces/src/lib/tcp/payment/payment-settings-request.interface.ts`
- Create `libs/interfaces/src/lib/tcp/payment/payment-settings-response.interface.ts`
- Modify `libs/interfaces/src/lib/tcp/payment/index.ts`
- Modify `libs/interfaces/src/lib/gateway/saas/saas-request.dto.ts`
- Modify `libs/interfaces/src/lib/gateway/saas/saas-response.dto.ts`
- Create `tools/dev-seed/postgres/phase-4b-saas.sql`
- Create `tools/dev-seed/mongo/phase-4b-users-tenantid.js`

## Task 1: Add SaaS Constants And Permissions

**Files:**

- Create: `libs/constants/src/lib/saas.constants.ts`
- Modify: `libs/constants/src/lib/enum/role.enum.ts`
- Test: `libs/constants/src/lib/saas.constants.spec.ts`

- [ ] **Step 1: Write constants tests**

Create `libs/constants/src/lib/saas.constants.spec.ts`:

```ts
import {
  BILL_REF_PREFIXES,
  RESERVED_TENANT_SLUGS,
  TenantStatus,
  buildTenantSuspendedRedisKey,
  normalizePlanCode,
} from './saas.constants';

describe('saas.constants', () => {
  it('keeps admin/system slugs reserved', () => {
    expect(RESERVED_TENANT_SLUGS).toContain('admin');
    expect(RESERVED_TENANT_SLUGS).toContain('api');
    expect(RESERVED_TENANT_SLUGS).toContain('system');
  });

  it('normalizes plan codes to uppercase stable keys', () => {
    expect(normalizePlanCode(' basic ')).toBe('BASIC');
  });

  it('builds stable redis keys for tenant suspension', () => {
    expect(buildTenantSuspendedRedisKey('tenant-1')).toBe('tenant:tenant-1:suspended');
  });

  it('uses separate webhook reference prefixes for bill and subscription money flows', () => {
    expect(BILL_REF_PREFIXES.TABLE_BILL).toBe('QRTBL');
    expect(BILL_REF_PREFIXES.SUBSCRIPTION).toBe('QRSUB');
  });

  it('defines the locked tenant statuses', () => {
    expect(Object.values(TenantStatus)).toEqual(['ACTIVE', 'SUSPENDED', 'CLOSED']);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm nx test constants --testFile=saas.constants.spec.ts
```

Expected:

```txt
FAIL Cannot find module './saas.constants'
```

- [ ] **Step 3: Add constants implementation**

Create `libs/constants/src/lib/saas.constants.ts`:

```ts
export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum TenantType {
  RESTAURANT = 'RESTAURANT',
  CAFE = 'CAFE',
  FOOD_COURT = 'FOOD_COURT',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum SubscriptionInvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  UNDERPAID = 'UNDERPAID',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}

export enum TenantPaymentConnectionStatus {
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTED = 'CONNECTED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
}

export const BILL_REF_PREFIXES = {
  TABLE_BILL: 'QRTBL',
  SUBSCRIPTION: 'QRSUB',
} as const;

export const DEFAULT_PLAN_CODES = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
} as const;

export const RESERVED_TENANT_SLUGS = [
  'admin',
  'api',
  'auth',
  'billing',
  'dashboard',
  'docs',
  'health',
  'help',
  'login',
  'logout',
  'metrics',
  'oauth',
  'owner',
  'payment',
  'platform',
  'root',
  'staff',
  'status',
  'subscription',
  'support',
  'system',
  'tenant',
  'webhook',
] as const;

export function normalizePlanCode(code: string): string {
  return code.trim().toUpperCase();
}

export function buildTenantSuspendedRedisKey(tenantId: string): string {
  return `tenant:${tenantId}:suspended`;
}
```

- [ ] **Step 4: Add permissions**

Modify `libs/constants/src/lib/enum/role.enum.ts` by appending these enum values after the legacy SaaS block:

```ts
  /* TENANT (Phase 4B) */
  TENANT_ONBOARD = 'tenant.onboard',
  TENANT_LIST_ALL = 'tenant.list_all',
  TENANT_READ_ANY = 'tenant.read_any',
  TENANT_READ_OWN = 'tenant.read_own',
  TENANT_UPDATE = 'tenant.update',
  TENANT_SUSPEND = 'tenant.suspend',
  TENANT_ACTIVATE = 'tenant.activate',
  TENANT_CLOSE = 'tenant.close',

  /* SUBSCRIPTION (Phase 4B) */
  SUBSCRIPTION_ASSIGN = 'subscription.assign',
  SUBSCRIPTION_LIST_ANY = 'subscription.list_any',
  SUBSCRIPTION_LIST_HISTORY_ANY = 'subscription.list_history_any',
  SUBSCRIPTION_READ_OWN = 'subscription.read_own',
  SUBSCRIPTION_CHECKOUT = 'subscription.checkout',

  /* PLAN (Phase 4B) */
  PLAN_CREATE = 'plan.create',
  PLAN_READ = 'plan.read',
  PLAN_UPDATE = 'plan.update',
  PLAN_DELETE = 'plan.delete',

  /* PAYMENT SETTINGS (Phase 4B) */
  PAYMENT_SETTINGS_READ_OWN = 'payment_settings.read_own',
  PAYMENT_SETTINGS_UPDATE_OWN = 'payment_settings.update_own',
```

- [ ] **Step 5: Run constants test**

Run:

```bash
pnpm nx test constants --testFile=saas.constants.spec.ts
```

Expected:

```txt
PASS libs/constants/src/lib/saas.constants.spec.ts
```

## Task 2: Add TCP Message Constants And Interfaces

**Files:**

- Modify: `libs/constants/src/lib/enum/tcp-request-message.ts`
- Modify: `libs/interfaces/src/lib/tcp/saas/saas-request.interface.ts`
- Modify: `libs/interfaces/src/lib/tcp/saas/saas-response.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/payment/payment-settings-request.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/payment/payment-settings-response.interface.ts`
- Modify: `libs/interfaces/src/lib/tcp/payment/index.ts`

- [ ] **Step 1: Extend TCP messages**

Modify `libs/constants/src/lib/enum/tcp-request-message.ts` with these enums and add them to `TCP_REQUEST_MESSAGE`:

```ts
enum TENANT {
  ONBOARD = 'tenant.onboard',
  LIST = 'tenant.list',
  GET_BY_ID = 'tenant.get_by_id',
  GET_BY_SLUG = 'tenant.get_by_slug',
  UPDATE = 'tenant.update',
  SUSPEND = 'tenant.suspend',
  ACTIVATE = 'tenant.activate',
  CLOSE = 'tenant.close',
  GET_USAGE = 'tenant.get_usage',
  GET_AUDIT = 'tenant.get_audit',
  GET_PLATFORM_STATS = 'tenant.get_platform_stats',
}

enum SUBSCRIPTION {
  ASSIGN = 'subscription.assign',
  CHECKOUT_INVOICE = 'subscription.checkout_invoice',
  CANCEL = 'subscription.cancel',
  GET_CURRENT = 'subscription.get_current',
  LIST_HISTORY = 'subscription.list_history',
  LIST_INVOICES = 'subscription.list_invoices',
  GET_INVOICE = 'subscription.get_invoice',
  CANCEL_INVOICE = 'subscription.cancel_invoice',
  MANUAL_CONFIRM_INVOICE = 'subscription.manual_confirm_invoice',
  HANDLE_WEBHOOK = 'subscription.handle_webhook',
}

enum PLAN {
  CREATE = 'plan.create',
  UPDATE = 'plan.update',
  DELETE = 'plan.delete',
  GET_BY_ID = 'plan.get_by_id',
  GET_BY_CODE = 'plan.get_by_code',
  LIST = 'plan.list',
  LIST_ACTIVE = 'plan.list_active',
}

enum PAYMENT_SETTINGS {
  GET = 'payment.settings_get',
  CREATE_EMPTY = 'payment.settings_create_empty',
  GENERATE_AUTHORIZE_URL = 'payment.settings_generate_authorize_url',
  HANDLE_OAUTH_CALLBACK = 'payment.settings_handle_oauth_callback',
  SELECT_BANK = 'payment.settings_select_bank',
  DISCONNECT = 'payment.settings_disconnect',
}
```

Extend existing enums:

```ts
// KEYCLOAK
ASSIGN_REALM_ROLE = 'keycloak.assign_realm_role',
REMOVE_REALM_ROLE = 'keycloak.remove_realm_role',
DISABLE_USER = 'keycloak.disable_user',
GET_USER = 'keycloak.get_user',

// USER
UPSERT_WITH_TENANT = 'user.upsert_with_tenant',
COUNT_BY_TENANT = 'user.count_by_tenant',
DISABLE = 'user.disable',

// CATALOG
COUNT_TABLES = 'catalog.count_tables',
SEED_DEFAULT_AREA = 'catalog.seed_default_area',
```

- [ ] **Step 2: Replace entity-leaking SaaS response**

Modify `libs/interfaces/src/lib/tcp/saas/saas-response.interface.ts`:

```ts
import type { SubscriptionInvoiceStatus, SubscriptionStatus, TenantStatus } from '@common/constants/saas.constants';

export type TenantSummaryTcpResponse = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  isActive: boolean;
  defaultCurrency: string;
  defaultLocale: string;
  ownerId?: string | null;
  currentPlanCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantTcpResponse = TenantSummaryTcpResponse;

export type PricingPlanTcpResponse = {
  id: string;
  code: string;
  name: string;
  priceVnd: number;
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
};

export type SubscriptionTcpResponse = {
  id: string;
  tenantId: string;
  pricingPlanId: string;
  planCodeSnapshot: string;
  priceVndSnapshot: number;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt?: string | null;
};

export type SubscriptionInvoiceTcpResponse = {
  id: string;
  tenantId: string;
  pricingPlanId: string;
  billingReference: string;
  status: SubscriptionInvoiceStatus;
  amountVnd: number;
  qrUrl: string;
  qrExpiresAt: string;
  paidAt?: string | null;
};
```

- [ ] **Step 3: Add payment settings interfaces**

Create `libs/interfaces/src/lib/tcp/payment/payment-settings-request.interface.ts`:

```ts
export type PaymentSettingsByTenantTcpRequest = {
  tenantId: string;
  processId?: string;
};

export type CreateEmptyPaymentSettingsTcpRequest = {
  tenantId: string;
  processId?: string;
};

export type GeneratePaymentAuthorizeUrlTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  processId?: string;
};

export type HandlePaymentOAuthCallbackTcpRequest = {
  code: string;
  state: string;
  processId?: string;
};

export type SelectBankTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  sepayBankAccountUuid: string;
  webhookUrl: string;
  processId?: string;
};

export type DisconnectPaymentSettingsTcpRequest = {
  tenantId: string;
  ownerUserId: string;
  processId?: string;
};
```

Create `libs/interfaces/src/lib/tcp/payment/payment-settings-response.interface.ts`:

```ts
import type { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';

export type SepayBankAccountTcpResponse = {
  uuid: string;
  bankShortName: string;
  accountNumber: string;
  accountHolder: string;
  balance?: number;
};

export type TenantPaymentSettingsTcpResponse = {
  tenantId: string;
  cashEnabled: boolean;
  vietqrEnabled: boolean;
  connectionStatus: TenantPaymentConnectionStatus;
  bankShortName?: string | null;
  accountNumberMasked?: string | null;
  accountHolder?: string | null;
  webhookVerifiedAt?: string | null;
  lastError?: string | null;
};

export type GeneratePaymentAuthorizeUrlTcpResponse = {
  authorizeUrl: string;
  expiresInSeconds: number;
};

export type HandlePaymentOAuthCallbackTcpResponse = {
  banks: SepayBankAccountTcpResponse[];
  tokenExpiresAt: string;
};

export type SelectBankTcpResponse = {
  status: 'CONNECTED';
  bankShortName: string;
  accountNumberMasked: string;
  accountHolder: string;
};
```

Update `libs/interfaces/src/lib/tcp/payment/index.ts`:

```ts
export * from './payment-request.interface';
export * from './payment-response.interface';
export * from './payment-settings-request.interface';
export * from './payment-settings-response.interface';
```

- [ ] **Step 4: Run type check for shared interfaces**

Run:

```bash
pnpm nx run-many -t test --projects=configuration --skip-nx-cache
pnpm nx test payment --runInBand
```

Expected:

```txt
No TypeScript compile errors caused by interface exports.
Existing payment tests still pass before the Payment Service SePay Connect plan adds behavior-focused tests.
```

## Task 3: Add TypeORM Entities

**Files:**

- Modify: `libs/entities/src/lib/tenant.entity.ts`
- Create: `libs/entities/src/lib/pricing-plan.entity.ts`
- Create: `libs/entities/src/lib/subscription.entity.ts`
- Create: `libs/entities/src/lib/subscription-invoice.entity.ts`
- Create: `libs/entities/src/lib/saas-outbox-event.entity.ts`
- Create: `apps/payment/src/app/modules/payment/entities/tenant-payment-settings.entity.ts`
- Test: `apps/saas/src/services/phase-4b-entity-shape.spec.ts`

- [ ] **Step 1: Write entity shape tests**

Create `apps/saas/src/services/phase-4b-entity-shape.spec.ts`:

```ts
import { Tenant } from '@common/entities/tenant.entity';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { TenantStatus } from '@common/constants/saas.constants';

describe('Phase 4B entity shape', () => {
  it('tenant supports status-based active mapping inputs', () => {
    const tenant = new Tenant();
    tenant.name = 'Pho Ha Noi';
    tenant.slug = 'pho-ha-noi';
    tenant.status = TenantStatus.ACTIVE;
    expect(tenant.status).toBe(TenantStatus.ACTIVE);
  });

  it('pricing plan stores quotas and features', () => {
    const plan = new PricingPlan();
    plan.code = 'BASIC';
    plan.features = ['basic_pos'];
    plan.maxTables = 50;
    expect(plan.features).toEqual(['basic_pos']);
  });

  it('subscription invoice stores a QRSUB billing reference', () => {
    const invoice = new SubscriptionInvoice();
    invoice.billingReference = 'QRSUBABC123';
    expect(invoice.billingReference.startsWith('QRSUB')).toBe(true);
  });

  it('subscription stores immutable plan snapshots', () => {
    const subscription = new Subscription();
    subscription.planCodeSnapshot = 'FREE';
    subscription.priceVndSnapshot = 0;
    expect(subscription.priceVndSnapshot).toBe(0);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm nx test saas --testFile=phase-4b-entity-shape.spec.ts
```

Expected:

```txt
FAIL Cannot find module '@common/entities/pricing-plan.entity'
```

- [ ] **Step 3: Extend tenant entity**

Modify `libs/entities/src/lib/tenant.entity.ts`:

```ts
import { TenantStatus, TenantType } from '@common/constants/saas.constants';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'tenants' })
@Index('uq_tenants_slug', ['slug'], { unique: true })
@Index('ix_tenants_status_created_at', ['status', 'createdAt'])
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 120 })
  slug: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @Column({ type: 'varchar', length: 30, default: TenantType.RESTAURANT })
  type: TenantType;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string | null;

  @Column({ name: 'default_currency', type: 'varchar', length: 10, default: 'VND' })
  defaultCurrency: string;

  @Column({ name: 'default_locale', type: 'varchar', length: 20, default: 'vi-VN' })
  defaultLocale: string;

  @Column({
    name: 'operating_modes',
    type: 'text',
    array: true,
    default: () => "ARRAY['INSTANT_ORDER','DIGITAL_MENU']",
  })
  operatingModes: string[];

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt?: Date | null;

  @Column({ name: 'suspended_reason', type: 'text', nullable: true })
  suspendedReason?: string | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'closed_reason', type: 'text', nullable: true })
  closedReason?: string | null;
}
```

- [ ] **Step 4: Add SaaS entities**

Create `libs/entities/src/lib/pricing-plan.entity.ts`, `subscription.entity.ts`, `subscription-invoice.entity.ts`, and `saas-outbox-event.entity.ts` using these table mappings:

```ts
@Entity('pricing_plans')
export class PricingPlan extends BaseEntity {}

@Entity('subscriptions')
export class Subscription extends BaseEntity {}

@Entity('subscription_invoices')
export class SubscriptionInvoice extends BaseEntity {}

@Entity('outbox_events')
export class SaasOutboxEvent extends BaseEntity {}
```

Use `@Index` for these invariants:

```ts
@Index('uq_pricing_plans_code', ['code'], { unique: true })
@Index('ix_pricing_plans_active_order', ['isActive', 'displayOrder'])
```

```ts
@Index('ix_subscriptions_tenant_status', ['tenantId', 'status'])
@Index('ix_subscriptions_expires_at_active', ['expiresAt', 'status'])
```

```ts
@Index('uq_subscription_invoices_billing_ref', ['billingReference'], { unique: true })
@Index('uq_subscription_invoices_sepay_tx', ['sepayTransactionId'], { unique: true, where: '"sepay_transaction_id" IS NOT NULL' })
@Index('ix_subscription_invoices_tenant_status', ['tenantId', 'status'])
```

```ts
@Index('ix_outbox_status_created', ['status', 'createdAt'])
```

Use `simple-json` for `features` and `payload` if current TypeORM config struggles with JSONB in tests. Use `jsonb` only if the existing entities already use it successfully.

- [ ] **Step 5: Add tenant payment settings entity**

Create `apps/payment/src/app/modules/payment/entities/tenant-payment-settings.entity.ts`:

```ts
import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tenant_payment_settings' })
@Index('uq_tenant_payment_settings_tenant', ['tenantId'], { unique: true })
export class TenantPaymentSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'cash_enabled', type: 'boolean', default: true })
  cashEnabled: boolean;

  @Column({ name: 'vietqr_enabled', type: 'boolean', default: false })
  vietqrEnabled: boolean;

  @Column({ name: 'vietqr_bank_name', type: 'varchar', length: 100, nullable: true })
  vietqrBankName?: string | null;

  @Column({ name: 'vietqr_account_number', type: 'varchar', length: 64, nullable: true })
  vietqrAccountNumber?: string | null;

  @Column({ name: 'vietqr_account_holder', type: 'varchar', length: 160, nullable: true })
  vietqrAccountHolder?: string | null;

  @Column({ name: 'sepay_bank_account_uuid', type: 'varchar', length: 120, nullable: true })
  sepayBankAccountUuid?: string | null;

  @Column({ name: 'sepay_access_token_encrypted', type: 'text', nullable: true })
  sepayAccessTokenEncrypted?: string | null;

  @Column({ name: 'sepay_refresh_token_encrypted', type: 'text', nullable: true })
  sepayRefreshTokenEncrypted?: string | null;

  @Column({ name: 'sepay_token_expires_at', type: 'timestamptz', nullable: true })
  sepayTokenExpiresAt?: Date | null;

  @Column({ name: 'sepay_token_scopes', type: 'text', array: true, default: '{}' })
  sepayTokenScopes: string[];

  @Column({ name: 'sepay_webhook_id', type: 'varchar', length: 120, nullable: true })
  sepayWebhookId?: string | null;

  @Column({ name: 'webhook_secret_encrypted', type: 'text', nullable: true })
  webhookSecretEncrypted?: string | null;

  @Column({ name: 'webhook_verified_at', type: 'timestamptz', nullable: true })
  webhookVerifiedAt?: Date | null;

  @Column({
    name: 'connection_status',
    type: 'varchar',
    length: 20,
    default: TenantPaymentConnectionStatus.NOT_CONNECTED,
  })
  connectionStatus: TenantPaymentConnectionStatus;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'last_error_at', type: 'timestamptz', nullable: true })
  lastErrorAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;
}
```

- [ ] **Step 6: Run entity shape test**

Run:

```bash
pnpm nx test saas --testFile=phase-4b-entity-shape.spec.ts
```

Expected:

```txt
PASS apps/saas/src/services/phase-4b-entity-shape.spec.ts
```

## Task 4: Extend Mongo User Schema

**Files:**

- Modify: `libs/schemas/src/lib/user.schema.ts`
- Modify: `apps/user-access/src/app/modules/user/repositories/user.repository.ts`
- Test: `apps/user-access/src/app/modules/user/services/user.service.spec.ts`

- [ ] **Step 1: Add schema fields**

Modify `libs/schemas/src/lib/user.schema.ts`:

```ts
  @Prop({ type: String, default: null, index: true })
  tenantId?: string | null;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  disabledAt?: Date | null;
```

- [ ] **Step 2: Update repository upsert payload**

Change `UserRepository.upsertByUserId` params to include tenant state:

```ts
async upsertByUserId(params: {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string | null;
  roleNames?: string[];
}) {
  const roleIds = await this.resolveRoleIds(params.roleNames);
  const updatePayload: Partial<User> = {
    userId: params.userId,
    email: params.email,
    firstName: params.firstName || '',
    lastName: params.lastName || '',
    tenantId: params.tenantId ?? null,
    isActive: true,
    roles: roleIds,
  };
  // keep existing findOneAndUpdate body
}
```

- [ ] **Step 3: Add count and disable repository methods**

Add:

```ts
countActiveByTenant(tenantId: string): Promise<number> {
  return this.userModel.countDocuments({ tenantId, isActive: true }).exec();
}

async disableByUserId(userId: string): Promise<void> {
  await this.userModel.updateOne({ userId }, { $set: { isActive: false, disabledAt: new Date() } }).exec();
}
```

- [ ] **Step 4: Run user-access tests**

Run:

```bash
pnpm nx test user-access --runInBand
```

Expected:

```txt
PASS apps/user-access/src/app/modules/user/services/user.service.spec.ts
```

## Task 5: Add Dev Seed Migration Scripts

**Files:**

- Create: `tools/dev-seed/postgres/phase-4b-saas.sql`
- Create: `tools/dev-seed/mongo/phase-4b-users-tenantid.js`
- Modify: `tools/dev-seed/README.md`

- [ ] **Step 1: Add SQL migration script**

Create `tools/dev-seed/postgres/phase-4b-saas.sql` with idempotent DDL:

```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS type VARCHAR(30) NOT NULL DEFAULT 'RESTAURANT';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_currency VARCHAR(10) NOT NULL DEFAULT 'VND';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_locale VARCHAR(20) NOT NULL DEFAULT 'vi-VN';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS operating_modes TEXT[] NOT NULL DEFAULT ARRAY['INSTANT_ORDER','DIGITAL_MENU'];
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS closed_reason TEXT;

UPDATE tenants SET status = 'SUSPENDED' WHERE is_active = FALSE AND status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  price_vnd INTEGER NOT NULL DEFAULT 0,
  max_tables INTEGER NOT NULL DEFAULT 0,
  max_staff INTEGER NOT NULL DEFAULT 0,
  max_orders_per_day INTEGER NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO pricing_plans (code, name, price_vnd, max_tables, max_staff, max_orders_per_day, features, display_order)
VALUES
  ('FREE', 'Miễn phí', 0, 10, 5, 100, '["basic_pos"]', 1),
  ('BASIC', 'Cơ bản', 299000, 50, 20, 1000, '["basic_pos","analytics_basic"]', 2),
  ('PREMIUM', 'Cao cấp', 999000, 500, 100, 10000, '["basic_pos","analytics_basic","analytics_advanced","priority_support"]', 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_vnd = EXCLUDED.price_vnd,
  max_tables = EXCLUDED.max_tables,
  max_staff = EXCLUDED.max_staff,
  max_orders_per_day = EXCLUDED.max_orders_per_day,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pricing_plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  plan_code_snapshot VARCHAR(40) NOT NULL,
  price_vnd_snapshot BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  superseded_by_subscription_id UUID,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  expired_at TIMESTAMPTZ,
  source VARCHAR(30) NOT NULL DEFAULT 'ADMIN_ASSIGN',
  source_invoice_id UUID,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_subscriptions_tenant_status
  ON subscriptions(tenant_id, status);

CREATE INDEX IF NOT EXISTS ix_subscriptions_expires_at
  ON subscriptions(expires_at)
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_active_per_tenant
  ON subscriptions(tenant_id)
  WHERE status = 'ACTIVE';

INSERT INTO subscriptions (
  tenant_id,
  pricing_plan_id,
  plan_code_snapshot,
  price_vnd_snapshot,
  status,
  starts_at,
  expires_at,
  source
)
SELECT t.id, p.id, p.code, p.price_vnd, 'ACTIVE', t.created_at, NULL, 'INITIAL_ONBOARDING'
FROM tenants t
CROSS JOIN pricing_plans p
WHERE p.code = 'FREE'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.tenant_id = t.id AND s.status = 'ACTIVE'
  );

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pricing_plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  plan_code_snapshot VARCHAR(40) NOT NULL,
  amount_vnd BIGINT NOT NULL,
  billing_period VARCHAR(20) NOT NULL,
  period_starts_at TIMESTAMPTZ NOT NULL,
  period_ends_at TIMESTAMPTZ NOT NULL,
  billing_reference VARCHAR(32) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  qr_url TEXT,
  qr_expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  paid_amount_vnd BIGINT,
  sepay_transaction_id BIGINT,
  sepay_reference_code VARCHAR(120),
  sepay_account_number VARCHAR(64),
  sepay_gateway VARCHAR(80),
  sepay_transfer_content TEXT,
  sepay_transaction_date TIMESTAMPTZ,
  manually_confirmed_by_user_id UUID,
  manually_confirmed_at TIMESTAMPTZ,
  requested_by_user_id UUID NOT NULL,
  expired_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_invoices_billing_ref
  ON subscription_invoices(billing_reference);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_invoices_sepay_tx
  ON subscription_invoices(sepay_transaction_id)
  WHERE sepay_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_tenant_status
  ON subscription_invoices(tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS ix_subscription_invoices_qr_expires_at
  ON subscription_invoices(qr_expires_at)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  topic VARCHAR(120) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  aggregate_id UUID NOT NULL,
  partition_key VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_outbox_status_created
  ON outbox_events(status, created_at);

CREATE TABLE IF NOT EXISTS tenant_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vietqr_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  vietqr_bank_name VARCHAR(80),
  vietqr_bank_short_name VARCHAR(20),
  vietqr_bank_bin VARCHAR(20),
  vietqr_account_number VARCHAR(64),
  vietqr_account_holder VARCHAR(120),
  sepay_user_id BIGINT,
  sepay_company_id BIGINT,
  sepay_bank_account_uuid VARCHAR(64),
  sepay_access_token_encrypted TEXT,
  sepay_refresh_token_encrypted TEXT,
  sepay_token_expires_at TIMESTAMPTZ,
  sepay_token_scopes TEXT[],
  sepay_webhook_id VARCHAR(120),
  webhook_secret_encrypted TEXT,
  webhook_verified_at TIMESTAMPTZ,
  connection_status VARCHAR(20) NOT NULL DEFAULT 'NOT_CONNECTED',
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_payment_settings_tenant
  ON tenant_payment_settings(tenant_id);

CREATE INDEX IF NOT EXISTS ix_tenant_payment_settings_account_number
  ON tenant_payment_settings(vietqr_account_number)
  WHERE vietqr_account_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tenant_payment_settings_sepay_token_expires
  ON tenant_payment_settings(sepay_token_expires_at)
  WHERE connection_status = 'CONNECTED';

INSERT INTO tenant_payment_settings (tenant_id, cash_enabled, vietqr_enabled, connection_status)
SELECT id::text, TRUE, FALSE, 'NOT_CONNECTED'
FROM tenants
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Add Mongo migration script**

Create `tools/dev-seed/mongo/phase-4b-users-tenantid.js`:

```js
db.getCollection('user').updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: null, isActive: true } });

db.getCollection('user').createIndex({ tenantId: 1 });
db.getCollection('user').createIndex({ tenantId: 1, isActive: 1 });
```

- [ ] **Step 3: Document manual execution**

Append to `tools/dev-seed/README.md`:

````md
## Phase 4B SaaS Schema Seed

Run after PostgreSQL/MongoDB are up:

```bash
psql "$SAAS_DATABASE_URL" -f tools/dev-seed/postgres/phase-4b-saas.sql
mongosh "$MONGO_URI" tools/dev-seed/mongo/phase-4b-users-tenantid.js
```
````

The scripts are idempotent and can be rerun during local development.

````

- [ ] **Step 4: Verify script text**

Run:

```bash
rg -n "CREATE TABLE IF NOT EXISTS pricing_plans|tenant_payment_settings|createIndex\\(\\{ tenantId" tools/dev-seed
````

Expected:

```txt
tools/dev-seed/postgres/phase-4b-saas.sql:... CREATE TABLE IF NOT EXISTS pricing_plans
tools/dev-seed/postgres/phase-4b-saas.sql:... tenant_payment_settings
tools/dev-seed/mongo/phase-4b-users-tenantid.js:... createIndex({ tenantId: 1 })
```

## Final Verification

Run:

```bash
pnpm nx test constants --testFile=saas.constants.spec.ts
pnpm nx test saas --testFile=phase-4b-entity-shape.spec.ts
pnpm nx test user-access --runInBand
pnpm nx run-many -t lint --projects=saas,payment,user-access
```

Expected:

```txt
All listed tests pass.
Lint passes or reports only pre-existing unrelated issues documented in the execution handoff.
```

Commit once for this plan file after all verification commands pass:

```bash
git add libs/constants libs/entities libs/interfaces libs/schemas apps/payment/src/app/modules/payment/entities tools/dev-seed
git commit -m "feat: add phase 4b shared contracts and schema"
```
