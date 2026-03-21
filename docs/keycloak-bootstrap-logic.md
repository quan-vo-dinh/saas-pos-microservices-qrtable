# Keycloak Bootstrap Script Logic

Tài liệu này giải thích chi tiết luồng xử lý của script:

- `tools/keycloak-bootstrap.sh`

## 1. Mục tiêu tổng thể

Script `keycloak-bootstrap.sh` dùng để khởi tạo nhanh cấu hình cơ bản trong Keycloak cho môi trường local/dev theo hướng idempotent (chạy lại nhiều lần không phá trạng thái đã có), gồm:

- Đăng nhập admin để lấy access token.
- Tạo realm nếu chưa tồn tại.
- Tạo client confidential (OIDC) nếu chưa tồn tại.
- Tạo các realm roles chuẩn nghiệp vụ nếu chưa có.
- Tạo protocol mapper để đưa `tenant_id` vào token.

Kết quả kỳ vọng sau khi script chạy thành công:

- Realm tồn tại.
- Client tồn tại, có secret và bật các flow chính.
- Các role `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA` có sẵn.
- Claim `tenant_id` xuất hiện trong access token / id token / userinfo (khi user có attribute tương ứng).

## 2. Cơ chế fail-fast và strict mode

Ngay đầu file:

- `set -euo pipefail`

Ý nghĩa:

- `-e`: dừng script khi một lệnh trả về mã lỗi khác 0.
- `-u`: lỗi nếu dùng biến chưa được khai báo.
- `pipefail`: trong pipeline, nếu một lệnh fail thì cả pipeline fail.

Mục đích là tránh trạng thái “chạy tiếp dù đã lỗi”, giúp bootstrap đáng tin cậy hơn.

## 3. Khối cấu hình đầu vào qua biến môi trường

Script định nghĩa các biến với giá trị mặc định bằng cú pháp `${VAR:-default}`:

- `KEYCLOAK_HOST` (mặc định `http://localhost:8180`)
- `KEYCLOAK_ADMIN_USER` (mặc định `admin`)
- `KEYCLOAK_ADMIN_PASSWORD` (mặc định `admin`)
- `KEYCLOAK_REALM` (mặc định `qrtable`)
- `KEYCLOAK_CLIENT_ID` (mặc định `qrtable-bff`)
- `KEYCLOAK_CLIENT_SECRET` (mặc định `change-me`)

Lợi ích:

- Dễ override theo môi trường bằng `export` hoặc inline env khi chạy script.
- Giảm hardcode, tăng khả năng tái sử dụng.

## 4. Kiểm tra dependency hệ thống

Khối:

- `required_cmds=(curl jq)`
- loop `command -v` để xác minh command tồn tại.

Nếu thiếu `curl` hoặc `jq`, script dừng ngay với thông báo rõ ràng.

Vì sao cần:

- `curl`: gọi Keycloak Admin REST API.
- `jq`: parse JSON response, đặc biệt để lấy token và ID nội bộ.

## 5. Hàm lấy admin access token

Hàm `get_admin_token()` gửi POST đến:

- `/realms/master/protocol/openid-connect/token`

Payload form-urlencoded:

- `grant_type=password`
- `client_id=admin-cli`
- `username` / `password` admin

Sau đó parse `.access_token` bằng `jq -r`.

Điểm quan trọng:

- Đây là token của realm `master`, dùng để gọi admin endpoints `/admin/*`.
- Nếu token rỗng hoặc `null`, script dừng (`Unable to get Keycloak admin token`).

## 6. Chuẩn hóa header dùng lại

Script gom header vào mảng bash:

- `auth_header=(-H "Authorization: Bearer ${ADMIN_TOKEN}")`
- `json_header=(-H 'Content-Type: application/json')`

Mục tiêu:

- Tránh lặp chuỗi header ở nhiều lệnh curl.
- Giảm lỗi copy/paste.

## 7. Kiểm tra và tạo realm (idempotent)

Bước kiểm tra:

- GET `/admin/realms/${KEYCLOAK_REALM}`
- Chỉ lấy HTTP status code qua `-w '%{http_code}'`

Nhánh xử lý:

- Nếu `404`: POST tạo realm mới với body tối thiểu `{ "realm": "...", "enabled": true }`.
- Ngược lại: log rằng realm đã tồn tại.

Đây là mô thức “check-then-create” để đảm bảo chạy lại script không tạo trùng.

## 8. Kiểm tra và tạo client

### 8.1 Lấy internal client id

Script truy vấn:

- GET `/admin/realms/${REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}`

Và parse:

- `.[0].id // empty`

Lưu ý:

- `clientId` là định danh logic (hiển thị).
- Keycloak API thường cần `id` nội bộ (UUID-like) cho nhiều endpoint con.

### 8.2 Tạo client nếu chưa có

Nếu chưa có `client_id_internal`:

- POST tạo client với cấu hình chính:
  - `enabled: true`
  - `publicClient: false` (client confidential)
  - `protocol: openid-connect`
  - `serviceAccountsEnabled: true`
  - `directAccessGrantsEnabled: true`
  - `standardFlowEnabled: true`
  - `secret: KEYCLOAK_CLIENT_SECRET`

Sau khi tạo, script query lại để lấy `client_id_internal`.

Nếu vẫn không lấy được internal id:

- script fail-fast với thông báo `Unable to resolve Keycloak internal client id`.

## 9. Khởi tạo danh sách realm role

Script khai báo mảng role:

- `OWNER MANAGER WAITER CHEF BARISTA`

Với mỗi role:

- GET `/admin/realms/${REALM}/roles/${role}` để kiểm tra status.
- Nếu `404`: POST tạo role `{ "name": "${role}" }`.

Tính chất:

- Idempotent: role đã tồn tại thì bỏ qua.
- Bảo đảm baseline authorization model cho hệ thống.

## 10. Khởi tạo protocol mapper cho tenant_id

### 10.1 Kiểm tra mapper đã tồn tại chưa

Script đọc danh sách mappers của client:

- GET `/admin/realms/${REALM}/clients/${client_id_internal}/protocol-mappers/models`

Dùng jq lọc theo tên:

- `tenant_id-claim`

### 10.2 Tạo mapper nếu chưa có

Nếu mapper chưa tồn tại, script POST mapper kiểu:

- `protocolMapper: oidc-usermodel-attribute-mapper`

Config chính:

- `user.attribute: tenant_id`
- `claim.name: tenant_id`
- `jsonType.label: String`
- phát hành claim trong:
  - `access.token.claim: true`
  - `id.token.claim: true`
  - `userinfo.token.claim: true`

Ý nghĩa nghiệp vụ:

- Khi user có attribute `tenant_id`, claim cùng tên sẽ xuất hiện trong token.
- Backend/BFF có thể đọc claim này để xác định tenant context cho multi-tenant.

## 11. Tính idempotent của toàn script

Script áp dụng cùng một pattern lặp lại:

1. Kiểm tra có tồn tại chưa (qua GET/status).
2. Chỉ tạo mới khi thiếu.

Do đó:

- Chạy nhiều lần thường không tạo trùng dữ liệu.
- Phù hợp cho local setup, CI bootstrap, hoặc tái provisioning môi trường dev.

## 12. Những rủi ro và lưu ý thực tế

1. Secret mặc định `change-me` không an toàn cho production.
2. Grant type password cho admin phù hợp dev/bootstrap, cần kiểm soát chặt ở môi trường thật.
3. Script chưa retry/backoff khi Keycloak vừa khởi động chậm.
4. Script chưa validate mã HTTP chi tiết sau một số lệnh POST (đang dựa nhiều vào fail-fast tổng quát).
5. Nếu cần cấu hình role mappings chi tiết cho users/groups/service accounts, hiện script chưa bao phủ.

## 13. Gợi ý nâng cấp

1. Thêm hàm `curl_with_retry` để chờ Keycloak healthy trước khi bootstrap.
2. Thêm kiểm tra response code/response body sau từng thao tác tạo.
3. Đọc cấu hình role list từ file/env để linh hoạt hơn.
4. Tách phần tạo client/role/mapper thành các hàm riêng để dễ test và bảo trì.
5. Bổ sung tạo users/groups mẫu cho môi trường dev nếu cần.

## 14. Tóm tắt luồng thực thi

1. Bật strict mode và nạp cấu hình env (có default).
2. Kiểm tra có `curl` và `jq`.
3. Lấy admin token realm `master`.
4. Tạo realm nếu chưa có.
5. Tạo client nếu chưa có và resolve internal client id.
6. Tạo role baseline nếu thiếu.
7. Tạo protocol mapper `tenant_id-claim` nếu thiếu.
8. In thông báo hoàn tất.

Script hiện tại có thiết kế thực dụng, ngắn gọn, và phù hợp cho bootstrap môi trường phát triển với độ an toàn vận hành tương đối tốt nhờ strict mode + idempotent checks.
