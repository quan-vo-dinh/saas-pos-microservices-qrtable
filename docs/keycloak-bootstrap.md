# Keycloak bootstrap — tools/keycloak-bootstrap.sh

Tài liệu chi tiết cho script `tools/keycloak-bootstrap.sh`.

Mục đích: tự động cấu hình Keycloak cho môi trường phát triển của dự án — tạo/kiểm tra realm, client, roles, protocol mappers, tạo và cập nhật người dùng từ file JSON, gán quyền, và (tuỳ chọn) đồng bộ người dùng vào MongoDB.

---

## Tổng quan ngắn

Script thực hiện tuần tự các bước chính sau:

1. Kiểm tra các công cụ cần thiết (curl, jq).
2. Lấy access token của admin từ realm `master`.
3. Thiết lập `sslRequired` cho realm `master` (tùy biến).
4. Kiểm tra và tạo realm đích nếu chưa tồn tại, rồi đảm bảo `sslRequired` cho realm đó.
5. Kiểm tra/tạo client ứng dụng (service account enabled).
6. Lấy `realm-management` client id và service-account user id, gán các role quản lý người dùng cho service-account nếu thiếu.
7. Tạo các realm roles ứng với ứng dụng (SUPER_ADMIN, OWNER, ...).
8. Tạo protocol mappers để đưa `tenant_id` và `sub_role` từ user attributes thành claims trong token.
9. Duyệt file JSON người dùng (AUTH_BOOTSTRAP_USERS_FILE) — tạo/cập nhật user, đặt mật khẩu, gán role.
10. (Tuỳ chọn) Nếu có Node và biến môi trường MongoDB, gọi `tools/sync-auth-users.js` để đồng bộ user vào MongoDB.

---

## Yêu cầu trước

- Keycloak đang chạy và có thể truy cập qua `KEYCLOAK_HOST` (mặc định `http://localhost:8180`).
- Có user admin Keycloak (mặc định `admin/admin` nếu chưa đổi).
- Công cụ cần cài: `curl`, `jq`.
- (Tuỳ chọn) `node` để chạy script đồng bộ vào MongoDB.
- File JSON mô tả người dùng (`AUTH_BOOTSTRAP_USERS_FILE`), mặc định `tools/auth-bootstrap-users.json`, phải tồn tại.

Script dùng `set -euo pipefail` nên sẽ dừng khi có lỗi hoặc biến môi trường bắt buộc bị unset.

---

## Biến môi trường (và giá trị mặc định)

- KEYCLOAK_HOST (default: `http://localhost:8180`) — Base URL Keycloak.
- KEYCLOAK_ADMIN_USER (default: `admin`) — Admin username để gọi Admin REST API.
- KEYCLOAK_ADMIN_PASSWORD (default: `admin`) — Admin password.
- KEYCLOAK_REALM (default: `qrtable`) — Tên realm sẽ tạo/điều chỉnh.
- KEYCLOAK_CLIENT_ID (default: `qrtable-bff`) — Client ID ứng dụng sẽ tạo/kiểm tra.
- KEYCLOAK_CLIENT_SECRET (default: `change-me`) — Secret dùng khi tạo client (chỉ dùng lúc tạo client mới).
- KEYCLOAK_MASTER_SSL_REQUIRED (default: `none`) — Giá trị `sslRequired` cho realm `master`.
- KEYCLOAK_REALM_SSL_REQUIRED (default: `none`) — Giá trị `sslRequired` cho realm đích.
- AUTH_BOOTSTRAP_USERS_FILE (default: `tools/auth-bootstrap-users.json`) — File JSON chứa danh sách user để bootstrap.
- MONGODB_URI / MONGO_DB_NAME / MONGODB_DB_NAME — Nếu set (tên khác nhau được hỗ trợ), script sẽ gọi `node tools/sync-auth-users.js` để đồng bộ users vào MongoDB (nếu `node` có sẵn).

> Lưu ý: script không thay đổi secret của client nếu client đã tồn tại; để thay secret cần thao tác thủ công hoặc chỉnh script.

---

## Định dạng file JSON (AUTH_BOOTSTRAP_USERS_FILE)

File phải là mảng JSON, mỗi phần tử là object có các trường sau (ví dụ):

```json
[
  {
    "id": "d6f8a7b2-...",
    "username": "alice",
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Nguyen",
    "password": "secret-password",
    "role": "OWNER",
    "tenantId": "tenant_123",
    "subRole": "owner"
  }
]
```

Các trường phải có tên chính xác: `id`, `username`, `email`, `firstName`, `lastName`, `password`, `role`, `tenantId`, `subRole`.

---

## Luồng thực thi chi tiết (endpoints và payload chính)

1. Kiểm tra `curl` và `jq`. Nếu thiếu, script thoát.

2. Lấy admin token:
   - POST `${KEYCLOAK_HOST}/realms/master/protocol/openid-connect/token`
   - form data: `grant_type=password`, `client_id=admin-cli`, `username`, `password`
   - Trích `access_token` bằng `jq` để dùng cho header Authorization.

3. Thiết lập `sslRequired` cho realm `master`:
   - PUT `${KEYCLOAK_HOST}/admin/realms/master` với JSON `{"realm":"master","sslRequired":"${KEYCLOAK_MASTER_SSL_REQUIRED}"}`

4. Kiểm tra tồn tại realm đích (`GET /admin/realms/${KEYCLOAK_REALM}`), nếu 404 thì tạo bằng:
   - POST `/admin/realms` với `{"realm":"${KEYCLOAK_REALM}","enabled":true,"sslRequired":"${KEYCLOAK_REALM_SSL_REQUIRED}"}`
   - Sau đó luôn gửi PUT `/admin/realms/${KEYCLOAK_REALM}` để đảm bảo `sslRequired`.

5. Kiểm tra client nội bộ:
   - GET `/admin/realms/${realm}/clients?clientId=${KEYCLOAK_CLIENT_ID}` → lấy `.[0].id` (internal client id)
   - Nếu không tồn tại, POST `/admin/realms/${realm}/clients` với payload (ví dụ):

```json
{
  "clientId": "qrtable-bff",
  "enabled": true,
  "publicClient": false,
  "protocol": "openid-connect",
  "serviceAccountsEnabled": true,
  "directAccessGrantsEnabled": true,
  "standardFlowEnabled": true,
  "secret": "<KEYCLOAK_CLIENT_SECRET>"
}
```

6. Lấy `realm-management` client id và `service-account-user` id của client ứng dụng:
   - GET `/admin/realms/${realm}/clients?clientId=realm-management`
   - GET `/admin/realms/${realm}/clients/${client_internal_id}/service-account-user` → `.id`
   - Nếu không tìm thấy các id này script sẽ thoát (vì không thể gán role cho service account).

7. Gán client-scoped roles cho service-account (nếu thiếu):
   - Các role cần gán trên `realm-management` client: `manage-users`, `view-users`, `query-users`.
   - Lấy role payload: GET `/admin/realms/${realm}/clients/${realm_management_client_id}/roles/{role}`
   - POST `/admin/realms/${realm}/users/{service_account_user_id}/role-mappings/clients/${realm_management_client_id}` với payload `[<role_payload>]` (chỉ gán nếu chưa có).

8. Tạo các realm roles riêng của ứng dụng nếu chưa có:
   - Roles: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
   - Kiểm tra GET `/admin/realms/${realm}/roles/{role}` — nếu trả 404 thì POST `/admin/realms/${realm}/roles` với `{"name":"${role}"}`.

9. Tạo protocol mappers trên client để map user attributes thành token claims:
   - Mapper mẫu (ví dụ cho `tenant_id`):

```json
{
  "name": "tenant_id-claim",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "config": {
    "access.token.claim": "true",
    "id.token.claim": "true",
    "userinfo.token.claim": "true",
    "user.attribute": "tenant_id",
    "claim.name": "tenant_id",
    "jsonType.label": "String"
  }
}
```

- Script kiểm tra tồn tại mapper theo `name` trước khi POST.
- Tương tự tạo `sub_role-claim` để expose `sub_role` attribute.

10. Tạo/cập nhật users từ `AUTH_BOOTSTRAP_USERS_FILE`:
    - Với mỗi user entry: tìm bằng `GET /admin/realms/${realm}/users?username={username}` → lấy `id` nếu có.
    - Nếu không tồn tại → POST `/admin/realms/${realm}/users` với payload gồm `id`, `username`, `email`, `firstName`, `lastName`, `attributes:{ tenant_id:[..], sub_role:[..] }`.
    - Sau đó hoặc nếu đã tồn tại, gửi PUT `/admin/realms/${realm}/users/{id}` để cập nhật thông tin/attributes.
    - Đặt password: PUT `/admin/realms/${realm}/users/{id}/reset-password` với `{"type":"password","value":"<password>","temporary":false}` (script luôn đặt lại password theo file).
    - Gán realm role của user: lấy role payload `GET /admin/realms/${realm}/roles/${role}` rồi POST `/admin/realms/${realm}/users/{id}/role-mappings/realm` với `[role_payload]` nếu user chưa có role đó.

11. Đồng bộ sang MongoDB (tuỳ chọn):
    - Nếu `node` tồn tại và ít nhất một trong `MONGODB_URI`, `MONGO_DB_NAME`, `MONGODB_DB_NAME` được set, gọi: `node tools/sync-auth-users.js ${AUTH_BOOTSTRAP_USERS_FILE}`.
    - Nếu không có `node` hoặc biến Mongo chưa set, script in thông báo và bỏ qua bước này.

12. Kết thúc: in `Keycloak bootstrap completed for realm ${KEYCLOAK_REALM}.`

---

## Hành vi idempotency & lưu ý vận hành

- Script thiết kế để có thể chạy nhiều lần:
  - Realm, client, roles và mappers chỉ được tạo khi chưa tồn tại.
  - Người dùng: nếu tồn tại thì được cập nhật (PUT) và mật khẩu được reset (PUT reset-password) — **mật khẩu sẽ bị đặt lại mỗi lần chạy** theo giá trị trong file JSON.
  - Role mappings: chỉ gán khi user/service-account chưa có role đó.
- Một số điều không được thay đổi bởi script nếu đã tồn tại (ví dụ: client secret của client đã tồn tại sẽ không bị cập nhật).

## Thông báo lỗi thường gặp & cách debug

- "Missing required command: curl|jq": cài curl/jq.
- "Unable to get Keycloak admin token": kiểm tra `KEYCLOAK_HOST`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`, hoặc Keycloak chưa sẵn sàng. Thử:

```sh
curl -v -X POST "${KEYCLOAK_HOST}/realms/master/protocol/openid-connect/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=password' \
  --data-urlencode 'client_id=admin-cli' \
  --data-urlencode 'username=admin' \
  --data-urlencode 'password=admin'
```

- Lỗi 403/401 khi gọi Admin API: user admin không có đủ quyền hoặc token hết hạn. Kiểm tra logs Keycloak.
- "Unable to resolve Keycloak internal client id" hoặc "realm-management client or service account user" → kiểm tra clientId chính xác và xem client có `serviceAccountsEnabled` không.
- Để debug chi tiết hơn, chạy script với `bash -x tools/keycloak-bootstrap.sh` hoặc thêm `set -x` trong script để hiển thị các curl calls.

---

## Ví dụ chạy

Chạy theo mặc định (Keycloak local, admin/admin):

```sh
./tools/keycloak-bootstrap.sh
```

Ghi đè biến môi trường (ví dụ deploy hoặc CI):

```sh
KEYCLOAK_HOST="http://keycloak:8180" \
KEYCLOAK_ADMIN_USER="admin" \
KEYCLOAK_ADMIN_PASSWORD="secret" \
KEYCLOAK_REALM="qrtable" \
KEYCLOAK_CLIENT_SECRET="very-secret" \
AUTH_BOOTSTRAP_USERS_FILE="tools/auth-bootstrap-users.json" \
./tools/keycloak-bootstrap.sh
```

Kích hoạt đồng bộ Mongo (nếu có `tools/sync-auth-users.js` và Node):

```sh
MONGODB_URI="mongodb://mongo:27017" MONGO_DB_NAME="qrtable" node tools/sync-auth-users.js tools/auth-bootstrap-users.json
# - hoặc chạy script chính, nó sẽ tự phát hiện node + biến và gọi sync
```

---

## Danh sách các thay đổi thực hiện (tóm tắt)

- Tạo realm (nếu chưa có) và thiết lập `sslRequired`.
- Tạo client (qrtable-bff theo mặc định) với service-account được bật.
- Gán role client-scoped (`manage-users`, `view-users`, `query-users`) cho service account.
- Tạo các realm roles: `SUPER_ADMIN`, `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
- Tạo protocol mappers cho `tenant_id` và `sub_role`.
- Tạo/cập nhật người dùng từ file JSON, đặt mật khẩu không tạm thời (temporary=false), gán role.
- (Tuỳ chọn) Đồng bộ người dùng sang MongoDB via `tools/sync-auth-users.js`.

---

## Ghi chú bảo mật

- `KEYCLOAK_CLIENT_SECRET` mặc định là `change-me` — thay thế bằng secret mạnh khi tạo client cho môi trường thực.
- File `AUTH_BOOTSTRAP_USERS_FILE` chứa mật khẩu rõ ràng — lưu trữ file này an toàn và giới hạn quyền truy cập.
- Script đặt lại mật khẩu theo giá trị trong file JSON — cân nhắc khi chạy nhiều lần trên môi trường production (có thể muốn loại bỏ reset-password tự động).

---

## Tham chiếu nhanh (các endpoint chính)

- Token: `POST /realms/master/protocol/openid-connect/token`
- Realm CRUD: `/admin/realms`
- Client CRUD: `/admin/realms/{realm}/clients`
- Roles: `/admin/realms/{realm}/roles`
- Users: `/admin/realms/{realm}/users`
- Service account user: `/admin/realms/{realm}/clients/{id}/service-account-user`
- Role mappings: `/admin/realms/{realm}/users/{id}/role-mappings/clients/{clientId}` hoặc `/role-mappings/realm`

---

Nếu cần, có thể mở rộng tài liệu với:

- Mô tả chi tiết `tools/sync-auth-users.js` (nếu muốn document phần đồng bộ Mongo).
- Ví dụ đầu vào/đầu ra thực tế (log run) và checklist triển khai cho CI/CD.

---

_Tài liệu này được tạo tự động dựa trên nội dung của `tools/keycloak-bootstrap.sh`._
