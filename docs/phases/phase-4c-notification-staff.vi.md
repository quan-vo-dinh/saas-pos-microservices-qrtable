# Phase 4C — Notification Service + Staff Management

> **Bản tiếng Việt** — bản tiếng Anh canonical: [phase-4c-notification-staff.md](phase-4c-notification-staff.md)

> **Mục tiêu:** Giao tiếp giao dịch và vận hành (email) theo domain event chuẩn hóa; cho Owner/Manager quản lý nhân sự POS trong tenant — mời, gán role, vô hiệu hóa — đồng bộ giữa IdP và application profile, giảm rủi ro truy cập role sai và tăng khả năng audit sau sự cố.
> **Ước lượng:** ~1 tuần
> **Trạng thái:** ⬜ TODO

## Điều kiện tiên quyết

- Phase 4B hoàn thành — [phase-4b-saas-onboarding.md](phase-4b-saas-onboarding.md) (SaaS service và tenant context sẵn sàng cho invite/branding đa tenant)
- Kafka topics và event contract liên quan tenant/payment đã thống nhất với producer upstream (không dùng `order.canceled` cho luồng message này — xử lý theo hướng audit riêng)

## Tài liệu tham chiếu

| Tài liệu                  | Phần liên quan                          |
| ------------------------- | --------------------------------------- |
| technical-architecture.md | §6.2.8 Notification, §6.2.9 User-Access |
| business-logic.md         | §9 Permissions                          |

## Tổng quan

Phase 4C bổ sung hai trục: **thông báo bất đồng bộ** và **quản lý nhân sự**. Email giúp tenant và khách nhận xác nhận kịp thời (welcome, biên lai, hoàn tiền, cảnh báo suspend/hết hạn) mà không chặn luồng HTTP chính; giới hạn dispatch và ghi retry giảm mất dữ liệu vận hành và hỗ trợ điều tra. Quản lý staff trong **user-access** (mở rộng thay vì tách service mới) vì nguồn sự thật và authorization cần ranh giới rõ — BFF chỉ proxy và áp guard chain — tránh phân mảnh logic tạo user/role giữa nhiều service. UI `/dashboard/staff` hoàn thiện vòng đời vận hành: mời → đăng nhập đúng role → điều chỉnh hoặc vô hiệu hóa khi cần.

## Các bước

### Bước 4.5 — Notification service (2–3 ngày)

**Mục tiêu:** Phản hồi event Kafka đã định nghĩa bằng email giao dịch/có thể kiểm chứng, có dấu vết lưu trữ và chính sách retry — tenant và owner yên tâm về biên lai và onboarding.

**Phạm vi & lý do:**

- **Consumer Kafka** cho 2 event (registry đúng §7.2): `tenant.created` → email welcome/onboarding; `payment.completed` → email biên lai cho Customer nếu có email. **Không** map `order.canceled` sang notification.
- **Tác vụ lifecycle tenant từ Phase 4B:** `tenant.suspended` không qua Kafka — dùng Redis flag chặn nhanh — nên email suspend tới Owner qua task/TCP trực tiếp từ SaaS hoặc cron. Phase 4C cũng nhận email cảnh báo/hết hạn subscription và handoff reset-password Owner / Keycloak Required Action sau khi SMTP sẵn sàng.
- **Email templates:** HTML có **tenant branding** (logo, tên nhà hàng, màu thương hiệu) — nhất quán thương hiệu, giảm nhầm với email generic.
- **Retry logic:** Tối đa **3 lần** với **exponential backoff** khi gửi thất bại — cân bằng phục hồi tạm thời (hạ tầng email) và không giữ tải vô hạn trên consumer.
- **Audit log:** Collection MongoDB `notification_logs` (hoặc tương đương) lưu **mọi notification đã gửi/thất bại** — troubleshooting, tra cứu sau gửi, hỗ trợ CS và tuân thủ “đã gửi gì, khi nào, cho ai”.

**verify:** Event mẫu trên staging → đúng loại email và đúng branding tenant; có bản ghi audit; kịch bản lỗi downstream → số lần thử và trạng thái cuối phản ánh chính sách.

### Bước 4.6 — Staff Management Backend (2–3 ngày)

**Mục tiêu:** Owner/Manager quản lý danh sách nhân viên tenant từ service mở rộng (**user-access**, không tạo microservice mới) — giảm độ phức tạp triển khai và một nơi chịu trách nhiệm đồng bộ IdP + profile.

**Phạm vi & lý do:**

- **Staff Management Endpoints:**
  - Invite staff — Owner/Manager, quyền USER_CREATE
  - List staff theo tenant — Owner/Manager, USER_GET_ALL
  - Đổi role staff — chỉ Owner, ROLE_UPDATE
  - Disable staff (soft delete) — chỉ Owner, USER_DELETE

- **Luồng Invite (hành vi):** Owner nhập email + role → Keycloak Admin API tạo user + gán role → tạo profile MongoDB (liên kết tenant) → gửi email mời (mật khẩu tạm hoặc link setup) → Staff nhận email → đăng nhập lần đầu → auto-provision profile nếu cần.

- **Đổi role (hành vi):** Cập nhật **ĐỒNG THỜI** Keycloak realm role **và** mapping permission MongoDB — nhất quán giữa identity provider và application layer. Tránh lệch role giữa login và business logic.

- **Disable staff (soft delete, hành vi):** Vô hiệu user Keycloak (không login) + deactivate MongoDB. **KHÔNG** hard delete — giữ audit trail và lịch sử hoạt động. Staff bị disable không login được nhưng dữ liệu lịch sử vẫn tra cứu được.

- **tenant isolation:** Staff được mời thuộc cùng tenant — cô lập tenant qua filter `tenant_id` trên mọi query. Không xem/quản lý staff tenant khác.

- **BFF proxy controllers** — thống nhất `UserGuard` → `TenantGuard` → `PermissionGuard`, không expose Keycloak admin ra client.
- Dùng **Keycloak Admin API** (client thư viện chính thức) — giảm lỗi so với REST thuần, khớp kiến trúc auth hiện có.
- **Thao tác Keycloak Admin API:** `createUser`, `assignRole`, `removeRole`, `disableUser`

**verify:** Invite end-to-end → user login đúng role; đổi role → cả hai hệ thống phản ánh; disable → không login được; vi phạm permission trả lỗi rõ.

### Bước 4.7 — Staff Management UI (2–3 ngày)

**Mục tiêu:** Dashboard admin có màn staff đầy đủ cho vận hành hàng ngày — giảm phụ thuộc Keycloak Admin Console cho thao tác theo phạm vi tenant.

**Phạm vi & lý do:**

- Route **`/dashboard/staff`**: bảng danh sách, dialog mời (email + role), màn chi tiết/sửa (đổi role, bật/tắt) — UX thống nhất với backend 4.6.

- **Bảng danh bạ staff:** Cột: Tên, Email, Role, Trạng thái (Active/Disabled), Ngày tham gia.
  - **Lọc** theo role (dropdown hoặc tab).
  - **Tìm** theo tên/email (input debounce).

- **Dialog Invite Staff:**
  - Form: Email + dropdown Role (WAITER/CHEF/BARISTA/MANAGER).
  - Validation: email unique trong tenant (kiểm tra trước khi gửi).
  - Sau gửi: Staff nhận email → login lần đầu → auto-provision → xuất hiện trong danh sách.

- **Chi tiết / Sửa Staff:**
  - Đổi role
  - Disable/Enable tài khoản
  - Xem activity log (nice-to-have)

**verify:** Owner/Manager chỉ thấy dữ liệu đúng tenant; thao tác invite/role/disable nhất quán API; role thấp không thấy hành động chỉ dành Owner.

## Tiêu chí nghiệm thu

- [ ] Email welcome kích hoạt khi event `tenant.created`
- [ ] Email suspend/hết hạn kích hoạt từ task/TCP/cron SaaS, không phụ thuộc Kafka `tenant.suspended`
- [ ] Onboarding Owner có email reset/setup mật khẩu hoặc Keycloak Required Action khi SMTP sẵn sàng
- [ ] Owner mời staff → staff login đúng role được gán
- [ ] Đổi role cập nhật đồng thời Keycloak và MongoDB
- [ ] Disable staff → không login được
- [ ] Notification: retry tối đa 3 lần (exponential backoff) và có dấu vết trong audit log (`notification_logs`)

## Đầu ra cho phase sau

- Notification service là điểm mở rộng cho email khác (SLA alert, marketing opt-in) mà không chạm luồng sync chính
- User-access là cạnh quản lý nhân sự theo tenant, sẵn sàng thêm policy (ví dụ số slot staff theo gói SaaS) nếu phase sau yêu cầu
- UI staff tái sử dụng pattern table + dialog + RBAC cho màn admin khác
- Bảng tra nhanh: topics `tenant.created`, `payment.completed`; collection audit notification; endpoint staff qua BFF
