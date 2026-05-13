# Tài Liệu Chi Tiết Hệ Thống Authentication, Authorization, Role & Permission

**Phiên bản:** Step 0.6B  
**Ngày cập nhật:** 2026-05-13 (refresh supporting RBAC reference sau Phase 4B)
**Trạng thái:** Tài liệu tham khảo hỗ trợ, không phải nguồn canonical cho RBAC

> **Current status:** RBAC canonical source of truth là [`docs/architecture/permission-matrix.md`](../architecture/permission-matrix.md), đối chiếu với `libs/constants/src/lib/enum/role.enum.ts` và `apps/user-access/src/seeder/role.json`. Snapshot hiện tại sau Phase 4B có 66 permissions: `SUPER_ADMIN=66`, `OWNER=38`, `MANAGER=35`, `WAITER=15`, `CHEF=6`, `BARISTA=6`. Nếu tài liệu này khác canonical matrix hoặc code/seed, hãy ưu tiên canonical matrix và code/seed.

---

## Mục Lục

1. [Tổng Quan Hệ Thống Auth](#1-tổng-quan-hệ-thống-auth)
2. [Kiến Trúc Tổng Thể](#2-kiến-trúc-tổng-thể)
3. [6 Roles Chính Của Hệ Thống](#3-6-roles-chính-của-hệ-thống)
4. [Luồng Xử Lý Request (Request Lifecycle)](#4-luồng-xử-lý-request-request-lifecycle)
5. [Chi Tiết Từng Guard](#5-chi-tiết-từng-guard)
6. [Decorators & Metadata](#6-decorators-metadata)
7. [Keycloak Integration](#7-keycloak-integration)
8. [MongoDB: Role & User Mapping](#8-mongodb-role-user-mapping)
9. [Permission Matrix Chi Tiết](#9-permission-matrix-chi-tiết)
10. [Luồng Login (JWT Flow)](#10-luồng-login-jwt-flow)
11. [Luồng Guest/Customer Session](#11-luồng-guestcustomer-session)
12. [Seed Script & Role Bootstrap](#12-seed-script-role-bootstrap)
13. [Error Codes & Debugging](#13-error-codes-debugging)
14. [Checklist Debug Auth Issues](#14-checklist-debug-auth-issues)

---

## 1. Tổng Quan Hệ Thống Auth

### 1.1 Mô Hình Authentication Kép

Hệ thống QRTable sử dụng **2 mô hình xác thực song song**:

```
┌─────────────────────────────────────────────────────┐
│          HỆ THỐNG XÁC THỰC QRTable                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. JWT Authentication (Nhân sự hệ thống)          │
│     - Flow: Username/Password → Keycloak            │
│     - Token: RS256 signed JWT với tenant_id claim   │
│     - Actor: SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA │
│     - Quản lý: Keycloak Realm "qrtable"            │
│                                                      │
│  2. Session Authentication (Khách hàng/Guest)      │
│     - Flow: TạoSessioID → Redis                     │
│     - Token: UUID-based session ID trong Redis      │
│     - Actor: Customer (ẩn danh)                     │
│     - TTL: 2 giờ (có idle timeout 30 phút)         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Chính sách kết hợp:**

- Nếu route có `@Authorization({ secured: true })` → yêu cầu JWT từ UserGuard
- Nếu route không có decorator → SessionGuard có thể tạo/tái sử dụng session anonymous
- TenantGuard enforce tenant isolation cho cả 2 loại actor

### 1.2 Điều hướng FE (Management App) vs kiểm tra Permission (BFF)

Ứng dụng Next.js `management-app` dùng **middleware + sidebar theo role** để người dùng chỉ thấy các **khu vực** (dashboard, POS, KDS, admin) phù hợp persona. **Đây không phải layer thay thế PermissionGuard:** mọi API staff vẫn phải khớp `permissions[]` từ Authorizer theo ma trận canonical. Mô tả đầy đủ, bảng so sánh và TODO tinh chỉnh: [`docs/architecture/permission-matrix.md`](../architecture/permission-matrix.md) §9 · `AGENTS.md` (mục Frontend RBAC).

---

## 2. Kiến Trúc Tổng Thể

### 2.1 Thành Phần Chính

```
┌─ FRONTEND ───────────────────────────────────────────────┐
│  (Web/PWA)                                              │
└────────────────┬─────────────────────────────────────────┘
                 │ HTTP Request (JWT or Session ID)
                 ▼
        ┌─ BFF GATEWAY ──────────────────────────────┐
        │  Port: 3300                                │
        │  ┌─ TenantMiddleware                       │
        │  │  (resolve tenant từ header/subdomain)   │
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

### 2.2 Dòng Chảy Dữ Liệu Authorization

```
1. Request vào BFF (có JWT hoặc Session ID)
   ↓
2. TenantMiddleware lấy tenant từ x-tenant-id header hoặc subdomain
   ↓
3. UserGuard (nếu route secured=true):
   - Parse JWT
   - Verify signature bằng Keycloak JWKS
   - Call Authorizer gRPC → verifyUserToken
   - Authorizer lấy user profile từ User-Access
   - Validate role mapping giữa Keycloak roles và internal roles
   ↓
4. SessionGuard (nếu route không secured):
   - Tạo/tái sử dụng session từ Redis
   ↓
5. TenantGuard:
   - Enforce tenant từ JWT claim hoặc session
   - Check consistency giữa request tenant vs claim/session
   ↓
6. PermissionGuard:
   - Nếu route có @Permissions decorator
   - Check user permissions có chứa required permissions không
   ↓
7. Controller → build TCP RequestContext
   - Gắn processId, tenantId, userId, sessionId
   ↓
8. Downstream service (Catalog, Invoice, etc.)
   - Nhận context
   - Verify tenant consistency
   - Execute business logic (auto-filtered by tenant)
```

---

## 3. 6 Roles Chính Của Hệ Thống

### 3.1 Bảng Tóm Lược 6 Roles (Bao gồm Super Admin)

| **Role**        | **Mô Tả**                                                                                    | **Phạm Vi**                 | **Người Dùng**    | **Keycloak Role** | **Permissions** |
| --------------- | -------------------------------------------------------------------------------------------- | --------------------------- | ----------------- | ----------------- | --------------- |
| **SUPER_ADMIN** | Admin nền tảng, quyền toàn bộ hệ thống                                                       | Cross-tenant platform-level | Admin hệ thống    | `SUPER_ADMIN`     | 66              |
| **OWNER**       | Chủ sở hữu nhà hàng/cửa hàng, gồm checkout subscription và payment settings                  | Single-tenant (owner only)  | Chủ tiệm          | `OWNER`           | 38              |
| **MANAGER**     | Quản lý điều hành; có own-tenant visibility, không checkout/update payment settings/xóa user | Single-tenant               | Quản lý cửa hàng  | `MANAGER`         | 35              |
| **WAITER**      | Nhân viên phục vụ bàn                                                                        | Single-tenant               | Nhân viên         | `WAITER`          | 15              |
| **CHEF**        | Đầu bếp                                                                                      | Single-tenant               | Đầu bếp           | `CHEF`            | 6               |
| **BARISTA**     | Nhân viên pha chế                                                                            | Single-tenant               | Nhân viên pha chế | `BARISTA`         | 6               |

### 3.2 Actor Đặc Biệt: CUSTOMER (Guest)

**Customer** không phải role trong Keycloak mà là:

- Khách hàng quét QR khi vào nhà hàng
- **Không có account** → không cần login
- **Được xác thực** bằng SessionGuard → random session ID trong Redis
- **Tenant binding**: Tenant từ QR code hoặc host/subdomain
- **Permission**: Không có RBAC role/permission trong `role.json`; customer đọc public menu và xem trạng thái order/payment của chính session qua guard/controller scope.

> Chi tiết CUSTOMER endpoint + SessionGuard scope xem [Permission Matrix §7](../architecture/permission-matrix.md#7-customer-actor-no-db-role).

---

## 4. Luồng Xử Lý Request (Request Lifecycle)

### 4.1 Request Lifecycle Chi Tiết Tại BFF

```typescript
// Giả sử request: POST /api/v1/catalog/create
// Header: Authorization: Bearer <JWT>
//         x-tenant-id: tenant-a

STEP 1: TenantMiddleware
├─ Đọc x-tenant-id từ header → request[MetadataKey.TENANT_ID] = "tenant-a"
└─ Hoặc parse từ subdomain/host → request[MetadataKey.TENANT_ID]

STEP 2: UserGuard (toàn cầu)
├─ Reflector.get(SECURED) từ decorator @Authorization
├─ Nếu decorator không có hoặc secured=false → return true (skip JWT check)
├─ Nếu secured=true:
│  ├─ getAccessToken từ Authorization header
│  ├─ Check cache: user-token:{hash} trong Cache Manager (Redis)
│  │  └─ Nếu có → setUserData(req, cacheData) → return true
│  ├─ Nếu cache miss:
│  │  ├─ Call Authorizer gRPC → verifyUserToken(token, processId)
│  │  ├─ Authorizer service:
│  │  │  ├─ jwt.decode → lấy header.kid
│  │  │  ├─ jwksClient.getSigningKey(kid) → lấy public key
│  │  │  ├─ jwt.verify(token, publicKey) → verify RS256
│  │  │  ├─ userId = payload.sub
│  │  │  ├─ User-Access gRPC → getByUserId(userId)
│  │  │  ├─ Nếu user không tồn tại:
│  │  │  │  └─ Nếu AUTO_PROVISION_ON_FIRST_LOGIN=true
│  │  │  │     └─ autoProvisionFromToken → upsertByIdentity
│  │  │  ├─ validateRoleMapping:
│  │  │  │  ├─ keycloakRoles = payload.realm_access.roles
│  │  │  │  ├─ internalRoles = user.roles (từ MongoDB)
│  │  │  │  ├─ normalize both sets to uppercase
│  │  │  │  └─ Check intersection: any(keycloakRoles) ∩ any(internalRoles) != ∅
│  │  │  │     └─ Nếu ∅ → throw ROLE_MAPPING_MISMATCH
│  │  │  └─ collectPermissions từ user.roles[*].permissions
│  │  ├─ Return AuthorizeResponse { valid, metadata: { jwt, permissions, user } }
│  │  ├─ Cache kết quả 30 phút
│  │  └─ setUserData(req, response)
│  └─ Return true

STEP 3: SessionGuard (toàn cầu)
├─ Reflector.get(SECURED)
├─ Nếu secured=true → return true (skip session)
├─ Nếu không:
│  ├─ getSessionIdFromRequest: x-session-id header/cookie
│  ├─ Nếu có existingSessionId:
│  │  ├─ getSessionCacheKey(sessionId) → "session:{sessionId}"
│  │  ├─ Get từ cache
│  │  ├─ Check idle timeout: (now - lastActivityAt) > IDLE_TIMEOUT_MS (30 phút)
│  │  │  └─ Nếu idle → delete session, create new
│  │  ├─ Update lastActivityAt
│  │  └─ request[MetadataKey.SESSION_ID] = sessionId
│  ├─ Nếu không có sessionId:
│  │  ├─ Generate: "sid_{random UUID}"
│  │  ├─ Store Redis: { tenantId, createdAt, lastActivityAt }
│  │  ├─ TTL: 2 giờ
│  │  └─ response.setHeader(x-session-id, sessionId)

STEP 4: TenantGuard (toàn cầu)
├─ Check if excluded path: /authorizer, /saas, /health → return true
├─ Get claimTenantId từ userData.metadata.jwt.tenant_id
├─ Get tenantId = request[TENANT_ID] || claimTenantId
├─ Nếu SUPER_ADMIN → return true (bypass tenant check)
├─ Nếu !tenantId → throw ForbiddenException("Tenant is required")
├─ Nếu claimTenantId && claimTenantId !== tenantId
│  └─ throw ForbiddenException("Tenant mismatch with user identity")
├─ Nếu có sessionId:
│  ├─ Get session từ cache
│  ├─ Nếu session.tenantId && session.tenantId !== tenantId
│  │  └─ throw ForbiddenException("Tenant mismatch with session")
│  ├─ Nếu !session.tenantId
│  │  └─ Backfill: cache.set({ ...session, tenantId })
│  └─ Check: tenant consistency confirmed
├─ request[MetadataKey.TENANT_ID] = tenantId
└─ return true

STEP 5: PermissionGuard (toàn cầu)
├─ requiredPermissions = Reflector.get(Permissions, handler)
├─ Nếu !requiredPermissions → return true (optional)
├─ userData = request[MetadataKey.USER_DATA]
├─ Nếu !userData → throw UnauthorizedException
├─ userPermissions = userData.metadata.permissions
├─ Nếu !requiredPermissions.every(p => userPermissions.includes(p))
│  └─ throw ForbiddenException("Permission denied")
└─ return true

STEP 6: ThrottlerGuard (toàn cầu)
└─ Check rate limit theo IP/user

STEP 7: Controller Execution
├─ Decorators được inject:
│  ├─ @ProcessId() → getProcessId hoặc từ request metadata
│  ├─ @UserData() → request[MetadataKey.USER_DATA]
│  └─ @RequestTenant() → request[MetadataKey.TENANT_ID]
├─ Build TCP RequestContext:
│  ├─ processId
│  ├─ tenantId
│  ├─ userId (từ userData.metadata.userId)
│  ├─ sessionId (từ request[MetadataKey.SESSION_ID])
│  └─ data: { ...body/params }
├─ Call downstream service (Catalog, Invoice, etc.) via TCP
└─ Return response

STEP 8: Response
├─ response.setHeader(x-process-id, processId)
├─ response.setHeader(x-session-id, sessionId) [nếu có]
└─ return { data, statusCode, message }
```

### 4.2 Guard Execution Order (Thứ Tự Rất Quan Trọng)

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

**Vì sao thứ tự này?**

1. **UserGuard đầu tiên**: Validate JWT signature, lấy user data từ Authorizer → set userData vào request
2. **SessionGuard thứ hai**: Có thể bypass nếu JWT đã loại, hoặc tạo session
3. **TenantGuard thứ ba**: Dùng userData từ UserGuard + sessionId từ SessionGuard
4. **PermissionGuard thứ tư**: Dùng permissions từ userData (đã set bởi UserGuard)
5. **ThrottlerGuard cuối**: Đơn giản chỉ là rate limiting, không phụ thuộc vào context

---

## 5. Chi Tiết Từng Guard

### 5.1 UserGuard: JWT Verification & User Provisioning

**File:** `libs/guards/src/lib/user.guard.ts`

**Nhiệm vụ:**

1. Kiểm tra route có decorator `@Authorization({ secured: true })` không
2. Nếu có → verify JWT token
3. Call Authorizer service để validate + get user profile + collect permissions
4. Cache kết quả 30 phút
5. Set userData vào request context

**Code Flow Chi Tiết:**

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
      return true; // ❌ Route không secured → skip JWT check
    }

    return this.verifyUserToken(req);
  }

  private async verifyUserToken(req: Request): Promise<boolean> {
    try {
      const token = getAccessToken(req); // Từ "Authorization: Bearer ..."

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

      // ✅ Cache 30 phút
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

**Output của UserGuard:**

- ✅ `request[MetadataKey.USER_DATA]` = AuthorizeResponse
  - `metadata.jwt` = JWT payload
  - `metadata.permissions` = PERMISSION[]
  - `metadata.user` = MongoDB user profile
  - `metadata.userId` = user ID

**Lỗi có thể xảy ra (401 Unauthorized):**

- `INVALID_TOKEN`: JWT malformed, expired, hoặc signature không valid
- `USER_NOT_PROVISIONED`: User logout khỏi Keycloak, hoặc profile không tồn tại trong MongoDB
- `ROLE_MAPPING_MISMATCH`: Token roles từ Keycloak không cắt ngang với internal roles trong MongoDB

---

### 5.2 SessionGuard: Anonymous Session Management

**File:** `libs/guards/src/lib/session.guard.ts`

**Nhiệm vụ:**

1. Nếu route secured=true → skip (JWT đã handle)
2. Nếu route không secured → tạo/tái sử dụng session
3. Session lưu trong Redis với TTL 2h
4. Có idle timeout 30 phút (nếu không hoạt động → session expire)
5. Trả x-session-id trong response header

**Code Flow Chi Tiết:**

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
      return true; // ✅ Route secured → UserGuard đã xử lý, skip session
    }

    // 🔍 Tìm existing session
    const existingSessionId = getSessionIdFromRequest(req); // x-session-id header/cookie

    if (existingSessionId) {
      const cacheKey = getSessionCacheKey(existingSessionId); // "session:{id}"
      const existingSession = await this.cacheManager.get<SessionData>(cacheKey);

      if (existingSession) {
        const now = Date.now();
        const idleTime = now - (existingSession.lastActivityAt || existingSession.createdAt);

        // ✅ Session còn hoạt động
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

    // 🆕 Tạo new session
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
      SESSION_POLICY.TTL_MS, // 2 giờ
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
  TTL_MS: 2 * 60 * 60 * 1000, // 2 giờ (cập nhật từ 24h → 2h cho phù hợp ngữ cảnh nhà hàng)
  IDLE_TIMEOUT_MS: 30 * 60 * 1000, // 30 phút
  COOKIE_KEY: 'x-session-id',
};
```

**SessionData structure:**

```typescript
type SessionData = {
  tenantId?: string; // Được backfill bởi TenantGuard
  createdAt: number; // Timestamp tạo session
  lastActivityAt: number; // Timestamp hoạt động cuối
};
```

**Output của SessionGuard:**

- ✅ `request[MetadataKey.SESSION_ID]` = "sid\_{uuid}"
- ✅ Response header: `x-session-id: sid_{uuid}`

**Lỗi có thể xảy ra:**

- Không có lỗi (SessionGuard luôn tạo/tái sử dụng session thành công)

---

### 5.3 TenantGuard: Tenant Isolation

**File:** `libs/guards/src/lib/tenant.guard.ts`

**Nhiệm vụ:**

1. Enforce tenant isolation → mọi request (trừ exceptions) phải có valid tenantId
2. Validate tenant consistency giữa JWT claim, session, và request header
3. Chặn cross-tenant attacks
4. Super admin bypass (SUPER_ADMIN role không bị enforce tenant)

**Code Flow Chi Tiết:**

```typescript
class TenantGuard implements CanActivate {
  constructor(
    private readonly cacheManager: Cache, // Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = req.path as string;

    // ✅ EXCLUDED PATHS (bỏ qua tenant check)
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
    const claimTenantId = this.getClaimTenantId(userData); // Từ JWT
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

      // ✅ Backfill tenant vào session nếu chưa có
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

    // Keycloak có thể trả snake_case hoặc camelCase
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

**Lỗi có thể xảy ra (403 Forbidden):**

- `"Tenant is required"`: Không có tenantId trong JWT hay request
- `"Tenant mismatch with user identity"`: JWT claim tenant_id ≠ request x-tenant-id
- `"Session not found"`: Session ID không tồn tại trong Redis
- `"Tenant mismatch with session"`: Session tenant ≠ request tenant

---

### 5.4 PermissionGuard: Permission Checking

**File:** `libs/guards/src/lib/permission.guard.ts`

**Nhiệm vụ:**

1. Đọc required permissions từ decorator `@Permissions(...)`
2. Nếu route không có decorator → bypass (return true)
3. Nếu có decorator → check all required permissions nằm trong user permissions
4. Nếu user không có some permission → throw 403

**Code Flow Chi Tiết:**

```typescript
class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 🔍 Get required permissions từ decorator
    const requiredPermissions = this.reflector.get<PERMISSION[]>(Permissions, context.getHandler());

    // ✅ Route không có @Permissions → optional, pass
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

    // ❌ Kiểm tra: user có ALL required permissions không
    const isValid = requiredPermissions.every((permission) => userPermissions.includes(permission));

    if (!isValid) {
      throw new ForbiddenException('Permission denied'); // 403
    }

    return true;
  }
}
```

**Ví Dụ Sử Dụng Decorator:**

```typescript
@Controller('catalog')
export class CatalogController {
  // ✅ Endpoint này yêu cầu JWT + 2 permissions
  @Post('create')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  async create(@Body() dto: CreateCatalogDto) {
    // code...
  }

  // ✅ Endpoint này yêu cầu JWT + multiple permissions
  @Put(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  async update(@Param('id') id: string, @Body() dto: UpdateCatalogDto) {
    // code...
  }

  // ✅ Endpoint này không yêu cầu JWT (guest có thể gọi)
  @Get('list')
  async list() {
    // SessionGuard tạo session, TenantGuard check tenant
    // Nhưng không check permission vì không có @Permissions decorator
  }
}
```

**Lỗi có thể xảy ra (403 Forbidden):**

- `"Permission denied"`: User không có required permission

---

## 6. Decorators & Metadata

### 6.1 @Authorization Decorator

**File:** `libs/decorators/src/lib/authorizer.decorator.ts`

**Mục đích:** Mark route yêu cầu JWT

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

**Sử dụng:**

```typescript
// ✅ Route yêu cầu JWT
@Get('me')
@Authorization({ secured: true })
async me(@UserData() userData: AuthorizedMetadata) {
  return userData;
}

// ✅ Route không yêu cầu JWT (guest có thể)
@Get('list')
@Authorization({ secured: false })
async list() {
  // SessionGuard tạo session
}
```

### 6.2 @Permissions Decorator

**File:** `libs/decorators/src/lib/permission.decorator.ts`

**Mục đích:** Định nghĩa permissions yêu cầu cho route

```typescript
export const Permissions = Reflector.createDecorator<PERMISSION[]>();
```

**Sử dụng:**

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

**Mục đích:** Inject processId (request tracing ID)

```typescript
@Get('detail/:id')
async getDetail(
  @Param('id') id: string,
  @ProcessId() processId: string,  // ← Injected từ middleware/decorator logic
) {
  console.log(`[${processId}] Getting catalog ${id}`);
}
```

### 6.4 @UserData Decorator

**File:** `libs/decorators/src/lib/userData.decorator.ts`

**Mục đích:** Inject user data từ UserGuard

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

**Realm:** `qrtable` (thay vì realm cũ)

**Client:**

- **Client ID:** `qrtable-bff`
- **Type:** Confidential (có client secret)
- **Flows:**
  - Direct Access Grants (Resource Owner Password) → dùng cho login
  - Standard Flow → dùng cho frontend redirect
- **OIDC Protocol** → RS256 signed tokens

### 7.2 Keycloak Realm Roles

```
Realm qrtable có 6 roles:
├─ SUPER_ADMIN (platform-level)
├─ OWNER
├─ MANAGER
├─ WAITER
├─ CHEF
└─ BARISTA
```

### 7.3 Protocol Mapper: tenant_id Claim

**Keycloak bootstrap script tạo mapper này:**

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

**Kết quả:** User attribute `tenant_id` được đưa vào JWT claim

### 7.4 Token Structure

**JWT Token từ Keycloak (RS256 signed)**

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "Z1zOr8m_..." // Key ID để lấy public key
  },
  "payload": {
    "sub": "74ad75a4-98a6-4bec-b528-0a0ac702d2f5", // User ID
    "email": "manager2.1773990177@gmail.com",
    "email_verified": true,
    "name": "Manager Two",
    "given_name": "Manager",
    "family_name": "Two",
    "tenant_id": "tenant-a", // ← Mapper thêm vào
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
  // Step 1: Decode KHÔNG verify lúc này
  const decoded = jwt.decode(token, { complete: true });

  // Step 2: Lấy kid từ header
  const kid = decoded.header.kid;

  // Step 3: Lấy public key từ Keycloak JWKS endpoint
  const key = await this.jwksClient.getSigningKey(kid);
  const publicKey = key.getPublicKey();

  // Step 4: Verify signature RS256
  const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

  // Step 5: Extract data từ payload
  const userId = payload.sub;
  const keycloakRoles = payload.realm_access.roles;

  // Step 6: Validate user profile trong MongoDB
  let user = await this.userValidation(userId, processId);
  if (!user && AUTO_PROVISION_ON_FIRST_LOGIN) {
    user = await this.autoProvisionFromToken(payload, processId);
  }

  // Step 7: Validate role mapping (Keycloak roles ∩ Internal roles ≠ ∅)
  const isRoleMappingValid = this.validateRoleMapping(keycloakRoles, user.roles);
  if (!isRoleMappingValid) {
    throw new UnauthorizedException(AUTH_ERROR_CODE.ROLE_MAPPING_MISMATCH);
  }

  // Step 8: Collect permissions từ internal roles
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
  permissions: PERMISSION[]; // Array of permissions này role có
}
```

**Ví dụ data trong mongoDB:**

```javascript
// Collection: role
db.role.find()

[
  {
    _id: ObjectId("68a3f2f1b3e811435a8ad004"),
    name: "SUPER_ADMIN",
    description: "platform-level super admin",
    permissions: [
      "saas.create", "saas.delete", "saas.update", // ... tất cả
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
  userId: string; // UUID từ Keycloak user.sub

  @Prop({ type: [ObjectId], ref: 'Role' })
  roles: ObjectId[]; // Array of Role _id (references)
}
```

**Ví dụ data trong MongoDB:**

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
  // Tất cả ROLE enum values (uppercase)
  const appRoles = new Set(Object.values(ROLE).map((role) => normalizeRoleName(role)));

  // Keycloak roles → filter chỉ app roles (normalize uppercase)
  const keycloakAppRoles = new Set(
    keycloakRoles
      .map((role) => normalizeRoleName(role))
      .filter((role) => appRoles.has(role)),
  );

  // Internal roles từ MongoDB → filter chỉ app roles
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

## 9. Permission Matrix Chi Tiết

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

  /* PRODUCT (legacy) */
  PRODUCT_CREATE = 'product.create',
  PRODUCT_GET_BY_ID = 'product.get_by_id',
  PRODUCT_GET_ALL = 'product.get_all',
  PRODUCT_UPDATE = 'product.update',
  PRODUCT_DELETE = 'product.delete',

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

> Single source of truth: [`docs/architecture/permission-matrix.md`](../architecture/permission-matrix.md). Bảng dưới đây chỉ là tóm tắt để đọc nhanh, không thay thế canonical matrix 6 roles × 66 permissions.

| **Role**               | **Platform / SaaS domains**                                                                                                                        | **Operational domains**                                                                                                       | **Permission count** |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **SUPER_ADMIN**        | All legacy `saas.*`, `tenant.*`, `subscription.*`, `plan.*`, `payment_settings.*`                                                                  | All catalog/user/role/product/order/kitchen/payment/table/service-request permissions                                         | 66                   |
| **OWNER**              | `tenant.read_own`, `subscription.read_own`, `subscription.checkout`, `plan.read`, `payment_settings.read_own`, `payment_settings.update_own`       | Full tenant operations except platform-only role/product/SaaS admin permissions                                               | 38                   |
| **MANAGER**            | `tenant.read_own`, `subscription.read_own`, `plan.read`, `payment_settings.read_own`; no `subscription.checkout`, no `payment_settings.update_own` | Operational permissions similar to OWNER, but no `user.delete`                                                                | 35                   |
| **WAITER**             | `plan.read`                                                                                                                                        | Catalog read, order confirm/cancel pending/read, payment create/cash/history, table transfer/status, service-request handling | 15                   |
| **CHEF**               | `plan.read`                                                                                                                                        | Catalog read plus KDS `get_queue`, `update_ticket`, `recall`; no `kitchen.set_priority`                                       | 6                    |
| **BARISTA**            | `plan.read`                                                                                                                                        | Catalog read plus KDS `get_queue`, `update_ticket`, `recall`; no `kitchen.set_priority`                                       | 6                    |
| **CUSTOMER** (session) | none                                                                                                                                               | Session-scoped public menu, own order/payment status, service request/order submit via customer guards                        | n/a                  |

**Ghi chú:**

- `SAAS_*` và `PRODUCT_*` là legacy/backward-compat; Phase 4B dùng `TENANT_*`, `SUBSCRIPTION_*`, `PLAN_*`, `PAYMENT_SETTINGS_*`.
- CUSTOMER không có "role" thực sự, chỉ có session → access được enforce bằng customer/session guards và ownership checks.
- **MANAGER không có `user.delete`, `subscription.checkout`, hoặc `payment_settings.update_own`**.
- **WAITER có `payment.get_history`** — cho "last bill" queries từ customer.

### 9.3 Data File: role.json

**File:** `apps/user-access/src/seeder/role.json`

**Current contents (Phase 4B — static-verified 2026-05-13):** Full canonical matrix với 6 roles và 66 permissions distributed per [`permission-matrix.md`](../architecture/permission-matrix.md) §6. Permission counts:

| Role        | Permission count |
| ----------- | ---------------- |
| SUPER_ADMIN | 66               |
| OWNER       | 38               |
| MANAGER     | 35               |
| WAITER      | 15               |
| CHEF        | 6                |
| BARISTA     | 6                |

Refer to actual file `apps/user-access/src/seeder/role.json` for full content (auto-generated from canonical matrix).

---

## 10. Luồng Login (JWT Flow)

### 10.1 Login Workflow Chi Tiết

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

**Step 5: Client GET /authorizer/me (với JWT)**

```bash
curl -X GET 'http://localhost:3300/api/v1/authorizer/me' \
  -H 'Authorization: Bearer <accessToken>'
```

**Step 6: BFF Routes → UserGuard → Authorizer verifyUserToken**

```
Request vào BFF
  ↓
UserGuard canActivate()
  ├─ @Authorization({ secured: true }) exists → YES
  ├─ extractToken từ header
  ├─ Check cache (30 phút)
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
    │   ├─ Keycloak roles từ payload.realm_access.roles
    │   ├─ Internal roles từ user.roles (populated từ MongoDB)
    │   └─ Check: intersection ≠ ∅
    ├─ collectPermissions(user.roles):
    │   └─ Flatten: user.roles[*].permissions → unique Permission[]
    └─ Return: AuthorizeResponse { valid: true, metadata: {...} }

  ├─ Cache result 30 phút
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
      tenantId: jwt['tenant_id'],  // ← Mapper thêm vào
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

## 11. Luồng Guest/Customer Session

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
  TTL_MS: 2 * 60 * 60 * 1000,         // 2 giờ lifetime (phù hợp bữa ăn 1-2h)
  IDLE_TIMEOUT_MS: 30 * 60 * 1000,    // 30 phút idle timeout
  COOKIE_KEY: 'x-session-id',         // Response header key
}
```

**Idle Timeout Logic:**

- Nếu customer không gửi request trong 30 phút → session delete
- Mỗi request gửi lên → update lastActivityAt
- Nếu session vẫn active → TTL được reset (2h từ lúc cuối cùng)

### 11.3 Customer Routes (Không Secured)

```typescript
@Controller('catalog')
export class CatalogController {
  // ✅ Customer có thể gọi (không cần JWT)
  @Get('list')
  // Không có @Authorization decorator
  async getList() {
    // SessionGuard tạo session
    // TenantGuard check tenant
    // Nhưng không check permission
  }

  // ✅ Customer có thể gọi
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    // SessionGuard tạo session
  }

  // ❌ Customer KHÔNG thể gọi (yêu cầu JWT)
  @Post('create')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  async create(@Body() dto: CreateCatalogDto) {
    // UserGuard yêu cầu JWT
  }
}
```

---

## 12. Seed Script & Role Bootstrap

### 12.1 Seed Script: tools/seed.js

**Mục đích:** Bootstrap initial data vào MongoDB (roles, permissions)

**File:** `tools/seed.js`

**Cách chạy:**

```bash
# Đủ đầy đủ các biến
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder prune

# Hoặc
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder migrate
```

**Modes:**

```
┌─────────────────────┬──────────────────────────┬────────────────────────┐
│      Mode           │       Hành động          │      Sử dụng khi       │
├─────────────────────┼──────────────────────────┼────────────────────────┤
│ prune (destructive) │ DELETE ALL + INSERT NEW  │ Role taxonomy thay đổi │
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

**Khi nào cần reseed?**

1. ✅ **Role taxonomy thay đổi** (thêm role mới, rename, xóa)
2. ✅ **Permission matrix cập nhật** (thêm/xóa permissions)
3. ✅ **Database reset** (dev environment cleanup)
4. ❌ **KHÔNG cần** khi: app restarted, code changed (không touch auth)

**Reseed command:**

```bash
# Prune mode (destructive, dùng cho dev)
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder prune

# Migrate mode (safe, dùng cho production)
MONGODB_URI='mongodb://root:password@localhost:27017/?authSource=admin' \
MONGO_DB_NAME='qrtable' \
node tools/seed.js apps/user-access/src/seeder migrate
```

---

## 13. Error Codes & Debugging

### 13.1 Auth Error Codes

**File:** `libs/constants/src/lib/enum/auth-error-code.enum.ts`

```typescript
export enum AUTH_ERROR_CODE {
  // HTTP 401: Authentication failed
  INVALID_TOKEN = 'INVALID_TOKEN', // Token malformed/expired
  USER_NOT_PROVISIONED = 'USER_NOT_PROVISIONED', // User profile missing/roles mismatched
  ROLE_MAPPING_MISMATCH = 'ROLE_MAPPING_MISMATCH', // Keycloak roles ∩ internal roles = ∅

  // HTTP 403: Authorization failed
  TENANT_REQUIRED = 'TENANT_REQUIRED', // No tenant context
  TENANT_MISMATCH = 'TENANT_MISMATCH', // Tenant claim ≠ request tenant
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND', // Session expired/invalid
  PERMISSION_DENIED = 'PERMISSION_DENIED', // User lacks required permission
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

**Khi gặp 401 Unauthorized:**

```
1️⃣ Token valid?
   curl -X GET http://localhost:3300/api/v1/authorizer/me \
     -H "Authorization: Bearer <token>"
   └─ Nếu 401 USER_NOT_PROVISIONED → Step 3
   └─ Nếu 401 INVALID_TOKEN → Refresh token hoặc re-login

2️⃣ User profile tồn tại trong MongoDB?
   docker exec qrtable-provider-mongodb-1 mongosh mongodb://root:password@localhost:27017/qrtable?authSource=admin
   db.user.find({ userId: "<token.sub>" })
   └─ Nếu không tồn tại → Check AUTO_PROVISION_ON_FIRST_LOGIN

3️⃣ Role mapping hợp lệ?
   db.user.findOne({ userId: "..." })
   └─ Lấy roles ObjectId, check tên role:
   db.role.find({ _id: { $in: [ObjectId(...)] } })
   └─ Token roles (realm_access.roles) phải giao nhau với DB role names
   └─ Nếu không → Update user role trong MongoDB

4️⃣ Keycloak roles tồn tại?
   Token payload realm_access.roles = ["OWNER", "MANAGER"]
   DB user roles = [ObjectId("...MANAGER...")]
   └─ Check MANAGER exists in MongoDB roles collection

5️⃣ Reseed roles
   MONGODB_URI='mongodb://...' MONGO_DB_NAME='qrtable' \
   node tools/seed.js apps/user-access/src/seeder prune
```

**Khi gặp 403 Forbidden:**

```
1️⃣ Tenant context?
   Header x-tenant-id present OR JWT tenant_id claim?
   └─ Nếu không → Add x-tenant-id header

2️⃣ Tenant mismatch?
   x-tenant-id = "tenant-a"
   JWT tenant_id = "tenant-b"
   └─ Use same tenant ID

3️⃣ Session exists? (nếu customer)
   x-session-id present?
   └─ Redis: get session:{id}
   └─ Nếu không → Create new session (remove header)

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
Cause 1: User profile không tồn tại trong MongoDB
├─ Check: db.user.findOne({ userId: "<token.sub>" })
├─ Solution:
│  └─ Option A: Enable AUTO_PROVISION_ON_FIRST_LOGIN=true, re-login
│  └─ Option B: Manual insert user into MongoDB
│  └─ Option C: Use User API to create user (if available)

Cause 2: User profile exists nhưng roles mismatch
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

## 15. Những Điểm Quan Trọng Cần Nhớ

### 15.1 Key Concepts

1. **2 mô hình xác thực song song:**
   - JWT (nhân sự): Keycloak + User-Access + Authorizer gRPC
   - Session (khách hàng/guest): Redis + SessionGuard

2. **Role mapping validation:**
   - Keycloak roles (từ realm) ≠ Internal roles (từ MongoDB)
   - MUST have intersection (giao nhau) để hợp lệ
   - Nếu token có `OWNER` nhưng các role trong MongoDB không có tên trùng với realm roles → ROLE_MAPPING_MISMATCH 401

3. **Permission collection:**
   - Permissions đến từ user.roles[*].permissions
   - Metadata.permissions được collect ở Authorizer
   - Cached 30 phút cùng với JWT verification

4. **Tenant isolation:**
   - Default enforce cho mọi route (trừ /authorizer, /saas, /health)
   - SUPER_ADMIN bypass tenant check
   - Session backfill tenant nếu chưa có

5. **Guard execution order:**
   - UserGuard → SessionGuard → TenantGuard → PermissionGuard → ThrottlerGuard
   - Không được thay đổi

### 15.2 Common Patterns

**Dùng JWT (staff):**

```typescript
@Post('create')
@Authorization({ secured: true })
@Permissions([PERMISSION.CATALOG_CREATE])
async create(@Body() dto: CreateCatalogDto, @UserData() userData: AuthorizedMetadata) {
  // UserGuard: JWT verify
  // PermissionGuard: check CATALOG_CREATE permission
  // userData có: userId, permissions, jwt
}
```

**Guest/customer (no JWT):**

```typescript
@Get('list')
// Không có @Authorization → SessionGuard tạo session
async list() {
  // SessionGuard: create/reuse session từ Redis
  // TenantGuard: enforce tenant
  // No permission check (decorator không có)
}
```

**Admin/platform-level:**

```typescript
@Delete('user/:id')
@Authorization({ secured: true })
async deleteUser(@Param('id') id: string) {
  // Yêu cầu JWT
  // Nếu user là SUPER_ADMIN → TenantGuard bypass
  // Nếu không → TenantGuard enforce tenant
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

## Kết Luận

Hệ thống authentication, authorization, role, và permission của QRTable được thiết kế để:

1. ✅ **Hỗ trợ 2 actor loại:** Staff (JWT từ Keycloak) + Customer (Session anonymous)
2. ✅ **Enforce tenant isolation:** Mọi request có tenantId, prevent cross-tenant access
3. ✅ **Validate role consistency:** Keycloak roles ∩ Internal roles ≠ ∅
4. ✅ **Granular permissions:** 6 roles + 66 permissions, flexible assignment
5. ✅ **Caching & performance:** Token cached 30 min, BFF session cached 2h + idle 30 min
6. ✅ **Debug-friendly:** Clear error codes, processId tracking, structured logging

Khi phát triển features mới:

- ✅ Add @Authorization decorator nếu route cần JWT
- ✅ Add @Permissions decorator với specific permissions
- ✅ Update role.json nếu permission matrix thay đổi
- ✅ Reseed (prune mode) trong local dev
- ✅ Use GET /authorizer/me để verify permissions

Happy coding! 🚀
