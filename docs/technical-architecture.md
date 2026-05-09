# KIẾN TRÚC KỸ THUẬT HỆ THỐNG QRTABLE

> **Đề tài (Tiếng Việt):** Nghiên cứu và xây dựng nền tảng SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices

> **Đề tài (Tiếng Anh):** Design and Implementation of a SaaS-Based POS Platform with Integrated QR Code Ordering Using a Microservices Architecture

> **Phiên bản:** 1.0 &nbsp;|&nbsp; **Cập nhật:** 2026-02-10

---

## MỤC LỤC

1. [Tổng quan Hệ thống](#1-tổng-quan-hệ-thống)
2. [Nguyên tắc Kiến trúc](#2-nguyên-tắc-kiến-trúc)
3. [Kiến trúc Tổng thể](#3-kiến-trúc-tổng-thể)
4. [Ngăn xếp Công nghệ](#4-ngăn-xếp-công-nghệ)
5. [Chiến lược Multi-tenancy](#5-chiến-lược-multi-tenancy)
6. [Phân rã Microservices](#6-phân-rã-microservices)

7. [Giao tiếp Liên dịch vụ](#7-giao-tiếp-liên-dịch-vụ)
8. [Xác thực & Phân quyền](#8-xác-thực--phân-quyền)
9. [Real-time & WebSocket](#9-real-time--websocket)
10. [Tích hợp Thanh toán](#10-tích-hợp-thanh-toán)
11. [Chiến lược Caching](#11-chiến-lược-caching)
12. [Xử lý Giao dịch Phân tán](#12-xử-lý-giao-dịch-phân-tán)
13. [Observability & Monitoring](#13-observability--monitoring)
14. [Chiến lược Triển khai](#14-chiến-lược-triển-khai)
15. [Các Thách thức Kỹ thuật](#15-các-thách-thức-kỹ-thuật)
16. [Chiến lược Offline & Đồng bộ](#16-chiến-lược-offline--đồng-bộ-offline--sync-strategy)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Mô tả

QRTable là nền tảng SaaS (Software as a Service) phục vụ ngành F&B, cho phép nhiều nhà hàng (Tenants) cùng vận hành trên một hạ tầng phần mềm duy nhất. Hệ thống số hóa toàn bộ quy trình đặt món tại bàn thông qua mã QR — từ quét mã, duyệt menu, đặt món, theo dõi tiến độ bếp, đến thanh toán — tất cả diễn ra real-time.

### 1.2 Phạm vi Kỹ thuật

| Khía cạnh            | Quyết định                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **Kiểu kiến trúc**   | Event-Driven Microservices                                              |
| **Mô hình SaaS**     | Multi-Tenant, Database-per-Service + Discriminator Column (`tenant_id`) |
| **Giao tiếp**        | TCP (sync), gRPC (auth), Kafka (async), WebSocket (push)                |
| **Tổ chức mã nguồn** | Nx Monorepo                                                             |
| **Triển khai**       | Docker + Docker Compose                                                 |
| **Môi trường**       | Self-hosted VPS / Cloud VM                                              |

### 1.3 Actors

| Actor                   | Phạm vi         | Xác thực                  | Giao diện chính |
| ----------------------- | --------------- | ------------------------- | --------------- |
| **Super Admin**         | Cross-Tenant    | JWT (Keycloak)            | Admin Dashboard |
| **Restaurant Owner**    | Tenant(s) riêng | JWT (Keycloak)            | Management App  |
| **Staff** (Waiter/Chef) | Tenant được gán | JWT (Keycloak)            | POS / KDS       |
| **Customer** (Guest)    | Session/Table   | Anonymous Session (Redis) | PWA via QR      |

---

## 2. NGUYÊN TẮC KIẾN TRÚC

| #   | Nguyên tắc                      | Áp dụng                                                                                 |
| --- | ------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | **Database per Service**        | Mỗi microservice sở hữu schema/bảng riêng, không truy cập trực tiếp DB dịch vụ khác     |
| 2   | **Tenant Isolation by Default** | Mọi entity chứa `tenant_id`; middleware tự động inject filter vào mọi query             |
| 3   | **Event-Driven Decoupling**     | Giao tiếp async qua Kafka events; service không gọi trực tiếp nhau cho side-effects     |
| 4   | **API Gateway as Single Entry** | BFF Service là điểm vào duy nhất từ client, xử lý auth/routing/rate-limit               |
| 5   | **Cache-First for Hot Data**    | Menu, table status, user token được cache trong Redis; giảm tải DB                      |
| 6   | **Fail-Safe & Idempotent**      | Mọi write operation có idempotency key; Saga compensation cho distributed tx            |
| 7   | **Observe Everything**          | Centralized logging (Loki), metrics (Prometheus), tracing (Tempo)                       |
| 8   | **Server Timestamp (UTC)**      | Mọi timestamp sử dụng `server UTC` (`Date.now()`); KHÔNG dùng client timestamp          |
| 9   | **VND Rounding Convention**     | Tất cả số tiền VND làm tròn đến hàng nghìn: `Math.ceil(amount / 1000) * 1000`           |
| 10  | **Session Lifecycle**           | Session lifetime = 2 giờ (max), idle timeout = 30 phút (auto-close nếu không hoạt động) |

---

## 3. KIẾN TRÚC TỔNG THỂ

### 3.1 Sơ đồ Kiến trúc Hệ thống

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
│                        Port 3000 — HTTP REST                            │
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
│  │ 🔐 Auth    │  │ 📋 Catalog │  │ 🍽️ Order   │  │ 🏪 SaaS Mgmt    │  │
│  │ Service    │  │ Service    │  │ Service    │  │ Service          │  │
│  │ (gRPC)     │  │ (TCP)      │  │ (TCP)      │  │ (TCP)            │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ 💳 Payment │  │ 👨‍🍳 Kitchen │  │ 📧 Notify  │  │ 🔔 Notification  │  │
│  │ Service    │  │ (KDS) Svc  │  │ (Mail) Svc │  │ Service          │  │
│  │ (TCP)      │  │ (TCP)      │  │ (Kafka)    │  │ (Kafka+WS)       │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────────┘  │
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

### 3.2 Luồng Dữ liệu Chính

```
[Customer quét QR]
    │
    ▼
BFF → validate token (HMAC) → resolve tenant_id + table_id
    │
    ├──→ Catalog Service (TCP): lấy menu theo tenant
    │       └── Redis cache hit? → trả về cache : query PostgreSQL → cache → trả về
    │
    ├──→ Order Service (TCP): submit order
    │       ├── Validate availability snapshot (submit ≠ deduct stock; persisted row starts at `PENDING`)
    │       ├── Persist order (+ bill on first submit per session) → PostgreSQL Order DB
    │       └── Return response → BFF
    │           └── BFF Direct: emit WebSocket → notify Staff POS (AP1)
    │
    └──→ Staff confirm (Order Service TCP orchestrates)
            ├── Catalog Service (TCP): transactional stock deduct (Catalog owns `menu_items`)
            ├── Order DB commit + simplified outbox → Kafka: `order.confirmed` (P1+P2), payload enriched — đặc tả Step 2.4
            └── Kitchen Service (Kafka consumer):
                    ├── Route ticket (e.g. `MenuItem.station`): KITCHEN vs BAR
                    ├── Redis Sorted Set (FIFO queue)
                    └── Publish internal KDS invalidation hint after Redis write → BFF WebSocket → KDS screens
    │
    └──→ Payment Service (TCP): process payment
            ├── VietQR: build QR URL (qr.sepay.vn) → POS display → SePay webhook → X-Secret-Key verify → update status
            ├── OR Cash: staff confirm → update status
            ├── Emit Kafka: "payment.completed"
            └── WebSocket → notify Customer + update table status
```

---

## 4. NGĂN XẾP CÔNG NGHỆ

### 4.1 Bảng Quyết định Công nghệ

| Tầng                 | Công nghệ                              | Vai trò                                            | Lý do chọn                                                |
| -------------------- | -------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| **Framework**        | NestJS + TypeScript                    | Backend framework cho toàn bộ microservices        | Enterprise-grade, DI tốt, hỗ trợ TCP/gRPC/Kafka/WS native |
| **Monorepo**         | Nx                                     | Tổ chức mã nguồn, shared libs, task pipeline       | Dependency graph, affected builds, code generation        |
| **Database (chính)** | PostgreSQL + TypeORM                   | Persistent storage cho business data               | ACID, Pessimistic Locking, phù hợp relational model F&B   |
| **Database (phụ)**   | MongoDB + Mongoose                     | Audit log, analytics, flexible schema data         | Schema-less cho log/event data, time-series friendly      |
| **Cache**            | Redis                                  | Token cache, session store, menu cache, rate limit | Sub-millisecond latency, Sorted Set cho FIFO, Pub/Sub     |
| **Message Broker**   | Apache Kafka                           | Event streaming, async decoupling                  | High-throughput, consumer groups, at-least-once delivery  |
| **Identity**         | Keycloak                               | User management, OAuth 2.0/OIDC, SSO               | Enterprise IAM, realm/client model, social login          |
| **Payment**          | SePay (VietQR)                         | Thanh toán chuyển khoản ngân hàng VN               | VietQR động inline, Webhook X-Secret-Key, không phí cổng  |
| **Real-time**        | Socket.io (NestJS GW)                  | WebSocket bidirectional                            | Room-based, auto-reconnect, fallback transport            |
| **File Storage**     | Cloudinary                             | Hình ảnh menu, QR export                           | CDN tích hợp, image transformation, free tier             |
| **Monitoring**       | Grafana + Loki + Promtail              | Centralized logging & dashboard                    | PLG Stack, LogQL, Docker-native log collection            |
| **Metrics**          | Prometheus                             | Application & infra metrics                        | Pull-based, PromQL, Grafana integration                   |
| **Tracing**          | Grafana Tempo + OTel                   | Distributed tracing                                | OpenTelemetry standard, context propagation               |
| **Container**        | Docker + Docker Compose                | Containerization & orchestration                   | Reproducible environments, service isolation              |
| **Code Quality**     | ESLint + Prettier + Husky + Commitlint | Lint, format, commit convention                    | Team consistency, pre-commit hooks                        |

### 4.2 Tổ chức Nx Monorepo

```
qrtable/
├── apps/
│   ├── # ── Backend Services ──────────────────
│   ├── bff/                    # API Gateway (HTTP + WebSocket)
│   ├── auth/                   # Authorizer Service (gRPC)
│   ├── catalog/                # Menu & Table Management (TCP)
│   ├── order/                  # Order Processing (TCP)
│   ├── kitchen/                # KDS Service (TCP + Kafka Consumer)
│   ├── payment/                # Payment Service (TCP + Webhook)
│   ├── saas/                   # SaaS Management Service (TCP)
│   ├── notification/           # Mail + Push Notification (Kafka Consumer)
│   ├── # ── Frontend Apps ─────────────────────
│   ├── customer-pwa/           # 📱 Customer PWA (React + Vite)
│   └── management-app/         # 💻 Management App (Next.js — POS/KDS/Dashboard/Admin)
├── libs/
│   ├── # ── Backend Shared (Flat structure từ khóa học) ───────
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
│   ├── shared/utils/           # Pure functions, formatters (Dùng chung)
│   ├── # ── Frontend Shared ───────────────────────────────────
│   ├── frontend/ui/            # UI components (Shadcn-based, sử dụng chung 2 app)
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

#### 4.2.1 Hiện trạng `libs/shared/types` (đồng bộ tài liệu — 2026-04)

Sơ đồ §4.2 phía trên mô tả **mục tiêu** “contract chung FE & BE”. **Trong codebase hiện tại**, `libs/shared/types` (`@einvoice/types`) chủ yếu được **customer-pwa**, **management-app**, **libs/shared/mock-data** và **libs/shared/constants** import; các service NestJS trong monorepo dùng **`@common/*`** (interfaces, entities, DTO) cho tầng HTTP/TCP. Hướng tiếp theo (OpenAPI client, package types được BFF validate, v.v.) nên được lên kế hoạch riêng khi siết hợp đồng FE–BE.

### 4.3 Frontend Tech Stack (Chi tiết)

**Chiến lược 2 ứng dụng:** Thay vì 4 app riêng biệt, hệ thống frontend được tổ chức thành **2 app độc lập** trong Nx Monorepo — tối ưu khối lượng phát triển, dùng chung shared libraries, trong khi vẫn tách biệt rõ ràng giữa Customer (anonymous) và Internal (authenticated).

| Thành phần                | Công nghệ                                | Lý do chọn                                                              |
| ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| **App 1: Customer PWA**   | React + Vite, TypeScript, Service Worker | Tải nhanh, offline-first, mobile-first, build nhẹ, không cần SSR        |
| **App 2: Management App** | Next.js (App Router) + React 18          | Role-based routing, auth middleware, SSR/CSR linh động, layout phức tạp |
| **State/Data**            | React Query + Zustand                    | Server-state rõ ràng, local state nhẹ, cache & refetch tốt              |
| **Real-time**             | Socket.io client                         | Reconnect, room-based updates theo tenant/session                       |
| **Form & Validation**     | React Hook Form + Zod                    | Validation schema-based, UX tốt                                         |
| **UI System**             | Tailwind CSS + Shadcn UI + Lucide React  | Component library chuẩn hóa, dễ mở rộng, icon đồng bộ hệ sinh thái      |
| **Charts/Analytics**      | Shadcn/UI Charts + Chart.js              | Trực quan hóa báo cáo doanh thu, SLA, order throughput                  |

### 4.4 Kiến trúc Ứng dụng Frontend (2-App Architecture)

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
│  │  Offline: SW + IDB   │   │  └── Tenant context          │    │
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
│  │  Cache Layer: IndexedDB (offline queue) + SW cache        │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc kiến trúc frontend:**

- **2-App Separation**: Customer (anonymous, PWA) tách riêng; mọi authenticated actors gộp vào 1 Management App với role-based routing.
- **Role-based routing (không phải role-based app)**: Dùng Next.js middleware + Keycloak role để điều hướng — cùng 1 app, khác layout/pages theo role.
- **Phân tầng phân quyền (tạm thời, Phase 2.x):** UI (`management-app`) dùng **role → vùng route + sidebar**; BFF vẫn enforce **permission từng API** (canonical matrix). Chi tiết: [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md) §9.
- **BFF as single API**: mọi request đều qua BFF, không gọi trực tiếp microservice.
- **Real-time first**: staff/kitchen ưu tiên WebSocket, customer ưu tiên REST + cache.
- **Offline-first (Customer PWA)**: cache menu + queue hành động offline.
- **Tenant routing**: subdomain `{slug}.qrtable.io` resolve tenant_id trước khi render.
- **Shared Libraries**: UI components, hooks, types được chia sẻ giữa 2 app qua Nx libs.

### 4.5 Chi tiết theo ứng dụng

#### App 1: Customer PWA

| Khía cạnh         | Chi tiết                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| **Actor**         | Customer / Guest (anonymous)                                                   |
| **Entry point**   | QR Scan → `https://{slug}.qrtable.io?table={id}&token={hmac}`                  |
| **Auth**          | Session-based (Redis) — không cần đăng nhập                                    |
| **Tech**          | React + Vite + TypeScript + Service Worker                                     |
| **Core features** | Menu browsing, shared cart, order submit, order tracking, payment request      |
| **Offline**       | Service Worker cache (menu), IndexedDB queue (pending orders), auto-retry sync |
| **Real-time**     | Socket.io → room `session:{sid}:customer` (order status, menu updates)         |

#### App 2: Management App (Role-based)

| Khía cạnh       | Chi tiết                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------- |
| **Actors**      | Staff (Waiter, Chef, Barista), Owner/Manager, Super Admin                                           |
| **Entry point** | `https://app.qrtable.io/login` → Keycloak OAuth                                                     |
| **Auth**        | JWT (Keycloak) — middleware kiểm tra role, redirect theo role sau login                             |
| **Tech**        | Next.js (App Router) + React 18 + TypeScript                                                        |
| **Real-time**   | Socket.io → rooms theo role (`tenant:{tid}:staff`, `tenant:{tid}:kds:*`, `tenant:{tid}:management`) |

**Role → Route Mapping (Next.js Middleware):**

```typescript
// middleware.ts — Role-based redirect sau đăng nhập
const ROLE_ROUTES = {
  SUPER_ADMIN: '/admin', // Quản lý platform
  OWNER: '/dashboard', // Dashboard nhà hàng
  MANAGER: '/dashboard', // Dashboard nhà hàng (quyền hẹp hơn Owner)
  WAITER: '/pos', // POS — xác nhận đơn, thanh toán
  CHEF: '/kds/kitchen', // KDS — màn hình bếp
  BARISTA: '/kds/bar', // KDS — màn hình bar
};
```

### 4.6 Hệ thống giao diện — Page Structure (Management App)

**Route `/dashboard/*` — Owner/Manager:**

```
Dashboard
  ├── / (Tổng quan doanh thu: daily/weekly/monthly)
  ├── /menu (Menu Management: Category, Item, Stock)
  ├── /tables (Table & Area Management, QR export)
  ├── /staff (Staff & Role Management)
  ├── /orders (Orders & Bills: history, status, refund)
  ├── /subscription (Subscription & Plan)
  └── /settings (Store profile, branding, operating mode)
```

**Route `/admin/*` — Super Admin:**

```
Platform Ops
  ├── / (Platform Overview)
  ├── /tenants (Tenant Directory: search, suspend, activate)
  ├── /plans (Pricing Plan Management)
  ├── /analytics (Usage & Revenue Analytics)
  ├── /health (System Health: services, Kafka lag, error rate)
  └── /support (Support Tools: impersonate tenant, audit logs)
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

## 5. CHIẾN LƯỢC MULTI-TENANCY

### 5.1 Mô hình: Database-per-Service + Discriminator Column (`tenant_id`)

Hệ thống kết hợp **2 pattern** bổ sung cho nhau:

1. **Database-per-Service** (Microservice pattern): Mỗi microservice sở hữu database riêng biệt, không truy cập trực tiếp database của service khác. Cross-service data access thông qua TCP hoặc Kafka events.

2. **Shared Database per Tenant — Discriminator Column** (Multi-tenancy pattern): Trong mỗi database của từng service, tất cả tenants chia sẻ cùng tables. Cô lập dữ liệu được thực thi bằng cột `tenant_id` trên mọi tenant-scoped entity.

```
PostgreSQL Instance (1 server, port 5432)
│
├── DB "qrtable_saas"                   ← SaaS Management Service
│   ├── tenants                          (KHÔNG có tenant_id — root entity)
│   ├── pricing_plans                    (KHÔNG có tenant_id — platform-level)
│   └── subscriptions                    (CÓ tenant_id)
│
├── DB "qrtable_catalog"                ← Catalog Service
│   ├── categories                       (CÓ tenant_id)
│   ├── menu_items                       (CÓ tenant_id)
│   ├── areas                            (CÓ tenant_id)
│   └── tables                           (CÓ tenant_id)
│
├── DB "qrtable_order"                  ← Order Service
│   ├── orders                           (CÓ tenant_id)
│   ├── order_items                      (CÓ tenant_id)
│   ├── bills                            (CÓ tenant_id)
│   └── service_requests                 (CÓ tenant_id)
│
├── DB "qrtable_payment"               ← Payment Service
│   ├── payments                         (CÓ tenant_id)
│   └── refunds                          (CÓ tenant_id)
│
MongoDB Instance (1 server, port 27017)
├── DB "qrtable_auth"                   ← User-Access Service
│   ├── users                            (CÓ tenant_id)
│   └── roles                            (KHÔNG có tenant_id — global)
│
├── DB "qrtable_notification"           ← Notification Service
│   └── notification_logs                (CÓ tenant_id)
```

**Lưu ý:** Kitchen Service **không có database riêng** — sử dụng Redis only cho KDS queue (Sorted Set).

**Ví dụ data isolation trong 1 database (qrtable_catalog):**

```
┌─────────────────────────────────────────────────────┐
│  DB: qrtable_catalog                                 │
│                                                     │
│  Table: categories                                   │
│  ┌──────────┬───────────┬──────────────────┐        │
│  │ tenant_id│ id        │ name             │        │
│  ├──────────┼───────────┼──────────────────┤        │
│  │ t-001    │ cat-101   │ Phở & Bún        │        │
│  │ t-001    │ cat-102   │ Nước uống        │        │
│  │ t-002    │ cat-201   │ Pizza            │        │
│  │ t-002    │ cat-202   │ Pasta            │        │
│  └──────────┴───────────┴──────────────────┘        │
│                                                     │
│  INDEX: (tenant_id, created_at)                     │
│  UNIQUE: (tenant_id, name)                          │
└─────────────────────────────────────────────────────┘
```

**Lý do chọn mô hình kết hợp:**

- **Database-per-Service:** Đúng chuẩn microservice → service independence, deploy/scale riêng, schema evolution không ảnh hưởng service khác
- **Discriminator Column (tenant_id):** Tối ưu tài nguyên (1 PostgreSQL instance), đơn giản migration, phù hợp MVP/luận văn
- **Trade-off:** Không có physical isolation giữa tenants (chấp nhận được cho scope luận văn). Nếu cần nâng cấp → chuyển sang Schema-per-Tenant hoặc Database-per-Tenant

### 5.2 Enforcement Rules

```yaml
Database Level:
  - Mỗi service sở hữu database riêng (env: TYPEORM_DATABASE=qrtable_{service})
  - Mọi tenant-scoped entity: tenant_id UUID NOT NULL
  - Composite indexes: (tenant_id, id), (tenant_id, created_at)
  - Unique constraints bao gồm tenant_id: UNIQUE(tenant_id, table_name)
  - TypeORM Entity Subscriber: auto-set tenant_id on INSERT
  - Global Query Filter: auto-append WHERE tenant_id = :tid
  - Cross-service data: PHẢI qua TCP/Kafka, KHÔNG truy cập DB trực tiếp

Cache Level (Redis):
  - Key pattern: {entity}:{tenant_id}:{resource_id}
  - Ví dụ: menu:t-001:categories, session:t-001:s-abc123
  - TTL riêng biệt theo entity type

Event Level (Kafka):
  - Message payload luôn chứa tenant_id
  - Consumer filter/route theo tenant_id
  - Topic naming: domain-level (order.created), KHÔNG per-tenant

WebSocket Level:
  - Room namespace: tenant:{id}:{role_group}
  - Ví dụ: tenant:t-001:staff, tenant:t-001:kds:kitchen
  - Connection auth verify tenant ownership

File Storage Level:
  - Path: qrtable/{tenant_id}/{folder}/{filename}
  - Presigned URL verify tenant ownership trước khi serve
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
│  → Inject tenant_id vào RequestContext                          │
│  → Repository auto-filter WHERE tenant_id = :tid                │
│                                                                 │
│  [Customer / Guest]                                             │
│  Cookie: session_id=xxx                                         │
│  URL: https://{slug}.qrtable.io?table={id}&token={hmac}        │
│  → SessionGuard: validate session_id trong Redis                │
│  → Validate HMAC token → extract tenant_id từ store mapping     │
│  → Inject tenant_id vào RequestContext                          │
│  → Repository auto-filter WHERE tenant_id = :tid                │
│                                                                 │
│  [Super Admin]                                                  │
│  Header: Authorization: Bearer <JWT>                            │
│  → UserGuard: verify JWT, assert role = SUPER_ADMIN             │
│  → Không inject tenant_id (cross-tenant access)                 │
│  → Hoặc query param ?tenant_id=xxx cho debug mode               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. PHÂN RÃ MICROSERVICES

### 6.1 Service Catalog

| #   | Service                  | Transport     | Database               | Vai trò                                                                                                     |
| --- | ------------------------ | ------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **BFF Service**          | HTTP + WS     | — (stateless)          | API Gateway, WebSocket Gateway, Guard chain, Swagger                                                        |
| 2   | **Auth Service**         | gRPC          | — (Keycloak external)  | JWT verification, token introspection, user info retrieval                                                  |
| 3   | **SaaS Mgmt Service**    | TCP           | PG: `qrtable_saas`     | Tenant CRUD, Subscription lifecycle, Pricing Plans                                                          |
| 4   | **Catalog Service**      | TCP           | PG: `qrtable_catalog`  | Menu (Category + Item), Table & Area, QR token management                                                   |
| 5   | **Order Service**        | TCP           | PG: `qrtable_order`    | Order state machine, Cart/Session cache, bills; stock **không** ghi trực tiếp — gọi Catalog TCP khi confirm |
| 6   | **Kitchen Service**      | TCP + Kafka   | Redis only             | KDS ticket/item routing, FIFO/priority queue, SLA monitoring; no batching                                   |
| 7   | **Payment Service**      | TCP + Webhook | PG: `qrtable_payment`  | SePay VietQR, Cash flow, Payment records, Reconciliation                                                    |
| 8   | **Notification Service** | Kafka         | Mongo: `qrtable_notif` | Email (SMTP), Push events, Audit log                                                                        |
| 9   | **User-Access Service**  | TCP           | Mongo: `qrtable_auth`  | User profile, Role mapping, Staff management                                                                |

### 6.2 Chi tiết theo Domain

#### 6.2.1 BFF Service (API Gateway)

```
Trách nhiệm:
  - Điểm vào duy nhất cho mọi client (REST + WebSocket)
  - Guard chain: UserGuard → SessionGuard → TenantGuard → PermissionGuard
  - Swagger API documentation
  - Rate limiting (NestJS Throttler + Redis)
  - Global Exception Interceptor (chuẩn hóa error response)
  - Logger Middleware (process ID tracking across services)
  - WebSocket Gateway: Kafka/Internal event bridge + BFF Direct side-effects
  - CORS, Body parser (20mb limit cho image upload)
  - Multer middleware: memory storage, stream to Cloudinary (không lưu disk)
  - Upload endpoint: POST /api/v1/admin/menu-items/:id/image (multipart/form-data)
  - BFF Direct Side-Effects Pattern (AP1): xử lý WebSocket emit + cache invalidation
    sau TCP response cho UI-layer events (xem §7.3)

Giao tiếp:
  - → Auth Service (gRPC): verify token
  - → Catalog/Order/Payment/SaaS Service (TCP): business operations
  - → Redis: token cache, rate limit counter
  - → Kafka: subscribe domain events that BFF may bridge (`order.confirmed` → customer session tracking only, `kitchen.sla_warning`, `payment.completed`); BFF must not emit KDS queue changes directly from `order.confirmed`
  - → Cloudinary: stream image upload (menu items)

Không có Database riêng — BFF chỉ là proxy + orchestrator.
```

#### 6.2.2 Auth Service

```
Trách nhiệm:
  - gRPC server cho BFF Guard
  - Verify JWT token với Keycloak JWKS endpoint
  - Trả về user info: { sub, email, roles, tenant_id, sub_role }
  - Quản lý Keycloak Admin API: tạo/xóa user, assign role

Giao tiếp:
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
Trách nhiệm:
  - Tenant CRUD (create, read, update, suspend, activate)
  - Subscription lifecycle: chọn gói → activate → renew → expire
  - Pricing Plans management (Lite, Pro, Enterprise)
  - Feature gating: kiểm tra giới hạn theo plan (max tables, features)
  - Slug/Subdomain generation & uniqueness validation
  - Cron job: kiểm tra subscription expiry, auto-suspend

Entities (PostgreSQL):
  - tenants: id, slug, name, type, address, status, owner_id,
             default_currency (default: VND), default_locale (default: vi-VN),
             operating_modes[] (enum: INSTANT_ORDER | DIGITAL_MENU, default: both),
             created_at
  - pricing_plans: id, name, max_tables, max_staff, features_json, price
  - subscriptions: id, tenant_id, plan_id, starts_at, expires_at, status

Events emitted (Kafka):
  - tenant.created → trigger default data setup
  - tenant.suspended → block all operations
  - subscription.renewed → update feature limits
```

#### 6.2.4 Catalog Service

```
Trách nhiệm:
  - Menu Management: Category CRUD, MenuItem CRUD
  - Menu Item Image Upload: Cloudinary SDK integration
    + Upload path: qrtable/{tenant_id}/menu/{uuid}.{ext}
    + Validation: max 5MB, types: image/jpeg, image/png, image/webp
    + Transformation: auto format, quality auto, max width 800px
    + Delete old image khi update, giữ image khi soft delete (audit)
  - Table & Area Management: Area CRUD, Table CRUD
  - QR Token: sinh HMAC-SHA256 token, validate, re-generate
  - Table State Machine: Available → Occupied → Billing → Cleaning
  - Sort ordering (drag & drop), time-based category visibility
  - **Stock mutations for orders:** endpoint/command TCP transactional (reserve/deduct/release) — Order Service **không** ghi trực tiếp `menu_items` (Phase 2A Step 2.4)
  - Table status updates: nhận lệnh từ Order/BFF flow (bill request, transfer saga) trong transaction của Catalog
  - Delete constraints:
    → Không cho xóa MenuItem nếu tồn tại order_item
      với status IN (Pending, Processing, Ready) liên kết đến menu_item_id đó
    → Không cho xóa Table nếu table đang có session active hoặc đơn hàng Pending/Processing
    → Soft delete: set deleted_at thay vì xóa vĩnh viễn, giữ lại dữ liệu cho audit
  - Xuất QR dạng PDF/ảnh để in ấn (QR template rendering)

Entities (PostgreSQL):
  - categories: id, tenant_id, name, sort_order, time_start, time_end, status
  - menu_items: id, tenant_id, category_id, name, description, price, image_url,
                stock, sort_order, status, deleted_at
  - areas: id, tenant_id, name, sort_order
  - tables: id, tenant_id, area_id, name, capacity, status, qr_token, session_id

BFF Direct Side-Effects (AP1 — không qua Kafka, xem §7.3):
  - Menu CRUD response → BFF invalidate Redis cache + WebSocket broadcast to customers
  - Table status change response → BFF emit WebSocket broadcast to staff

Caching (Redis):
  - menu:{tenant_id} → full menu JSON (TTL: 10 min, invalidate on change)
  - table:{tenant_id}:{table_id}:status → current status (TTL: none, explicit update)
```

#### 6.2.5 Order Service

```
Trách nhiệm:
  - Session Management: durable session trong PostgreSQL (Order DB); Redis là active cache/TTL cho fast path
  - Shared Cart: multi-device cart qua Redis Hash + cart version toàn cục (optimistic concurrency)
  - Order State Machine: persist từ `PENDING` trở lên; `DRAFT` chỉ cart/UI — xem docs/business-logic-step-2.4-spec.vi.md §3.1
  - Stock: Order Service **không** mutate `menu_items`; khi confirm (`PENDING → PROCESSING`) gọi Catalog Service (TCP) để deduct trong transaction của Catalog
  - Order cancellation (soft delete + audit log); RBAC cancel theo state — permission-matrix §6.1
  - Bill aggregation: một bill/session; tạo ở submit order đầu tiên; `OPEN → PENDING_PAYMENT` trong Step 2.4; `PAID` → Phase 3
  - Service Request: nhận yêu cầu phục vụ từ khách (gọi nhân viên, yêu cầu thanh toán, hỗ trợ); bill request là explicit command, `REQUEST_BILL` có thể là side effect thông báo

Validation Rules:
  - max_orders_per_session = 20 items (chống spam/đơn ảo)
  - Mọi timestamp dùng server UTC (Date.now()), KHÔNG dùng client timestamp
  - Cart validation: all items must be Available trước khi submit (availability snapshot)
  - Stock deduct + pessimistic rules **trong Catalog** tại thời điểm staff confirm

Entities (PostgreSQL):
  - sessions: durable session rows (tenant_id, table_id, …) — canonical theo Step 2.4
  - orders: id, tenant_id, table_id, session_id, status, total_amount,
            idempotency_key, created_at, updated_at, deleted_at
  - order_items: id, order_id, menu_item_id, quantity, price, note, status
  - bills: id, tenant_id, session_id, subtotal, total, status, payment_method,
           rounding_amount (VND rounding delta)
  - service_requests: id, tenant_id, table_id, session_id, type
                      (enum: CALL_STAFF | REQUEST_BILL | GENERAL_HELP),
                      status (enum: PENDING | ACKNOWLEDGED | RESOLVED),
                      created_at

Redis (active cache — đồng bộ với durable session):
  - session:{tenant_id}:{session_id} → cache mirror + TTL/idle metadata
    → TTL: 2 giờ (session lifetime)
    → Idle check: nếu last_activity > 30 phút VÀ order_count == 0 → auto-close (session có đơn thì không đóng)
  - cart:{tenant_id}:{session_id} → Hash + cart-level version + line ids — xem đặc tả Step 2.4
    → TTL: bound to session TTL

Events emitted (Kafka):
  - order.confirmed → Kitchen Service (P1+P2); publish qua simplified outbox — implementation_plan §4
  - order.completed → analytics pipeline (future)

BFF Direct Side-Effects (AP1 — không qua Kafka, xem §7.3):
  - order.created → BFF emit WS tới tenant:{tid}:staff
  - order.status_changed → staff + session rooms (confirm/cancel/ready/served)
  - cart.updated → session:{sid}:customer (Step 2.4 contract)
  - table.transferred → staff + session rooms (transfer hoàn tất)
  - order.ready → BFF emit WS tới tenant:{tid}:staff + session:{sid}:customer (khi Kitchen TCP/BFF bridge)
  - service.requested → BFF emit WS tới tenant:{tid}:staff

Table Transfer (saga-style — không ACID xuyên Order PG + Catalog PG + Redis):
  Trigger: Staff/Manager chuyển bàn
  - Transfer lock + cập nhật Order DB (orders/session rows), Redis cart/session payload, Catalog TCP (table status Available/Occupied)
  - Compensation khi bước giữa fail
  - UI/KDS được cập nhật qua BFF Direct / status events — **không** thêm Kafka topic cho rename bàn (registry §7.2)

Stock / confirm flow (cross-service):
  Order (trong transaction DB của Order): khóa/kèm validate order `PENDING`
  → Catalog TCP: deduct/reserve stock idempotent trong DB Catalog
  → success: Order `PROCESSING`, ghi outbox → Kafka `order.confirmed`
```

#### 6.2.6 Kitchen Service (KDS)

```
Trách nhiệm:
  - Kafka consumer: nhận order.confirmed events
  - Ticket routing: từ `MenuItem.station` (KITCHEN / BAR) trên payload — xem Step 2.4
  - FIFO queue management: Redis Sorted Set (score = timestamp)
  - Ticket/item queue logic: one ticket per `(tenantId, orderId, station)`, ordered by FIFO + priority; no batching/GROUP BY
  - SLA monitoring: cảnh báo khi ticket quá threshold (e.g., 15 min)
  - Status update: Pending → Processing → Ready
  - Recall: rollback Ready → Processing (nhầm tay)
  - Priority flagging: đẩy ticket lên đầu queue

Data Store (Redis — không cần PostgreSQL riêng):
  - kds:{tenant_id}:kitchen → Sorted Set { ticket_id: timestamp }
  - kds:{tenant_id}:bar → Sorted Set { ticket_id: timestamp }
  - ticket:{ticket_id} → Hash { order_id, table_name, items, status, created_at }

Events emitted (Kafka):
  - kitchen.sla_warning → trigger manager alert (P2: sinh bởi internal timer)

BFF Direct Side-Effects (AP1 — không qua Kafka, xem §7.3):
  - kitchen.item_ready → BFF emit WS tới tenant:{tid}:staff + session:{sid}:customer

WebSocket push (do BFF xử lý — Kitchen không emit WS trực tiếp):
  - Kitchen Redis mutation → internal `kds.queue_changed` hint → BFF relay tenant:{tid}:kds:kitchen
  - Kitchen Redis mutation → internal `kds.queue_changed` hint → BFF relay tenant:{tid}:kds:bar
  - BFF Direct → tenant:{tid}:staff — "Bàn 05 — Phở bò đã xong"
  - Kafka bridge → tenant:{tid}:management — kitchen.sla_warning (P2: sinh bởi timer)
```

#### 6.2.7 Payment Service

```
Trách nhiệm:
  - VietQR (SePay): build QR URL động (qr.sepay.vn) với số tiền làm tròn + bill reference
  - SePay Webhook: xác thực X-Secret-Key header, match bill reference, update payment status
  - Cash payment: staff-confirmed flow
  - VND Rounding: áp dụng Math.ceil(amount / 1000) * 1000 trước khi tạo bill
  - Payment records: lưu lịch sử thanh toán (amount, method, timestamp)
  - Bill finalization: lock bill khi payment completed (immutable sau Paid)
  - Refund flow (manual): Owner/Manager tạo record, Staff xác nhận sau khi chuyển tay
  - Reconciliation data: aggregation theo ngày/tháng, phương thức

Entities (PostgreSQL):
  - payments: id, tenant_id, bill_id, bill_reference, method (enum: CASH | VIETQR),
              raw_total, rounded_total, rounding_delta,
              amount_received, change_amount,
              sepay_transaction_id, sepay_reference_code,
              status (PENDING | PAID | REFUND_PENDING | REFUNDED | FAILED), paid_at
  - refunds: id, tenant_id, payment_id, amount, reason,
             requested_by_user_id, requested_at,
             confirmed_by_user_id, confirmed_at,
             customer_bank_account, customer_bank_name, customer_account_name,
             status (PENDING_STAFF_ACTION | CONFIRMED | CANCELED)
  - audit_payments: id, payment_id, action, actor_id, meta JSONB, timestamp

VND Rounding Logic:
  raw_total = Σ(item_price × quantity)
  rounded_total = Math.ceil(raw_total / 1000) * 1000
  rounding_delta = rounded_total - raw_total
  → Lưu cả 3 giá trị: raw_total, rounded_total, rounding_delta

VietQR Flow (SePay):
  1. Staff chọn "VietQR" trên POS → BFF → Payment Service (TCP): createVietQR({ billId })
  2. Payment Service: tính rounded_total, sinh billReference = "QRTBL" + billId.slice(0,8)
  3. Build QR URL: https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}
                    &amount={rounded_total}&des={billReference}
  4. POS render <img src={qrUrl} /> — Khách quét và chuyển khoản
  5. SePay → BFF webhook: POST /api/v1/payment/sepay/webhook
     Headers: X-Secret-Key: {SEPAY_WEBHOOK_SECRET}
  6. BFF: so sánh X-Secret-Key → reject 401 nếu không khớp
  7. Payment Service: match billReference trong code/content, verify amount ≥ rounded_total
  8. Update payment status = PAID, lưu sepay_transaction_id
  9. Emit Kafka: payment.completed

Cash Flow:
  1. Staff confirms "Đã thu tiền mặt" on POS
  2. BFF → Payment Service (TCP): confirmCashPayment({ billId, amountReceived })
  3. Payment Service: calculate change, update status = PAID, method = CASH
  4. Emit Kafka: payment.completed

Refund Flow (Manual — Demo/Luận văn):
  1. Owner/Manager tạo refund request: { paymentId, reason, customerBankAccount? }
  2. Payment Service: tạo refund record PENDING_STAFF_ACTION, update payment REFUND_PENDING
  3. Staff/Owner chuyển khoản tay qua app ngân hàng dựa vào customerBankAccount hiển thị
  4. Staff/Owner bấm "Xác nhận đã hoàn tiền" → status CONFIRMED
  5. Ghi audit_payments, Emit Kafka: payment.refunded

Events emitted (Kafka):
  - payment.completed → close session, update table status, archive bill
  - payment.refunded → adjust reconciliation data, notify owner
```

#### 6.2.8 Notification Service

```
Trách nhiệm:
  - Kafka consumer: subscribe multiple topics
  - Email sending: welcome email, payment receipt, daily report
  - Audit log persistence: lưu mọi business event vào MongoDB
  - Template rendering: EJS templates cho email

Kafka Subscriptions:
  - tenant.created → send welcome email to owner
  - payment.completed → send receipt email (if email provided)
  - payment.refunded → notify owner, log audit trail

Data Store:
  - MongoDB: audit_logs collection (flexible schema, time-series)
  - Email templates: EJS files trong service

Giao tiếp:
  - → SMTP Server: send email (Nodemailer)
  - → Cloudinary (optional): download attachment
```

---

## 7. GIAO TIẾP LIÊN DỊCH VỤ

### 7.1 Communication Matrix

| Giao thức         | Từ → Đến                 | Pattern          | Khi nào dùng                                   |
| ----------------- | ------------------------ | ---------------- | ---------------------------------------------- |
| **HTTP REST**     | Client → BFF             | Request/Response | External API, Swagger                          |
| **TCP**           | BFF → Business Services  | RPC (sync)       | Gọi nội bộ cần response ngay                   |
| **gRPC**          | BFF → Auth Service       | RPC (sync)       | Authentication — cần hiệu năng cao             |
| **Kafka**         | Service → Service        | Pub/Sub (async)  | Side-effects, event notification, decoupling   |
| **WebSocket**     | BFF → Clients            | Push (real-time) | KDS updates, order tracking, menu sync         |
| **HTTP Webhook**  | SePay → BFF              | Event callback   | Payment confirmation (X-Secret-Key header)     |
| **Redis Pub/Sub** | Service → BFF WS Gateway | Pub/Sub          | Bridge nội bộ → WebSocket broadcast (optional) |

### 7.2 Kafka Topic Registry

**Nguyên tắc chọn lọc:** Hệ thống áp dụng bộ quy tắc 4P+2AP (xem §7.4) để quyết định event nào dùng Kafka vs BFF Direct. Chỉ 5 topics vượt qua bộ lọc:

| Topic                 | Producer          | Consumer(s)                  | Principle  | Payload chính                      |
| --------------------- | ----------------- | ---------------------------- | ---------- | ---------------------------------- |
| `order.confirmed`     | Order Service     | Kitchen Service              | P1, P2     | `{ tenantId, orderId, items[] }`   |
| `payment.completed`   | Payment Service   | Order, Catalog, Notification | P1, P2, P3 | `{ tenantId, billId, method }`     |
| `payment.refunded`    | Payment Service   | Order, Notification          | P1, P3     | `{ tenantId, paymentId, amount }`  |
| `kitchen.sla_warning` | Kitchen Service   | BFF (WS → alert manager)     | P2         | `{ tenantId, ticketId, waitTime }` |
| `tenant.created`      | SaaS Mgmt Service | Notification, Catalog        | P1, P3     | `{ tenantId, ownerEmail, slug }`   |

> 6 event còn lại (order.created, menu.updated, table.status_changed, kitchen.item_ready, service.requested, tenant.suspended) KHÔNG dùng Kafka — thay bằng BFF Direct Side-Effects Pattern (xem §7.3).

### 7.3 BFF Direct Side-Effects Pattern

Cho các event chỉ cần trigger UI-layer side-effects (WebSocket push, cache invalidation) mà không cần business logic ở bounded context khác, BFF xử lý trực tiếp sau TCP response — không đi qua Kafka:

```
BFF Controller (pseudo-code):
  const response = await this.client.send(TCP_PATTERN, payload);
  if (response.success) {
    // Side-effect 1: WebSocket broadcast
    this.wsGateway.emitToRoom(room, event, data);
    // Side-effect 2: Cache invalidation (nếu cần)
    await this.cacheManager.del(cacheKey);
  }
  return response;
```

| Trigger (TCP response tại BFF) | WebSocket Room                                  | Cache Action                  |
| ------------------------------ | ----------------------------------------------- | ----------------------------- |
| Order created                  | `tenant:{tid}:staff`                            | —                             |
| Order status changed           | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                             |
| Cart updated / conflict        | `session:{sid}:customer`                        | —                             |
| Bill requested (explicit)      | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                             |
| Table transferred              | `tenant:{tid}:staff`, `session:{sid}:customer`  | —                             |
| Menu item CRUD                 | `tenant:{tid}:*` (broadcast all customers)      | `DEL menu:{tid}`              |
| Table status changed           | `tenant:{tid}:staff`                            | `SET table:{tid}:{id}:status` |
| Kitchen item ready             | `tenant:{tid}:staff` + `session:{sid}:customer` | —                             |
| Service requested              | `tenant:{tid}:staff`                            | —                             |
| Tenant suspended               | —                                               | `SET tenant:{tid}:suspended`  |

**Lý do thiết kế (AP1):** BFF là API Gateway duy nhất. Khi BFF gọi TCP và nhận response, nó đã có đủ thông tin để thực hiện UI side-effects. Dùng Kafka làm trung gian cho single-consumer UI events vi phạm AP1 — thêm latency, complexity, và infrastructure cost mà không giải quyết bài toán domain nào.

### 7.4 Async Messaging Decision Framework (4P + 2AP)

Bộ quy tắc quyết định khi nào sử dụng Kafka vs giao tiếp đồng bộ (TCP/gRPC) vs BFF Direct.

#### Inclusion Principles (Khi nào dùng Kafka)

**P1 — Cross-Context Domain Reaction:**
Dùng Kafka khi state change ở Bounded Context A cần trigger **business logic độc lập** ở Bounded Context B. "Business logic" ≠ UI side-effect. Áp dụng bất kể số lượng consumer.

**P2 — Temporal Decoupling:**
Dùng Kafka khi producer **KHÔNG ĐƯỢC chờ** consumer xử lý xong — do long-running task, consumer tạm unavailable, hoặc event sinh nội bộ (timer/cron) không gắn với TCP request nào.

**P3 — Domain Event Fan-out:**
Dùng Kafka khi cùng 1 event cần trigger phản ứng nghiệp vụ ở **nhiều bounded context**. Producer tuân thủ Open/Closed Principle — thêm consumer mới không sửa producer code.

**P4 — Atomicity Safeguard (Transactional Outbox):**
Khi domain event là kết quả của DB write, event **PHẢI** được ghi cùng database transaction (Outbox Pattern) để tránh Dual-Write Problem. Background process poll outbox → publish Kafka.

> **Step 2.4:** `order.confirmed` dùng **simplified outbox** (bảng `outbox_events` + cron poll) như `implementation_plan.md` §4 — khớp P4 cho luồng confirm. Full CDC / transactional outbox cứng → Phase 4A (Saga + Hardening).

#### Exclusion Anti-patterns (Khi nào KHÔNG dùng Kafka)

**AP1 — Kafka as UI Proxy (CẤM):**
KHÔNG dùng Kafka chỉ để bridge UI side-effects (WebSocket, cache) khi BFF đã có đủ thông tin từ TCP response. Test: _"Side-effect cần business logic ở context khác?"_ → Không → BFF Direct.

**AP2 — Sync for Fire-and-Forget (CẤM):**
KHÔNG dùng TCP/gRPC cho tác vụ producer không cần response, đặc biệt long-running hoặc consumer tạm unavailable.

#### Decision Flowchart

```
Event cần xử lý?
  │
  ├─ Consumer cần thực hiện BUSINESS LOGIC ở bounded context khác?
  │   ├─ YES → Kafka (P1)
  │   │   ├─ Nhiều consumer? → Kafka (P3 bổ sung)
  │   │   └─ Cần atomicity với DB? → Outbox Pattern (P4)
  │   └─ NO → chỉ UI side-effect
  │       ├─ BFF đã có info từ TCP response? → BFF Direct (AP1 cấm Kafka)
  │       └─ Event sinh nội bộ (timer, không qua BFF)? → Kafka (P2)
  │
  └─ Producer cần chờ consumer?
      ├─ YES → TCP/gRPC (sync)
      └─ NO, và consumer xử lý lâu → Kafka (P2, AP2 cấm sync)
```

---

## 8. XÁC THỰC & PHÂN QUYỀN

### 8.1 Dual Authentication Strategy

Hệ thống sử dụng 2 luồng xác thực song song:

### 8.1.1 Identity vs Application User Profile (Clarification)

Hệ thống sử dụng mô hình 2 lớp để tránh nhầm lẫn khi debug auth:

1. Identity Layer (Keycloak)

- Xác thực credential, cấp JWT, quản lý realm/client role.
- Cung cấp claims như sub, email, tenant_id.

2. Application Profile Layer (user-access DB)

- Lưu user profile nội bộ, tenant assignment, role/permission nghiệp vụ.
- Được dùng để authorize business APIs sau khi JWT đã hợp lệ.

Kết luận quan trọng:

- JWT valid là điều kiện cần.
- User profile đã provisioned trong user-access là điều kiện đủ.
- Nếu token hợp lệ nhưng chưa có profile nội bộ: trả 401 user_not_provisioned.

```
┌────────────────────────────────────────────────────────┐
│  LUỒNG 1: JWT Authentication (Staff / Owner / Admin)   │
│                                                        │
│  Client → Header: Authorization: Bearer <JWT>          │
│  BFF → UserGuard:                                      │
│    1. Extract token from header                        │
│    2. Check Redis cache: user-token:{sha256(token)}    │
│       → Cache HIT: return cached user data             │
│       → Cache MISS:                                    │
│         3. gRPC call → Auth Service → Keycloak verify  │
│         4. Cache result in Redis (TTL: 30 min)         │
│    5. TenantGuard: extract tenant_id from JWT claims   │
│    6. PermissionGuard: verify permissions vs endpoint  │
│    7. Inject { userId, tenantId, role } → request ctx  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  LUỒNG 2: Session Authentication (Customer / Guest)    │
│                                                        │
│  Client → Cookie: session_id + URL: ?table&token       │
│  BFF → SessionGuard:                                   │
│    1. Validate HMAC token: verify(table_id, token, sk) │
│    2. Resolve tenant_id from table → tenant mapping    │
│    3. Get/create session in Redis:                     │
│       session:{tenant_id}:{session_id}                 │
│    4. Verify session.table_id matches request          │
│    5. Inject { sessionId, tenantId, tableId } → ctx    │
│                                                        │
│  ⚠ Không cần Keycloak — zero-friction customer UX      │
└────────────────────────────────────────────────────────┘
```

#### 8.1.2 Management App (Next.js): điều hướng vs kiểm tra API

`management-app` áp dụng **middleware + sidebar** theo **role** (OWNER, MANAGER, WAITER, …) để user chỉ thấy các **nhánh URL / tab** phù hợp. Đây **không** thay cho `PermissionGuard` trên BFF: mọi thao tác ghi/đọc nhạy cảm vẫn phải pass permission trong JWT/cache Authorizer. Chuẩn mô tả đầy đủ: [`architecture/permission-matrix.md`](architecture/permission-matrix.md) §9.

### 8.2 Guard Chain Architecture

### 8.2.1 Auth Error Taxonomy

Để telemetry và debug nhất quán, ưu tiên dùng 3 nhóm lỗi:

1. 401 invalid_token

- Token sai cấu trúc, sai chữ ký, hết hạn, hoặc không verify được.

2. 401 user_not_provisioned

- Token hợp lệ nhưng userId (sub) chưa được provision vào user-access DB.

3. 403 permission_denied

- Đã xác thực và có profile, nhưng không đủ quyền thực hiện action.

```
Request
  │
  ▼
[UserGuard / SessionGuard]     ← Xác thực: "Bạn là ai?"
  │
  ▼
[TenantGuard]                  ← Cô lập: "Bạn thuộc tenant nào?"
  │
  ▼
[PermissionGuard]              ← Phân quyền: "Bạn có permission cần thiết?"
  │
  ▼
Controller → Service → Repository (auto-filtered by tenant_id)
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

Cấu hình qua Keycloak **Protocol Mapper** (type: User Attribute → Token Claim) cho `tenant_id` và `sub_role`.

### 8.4 Bảng Phân quyền tóm tắt

| Endpoint Pattern             | Super Admin | Owner/Manager | Waiter | Chef/Bar | Customer |
| ---------------------------- | ----------- | ------------- | ------ | -------- | -------- |
| `POST /admin/tenants`        | ✅          | ❌            | ❌     | ❌       | ❌       |
| `GET /admin/analytics`       | ✅          | ❌            | ❌     | ❌       | ❌       |
| `CRUD /restaurant/menu`      | 🔍 Debug    | ✅            | ❌     | ❌       | ❌       |
| `CRUD /restaurant/tables`    | ❌          | ✅            | 👁️     | ❌       | ❌       |
| `POST /orders/confirm`       | ❌          | ✅            | ✅     | ❌       | ❌       |
| `PATCH /kds/tickets/:id`     | ❌          | ✅            | ❌     | ✅       | ❌       |
| `POST /orders` (submit)      | ❌          | ❌            | ❌     | ❌       | ✅       |
| `POST /payment/request-bill` | ❌          | ❌            | ❌     | ❌       | ✅       |
| `POST /payment/confirm-cash` | ❌          | ✅            | ✅     | ❌       | ❌       |
| `GET /menu` (public)         | ❌          | ✅            | ✅     | ❌       | ✅       |

---

## 9. REAL-TIME & WEBSOCKET

### 9.1 Kiến trúc WebSocket Gateway

```
┌──────────────────────────────────────────────────┐
│              BFF Service                          │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │       @WebSocketGateway (Socket.io)      │    │
│  │                                          │    │
│  │  Connection Auth:                        │    │
│  │    → JWT handshake (Staff/Owner)         │    │
│  │    → Session cookie (Customer)           │    │
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
│           ├─ Kafka Consumer Bridge (3 topics):   │
│           │                                      │
│  ┌──────────────────────────────────────────┐    │
│  │  order.confirmed → session:{sid}:cust    │    │
│  │    (customer tracking only; non-KDS)     │    │
│  │  kitchen.sla_warning → tenant:{tid}:mgmt│    │
│  │  payment.completed → session:{sid}:cust  │    │
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
│  │  menu.updated      → tenant:{tid}:*     │    │
│  │  table.status_chg  → tenant:{tid}:staff │    │
│  │  service.requested → tenant:{tid}:staff │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

### 9.2 Real-time Use Cases

| Use Case                     | Source                   | Event                 | WebSocket Room            | Nội dung push                       |
| ---------------------------- | ------------------------ | --------------------- | ------------------------- | ----------------------------------- |
| Đơn mới cho Staff            | BFF Direct               | `order.created`       | `tenant:{tid}:staff`      | `{ tableId, items, total }`         |
| Order tracking (Customer)    | Kafka → BFF              | `order.confirmed`     | `session:{sid}:customer`  | `{ orderId, status: "Processing" }` |
| KDS queue changed (Kitchen)  | Kitchen Redis hint → BFF | `kds.queue_changed`   | `tenant:{tid}:kds:*`      | `{ station, revision, reason }`     |
| Món xong → notify waiter     | BFF Direct               | `kitchen.item_ready`  | `tenant:{tid}:staff`      | `{ tableId, itemName: "Phở bò" }`   |
| Menu sync (giá/out of stock) | BFF Direct               | `menu.updated`        | `tenant:{tid}:*` (public) | `{ itemId, field, newValue }`       |
| Table status change          | BFF Direct               | `table.status_chg`    | `tenant:{tid}:staff`      | `{ tableId, status: "Billing" }`    |
| Payment done                 | Kafka → BFF              | `payment.completed`   | `session:{sid}:customer`  | `{ status: "Paid", receipt_url }`   |
| SLA warning (quá giờ)        | Kafka → BFF              | `kitchen.sla_warning` | `tenant:{tid}:management` | `{ ticketId, waitingMin: 18 }`      |
| Yêu cầu phục vụ (Customer)   | BFF Direct               | `service.requested`   | `tenant:{tid}:staff`      | `{ tableId, type: "CALL_STAFF" }`   |
| Refund processed             | Kafka → BFF              | `payment.refunded`    | `tenant:{tid}:management` | `{ paymentId, amount, reason }`     |

### 9.3 Scaling Strategy

Khi cần scale BFF sang nhiều instances, sử dụng **Redis Adapter** cho Socket.io:

```
Client A ──→ BFF Instance 1 ──→ Redis Pub/Sub ──→ BFF Instance 2 ──→ Client B
                                      ↑
                        Đồng bộ room state giữa instances
```

---

## 10. TÍCH HỢP THANH TOÁN

> **ADR (2026-05):** Hệ thống sử dụng **SePay + VietQR** thay vì Stripe để phù hợp thị trường Việt Nam. Không có redirect sang hosted page — QR code nhúng trực tiếp trong giao diện POS/Customer.

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
   │          │ X-Secret-Key header    │           │
   │          │   TCP     │             │           │
   │          ├──────────►│ Verify key  │           │
   │          │           │ Match code  │           │
   │          │           │ Update PAID │   TCP     │
   │          │           ├────────────────────────►│
   │          │           │             │ Complete  │
   │          │  Kafka: payment.completed            │
   │          │◄──────────┤             │           │
   │ WS push  │           │             │           │
   │◄─────────┤           │             │           │
```

### 10.2 Cash Payment Flow

```
1. Customer nhấn "Yêu cầu thanh toán" → table.status = "Billing"
2. Staff xem bill trên POS → kiểm tra tổng tiền
3. Staff nhập số tiền khách đưa → hệ thống tính tiền thừa
4. Staff nhấn "Xác nhận thanh toán tiền mặt"
5. Payment Service: ghi nhận { method: "CASH", amount, received, change }
6. Emit Kafka: payment.completed → close session → table → "Cleaning"
```

### 10.3 SePay Configuration

```yaml
Environment Variables:
  SEPAY_WEBHOOK_SECRET: "your_secret_key"   # Khớp với secret_key trong SePay dashboard
  BFF_PAYMENT_TCP_TIMEOUT_MS: 5000           # BFF chờ Payment Service qua TCP
  PAYMENT_SEPAY_QR_ACCOUNT: "0010000000355"  # Số TK ngân hàng nhận tiền
  PAYMENT_SEPAY_QR_BANK: "Vietcombank"       # Tên ngân hàng SePay-compatible
  PAYMENT_ORDER_TCP_TIMEOUT_MS: 5000         # Payment Service chờ Order Service qua TCP
  BILL_REF_PREFIX: "QRTBL"                   # Prefix nhận diện trong nội dung CK

Webhook URL (cấu hình trong SePay dashboard):
  POST https://{bff-host}/api/v1/payment/sepay/webhook
  auth_type: SECRET_KEY
  event_type: In_only
  is_verify_payment: 1

Webhook Verification (X-Secret-Key header):
  # BFF so sánh header, không dùng HMAC raw-body
  if (req.headers['x-secret-key'] !== SEPAY_WEBHOOK_SECRET) → 401
  # Success response gửi về SePay là raw JSON, không dùng internal ResponseDto wrapper
  return {"success": true}

QR URL Format:
  https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}
                         &amount={rounded_total}&des={QRTBL+billId_8chars}
```

---

## 11. CHIẾN LƯỢC CACHING

### 11.1 Cache Layers

| Layer            | Key Pattern                           | Data                             | TTL                | Invalidation                  |
| ---------------- | ------------------------------------- | -------------------------------- | ------------------ | ----------------------------- |
| **Token Cache**  | `user-token:{sha256(jwt)}`            | User data + permissions          | 30 min             | Token expiry / logout         |
| **Menu Cache**   | `menu:{tenant_id}`                    | Full menu JSON                   | 10 min             | On menu.updated event         |
| **Table Status** | `table:{tenant_id}:{table_id}:status` | Status enum                      | No expire          | Explicit update on change     |
| **Session**      | `session:{tenant_id}:{session_id}`    | Session metadata + last_activity | 2 hours (lifetime) | On session close / idle 30min |
| **Cart**         | `cart:{tenant_id}:{session_id}`       | Hash of cart items               | 2 hours            | Bound to session TTL          |
| **Rate Limit**   | `rl:{endpoint}:{ip/token}`            | Request count                    | Window (s)         | Auto-expire                   |
| **KDS Queue**    | `kds:{tenant_id}:{station}`           | Sorted Set of tickets            | No expire          | On ticket complete/remove     |

### 11.2 Chính Sách Truy Cập Redis (Redis Access Policy)

Redis được sử dụng có kiểm soát theo mô hình **phân tầng (Tiered Access)**. Không phải mọi microservice đều được phép kết nối Redis — chỉ những service có nhu cầu kiến trúc chính đáng cho ephemeral state hoặc cache.

| Service               | Phase    | Redis Use Case                                         | Key Pattern                      |
| --------------------- | -------- | ------------------------------------------------------ | -------------------------------- |
| **BFF**               | Phase 0  | Auth cache, menu cache, rate limit, session validation | `user-token:*`, `menu:*`, `rl:*` |
| **Order Service**     | Phase 2A | Session state, shared cart, idempotency                | `session:*`, `cart:*`, `idem:*`  |
| **Kitchen Service**   | Phase 2B | KDS FIFO queue (Redis-only, không DB)                  | `kds:*`, `ticket:*`              |
| **WebSocket Gateway** | Phase 2B | Socket.io Redis Adapter (multi-instance sync)          | `socket.io-adapter:*`            |

**Service KHÔNG được kết nối Redis:** Catalog, SaaS, Payment, Auth, Notification, User-Access. Các service này sử dụng PostgreSQL/MongoDB/Keycloak làm source of truth — không có ephemeral state cần Redis.

**Lý do:**

- **BFF (Tier 1):** Edge layer cần low-latency cho auth/cache/rate-limit. Mọi data chỉ là cache — source of truth vẫn ở Keycloak/PostgreSQL.
- **Order Service (Tier 2):** Session và Cart là **ephemeral state thuộc Order domain** — không phải cache. Cần direct access để đảm bảo optimistic locking và TTL/idle management.
- **Kitchen Service (Tier 3):** Redis là **primary data store** cho KDS queue (Sorted Set FIFO). Service này không có database riêng — Redis-only by design. Queue operations cần O(log N) access, không thể proxy qua TCP.
- **WebSocket Gateway (Tier 4):** Socket.io multi-instance yêu cầu shared pub/sub adapter — đây là yêu cầu kỹ thuật của thư viện, không phải business logic.

### 11.3 Cache-Aside Pattern (Menu Example)

```
GET /menu?tenant_id=t-001

1. Check Redis: GET menu:t-001
   → HIT: return cached JSON (< 1ms)
   → MISS: continue to step 2

2. Query PostgreSQL: SELECT categories, items WHERE tenant_id = 't-001'
3. Serialize → JSON
4. SET Redis: menu:t-001, TTL = 600s
5. Return JSON

On Menu Update (admin changes price/availability):
1. Write to PostgreSQL
2. DELETE Redis: menu:t-001 (invalidate)
3. Emit Kafka: menu.updated → WebSocket broadcast to all active customers
```

---

## 12. XỬ LÝ GIAO DỊCH PHÂN TÁN

### 12.1 Saga Pattern — Orchestration

Áp dụng cho các business flow phức tạp yêu cầu nhiều service phối hợp với compensation khi thất bại.

**Order Confirmation Saga (Phase 2A — chốt Step 2.4):**

```
┌──────────────────────────────────────────────────────────┐
│                  ORDER CONFIRMATION SAGA                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Step 1: Lock/validate order row trong Order DB (PENDING) │
│                                                          │
│  Step 2: Catalog Service (TCP): deduct stock trong TX    │
│    Catalog — pessimistic lock trên menu_items tại đó    │
│    ✗ Compensation: release stock (Catalog command)       │
│                                                          │
│  Step 3: Order Service → status PROCESSING, outbox row   │
│    ✗ Compensation: revert order + Catalog release        │
│                                                          │
│  Step 4: Publish Kafka order.confirmed (simplified       │
│    outbox poll) → Kitchen consumer                       │
│                                                          │
│  IF any step fails → compensations / idempotent retry      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 12.2 Idempotency

```yaml
Strategy:
  - Mỗi order submission mang idempotency key: {session_id}:{timestamp}:{hash}
  - Payment webhook: SePay payload.id (sepay_transaction_id) là natural idempotency key
  - Kafka consumer: dedup bằng message key + consumer offset

Implementation:
  - Redis SET NX với TTL (check-and-set pattern)
  - PostgreSQL UNIQUE constraint trên idempotency_key column
```

---

## 13. OBSERVABILITY & MONITORING

### 13.1 Three Pillars of Observability

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

Mỗi service expose health endpoint kiểm tra:

| Service      | Health Checks                                      |
| ------------ | -------------------------------------------------- |
| BFF          | Redis connection, TCP clients reachable            |
| Auth         | Keycloak reachable, gRPC listener active           |
| Catalog      | PostgreSQL connection                              |
| Order        | PostgreSQL connection, Redis connection, Kafka     |
| Kitchen      | Redis connection, Kafka consumer status            |
| Payment      | PostgreSQL connection, SePay webhook config loaded |
| SaaS Mgmt    | PostgreSQL connection                              |
| Notification | Kafka consumer status, SMTP connection             |

### 13.3 Alerting Rules (Grafana)

| Alert                     | Condition                             | Severity |
| ------------------------- | ------------------------------------- | -------- |
| Service Down              | Health check fails > 3 consecutive    | Critical |
| Kafka Consumer Lag > 1000 | Consumer offset lag exceeds threshold | Warning  |
| KDS SLA Breach            | Ticket waiting > 20 min               | High     |
| Error Rate > 5%           | HTTP 5xx / total requests > 0.05      | High     |
| Redis Memory > 80%        | Used memory exceeds threshold         | Warning  |

---

## 14. CHIẾN LƯỢC TRIỂN KHAI

### 14.1 Docker Compose Architecture

```yaml
# docker-compose.infra.yaml — Infrastructure Services
services:
  postgres:     # Port 5432 — PostgreSQL 16
  redis:        # Port 6379 — Redis 7
  kafka:        # Port 9092 — Bitnami Kafka (KRaft mode)
  keycloak:     # Port 8180 — Keycloak 25
  grafana:      # Port 3001 — Monitoring dashboard
  loki:         # Port 3100 — Log aggregation
  promtail:     # Log collection agent
  prometheus:   # Port 9090 — Metrics scraper
  tempo:        # Port 3200 — Distributed tracing

# docker-compose.app.yaml — Application Services
services:
  bff:          # Port 3000 — API Gateway + WebSocket
  auth:         # gRPC — Authorizer
  catalog:      # TCP — Menu & Table
  order:        # TCP — Order processing
  kitchen:      # TCP — KDS
  payment:      # TCP — Payment + SePay webhook
  saas:         # TCP — Tenant management
  notification: # Kafka consumer — Mail & audit
```

### 14.2 Build Pipeline

```bash
# Development
pnpm nx serve bff              # Start single service
pnpm nx run-many -t serve      # Start all services
pnpm nx run-many -t test       # Run all tests
pnpm nx run-many -t lint       # Lint all projects
pnpm nx affected -t test       # Test only affected by changes

# Docker Build (Multi-stage)
pnpm nx run-many -t build      # Build all apps
docker compose -f docker-compose.infra.yaml up -d   # Infra
docker compose -f docker-compose.app.yaml up -d     # Apps

# Production Deploy
docker compose -f docker-compose.prod.yaml up -d    # Full stack
```

### 14.3 Environment Strategy

| Environment    | Database   | Kafka  | Keycloak | SePay         | Monitoring |
| -------------- | ---------- | ------ | -------- | ------------- | ---------- |
| **Local**      | Docker PG  | Docker | Docker   | SePay sandbox | Optional   |
| **Staging**    | Docker PG  | Docker | Docker   | SePay sandbox | Full stack |
| **Production** | Managed PG | Docker | Docker   | SePay live    | Full stack |

---

## 15. CÁC THÁCH THỨC KỸ THUẬT

### 15.1 Danh sách Thách thức & Giải pháp

| #   | Thách thức                                                  | Giải pháp                                                                                                                                | Độ phức tạp |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Real-time multi-client sync** (KDS, order tracking, menu) | NestJS WebSocket Gateway + Socket.io + Kafka → WS bridge + Redis Adapter cho horizontal scale                                            | Cao         |
| 2   | **Multi-tenant data isolation**                             | Discriminator column + TypeORM Subscriber + Guard middleware auto-inject                                                                 | Cao         |
| 3   | **Shared Cart concurrent modification**                     | Redis Hash + Optimistic Concurrency (version field) + WebSocket broadcast on change                                                      | Trung bình  |
| 4   | **Stock race condition** (nhiều người đặt cùng món)         | Catalog Service sở hữu `menu_items`: khóa + deduct trong transaction Catalog; Order gọi TCP idempotent khi confirm (xem đặc tả Step 2.4) | Trung bình  |
| 5   | **KDS FIFO/Priority + SLA**                                 | Redis Sorted Set (score=priority/time) + ticket/item snapshots + scheduled SLA check; no batching/GROUP BY                               | Trung bình  |
| 6   | **Anonymous Customer auth** (zero-friction)                 | Session-based auth via Redis + HMAC token validation + separate Guard chain                                                              | Trung bình  |
| 7   | **Session lifecycle** (dual timeout, multi-device)          | Session lifetime = 2h (Redis TTL), idle timeout = 30min (cron check `last_activity`) + cart sync via WebSocket                           | Trung bình  |
| 8   | **Offline resilience** (PWA cho customer & POS)             | Service Worker + IndexedDB queue + idempotency key + exponential backoff retry                                                           | Cao         |
| 9   | **Distributed transaction** (order confirm saga)            | Saga Orchestration pattern + compensation steps + idempotent operations                                                                  | Trung bình  |
| 10  | **Subscription feature gating**                             | SaaS Service + feature flag in tenant context + middleware check limits                                                                  | Nhỏ         |

### 15.2 Ưu tiên Triển khai (Phased)

```
Phase 1 — Core Foundation (MVP):
  ├── BFF + Auth + Catalog + Order + Payment Services
  ├── PostgreSQL + Redis + Keycloak + Kafka
  ├── Multi-tenancy enforcement
  ├── Basic WebSocket (order notification)
  └── SePay VietQR + Cash payment

Phase 2 — Real-time & KDS:
  ├── Kitchen Service + KDS WebSocket
  ├── Full WebSocket Gateway (all events)
  ├── Menu real-time sync
  └── Table state machine

Phase 3 — SaaS & Observability:
  ├── SaaS Management Service
  ├── Subscription lifecycle
  ├── Full PLG + Prometheus + Tempo stack
  └── Grafana dashboards & alerts

Phase 4 — Polish & Extended:
  ├── PWA & Offline resilience (Service Worker, IndexedDB)
  ├── Notification Service (email receipts, daily report)
  ├── Refund flow (SePay manual refund + cash refund)
  ├── Service Request (yêu cầu phục vụ từ khách)
  ├── Shared Cart multi-device sync
  └── KOT printing integration (ESC/POS)

Phase 5 — Analytics & Inventory (Future Scope):
  ├── Analytics & Reporting module (doanh thu, món bán chạy, giờ cao điểm)
  ├── Inventory management (định lượng nguyên liệu, tự động trừ kho)
  └── Advanced subscription features
```

---

## 16. CHIẾN LƯỢC OFFLINE & ĐỒNG BỘ (OFFLINE & SYNC STRATEGY)

### 16.1 Client-side Offline (Customer PWA)

```yaml
Scenario 1: Khách quét QR khi offline
  Detection: navigator.onLine == false
  Behavior:
    - Show toast "Không có kết nối mạng"
    - Load cached menu từ Service Worker cache (nếu đã từng truy cập)
    - Disable "Thêm vào giỏ" button
    - Show "Chỉ xem, không thể đặt món khi offline"

Scenario 2: Mất mạng giữa chừng khi đang duyệt menu
  Detection: WebSocket disconnect event
  Behavior:
    - Show warning banner "Mất kết nối, đang thử kết nối lại..."
    - Retry với exponential backoff (2s, 4s, 8s, max 30s)
    - Giữ giỏ hàng trong localStorage
    - Disable submit order button

Scenario 3: Mất mạng khi submit order
  Detection: HTTP request timeout hoặc network error
  Behavior:
    - Show error "Không thể gửi đơn hàng"
    - Queue order trong IndexedDB với idempotency key
    - Khi có mạng trở lại → auto retry submit
    - Show sync indicator: "Đang đồng bộ đơn hàng..."
```

### 16.2 Staff-side Offline (POS/KDS)

```yaml
Scenario 1: POS mất kết nối khi xác nhận đơn
  Behavior:
    - Queue confirmation action vào local storage
    - Show "Offline — Thao tác sẽ được đồng bộ khi có mạng"
    - Save to local queue với timestamp
    - Auto sync khi reconnect
    - Prevent duplicate submission (idempotency key)

Scenario 2: KDS mất kết nối
  Behavior:
    - Continue showing existing orders từ cache
    - Queue status updates (Processing/Ready)
    - Show offline indicator
    - Auto sync all queued actions khi reconnect
    - Conflict resolution: Server state wins

Scenario 3: Payment terminal offline
  Behavior:
    - Allow cash payment only
    - Disable VietQR payment button
    - Queue payment record
    - Manual reconciliation khi có mạng
```

### 16.3 Sync & Conflict Resolution Strategy

```yaml
Conflict Resolution Rules:
  IF local_timestamp < server_timestamp THEN
    server_state_wins()
    discard_local_changes()
    notify_user("Đã cập nhật từ server")

  IF action == "order_submission" THEN
    use_idempotency_key(session_id + timestamp + hash)
    prevent_duplicate_order()

Retry Policy:
  max_retries: 3
  backoff: exponential (2^n seconds, max 30s)
  IF retry_count > max_retries THEN
    show_error("Không thể đồng bộ")
    log_to_error_tracking()

Tech Stack:
  - Service Worker: cache menu assets, API responses (Cache-First)
  - IndexedDB: offline order queue, pending actions
  - Background Sync API: auto-retry khi có mạng
  - Idempotency Keys: Redis SET NX + PostgreSQL UNIQUE constraint
```

---

_Tài liệu này là bản thiết kế kiến trúc kỹ thuật cấp cao. Bước tiếp theo: Database Schema Design chi tiết và API Contract Specification cho từng service._
