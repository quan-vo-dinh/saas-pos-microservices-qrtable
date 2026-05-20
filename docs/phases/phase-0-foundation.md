# Phase 0 — Foundation & Architecture Preparation

> **Goal:** Organize the codebase, create new services, setup frontend apps, and set up auth infrastructure.
> **Estimated:** ~1 week
> **Status:** ✅ DONE

## Prerequisites

- Course codebase is active (services: invoice, product, user-access, bff, authorizer)
- Docker Compose infrastructure (PostgreSQL, MongoDB, Redis, Keycloak) is running

## Reference

| Documents                           | Related Sections                                                 |
| ----------------------------------- | ---------------------------------------------------------------- |
| technical-architecture.md           | §4.2 Nx Monorepo Organization, §8 Authentication & Authorization |
| references/auth-system-reference.md | Complete — details of implemented auth system                    |

## Overview

Phase 0 keeps the course codebase as "living templates" and creates new QRTable services alongside. Including: organizing the codebase, applying Pragmatic Layered Architecture, sketching ERD, creating 2 frontend apps (Customer PWA + Management App), setting up shared libraries according to Nx grouping, setting up auth infrastructure (Keycloak, Guards, Middleware), and building layout skeleton for 2 frontend apps.

## Steps

### Step 0.1 — Markup & Organize the Codebase (days 1-2)

**Goal:** Clear organization between course services (templates) and new QRTable services.

**"Template-First" strategy:** Course services (invoice, product, user-access) DO NOT DELETE — keep as "living templates" for TCP setup, TypeORM config, Guard patterns, Repository patterns. When creating a new QRTable service (catalog, order, payment...):

1. Refer to the corresponding service template
2. Copy the necessary pattern/structure
3. Improvement: apply Pragmatic Layered Architecture + .agent skills
4. DO NOT modify the original service — keep it as it is for comparison/learning

**Main requirements:**

- Mark course services (invoice, product, user-access) with README "TEMPLATE — Do not modify"
  - `invoice/` → TCP + MongoDB + Repository
  - `product/` → TCP + PostgreSQL + TypeORM
  - `user-access/` → TCP + Keycloak integration
- Create new QRTable services: catalog, saas — inherit patterns from templates
- Maintain infrastructure services: bff (expand), authorizer (retain)

**verify:** `nx serve bff`, `nx serve catalog`, `nx serve saas` — all boot OK

### Step 0.2 — Pragmatic Layered Architecture (days 2-3)

**Goal:** Apply the Controller → service → Repository structure to each new QRTable service.

**Main requirements:**

- Each service is N-Tier compliant: controllers/ → services/ → repositories/ → entities/ → dtos/
- Take advantage of NestJS DI container for testing/mocking
- Do not apply pure Clean Architecture — too cumbersome for the project scope

**Benefits for Monorepo 8 services:**

- **Velocity:** Copy patterns easily from course templates
- **Flexible enough:** NestJS DI container is ready for testing/mocking
- **Anti-Boilerplate:** No need for dozens of interfaces/mappers files like pure Clean Arch

**Sample folder structure (service catalog):**

```
apps/catalog/src/
├── catalog.module.ts
├── controllers/catalog.controller.ts
├── services/catalog.service.ts
├── repositories/catalog.repository.ts
├── entities/catalog.entity.ts
└── dtos/create-catalog.dto.ts
```

**verify:** Correct folder structure for catalog and saas services

### Step 0.3 — Overall System ERD (day 3)

**Objective:** Outline the overall ERD for the thesis report.

**Main requirements:**

- ERD covers main relationships: tenant, Category, MenuItem, Table, Order, Bill, Payment
- Drawings are directional — the actual schema will be refined in each phase

**verify:** ERD file exists at `docs/architecture/erd.png`

### Step 0.4 — Initialize 2 Frontend Apps (day 3-4)

**Goal:** 2 working frontend apps: Customer PWA (React + Vite) and Management App (Next.js).

**Main requirements:**

- Customer PWA: React + Vite + Tailwind + shadcn/ui + TanStack Query
  - Key dependencies: tailwindcss, shadcn-ui, lucide-react, @tanstack/react-query, socket.io-client
- Management App: Next.js App Router + shadcn/ui + Zustand + React Hook Form + Zod
  - Key dependencies: shadcn-ui, lucide-react, @tanstack/react-query, zustand, react-hook-form, zod, socket.io-client
- Both apps are configured in Nx project.json

**Verify:** `nx serve customer-pwa` → localhost:5173, `nx serve management-app` → localhost:3000

### Step 0.5 — Shared Libraries (Days 4-5)

**Goal:** Organize shared libs according to Nx Grouping — clearly separate cross-platform, frontend, backend.

**Main requirements:**

- **Cross-Platform (common FE & BE):** `libs/shared/types/`, `libs/shared/constants/` — contract between FE ↔ BE, Kafka topics, common Enums
  - First shared types file: `libs/shared/types/src/index.ts` → `export type { ITenant, IUser, IRole }`
- **Frontend (2 apps only):** `libs/frontend/ui/`, `libs/frontend/hooks/`, `libs/frontend/utils/`
- **Backend (keeps flat structure from the course):** `libs/guards/`, `libs/middlewares/`, `libs/entities/`, `libs/interfaces/`, `libs/providers/*`, `libs/utils/` — DO NOT stuff into folder `backend/` to avoid breaking existing import paths

**verify:** Import paths work — `@common/*` for backend, `@einvoice/*` for frontend

### Step 0.6 — Setup Auth Infrastructure (June 5)

**Goal:** Complete auth system: Keycloak realm, Guards, Middleware.

**Main requirements:**

- Docker Compose: PostgreSQL, Redis, Keycloak, MongoDB working
- Keycloak realm "qrtable" with 6 roles: SUPER_ADMIN, Owner, MANAGER, WAITER, CHEF, BARISTA
- Guard chain: UserGuard (staff) or SessionGuard (guest) → TenantGuard → PermissionGuard
- TenantMiddleware resolves tenant from header/subdomain
- Auth completion: provisioning strategy, role mapping Keycloak ↔ internal roles

#### Step 0.6A — Auth Completion Details

- **2-layer auth model:** Keycloak manages identity (login/token) + user-access DB manages internal profile (roles, tenant mapping)
- **Provisioning strategy:** Pre-provision (Owner creates staff first) vs First-login upsert (user logs in for the first time → creates profile himself)
- **Role mapping Keycloak → internal:** Owner, MANAGER, WAITER, CHEF, BARISTA
- **Detailed reference:** `docs/references/auth-system-reference.md`

**Verification scenarios:**

- `valid token + provisioned user` → pass secured endpoints
- `valid token + missing profile` → 401 `user_not_provisioned`
- `sai permission` → 403 `permission_denied`

**Verify:** BFF → Catalog/SaaS TCP health check OK, secured endpoints reject invalid tokens

### Step 0.7 — Skeleton Layout for 2 Frontend Apps (July 6)

**Goal:** Basic layout for both apps with role-based routing.

**Main requirements:**

- Management App: Sidebar + Top Bar + Content Area, role-based redirect after login
  - Placeholder route groups: `/dashboard`, `/pos`, `/kds`, `/admin`
- Customer PWA: Layout minimal mobile-first
- Shared design tokens (Tailwind config)

**verify:** Login Keycloak → redirect to correct route according to role

## Acceptance Criteria

- [x] Course Services still exists, with README marked TEMPLATE
- [x] 2 new QRTable services (catalog, saas) can be started
- [x] 2 running frontend apps (customer-pwa, management-app)
- [x] Shared libs created according to Nx Grouping standards
- [x] Keycloak realm "qrtable" + roles created
- [x] Guard chain active (UserGuard or SessionGuard → TenantGuard → PermissionGuard)
- [x] Role mapping pass smoke authorization
- [x] BFF → Catalog + SaaS TCP call successful
- [x] The overall ERD drawing is available (docs/architecture/erd.png)
- [x] Internal actor has valid token but lacks internal profile returns 401 (user_not_provisioned)
- [x] Management App: login → redirect to correct role route

## Outputs for Phase 1

- Catalog service is ready to receive business logic
- Frontend apps have skeleton layout, ready to mock UI
- Complete Auth system, ready to protect endpoints
- Shared types library is available for type definitions
