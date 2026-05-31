# Phase 4C — Quản lý nhân sự

> **Bản tiếng Việt** — bản tiếng Anh canonical: [phase-4c-staff-management.md](phase-4c-staff-management.md)

> **Mục tiêu:** Cho Owner/Manager quản lý nhân sự POS trong tenant: tạo/mời nhân viên, gán role, đổi role và vô hiệu hóa tài khoản thông qua ranh giới User-Access/Authorizer hiện có. Phase này chủ động loại bỏ Step 4.5 Notification Service khỏi phạm vi triển khai.
> **Ước lượng:** ~3-5 ngày
> **Trạng thái:** ⬜ TODO

## Quyết định phạm vi

Step 4.5 Notification Service bị loại khỏi phạm vi hiện tại của dự án. Codebase hiện tại không có `apps/notification`, không có database `qrtable_notification`, không có cấu hình SMTP/provider, và không có runtime consumer cho gửi email. Vì vậy Phase 4C chỉ tập trung vào quản lý nhân sự.

Email biên lai, email welcome/suspend/hết hạn, email đặt lại mật khẩu, audit log thông báo và microservice Notification độc lập được giữ như hướng mở rộng tương lai. Các phần này không được tính là tiêu chí nghiệm thu Phase 4C, blocker của Phase 5, hoặc bằng chứng implementation trong khóa luận nếu chưa được đưa lại vào code.

## Điều kiện tiên quyết

- Phase 4B hoàn thành — [phase-4b-saas-onboarding.md](phase-4b-saas-onboarding.md).
- User-Access sở hữu application profile, mapping role, và bộ đếm staff theo tenant.
- Authorizer sở hữu thao tác Keycloak user/role/disable.
- BFF vẫn là HTTP edge và áp guard chain `UserGuard` → `TenantGuard` → `PermissionGuard`.

## Tài liệu tham chiếu

| Tài liệu                  | Phần liên quan                               |
| ------------------------- | -------------------------------------------- |
| technical-architecture.md | §6.2.8 User-Access, §8 Authentication/RBAC   |
| business-logic.md         | §9 Permissions                               |
| permission-matrix.md      | RBAC seed canonical và quyền liên quan staff |

## Tổng quan

Phase 4C đóng gap quản lý nhân sự theo tenant mà không tạo microservice mới. Nguồn sự thật vẫn chia theo ownership hiện có: Authorizer xử lý danh tính trong Keycloak; User-Access xử lý application profile, liên kết tenant, mapping role/permission và bộ đếm staff; BFF mở route an toàn theo tenant cho Management App.

Vì Notification Service đã bị loại, onboarding staff không được phụ thuộc email. Luồng phù hợp cho demo là: Owner/Manager tạo tài khoản staff, gán role, và cung cấp mật khẩu khởi tạo hoặc hướng dẫn setup ngoài hệ thống. Sau này nếu tích hợp email/provider, phần đó có thể bọc quanh flow này mà không đổi ranh giới ownership của staff.

## Ghi chú phạm vi

### Notification Service trong plan cũ

**Trạng thái:** Không còn là bước triển khai của Phase 4C.

**Lý do:**

- Repository hiện không có service runtime, database, SMTP provider hoặc email template cho Notification.
- Luồng demo chính đã hoạt động mà không cần email giao dịch: QR ordering, KDS, payment, SaaS onboarding và tenant lifecycle không bị chặn bởi Notification Service.
- Nếu làm Notification Service đúng mức, cần thêm cấu hình provider, retry policy, audit storage, xử lý lỗi và test; chi phí này không cải thiện đủ mạnh đường demo/bảo vệ trong timeline hiện tại.

**Quy tắc viết tài liệu:**

- Tài liệu nội bộ/dự án có thể nói thẳng Step 4.5 đã bị loại hoặc không nằm trong phạm vi hiện tại.
- Tài liệu khóa luận chính thức nên trình bày email/Notification như giới hạn phạm vi hoặc hướng phát triển, không viết như một phase đã hứa nhưng chưa hoàn thành.

## Các bước

### Bước 4C.1 — Backend quản lý nhân sự (2-3 ngày)

**Mục tiêu:** Owner/Manager quản lý staff tenant qua các service hiện có, không expose thao tác Keycloak admin trực tiếp cho client.

**Phạm vi & lý do:**

- **Endpoint quản lý staff:**
  - Tạo/mời staff — Owner/Manager, `USER_CREATE`.
  - List staff theo tenant — Owner/Manager, `USER_GET_ALL`.
  - Đổi role staff — chỉ Owner, `USER_UPDATE` cộng actor policy chỉ Owner.
  - Vô hiệu hóa tài khoản staff — chỉ Owner, `USER_DELETE`.
  - Kích hoạt lại tài khoản staff — chỉ Owner, `USER_UPDATE`.

- **Policy nhân sự:** Owner có thể tạo `MANAGER`, `WAITER`, `CHEF`, và `BARISTA`; Manager chỉ có thể tạo `WAITER`, `CHEF`, và `BARISTA`. Không quản lý `OWNER` hoặc `SUPER_ADMIN` từ `/dashboard/staff`; chuyển Owner và quản trị platform nằm ngoài Phase 4C.

- **Luồng tạo staff:** Owner/Manager nhập email, tên hiển thị, role và mật khẩu khởi tạo/setup mode → BFF kiểm tra permission và tenant context → Authorizer tạo Keycloak user và gán role → User-Access tạo MongoDB profile gắn tenant → response chỉ trả dữ liệu staff an toàn. Không phụ thuộc email delivery.

- **Luồng đổi role:** Cập nhật Keycloak role và MongoDB profile/permission mapping như một thao tác phối hợp. Nếu một bên lỗi, trả lỗi rõ ràng và giữ profile ở trạng thái có thể retry hoặc reconcile.

- **Luồng disable/enable staff:** Disable hoặc enable user trong Keycloak và đồng bộ `isActive` trong MongoDB. Không hard-delete staff vì lịch sử order/payment/audit có thể còn tham chiếu user đó.

- **Tenant isolation:** Mọi query/mutation staff phải theo tenant. Actor không phải `SUPER_ADMIN` không được quản lý staff của tenant khác.

- **BFF proxy controller:** Dùng `UserGuard` → `TenantGuard` → `PermissionGuard`; không đưa credential Keycloak admin hoặc route nội bộ Authorizer ra browser.

**verify:** Tạo staff → staff login đúng role; đổi role cập nhật identity và application profile; staff bị disable không login được; truy cập cross-tenant và role thấp nhận lỗi 403/404 rõ ràng.

### Bước 4C.2 — UI quản lý nhân sự (1-2 ngày)

**Mục tiêu:** Dashboard quản trị có màn staff dùng được cho vận hành hằng ngày.

**Phạm vi & lý do:**

- Route **`/dashboard/staff`**: bảng staff, dialog tạo staff, thao tác role/status, và hiển thị trạng thái disabled.
- **Bảng staff:** Tên, email, role, trạng thái, ngày tham gia.
- **Lọc/tìm kiếm:** Lọc theo role/status và tìm theo tên/email.
- **Dialog tạo staff:** Email, tên, role và mật khẩu khởi tạo/setup mode. UI phải thể hiện rõ email delivery không nằm trong flow hiện tại.
- **Thao tác role/status:** Control đổi role và disable/enable chỉ dành cho Owner; Manager chỉ list/create các role staff được phép nếu có quyền tương ứng.

**verify:** Owner/Manager chỉ thấy staff tenant hiện tại; thao tác role/status khớp permission backend; role thấp không thấy hoặc không gọi được hành động Owner-only; UI không render raw wire enum.

## Tiêu chí nghiệm thu

- [ ] BFF có endpoint staff theo tenant và được guard bằng `UserGuard` → `TenantGuard` → `PermissionGuard`.
- [ ] Owner/Manager tạo staff mà không phụ thuộc Notification Service hoặc SMTP.
- [ ] Staff login được với role đã gán sau khi tạo/setup.
- [ ] Đổi role cập nhật nhất quán Keycloak và User-Access profile hoặc trả lỗi có thể retry.
- [ ] Disable staff chặn login và đánh dấu application profile inactive, không hard-delete.
- [ ] Enable staff khôi phục login sau khi Keycloak và User-Access đều cập nhật thành công.
- [ ] Cross-tenant staff access bị chặn.
- [ ] `/dashboard/staff` hỗ trợ list, search/filter, tạo staff, đổi role và disable/enable theo permission.

## Đầu ra cho phase sau

- User-Access trở thành cạnh quản lý nhân sự theo tenant.
- Authorizer giữ ranh giới danh tính/Keycloak.
- BFF có API surface ổn định cho staff management trong Management App.
- Notification/email là hướng mở rộng tùy chọn, không bắt buộc cho Phase 5-7 testing hoặc demo khóa luận chính.
