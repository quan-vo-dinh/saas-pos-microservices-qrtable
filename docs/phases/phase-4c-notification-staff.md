# Phase 4C — Notification Service + Staff Management

> **Mục tiêu:** Giao tiếp giao dịch và vận hành (email) theo sự kiện domain đã chuẩn hóa, đồng thời cho phép Owner/Manager quản lý nhân sự POS trong tenant — mời, gán vai trò, vô hiệu hóa — với đồng bộ giữa IdP và hồ sơ ứng dụng, giảm rủi ro truy cập sai vai trò và tăng khả năng kiểm tra sau sự cố.
> **Ước lượng:** ~1 tuần
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Phase 4B hoàn thành — [phase-4b-saas-onboarding.md](phase-4b-saas-onboarding.md) (SaaS Service và ngữ cảnh tenant đã sẵn sàng cho invite/branding đa tenant)
- Kafka topics và contract sự kiện liên quan tenant/payment đã thống nhất với các producer upstream (không dùng `order.canceled` cho luồng thông báo này — đã xử lý theo hướng audit riêng)

## Tham Chiếu

| Tài liệu                  | Section liên quan                       |
| ------------------------- | --------------------------------------- |
| technical-architecture.md | §6.2.8 Notification, §6.2.9 User-Access |
| business-logic.md         | §9 Permissions                          |

## Tổng Quan

Phase 4C bổ sung hai trục: **thông báo không đồng bộ** và **quản lý staff**. Thông báo qua email giúp tenant và khách nhận xác nhận đúng thời điểm (chào mừng, biên lai, hoàn tiền) mà không chặn luồng HTTP chính; ghi nhận gửi và thử lại có giới hạn giảm mất dữ liệu vận hành và hỗ trợ điều tra. Quản lý staff trong **user-access** (mở rộng thay vì tách service) vì nguồn sự thật nhân sự và phân quyền cần một biên rõ ràng — BFF chỉ proxy và áp guard chain — tránh phân mảnh logic tạo user/role giữa nhiều dịch vụ. UI `/dashboard/staff` hoàn thiện vòng đời vận hành: mời → đăng nhập đúng role → điều chỉnh hoặc vô hiệu hóa khi cần.

## Steps

### Step 4.5 — Notification Service (2-3 ngày)

**Mục tiêu:** Phản ứng các sự kiện Kafka đã định nghĩa bằng email giao dịch/có thể kiểm chứng, có dấu vết lưu trữ và chính sách thử lại — để tenant và chủ quán yên tâm về biên lai, hoàn tiền và onboarding.

**Phạm vi & lý do:**

- **Consumer Kafka** cho 3 sự kiện (đúng registry §7.2): `tenant.created` → email chào mừng (thiết lập quan hệ và hướng dẫn bước tiếp); `payment.completed` → Receipt email cho Customer (nếu có email); `payment.refunded` → thông báo tới chủ sở hữu và luồng audit (trách nhiệm và phát hiện bất thường). **Không** map `order.canceled` vào notification (audit fix #3). `tenant.suspended` không qua Kafka — dùng Redis flag (AP1, xem Phase 4B) nên warning email cho Owner được trigger bởi SaaS Service trực tiếp hoặc cron job, không phải Kafka consumer.
- **Email templates:** HTML templates với **tenant branding** (logo, tên nhà hàng, màu thương hiệu) — nhất quán thương hiệu và giảm nhầm lẫn với email generic.
- **Retry logic:** Tối đa **3 retries** với **exponential backoff** cho failed emails — cân bằng giữa khả năng phục hồi tạm thời (hạ tầng email) và không giữ tải vô hạn trên consumer.
- **Audit log:** MongoDB collection `notification_logs` (hoặc tương đương) lưu **tất cả notification sent/failed** — dùng cho troubleshooting, tra cứu sau gửi, hỗ trợ CS và tuân thủ "đã gửi gì, khi nào, cho ai".

**Verify:** Sự kiện mẫu trên staging → email đúng loại và đúng tenant branding; bản ghi audit tồn tại; scenario lỗi downstream → số lần thử và trạng thái cuối phản ánh policy.

### Step 4.6 — Staff Management Backend (2-3 ngày)

**Mục tiêu:** Owner/Manager quản lý danh sách nhân viên trong tenant từ một service mở rộng (**user-access**, không tạo microservice mới) — giảm độ phức tạp triển khai và một nơi chịu trách nhiệm đồng bộ IdP + profile.

**Phạm vi & lý do:**

- **Staff Management Endpoints:**
  - Invite staff — Owner/Manager, USER_CREATE permission
  - List staff by tenant — Owner/Manager, USER_GET_ALL
  - Change staff role — Owner only, ROLE_UPDATE
  - Disable staff (soft delete) — Owner only, USER_DELETE

- **Invite flow (behavioral):** Owner nhập email + role → Keycloak Admin API tạo user + assign role phù hợp → tạo user profile trong MongoDB (liên kết tenant) → gửi invitation email (temp password hoặc setup link) → Staff nhận email → Login lần đầu → Auto-provision profile nếu cần.

- **Role change (behavioral):** Cập nhật **CẢ** Keycloak realm role **+** MongoDB permission mapping **đồng thời** — đảm bảo consistency giữa identity provider và application layer. Tránh lệch role giữa đăng nhập và logic nghiệp vụ.

- **Disable staff (soft delete, behavioral):** Disable user trong Keycloak (không login được) + deactivate trong MongoDB. **KHÔNG hard delete** — giữ audit trail và lịch sử hoạt động. Staff bị disable không thể đăng nhập nhưng dữ liệu lịch sử vẫn tra cứu được.

- **Tenant isolation:** Staff đã invited thuộc cùng tenant — tenant isolation enforced qua `tenant_id` filter trên mọi query. Không thể xem/quản lý staff của tenant khác.

- **BFF proxy controllers** — thống nhất `UserGuard` → `TenantGuard` → `PermissionGuard` và không lộ Keycloak admin ra client.
- Sử dụng **Keycloak Admin API** (client thư viện chính thức) — giảm lỗi thủ công so với REST thuần và phù hợp với kiến trúc auth hiện có.
- **Keycloak Admin API operations:** `createUser`, `assignRole`, `removeRole`, `disableUser`

**Verify:** Invite end-to-end → user đăng nhập với role đúng; đổi role → cả hai hệ thống phản ánh; disable → không còn đăng nhập được; vi phạm permission trả lỗi rõ ràng.

### Step 4.7 — Staff Management UI (2-3 ngày)

**Mục tiêu:** Dashboard quản trị có màn hình staff đầy đủ thao tác hàng ngày — giảm phụ thuộc vào Keycloak Admin Console cho thao tác tenant-scoped.

**Phạm vi & lý do:**

- Route **`/dashboard/staff`**: bảng danh sách, dialog mời (email + role), màn chi tiết/chỉnh sửa (đổi role, bật/tắt hoạt động) — một luồng UX thống nhất với backend 4.6.

- **Staff directory table:** Các cột hiển thị: Tên, Email, Role, Trạng thái (Active/Disabled), Ngày tham gia.
  - **Filter** by role (dropdown hoặc tabs).
  - **Search** by name/email (text input, debounce).

- **Invite Staff Dialog:**
  - Form: Email + Role dropdown (WAITER/CHEF/BARISTA/MANAGER).
  - Validation: email unique trong tenant (kiểm tra trước khi gửi invite).
  - Flow sau gửi: Staff nhận email → Login lần đầu → Auto-provision → Xuất hiện trong danh sách.

- **Staff Detail / Edit:**
  - Thay đổi role
  - Disable/Enable staff account
  - Xem activity log (nice-to-have)

**Verify:** Owner/Manager thấy đúng dữ liệu tenant; thao tác invite/role/disable phản hồi nhất quán với API; role thấp không thấy hành động Owner-only.

## Acceptance Criteria

- [ ] Email chào mừng được kích hoạt khi có sự kiện `tenant.created`
- [ ] Owner mời staff → staff đăng nhập được với đúng role đã gán
- [ ] Đổi role cập nhật đồng thời Keycloak và MongoDB
- [ ] Vô hiệu hóa staff → không thể đăng nhập
- [ ] Notification: retry tối đa 3 lần (exponential backoff) và có dấu vết trong audit log (`notification_logs`)

## Outputs cho Phase tiếp theo

- Notification Service là điểm mở rộng cho các sự kiện email khác (cảnh báo SLA, marketing opt-in) mà không đụng vào path đồng bộ chính
- User-access là biên quản lý nhân sự tenant-scoped, sẵn sàng gắn thêm policy (ví dụ số slot staff theo gói SaaS) nếu phase sau yêu cầu
- UI staff tái sử dụng pattern bảng + dialog + RBAC cho các màn admin khác
- Bảng tra cứu nhanh: topics `tenant.created`, `payment.completed`, `payment.refunded`; collection audit notification; staff management endpoints qua BFF
