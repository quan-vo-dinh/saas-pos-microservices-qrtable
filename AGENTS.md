# AGENTS.md — QRTable Engineering Standards

> Tài liệu này là hướng dẫn bắt buộc cho mọi AI agent làm việc trong codebase QRTable.
> Đọc toàn bộ file này trước khi viết bất kỳ dòng code nào.

## NOTE: Technical English Collaboration

English support is secondary. The main priority is still solving software engineering tasks correctly.

Because I am a Vietnamese developer, my English questions, task descriptions, or discussion messages may sometimes be incomplete, unnatural, ambiguous, or not precise enough.

Use this section only when I communicate in English or when the output itself is expected to be written in English. If I communicate in Vietnamese, respond mainly in Vietnamese and keep important technical terms in English.

### General Rules

- Do not act as a strict English tutor during normal engineering work.
- Do not interrupt coding tasks just to teach English.
- Focus on understanding my intended technical meaning first.
- Keep important technical terms in English, such as service boundary, DTO, guard, interceptor, idempotency, tenant isolation, event-driven, cache invalidation, eventual consistency, API contract, state machine, and service boundary.
- Only explain English corrections when they are useful for clarity, professionalism, technical accuracy, documentation, interview answers, or workplace communication.

### When I Write in English

If my meaning is clear:

- Rewrite my sentence into more natural, practical English before answering.
- You may fully rewrite/refactor the sentence, not just fix small grammar issues.
- Preserve the original meaning.
- Prefer wording that sounds natural in real technical discussions, workplace communication, documentation, or interviews.
- After the rewritten sentence, answer the technical question.

If my sentence is understandable but unnatural:

- Provide a better version that a developer would actually use.
- Keep it concise and realistic.
- Do not over-explain small grammar details unless they affect clarity.

If my sentence may cause technical misunderstanding:

- Point out the ambiguity.
- Ask a clarification question before making code changes.
- If there are multiple possible interpretations, list the likely interpretations and ask me to confirm the intended one.

Do not guess silently when ambiguity affects:

- architecture
- data model
- API contract
- authentication
- authorization
- tenant isolation
- payment flow
- Kafka events
- Redis behavior
- database changes
- state transitions
- external integrations

If the ambiguity is minor and does not affect implementation correctness:

- Make a reasonable assumption.
- State the assumption briefly.
- Continue with the technical answer or implementation.

---

## 1. Project Overview

**QRTable** là một SaaS POS platform cho ngành F&B, multi-tenant, triển khai theo kiến trúc **Event-Driven Microservices** trong một **Nx Monorepo**.

| Aspect     | Decision                                                               |
| ---------- | ---------------------------------------------------------------------- |
| Monorepo   | Nx — tất cả apps và libs trong 1 repo                                  |
| Backend    | NestJS + TypeScript — 8 microservices                                  |
| Frontend   | Next.js (Management App) + React/Vite (Customer PWA)                   |
| Database   | PostgreSQL + TypeORM (per-service) · MongoDB + Mongoose (user-access)  |
| Cache      | Redis — session store, menu cache, KDS queue (Sorted Set), rate limit  |
| Events     | Apache Kafka — async inter-service communication                       |
| Auth       | Keycloak (JWT/OIDC) cho staff/owner/admin · Session Redis cho customer |
| Real-time  | Socket.io (NestJS Gateway)                                             |
| Payment    | SePay (VietQR)                                                         |
| Monitoring | Grafana + Loki + Promtail + Prometheus + Tempo                         |

---

## 2. Service Boundaries

Mỗi service có domain riêng và **không được truy cập database của service khác**.

```

BFF (port 3000) → API Gateway: HTTP + WebSocket. Guard chain. Proxy. KHÔNG có business logic.
Authorizer → gRPC server: verify JWT (Keycloak). Keycloak Admin API.
Catalog → TCP: Menu, Category, Table, Area, QR token. DỊCH VỤ DUY NHẤT ghi stock.
Order → TCP: Order state machine, cart/session. Gọi Catalog TCP để trừ stock.
Kitchen → TCP + Kafka consumer: KDS queue (Redis Sorted Set only). KHÔNG có database.
Payment → TCP + Webhook: SePay/VietQR, cash. Outbox events. DB: qrtable_payment.
SaaS → TCP: Tenant lifecycle, subscription, pricing plan. DB: qrtable_saas.
User-Access → TCP: User profile, roles, staff. DB: qrtable_auth (MongoDB).

```

**Giao tiếp inter-service:**

- Sync → TCP call qua `@qrtable/providers`
- Async side-effects → Kafka event qua `@qrtable/queue`
- Auth check → gRPC tới Authorizer (đã được wrap trong Guards)
- ❌ TUYỆT ĐỐI KHÔNG import entity/repository của service khác trực tiếp

---

## 3. Shared Libraries — Không được định nghĩa lại

> **Quy tắc số 1:** Trước khi định nghĩa bất cứ thứ gì, kiểm tra bảng này.
> Nếu đã có trong `libs/` → **IMPORT**, không tạo lại.

### Backend Shared

| Path                  | Import alias             | Chứa gì                                       |
| --------------------- | ------------------------ | --------------------------------------------- |
| `libs/configuration/` | `@qrtable/configuration` | ConfigModule, typed AppConfig, env validation |
| `libs/constants/`     | `@qrtable/constants`     | Kafka topics, enums, domain constants         |
| `libs/schemas/`       | `@qrtable/schemas`       | TypeORM entities, Mongoose schemas            |
| `libs/dtos/`          | `@qrtable/dtos`          | Validated DTOs (request/response)             |
| `libs/guards/`        | `@qrtable/guards`        | UserGuard, TenantGuard, SessionGuard          |
| `libs/interceptors/`  | `@qrtable/interceptors`  | Exception filter, Logging, TCP logging        |
| `libs/middlewares/`   | `@qrtable/middlewares`   | Logger middleware, Tenant injection           |
| `libs/providers/`     | `@qrtable/providers`     | TCP, gRPC, Mongo, Postgres, Redis providers   |
| `libs/queue/`         | `@qrtable/queue`         | Kafka producer/consumer modules               |
| `libs/common/`        | `@qrtable/common`        | Utilities, decorators, shared helpers         |

### Cross-Platform & Frontend

| Path                   | Import alias     | Chứa gì                                       |
| ---------------------- | ---------------- | --------------------------------------------- |
| `libs/shared/types/`   | `@qrtable/types` | TypeScript interfaces, DTOs (FE + BE)         |
| `libs/shared/utils/`   | `@qrtable/utils` | Pure functions, formatters (incl. `roundVnd`) |
| `libs/frontend/ui/`    | `@qrtable/ui`    | Shadcn-based UI components                    |
| `libs/frontend/hooks/` | `@qrtable/hooks` | React Query hooks, WebSocket hooks            |

---

## 4. Forbidden Patterns — Không bao giờ làm

```

❌ process.env.XYZ trong business logic
→ Dùng ConfigService từ @qrtable/configuration

❌ Định nghĩa lại thứ đã có trong libs/
→ Import từ @qrtable/\* tương ứng

❌ Kafka topic string hardcode cục bộ
→ Import KafkaTopic từ @qrtable/constants

❌ Redis key tạo tùy tiện inline (key = `menu_${id}`)
→ Dùng RedisKey builder từ @qrtable/common

❌ WebSocket room string tạo tùy tiện
→ Dùng WsRoom builder từ @qrtable/common

❌ Cross-service truy cập DB trực tiếp
→ Giao tiếp qua TCP hoặc Kafka event

❌ Controller chứa business logic
→ Delegate toàn bộ sang service

❌ Service nhận HttpRequest / HttpResponse
→ Guards và interceptors xử lý cross-cutting concern

❌ Timestamp từ client dùng cho nghiệp vụ
→ Luôn dùng Date.now() hoặc new Date() — server UTC

❌ Magic number hoặc magic string inline
→ Đặt tên và khai báo trong constants/

❌ any type không có lý do
→ Dùng generic hoặc unknown + type guard

❌ Copy-paste logic xuất hiện 3+ lần
→ Extract thành utility trong @qrtable/common hoặc local util/

❌ console.log trong production code
→ NestJS Logger với context (Logger.log / .warn / .error)

❌ Code đã comment out còn tồn tại
→ Xóa đi — git history lưu giữ rồi

```

---

## 5. QRTable Conventions — Bắt buộc tuân theo

### VND Rounding (Principle #9)

Mọi số tiền VND phải được làm tròn lên đến nghìn đồng.

```typescript
// ❌
const total = price * qty;

// ✅
import { roundVnd } from '@qrtable/utils';
const total = roundVnd(price * qty);
// roundVnd = (amount: number) => Math.ceil(amount / 1000) * 1000
```

### Tenant Isolation (Principle #2)

```typescript
// Mọi entity có phạm vi tenant PHẢI có tenant_id
// TypeORM Subscriber trong @qrtable/schemas tự inject — không set thủ công trong service

// TenantGuard inject tenantId vào RequestContext
// Global Query Filter tự append WHERE tenant_id = :tid
// Service chỉ việc nhận tenantId từ context và truyền vào repository

// ❌ Không skip tenant_id filter kể cả query "nội bộ"
// ❌ Không set tenant_id thủ công trong service
```

### Redis Key Pattern

```typescript
// Pattern: {entity}:{tenant_id}:{resource_id}
// ❌ key = `menu_${tenantId}_cat_${catId}`
// ✅ RedisKey.menu.category(tenantId, catId)

// Nếu RedisKey builder chưa có trong @qrtable/common → tạo ở đó, không tạo local
export const RedisKey = {
  menu: {
    categories: (tid: string) => `menu:${tid}:categories`,
    item: (tid: string, id: string) => `menu:${tid}:item:${id}`,
  },
  session: {
    data: (tid: string, sid: string) => `session:${tid}:${sid}`,
  },
  token: {
    user: (uid: string) => `token:user:${uid}`,
  },
} as const;
```

### Kafka Topic Naming

```typescript
// Pattern: {domain}.{event} — không per-tenant, không per-instance
// Tất cả topics phải đến từ @qrtable/constants
import { KafkaTopic } from '@qrtable/constants';
// KafkaTopic.ORDER_CREATED      → 'order.created'
// KafkaTopic.ORDER_CONFIRMED    → 'order.confirmed'
// KafkaTopic.PAYMENT_COMPLETED  → 'payment.completed'
// KafkaTopic.KITCHEN_SLA_WARN   → 'kitchen.sla_warning'
```

### WebSocket Room Naming

```typescript
// Pattern: tenant:{id}:{role_group}
import { WsRoom } from '@qrtable/common';
socket.join(WsRoom.staff(tenantId)); // tenant:{tid}:staff
socket.join(WsRoom.kds(tenantId, 'kitchen')); // tenant:{tid}:kds:kitchen
socket.join(WsRoom.customer(sessionId)); // session:{sid}:customer
```

### Idempotency Keys

```typescript
// Mọi write operation ảnh hưởng external state (order, payment) cần idempotency key
// Pattern: {domain}:{operation}:{actor_id}:{content_hash}
const key = `order:submit:${sessionId}:${hashOrderItems(items)}`;
```

---

## 6. Code Quality Standards

### Naming Conventions

| Đối tượng                | Convention        | Ví dụ                            |
| ------------------------ | ----------------- | -------------------------------- |
| Variable / function      | camelCase         | `getUserById`, `isActive`        |
| Class / Interface / Type | PascalCase        | `OrderService`, `CreateOrderDto` |
| Hằng số module-level     | UPPER_SNAKE       | `MAX_RETRY_COUNT`                |
| Enum member              | PascalCase        | `OrderStatus.Confirmed`          |
| File                     | kebab-case        | `order-item.service.ts`          |
| DB column                | snake_case        | `tenant_id`, `created_at`        |
| Boolean                  | is/has/can prefix | `isActive`, `hasPermission`      |

**Quy tắc nhất quán:** Chọn một động từ cho một ý định và dùng xuyên suốt.

- Lấy từ DB → `find`
- Gọi HTTP → `fetch`_ hoặc `get`_
- Tạo entity → `create`\*
- Không trộn `get/fetch/load/retrieve` cho cùng một loại thao tác.

### Single Responsibility

```
Controller  → routing + delegate. Không có business logic, không gọi DB trực tiếp.
Service     → business logic. Không có HTTP context (req/res).
Repository  → data access. Không có business rules.
Guard       → auth + authorization. Không có domain logic.
```

Một service file quá 400 dòng → xem xét tách.
Một function quá 25 dòng → xem xét decompose.

### Error Handling

```typescript
// ❌ Silent catch
try {
  await send();
} catch (_) {}

// ❌ Raw Error trong NestJS
throw new Error('not found');

// ✅ Typed NestJS exception
throw new NotFoundException(`Order #${id} not found`);
throw new ConflictException(`Session ${sid} already exists`);

// ✅ Global exception filter trong @qrtable/interceptors xử lý unexpected errors
```

### Type Safety

```typescript
// ❌ any
function parse(data: any): any {}

// ✅ Generic hoặc unknown + type guard
function parse<T>(data: unknown): T {
  if (!isValidShape<T>(data)) throw new BadRequestException('Invalid shape');
  return data;
}
```

### Config Access

```typescript
// ❌ Bất cứ đâu trong business logic
process.env.TYPEORM_HOST
process.env.KAFKA_BROKER

// ✅ ConfigService từ @qrtable/configuration (isGlobal: true — inject trực tiếp)
constructor(private readonly config: ConfigService<AppConfig>) {}
this.config.get('TYPEORM_HOST', { infer: true });
```

---

## 7. Working Protocol — Cách làm việc

### Khi bắt đầu session với code hiện tại

**Bước 1 — Read the Room:** Đọc code được cung cấp và extract conventions đang được dùng thực tế:

```
Observed in [service]:
├── DTO location: local dto/ | @qrtable/dtos
├── Constants: local | @qrtable/constants
├── Repository: tách file | inline trong service
└── Naming: [pattern đang dùng]
→ Tôi sẽ follow patterns này. Deviation sẽ được giải thích rõ.
```

**Bước 2 — Quick Quality Scan** (compact, không block task):

```
🔴 Blockers: [vấn đề bảo mật / data isolation / broken contract] → fix ngay
⚠️ Debt Flags: [code bẩn nhưng không critical] → flag, clean khi touch
✅ Solid: [những gì đang ổn]
```

**Bước 3 — Improve as you touch:**

- Sửa một function → để nó sạch hơn lúc ban đầu khi rời đi
- Thêm code gần vùng bẩn → refactor vùng đó nếu nhỏ (< 20 dòng)
- Tạo file mới → luôn viết clean từ đầu, bất kể code xung quanh thế nào

### Khi thêm feature hoặc fix bug

Trước khi viết code, làm placement check:

1. Pattern tương tự đã có trong service này chưa? → Có: follow y chang. Không: hỏi.
2. Folder đích đã tồn tại chưa? → Có: đặt vào, match tên sibling. Không: tạo folder chỉ khi 3+ file sẽ ở đó.
3. Code này có cần vào `libs/` không? → Chỉ khi 2+ service/app sẽ dùng.

### Khi refactor

Scope là thứ đang được yêu cầu refactor, không phải toàn bộ codebase:

```
❌ "Tôi sẽ refactor toàn service trước khi bắt đầu"
❌ "File này vi phạm 12 tiêu chuẩn, tôi sẽ không tiếp tục cho đến khi fix hết"
❌ Copy lại pattern bẩn vì xung quanh cũng đang làm vậy
✅ Clean chỗ đang touch, flag chỗ không touch, giữ PR nhỏ gọn
```

---

## 8. Pre-Output Checklist

Trước khi finalize bất kỳ output nào, tự hỏi:

- Không có `process.env.*` trong business logic?
- Không có định nghĩa lại thứ đã có trong `libs/`?
- Kafka topics đến từ `@qrtable/constants`?
- Redis keys dùng builder pattern?
- WebSocket rooms dùng builder pattern?
- Cross-service communication qua TCP hoặc Kafka (không phải direct import)?
- VND amounts đi qua `roundVnd()`?
- Timestamps là server-side (`Date.now()` / `new Date()`)?
- Mọi tenant-scoped entity có `tenant_id` (auto-inject qua Subscriber)?
- Write operations có idempotency key?
- Không có `any` type không có lý do?
- Không có magic numbers/strings inline?

---

## 9. Code Quality Report

Append vào cuối mọi output có code:

```
---
## 🔍 Code Quality Report

### ✅ Applied
- [những gì đã làm đúng chuẩn trong output này]

### ⚠️ Debt Flags (non-blocking — cải thiện khi touch lại)
- FLAG001 [TAG] mô tả → hướng fix

### 🔴 Blockers (đã fix trong output hoặc PHẢI fix trước khi merge)
- BLOCK001 [TAG] mô tả → action cần làm

### 💡 Suggestions
- [đề xuất cải thiện không urgent]
```

**Tags:**
`[ENV_LEAK]` `[REDEFINE]` `[CROSS_DB]` `[TENANT_LEAK]` `[MAGIC_VAL]`
`[ANY_TYPE]` `[SRP]` `[PATTERN]` `[STRUCT]` `[NO_IDEMPOTENCY]`

---

_Cập nhật file này khi có thay đổi kiến trúc hoặc convention mới được thống nhất trong team._

Cách dùng kỹ năng:

- Gọi: `npx openskills read <skill-name>` (chạy trong shell)
  - Nhiều skill: `npx openskills read skill-one,skill-two`
- Nội dung skill sẽ tải kèm hướng dẫn chi tiết để hoàn thành tác vụ
- Thư mục gốc trong output dùng để resolve tài nguyên đính kèm (references/, scripts/, assets/)

Lưu ý:

- Chỉ dùng các skill liệt kê trong bên dưới
- Không gọi lại skill đã có trong ngữ cảnh hiện tại
- Mỗi lần gọi skill là độc lập (stateless)

brainstormingSocratic questioning protocol + user communication. MANDATORY for complex requests, new features, or unclear requirements. Includes progress reporting and error handling.project

clean-codePragmatic coding standards - concise, direct, no over-engineering, no unnecessary commentsproject

code-review-checklistCode review guidelines covering code quality, security, and best practices.project

database-designDatabase design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.project

deployment-proceduresProduction deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.project

documentation-templatesDocumentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.project

frontend-designDesign thinking and decision-making for web UI. Use when designing components, layouts, color schemes, typography, or creating aesthetic interfaces. Teaches principles, not fixed values.project

frontend-patternsFrontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.project

game-developmentGame development orchestrator. Routes to platform-specific skills based on project needs.project

geo-fundamentalsGenerative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).project

i18n-localizationInternationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.project

intelligent-routingAutomatic agent selection and intelligent task routing. Analyzes user requests and automatically selects the best specialist agent(s) without requiring explicit user mentions.project

lint-and-validateAutomatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, validate, types, static analysis.project

mcp-builderMCP (Model Context Protocol) server building principles. Tool design, resource patterns, best practices.project

mobile-designMobile-first design thinking and decision-making for iOS and Android apps. Touch interaction, performance patterns, platform conventions. Teaches principles, not fixed values. Use when building React Native, Flutter, or native mobile apps.project

nextjs-react-expertReact and Next.js performance optimization from Vercel Engineering. Use when building React components, optimizing performance, eliminating waterfalls, reducing bundle size, reviewing code for performance issues, or implementing server/client-side optimizations.project

nodejs-best-practicesNode.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.project

parallel-agentsMulti-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.project

performance-profilingPerformance profiling principles. Measurement, analysis, and optimization techniques.project

plan-writingStructured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.project

shadcnManages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".project

shadcn-component-discoveryDiscover existing shadcn components from registries before building custom. Use PROACTIVELY when about to build any UI component, page section, or layout. Use when user explicitly asks to find/search components. Searches 1,500+ components across official and community registries including @shadcn, @blocks, @reui, @animate-ui, @diceui, Magic UI, and 30+ specialty registries. Provides install commands and code examples. Works best with shadcn MCP configured, but provides manual guidance without it.project

shadcn-component-reviewReview custom components and layouts against shadcn design patterns, theme styles (Maia, Vega, Lyra, Nova, Mira), component structure, composability, and Radix UI best practices. Use when planning new components, reviewing existing components, auditing spacing, checking component structure, or verifying shadcn best practices alignment.project

systematic-debugging4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.project

tailwind-patternsTailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.project

dispatching-parallel-agentsUse when facing 2+ independent tasks that can be worked on without shared state or sequential dependenciesglobal

executing-plansUse when you have a written implementation plan to execute in a separate session with review checkpointsglobal

finishing-a-development-branchUse when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanupglobal

receiving-code-reviewUse when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementationglobal

requesting-code-reviewUse when completing tasks, implementing major features, or before merging to verify work meets requirementsglobal

subagent-driven-developmentUse when executing implementation plans with independent tasks in the current sessionglobal

test-driven-developmentUse when implementing any feature or bugfix, before writing implementation codeglobal

using-git-worktreesUse when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verificationglobal

using-superpowersUse when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questionsglobal

verification-before-completionUse when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions alwaysglobal

writing-plansUse when you have a spec or requirements for a multi-step task, before touching codeglobal

writing-skillsUse when creating new skills, editing existing skills, or verifying skills work before deploymentglobal
