# Phase 4B Cross-Service Integrations and Quotas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans`, `superpowers:subagent-driven-development`, `microservices-architect`, `microservices-patterns`, `nestjs-patterns`, and `code-review-and-quality` before executing this plan directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification.

**Goal:** Connect Phase 4B SaaS lifecycle to Authorizer, User-Access, Catalog, Order, Redis, and Kafka while preserving service boundaries, tenant isolation, and graceful failure handling.

**Architecture:** SaaS Service coordinates onboarding through a controlled mini-saga. Authorizer owns Keycloak admin operations. User-Access owns Mongo user profile persistence. Catalog owns area/table quota data. Order owns order quota increments. Redis stores fast tenant/subscription/quota flags. Kafka/outbox carries lifecycle events for async side effects such as default catalog seeding and later Phase 4C notifications.

**Tech Stack:** NestJS TCP microservices, Keycloak Admin API wrapper already present in Authorizer, Mongoose in User-Access, TypeORM in Catalog/Order services, Redis through existing provider pattern, Kafka/outbox pattern, Jest unit and integration tests.

---

## Inputs and Constraints

- Source of truth: `docs/specs/business-logic-phase-4b-spec.md`.
- Execute after `01-shared-contracts-data-model.md` because constants/interfaces/entities must exist.
- Execute after the core SaaS onboarding service has a stable orchestration entrypoint from `02-saas-service-lifecycle-subscription.md`.
- Do not make BFF talk directly to Authorizer/User-Access/Catalog/Order for onboarding side effects. SaaS Service is the coordinator.
- Do not add cross-service database access. Each service reads/writes its own data store only.
- Phase 4B mini-saga is compensating, not fully atomic. It must never leave an enabled Keycloak owner without a tenant/user-access profile when later steps fail.

## Task 1: Extend Authorizer Service for Keycloak Admin Operations

**Files:**

- Modify: `apps/authorizer/src/app/modules/keycloak/services/keycloak-http.service.ts`
- Modify: `apps/authorizer/src/app/modules/keycloak/controllers/keycloak.controller.ts`
- Create: `apps/authorizer/src/app/modules/keycloak/services/keycloak-admin.service.ts`
- Create: `apps/authorizer/src/app/modules/keycloak/services/keycloak-admin.service.spec.ts`
- Modify: `libs/interfaces/src/lib/request/keycloak-request.interface.ts`
- Modify: `libs/interfaces/src/lib/response/keycloak-response.interface.ts`

- [ ] **Step 1: Add admin request/response contracts**

Add request interfaces:

```typescript
export interface CreateTenantOwnerKeycloakRequest {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantSlug: string;
  roleNames: string[];
  temporaryPassword?: string;
  processId?: string;
}

export interface AssignKeycloakRealmRolesRequest {
  userId: string;
  roleNames: string[];
  processId?: string;
}

export interface DisableKeycloakUserRequest {
  userId: string;
  reason: string;
  processId?: string;
}

export interface GetKeycloakUserAdminRequest {
  userId: string;
  processId?: string;
}
```

Add response interfaces:

```typescript
export interface CreateTenantOwnerKeycloakResponse {
  userId: string;
  email: string;
  enabled: boolean;
  requiredActions: string[];
}

export interface DisableKeycloakUserResponse {
  userId: string;
  enabled: false;
}
```

- [ ] **Step 2: Implement KeycloakAdminService**

Responsibilities:

- Exchange client token through existing `exchangeClientToken`.
- Create user with attributes:
  - `tenant_id = tenantId`
  - `tenant_slug = tenantSlug`
- Set `enabled = true`.
- Set `requiredActions = ['UPDATE_PASSWORD']` when temporary password is generated/admin-provided.
- Assign realm roles by role name.
- Disable user for compensation and tenant close.
- Read user by id for Mongo backfill.

Implementation outline:

```typescript
@Injectable()
export class KeycloakAdminService {
  constructor(private readonly keycloakHttp: KeycloakHttpService) {}

  async createTenantOwner(request: CreateTenantOwnerKeycloakRequest): Promise<CreateTenantOwnerKeycloakResponse> {
    const token = await this.keycloakHttp.exchangeClientToken();
    const userId = await this.keycloakHttp.createUser(token, {
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      enabled: true,
      attributes: {
        tenant_id: [request.tenantId],
        tenant_slug: [request.tenantSlug],
      },
      requiredActions: ['UPDATE_PASSWORD'],
    });
    await this.assignRealmRoles({ userId, roleNames: request.roleNames, processId: request.processId });
    return { userId, email: request.email, enabled: true, requiredActions: ['UPDATE_PASSWORD'] };
  }

  async assignRealmRoles(request: AssignKeycloakRealmRolesRequest): Promise<void> {
    // Fetch realm roles by name, then POST role mappings to Keycloak.
  }

  async disableUser(request: DisableKeycloakUserRequest): Promise<DisableKeycloakUserResponse> {
    // PUT enabled=false and add disabled_reason attribute when the current wrapper supports attributes.
    return { userId: request.userId, enabled: false };
  }
}
```

Use concrete Keycloak endpoints through `KeycloakHttpService`; keep raw HTTP details inside that wrapper.

- [ ] **Step 3: Add TCP handlers**

Add handlers:

```typescript
@MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER)
createTenantOwner(@Payload() payload: CreateTenantOwnerKeycloakRequest) {
  return this.keycloakAdminService.createTenantOwner(payload);
}

@MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.ASSIGN_REALM_ROLES)
assignRealmRoles(@Payload() payload: AssignKeycloakRealmRolesRequest) {
  return this.keycloakAdminService.assignRealmRoles(payload);
}

@MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER)
disableUser(@Payload() payload: DisableKeycloakUserRequest) {
  return this.keycloakAdminService.disableUser(payload);
}

@MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.GET_USER_ADMIN)
getUserAdmin(@Payload() payload: GetKeycloakUserAdminRequest) {
  return this.keycloakAdminService.getUserById(payload);
}
```

- [ ] **Step 4: Add unit tests**

Test cases:

- Creates tenant owner with tenant attributes and `UPDATE_PASSWORD`.
- Assigns requested realm roles after create.
- Disables user on compensation request.
- Maps Keycloak duplicate email error to a stable error code `OWNER_EMAIL_ALREADY_EXISTS`.
- Does not log temporary password.

Run:

```bash
pnpm nx test authorizer --runInBand --testNamePattern="KeycloakAdminService"
```

Expected:

```txt
PASS apps/authorizer/src/app/modules/keycloak/services/keycloak-admin.service.spec.ts
```

## Task 2: Extend User-Access Service for Tenant-Aware User Profiles

**Files:**

- Modify: `apps/user-access/src/app/modules/user/controllers/user.controller.ts`
- Modify: `apps/user-access/src/app/modules/user/services/user.service.ts`
- Modify: `apps/user-access/src/app/modules/user/repositories/user.repository.ts`
- Create: `apps/user-access/src/app/modules/user/services/tenant-user.service.ts`
- Create: `apps/user-access/src/app/modules/user/services/tenant-user.service.spec.ts`
- Modify: `libs/interfaces/src/lib/request/user-request.interface.ts`
- Modify: `libs/interfaces/src/lib/response/user-response.interface.ts`

- [ ] **Step 1: Add tenant user contracts**

Add:

```typescript
export interface UpsertTenantOwnerProfileRequest {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleNames: string[];
  processId?: string;
}

export interface DisableTenantUsersRequest {
  tenantId: string;
  reason: string;
  processId?: string;
}

export interface CountTenantUsersRequest {
  tenantId: string;
  activeOnly?: boolean;
  processId?: string;
}

export interface CountTenantUsersResponse {
  tenantId: string;
  count: number;
}
```

- [ ] **Step 2: Implement repository methods**

Add methods to `UserRepository`:

```typescript
upsertTenantUserByUserId(params: {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleNames: string[];
}): Promise<UserDocument>;

disableUsersByTenantId(params: {
  tenantId: string;
  disabledAt: Date;
  reason: string;
}): Promise<{ modifiedCount: number }>;

countByTenantId(params: {
  tenantId: string;
  activeOnly: boolean;
}): Promise<number>;
```

Repository invariants:

- `tenantId` is persisted as string.
- SUPER_ADMIN users keep `tenantId: null`.
- Existing `upsertByUserId` remains backward compatible for login sync.

- [ ] **Step 3: Implement TenantUserService**

Service methods:

```typescript
async upsertOwnerProfile(request: UpsertTenantOwnerProfileRequest) {
  return this.userRepository.upsertTenantUserByUserId({
    userId: request.userId,
    tenantId: request.tenantId,
    email: request.email,
    firstName: request.firstName,
    lastName: request.lastName,
    roleNames: request.roleNames,
  });
}

async disableTenantUsers(request: DisableTenantUsersRequest) {
  return this.userRepository.disableUsersByTenantId({
    tenantId: request.tenantId,
    disabledAt: new Date(),
    reason: request.reason,
  });
}

async countTenantUsers(request: CountTenantUsersRequest): Promise<CountTenantUsersResponse> {
  const count = await this.userRepository.countByTenantId({
    tenantId: request.tenantId,
    activeOnly: request.activeOnly ?? true,
  });
  return { tenantId: request.tenantId, count };
}
```

- [ ] **Step 4: Add TCP handlers**

Add to `UserController`:

- `USER.UPSERT_TENANT_OWNER_PROFILE`
- `USER.DISABLE_TENANT_USERS`
- `USER.COUNT_BY_TENANT`

- [ ] **Step 5: Add tests**

Test cases:

- Upsert owner stores `tenantId`.
- Count excludes inactive users when `activeOnly=true`.
- Disable tenant users does not disable SUPER_ADMIN users with null tenant.
- Existing login sync still works when tenantId is missing.

Run:

```bash
pnpm nx test user-access --runInBand --testNamePattern="TenantUserService|UserRepository"
```

Expected:

```txt
PASS apps/user-access/src/app/modules/user/services/tenant-user.service.spec.ts
```

## Task 3: Add Catalog Service Tenant Created Consumer and Quota Counts

**Files:**

- Modify: `apps/catalog/src/app/modules/table/controllers/table.controller.ts`
- Modify: `apps/catalog/src/app/modules/table/services/table.service.ts`
- Modify: `apps/catalog/src/app/modules/area/services/area.service.ts`
- Create: `apps/catalog/src/app/modules/tenant-events/tenant-events.module.ts`
- Create: `apps/catalog/src/app/modules/tenant-events/tenant-created.consumer.ts`
- Create: `apps/catalog/src/app/modules/tenant-events/tenant-created.consumer.spec.ts`
- Modify: `apps/catalog/src/app/app.module.ts`
- Modify: `libs/interfaces/src/lib/request/catalog-request.interface.ts`
- Modify: `libs/interfaces/src/lib/response/catalog-response.interface.ts`

- [ ] **Step 1: Add table count TCP contract**

Add:

```typescript
export interface CountTenantTablesRequest {
  tenantId: string;
  activeOnly?: boolean;
  processId?: string;
}

export interface CountTenantTablesResponse {
  tenantId: string;
  count: number;
}
```

Add TCP handler:

```typescript
@MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.COUNT_TABLES_BY_TENANT)
countTablesByTenant(@Payload() payload: CountTenantTablesRequest) {
  return this.tableService.countTablesByTenant(payload);
}
```

- [ ] **Step 2: Implement table count**

Add to `TableService`:

```typescript
async countTablesByTenant(request: CountTenantTablesRequest): Promise<CountTenantTablesResponse> {
  const count = await this.tableRepository.count({
    where: {
      tenant: { id: request.tenantId },
      ...(request.activeOnly === false ? {} : { isActive: true }),
    },
  });
  return { tenantId: request.tenantId, count };
}
```

Adapt the `where` shape to the existing table entity relation names.

- [ ] **Step 3: Add tenant.created Kafka consumer**

Consumer behavior:

- Listen to topic `tenant.created`.
- Extract `tenantId`, `tenantSlug`, `tenantName`.
- Check if a default area already exists for tenant.
- If not exists, create one default area named `Khu vực chính`.
- Ack only after idempotent create completes.
- Log only tenant id and process id, not full payload.

Implementation outline:

```typescript
@Injectable()
export class TenantCreatedConsumer {
  constructor(private readonly areaService: AreaService) {}

  async handleTenantCreated(event: TenantCreatedEventPayload) {
    const exists = await this.areaService.existsByTenantIdAndName(event.tenantId, 'Khu vực chính');
    if (exists) {
      return { seeded: false, reason: 'DEFAULT_AREA_EXISTS' };
    }
    await this.areaService.createSystemArea({
      tenantId: event.tenantId,
      name: 'Khu vực chính',
      processId: event.processId,
    });
    return { seeded: true };
  }
}
```

If the project already has Kafka consumer infrastructure, register this consumer there. If Catalog currently has only TCP transport, add an event consumer module consistent with the existing Kafka pattern used in other services.

- [ ] **Step 4: Add AreaService idempotent helpers**

Add:

```typescript
existsByTenantIdAndName(tenantId: string, name: string): Promise<boolean>;

createSystemArea(params: {
  tenantId: string;
  name: string;
  processId?: string;
}): Promise<Area>;
```

Do not call BFF or SaaS Service from Catalog for this seed.

- [ ] **Step 5: Add tests**

Test cases:

- Count tables returns only active tables by default.
- Count tables includes inactive when `activeOnly=false`.
- Tenant created consumer creates default area once.
- Duplicate tenant.created event is idempotent.

Run:

```bash
pnpm nx test catalog --runInBand --testNamePattern="countTablesByTenant|TenantCreatedConsumer"
```

Expected:

```txt
PASS apps/catalog/src/app/modules/tenant-events/tenant-created.consumer.spec.ts
```

## Task 4: Add Order Service Daily Quota Counter

**Files:**

- Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-quota.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-quota.service.spec.ts`
- Modify if needed: `apps/order/src/app/modules/order/order.module.ts`

- [ ] **Step 1: Implement OrderQuotaService**

Redis key rule:

```txt
quota:{tenantId}:orders:{YYYY-MM-DD-HCM}
```

Service shape:

```typescript
@Injectable()
export class OrderQuotaService {
  constructor(private readonly redis: RedisClientLike) {}

  buildDailyOrderKey(tenantId: string, now = new Date()): string {
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    return `quota:${tenantId}:orders:${date}`;
  }

  async incrementDailyOrders(tenantId: string, now = new Date()): Promise<number> {
    const key = this.buildDailyOrderKey(tenantId, now);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60 * 60 * 48);
    }
    return count;
  }

  async getDailyOrders(tenantId: string, now = new Date()): Promise<number> {
    const value = await this.redis.get(this.buildDailyOrderKey(tenantId, now));
    return value ? Number(value) : 0;
  }
}
```

Use the repository's existing Redis abstraction if it differs from `RedisClientLike`.

- [ ] **Step 2: Add service-level backup quota check in submit order**

In `OrderService.submitOrder()`:

1. Resolve tenant subscription/quota through the existing BFF/service context or a SaaS TCP call if Order Service already has a SaaS client.
2. If no direct SaaS client exists in Order Service, use the quota value injected by BFF/customer-pwa flow only as L1 and add L2 in BFF plan. Do not introduce a circular dependency that violates current module architecture.
3. Increment the counter only after order validation succeeds and immediately before persisting the order.
4. If incremented count exceeds `maxOrdersPerDay`, return `ORDER_DAILY_QUOTA_EXCEEDED` and do not create order.

Preferred implementation if SaaS TCP client is acceptable:

```typescript
const quota = await this.saasClient.send(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_QUOTA, {
  tenantId,
  processId,
});
const nextCount = await this.orderQuotaService.incrementDailyOrders(tenantId);
if (quota.maxOrdersPerDay !== -1 && nextCount > quota.maxOrdersPerDay) {
  throw new ForbiddenException('ORDER_DAILY_QUOTA_EXCEEDED');
}
```

If the project has no safe SaaS client registration in Order, write the guard in BFF and keep `OrderQuotaService` available for `TENANT.GET_USAGE` reporting.

- [ ] **Step 3: Add quota tests**

Test cases:

- Key is generated using `Asia/Ho_Chi_Minh` date.
- First increment sets 48h TTL.
- Counter returns numeric 0 when key missing.
- Submit order blocks after quota limit when L2 is enabled.

Run:

```bash
pnpm nx test order --runInBand --testNamePattern="OrderQuotaService|daily quota"
```

Expected:

```txt
PASS apps/order/src/app/modules/order/services/order-quota.service.spec.ts
```

## Task 5: Add SaaS Redis Flag and Subscription Cache Integration

**Files:**

- Create: `apps/saas/src/services/tenant-status-cache.service.ts`
- Create: `apps/saas/src/services/subscription-cache.service.ts`
- Create: `apps/saas/src/services/tenant-status-cache.service.spec.ts`
- Modify: `apps/saas/src/services/tenant-lifecycle.service.ts`
- Modify: `apps/saas/src/services/subscription.service.ts`

- [ ] **Step 1: Implement tenant status cache**

Keys:

```txt
tenant:{tenantId}:suspended
```

Methods:

```typescript
async markSuspended(tenantId: string): Promise<void> {
  await this.redis.set(`tenant:${tenantId}:suspended`, '1');
}

async clearSuspended(tenantId: string): Promise<void> {
  await this.redis.del(`tenant:${tenantId}:suspended`);
}

async isSuspended(tenantId: string): Promise<boolean> {
  return (await this.redis.get(`tenant:${tenantId}:suspended`)) === '1';
}
```

- [ ] **Step 2: Implement subscription cache**

Key:

```txt
subscription:{tenantId}
```

TTL: 300 seconds.

Methods:

```typescript
async getCurrent(tenantId: string): Promise<CurrentSubscriptionCacheValue | null>;
async setCurrent(tenantId: string, value: CurrentSubscriptionCacheValue): Promise<void>;
async clearCurrent(tenantId: string): Promise<void>;
```

Cache value:

```typescript
export interface CurrentSubscriptionCacheValue {
  tenantId: string;
  planCode: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELED';
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
  features: string[];
  expiresAt: string | null;
}
```

- [ ] **Step 3: Wire cache side effects**

Wire in SaaS service methods:

- `suspendTenant` → `markSuspended`.
- `activateTenant` → `clearSuspended`.
- `closeTenant` → `markSuspended`.
- `assignPlan` → `setCurrent`.
- `expireSubscription` → `clearCurrent`.
- `invoicePaid` → `setCurrent`.

Redis failure policy:

- Database transaction commits first.
- Redis failure after commit logs error and schedules an outbox event `tenant.cache_refresh_requested`.
- Guard code must fall back to SaaS TCP lookup when Redis is unavailable or missing key.

- [ ] **Step 4: Add tests**

Test cases:

- Suspend writes Redis flag.
- Activate deletes Redis flag.
- Assign plan caches quota summary.
- Redis failure does not roll back committed subscription.

Run:

```bash
pnpm nx test saas --runInBand --testNamePattern="TenantStatusCache|SubscriptionCache"
```

Expected:

```txt
PASS apps/saas/src/services/tenant-status-cache.service.spec.ts
```

## Task 6: Add Outbox Publisher for Tenant and Subscription Events

**Files:**

- Create: `apps/saas/src/repositories/outbox-event.repository.ts`
- Create: `apps/saas/src/services/outbox-publisher.service.ts`
- Create: `apps/saas/src/services/outbox-publisher.service.spec.ts`
- Modify: `apps/saas/src/services/onboarding-saga.service.ts`
- Modify: `apps/saas/src/services/tenant-lifecycle.service.ts`
- Modify: `apps/saas/src/services/subscription.service.ts`

- [ ] **Step 1: Define event names**

Events:

```typescript
export const SAAS_EVENTS = {
  TENANT_CREATED: 'tenant.created',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_ACTIVATED: 'tenant.activated',
  TENANT_CLOSED: 'tenant.closed',
  SUBSCRIPTION_ASSIGNED: 'subscription.assigned',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_INVOICE_PAID: 'subscription_invoice.paid',
  TENANT_CACHE_REFRESH_REQUESTED: 'tenant.cache_refresh_requested',
} as const;
```

- [ ] **Step 2: Insert outbox events inside DB transactions**

For onboarding success:

```json
{
  "eventType": "tenant.created",
  "partitionKey": "{tenantId}",
  "payload": {
    "tenantId": "{tenantId}",
    "tenantSlug": "{slug}",
    "tenantName": "{name}",
    "ownerUserId": "{ownerUserId}",
    "initialPlanCode": "{planCode}"
  }
}
```

For subscription expiry:

```json
{
  "eventType": "subscription.expired",
  "partitionKey": "{tenantId}",
  "payload": {
    "tenantId": "{tenantId}",
    "subscriptionId": "{subscriptionId}",
    "planCode": "{planCode}",
    "expiredAt": "{ISO date}"
  }
}
```

- [ ] **Step 3: Implement publisher poll loop**

The publisher:

- Polls `outbox_events` where `status='PENDING'`.
- Locks rows using `FOR UPDATE SKIP LOCKED` when TypeORM query builder supports it.
- Publishes to Kafka topic equal to `topic`.
- Marks event `PUBLISHED`.
- On publish error, increments `attempt_count`, stores `last_error`, leaves status `PENDING` until `attempt_count >= 10`.
- Marks `FAILED` after 10 attempts.

Publisher method:

```typescript
async publishPendingBatch(limit = 50): Promise<{ published: number; failed: number }> {
  const events = await this.outboxRepository.lockPending(limit);
  let published = 0;
  let failed = 0;
  for (const event of events) {
    try {
      await this.kafkaProducer.emit(event.topic, event.payload, event.partitionKey);
      await this.outboxRepository.markPublished(event.id);
      published += 1;
    } catch (error) {
      await this.outboxRepository.markAttemptFailed(event.id, error);
      failed += 1;
    }
  }
  return { published, failed };
}
```

- [ ] **Step 4: Add tests**

Test cases:

- Inserts tenant.created in same transaction as tenant onboarding.
- Publisher marks event published after Kafka emit.
- Publisher records error and keeps event retryable.
- Publisher marks failed after 10 attempts.

Run:

```bash
pnpm nx test saas --runInBand --testNamePattern="OutboxPublisher|tenant.created"
```

Expected:

```txt
PASS apps/saas/src/services/outbox-publisher.service.spec.ts
```

## Task 7: End-to-End Onboarding Mini-Saga Contract Test

**Files:**

- Create: `apps/saas/src/services/onboarding-saga.integration.spec.ts`

- [ ] **Step 1: Mock all remote clients**

Mock:

- Authorizer client for `KEYCLOAK.CREATE_TENANT_OWNER` and `KEYCLOAK.DISABLE_USER`.
- User-Access client for `USER.UPSERT_TENANT_OWNER_PROFILE`.
- Payment client for `PAYMENT_SETTINGS.CREATE_EMPTY`.
- Catalog side effects through outbox only.

- [ ] **Step 2: Assert success path**

Success path must create:

- Tenant with `ACTIVE`.
- Active subscription.
- Empty tenant payment settings.
- Owner Keycloak user with tenant attributes.
- Mongo user profile with `tenantId`.
- Outbox `tenant.created`.

- [ ] **Step 3: Assert compensation path**

Failure after Keycloak owner creation must:

- Disable Keycloak user.
- Roll back local DB transaction or mark tenant `CLOSED` if transaction already committed.
- Return stable error code `TENANT_ONBOARDING_FAILED`.
- Not publish `tenant.created`.

- [ ] **Step 4: Run integration test**

Run:

```bash
pnpm nx test saas --runInBand --testNamePattern="OnboardingSaga integration"
```

Expected:

```txt
PASS apps/saas/src/services/onboarding-saga.integration.spec.ts
```

## Final Verification

Run:

```bash
pnpm nx test authorizer --runInBand --testNamePattern="KeycloakAdminService"
pnpm nx test user-access --runInBand --testNamePattern="TenantUserService|UserRepository"
pnpm nx test catalog --runInBand --testNamePattern="countTablesByTenant|TenantCreatedConsumer"
pnpm nx test order --runInBand --testNamePattern="OrderQuotaService|daily quota"
pnpm nx test saas --runInBand --testNamePattern="OutboxPublisher|OnboardingSaga integration"
pnpm nx run-many -t lint --projects=authorizer,user-access,catalog,order,saas
git diff --check -- apps/authorizer apps/user-access apps/catalog apps/order apps/saas libs/interfaces
```

Expected:

```txt
All listed cross-service unit/integration tests pass.
Lint passes or only pre-existing unrelated issues are listed in the handoff.
No changed file has whitespace errors.
```

Commit once for this plan file after all verification commands pass:

```bash
git add apps/authorizer apps/user-access apps/catalog apps/order apps/saas libs/interfaces
git commit -m "feat: integrate phase 4b cross-service lifecycle"
```
