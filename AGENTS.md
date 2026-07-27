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
- Do not automatically rewrite every English sentence I write. First judge whether the sentence is already correct, natural, and technically clear. Only suggest a rewrite when it meaningfully improves clarity, correctness, professionalism, or technical precision.

### When I Write in English

When I write in English, evaluate my sentence or question first instead of automatically rewriting it.

If my sentence is already grammatically correct, technically clear, and natural enough for real developer communication:

- Tell me that the sentence is already acceptable.
- Do not rewrite it unnecessarily.
- You may optionally suggest a slightly more polished version only if it adds clear value for professionalism, documentation, interviews, or workplace communication.
- Do not change wording just for the sake of producing a “clearer version.”

If my sentence is understandable but unnatural, awkward, or not idiomatic:

- Provide a better version that a developer would actually use.
- Keep the rewrite concise and realistic.
- Preserve the original technical meaning.
- Avoid over-explaining small grammar details unless they affect clarity, professionalism, or technical accuracy.
- After the rewrite, continue answering the technical question.

If my sentence is grammatically okay but could sound too casual, vague, or unprofessional in a work context:

- Briefly say that the sentence is understandable.
- Provide a more professional version only when useful.
- Explain the difference only if it helps me choose the right tone.

If my sentence may cause technical misunderstanding:

- Point out the ambiguity.
- Do not silently rewrite it as if the meaning were certain.
- Ask a clarification question before making code changes or giving implementation advice.
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

| Aspect    | Decision                                                               |
| --------- | ---------------------------------------------------------------------- |
| Monorepo  | Nx — tất cả apps và libs trong 1 repo                                  |
| Backend   | NestJS + TypeScript — 7 microservices                                  |
| Frontend  | Next.js (Management App) + React/Vite (Customer PWA)                   |
| Database  | PostgreSQL + TypeORM (per-service) · MongoDB + Mongoose (user-access)  |
| Cache     | Redis — session store, menu cache, KDS queue (Sorted Set), rate limit  |
| Events    | Apache Kafka — async inter-service communication                       |
| Auth      | Keycloak (JWT/OIDC) cho staff/owner/admin · Session Redis cho customer |
| Real-time | Socket.io (NestJS Gateway)                                             |
| Payment   | SePay (VietQR)                                                         |

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

- Sync → TCP hoặc gRPC qua contract và configuration của service sở hữu, ví dụ `@common/configuration/tcp.config` hoặc `@common/configuration/grpc.config`
- Async side-effects → Kafka event dùng topic từ `@common/constants/kafka-topic.constants`; transport setup theo module/configuration đang tồn tại của service
- Auth check → gRPC tới Authorizer (đã được wrap trong Guards)
- ❌ TUYỆT ĐỐI KHÔNG import entity/repository của service khác trực tiếp

---

## 3. Shared Libraries — Không được định nghĩa lại

> **Quy tắc số 1:** Trước khi định nghĩa bất cứ thứ gì, kiểm tra bảng này.
> Nếu đã có trong `libs/` → **IMPORT**, không tạo lại.

### Backend Shared

Các alias dưới đây là toàn bộ mapping hiện có trong `tsconfig.base.json`. Alias có `/*` bắt buộc dùng subpath cụ thể; không có bare alias tương ứng.

| Path                                   | Import alias                       | Chứa gì                                                                |
| -------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `libs/constants/src/lib/`              | `@common/constants/*`              | Kafka topics, enums, Redis keys, WebSocket rooms, và domain constants. |
| `libs/configuration/src/lib/`          | `@common/configuration/*`          | Shared configuration factories và transport/database providers.        |
| `libs/middlewares/src/lib/`            | `@common/middlewares/*`            | Logger và tenant middleware.                                           |
| `libs/utils/src/lib/`                  | `@common/utils/*`                  | Shared utilities, bao gồm VND rounding.                                |
| `libs/interfaces/src/lib/`             | `@common/interfaces/*`             | Shared request, response, và transport interfaces.                     |
| `libs/interceptors/src/lib/`           | `@common/interceptors/*`           | Exception và logging interceptors.                                     |
| `libs/decorators/src/lib/`             | `@common/decorators/*`             | Shared decorators.                                                     |
| `libs/schemas/src/lib/`                | `@common/schemas/*`                | Mongoose schemas.                                                      |
| `libs/entities/src/lib/`               | `@common/entities/*`               | TypeORM entities.                                                      |
| `libs/guards/src/lib/`                 | `@common/guards/*`                 | Auth, session, tenant, và plan guards.                                 |
| `libs/error-messages/src/lib/`         | `@common/error-messages/*`         | Business exceptions và error codes.                                    |
| `libs/providers/cloudinary/src/lib/`   | `@common/providers/cloudinary/*`   | Cloudinary provider code.                                              |
| `libs/providers/redis-client/src/lib/` | `@common/providers/redis-client/*` | Redis client module and service.                                       |

### Cross-Platform & Frontend

`@einvoice/*` là legacy workspace naming, nhưng vẫn là alias hợp lệ hiện tại và phải được dùng đúng như `tsconfig.base.json` khai báo.

| Path                                 | Import alias                 | Chứa gì                                                              |
| ------------------------------------ | ---------------------------- | -------------------------------------------------------------------- |
| `libs/shared/types/src/index.ts`     | `@einvoice/types`            | Cross-platform TypeScript types.                                     |
| `libs/shared/constants/src/index.ts` | `@einvoice/shared-constants` | `vi-domain-labels` (`*Vi`), SaaS wire types, và query configuration. |
| `libs/frontend/ui/src/index.ts`      | `@einvoice/frontend-ui`      | Shared Shadcn-based UI components.                                   |
| `libs/frontend/hooks/src/index.ts`   | `@einvoice/frontend-hooks`   | Shared React hooks.                                                  |
| `libs/frontend/utils/src/index.ts`   | `@einvoice/frontend-utils`   | Shared frontend utilities.                                           |
| `libs/shared/mock-data/src/index.ts` | `@einvoice/mock-data`        | Shared mock data.                                                    |

Library directories không có mapping ở trên không có generic alias. Follow relative import hoặc existing local barrel trong project đang sở hữu code; không tự tạo import alias cho queue, provider, DTO, hoặc common code chưa được khai báo trong `tsconfig.base.json`.

### Tài liệu canonical (đồng bộ với code)

Trước khi đổi webhook SePay, OAuth, enum hiển thị UI, hoặc cấu trúc `features/saas/` — đọc và cập nhật doc tương ứng:

| Chủ đề                            | Doc                                               |
| --------------------------------- | ------------------------------------------------- |
| Map tài liệu                      | `docs/README.md`                                  |
| Enum wire → nhãn UI               | `docs/guides/frontend-domain-display.md`          |
| SePay / VietQR / 3 webhook routes | `docs/guides/sepay-configuration-guide-phase3.md` |
| Phase 4B final behavior           | `docs/phases/phase-4b-saas-onboarding.md`         |

**UI:** API trả enum tiếng Anh → map qua `*Vi()` từ `@einvoice/shared-constants`; badge SaaS ở `management-app/.../features/saas/components/badges/`. **Không** render `{status}` raw trên UI.

**SaaS types (FE):** import `SaasSubscriptionStatus`, … từ `@einvoice/shared-constants` (file `saas-wire-types.ts` — phải khớp `libs/constants/saas.constants.ts`).

---

## 4. Forbidden Patterns — Không bao giờ làm

```

❌ process.env.XYZ trong business logic
→ Dùng `ConfigService` từ `@nestjs/config`; shared config factory/provider dùng concrete path dưới `@common/configuration/*`

❌ Định nghĩa lại thứ đã có trong libs/
→ Import từ mapping thật trong bảng trên, hoặc local/relative import khi library không có alias

❌ Kafka topic string hardcode cục bộ
→ Import `KafkaTopic` từ `@common/constants/kafka-topic.constants`

❌ Redis key tạo tùy tiện inline (key = `menu_${id}`)
→ Dùng `RedisKey` từ `@common/constants/redis-key.constants`

❌ WebSocket room string tạo tùy tiện
→ Dùng `WsRoom` từ `@common/constants/ws-room.constants`

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
→ Extract thành utility ở `libs/utils/src/lib/` khi nhiều project dùng, hoặc local `util/` khi chỉ thuộc một project

❌ console.log trong production code
→ NestJS Logger với context (Logger.log / .warn / .error)

❌ Code đã comment out còn tồn tại
→ Xóa đi — git history lưu giữ rồi

❌ Render enum wire (ACTIVE, CONNECTED, PENDING) trực tiếp trên UI
→ `*Vi()` từ `@einvoice/shared-constants`; badge ở `features/saas/components/badges/`

❌ Duplicate SaaS status union trong app khi đã có `saas-wire-types.ts`
→ Re-export type từ `@einvoice/shared-constants` trong `features/saas/types.ts`

```

---

## 5. QRTable Conventions — Bắt buộc tuân theo

### VND Rounding (Principle #9)

Mọi số tiền VND phải được làm tròn lên đến nghìn đồng.

```typescript
// ❌
const total = price * qty;

// ✅
import { roundVnd } from '@common/utils/vnd-rounding.util';
const total = roundVnd(price * qty);
// roundVnd = (amount: number) => Math.ceil(amount / 1000) * 1000
```

### Tenant Isolation (Principle #2)

```typescript
// TenantMiddleware và tenant guards establish tenant context.
// Mọi tenant-scoped repository/query phải nhận tenantId và apply explicit predicate.
// Internal request (TCP/Kafka) cũng phải truyền tenantId; không được bỏ qua nó.
// Không set tenant_id/tenantId tùy ý ngoài entity/flow convention đang tồn tại.
```

### Redis Key Pattern

```typescript
// Pattern: {entity}:{tenant_id}:{resource_id}
// ❌ key = `menu_${tenantId}_cat_${catId}`
// ✅ RedisKey.menu.public(tenantId)

// API hiện có nằm trong @common/constants/redis-key.constants:
import { RedisKey } from '@common/constants/redis-key.constants';
const menuKey = RedisKey.menu.public(tenantId);
const sessionKey = RedisKey.session.data(tenantId, sessionId);
const cartKey = RedisKey.cart.data(tenantId, sessionId);

// Nếu cần builder mới, thêm function đúng domain vào libs/constants/src/lib/redis-key.constants.ts
// và dùng function đó sau khi được review; không tạo key string inline.
```

### Kafka Topic Naming

```typescript
// Pattern: {domain}.{event} — không per-tenant, không per-instance
// Tất cả topics phải đến từ @common/constants/kafka-topic.constants
import { KafkaTopic } from '@common/constants/kafka-topic.constants';
// KafkaTopic.OrderConfirmed    → 'order.confirmed'
// KafkaTopic.PaymentCompleted  → 'payment.completed'
// KafkaTopic.KitchenSlaWarning → 'kitchen.sla_warning'
```

### WebSocket Room Naming

```typescript
// Pattern: tenant:{id}:{role_group}
import { WsRoom } from '@common/constants/ws-room.constants';
socket.join(WsRoom.staff(tenantId)); // tenant:{tid}:staff
socket.join(WsRoom.kds(tenantId, 'KITCHEN')); // tenant:{tid}:kds:kitchen
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

// ✅ ExceptionInterceptor từ @common/interceptors/exception.interceptor xử lý unexpected errors
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

// ✅ ConfigService từ @nestjs/config. Service config được load trong apps/<service>/src/configuration.
constructor(private readonly config: ConfigService) {}
this.config.get<string>('TYPEORM_HOST');
```

---

## 7. Working Protocol — Cách làm việc

### Khi bắt đầu session với code hiện tại

**Bước 1 — Read the Room:** Đọc code được cung cấp và extract conventions đang được dùng thực tế:

```
Observed in [service]:
├── DTO/interface location: local dto/ | @common/interfaces/*
├── Constants: local | @common/constants/*
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

### Tài liệu và đồng bộ với code (cho AI và dev)

- **Đọc trước khi audit sâu:** `docs/README.md` → `docs/DOC-CODE-ANCHORS.md` (bảng topic → file path thật).
- **UI labels:** `docs/guides/frontend-domain-display.md` + `libs/shared/constants/vi-domain-labels.ts` — không render enum wire raw.
- **SePay / webhook / OAuth:** `docs/guides/sepay-configuration-guide-phase3.md` §0 (3 route BFF) — không nhầm Tier 1 / Tier 2 / Phase 3 HMAC.
- **Sau khi đổi route, enum, env, folder layout:** cập nhật anchor + phase/technical-architecture tương ứng, chạy `pnpm verify:doc-anchors`.

### Khi refactor

Scope là thứ đang được yêu cầu refactor, không phải toàn bộ codebase:

```
❌ "Tôi sẽ refactor toàn service trước khi bắt đầu"
❌ "File này vi phạm 12 tiêu chuẩn, tôi sẽ không tiếp tục cho đến khi fix hết"
❌ Copy lại pattern bẩn vì xung quanh cũng đang làm vậy
✅ Clean chỗ đang touch, flag chỗ không touch, giữ PR nhỏ gọn
```

### Khi hỗ trợ đọc hiểu mã nguồn (Code Reading & Mentoring)

Khi người dùng yêu cầu hướng dẫn hoặc giải thích mã nguồn để tự đọc hiểu, AI Agent phải tuân thủ các nguyên tắc sau:

1. **Follow lộ trình [codebase-reading-map.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/guides/codebase-reading-map.md):**
   - Tuyệt đối không tự ý nhảy cóc hoặc đi chệch khỏi lộ trình trừ khi người dùng yêu cầu rõ ràng.
   - Luôn nhắc nhở người dùng về vị trí hiện tại trong lộ trình (ví dụ: Round 2 - Step 1).

2. **Phương pháp "Hộp đen" (Black-Box Thinking) & Trừu tượng hóa:**
   - Khi giải thích một file, hãy chia nhỏ nó thành các khối chức năng chính và mô tả vai trò của từng khối ở mức trừu tượng cao nhất (Input/Output/Nhiệm vụ chính), nhưng vẫn đủ chi tiết và giải thích rõ toàn bộ và hiểu được toàn bộ nội dung logic, ý nghĩa được viết trong chính file hiện tại đang đọc.
   - Tránh đi quá sâu vào thuật toán hoặc nhảy sang phân tích mã nguồn chi tiết của các file con/thư viện được import bên trong khi người dùng chưa đến bước đó. Điều này giúp ngăn chặn hiện tượng "Rabbit Hole" gây quá tải nhận thức.

3. **Phương pháp "Nạp trì hoãn" (Lazy Loading) & Ghi nhận câu hỏi:**
   - Nếu người dùng có thắc mắc hoặc phát hiện điểm kỳ lạ nằm ngoài phạm vi bước đọc hiện tại, hãy khuyên họ ghi chú lại để giải quyết sau khi đi tới bước tương ứng trên bản đồ.

4. **Kết nối với Quy chuẩn & Kiến trúc (Conventions & Architecture):**
   - Luôn đối chiếu code đang đọc với các quy chuẩn bảo mật/kỹ thuật của dự án được định nghĩa ở các phần trên (như Tenant Isolation, VND rounding, Redis key pattern, Kafka topic...). Giải thích rõ _tại sao_ đoạn code đó lại được viết theo cách này.

---

## 8. Pre-Output Checklist

Trước khi finalize bất kỳ output nào, tự hỏi:

- Không có `process.env.*` trong business logic?
- Không có định nghĩa lại thứ đã có trong `libs/`?
- Kafka topics đến từ `@common/constants/kafka-topic.constants`?
- Redis keys dùng builder pattern?
- WebSocket rooms dùng builder pattern?
- Cross-service communication qua TCP hoặc Kafka (không phải direct import)?
- VND amounts đi qua `roundVnd()`?
- Timestamps là server-side (`Date.now()` / `new Date()`)?
- Tenant-scoped repository/query có nhận `tenantId` và apply explicit predicate?
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
