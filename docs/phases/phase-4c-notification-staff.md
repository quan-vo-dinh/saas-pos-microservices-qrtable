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

- **Consumer Kafka** cho các sự kiện: `tenant.created` → email chào mừng (thiết lập quan hệ và hướng dẫn bước tiếp); `payment.completed` → Receipt email cho Customer (nếu có email); `payment.refunded` → thông báo tới chủ sở hữu và luồng audit (trách nhiệm và phát hiện bất thường); `tenant.suspended` → Warning email cho Owner. **Không** map `order.canceled` vào notification theo hướng đã tách cho audit fix #3 — tránh trùng semantics và noise.
- **Kênh email** với nội dung HTML và **branding theo tenant** — nhất quán thương hiệu và giảm nhầm lẫn với email generic.
- **MongoDB collection `notification_logs` (hoặc tương đương audit)** — lý do: tra cứu sau gửi, hỗ trợ CS và tuân thủ “đã gửi gì, khi nào, cho ai”.
- **Retry: tối đa 3 lần, exponential backoff** — cân bằng giữa khả năng phục hồi tạm thời (hạ tầng email) và không giữ tải vô hạn trên consumer.

**Verify:** Sự kiện mẫu trên staging → email đúng loại và đúng tenant branding; bản ghi audit tồn tại; scenario lỗi downstream → số lần thử và trạng thái cuối phản ánh policy.

### Step 4.6 — Staff Management Backend (2-3 ngày)

**Mục tiêu:** Owner/Manager quản lý danh sách nhân viên trong tenant từ một service mở rộng (**user-access**, không tạo microservice mới) — giảm độ phức tạp triển khai và một nơi chịu trách nhiệm đồng bộ IdP + profile.

**Phạm vi & lý do:**

- **Staff Management Endpoints:**
  - Invite staff — Owner/Manager, USER_CREATE permission
  - List staff by tenant — Owner/Manager, USER_GET_ALL
  - Change staff role — Owner only, ROLE_UPDATE
  - Disable staff (soft delete) — Owner only, USER_DELETE
- **Invite staff** — quyền Owner/Manager với permission `USER_CREATE`: tạo user trong Keycloak, gán role phù hợp, tạo profile MongoDB theo tenant, gửi email mời — để người được mời có thể đăng nhập với đúng vai trò ngay từ đầu.
- **List staff** — liệt kê theo tenant — nền tảng cho UI và kiểm soát quy mô nhóm làm việc.
- **Change role** — chỉ Owner, permission `ROLE_UPDATE`: cập nhật đồng thời Keycloak và MongoDB — tránh lệch role giữa đăng nhập và logic nghiệp vụ.
- **Disable staff** — chỉ Owner: **soft delete** — vô hiệu hóa trong Keycloak và deactivate profile MongoDB — giữ lịch sử và chặn đăng nhập mà không xóa cứng dữ liệu audit.
- **BFF proxy controllers** — thống nhất `UserGuard` → `TenantGuard` → `PermissionGuard` và không lộ Keycloak admin ra client.
- Sử dụng **Keycloak Admin API** (client thư viện chính thức) — giảm lỗi thủ công so với REST thuần và phù hợp với kiến trúc auth hiện có.
- **Keycloak Admin API operations:** `createUser`, `assignRole`, `removeRole`, `disableUser`

**Verify:** Invite end-to-end → user đăng nhập với role đúng; đổi role → cả hai hệ thống phản ánh; disable → không còn đăng nhập được; vi phạm permission trả lỗi rõ ràng.

### Step 4.7 — Staff Management UI (2-3 ngày)

**Mục tiêu:** Dashboard quản trị có màn hình staff đầy đủ thao tác hàng ngày — giảm phụ thuộc vào Keycloak Admin Console cho thao tác tenant-scoped.

**Phạm vi & lý do:**

- Route **`/dashboard/staff`**: bảng danh sách, dialog mời (email + role), màn chi tiết/chỉnh sửa (đổi role, bật/tắt hoạt động) — một luồng UX thống nhất với backend 4.6.
- **Staff UI table columns:** Tên, Email, Role, Trạng thái (Active/Disabled), Ngày tham gia
- **Invite Staff Dialog:** Form: Email, Role dropdown (WAITER/CHEF/BARISTA/MANAGER), Validation: email unique trong tenant
- **Lọc theo role** và **tìm kiếm** — vận hành cửa hàng lớn không bị nghẽn khi danh sách dài.

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
