# Phase 4B SaaS Service Lifecycle And Subscription Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` and `superpowers:subagent-driven-development` to implement this plan task-by-task directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SaaS Service as the source of truth for tenant lifecycle, pricing plans, subscriptions, subscription invoices, onboarding mini-saga, suspend/activate state, cron, and outbox events.

**Architecture:** SaaS Service owns `tenants`, `pricing_plans`, `subscriptions`, `subscription_invoices`, and SaaS-scoped rows in `outbox_events`; it calls other services only through TCP and publishes domain events through outbox. Controllers expose TCP message handlers only; business logic is split into focused services and repositories.

**Tech Stack:** NestJS TCP microservice, TypeORM, Redis cache, KafkaJS outbox publisher, `@nestjs/schedule`, Jest.

---

## 0. File Structure

- Modify `apps/saas/src/app.module.ts`
  - Register new entities, TCP clients, Redis, ScheduleModule, Kafka config.
- Modify `apps/saas/src/controllers/saas.controller.ts`
  - Keep existing `SAAS.*` handlers and add new `TENANT`, `PLAN`, `SUBSCRIPTION` handlers.
- Create `apps/saas/src/services/slug.service.ts`
- Create `apps/saas/src/services/tenant-lifecycle.service.ts`
- Create `apps/saas/src/services/pricing-plan.service.ts`
- Create `apps/saas/src/services/subscription.service.ts`
- Create `apps/saas/src/services/subscription-invoice.service.ts`
- Create `apps/saas/src/services/onboarding-saga.service.ts`
- Create `apps/saas/src/services/tenant-usage.service.ts`
- Create `apps/saas/src/services/tenant-suspend-cron.service.ts`
- Create `apps/saas/src/services/saas-outbox-publisher.service.ts`
- Create repositories under `apps/saas/src/repositories/`
  - `tenant.repository.ts`
  - `pricing-plan.repository.ts`
  - `subscription.repository.ts`
  - `subscription-invoice.repository.ts`
  - `saas-outbox.repository.ts`
- Tests under `apps/saas/src/services/*.spec.ts`

## Task 1: Add Slug Service

**Files:**

- Create: `apps/saas/src/services/slug.service.ts`
- Test: `apps/saas/src/services/slug.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/saas/src/services/slug.service.spec.ts`:

```ts
import { SlugService } from './slug.service';

describe('SlugService', () => {
  let service: SlugService;

  beforeEach(() => {
    service = new SlugService();
  });

  it.each([
    ['Phở Hà Nội', 'pho-ha-noi'],
    ['Cà phê Sữa Đá', 'ca-phe-sua-da'],
    ['Nhà hàng 123', 'nha-hang-123'],
    ['  The   Coffee  ', 'the-coffee'],
  ])('normalizes Vietnamese input "%s"', (input, expected) => {
    expect(service.generate(input)).toBe(expected);
  });

  it('rejects reserved slugs', () => {
    expect(() => service.assertAllowed('admin')).toThrow('SAAS_SLUG_RESERVED');
  });

  it('adds suffix when collision resolver says slug exists', async () => {
    const slug = await service.generateUnique('Phở Hà Nội', async (candidate) =>
      ['pho-ha-noi', 'pho-ha-noi-2'].includes(candidate),
    );
    expect(slug).toBe('pho-ha-noi-3');
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm nx test saas --testFile=slug.service.spec.ts
```

Expected:

```txt
FAIL Cannot find module './slug.service'
```

- [ ] **Step 3: Implement slug service**

Create `apps/saas/src/services/slug.service.ts`:

```ts
import { RESERVED_TENANT_SLUGS } from '@common/constants/saas.constants';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  generate(value: string): string {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  assertAllowed(slug: string): void {
    if (!slug || RESERVED_TENANT_SLUGS.includes(slug as (typeof RESERVED_TENANT_SLUGS)[number])) {
      throw new BadRequestException('SAAS_SLUG_RESERVED');
    }
  }

  async generateUnique(raw: string, exists: (candidate: string) => Promise<boolean>): Promise<string> {
    const base = this.generate(raw);
    this.assertAllowed(base);
    let candidate = base;
    let suffix = 2;
    while (await exists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
pnpm nx test saas --testFile=slug.service.spec.ts
```

Expected:

```txt
PASS apps/saas/src/services/slug.service.spec.ts
```

## Task 2: Build Plan And Subscription Services

**Files:**

- Create: `apps/saas/src/repositories/pricing-plan.repository.ts`
- Create: `apps/saas/src/repositories/subscription.repository.ts`
- Create: `apps/saas/src/services/pricing-plan.service.ts`
- Create: `apps/saas/src/services/subscription.service.ts`
- Test: `apps/saas/src/services/subscription.service.spec.ts`

- [ ] **Step 1: Write subscription behavior tests**

Create `apps/saas/src/services/subscription.service.spec.ts`:

```ts
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  const planRepo = {
    findActiveByCode: jest.fn(),
  };
  const subRepo = {
    findActiveByTenantId: jest.fn(),
    supersedeActive: jest.fn(),
    createActive: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('assigns a new active subscription and supersedes the previous one', async () => {
    planRepo.findActiveByCode.mockResolvedValue({ id: 'plan-premium', code: 'PREMIUM', priceVnd: 999000 });
    subRepo.findActiveByTenantId.mockResolvedValue({ id: 'sub-old', status: SubscriptionStatus.ACTIVE });
    subRepo.createActive.mockResolvedValue({ id: 'sub-new', planCodeSnapshot: 'PREMIUM' });

    const service = new SubscriptionService(planRepo as never, subRepo as never);
    const result = await service.assignPlan({
      tenantId: 'tenant-1',
      planCode: 'PREMIUM',
      source: 'ADMIN_MANUAL',
      startsAt: new Date('2026-05-12T00:00:00Z'),
      expiresAt: new Date('2026-06-12T00:00:00Z'),
    });

    expect(subRepo.supersedeActive).toHaveBeenCalledWith('tenant-1', 'sub-old');
    expect(result.id).toBe('sub-new');
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm nx test saas --testFile=subscription.service.spec.ts
```

Expected:

```txt
FAIL Cannot find module './subscription.service'
```

- [ ] **Step 3: Implement minimal services**

Create `apps/saas/src/services/subscription.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';

export type AssignPlanParams = {
  tenantId: string;
  planCode: string;
  source: 'INITIAL_ONBOARDING' | 'ADMIN_MANUAL' | 'SUBSCRIPTION_PAYMENT';
  startsAt: Date;
  expiresAt?: Date | null;
};

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly planRepository: {
      findActiveByCode(code: string): Promise<{ id: string; code: string; priceVnd: number } | null>;
    },
    private readonly subscriptionRepository: {
      findActiveByTenantId(tenantId: string): Promise<{ id: string } | null>;
      supersedeActive(tenantId: string, oldSubscriptionId: string): Promise<void>;
      createActive(params: AssignPlanParams & { pricingPlanId: string; priceVndSnapshot: number }): Promise<unknown>;
    },
  ) {}

  async assignPlan(params: AssignPlanParams) {
    const plan = await this.planRepository.findActiveByCode(params.planCode);
    if (!plan) {
      throw new NotFoundException('PLAN_NOT_FOUND');
    }
    const existing = await this.subscriptionRepository.findActiveByTenantId(params.tenantId);
    if (existing) {
      await this.subscriptionRepository.supersedeActive(params.tenantId, existing.id);
    }
    return this.subscriptionRepository.createActive({
      ...params,
      pricingPlanId: plan.id,
      priceVndSnapshot: plan.priceVnd,
    });
  }
}
```

Create these TypeORM-backed repository methods:

```typescript
findActiveByTenantId(tenantId: string): Promise<Subscription | null>;
supersedeActive(tenantId: string, oldSubscriptionId: string): Promise<void>;
createActive(params: {
  tenantId: string;
  pricingPlanId: string;
  planCode: string;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  priceVndSnapshot: number;
  startsAt?: Date;
  expiresAt?: Date | null;
  source: 'ADMIN_ASSIGN' | 'INVOICE_PAID' | 'INITIAL_ONBOARDING';
  sourceInvoiceId?: string | null;
  createdByUserId?: string | null;
}): Promise<Subscription>;
listByTenantId(tenantId: string): Promise<Subscription[]>;
findExpirableActive(now: Date, limit: number): Promise<Subscription[]>;
markExpired(subscriptionId: string, expiredAt: Date): Promise<void>;
```

Keep every query scoped by `tenantId` when the caller is tenant-specific. Use the partial unique index `uq_subscriptions_active_per_tenant` as the final guard against two active subscriptions.

- [ ] **Step 4: Run service tests**

Run:

```bash
pnpm nx test saas --testFile=subscription.service.spec.ts
```

Expected:

```txt
PASS apps/saas/src/services/subscription.service.spec.ts
```

## Task 3: Build Tenant Lifecycle Service

**Files:**

- Create: `apps/saas/src/repositories/tenant.repository.ts`
- Create: `apps/saas/src/services/tenant-lifecycle.service.ts`
- Modify: `apps/saas/src/services/saas.service.ts`
- Test: `apps/saas/src/services/tenant-lifecycle.service.spec.ts`

- [ ] **Step 1: Write lifecycle tests**

Create `apps/saas/src/services/tenant-lifecycle.service.spec.ts`:

```ts
import { TenantStatus } from '@common/constants/saas.constants';
import { TenantLifecycleService } from './tenant-lifecycle.service';

describe('TenantLifecycleService', () => {
  const tenantRepo = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };
  const redis = {
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('suspends tenant and sets redis flag', async () => {
    tenantRepo.findById.mockResolvedValue({ id: 'tenant-1', status: TenantStatus.ACTIVE });
    const service = new TenantLifecycleService(tenantRepo as never, redis as never);

    await service.suspend({ tenantId: 'tenant-1', reason: 'subscription expired' });

    expect(tenantRepo.updateStatus).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ status: TenantStatus.SUSPENDED }),
    );
    expect(redis.set).toHaveBeenCalledWith('tenant:tenant-1:suspended', '1');
  });

  it('activates tenant and clears redis flag', async () => {
    tenantRepo.findById.mockResolvedValue({ id: 'tenant-1', status: TenantStatus.SUSPENDED });
    const service = new TenantLifecycleService(tenantRepo as never, redis as never);

    await service.activate({ tenantId: 'tenant-1' });

    expect(redis.del).toHaveBeenCalledWith('tenant:tenant-1:suspended');
  });
});
```

- [ ] **Step 2: Implement lifecycle service**

Create `apps/saas/src/services/tenant-lifecycle.service.ts`:

```ts
import { buildTenantSuspendedRedisKey, TenantStatus } from '@common/constants/saas.constants';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TenantLifecycleService {
  constructor(
    private readonly tenantRepository: {
      findById(id: string): Promise<{ id: string; status: TenantStatus } | null>;
      updateStatus(id: string, patch: Record<string, unknown>): Promise<unknown>;
    },
    private readonly redis: { set(key: string, value: string): Promise<unknown>; del(key: string): Promise<unknown> },
  ) {}

  async suspend(params: { tenantId: string; reason: string }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.SUSPENDED,
      suspendedAt: new Date(),
      suspendedReason: params.reason,
    });
    await this.redis.set(buildTenantSuspendedRedisKey(params.tenantId), '1');
  }

  async activate(params: { tenantId: string }) {
    await this.assertTenant(params.tenantId);
    await this.tenantRepository.updateStatus(params.tenantId, {
      status: TenantStatus.ACTIVE,
      suspendedAt: null,
      suspendedReason: null,
    });
    await this.redis.del(buildTenantSuspendedRedisKey(params.tenantId));
  }

  private async assertTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
  }
}
```

- [ ] **Step 3: Run lifecycle tests**

Run:

```bash
pnpm nx test saas --testFile=tenant-lifecycle.service.spec.ts
```

Expected:

```txt
PASS apps/saas/src/services/tenant-lifecycle.service.spec.ts
```

## Task 4: Implement Onboarding Mini-Saga

**Files:**

- Create: `apps/saas/src/services/onboarding-saga.service.ts`
- Modify: `apps/saas/src/controllers/saas.controller.ts`
- Modify: `apps/saas/src/app.module.ts`
- Test: `apps/saas/src/services/onboarding-saga.service.spec.ts`

- [ ] **Step 1: Write onboarding happy-path and compensation tests**

Create `apps/saas/src/services/onboarding-saga.service.spec.ts`:

```ts
import { OnboardingSagaService } from './onboarding-saga.service';

describe('OnboardingSagaService', () => {
  const tenantRepo = { create: jest.fn(), deleteById: jest.fn() };
  const subscriptionService = { assignPlan: jest.fn() };
  const paymentClient = { send: jest.fn() };
  const authorizerClient = { send: jest.fn() };
  const userClient = { send: jest.fn() };
  const outbox = { createTenantCreated: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('creates tenant, owner, free subscription, empty payment settings, and outbox event', async () => {
    tenantRepo.create.mockResolvedValue({ id: 'tenant-1', slug: 'pho-ha-noi', name: 'Pho Ha Noi' });
    authorizerClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: 'kc-owner-1' }) });
    userClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { userId: 'kc-owner-1' } }) });
    paymentClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1' } }) });
    subscriptionService.assignPlan.mockResolvedValue({ id: 'sub-1' });

    const service = new OnboardingSagaService(
      tenantRepo as never,
      subscriptionService as never,
      authorizerClient as never,
      userClient as never,
      paymentClient as never,
      outbox as never,
    );

    const result = await service.onboard({
      tenantName: 'Pho Ha Noi',
      slug: 'pho-ha-noi',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'Password123!',
      ownerFirstName: 'Owner',
      ownerLastName: 'One',
      processId: 'p1',
    });

    expect(result.tenant.id).toBe('tenant-1');
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(expect.objectContaining({ planCode: 'FREE' }));
    expect(outbox.createTenantCreated).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
  });

  it('rolls back tenant when Keycloak owner creation fails', async () => {
    tenantRepo.create.mockResolvedValue({ id: 'tenant-1', slug: 'pho-ha-noi', name: 'Pho Ha Noi' });
    authorizerClient.send.mockReturnValue({ toPromise: () => Promise.reject(new Error('kc failed')) });

    const service = new OnboardingSagaService(
      tenantRepo as never,
      subscriptionService as never,
      authorizerClient as never,
      userClient as never,
      paymentClient as never,
      outbox as never,
    );

    await expect(
      service.onboard({
        tenantName: 'Pho Ha Noi',
        ownerEmail: 'owner@example.com',
        ownerPassword: 'Password123!',
        processId: 'p1',
      }),
    ).rejects.toThrow('kc failed');
    expect(tenantRepo.deleteById).toHaveBeenCalledWith('tenant-1');
  });
});
```

- [ ] **Step 2: Implement mini-saga with explicit compensation**

Create `apps/saas/src/services/onboarding-saga.service.ts`:

```ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { DEFAULT_PLAN_CODES } from '@common/constants/saas.constants';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SubscriptionService } from './subscription.service';

export type OnboardTenantParams = {
  tenantName: string;
  slug?: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  processId?: string;
};

@Injectable()
export class OnboardingSagaService {
  constructor(
    private readonly tenantRepository: {
      create(data: Record<string, unknown>): Promise<{ id: string; slug: string; name: string }>;
      deleteById(id: string): Promise<void>;
    },
    private readonly subscriptionService: SubscriptionService,
    private readonly authorizerClient: TcpClient,
    private readonly userClient: TcpClient,
    private readonly paymentClient: TcpClient,
    private readonly outboxRepository: { createTenantCreated(input: Record<string, unknown>): Promise<void> },
  ) {}

  async onboard(params: OnboardTenantParams) {
    let tenant: { id: string; slug: string; name: string } | undefined;
    let ownerUserId: string | undefined;

    try {
      tenant = await this.tenantRepository.create({
        name: params.tenantName.trim(),
        slug: params.slug,
        status: 'ACTIVE',
        defaultCurrency: 'VND',
        defaultLocale: 'vi-VN',
      });

      ownerUserId = await firstValueFrom(
        this.authorizerClient.send<string>(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_USER, {
          data: {
            email: params.ownerEmail,
            password: params.ownerPassword,
            firstName: params.ownerFirstName ?? '',
            lastName: params.ownerLastName ?? '',
            tenantId: tenant.id,
          },
          processId: params.processId,
        }),
      ).then((res) => res.data);

      await firstValueFrom(
        this.userClient.send(TCP_REQUEST_MESSAGE.USER.UPSERT_WITH_TENANT, {
          data: {
            userId: ownerUserId,
            email: params.ownerEmail,
            firstName: params.ownerFirstName ?? '',
            lastName: params.ownerLastName ?? '',
            tenantId: tenant.id,
            roleNames: ['OWNER'],
          },
          processId: params.processId,
        }),
      );

      await this.subscriptionService.assignPlan({
        tenantId: tenant.id,
        planCode: DEFAULT_PLAN_CODES.FREE,
        source: 'INITIAL_ONBOARDING',
        startsAt: new Date(),
        expiresAt: null,
      });

      await firstValueFrom(
        this.paymentClient.send(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY, {
          tenantId: tenant.id,
          processId: params.processId,
        }),
      );

      await this.outboxRepository.createTenantCreated({
        tenantId: tenant.id,
        slug: tenant.slug,
        ownerEmail: params.ownerEmail,
        processId: params.processId,
      });

      return { tenant, ownerUserId };
    } catch (error) {
      if (tenant) {
        await this.tenantRepository.deleteById(tenant.id).catch(() => undefined);
      }
      throw error;
    }
  }
}
```

- [ ] **Step 3: Add TCP handler**

Modify `apps/saas/src/controllers/saas.controller.ts`:

```ts
@MessagePattern(TCP_REQUEST_MESSAGE.TENANT.ONBOARD)
async onboard(@RequestParams() body: OnboardTenantTcpRequest): Promise<Response<OnboardTenantTcpResponse>> {
  return Response.success(await this.onboardingSagaService.onboard(body));
}
```

Inject `OnboardingSagaService` into the controller constructor.

- [ ] **Step 4: Run onboarding tests**

Run:

```bash
pnpm nx test saas --testFile=onboarding-saga.service.spec.ts
```

Expected:

```txt
PASS apps/saas/src/services/onboarding-saga.service.spec.ts
```

## Task 5: Implement Subscription Invoice And Tier 2 Webhook

**Files:**

- Create: `apps/saas/src/services/subscription-invoice.service.ts`
- Create: `apps/saas/src/repositories/subscription-invoice.repository.ts`
- Modify: `apps/saas/src/controllers/saas.controller.ts`
- Test: `apps/saas/src/services/subscription-invoice.service.spec.ts`

- [ ] **Step 1: Write invoice idempotency tests**

Create `apps/saas/src/services/subscription-invoice.service.spec.ts`:

```ts
import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { SubscriptionInvoiceService } from './subscription-invoice.service';

describe('SubscriptionInvoiceService', () => {
  const invoiceRepo = {
    findByBillingReferenceForUpdate: jest.fn(),
    markPaid: jest.fn(),
    auditUnderpaid: jest.fn(),
  };
  const subscriptionService = { assignPlan: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('does not activate subscription when transfer is underpaid', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
    });
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await service.handleWebhook({ code: 'QRSUB123', transferAmount: 100000, sepayTransactionId: 'tx-1' });

    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
    expect(invoiceRepo.auditUnderpaid).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ transferAmount: 100000 }),
    );
  });

  it('marks paid and assigns plan when amount is enough', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
    });
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await service.handleWebhook({ code: 'QRSUB123', transferAmount: 999000, sepayTransactionId: 'tx-1' });

    expect(invoiceRepo.markPaid).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ sepayTransactionId: 'tx-1' }),
    );
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', planCode: 'PREMIUM' }),
    );
  });
});
```

- [ ] **Step 2: Implement invoice service**

Create `apps/saas/src/services/subscription-invoice.service.ts`:

```ts
import { BILL_REF_PREFIXES, SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';

export type SubscriptionWebhookInput = {
  code: string;
  transferAmount: number;
  sepayTransactionId: string;
};

@Injectable()
export class SubscriptionInvoiceService {
  private readonly logger = new Logger(SubscriptionInvoiceService.name);

  constructor(
    private readonly invoiceRepository: {
      findByBillingReferenceForUpdate(billingReference: string): Promise<{
        id: string;
        billingReference: string;
        amountVnd: number;
        status: SubscriptionInvoiceStatus;
        tenantId: string;
        planCodeSnapshot: string;
      } | null>;
      markPaid(id: string, patch: Record<string, unknown>): Promise<void>;
      auditUnderpaid(id: string, patch: Record<string, unknown>): Promise<void>;
    },
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async handleWebhook(input: SubscriptionWebhookInput): Promise<void> {
    if (!input.code.startsWith(BILL_REF_PREFIXES.SUBSCRIPTION)) {
      this.logger.warn(`Ignoring non-subscription webhook code=${input.code}`);
      return;
    }

    const invoice = await this.invoiceRepository.findByBillingReferenceForUpdate(input.code);
    if (!invoice || invoice.status !== SubscriptionInvoiceStatus.PENDING) {
      return;
    }

    if (input.transferAmount < invoice.amountVnd) {
      await this.invoiceRepository.auditUnderpaid(invoice.id, input);
      return;
    }

    await this.invoiceRepository.markPaid(invoice.id, {
      status: SubscriptionInvoiceStatus.PAID,
      sepayTransactionId: input.sepayTransactionId,
      paidAmountVnd: input.transferAmount,
      paidAt: new Date(),
    });

    await this.subscriptionService.assignPlan({
      tenantId: invoice.tenantId,
      planCode: invoice.planCodeSnapshot,
      source: 'SUBSCRIPTION_PAYMENT',
      startsAt: new Date(),
      expiresAt: this.addOneMonth(new Date()),
    });
  }

  private addOneMonth(now: Date): Date {
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    return next;
  }
}
```

- [ ] **Step 3: Run invoice tests**

Run:

```bash
pnpm nx test saas --testFile=subscription-invoice.service.spec.ts
```

Expected:

```txt
PASS apps/saas/src/services/subscription-invoice.service.spec.ts
```

## Task 6: Add Cron And Outbox Publisher

**Files:**

- Modify: `apps/saas/src/app.module.ts`
- Create: `apps/saas/src/services/tenant-suspend-cron.service.ts`
- Create: `apps/saas/src/services/saas-outbox-publisher.service.ts`
- Create: `apps/saas/src/repositories/saas-outbox.repository.ts`
- Test: `apps/saas/src/services/tenant-suspend-cron.service.spec.ts`

- [ ] **Step 1: Add dependency**

Run:

```bash
pnpm add @nestjs/schedule
```

Expected:

```txt
dependencies:
+ @nestjs/schedule
```

- [ ] **Step 2: Write cron tests**

Create `apps/saas/src/services/tenant-suspend-cron.service.spec.ts`:

```ts
import { TenantSuspendCronService } from './tenant-suspend-cron.service';

describe('TenantSuspendCronService', () => {
  it('suspends tenants whose active subscription expired more than 24 hours ago', async () => {
    const subRepo = { findExpiredBeyondGrace: jest.fn().mockResolvedValue([{ tenantId: 'tenant-1' }]) };
    const lifecycle = { suspend: jest.fn() };
    const service = new TenantSuspendCronService(subRepo as never, lifecycle as never);

    await service.runOnce(new Date('2026-05-12T02:00:00+07:00'));

    expect(lifecycle.suspend).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      reason: 'subscription expired',
    });
  });
});
```

- [ ] **Step 3: Implement cron service**

Create `apps/saas/src/services/tenant-suspend-cron.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TenantLifecycleService } from './tenant-lifecycle.service';

@Injectable()
export class TenantSuspendCronService {
  private readonly logger = new Logger(TenantSuspendCronService.name);

  constructor(
    private readonly subscriptionRepository: {
      findExpiredBeyondGrace(now: Date, graceHours: number): Promise<Array<{ tenantId: string }>>;
    },
    private readonly tenantLifecycleService: TenantLifecycleService,
  ) {}

  @Cron('0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runDaily(): Promise<void> {
    await this.runOnce(new Date());
  }

  async runOnce(now: Date): Promise<void> {
    const expired = await this.subscriptionRepository.findExpiredBeyondGrace(now, 24);
    for (const row of expired) {
      try {
        await this.tenantLifecycleService.suspend({ tenantId: row.tenantId, reason: 'subscription expired' });
      } catch (error) {
        this.logger.error(`Failed to suspend expired tenant ${row.tenantId}`, error as Error);
      }
    }
  }
}
```

- [ ] **Step 4: Register module providers**

Modify `apps/saas/src/app.module.ts`:

```ts
import { ScheduleModule } from '@nestjs/schedule';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { SaasOutboxEvent } from '@common/entities/saas-outbox-event.entity';

// imports
ScheduleModule.forRoot(),
TypeOrmModule.forFeature([Tenant, PricingPlan, Subscription, SubscriptionInvoice, SaasOutboxEvent]),
```

Add all new services/repositories to `providers`.

- [ ] **Step 5: Run SaaS test suite**

Run:

```bash
pnpm nx test saas --runInBand
```

Expected:

```txt
PASS apps/saas
```

## Final Verification

Run:

```bash
pnpm nx test saas --runInBand
pnpm nx lint saas
```

Expected:

```txt
SaaS tests pass.
SaaS lint passes or only reports pre-existing unrelated issues documented in the handoff.
```

Commit once for this plan file after all verification commands pass:

```bash
git add apps/saas package.json pnpm-lock.yaml
git commit -m "feat: implement phase 4b saas lifecycle"
```
