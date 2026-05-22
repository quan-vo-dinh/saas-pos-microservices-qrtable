# QRTable Refactor Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve QRTable code quality and refactor readiness without changing product behavior, while protecting tenant isolation, payment/order correctness, Kafka/Redis contracts, and CI signal quality.

**Architecture:** This is an incremental refactor roadmap. Start by stabilizing safety gates and configuration boundaries, then split oversized core modules, then standardize shared key/room builders, then clean frontend/build warnings. Each task is independently verifiable and should be submitted as a small change.

**Tech Stack:** Nx monorepo, NestJS, TypeScript, TypeORM, Redis, Kafka, Socket.io, Next.js, React/Vite, Jest, ESLint.

---

## Baseline From Quality Check

Commands already run during the quality audit:

```bash
pnpm nx run-many -t lint --all --parallel=4 --skip-nx-cache
```

Result:

- Exit code: `0`
- ESLint warnings: `68`

```bash
pnpm nx run-many -t test --all --parallel=4 --skip-nx-cache
```

Result:

- Exit code: `1`
- Failed task: `frontend-utils:test`
- Failed suites: `6`
- Failed tests: `36`
- Observed causes: `Keycloak token failed: 401` and `TypeError: fetch failed`

```bash
pnpm nx run-many -t build --all --parallel=4 --skip-nx-cache
```

Result:

- Exit code: `0`
- Build passed for `17` projects
- Warning observed during Next prerender: Recharts chart width/height is `-1`

Current dirty worktree observed before plan creation:

```text
 M AGENTS.md
 D readfile.md
 D step-0-3-erd-overview.md
?? .agents/skills/clean-code-ts/
?? opencode.json
```

Do not revert these changes unless the user explicitly asks.

---

## Scope

This plan covers:

- TypeORM safety and service DB boundary hardening.
- Config access cleanup for `process.env` usage in service/controller/guard code.
- Logging redaction and removal of production `console.log`.
- Integration test gating for runtime-dependent frontend utility tests.
- Large backend module splits for Order and Kitchen.
- Shared Redis key and WebSocket room builders.
- VND rounding alignment around existing `buildVndRoundingSnapshot`.
- Frontend lint/build warning cleanup.
- Verification gates for each phase.

This plan does not cover:

- New product features.
- Database schema redesign beyond safety and migration readiness.
- Alias migration from `@common/*` / `@einvoice/*` to `@qrtable/*` across the whole repo.
- Rewriting service boundaries.
- UI redesign.

---

## File Map

Expected files to modify or create during the roadmap:

- Modify: `libs/configuration/src/lib/type-orm.config.ts`
- Modify: `apps/order/src/app/app.module.ts`
- Modify: `apps/catalog/src/app/app.module.ts`
- Modify: `apps/payment/src/app/app.module.ts`
- Modify: `apps/saas/src/app.module.ts`
- Modify: `apps/product/src/app/modules/product/product.module.ts`
- Modify: `apps/order/src/configuration/index.ts`
- Modify: `apps/bff/src/configuration/index.ts`
- Modify: `apps/saas/src/configuration/index.ts`
- Modify: `apps/payment/src/configuration/index.ts`
- Modify: `apps/catalog/src/configuration/index.ts`
- Modify: `apps/kitchen/src/configuration/index.ts`
- Modify: `libs/middlewares/src/lib/logger.middleware.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/*.integration.spec.ts`
- Create: `libs/frontend/utils/src/lib/__tests__/integration/integration-gate.ts`
- Create: `libs/constants/src/lib/redis-key.constants.ts`
- Create: `libs/constants/src/lib/ws-room.constants.ts`
- Modify: `libs/constants/src/index.ts`
- Modify: `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- Modify: `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
- Modify: `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- Modify: `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`
- Modify: `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`
- Modify: `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`
- Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-submit.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-state-transition.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-kds-event.service.ts`
- Modify: `apps/order/src/app/modules/order/order.module.ts`
- Modify: `apps/order/src/app/modules/order/tests/order.service.spec.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts`
- Create: `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- Create: `apps/kitchen/src/app/modules/kitchen/repositories/kds-sla-store.repository.ts`
- Create: `apps/kitchen/src/app/modules/kitchen/repositories/kds-recovery-store.repository.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/tests/*.spec.ts`
- Modify: `apps/management-app/src/components/pos/live-orders-table.tsx`
- Modify: `apps/management-app/src/components/pos/kpi-tiles.tsx`
- Modify: `apps/management-app/src/features/menu/components/*.tsx`
- Modify: `apps/management-app/src/features/tables/components/tables-table.tsx`

---

## Execution Rules

- Keep each task as a separate change.
- Run the verification commands listed in each task before claiming completion.
- Do not refactor unrelated files while touching a task.
- Do not change API contracts unless a task explicitly says so.
- Preserve existing tests before moving code.
- Add or update tests before implementation when behavior can be expressed as a test.
- Do not use `process.env` in service/controller/guard code after Task 3.
- Do not create new local Redis key or WebSocket room strings after Task 5.

---

### Task 1: Gate Runtime-Dependent Frontend Integration Tests

**Purpose:** Make `frontend-utils:test` reliable by skipping real Keycloak/BFF integration tests unless explicitly opted in.

**Files:**

- Create: `libs/frontend/utils/src/lib/__tests__/integration/integration-gate.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/areas.integration.spec.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/categories.integration.spec.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/menu-items.integration.spec.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/public-menu.integration.spec.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/tables.integration.spec.ts`
- Modify: `libs/frontend/utils/src/lib/__tests__/integration/tenant-isolation.integration.spec.ts`

- [ ] **Step 1: Add the integration gate helper**

Add this file:

```ts
const RUN_FRONTEND_UTILS_INTEGRATION = process.env['RUN_FRONTEND_UTILS_INTEGRATION'] === '1';

export const describeFrontendUtilsIntegration = RUN_FRONTEND_UTILS_INTEGRATION ? describe : describe.skip;

export function frontendUtilsIntegrationReadiness(): { ok: boolean; reason: string } {
  if (RUN_FRONTEND_UTILS_INTEGRATION) {
    return { ok: true, reason: 'frontend-utils integration tests enabled' };
  }

  return {
    ok: false,
    reason: 'set RUN_FRONTEND_UTILS_INTEGRATION=1 with BFF_URL and KEYCLOAK_URL to opt in',
  };
}
```

- [ ] **Step 2: Replace top-level `describe` in the six integration specs**

For each listed integration spec, import:

```ts
import { describeFrontendUtilsIntegration } from './integration-gate';
```

Then replace the top-level call:

```ts
describe('[Integration] ...', () => {
```

with:

```ts
describeFrontendUtilsIntegration('[Integration] ...', () => {
```

Keep the existing test body unchanged.

- [ ] **Step 3: Run frontend utility tests**

Run:

```bash
pnpm nx test frontend-utils --skip-nx-cache --output-style=static
```

Expected:

- Exit code `0`
- Unit tests pass
- Runtime-dependent integration suites are skipped unless `RUN_FRONTEND_UTILS_INTEGRATION=1`

- [ ] **Step 4: Run all tests**

Run:

```bash
pnpm nx run-many -t test --all --parallel=4 --skip-nx-cache
```

Expected:

- Exit code `0`
- Backend service tests still pass
- Frontend utility integration tests no longer fail on missing Keycloak/BFF runtime

- [ ] **Step 5: Commit**

```bash
git add libs/frontend/utils/src/lib/__tests__/integration
git commit -m "test: gate frontend utils integration tests"
```

---

### Task 2: Harden TypeORM Provider Boundaries

**Purpose:** Remove global entity discovery and `synchronize: true` from the default provider so each service owns its DB entity set explicitly.

**Files:**

- Modify: `libs/configuration/src/lib/type-orm.config.ts`
- Modify: `apps/order/src/app/app.module.ts`
- Modify: `apps/catalog/src/app/app.module.ts`
- Modify: `apps/payment/src/app/app.module.ts`
- Modify: `apps/saas/src/app.module.ts`
- Modify: `apps/product/src/app/modules/product/product.module.ts`

- [ ] **Step 1: Add a typed TypeORM provider factory**

In `libs/configuration/src/lib/type-orm.config.ts`, replace the exported singleton provider with a factory while preserving `TypeOrmConfiguration` and timestamp parser behavior:

```ts
import { EntitySchema, ObjectLiteral } from 'typeorm';

export type TypeOrmEntityTarget = Function | EntitySchema | string;

function shouldSynchronizeSchema(configService: ConfigService): boolean {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const configured = configService.get<string | boolean>('TYPEORM_SYNCHRONIZE');
  if (configured === true || configured === 'true') {
    return nodeEnv === 'development' || nodeEnv === 'test';
  }
  return false;
}

export function createTypeOrmProvider(entities: TypeOrmEntityTarget[]): DynamicModule {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
      type: configService.get<string>('TYPEORM_CONFIG.TYPE') as DatabaseType,
      host: configService.get<string>('TYPEORM_CONFIG.HOST'),
      port: configService.get<number>('TYPEORM_CONFIG.PORT'),
      username: configService.get<string>('TYPEORM_CONFIG.USERNAME'),
      password: configService.get<string>('TYPEORM_CONFIG.PASSWORD'),
      database: configService.get<string>('TYPEORM_CONFIG.DATABASE'),
      entities,
      synchronize: shouldSynchronizeSchema(configService),
      autoLoadEntities: false,
    }),
  });
}
```

Keep a temporary compatibility export only if current imports still require it:

```ts
export const TypeOrmProvider = createTypeOrmProvider([]);
```

Remove the compatibility export once all consumers are migrated.

- [ ] **Step 2: Update each app module to pass only owned entities**

For `apps/order/src/app/app.module.ts`, use:

```ts
createTypeOrmProvider([Session, Order, OrderItem, Bill, ServiceRequest, OutboxEvent]);
```

For `apps/catalog/src/app/app.module.ts`, use:

```ts
createTypeOrmProvider([Area, Category, MenuItem, Table]);
```

For `apps/payment/src/app/app.module.ts`, use:

```ts
createTypeOrmProvider([
  PaymentEntity,
  RefundEntity,
  AuditPaymentEntity,
  PaymentOutboxEventEntity,
  TenantPaymentSettingsEntity,
]);
```

For `apps/saas/src/app.module.ts`, use:

```ts
createTypeOrmProvider([Tenant, PricingPlan, Subscription, SubscriptionInvoice, SaasOutboxEvent]);
```

For `apps/product/src/app/modules/product/product.module.ts`, use:

```ts
createTypeOrmProvider([Product]);
```

- [ ] **Step 3: Keep service module repositories unchanged**

Do not remove existing `TypeOrmModule.forFeature([...])` calls from feature modules in this task. They still provide repositories to Nest DI.

- [ ] **Step 4: Run focused builds**

Run:

```bash
pnpm nx build order --skip-nx-cache
pnpm nx build catalog --skip-nx-cache
pnpm nx build payment --skip-nx-cache
pnpm nx build saas --skip-nx-cache
pnpm nx build product --skip-nx-cache
```

Expected:

- Each command exits `0`
- No TypeScript errors around `createTypeOrmProvider`

- [ ] **Step 5: Run backend tests**

Run:

```bash
pnpm nx test order --skip-nx-cache
pnpm nx test catalog --skip-nx-cache
pnpm nx test payment --skip-nx-cache
pnpm nx test saas --skip-nx-cache
```

Expected:

- All commands exit `0`

- [ ] **Step 6: Commit**

```bash
git add libs/configuration/src/lib/type-orm.config.ts apps/order/src/app/app.module.ts apps/catalog/src/app/app.module.ts apps/payment/src/app/app.module.ts apps/saas/src/app.module.ts apps/product/src/app/modules/product/product.module.ts
git commit -m "refactor: scope typeorm providers per service"
```

---

### Task 3: Move Runtime Config Out Of Business Logic

**Purpose:** Remove `process.env` reads from services, controllers, and guards by extending app configuration objects.

**Files:**

- Modify: `apps/order/src/configuration/index.ts`
- Modify: `apps/bff/src/configuration/index.ts`
- Modify: `apps/saas/src/configuration/index.ts`
- Modify: `apps/payment/src/configuration/index.ts`
- Modify: `apps/catalog/src/configuration/index.ts`
- Modify: `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts`
- Modify: `apps/saas/src/services/subscription-invoice.service.ts`
- Modify: `apps/saas/src/services/saas-outbox-publisher.service.ts`
- Modify: `apps/bff/src/app/modules/payment/guards/sepay-webhook-secret.guard.ts`
- Modify: `apps/bff/src/app/modules/payment/controllers/payment.controller.ts`
- Modify: `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- Modify: `apps/bff/src/app/modules/saas/controllers/public-saas.controller.ts`
- Modify: `apps/bff/src/app/modules/saas/controllers/dashboard-payment-settings.controller.ts`
- Modify: `apps/payment/src/app/modules/payment/services/sepay-oauth-client.service.ts`

- [ ] **Step 1: Add app-specific config classes**

Use this pattern in each affected `configuration/index.ts` file:

```ts
class BffPaymentConfiguration {
  PAYMENT_TCP_TIMEOUT_MS = Number(process.env['BFF_PAYMENT_TCP_TIMEOUT_MS'] ?? 5000);
  SEPAY_WEBHOOK_SECRET = process.env['SEPAY_WEBHOOK_SECRET']?.trim() ?? '';
  PUBLIC_API_BASE_URL = process.env['PUBLIC_API_BASE_URL']?.replace(/\/+$/, '') ?? '';
  PLATFORM_CONTACT_EMAIL = process.env['PLATFORM_CONTACT_EMAIL']?.trim() ?? 'support@qrtable.local';
}
```

Register it inside the app `Configuration` class:

```ts
@ValidateNested()
@Type(() => BffPaymentConfiguration)
BFF_PAYMENT_CONFIG = new BffPaymentConfiguration();
```

Use equivalent names for Order, SaaS, Catalog, and Payment configuration groups.

- [ ] **Step 2: Inject `ConfigService` where needed**

Use this pattern in controllers/services/guards:

```ts
constructor(private readonly configService: ConfigService) {}
```

Read values like this:

```ts
const timeoutMs = this.configService.get<number>('BFF_PAYMENT_CONFIG.PAYMENT_TCP_TIMEOUT_MS') ?? 5000;
```

- [ ] **Step 3: Replace known violations**

Replace direct `process.env` usage in:

```text
apps/order/src/app/modules/order/services/payment-events-consumer.service.ts
apps/saas/src/services/subscription-invoice.service.ts
apps/saas/src/services/saas-outbox-publisher.service.ts
apps/bff/src/app/modules/payment/guards/sepay-webhook-secret.guard.ts
apps/bff/src/app/modules/payment/controllers/payment.controller.ts
apps/bff/src/app/modules/order/controllers/customer-order.controller.ts
apps/bff/src/app/modules/saas/controllers/public-saas.controller.ts
apps/bff/src/app/modules/saas/controllers/dashboard-payment-settings.controller.ts
apps/payment/src/app/modules/payment/services/sepay-oauth-client.service.ts
```

Keep `process.env` only inside configuration classes and tests.

- [ ] **Step 4: Verify no business-layer env leaks remain**

Run:

```bash
rg -n "process\\.env" apps libs -g "*.ts" -g "*.tsx" -g "!**/*.spec.ts" -g "!**/configuration/**" -g "!libs/configuration/**" -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/.next/**"
```

Expected:

- No matches in service/controller/guard production code.

- [ ] **Step 5: Run affected tests**

Run:

```bash
pnpm nx test order --skip-nx-cache
pnpm nx test payment --skip-nx-cache
pnpm nx test saas --skip-nx-cache
pnpm nx test bff --skip-nx-cache
```

Expected:

- All commands exit `0`

- [ ] **Step 6: Commit**

```bash
git add apps/order/src/configuration/index.ts apps/bff/src/configuration/index.ts apps/saas/src/configuration/index.ts apps/payment/src/configuration/index.ts apps/catalog/src/configuration/index.ts apps/order/src/app/modules/order/services/payment-events-consumer.service.ts apps/saas/src/services/subscription-invoice.service.ts apps/saas/src/services/saas-outbox-publisher.service.ts apps/bff/src/app/modules/payment/guards/sepay-webhook-secret.guard.ts apps/bff/src/app/modules/payment/controllers/payment.controller.ts apps/bff/src/app/modules/order/controllers/customer-order.controller.ts apps/bff/src/app/modules/saas/controllers/public-saas.controller.ts apps/bff/src/app/modules/saas/controllers/dashboard-payment-settings.controller.ts apps/payment/src/app/modules/payment/services/sepay-oauth-client.service.ts
git commit -m "refactor: move runtime config behind config service"
```

---

### Task 4: Redact HTTP Logging

**Purpose:** Remove raw body console logging and prevent sensitive values from being written to logs.

**Files:**

- Modify: `libs/middlewares/src/lib/logger.middleware.ts`
- Test: `libs/middlewares/src/lib/logger.middleware.spec.ts`

- [ ] **Step 1: Add a middleware spec**

Create `libs/middlewares/src/lib/logger.middleware.spec.ts` with tests that verify:

```ts
it('redacts secret-like request body fields before logging', () => {
  // request body includes password, token, secret, authorization, and normal field
  // expected log payload contains [REDACTED] for secret-like fields
});

it('does not call console.log', () => {
  // spy on console.log
  // run middleware
  // expect console.log not to have been called
});
```

- [ ] **Step 2: Implement redaction**

Use a local helper in `logger.middleware.ts`:

```ts
const REDACTED = '[REDACTED]';
const SECRET_FIELD_PATTERN = /(password|token|secret|authorization|cookie|api[-_]?key)/i;

function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactLogValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SECRET_FIELD_PATTERN.test(key) ? REDACTED : redactLogValue(entry),
      ]),
    );
  }
  return value;
}
```

Replace raw body logging with:

```ts
const safeBody = redactLogValue(body);
Logger.log(
  `HTTP >> Start ProcessId: '${processId}' >> method: '${method}' >> url: '${originalUrl}' >> at: '${now.toISOString()}' >> input: '${JSON.stringify(
    safeBody,
  )}'`,
);
```

- [ ] **Step 3: Remove production `console.log`**

Delete:

```ts
console.log(`[Request] ${method} ${originalUrl} - Body: ${JSON.stringify(body)}`);
```

- [ ] **Step 4: Run middleware test and lint**

Run:

```bash
pnpm nx test middlewares --skip-nx-cache
pnpm nx lint middlewares --skip-nx-cache
```

Expected:

- Both commands exit `0`
- No `console.log` remains in `libs/middlewares/src/lib/logger.middleware.ts`

- [ ] **Step 5: Commit**

```bash
git add libs/middlewares/src/lib/logger.middleware.ts libs/middlewares/src/lib/logger.middleware.spec.ts
git commit -m "fix: redact http middleware logs"
```

---

### Task 5: Centralize Redis Keys And WebSocket Rooms

**Purpose:** Replace repeated string interpolation for shared Redis keys and Socket.io rooms with named builders.

**Files:**

- Create: `libs/constants/src/lib/redis-key.constants.ts`
- Create: `libs/constants/src/lib/ws-room.constants.ts`
- Modify: `libs/constants/src/index.ts`
- Modify: `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- Modify: `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
- Modify: `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- Modify: `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`
- Modify: `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`
- Modify: `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`
- Modify: `apps/order/src/app/modules/order/services/session.service.ts`
- Modify: `apps/order/src/app/modules/order/services/cart.service.ts`
- Modify: `apps/order/src/app/modules/order/services/order-quota.service.ts`

- [ ] **Step 1: Add Redis key builders**

Create `libs/constants/src/lib/redis-key.constants.ts`:

```ts
export const RedisKey = {
  menu: {
    public: (tenantId: string) => `menu:${tenantId}`,
  },
  session: {
    data: (tenantId: string, sessionId: string) => `session:${tenantId}:${sessionId}`,
  },
  cart: {
    data: (tenantId: string, sessionId: string) => `cart:${tenantId}:${sessionId}`,
  },
  quota: {
    dailyOrders: (tenantId: string, date: string) => `quota:${tenantId}:orders:${date}`,
  },
} as const;
```

- [ ] **Step 2: Add WebSocket room builders**

Create `libs/constants/src/lib/ws-room.constants.ts`:

```ts
import type { PreparationStation } from '@einvoice/types';

function kdsStationSlug(station: PreparationStation): 'kitchen' | 'bar' {
  return station === 'KITCHEN' ? 'kitchen' : 'bar';
}

export const WsRoom = {
  staff: (tenantId: string) => `tenant:${tenantId}:staff`,
  management: (tenantId: string) => `tenant:${tenantId}:management`,
  customers: (tenantId: string) => `tenant:${tenantId}:customers`,
  tenantSlugCustomers: (tenantSlug: string) => `tenant-slug:${tenantSlug}:customers`,
  customer: (sessionId: string) => `session:${sessionId}:customer`,
  kds: (tenantId: string, station: PreparationStation) => `tenant:${tenantId}:kds:${kdsStationSlug(station)}`,
} as const;
```

- [ ] **Step 3: Export builders**

Append to `libs/constants/src/index.ts`:

```ts
export * from './lib/redis-key.constants';
export * from './lib/ws-room.constants';
```

- [ ] **Step 4: Replace hardcoded keys and rooms**

Replace these patterns:

```ts
`menu:${tenantId}``session:${tenantId}:${sessionId}``cart:${tenantId}:${sessionId}``quota:${tenantId}:orders:${date}``tenant:${tenantId}:staff``tenant:${tenantId}:management``tenant:${tenantId}:customers``session:${sessionId}:customer`;
```

with `RedisKey.*` or `WsRoom.*`.

- [ ] **Step 5: Run affected tests**

Run:

```bash
pnpm nx test constants --skip-nx-cache
pnpm nx test order --skip-nx-cache
pnpm nx test bff --skip-nx-cache
```

Expected:

- All commands exit `0`
- Existing room/key expectations still pass after updating expected strings through builders where needed

- [ ] **Step 6: Commit**

```bash
git add libs/constants/src/lib/redis-key.constants.ts libs/constants/src/lib/ws-room.constants.ts libs/constants/src/index.ts apps/bff/src/app/modules/realtime apps/bff/src/app/modules/catalog/controllers apps/order/src/app/modules/order/services
git commit -m "refactor: centralize redis keys and websocket rooms"
```

---

### Task 6: Split Order Submit Flow Out Of OrderService

**Purpose:** Reduce `OrderService` size while preserving order submit behavior, idempotency, quota handling, bill roll-up, and realtime event output.

**Files:**

- Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-submit.service.ts`
- Modify: `apps/order/src/app/modules/order/order.module.ts`
- Modify: `apps/order/src/app/modules/order/tests/order.service.spec.ts`
- Create: `apps/order/src/app/modules/order/tests/order-submit.service.spec.ts`

- [ ] **Step 1: Move submit-specific tests first**

Copy submit-order related tests from `order.service.spec.ts` into `order-submit.service.spec.ts`. Include tests for:

```text
submitOrder deducts no stock until confirmation
submitOrder creates PENDING order from cart snapshot
submitOrder rejects cart version mismatch
submitOrder rejects empty cart
submitOrder deduplicates idempotency replay
submitOrder does not increment daily quota for replay
submitOrder rolls back quota when transaction fails
```

Run:

```bash
pnpm nx test order --testFile=apps/order/src/app/modules/order/tests/order-submit.service.spec.ts --skip-nx-cache
```

Expected:

- The new spec fails because `OrderSubmitService` does not exist yet.

- [ ] **Step 2: Create `OrderSubmitService`**

Create:

```ts
@Injectable()
export class OrderSubmitService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly billRepository: BillRepository,
    private readonly cartService: CartService,
    private readonly sessionService: SessionService,
    private readonly orderQuotaService: OrderQuotaService,
  ) {}

  async submitOrder(dto: SubmitOrderTcpRequest): Promise<SubmitOrderTcpResponse> {
    // Move the current submitOrder implementation here without changing behavior.
  }
}
```

Move only submit-specific private helpers from `OrderService`:

```text
resolveOpenBillForSubmit
lockSession
reserveDailyOrderQuota
callSaasCurrentSubscription
buildTenantPlanLimitExceeded
```

If a helper is used outside submit flow, keep it in `OrderService` and pass a narrow dependency instead of duplicating code.

- [ ] **Step 3: Delegate from `OrderService`**

In `OrderService`, inject `OrderSubmitService` and replace the submit method body:

```ts
async submitOrder(dto: SubmitOrderTcpRequest): Promise<SubmitOrderTcpResponse> {
  return this.orderSubmitService.submitOrder(dto);
}
```

- [ ] **Step 4: Register provider**

Add `OrderSubmitService` to `apps/order/src/app/modules/order/order.module.ts` providers.

- [ ] **Step 5: Run order tests**

Run:

```bash
pnpm nx test order --skip-nx-cache
```

Expected:

- Exit code `0`
- Existing order tests still pass
- New `order-submit.service.spec.ts` passes

- [ ] **Step 6: Commit**

```bash
git add apps/order/src/app/modules/order/services/order.service.ts apps/order/src/app/modules/order/services/order-submit.service.ts apps/order/src/app/modules/order/order.module.ts apps/order/src/app/modules/order/tests/order.service.spec.ts apps/order/src/app/modules/order/tests/order-submit.service.spec.ts
git commit -m "refactor: extract order submit workflow"
```

---

### Task 7: Split Order State Transition And KDS Mapping

**Purpose:** Extract confirm/cancel/serve/KDS mapping logic from `OrderService` after submit flow is stable.

**Files:**

- Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-state-transition.service.ts`
- Create: `apps/order/src/app/modules/order/services/order-kds-event.service.ts`
- Modify: `apps/order/src/app/modules/order/order.module.ts`
- Modify: `apps/order/src/app/modules/order/tests/order.service.spec.ts`
- Create: `apps/order/src/app/modules/order/tests/order-state-transition.service.spec.ts`
- Create: `apps/order/src/app/modules/order/tests/order-kds-event.service.spec.ts`

- [ ] **Step 1: Extract pure KDS mapping tests**

Create tests for:

```text
toKdsActiveOrderSnapshot returns confirmed order snapshot
toKdsActiveOrderSnapshot rejects unconfirmed orders
buildKitchenItemReadyEvent includes tenantId, sessionId, orderId, itemId, and server timestamp
assertKdsStationTargets rejects item ids outside the requested station
```

Run:

```bash
pnpm nx test order --testFile=apps/order/src/app/modules/order/tests/order-kds-event.service.spec.ts --skip-nx-cache
```

Expected:

- Fails until `OrderKdsEventService` exists.

- [ ] **Step 2: Create `OrderKdsEventService`**

Move only mapping/validation helpers:

```text
toKdsActiveOrderSnapshot
assertKdsStationTargets
noKitchenProcessingItemsRemaining
hasKitchenProcessingItems
buildKitchenItemReadyEvent
```

The service should not inject repositories.

- [ ] **Step 3: Extract state transition tests**

Create tests for:

```text
confirmOrder deducts stock and records order.confirmed outbox
cancelPendingStaff cancels pending order without stock release
cancelProcessing releases stock and records cancel outbox
markOrderServed marks ready order as served
markOrderItemsReady emits kitchen item ready events
revertOrderItemsProcessing validates station scope
```

- [ ] **Step 4: Create `OrderStateTransitionService`**

Move these methods from `OrderService`:

```text
confirmOrder
customerCancelPending
cancelPendingStaff
cancelProcessing
markOrderServed
markOrderItemsReady
revertOrderItemsProcessing
```

Keep TCP-facing method names in `OrderService` as delegators until controller changes are explicitly planned.

- [ ] **Step 5: Run order tests**

Run:

```bash
pnpm nx test order --skip-nx-cache
pnpm nx lint order --skip-nx-cache
```

Expected:

- Both commands exit `0`
- `order.service.ts` is smaller and mostly orchestration/delegation

- [ ] **Step 6: Commit**

```bash
git add apps/order/src/app/modules/order/services apps/order/src/app/modules/order/order.module.ts apps/order/src/app/modules/order/tests
git commit -m "refactor: extract order state transitions"
```

---

### Task 8: Split KDS Redis Repository By Responsibility

**Purpose:** Reduce `KdsRedisRepository` size while preserving Redis data model, idempotency, SLA, and recovery behavior.

**Files:**

- Modify: `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts`
- Create: `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- Create: `apps/kitchen/src/app/modules/kitchen/repositories/kds-sla-store.repository.ts`
- Create: `apps/kitchen/src/app/modules/kitchen/repositories/kds-recovery-store.repository.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/kitchen.module.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/tests/kds-ticket.service.spec.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/tests/kitchen-sla.worker.spec.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/tests/kitchen-recovery.service.spec.ts`
- Modify: `apps/kitchen/src/app/modules/kitchen/tests/order-confirmed.consumer.spec.ts`

- [ ] **Step 1: Keep key utilities unchanged**

Do not change `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts` in this task. It already has local KDS-specific Redis builders.

- [ ] **Step 2: Extract ticket store**

Move ticket CRUD and queue mutation methods into `KdsTicketStoreRepository`:

```text
getQueueSnapshot
createTicketsFromConfirmedOrder
startTicket
markReady
recallTicket
setPriority
voidByOrder
patchTableSnapshot
getStationRevision
```

The original `KdsRedisRepository` delegates to this store.

- [ ] **Step 3: Extract SLA store**

Move SLA/dedupe methods into `KdsSlaStoreRepository`:

```text
claimDueSla
acquireSlaClaim
releaseSlaClaim
trySetSlaDedupe
removeSlaDueMember
updateTicketLastWarningLevel
findTicketForSla
```

- [ ] **Step 4: Extract recovery store**

Move recovery methods into `KdsRecoveryStoreRepository`:

```text
rebuildMissingTicketsFromSnapshots
tryAcquireRebuildLock
releaseRebuildLockIfHeld
```

- [ ] **Step 5: Register repositories**

Update `KitchenModule` providers so all new repositories are injectable.

- [ ] **Step 6: Run kitchen tests**

Run:

```bash
pnpm nx test kitchen --skip-nx-cache
pnpm nx lint kitchen --skip-nx-cache
```

Expected:

- Both commands exit `0`
- KDS idempotency tests still pass
- SLA tests still pass
- Recovery tests still pass

- [ ] **Step 7: Commit**

```bash
git add apps/kitchen/src/app/modules/kitchen/repositories apps/kitchen/src/app/modules/kitchen/kitchen.module.ts apps/kitchen/src/app/modules/kitchen/tests
git commit -m "refactor: split kds redis repository"
```

---

### Task 9: Align VND Rounding At Order, Bill, And Payment Boundaries

**Purpose:** Make VND rounding explicit and consistent before payment settlement.

**Files:**

- Modify: `apps/order/src/app/modules/order/services/order-submit.service.ts`
- Modify: `apps/order/src/app/modules/order/utils/recalculate-bill-totals.ts`
- Modify: `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- Modify: `apps/order/src/app/modules/order/tests/vnd-rounding.util.spec.ts`
- Modify: `apps/order/src/app/modules/order/tests/order-submit.service.spec.ts`
- Modify: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`

- [ ] **Step 1: Decide canonical behavior**

Use this rule:

```text
Order line and order subtotal can preserve raw integer VND.
Bill total paid by customer must use buildVndRoundingSnapshot.
Payment settlement must validate bill subtotal, total, and roundingAmount before accepting paid amount.
```

- [ ] **Step 2: Add tests for bill/payment boundary**

Add tests proving:

```text
raw bill subtotal 127500 rounds to total 128000
payment rejects inconsistent rounding snapshot
payment accepts exact rounded total
payment rejects transfer amount below rounded total
```

- [ ] **Step 3: Keep order submit total behavior explicit**

If `Order.totalAmount` remains raw item sum, add a short test name and assertion that documents this:

```ts
it('stores raw order item sum and leaves customer payable rounding to bill totals', async () => {
  // order.totalAmount equals sum(unitPrice * quantity)
  // bill.total equals rounded payable total after recalculateBillTotals
});
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm nx test order --skip-nx-cache
pnpm nx test payment --skip-nx-cache
```

Expected:

- Both commands exit `0`

- [ ] **Step 5: Commit**

```bash
git add apps/order/src/app/modules/order apps/payment/src/app/modules/payment
git commit -m "test: lock vnd rounding boundaries"
```

---

### Task 10: Clean Frontend Lint And Build Warnings

**Purpose:** Reduce frontend warning noise so CI output is useful.

**Files:**

- Modify: `apps/management-app/src/components/pos/kpi-tiles.tsx`
- Modify: `apps/management-app/src/components/pos/live-orders-table.tsx`
- Modify: `apps/management-app/src/components/pos/service-request-table.tsx`
- Modify: `apps/management-app/src/features/menu/components/categories-table.tsx`
- Modify: `apps/management-app/src/features/menu/components/menu-items-table.tsx`
- Modify: `apps/management-app/src/features/tables/components/tables-table.tsx`
- Modify image warnings only where the image is not an external/decorative exception.
- Modify chart containers that emit Recharts `width(-1)` / `height(-1)` during build.

- [ ] **Step 1: Fix unstable hook dependencies**

For each warning like:

```ts
const liveOrders = data?.liveOrders ?? [];
```

move fallback creation inside `useMemo`, or use module-level stable constants:

```ts
const EMPTY_ORDERS: LiveOrder[] = [];
const liveOrders = data?.liveOrders ?? EMPTY_ORDERS;
```

- [ ] **Step 2: Handle TanStack Table compiler warnings**

For components using `useReactTable`, choose one local pattern and document it in comments only where needed:

```ts
'use no memo';
```

Use this only in components where React Compiler warns about TanStack Table. Do not apply it globally.

- [ ] **Step 3: Fix image warnings**

For `img` warnings:

- Add meaningful `alt` if the image conveys content.
- Use empty `alt=""` if decorative.
- Use `next/image` for local/static assets where dimensions are known.

- [ ] **Step 4: Fix chart sizing**

Ensure chart wrappers have stable dimensions:

```tsx
<div className="min-h-[240px] min-w-0">
  <ResponsiveContainer width="100%" height={240}>
    ...
  </ResponsiveContainer>
</div>
```

- [ ] **Step 5: Run frontend lint/build**

Run:

```bash
pnpm nx lint management-app --skip-nx-cache
pnpm nx build management-app --skip-nx-cache
```

Expected:

- Both commands exit `0`
- Recharts `width(-1)` / `height(-1)` warning no longer appears in build output

- [ ] **Step 6: Commit**

```bash
git add apps/management-app/src
git commit -m "fix: clean management app lint warnings"
```

---

### Task 11: Final Quality Gate

**Purpose:** Confirm the refactor roadmap improved quality without regressions.

**Files:**

- Modify: `docs/superpowers/plans/2026-05-22-qrtable-refactor-roadmap.md` only if actual execution results need to be recorded.

- [ ] **Step 1: Run lint**

Run:

```bash
pnpm nx run-many -t lint --all --parallel=4 --skip-nx-cache --output-style=static
```

Expected:

- Exit code `0`
- Warning count lower than baseline `68`

- [ ] **Step 2: Run tests**

Run:

```bash
pnpm nx run-many -t test --all --parallel=4 --skip-nx-cache --output-style=static
```

Expected:

- Exit code `0`
- Runtime-dependent integration suites are skipped unless explicitly enabled

- [ ] **Step 3: Run build**

Run:

```bash
pnpm nx run-many -t build --all --parallel=4 --skip-nx-cache --output-style=static
```

Expected:

- Exit code `0`
- No Recharts `width(-1)` / `height(-1)` warning

- [ ] **Step 4: Run anti-pattern scans**

Run:

```bash
rg -n "process\\.env" apps libs -g "*.ts" -g "*.tsx" -g "!**/*.spec.ts" -g "!**/configuration/**" -g "!libs/configuration/**" -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/.next/**"
rg -n "console\\.log" apps libs -g "*.ts" -g "*.tsx" -g "!**/*.spec.ts" -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/.next/**"
rg -n "`tenant:\\$\\{|`session:\\$\\{|`menu:\\$\\{|`cart:\\$\\{|`quota:\\$\\{" apps libs -g "*.ts" -g "*.tsx" -g "!**/*.spec.ts" -g "!**/node_modules/**" -g "!**/dist/**" -g "!**/.next/**"
```

Expected:

- No production `process.env` matches outside configuration
- No production `console.log`
- No new hardcoded shared Redis key or WebSocket room builders outside tests and local KDS-specific key utility

- [x] **Step 5: Record final result**

## Execution Summary

- Lint: `pnpm nx run-many -t lint --all --parallel=4 --skip-nx-cache --output-style=static` exited `0` for `31` projects. ESLint reported `47` warnings, below baseline `68`.
- Tests: `pnpm nx run-many -t test --all --parallel=4 --skip-nx-cache --output-style=static` exited `0` for `23` projects. Runtime-dependent suites stayed gated: `frontend-utils` skipped `6` suites / `36` tests, `order` skipped `5` suites / `13` tests, and `saas` skipped `1` suite / `3` tests.
- Build: `pnpm nx run-many -t build --all --parallel=4 --skip-nx-cache --output-style=static` exited `0` for `17` projects. No Recharts `width(-1)` / `height(-1)` warning appeared.
- Anti-pattern scans: production `console.log` scan exited `1` with no matches; hardcoded shared key/room scan exited `0` with matches limited to shared constants/builders in `libs/constants/src/lib/saas.constants.ts`, `redis-key.constants.ts`, and `ws-room.constants.ts`; `process.env` scan exited `0` with remaining matches in service bootstrap files, Cloudinary config fallback, frontend integration test helpers, and management-app auth/API/client config paths.
- Remaining debt: non-blocking ESLint warnings remain from existing `any` / non-null assertions in tests/shared utilities. Build output still includes environment/tooling noise: `NO_COLOR` ignored because `FORCE_COLOR` is set, Nx `MaxListenersExceededWarning`, and Next.js `middleware` deprecation for management-app.

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/2026-05-22-qrtable-refactor-roadmap.md
git commit -m "docs: record refactor roadmap verification"
```

---

## Risk Register

- TypeORM provider changes can break app bootstrap if an entity is missing from a service list.
  - Mitigation: build and test each service immediately after Task 2.

- Moving `OrderService` helpers can accidentally change transaction boundaries.
  - Mitigation: move submit flow first, keep public `OrderService` methods as delegators, run existing order tests after each extraction.

- Splitting KDS Redis repository can change idempotency behavior.
  - Mitigation: keep `kds-keys.ts` unchanged in Task 8 and run KDS idempotency/SLA/recovery tests.

- Config cleanup can change deployment defaults.
  - Mitigation: preserve current defaults in configuration classes before replacing `process.env` reads.

- Frontend table warning fixes can affect table behavior.
  - Mitigation: run management app lint, build, and existing component tests.

---

## Acceptance Criteria

This roadmap is complete when:

- `pnpm nx run-many -t lint --all --parallel=4 --skip-nx-cache --output-style=static` exits `0`.
- ESLint warning count is lower than the baseline `68`.
- `pnpm nx run-many -t test --all --parallel=4 --skip-nx-cache --output-style=static` exits `0`.
- `pnpm nx run-many -t build --all --parallel=4 --skip-nx-cache --output-style=static` exits `0`.
- No production service/controller/guard reads `process.env` directly.
- No production middleware logs raw request bodies or uses `console.log`.
- TypeORM service entity lists are explicit.
- `OrderService` and `KdsRedisRepository` have been split enough that each file has a clear primary responsibility.
- Redis key and WebSocket room builders are used for shared BFF/order/cache patterns.
- VND rounding behavior is covered by tests at bill/payment boundaries.

---

## Self-Review

Spec coverage:

- The audit blockers are covered by Tasks 1, 2, 3, and 4.
- The large-module refactor is covered by Tasks 6, 7, and 8.
- Shared Redis/WS patterns are covered by Task 5.
- VND rounding is covered by Task 9.
- Frontend warning cleanup is covered by Task 10.
- Final verification is covered by Task 11.

Placeholder scan:

- This plan contains no placeholder markers.
- Each task has concrete file targets and commands.
- Each implementation task includes expected verification output.

Type consistency:

- Existing aliases are preserved as `@common/*` and `@einvoice/*`.
- The plan does not introduce `@qrtable/*` alias migration as an implementation dependency.
- The TypeORM factory naming is consistently `createTypeOrmProvider`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-22-qrtable-refactor-roadmap.md`.

Two execution options:

1. Subagent-Driven (recommended): dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution: execute tasks in this session using executing-plans, batch execution with checkpoints.
