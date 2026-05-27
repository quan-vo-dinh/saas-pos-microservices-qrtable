# QRTable Thesis Slide Brief

> **Purpose:** This document is used as input for AI to create slides and a presentation script for a graduation thesis report.
> **Topic:** Research and build a SaaS POS platform that integrates ordering via QR code based on Microservices architecture.
> **Brief version:** 2026-05-09
> **Main content sources:** `business-logic.md`, `technical-architecture.md`, `permission-matrix.md`, `implementation_plan.md`, phase docs and thesis proposal.

---

## 0. General Instructions for AI to Create Slides

### 0.1. The role of the deck

This deck is a **graduate thesis report slide focusing on system architecture**, not a landing page, not a sales deck and not a pure UI demo.

Message throughout:

> QRTable is a Proof of Concept for a multi-tenant SaaS POS F&B platform, using Microservices architecture and selective event-driven communication to solve problems: isolating tenant data, real-time ordering, data consistency when ordering simultaneously, decentralizing operations and payment suitable for the Vietnamese market.

### 0.2. Design style

- Slide ratio: **16:9**.
- Language: **Vietnamese**, use English technical terms when needed, for example `BFF`, `Kafka`, `tenant_id`, `WebSocket`.
- Style: **technical thesis deck**, modern, clear, academic.
- Do not use excessive marketing style. Do not turn the deck into a restaurant advertisement.
- Priority: architectural diagram, sequence flow, state machine, service ownership map, matrix.
- Each slide should only have **one main claim** in the title.
- Don't stuff too many words. If the content is long, put the explanation in **speaker script**, not all on the slide.

### 0.3. Visual conventions

AI that creates slides should leave a clear visual area for slides that say:

`[CUSTOM VISUAL]`

With these slides, deck makers can draw their own diagrams using Mermaid, Figma, Excalidraw or other tools and then attach them. AI must not invent additional architectural components beyond the recorded list of nodes/flows.

Recommended color code:

- `BFF/API Gateway`: teal.
- `Business Services`: blue.
- `Kafka/Event`: amber or orange.
- `Redis/Runtime state`: red or crimson.
- `Database/Persistence`: slate/gray.
- `Security/Auth`: purple or navy.
- `Payment`: green.
- `Risk/Error/Constraint`: coral/red.

### 0.4. These points cannot be overclaimed

- Do not say the system is production-ready.
- Not saying all communication goes through Kafka.
- Not saying Kafka completely replaces TCP/gRPC.
- Don't say Payment service owns the bill. **Bill belongs to Order service**; Payment only receives `billId` and records the payment.
- Do not tell customers to use Keycloak. Customers use **anonymous session + QR HMAC token**, and staff/admin uses **JWT/Keycloak**.
- Do not say Order service directly updates stock in Catalog DB. Stock is owned by **Catalog service**, Order calls Catalog via TCP command.
- Don't say WebSocket is the source of truth. WebSocket is realtime hint/push; REST/DB is still the canonical source.

### 0.5. Recommended structure

The proposed deck includes **30 slides**, suitable for a presentation of about **22-28 minutes**. If the duration is shorter, slides 15-18 and 23-27 can be combined.

---

## Slide 01. Cover page

### Slide target

Introduce the topic like a serious thesis report, and immediately position this as a topic about **system architecture**, not just an ordering app.

### Content displayed on the slide

**Main title:**

Research and build a SaaS POS platform that integrates ordering via QR code based on Microservices architecture

**Subtitles:**

QRTable - Architecture Proof of Concept for F&B SaaS POS

**Additional information:**

- Student: Vo Dinh Minh Quan - 22521193
- Instructor: Dr. Nguyen Thanh Binh
- University of Information Technology - Vietnam National University, Ho Chi Minh City
- Implementation time: January 26, 2026 - May 30, 2026

### Visual / layout

[OWN-CREATED VISUAL]

Suggested wallpaper or visual:

- A modern restaurant, on the table there is a QR code, the phone is opening the menu.
- Slight overlay of technical labels: `SaaS`, `Microservices`, `QR Order`, `Real-time`, `VietQR`.
- Do not use stock photos that are too dark or too marketing.

### Speaker script

I would like to present my graduation thesis topic: researching and building a POS platform according to the SaaS model, integrating ordering via QR code, based on Microservices architecture.

The focus of the project is not just to build an ordering interface, but to design an architecture capable of handling the typical problems of modern F&B systems: many restaurants use the same platform, customers order real-time food at the table, kitchen and service must synchronize immediately, payment needs to be suitable for the Vietnamese market, and data between tenants must be securely isolated.

---

## Slide 02. Central Thesis

### Slide target

Set thesis statement for the entire speech. The Council needs to immediately understand "what this topic proves".

### Content displayed on the slide

**Claim title:**

QRTable not only replaces paper menus with QR, but validates a distributed SaaS POS architecture for the F&B industry

**3 main ideas:**

- A platform serving many restaurants on the same infrastructure: **multi-tenant SaaS**.
- A closed operational flow: **QR scan -> menu -> order -> kitchen -> payment**.
- A reference architecture: **BFF + Microservices + Redis + Kafka + WebSocket + Keycloak**.

**Short callout:**

The goal of the PoC is to demonstrate the architecture, not compete on features with commercial POS.

### Visual / layout

[OWN-CREATED VISUAL]

Draw a horizontal pipeline:

`Customer QR` -> `Order` -> `Staff POS` -> `KDS` -> `Payment` -> `Monitoring`

Below the pipeline write the architectural layers:

`BFF`, `Services`, `Redis`, `Kafka`, `PostgreSQL`, `Keycloak`.

### Speaker script

The main message of the report is: QRTable is more than just an electronic menu screen. This is a Proof of Concept to verify how to design a SaaS POS platform following Microservices architecture for the F&B industry.

The business flow of the restaurant industry has all the difficult characteristics of a distributed system: customers order simultaneously, many different operational roles, table statuses change constantly, kitchens need real-time updates, and payments must be recorded accurately. Therefore, the topic focuses on how to divide services, how to communicate between services, how to isolate data by tenant, and how to ensure consistency in core flows.

---

## Slide 03. Market Context and Dynamics

### Slide target

Shows that the topic has a clear practical context: Vietnam's F&B is sinly digitizing, QR ordering and cashless payment facilitate this model.

### Content displayed on the slide

**Claim title:**

F&B Vietnam is ready for QR ordering, but the architectural problem behind it is more complicated than the menu interface

**Main content:**

- The F&B industry has a large scale, many store models and different operating needs.
- POS SaaS helps restaurants reduce deployment costs and share infrastructure.
- QR Order shortens the ordering process, but entails real-time requests between guests, staff, kitchen and payment.
- VietQR and transfer payments create a foundation for payment flows without the need for international card gateways.

**Data can be put on slides if needed:**

- Vietnam F&B revenue in 2024 in the proposal: **688.8 trillion VND**.
- Scale of business establishments in the proposal: **323,010 establishments**.
- Percentage of consumers who prioritize VietQR in the proposal: **61.4%**.

### Visual / layout

Chart/infographic of 3 clusters:

1. `Market scale`
2. `QR ordering behavior`
3. `Cashless/VietQR readiness`

If you don't want to use a chart, you can use 3 large stat cards.

### Speaker script

The topic comes from the context of Vietnam's F&B industry undergoing sin digital transformation. Restaurants not only need billing software, but also need a system that connects the operating steps: menu, tables, staff, kitchen, invoices and payments.

QR Order creates a very natural experience for customers: scan the code, view the menu and order right at the table. But behind the scenes, every customer action requires immediate updates to the staff and kitchen, and needs to check dish status, table status, inventory and payment. Therefore, the research value of the topic lies in the architecture that handles those streams in a controlled manner.

---

## Slide 04. Four Architectural Challenges

### Slide target

Clearly state the 4 technical issues that the thesis solves. This is the background slide leading to Microservices.

### Content displayed on the slide

**Claim title:**

A QR POS platform needs to handle four architectural pressures simultaneously

**4 content blocks:**

1. **Distributed Monolith**
   - service is physically separated but depends on synchronization too tightly.
   - A slow service can slow down the entire flow.

2. **Data Consistency**
   - Multiple customers can order the same dish at the same time.
   - Need to avoid overselling and wrong order status.

3. **Real-time Communication**
   - POS, KDS and customer tracking must be updated almost immediately.
   - Long polling is not suitable for peak hour operations.

4. **Multi-tenant Isolation**
   - Many restaurants share the same infrastructure.
   - All data, caches, events and files must be scoped to the tenant.

### Visual / layout

4-quadrant risk map. Each quadrant has an icon:

- Chain/bottleneck: Distributed Monolith
- Lock/database: Consistency
- Lightning/socket: Real-time
- Building/layers: Multi-tenancy

### Speaker script

When viewed from the outside, QR Order seems like a simple feature. But when placed in a SaaS POS system, it entails four architectural challenges.

The first is to avoid distributed monolith: if all services call each other synchronously in a long chain, microservices just divide the deployment into small pieces but still maintain very high coupling. The second is consistency: two customers can order the last dish at the same time, or staff can confirm orders when inventory has changed. Third is real-time: new order, finished order, payment request must be updated immediately to the correct role. Fourth is multi-tenancy: this restaurant's data absolutely cannot be mixed with another restaurant.

---

## Slide 05. Objectives and Contributions of the Topic

### Slide target

Link between the research problem and the expected results of the thesis.

### Content displayed on the slide

**Claim title:**

The project builds a PoC to verify the Microservices architecture for F&B POS, not just functional implementation

**Research objectives:**

- Design Microservices architecture for SaaS POS platform integrating QR Order.
- Build a multi-tenancy strategy with `tenant_id` and clear service boundaries.
- Apply Redis, Kafka and WebSocket in the correct role in runtime.
- Integrate Keycloak/RBAC for staff and session-based access for customers.
- verify the core business flow: QR -> Order -> KDS -> Payment.

**Expected contribution:**

- Reference architecture document set for SaaS POS F&B.
- PoC can be demoed and expanded.
- Technical decisions have clear rationale: when to use TCP, when to use Kafka, when to use BFF Direct.

### Visual / layout

Draw 3 columns:

`Research` | `Architecture` | `Prototype`

Each column has 3 short bullets.

### Speaker script

The goal of the project is to design and deploy a PoC deep enough to verify the architecture, instead of building a full-featured commercial product.

Expected results include three parts. One is a reference architecture document that clearly describes service boundaries, inter-service communication and multi-tenancy. The second is a demo system for core F&B POS flows. Third are well-founded technical decisions, for example which events should go to Kafka, which events should only be WebSocket side-effects in BFF, and which state should belong to which service.

---

## Slide 06. Business Scope of QRTable

### Slide target

Let listeners understand which domains the system includes, avoiding misunderstanding that it only includes Customer PWA.

### Content displayed on the slide

**Claim title:**

QRTable covers the full circle of POS operations at the table: from restaurant onboarding to payment

**Main domains:**

- **SaaS Onboarding:** tenant, subscription, operating status.
- **Catalog:** category, item, photo, price, availability/out of stock, table and QR.
- **Ordering:** session, shared cart, order, bill, service request.
- **Kitchen/KDS:** ticket, kitchen/bar queue, SLA, priority, recall.
- **Payment:** cash, SePay/VietQR, webhook, refund, audit.
- **Operation:** RBAC, staff roles, monitoring, deployment.

### Visual / layout

[OWN-CREATED VISUAL]

Domain capability map in circular form or map according to operational flow:

`Onboarding -> Menu/Table -> QR Session -> Order -> Kitchen -> Payment -> Reconciliation`

### Speaker script

QRTable's business scope is chosen according to the operating logic of a restaurant. The first is to create a tenant and configure the restaurant. The Owner then manages the menu, dishes, food photos, areas and tables. Customers scan the QR at the table to open the session, view the menu and order. The application goes through the confirmation staff and then goes to KDS for the kitchen or bar. Finally, request payment, collect cash or VietQR, record payment and close the bill.

The important point is that these domains should not be mixed into one large service. Each domain has its own data and state, so the architecture is divided according to ownership.

---

## Slide 07. Actors and Access Boundaries

### Slide target

Introduce user roles and emphasize that the system has different types of auth/access.

### Content displayed on the slide

**Claim title:**

Each actor has a different data scope and authentication method

**Summary table:**

| Actor         | Scope                | Authentication          | Interface    |
| ------------- | -------------------- | ----------------------- | ------------ |
| Super Admin   | Cross-tenant         | JWT/Keycloak            | Admin Portal |
| Owner/Manager | A tenant             | JWT/Keycloak            | Dashboard    |
| Waiter        | A tenant             | JWT/Keycloak            | POS          |
| Chef/Barista  | One tenant + station | JWT/Keycloak            | KDS          |
| Customers     | Session/Table        | QR HMAC + Redis session | Customer PWA |

**Callout:**

Customer has no role in `role.json`; customer is controlled by `SessionGuard` and ownership by session/table.

**Role vs Permission needs to be clearly shown:**

- **Role** is the user group: `Owner`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`, `SUPER_ADMIN`.
- **Permission** is the specific operation permission: `order.confirm`, `payment.confirm_cash`, `kitchen.update_ticket`.
- UI can hide/show menu according to role, but API must check real permission at BFF.

### Visual / layout

Role-access matrix or actor lanes.

User icons should be used for each actor, but not too animated.

### Speaker script

The system has two large groups of actors. The internal team includes Super Admin, Owner, Manager, Waiter, Chef and Barista. This group logs in via Keycloak, receives the JWT, and has permission checked when calling the API.

The second group is Customer. Customers do not need to log in to reduce experience friction. Instead, visitors enter the system through a QR URL with an HMAC token, which is then tied to a specific session and table. This helps guests only operate on their own session, without needing an account but still having clear access boundaries.

It should be emphasized here that roles and permissions are not the same. Roles help group users, while permissions are specific permissions on each API. For example, Waiter can have `order.confirm` and `payment.confirm_cash`, but not `catalog.update`. Chef can update KDS tickets, but cannot process payments or edit menus.

---

## Slide 08. Architectural Principles

### Slide target

Present design principles so your audience understands why subsequent decisions make sense.

### Content displayed on the slide

**Claim title:**

The QRTable architecture is designed around ownership, tenant isolation and realtime correctness

**Principles to put on the slide:**

- **Database per service:** service owns its data, other services do not query directly.
- **tenant Isolation by Default:** all tenant-scoped entities have `tenant_id`.
- **BFF as Single Entry:** client only goes through BFF, does not call internal microservices.
- **Event-Driven Decoupling:** Kafka is used for asynchronous event domains.
- **Cache/Runtime State with Redis:** Redis is used for session, cart, KDS queue, cache and rate-limit.
- **Idempotency & Fail-safe:** idempotency key, outbox and saga for multi-step flow.
- **Observe Everything:** log, metrics, tracing to debug distributed systems.

### Visual / layout

7 principle cards, each card has 1 icon + 1 line of explanation. Do not use long paragraphs.

### Speaker script

Before going into each service, I want to set architectural principles. The first is ownership: each service owns its data. Order does not directly edit the menu item table of the Catalog, Payment does not automatically close the bill on behalf of the Order.

Second is tenant isolation: because this is SaaS, all restaurant operational data must have tenant boundaries. Third is that BFF is the single entry point to control auth, tenant context, rate limit and WebSocket. Finally, the system uses Redis, Kafka and WebSocket in specific roles, not using one technology for every problem.

---

## Slide 09. Overall Architecture

### Slide target

This is the largest architectural slide. The listener must fully see the client, gateway, service and infrastructure layer.

### Content displayed on the slide

**Claim title:**

BFF is the single entry point, behind which are bounded-context services and runtime infrastructure

**Classes to represent:**

1. **Client Layer**
   - Customer PWA
   - Management App: POS, KDS, Dashboard, Admin

2. **BFF Service**
   - REST API
   - WebSocket Gateway
   - Guard chain
   - Rate limiting

3. **Application Services**
   - Authorizer Service
   - SaaS Management Service
   - Catalog Service
   - Order Service
   - Kitchen Service
   - Payment Service
   - Notification/User-Access Service

4. **Infrastructure**
   - PostgreSQL
   - Redis
   - Kafka
   - Keycloak
   - Cloudinary
   - Grafana/Loki/Prometheus/Tempo

### Visual / layout

[OWN-CREATED VISUAL]

Draw layered architecture diagram with 4 floors. Connector directions:

- Client -> BFF: HTTP REST / WebSocket.
- BFF -> Auth: gRPC.
- BFF -> Catalog/Order/Payment/SaaS: TCP.
- Services -> Kafka: publish/consume domain events.
- BFF -> Redis: auth cache, menu cache, rate limit.
- Order/Kitchen -> Redis theo policy.

Don't let the arrows overlap too much. Color can be used in layers.

### Speaker script

The overall architecture is divided into four layers. At the top is the client: Customer PWA for customers to scan QR and Management App for staff, kitchen, shop Owner and admin.

All clients go through BFF. BFF is both an API Gateway, a WebSocket Gateway, and a place to apply guard chain, rate limit, and tenant context. Behind BFF are bounded context microservices. Auth serves authentication, Catalog manages menus and tables, Order manages sessions, carts, orders and bills, Kitchen manages KDS queues, Payment handles cash and VietQR, SaaS manages tenant/subscription.

The infrastructure includes PostgreSQL for business data, Redis for runtime state and cache, Kafka for domain events, Keycloak for IAM, Cloudinary for image files and observability stack for system monitoring.

---

## Slide 10. Frontend Architecture

### Slide target

Explain why there are only 2 frontend apps but serve many actors.

### Content displayed on the slide

**Claim title:**

Two frontend applications separated by trust boundary: Customer anonymous and Internal authenticated

**Customer PWA:**

- React + Vite, mobile-first.
- Entry via QR URL: `{slug}.qrtable.io?table_id=...&token=...`.
- Session-based auth, no login required.
- Menu browsing, shared cart, order tracking, payment request.
- Offline-first orientation: service worker, cache menu, queue action.

**Management App:**

- Next.js App Router.
- Role-based routing: `/pos`, `/kds`, `/dashboard`, `/admin`.
- JWT/Keycloak.
- POS order confirmation, KDS, menu/table management, payment, admin tenant.

### Visual / layout

2 large columns:

`Customer PWA` vs `Management App`

Below each column there is actor, auth model, core screens, realtime mode.

### Speaker script

The frontend should not be separated into too many separate applications because the thesis scope needs to maintain deployment and maintainability. Instead, the system splits into two apps according to trust boundaries.

Customer PWA is for anonymous customers. Guests enter via QR, the system authenticates the token and attaches the session. Management App is for all logged in actors: waiter, kitchen, manager, Owner and super admin. Same app, but route and layout change according to role, but real permissions are still enforced at BFF using PermissionGuard.

---

## Slide 11. Service Decomposition & Ownership

### Slide target

Explain that the system is divided into services according to data ownership, not according to the UI screen.

### Content displayed on the slide

**Claim title:**

service boundaries are divided by proprietary and operational data, not by screen

**service ownership table:**

| service       | Main ownership                              | Data store                | Communication        |
| ------------- | ------------------------------------------- | ------------------------- | -------------------- |
| BFF           | API edge, WS, guards                        | Stateless + Redis cache   | HTTP, WS, TCP, gRPC  |
| Auth          | Token verification, user info               | Keycloak/Redis JWKS cache | gRPC                 |
| SaaS          | tenant, subscription, plan                  | PostgreSQL                | TCP, Kafka           |
| Catalog       | Category, menu item, table, QR, stock       | PostgreSQL                | TCP                  |
| Order         | Session, cart, order, bill, service request | PostgreSQL + Redis        | TCP, Kafka           |
| Kitchen       | KDS tickets, queue, SLA                     | Redis-only                | Kafka, TCP           |
| Payment       | Payment, refund, audit                      | PostgreSQL                | TCP, webhooks, Kafka |
| Notifications | Email/audit async                           | MongoDB                   | Kafka                |

### Visual / layout

Clear boards or service cards. If using cards, each card has:

- service name
- owns
- store
- transportation

### Speaker script

service decomposition is the most important part of the architecture. QRTable does not divide services by screen like "menu page service" or "payment page service". The system is divided by data domain and professional responsibility.

For example, Catalog is the only service that owns menu items, tables and stocks. Order only manages orders, bills and sessions. When needing to deduct inventory, Order must call Catalog via TCP command, not directly update Catalog database. This division helps each service have clear change boundaries and prepares for database-per-service.

---

## Slide 12. Multi-Tenancy Model

### Slide target

Explain the multi-tenant SaaS model and how `tenant_id` flows throughout the system.

### Content displayed on the slide

**Claim title:**

QRTable uses Database-per-service combined with `tenant_id` discriminator to balance isolation and MVP costs

**Main content:**

- Each service owns its own database/schema logic.
- In each database, entities belonging to restaurants have `tenant_id`.
- Unique constraint and index must include `tenant_id`.
- Redis key namespace has tenants: `menu:{tenant_id}`, `session:{tenant_id}:{session_id}`.
- Kafka payload always contains `tenantId`.
- WebSocket room is always scoped according to tenant or session.

**Short example:**

`tenant:t-001` and `tenant:t-002` can have a category named "Beverages", but cannot see each other's data.

### Visual / layout

[OWN-CREATED VISUAL]

Diagram:

`tenant A` and `tenant B` go into the same platform, then the data in each DB service is separated by `tenant_id`.

Shows 4 places with tenant boundaries:

- DB row
- Redis key
- Kafka payload
- WebSocket room

### Speaker script

Because this is SaaS, many restaurants use the same infrastructure. If you separate the database for each tenant from the beginning, isolation is better but operating and migration costs are higher. With the scope of thesis and MVP, the system chooses a database-per-service direction combined with discriminator column `tenant_id`.

This means that each service still retains its own data ownership, but in that service's database, the tenant-scoped rows all have `tenant_id`. tenant boundaries not only exist in the database, but also appear in the Redis key, Kafka payload, WebSocket room and file storage path.

---

## Slide 13. Tenant Resolution Flow

### Slide target

Explain that tenant is defined differently between staff/admin and customer.

### Content displayed on the slide

**Claim title:**

tenant context is resolved from JWT with staff and from QR/session with customer

**Staff/Admin flow:**

1. Client sends JWT.
2. `UserGuard` checks Redis token cache; cache miss then call Authorizer service via gRPC.
3. Authorizer service validates JWT with Keycloak and retrieves user profile/permissions from user-access.
4. Validate role mapping: roles in JWT must match roles/permissions provided in the system.
5. `TenantGuard` retrieves `tenant_id` from JWT claim and blocks tenant mismatch.
6. `PermissionGuard` checks permission by endpoint.
7. service query automatically filters by `tenant_id`.

**Customer flow:**

1. QR URL contains `slug`, `table_id`, `token`.
2. BFF/Catalog validate HMAC token to prevent fake QR.
3. Resolve tenant from slug/table mapping.
4. Check the table exists, belongs to the correct tenant and the table status allows access to the session.
5. Create or join session in Order/Redis.
6. Customer only accesses his/her session/table.
7. Rate limit prevents scan/order spam.

### Visual / layout

Hai sequence mini song song:

`Staff JWT path` and `Customer QR path`.

### Speaker script

tenant context does not always come from the same source. For staff or Owner, the tenant is in a JWT custom claim issued by Keycloak and checked by the guard chain. For customer, the customer is not logged in so the tenant is resolved from QR URL: restaurant slug, table id and HMAC token.

The common point is that after resolution is complete, every internal request must have a tenant context. The service does not receive filter information from the client, but must use the context that has been injected by the guard.

Flow staff has one more important point: a valid token is not enough. The user must also be provisioned in user-access and have the corresponding permission. If the token is correct but the user does not have an internal profile, the system returns `user_not_provisioned`. If there is a profile but lacks permissions, the system returns `permission_denied`.

---

## Slide 14. Auth & RBAC

### Slide target

Present a decentralization system that is deep enough but does not fall into all 53 permissions.

### Content displayed on the slide

**Claim title:**

RBAC is enforced at the API boundary, not just hiding/showing menus on the interface

**Control structure:**

- **Identity Layer:** Keycloak authenticates credential, JWT level, realm roles.
- **Application Profile Layer:** user-access stores profile, tenant assignment, permissions.
- **Guard Chain:** `UserGuard/SessionGuard -> TenantGuard -> PermissionGuard`.
- **Permission source of truth:** `permission-matrix.md`, `PERMISSION` enum, `role.json` and test matrix must be in sync.
- **Permission format:** `domain.action_snake_case`, for example `order.confirm`, `kitchen.update_ticket`.

**Main role:**

- Super Admin: cross-tenant.
- Owner: full authority to operate the tenant, including HR actions.
- Manager: operates tenant, does not delete users.
- Waiter: order, table, payment, service request.
- Chef/Barista: KDS by station.
- Customer: session-scoped, no DB role.

**Validation example according to API:**

| Operation                      | Valid Actor          | Guard/Permission                                             |
| ------------------------------ | -------------------- | ------------------------------------------------------------ |
| Staff confirms the application | Waiter/Manager/Owner | `UserGuard -> TenantGuard -> PermissionGuard(order.confirm)` |
| Cancel order is Processing     | Manager/Owner        | `order.cancel_processing` + required reason                  |
| Update KDS ticket              | Chef/Barista         | `kitchen.update_ticket` + station scope                      |
| Set priority KDS               | Owner/Manager        | `kitchen.set_priority`                                       |
| Cash Confirmation              | Waiter/Manager/Owner | `payment.confirm_cash`                                       |
| Customer orders                | Customer sessions    | `SessionGuard -> TenantGuard`, does not use DB role          |
| Customer views order status    | Customer sessions    | session ownership: `order.sessionId === req.sessionId`       |

### Visual / layout

[OWN-CREATED VISUAL]

Guard chain diagram:

`Request` -> `Authenticate` -> `Resolve Tenant` -> `Authorize Permission` -> `Controller` -> `Service`.

Add mini matrix role x domain on the right:

- Rows: Owner, Manager, Waiter, Chef, Barista, Customer.
- Columns: Catalog, Order, Kitchen, Payment, Table, service Request.
- No need to put all 66 permissions on the main slide; Just need 5-7 typical examples.

### Speaker script

Management App can hide or show routes by role to improve UX, but that is not the main layer of security. The real layer of security lies in the BFF.

Each sensitive API must pass through the guard chain. UserGuard or SessionGuard defines "who you are". TenantGuard determines "which tenant you belong to". PermissionGuard determines "do you have permission to do this operation". This method helps decentralize authority regardless of the frontend and avoids the case where the user calls the API directly to bypass the UI.

QRTable's RBAC mechanism has two layers. The identity class is located in Keycloak, where JWT and role claims are issued. The application profile layer is located in user-access, where the system stores the actual permissions for PermissionGuard to check. Therefore, a valid request staff must meet three conditions: correct token, correct tenant and correct permission.

For example, Waiters can confirm orders and handle cash, but cannot edit menus. Chef updated the KDS ticket, but did not process the payment. Customer does not go through the database role, but goes through SessionGuard and checks the ownership of the session/table.

---

## Slide 15. Communication Matrix

### Slide target

Make it clear what each protocol is used for. This is a very important slide to avoid listeners thinking "Microservices are all about using Kafka".

### Content displayed on the slide

**Claim title:**

QRTable chooses the protocol according to the semantics of the stream, not using one channel for every problem

**Communication board:**

| Channel       | Used for                             | Example                                |
| ------------- | ------------------------------------ | -------------------------------------- |
| HTTP REST     | Client -> BFF request/response       | Customer submit order                  |
| WebSockets    | BFF -> Client realtime push          | order status, KDS update               |
| TCP           | BFF/service -> business service sync | Order call Catalog deduct stock        |
| gRPC          | Auth performance-critical RPC        | BFF verify token                       |
| Kafka         | Async domain events                  | `order.confirmed`, `payment.completed` |
| HTTP Webhooks | External callback                    | SePay -> BFF webhook                   |
| Redis         | Cache/runtime/pub-sub                | session, cart, KDS queue               |

### Visual / layout

Matrix/table or hub diagram.

Don't draw every detailed arrow; draw only channel groups.

### Speaker script

In a distributed system, choosing the wrong communication channel can complicate the architecture without solving the right problem. QRTable doesn't use Kafka for everything, nor does it use TCP for everything.

Queries or commands that need immediate response use HTTP/TCP/gRPC. Asynchronous business reactions, for example a confirmed order needs processing, or a completed payment needs downstream services to react, use Kafka. As for pure UI side-effects such as notifying staff of a new order, BFF can emit the WebSocket directly after a successful TCP response.

---

## Slide 16. Kafka Decision Framework

### Slide target

4P+2AP explained: when to use Kafka and when not to use it.

### Content displayed on the slide

**Claim title:**

Kafka is only used for domain events that need decoupling, not as a proxy for UI

**Inclusion principles:**

- **P1 - Cross-context domain reaction:** state change in context A requires business logic in context B.
- **P2 - Temporal decoupling:** producers should not wait for consumers.
- **P3 - Fan-out:** an event with multiple bounded response contexts.
- **P4 - Atomicity preserve:** events associated with DB write need to be outboxed.

**Exclusion anti-patterns:**

- **AP1 - Kafka as UI proxy:** don't use Kafka just to fire WebSocket.
- **AP2 - Sync for fire-and-forget:** does not use TCP/gRPC for waitless producer tasks.

**Core registry topic:**

- `order.confirmed`
- `payment.completed`
- `payment.refunded`
- `kitchen.sla_warning`
- `tenant.created`

### Visual / layout

[OWN-CREATED VISUAL]

Decision flowchart:

`Event needs processing?` -> `Business logic in another context?` -> yes: Kafka; no: BFF Direct if UI only.

### Speaker script

This was an important architectural decision after analyzing the initial proposal. At first you might think event-driven means everything goes to Kafka. But when implemented in practice, that method easily increases latency and complexity for events that only serve the UI.

Therefore, the system uses the 4P+2AP rule set. If the event needs to be bounded by another business processing context, or the producer should not wait for the consumer, or needs fan-out, then Kafka is suitable. But if BFF has just successfully received a response from the service and only needs to emit the WebSocket or invalidate the cache, using BFF Direct will be simpler and more correct.

---

## Slide 17. Redis Usage Strategy

### Slide target

Explanation Redis is not just a cache, but has many different but controlled runtime roles.

### Content displayed on the slide

**Claim title:**

Redis is used in a controlled manner for hot data, runtime state, and short-term queues

**Usage table:**

| Use case        | Key pattern                          | Owner            |
| --------------- | ------------------------------------ | ---------------- |
| Token cache     | `user-token:{sha256(jwt)}`           | BFF/Auth         |
| Menu cache      | `menu:{tenant_id}`                   | BFF/Catalog flow |
| Session         | `session:{tenant_id}:{session_id}`   | Order            |
| Shared cart     | `cart:{tenant_id}:{session_id}`      | Order            |
| Rate limit      | `rl:{endpoint}:{ip/token}`           | BFF              |
| KDS queue       | `kds:{tenant_id}:{station}`          | Kitchen          |
| Ticket snapshot | `kds:{tenant_id}:ticket:{ticket_id}` | Kitchen          |
| Tenant suspend  | `tenant:{tenant_id}:suspended`       | SaaS/BFF         |
| Subscription    | `subscription:{tenant_id}`           | SaaS             |
| OAuth state     | `oauth_state:{state}`                | Payment          |

**Policy callout:**

Not all services are connected to Redis. Currently Redis users are BFF, Order, Kitchen/WebSocket, SaaS and Payment. Catalog, Authorizer, User-Access do not use Redis directly; Notification does not exist in current `apps/*`.

### Visual / layout

Redis in the middle, surrounded by allowed Owner services:

`BFF`, `Order`, `Kitchen`, `WebSocket Gateway`, `SaaS`, `Payment`.

Do not connect Redis to every service.

### Speaker script

Redis in QRTable has many roles. For BFF, Redis is the cache for tokens, menus and rate limits. With Order service, Redis keeps the active session and shared cart, this is the runtime state of the Order domain. With Kitchen service, Redis is the short-term primary store for KDS queue using Sorted Set.

The important point is that Redis is not a place where every service can read and write arbitrarily. The system has a policy clearly stating which services can use Redis and for what purpose, to avoid turning Redis into an uncontrolled shared database.

---

## Slide 18. Data Consistency Strategy

### Slide target

Explain how the system handles race conditions and boundary transactions.

### Content displayed on the slide

**Claim title:**

Consistency is handled at the service that owns the data, not by bypassing the database boundary

**Stock/order flow:**

1. Customer submits order:
   - Only check snapshot availability.
   - Persist order in state `PENDING`.
   - Stock has not been deducted.

2. Staff confirmation:
   - Order locks order row `PENDING`.
   - Order calls Catalog TCP command.
   - Catalog uses transaction/pessimistic lock to deduct stock.
   - If successful, the Order will be transferred to `PROCESSING`.
   - Write outbox `order.confirmed`.

**Principles:**

Catalog owners `menu_items`; Order does not update stock directly.

### Visual / layout

[OWN-CREATED VISUAL]

Sequence diagram:

`Customer` -> `BFF` -> `Order`: submit -> `PENDING`

`Waiter` -> `BFF` -> `Order`: confirm

`Order` -> `Catalog`: deduct stock in transaction

`Order` -> `Outbox/Kafka`: `order.confirmed`

### Speaker script

The easy mistake in QR Order is deducting inventory too early or subtracting inventory at the wrong boundary. QRTable does not deduct stock when the customer has just submitted, because at that time the application still needs confirmation by staff and may be canceled.

Stock is only deducted at the staff confirmation step. Then Order service calls Catalog service, because Catalog is the service that owns menu items and stock. Catalog implements deduction in its transactions. If enough exists, the Order switches to Processing and writes the event to the outbox to publish Kafka. If there is not enough stock, Order still does not go to the kitchen and the staff clearly admits the mistake.

---

## Slide 19. QR Session Flow

### Slide target

Explain how guests can enter the system without logging in but still stay safe within the table/session.

### Content displayed on the slide

**Claim title:**

QR tokens turn each desk into a controlled entry point into the tenant and session

**Flow displayed:**

1. Customer scans QR.
2. URL contains `slug`, `table_id`, `token`.
3. BFF/Catalog validate `HMAC_SHA256(table_id + store_id + secret_key)`.
4. Resolve `tenant_id` and `table_id`.
5. Validate the table belongs to the correct tenant and the QR token has not been rotated/invalid.
6. Check table status:
   - `Available`: create new session.
   - `Occupied`: join current session if not yet billed.
   - `Billing`: block ordering.
7. Order service creates or joins session.
8. Redis saves session/cart runtime.
9. Customer PWA receives menu and cart snapshot.

**Rules:**

- Maximum session lifetime: 2 hours.
- Idle timeout: 30 minutes if there is no order yet.
- Billing state will lock ordering.
- Rate limit to prevent spam scans: for example, maximum 10 scans/table/5 minutes.
- Customer API always checks session ownership: session must belong to `tenant_id` and `table_id`.
- Submit order uses `idempotencyKey` to avoid double-submit when customers click multiple times or the network retries.

### Visual / layout

[OWN-CREATED VISUAL]

Sequence diagram or swimlane:

`Customer Phone`, `BFF`, `Catalog`, `Order`, `Redis`.

### Speaker script

Customers do not need an account. The entry point is the table's QR code. QR URL has table id and HMAC token so the system can verify this is a valid QR, not a homemade URL.

After the QR is valid, the system resolves the tenant and table. There are many layers of validation here: does the tenant slug exist, does the table belong to that tenant, is the HMAC token correct, what state is the table in and has the request exceeded the rate limit.

If the table is free, Order creates a new session. If the table is occupied by an empty stale or closed session, Order safely releases the old binding and creates a fresh session. If the table is occupied by a valid active session, the customer joins the current shared cart. If the table is billing, the system locks ordering to avoid placing an order after payment has been requested. Then, every customer API must check session ownership so that this customer does not view or edit another table's data.

---

## Slide 20. Catalog, Table And QR Logic

### Slide target

Explanation Catalog is not only a menu, but also table management, QR and table status.

### Content displayed on the slide

**Claim title:**

Catalog service is the source of truth for menus, tables, QR tokens and table statuses

**Main content:**

- Category: dish group, active/inactive status, sort order.
- Menu Item: name, description, photo, price, stock, station, available/out-of-stock status.
- Area/Table: area, table, capacity, status, QR token.
- QR token: HMAC, regenerate when needed.
- Table state: `Available -> Occupied -> Billing -> Cleaning -> Available`.
- Cache: menu hot data via Redis, invalidate when menu changes.

### Visual / layout

Entity mini-map:

`Area -> Table -> QR Token`

`Category -> MenuItem -> Station/Stock`

Add a small state machine to the Table.

### Speaker script

Catalog service is often easily understood as only managing menus, but in QRTable Catalog also owns tables and QR tokens. This is reasonable because the QR is directly attached to the table, and the table is the entry point of the customer session.

The menu item also contains important downstream information such as stock and station. Station helps Kitchen know if this dish goes to the kitchen or the bar. When the Owner changes the price or the status is out of stock, the menu cache must be invalidated and the client receives a realtime hint to refetch.

---

## Slide 21. Shared Cart And Order Submit

### Slide target

Explain that cart is a draft runtime in Redis, while order row is only generated when submitting.

### Content displayed on the slide

**Claim title:**

Shared cart is a draft order in Redis, while Order DB only saves from state `PENDING`

**Flow displayed:**

1. Customer views menu by tenant.
2. Add items to cart.
3. Cart saved at `cart:{tenant_id}:{session_id}`.
4. Each change increases `cartVersion`.
5. Submit order sending `expectedCartVersion` and `idempotencyKey`.
6. Order service validate cart snapshot.
7. Persist order `PENDING` and create bill `OPEN` if it is the first submission of the session.
8. BFF emit WebSocket hint to staff.

**Key decisions:**

- `DRAFT` does not persist into order row.
- Cart conflict returns `409` + new snapshot.
- Idempotency avoids double-submission.

### Visual / layout

[OWN-CREATED VISUAL]

Flow diagram:

`Menu` -> `Redis Cart` -> `Submit` -> `Order PENDING` -> `Bill OPEN` -> `Staff WS`.

### Speaker script

Before the customer clicks to order, the system has not yet created the order in the database. The draft status is in the Redis cart. This helps multiple devices at the same table share the shopping cart and provide quick updates.

Each cart has a cartVersion managed by the server. When the client submits, the client sends expectedCartVersion to ensure it does not submit on an old snapshot. If there is a conflict, the server returns a new snapshot for the client to refetch. When submitted successfully, the new Order service persists the order in the Pending state and if this is the first submission of the session, create an open bill for that session.

---

## Slide 22. Order State Machine

### Slide target

Present the order lifecycle and why it is important to have a clear state machine.

### Content displayed on the slide

**Claim title:**

Order lifecycle is controlled by a state machine to avoid false state jumps

**Main state:**

`Draft -> Pending -> Processing -> Ready -> Served -> Completed`

**Cancellation branch:**

- `Pending -> Canceled`: customer self-cancel or staff reject.
- `Processing/Ready -> Canceled`: Manager/Owner needed and reason.

**Important Rules:**

- Draft is just a cart/UI, not persisted like an order record.
- Pending has not deducted stock.
- Processing means confirmed and deducted stock.
- Completed only after payment/bill close.

### Visual / layout

[OWN-CREATED VISUAL]

State machine diagram is large, with few words.

Color:

- Draft/Pending: amber.
- Processing/Ready: blue.
- Served/Completed: green.
- Canceled: red.

### Speaker script

State machines help keep the system from falling into ambiguous states. For example, an order that is Ready cannot be returned to Pending. An order that has been Completed cannot be edited directly. If adjustments are needed, they must go through a refund or audit flow.

In QRTable, Pending is a very important state. The customer has submitted the application but the staff has not confirmed it yet, so the system has not deducted the stock. Only when the staff confirms will the order move to Processing and start going to the kitchen.

---

## Slide 23. Confirm Order + Kafka Outbox

### Slide target

Explain that the confirm flow is where RBAC, stock consistency, transaction, and event-driven intersect.

### Content displayed on the slide

**Claim title:**

Confirm order is the point of committing operations: checking authority, canceling, changing status and broadcasting domain events

**Sequence of content:**

1. Waiter calls `confirm order`.
2. BFF checks JWT, tenant, permission `order.confirm`.
3. Order key order `PENDING`.
4. Order calls Catalog TCP to deduct stock.
5. Catalog transaction successful.
6. Order changes status to `PROCESSING`.
7. Order records outbox row `order.confirmed`.
8. Outbox publisher publishes Kafka.
9. Kitchen consumer creates a KDS ticket.

**Failure handling:**

- Not enough stock: reject confirmation, order still not in the kitchen.
- Kafka temporary error: outbox holds events for retry.

### Visual / layout

[OWN-CREATED VISUAL]

Sequence diagram has 6 lanes:

`Waiter`, `BFF`, `Order`, `Catalog`, `Outbox/Kafka`, `Kitchen`.

### Speaker script

Confirm order is the most important business step in the order flow. It's not just about changing the state on the UI. First, BFF must check if the operator is the correct tenant and has the right to confirm the order.

Then Order service locks the Pending order and requests Catalog service deduct stock. If the Catalog is successfully paid, the Order will move to Processing. At the same time, Order records an outbox event `order.confirmed`. This event will be uploaded to Kafka by the publisher for Kitchen service to consume. Thanks to outbox, if the service crashes after DB commit but before publishing Kafka, the event is still not lost.

---

## Slide 24. Kitchen/KDS Flow

### Slide target

Explain how KDS works after order is confirmed, the role of Kafka and Redis Sorted Set.

### Content displayed on the slide

**Claim title:**

Kitchen service consumes `order.confirmed` and maintains the KDS queue using Redis, no need for a separate database

**Flow displayed:**

1. Kitchen consumes Kafka `order.confirmed`.
2. Separate tickets by `MenuItem.station`: `KITCHEN` or `BAR`.
3. Write the ticket snapshot to Redis.
4. Put tickets into Sorted Set:
   - `kds:{tenant_id}:kitchen`
   - `kds:{tenant_id}:bar`
5. KDS UI refetch queue when receiving WebSocket hint.
6. Chef/Barista update ticket: Pending -> Processing -> Ready.
7. SLA worker issues `kitchen.sla_warning` if the threshold is exceeded.

**Design note:**

Kitchen service Redis-only because KDS queue is a runtime operational view; The source of truth order still belongs to Order service.

### Visual / layout

[OWN-CREATED VISUAL]

Diagram:

`Kafka order.confirmed` -> `Kitchen Consumer` -> `Redis Sorted Sets` -> `BFF WS` -> `KDS Kitchen/Bar`.

Draw 2 parallel queues: Kitchen and Bar.

### Speaker script

Kitchen service does not own the order. It only receives the confirmed order event and creates an operational view for KDS. Because KDS needs speed and FIFO/priority, Redis Sorted Set is more suitable than a relational database for the queue runtime.

Each ticket is routed by station. Dishes go into the kitchen queue, drinks go into the bar queue. When the chef or barista updates the ticket status, this status is broadcast to staff and customers using the appropriate WebSocket mechanism, but the order lifecycle canonical data still needs to be synchronized with the Order service.

---

## Slide 25. Realtime WebSocket Rooms

### Slide target

Explanation WebSocket does not broadcast indiscriminately but divides rooms according to tenant/session/role.

### Content displayed on the slide

**Claim title:**

Realtime updates are routed by room so that each actor only receives the necessary events

**Room mapping:**

| Actor         | Room                       |
| ------------- | -------------------------- |
| Waiter        | `tenant:{tid}:staff`       |
| Chef          | `tenant:{tid}:kds:kitchen` |
| Barista       | `tenant:{tid}:kds:bar`     |
| Owner/Manager | `tenant:{tid}:management`  |
| Customer      | `session:{sid}:customer`   |

**Event examples:**

- `order.created` -> staff room.
- `kds.queue_changed` -> KDS room.
- `kitchen.item_ready` -> staff + customer session.
- Menu mutation -> cache/query invalidation; no current `menu.updated` WS contract.
- `payment.completed` -> customer session or polling baseline.

**Rule:**

WebSocket event is a signal for the UI to refetch or update the view, it does not replace the source of truth.

### Visual / layout

[OWN-CREATED VISUAL]

Hub-and-room diagram:

`BFF WebSocket Gateway` is in the middle, surrounded by rooms. Each event has a different color.

### Speaker script

Realtime in a SaaS system cannot just be broadcast to all clients. If the broadcast is wrong, the kitchen may receive another table's event, or this tenant may see another tenant's event.

So when the client connects to WebSocket, BFF assigns the client to the room based on JWT or session. Waiter receives tenant's staff room, chef receives kitchen room, barista receives bar room, customer receives session room. This method both reduces information noise and ensures tenant isolation at the realtime layer.

---

## Slide 26. Table State Machine & Transfer

### Slide target

Present table status and table transfer flow, because POS operations are not just orders.

### Content displayed on the slide

**Claim title:**

Table state is the central operating state, connecting session, bill and payment

**Table state machine:**

`Available -> Occupied -> Billing -> Cleaning -> Available`

**Rules:**

- `Available -> Occupied`: client scans QR for the first time, creates session.
- `Occupied -> Billing`: customer requests payment, locking ordering.
- `Billing -> Cleaning`: payment completed, session closed.
- `Cleaning -> Available`: staff marks cleaning completed.

**Transfer table:**

- Staff/Manager transfers session/order from old desk to new desk.
- Do not use ACID transactions across Order DB + Catalog DB + Redis.
- Use saga-style flow: transfer lock, update Order, update Catalog, update Redis, compensation if errors.

### Visual / layout

[OWN-CREATED VISUAL]

Half slide: state machine table.
Half slide: mini transfer saga:

`Lock transfer` -> `Update Order/session` -> `Catalog table status` -> `Redis metadata` -> `WS notify`.

### Speaker script

In restaurant POS, table status is a very important part. Tables are more than just displayed data. It decides whether the customer can order or not, whether the bill is required or not and whether the session needs to be closed.

When a customer requests payment, the table switches to Billing and ordering is locked. After successful payment, the table does not return directly to Available but switches to Cleaning. After cleaning, the employee marks Available. This reflects the actual operation of the restaurant.

Table transfer is also a complex flow because it involves Order, Catalog and Redis. Since it is not possible to have an ACID transaction across all stores, the system uses a saga-style approach with locking and compensation.

---

## Slide 27. Payment: Cash And SePay/VietQR

### Slide target

Explain payment according to the Vietnamese market and the boundary between Order/Payment.

### Content displayed on the slide

**Claim title:**

Payment service records payment, but bill lifecycle still belongs to Order service

**Cash flow:**

1. Staff choose bill `PENDING_PAYMENT`.
2. Enter the amount of money given by the customer.
3. Overage calculation system.
4. Payment records record `PAID`.
5. Emit `payment.completed`.

**VietQR/SePay flow:**

1. Payment generates QR URL `qr.sepay.vn/img`.
2. QR has amount = `rounded_total`.
3. The transfer content contains `QRTBL` + 8 billId characters.
4. SePay sends webhook to BFF.
5. BFF verify webhook auth by route.
6. Payment match bill reference, check amount.
7. Enough/excess money -> `PAID`; lack of money -> hold `PENDING` + audit.

**VND rounding:**

`rounded_total = Math.ceil(raw_total / 1000) * 1000`

### Visual / layout

[OWN-CREATED VISUAL]

Sequence diagram Payment:

`POS` -> `BFF` -> `Payment` -> `SePay QR` -> `Webhook` -> `Payment` -> `Order/Kafka`.

Add small callout: `No redirect, QR inline`.

### Speaker script

Payment is designed to suit the Vietnamese context. Instead of using Stripe as some initial proposals, the system chose SePay + VietQR. Staff or customers see the QR directly on the interface, the customer transfers money via the banking app, SePay detects the transaction and calls the webhook to BFF.

Payment service is responsible for recording payments, checking webhooks, saving paid amounts, refunds and audits. However, the lifecycle bill is still under Order service. This prevents Payment from arbitrarily closing the session or changing the table status without going through the bill's business Owner.

---

## Slide 28. Saga, Idempotency And Outbox

### Slide target

Summary of reliability mechanisms for multi-step flows.

### Content displayed on the slide

**Claim title:**

Saga, idempotency and outbox help distributed flow without leaving half-baked states

**Order Confirm Saga:**

- Validate/lock order `PENDING`.
- Catalog deductible stocks.
- Order transfer `PROCESSING`.
- Outbox publish `order.confirmed`.
- Compensation: release stock/revert order if the following step fails.

**Payment Complete Saga:**

- Validate bill/order items eligible for payment.
- Payment `PAID`.
- Order mark bill paid.
- Table `Billing -> Cleaning`.
- Close session.

**Reliability mechanisms:**

- Idempotency key for submit/payment webhook.
- Outbox row recorded with DB transaction.
- Retry background publisher.
- Audit for cancel/refund/payment.

### Visual / layout

[OWN-CREATED VISUAL]

3 horizontal layers:

`Business Flow` -> `Failure Point` -> `Recovery Mechanism`.

Or 2 saga mini diagrams in parallel.

### Speaker script

In distributed systems, errors can occur in the middle of the flow. For example, the Catalog has deducted stock but the Order has not changed its status, or Payment has recorded paid but the Order has not received the event. If you only write happy path, the system will easily get out of state.

Therefore, QRTable uses three mechanisms. Saga models steps and compensation. Idempotency helps retry not create duplicate orders or payments. Outbox helps the event not be lost when the DB has committed but the Kafka publish has a temporary error.

---

## Slide 29. Observability, Testing And Deployment

### Slide target

Shows that distributed systems need observability and testability, not just functionality.

### Content displayed on the slide

**Claim title:**

Microservices only make sense when the system can be tested, traced and deployed reproducibly

**Testing focus:**

- Unit: state machine, VND rounding, HMAC QR, permission logic.
- Integration: BFF -> TCP service, Order -> Catalog deduction stock, Redis cart/session.
- E2E: QR -> order -> staff confirm -> KDS -> payment.
- Concurrency: 2 requests for the same final item, only 1 confirmed successfully.

**Observability stack:**

- Logs: Loki + Promtail.
- Metrics: Prometheus + Grafana.
- Traces: Tempo + OpenTelemetry.
- Business metrics: order/min, KDS wait time, payment status.

**Deployment:**

- Docker Compose infra: PostgreSQL, Redis, Mongo, Keycloak, Kafka.
- Docker Compose app: BFF, Auth, Catalog, Order, Kitchen, Payment, SaaS, Notification.

### Visual / layout

3 columns:

`Testing` | `Observability` | `Deployment`

Mini trace lines can be added:

`BFF -> Order -> Catalog -> Kafka -> Kitchen`.

### Speaker script

When the system switches to microservices, the difficulty is not only in writing services. The difficulty is how to know where the error is when a request goes through many hops.

Therefore, the complete part of the topic includes testing, observability and deployment. Testing focuses on fragile points such as state machine, tenant isolation, stock concurrency and payment. Observability helps trace an order from BFF through Order, Catalog, Kafka and Kitchen. Deployment using Docker Compose makes demo and evaluation reproducible in other environments.

---

## Slide 30. Roadmap, Demo Script and Conclusion

### Slide target

End the article with the actual state, demo scenario and concluding contributions.

### Content displayed on the slide

**Claim title:**

QRTable demonstrates the core architectural direction and has a clear roadmap to complete into a fully operational system

**Roadmap theo phase:**

- **Phase 0:** Foundation, Nx monorepo, auth, app skeleton.
- **Phase 1:** Catalog + menu + table + QR + Cloudinary.
- **Phase 2A:** Permission + Order + Redis cart/session + Kafka `order.confirmed`.
- **Phase 2B:** Kitchen/KDS + WebSocket realtime.
- **Phase 3:** Payment SePay/VietQR + Cash + refund/audit.
- **Phase 4:** Saga hardening, SaaS onboarding, notification/staff.
- **Phase 5-7:** Testing, observability, Docker deploy, final demo.

**Recommended demo script:**

1. Customer scans QR, goes to the correct tenant/table.
2. View menu, add dishes to shared cart.
3. Submit order, staff receives new order.
4. Staff confirmed, stock deducted, Kafka event creates KDS ticket.
5. Chef/Barista processes the ticket, the customer sees the status.
6. Customer requests payment, staff processes cash or VietQR.
7. Observe trace/log/metric to demonstrate distributed flow.

**Conclusion:**

QRTable is a reference PoC architecture for SaaS POS F&B, focusing on service ownership, tenant isolation, realtime communication and consistency.

### Visual / layout

Timeline roadmap + demo checklist.

If you need to give percentage progress, use the latest data from `implementation_plan.md` and check again before generating the last slide.

### Speaker script

To conclude, the project not only implemented a QR ordering flow, but also built a reference architecture for a SaaS POS platform in the F&B context.

The phases are organized according to the roadmap from foundation, catalog, order, KDS, payment to hardening, observability and deployment. The final demo script should demonstrate the architecture, not just screen clicks: each UI action should indicate the request goes through the BFF, which service owns the data, which state changes, which events are fired, and which client receives realtime updates.

The main contribution of the topic is how to combine Microservices, multi-tenancy, Redis runtime state, Kafka domain events, WebSocket realtime and Keycloak/RBAC in a specific F&B problem, verifiable by PoC.

---

## 1. Appendix For AI Slide: List of Visuals That Need to Be Prepared Separately

The visuals below should be created using Mermaid/Figma/Excalidraw to ensure accuracy, then attached to the slide:

1. **Slide 02:** End-to-end QRTable runtime pipeline.
2. **Slide 04:** 4-quadrant architecture challenges.
3. **Slide 06:** Domain capability map.
4. **Slide 09:** Overall layered architecture.
5. **Slide 12:** Multi-tenant isolation diagram.
6. **Slide 13:** Tenant resolution flow.
7. **Slide 14:** Guard chain.
8. **Slide 16:** Kafka decision flowchart.
9. **Slide 18:** Stock consistency sequence.
10. **Slide 19:** QR session sequence.
11. **Slide 21:** Shared cart/order submit flow.
12. **Slide 22:** Order state machine.
13. **Slide 23:** Confirm order + outbox sequence.
14. **Slide 24:** KDS Redis queue flow.
15. **Slide 25:** WebSocket room mapping.
16. **Slide 26:** Table state machine + transfer saga.
17. **Slide 27:** SePay/VietQR payment sequence.
18. **Slide 28:** Saga/idempotency/outbox reliability map.
19. **Slide 29:** Observability trace.
20. **Slide 30:** Roadmap timeline.

---

## 2. Appendix for Presenters: 5-Chapter Speaking Circuit

If you need to talk shorter, combine 30 slides into 5 chapters:

1. **Background and objectives:** Slide 01-05.
2. **Scope and actors:** Slide 06-08.
3. **Overall architecture:** Slide 09-18.
4. **Core Flow:** Slide 19-28.
5. **Completion, demo, conclusion:** Slide 29-30.

The pulse should keep rhythm:

- Don't start with technology. Let's start with the problem of F&B operations.
- When talking about technology, always stick to the reason: Redis for runtime state, Kafka for domain events, WebSocket for realtime push, Keycloak for IAM.
- When talking about microservices, always stick to ownership: which service owns which data.
- When saying "deployed", do not overclaim production-ready. Should say "PoC/phase deployed to verify the architecture".

---

## 3. Appendix for Presenters: RBAC and Validation Cheat Sheet

This section is used to answer the panel's questions or add to speaker notes if the AI-generated slide lacks details.

### 3.1. Staff/Admin login validation

When internal users log in:

1. Management App redirect via Keycloak login.
2. Keycloak authenticates credential and issues JWT.
3. JWT contains role claim and `tenant_id`.
4. BFF receives request, `UserGuard` checks Redis token cache.
5. If cache misses, BFF calls Authorizer service via gRPC.
6. Authorizer service verify JWT/JWKS with Keycloak.
7. The system checks whether the user has been provisioned in user-access.
8. Roles in JWT must be mapable with roles/permissions in DB.
9. `TenantGuard` checks that users only operate within their tenant, except Super Admin.
10. `PermissionGuard` checks which permission the endpoint requires.

Errors that should be mentioned if asked:

- `401 invalid_token`: wrong token, expired or verification failed.
- `401 user_not_provisioned`: token is valid but the user does not exist in the application profile.
- `403 permission_denied`: user is authenticated but lacks permission.
- `403 tenant_mismatch`: user tries to access another tenant.

### 3.2. Customer QR/session validation

When customers scan QR:

1. QR URL contains tenant slug, `table_id` and HMAC token.
2. HMAC validation system to prevent fake QR or homemade URLs.
3. Resolve slug -> `tenant_id`.
4. Check the table exists, belongs to the correct tenant and the token matches the table/store secret.
5. Check table status:
   - `Available`: create new session.
   - `Occupied`: join current session.
   - `Billing`: block ordering more dishes.
   - `Cleaning`: block new session until staff mark clean.
6. Session is stored persistently in Order DB and mirror runtime in Redis.
7. Customer API uses `SessionGuard -> TenantGuard`, does not use PermissionGuard according to DB role.
8. Every customer operation must check session/table ownership.

### 3.3. Permission examples should be remembered

| Situation                        | Main permission or guard   | Meaning                                                                        |
| -------------------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| Waiter confirms the order        | `order.confirm`            | Only valid operating staff are allowed to enter the kitchen                    |
| Waiter cancels pending order     | `order.cancel_pending`     | Orders that have not been processed into the kitchen can be rejected/cancelled |
| Manager cancels processing order | `order.cancel_processing`  | Application has entered the kitchen and needs higher authority and reason      |
| Chef updates ticket              | `kitchen.update_ticket`    | Only the kitchen/bar handles KDS tickets                                       |
| Owner/Manager set priority KDS   | `kitchen.set_priority`     | Chef/Barista does not automatically change priority                            |
| Waiter confirms cash             | `payment.confirm_cash`     | Cashier staff confirmed receipt of money                                       |
| Owner/Manager refund             | `payment.refund`           | Refunds require management and auditing rights                                 |
| Customer submit order            | `SessionGuard` + ownership | Customer does not have a DB role                                               |

### 3.4. Short explanation when asked "How does RBAC work?"

> QRTable separates authentication and authorization. Keycloak is responsible for identity authentication and JWT issuance. Then BFF not only trusts the JWT, but also checks the application profile and permissions in user-access. Each request goes through `UserGuard` or `SessionGuard`, then `TenantGuard`, then `PermissionGuard` if it's an internal API. Customers don't need Keycloak; Customer is limited by QR HMAC token, session and ownership by table/session.

---

## 4. General Prompt For AI Deck Creation

```text
You are the AI ​​that creates graduation thesis report slides in Vietnamese.

Let's create a 16:9 slide deck from this brief document. Here is a technical thesis deck on the topic:
"Research and build a SaaS POS platform that integrates ordering via QR code based on Microservices architecture".

Request:
- Serious, modern style, technical platform, no marketing.
- Each slide has a main claim in the title.
- The content on the slide is concise and easy to see; Long explanation is in speaker notes/script.
- Slides with [CREATE SEPARATE VISUAL] need to leave a clear layout for the diagram; Do not make up additional nodes or flows beyond the description.
- Keep terminology correct: BFF, tenant_id, Redis, Kafka, WebSocket, Keycloak, SePay/VietQR, outbox, saga.
- Not saying everything uses Kafka. Emphasize that Kafka is selectively used for domain events, while UI side-effects use BFF Direct/WebSocket.
- Does not say production-ready system. This is an architectural PoC being implemented in phases.
- Do not tell Customer to use Keycloak. Customer uses QR HMAC token + session.
- Don't say Payment service owns the bill. Bill belongs to Order service.

Create a deck according to the 30 slides in the brief, including:
1. display content
2. Separate speaker notes for each slide
3. Note the visual/diagram to insert
```
