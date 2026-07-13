# QRTABLE SYSTEM TECHNICAL ARCHITECTURE

> **Topic (Vietnamese):** Research and build a SaaS POS platform integrating ordering via QR code based on Microservices architecture

> **Topic (English):** Design and Implementation of a SaaS-Based POS Platform with Integrated QR Code Ordering Using a Microservices Architecture

> **Version:** 1.1  |  **Update:** 2026-06-12

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Principles of Architecture](#2-principles-of-architecture)
3. [Overall Architecture](#3-overall-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Multi-tenancy strategy](#5-multi-tenancy-strategy)
6. [Declaration of Microservices](#6-declaration-of-microservices)

7. [Inter-service Communication](#7-inter-service-communication)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Real-time & WebSocket](#9-real-time--websocket)
10. [Payment Integration](#10-payment-integration)
11. [Canonical Redis Ownership](#11-canonical-redis-ownership)
12. [Distributed Transaction Processing](#12-distributed-transaction-processing)
13. [Observability & Monitoring](#13-observability--monitoring)
14. [Implementation Strategy](#14-implementation-strategy)
15. [Technical Challenges](#15-technical-challenges)
16. [Offline & Sync Strategy](#16-offline--sync-strategy)

---

## 1. SYSTEM OVERVIEW

### 1.1 Description

QRTable is a SaaS (Software as a service) platform serving the F&B industry, allowing many restaurants (Tenants) to operate on a single software infrastructure. The system digitizes the entire process of ordering food at the table through QR codes — from scanning the code, browsing the menu, ordering, monitoring kitchen progress, to payment — all happening in real-time.

### 1.2 Technical Scope

| Aspect                       | Decision                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| **Architectural style**      | Event-Driven Microservices                                              |
| **SaaS model**               | Multi-tenant, Database-per-service + Discriminator Column (`tenant_id`) |
| **Communication**            | TCP (sync), gRPC (auth), Kafka (async), WebSocket (push)                |
| **Source code organization** | Nx Monorepo                                                             |
| **Deployment**               | Docker + Docker Compose                                                 |
| **Environment**              | Self-hosted VPS / Cloud VM                                              |

### 1.3 Actors

| Actor                   | Scope             | Authentication                                                            | Main interface  |
| ----------------------- | ----------------- | ------------------------------------------------------------------------- | --------------- |
| **Super Admin**         | Cross-tenant      | JWT (Keycloak)                                                            | Admin Dashboard |
| **Restaurant Owner**    | Private tenant(s) | JWT (Keycloak)                                                            | Management App  |
| **Staff** (Waiter/Chef) | Assigned tenant   | JWT (Keycloak)                                                            | POS / KDS       |
| **Customer** (Guest)    | Session/Table     | Header-based anonymous session (`x-tenant-id`; `x-session-id` after join) | PWA via QR      |

---

## 2. PRINCIPLES OF ARCHITECTURE

| #   | Principles                            | Apply                                                                                                                                |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Database per service**              | Each microservice owns its own schema/table, does not directly access other service DB                                               |
| 2   | **tenant Isolation by Default**       | Tenant middleware/guards establish context; every tenant-scoped repository/query explicitly receives `tenantId` and predicates on it |
| 3   | **Event-Driven Decoupling**           | Async communication via Kafka events; service does not call each other directly for side-effects                                     |
| 4   | **API Gateway as Single Entry**       | The BFF service is the single entry point from the client, handling auth/routing/rate-limit                                          |
| 5   | **Cache-First for Verified Hot Data** | Redis is used only for current, source-backed cache and ephemeral-state ownership; see §11                                           |
| 6   | **Fail-Safe & Idempotent**            | Every write operation has an idempotency key; Saga compensation for distributed tx                                                   |
| 7   | **Observe Everything**                | Centralized logging (Loki), metrics (Prometheus), tracing (Tempo)                                                                    |
| 8   | **Server Timestamp (UTC)**            | Every timestamp uses `server UTC` (`Date.now()`); DO NOT use client timestamp                                                        |
| 9   | **VND Rounding Convention**           | All VND amounts rounded to thousands: `Math.ceil(amount / 1000) * 1000`                                                              |
| 10  | **Session Lifecycle**                 | Session lifetime = 2 hours (max), idle timeout = 30 minutes (auto-close if inactive)                                                 |

---

## 3. OVERALL ARCHITECTURE

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                   │
│                                                                         │
│   📱 Customer PWA    💻 Staff POS/KDS    🖥️ Owner Dashboard    🛡️ Admin │
│        (QR Scan)       (Tablet/PC)         (Web App)          Portal   │
└────────────┬───────────────┬──────────────────┬──────────────┬──────────┘
             │               │                  │              │
             ▼               ▼                  ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     🚪 BFF SERVICE (API Gateway)                        │
│       Configurable HTTP REST (`PORT`; source default 3000; Compose 3300)│
│                                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ Swagger  │  │ Rate Limiter │  │ Guard Chain│  │ WebSocket Gateway│  │
│  │ Docs     │  │ (Throttler)  │  │ Auth+Tenant│  │ (Socket.io)      │  │
│  └──────────┘  └──────────────┘  └────────────┘  └──────────────────┘  │
└────────┬───────────────┬──────────────┬──────────────────┬──────────────┘
         │ TCP           │ gRPC         │ TCP              │ TCP
         ▼               ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Microservices)                   │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 🔐 Author- │  │ 📋 Catalog │  │ 🍽️ Order   │  │ 🏪 SaaS Mgmt    │  │
│  │ izer Svc   │  │ Service    │  │ Service    │  │ Service          │  │
│  │ (gRPC)     │  │ (TCP)      │  │ (TCP)      │  │ (TCP)            │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                        │
│  │ 💳 Payment │  │ 👨‍🍳 Kitchen │  │ 👥 User-   │                        │
│  │ Service    │  │ (KDS) Svc  │  │ Access Svc │                        │
│  │ (TCP)      │  │ (TCP)      │  │ (TCP+Mongo)│                        │
│  └────────────┘  └────────────┘  └────────────┘                        │
│                                                                         │
└────────┬───────────────┬──────────────┬──────────────────┬──────────────┘
         │               │              │                  │
         ▼               ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                               │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 🐘 Postgres│  │ 🔴 Redis   │  │ 📨 Kafka   │  │ 🔑 Keycloak     │  │
│  │ :5432      │  │ :6379      │  │ :9092      │  │ :8180            │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 📊 Grafana │  │ 📋 Loki    │  │ 📡 Promtail│  │ ☁️ Cloudinary    │  │
│  │ :3001      │  │ :3100      │  │ (Agent)    │  │ (File Storage)   │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐                                         │
│  │ 📈 Promethe│  │ 🔍 Tempo   │                                         │
│  │ us :9090   │  │ :3200      │                                         │
│  └────────────┘  └────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Main Data Stream

```
[Customer what QR]
    │
    ▼
BFF → validate token (HMAC) → resolve tenant_id + table_id
    │
├──→ Catalog service (TCP): fetch menu by tenant
│ └── Redis cache hit? → return cache : query PostgreSQL → cache → return
    │
    ├──→ Order Service (TCP): submit order
    │       ├── Validate availability snapshot (submit ≠ deduct stock; persisted row starts at `PENDING`)
    │       ├── Persist order (+ bill on first submit per session) → PostgreSQL Order DB
    │       └── Return response → BFF
    │           └── BFF Direct: emit WebSocket → notify Staff POS (AP1)
    │
    └──→ Staff confirm (Order Service TCP orchestrates)
            ├── Catalog Service (TCP): transactional stock deduct (Catalog owns `menu_items`)
├── Order DB commit + simplified outbox → Kafka: `order.confirmed` (P1+P2), payload enriched — Step 2.4 specification
            └── Kitchen Service (Kafka consumer):
                    ├── Route ticket (e.g. `MenuItem.station`): KITCHEN vs BAR
                    ├── Redis Sorted Set (FIFO queue)
                    └── Publish internal KDS invalidation hint after Redis write → BFF WebSocket → KDS screens
    │
└──→ Payment service (TCP): settle payment (VietQR or cash)
├── In the same transaction: persist payment + outbox row `payment.completed` (Payment DB)
├── After commit: optional TCP Order `BILL_MARK_PAID` (fast path, idempotent); Kafka publication from the outbox supports recovery/fan-out
└── Phase 3 baseline: POS/Customer **polling/refetch**; WebSocket push through a Kafka→BFF bridge is a follow-up (see decision D5)
```

---

## 4. TECHNOLOGY STACK

### 4.1 Technology Decision Table

| Floor                    | Technology                             | Role                                               | Reason for choosing                                                 |
| ------------------------ | -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| **Framework**            | NestJS + TypeScript                    | Backend framework for all microservices            | Enterprise-grade, good DI, supports TCP/gRPC/Kafka/WS native        |
| **Monorepo**             | Nx                                     | Organize source code, shared libs, task pipeline   | Dependency graph, affected builds, code generation                  |
| **Database (main)**      | PostgreSQL + TypeORM                   | Persistent storage for business data               | ACID, Pessimistic Locking, suitable for relational model F&B        |
| **Database (secondary)** | MongoDB + Mongoose                     | User-Access user profiles and role mappings        | Flexible document storage for the User-Access bounded context       |
| **Cache**                | Redis                                  | Token cache, session store, menu cache, rate limit | Sub-millisecond latency, Sorted Set for FIFO, Pub/Sub               |
| **Message Broker**       | Apache Kafka                           | Event streaming, async decoupling                  | High-throughput, consumer groups, at-least-once delivery            |
| **Identity**             | Keycloak                               | User management, OAuth 2.0/OIDC, SSO               | Enterprise IAM, realm/client model, social login                    |
| **Payment**              | SePay (VietQR)                         | Payment by bank transfer in Vietnam                | VietQR dynamic inline, HMAC direct webhook + tenant x-secret routes |
| **Real-time**            | Socket.io (NestJS GW)                  | WebSocket bidirectional                            | Room-based, auto-reconnect, fallback transport                      |
| **File Storage**         | Cloudinary                             | Menu image, QR export                              | Integrated CDN, image transformation, free tier                     |
| **Monitoring**           | Grafana + Loki + Promtail              | Centralized logging & dashboard                    | PLG Stack, LogQL, Docker-native log collection                      |
| **Metrics**              | Prometheus                             | Application & infra metrics                        | Pull-based, PromQL, Grafana integration                             |
| **Tracing**              | Grafana Tempo + OTel                   | Distributed tracing                                | OpenTelemetry standard, propagation context                         |
| **Container**            | Docker + Docker Compose                | Containerization & orchestration                   | Reproductive environments, service isolation                        |
| **Code Quality**         | ESLint + Prettier + Husky + Commitlint | Lint, format, commit convention                    | Team consistency, pre-commit hooks                                  |

### 4.2 Nx Monorepo Organization

```
qrtable/
├── apps/
│   ├── # ── Backend Services ──────────────────
│   ├── authorizer/             # Keycloak/JWT Authorizer Service (gRPC + admin ops)
│   ├── bff/                    # API Gateway (HTTP + WebSocket)
│   ├── catalog/                # Menu & Table Management (TCP)
│   ├── kitchen/                # KDS Service (TCP + Kafka Consumer)
│   ├── order/                  # Order Processing (TCP)
│   ├── payment/                # Payment Service (TCP + Webhook)
│   ├── saas/                   # SaaS Management Service (TCP + Redis + outbox)
│   ├── user-access/            # User profile, roles, staff access (TCP + Mongo)
│   ├── # ── Frontend Apps ─────────────────────
│   ├── customer-pwa/           # 📱 Customer PWA (React + Vite)
│   ├── keycloak-theme/         # Keycloak login/theme assets
│   └── management-app/         # 💻 Management App (Next.js — POS/KDS/Dashboard/Admin)
├── libs/
│ ├── # ── Backend Shared (Flat structure from course) ───────
│   ├── configuration/          # Centralized config (env validation)
│   ├── constants/              # Shared constants, enums, Kafka topics
│   ├── schemas/                # Database schemas & entities
│   ├── dtos/                   # Backend DTOs (Server-side models)
│   ├── guards/                 # UserGuard, TenantGuard, SessionGuard
│   ├── interceptors/           # Exception, Logging, TCP Logging
│   ├── middlewares/            # Logger, Tenant injection
│   ├── providers/              # TCP, gRPC, Mongo, Postgres, Redis providers
│   ├── queue/                  # Kafka producer/consumer modules
│   ├── common/                 # Utilities, decorators, helpers
│   ├── # ── Cross-Platform Shared (FE & BE) ───────────────────
│   ├── shared/types/           # TypeScript interfaces, DTOs (Contract chung)
│   ├── shared/utils/           # Pure functions, formatters (Shared)
│   ├── # ── Frontend Shared ───────────────────────────────────
│   ├── frontend/ui/            # UI components (Shadcn-based, shared by both apps)
│   └── frontend/hooks/         # React Query hooks, WebSocket hooks
├── docker/
│   ├── docker-compose.infra.yaml     # Infrastructure services
│   ├── docker-compose.app.yaml       # Application services
│   ├── grafana/                       # Dashboards & datasources
│   ├── loki-config.yaml
│   └── promtail-config.yaml
├── nx.json
├── tsconfig.base.json
└── package.json
```

#### 4.2.1 Status `libs/shared/types` (document sync — 2026-04)

Diagram §4.2 above describes the **objective** of “FE & BE joint contract”. **In the current codebase**, `libs/shared/types` (`@einvoice/types`) is mainly imported by **customer-pwa**, **management-app**, **libs/shared/mock-data** and **libs/shared/constants**; NestJS services in the monorepo use **`@common/*`** (interfaces, entities, DTO) for the HTTP/TCP layer. The next steps (OpenAPI client, package types validated by BFF, etc.) should be planned separately when tightening the FE–BE contract.

### 4.3 Frontend Tech Stack (Details)

**2-app strategy:** Instead of 4 separate apps, the frontend system is organized into **2 independent apps** in Nx Monorepo — optimizing development volume, sharing shared libraries, while still clearly separating Customer (anonymous) and Internal (authenticated).

| Ingredients               | Technology                               | Reason for choosing                                                               |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| **App 1: Customer PWA**   | React + Vite, TypeScript, service Worker | Fast download, offline-first, mobile-first, lightweight build, no need for SSR    |
| **App 2: Management App** | Next.js (App Router) + React 19          | Role-based routing, auth middleware, flexible SSR/CSR, complex layout             |
| **State/Data**            | React Query + Zustand                    | Server-state is clear, local state is light, cache & refetch are good             |
| **Real-time**             | Socket.io client                         | Reconnect, room-based updates by tenant/session                                   |
| **Form & Validation**     | React Hook Form + Zod                    | Validation schema-based, good UX                                                  |
| **UI System**             | Tailwind CSS + Shadcn UI + Lucide React  | Standardized component library, easy to expand, ecosystem-synchronized icon       |
| **Charts/Analytics**      | shadcn/ui Charts + Recharts              | Visualize revenue reports, SLA, order throughput with shared dashboard primitives |

### 4.4 Frontend Application Architecture (2-App Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND APPLICATION LAYER                     │
│                                                                  │
│  ┌──────────────────────┐   ┌──────────────────────────────┐    │
│  │  📱 Customer PWA     │   │  💻 Management App           │    │
│  │  (React + Vite)      │   │  (Next.js App Router)        │    │
│  │                      │   │                              │    │
│  │  Auth: Session-based │   │  Auth: JWT (Keycloak)        │    │
│  │  (Anonymous/Guest)   │   │  Role-based routing:         │    │
│  │                      │   │  ├── /pos/*    → Staff       │    │
│  │  Features:           │   │  ├── /kds/*    → Chef/Bar    │    │
│  │  ├── QR Scan         │   │  ├── /dashboard/* → Owner    │    │
│  │  ├── Menu Browsing   │   │  └── /admin/*  → Super Admin │    │
│  │  ├── Ordering        │   │                              │    │
│  │  ├── Order Tracking  │   │  Shared Features:            │    │
│  │  └── Payment Request │   │  ├── WebSocket (real-time)   │    │
│  │                      │   │  ├── Role-gated pages        │    │
│  │  Offline writes:     │   │  └── Tenant context          │    │
│  │  deferred            │   │                              │    │
│  └──────────────────────┘   └──────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  📦 Shared Libraries (Nx libs)                           │    │
│  │  ├── frontend/ui/     → UI components (Shadcn-based)     │    │
│  │  ├── shared/utils/    → Helpers, formatters, validators  │    │
│  │  ├── shared/types/    → TypeScript interfaces, DTOs      │    │
│  │  └── frontend/hooks/  → React Query hooks, WS hooks      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Data Layer: React Query (REST) + Socket.io (Real-time)   │    │
│  │  Data Layer: React Query + Socket.io; offline writes deferred │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Frontend architectural principles:**

- **2-App Separation**: Customer (anonymous, PWA) is separated; All authenticated actors are merged into 1 Management App with role-based routing.
- **Role-based routing (not role-based app)**: Use Next.js middleware + Keycloak role for navigation — same app, different layout/pages according to role.
- **Decentralization layer (temporary, Phase 2.x):** UI (`management-app`) uses **role → route area + sidebar**; BFF still enforces **permission per API** (canonical matrix). Details: [permission matrix](architecture/permission-matrix.md) §9.
- **BFF as single API**: all requests go through BFF, do not call microservices directly.
- **Real-time first**: staff/kitchen prioritize WebSocket, customers prioritize REST + cache.
- **Customer PWA offline writes:** IndexedDB/Background Sync action queues are deferred. Do not describe automatic order replay as current behavior.
- **tenant routing**: subdomain `{slug}.qrtable.io` resolve tenant_id before rendering.
- **Shared Libraries**: UI components, hooks, types are shared between 2 apps via Nx libs.

#### 4.4.1 Domain display labels (wire enum → UI copy)

Backend and JSON responses keep **English enum wire values** (`OrderStatus.PENDING`, `TenantStatus.SUSPENDED`, `SubscriptionInvoiceStatus.PAID`). User-facing apps map them to Vietnamese (or formatted locale output) in a fixed stack:

| Layer                 | Package / path                                                                                                       | Role                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Enum source of truth  | `libs/constants` (e.g. `saas.constants.ts`), `@einvoice/types` (POS)                                                 | Valid domain states for DB/API  |
| SaaS wire unions (FE) | `@einvoice/shared-constants` → `saas-wire-types.ts` (CI test vs `saas.constants.ts`)                                 | Frontend contract; no drift     |
| Label functions       | `@einvoice/shared-constants` → `vi-domain-labels.ts` (`orderStatusVi`, `subscriptionStatusVi`, `billingPeriodVi`, …) | Shared FE label map; no React   |
| Locale formatting     | `@einvoice/frontend-utils` (`formatCurrency`), app `formatters.ts` (`formatVnd`, `formatDateTime`)                   | Money and timestamps            |
| Badges (optional)     | App feature components (e.g. `management-app/.../features/saas/components/badges/`)                                  | Presentation only; call `*Vi()` |

**Rules:** Do not render raw enum strings or SaaS plan feature codes in UI. Plan feature lists/tables use `planFeatureVi()`, status badges call the matching `*Vi()` helper, and unknown values should degrade through `displayDomainLabel()` instead of showing raw `UPPER_SNAKE`. Do not duplicate label maps inside apps. Do not mix re-export barrels that bundle shared-constants with React components. Full playbook: [frontend-domain-display.md](guides/frontend-domain-display.md).

### 4.5 Details by application

#### App 1: Customer PWA

| Aspect            | Details                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Actor**         | Customer / Guest (anonymous)                                                                                                       |
| **Entry point**   | QR Scan → `https://{slug}.qrtable.io?table={id}&token={hmac}`                                                                      |
| **Auth**          | Header-based anonymous session — the PWA sends `x-tenant-id` and, once joined, `x-session-id`; no login required                   |
| **Tech**          | React + Vite + TypeScript + service Worker                                                                                         |
| **Core features** | Menu browsing, shared cart, order submission, order tracking, payment request; When tenant `SUSPENDED` only read/pay bills created |
| **Offline**       | Offline write queue and automatic replay are deferred; current order writes require an online retry                                |
| **Real-time**     | Socket.io → room `session:{sid}:customer` (order status, menu updates)                                                             |

#### App 2: Management App (Role-based)

| Aspect          | Details                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Actors**      | Staff (Waiter, Chef, Barista), Owner/Manager, Super Admin                                         |
| **Entry point** | `https://app.qrtable.io/login` → Keycloak OAuth                                                   |
| **Auth**        | JWT (Keycloak) — middleware checks roles, redirects according to role after login                 |
| **Tech**        | Next.js (App Router) + React 19 + TypeScript                                                      |
| **Real-time**   | Socket.io → rooms by role (`tenant:{tid}:staff`, `tenant:{tid}:kds:*`, `tenant:{tid}:management`) |

**Role → Route Mapping (Next.js Middleware):**

```typescript
// middleware.ts — Role-based redirect after login
const ROLE_ROUTES = {
  SUPER_ADMIN: '/admin', // Platform management
  Owner: '/dashboard', // Restaurant Dashboard
  MANAGER: '/dashboard', // Restaurant Dashboard (narrower permissions than Owner)
  WAITER: '/pos', // POS — order confirmation, payment
  CHEF: '/kds/kitchen', // KDS — kitchen screen
  BARISTA: '/kds/bar', // KDS — bar screen
};
```

### 4.6 Interface system — Page Structure (Management App)

**Route `/dashboard/*` — Owner/Manager:**

```
Dashboard
├── / (Plan-aware revenue/reporting dashboard: quota, locked states, daily/weekly/monthly)
  ├── /menu (Menu Management: Category, Item, Stock)
  ├── /tables (Table & Area Management, QR export)
  ├── /staff (Staff & Role Management)
  ├── /orders (Payment history — read-only)
  ├── /subscription (Subscription & Plan)
  ├── /billing/[invoiceId] (Subscription invoice VietQR + status polling)
  ├── /payment-settings (Tenant payment settings + SePay OAuth Connect)
  └── /settings (Store profile, branding, operating mode)
```

**Route `/admin/*` — Super Admin:**

```
Platform Ops
  ├── / (Platform Overview)
  ├── /tenants (Tenant Directory: onboard, search, suspend, activate, close, assign plan)
  ├── /plans (Pricing Plan Management)
  ├── /billing (Subscription invoices reconciliation)
  ├── /analytics (Platform subscription analytics + explicit tenant drilldown)
  └── /health (System Health: services, Kafka lag, error rate)
```

**Route `/pos/*` — Staff (Waiter):**

```
POS
  ├── / (Live Orders: confirm, cancel)
  ├── /tables (Table Map: status, session info, transfer)
  ├── /bills (Payment settlement: PENDING bills, cash confirm, VietQR QR display + status)
  ├── /service-requests (SLA alerts, service requests)
  └── /payment (legacy alias → redirect to /pos/bills)
```

**Route `/kds/*` — Staff (Chef/Barista):**

```
KDS
  ├── /kitchen (Kitchen Queue: FIFO + priority + SLA)
  ├── /bar (Bar Queue)
  ├── /priority (Priority flagging)
  └── /recall (Recall / undo ready)
  └── SLA Timer (overlay component)
```

---

## 5. MULTI-TENANCY STRATEGY

### 5.1 Model: Database-per-service + Discriminator Column (`tenant_id`)

The system combines **2 complementary patterns**:

1. **Database-per-service** (Microservice pattern): Each microservice owns its own database, does not directly access the database of other services. Cross-service data access via TCP or Kafka events.

2. **Shared Database per tenant — Discriminator Column** (Multi-tenancy pattern): In each database of each service, all tenants share the same tables. Data isolation is enforced using the `tenant_id` column on every tenant-scoped entity.

```
PostgreSQL Instance (1 server, port 5432)
│
├── DB "qrtable_saas"                   ← SaaS Management Service
│ ├── tenants (NO tenant_id — root entity)
│ ├── pricing_plans (NO tenant_id — platform-level)
│   ├── subscriptions                    (HAS tenant_id)
│   ├── subscription_invoices             (HAS tenant_id — Tier 2 tenant → platform)
│   └── outbox_events                     (`tenant.created`, subscription events)
│
├── DB "qrtable_catalog"                ← Catalog Service
│   ├── categories                       (HAS tenant_id)
│   ├── menu_items                       (HAS tenant_id)
│   ├── areas                            (HAS tenant_id)
│   └── tables                           (HAS tenant_id)
│
├── DB "qrtable_order"                  ← Order Service
│   ├── orders                           (HAS tenant_id)
│   ├── order_items                      (HAS tenant_id)
│   ├── bills                            (HAS tenant_id)
│   └── service_requests                 (HAS tenant_id)
│
├── DB "qrtable_payment"               ← Payment Service
│   ├── payments                         (HAS tenant_id)
│   ├── audit_payments                    (payment audit trail)
│   ├── outbox_events                     (`payment.completed`)
│   └── tenant_payment_settings           (HAS tenant_id — bank info + SePay OAuth tokens)
│
MongoDB Instance (1 server, port 27017)
├── DB "qrtable_auth"                   ← User-Access Service
│   ├── users                            (HAS tenant_id)
│ └── roles (NO tenant_id — global)

Removed from current scope:
└── Notification service / `qrtable_notification` is not part of the current runtime architecture.
```

**Note:** Kitchen service **does not have its own database** — uses Redis only for KDS queue (Sorted Set).

**Implementation status (June 6, 2026):** this database-per-service layout is active in local runtime and migration tooling. PostgreSQL schemas are owned by the service DataSources under `apps/*/src/database/`, and User-Access resolves MongoDB to `qrtable_auth`. The legacy `TYPEORM_DATABASE` / `MONGO_DB_NAME` fallback is disabled by default; local rollback requires the explicit `DATABASE_SHARED_FALLBACK_ENABLED=true` flag.

**Example of data isolation in a database (qrtable_catalog):**

```
┌─────────────────────────────────────────────────────┐
│  DB: qrtable_catalog                                 │
│                                                     │
│  Table: categories                                   │
│  ┌──────────┬───────────┬──────────────────┐        │
│  │ tenant_id│ id        │ name             │        │
│  ├──────────┼───────────┼──────────────────┤        │
│ │ t-001 │ cat-101 │ Pho & Vermicelli │ │
│ │ t-001 │ cat-102 │ Drinking water │ │
│  │ t-002    │ cat-201   │ Pizza            │        │
│  │ t-002    │ cat-202   │ Pasta            │        │
│  └──────────┴───────────┴──────────────────┘        │
│                                                     │
│  INDEX: (tenant_id, created_at)                     │
│  UNIQUE: (tenant_id, name)                          │
└─────────────────────────────────────────────────────┘
```

**Reasons for choosing the combined model:**

- **Database-per-service:** True to microservice standards → service independence, separate deployment/scale, schema evolution does not affect other services
- **Discriminator Column (tenant_id):** Optimized resources (1 PostgreSQL instance), simple migration, suitable for MVP/thesis
- **Trade-off:** No physical isolation between tenants (acceptable for thesis scope). If you need to upgrade → switch to Schema-per-tenant or Database-per-tenant

### 5.2 Enforcement Rules

```yaml
Database Level:
- Each service owns its own database:
  - CATALOG_TYPEORM_DATABASE=qrtable_catalog
  - ORDER_TYPEORM_DATABASE=qrtable_order
  - PAYMENT_TYPEORM_DATABASE=qrtable_payment
  - SAAS_TYPEORM_DATABASE=qrtable_saas
  - USER_ACCESS_MONGO_DB_NAME=qrtable_auth
- Schema lifecycle uses per-service TypeORM migrations; TYPEORM_SYNCHRONIZE=false
- Every tenant-scoped entity: tenant_id UUID NOT NULL
  - Tenant middleware and guards establish the request context.
  - There is no TypeORM `EntitySubscriberInterface` / `@EventSubscriber` implementation and no global query filter in the current source.
  - Every tenant-scoped repository/query receives `tenantId` and applies an explicit tenant predicate.
- Cross-service data: MUST be over TCP/Kafka, NOT direct DB access

Cache Level (Redis):
  - Key pattern: {entity}:{tenant_id}:{resource_id}
- Example: menu:t-001:categories, session:t-001:s-abc123
- Separate TTL according to entity type

Event Level (Kafka):
- Message payload always contains tenant_id
  - Consumers filter/route by tenant_id
- Topic naming: domain-level (order.created), NOT per tenant

WebSocket Level:
  - Room namespace: tenant:{id}:{role_group}
- Example: tenant:t-001:staff, tenant:t-001:kds:kitchen
  - Connection auth verify tenant ownership

File Storage Level:
  - Path: qrtable/{tenant_id}/{folder}/{filename}
- Presigned URL verify tenant ownership before when serve
```

### 5.3 Tenant Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      TENANT RESOLUTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Staff / Owner / Manager]                                      │
│  Header: Authorization: Bearer <JWT>                            │
│  → UserGuard: verify JWT (Keycloak + Redis cache)               │
│  → TenantGuard: extract tenant_id from JWT custom claims        │
│  → Inject tenant_id into RequestContext                          │
│  → Service/repository query receives tenantId and predicates it explicitly │
│                                                                 │
│  [Customer / Guest]                                             │
│  Headers: x-tenant-id; x-session-id after the customer joins    │
│  URL: https://{slug}.qrtable.io?table={id}&token={hmac}        │
│  → SessionGuard: validate session_id in Redis                   │
│  → Validate HMAC token → extract tenant_id from store mapping     │
│  → Inject tenant_id into RequestContext                          │
│  → Service/repository query receives tenantId and predicates it explicitly │
│                                                                 │
│  [Super Admin]                                                  │
│  Header: Authorization: Bearer <JWT>                            │
│  → UserGuard: verify JWT, assert role = SUPER_ADMIN             │
│  → TenantGuard bypasses tenant-equality enforcement; platform endpoints still require their declared permissions │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. DECLARATION OF MICROSERVICES

### 6.1 Service Catalog

| #   | service                 | Transport     | Databases             | Go there                                                                                                         |
| --- | ----------------------- | ------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **BFF service**         | HTTP + WS     | — (stateless)         | API Gateway, WebSocket Gateway, Guard chain, Swagger                                                             |
| 2   | **Authorizer service**  | gRPC + TCP    | — (Keycloak external) | JWT verification, token introspection, Keycloak admin operations                                                 |
| 3   | **SaaS Mgmt service**   | TCP           | PG: `qrtable_saas`    | tenant lifecycle, Pricing Plans, Subscription lifecycle, subscription invoices, suspend/source-of-truth cache    |
| 4   | **Catalog service**     | TCP           | PG: `qrtable_catalog` | Menu (Category + Item), Table & Area, QR token management                                                        |
| 5   | **Order service**       | TCP           | PG: `qrtable_order`   | Order state machine, Cart/Session cache, bills; stock **does not** write directly — calls Catalog TCP on confirm |
| 6   | **Kitchen service**     | TCP + Kafka   | Redis only            | KDS ticket/item routing, FIFO/priority queue, SLA monitoring; no batching                                        |
| 7   | **Payment service**     | TCP + Webhook | PG: `qrtable_payment` | Customer bill payments, tenant payment settings, SePay OAuth/settings, reconciliation                            |
| 8   | **User-Access service** | TCP           | Mongo: `qrtable_auth` | User profile, Role mapping, Staff management, tenant staff counts                                                |
| 9   | **Customer PWA**        | HTTP + WS     | —                     | Anonymous customer ordering UI, suspended-tenant read-only/payment behavior                                      |
| 10  | **Management App**      | HTTP + WS     | —                     | POS/KDS/Dashboard/Admin UI, subscription/payment settings, package-aware reporting dashboards                    |
| 11  | **Keycloak Theme**      | Static assets | —                     | Keycloak login/theme customization                                                                               |

### 6.2 Details by Domain

#### 6.2.1 BFF Service (API Gateway)

```
Responsibility:
- Single entry point for every client (REST + WebSocket)
  - Guard chain: UserGuard → SessionGuard → TenantGuard → CustomerTenantLifecycleGuard → PermissionGuard
  - Feature-gated tenant report routes add TenantSubscriptionContextGuard → PlanFeatureGuard
  - Swagger API documentation
  - Rate limiting (NestJS Throttler + Redis)
- Global Exception Interceptor (standardize error response)
  - Logger Middleware (process ID tracking across services)
  - WebSocket Gateway: Kafka/Internal event bridge + BFF Direct side-effects
- CORS, Body parser (20mb limit for image upload)
- Multer middleware: memory storage, stream to Cloudinary (does not save to disk)
  - Upload endpoint: POST /api/v1/admin/menu-items/:id/image (multipart/form-data)
- BFF Direct Side-Effects Pattern (AP1): handles WebSocket emit + cache invalidation
after TCP response for UI-layer events (see §7.3)

Communicate:
  - → Authorizer Service (gRPC): verify token
  - → Catalog/Order/Payment/SaaS Service (TCP): business operations
  - → SaaS Service (TCP): current subscription/features for plan-gated dashboard report routes
  - → Redis: token cache, rate limit counter
  - → Kafka: subscribe domain events that BFF may bridge (`kitchen.sla_warning`, `payment.completed`); order tracking uses BFF Direct after Order TCP response, and BFF must not emit KDS queue changes directly from `order.confirmed`
  - → Cloudinary: stream image upload (menu items)

No separate Database — BFF is just a proxy + orchestrator.
```

#### 6.2.2 Authorizer Service

```
Responsibility:
- gRPC server for BFF Guard
- verify JWT token with Keycloak JWKS endpoint
- Return user info: { sub, email, roles, tenant_id, sub_role }
- Manage Keycloak Admin API: create/delete users, assign roles

Communicate:
  - ← BFF Service (gRPC client)
  - → Keycloak (HTTP): JWKS, Admin REST API
  - → Redis (optional): JWKS public key cache

Keycloak Configuration:
  - 1 Realm: "qrtable"
  - Clients: bff-client, admin-client
  - Roles: SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA
  - Custom JWT Claims: tenant_id, sub_role (via Protocol Mapper)
```

#### 6.2.3 SaaS Management Service

```
Responsibility:
  - Tenant lifecycle source of truth: onboard, create/read/update, suspend, activate, close
  - Tenant status semantics: `status` (`ACTIVE` / `SUSPENDED` / `CLOSED`) drives behavior; legacy/public `isActive` is derived from `status === ACTIVE`
  - Pricing Plans management (FREE/BASIC/PREMIUM seed; public list + admin CRUD)
  - Subscription lifecycle: assign, checkout invoice, activate, cancel, expire, history
  - Subscription invoices (`subscription_invoices`): Tier 2 tenant → platform VietQR, status, manual confirm, SePay webhook handling
  - Feature gating support: canonical plan feature codes, current subscription cache, dashboard entitlement data, and target-service backup checks for limits
  - Subscription usage dashboard: resolve live table/staff/order counters through Catalog, User-Access and Order TCP; daily order usage uses `Asia/Ho_Chi_Minh`
  - Slug/Subdomain generation & uniqueness validation; reserved words are blocked in shared SaaS constants
  - Onboarding mini-saga: create tenant owner via Authorizer/User-Access and initialize Payment settings row; rollback/cleanup handles partial failure and orphan Keycloak users
  - Tenant suspend Redis flag: SaaS writes/clears `tenant:{tenantId}:suspended`; BFF guards read for edge enforcement
- Subscription cache: `subscription:{tenantId}` TTL 5 minutes
- Cron job: check subscription expiry daily `02:00 Asia/Ho_Chi_Minh`; grace period 24h before auto-suspend
  - Quota timezone: `max_orders_per_day` counter uses `Asia/Ho_Chi_Minh`
  - Legacy tenant migration defaults: FREE plan with no expiry, `isActive=false` → `SUSPENDED`, `default_currency=VND`, `default_locale=vi-VN`
  - SaaS outbox: publish accepted domain events after DB commit

Entities (PostgreSQL):
  - tenants: id, slug, name, type, address, status, owner_id,
             default_currency (default: VND), default_locale (default: vi-VN),
             operating_modes[] (enum: INSTANT_ORDER | DIGITAL_MENU, default: both),
             created_at
  - pricing_plans: id, code, name, price_vnd, max_tables, max_staff, max_orders_per_day, features, is_active
  - subscriptions: id, tenant_id, pricing_plan_id, plan_code_snapshot, price_vnd_snapshot,
                   starts_at, expires_at, status, source, source_invoice_id
  - subscription_invoices: id, tenant_id, pricing_plan_id, billing_reference (`QRSUB*`),
                           amount_vnd, status, qr_url, qr_expires_at, paid/manual confirmation fields
  - outbox_events: id, tenant_id, topic, event_type, aggregate_id, payload, status, attempts

Events emitted (Kafka):
  - tenant.created → trigger default data setup
  - subscription.activated / subscription invoice events use SaaS outbox where implemented/accepted;
    UI-only suspend notifications remain BFF/WebSocket side effects, not Kafka business events.
```

#### 6.2.3A Dashboard Reporting Read Models

Phase 4D reporting uses source-owner read models instead of a separate Analytics service.

| Surface            | BFF route family                                                         | RBAC permission   | Plan feature gate                   | Source service        |
| ------------------ | ------------------------------------------------------------------------ | ----------------- | ----------------------------------- | --------------------- |
| Tenant revenue     | `GET /dashboard/reports/revenue`                                         | `report.read_own` | `analytics_basic`                   | Payment               |
| Tenant orders      | `GET /dashboard/reports/orders`                                          | `report.read_own` | `analytics_basic`                   | Order                 |
| Tenant tables/menu | `GET /dashboard/reports/tables`                                          | `report.read_own` | `analytics_basic`                   | Catalog               |
| Platform analytics | `GET /admin/analytics/platform`                                          | `report.read_any` | none                                | SaaS                  |
| Tenant drilldown   | `GET /admin/analytics/tenants/:tenantId/reports/{revenue,orders,tables}` | `report.read_any` | none; selected tenant plan is shown | Payment/Order/Catalog |

Implementation rules:

- BFF controllers validate query shape, apply guards, inject tenant/actor context, and forward typed TCP payloads.
- BFF does not join databases and does not aggregate cross-service report data.
- Payment owns paid restaurant-bill revenue, method breakdown, and recent paid payments.
- Order owns order/bill status, average bill value, and top item aggregation.
- Catalog owns table status and catalog availability summaries.
- SaaS owns platform subscription revenue, tenant status counts, invoice status, and plan distribution.
- Tenant dashboard routes use `TenantSubscriptionContextGuard` to resolve `SUBSCRIPTION.GET_CURRENT`, then `PlanFeatureGuard` checks active subscription plus `PLAN_FEATURE_CODES.ANALYTICS_BASIC`.
- Management App derives `DashboardEntitlements` from `/dashboard/subscription`; locked widgets skip report API calls and render upgrade states.
- Super Admin platform analytics and tenant drilldown are not blocked by the selected tenant's plan features.

#### 6.2.4 Catalog Service

```
Responsibility:
  - Menu Management: Category CRUD, MenuItem CRUD
  - Menu Item Image Upload: Cloudinary SDK integration
    + Upload path: qrtable/{tenant_id}/menu/{uuid}.{ext}
    + Validation: max 5MB, types: image/jpeg, image/png, image/webp
    + Transformation: auto format, quality auto, max width 800px
+ Delete old image when update, keep the image when soft delete (audit)
  - Table & Area Management: Area CRUD, Table CRUD
  - QR Token: generate, validate, and regenerate HMAC-SHA256 tokens
  - Table State Machine: Available → Occupied → Billing → Cleaning
  - Sort ordering (drag & drop), time-based category visibility
- **Stock mutations for orders:** versioned TCP reservation/deduct/release commands; the reservation transition and `menu_items` mutation share one Catalog transaction. Order service **does not** write directly to Catalog tables.
- Table status updates: receive orders from Order/BFF flow (bill request, transfer saga, safe empty-session release) in Catalog transactions. Occupied/billing release must validate the matching `sessionId` before clearing `tables.session_id`.
  - Delete constraints:
→ Do not allow MenuItem to be deleted if order_item exists
with status IN (Pending, Processing, Ready) links to that menu_item_id
→ Do not allow table deletion if the table has an active session or Pending/Processing order
→ Soft delete: set deleted_at instead of permanently deleting, retaining data for audit
- QR PDF/template export is deferred; the current source has no QR PDF export flow.

Entities (PostgreSQL):
  - categories: id, tenant_id, name, sort_order, time_start, time_end, status
  - menu_items: id, tenant_id, category_id, name, description, price, image_url,
                stock, sort_order, status, deleted_at
  - stock_reservations: id, tenant_id, order_id, reservation_key, request_hash,
                        version, state, deduct_result, release_result, last_release_key, released_at
  - areas: id, tenant_id, name, sort_order
  - tables: id, tenant_id, area_id, name, capacity, status, qr_token, session_id

BFF Direct Side-Effects (AP1 — without Kafka, see §7.3):
  - Menu CRUD response → BFF invalidate Redis cache. Current code/spec does not claim menu realtime (`menu.updated`) after Step 2.7.
  - Table status change response → BFF emit WebSocket broadcast to staff

Caching (Redis):
  - `menu:{tenantId}` is the current public-menu cache (600 seconds). BFF invalidates it after menu-item/category writes.
  - A table-status Redis cache is deferred; table status remains Catalog-owned data.
```

#### 6.2.5 Order Service

```
Responsibility:
- Session Management: durable session in PostgreSQL (Order DB); Redis is active cache/TTL for fast path
- Empty session recovery: Order owns stale/closed empty-session release and the staff `release_empty_table_session` command; Catalog only updates the table after Order validates tenant/table/session ownership, `orderCount == 0`, no bill and no persisted orders
- Shared Cart: multi-device cart through Redis Hash + global cart version (optimistic concurrency)
- Order State Machine: persist from `PENDING` or higher; `DRAFT` refers to cart/UI. The matching business rules and accepted Order behavior are recorded in `business-logic.md` and `phases/phase-2a-order-kafka.md`.
- Stock: Order service **does not** mutate Catalog tables; when confirming (`PENDING → PROCESSING`), it asks Catalog to ensure a versioned reservation and stores the returned version.
  - Order cancellation persists cancellation state, actor, reason, and timestamp in the Order flow; there is no generic Order audit-log implementation. RBAC cancellation is state-specific — permission-matrix §6.1
- Bill is an Order service entity. It is tenant- and session-scoped and aggregates its included `orderIds`; it is not a separate Payment or Catalog aggregate.
- service Request: receive service requests from customers (call staff, request payment, support); bill request is an explicit command, `REQUEST_BILL` can be a side effect notification

Validation Rules:
- Tenant plan daily quota (`max_orders_per_day`) is enforced at order submit; per-session order cap is future hardening
- All timestamps use server UTC (Date.now()), DO NOT use client timestamps
- Cart validation: all items must be Available before when submit (availability snapshot)
- Stock deduct + pessimistic rules **in Catalog** at the time of staff confirmation

Entities (PostgreSQL):
  - sessions: durable session rows (tenant_id, table_id, …) — canonical according to Step 2.4
  - orders: id, tenant_id, table_id, session_id, status, total_amount,
            idempotency_key, stock_reservation_version, created_at, updated_at, deleted_at
  - order_items: id, order_id, menu_item_id, quantity, price, note, status
  - bills: id, tenant_id, session_id, subtotal, total, status, payment_method,
           rounding_amount (VND rounding delta)
  - service_requests: id, tenant_id, table_id, session_id, type
                      (enum: CALL_STAFF | REQUEST_BILL | GENERAL_HELP),
                      status (enum: PENDING | ACKNOWLEDGED | RESOLVED),
                      created_at

Redis (active cache — synchronized with durable session):
  - session:{tenant_id}:{session_id} → cache mirror + TTL/idle metadata
→ TTL: 2 hours (session lifetime)
→ Idle check: if last_activity > 30 minutes AND order_count == 0 → auto-close (session with orders will not close)
→ Redis expiry is not the source of truth. If an empty session becomes stale or is manually released, Order closes the durable session when needed, releases the bound Catalog table by `sessionId`, and deletes `session:*` plus `cart:*`.
- cart:{tenant_id}:{session_id} → Hash + cart-level version + line ids — see the Step 2.4 specification
    → TTL: bound to session TTL

Events emitted (Kafka):
  - order.confirmed → Kitchen Service (P1+P2); publish through the simplified outbox — implementation_plan §4
  - order.status_changed → durable Order status-change stream via outbox (P4); immediate UI still uses BFF Direct
  - order.completed → analytics pipeline (future)

BFF Direct Side-Effects (AP1 — without Kafka, see §7.3):
- order.created → BFF emit WS to tenant:{tid}:staff
  - order.status_changed → staff + session rooms (confirm/cancel/ready/served)
  - cart.updated → session:{sid}:customer (Step 2.4 contract)
- table.transferred → staff + session rooms (transfer completed)
- order.ready → BFF emit WS to tenant:{tid}:staff + session:{sid}:customer (when Kitchen TCP/BFF bridge)
- service.requested → BFF emit WS to tenant:{tid}:staff

Empty Table Session Release:
Trigger: Staff/Manager clicks the POS safe release action for an occupied table with no active orders.
- BFF route: `POST /api/v1/admin/tables/:tableId/release-empty-session`
- TCP command: `order.release_empty_table_session`
- Permission: `TABLE_UPDATE_STATUS`
- Order validates same tenant/table/session, `orderCount == 0`, no bill and no persisted orders, then closes the empty session if active, deletes Redis session/cart keys and asks Catalog to mark the matching table available.

Table Transfer (saga-style — non-ACID across Order PG + Catalog PG + Redis):
Trigger: Staff/Manager moves table
- Transfer lock + updates Order DB (orders/session rows), Redis cart/session payload, Catalog TCP (table status Available/Occupied)
- Compensation when the middle step fails
- UI/KDS updated via BFF Direct / status events — **no** added Kafka topic for table rename (registry §7.2)

Stock / confirm flow (cross-service):
Order (in transaction DB of Order): lock/include validate order `PENDING`
→ Catalog TCP: ensure the tenant/order reservation is `RESERVED`
  → Catalog locks the reservation and menu rows in deterministic order
  → reservation state/result/version and stock mutation commit atomically in Catalog
  → active same-key/same-payload replay returns the stored result without another deduction
  → success: Order commits `PROCESSING`, reservation version, items, and outbox → Kafka `order.confirmed`
  → acknowledged Order failure: release that exact version; duplicate release is replayed
  → reconfirm after release increments the version; an older release is stale and cannot restore stock again
  → lost response: Order remains `PENDING`; the caller must retry the same confirm to recover via Catalog replay
```

#### 6.2.6 Kitchen Service (KDS)

```
Responsibility:
- Kafka consumer: receives order.confirmed events
- Ticket routing: from `MenuItem.station` (KITCHEN / BAR) on payload — see Step 2.4
  - FIFO queue management: Redis Sorted Set (score = timestamp)
  - Ticket/item queue logic: one ticket per `(tenantId, orderId, station)`, ordered by FIFO + priority; no batching/GROUP BY
- SLA monitoring: warn when tickets exceed threshold (e.g., 15 min)
  - Status update: Pending → Processing → Ready
- Recall: rollback Ready → Processing (manual mistake)
- Priority flagging: push tickets to the top of the queue
- Kitchen owns no relational database. Its KDS state is Redis-only; the Redis repositories own ticket, SLA, recovery, and queue operations.

Data Store (Redis — no relational database):
  - `kds:{tenantId}:{station}` is the active Sorted Set queue.
  - `kds:{tenantId}:ticket:{ticketId}` is a ticket hash; related item, SLA, order, session, revision, and dedupe keys are defined with it in `kds-keys.ts`.

Events emitted (Kafka):
- kitchen.sla_warning → trigger manager alert (P2: generated by the internal timer)

BFF Direct Side-Effects (AP1 — without Kafka, see §7.3):
- kitchen.item_ready → BFF emit WS to tenant:{tid}:staff + session:{sid}:customer

WebSocket push (handled by BFF — Kitchen does not emit WS directly):
  - Kitchen Redis mutation → internal `kds.queue_changed` hint → BFF relay tenant:{tid}:kds:kitchen
  - Kitchen Redis mutation → internal `kds.queue_changed` hint → BFF relay tenant:{tid}:kds:bar
- BFF Direct → tenant:{tid}:staff — "Table 05 — Beef pho is ready"
- Kafka bridge → tenant:{tid}:management — kitchen.sla_warning (P2: generated by timer)
```

#### 6.2.7 Payment Service

```
Responsibility:
  - Customer bill payments (Tier 1 customer → tenant): VietQR/Cash settlement for Order bills
  - Tenant payment settings: per-tenant cash/VietQR enablement, selected bank account, connection status
  - SePay OAuth Connect/settings: authorization URL, callback token exchange, bank list, bank selection, webhook setup, disconnect
  - OAuth state cache: stores `oauth_state:{state}` in Redis for 5 minutes; in-memory fallback exists for isolated tests/dev
- VietQR (SePay): build dynamic QR URL (qr.sepay.vn) with rounded amount + bill reference
  - SePay Webhook: direct Phase 3 route verifies HMAC raw-body headers; Phase 4B tenant/platform routes carry `x-secret-key`; Payment matches bill reference and updates payment status
  - Cash payment: staff-confirmed flow
- VND Rounding: apply Math.ceil(amount / 1000) * 1000 before creating bill
- Payment records: save payment history (amount, method, timestamp)
- Bill finalization: lock bill when payment completed (immutable after Paid)
- Reconciliation data: aggregation by day/month, method (Dashboard payment history read-only)

Entities (PostgreSQL):
  - payments: id, tenant_id, bill_id, bill_reference, method (enum: CASH | VIETQR),
              raw_total, rounded_total, rounding_delta,
              amount_received, change_amount,
              sepay_transaction_id, sepay_reference_code,
              status (PENDING | PAID | FAILED), paid_at
  - audit_payments: id, payment_id, action, actor_id, meta JSONB, timestamp
  - tenant_payment_settings: id, tenant_id, cash_enabled, vietqr_enabled,
                             vietqr_bank_name/account_number/account_holder,
                             sepay_* token/webhook fields, connection_status
  - outbox_events: payment domain outbox for `payment.completed`

VND Rounding Logic:
  raw_total = Σ(item_price × quantity)
  rounded_total = Math.ceil(raw_total / 1000) * 1000
  rounding_delta = rounded_total - raw_total
→ Save all 3 values: raw_total, rounded_total, rounding_delta

VietQR Flow (SePay):
1. Staff select "VietQR" on POS → BFF → Payment service (TCP): createVietQR({ billId })
2. Payment service: calculate rounded_total, generate billReference = "QRTBL" + first 8 characters of billId after removing hyphens (UUID)
3. Read `tenant_payment_settings` to get the connected tenant bank; env `PAYMENT_SEPAY_QR_*` is just a dev fallback without settings
  4. Build QR URL: https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}
                    &amount={rounded_total}&des={billReference}
5. POS render <img src={qrUrl} /> — Customer scans and transfers money
  6. SePay → BFF webhook:
     - Direct Phase 3 route: POST /api/v1/payment/sepay/webhook with `X-SePay-Signature` + `X-SePay-Timestamp`
     - Phase 4B tenant route: POST /payment/sepay/webhook/:tenantSlug with `x-secret-key`
  7. BFF validates webhook authentication for the selected route and validates the body with runtime DTO validation (class-validator)
8. Payment service: match billReference in code/content; if amount < rounded_total → keep PENDING + audit SEPAY_WEBHOOK_UNDERPAID; if amount ≥ rounded_total → PAID, save paidAmount = actual amount received (overpaid accepted)
9. Save sepay_transaction_id; After committing, you can call Order TCP (BILL_MARK_PAID) as a synchronous fast path; Kafka payment.completed is still recovery/fan-out
10. Write outbox in the same DB transaction → publish Kafka: payment.completed

SePay OAuth / Tenant Payment Settings Flow (Phase 4B):
  1. Dashboard `/dashboard/payment-settings` → BFF → Payment TCP `payment_settings.generate_authorize_url`
  2. Payment stores `oauth_state:{state}` in Redis for 300s and returns SePay authorize URL
  3. Callback exchanges code for tokens, stores encrypted tokens in `tenant_payment_settings`, then lists bank accounts
  4. Tenant selects a bank; Payment calls SePay webhook API and marks settings CONNECTED
  5. BFF routes `QRTBL*` webhooks to Payment and `QRSUB*` platform webhooks to SaaS subscription invoice handler

Cash Flow:
1. Staff confirms "Cash collected" on POS
  2. BFF → Payment Service (TCP): confirmCashPayment({ billId, amountReceived })
  3. Payment Service: calculate change, update status = PAID, method = CASH
4. Record outbox → Kafka: payment.completed (and possibly TCP Order similar to VietQR — idempotent markPaid)

Events emitted (Kafka):
- payment.completed → Order consumer (idempotent BILL_MARK_PAID + Catalog TCP table status update) and BFF realtime bridge
```

#### 6.2.8 User-Access Service

```
Responsibility:
- Application user profile source of truth after when Keycloak verify identity
- Role mapping, staff membership, tenant assignment (`tenantId` on the user profile)
- Staff management for dashboard
- TCP `user.count_by_tenant` serving Phase 4B feature gating `max_staff`
- Upsert profile in onboarding mini-saga do SaaS orchestrate

Data Store:
  - MongoDB `qrtable_auth`: users, roles

Communicate:
  - ← BFF / SaaS Service (TCP): profile lookup/upsert/staff operations/counts
  - ← Authorizer/Keycloak claims are identity input, not the application profile source of truth
```

#### 6.2.9 Notification / Email Scope Decision

```
Current `apps/*` inventory does not contain `apps/notification`.
Email/push/audit notification behavior is outside the current implementation scope.
If this service is introduced later, it must declare its database, Kafka consumers, provider
configuration, retry policy, audit storage, and verification plan before being counted as runtime architecture.
```

---

## 7. INTER-service COMMUNICATION

### 7.1 Communication Matrix

| Protocol          | From → To                | Pattern          | When to use                                                       |
| ----------------- | ------------------------ | ---------------- | ----------------------------------------------------------------- |
| **HTTP REST**     | Client → BFF             | Request/Response | External API, Swagger                                             |
| **TCP**           | BFF → Business Services  | RPC (sync)       | Internal calls need immediate response                            |
| **gRPC**          | BFF → Authorizer service | RPC (sync)       | Authentication — high performance required                        |
| **Kafka**         | service → service        | Pub/Sub (async)  | Side-effects, event notification, decoupling                      |
| **WebSocket**     | BFF → Clients            | Push (real-time) | KDS updates, order tracking, table/status hints                   |
| **HTTP Webhook**  | SePay → BFF              | Event callback   | Payment confirmation; route-dependent HMAC or `x-secret-key` auth |
| **Redis Pub/Sub** | service → BFF WS Gateway | Pub/Sub          | Bridge internal → WebSocket broadcast (optional)                  |

### 7.2 Kafka Topic Registry

**Selection principle:** The system applies the 4P+2AP rule set (see §7.4) to decide which events use Kafka vs BFF Direct. Five topics pass the current code/test contract:

| Topic                  | Producer          | Consumer(s)                                                            | Principle  | Main payload                       |
| ---------------------- | ----------------- | ---------------------------------------------------------------------- | ---------- | ---------------------------------- |
| `order.confirmed`      | Order service     | Kitchen service                                                        | P1, P2     | `{ tenantId, orderId, items[] }`   |
| `order.status_changed` | Order service     | No current runtime consumer; durable status projection/audit extension | P4         | `{ tenantId, orderId, toStatus }`  |
| `payment.completed`    | Payment service   | Order service, BFF realtime bridge                                     | P1, P2, P3 | `{ tenantId, billId, method }`     |
| `kitchen.sla_warning`  | Kitchen service   | BFF realtime bridge                                                    | P2         | `{ tenantId, ticketId, waitTime }` |
| `tenant.created`       | SaaS Mgmt service | Catalog service                                                        | P1, P3     | `{ tenantId, ownerEmail, slug }`   |

> UI-layer events like `order.created`, `cart.updated`, `bill.requested`, `table.transferred`, `service.requested`, `kds.queue_changed`, `tenant.suspended/activated/closed` DO NOT use Kafka as the source of truth — instead use BFF Direct, Redis internal hints, or socket emit after the source service has been committed (see §7.3). `order.status_changed` is the exception: it is an approved durable Order outbox topic, while immediate WebSocket feedback still comes from BFF Direct after the TCP response.

### 7.3 BFF Direct Side-Effects Pattern

For events that only need to trigger UI-layer side-effects (WebSocket push, cache invalidation) without needing business logic in another bounded context, BFF processes directly after the TCP response — without going through Kafka:

```
BFF Controller (pseudo-code):
  const response = await this.client.send(TCP_PATTERN, payload);
  if (response.success) {
    // Side-effect 1: WebSocket broadcast
    this.wsGateway.emitToRoom(room, event, data);
// Side-effect 2: Cache invalidation (if necessary)
    await this.cacheManager.del(cacheKey);
  }
  return response;
```

| Trigger (TCP response at BFF) | WebSocket Room                                  | Cache Action                          |
| ----------------------------- | ----------------------------------------------- | ------------------------------------- |
| Order created                 | `tenant:{tid}:staff`                            | —                                     |
| Order status changed          | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                                     |
| Cart updated / conflict       | `session:{sid}:customer`                        | —                                     |
| Bill requested (explicit)     | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                                     |
| Table transferred             | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                                     |
| Menu item CRUD                | `tenant:{tid}:*` (broadcast all customers)      | `DEL menu:{tid}`                      |
| Table status changed          | `tenant:{tid}:staff`                            | No table-status Redis cache; deferred |
| Kitchen item ready            | `tenant:{tid}:staff` + `session:{sid}:customer` | —                                     |
| service requested             | `tenant:{tid}:staff`                            | —                                     |
| tenant suspended              | —                                               | `SET tenant:{tenantId}:suspended`     |

**Design rationale (AP1):** BFF is the only API Gateway. When the BFF calls TCP and receives the response, it already has enough information to perform UI side-effects. Using Kafka as an intermediary for single-consumer UI events violates AP1 — adding latency, complexity, and infrastructure cost without solving any domain problems.

### 7.4 Async Messaging Decision Framework (4P + 2AP)

Set of rules that decide when to use Kafka vs synchronous communication (TCP/gRPC) vs BFF Direct.

#### Inclusion Principles (When to use Kafka)

**P1 — Cross-Context Domain Reaction:**
Use Kafka when state change in Bounded Context A needs to trigger **independent business logic** in Bounded Context B. "Business logic" ≠ UI side-effect. Applicable regardless of the number of consumers.

**P2 — Temporal Decoupling:**
Use Kafka when the producer **DO NOT wait** for the consumer to finish processing — due to a long-running task, the consumer is temporarily unavailable, or an internally generated event (timer/cron) not associated with any TCP request.

**P3 — Domain Event Fan-out:**
Use Kafka when the same event needs to trigger a business response in **multiple bounded contexts**. Producers adhere to the Open/Closed Principle — adding new consumers does not modify producer code.

**P4 — Atomicity Safeguard (Transactional Outbox):**
When a domain event is the result of a DB write, the event **MUST** be written with the database transaction (Outbox Pattern) to avoid the Dual-Write Problem. Background process poll outbox → publish Kafka.

> **Current implementation:** `order.confirmed` and `order.status_changed` use the Order `outbox_events` table before publishing to Kafka. Full CDC / Debezium-style hardening remains future operational work beyond the representative Phase 4A Saga slice.

#### Exclusion Anti-patterns (When NOT to use Kafka)

**AP1 — Kafka as UI Proxy (PROHIBITED):**
DO NOT use Kafka just to bridge UI side-effects (WebSocket, cache) when the BFF already has enough information from the TCP response. Test: _"Side-effect needs business logic in another context?"_ → No → BFF Direct.

**AP2 — Sync for Fire-and-Forget (PROHIBITED):**
DO NOT use TCP/gRPC for producer tasks that do not require a response, especially long-running or temporarily unavailable consumers.

#### Decision Flowchart

```
Event needs to be handled?
  │
├─ Consumer needs to implement BUSINESS LOGIC in another bounded context?
  │   ├─ YES → Kafka (P1)
│ │ ├─ Many consumers? → Kafka (Additional P3)
│ │ └─ Need atomicity with DB? → Outbox Pattern (P4)
│ └─ NO → UI side-effect only
│ ├─ BFF got info from TCP response? → BFF Direct (AP1 bans Kafka)
│ └─ Event generated internally (timer, not through BFF)? → Kafka (P2)
  │
└─ Producer needs to wait for consumer?
      ├─ YES → TCP/gRPC (sync)
└─ NO, and consumer processing takes a long time → Kafka (P2, AP2 prohibit sync)
```

---

## 8. AUTHENTICATION & AUTHORIZATION

### 8.1 Dual Authentication Strategy

The system uses 2 parallel authentication streams:

### 8.1.1 Identity vs Application User Profile (Clarification)

The system uses a 2-layer model to avoid confusion when debugging auth:

1. Identity Layer (Keycloak)

- Credential authentication, JWT issuance, realm/client role management.
- Provide claims such as sub, email, tenant_id.

2. Application Profile Layer (user-access DB)

- Save internal user profiles, tenant assignments, professional roles/permissions.
- Used to authorize business APIs after the JWT is valid.

Important conclusion:

- JWT valid is a necessary condition.
- User profile provisioned in user-access is a sufficient condition.
- If the token is valid but does not have an internal profile: return 401 user_not_provisioned.

```
┌────────────────────────────────────────────────────────┐
│  FLOW 1: JWT Authentication (Staff / Owner / Admin)   │
│                                                        │
│  Client → Header: Authorization: Bearer <JWT>          │
│  BFF → UserGuard:                                      │
│    1. Extract token from header                        │
│    2. Check Redis cache: user-token:{sha256(token)}    │
│       → Cache HIT: return cached user data             │
│       → Cache MISS:                                    │
│         3. gRPC call → Authorizer Service → Keycloak verify │
│         4. Cache result in Redis (TTL: 30 min)         │
│    5. TenantGuard: extract tenant_id from JWT claims   │
│    6. PermissionGuard: verify permissions vs endpoint  │
│    7. Inject { userId, tenantId, role } → request ctx  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  FLOW 2: Session Authentication (Customer / Guest)    │
│                                                        │
│  Client → x-tenant-id; x-session-id after join + URL: ?table&token │
│  BFF → SessionGuard:                                   │
│    1. Validate HMAC token: verify(table_id, token, sk) │
│    2. Resolve tenant_id from table → tenant mapping    │
│    3. Resolve the joined session through Order/Redis:  │
│       session:{tenant_id}:{session_id}                 │
│    4. Verify session.table_id matches request          │
│    5. Inject { sessionId, tenantId, tableId } → ctx    │
│                                                        │
│ ⚠ No need for Keycloak — zero-friction customer UX │
└────────────────────────────────────────────────────────┘
```

#### 8.1.2 Management App (Next.js): navigation vs API testing

`management-app` applies **middleware + sidebar** according to **role** (Owner, MANAGER, WAITER, …) so that the user only sees the relevant **URL branches / tabs**. This is **not** a replacement for `PermissionGuard` on BFF: any sensitive write/read operations still require pass permission in the JWT/cache Authorizer. Standard full description: [permission matrix](architecture/permission-matrix.md) §9.

### 8.2 Guard Chain Architecture

### 8.2.1 Auth Error Taxonomy

For consistent telemetry and debugging, prioritize using 3 error groups:

1. 401 invalid_token

- The token has the wrong structure, wrong signature, expired, or cannot be verified.

2. 401 user_not_provisioned

- The token is valid but the userId (sub) has not been provisioned into the user-access DB.

3. 403 permission_denied

- Authenticated and has a profile, but does not have enough rights to perform actions.

4. 403 plan_feature_required

- Authenticated, permission check passed, but the active tenant subscription does not include the required SaaS plan feature for a feature-gated endpoint.

```
Request
  │
  ▼
[UserGuard / SessionGuard] ← Authentication: "Who are you?"
  │
  ▼
[TenantGuard] ← Isolation: "Which tenant are you in?"
  │
  ▼
[PermissionGuard] ← Permission: "Do you have the necessary permission?"
  │
  ▼
[TenantSubscriptionContextGuard] ← Entitlement context: "Which active plan/features apply?"
  │
  ▼
[PlanFeatureGuard] ← Package feature: "Does the plan unlock this feature?"
  │
  ▼
Controller → Service → Repository (explicit tenantId predicate)
```

### 8.3 Keycloak JWT Custom Claims

```json
{
  "sub": "user-uuid-123",
  "email": "owner@restaurant.com",
  "realm_access": {
    "roles": ["OWNER"]
  },
  "tenant_id": "t-001",
  "sub_role": null,
  "iat": 1707500000,
  "exp": 1707503600
}
```

Configure via Keycloak **Protocol Mapper** (type: User Attribute → Token Claim) for `tenant_id` and `sub_role`.

### 8.4 Summary Authorization Table

| Endpoint Pattern             | Super Admin | Owner/Manager    | Waiter | Chef/Bar | Customer |
| ---------------------------- | ----------- | ---------------- | ------ | -------- | -------- |
| `POST /admin/tenants`        | ✅          | ❌               | ❌     | ❌       | ❌       |
| `GET /admin/analytics`       | ✅          | ❌               | ❌     | ❌       | ❌       |
| `GET /dashboard/reports/*`   | ❌          | ✅ package-gated | ❌     | ❌       | ❌       |
| `CRUD /restaurant/menu`      | 🔍 Debug    | ✅               | ❌     | ❌       | ❌       |
| `CRUD /restaurant/tables`    | ❌          | ✅               | 👁️     | ❌       | ❌       |
| `POST /orders/confirm`       | ❌          | ✅               | ✅     | ❌       | ❌       |
| `PATCH /kds/tickets/:id`     | ❌          | ✅               | ❌     | ✅       | ❌       |
| `POST /orders` (submit)      | ❌          | ❌               | ❌     | ❌       | ✅       |
| `POST /payment/request-bill` | ❌          | ❌               | ❌     | ❌       | ✅       |
| `POST /payment/confirm-cash` | ❌          | ✅               | ✅     | ❌       | ❌       |
| `GET /menu` (public)         | ❌          | ✅               | ✅     | ❌       | ✅       |

---

## 9. REAL-TIME & WEBSOCKET

### 9.1 WebSocket Gateway Architecture

```
┌──────────────────────────────────────────────────┐
│              BFF Service                          │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │       @WebSocketGateway (Socket.io)      │    │
│  │                                          │    │
│  │  Connection Auth:                        │    │
│  │    → JWT handshake (Staff/Owner)         │    │
│  │    → x-tenant-id / x-session-id (Customer) │  │
│  │                                          │    │
│  │  Room Assignment on Connect:             │    │
│  │    Staff  → tenant:{tid}:staff           │    │
│  │    Chef   → tenant:{tid}:kds:kitchen     │    │
│  │    Bar    → tenant:{tid}:kds:bar         │    │
│  │    Waiter → tenant:{tid}:staff           │    │
│  │    Owner  → tenant:{tid}:management      │    │
│  │    Customer → session:{sid}:customer     │    │
│  └──────────────────────────────────────────┘    │
│           │                                      │
│           ├─ Kafka Consumer Bridge (2 topics):   │
│           │                                      │
│  ┌──────────────────────────────────────────┐    │
│  │  kitchen.sla_warning → tenant:{tid}:mgmt│    │
│  │  payment.completed → session:{sid}:cust (bridge follow-up; baseline polling) │    │
│  └──────────────────────────────────────────┘    │
│           │                                      │
│           ├─ Kitchen internal Redis hint:        │
│           │  kds.queue_changed → tenant:{tid}:kds:* after Redis write │
│           │                                      │
│           ├─ BFF Direct (sau TCP response):      │
│           │                                      │
│  ┌──────────────────────────────────────────┐    │
│  │  order.created     → tenant:{tid}:staff  │    │
│  │  kitchen.item_ready→ tenant:{tid}:staff  │    │
│  │  table.status_chg  → tenant:{tid}:staff │    │
│  │  service.requested → tenant:{tid}:staff │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 9.2 Real-time Use Cases

| Use Case                    | Source                                                                    | Event                  | WebSocket Room            | Push payload                         |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------- | ------------------------- | ------------------------------------ |
| New application for Staff   | BFF Direct                                                                | `order.created`        | `tenant:{tid}:staff`      | `{ tableId, items, total }`          |
| Order tracking (Customer)   | BFF Direct after Order TCP response                                       | `order.status_changed` | `session:{sid}:customer`  | `{ orderId, status: "Processing" }`  |
| KDS queue changed (Kitchen) | Kitchen Redis hint → BFF                                                  | `kds.queue_changed`    | `tenant:{tid}:kds:*`      | `{ station, revision, reason }`      |
| Item ready → notify waiter  | BFF Direct                                                                | `kitchen.item_ready`   | `tenant:{tid}:staff`      | `{ tableId, itemName: "Beef pho" }`  |
| Menu cache invalidation     | BFF/Catalog write path                                                    | no current WS event    | —                         | REST refetch reads invalidated cache |
| Table status change         | BFF Direct                                                                | `table.status_chg`     | `tenant:{tid}:staff`      | `{ tableId, status: "Billing" }`     |
| POS payment settled         | Kafka `payment.completed` → BFF realtime bridge; polling remains fallback | `payment.completed`    | `session:{sid}:customer`  | `{ status: "Paid", receipt_url }`    |
| SLA warning (overtime)      | Kafka → BFF                                                               | `kitchen.sla_warning`  | `tenant:{tid}:management` | `{ ticketId, waitingMin: 18 }`       |
| service Request (Customer)  | BFF Direct                                                                | `service.requested`    | `tenant:{tid}:staff`      | `{ tableId, type: "CALL_STAFF" }`    |

### 9.3 Scaling Strategy

When you need to scale BFF to multiple instances, use **Redis Adapter** for Socket.io:

```
Client A ──→ BFF Instance 1 ──→ Redis Pub/Sub ──→ BFF Instance 2 ──→ Client B
                                      ↑
Synchronize room state between instances
```

---

## 10. PAYMENT INTEGRATION

> **ADR (2026-05):** The system uses **SePay + VietQR** instead of Stripe to suit the Vietnamese market. No redirect to hosted page — QR code embedded directly in POS/Customer interface.

### 10.1 VietQR (SePay) Flow

```
┌──────┐    ┌───┐    ┌─────────┐    ┌───────┐    ┌──────┐
│Client│    │BFF│    │ Payment │    │ SePay │    │Order │
│ POS  │    │   │    │ Service │    │Webhook│    │ Svc  │
└──┬───┘    └─┬─┘    └────┬────┘    └───┬───┘    └──┬───┘
   │ VietQR   │           │             │           │
   │ Request  │           │             │           │
   ├─────────►│   TCP     │             │           │
   │          ├──────────►│ Build QR URL│           │
   │          │           │ (qr.sepay.vn)           │
   │          │◄──────────┤ qrUrl+meta  │           │
   │◄─────────┤           │             │           │
   │ Display  │           │             │           │
   │ QR inline│           │             │           │
   │          │           │  POST /webhook           │
   │          │◄──────────────────────┤           │
   │          │ webhook auth header(s)  │           │
   │          │   TCP     │             │           │
   │          ├──────────►│ Verify auth │           │
   │          │           │ Match code  │           │
   │          │           │ Update PAID │   TCP     │
   │          │           ├────────────────────────►│
   │          │           │ (fast path; idempotent)   │
   │          │  Outbox → Kafka: payment.completed   │
   │          │           │ (recovery / fan-out)      │
   │ Polling  │           │             │           │
   │ POS/PWA  │           │             │           │
   │◄─refetch─┤           │             │           │
```

> **Phase 3 baseline:** POS/Customer updates payment status mainly by **polling**; WebSocket real-time over Kafka bridge → BFF is just a hint of invalidate/refetch after correctness is stable. See phase record `docs/phases/phase-3-payment.md`.

### 10.2 Cash Payment Flow

```
1. Customer clicks "Request payment" → table.status = "Billing"
2. Staff view bill on POS → check total amount
3. Staff enters the amount of money given by the customer → the system calculates the change
4. Staff click "Confirm cash payment"
5. Payment service: records { method: "CASH", amount, received, change }
6. Same as VietQR: in a transaction, write payment PAID + outbox; after commit publish Kafka `payment.completed`. The Order service (consumer and/or TCP fast path idempotent) marks the PAID bill and passes the table `Billing` → `Cleaning` according to the Order stream — not considering Payment as a place to directly “close the session” (see D1, D4).
```

### 10.3 SePay Configuration

```yaml
Environment Variables:
  SEPAY_WEBHOOK_SECRET: "your_secret_key"   # Direct Phase 3 HMAC webhook secret
  SEPAY_PLATFORM_WEBHOOK_SECRET: "your_platform_secret"  # Phase 4B platform subscription webhook secret (QRSUB)
BFF_PAYMENT_TCP_TIMEOUT_MS: 5000           # BFF waits for Payment service over TCP
PAYMENT_SEPAY_QR_ACCOUNT: "0010000000355" # Receiving bank account number
PAYMENT_SEPAY_QR_BANK: "Vietcombank" # SePay-compatible bank name
PAYMENT_ORDER_TCP_TIMEOUT_MS: 5000         # Payment service waits for Order service over TCP
BILL_REF_PREFIX: "QRTBL" # Identification prefix in CK content
PAYMENT_TYPEORM_DATABASE: "qrtable_payment"  # Required staging/production; dedicated default in development

Webhook URL (configurable in SePay dashboard):
  POST https://{bff-host}/api/v1/payment/sepay/webhook
  auth_type: route-dependent
  event_type: In_only
  is_verify_payment: 1

Webhook Verification:
  # Direct Phase 3 route:
  #   BFF verifies X-SePay-Signature + X-SePay-Timestamp over `{timestamp}.{rawBody}` using SEPAY_WEBHOOK_SECRET.
  # Phase 4B tenant/platform routes:
  #   Tenant QRTBL route forwards x-secret-key to Payment, which verifies against
  #   tenant_payment_settings.webhook_secret_encrypted for the routed tenant.
  #   Platform QRSUB route forwards x-secret-key to SaaS, which verifies against
  #   SEPAY_PLATFORM_WEBHOOK_SECRET server-side config.
# Success response sent to SePay is raw JSON, does not use internal ResponseDto wrapper
  return {"success": true}

QR URL Format:
  https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}
&amount={rounded_total}&des={QRTBL + first 8 characters of billId after removing hyphens (UUID)}
```

---

## 11. CANONICAL REDIS OWNERSHIP

This section intentionally records only key builders and behavior present in the current source.

| Owner           | Current key / state                                                                   | TTL                                                           | Invalidation or lifecycle                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BFF public menu | `menu:{tenantId}` via `RedisKey.menu.public()`                                        | 600 seconds                                                   | `MenuPublicController` caches the public menu; menu-item and category writes delete this key.                                                                                                                                               |
| Order           | `session:{tenantId}:{sessionId}` and `cart:{tenantId}:{sessionId}` via `RedisKey`     | 2 hours (`SESSION_POLICY.TTL_MS`)                             | Session/cart writes refresh the TTL. Payment close and safe empty-session release delete both keys. Empty active sessions are eligible for the source-defined 30-minute idle-close rule.                                                    |
| Order quota     | `quota:{tenantId}:orders:{YYYY-MM-DD}`                                                | 48 hours                                                      | Increment sets the expiry only for a new counter; the date uses `Asia/Ho_Chi_Minh`.                                                                                                                                                         |
| SaaS            | `subscription:{tenantId}`                                                             | 300 seconds                                                   | SaaS writes the current-subscription snapshot and clears it on subscription lifecycle changes.                                                                                                                                              |
| SaaS / BFF      | `tenant:{tenantId}:suspended`                                                         | none set by the writer                                        | SaaS sets it to `1` on suspension and deletes it on activation; BFF's customer lifecycle guard reads it.                                                                                                                                    |
| Payment         | `oauth_state:{state}`                                                                 | 300 seconds                                                   | The OAuth callback reads and deletes the key; in-memory fallback exists only when the Redis client is absent.                                                                                                                               |
| Kitchen         | `kds:{tenantId}:{station}` active queue; ticket-related keys under `kds:{tenantId}:*` | active queues/tickets have no blanket TTL in the key registry | Kitchen is Redis-only. Dedupe event/ticket keys expire after 14 days, command dedupe after 24 hours, dead-letter order-confirmed after 7 days, SLA claims after 30 seconds, SLA dedupe after 24 hours, and rebuild locks after 120 seconds. |

No table-status Redis cache exists in the current source; do not introduce or document a `table:{tenantId}:{tableId}:status` key as current behavior.

---

## 12. DISTRIBUTED TRANSACTION PROCESSING

### 12.1 Saga Pattern — Orchestration

Applicable to complex business flows that require multiple services combined with compensation in case of failure.

**Order Confirmation Saga (representative Phase 4A slice):**

```
┌──────────────────────────────────────────────────────────┐
│                  ORDER CONFIRMATION SAGA                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Orchestrator: OrderConfirmSagaService (Order module)  │
│                                                          │
│  Step 1: Lock/validate order row in Order DB (PENDING)  │
│          and require current bill OPEN                  │
│                                                          │
│  Step 2: Catalog TCP ensures RESERVED version N          │
│          key=confirm-order:{orderId}; payload is hashed  │
│    ✗ Compensation: release reservation version N         │
│      key=confirm-order-compensation:{orderId}:{N}        │
│                                                          │
│  Step 3: Order DB commits PROCESSING rows, version N,     │
│          and order.confirmed outbox row                  │
│                                                          │
│  Step 4: Outbox poll publishes Kafka order.confirmed     │
│          for Kitchen consumer                            │
│                                                          │
│  IF step 3 fails after step 2 succeeds → release stock   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

SaaS onboarding is the second representative saga-style flow. `OnboardingSagaService` coordinates SaaS tenant/subscription creation, Authorizer owner identity, User-Access profile, Payment settings, and `tenant.created` outbox. When a dependent step fails, SaaS compensates by disabling the owner user, removing initial subscription/cache state, and deleting the partially created tenant.

Payment completion is currently documented as settlement + outbox + idempotent retry/finalization baseline. It is not claimed as a full Payment Complete Saga with durable saga state and compensation for every session/table failure mode.

**Validation strategy for thesis evidence:** Saga verification is multi-layered rather than a single browser proof. Order Confirm uses unit/contract tests for orchestration and every reservation state transition. Opt-in PostgreSQL plus Catalog TCP tests prove duplicate deduct, discarded-response retry, versioned compensation/reconfirm, stale release, and two-order contention. SaaS onboarding uses unit/contract tests for rollback rules, opt-in PostgreSQL integration for tenant/subscription/outbox persistence and rollback, and opt-in live Payment TCP integration for Payment-owned settings creation. UI screenshots, DB rows, outbox rows, and logs are supporting artifacts; they do not replace automated tests. The canonical evidence guide is `docs/testing/saga-validation-strategy.md`.

### 12.2 Idempotency

```yaml
Strategy:
- Each order submission carries idempotency key: {session_id}:{timestamp}:{hash}
- Payment webhook: SePay payload.id (sepay_transaction_id) is natural idempotency key
- Kafka consumer: dedup by message key + consumer offset

Implementation:
- Order submit: PostgreSQL UNIQUE/replay on the `idempotency_key` column
- Catalog persists one `(tenant_id, order_id)` stock reservation with a stable deduct key, immutable payload hash, stored results, state, and monotonically increasing version
- Active deduct replay and matching release replay do not mutate stock; stale release cannot affect a newer version
- Order stores the returned reservation version and uses it in compensation and processing-order cancellation
- Ambiguous response recovery requires retrying the original confirm; there is no autonomous recovery worker or exactly-once TCP claim
- Redis SET NX can be added later for edge request throttling, but is not required to describe current order submit behavior
```

---

## 13. OBSERVABILITY & MONITORING

### 13.1 Implemented Application Observability

```
┌──────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📋 LOGS (Loki + Promtail + Grafana)                     │
│    • Docker container logs → Promtail auto-discover      │
│    • Structured JSON logs (Pino logger)                  │
│    • LogQL queries: {app="order"} |= "ERROR"             │
│    • Process ID tracking across services                  │
│                                                          │
│  📈 METRICS (Prometheus + Grafana)                       │
│    • HTTP request duration, status codes                  │
│    • Kafka consumer lag                                  │
│    • Redis cache hit/miss ratio                          │
│    • Active WebSocket connections per tenant              │
│    • Orders per minute (business metric)                  │
│                                                          │
│  🔍 TRACES (Tempo + OpenTelemetry)                       │
│    • End-to-end request tracing                          │
│    • Context propagation: BFF → TCP → Kafka → Consumer   │
│    • Latency breakdown per service hop                   │
│    • Identify bottlenecks in distributed flow             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 13.2 Health Checks

Each service expose health endpoint checks:

| Service     | Health Checks                                                                     |
| ----------- | --------------------------------------------------------------------------------- |
| BFF         | Redis connection, TCP clients reachable                                           |
| Authorizer  | Keycloak reachable, gRPC listener active                                          |
| Catalog     | PostgreSQL connection                                                             |
| Order       | PostgreSQL connection, Redis connection, Kafka                                    |
| Kitchen     | Redis connection, Kafka consumer status                                           |
| Payment     | PostgreSQL connection, Redis OAuth state cache, SePay webhook/OAuth config loaded |
| SaaS Mgmt   | PostgreSQL connection, Redis suspend/subscription cache                           |
| User-Access | MongoDB connection                                                                |

### 13.3 Alerting

Alert thresholds, routing, and delivery are deployment configuration rather than application facts; they are not asserted here as active monitoring behavior.

---

## 14. IMPLEMENTATION STRATEGY

### 14.1 Docker Compose Configuration

The following is repository configuration, not evidence of a deployed or publicly reachable environment. Public exposure, monitoring access control, retention, alert routing, and operational capacity require separate deployment verification.

```yaml
# docker-compose.infra.yaml — Datastores and identity
services:
  postgres:     # PostgreSQL 16, qrtable-data
  mongodb:      # MongoDB 7, qrtable-data
  redis:        # Redis 7, qrtable-data
  kafka:        # Kafka KRaft, qrtable-data
  keycloak:     # HTTP 8080, management 9000, qrtable-identity + qrtable-data

# docker-compose.app.yaml — Application Services
services:
  production-bootstrap: # one-shot migrations, ownership, Kafka topics, Keycloak bootstrap
  bff:          # HTTP 3300 — API Gateway + Socket.IO
  authorizer:   # gRPC/TCP — Authorizer
  catalog:      # TCP — Menu & Table
  order:        # TCP — Order processing
  kitchen:      # TCP — KDS
  payment:      # TCP — Payment + SePay webhook
  saas:         # TCP — Tenant/subscription management
  user-access:  # TCP — User profiles/roles
  management-app: # HTTP 3000 — authenticated frontend
  customer-pwa:   # HTTP 80 — customer frontend

# docker-compose.monitoring.yaml — observability configuration
services:
  grafana:      # HTTP 3000, qrtable-observability
  loki:         # HTTP 3100, private
  promtail:     # Docker log collection
  prometheus:   # HTTP 9090, private
  tempo:        # HTTP 3200 / OTLP 4318, private

# docker-compose.proxy.yaml — reverse-proxy configuration
services:
  caddy:        # publishes 80/tcp, 443/tcp, 443/udp
```

The Compose files define service/network relationships and ports. They do not by themselves prove that Caddy, Grafana, Prometheus, Loki, or Tempo are deployed, reachable, secured, or monitored in an environment.

### 14.2 Build Pipeline

```bash
# Development
pnpm nx serve bff              # Start single service
pnpm nx run-many -t serve      # Start all services
pnpm nx run-many -t test       # Run all tests
pnpm nx run-many -t lint       # Lint all projects
pnpm nx affected -t test       # Test only affected by changes

# Docker Build (Multi-stage, trusted workstation or CI)
pnpm nx run-many -t build      # Build all apps
docker compose -f docker-compose.infra.yaml up -d   # Infra
docker compose -f docker-compose.monitoring.yaml up -d # Monitoring

# Production Deploy
tools/deploy/phase7-preflight.sh                    # Host, env, capacity, Compose
pnpm deploy:bootstrap:compose                      # Fail-fast schema/topic/identity bootstrap
docker compose -f docker-compose.app.yaml up -d    # Apps after bootstrap gate
docker compose -f docker-compose.proxy.yaml up -d  # Proxy after DNS/firewall readiness
```

### 14.3 Environment Strategy

| Environment    | Database  | Kafka  | Keycloak | SePay         | Monitoring |
| -------------- | --------- | ------ | -------- | ------------- | ---------- |
| **Local**      | Docker PG | Docker | Docker   | SePay sandbox | Optional   |
| **Staging**    | Docker PG | Docker | Docker   | SePay sandbox | Full stack |
| **Production** | Docker PG | Docker | Docker   | Approved mode | Full stack |

---

## 15. TECHNICAL CHALLENGES

### 15.1 List of Challenges & Solutions

| #   | Challenge                                                                   | Solution                                                                                                                                         | Complexity |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1   | **Real-time multi-client sync** (KDS, order tracking, payment/tenant hints) | NestJS WebSocket Gateway + Socket.io + Kafka/internal hints → WS bridge + Redis Adapter for horizontal scale                                     | Cao        |
| 2   | **Multi-tenant data isolation**                                             | Tenant middleware/guards establish context; tenant-scoped repositories and queries explicitly predicate `tenantId`                               | Cao        |
| 3   | **Shared Cart concurrent modification**                                     | Redis Hash + Optimistic Concurrency (version field) + WebSocket broadcast on change                                                              | Medium     |
| 4   | **Stock race condition** (many people order the same dish)                  | Catalog service owns `menu_items`: lock + deduct in transaction Catalog; Order calls TCP idempotent when confirming (see Step 2.4 specification) | Average    |
| 5   | **KDS FIFO/Priority + SLA**                                                 | Redis Sorted Set (score=priority/time) + ticket/item snapshots + scheduled SLA check; no batching/GROUP BY                                       | Medium     |
| 6   | **Anonymous Customer auth** (zero-friction)                                 | Session-based auth via Redis + HMAC token validation + separate Guard chain                                                                      | Medium     |
| 7   | **Session lifecycle** (dual timeout, multi-device)                          | Session lifetime = 2h (Redis TTL), idle timeout = 30min (cron check `last_activity`) + cart sync via WebSocket                                   | Medium     |
| 8   | **Offline writes** (Customer PWA/POS)                                       | Deferred: no source-backed IndexedDB/Background Sync write queue or automatic replay                                                             | Planned    |
| 9   | **Distributed transaction** (order confirm saga)                            | Saga Orchestration pattern + compensation steps + idempotent operations                                                                          | Medium     |
| 10  | **Subscription feature gating**                                             | SaaS plan features + subscription cache + BFF `PlanFeatureGuard` for package-gated routes                                                        | Small      |

### 15.2 Deployment Priorities (Phased)

The order below is the canonical roadmap after closing Phase 4D.1; When detailed status is needed, use `docs/implementation_plan.md` as the truth source.

```txt
Phase 0 — Foundation / setup:
└── Completed.

Phase 1 — Catalog + Menu + Table:
└── Completed.

Phase 2A — Permissions + Order + Kafka:
└── Completed.

Phase 2B — Kitchen/KDS + WebSocket:
└── Completed.

Phase 3 — Payment (SePay/VietQR + Cash):
└── Completed.

Phase 4A — Saga + Hardening:
└── Representative Saga slice implemented; full hardening remains future work.

Phase 4B — SaaS + Tenant Onboarding:
└── Completed.

Phase 4C — Staff Management:
└── Accepted scope: tenant staff create/update/enable-disable/role-change/delete according to RBAC. Payroll, scheduling, and attendance are deferred. Former Step 4.5 Notification Service is removed from current scope.

Phase 4D — Dashboard + Reporting:
└── Completed. Includes report permissions, source-owner reporting read models, package feature gating, and dashboard UI polish.

Phase 5 + Phase 7 — Testing + Deploy:
└── In progress. Phase 7 deployment foundation and Task 11 preparation are implemented; DigitalOcean provisioning, public HTTPS, smoke, recovery, and demo evidence remain.
```

---

## 16. OFFLINE & SYNC STRATEGY

### 16.1 Client-side Offline (Customer PWA)

Customer order writes are online-only. IndexedDB/Background Sync write queues, automatic order replay, and a sync indicator are deferred; a network failure requires an explicit retry after connectivity returns.

### 16.2 Staff-side Offline (POS/KDS)

No source-backed staff/POS/KDS offline write queue is documented as current behavior. Any future queue must preserve tenant context and use the owning write flow's idempotency contract.

### 16.3 Sync & Conflict Resolution Strategy

Offline conflict resolution and Background Sync retry policy are deferred with the write-queue feature; they are not current architecture contracts.

---

_This document is a high-level technical architectural design. Next step: Detailed Database Schema Design and API Contract Specification for each service._
