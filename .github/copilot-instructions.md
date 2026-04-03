# QRTable — Project Guidelines

> Restaurant QR-code ordering SaaS platform. Nx monorepo, NestJS microservices + React/Next.js frontends.

## Architecture

**Backend** — Event-driven microservices (NestJS hybrid apps: HTTP + TCP/gRPC):

| Service     | HTTP | TCP  | gRPC | DB         | Purpose                                |
| ----------- | ---- | ---- | ---- | ---------- | -------------------------------------- |
| BFF         | 3000 | —    | —    | —          | API Gateway, sole frontend entry point |
| Authorizer  | 3004 | 3104 | 5100 | —          | JWT verification, Keycloak integration |
| User-Access | 3003 | 3103 | 5200 | MongoDB    | User management                        |
| Product     | 3302 | 3202 | —    | PostgreSQL | Product CRUD                           |
| Invoice     | 3301 | 3201 | —    | PostgreSQL | Invoice CRUD                           |
| Catalog     | 3005 | 3205 | —    | PostgreSQL | Menu catalog                           |
| SaaS        | 3006 | 3206 | —    | PostgreSQL | Tenant management                      |

**Frontend** — Two apps:

| App            | Stack                                                             | Port |
| -------------- | ----------------------------------------------------------------- | ---- |
| customer-pwa   | React 19 + Vite + React Router v7 + shadcn/ui + TanStack Query    | 5173 |
| management-app | Next.js 16 (App Router + RSC) + NextAuth v5 + Zustand + shadcn/ui | 3000 |

**Multi-tenancy:** Shared DB with `tenant_id` discriminator column. `TenantMiddleware` resolves tenant from header/subdomain/JWT.

See [docs/technical-architecture.md](../docs/technical-architecture.md) for full system design.
See [docs/step-0-2-pragmatic-layered-architecture.md](../docs/step-0-2-pragmatic-layered-architecture.md) for layered architecture details.

## Build and Test

```bash
# Infrastructure (Docker: Postgres, MongoDB, Redis, Keycloak, PgAdmin)
docker compose -f docker-compose.provider.yaml up -d

# Auth bootstrap (create realm, client, sync users)
pnpm auth:bootstrap:all

# Dev — all services
pnpm dev

# Dev — selective
pnpm dev:bff-auth          # BFF + Authorizer
pnpm dev:bff-product       # BFF + Product
pnpm dev:bff-invoice       # BFF + Invoice
pnpm dev-lite              # BFF only
pnpm dev:some --projects=bff,catalog  # Custom combo

# Single service
npx nx serve catalog

# Test
npx nx test <project>       # Unit tests (Jest)
npx nx run-many -t test     # All tests
npx nx lint <project>       # ESLint

# Keycloak theme
pnpm theme:dev              # Theme dev server
pnpm theme:build            # Build JAR for Keycloak
```

## Code Style

### Backend (NestJS)

- **Layered architecture:** Controller → Service → Repository (per-app under `src/`)
- **Shared libs** via `@common/*` imports (guards, interceptors, entities, config, utils)
- **Entities** in `libs/entities/` (TypeORM for Postgres) and `libs/schemas/` (Mongoose for Mongo)
- **TCP messaging** via `@MessagePattern()` with constants from `@common/constants/enum/tcp-request-message`
- **gRPC** for Authorizer & User-Access services (proto files in app `./proto/` dirs)
- **Response wrapper:** All responses go through `ExceptionInterceptor` → `{ data, message, statusCode, duration, processID }`
- **Guards chain:** `UserGuard` (JWT via gRPC) → `TenantGuard` (multi-tenant) → `PermissionGuard` (RBAC)

### Frontend

- **shadcn/ui** components (both apps use `radix-nova` style, oklch color system)
- **Tailwind CSS v4** with CSS variables
- **customer-pwa:** Feature-based folders (`cart/`, `menu/`, `order/`, `payment/`, `session/`)
- **management-app:** Next.js route groups (`(admin)/`, `(auth)/`, `(dashboard)/`, `(pos)/`, `(kds)/`)
- **Forms:** react-hook-form + Zod validation (management-app)

### Shared

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) enforced by commitlint + husky
- **Package manager:** pnpm (with pnpm-workspace.yaml)
- **TypeScript paths:** `@common/*` for backend libs, `@einvoice/*` for frontend libs

## Conventions

### Adding a new backend microservice

1. Generate with `npx nx g @nx/nest:app <name>`
2. Create hybrid app pattern in `main.ts` (HTTP + TCP via `connectMicroservice`)
3. Register TCP port in `libs/configuration/src/lib/tcp.config.ts`
4. Add message patterns to `libs/constants/src/lib/enum/tcp-request-message.ts`
5. Wire BFF proxy controller to forward requests via `ClientsModule`

### Adding a new shared library

- Backend: `npx nx g @nx/node:lib <name>` → add path alias `@common/<name>/*` in `tsconfig.base.json`
- Frontend: add as `@einvoice/<name>` in `tsconfig.base.json`

### Auth flow

Keycloak OAuth2/OIDC → BFF validates JWT via `UserGuard` → gRPC call to Authorizer → cached in Redis (30min TTL).
See [docs/keycloak-keycloakify-frontend-integration-guide.md](../docs/keycloak-keycloakify-frontend-integration-guide.md) for the 4-layer auth architecture.

### Docker services

Postgres (5432), MongoDB (27017), Redis (6379), Keycloak (8180), PgAdmin (5050). All on `qrtable-nw` bridge network. Data persisted in `docker/docker_data/`.

## Gotchas

- `pnpm dev` runs `nx reset` first — clears cache every time. Use `npx nx serve <project>` for faster restarts.
- TypeORM `synchronize: true` is ON by default — fine for dev, **never** in production.
- Keycloak runs in `start-dev` mode (port 8180, no HTTPS). Production needs proper SSL setup.
- Frontend apps share shadcn/ui but each has its own component copies (no shared shadcn lib yet).
- `@einvoice/frontend-ui` lib only exports `FeaturePlaceholder` — most UI components live in app-level `components/ui/`.
