# Step 1.25 — Tích hợp Keycloak vào Frontend (Auth.js + Keycloakify)

> **Đối tượng đọc:** Bạn đã hiểu JWT, access/refresh token, RBAC, đã từng triển khai Next.js + Zustand, đã tích hợp Keycloak phía backend — nhưng chưa biết cách tích hợp Keycloak **phía frontend**, chưa dùng Auth.js / NextAuth, chưa dùng Keycloakify. Tài liệu này giải thích **luồng đi, cách Keycloak "nói chuyện" với frontend**, và tại sao cần từng thành phần.

---

## Mục lục

1. [Vấn đề cần giải quyết](#1-vấn-đề-cần-giải-quyết)
2. [Keycloak — Hiểu đúng trước khi tích hợp](#2-keycloak--hiểu-đúng-trước-khi-tích-hợp)
   - [2.1 Keycloak là gì và làm gì trong hệ thống?](#21-keycloak-là-gì-và-làm-gì-trong-hệ-thống)
   - [2.2 Các khái niệm cốt lõi](#22-các-khái-niệm-cốt-lõi)
   - [2.3 Keycloak cấp token như thế nào? — Grant Types](#23-keycloak-cấp-token-như-thế-nào--grant-types)
   - [2.4 Token Keycloak cấp ra trông như thế nào?](#24-token-keycloak-cấp-ra-trông-như-thế-nào)
   - [2.5 OIDC Discovery — Auth.js biết endpoint của Keycloak từ đâu?](#25-oidc-discovery--authjs-biết-endpoint-của-keycloak-từ-đâu)
   - [2.6 Token Verification — Backend xác minh token Keycloak như thế nào?](#26-token-verification--backend-xác-minh-token-keycloak-như-thế-nào)
   - [2.7 Keycloak quản lý Session riêng — và điều đó ảnh hưởng thế nào?](#27-keycloak-quản-lý-session-riêng--và-điều-đó-ảnh-hưởng-thế-nào)
3. [Tổng quan luồng: Keycloak tích hợp Frontend như thế nào?](#3-tổng-quan-luồng-keycloak-tích-hợp-frontend-như-thế-nào)
4. [Auth.js (NextAuth v5) — Tại sao cần và nó làm gì?](#4-authjs-nextauth-v5--tại-sao-cần-và-nó-làm-gì)
5. [Chi tiết file `auth.ts` — Trung tâm điều khiển](#5-chi-tiết-file-authts--trung-tâm-điều-khiển)
6. [Middleware — Bảo vệ route theo role](#6-middleware--bảo-vệ-route-theo-role)
7. [Trang Login — Server Action redirect](#7-trang-login--server-action-redirect)
8. [Type augmentation — Mở rộng kiểu Session/JWT](#8-type-augmentation--mở-rộng-kiểu-sessionjwt)
9. [Hydrate Zustand từ session — AuthSessionHydrator](#9-hydrate-zustand-từ-session--authsessionhydrator)
10. [Proxy API route `/api/internal/me`](#10-proxy-api-route-apiinternalme)
11. [Keycloakify — Custom giao diện trang đăng nhập Keycloak](#11-keycloakify--custom-giao-diện-trang-đăng-nhập-keycloak)
12. [Cấu trúc file đã triển khai](#12-cấu-trúc-file-đã-triển-khai)
13. [Quy trình triển khai theo thứ tự](#13-quy-trình-triển-khai-theo-thứ-tự)
14. [Biến môi trường](#14-biến-môi-trường)
15. [Gotchas & Lưu ý quan trọng](#15-gotchas--lưu-ý-quan-trọng)
16. [Verify Checklist](#16-verify-checklist)

---

## 1. Vấn đề cần giải quyết

Ở phía backend, bạn đã biết Keycloak cấp JWT, backend verify JWT qua JWKS endpoint. **Nhưng phía frontend thì sao?**

Câu hỏi cốt lõi:

- Browser làm sao để **điều hướng user sang Keycloak**, nhận token về, rồi **lưu ở đâu** cho an toàn?
- Khi access token hết hạn, **ai** refresh nó? JavaScript phía client hay server?
- Middleware Next.js cần biết role để chặn route — **lấy role từ đâu** trước khi page render?
- Keycloak có trang login riêng (hosted bởi Keycloak server) — làm sao **custom giao diện** trang đó cho phù hợp thương hiệu?

**Trả lời ngắn gọn:**

| Vấn đề                       | Giải pháp                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Điều hướng OIDC + nhận token | **Auth.js** (NextAuth v5) — thư viện xử lý toàn bộ flow OIDC cho Next.js                   |
| Lưu token an toàn            | Auth.js mã hóa token vào **httpOnly cookie** (browser không đọc được bằng JS)              |
| Refresh token                | **Server-side** trong callback `jwt` của Auth.js — client không bao giờ thấy refresh token |
| Role cho middleware          | Auth.js inject `request.auth` vào middleware — có role ngay trước khi page render          |
| Custom trang login Keycloak  | **Keycloakify** — viết React component, build thành file `.jar`, Keycloak load theme       |

---

## 2. Keycloak — Hiểu đúng trước khi tích hợp

### 2.1 Keycloak là gì và làm gì trong hệ thống?

Keycloak là một **Identity Provider (IdP)** — hiểu đơn giản: nó là "cổng kiểm tra danh tính tập trung". Thay vì mỗi service tự quản lý user, password, session, bạn **delegate** toàn bộ việc đó cho Keycloak.

**Trước Keycloak — mỗi service tự xác thực:**

```
Management App → tự verify username/password → tự cấp JWT
BFF            → có bảng user riêng → tự cấp JWT
→ Vấn đề: user phải login nhiều lần, roles lưu nhiều nơi, khó đồng bộ
```

**Sau Keycloak — một điểm xác thực duy nhất:**

```
Management App → "Tôi không biết user này là ai, hỏi Keycloak đi" → redirect
BFF            → "Nhận JWT này, ai ký vậy?" → verify bằng public key Keycloak
Authorizer     → "JWT hợp lệ? User này có trong DB chưa?" → kiểm tra thêm business rules
→ Lợi ích: SSO (login 1 lần dùng được tất cả), roles quản lý tập trung
```

**Keycloak làm chính xác những việc này:**

| Việc                  | Mô tả                                                     |
| --------------------- | --------------------------------------------------------- |
| Xác thực credential   | Nhận username/password, kiểm tra, cấp token               |
| Quản lý users & roles | Lưu user, gán role, quản lý password                      |
| Cấp phát JWT          | Access token, Refresh token, ID token — đúng chuẩn OIDC   |
| Publish public keys   | JWKS endpoint để mọi service tự verify token              |
| Hosted login page     | Trang login của riêng Keycloak (customizable qua theme)   |
| Social login          | Delegate sang Google, Facebook, GitHub nếu cần            |
| Session management    | Quản lý session Keycloak riêng (khác với session của app) |

---

### 2.2 Các khái niệm cốt lõi

Trước khi tích hợp, cần nắm 5 khái niệm này — mọi config đều xoay quanh chúng.

#### Realm — Không gian cô lập

Realm là "tenant" của chính Keycloak. Mỗi realm có user, role, client, setting hoàn toàn độc lập. Realm `master` là realm quản trị hệ thống Keycloak. Dự án tạo realm riêng: `qrtable`.

```
Keycloak Server
├── realm: master        ← chỉ dùng để quản trị Keycloak
└── realm: qrtable       ← toàn bộ user/role/client của QRTable ở đây
    ├── users: [alice, bob, ...]
    ├── roles: [OWNER, MANAGER, WAITER, ...]
    └── clients: [management-app, bff-service, ...]
```

**Tất cả endpoint của realm đều có prefix `/realms/qrtable/`** — quan trọng khi cấu hình `issuer`.

#### Client — Danh tính của ứng dụng

Client là "ứng dụng nào được phép dùng Keycloak". Mỗi client có `client_id` và tùy chọn `client_secret`.

Dự án có 2 loại client quan trọng:

| Client           | Loại             | Ai dùng                          | Mục đích                             |
| ---------------- | ---------------- | -------------------------------- | ------------------------------------ |
| `management-app` | **Confidential** | Next.js Management App (browser) | OIDC login flow cho user             |
| `bff-service`    | **Confidential** | BFF backend (server-to-server)   | Client Credentials để gọi API nội bộ |

**Client settings quan trọng cho `management-app`:**

- **Standard flow (Authorization Code):** BẬT — đây là flow chúng ta dùng
- **Valid Redirect URIs:** `http://localhost:3000/api/auth/callback/keycloak`
- **Web Origins:** `http://localhost:3000` — CORS whitelist
- **Client Authentication:** ON — client có secret (confidential client)

#### Users & Roles

Keycloak lưu user và quản lý role. Có 2 loại role:

- **Realm Roles:** Gán ở cấp realm, áp dụng cho mọi client. Dự án dùng loại này: `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`, `SUPER_ADMIN`.
- **Client Roles:** Gán ở cấp client, chỉ áp dụng cho client đó. Dự án không dùng.

Realm roles xuất hiện trong JWT payload tại `realm_access.roles`:

```json
{
  "realm_access": {
    "roles": ["OWNER", "offline_access", "uma_authorization"]
  }
}
```

#### Tokens — 3 loại Keycloak cấp

| Token             | Thời hạn                | Mục đích                                                                                                        |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Access Token**  | Ngắn (5-15 phút)        | Bearer token để gọi API. Service verify bằng JWKS.                                                              |
| **Refresh Token** | Dài (30 phút - 30 ngày) | Đổi lấy Access Token mới khi hết hạn. Không gọi API được.                                                       |
| **ID Token**      | Ngắn                    | Chứa thông tin user (name, email) — dùng bởi OIDC client (Auth.js) để biết ai vừa login. Không dùng để gọi API. |

**Quan trọng:** Access Token là JWT ký bằng **private key** của Keycloak. Bất kỳ service nào có public key đều tự verify được — không cần gọi lại Keycloak.

#### Scopes — Yêu cầu claims nào trong token

| Scope            | Keycloak trả gì                                           |
| ---------------- | --------------------------------------------------------- |
| `openid`         | Bắt buộc cho OIDC. Kích hoạt ID Token.                    |
| `profile`        | Thêm `name`, `preferred_username`, `given_name` vào token |
| `email`          | Thêm `email`, `email_verified` vào token                  |
| `offline_access` | Keycloak cấp **Refresh Token** (offline = dài hạn)        |

---

### 2.3 Keycloak cấp token như thế nào? — Grant Types

#### Grant Type 1: Authorization Code Flow (+ PKCE) — Dùng trong dự án này

**Dùng khi:** Web app có browser user, app cần đăng nhập thay mặt user.

```
Browser          App Server       Keycloak
   │                │                │
   │─── click login ──►              │
   │                │── tạo PKCE code_verifier, code_challenge ──│
   │◄─ redirect tới Keycloak /auth?code_challenge=xxx ──────────►│
   │─── nhập username/password ─────►│
   │◄──────── redirect về app ────── │  với ?code=ABC123
   │─── GET /callback?code=ABC123 ──►│
   │                │─── POST /token ──────────────────────────► │
   │                │    code=ABC + code_verifier=original        │
   │                │◄─── { access_token, refresh_token } ───────│
   │◄── set cookie ─│
```

Token chỉ đi qua **server-to-server** — không qua browser URL. Auth.js bật PKCE tự động.

#### Grant Type 2: Client Credentials — Service-to-Service

```
Service A (BFF)              Keycloak
    │─── POST /token ───────────►│
    │    client_id=bff-service   │
    │    client_secret=xxx       │
    │    grant_type=client_credentials
    │◄─── { access_token } ──────│
```

Không có user, không có redirect. **Management App (frontend) không dùng flow này.**

#### Grant Type 3: Resource Owner Password (ROPC) — Tránh dùng cho browser

```
App → POST /token { username, password, client_id, client_secret } → Keycloak
```

Vấn đề: App nhìn thấy password của user. BFF `/authorizer/login` dùng flow này cho legacy/API client. **Management App không dùng.**

#### Grant Type 4: Refresh Token Grant — Auto trong Auth.js

```
App Server              Keycloak
    │─── POST /token ───────────►│
    │    grant_type=refresh_token
    │    refresh_token=xxx       │
    │◄── { new_access_token,     │
    │       new_refresh_token }  │
```

Auth.js tự động gọi flow này trong callback `jwt` mỗi khi access token gần hết hạn.

#### Tóm tắt: Dự án dùng grant type nào ở đâu?

```
┌────────────────────────────────────────────────────────────────────┐
│ Management App (Next.js browser)                                   │
│   → Authorization Code + PKCE (Auth.js tự xử lý)                  │
│   → Refresh Token Grant (Auto trong jwt callback)                  │
├────────────────────────────────────────────────────────────────────┤
│ BFF /authorizer/login endpoint                                     │
│   → ROPC (legacy support cho API clients)                          │
├────────────────────────────────────────────────────────────────────┤
│ BFF / Authorizer Service / Backend                                 │
│   → Chỉ VERIFY token bằng JWKS (không xin token)                  │
└────────────────────────────────────────────────────────────────────┘
```

---

### 2.4 Token Keycloak cấp ra trông như thế nào?

Payload của Access Token sau khi decode Base64:

```json
{
  "exp": 1742890000,
  "iat": 1742889700,
  "iss": "http://localhost:8180/realms/qrtable",
  "sub": "user-uuid-here",
  "azp": "management-app",
  "realm_access": {
    "roles": ["OWNER", "offline_access", "uma_authorization"]
  },
  "scope": "openid offline_access profile email",
  "email_verified": true,
  "name": "Nguyen Van A",
  "preferred_username": "nguyenvana",
  "email": "nguyenvana@example.com",
  "tenant_id": "tenant-uuid-here"
}
```

**Claims quan trọng dự án sử dụng:**

| Claim                | Dùng để làm gì                                |
| -------------------- | --------------------------------------------- |
| `sub`                | userId — khóa chính để tìm user trong MongoDB |
| `realm_access.roles` | Danh sách roles để route và authorize         |
| `email`              | Hiển thị, lưu vào session                     |
| `tenant_id`          | Multi-tenancy — biết user thuộc tenant nào    |
| `exp`                | Khi nào token hết hạn để tự refresh           |

**Claim `tenant_id` là custom claim** — phải thêm Protocol Mapper trong Keycloak Admin:

```
Client → management-app → Client scopes → Add mapper → User Attribute
  Token Claim Name: tenant_id
  User Attribute: tenant_id
  Add to access token: ON
```

---

### 2.5 OIDC Discovery — Auth.js biết endpoint của Keycloak từ đâu?

Bạn chỉ cần cung cấp `issuer`. Auth.js tự động fetch:

```
GET http://localhost:8180/realms/qrtable/.well-known/openid-configuration
```

Response trả về JSON với toàn bộ endpoint:

```json
{
  "issuer": "http://localhost:8180/realms/qrtable",
  "authorization_endpoint": ".../protocol/openid-connect/auth",
  "token_endpoint": ".../protocol/openid-connect/token",
  "userinfo_endpoint": ".../protocol/openid-connect/userinfo",
  "end_session_endpoint": ".../protocol/openid-connect/logout",
  "jwks_uri": ".../protocol/openid-connect/certs"
}
```

Auth.js đọc document này khi khởi động — không cần hardcode bất kỳ URL nào ngoài `issuer`.

```bash
# Tự kiểm tra:
curl http://localhost:8180/realms/qrtable/.well-known/openid-configuration | jq .
```

---

### 2.6 Token Verification — Backend xác minh token Keycloak như thế nào?

Keycloak ký token bằng cặp key **RSA-256**:

- **Private key:** Tuyệt mật, chỉ Keycloak giữ, dùng để ký token.
- **Public key:** Public hoàn toàn, ai cũng lấy được tại JWKS endpoint, dùng để verify chữ ký.

**JWKS Endpoint:**

```
GET http://localhost:8180/realms/qrtable/protocol/openid-connect/certs
→ { "keys": [{ "kid": "key-id-1", "kty": "RSA", "alg": "RS256", "n": "...", "e": "AQAB" }] }
```

**Luồng verify chuẩn (trong Authorizer Service):**

```
1. Nhận JWT trong Authorization: Bearer <token>
2. Decode header → lấy header.kid
3. jwksClient.getSigningKey(kid) → fetch public key từ JWKS (có cache)
4. jwt.verify(token, publicKey, { algorithms: ['RS256'] }) → verify chữ ký
5. Check exp > now → không hết hạn
6. Check iss === 'http://keycloak/realms/qrtable' → đúng issuer
7. Lấy claims: sub, realm_access.roles, email, tenant_id
8. Query MongoDB với sub → tìm user trong DB
9. Cross-check roles JWT ↔ roles MongoDB
→ OK: inject user data vào request context
→ FAIL: 401 INVALID_TOKEN / USER_NOT_PROVISIONED
```

**Tại sao không gọi Keycloak mỗi request?** Public key được cache bởi `jwks-rsa` — verify là toán học cục bộ (< 1ms), không cần network call.

---

### 2.7 Keycloak quản lý Session riêng — và điều đó ảnh hưởng thế nào?

**Có 2 loại session hoàn toàn độc lập:**

```
Session Keycloak (trên Keycloak server)
  - Cookie: KC_IDENTIFY trên domain keycloak:8180
  - Dùng cho: SSO, Revoke, Global Logout

Session App / Auth.js (cookie Next.js)
  - Cookie: authjs.session-token trên domain localhost:3000
  - Dùng cho: biết user đã login, lấy token để gọi API
```

**3 tình huống logout:**

1. **`signOut()` thông thường:** Xóa cookie Auth.js. Keycloak session vẫn sống — nếu user login lại ngay, Keycloak tự động cấp token (SSO behavior, đúng).
2. **Full SSO logout:** Phải gọi `end_session_endpoint` để xóa cả session Keycloak:
   ```
   GET .../openid-connect/logout?post_logout_redirect_uri=...&id_token_hint=<id_token>
   ```
3. **Admin revoke trên Keycloak:** Token đã cấp **vẫn hợp lệ** cho đến `exp`. Backend chỉ verify chữ ký, không hỏi Keycloak. Giải pháp production: Token Introspection (nhưng tốn performance).

---

## 3. Tổng quan luồng: Keycloak tích hợp Frontend như thế nào?

### Bạn đã biết (backend):

```
Client gửi Bearer token → Backend verify JWT bằng JWKS public key → OK / 401
```

### Điểm mới (frontend): Browser không tự tạo token, phải "đi qua" Keycloak

```
┌──────────────────────────── LUỒNG OIDC AUTHORIZATION CODE ──────────────────────┐
│                                                                                  │
│  (1) User truy cập /dashboard                                                   │
│       ↓                                                                          │
│  (2) Next.js Middleware: chưa có session → redirect /login                       │
│       ↓                                                                          │
│  (3) User click "Continue with Keycloak"                                         │
│       ↓                                                                          │
│  (4) Auth.js tạo PKCE code_challenge, redirect browser tới:                      │
│      http://keycloak:8180/realms/qrtable/protocol/openid-connect/auth            │
│      ?client_id=management-app                                                   │
│      &redirect_uri=http://localhost:3000/api/auth/callback/keycloak              │
│      &response_type=code                                                         │
│      &scope=openid profile email offline_access                                  │
│      &code_challenge=xxxx                                                        │
│       ↓                                                                          │
│  (5) Keycloak hiện trang login (theme Keycloakify hoặc default)                  │
│       ↓                                                                          │
│  (6) User nhập username/password → Keycloak xác thực                             │
│       ↓                                                                          │
│  (7) Keycloak redirect về:                                                       │
│      http://localhost:3000/api/auth/callback/keycloak?code=ABC123                │
│       ↓                                                                          │
│  (8) Auth.js route handler nhận code, gọi SERVER-TO-SERVER tới Keycloak:         │
│      POST /realms/qrtable/protocol/openid-connect/token                          │
│      { code=ABC123, code_verifier=xxxx, client_secret=... }                      │
│       ↓                                                                          │
│  (9) Keycloak trả về: { access_token, refresh_token, expires_in }                │
│       ↓                                                                          │
│  (10) Auth.js chạy callback `jwt` → lưu tất cả vào encrypted cookie             │
│       ↓                                                                          │
│  (11) Browser nhận cookie, redirect về /dashboard                                │
│       ↓                                                                          │
│  (12) Middleware đọc session từ cookie → có role → cho phép vào dashboard         │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Điểm cốt lõi bạn cần nắm:**

- **Bước (4)→(8):** Browser chỉ nhận `code` (authorization code), **KHÔNG** nhận token trực tiếp. Code được đổi thành token ở bước (8) **hoàn toàn phía server** (Next.js server, không phải browser). Đây là Authorization Code Flow — an toàn hơn Implicit Flow vì token không bao giờ đi qua browser URL.
- **Bước (10):** Token (access + refresh) được **mã hóa** bằng `AUTH_SECRET` rồi ghi vào cookie httpOnly. Browser giữ cookie nhưng **không đọc được nội dung** bằng JavaScript → an toàn khỏi XSS.
- **PKCE (bước 4+8):** Bạn đã biết access/refresh flow. PKCE là lớp bảo vệ thêm: trước khi redirect, Auth.js tạo `code_verifier` (chuỗi random) → hash thành `code_challenge` gửi trong bước (4). Khi đổi code ở bước (8), phải gửi kèm `code_verifier` gốc. Kẻ tấn công dù bắt được `code` ở bước (7) cũng không dùng được vì không có `code_verifier`. Auth.js bật PKCE tự động cho Keycloak provider.

---

## 4. Auth.js (NextAuth v5) — Tại sao cần và nó làm gì?

### Nếu không dùng Auth.js, bạn phải tự viết gì?

| Việc                               | Tự viết                                           | Auth.js làm sẵn                  |
| ---------------------------------- | ------------------------------------------------- | -------------------------------- |
| Tạo URL authorize + PKCE + state   | Tự tạo random, hash SHA-256, build URL            | ✅ Tự động                       |
| Route handler nhận callback code   | Tự viết API route, parse code, gọi token endpoint | ✅ Tự động                       |
| Mã hóa token vào httpOnly cookie   | Tự chọn thuật toán mã hóa, set cookie             | ✅ `AUTH_SECRET` encrypt/decrypt |
| Refresh token khi hết hạn          | Tự check `expires_at`, gọi token endpoint         | ✅ Trong callback `jwt`          |
| Inject session vào middleware      | Tự parse cookie, decrypt, validate                | ✅ `auth()` wrapper              |
| Cung cấp `useSession()` cho client | Tự viết context/provider                          | ✅ `SessionProvider`             |
| Xử lý signIn/signOut               | Tự redirect, xóa cookie                           | ✅ `signIn()` / `signOut()`      |

**Kết luận:** Auth.js là "bộ giàn giáo" xử lý toàn bộ phức tạp OIDC. Bạn chỉ cần cung cấp `clientId`, `clientSecret`, `issuer` — nó lo phần còn lại.

### Auth.js v5 khác gì NextAuth v4?

Bạn có thể thấy cả 2 tên "Auth.js" và "NextAuth" — đây là cùng một thư viện:

- **NextAuth v4:** Package `next-auth@4.x`, cấu hình qua file `[...nextauth].ts` trong `pages/api/`.
- **Auth.js v5 (NextAuth v5):** Package `next-auth@5.x`, cấu hình qua file `auth.ts` ở root, dùng App Router. Tên thương hiệu mới là "Auth.js" nhưng npm package vẫn là `next-auth`.

Trong dự án này ta dùng **v5** (App Router, `auth.ts` ở root src).

---

## 5. Chi tiết file `auth.ts` — Trung tâm điều khiển

File: `apps/management-app/src/auth.ts`

Đây là file quan trọng nhất. Mọi thứ liên quan đến authentication đều xuất phát từ đây.

### 5.1 Cấu hình provider

```typescript
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID, // "management-app"
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET, // secret từ Keycloak Admin
      issuer: process.env.AUTH_KEYCLOAK_ISSUER, // "http://localhost:8180/realms/qrtable"
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
        },
      },
    }),
  ],
  // ...
});
```

**Giải thích từng trường:**

- `clientId` / `clientSecret`: Keycloak cần biết "app nào đang gọi tôi". Bạn đã tạo client `management-app` trong Keycloak Admin Console — lấy ID và secret từ đó.
- `issuer`: URL realm Keycloak. Auth.js tự động fetch `{issuer}/.well-known/openid-configuration` để biết endpoint authorize, token, userinfo, v.v. — bạn **không cần** cấu hình từng endpoint.
- `offline_access`: Scope này yêu cầu Keycloak cấp **Refresh Token**. Nếu không có scope này, chỉ nhận access token (hết hạn trong 5 phút, user phải login lại).

**4 thứ export ra:**

| Export     | Dùng ở đâu                            | Mục đích                          |
| ---------- | ------------------------------------- | --------------------------------- |
| `handlers` | `app/api/auth/[...nextauth]/route.ts` | Route handler xử lý OIDC callback |
| `auth`     | `middleware.ts` + Server Components   | Đọc session hiện tại              |
| `signIn`   | Trang login (Server Action)           | Trigger redirect tới Keycloak     |
| `signOut`  | Button logout                         | Xóa session                       |

### 5.2 Route handler — Điểm nhận callback từ Keycloak

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

Chỉ 2 dòng. `handlers` tự xử lý mọi thứ:

- `GET /api/auth/callback/keycloak?code=ABC` → đổi code → token → set cookie
- `GET /api/auth/session` → trả session JSON cho `useSession()`
- `POST /api/auth/signout` → xóa cookie
- `GET /api/auth/csrf` → CSRF token cho form

Bạn **không cần viết logic** trong file này — chỉ cần re-export.

### 5.3 Session strategy

```typescript
session: {
  strategy: 'jwt',
},
pages: {
  signIn: '/login',  // Trang login custom thay vì default của Auth.js
},
```

- `strategy: 'jwt'`: Session được mã hóa thành JWT rồi lưu trong cookie. **Không cần database** để lưu session. Phù hợp MVP.
- `pages.signIn: '/login'`: Khi cần đăng nhập, Auth.js redirect tới `/login` (trang custom của bạn) thay vì trang default của Auth.js.

### 5.4 Callback `jwt` — Nơi xử lý token

Đây là callback phức tạp nhất. Nó chạy **mỗi khi Auth.js đọc hoặc tạo session** (middleware access, `useSession()`, `auth()`, v.v.).

**3 trường hợp:**

```
Trường hợp 1: Lần đầu login (account !== undefined)
──────────────────────────────────────────────────
Token exchange vừa xong, Auth.js truyền `account` chứa access_token.
→ Decode JWT claims để lấy: email, tenant_id, realm_access.roles
→ Gọi BFF /authorizer/me để lấy: userId, permissions, roles từ MongoDB
→ Lưu tất cả vào token object (sẽ được encrypt thành cookie)

Trường hợp 2: Token còn hạn (expiresAt > now + 60s)
──────────────────────────────────────────────────
→ Return token as-is (không làm gì cả, nhanh)

Trường hợp 3: Token sắp/đã hết hạn
──────────────────────────────────────────────────
→ Gọi refreshAccessToken():
  POST /realms/qrtable/protocol/openid-connect/token
  { grant_type: refresh_token, refresh_token: ... }
→ Nhận access_token mới, cập nhật lại cookie
→ Nếu refresh thất bại → set error: 'RefreshAccessTokenError'
```

**Code thực tế (rút gọn):**

```typescript
callbacks: {
  async jwt({ token, account }) {
    // ─── Trường hợp 1: Login lần đầu ───
    if (account?.access_token) {
      const claims = decodeJwtClaims(account.access_token);
      const me = await fetchAuthorizerMe(account.access_token, claims.tenant_id);
      return {
        ...token,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at * 1000,   // convert giây → ms
        roles: me?.roles ?? claims.realm_access?.roles,
        tenantId: me?.tenantId ?? claims.tenant_id,
        permissions: me?.permissions,
      };
    }

    // ─── Trường hợp 2: Còn hạn (buffer 60 giây) ───
    if (Date.now() < token.expiresAt - 60_000) {
      return token;
    }

    // ─── Trường hợp 3: Cần refresh ───
    return refreshAccessToken(token);
  },
}
```

**Hàm `refreshAccessToken` làm gì?**

Tương tự bạn đã biết ở backend: gọi Keycloak token endpoint với `grant_type=refresh_token`. Nhưng ở đây nó chạy phía **Next.js server** (trong jwt callback) → browser không biết gì về refresh token.

```typescript
async function refreshAccessToken(token: JWT): Promise<JWT> {
  const response = await fetch(keycloakTokenEndpoint, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.AUTH_KEYCLOAK_ID,
      client_secret: process.env.AUTH_KEYCLOAK_SECRET,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }),
  });
  const refreshed = await response.json();

  // Thành công → cập nhật token mới
  return {
    ...token,
    accessToken: refreshed.access_token,
    expiresAt: Date.now() + refreshed.expires_in * 1000,
    refreshToken: refreshed.refresh_token ?? token.refreshToken, // Keycloak có thể rotate refresh token
  };
}
```

**Nếu refresh thất bại** (refresh token cũng hết hạn, user đã logout trên Keycloak, v.v.):
→ Return `{ ...token, error: 'RefreshAccessTokenError' }`.
Lát nữa `AuthSessionHydrator` (phần 8) sẽ phát hiện error này và trigger re-login.

### 5.5 Callback `session` — Expose data cho client

```typescript
async session({ session, token }) {
  session.accessToken = token.accessToken;  // Để gọi BFF
  session.error = token.error;              // Để AuthSessionHydrator xử lý
  session.user.roles = parseRoles(token.roles);
  session.user.tenantId = token.tenantId;
  session.user.permissions = token.permissions ?? [];
  return session;
},
```

Callback này quyết định **client nhìn thấy gì** khi gọi `useSession()`. Mặc định Auth.js chỉ expose `name`, `email`, `image`. Ta thêm `roles`, `tenantId`, `permissions`, `accessToken`.

> **Lưu ý bảo mật:** `accessToken` được expose trong session object. Đây là trade-off có ý đồ — ta cần nó để gọi BFF qua proxy route (xem phần 9). Tuy nhiên `refreshToken` **KHÔNG** được expose — nó chỉ tồn tại trong encrypted cookie, browser không đọc trực tiếp được.

### 5.6 Hàm `decodeJwtClaims` — Tại sao tự decode?

```typescript
function decodeJwtClaims(accessToken?: string): JwtClaims {
  const parts = accessToken.split('.');
  const decoded = Buffer.from(parts[1], 'base64').toString('utf8');
  return JSON.parse(decoded);
}
```

Bạn thắc mắc: "Sao không dùng `jsonwebtoken.verify()`?"

Vì ở đây chúng ta **không cần verify** — Auth.js đã verify token qua OIDC flow (code exchange + server-to-server). Ta chỉ cần **đọc claims** (email, tenant_id, realm_access.roles) để lưu vào session. Việc verify signature là trách nhiệm của backend (Authorizer Service) khi nhận Bearer token.

---

## 6. Middleware — Bảo vệ route theo role

File: `apps/management-app/src/middleware.ts`

### Vấn đề Auth.js giải quyết cho middleware

Trước Auth.js, bạn phải tự đọc cookie, decrypt, validate token. Với Auth.js v5, middleware được wrap bằng `auth()`:

```typescript
import { auth } from '@/auth';

export default auth((request) => {
  // request.auth chứa session object ← Auth.js tự đọc cookie và decrypt
  const roles = parseRoles(request.auth?.user?.roles);
  // ...
});
```

Dòng `export default auth((request) => { ... })` nghĩa là: "Auth.js, hãy đọc session cookie và inject vào `request.auth` trước khi chạy logic của tôi".

### Luồng xử lý chi tiết

```
Request đến bất kỳ page nào
    │
    ▼
Middleware chạy (Edge Runtime)
    │
    ├─ pathname = "/" ?
    │    ├─ Không có role → redirect /login
    │    └─ Có role → redirect tới trang chủ theo role (VD: OWNER → /dashboard)
    │
    ├─ pathname = "/login" ?
    │    ├─ Đã login (có role) → redirect theo role (tránh hiện login khi đã auth)
    │    └─ Chưa login → cho qua (hiện trang login)
    │
    ├─ pathname không thuộc protected prefix? → cho qua
    │
    ├─ Thuộc protected nhưng chưa auth? → redirect /login?next=/current-path
    │
    └─ Đã auth nhưng role không đủ quyền?
         → redirect tới trang chủ của role (VD: WAITER truy cập /dashboard → /pos)
```

### Role-based Routing

File `lib/auth/role-routing.ts` chứa 2 bảng map:

**Map role → trang chủ (khi login xong, đi đâu):**

```
SUPER_ADMIN → /admin
OWNER       → /dashboard
MANAGER     → /dashboard
WAITER      → /pos
CHEF        → /kds/kitchen
BARISTA     → /kds/bar
```

**Map route → roles được phép (ai được vào đâu):**

```
/admin       → [SUPER_ADMIN]
/dashboard   → [OWNER, MANAGER]
/pos         → [OWNER, MANAGER, WAITER]
/kds/kitchen → [OWNER, MANAGER, CHEF]
/kds/bar     → [OWNER, MANAGER, BARISTA]
```

Hàm `getRoleHomeRoute(roles)` duyệt theo thứ tự ưu tiên: nếu user có nhiều role (VD: vừa OWNER vừa MANAGER), được route về role cao nhất.

Hàm `hasAccessToPath(pathname, roles)` kiểm tra user có đủ quyền vào path không.

---

## 7. Trang Login — Server Action redirect

File: `apps/management-app/src/app/(auth)/login/page.tsx`

```typescript
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = sanitizeNextPath(params.next ?? params.callbackUrl);

  return (
    <main>
      <form action={async () => {
        'use server';
        await signIn('keycloak', { redirectTo: callbackUrl });
      }}>
        <Button type="submit">Continue with Keycloak</Button>
      </form>
    </main>
  );
}
```

**Bạn hỏi: "Trang login này không có form username/password?"**

Đúng! Đây là điểm khác biệt lớn khi dùng OIDC:

- **Không dùng OIDC:** Trang login có form → user nhập → gửi tới backend → backend kiểm tra.
- **Dùng OIDC:** Trang login chỉ có nút "Continue with Keycloak" → redirect sang **trang login của Keycloak** (hosted bởi Keycloak server) → user nhập ở đó → redirect về app + code. **App không bao giờ chạm vào password.**

**`signIn('keycloak', { redirectTo: callbackUrl })`** nói Auth.js: "Hãy redirect browser tới Keycloak authorize endpoint, và sau khi xong thì đưa user về `callbackUrl`".

**`sanitizeNextPath`:** Bảo vệ chống open redirect — nếu parameter `?next=` là URL bên ngoài (`https://evil.com`), trả về `/` thay vì redirect ra ngoài.

---

## 8. Type augmentation — Mở rộng kiểu Session/JWT

File: `apps/management-app/src/types/next-auth.d.ts`

Auth.js mặc định chỉ có `session.user = { name, email, image }`. Dự án này cần thêm `roles`, `tenantId`, `permissions`, `accessToken`. TypeScript sẽ báo lỗi nếu bạn dùng `session.user.roles` mà không khai báo.

```typescript
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      roles: string[];
      tenantId?: string;
      permissions: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    roles?: string[];
    tenantId?: string;
    permissions?: string[];
    userId?: string;
    error?: string;
  }
}
```

**Tại sao cần 2 interface riêng (`Session` và `JWT`)?**

`JWT` là object được mã hóa trong cookie — chứa **mọi thứ** bao gồm `refreshToken` (bí mật). `Session` là object được trả về cho client qua `useSession()` — chỉ chứa những gì **an toàn để expose**. Callback `session` quyết định copy gì từ `JWT` → `Session`.

---

## 9. Hydrate Zustand từ session — AuthSessionHydrator

File: `apps/management-app/src/components/auth/auth-session-hydrator.tsx`

### Tại sao cần component này?

Bạn đã biết Zustand. Nhưng Auth.js session và Zustand store là 2 thứ tách biệt:

- `useSession()` → data từ Auth.js (roles, email, accessToken — lấy từ encrypted cookie).
- `useAuthStore()` → data từ Zustand (userId, permissions — cần gọi BFF mới có đầy đủ).

`AuthSessionHydrator` là **cầu nối**: khi session ready → gọi BFF lấy full profile → đổ vào Zustand store.

### Luồng hoạt động

```
AuthSessionHydrator mount (client component, nằm trong Providers.tsx)
    │
    ▼  useSession() theo dõi trạng thái Auth.js
    │
    ├── status = 'unauthenticated'
    │     → reset() Zustand store (xóa profile cũ)
    │
    ├── session.error = 'RefreshAccessTokenError'
    │     → signIn('keycloak') — force re-login
    │     → Dùng useRef(isSigningIn) để tránh gọi signIn nhiều lần
    │
    └── status = 'authenticated' + có accessToken
          │
          ▼  fetch('/api/internal/me')  ← proxy route (xem phần 9)
          │
          ├── Thành công → setProfile({ userId, roles, permissions })
          │                 setHydrated(true)
          │
          └── Thất bại (BFF trả 401 hoặc service down)
                │
                └── Fallback: populate từ JWT claims trong session
                    setProfile({
                      userId: session.user.id,
                      roles: session.user.roles,   ← từ JWT, không phải BFF
                      permissions: [],              ← trống, UI sẽ hạn chế tính năng
                    })
                    setHydrated(true)
```

**Flag `hydrated` quan trọng thế nào?**

Khi app vừa load, Zustand store trống. Nếu component đọc `profile.permissions` lúc này → crash hoặc hiển thị sai. `hydrated = false` báo cho UI biết "dữ liệu chưa sẵn sàng, hãy hiện skeleton/loading". Khi `hydrated = true` → render thật.

```typescript
// Trong component bất kỳ:
const { profile, hydrated } = useAuthStore();
if (!hydrated) return <Skeleton />;
if (!profile?.permissions.includes('MANAGE_MENU')) return null;
return <EditMenuButton />;
```

**Tại sao fallback từ JWT claims khi BFF lỗi?**

Nếu BFF hoặc Authorizer service down, user đã login hợp lệ nhưng không fetch được profile → nếu reset → user bị đăng xuất → vòng lặp redirect login. Thay vào đó, dùng dữ liệu tối thiểu từ JWT (có roles, không có permissions) → UI vẫn hoạt động, chỉ thiếu một số tính năng.

---

## 10. Proxy API route `/api/internal/me`

File: `apps/management-app/src/app/api/internal/me/route.ts`

### Vấn đề: Browser gọi BFF cần Bearer token — nhưng token ở đâu?

Access token nằm trong encrypted cookie của Auth.js. Browser **không đọc được** nội dung cookie này. Vậy làm sao truyền Bearer token cho BFF?

**Giải pháp: Internal proxy route**

```
Browser                    Next.js Server             BFF
   │                            │                       │
   │ GET /api/internal/me       │                       │
   │ (không cần Bearer)         │                       │
   │ ──────────────────────►    │                       │
   │                            │ auth() → đọc cookie   │
   │                            │ → lấy accessToken     │
   │                            │                       │
   │                            │ GET /api/v1/auth/me   │
   │                            │ Authorization: Bearer │
   │                            │ ──────────────────►   │
   │                            │                       │
   │                            │ ◄─── profile JSON ─── │
   │ ◄──── profile JSON ─────  │                       │
```

```typescript
// app/api/internal/me/route.ts
export async function GET() {
  const session = await auth(); // ← Đọc session server-side
  if (!session?.accessToken) return 401;

  const profile = await fetchAuthorizerMe(
    // ← Server-to-server, có Bearer
    session.accessToken,
    session.user?.tenantId,
  );
  return NextResponse.json(profile); // ← Trả cho browser (không có token)
}
```

**Tại sao không cho browser gọi thẳng BFF?**

Nếu browser gọi trực tiếp: `fetch('http://bff:3300/api/v1/authorizer/me', { headers: { Authorization: Bearer ${token} } })` → browser phải biết `token` → phải expose token ra JavaScript → rủi ro XSS.

Với proxy route: browser gọi `/api/internal/me` (cùng domain, cookie tự động gửi) → Next.js server đọc cookie → gọi BFF với Bearer → trả kết quả. Browser **không bao giờ thấy** access token thô.

---

## 11. Keycloakify — Custom giao diện trang đăng nhập Keycloak

### Vấn đề

Ở bước (5) trong luồng OIDC, Keycloak hiện trang login **của chính Keycloak** — một trang FreeMarker template nhìn rất generic, không phù hợp thương hiệu. Bạn muốn trang login nhìn như một phần của ứng dụng QRTable.

### Keycloakify là gì?

Keycloakify là thư viện cho phép bạn viết **React component** thay thế cho trang login/register/forgot-password của Keycloak. Component được build thành file `.jar` (Java Archive) mà Keycloak load như một theme plugin.

```
Viết React component (Login.tsx, Tailwind CSS)
       ↓ pnpm theme:build
Vite build → SPA bundle
       ↓
Keycloakify đóng gói → dist_keycloak/*.jar
       ↓
Docker volume mount → Keycloak /opt/keycloak/providers/
       ↓
Keycloak load theme tự động
       ↓
Set realm loginTheme = "keycloak-theme" (qua Admin API)
```

### Cấu trúc project Keycloakify

```
apps/keycloak-theme/
├── vite.config.ts        ← Build chain: Tailwind → React → Keycloakify JAR
├── package.json          ← Dependencies: keycloakify, tailwindcss, react
└── src/login/
    ├── KcContext.ts       ← Type definitions cho dữ liệu Keycloak inject vào page
    ├── KcPage.tsx         ← Router: switch pageId → component
    ├── i18n.ts            ← Internationalization (Keycloak có sẵn i18n)
    ├── theme.css          ← Tailwind @import + CSS variables (shadcn kiểu)
    ├── assets/
    │   └── login-bg.png   ← Ảnh nền trang login
    └── pages/
        └── Login.tsx      ← Component thay thế trang login mặc định
```

### `kcContext` — Keycloak inject dữ liệu gì vào trang?

Khi Keycloak render trang login, nó cung cấp một object `kcContext` chứa mọi thứ cần thiết:

```typescript
kcContext = {
  url: {
    loginAction: "/realms/qrtable/login-actions/authenticate?...",  // POST form tới đây
    registrationUrl: "/realms/qrtable/login-actions/registration?...",
    loginResetCredentialsUrl: "/realms/qrtable/login-actions/reset-credentials?...",
  },
  realm: {
    rememberMe: true,              // Có bật "Nhớ đăng nhập"?
    resetPasswordAllowed: true,     // Có link "Quên mật khẩu"?
    registrationAllowed: false,     // Có link "Đăng ký"?
  },
  login: {
    username: "user@example.com",   // Username đã nhập (persist sau lỗi)
  },
  social: {
    providers: [                    // Các IdP cấu hình trong Keycloak (Google, FB, ...)
      { alias: "google", displayName: "Google", loginUrl: "..." },
    ],
  },
  messagesPerField: {
    existsError("username")         // Có lỗi cho field username không?
    get("username")                 // Lấy message lỗi HTML
  },
  message: {                        // Global message (lỗi login, thông báo, ...)
    type: "error",
    summary: "Invalid username or password."
  }
}
```

**Điểm quan trọng: Form POST tới `url.loginAction`**

Trong `Login.tsx`, form đăng nhập phải gửi `POST` tới `kcContext.url.loginAction`. Đây là URL endpoint **của Keycloak** xử lý xác thực. Bạn **không xử lý logic login** — chỉ gửi `username` + `password` tới Keycloak.

```html
<form action="{url.loginAction}" method="post">
  <input name="username" />
  <input name="password" />
  <button type="submit">Sign in</button>
</form>
```

### `KcPage.tsx` — Router pageId

Keycloak có nhiều pages: `login.ftl`, `register.ftl`, `error.ftl`, `login-reset-password.ftl`, v.v. `KcPage.tsx` là switch:

```typescript
switch (kcContext.pageId) {
  case "login.ftl":
    return <Login kcContext={kcContext} i18n={i18n} />;  // Custom Login component

  default:
    return <DefaultPage ... />;  // Dùng default Keycloak UI cho các page khác
}
```

Hiện tại chỉ custom `login.ftl`. Các page khác (register, forgot password) vẫn dùng Keycloak default.

### Layout Login.tsx

```
┌──────────────────────────────────────────┐
│  LEFT column (lg)      │ RIGHT column    │
│  ┌──────────────────┐  │ ┌────────────┐ │
│  │  Background      │  │ │  Heading   │ │
│  │  image toàn      │  │ │  Google/FB │ │
│  │  cột             │  │ │  ────────  │ │
│  │                  │  │ │  Email     │ │
│  │  Gradient        │  │ │  Password  │ │
│  │  overlay         │  │ │  Remember  │ │
│  │                  │  │ │  Sign in   │ │
│  │  ┌─────────────┐│  │ │            │ │
│  │  │ QRTable logo ││  │ │  Feature   │ │
│  │  │ watermark    ││  │ │  cards 2x2 │ │
│  │  └─────────────┘│  │ └────────────┘ │
│  └──────────────────┘  │                │
└──────────────────────────────────────────┘
   (ẩn trên mobile)         (full width mobile)
```

### `theme.css` — Tailwind + CSS Variables

```css
@import 'tailwindcss';

@theme {
  --color-primary: hsl(240 5.9% 10%);
  --color-primary-foreground: hsl(0 0% 98%);
  --color-muted: hsl(240 4.8% 95.9%);
  --color-muted-foreground: hsl(240 3.8% 46.1%);
  /* ... shadcn-style CSS variables ... */
}

/* Ẩn chrome mặc định của Keycloak */
#kc-header,
#kc-header-wrapper,
#kc-content,
#kc-content-wrapper {
  all: unset;
  display: contents;
}
```

Phần `all: unset; display: contents;` rất quan trọng — Keycloak wrap content trong nhiều `<div>` có style mặc định. Dòng này "vô hiệu hóa" styling Keycloak để React component kiểm soát hoàn toàn layout.

### `vite.config.ts` — Build chain

```typescript
export default defineConfig({
  plugins: [
    tailwindcss(), // (1) Process Tailwind classes
    react(), // (2) JSX → JavaScript
    keycloakify({
      // (3) Bundle → Keycloak JAR
      accountThemeImplementation: 'none',
    }),
  ],
});
```

Ba plugin chạy theo thứ tự: Tailwind CSS → React JSX → Keycloakify đóng gói JAR.

### Volume mount trong Docker Compose

```yaml
keycloak:
  image: quay.io/keycloak/keycloak:25.0.0
  volumes:
    - ./apps/keycloak-theme/dist_keycloak:/opt/keycloak/providers # ← JAR mount
```

Keycloak tự động scan thư mục `/opt/keycloak/providers/` khi khởi động. Nếu thấy file `.jar` chứa theme → load vào.

Sau khi Keycloak khởi động, phải set `loginTheme` cho realm:

```bash
# Lấy admin token
TOKEN=$(curl -s -X POST "http://localhost:8180/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli&username=admin&password=admin&grant_type=password" | jq -r '.access_token')

# Set realm login theme
curl -X PUT "http://localhost:8180/admin/realms/qrtable" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"loginTheme": "keycloak-theme"}'
```

---

## 12. Cấu trúc file đã triển khai

```
apps/management-app/src/
├── auth.ts                            ← (1) Cấu hình Auth.js + Keycloak provider
├── middleware.ts                      ← (2) Bảo vệ route theo role
├── types/next-auth.d.ts               ← (3) Mở rộng type Session/JWT
├── app/
│   ├── (auth)/login/page.tsx          ← (4) Trang login (nút redirect Keycloak)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  ← (5) Route handler Auth.js
│   │   └── internal/me/route.ts       ← (6) Proxy BFF /authorizer/me
│   └── providers.tsx                  ← (7) SessionProvider + AuthSessionHydrator
├── components/auth/
│   └── auth-session-hydrator.tsx      ← (8) Hydrate Zustand từ session
└── lib/auth/
    ├── auth-store.ts                  ← (9) Zustand store (profile, hydrated)
    ├── bff-server.ts                  ← (10) Server-side fetch tới BFF
    └── role-routing.ts                ← (11) Role → route mapping + access check

apps/keycloak-theme/
├── vite.config.ts                     ← Build: Tailwind + React + Keycloakify
├── package.json                       ← keycloakify, tailwindcss, react
└── src/login/
    ├── KcContext.ts                   ← Type cho kcContext
    ├── KcPage.tsx                     ← Switch pageId → component
    ├── i18n.ts                        ← i18n config
    ├── theme.css                      ← Tailwind + CSS vars + Keycloak reset
    ├── assets/login-bg.png            ← Ảnh nền
    └── pages/Login.tsx                ← Custom login page (React + Tailwind)
```

---

## 13. Quy trình triển khai theo thứ tự

### Bước 1: Chuẩn bị Keycloak (nếu chưa có)

> Bạn đã biết phần này từ backend. Tóm tắt nhanh những gì frontend cần:

1. Tạo realm `qrtable` (nếu chưa có)
2. Tạo client `management-app`:
   - Client type: OpenID Connect
   - Standard flow: **ON**
   - Valid redirect URIs: `http://localhost:3000/api/auth/callback/keycloak`
   - Web origins: `http://localhost:3000`
3. Copy **Client Secret** từ tab Credentials
4. Đảm bảo các realm roles đã tồn tại: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`
5. Assign role cho test users

### Bước 2: Cài Auth.js

```bash
pnpm add next-auth@5
```

### Bước 3: Tạo `AUTH_SECRET`

```bash
openssl rand -base64 32
# → Copy vào .env: AUTH_SECRET=<giá_trị>
```

### Bước 4: Tạo file `auth.ts`

Tạo `apps/management-app/src/auth.ts` với cấu hình Keycloak provider, callbacks `jwt` và `session` (như phần 4).

### Bước 5: Tạo route handler

```typescript
// apps/management-app/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

### Bước 6: Tạo type augmentation

Tạo `apps/management-app/src/types/next-auth.d.ts` (như phần 7).

### Bước 7: Cập nhật middleware

Wrap middleware bằng `auth()` từ Auth.js, thay logic cookie cũ bằng `request.auth?.user?.roles`.

### Bước 8: Tạo trang login

Tạo `apps/management-app/src/app/(auth)/login/page.tsx` với `signIn('keycloak')`.

### Bước 9: Wrap app với SessionProvider

```typescript
// providers.tsx
<SessionProvider>
  <AuthSessionHydrator />
  {children}
</SessionProvider>
```

### Bước 10: Tạo Zustand store + AuthSessionHydrator

- `lib/auth/auth-store.ts`: store chứa `profile`, `hydrated`, `setProfile`, `reset`.
- `components/auth/auth-session-hydrator.tsx`: component hydrate store từ session.

### Bước 11: Tạo proxy route `/api/internal/me`

Server-side Route handler đọc `auth()` → gọi BFF → trả profile.

### Bước 12: Build Keycloakify theme

```bash
# Cài dependencies cho keycloak-theme
cd apps/keycloak-theme && pnpm install

# Build theme
pnpm theme:build

# Xác nhận có file JAR
ls dist_keycloak/
# → keycloak-theme-*.jar
```

### Bước 13: Deploy theme vào Keycloak

```bash
# Restart Keycloak để load JAR mới
docker compose -f docker-compose.provider.yaml up -d --force-recreate keycloak

# Đợi Keycloak ready
docker logs -f qrtable-provider-keycloak-1
# → Đợi thấy: "Keycloak X.X.X on JVM ... started"

# Set loginTheme cho realm
TOKEN=$(curl -s -X POST "http://localhost:8180/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli&username=admin&password=admin&grant_type=password" | jq -r '.access_token')

curl -X PUT "http://localhost:8180/admin/realms/qrtable" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"loginTheme": "keycloak-theme"}'
```

### Bước 14: Verify

Truy cập `http://localhost:3000` → redirect `/login` → click button → thấy trang Keycloak **với custom theme** → đăng nhập → redirect về trang chủ theo role.

---

## 14. Biến môi trường

Tất cả trong `.env.local` của `apps/management-app/`:

```bash
# ─── Auth.js ───
AUTH_SECRET=<openssl rand -base64 32>     # Mã hóa session cookie
AUTH_URL=http://localhost:3000             # Base URL của app (v5 dùng AUTH_URL, không phải NEXTAUTH_URL)

# ─── Keycloak OIDC ───
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable    # Realm URL
AUTH_KEYCLOAK_ID=management-app                               # Client ID
AUTH_KEYCLOAK_SECRET=xxxx-xxxx-xxxx                           # Client Secret

# ─── BFF (gọi server-side, không expose ra browser) ───
MANAGEMENT_BFF_BASE_URL=http://localhost:3300/api/v1
```

---

## 15. Gotchas & Lưu ý quan trọng

### 1. `AUTH_URL` chứ không phải `NEXTAUTH_URL`

Auth.js v5 dùng `AUTH_URL`. Nếu dùng `NEXTAUTH_URL` (v4), callback URI sẽ sai → Keycloak từ chối redirect → lỗi `invalid_redirect_uri`.

### 2. `loginTheme` bị reset khi recreate container

Mỗi khi `docker compose up --force-recreate keycloak`, nếu volume data không persist hoặc realm được import lại, `loginTheme` về default. **Luôn chạy lại lệnh set theme** sau recreate.

### 3. `redirect_uri` phải khớp chính xác

Keycloak kiểm tra exact match. Nếu Next.js chạy port khác (3001 thay vì 3000), phải update "Valid Redirect URIs" trong Keycloak Admin. Mẹo dev: thêm `http://localhost:*/api/auth/callback/keycloak` nhưng **không làm vậy trên production**.

### 4. `offline_access` scope phải được assign

Nếu không nhận Refresh Token:

- Kiểm tra client `management-app` có scope `offline_access` trong "Client scopes".
- Kiểm tra realm có cho phép offline access không.

### 5. Token refresh race condition giữa nhiều tab

Keycloak Refresh Token thường single-use (rotate). Nếu 2 tab cùng detect token hết hạn → cùng refresh → chỉ tab đầu thành công, tab sau thất bại → cả 2 tab bị redirect login. Đây là behavior bình thường, không phải bug.

### 6. Keycloakify dev mode vs production

`pnpm dev` trong keycloak-theme chạy mock `kcContext` để preview UI trong browser. Nhưng trang login **thật** chỉ hiển thị custom theme khi Keycloak được cấu hình đúng:

1. JAR có trong `dist_keycloak/`?
2. Volume mount đúng?
3. `loginTheme` đã set cho realm?

### 7. Keycloak `#kc-*` elements phải bị reset CSS

Keycloak inject nhiều `<div>` wrapper với style mặc định. Nếu không có `all: unset; display: contents;` cho `#kc-header`, `#kc-content`, v.v. → layout React component sẽ bị phá.

### 8. Form `action` phải dùng `kcContext.url.loginAction`

Nếu form gửi tới URL khác → Keycloak không xử lý được → lỗi. URL này chứa session code nội bộ của Keycloak, phải dùng đúng.

---

## 16. Verify Checklist

### Authentication Flow

- [ ] Truy cập `http://localhost:3000/dashboard` khi chưa đăng nhập → redirect `/login?next=/dashboard`
- [ ] Click "Continue with Keycloak" → chuyển tới trang Keycloak **(với custom theme)**
- [ ] Đăng nhập user role `OWNER` → redirect về `/dashboard`
- [ ] Đăng nhập user role `WAITER` → redirect về `/pos`
- [ ] Đăng nhập user role `CHEF` → redirect về `/kds/kitchen`

### Authorization (Route Protection)

- [ ] WAITER đang login, truy cập `/dashboard` → redirect `/pos` (không đủ quyền)
- [ ] CHEF đang login, truy cập `/pos` → redirect `/kds/kitchen`
- [ ] Đã login, truy cập `/login` → redirect về trang chủ role (không hiện login khi đã auth)

### Token Refresh

- [ ] Đợi token hết hạn (~5 phút, cấu hình Keycloak) → vẫn đăng nhập, không bị logout
- [ ] Kiểm tra console không bị `RefreshAccessTokenError`

### Zustand Hydration

- [ ] Sau login, gọi `/api/internal/me` từ DevTools → nhận JSON profile
- [ ] Component dùng `useAuthStore()` hiển thị đúng role/permissions

### Custom Theme (Keycloakify)

- [ ] Trang login Keycloak hiện ảnh nền ở cột trái
- [ ] Logo QRTable và form ở cột phải
- [ ] Có nút Google/Facebook (disabled, placeholder)
- [ ] Nhập sai password → lỗi hiển thị dưới field tương ứng
- [ ] Responsive: mobile chỉ hiện cột form

---

## Tóm tắt

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW TỔNG THỂ STEP 1.25                      │
│                                                                  │
│  User → /dashboard → Middleware (auth()) → chưa auth → /login   │
│                                                                  │
│  /login → signIn('keycloak') → Keycloak (custom theme)           │
│                                                                  │
│  Keycloak → callback?code=X → Auth.js route handler              │
│           → exchange code → token (server-to-server)             │
│           → encrypt → httpOnly cookie                            │
│                                                                  │
│  Redirect /dashboard → Middleware → session OK, role OK → render │
│                                                                  │
│  Browser → AuthSessionHydrator → /api/internal/me → Zustand     │
│                                                                  │
│  Token sắp hết hạn → jwt callback → refreshAccessToken()        │
│           → Keycloak token endpoint → new token → update cookie  │
│                                                                  │
│  Refresh thất bại → error = RefreshAccessTokenError               │
│           → AuthSessionHydrator → signIn() → re-login            │
└─────────────────────────────────────────────────────────────────┘
```

---

**Tài liệu tham khảo:**

- [Auth.js v5 Documentation](https://authjs.dev)
- [Auth.js Keycloak Provider](https://authjs.dev/getting-started/providers/keycloak)
- [Keycloakify Documentation](https://keycloakify.dev)
- [Keycloak Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
