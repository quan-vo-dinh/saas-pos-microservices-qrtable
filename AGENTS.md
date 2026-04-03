# QRTable — AGENTS.md

Primary agent context for the QRTable Restaurant QR-code ordering SaaS platform.

> ⚠️ **TARGET STANDARDS — NOT CURRENT STATE**
> This document describes **how the codebase should be built**, not necessarily its current state.
> The project is under active improvement. Always apply the patterns below when generating new code or refactoring existing code — even if surrounding code doesn't follow them yet.
> **Do not copy existing code patterns blindly** — audit them against these standards first.

## Project Identity

Nx monorepo with NestJS microservices backend + React/Next.js frontends. Multi-tenant SaaS architecture.

## Critical Patterns to Know

### Guard Chain (Backend)

Every protected HTTP endpoint goes through: `UserGuard` → `TenantGuard` → `PermissionGuard`.

- `UserGuard`: Validates JWT via gRPC call to Authorizer service. Attaches `user` to request.
- `TenantGuard`: Resolves tenant from header/subdomain/JWT. Attaches `tenant_id` to request.
- `PermissionGuard`: Checks RBAC permissions from `@common/constants`.

Never bypass this chain. Always apply guards in this order.

### TCP Microservice Communication

Services communicate via NestJS TCP transport. Pattern:

1. BFF Controller calls `this.client.send(TCP_MESSAGE_PATTERN, payload)`
2. Target service handles with `@MessagePattern(TCP_MESSAGE_PATTERN)`
3. Constants in `libs/constants/src/lib/enum/tcp-request-message.ts`

### Multi-Tenant Data Isolation

Every DB query MUST include `tenant_id` filter. `TenantMiddleware` resolves and injects it.
TypeORM: always add `WHERE tenant_id = :tenantId` parameter.
Mongoose: always add `{ tenant_id: tenantId }` to queries.

### Response Wrapper

All HTTP responses are wrapped by `ExceptionInterceptor`:

```json
{ "data": ..., "message": "...", "statusCode": 200, "duration": "12ms", "processID": "..." }
```

### Auth Flow

Keycloak (OAuth2/OIDC) → JWT in Authorization header → BFF UserGuard → gRPC to Authorizer → Redis cache (30min TTL)

## Service Ports Quick Reference

- BFF: HTTP 3000
- Authorizer: HTTP 3004, TCP 3104, gRPC 5100
- User-Access: HTTP 3003, TCP 3103, gRPC 5200
- Product: HTTP 3302, TCP 3202
- Invoice: HTTP 3301, TCP 3201
- Catalog: HTTP 3005, TCP 3205
- SaaS: HTTP 3006, TCP 3206

## Development Commands

```bash
npx nx serve <service>        # Single service
pnpm dev:bff-auth             # BFF + Authorizer
pnpm dev:bff-product          # BFF + Product
npx nx test <project>         # Unit tests
npx nx lint <project> --fix   # Lint fix
```

## When to Use Which Agent

- Adding/modifying NestJS service → `nestjs-microservice-expert`
- Frontend UI/UX changes → `frontend-specialist`
- Database schema changes → `database-architect`
- CI/CD or Docker issues → `devops-engineer`
- Tracking down bugs → `debugger`
- Writing tests → `test-engineer`
- Code quality / refactoring → `code-quality-auditor`
- PR / diff review → `code-reviewer` (global)

## Recommended Workflows

### Feature Development

```
/plan Add [feature] to [service]
→ Review plan → Proceed
→ Use the nestjs-microservice-expert to implement
→ Use the test-engineer to write tests
→ /review
→ Commit with conventional commit message
```

### Code Quality Audit

```
Use the code-quality-auditor to audit apps/[service]/src/
→ Review findings
→ Proceed with fixes
→ npx nx lint [service] --fix && npx nx test [service]
```

### Debugging

```
Use the debugger agent to investigate [symptom] in [service]
```

### New Microservice

```
/plan Scaffold new [name] microservice
→ Use the nestjs-microservice-expert to implement following the plan
→ Use the devops-engineer to add Docker config if needed
```

### Onboarding / Understanding Code

```
How does [feature/flow] work in this codebase?
Explain the auth flow from frontend to Keycloak
What's the pattern for adding a new TCP endpoint?
```
