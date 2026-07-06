# QRTable Management Application (management-app)

> This document provides a detailed guide on the source code structure, system architecture, state management mechanisms, security, and outlines an optimal roadmap for developers to understand the source code.

---

## 1. Architectural Overview

The **Management App** is built on **Next.js App Router (v15)**, serving as the dashboard and operations system for three user groups:

1.  **Super Admin (SaaS Admin)**: Manages restaurants (Tenants), subscription plans (Subscriptions), payments, and system-wide revenue.
2.  **Restaurant Owner / Manager**: Manages menus, table layouts, staff, and VietQR payment configurations for individual restaurants.
3.  **Staff (Waiter, Chef, Barista)**: Handles point-of-sale (POS) operations, views table support requests, and prepares items at the kitchen/bar (KDS).

### Main Directory Structure (`src/`)

```text
apps/management-app/src/
├── app/                        # Next.js App Router
│   ├── (admin)/                # Route Group for Super Admin (/admin)
│   ├── (auth)/                 # Keycloak Login (/login)
│   ├── (dashboard)/            # Restaurant Management Dashboard (/dashboard)
│   ├── (kds)/                  # Kitchen/Bar Display Screen for Chefs/Baristas (/kds)
│   ├── (pos)/                  # Counter Point of Sale for Waiters (/pos)
│   ├── api/                    # Local API Routes (Auth callbacks, Session sync proxy)
│   ├── layout.tsx              # Root Layout
│   └── providers.tsx           # Wrappers for global providers (React Query, NextAuth, Theme)
├── auth.ts                     # NextAuth v5 configuration integrated with Keycloak (OIDC/OAuth)
├── middleware.ts               # Next.js Middleware to control route protection & role-based access control (RBAC)
├── constants/
│   ├── api.ts                  # BFF API endpoints and cache configuration
│   └── routes.ts               # Constants defining all application routes
├── lib/
│   ├── api/
│   │   └── authenticated-client.ts # API Client that automatically injects Keycloak Bearer Token & Tenant Headers
│   ├── auth/
│   │   ├── auth-store.ts       # Zustand Store for client-side profiles and tokens
│   │   ├── bff-server.ts       # Direct API calls from Next.js server-side to the BFF
│   │   └── role-routing.ts     # Mapping application roles (AppRole) to page access permissions
│   └── utils.ts                # Shared utility functions
├── features/                   # Modular independent business features
│   ├── saas/                   # Subscription, Tenant, and Plan Management
│   ├── kds/                    # Real-time Kitchen Display System
│   ├── pos/                    # Point of Sale (POS) operations and cart
│   ├── order/                  # Order list and details management
│   ├── tenant/                 # Restaurant profile configurations, SePay bank accounts
│   ├── tables/                 # Areas & tables layouts + QR Generator
│   └── staff/                  # Staff management & permission accounts
└── components/                 # Shared UI components across the application (Shadcn-based)
```

---

## 2. Authentication & State Synchronization Management

One of the most critical designs in `management-app` is the synchronization of login credentials from the **Server-side (NextAuth)** to the **Client-side (Zustand)** to optimize performance and secure the APIs:

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant NextAuth as NextAuth.js (Server)
    participant Hydrator as AuthSessionHydrator (Client)
    participant APIProxy as NextJS API Route (/api/internal/me)
    participant BFF as Backend Gateway (BFF)
    participant Zustand as Zustand Store (useAuthStore)

    User->>NextAuth: Log in successfully via Keycloak
    NextAuth-->>User: Set Session Cookie containing JWT
    Note over User, NextAuth: Render Client App & mounted Providers
    Hydrator->>NextAuth: Get accessToken from Client Session Hook
    Hydrator->>APIProxy: GET /api/internal/me (With Cookie)
    APIProxy->>BFF: GET /customer/authorizer/me (Bearer Token)
    BFF-->>APIProxy: Return User Profile & Permissions details
    APIProxy-->>Hydrator: Return Profile JSON
    Hydrator->>Zustand: setAccessToken(token) & setProfile(profile)
    Note over Zustand: Hydrated state = true. Ready to call APIs.
```

### Key files involved in this flow:

1.  **[auth.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/auth.ts)**:
    - Integrates the Keycloak Provider.
    - Registers the `jwt()` callback to decode the `realm_access.roles` field and calls the BFF to fetch the profile.
    - Supports automatic token refreshing (`refreshAccessToken`) in the background via offline access/refresh token when it is close to expiring.
2.  **[auth-session-hydrator.tsx](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/components/auth/auth-session-hydrator.tsx)**:
    - Listens to login state changes from NextAuth `useSession()`.
    - If a token is expired and cannot be refreshed (`RefreshAccessTokenError`), automatically redirects the user to log in again via SSO.
    - Calls the intermediate API route `/api/internal/me` on the Next.js Server to retrieve the full profile and synchronizes the data into `useAuthStore`.
3.  **[auth-store.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/lib/auth/auth-store.ts)**:
    - A lightweight Zustand store that holds the `profile`, `accessToken`, and client readiness state (`hydrated`).
4.  **[authenticated-client.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/lib/api/authenticated-client.ts)**:
    - The API Client wrapper `authApiClient`. It automatically pulls the token and `tenantId` from the Zustand Store to attach to headers:
      ```typescript
      headers['Authorization'] = `Bearer ${accessToken}`;
      headers['x-tenant-id'] = tenantId;
      ```

---

## 3. Role-Based Access Control (RBAC)

The permission system is strictly enforced at both the **Routing level** and the **API level**:

### Routing via Next.js Middleware

The **[middleware.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/middleware.ts)** file runs before every request to verify access permissions:

- **Public page (`/`)**: If the user is already logged in, they are automatically redirected to their respective home page corresponding to their role via the `getRoleHomeRoute(roles)` function.
- **Protected routes (`/dashboard`, `/pos`, `/kds`, `/admin`)**:
  - If not logged in: Redirects to `/login`, saving the original path in the `?next=...` query parameter to redirect back after login.
  - If logged in: Calls the `hasAccessToPath(pathname, roles)` function from **[role-routing.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/lib/auth/role-routing.ts)** to verify access. If unauthorized, automatically redirects the user to the closest valid Home Route.

### Role Configuration & Access Permissions Mapping:

- `SUPER_ADMIN` $\rightarrow$ `/admin` (Manages the entire SaaS POS platform).
- `OWNER` / `MANAGER` $\rightarrow$ `/dashboard` (Manages menus, staff, revenues, and table layouts of the restaurant).
- `WAITER` $\rightarrow$ `/pos` (Creates quick table orders, records support requests).
- `CHEF` $\rightarrow$ `/kds/kitchen` (Views the kitchen's list of food items to prepare).
- `BARISTA` $\rightarrow$ `/kds/bar` (Views the bar's list of beverages to prepare).

---

## 4. State Management & Real-time Cache Invalidation

Similar to the Customer PWA, the Next.js Management App uses the **WebSocket Invalidation Hints** mechanism to combine the benefits of REST APIs (easy to manage, secure, cacheable) with WebSockets (real-time):

1.  **REST Fetching**: The UI uses React Query (`useQuery`) to fetch data from the BFF.
2.  **WebSocket Listener**: When changes occur in the system (e.g., guest places a new order, guest requests payment, food preparation is completed), the BFF emits a real-time event via Socket.io.
3.  **Invalidate Cache**: Custom real-time hooks listen to events and simply invalidate React Query cache (`queryClient.invalidateQueries`).
4.  **Auto Re-fetch**: React Query detects that the cache is invalidated and automatically triggers background REST API calls to fetch fresh data and update the UI.

### Typical Example: KDS Real-time Queue

The kitchen display screen listens to events via the **[use-kds-realtime.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/kds/hooks/use-kds-realtime.ts)** hook:

- Kitchen staff logs in and selects a station (e.g., Kitchen or Bar).
- The hook connects to the socket using the JWT auth token and sends a signal to subscribe to the respective kitchen/bar room:
  ```typescript
  socket.emit('subscribe.kds', { station });
  ```
- Listens to events like `events.kdsQueueChanged`, `events.kitchenItemReady`, and `events.kitchenSlaWarning`, then invalidates the React Query cache corresponding to that station to refresh the food queue.

---

## 5. Source Code Navigation Roadmap

To quickly grasp and master the codebase of the management application, you should approach it in the following 5-step order:

### Step 1: Authentication & Login Flow

Learn how the system authenticates users and manages permissions.

- **[auth.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/auth.ts)**: NextAuth and Keycloak configuration.
- **[middleware.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/middleware.ts)** and **[role-routing.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/lib/auth/role-routing.ts)**: Route interception mechanisms and role-based redirection.
- **[auth-session-hydrator.tsx](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/components/auth/auth-session-hydrator.tsx)**: How to sync Server Session into Client State (Zustand).

### Step 2: API Client & Core Utilities

Learn how APIs are called from the client to the backend.

- **[authenticated-client.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/lib/api/authenticated-client.ts)**: How tokens and tenant IDs are automatically attached to headers.

### Step 3: Basic Features Comprehension (SaaS & Tenant)

Understand how to build a complete CRUD module using React Query.

- **[features/saas/README.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/saas/README.md)**: Monorepo layering rules regarding status badges and display text.
- **[features/saas/api.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/saas/api.ts)**: Inspect API service structuring integrated with pagination (`normalizePaginated`).

### Step 4: Real-time Kitchen (KDS) & Point of Sale (POS)

Explore more complex interactive features combining Socket.io.

- **[features/kds/hooks/use-kds-realtime.ts](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/kds/hooks/use-kds-realtime.ts)**: How to listen to kitchen queue events and invalidate cache.
- **`features/pos/`**: Grasp the flow of counter ordering, table status updates, and invoice processing.

### Step 5: Understanding App Layouts & Pages

After mastering the business logic and states above, see how the UI is assembled in Next.js pages:

- System admin pages: `src/app/(admin)/admin/tenants/page.tsx`
- Restaurant management dashboard: `src/app/(dashboard)/dashboard/menu/page.tsx`
- Kitchen KDS screen: `src/app/(kds)/kds/kitchen/page.tsx`
- POS screen: `src/app/(pos)/pos/tables/page.tsx`

---

## 6. Development Guidelines

When developing new features or refactoring the code in `management-app`, always comply with the following rules:

1.  **Do not call `process.env` directly in business components**: Always retrieve environment variables from the shared configuration or secure server-side files.
2.  **Do not hardcode display labels directly**: Use language mapping helpers (e.g., `billingPeriodVi`, `subscriptionStatusVi` from `@einvoice/shared-constants`) to maintain bilingual Vietnamese-English consistency.
3.  **Separate UI and Data Fetching**:
    - Create React Query custom hooks placed in the `features/{feature}/hooks/` directory instead of writing inline `useQuery` inside the Page/Component file.
    - Avoid excessively large components (> 300 lines); decompose them into localized subcomponents.
4.  **Always attach `x-tenant-id`**: For tenant-scoped APIs, ensure the client utilizes the correct `authApiClient` wrapper to prevent cross-tenant data leakage (Tenant Isolation).
