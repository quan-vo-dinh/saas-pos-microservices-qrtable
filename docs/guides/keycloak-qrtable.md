# Hướng Dẫn Keycloak Trong QRTable

> **Vai trò:** Tài liệu hỗ trợ (supporting guide), không phải nguồn sự thật chính (canonical source).
> Khi cần trạng thái kiến trúc hiện tại, ưu tiên [`../technical-architecture.md`](../technical-architecture.md), [`../architecture/permission-matrix.md`](../architecture/permission-matrix.md), [`../references/auth-system-reference.md`](../references/auth-system-reference.md), và code trên `main`.
>
> **Mục tiêu:** Giải thích Keycloak vừa đủ để đọc code, gỡ lỗi đăng nhập (debug authentication), và mở rộng đúng phạm vi QRTable. Tài liệu này có lý thuyết nền tảng, nhưng không đi xa thành giáo trình Keycloak tổng quát.
>
> **Trạng thái code hiện tại (2026-05-14):** QRTable dùng Keycloak `25.0.0` để xác thực người dùng nội bộ như `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`. Management App đăng nhập qua NextAuth + Keycloak provider. Authorizer Service xác minh JWT bằng JWKS của Keycloak, sau đó nạp hồ sơ ứng dụng và quyền từ User-Access. Customer PWA / khách quét QR không đăng nhập bằng Keycloak.

---

## Mục Lục

1. [Đọc nhanh](#1-đọc-nhanh)
2. [Keycloak đang dùng ở đâu](#2-keycloak-đang-dùng-ở-đâu)
3. [Nguyên tắc lựa chọn Keycloak](#3-nguyên-tắc-lựa-chọn-keycloak)
4. [Lý thuyết vừa đủ](#4-lý-thuyết-vừa-đủ)
5. [Các kiểu xác thực và flow Keycloak](#5-các-kiểu-xác-thực-và-flow-keycloak)
6. [Luồng xác thực hiện tại](#6-luồng-xác-thực-hiện-tại)
7. [Cấp phát user và onboarding tenant](#7-cấp-phát-user-và-onboarding-tenant)
8. [Role, permission và tenant isolation](#8-role-permission-và-tenant-isolation)
9. [Keycloak không sở hữu những gì](#9-keycloak-không-sở-hữu-những-gì)
10. [Hướng dẫn cấu hình và thao tác Keycloak](#10-hướng-dẫn-cấu-hình-và-thao-tác-keycloak)
11. [Thiết lập local, triển khai và gỡ lỗi](#11-thiết-lập-local-triển-khai-và-gỡ-lỗi)
12. [Đọc code ở đâu](#12-đọc-code-ở-đâu)
13. [Checklist](#13-checklist)

---

## 1. Đọc nhanh

Keycloak trong QRTable là **identity provider (nhà cung cấp định danh)** cho nhóm người dùng nội bộ của nhà hàng và hệ thống quản trị. Keycloak trả lời các câu hỏi:

```txt
Người này là ai?
Token này có hợp lệ không?
Người này đang có role định danh nào trong realm?
```

Keycloak **không** là nguồn sự thật cho toàn bộ quyền nghiệp vụ của QRTable. Sau khi token hợp lệ, QRTable vẫn cần User-Access Service để trả lời:

```txt
User này đã được provision vào ứng dụng chưa?
User thuộc tenant nào?
User có những permission ứng dụng nào?
User có được phép gọi API hiện tại không?
```

Một câu dễ nhớ:

```txt
Keycloak xác thực danh tính.
User-Access xác định hồ sơ, role nội bộ và permission.
BFF Guards áp dụng tenant và permission trên từng request.
```

### Luồng tổng quát

```txt
Management App
  -> chuyển người dùng sang Keycloak login
  -> nhận access token (JWT)
  -> gọi BFF /authorizer/me bằng Bearer token
  -> BFF UserGuard gọi Authorizer nếu token chưa có cache
  -> Authorizer verify JWT bằng JWKS của Keycloak
  -> Authorizer nạp profile + permission từ User-Access
  -> BFF TenantGuard / PermissionGuard quyết định cho phép hay từ chối request
```

### Thuật ngữ tối thiểu

| Thuật ngữ                                                      | Nghĩa trong QRTable                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Keycloak                                                       | Identity server (máy chủ định danh), quản lý đăng nhập, user, role định danh và token.                   |
| Realm (không gian định danh)                                   | Vùng cấu hình riêng của Keycloak. QRTable dùng realm `qrtable`.                                          |
| Client (ứng dụng đăng ký)                                      | Ứng dụng được Keycloak cấp token, ví dụ Management App hoặc BFF client.                                  |
| User (tài khoản định danh)                                     | Tài khoản đăng nhập trong Keycloak, thường tương ứng với staff/admin/owner.                              |
| Realm role (vai trò cấp realm)                                 | Role nằm ở cấp realm, ví dụ `OWNER`, `MANAGER`, `WAITER`. QRTable dùng role này để map sang role nội bộ. |
| Role (vai trò)                                                 | Nhóm trách nhiệm lớn của user, ví dụ `OWNER`, `CHEF`.                                                    |
| Permission (quyền thao tác)                                    | Quyền chi tiết trên API/nghiệp vụ, ví dụ `ORDER_CREATE`.                                                 |
| Tenant (đơn vị thuê / nhà hàng)                                | Không gian dữ liệu của một nhà hàng trong hệ thống SaaS.                                                 |
| Guard (lớp chặn request)                                       | Lớp kiểm tra request trước khi cho vào controller, ví dụ `UserGuard`, `TenantGuard`, `PermissionGuard`.  |
| Session (phiên làm việc)                                       | Trạng thái đăng nhập hoặc trạng thái phiên đang hoạt động của người dùng/khách.                          |
| Cache (bộ nhớ đệm)                                             | Bản lưu nhanh có thể hết hạn hoặc dựng lại, thường nằm trong Redis.                                      |
| Provision (cấp phát hồ sơ/tài khoản)                           | Tạo hoặc đồng bộ user từ lớp định danh sang hồ sơ ứng dụng.                                              |
| Onboarding (quy trình khởi tạo)                                | Luồng khởi tạo tenant/user ban đầu để một nhà hàng bắt đầu dùng hệ thống.                                |
| Frontend (ứng dụng phía trình duyệt)                           | Phần giao diện chạy cho người dùng, ví dụ Management App.                                                |
| Backend (dịch vụ phía server)                                  | Các service xử lý logic, dữ liệu, xác thực và phân quyền.                                                |
| OpenID Connect / OIDC (chuẩn đăng nhập mở rộng trên OAuth 2.0) | Chuẩn đăng nhập mà Management App dùng để chuyển hướng sang Keycloak và nhận token.                      |
| Access token (token truy cập)                                  | JWT ngắn hạn được gửi đến BFF trong header `Authorization: Bearer ...`.                                  |
| Refresh token (token làm mới)                                  | Token dùng để xin access token mới khi access token sắp hết hạn.                                         |
| JWT / JSON Web Token (token JSON có chữ ký)                    | Định dạng token có payload và chữ ký số. Authorizer phải verify JWT trước khi tin nội dung.              |
| JWKS / JSON Web Key Set (tập khóa công khai)                   | Endpoint của Keycloak chứa public key để Authorizer kiểm tra chữ ký JWT.                                 |
| Protocol mapper (bộ ánh xạ claim)                              | Cấu hình Keycloak để đưa user attribute/role vào token claim, ví dụ `tenant_id`.                         |
| Client credentials (thông tin định danh của client)            | Cơ chế để service lấy admin token bằng `client_id` và `client_secret`.                                   |
| Service account (tài khoản dịch vụ)                            | Tài khoản đại diện cho một client backend khi client đó gọi API quản trị.                                |
| Admin REST API (API quản trị)                                  | API của Keycloak để tạo user, gán role, vô hiệu hóa user. Authorizer đang gọi API này.                   |
| Required action (hành động bắt buộc)                           | Yêu cầu user làm một việc sau login, ví dụ `UPDATE_PASSWORD`.                                            |
| Scope (phạm vi quyền yêu cầu)                                  | Danh sách quyền/nhóm thông tin mà client xin khi đăng nhập OIDC.                                         |
| Source of truth (nguồn sự thật)                                | Nơi dữ liệu được xem là bản đúng nhất khi có mâu thuẫn.                                                  |
| Security boundary (ranh giới bảo mật)                          | Lớp kiểm tra không được bỏ qua khi bảo vệ dữ liệu/API.                                                   |
| Callback URL (URL quay lại)                                    | URL Keycloak chuyển người dùng về sau khi đăng nhập xong.                                                |

---

## 2. Keycloak đang dùng ở đâu

| Thành phần          | Vai trò của Keycloak                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Docker provider     | Chạy Keycloak local ở `http://localhost:8180`, image `quay.io/keycloak/keycloak:25.0.0`.                                             |
| Realm `qrtable`     | Không gian định danh cho dự án QRTable.                                                                                              |
| Management App      | Dùng NextAuth Keycloak provider để login, refresh token và nạp session.                                                              |
| Authorizer Service  | Verify JWT bằng JWKS, gọi Keycloak Admin REST API để tạo user, gán role và disable user.                                             |
| BFF Guards          | Không nói chuyện trực tiếp với Keycloak; UserGuard gọi Authorizer và cache kết quả verify token trong Redis.                         |
| User-Access Service | Lưu hồ sơ ứng dụng, role nội bộ và permission; đây mới là nguồn quyền ứng dụng.                                                      |
| SaaS onboarding     | Tạo owner trong Keycloak khi tạo tenant mới, gán role `OWNER`, rollback bằng cách disable user nếu bước sau thất bại.                |
| Keycloak Theme      | Custom theme trong `apps/keycloak-theme`, được mount vào container Keycloak.                                                         |
| Bootstrap scripts   | `tools/keycloak-bootstrap.sh` tạo realm/client, user attributes, protocol mappers, realm roles và user mẫu cho môi trường local/dev. |

Keycloak không dùng cho luồng khách hàng quét QR. Customer PWA dùng session/QR token và guard riêng, vì khách không cần tài khoản staff trong realm `qrtable`.

---

## 3. Nguyên tắc lựa chọn Keycloak

Keycloak nên được chọn khi bài toán là **human authentication (xác thực người dùng con người)**, quản lý login, token, role định danh, hoặc vòng đời tài khoản trong hệ thống định danh.

Không nên dùng Keycloak như một database nghiệp vụ tổng quát. Nếu dữ liệu cần transaction nghiệp vụ, audit, query theo tenant, hoặc là source of truth của domain QRTable, hãy để service sở hữu domain đó quản lý.

### 3.1 Khi nên dùng Keycloak

Dùng Keycloak khi cần:

- Đăng nhập nhân viên nhà hàng, owner, manager, admin hoặc super admin.
- Phát hành access token (JWT) để frontend gọi BFF.
- Xác minh token theo chuẩn OIDC/JWKS thay vì tự viết cơ chế token riêng.
- Quản lý mật khẩu, required action, enabled/disabled user.
- Tạo user từ backend thông qua Admin REST API trong luồng onboarding.
- Gán role định danh có tính tổng quát, ví dụ `OWNER`, `MANAGER`, `WAITER`.
- Tích hợp giao diện đăng nhập tập trung cho Management App.

### 3.2 Khi không nên dùng Keycloak

Không dùng Keycloak cho:

- Session của khách hàng quét QR. Đây là luồng vô danh theo bàn/mã QR, không phải staff login.
- Quyền nghiệp vụ chi tiết như `ORDER_CREATE`, `MENU_UPDATE`, `PLAN_MANAGE`. Các permission này thuộc User-Access và permission matrix.
- Trạng thái tenant, gói dịch vụ (subscription), invoice, quota, payment settings.
- OAuth của nhà cung cấp thanh toán, ví dụ SePay OAuth state.
- Cache token, cart, KDS runtime hay các trạng thái tạm thời; các phần này dùng Redis.
- Event liên service; các phần này dùng TCP/gRPC/Kafka theo đúng ngữ cảnh.

### 3.3 Câu hỏi quyết định nhanh

| Câu hỏi                                                  | Lựa chọn phù hợp                                                |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| Đây có phải người dùng nội bộ cần đăng nhập không?       | Keycloak.                                                       |
| Đây có phải khách hàng quét QR không có tài khoản không? | Customer session/QR token, không dùng Keycloak.                 |
| Cần biết token có hợp lệ và user là ai?                  | Authorizer verify Keycloak JWT.                                 |
| Cần biết user có permission nào trong QRTable?           | User-Access + PermissionGuard.                                  |
| Cần biết user thuộc tenant nào?                          | JWT claim/user profile + TenantGuard.                           |
| Cần tạo owner khi onboarding tenant mới?                 | SaaS Service gọi Authorizer, Authorizer gọi Keycloak Admin API. |
| Cần vô hiệu hóa owner nếu onboarding fail?               | Authorizer gọi Keycloak Admin API disable user.                 |
| Cần lưu dữ liệu nghiệp vụ lâu dài?                       | PostgreSQL trong service sở hữu domain.                         |

### 3.4 So sánh các lớp liên quan

| Lớp               | Trả lời câu hỏi                                       | QRTable đang dùng như thế nào                                       |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Keycloak          | "Người này là ai, token có hợp lệ không?"             | Login, JWT, realm role, admin user lifecycle.                       |
| NextAuth          | "Frontend giữ session login ra sao?"                  | Management App lưu token/session, refresh token và hydrate profile. |
| Authorizer        | "Token Keycloak có hợp lệ trong QRTable không?"       | Verify JWT, nạp user profile, trả permissions cho BFF.              |
| User-Access       | "User này có profile/role/permission nào?"            | Source of truth cho user ứng dụng và permission.                    |
| BFF Guards        | "Request này có được phép đi tiếp không?"             | UserGuard, TenantGuard, PermissionGuard.                            |
| Redis token cache | "Kết quả verify token gần đây có thể dùng lại không?" | Cache kết quả Authorizer để giảm verify lặp lại.                    |

---

## 4. Lý thuyết vừa đủ

### 4.1 Realm

Realm là không gian cấu hình độc lập trong Keycloak. Mỗi realm có user, role, client, cấu hình đăng nhập và khóa ký token riêng.

Trong QRTable, realm hiện tại là:

```txt
qrtable
```

Nếu sau này tạo thêm realm cho từng môi trường, ví dụ `qrtable-dev`, `qrtable-staging`, `qrtable-prod`, cần đảm bảo frontend, Authorizer và Keycloak Admin API cùng trỏ đến đúng issuer/realm. Sai realm thường dẫn đến token verify thất bại vì issuer hoặc key không khớp.

### 4.2 Client

Client là ứng dụng được đăng ký với Keycloak. Client quyết định cách ứng dụng đăng nhập và nhận token.

Trong QRTable hiện có các biến môi trường liên quan:

```txt
KEYCLOAK_CLIENT_ID=qrtable-bff
AUTH_KEYCLOAK_ID=management-app
```

Ý nghĩa thực tế:

- `management-app` phục vụ luồng đăng nhập frontend qua NextAuth.
- `qrtable-bff` / client backend được Authorizer dùng khi cần trao đổi token hoặc gọi Keycloak với client secret.

Client secret (bí mật client) chỉ được dùng ở backend. Không đưa client secret vào trình duyệt, bundle frontend, hoặc tài liệu public.

### 4.3 OpenID Connect

OpenID Connect (chuẩn đăng nhập mở rộng trên OAuth 2.0) thêm lớp nhận diện người dùng lên OAuth 2.0. Nói ngắn gọn:

```txt
OAuth 2.0 trả lời: ứng dụng được quyền truy cập gì?
OpenID Connect trả lời thêm: người đang đăng nhập là ai?
```

Trong Management App:

```txt
Người dùng bấm đăng nhập
  -> Management App chuyển sang Keycloak login page
  -> Keycloak xác thực user
  -> Management App nhận access token / refresh token qua NextAuth
```

Sau đó Management App không tự tin mọi claim trong token một cách tuyệt đối. Nó gọi BFF `/authorizer/me` để QRTable xác nhận user đã có profile và permission trong User-Access.

### 4.4 JWT và chữ ký số

JWT gồm ba phần:

```txt
header.payload.signature
```

Payload có thể đọc được bằng base64 decode, nhưng **không được tin** nếu chưa verify chữ ký. Authorizer làm đúng thứ tự:

1. Decode header để lấy `kid` (key id).
2. Lấy public key từ JWKS endpoint của Keycloak.
3. Verify chữ ký với RS256.
4. Kiểm tra payload có `sub`.
5. Nạp profile từ User-Access.

Điều này quan trọng vì frontend hoặc client có thể gửi token giả. Chỉ token có chữ ký hợp lệ theo public key của realm mới được tin.

### 4.5 JWKS

JWKS là danh sách public key của Keycloak:

```txt
{KEYCLOAK_HOST}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs
```

Với local QRTable:

```txt
http://localhost:8180/realms/qrtable/protocol/openid-connect/certs
```

Keycloak có thể rotate key (xoay khóa ký). Vì vậy Authorizer không hard-code public key trong code, mà lấy key theo `kid` từ JWKS. Thư viện `jwks-rsa` được cấu hình cache và rate limit để giảm tải.

### 4.6 Role trong Keycloak và permission trong QRTable

Keycloak realm role là vai trò định danh lớn:

```txt
SUPER_ADMIN
OWNER
MANAGER
WAITER
CHEF
BARISTA
```

Permission trong QRTable chi tiết hơn và thuộc User-Access, ví dụ:

```txt
ORDER_CREATE
MENU_UPDATE
PLAN_MANAGE
PAYMENT_SETTINGS_UPDATE
```

Nguyên tắc:

```txt
Keycloak role giúp QRTable biết user thuộc nhóm nào.
User-Access role/permission quyết định user được làm hành động nào.
```

Nếu token có role Keycloak nhưng User-Access không có profile/role mapping tương ứng, request vẫn bị từ chối.

### 4.7 Claim và protocol mapper

Claim là trường nằm trong JWT payload. QRTable quan tâm đến các claim như:

```json
{
  "sub": "keycloak-user-id",
  "email": "owner@example.com",
  "realm_access": {
    "roles": ["OWNER"]
  },
  "tenant_id": "tenant-id",
  "sub_role": "OWNER"
}
```

Protocol mapper (bộ ánh xạ claim) giúp đưa user attribute vào token claim. Ví dụ user có attribute `tenant_id`, mapper có thể đưa giá trị này vào access token để BFF/Authorizer đọc được.

Trong code hiện tại, Authorizer và guards có xử lý cả `tenant_id` và dạng camelCase `tenantId` để tránh lệch tên field khi đi qua proto-loader.

### 4.8 Admin REST API

Admin REST API là API quản trị của Keycloak. Authorizer dùng API này để:

- Lấy admin token bằng client credentials.
- Tạo user.
- Gán realm role cho user.
- Update user.
- Disable user.
- Đọc thông tin user theo id.

Theo tài liệu Keycloak chính thức, Admin REST API nằm dưới mẫu đường dẫn:

```txt
/admin/realms/{realm}/...
```

QRTable không để frontend gọi Admin REST API trực tiếp. Mọi thao tác quản trị Keycloak phải đi qua backend có client secret và rollback phù hợp.

### 4.9 Required action

Required action là hành động Keycloak bắt user thực hiện sau khi login. QRTable dùng `UPDATE_PASSWORD` trong luồng tạo owner mới:

```txt
SaaS onboarding tạo owner
  -> Keycloak user có temporary password
  -> requiredActions: ["UPDATE_PASSWORD"]
  -> owner phải đổi mật khẩu sau lần đăng nhập đầu tiên
```

Đây là cách tốt hơn so với việc để temporary password tồn tại lâu dài như mật khẩu chính.

---

## 5. Các kiểu xác thực và flow Keycloak

Keycloak hỗ trợ nhiều kiểu xác thực (authentication flow) và cấp token (grant/flow). QRTable không dùng tất cả. Khi đọc tài liệu Keycloak, cần phân biệt flow nào là nền tảng lý thuyết, flow nào đang được triển khai, và flow nào nên tránh.

### 5.1 Authorization Code / Standard Flow

Authorization Code Flow, trong Keycloak UI thường gọi là **Standard Flow**, là flow chính cho ứng dụng web có login qua trình duyệt.

Luồng dễ hiểu:

```txt
User mở Management App
  -> Management App chuyển sang Keycloak
  -> User nhập mật khẩu trên Keycloak
  -> Keycloak trả code về callback URL
  -> NextAuth đổi code lấy access token / refresh token
```

QRTable dùng flow này cho Management App qua NextAuth + Keycloak provider. Đây là flow nên ưu tiên cho staff/admin login vì password chỉ nhập ở Keycloak, frontend không tự xử lý mật khẩu.

### 5.2 Refresh Token

Refresh token dùng để xin access token mới khi access token hết hạn hoặc sắp hết hạn. Management App đang xin scope `offline_access` để có refresh token.

Trong QRTable:

- NextAuth giữ refresh token trong JWT session phía server/runtime của NextAuth.
- Khi access token sắp hết hạn, Management App gọi token endpoint của Keycloak với `grant_type=refresh_token`.
- BFF vẫn phải verify access token mới qua Authorizer; refresh token không được gửi trực tiếp cho BFF API nghiệp vụ.

### 5.3 Client Credentials / Service Account

Client Credentials Grant là flow cho backend/service tự xác thực với Keycloak, không đại diện cho một user đang bấm giao diện.

Luồng dễ hiểu:

```txt
Authorizer có client_id + client_secret
  -> gọi token endpoint với grant_type=client_credentials
  -> nhận admin/service token
  -> gọi Keycloak Admin REST API
```

QRTable dùng cơ chế này để Authorizer gọi Keycloak Admin REST API, ví dụ tạo user, gán realm role, disable user. Trong `tools/keycloak-bootstrap.sh`, client backend được bật `serviceAccountsEnabled: true` và service account được gán các role quản trị cần thiết như `manage-users`, `view-users`, `query-users`.

### 5.4 Direct Access Grants / Password Grant

Direct Access Grants cho phép client gửi username/password trực tiếp đến token endpoint để lấy token. Đây là flow tiện cho script, test hoặc legacy endpoint, nhưng không nên là flow chính cho giao diện người dùng hiện đại.

Trong code hiện tại, Authorizer có hàm `exchangeUserToken()` dùng `grant_type=password`. Vì vậy bootstrap/local hoặc một số luồng nội bộ có thể dựa vào nó, nhưng Management App login chính vẫn nên đi qua Standard Flow.

Nguyên tắc trong QRTable:

- Dùng Standard Flow cho người dùng thật đăng nhập qua UI.
- Chỉ bật Direct Access Grants khi có use case rõ ràng.
- Không để frontend tự thu password rồi gọi password grant nếu có thể dùng redirect login của Keycloak.

### 5.5 Implicit Flow

Implicit Flow từng được dùng cho SPA cũ, trong đó token được trả trực tiếp qua browser redirect. Với bối cảnh hiện tại, nên tránh flow này vì token dễ lộ trên trình duyệt/history/log hơn và không còn là lựa chọn tốt cho ứng dụng web hiện đại.

QRTable không cần Implicit Flow. Management App dùng NextAuth và Standard Flow.

### 5.6 Device Authorization và các flow khác

Keycloak còn hỗ trợ các flow như Device Authorization (đăng nhập cho thiết bị ít khả năng nhập liệu), Identity Brokering (đăng nhập qua Google/GitHub/IdP khác), hoặc các flow tùy biến.

QRTable hiện chưa triển khai các flow này. Nếu sau này cần, hãy xem chúng là scope riêng:

- Thiết bị POS/kiosk không tiện nhập mật khẩu: cân nhắc Device Authorization.
- Đăng nhập bằng Google Workspace của nhà hàng: cân nhắc Identity Brokering.
- MFA/OTP cho admin: cấu hình authentication flow trong Keycloak, nhưng vẫn phải giữ BFF PermissionGuard làm lớp bảo vệ API.

### 5.7 Mapping flow với QRTable

| Nhu cầu                                      | Flow phù hợp                          | Trạng thái trong QRTable                       |
| -------------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| Staff/admin đăng nhập Management App         | Standard Flow / Authorization Code    | Đang dùng qua NextAuth.                        |
| Management App làm mới access token          | Refresh Token                         | Đang dùng qua NextAuth callback.               |
| Authorizer gọi Admin REST API                | Client Credentials / Service Account  | Đang dùng cho Keycloak admin ops.              |
| Script/test lấy token bằng username/password | Direct Access Grants / Password Grant | Có hỗ trợ trong Authorizer, dùng có kiểm soát. |
| SPA nhận token trực tiếp từ redirect         | Implicit Flow                         | Không dùng, nên tránh.                         |
| Customer quét QR gọi món                     | Không dùng Keycloak                   | Dùng customer session/QR token.                |

---

## 6. Luồng xác thực hiện tại

### 6.1 Management App login

Management App dùng NextAuth với Keycloak provider. Biến cấu hình chính:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
MANAGEMENT_BFF_BASE_URL=http://localhost:3300/api/v1
```

Luồng đăng nhập:

```txt
User mở /login
  -> Management App gọi signIn("keycloak")
  -> Keycloak login thành công
  -> NextAuth lưu access token, refresh token, expiresAt
  -> Management App gọi BFF /authorizer/me
  -> Session được hydrate thêm roles, permissions, tenantId, userId
```

Management App yêu cầu các scope OIDC cơ bản và `offline_access` để có refresh token. Refresh token chỉ phục vụ session phía frontend; nó không thay thế kiểm tra quyền ở BFF.

NextAuth có trách nhiệm giữ session phía frontend và refresh token. Nó không thay thế authorization (ủy quyền/kiểm tra quyền) ở BFF. Mọi API quan trọng vẫn phải qua BFF guards.

### 6.2 BFF UserGuard

Khi route có `@Authorization({ secured: true })`, UserGuard sẽ:

1. Đọc bearer token từ request.
2. Tạo cache key Redis `user-token:{sha256(token)}`.
3. Nếu có cache, gắn user metadata vào request.
4. Nếu không có cache, gọi Authorizer gRPC `verifyUserToken`.
5. Cache kết quả verify trong Redis khoảng 30 phút.

UserGuard không tự verify JWT. Điều này giúp logic verify tập trung ở Authorizer Service.

### 6.3 Authorizer verify token

Authorizer Service:

1. Decode JWT header để lấy `kid`.
2. Lấy signing key từ JWKS.
3. Verify JWT bằng RS256.
4. Kiểm tra `sub`.
5. Gọi User-Access để tìm user profile theo Keycloak user id.
6. Kiểm tra role mapping giữa realm role trong token và role nội bộ.
7. Gom permissions từ User-Access.
8. Trả về metadata cho BFF.

Nếu profile chưa tồn tại, Authorizer có thể auto provision nếu env `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=true`. Nếu không, lỗi đúng mong đợi là `user_not_provisioned`.

### 6.4 TenantGuard

TenantGuard đảm bảo request không "nhảy tenant" sai trái. Guard đọc tenant từ:

- JWT claim `tenant_id` / `tenantId`.
- Header/request context phù hợp với route.
- Session cache trong một số luồng customer/session.

`SUPER_ADMIN` có thể bypass yêu cầu tenant trong các route quản trị phù hợp. Các role nhà hàng như `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA` phải có tenant hợp lệ và không được mismatch với tenant request.

### 6.5 PermissionGuard

PermissionGuard đọc permission route yêu cầu, sau đó so với danh sách permission trong metadata của user. Danh sách này đến từ User-Access, không đến trực tiếp từ Keycloak.

Ví dụ:

```txt
Route cần ORDER_UPDATE
  -> JWT hợp lệ
  -> user đã provision
  -> TenantGuard hợp lệ
  -> PermissionGuard thấy user có ORDER_UPDATE
  -> request được đi tiếp
```

Nếu thiếu permission, kết quả đúng là 403 `permission_denied`, không phải lỗi Keycloak.

### 6.6 WebSocket và realtime

Với realtime cho Management/KDS, token vẫn cần được xác minh trước khi socket được gắn vào room tenant/role. Nguyên tắc giống HTTP:

```txt
Token hợp lệ chưa đủ
  -> cần user profile
  -> cần tenant hợp lệ
  -> mới join room realtime đúng phạm vi
```

WebSocket chỉ là kênh đẩy tín hiệu runtime. Nó không nên bỏ qua Authorizer/User-Access nếu luồng đó cần staff identity.

---

## 7. Cấp phát user và onboarding tenant

### 7.1 Tạo user nội bộ thông thường

User-Access Service có luồng tạo user ứng dụng:

```txt
Request tạo staff/admin
  -> User-Access kiểm tra email
  -> User-Access gọi Authorizer TCP KEYCLOAK.CREATE_USER
  -> Authorizer tạo Keycloak user
  -> User-Access tạo profile nội bộ
```

Lý do không chỉ tạo trong Keycloak:

- Keycloak chỉ biết identity và realm role.
- QRTable cần profile, tenant relation, internal role và permission.
- QRTable cần kiểm soát lỗi duplicate email, rollback và mapping theo domain.

### 7.2 Onboarding tenant owner trong Phase 4B

Phase 4B thêm luồng onboarding tenant mới:

```txt
SaaS Service nhận request onboarding
  -> tạo tenant
  -> gọi Authorizer KEYCLOAK.CREATE_TENANT_OWNER
  -> Authorizer tạo Keycloak user owner
  -> gán realm role OWNER
  -> thêm attribute tenant_id / tenant_slug
  -> set temporary password và required action UPDATE_PASSWORD nếu có
  -> SaaS gọi User-Access upsert owner profile
  -> tạo subscription/payment settings/outbox tenant.created
```

Nếu bước sau khi tạo Keycloak owner thất bại, SaaS gọi Authorizer `KEYCLOAK.DISABLE_USER` để vô hiệu hóa user vừa tạo. Đây là compensating action (hành động bù trừ), vì Keycloak và database SaaS/User-Access không nằm chung một transaction.

### 7.3 Vì sao rollback bằng disable

Trong hệ thống microservice, không có một transaction SQL duy nhất bao quanh Keycloak, SaaS DB và User-Access DB. Nếu Keycloak tạo owner thành công nhưng User-Access fail, user đó có thể đăng nhập nhưng chưa có profile ứng dụng.

Disable user giúp:

- Chặn tài khoản nửa vời.
- Giữ dấu vết để debug.
- Tránh xóa vật lý user quá sớm khi cần audit luồng onboarding.

### 7.4 Auto provision khi đăng nhập lần đầu

Authorizer có cơ chế auto provision nếu:

```txt
AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=true
```

Cơ chế này chỉ nên dùng khi đã rõ nguồn claim và role mapping. Nếu không cẩn thận, nó có thể tạo profile từ token thiếu thông tin tenant/role. Trong các luồng quan trọng như onboarding owner, nên chủ động tạo profile qua service thay vì trông chờ auto provision.

---

## 8. Role, permission và tenant isolation

### 8.1 Mô hình hai lớp

QRTable dùng mô hình hai lớp:

```txt
Lớp identity:
  Keycloak user, realm role, JWT, tenant claim

Lớp application profile:
  User-Access user, tenant relation, internal role, permissions
```

Token Keycloak hợp lệ là điều kiện cần. Profile User-Access hợp lệ mới là điều kiện đủ để request vào domain QRTable.

### 8.2 Realm role

Realm role trong Keycloak phân loại user theo vai trò lớn:

| Realm role    | Ý nghĩa                              |
| ------------- | ------------------------------------ |
| `SUPER_ADMIN` | Quản trị hệ thống/SaaS cấp nền tảng. |
| `OWNER`       | Chủ tenant/nhà hàng.                 |
| `MANAGER`     | Quản lý nhà hàng.                    |
| `WAITER`      | Nhân viên phục vụ.                   |
| `CHEF`        | Nhân viên bếp.                       |
| `BARISTA`     | Nhân viên bar/đồ uống.               |

Role trong token giúp Authorizer đối chiếu role mapping. Tuy nhiên, permission cụ thể vẫn phải lấy từ User-Access.

### 8.3 Permission ứng dụng

Permission là quyền thao tác chi tiết của QRTable. Canonical permission matrix hiện nằm ở:

```txt
docs/architecture/permission-matrix.md
```

Và code/seed liên quan nằm ở:

```txt
libs/constants/src/lib/enum/role.enum.ts
apps/user-access/src/seeder/role.json
```

Khi thêm permission mới, không chỉ sửa Keycloak. Cần cập nhật enum, seed, permission matrix, guard usage và test liên quan.

### 8.4 Tenant claim

Tenant claim giúp BFF biết identity hiện tại thuộc tenant nào. QRTable đang dùng `tenant_id` và có xử lý alias `tenantId` trong metadata nội bộ.

Nguyên tắc:

- Staff nhà hàng phải gắn với tenant.
- Request có tenant không được mismatch với tenant của user.
- `SUPER_ADMIN` có các luồng quản trị có thể không cần tenant nhà hàng cụ thể.
- Không tin tenant id do frontend tự gửi nếu nó mâu thuẫn với claim/profile.

### 8.5 Role-based routing trên Management App

Management App có route middleware dựa trên role để điều hướng UX:

```txt
OWNER vào dashboard owner
CHEF vào kitchen
WAITER vào vùng phục vụ
```

Đây chỉ là lớp trải nghiệm người dùng. Nó không phải cơ chế bảo mật cuối cùng. Nếu frontend route middleware bị bypass, BFF PermissionGuard vẫn phải chặn request không đủ quyền.

---

## 9. Keycloak không sở hữu những gì

Keycloak nên được xem là identity provider, không phải service nghiệp vụ của QRTable.

| Phạm vi                               | Nguồn đúng                                        |
| ------------------------------------- | ------------------------------------------------- |
| Menu, catalog, product                | Catalog/Product service + PostgreSQL.             |
| Order, bill, payment                  | Order/Payment service + PostgreSQL.               |
| Tenant lifecycle, subscription, plan  | SaaS service.                                     |
| Payment settings và SePay OAuth state | Payment service + Redis/PostgreSQL theo ngữ cảnh. |
| Customer QR session                   | BFF/Order session + Redis.                        |
| Staff permissions chi tiết            | User-Access + permission matrix.                  |
| KDS runtime state                     | Kitchen + Redis/PostgreSQL theo loại state.       |
| Realtime hints                        | BFF/Kitchen + WebSocket/Redis/Kafka tùy luồng.    |

Nếu một yêu cầu nghe giống "người này được đăng nhập không", nghĩ đến Keycloak. Nếu nó nghe giống "nghiệp vụ QRTable sẽ thay đổi dữ liệu nào", nghĩ đến service sở hữu domain.

---

## 10. Hướng dẫn cấu hình và thao tác Keycloak

Phần này trả lời câu hỏi: nếu mở Keycloak Admin Console thì cần cấu hình gì, ý nghĩa của từng thông số là gì, và cấu hình đó ánh xạ với script/code QRTable ra sao.

Trong QRTable, nên ưu tiên dùng script `tools/keycloak-bootstrap.sh` để tạo cấu hình lặp lại được. Admin Console phù hợp để kiểm tra, debug, hoặc hiểu cấu hình đang có.

### 10.1 Thứ tự thao tác khuyến nghị

Khi cấu hình một môi trường Keycloak mới cho QRTable, đi theo thứ tự:

1. Tạo hoặc chọn realm `qrtable`.
2. Tạo OIDC clients `qrtable-bff` và `management-app`.
3. Bật/tắt flow phù hợp cho từng client.
4. Tạo realm roles `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
5. Tạo user attributes `tenant_id` và `sub_role`.
6. Tạo protocol mappers để đưa `tenant_id` và `sub_role` vào token.
7. Gán service account roles cho backend client để gọi Admin REST API.
8. Tạo user mẫu hoặc user thật, set password, gán realm role và tenant attributes.
9. Đăng nhập thử Management App, gọi `/authorizer/me`, kiểm tra roles/permissions/tenant.

### 10.2 Realm `qrtable`

Realm là lớp bao ngoài. Trong Admin Console:

```txt
Admin Console
  -> Realm selector
  -> Create realm
  -> Realm name: qrtable
```

Các thông số quan trọng:

| Thông số     | Ý nghĩa                    | QRTable local/dev                                                          |
| ------------ | -------------------------- | -------------------------------------------------------------------------- |
| Realm name   | Tên không gian định danh.  | `qrtable`                                                                  |
| Enabled      | Realm có hoạt động không.  | Bật.                                                                       |
| SSL Required | Chính sách bắt buộc HTTPS. | Local có thể `none`; production phải đi qua HTTPS/reverse proxy đúng cách. |
| Login theme  | Theme login của Keycloak.  | `keycloak-theme` nếu đã build/mount `apps/keycloak-theme`.                 |

Không nên đổi realm name tùy tiện sau khi đã cấu hình app, vì `AUTH_KEYCLOAK_ISSUER`, `KEYCLOAK_REALM`, JWKS endpoint và token issuer đều phụ thuộc vào realm.

### 10.3 Client `management-app`

`management-app` là client phục vụ login qua trình duyệt cho Management App.

Trong Admin Console:

```txt
Clients
  -> Create client
  -> Client type: OpenID Connect
  -> Client ID: management-app
```

Thông số nên hiểu:

| Thông số              | Ý nghĩa                                                                          | QRTable                                                            |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Client authentication | Bật nghĩa là confidential client (client có secret). Tắt nghĩa là public client. | Đang dùng secret qua NextAuth, nên bật.                            |
| Standard flow         | Bật Authorization Code Flow cho browser login.                                   | Bật.                                                               |
| Direct access grants  | Cho phép password grant.                                                         | Không cần cho login chính; chỉ bật nếu có use case/script rõ ràng. |
| Service accounts      | Cho phép client credentials.                                                     | Không bắt buộc cho Management App.                                 |
| Valid redirect URIs   | URL Keycloak được phép redirect về sau login.                                    | Local: `http://localhost:3000/*`.                                  |
| Web origins           | Origin frontend được phép theo CORS/OIDC browser flow.                           | Local: `http://localhost:3000`.                                    |
| Client secret         | Bí mật client dùng ở server-side NextAuth.                                       | Đặt vào `AUTH_KEYCLOAK_SECRET`, không đưa ra browser.              |

Management App cần env:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
```

### 10.4 Client `qrtable-bff`

Tên `qrtable-bff` trong code hiện là backend/confidential client mà Authorizer dùng để trao đổi token và gọi Keycloak Admin REST API.

Thông số chính:

| Thông số              | Ý nghĩa                                     | QRTable                                                                                                 |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Client authentication | Cho phép dùng client secret.                | Bật.                                                                                                    |
| Service accounts      | Cho phép client credentials grant.          | Bật, để Authorizer lấy admin/service token.                                                             |
| Direct access grants  | Cho phép password grant.                    | Đang bật trong bootstrap vì code có `exchangeUserToken()`.                                              |
| Standard flow         | Cho phép authorization code flow.           | Đang bật trong bootstrap để giữ client linh hoạt, nhưng login chính của frontend dùng `management-app`. |
| Client secret         | Secret backend dùng khi gọi token endpoint. | Đặt vào `KEYCLOAK_CLIENT_SECRET`.                                                                       |

Backend env tương ứng:

```txt
KEYCLOAK_HOST=http://localhost:8180
KEYCLOAK_REALM=qrtable
KEYCLOAK_CLIENT_ID=qrtable-bff
KEYCLOAK_CLIENT_SECRET=...
```

### 10.5 Realm roles

Trong Admin Console:

```txt
Realm roles
  -> Create role
  -> SUPER_ADMIN / OWNER / MANAGER / WAITER / CHEF / BARISTA
```

Các role này là role định danh cấp cao. Đừng nhồi permission chi tiết của QRTable vào Keycloak role nếu permission đó đã thuộc User-Access.

Khi tạo user:

```txt
Users
  -> chọn user
  -> Role mapping
  -> Assign realm role
```

Sau login, role xuất hiện trong token ở `realm_access.roles`, rồi Authorizer đối chiếu với role nội bộ.

### 10.6 User attributes và protocol mappers

QRTable cần claim `tenant_id` và `sub_role` trong token. Có hai bước:

1. Tạo user attributes.
2. Tạo protocol mappers để đưa attributes đó vào access token.

Trong Admin Console, với user:

```txt
Users
  -> chọn user
  -> Attributes
  -> tenant_id = <tenant-id>
  -> sub_role = OWNER / MANAGER / ...
```

Trong client `management-app` và `qrtable-bff`, tạo mapper:

```txt
Client
  -> Client scopes / Mappers / Protocol mappers
  -> User Attribute
  -> user.attribute: tenant_id
  -> claim.name: tenant_id
  -> Add to access token: ON
  -> Add to ID token / userinfo: ON nếu frontend/backend cần đọc
```

Lặp lại cho `sub_role`. Nếu thiếu mapper, user vẫn login được nhưng BFF/Authorizer có thể không thấy tenant claim, dẫn đến lỗi tenant hoặc profile mapping.

### 10.7 Service account roles cho Admin REST API

Để Authorizer tạo/disable user qua Admin REST API, service account của client backend phải có quyền quản trị user.

Trong Admin Console:

```txt
Clients
  -> qrtable-bff
  -> Service account roles
  -> Assign role
  -> Filter by clients
  -> realm-management
  -> manage-users, view-users, query-users
```

Ý nghĩa:

| Role           | Dùng để làm gì                          |
| -------------- | --------------------------------------- |
| `manage-users` | Tạo, cập nhật, disable user.            |
| `view-users`   | Đọc user theo id/email.                 |
| `query-users`  | Tìm kiếm user khi cần kiểm tra tồn tại. |

Không gán quyền quản trị rộng hơn nếu chưa cần. Service account càng nhiều quyền, rủi ro khi lộ client secret càng lớn.

### 10.8 Tạo user thủ công để test

Khi cần tạo user test bằng Admin Console:

1. Vào `Users -> Add user`.
2. Điền `username`, `email`, `firstName`, `lastName`.
3. Bật `Email verified` nếu muốn bỏ qua xác minh email local.
4. Thêm attributes `tenant_id` và `sub_role`.
5. Vào `Credentials`, set password.
6. Bỏ temporary nếu là user dev cố định; bật temporary nếu muốn user đổi mật khẩu lần đầu.
7. Vào `Role mapping`, gán realm role phù hợp.
8. Đảm bảo User-Access cũng có profile tương ứng, nếu không token hợp lệ vẫn bị `user_not_provisioned`.

Điểm cuối cùng rất quan trọng: tạo user trong Keycloak chưa đủ. QRTable cần profile User-Access để lấy permissions.

### 10.9 Kiểm tra token và claim

Sau khi login, có thể kiểm tra access token theo thứ tự:

1. Token có issuer đúng không: `http://localhost:8180/realms/qrtable`.
2. Token có `realm_access.roles` không.
3. Token có `tenant_id` và `sub_role` không.
4. Header có `kid` không.
5. JWKS endpoint có public key tương ứng không.
6. Gọi BFF `/authorizer/me` có trả về roles, permissions, tenantId không.

Không dùng việc decode payload bằng mắt như bằng chứng bảo mật. Payload chỉ đáng tin sau khi Authorizer verify chữ ký JWT bằng JWKS.

---

## 11. Thiết lập local, triển khai và gỡ lỗi

### 11.1 Cấu hình local

Keycloak local được khai báo trong `docker-compose.provider.yaml`:

```txt
Image: quay.io/keycloak/keycloak:25.0.0
Port: 8180:8080
Admin user: admin
Admin password: admin
Realm: qrtable
```

Biến môi trường backend:

```txt
KEYCLOAK_HOST=http://localhost:8180
KEYCLOAK_REALM=qrtable
KEYCLOAK_CLIENT_ID=qrtable-bff
KEYCLOAK_CLIENT_SECRET=...
```

Biến môi trường Management App:

```txt
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=...
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/qrtable
```

Script `tools/keycloak-bootstrap.sh` dùng cho môi trường local/dev để:

- Tạo hoặc cập nhật realm `qrtable`.
- Tạo OIDC clients `qrtable-bff` và `management-app`.
- Tạo user profile attributes `tenant_id` và `sub_role`.
- Tạo protocol mappers để đưa `tenant_id` và `sub_role` vào JWT.
- Tạo realm roles `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
- Seed user mẫu từ `tools/auth-bootstrap-users.json`.

### 11.2 Giải thích thông số cấu hình

Các thông số trong `docker-compose.provider.yaml` và env liên quan:

| Thông số                                     | Nghĩa                                                         | QRTable local/dev                                                |
| -------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `quay.io/keycloak/keycloak:25.0.0`           | Image Keycloak đang chạy.                                     | Cố định để tránh lệch hành vi giữa môi trường.                   |
| `8180:8080`                                  | Map port host `8180` vào port container `8080`.               | Truy cập Keycloak qua `http://localhost:8180`.                   |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | Tài khoản admin ban đầu của Keycloak.                         | `admin/admin` chỉ dành cho local/dev.                            |
| `KC_HEALTH_ENABLED=true`                     | Bật health endpoint nội bộ của Keycloak.                      | Dùng cho Docker healthcheck.                                     |
| `KC_PROXY_HEADERS=xforwarded`                | Tin header proxy như `X-Forwarded-Host`, `X-Forwarded-Proto`. | Hữu ích khi đi qua ngrok/Cloudflare Tunnel/reverse proxy.        |
| `KC_HOSTNAME_STRICT=false`                   | Không bắt hostname phải khớp cứng.                            | Tiện cho local/tunnel; production nên cấu hình hostname rõ ràng. |
| `command: start-dev`                         | Chạy development mode.                                        | Phù hợp local, không phải cấu hình production.                   |
| Volume `/opt/keycloak/data`                  | Lưu dữ liệu Keycloak local.                                   | Giữ realm/client/user sau khi restart container.                 |
| Volume `/opt/keycloak/providers`             | Mount provider/theme JAR.                                     | Dùng custom Keycloak theme từ `apps/keycloak-theme`.             |

Các biến env của app:

| Biến                                 | Ai dùng            | Ý nghĩa                                                                  |
| ------------------------------------ | ------------------ | ------------------------------------------------------------------------ |
| `KEYCLOAK_HOST`                      | Authorizer/backend | Base URL Keycloak, ví dụ `http://localhost:8180`.                        |
| `KEYCLOAK_REALM`                     | Authorizer/backend | Realm cần verify token và gọi Admin API.                                 |
| `KEYCLOAK_CLIENT_ID`                 | Authorizer/backend | Client backend dùng client secret/service account.                       |
| `KEYCLOAK_CLIENT_SECRET`             | Authorizer/backend | Secret của client backend.                                               |
| `AUTH_KEYCLOAK_ID`                   | Management App     | Client ID dùng cho NextAuth provider.                                    |
| `AUTH_KEYCLOAK_SECRET`               | Management App     | Client secret của `management-app`.                                      |
| `AUTH_KEYCLOAK_ISSUER`               | Management App     | Issuer OIDC, phải là `{KEYCLOAK_HOST}/realms/{realm}`.                   |
| `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN` | Authorizer         | Cho phép tạo profile User-Access khi token hợp lệ nhưng profile chưa có. |

### 11.3 Các kiểu triển khai Keycloak

Keycloak có hai kiểu chạy chính cần phân biệt:

| Kiểu chạy                      | Dùng khi nào        | Đặc điểm                                                                                                          |
| ------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Development mode (`start-dev`) | Local/dev/demo.     | Tiện khởi động, chấp nhận HTTP, hostname linh hoạt, không phải cấu hình an toàn mặc định.                         |
| Production mode (`start`)      | Staging/production. | Secure by default (an toàn mặc định), cần hostname rõ ràng, HTTPS/TLS hoặc reverse proxy đúng, database bền vững. |

Theo tài liệu Keycloak hiện tại, production mode yêu cầu cấu hình nghiêm túc hơn về hostname và TLS. Ví dụ tư duy triển khai:

```txt
Internet
  -> HTTPS reverse proxy / load balancer
  -> Keycloak production mode
  -> Keycloak database riêng
```

Với production/staging, không bê nguyên local compose lên chạy công khai. Cần tối thiểu:

- Dùng `start`, không dùng `start-dev`.
- Dùng database bền vững cho Keycloak, không phụ thuộc vào volume local tạm bợ.
- Cấu hình hostname/issuer ổn định, ví dụ `https://auth.qrtable.vn`.
- Bật HTTPS hoặc đặt sau reverse proxy xử lý TLS đúng cách.
- Cấu hình proxy headers đúng nếu TLS terminate ở proxy.
- Không dùng `admin/admin`.
- Quản lý client secret bằng secret manager/env an toàn.
- Tách realm/client theo môi trường nếu cần, không trộn dev và production user.

### 11.4 Mô hình realm/client theo môi trường

Có hai cách phổ biến:

| Cách                                                                                  | Ưu điểm                                           | Nhược điểm                                | Gợi ý cho QRTable             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| Một Keycloak instance, nhiều realm (`qrtable-dev`, `qrtable-staging`, `qrtable-prod`) | Dễ tách dữ liệu, issuer rõ ràng.                  | Một instance vẫn là điểm phụ thuộc chung. | Tốt cho demo/staging nhỏ.     |
| Mỗi môi trường một Keycloak instance riêng                                            | Cách ly mạnh, production ít bị ảnh hưởng bởi dev. | Tốn vận hành hơn.                         | Nên dùng khi production thật. |

Quan trọng nhất là issuer phải ổn định. Nếu `AUTH_KEYCLOAK_ISSUER` là `https://auth.example.com/realms/qrtable`, token được phát ra cũng phải có issuer đó; Authorizer/NextAuth không nên trỏ sang URL khác rồi hy vọng token vẫn khớp.

### 11.5 Endpoint hữu ích

| Mục đích        | Endpoint                                                             |
| --------------- | -------------------------------------------------------------------- |
| Realm issuer    | `http://localhost:8180/realms/qrtable`                               |
| JWKS            | `http://localhost:8180/realms/qrtable/protocol/openid-connect/certs` |
| Token endpoint  | `http://localhost:8180/realms/qrtable/protocol/openid-connect/token` |
| Admin REST base | `http://localhost:8180/admin/realms/qrtable`                         |

### 11.6 Lỗi thường gặp

| Dấu hiệu                          | Cách hiểu                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 401 `invalid_token`               | Token hết hạn, sai realm/issuer, sai chữ ký, thiếu `kid`, hoặc JWKS không lấy được key.               |
| 401 `user_not_provisioned`        | Keycloak user hợp lệ nhưng User-Access chưa có profile ứng dụng.                                      |
| 401 role mapping mismatch         | Role trong Keycloak không map được sang role nội bộ của QRTable.                                      |
| 403 `permission_denied`           | User hợp lệ nhưng thiếu permission route yêu cầu.                                                     |
| Tenant mismatch                   | Tenant trong request không khớp tenant claim/profile.                                                 |
| Login lặp lại liên tục            | NextAuth/Keycloak issuer, client secret, callback URL hoặc refresh token có vấn đề.                   |
| Duplicate email khi onboarding    | Keycloak hoặc User-Access đã có user với email đó.                                                    |
| Owner mới đăng nhập nhưng bị chặn | Có thể owner tạo được trong Keycloak nhưng profile User-Access/subscription/onboarding chưa hoàn tất. |

### 11.7 Cách đọc lỗi đúng lớp

Khi gặp lỗi auth, nên tách lớp:

```txt
1. Keycloak login có thành công không?
2. Access token có đúng issuer/realm/client không?
3. Authorizer verify JWT có thành công không?
4. User-Access có profile theo sub không?
5. Role mapping có khớp không?
6. TenantGuard có thấy tenant hợp lệ không?
7. PermissionGuard có thấy permission cần thiết không?
```

Cách tách này giúp tránh việc mọi lỗi 401/403 đều bị quy về Keycloak.

---

## 12. Đọc code ở đâu

| Nội dung                            | File/thao tác nên đọc                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Cấu hình Keycloak backend           | `libs/configuration/src/lib/keycloak.config.ts`                                |
| Docker Keycloak local               | `docker-compose.provider.yaml`                                                 |
| Bootstrap realm/client/mapper/users | `tools/keycloak-bootstrap.sh`                                                  |
| Danh sách user mẫu local/dev        | `tools/auth-bootstrap-users.json`                                              |
| NextAuth Keycloak provider          | `apps/management-app/src/auth.ts`                                              |
| Trang login Management App          | `apps/management-app/src/app/(auth)/login/page.tsx`                            |
| Route NextAuth                      | `apps/management-app/src/app/api/auth/[...nextauth]/route.ts`                  |
| Hydrate session frontend            | `apps/management-app/src/components/auth/auth-session-hydrator.tsx`            |
| Gọi BFF `/authorizer/me`            | `apps/management-app/src/lib/auth/bff-server.ts`                               |
| Role-based routing frontend         | `apps/management-app/src/lib/auth/role-routing.ts`                             |
| Authorizer verify JWT               | `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`            |
| Gọi Keycloak token/admin API        | `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`           |
| Tạo owner/disable user              | `apps/authorizer/src/app/keycloak/services/keycloak-admin.service.ts`          |
| TCP handler Keycloak                | `apps/authorizer/src/app/keycloak/controllers/keycloak.controller.ts`          |
| gRPC verify token                   | `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` |
| BFF UserGuard                       | `libs/guards/src/lib/user.guard.ts`                                            |
| BFF TenantGuard                     | `libs/guards/src/lib/tenant.guard.ts`                                          |
| BFF PermissionGuard                 | `libs/guards/src/lib/permission.guard.ts`                                      |
| SaaS onboarding owner               | `apps/saas/src/services/onboarding-saga.service.ts`                            |
| User profile/profile upsert         | `apps/user-access/src/app/modules/user/services/user.service.ts`               |
| Tenant owner profile                | `apps/user-access/src/app/modules/user/services/tenant-user.service.ts`        |
| Permission enum                     | `libs/constants/src/lib/enum/role.enum.ts`                                     |
| Role seed                           | `apps/user-access/src/seeder/role.json`                                        |

---

## 13. Checklist

### 13.1 Khi thêm route BFF cần bảo vệ

- Route có `@Authorization({ secured: true })` nếu cần staff/admin login.
- Route có permission metadata nếu là thao tác cần quyền cụ thể.
- Đã xác định route có cần tenant hay có cho `SUPER_ADMIN` bypass không.
- Frontend route middleware nếu cần UX điều hướng, nhưng không xem đó là security boundary.
- Test lỗi 401 token invalid, 401 user not provisioned, 403 thiếu permission và tenant mismatch nếu route có tenant.

### 13.2 Khi thêm role hoặc permission

- Cập nhật `libs/constants/src/lib/enum/role.enum.ts`.
- Cập nhật `apps/user-access/src/seeder/role.json`.
- Cập nhật `docs/architecture/permission-matrix.md`.
- Đảm bảo Keycloak realm có realm role tương ứng nếu đây là role định danh mới.
- Kiểm tra Authorizer role mapping.
- Kiểm tra Management App route mapping nếu role ảnh hưởng đến navigation.

### 13.3 Khi thêm claim Keycloak mới

- Thêm user attribute/protocol mapper trong Keycloak realm.
- Cập nhật interface payload nếu backend cần đọc claim.
- Cập nhật Authorizer transform payload nếu claim đi qua gRPC/proto.
- Cập nhật guard/service đọc claim.
- Viết rõ claim đó là identity claim hay application/domain state.
- Cập nhật tài liệu liên quan nếu claim ảnh hưởng tenant/permission.

### 13.4 Khi thêm luồng tạo user mới

- Không để frontend gọi Keycloak Admin REST API.
- Backend phải tạo Keycloak user và User-Access profile theo thứ tự có rollback.
- Nếu bước sau fail, có compensating action như disable user.
- Nếu dùng temporary password, bật required action `UPDATE_PASSWORD`.
- Kiểm tra duplicate email ở cả Keycloak và User-Access.
- Không log client secret, access token, refresh token hoặc password.

### 13.5 Khi debug production/staging

- Kiểm tra `AUTH_KEYCLOAK_ISSUER` và `KEYCLOAK_HOST/REALM` có trỏ đúng môi trường không.
- Kiểm tra HTTPS/hostname/proxy headers của Keycloak.
- Kiểm tra callback URL của Management App trong Keycloak client.
- Kiểm tra JWKS endpoint truy cập được từ Authorizer.
- Kiểm tra Redis token cache nếu user vừa đổi role/permission mà request vẫn dùng metadata cũ.
- Kiểm tra User-Access profile trước khi nghĩ Keycloak sai.

---

## Ghi chú nguồn tham khảo

Tài liệu này được viết bằng cách đối chiếu code QRTable trên `main` với tài liệu Keycloak chính thức qua Context7, đặc biệt các phần về Admin REST API, OpenID Connect client, service account/client credentials, realm role, protocol mapper và user management. Khi phát sinh khác biệt giữa tài liệu này và code hiện tại, ưu tiên code + canonical architecture docs, rồi cập nhật guide này.
