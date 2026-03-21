# Step 0.6 - Hướng Dẫn Cấu Hình Keycloak Thủ Công (UI-first)

## 1) Mục tiêu tài liệu

Tài liệu này hướng dẫn cấu hình Keycloak bằng tay trên Admin Console để bạn hiểu rõ luồng auth + tenant trước khi dùng script tự động.

Phạm vi:

- Cấu hình realm cho hệ thống qrtable
- Cấu hình client OIDC cho BFF
- Cấu hình role nghiệp vụ
- Cấu hình protocol mapper để đẩy tenant_id vào token
- Cấu hình SSL mode dùng cho local development
- Kiểm tra token và đối chiếu với script bootstrap

Nguồn tham chiếu:

- Keycloak Server Admin docs (Require SSL modes)
- Keycloak Admin REST examples (realm/client/roles/protocol mappers)
- Đã tổng hợp từ Context7 cho Keycloak

## 2) Điều kiện trước khi bắt đầu

1. Provider stack đã chạy, Keycloak mở ở http://localhost:8180.
2. Admin account có quyền full (mặc định admin/admin trong local).
3. Làm việc bằng cửa sổ ẩn danh (incognito) để tránh cache redirect HTTPS cũ.

## 3) Khái niệm cần nhớ trước khi thao tác

1. Realm là ranh giới của người dùng, role và client.
2. Client qrtable-bff là confidential client cho backend BFF.
3. tenant_id cần có trong access token để TenantGuard kiểm tra.
4. Require SSL có 3 chế độ quan trọng:

- none: không ép SSL, dùng cho local dev
- external: cho phép private/local IP không SSL, internet thì cần SSL
- all: mọi request đều phải SSL

## 4) Luồng thao tác UI đầy đủ

### Bước 1: Đăng nhập Admin Console

1. Mở http://localhost:8180/admin/
2. Đăng nhập bằng admin account.

### Bước 2: Chỉnh SSL cho realm master (để tránh HTTPS required)

1. Chọn realm master từ realm switcher.
2. Vào Realm settings.
3. Ở mục Require SSL, chọn none cho local dev.
4. Bấm Save.

Ghi chú:

- Đây là bước quan trọng để tránh lỗi We are sorry... HTTPS required trong local.

### Bước 3: Tạo realm qrtable

1. Bấm Create realm.
2. Nhập Realm name: qrtable.
3. Bấm Create.
4. Vào Realm settings của qrtable.
5. Đặt Require SSL = none.
6. Save.

### Bước 4: Tạo client qrtable-bff

1. Chọn realm qrtable.
2. Vào Clients.
3. Bấm Create client.
4. Chọn OpenID Connect.
5. Nhập Client ID: qrtable-bff.
6. Save.

Cấu hình client để phù hợp luồng BFF:

1. Client authentication: On (confidential).
2. Standard flow: On.
3. Direct access grants: On (nếu cần login theo password grant trong dev/testing).
4. Service accounts roles: On (nếu BFF cần service account).
5. Save.

Sau khi save:

1. Vào tab Credentials.
2. Lấy Client secret và đồng bộ với cấu hình env của BFF.

### Bước 5: Tạo role nghiệp vụ trong realm qrtable

1. Vào Realm roles.
2. Tạo lần lượt các role:

- OWNER
- MANAGER
- WAITER
- CHEF
- BARISTA

3. Save mỗi role.

### Bước 6: Tạo protocol mapper tenant_id cho client qrtable-bff

1. Vào Clients > qrtable-bff.
2. Vào tab Protocol mappers (hoặc Client scopes tùy layout UI).
3. Bấm Add mapper.
4. Chọn mapper type: User Attribute.
5. Điền các trường:

- Name: tenant_id-claim
- User attribute: tenant_id
- Token claim name: tenant_id
- Claim JSON type: String
- Add to access token: On
- Add to ID token: On
- Add to userinfo: On

6. Save.

Kết quả mong đợi:

- Claim tenant_id có mặt trong token trả về cho user.

### Bước 7: Tạo user test và gán thuộc tính tenant

1. Vào Users > Add user.
2. Tạo user staff test (ví dụ: manager1).
3. Tab Credentials: set password, tắt Temporary.
4. Tab Attributes: thêm cặp key/value:

- key: tenant_id
- value: tenant_a

5. Tab Role mapping: gán 1 role nghiệp vụ (ví dụ MANAGER).

#### Lưu ý quan trọng cho UI Keycloak mới

Ở một số phiên bản Keycloak mới, bạn có thể không thấy tab Attributes riêng trong màn hình user.
Khi đó cần khai báo tenant_id ở User profile của realm trước, rồi mới nhập giá trị cho user.

Các bước bổ sung:

1. Vào Realm settings > User profile.
2. Chọn Create attribute.
3. Tạo attribute với cấu hình:

- Name: tenant_id
- Display name: Tenant ID
- Multivalued: Off
- Permissions: admin có quyền view/edit

4. Save attribute.
5. Quay lại Users > manager1 > Details.
6. Tìm trường tenant_id trong phần user profile attributes và nhập tenant_a.
7. Save user.

Nếu đã tạo mapper đúng nhưng token vẫn thiếu tenant_id, hãy kiểm tra lại phần User profile này đầu tiên.

### Bước 8: Kiểm tra token đã có tenant_id

Cách 1 (dễ hiểu):

1. Đăng nhập bằng user test theo flow app.
2. Lấy access token.
3. Decode JWT và kiểm tra claim tenant_id.

Cách 2 (nhanh trong local):

1. Gọi token endpoint của realm qrtable.
2. Decode access token và xem payload.
3. Xác nhận:

- tenant_id tồn tại
- role nghiệp vụ tồn tại (realm_access.roles)

## 5) Checklist xác minh sau cấu hình

Đánh dấu hoàn tất khi tất cả đúng:

- [ ] Không còn lỗi HTTPS required trên local admin console
- [ ] Realm qrtable tồn tại và enabled
- [ ] Require SSL của master = none (local)
- [ ] Require SSL của qrtable = none (local)
- [ ] Client qrtable-bff tồn tại, là confidential client
- [ ] Đã có client secret hợp lệ
- [ ] Đã có 5 role nghiệp vụ
- [ ] Mapper tenant_id-claim đã tạo
- [ ] User test có attribute tenant_id
- [ ] Access token chứa claim tenant_id

## 6) Liên hệ với Step 0.6 trong codebase

Cấu hình bằng tay này cung cấp đầu vào cho:

1. SessionGuard: quản lý session cho customer flow.
2. TenantGuard: đối chiếu tenant từ request và tenant_id trong JWT.
3. BFF -> TCP context propagation: tenantId/sessionId/userId.

Nếu không có mapper tenant_id, TenantGuard sẽ không có dữ liệu để enforce đúng tenant.

## 7) Đối chiếu với script bootstrap

Script tools/keycloak-bootstrap.sh tự động hóa đúng các bước đã làm tay:

1. Đặt sslRequired cho master và realm app.
2. Tạo realm qrtable nếu chưa có.
3. Tạo client qrtable-bff nếu chưa có.
4. Tạo roles OWNER/MANAGER/WAITER/CHEF/BARISTA nếu chưa có.
5. Tạo mapper tenant_id-claim nếu chưa có.

Ý nghĩa:

- Làm tay để hiểu luồng.
- Dùng script để tái lập nhanh và tránh lệch cấu hình sau mỗi lần reset data.

## 8) Troubleshooting nhanh

### Trường hợp A: Vẫn thấy HTTPS required

1. Kiểm tra Require SSL của realm đang sử dụng.
2. Đảm bảo đang truy cập bằng localhost hoặc private IP.
3. Mở lại bằng incognito.
4. Xóa cache/cookie cho localhost:8180.
5. Kiểm tra bạn đang dùng đúng realm (master hay qrtable).

### Trường hợp B: Token không có tenant_id

1. Kiểm tra user có attribute tenant_id.
2. Kiểm tra mapper dùng user attribute tenant_id.
3. Kiểm tra mapper đã Add to access token.
4. Đăng nhập lại để cấp token mới.
5. Nếu UI không có tab Attributes, kiểm tra lại Realm settings > User profile đã khai báo managed attribute tenant_id chưa.

### Trường hợp C: BFF báo thiếu role hoặc tenant

1. Kiểm tra role mapping của user trong realm qrtable.
2. Kiểm tra token payload có realm_access.roles.
3. Kiểm tra payload có tenant_id.

## 9) Khuyến nghị vận hành

1. Local dev:

- Require SSL = none để tránh blocker trong máy local.

2. Staging/Production:

- Không dùng none.
- Dùng external hoặc all và đặt reverse proxy TLS đúng chuẩn.

3. Sau khi bạn đã nắm luồng:

- Chạy script bootstrap để đảm bảo idempotent và đồng bộ môi trường.
