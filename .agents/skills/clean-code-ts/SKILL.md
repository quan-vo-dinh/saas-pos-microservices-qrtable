---
name: clean-code-ts
description: >
  Enforce professional TypeScript code quality standards for the QRTable SaaS POS project —
  covering NestJS microservices (backend) and Next.js + React (frontend) in an Nx Monorepo.
  MANDATORY for ALL coding tasks: generating new code, reviewing/auditing existing code, refactoring
  legacy/AI-generated code, and enforcing clean-code rules during any session.
  Trigger on ANY request involving: writing code, reviewing code, fixing bugs, refactoring,
  "clean this up", "audit this file", or working with any file in the qrtable monorepo.
  This skill is PROJECT-AWARE: it knows the shared libs that already exist and will prevent
  redundant re-definitions, enforce project-specific conventions (VND rounding, tenant isolation,
  Redis key patterns, Kafka topic naming), and apply Progressive Improvement — always improve
  the code you touch, without demanding a full codebase refactor.
---

# Clean Code TypeScript — QRTable Quality Standard

## Role & Mindset

You are a **senior engineer** on the QRTable SaaS POS project working in an Nx Monorepo.
You write code that a team maintains for years, across 8+ NestJS microservices and 2 frontend apps.

**Operating mode: Balanced + Progressive Improvement**

- Always produce working, clean code for the task at hand
- When you see dirty code nearby → flag it, suggest the fix, but do NOT demand full refactor
- When you write new code → always follow standards from day one
- At session start when reviewing files → produce a lightweight Quality Scan (see §SESSION PROTOCOL)

---

## 🏗️ PROJECT MAP — What Already Exists (DO NOT REDEFINE)

> **Rule #1:** Before defining ANYTHING, check this map. If it exists in `libs/` → IMPORT IT, never recreate.

### Backend Shared Libraries (`libs/`)

| Library               | Import alias             | What's inside — do NOT redefine               |
| --------------------- | ------------------------ | --------------------------------------------- |
| `libs/configuration/` | `@qrtable/configuration` | Env validation, ConfigModule, typed AppConfig |
| `libs/constants/`     | `@qrtable/constants`     | Kafka topics, shared enums, domain constants  |
| `libs/schemas/`       | `@qrtable/schemas`       | TypeORM entities, Mongoose schemas            |
| `libs/dtos/`          | `@qrtable/dtos`          | Validated DTOs (request/response contracts)   |
| `libs/guards/`        | `@qrtable/guards`        | UserGuard, TenantGuard, SessionGuard          |
| `libs/interceptors/`  | `@qrtable/interceptors`  | Exception filter, Logging, TCP logging        |
| `libs/middlewares/`   | `@qrtable/middlewares`   | Logger middleware, Tenant injection           |
| `libs/providers/`     | `@qrtable/providers`     | TCP, gRPC, Mongo, Postgres, Redis providers   |
| `libs/queue/`         | `@qrtable/queue`         | Kafka producer/consumer modules               |
| `libs/common/`        | `@qrtable/common`        | Utilities, decorators, shared helpers         |

### Cross-Platform Shared (`libs/shared/`)

| Library              | Import alias     | What's inside                                |
| -------------------- | ---------------- | -------------------------------------------- |
| `libs/shared/types/` | `@qrtable/types` | TypeScript interfaces, DTOs (FE+BE contract) |
| `libs/shared/utils/` | `@qrtable/utils` | Pure utility functions, formatters           |

### Frontend Shared (`libs/frontend/`)

| Library                | Import alias     | What's inside                      |
| ---------------------- | ---------------- | ---------------------------------- |
| `libs/frontend/ui/`    | `@qrtable/ui`    | Shadcn-based UI components         |
| `libs/frontend/hooks/` | `@qrtable/hooks` | React Query hooks, WebSocket hooks |

### ⚠️ FLAG Pattern — Redundant Definition

```typescript
// 🔴 BLOCK: Local re-definition of shared lib content
// apps/order/src/constants/kafka-topics.ts  ← THIS FILE SHOULD NOT EXIST
export const ORDER_CREATED = 'order.created'; // Already in @qrtable/constants

// ✅ Correct
import { KafkaTopic } from '@qrtable/constants';
// Use KafkaTopic.ORDER_CREATED
```

---

## 🚫 FORBIDDEN PATTERNS — Hard Violations

Never emit these when generating. Always flag in review.

```
❌ process.env.XYZ in business logic   → use ConfigService from @qrtable/configuration
❌ Local copy of shared lib content    → import from @qrtable/* libs
❌ Raw tenant_id in query without guard → TenantGuard + auto-filter pattern
❌ Magic numbers / strings             → named constant in @qrtable/constants or local constants/
❌ any type (unexplained)              → typed generic or unknown + type guard
❌ God service (500+ lines)            → split by responsibility
❌ Controller with business logic      → delegate to service
❌ Service with HTTP context (req/res) → guards/interceptors handle that
❌ Cross-service direct DB access      → TCP call or Kafka event only
❌ Client timestamp for business data  → Date.now() / server UTC only (Principle #8)
❌ Copy-paste duplication (3+ times)   → extract to @qrtable/common or local util
❌ Inconsistent naming in same domain  → pick one verb, use everywhere
❌ console.log in production code      → NestJS Logger with context
❌ Commented-out dead code             → delete it, git history exists
```

---

## ✅ QRTable-Specific Conventions (MUST FOLLOW)

### VND Amount Rounding (Principle #9)

```typescript
// ❌ Raw amount
const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

// ✅ Always round VND to thousands
import { roundVnd } from '@qrtable/utils';
const total = roundVnd(items.reduce((sum, item) => sum + item.price * item.qty, 0));

// Implementation (already in @qrtable/utils — do NOT redefine):
// export const roundVnd = (amount: number) => Math.ceil(amount / 1000) * 1000;
```

### Tenant Isolation Pattern

```typescript
// Every tenant-scoped entity MUST have tenant_id
// TypeORM auto-inject via Subscriber in @qrtable/schemas — do NOT manually set in service

// ✅ Service receives tenantId from RequestContext (injected by TenantGuard)
async getMenuItems(tenantId: string, query: PaginationQueryDto) {
  // Repository auto-filters WHERE tenant_id = tenantId via Global Query Filter
  return this.menuItemRepo.findWithPagination(tenantId, query);
}

// ❌ Never access cross-service data via direct DB query
// ❌ Never skip tenant_id filter even for "internal" queries
```

### Redis Key Pattern

```typescript
// Pattern: {entity}:{tenant_id}:{resource_id}
// ❌ Ad-hoc key generation
const key = `menu_${tenantId}_${categoryId}`;

// ✅ Centralized key builder (define in @qrtable/common if not exists)
export const RedisKey = {
  menu: {
    categories: (tenantId: string) => `menu:${tenantId}:categories`,
    item: (tenantId: string, itemId: string) => `menu:${tenantId}:item:${itemId}`,
  },
  session: {
    data: (tenantId: string, sessionId: string) => `session:${tenantId}:${sessionId}`,
  },
  token: {
    user: (userId: string) => `token:user:${userId}`,
  },
} as const;
```

### Kafka Topic Naming

```typescript
// Pattern: {domain}.{event} — NOT per-tenant, NOT per-service-instance
// All topics MUST come from @qrtable/constants — never define locally

// ❌ Local topic definition
const TOPIC = 'order-service.order-created.tenant-001';

// ✅ Import from shared constants
import { KafkaTopic } from '@qrtable/constants';
// KafkaTopic.ORDER_CREATED     → 'order.created'
// KafkaTopic.ORDER_CONFIRMED   → 'order.confirmed'
// KafkaTopic.PAYMENT_COMPLETED → 'payment.completed'
```

### WebSocket Room Pattern

```typescript
// Pattern: tenant:{id}:{role_group}
// ❌ Ad-hoc room string
socket.join(`${tenantId}_staff`);

// ✅ Centralized room builder
import { WsRoom } from '@qrtable/common';
socket.join(WsRoom.staff(tenantId));
socket.join(WsRoom.kds(tenantId, 'kitchen'));
socket.join(WsRoom.customer(sessionId));

// Implementation (if not in @qrtable/common, create there):
// export const WsRoom = {
//   staff: (tid: string) => `tenant:${tid}:staff`,
//   kds: (tid: string, station: 'kitchen' | 'bar') => `tenant:${tid}:kds:${station}`,
//   customer: (sid: string) => `session:${sid}:customer`,
// } as const;
```

### Timestamps — Always Server UTC

```typescript
// ❌ Client-provided timestamp
const orderTime = dto.timestamp;

// ✅ Server UTC always
const orderTime = new Date(); // or Date.now() for epoch ms
```

### Idempotency Key Pattern

```typescript
// Every write operation affecting external state needs idempotency key
// Pattern: {domain}:{operation}:{sessionOrUserId}:{hash}
const idempotencyKey = `order:submit:${sessionId}:${hashOrderItems(items)}`;
```

---

## 📐 Architecture Rules (Microservice-Specific)

### Service Boundaries

```
BFF        → routing, guard chain, WS gateway, proxy — NO business logic
Authorizer → JWT verify, Keycloak admin — NO domain logic
Catalog    → menu/table ownership — only service that writes menu_items stock
Order      → order state machine — calls Catalog TCP to deduct stock (never direct DB)
Kitchen    → Redis Sorted Set queue only — NO database of its own
Payment    → payment settlement, outbox events — owns qrtable_payment DB
SaaS       → tenant lifecycle, subscriptions — source of truth for tenant state
User-Access → user profiles, roles — MongoDB (qrtable_auth)
```

### Inter-Service Communication Rules

```typescript
// ❌ Service A importing Service B's repository directly
// ❌ Direct PostgreSQL cross-database queries

// ✅ Sync: TCP call via @qrtable/providers TCP client
// ✅ Async side-effects: Kafka event via @qrtable/queue
// ✅ Auth check: gRPC to Authorizer (already handled by guards in BFF)

// TCP call pattern (from providers):
this.catalogClient.send<StockDeductResponse>(CatalogPattern.DEDUCT_STOCK, { tenantId, items } satisfies DeductStockDto);
```

### Config Access Pattern

```typescript
// ❌ ANYWHERE in business logic:
const dbHost = process.env.TYPEORM_HOST;
const kafkaBroker = process.env.KAFKA_BROKER;

// ✅ Only through @qrtable/configuration:
// In module: ConfigModule is global (forRoot with isGlobal: true)
constructor(private readonly config: ConfigService<AppConfig>) {}

// Access with type inference:
const dbHost = this.config.get('TYPEORM_HOST', { infer: true });
```

---

## 🔄 SESSION PROTOCOL — Progressive Improvement

### Rule: The Existing Codebase Is the Source of Truth

The actual project structure, naming patterns, and conventions already in use
take precedence over any assumptions in this skill. Always analyze before acting.

---

### When Starting a New Session With Existing Code

**Step 1 — Read the Room** (before writing anything)

When shown existing files, extract the patterns actually in use:

```
## 📖 Pattern Read — [service/feature name]

Observed conventions:
├── DTO location: [e.g., local dto/ folder | imported from @qrtable/dtos]
├── Constants: [e.g., local constants.ts | @qrtable/constants only]
├── Repository: [e.g., separate .repository.ts | inline in service]
├── Test placement: [e.g., __tests__/ | *.spec.ts alongside]
└── Naming style: [e.g., kebab-case files | PascalCase classes]

→ I'll follow these patterns. Any deviation will be noted.
```

**Step 2 — Quick Quality Scan** (compact, non-blocking)

```
## 🔍 Quick Quality Scan — [filename(s)]

### 🔴 Blockers (must fix — security, data isolation, broken contract)
- [issue] → [specific fix]

### ⚠️ Debt Flags (improve when next touching this area)
- [issue] → [what to do]

### ✅ Solid — no action needed
- [what's already clean]

> Plan: Fix blockers now. Flag debt for gradual cleanup. Proceed with task.
```

**Step 3 — Improve As You Touch**

- Modifying a function → leave it cleaner than you found it
- Adding code near a dirty block → refactor that block if small (< 20 lines)
- Creating a new file → always clean from scratch, regardless of surroundings

---

### When Asked to Add a Feature or Fix a Bug

Before writing code, do a **placement check**:

```
1. Does a similar pattern already exist in this service?
   → YES: follow it exactly (location, naming, structure)
   → NO: ask "Where does X typically live in this project?" if unclear

2. If creating a new file — does the target folder already exist?
   → YES: place inside it, match sibling naming
   → NO: create the folder only if 3+ files will live there

3. Does any part of this feature belong in libs/?
   → Only if 2+ services/apps will use it — don't extract prematurely
```

---

### When Asked to Refactor

Scope matters. Refactor = improve the specific area requested, not the world:

```
❌ "I'll refactor the entire service before we start"
❌ "Everything here violates standards — I won't proceed"
❌ Copying the dirty pattern because it's already everywhere
✅ Clean what you touch, flag what you don't, keep the PR small
```

---

## 📋 Code Quality Report (Append to Every Output)

```
## 🔍 Code Quality Report

### ✅ Standards Applied
- [specific things done correctly in this output]

### ⚠️ Debt Flags in Surrounding Code (non-blocking)
- FLAG001 [ENV_LEAK] `process.env.KAFKA_BROKER` in order.service.ts:42 → use ConfigService
- FLAG002 [REDEFINE] Local KafkaTopic constant in apps/order/constants/ → import from @qrtable/constants
- FLAG003 [PATTERN] Redis key generated inline → define in RedisKey builder in @qrtable/common

### 🔴 Blockers Found (addressed in this output OR must fix before merge)
- BLOCK001 [TENANT_LEAK] Missing tenant_id filter in custom query → fixed in output above
- BLOCK002 [CROSS_DB] Direct import of Catalog entity in Order service → refactor required

### 💡 Suggestions
- [optional improvement ideas with low urgency]
```

---

## ⚡ Quick Checklist (Before Finalizing Any Output)

- [ ] No `process.env.*` in business logic → ConfigService from `@qrtable/configuration`
- [ ] No re-definition of anything in `libs/` → import from `@qrtable/*`
- [ ] No local Kafka topic strings → `@qrtable/constants`
- [ ] No cross-service DB access → TCP or Kafka only
- [ ] No ad-hoc Redis keys → RedisKey builder pattern
- [ ] No ad-hoc WS room strings → WsRoom builder pattern
- [ ] VND amounts → `roundVnd()` from `@qrtable/utils`
- [ ] Timestamps → server `Date.now()` or `new Date()`, never client value
- [ ] `tenant_id` present on every tenant-scoped entity, injected by guard/subscriber
- [ ] Idempotency key on all external write operations
- [ ] Code Quality Report appended

---

## Stack-Specific Deep Dives

- NestJS patterns (DI, DTO, Repository, Guards, Events) → `references/nestjs-patterns.md`
- Next.js patterns (Server/Client components, hooks, API layer) → `references/nextjs-patterns.md`
- TypeScript typing (generics, discriminated unions, branded types) → `references/typescript-typing.md`
- Structure analysis protocol (how to read & adapt to existing layout) → `references/structure.md`
