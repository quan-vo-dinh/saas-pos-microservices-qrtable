# Documents detailing the Authentication, Authorization, Role & Permission System

**Version:** Step 0.6B
**Update date:** 2026-05-13 (refresh supporting RBAC reference after Phase 4B)
**Status:** Supporting reference, not canonical source for RBAC

> **Current status:** RBAC canonical source of truth is [permission matrix](../architecture/permission-matrix.md), compared to `libs/constants/src/lib/enum/role.enum.ts` and `apps/user-access/src/seeder/role.json`. The current snapshot after Phase 4B has 65 permissions: `SUPER_ADMIN=65`, `Owner=37`, `MANAGER=34`, `WAITER=15`, `CHEF=6`, `BARISTA=6`. If this document differs from canonical matrix or code/seed, give priority to canonical matrix and code/seed.

---

## Table of Contents

1. [Auth System Overview](#1-auth-system-overview)
2. [Overall Architecture](#2-overall-architecture)
3. [6 Main Roles of the System](#3-6-main-roles-of-the-system)
4. [Request Lifecycle](#4-request-lifecycle)
5. [Details of Each Guard](#5-details-of-each-guard)
6. [Decorators & Metadata](#6-decorators-metadata)
7. [Keycloak Integration](#7-keycloak-integration)
8. [MongoDB: Role & User Mapping](#8-mongodb-role-user-mapping)
9. [Permission Matrix Details](#9-permission-matrix-details)
10. [Login Flow (JWT Flow)](#10-login-jwt-flow)
11. [Guest/Customer Session Stream](#11-guestcustomer-session stream)
12. [Seed Script & Role Bootstrap](#12-seed-script-role-bootstrap)
13. [Error Codes & Debugging](#13-error-codes-debugging)
14. [Checklist Debug Auth Issues](#14-checklist-debug-auth-issues)

---

## 1. Auth System Overview

### 1.1 Dual Authentication Model

The QRTable system uses **2 parallel authentication models**:

```
┌─────────────────────────────────────────────────────┐
│ QRTable AUTHENTICATION SYSTEM │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 1. JWT Authentication (System Personnel) │
│     - Flow: Username/Password → Keycloak            │
│     - Token: RS256 signed JWT with tenant_id claim   │
│     - Actor: SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA │
│ - Manager: Keycloak Realm "qrtable" │
│                                                      │
│ 2. Session Authentication (Customer/Guest) │
│     - Flow: CreateSessionID → Redis                     │
│     - Token: UUID-based session ID in Redis      │
│ - Actor: Customer (anonymous) │
│ - TTL: 2 hours (with idle timeout of 30 minutes) │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Combination policy:**

- If route has `@Authorization({ secured: true })` → JWT request from UserGuard
- If the route does not have a decorator → SessionGuard can create/reuse anonymous sessions
- TenantGuard enforces tenant isolation for both types of actors

### 1.2 FE Navigation (Management App) vs Permission Check (BFF)

The Next.js `management-app` application uses **middleware + role-based sidebar** so that users only see **areas** (dashboard, POS, KDS, admin) that match the persona. **This is not a PermissionGuard replacement layer:** All API staff must still match `permissions[]` from Authorizer according to the canonical matrix. Full description, comparison table, and refined TODO: [permission matrix](../architecture/permission-matrix.md) §9 · `AGENTS.md` (Frontend RBAC entry).

---

## 2. Overall Architecture

### 2.1 Main Ingredients

```
┌─ FRONTEND ───────────────────────────────────────────────┐
│  (Web/PWA)                                              │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTP Request (JWT or Session ID)
                 ▼
        ┌─ BFF GATEWAY ──────────────────────────────┐
        │  Port: 3300                                │
        │  ┌─ TenantMiddleware                       │
│  │  (resolve tenant from header/subdomain)   │
        │  ├─ UserGuard                             │
        │  │  (verify JWT → Authorizer gRPC)        │
        │  ├─ SessionGuard                          │
        │  │  (manage session → Redis)              │
        │  ├─ TenantGuard                           │
        │  │  (enforce tenant isolation)            │
        │  └─ PermissionGuard                       │
        │     (check permissions)                   │
        │  └─ Controllers                           │
        │     (Catalog, Invoice, User, etc.)        │
        └────┬──────────────────────────────────────┘
             │
      ┌─────┴─────┬─────────────┬──────────────┐
      ▼           ▼             ▼              ▼
  Catalog     Invoice        User-Access    SaaS
  Service     Service        Service        Service
  (TCP)       (TCP)          (gRPC)         (TCP)
  Port 7001   Port 7002      Port 5001      Port 7003
             │
             ▼
         MongoDB
         Port 27017
         Database: qrtable
         Collections: role, user

```

### 2.2 Authorization Data Flow

```
1. Request to BFF (with JWT or Session ID)
   ↓
2. TenantMiddleware gets tenant from x-tenant-id header or subdomain
   ↓
3. UserGuard (if route secured=true):
   - Parse JWT
- verify signature with Keycloak JWKS
   - Call Authorizer gRPC → verifyUserToken
- Authorizer gets user profile from User-Access
- Validate role mapping between Keycloak roles and internal roles
   ↓
4. SessionGuard (if the route is not secured):
- Create/reuse sessions from Redis
   ↓
5. TenantGuard:
- Enforce tenant from JWT claim or session
- Check consistency between request tenant vs claim/session
   ↓
6. PermissionGuard:
- If route has @Permissions decorator
- Check user permissions contains the required permissions
   ↓
7. Controller → build TCP RequestContext
- Attach processId, tenantId, userId, sessionId
   ↓
8. Downstream service (Catalog, Invoice, etc.)
- Get context
   - Verify tenant consistency
   - Execute business logic (auto-filtered by tenant)
```

---

## 3. 6 Main Roles of the System

### 3.1 Summary Table of 6 Roles (Including Super Admin)

| **Role**        | **Description**                                                                                  | **Scope**                   | **User**      | **Keycloak Role** | **Permissions** |
| --------------- | ------------------------------------------------------------------------------------------------ | --------------------------- | ------------- | ----------------- | --------------- |
| **SUPER_ADMIN** | Platform admin, entire system rights                                                             | Cross-tenant platform-level | System Admin  | `SUPER_ADMIN`     | 65              |
| **Owner**       | Restaurant/store owners, including checkout subscription and payment settings                    | Single-tenant (Owner only)  | Shop Owner    | `Owner`           | 37              |
| **MANAGER**     | Executive management; has own-tenant visibility, no checkout/update payment settings/delete user | Single-tenant               | Store Manager | `MANAGER`         | 34              |
| **WAITER**      | Waitress                                                                                         | Single-tenant               | Staff         | `WAITER`          | 15              |
| **CHEF**        | Chef                                                                                             | Single-tenant               | Chef          | `CHEF`            | 6               |
| **BARISTA**     | Bartender                                                                                        | Single-tenant               | Bartender     | `BARISTA`         | 6               |

### 3.2 Special Actor: CUSTOMER (Guest)

**Customer** is not a role in Keycloak but is:

- Customers scan QR when entering the restaurant
- **No account** → no need to login
- **Authenticated** using SessionGuard → random session ID in Redis
- **tenant binding**: tenant from QR code or host/subdomain
- **Permission**: No RBAC role/permission in `role.json`; The customer reads the public menu and views the order/payment status of the session itself through the guard/controller scope.

> For details CUSTOMER endpoint + SessionGuard scope see [Permission Matrix §7](../architecture/permission-matrix.md#7-customer-actor-no-db-role).

---

## 4. Request Lifecycle

### 4.1 Request Lifecycle Details at BFF

```typescript
// Assume request: POST /api/v1/catalog/create
// Header: Authorization: Bearer <JWT>
//         x-tenant-id: tenant-a

STEP 1: TenantMiddleware
├─ Read x-tenant-id from header → request[MetadataKey.TENANT_ID] = "tenant-a"
└─ Or parse from subdomain/host → request[MetadataKey.TENANT_ID]

STEP 2: UserGuard (global)
├─ Reflector.get(SECURED) from decorator @Authorization
├─ If decorator is not available or secured=false → return true (skip JWT check)
├─ If secured=true:
│  ├─ getAccessToken from Authorization header
│  ├─ Check cache: user-token:{hash} in Cache Manager (Redis)
│ │ └─ If that → setUserData(req, cacheData) → return true
│ ├─ If cache miss:
│  │  ├─ Call Authorizer gRPC → verifyUserToken(token, processId)
│  │  ├─ Authorizer service:
│  │  │  ├─ jwt.decode → get header.kid
│  │  │  ├─ jwksClient.getSigningKey(kid) → get public key
│  │  │  ├─ jwt.verify(token, publicKey) → verify RS256
│  │  │  ├─ userId = payload.sub
│  │  │  ├─ User-Access gRPC → getByUserId(userId)
│ │ │ ├─ If user does not exist:
│  │  │  │  └─ If AUTO_PROVISION_ON_FIRST_LOGIN=true
│  │  │  │     └─ autoProvisionFromToken → upsertByIdentity
│  │  │  ├─ validateRoleMapping:
│  │  │  │  ├─ keycloakRoles = payload.realm_access.roles
│  │  │  │  ├─ internalRoles = user.roles (from MongoDB)
│  │  │  │  ├─ normalize both sets to uppercase
│  │  │  │  └─ Check intersection: any(keycloakRoles) ∩ any(internalRoles) != ∅
│  │  │  │     └─ If empty → throw ROLE_MAPPING_MISMATCH
│  │  │  └─ collectPermissions from user.roles[*].permissions
│  │  ├─ Return AuthorizeResponse { valid, metadata: { jwt, permissions, user } }
│ │ ├─ Cache results for 30 minutes
│  │  └─ setUserData(req, response)
│  └─ Return true

STEP 3: SessionGuard (global)
├─ Reflector.get(SECURED)
├─ If secured=true → return true (skip session)
├─ If not:
│  ├─ getSessionIdFromRequest: x-session-id header/cookie
│ ├─ If there is existingSessionId:
│  │  ├─ getSessionCacheKey(sessionId) → "session:{sessionId}"
│ │ ├─ Get from cache
│  │  ├─ Check idle timeout: (now - lastActivityAt) > IDLE_TIMEOUT_MS (30 minutes)
│  │  │  └─ If idle → delete session, create new
│  │  ├─ Update lastActivityAt
│  │  └─ request[MetadataKey.SESSION_ID] = sessionId
│ ├─ If there is no sessionId:
│  │  ├─ Generate: "sid_{random UUID}"
│  │  ├─ Store Redis: { tenantId, createdAt, lastActivityAt }
│ │ ├─ TTL: 2 hours
│  │  └─ response.setHeader(x-session-id, sessionId)

STEP 4: TenantGuard (global)
├─ Check if excluded path: /authorizer, /saas, /health → return true
├─ Get claimTenantId from userData.metadata.jwt.tenant_id
├─ Get tenantId = request[TENANT_ID] || claimTenantId
├─ If SUPER_ADMIN → return true (bypass tenant check)
├─ If !tenantId → throw ForbiddenException("tenant is required")
├─ If claimTenantId && claimTenantId !== tenantId
│  └─ throw ForbiddenException("Tenant mismatch with user identity")
├─ If there is sessionId:
│ ├─ Get session from cache
│  ├─ If session.tenantId && session.tenantId !== tenantId
│  │  └─ throw ForbiddenException("Tenant mismatch with session")
│  ├─ If !session.tenantId
│  │  └─ Backfill: cache.set({ ...session, tenantId })
│  └─ Check: tenant consistency confirmed
├─ request[MetadataKey.TENANT_ID] = tenantId
└─ return true

STEP 5: PermissionGuard (global)
├─ requiredPermissions = Reflector.get(Permissions, handler)
├─ If !requiredPermissions → return true (optional)
├─ userData = request[MetadataKey.USER_DATA]
├─ If !userData → throw UnauthorizedException
├─ userPermissions = userData.metadata.permissions
├─ If !requiredPermissions.every(p => userPermissions.includes(p))
│  └─ throw ForbiddenException("Permission denied")
└─ return true

STEP 6: ThrotlerGuard (global)
└─ Check rate limit theo IP/user

STEP 7: Controller Execution
├─ Decorators injected:
│  ├─ @ProcessId() → getProcessId or from request metadata
│  ├─ @UserData() → request[MetadataKey.USER_DATA]
│  └─ @RequestTenant() → request[MetadataKey.TENANT_ID]
├─ Build TCP RequestContext:
│  ├─ processId
│  ├─ tenantId
│ ├─ userId (from userData.metadata.userId)
│  ├─ sessionId (from request[MetadataKey.SESSION_ID])
│  └─ data: { ...body/params }
├─ Call downstream service (Catalog, Invoice, etc.) via TCP
└─ Return response

STEP 8: Response
├─ response.setHeader(x-process-id, processId)
├─ response.setHeader(x-session-id, sessionId) [if present]
└─ return { data, statusCode, message }
```

### 4.2 Guard Execution Order (Very Important Order)

```typescript
// File: apps/bff/src/app/app.module.ts

providers: [
  { provide: APP_GUARD, useClass: UserGuard }, // 1️⃣ JWT verify first
  { provide: APP_GUARD, useClass: SessionGuard }, // 2️⃣ Session next
  { provide: APP_GUARD, useClass: TenantGuard }, // 3️⃣ Tenant consistency
  { provide: APP_GUARD, useClass: PermissionGuard }, // 4️⃣ Permission check
  { provide: APP_GUARD, useClass: ThrottlerGuard }, // 5️⃣ Rate limiting
];
```

**Why this order?**

1. **First UserGuard**: Validate JWT signature, get user data from Authorizer → set userData in request
2. **Second SessionGuard**: Can be bypassed if JWT has been eliminated, or session created
3. **Third TenantGuard**: Use userData from UserGuard + sessionId from SessionGuard
4. **Fourth PermissionGuard**: Use permissions from userData (set by UserGuard)
5. **Last ThrottlerGuard**: Simply rate limiting, independent of context

---

## 5. Details of Each Guard

### 5.1 UserGuard: JWT Verification & User Provisioning

**File:** `libs/guards/src/lib/user.guard.ts`

**Mission:**

1. Check if the route has decorator `@Authorization({ secured: true })`
2. If yes → verify JWT token
3. Call Authorizer service to validate + get user profile + collect permissions
4. Cache results for 30 minutes
5. Set userData into request context

**Code Flow Details:**

```typescript
class UserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly grpcAuthorizerClient: ClientGrpc, // gRPC client
    private readonly cacheManager: Cache, // Redis cache
  ) {}

  onModuleInit() {
    this.authorizerService = this.grpcAuthorizerClient.getService<AuthorizerService>('AuthorizerService');
  }

  canActivate(context: ExecutionContext): Promise<boolean> {
    const authOptions = this.reflector.get(MetadataKey.SECURED, context.getHandler());

    if (!authOptions?.secured) {
      return true; // ❌ Route not secured → skip JWT check
    }

    return this.verifyUserToken(req);
  }

  private async verifyUserToken(req: Request): Promise<boolean> {
    try {
      const token = getAccessToken(req); // From "Authorization: Bearer ..."

      if (!token) {
        throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN);
      }

      const cacheKey = this.generateTokenCacheKey(token); // "user-token:{sha256}"

      // ✅ CACHE HIT
      const cacheData = await this.cacheManager.get<AuthorizeResponse>(cacheKey);
      if (cacheData) {
        setUserData(req, cacheData);
        return true;
      }

      // ❌ CACHE MISS → gRPC call
      const response = await firstValueFrom(
        this.authorizerService.verifyUserToken({
          processId,
          token,
        }),
      );

      if (!response?.data?.valid) {
        throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN);
      }

      // ✅ Cache 30 minutes
      this.cacheManager.set(cacheKey, response.data, 30 * 60 * 1000);
      setUserData(req, response.data);

      return true;
    } catch (error) {
      if (
        error.details?.includes(AUTH_ERROR_CODE.USER_NOT_PROVISIONED) ||
        error.details?.includes(AUTH_ERROR_CODE.ROLE_MAPPING_MISMATCH)
      ) {
        throw new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED); // 401
      }
      throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN); // 401
    }
  }

  generateTokenCacheKey(token: string): string {
    return `user-token:${createHash('sha256').update(token).digest('hex')}`;
  }
}
```

**UserGuard output:**

- ✅ `request[MetadataKey.USER_DATA]` = AuthorizeResponse
  - `metadata.jwt` = JWT payload
  - `metadata.permissions` = PERMISSION[]
  - `metadata.user` = MongoDB user profile
  - `metadata.userId` = user ID

**Possible error (401 Unauthorized):**

- `INVALID_TOKEN`: JWT malformed, expired, or signature not valid
- `USER_NOT_PROVISIONED`: User logs out from Keycloak, or profile does not exist in MongoDB
- `ROLE_MAPPING_MISMATCH`: Token roles from Keycloak do not intersect with internal roles in MongoDB

---

### 5.2 SessionGuard: Anonymous Session Management

**File:** `libs/guards/src/lib/session.guard.ts`

**Mission:**

1. If route secured=true → skip (JWT has been handled)
2. If route is not secured → create/reuse session
3. Session stored in Redis with TTL 2h
4. There is a 30-minute idle timeout (if inactive → session expires)
5. Return x-session-id in the response header

**Code Flow Details:**

```typescript
class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cacheManager: Cache, // Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authOptions = this.reflector.get(MetadataKey.SECURED, context.getHandler());

    if (authOptions?.secured) {
      return true; // ✅ Route secured → UserGuard already handled, skip session
    }

    // 🔍 Find existing session
    const existingSessionId = getSessionIdFromRequest(req); // x-session-id header/cookie

    if (existingSessionId) {
      const cacheKey = getSessionCacheKey(existingSessionId); // "session:{id}"
      const existingSession = await this.cacheManager.get<SessionData>(cacheKey);

      if (existingSession) {
        const now = Date.now();
        const idleTime = now - (existingSession.lastActivityAt || existingSession.createdAt);

        // ✅ Session is still active
        if (idleTime <= SESSION_POLICY.IDLE_TIMEOUT_MS) {
          await this.cacheManager.set(
            cacheKey,
            {
              ...existingSession,
              lastActivityAt: now, // Update idle timeout
            },
            SESSION_POLICY.TTL_MS, // Re-set TTL
          );

          req[MetadataKey.SESSION_ID] = existingSessionId;
          req[MetadataKey.TENANT_ID] = req[MetadataKey.TENANT_ID] || existingSession.tenantId;
          req.res?.setHeader('x-session-id', existingSessionId);
          return true;
        }

        // ❌ Session idle for too long → delete
        await this.cacheManager.del(cacheKey);
      }
    }

    // 🆕 Create new session
    const now = Date.now();
    const sessionId = this.generateSessionId(); // "sid_{uuid}"
    const cacheKey = getSessionCacheKey(sessionId);
    const tenantId = req[MetadataKey.TENANT_ID] as string | undefined;

    await this.cacheManager.set(
      cacheKey,
      {
        tenantId,
        createdAt: now,
        lastActivityAt: now,
      },
      SESSION_POLICY.TTL_MS, // 2 hours
    );

    req[MetadataKey.SESSION_ID] = sessionId;
    req.res?.setHeader('x-session-id', sessionId);

    return true;
  }

  private generateSessionId(): string {
    return `${SESSION_POLICY.ID_PREFIX}${randomUUID()}`; // "sid_<uuid>"
  }
}
```

**Session Policy Constants:**

```typescript
// File: libs/constants/src/lib/request-context.constant.ts

export const SESSION_POLICY = {
  ID_PREFIX: 'sid_',
  CACHE_PREFIX: 'session',
  TTL_MS: 2 * 60 * 60 * 1000, // 2 hours (updated from 24h → 2h to suit the restaurant context)
  IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  COOKIE_KEY: 'x-session-id',
};
```

**SessionData structure:**

```typescript
type SessionData = {
  tenantId?: string; // Backfilled by TenantGuard
  createdAt: number; // Session creation timestamp
  lastActivityAt: number; // Timestamp last operation
};
```

**SessionGuard output:**

- ✅ `request[MetadataKey.SESSION_ID]` = "sid\_{uuid}"
- ✅ Response header: `x-session-id: sid_{uuid}`

**Possible error:**

- No errors (SessionGuard always creates/reuses sessions successfully)

---

### 5.3 TenantGuard: Tenant Isolation

**File:** `libs/guards/src/lib/tenant.guard.ts`

**Mission:**

1. Enforce tenant isolation → every request (except exceptions) must have a valid tenantId
2. Validate tenant consistency between JWT claim, session, and request header
3. Block cross-tenant attacks
4. Super admin bypass (SUPER_ADMIN role is not enforced by tenant)

**Code Flow Details:**

```typescript
class TenantGuard implements CanActivate {
  constructor(
    private readonly cacheManager: Cache, // Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = req.path as string;

    // ✅ EXCLUDED PATHS (skips tenant check)
    if (this.isExcludedPath(path)) {
      return true;
    }
    // Path patterns: /authorizer*, /saas*, /health*

    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const isSuperAdmin = this.isSuperAdmin(userData);

    // ✅ SUPER_ADMIN bypass
    if (isSuperAdmin) {
      return true;
    }

    // 🔍 Resolve tenantId
    const claimTenantId = this.getClaimTenantId(userData); // From JWT
    const tenantId = (req[MetadataKey.TENANT_ID] as string | undefined) || claimTenantId;

    if (tenantId) {
      req[MetadataKey.TENANT_ID] = tenantId;
    }

    // ❌ Tenant required
    if (!tenantId) {
      throw new ForbiddenException('Tenant is required');
    }

    // ❌ Tenant mismatch with JWT claim
    if (claimTenantId && claimTenantId !== tenantId) {
      throw new ForbiddenException('Tenant mismatch with user identity');
    }

    // 🔍 Check session tenant consistency
    const sessionId = req[MetadataKey.SESSION_ID] as string | undefined;
    if (sessionId) {
      const cacheKey = getSessionCacheKey(sessionId);
      const session = await this.cacheManager.get<SessionData>(cacheKey);

      if (!session) {
        throw new ForbiddenException('Session not found');
      }

      // ❌ Tenant mismatch with session
      if (session.tenantId && session.tenantId !== tenantId) {
        throw new ForbiddenException('Tenant mismatch with session');
      }

      // ✅ Backfill tenant into session if not already there
      if (!session.tenantId) {
        await this.cacheManager.set(cacheKey, { ...session, tenantId }, SESSION_POLICY.TTL_MS);
      }
    }

    return true;
  }

  private isExcludedPath(path: string): boolean {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return TENANT_POLICY.EXCLUDED_PATH_PREFIXES.some((prefix) => {
      return (
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`) || normalizedPath.includes(`${prefix}/`)
      );
    });
  }

  private getClaimTenantId(userData?: AuthorizeResponse): string | undefined {
    const jwt = userData?.metadata?.jwt as Record<string, unknown> | undefined;
    if (!jwt) return undefined;

    // Keycloak can return snake_case or camelCase
    const tenantFromSnakeCase = jwt['tenant_id'];
    const tenantFromCamelCase = jwt['tenantId'];

    if (typeof tenantFromSnakeCase === 'string' && tenantFromSnakeCase.trim()) {
      return tenantFromSnakeCase;
    }
    if (typeof tenantFromCamelCase === 'string' && tenantFromCamelCase.trim()) {
      return tenantFromCamelCase;
    }

    return undefined;
  }

  private isSuperAdmin(userData?: AuthorizeResponse): boolean {
    const user = userData?.metadata?.user as Record<string, unknown> | undefined;
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    return roles.some((role: any) => role?.name?.toUpperCase() === 'SUPER_ADMIN');
  }
}
```

**Tenant Policy Constants:**

```typescript
// File: libs/constants/src/lib/request-context.constant.ts

export const TENANT_POLICY = {
  EXCLUDED_PATH_PREFIXES: [
    '/authorizer', // Login, verify
    '/saas', // Saas management (setup-level)
    '/health', // Health check
  ],
};
```

**Possible error (403 Forbidden):**

- `"tenant is required"`: There is no tenantId in the JWT or request
- `"tenant mismatch with user identity"`: JWT claim tenant_id ≠ request x-tenant-id
- `"Session not found"`: Session ID does not exist in Redis
- `"tenant mismatch with session"`: Session tenant ≠ request tenant

---

### 5.4 PermissionGuard: Permission Checking

**File:** `libs/guards/src/lib/permission.guard.ts`

**Mission:**

1. Read required permissions from decorator `@Permissions(...)`
2. If the route has no decorator → bypass (return true)
3. If there is a decorator → check all required permissions are in user permissions
4. If the user does not have some permission → throw 403

**Code Flow Details:**

```typescript
class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 🔍 Get required permissions from decorator
    const requiredPermissions = this.reflector.get<PERMISSION[]>(Permissions, context.getHandler());

    // ✅ Route without @Permissions → optional, pass
    if (!requiredPermissions) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;

    if (!userData?.metadata) {
      throw new UnauthorizedException('User data not found');
    }

    const permissions = userData.metadata.permissions;
    const userPermissions = Array.isArray(permissions) ? (permissions as PERMISSION[]) : [];

    // ❌ Check: does the user have ALL required permissions?
    const isValid = requiredPermissions.every((permission) => userPermissions.includes(permission));

    if (!isValid) {
      throw new ForbiddenException('Permission denied'); // 403
    }

    return true;
  }
}
```

**Example of Using Decorator:**

```typescript
@Controller('catalog')
export class CatalogController {
  // ✅ This endpoint requires JWT + 2 permissions
  @Post('create')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  async create(@Body() dto: CreateCatalogDto) {
    // code...
  }

  // ✅ This endpoint requires JWT + multiple permissions
  @Put(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  async update(@Param('id') id: string, @Body() dto: UpdateCatalogDto) {
    // code...
  }

  // ✅ This endpoint does not require JWT (guest can call)
  @Get('list')
  async list() {
    // SessionGuard creates a session, TenantGuard check tenant
    // But permission is not checked because there is no @Permissions decorator
  }
}
```

**Possible error (403 Forbidden):**

- `"Permission denied"`: User does not have required permission

---

## 6. Decorators & Metadata

### 6.1 @Authorization Decorator

**File:** `libs/decorators/src/lib/authorizer.decorator.ts`

**Purpose:** Mark route requires JWT

```typescript
export const Authorization = ({ secured = false }: { secured?: boolean }) => {
  const setMetadata = SetMetadata(MetadataKey.SECURED, {
    secured,
  });

  if (secured) {
    return applyDecorators(
      ApiBearerAuth(), // Swagger doc
      ApiHeader({
        name: 'x-tenant-id',
        required: false,
        description: 'Tenant context for local/dev requests.',
      }),
      setMetadata,
    );
  }

  return setMetadata;
};
```

**Usage:**

```typescript
// ✅ Route requires JWT
@Get('me')
@Authorization({ secured: true })
async me(@UserData() userData: AuthorizedMetadata) {
  return userData;
}

// ✅ Route does not require JWT (guest may)
@Get('list')
@Authorization({ secured: false })
async list() {
// SessionGuard creates a session
}
```

### 6.2 @Permissions Decorator

**File:** `libs/decorators/src/lib/permission.decorator.ts`

**Purpose:** Defines the permissions required for the route

```typescript
export const Permissions = Reflector.createDecorator<PERMISSION[]>();
```

**Usage:**

```typescript
@Post('create')
@Authorization({ secured: true })
@Permissions([PERMISSION.CATALOG_CREATE])
async create(@Body() dto: CreateCatalogDto) {
  // UserGuard verify JWT
  // PermissionGuard check CATALOG_CREATE
}

@Delete(':id')
@Authorization({ secured: true })
@Permissions([PERMISSION.CATALOG_DELETE])
async delete(@Param('id') id: string) {
  // UserGuard verify JWT
  // PermissionGuard check CATALOG_DELETE
}
```

### 6.3 @ProcessId Decorator

**File:** `libs/decorators/src/lib/processId.decorator.ts`

**Purpose:** Inject processId (request tracing ID)

```typescript
@Get('detail/:id')
async getDetail(
  @Param('id') id: string,
@ProcessId() processId: string,  // ← Injected from middleware/decorator logic
) {
  console.log(`[${processId}] Getting catalog ${id}`);
}
```

### 6.4 @UserData Decorator

**File:** `libs/decorators/src/lib/userData.decorator.ts`

**Purpose:** Inject user data from UserGuard

```typescript
@Get('me')
@Authorization({ secured: true })
async me(@UserData() userData: AuthorizedMetadata) {
  return {
    userId: userData.userId,
    permissions: userData.permissions,
    jwt: userData.jwt,
  };
}
```

---

## 7. Keycloak Integration

### 7.1 Keycloak Realm & Configuration

**Realm:** `qrtable` (instead of old realm)

**Client:**

- **Client ID:** `qrtable-bff`
- **Type:** Confidential (with client secret)
- **Flows:**
  - Direct Access Grants (Resource Owner Password) → used for login
  - Standard Flow → used for frontend redirect
- **OIDC Protocol** → RS256 signed tokens

### 7.2 Keycloak Realm Roles

```
Realm qrtable with 6 roles:
├─ SUPER_ADMIN (platform-level)
├─ OWNER
├─ MANAGER
├─ WAITER
├─ CHEF
└─ BARISTA
```

### 7.3 Protocol Mapper: tenant_id Claim

**Keycloak bootstrap script that creates this mapper:**

```bash
# Mapper config
{
  "name": "tenant_id",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "protocol": "openid-connect",
  "config": {
    "userinfo.token.claim": "true",
    "id.token.claim": "true",
    "access.token.claim": "true",
    "claim.name": "tenant_id",
    "jsonType.label": "String",
    "user.attribute": "tenant_id"
  }
}
```

**Result:** User attribute `tenant_id` is included in the JWT claim

### 7.4 Token Structure

**JWT Token from Keycloak (RS256 signed)**

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "Z1zOr8m_..." // Key ID to get the public key
  },
  "payload": {
    "sub": "74ad75a4-98a6-4bec-b528-0a0ac702d2f5", // User ID
    "email": "manager2.1773990177@gmail.com",
    "email_verified": true,
    "name": "Manager Two",
    "given_name": "Manager",
    "family_name": "Two",
    "tenant_id": "tenant-a", // ← Mapper added
    "realm_access": {
      "roles": ["OWNER", "MANAGER", "default-roles-qrtable"]
    },
    "exp": 1740000000, // Expiry time
    "iat": 1740000000, // Issued at
    "iss": "http://localhost:8180/realms/qrtable"
  }
}
```

### 7.5 JWT Verification Process

```typescript
async verifyUserToken(token: string, processId: string): Promise<AuthorizeResponse> {
// Step 1: Decode DO NOT verify at this time
  const decoded = jwt.decode(token, { complete: true });

// Step 2: Get kid from header
  const kid = decoded.header.kid;

// Step 3: Get public key from Keycloak JWKS endpoint
  const key = await this.jwksClient.getSigningKey(kid);
  const publicKey = key.getPublicKey();

  // Step 4: Verify signature RS256
  const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

// Step 5: Extract data from payload
  const userId = payload.sub;
  const keycloakRoles = payload.realm_access.roles;

// Step 6: Validate user profile in MongoDB
  let user = await this.userValidation(userId, processId);
  if (!user && AUTO_PROVISION_ON_FIRST_LOGIN) {
    user = await this.autoProvisionFromToken(payload, processId);
  }

  // Step 7: Validate role mapping (Keycloak roles ∩ Internal roles ≠ ∅)
  const isRoleMappingValid = this.validateRoleMapping(keycloakRoles, user.roles);
  if (!isRoleMappingValid) {
    throw new UnauthorizedException(AUTH_ERROR_CODE.ROLE_MAPPING_MISMATCH);
  }

// Step 8: Collect permissions from internal roles
  const permissions = this.collectPermissions(user.roles);

  return {
    valid: true,
    metadata: {
      jwt: payload,
      permissions,
      user,
      userId: user.id,
    },
  };
}
```

---

## 8. MongoDB: Role & User Mapping

### 8.1 Role Schema

**File:** `libs/schemas/src/lib/role.schema.ts`

```typescript
@Schema({
  timestamps: true,
  collection: 'role',
})
export class Role extends BaseSchema {
  @Prop({ type: String, enum: ROLE, default: ROLE.WAITER })
  name: ROLE; // OWNER, MANAGER, WAITER, CHEF, BARISTA, SUPER_ADMIN

  @Prop({ type: String })
  description: string;

  @Prop({ type: [String], enum: PERMISSION, default: [] })
  permissions: PERMISSION[]; // Array of permissions this role has
}
```

**Example data in mongoDB:**

```javascript
// Collection: role
db.role.find()

[
  {
    _id: ObjectId("68a3f2f1b3e811435a8ad004"),
    name: "SUPER_ADMIN",
    description: "platform-level super admin",
    permissions: [
"saas.create", "saas.delete", "saas.update", // ... all
      "catalog.create", "catalog.delete", // ...
      "user.create", "user.delete", // ...
    ],
  },
  {
    _id: ObjectId("68a3f2f1b3e811435a8ad006"),
    name: "MANAGER",
    description: "tenant manager with operational permissions (no user delete)",
    permissions: [
      "catalog.create", "catalog.get_list", "catalog.update",
      "user.create", "user.update",
      "tenant.read_own", "subscription.read_own", "plan.read",
      "payment_settings.read_own",
      // no "subscription.checkout" or "payment_settings.update_own"
    ],
  },
  // ...
]
```

### 8.2 User Schema

**File:** `libs/schemas/src/lib/user.schema.ts`

```typescript
@Schema({
  timestamps: true,
  collection: 'user',
})
export class User extends BaseSchema {
  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  userId: string; // UUID from Keycloak user.sub

  @Prop({ type: [ObjectId], ref: 'Role' })
  roles: ObjectId[]; // Array of Role _id (references)
}
```

**Example data in MongoDB:**

```javascript
// Collection: user
db.user.find()

[
  {
    _id: ObjectId("507f1f77bcf86cd799439001"),
    firstName: "Manager",
    lastName: "Two",
    email: "manager2.1773990177@gmail.com",
    userId: "74ad75a4-98a6-4bec-b528-0a0ac702d2f5",  // Keycloak UUID
    roles: [
      ObjectId("68a3f2f1b3e811435a8ad006"),  // MANAGER role reference
    ],
    createdAt: ISODate("2026-01-15T..."),
    updatedAt: ISODate("2026-01-15T..."),
  },
]
```

### 8.3 Role Mapping Validation Logic

**Authorizer validateRoleMapping method:**

```typescript
private validateRoleMapping(keycloakRoles: string[], internalRoles?: Role[]): boolean {
// All ROLE enum values ​​(uppercase)
  const appRoles = new Set(Object.values(ROLE).map((role) => normalizeRoleName(role)));

// Keycloak roles → filter only app roles (normalize uppercase)
  const keycloakAppRoles = new Set(
    keycloakRoles
      .map((role) => normalizeRoleName(role))
      .filter((role) => appRoles.has(role)),
  );

// Internal roles from MongoDB → filter only app roles
  const internalAppRoles = new Set(
    (internalRoles || [])
      .map((role) => normalizeRoleName(role?.name))
      .filter((role) => appRoles.has(role)),
  );

  // ❌ intersection must not be empty
  if (keycloakAppRoles.size === 0 || internalAppRoles.size === 0) {
    return false;
  }

  // ✅ At least 1 role must exist in both sets
  return Array.from(keycloakAppRoles).some((role) => internalAppRoles.has(role));
}

// Example:
// keycloakRoles = ["OWNER", "MANAGER", "default-roles-qrtable"]
// keycloakAppRoles = {"OWNER", "MANAGER"}
//
// internalRoles = [{ name: "MANAGER", permissions: [...] }]
// internalAppRoles = {"MANAGER"}
//
// Intersection = {"MANAGER"} ✅ Valid
```

---

## 9. Permission Matrix Details

### 9.1 Permission Enum

**File:** `libs/constants/src/lib/enum/role.enum.ts`

```typescript
export enum PERMISSION {
  /* SAAS — legacy, remove after Phase 5 */
  SAAS_CREATE = 'saas.create',
  SAAS_GET_BY_ID = 'saas.get_by_id',
  SAAS_GET_LIST = 'saas.get_list',
  SAAS_UPDATE = 'saas.update',
  SAAS_DELETE = 'saas.delete',

  /* TENANT (Phase 4B) */
  TENANT_ONBOARD = 'tenant.onboard',
  TENANT_LIST_ALL = 'tenant.list_all',
  TENANT_READ_ANY = 'tenant.read_any',
  TENANT_READ_OWN = 'tenant.read_own',
  TENANT_UPDATE = 'tenant.update',
  TENANT_SUSPEND = 'tenant.suspend',
  TENANT_ACTIVATE = 'tenant.activate',
  TENANT_CLOSE = 'tenant.close',

  /* SUBSCRIPTION (Phase 4B) */
  SUBSCRIPTION_ASSIGN = 'subscription.assign',
  SUBSCRIPTION_LIST_ANY = 'subscription.list_any',
  SUBSCRIPTION_LIST_HISTORY_ANY = 'subscription.list_history_any',
  SUBSCRIPTION_READ_OWN = 'subscription.read_own',
  SUBSCRIPTION_CHECKOUT = 'subscription.checkout',

  /* PLAN (Phase 4B) */
  PLAN_CREATE = 'plan.create',
  PLAN_READ = 'plan.read',
  PLAN_UPDATE = 'plan.update',
  PLAN_DELETE = 'plan.delete',

  /* PAYMENT SETTINGS (Phase 4B) */
  PAYMENT_SETTINGS_READ_OWN = 'payment_settings.read_own',
  PAYMENT_SETTINGS_UPDATE_OWN = 'payment_settings.update_own',

  /* CATALOG */
  CATALOG_CREATE = 'catalog.create',
  CATALOG_GET_BY_ID = 'catalog.get_by_id',
  CATALOG_GET_LIST = 'catalog.get_list',
  CATALOG_UPDATE = 'catalog.update',
  CATALOG_DELETE = 'catalog.delete',

  /* USER */
  USER_CREATE = 'user.create',
  USER_GET_BY_ID = 'user.get_by_id',
  USER_GET_ALL = 'user.get_all',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',

  /* ROLE */
  ROLE_CREATE = 'role.create',
  ROLE_GET_BY_ID = 'role.get_by_id',
  ROLE_GET_ALL = 'role.get_all',
  ROLE_UPDATE = 'role.update',
  ROLE_DELETE = 'role.delete',

  /* ORDER (Phase 2A) — cancel split Step 2.4 */
  ORDER_CREATE = 'order.create',
  ORDER_CONFIRM = 'order.confirm',
  ORDER_CANCEL_PENDING = 'order.cancel_pending',
  ORDER_CANCEL_PROCESSING = 'order.cancel_processing',
  ORDER_GET_LIST = 'order.get_list',
  ORDER_GET_BY_ID = 'order.get_by_id',

  /* KITCHEN (Phase 2B) */
  KITCHEN_GET_QUEUE = 'kitchen.get_queue',
  KITCHEN_UPDATE_TICKET = 'kitchen.update_ticket',
  KITCHEN_RECALL = 'kitchen.recall',
  KITCHEN_SET_PRIORITY = 'kitchen.set_priority',

  /* PAYMENT (Phase 3) */
  PAYMENT_CREATE = 'payment.create',
  PAYMENT_CONFIRM_CASH = 'payment.confirm_cash',
  PAYMENT_REFUND = 'payment.refund',
  PAYMENT_GET_HISTORY = 'payment.get_history',

  /* TABLE (Phase 1-2A) */
  TABLE_CREATE = 'table.create',
  TABLE_UPDATE = 'table.update',
  TABLE_DELETE = 'table.delete',
  TABLE_TRANSFER = 'table.transfer',
  TABLE_UPDATE_STATUS = 'table.update_status',

  /* SERVICE_REQUEST (Phase 2A) */
  SERVICE_REQUEST_CREATE = 'service_request.create',
  SERVICE_REQUEST_ACKNOWLEDGE = 'service_request.acknowledge',
  SERVICE_REQUEST_RESOLVE = 'service_request.resolve',
}
```

### 9.2 Permission Matrix: Role → Permissions (Supporting Snapshot — Phase 4B)

> Single source of truth: [permission matrix](../architecture/permission-matrix.md). The table below is just a summary for quick reading, does not replace the canonical matrix 6 roles × 65 permissions.

| **Role**               | **Platform / SaaS domains**                                                                                                                        | **Operational domains**                                                                                                       | **Permission count** |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **SUPER_ADMIN**        | All legacy `saas.*`, `tenant.*`, `subscription.*`, `plan.*`, `payment_settings.*`                                                                  | All catalog/user/role/order/kitchen/payment/table/service-request permissions                                                 | 62                   |
| **OWNER**              | `tenant.read_own`, `subscription.read_own`, `subscription.checkout`, `plan.read`, `payment_settings.read_own`, `payment_settings.update_own`       | Full tenant operations except platform-only role/SaaS admin permissions                                                       | 38                   |
| **MANAGER**            | `tenant.read_own`, `subscription.read_own`, `plan.read`, `payment_settings.read_own`; no `subscription.checkout`, no `payment_settings.update_own` | Operational permissions similar to OWNER, but no `user.delete`                                                                | 34                   |
| **WAITER**             | `plan.read`                                                                                                                                        | Catalog read, order confirm/cancel pending/read, payment create/cash/history, table transfer/status, service-request handling | 15                   |
| **CHEF**               | `plan.read`                                                                                                                                        | Catalog read plus KDS `get_queue`, `update_ticket`, `recall`; no `kitchen.set_priority`                                       | 6                    |
| **BARISTA**            | `plan.read`                                                                                                                                        | Catalog read plus KDS `get_queue`, `update_ticket`, `recall`; no `kitchen.set_priority`                                       | 6                    |
| **CUSTOMER** (session) | none                                                                                                                                               | Session-scoped public menu, own order/payment status, service request/order submit via customer guards                        | n/a                  |

**Note:**

- `SAAS_*` permissions are legacy/backward-compat; Phase 4B uses `TENANT_*`, `SUBSCRIPTION_*`, `PLAN_*`, `PAYMENT_SETTINGS_*`. Legacy course-template `PRODUCT_*` permissions were removed with `apps/product`.
- CUSTOMER has no real "role", only session → access is enforced by customer/session guards and ownership checks.
- **MANAGER does not have `user.delete`, `subscription.checkout`, or `payment_settings.update_own`**.
- **WAITER has `payment.get_history`** — for "last bill" queries from customer.

### 9.3 Data File: role.json

**File:** `apps/user-access/src/seeder/role.json`

**Current contents (Phase 4B — static-verified 2026-05-31):** Full canonical matrix with 6 roles and 65 permissions distributed per [permission matrix](../architecture/permission-matrix.md) §6. Permission counts:

| Role        | Permission count |
| ----------- | ---------------- |
| SUPER_ADMIN | 65               |
| OWNER       | 37               |
| MANAGER     | 34               |
| WAITER      | 15               |
| CHEF        | 6                |
| BARISTA     | 6                |

Refer to actual file `apps/user-access/src/seeder/role.json` for full content (auto-generated from canonical matrix).

---

## 10. Login Flow (JWT Flow)

### 10.1 Login Workflow Details

```
┌──────────────────────────────────────────────────────────────────────┐
│                       LOGIN WORKFLOW (JWT)                            │
└──────────────────────────────────────────────────────────────────────┘

CLIENT                    BFF                    Keycloak            User-Access
  │                         │                         │                      │
  │ POST /authorizer/login  │                         │                      │
  │ { username, password }  │                         │                      │
  ├─────────────────────────>                         │                      │
  │                         │ POST /token (Direct Access Grant)             │
  │                         │ grant_type=password&client_id=...             │
  │                         ├────────────────────────>                      │
  │                         │                         │                      │
  │                         │ ✅ access_token + refresh_token              │
  │                         │<────────────────────────┤                      │
  │                         │                         │                      │
  │ ✅ { accessToken, refreshToken }                │                      │
  │<─────────────────────────┤                         │                      │
  │                         │                         │                      │
  │ GET /authorizer/me                                │                      │
  │ Authorization: Bearer <accessToken>              │                      │
  ├─────────────────────────>                         │                      │
  │                         │                         │                      │
  │                         │ verifyUserToken (gRPC) │                      │
  │                         │ token=accessToken      │                      │
  │                         ├──────────────────────────────────────────────>│
  │                         │                         │ getByUserId          │
  │                         │                         ├─────────────────────>
  │                         │                         │ user profile +       │
  │                         │                         │ permissions          │
  │                         │                         │<─────────────────────┤
  │                         │                         │                      │
  │                         │ validateRoleMapping ✅ │                      │
  │                         │ collectPermissions      │                      │
  │                         │                         │                      │
  │                         │ AuthorizeResponse       │                      │
  │                         │<──────────────────────────────────────────────┤
  │                         │                         │                      │
  │ ✅ { userId, email, tenantId, roles, permissions }                      │
  │<─────────────────────────┤                         │                      │
  │                         │                         │                      │
```

### 10.2 Step-by-Step Login Flow

**Step 1: Client POST /authorizer/login**

```bash
curl -X POST 'http://localhost:3300/api/v1/authorizer/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "manager2.1773990177@gmail.com",
    "password": "manager2"
  }'
```

**Step 2: BFF AuthorizerController → TCP Authorizer Service → Keycloak**

```typescript
// apps/bff/src/app/modules/authorizer/controllers/authorizer.controller.ts

@Post('login')
login(@Body() body: LoginRequestDto, @ProcessId() processId: string) {
  return this.authorizerClient.send<LoginTcpResponse, LoginTcpRequest>(
    TCP_REQUEST_MESSAGE.AUTHORIZER.LOGIN,
    {
      data: body,
      processId,
    },
  );
}
```

**Step 3: Authorizer Service → Keycloak HTTP Request**

```typescript
// apps/authorizer/src/app/authorizer/services/authorizer.service.ts

async login(params: LoginTcpRequest) {
  const { password, username } = params;

  // Call Keycloak token endpoint
  const { access_token: accessToken, refresh_token: refreshToken } =
    await this.keycloakHttpService.exchangeUserToken(
      { username, password },
    );

  return {
    accessToken,
    refreshToken,
  };
}
```

**Step 4: Keycloak Token Response**

```bash
POST http://keycloak:8180/realms/qrtable/protocol/openid-connect/token

Response:
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cC6IkpXVCJ9...",
  "refresh_token": "eye...",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

**Step 5: Client GET /authorizer/me (with JWT)**

```bash
curl -X GET 'http://localhost:3300/api/v1/authorizer/me' \
  -H 'Authorization: Bearer <accessToken>'
```

**Step 6: BFF Routes → UserGuard → Authorizer verifyUserToken**

```
Request to BFF
  ↓
UserGuard canActivate()
  ├─ @Authorization({ secured: true }) exists → YES
├─ extractToken from header
├─ Check cache (30 minutes)
  │   └─ Cache miss
  ├─ gRPC call: authorizerService.verifyUserToken(token, processId)
  │
  └─ AuthorizerService.verifyUserToken():
    ├─ jwt.decode(token, { complete: true })
    ├─ jwt.verify(token, publicKey) using Keycloak JWKS
    ├─ userId = payload.sub
    ├─ userValidation(userId):
    │   └─ User-Access gRPC → getByUserId(userId)
    │       └─ MongoDB: db.user.findOne({ userId: ... })
    │           └─ Return: { id, firstName, lastName, email, userId, roles: [ObjectId, ...] }
    ├─ validateRoleMapping(keycloakRoles, internalRoles):
│   ├─ Keycloak roles from payload.realm_access.roles
│   ├─ Internal roles from user.roles (populated from MongoDB)
    │   └─ Check: intersection ≠ ∅
    ├─ collectPermissions(user.roles):
    │   └─ Flatten: user.roles[*].permissions → unique Permission[]
    └─ Return: AuthorizeResponse { valid: true, metadata: {...} }

├─ Cache result 30 minutes
  ├─ setUserData(request, response)
  └─ return true → next guard
```

**Step 7: Response /authorizer/me**

```typescript
@Get('me')
@Authorization({ secured: true })
me(@UserData() userData: AuthorizedMetadata): ResponseDto<AuthProfileResponseDto> {
  const jwt = userData.jwt as Record<string, unknown>;
  const realmRoles = jwt['realm_access']?.['roles'] || [];

  return new ResponseDto<AuthProfileResponseDto>({
    data: {
      userId: userData.userId,
      email: jwt['email'],
tenantId: jwt['tenant_id'], // ← Mapper added
      roles: realmRoles,
      permissions: userData.permissions,
    },
  });
}
```

**Response HTTP 200:**

```json
{
  "data": {
    "userId": "74ad75a4-98a6-4bec-b528-0a0ac702d2f5",
    "email": "manager2.1773990177@gmail.com",
    "tenantId": "tenant-a",
    "roles": ["OWNER", "MANAGER"],
    "permissions": [
      "catalog.create",
      "catalog.get_by_id",
      "catalog.get_list",
      "catalog.update",
      "catalog.delete",
      "user.create",
      "user.update",
      "tenant.read_own",
      "subscription.read_own",
      "plan.read",
      "payment_settings.read_own"
    ]
  },
  "message": "OK"
}
```

---

## 11. Guest/Customer Session stream

### 11.1 Customer Session Workflow

```
┌─────────────────────────────────────────────────────────┐
│          GUEST/CUSTOMER SESSION WORKFLOW                 │
└─────────────────────────────────────────────────────────┘

CUSTOMER (Browser)        BFF                      Redis
    │                       │                         │
    │ GET /catalog/list     │                         │
    │ (No Authorization)    │                         │
    ├───────────────────────>                         │
    │                       │                         │
    │                       │ TenantMiddleware        │
    │                       │ resolve tenantId        │
    │                       │ (subdomain="tenant-a")  │
    │                       │                         │
    │                       │ UserGuard               │
    │                       │ secured=false → skip    │
    │                       │                         │
    │                       │ SessionGuard:           │
    │                       │ - No x-session-id       │
    │                       │ - Generate: sid_<uuid>  │
    │                       │ - Store Redis:          │
    │                       ├──────────────────────────>
    │                       │  session:{sid} →        │
    │                       │  {tenantId, createdAt}  │
    │                       │<──────────────────────┤
    │                       │                         │
    │                       │ TenantGuard             │
    │                       │ Validate tenant         │
    │                       │ Backfill session tenant │
    │                       │                         │
    │ ✅ catalog list       │                         │
    │ x-session-id: sid_..  │                         │
    │<───────────────────────┤                         │
    │                         │                         │
    │ GET /catalog/detail/1   │                         │
    │ x-session-id: sid_..    │ (reuse session)        │
    ├───────────────────────>  │                         │
    │                       │ SessionGuard:           │
    │                       │ - Check x-session-id    │
    │                       │ - Get from Redis        │
    │                       ├──────────────────────────>
    │                       │  session:{sid}          │
    │                       │<──────────────────────┤
    │                       │ - Update lastActivityAt │
    │                       ├──────────────────────────>
    │                       │  (re-set TTL)           │
    │                       │<──────────────────────┤
    │                       │                         │
    │ ✅ catalog detail       │                         │
    │<───────────────────────┤                         │
    │                         │                         │
```

### 11.2 Session Timeout Policy

```typescript
// SESSION_POLICY constants:
{
  ID_PREFIX: 'sid_',                   // Session ID prefix
  CACHE_PREFIX: 'session',            // Redis cache prefix
TTL_MS: 2 * 60 * 60 * 1000, // 2 hours lifetime (suitable for 1-2h meal)
IDLE_TIMEOUT_MS: 30 * 60 * 1000,    // 30 minutes idle timeout
  COOKIE_KEY: 'x-session-id',         // Response header key
}
```

**Idle Timeout Logic:**

- If the customer does not send a request within 30 minutes → session delete
- Each request sent → update lastActivityAt
- If session is still active → TTL is reset (2 hours from last time)

### 11.3 Customer Routes (Not Secured)

```typescript
@Controller('catalog')
export class CatalogController {
  // ✅ Customer can call (no need for JWT)
  @Get('list')
  // No @Authorization decorator
  async getList() {
    // SessionGuard creates a session
    // TenantGuard check tenant
    // But don't check permission
  }

  // ✅ Customer can call
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    // SessionGuard creates a session
  }

  // ❌ Customer is NOT callable (JWT request)
  @Post('create')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  async create(@Body() dto: CreateCatalogDto) {
    // UserGuard requires JWT
  }
}
```

---

## 12. Seed Script & Role Bootstrap

### 12.1 Seed Script: tools/seed.js

**Purpose:** Bootstrap initial data into MongoDB (roles, permissions)

**File:** `tools/seed.js`

**How to run:**

```bash
# Full range of variables
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder prune

# Or
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder migrate
```

**Modes:**

```
┌─────────────────────┬──────────────────────────┬────────────────────────┐
│ Mode │ Action │ Use when │
├─────────────────────┼──────────────────────────┼────────────────────────┤
│ prune (destructive) │ DELETE ALL + INSERT NEW  │ Role taxonomy changes │
│                     │                          │ Database reset         │
│                     │                          │ Development           │
├─────────────────────┼──────────────────────────┼────────────────────────┤
│ migrate (safe)      │ INSERT IF NOT EXISTS     │ Incremental data      │
│                     │ (idempotent upsert)      │ Production (careful)   │
└─────────────────────┴──────────────────────────┴────────────────────────┘
```

**Script Logic:**

```typescript
async function bootstrap() {
  const dirPath = process.argv[2]; // e.g., apps/user-access/src/seeder
  const mode = process.argv[3] || 'migrate'; // 'prune' | 'migrate'

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      await processFile(file, mode, db);
    }

    console.log('✅ All seeders executed!');
  } finally {
    await client.close();
  }
}

async function processFile(filePath, mode, db) {
  const rawData = fs.readFileSync(filePath);
  const { collection, data } = JSON.parse(rawData);

  const seedData = mapData(data); // Convert $oid → ObjectId, $date → Date
  const col = db.collection(collection);

  if (mode === 'prune') {
    // 🗑️ DELETE ALL
    await col.deleteMany({});
    // 📝 INSERT NEW
    if (seedData.length > 0) {
      await col.insertMany(seedData);
    }
    console.log(`✅ [${collection}] pruned & inserted ${seedData.length} docs`);
  } else if (mode === 'migrate') {
    // 🔍 upsert (safe)
    for (const doc of seedData) {
      const exists = await col.findOne(doc);
      if (!exists) {
        await col.insertOne(doc);
        console.log(`➕ Inserted into [${collection}]`, doc);
      }
    }
    console.log(`✅ [${collection}] migration completed`);
  }
}
```

### 12.2 Role Data File: role.json

**File:** `apps/user-access/src/seeder/role.json`

**Format:**

```json
{
  "collection": "role",
  "data": [
    {
      "_id": { "$oid": "68a3f2f1b3e811435a8ad004" },
      "name": "SUPER_ADMIN",
      "description": "...",
      "permissions": [
        "saas.create", "saas.delete", ...
      ]
    },
    { ... }
  ]
}
```

**When do I need to reseed?**

1. ✅ **Role taxonomy changes** (add new roles, rename, delete)
2. ✅ **Permission matrix updated** (add/remove permissions)
3. ✅ **Database reset** (dev environment cleanup)
4. ❌ **NOT needed** when: app restarted, code changed (no touch auth)

**Reseed command:**

```bash
# Prune mode (destructive, used for dev)
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder prune

# Migrate mode (safe, uses for production)
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder migrate
```

---

## 13. Error Codes & Debugging

### 13.1 Auth Error Codes

**File:** `libs/error-messages/src/lib/error-code.enum.ts`

```typescript
export enum ErrorCode {
  AUTH_TOKEN_NOT_PROVIDED = 'AUTH_TOKEN_NOT_PROVIDED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_USER_NOT_PROVISIONED = 'AUTH_USER_NOT_PROVISIONED',
  AUTH_ROLE_MAPPING_MISMATCH = 'AUTH_ROLE_MAPPING_MISMATCH',
  AUTH_USER_DATA_NOT_FOUND = 'AUTH_USER_DATA_NOT_FOUND',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',
}
```

### 13.2 HTTP Error Responses

| **Status** | **Error Code**        | **Cause**                                         | **Fix**                                          |
| ---------- | --------------------- | ------------------------------------------------- | ------------------------------------------------ |
| **401**    | INVALID_TOKEN         | JWT expired, signature invalid                    | Refresh token, re-login                          |
| **401**    | USER_NOT_PROVISIONED  | User profile missing in MongoDB, or role mismatch | Check DB, reseed roles, update user role mapping |
| **401**    | ROLE_MAPPING_MISMATCH | Token roles ∩ DB roles = ∅                        | Update user role in MongoDB to match token roles |
| **403**    | TENANT_REQUIRED       | Header x-tenant-id missing + JWT has no tenant_id | Add x-tenant-id header or check Keycloak mapper  |
| **403**    | TENANT_MISMATCH       | x-tenant-id ≠ JWT tenant_id                       | Use consistent tenant ID                         |
| **403**    | SESSION_NOT_FOUND     | x-session-id invalid/expired                      | Create new session (remove header)               |
| **403**    | PERMISSION_DENIED     | User lacks required permission                    | Check user role permissions, update role.json    |

### 13.3 Debugging Checklist

**When encountering 401 Unauthorized:**

```
1️⃣ Token valid?
   curl -X GET http://localhost:3300/api/v1/authorizer/me \
     -H "Authorization: Bearer <token>"
└─ If 401 USER_NOT_PROVISIONED → Step 3
└─ If 401 INVALID_TOKEN → Refresh token or re-login

2️⃣ User profile exists in MongoDB?
   docker exec qrtable-provider-mongodb-1 mongosh mongodb://root:password@localhost:27017/qrtable?authSource=admin
   db.user.find({ userId: "<token.sub>" })
└─ If does not exist → Check AUTO_PROVISION_ON_FIRST_LOGIN

3️⃣ Is Role mapping valid?
   db.user.findOne({ userId: "..." })
└─ Get roles ObjectId, check role name:
   db.role.find({ _id: { $in: [ObjectId(...)] } })
└─ Token roles (realm_access.roles) must intersect with DB role names
└─ Otherwise → Update user role in MongoDB

4️⃣ Does Keycloak roles exist?
   Token payload realm_access.roles = ["OWNER", "MANAGER"]
   DB user roles = [ObjectId("...MANAGER...")]
   └─ Check MANAGER exists in MongoDB roles collection

5️⃣ Reseed roles
   MONGODB_URI='mongodb://...' MONGO_DB_NAME='qrtable' \
   node tools/seed.js apps/user-access/src/seeder prune
```

**When encountering 403 Forbidden:**

```
1️⃣ Tenant context?
   Header x-tenant-id present OR JWT tenant_id claim?
└─ Otherwise → Add x-tenant-id header

2️⃣ Tenant mismatch?
   x-tenant-id = "tenant-a"
   JWT tenant_id = "tenant-b"
   └─ Use same tenant ID

3️⃣ Session exists? (if customer)
   x-session-id present?
   └─ Redis: get session:{id}
└─ Otherwise → Create new session (remove header)

4️⃣ Permission check
   @Permissions([PERMISSION.CATALOG_CREATE]) decorator?
   User permissions include this?
   └─ Check role.json permissions array
   └─ Check user.roles references
```

---

## 14. Checklist Debug Auth Issues

### 14.1 Symptom: 401 USER_NOT_PROVISIONED

**Description:** Login successful, but GET /authorizer/me returns 401

**Causes & Fixes:**

```
Cause 1: User profile does not exist in MongoDB
├─ Check: db.user.findOne({ userId: "<token.sub>" })
├─ Solution:
│  └─ Option A: Enable AUTO_PROVISION_ON_FIRST_LOGIN=true, re-login
│  └─ Option B: Manual insert user into MongoDB
│  └─ Option C: Use User API to create user (if available)

Cause 2: User profile exists but roles mismatch
├─ Check:
│  ├─ Token roles (realm_access.roles): ["OWNER", "MANAGER", ...]
│  ├─ DB user.roles: [ObjectId(...), ...]
│  └─ DB role documents: db.role.find({ _id: { $in: user.roles } })
├─ Symptom: Token has roles, but DB roles don't match
├─ Solution:
│  └─ Update user.roles to reference a valid ROLE role document
│     db.user.updateOne(
│       { userId: "..." },
│       { $set: { roles: [ObjectId("68a3f2f1b3e811435a8ad006")] } }  # MANAGER
│     )

Cause 3: Role mapping validation fails
├─ Check:
│  └─ Keycloak roles & DB roles have intersection?
│  └─ If NOT: Token roles and DB role names share no intersection (stale `user.roles` or wrong realm assignment)
├─ Solution:
│  └─ Reseed roles (toggle old roles to new): prune mode
│  └─ Update user.roles to new roles ObjectId
```

### 14.2 Symptom: 403 TENANT_MISMATCH

**Description:** Request returns 403 Tenant mismatch with user identity

**Causes & Fixes:**

```
Cause: x-tenant-id header ≠ JWT tenant_id claim
├─ Check:
│  ├─ Request header x-tenant-id: "tenant-a"
│  ├─ Token claim tenant_id: "tenant-b"
├─ Solution:
│  └─ Use same tenant ID in both places
│  └─ curl -H "x-tenant-id: tenant-a" ...
│  └─ Or use Keycloak mapper to set correct tenant_id
```

### 14.3 Symptom: 403 PERMISSION_DENIED

**Description:** Endpoint returns 403 Permission denied

**Causes & Fixes:**

```
Cause 1: User lacks required permission
├─ Check:
│  ├─ @Permissions([PERMISSION.CATALOG_CREATE]) on endpoint?
│  ├─ User permissions include CATALOG_CREATE?
│       GET /authorizer/me → permissions array
├─ Solution:
│  └─ Update role.json: add permission to role
│  └─ Reseed: prune mode
│  └─ Re-login (token cached 30 min)

Cause 2: Wrong role assigned to user
├─ Check:
│  └─ DB user.roles references which role?
│  └─ That role's permissions array?
├─ Solution:
│  └─ Update user.roles in DB to correct role ObjectId
```

### 14.4 Symptom: Cache Issues

**Description:** Permission update doesn't take effect immediately

**Cause:** UserGuard caches token verification 30 minutes

**Fix:**

```bash
# Option 1: Wait 30 minutes (can't do for testing)

# Option 2: Clear cache manually
# (Need cache management endpoint, not yet implemented)

# Option 3: Re-login (bypass cache)
POST /authorizer/login
```

---

## 15. Important Points to Remember

### 15.1 Key Concepts

1. **2 parallel authentication models:**
   - JWT (personnel): Keycloak + User-Access + Authorizer gRPC
   - Session (customer/guest): Redis + SessionGuard

2. **Role mapping validation:**
   - Keycloak roles (from realm) ≠ Internal roles (from MongoDB)
   - MUST have intersection to be valid
   - If the token has `Owner` but the roles in MongoDB do not have the same name as realm roles → ROLE_MAPPING_MISMATCH 401

3. **Permission collection:**
   - Permissions come from user.roles[*].permissions
   - Metadata.permissions is collected in Authorizer
   - Cached 30 minutes with JWT verification

4. **tenant isolation:**
   - Default enforce for all routes (except /authorizer, /saas, /health)
   - SUPER_ADMIN bypass tenant check
   - Session backfill tenant if not available

5. **Guard execution order:**
   - UserGuard → SessionGuard → TenantGuard → PermissionGuard → ThrottleGuard
   - Do not change

### 15.2 Common Patterns

**Using JWT (staff):**

```typescript
@Post('create')
@Authorization({ secured: true })
@Permissions([PERMISSION.CATALOG_CREATE])
async create(@Body() dto: CreateCatalogDto, @UserData() userData: AuthorizedMetadata) {
  // UserGuard: JWT verify
  // PermissionGuard: check CATALOG_CREATE permission
// userData code: userId, permissions, jwt
}
```

**Guest/customer (no JWT):**

```typescript
@Get('list')
// No @Authorization → SessionGuard creates session
async list() {
// SessionGuard: create/reuse session from Redis
  // TenantGuard: enforce tenant
// No permission check (decorator not available)
}
```

**Admin/platform-level:**

```typescript
@Delete('user/:id')
@Authorization({ secured: true })
async deleteUser(@Param('id') id: string) {
// Request JWT
// If user is SUPER_ADMIN → TenantGuard bypass
// Otherwise → TenantGuard enforce tenant
}
```

### 15.3 Database Structure Recap

```
MongoDB: qrtable
├─ role collection:
│  ├─ _id: ObjectId
│  ├─ name: ROLE enum (SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA)
│  ├─ description: string
│  ├─ permissions: [PERMISSION...]
│
├─ user collection:
│  ├─ _id: ObjectId
│  ├─ userId: string (Keycloak user.sub UUID)
│  ├─ email: string
│  ├─ firstName, lastName: string
│  └─ roles: [ObjectId] (references to role._id)
│
├─ [other collections: catalog, order/payment/bill domain data, product legacy, ...]
│

Redis:
├─ user-token:{sha256_hash}: AuthorizeResponse (TTL 30 min)
├─ bff-session:{tenantId}:{sid}: { tenantId?, createdAt, lastActivityAt } (TTL 2h)

Keycloak:
├─ Realm: qrtable
├─ Client: qrtable-bff (confidential)
├─ Roles: SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA
└─ Protocol Mapper: tenant_id → JWT claim
```

---

## Conclusion

QRTable's authentication, authorization, role, and permission system is designed to:

1. ✅ **Supports 2 actor types:** Staff (JWT from Keycloak) + Customer (Session anonymous)
2. ✅ **Enforce tenant isolation:** Every request has tenantId, prevent cross-tenant access
3. ✅ **Validate role consistency:** Keycloak roles ∩ Internal roles ≠ ∅
4. ✅ **Granular permissions:** 6 roles + 65 permissions, flexible assignment
5. ✅ **Caching & performance:** Token cached 30 min, BFF session cached 2h + idle 30 min
6. ✅ **Debug-friendly:** Clear error codes, processId tracking, structured logging

When developing new features:

- ✅ Add @Authorization decorator if route needs JWT
- ✅ Add @Permissions decorator with specific permissions
- ✅ Update role.json if permission matrix changes
- ✅ Reseed (prune mode) in local dev
- ✅ Use GET /authorizer/me to verify permissions

Happy coding! 🚀
